/**
 * Security module — four protection layers:
 *  1. WATCHER  — audit trail for every suspicious event (D1-persisted)
 *  2. GAP CLOSER — CSP/HSTS headers, honeypot traps, suspicious-UA blocking
 *  3. DATA GUARD — scheduled purge logic (called from the cron handler)
 *  4. THREAT FIGHTER — rate limiting, brute force detection, IP blocking
 */

// ── In-memory fast-path rate maps (per-isolate, resets in hours) ─────────────
// These provide low-latency blocking without a D1 round-trip for every request.
// D1-backed ip_blocks and login_failures provide persistence across isolates.

const globalIpMap  = new Map<string, { count: number; resetAt: number }>();
const loginIpMap   = new Map<string, { count: number; resetAt: number }>();
const ipBlockCache = new Map<string, { blocked: boolean; until?: number; at: number }>();

const CACHE_TTL_MS  = 60_000;      // Re-check D1 ip_blocks every 60 s

// ── Rate-limit windows ────────────────────────────────────────────────────────
export const LIMITS = {
  GLOBAL:          { max: 300,  windowMs: 60_000   },  // 300 req/min per IP (all endpoints)
  LOGIN_IP:        { max:  10,  windowMs: 900_000  },  // 10 login attempts per IP per 15 min
  STUDENT_FAIL:    { max:   5,  lockoutMs: 1_800_000 },// 5 failures → 30-min student lockout
  ENUM_THRESHOLD:  3,                                   // unique IDs from same IP in 5 min
};

// ── Honeypot paths — any scanner/bot hits these, gets permanently flagged ─────
export const HONEYPOT_PATHS = new Set([
  '/.env', '/.env.local', '/.env.backup', '/.env.production', '/.env.staging',
  '/wp-admin', '/wp-login.php', '/wp-config.php', '/xmlrpc.php',
  '/admin.php', '/phpmyadmin', '/phpinfo.php', '/setup.php', '/install.php',
  '/.git/config', '/.git/HEAD', '/.htaccess', '/.htpasswd',
  '/config.php', '/configuration.php', '/settings.php',
  '/actuator', '/actuator/env', '/actuator/health',
  '/console', '/manager/html', '/solr/admin', '/telescope', '/horizon',
  '/api/v1/users', '/api/v1/admin', '/api/users', '/api/admin',
  '/shell', '/cgi-bin/luci', '/boaform/admin/formLogin',
]);

// ── Suspicious user-agent substrings (automated scanners / exploit tools) ─────
const BAD_UA_FRAGMENTS = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab', 'nuclei',
  'acunetix', 'nessus', 'openvas', 'burpsuite', 'dirsearch',
  'gobuster', 'wfuzz', 'hydra', 'medusa', 'metasploit',
  'python-requests/2.', 'go-http-client/1.', 'curl/7.',
  'libwww-perl', 'lwp-trivial', 'zgrab', 'fuzz', 'scanner',
];

export const isSuspiciousUA = (ua: string): boolean => {
  const lower = (ua || '').toLowerCase();
  // Zero-length UA is suspicious but common in some legit apps — treat as low only
  if (!lower) return false;
  return BAD_UA_FRAGMENTS.some(f => lower.includes(f));
};

// ── Security event types and severity ────────────────────────────────────────
export type SecEventType =
  | 'brute_force_ip'
  | 'brute_force_student'
  | 'rate_limit_global'
  | 'rate_limit_login'
  | 'ip_blocked'
  | 'honeypot_hit'
  | 'suspicious_ua'
  | 'auth_failure'
  | 'enumeration'
  | 'data_purge'
  | 'account_locked';

export type SecSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecEvent {
  type: SecEventType;
  severity: SecSeverity;
  ip: string;
  studentId?: string;
  endpoint?: string;
  ua?: string;
  details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: WATCHER — write audit events to D1 (fire-and-forget)
// ═══════════════════════════════════════════════════════════════════════════════

export const logEvent = (
  db: D1Database,
  ctx: ExecutionContext,
  event: SecEvent
): void => {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  ctx.waitUntil(
    db.prepare(
      `INSERT OR IGNORE INTO security_events
         (id, event_type, severity, ip_address, student_id, endpoint, user_agent, details, created_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`
    )
    .bind(
      id,
      event.type,
      event.severity,
      event.ip || 'unknown',
      event.studentId || null,
      event.endpoint  || null,
      event.ua        || null,
      event.details   ? JSON.stringify(event.details) : null,
      now
    )
    .run()
    .catch(() => undefined) // Never crash on log failure
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: GAP CLOSER — IP blocking, honeypot, header hardening
// ═══════════════════════════════════════════════════════════════════════════════

/** Check D1 ip_blocks with a 60-second in-memory cache */
export const isIpBlocked = async (db: D1Database, ip: string): Promise<boolean> => {
  const now    = Date.now();
  const cached = ipBlockCache.get(ip);
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return cached.blocked && (!cached.until || now < cached.until);
  }
  try {
    const row = await db
      .prepare(
        `SELECT expires_at FROM ip_blocks
         WHERE ip_address = ?1
           AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
         LIMIT 1`
      )
      .bind(ip)
      .first<{ expires_at: string | null }>();
    const blocked = Boolean(row);
    const until   = row?.expires_at ? new Date(row.expires_at).getTime() : undefined;
    ipBlockCache.set(ip, { blocked, until, at: now });
    return blocked;
  } catch {
    return false; // Fail open on DB error — don't block legit users
  }
};

/** Add an IP block to D1 and invalidate local cache */
export const blockIp = (
  db: D1Database,
  ctx: ExecutionContext,
  ip: string,
  reason: string,
  durationMs?: number
): void => {
  const now       = new Date().toISOString();
  const expiresAt = durationMs
    ? new Date(Date.now() + durationMs).toISOString()
    : null;
  // Evict cache immediately so next request to this IP is re-checked
  ipBlockCache.set(ip, {
    blocked: true,
    until:   durationMs ? Date.now() + durationMs : undefined,
    at:      Date.now(),
  });
  ctx.waitUntil(
    db.prepare(
      `INSERT OR REPLACE INTO ip_blocks (ip_address, reason, blocked_at, expires_at, created_by)
       VALUES (?1, ?2, ?3, ?4, 'auto')`
    )
    .bind(ip, reason.slice(0, 500), now, expiresAt)
    .run()
    .catch(() => undefined)
  );
};

/** Apply hardened security response headers */
export const applyHardenedHeaders = (headers: Headers): void => {
  headers.set('Content-Security-Policy',
    "default-src 'none'; " +
    "script-src 'none'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'none'"
  );
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  headers.set('X-Content-Type-Options',    'nosniff');
  headers.set('X-Frame-Options',           'DENY');
  headers.set('Referrer-Policy',           'no-referrer');
  headers.set('Permissions-Policy',        'camera=(), microphone=(), geolocation=(), payment=()');
  headers.set('X-XSS-Protection',         '0'); // Modern browsers use CSP; legacy header off
  headers.set('Cache-Control',            'no-store, no-cache, must-revalidate');
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 4: THREAT FIGHTER — rate limiting + brute-force detection
// ═══════════════════════════════════════════════════════════════════════════════

/** Global per-IP rate limit (in-memory). Returns true if allowed. */
export const checkGlobalRate = (ip: string): boolean => {
  const { max, windowMs } = LIMITS.GLOBAL;
  const now   = Date.now();
  const entry = globalIpMap.get(ip);
  if (!entry || now > entry.resetAt) {
    globalIpMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
};

/** Login-specific rate limit per IP (in-memory). Returns true if allowed. */
export const checkLoginRate = (ip: string): boolean => {
  const { max, windowMs } = LIMITS.LOGIN_IP;
  const now   = Date.now();
  const key   = `l:${ip}`;
  const entry = loginIpMap.get(key);
  if (!entry || now > entry.resetAt) {
    loginIpMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
};

/** Record a failed student login in D1. Returns { locked, failCount }. */
export const recordLoginFailure = async (
  db: D1Database,
  studentId: string
): Promise<{ locked: boolean; failCount: number }> => {
  const now         = new Date().toISOString();
  const { max, lockoutMs } = LIMITS.STUDENT_FAIL;
  const id          = studentId.toLowerCase();

  let row = await db
    .prepare(`SELECT fail_count, locked_until FROM login_failures WHERE student_id = ?1 LIMIT 1`)
    .bind(id)
    .first<{ fail_count: number; locked_until: string | null }>();

  const prev = row?.fail_count ?? 0;
  const newCount = prev + 1;
  const locked   = newCount >= max;
  const lockedUntil = locked
    ? new Date(Date.now() + lockoutMs).toISOString()
    : null;

  await db.prepare(
    `INSERT INTO login_failures (student_id, fail_count, first_fail, last_fail, locked_until)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(student_id) DO UPDATE SET
       fail_count   = ?2,
       last_fail    = ?4,
       locked_until = COALESCE(?5, locked_until)`
  )
  .bind(id, newCount, row ? undefined : now, now, lockedUntil ?? null)
  .run()
  .catch(() => undefined);

  return { locked, failCount: newCount };
};

/** Check if a student ID is currently locked out. */
export const isStudentLocked = async (
  db: D1Database,
  studentId: string
): Promise<boolean> => {
  const row = await db
    .prepare(
      `SELECT locked_until FROM login_failures
       WHERE student_id = ?1
         AND locked_until IS NOT NULL
         AND datetime(locked_until) > datetime('now')
       LIMIT 1`
    )
    .bind(studentId.toLowerCase())
    .first<{ locked_until: string }>();
  return Boolean(row);
};

/** Clear failures after a successful login. */
export const clearLoginFailures = (
  db: D1Database,
  ctx: ExecutionContext,
  studentId: string
): void => {
  ctx.waitUntil(
    db.prepare(`DELETE FROM login_failures WHERE student_id = ?1`)
      .bind(studentId.toLowerCase())
      .run()
      .catch(() => undefined)
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3: DATA GUARD — scheduled purge (called from cron handler)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PurgeResult {
  expiredIpBlocks:      number;
  oldSecurityEvents:    number;
  expiredLoginFailures: number;
  purgedArchivedStudents: number;
  orphanedAttendance:   number;
}

/** Run all data retention / cleanup tasks. */
export const runDataPurge = async (
  db: D1Database,
  ctx: ExecutionContext
): Promise<PurgeResult> => {
  const result: PurgeResult = {
    expiredIpBlocks:        0,
    oldSecurityEvents:      0,
    expiredLoginFailures:   0,
    purgedArchivedStudents: 0,
    orphanedAttendance:     0,
  };

  // 1. Remove expired IP blocks
  try {
    const r = await db
      .prepare(`DELETE FROM ip_blocks WHERE expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now')`)
      .run();
    result.expiredIpBlocks = r.meta?.changes ?? 0;
    // Also evict from local cache
    for (const [ip, entry] of ipBlockCache) {
      if (entry.until && Date.now() > entry.until) ipBlockCache.delete(ip);
    }
  } catch { /* continue */ }

  // 2. Delete security events older than 90 days
  try {
    const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const r = await db
      .prepare(`DELETE FROM security_events WHERE created_at < ?1`)
      .bind(cutoff)
      .run();
    result.oldSecurityEvents = r.meta?.changes ?? 0;
  } catch { /* continue */ }

  // 3. Clear expired login-failure lockouts (keep record but unlock)
  try {
    const r = await db
      .prepare(
        `UPDATE login_failures
         SET locked_until = NULL, fail_count = 0
         WHERE locked_until IS NOT NULL AND datetime(locked_until) <= datetime('now')`
      )
      .run();
    result.expiredLoginFailures = r.meta?.changes ?? 0;
  } catch { /* continue */ }

  // 4. Purge archived students older than 30 days (GDPR / data minimization)
  try {
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
    // Collect IDs first so we can cascade
    const { results: toDelete } = await db
      .prepare(
        `SELECT id FROM students
         WHERE is_archived = 1
           AND archived_at IS NOT NULL
           AND archived_at <= ?1`
      )
      .bind(cutoff)
      .all<{ id: string }>();

    for (const { id } of toDelete ?? []) {
      await db.prepare(`DELETE FROM attendance WHERE student_id = ?1`).bind(id).run().catch(() => undefined);
      await db.prepare(`DELETE FROM student_notes WHERE student_id = ?1`).bind(id).run().catch(() => undefined);
      await db.prepare(`DELETE FROM students WHERE id = ?1`).bind(id).run().catch(() => undefined);
      await db.prepare(`DELETE FROM login_failures WHERE student_id = ?1`).bind(id.toLowerCase()).run().catch(() => undefined);
      result.purgedArchivedStudents += 1;
    }
  } catch { /* continue */ }

  // 5. Delete orphaned attendance rows (student deleted)
  try {
    const r = await db
      .prepare(
        `DELETE FROM attendance
         WHERE student_id NOT IN (SELECT id FROM students)`
      )
      .run();
    result.orphanedAttendance = r.meta?.changes ?? 0;
  } catch { /* continue */ }

  // Log the purge run itself
  logEvent(db, ctx, {
    type:     'data_purge',
    severity: 'low',
    ip:       'system',
    details:  result as unknown as Record<string, unknown>,
  });

  return result;
};
