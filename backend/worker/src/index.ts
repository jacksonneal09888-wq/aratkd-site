import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify, type JWTPayload } from 'hono/jwt';

interface Env {
  PORTAL_DB: D1Database;
  ADMIN_PORTAL_KEY?: string;
  KIOSK_PORTAL_KEY?: string;
  PORTAL_JWT_SECRET?: string;
  ADMIN_MASTER_USERNAME?: string;
  ADMIN_MASTER_PASSWORD?: string;
  ADMIN_MASTER_PIN?: string;
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
}

const app = new Hono<{ Bindings: Env }>();

const ALLOWED_METHODS = 'GET,POST,PATCH,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type,Authorization,X-Admin-Key,X-Kiosk-Key';

app.use(
  '*',
  cors({
    origin: (origin) => origin ?? '*',
    allowMethods: ALLOWED_METHODS.split(','),
    allowHeaders: ALLOWED_HEADERS.split(','),
    maxAge: 86400
  })
);

app.options('*', (c) =>
  c.newResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': c.req.header('Origin') || '*',
      'Access-Control-Allow-Methods': ALLOWED_METHODS,
      'Access-Control-Allow-Headers': ALLOWED_HEADERS,
      'Access-Control-Max-Age': '86400'
    }
  })
);

const TOKEN_TTL_SECONDS = 60 * 60 * 24;
const ARCHIVE_RETENTION_DAYS = 30;
const ACTIVE_STUDENT_FILTER = '(is_archived IS NULL OR is_archived = 0)';
let archiveColumnChecked = false;
let archiveColumnSupported = false;

const getJwtSecret = (env: Env) => env.PORTAL_JWT_SECRET || env.ADMIN_PORTAL_KEY || 'change-me';
const getKioskSecret = (env: Env) => env.KIOSK_PORTAL_KEY || env.ADMIN_PORTAL_KEY || 'kiosk-dev-key';
const getAdminCredentials = (env: Env) => ({
  username: env.ADMIN_MASTER_USERNAME || 'MasterAra',
  password: env.ADMIN_MASTER_PASSWORD || 'AraTKD',
  pin: env.ADMIN_MASTER_PIN || ''
});

const ensureArchiveColumn = async (db: D1Database) => {
  if (archiveColumnChecked) return archiveColumnSupported;
  const { results } = await db.prepare(`PRAGMA table_info(students)`).all();
  archiveColumnSupported = (results || []).some((row: any) => row.name === 'is_archived');
  archiveColumnChecked = true;
  return archiveColumnSupported;
};

const resolveArchiveFilter = async (db: D1Database, alias?: string) => {
  const supported = await ensureArchiveColumn(db);
  if (!supported) return '1=1';
  if (alias) {
    return `(${alias}.is_archived IS NULL OR ${alias}.is_archived = 0)`;
  }
  return ACTIVE_STUDENT_FILTER;
};

const kioskClassCatalog = [
  {
    id: 'little-ninjas',
    name: 'Little Ninjas',
    focus: 'Ages 4-6 • starts 4:30 PM',
    schedule: ['Mon 4:30 PM', 'Wed 4:30 PM', 'Fri 4:30 PM']
  },
  {
    id: 'basic',
    name: 'Basic Class',
    focus: 'White–High Yellow • starts 5:00 PM',
    schedule: ['Mon 5:00 PM', 'Wed 5:00 PM', 'Fri 5:00 PM']
  },
  {
    id: 'advanced',
    name: 'Advanced Class',
    focus: 'High Yellow–Black • starts 6:00 PM',
    schedule: ['Mon 6:00 PM', 'Wed 6:00 PM', 'Fri 6:00 PM']
  }
];
const KIOSK_ALLOWED_DAYS = new Set([1, 3, 5]); // 1=Monday, 3=Wednesday, 5=Friday

const getEasternDate = () =>
  new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

const resolveClassLevelLabel = (classType: string) => {
  const normalized = (classType || '').toLowerCase();
  if (normalized.includes('advanced')) {
    return 'Advanced Class';
  }
  if (normalized.includes('event:')) {
    return 'Special Event';
  }
  if (normalized.includes('ninja') || normalized.includes('little')) {
    return 'Little Ninjas';
  }
  return 'Basic Class';
};

const computeSeedAttendanceDates = (count: number) => {
  const results: string[] = [];
  if (!count || count <= 0) {
    return results;
  }
  let cursor = getEasternDate();
  cursor.setHours(18, 0, 0, 0);
  while (results.length < count) {
    const weekday = cursor.getDay() === 0 ? 7 : cursor.getDay();
    if (KIOSK_ALLOWED_DAYS.has(weekday)) {
      results.push(new Date(cursor).toISOString());
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return results.reverse();
};

const generateStudentId = async (db: D1Database) => {
  const row = await db
    .prepare(
      `SELECT id
       FROM students
       WHERE id LIKE 'ARA%'
       ORDER BY CAST(SUBSTR(id, 4) AS INTEGER) DESC
       LIMIT 1`
    )
    .first<{ id?: string }>();
  const numeric = row?.id ? parseInt(row.id.replace(/[^0-9]/g, ''), 10) : 0;
  const nextNumber = Number.isFinite(numeric) ? numeric + 1 : 1;
  return `ARA${String(nextNumber).padStart(3, '0')}`;
};

type SpecialEvent = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  startAt: string;
  endAt: string | null;
  capacity: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const mapSpecialEvent = (row: any): SpecialEvent => ({
  id: row.id,
  name: row.name,
  description: row.description || null,
  type: row.event_type || 'Special Class',
  startAt: row.start_at,
  endAt: row.end_at || null,
  capacity: row.capacity !== null && row.capacity !== undefined ? row.capacity : null,
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const fetchActiveEvents = async (db: D1Database): Promise<SpecialEvent[]> => {
  const now = new Date().toISOString();
  const { results } = await db
    .prepare(
      `SELECT id, name, description, event_type, start_at, end_at, capacity, is_active, created_at, updated_at
       FROM special_events
       WHERE is_active = 1
         AND datetime(start_at) <= datetime(?1)
         AND (end_at IS NULL OR datetime(end_at) >= datetime(?1))
       ORDER BY datetime(start_at) ASC`
    )
    .bind(now)
    .all();
  return (results || []).map(mapSpecialEvent);
};

const fetchAllEvents = async (db: D1Database): Promise<SpecialEvent[]> => {
  const { results } = await db
    .prepare(
      `SELECT id, name, description, event_type, start_at, end_at, capacity, is_active, created_at, updated_at
       FROM special_events
       ORDER BY datetime(start_at) DESC`
    )
    .all();
  return (results || []).map(mapSpecialEvent);
};

type SiteBanner = {
  id: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  altText: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const mapSiteBanner = (row: any): SiteBanner => ({
  id: row.id,
  title: row.title || null,
  imageUrl: row.image_url,
  linkUrl: row.link_url || null,
  altText: row.alt_text || null,
  isActive: Boolean(row.is_active),
  sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const fetchSiteBanners = async (
  db: D1Database,
  options?: { includeInactive?: boolean }
): Promise<SiteBanner[]> => {
  const includeInactive = Boolean(options?.includeInactive);
  const { results } = await db
    .prepare(
      includeInactive
        ? `SELECT id, title, image_url, link_url, alt_text, is_active, sort_order, created_at, updated_at
           FROM site_banners
           ORDER BY sort_order ASC, updated_at DESC`
        : `SELECT id, title, image_url, link_url, alt_text, is_active, sort_order, created_at, updated_at
           FROM site_banners
           WHERE is_active = 1
           ORDER BY sort_order ASC, updated_at DESC`
    )
    .all();
  return (results || []).map(mapSiteBanner);
};

const coerceBoolean = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const getNextBannerSortOrder = async (db: D1Database) => {
  const row = await db
    .prepare(`SELECT MAX(sort_order) AS max_order FROM site_banners`)
    .first<{ max_order?: number | null }>();
  const maxOrder = Number.isFinite(Number(row?.max_order)) ? Number(row?.max_order) : -1;
  return maxOrder + 1;
};

const seedAttendanceSessions = async (
  db: D1Database,
  studentId: string,
  options?: {
    count?: number;
    dates?: string[];
    classType?: string;
    classLevel?: string;
    kioskId?: string;
    source?: string;
  }
) => {
  const requestedDates =
    options?.dates
      ?.map((value) => (value || '').toString().trim())
      .filter((value) => value && !Number.isNaN(new Date(value).getTime())) ?? [];
  const timestamps =
    requestedDates.length > 0
      ? requestedDates
      : computeSeedAttendanceDates(options?.count ?? 0);
  if (!timestamps.length) {
    return 0;
  }
  const classType = (options?.classType || 'basic').trim() || 'basic';
  const classLevel = options?.classLevel || resolveClassLevelLabel(classType);
  const kioskId = options?.kioskId || 'admin-seed';
  const source = options?.source || 'admin-seed';
  for (const createdAt of timestamps) {
    await db
      .prepare(
        `INSERT INTO attendance_sessions
           (id, student_id, class_type, class_level, kiosk_id, source, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      )
      .bind(crypto.randomUUID(), studentId, classType, classLevel, kioskId, source, createdAt)
      .run();
  }
  return timestamps.length;
};

const removeAttendanceSessions = async (db: D1Database, studentId: string, count: number) => {
  if (!count || count <= 0) {
    return 0;
  }

  const { results } = await db
    .prepare(
      `SELECT id
         FROM attendance_sessions
         WHERE student_id = ?1
         ORDER BY datetime(created_at) DESC
         LIMIT ?2`
    )
    .bind(studentId, count)
    .all();

  let removed = 0;
  for (const row of results || []) {
    if (!row?.id) continue;
    await db.prepare(`DELETE FROM attendance_sessions WHERE id = ?1`).bind(row.id).run();
    removed += 1;
  }

  return removed;
};

const BELT_ATTENDANCE_TARGETS: Record<string, number> = {
  white: 25,
  'high-white': 27,
  yellow: 29,
  'high-yellow': 31,
  green: 33,
  'high-green': 35,
  blue: 37,
  'high-blue': 39,
  red: 42,
  'high-red': 48,
  black: 50
};

const BELT_ORDER = [
  'white',
  'high-white',
  'yellow',
  'high-yellow',
  'green',
  'high-green',
  'blue',
  'high-blue',
  'red',
  'high-red',
  'black'
];

const sanitizeStudentRecord = (row: any) => {
  if (!row) return null;
  const isArchived = Boolean(row.is_archived);
  const baseStatus = row.status || (row.is_suspended ? 'suspended' : 'active');
  const status = isArchived ? 'archived' : baseStatus;
  return {
    id: row.id,
    name: row.name,
    currentBelt: row.current_belt || 'White Belt',
    birthDate: row.birth_date || null,
    phone: row.phone || null,
    email: row.email || null,
    membershipType: row.membership_type || null,
    status,
    parentName: row.parent_name || null,
    emergencyContact: row.emergency_contact || null,
    address: row.address || null,
    isSuspended: Boolean(row.is_suspended),
    suspendedReason: row.suspended_reason || null,
    suspendedAt: row.suspended_at || null,
    isArchived,
    archivedAt: row.archived_at || null,
    archivedReason: row.archived_reason || null,
    archivedBy: row.archived_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');

const filterEmailRecipients = (rows: any[] = []) => {
  const deduped = new Map<string, { email: string; name: string }>();
  for (const row of rows) {
    const email = (row.email || '').trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (deduped.has(key)) continue;
    deduped.set(key, { email, name: row.name || row.id || 'Family' });
  }
  return Array.from(deduped.values());
};

const fetchEmailRecipients = async (
  db: D1Database,
  audience: string,
  opts: { belt?: string; className?: string; studentId?: string }
) => {
  const limit = 1200;
  const audienceKey = (audience || 'all').toLowerCase();
  const activeFilter = await resolveArchiveFilter(db);
  const activeFilterAlias = await resolveArchiveFilter(db, 's');
  if (audienceKey === 'student' && opts.studentId) {
    const row = await fetchStudentById(db, opts.studentId);
    return filterEmailRecipients(row ? [row] : []);
  }
  if (audienceKey === 'student' && !opts.studentId) {
    throw new Error('studentId is required for a single student email.');
  }

  if (audienceKey === 'class' && opts.className) {
    const like = `%${opts.className.toLowerCase()}%`;
    const { results } = await db
      .prepare(
        `SELECT DISTINCT s.id, s.name, s.email
         FROM students s
         INNER JOIN attendance_sessions a ON a.student_id = s.id
         WHERE s.email IS NOT NULL AND s.email != ''
           AND ${activeFilterAlias}
           AND LOWER(a.class_type) LIKE ?1
         ORDER BY s.name ASC
         LIMIT ?2`
      )
      .bind(like, limit)
      .all();
    return filterEmailRecipients(results as any[]);
  }

  if (audienceKey === 'belt' && opts.belt) {
    const belt = `%${opts.belt.toLowerCase()}%`;
    const { results } = await db
      .prepare(
        `SELECT id, name, email
         FROM students
         WHERE email IS NOT NULL AND email != ''
           AND ${activeFilter}
           AND LOWER(current_belt) LIKE ?1
         ORDER BY name ASC
         LIMIT ?2`
      )
      .bind(belt, limit)
      .all();
    return filterEmailRecipients(results as any[]);
  }

  const isActiveFilter = audienceKey === 'active';
  const { results } = await db
    .prepare(
      `SELECT id, name, email, is_suspended, status
       FROM students
       WHERE email IS NOT NULL AND email != ''
         AND ${activeFilter}
         ${isActiveFilter ? "AND (is_suspended IS NULL OR is_suspended = 0) AND (LOWER(status) IS NULL OR LOWER(status) != 'suspended')" : ''}
       ORDER BY name ASC
       LIMIT ?1`
    )
    .bind(limit)
    .all();

  return filterEmailRecipients(results as any[]);
};

const sendBrevoEmail = async (
  env: Env,
  payload: {
    to: { email: string; name: string }[];
    subject: string;
    htmlContent: string;
    textContent?: string;
  }
) => {
  const apiKey = env.BREVO_API_KEY;
  const senderEmail = env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    throw new Error('Brevo API key or sender email is missing.');
  }
  const senderName = env.BREVO_SENDER_NAME || 'ARA TKD';
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: payload.to,
      subject: payload.subject,
      htmlContent: payload.htmlContent,
      textContent: payload.textContent || payload.htmlContent.replace(/<[^>]+>/g, '')
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo send failed: ${response.status} ${errorBody}`);
  }
  return response.json();
};

const fetchStudentById = async (
  db: D1Database,
  studentId: string,
  options: { includeArchived?: boolean } = {}
) => {
  const lookup = studentId.trim().toLowerCase();
  const archiveFilter = options.includeArchived ? '' : `AND ${await resolveArchiveFilter(db)}`;
  return db
    .prepare(
      `SELECT id, name, birth_date, phone, email, current_belt, membership_type, status, parent_name, emergency_contact, address, is_suspended, suspended_reason, suspended_at, is_archived, archived_at, archived_reason, archived_by, created_at, updated_at
       FROM students
       WHERE LOWER(id) = ?1
       ${archiveFilter}
       LIMIT 1`
    )
    .bind(lookup)
    .first<any>();
};

const purgeArchivedStudents = async (db: D1Database) => {
  const supported = await ensureArchiveColumn(db);
  if (!supported) return 0;
  const cutoff = new Date(
    Date.now() - ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const { results } = await db
    .prepare(
      `SELECT id
       FROM students
       WHERE is_archived = 1
         AND archived_at IS NOT NULL
         AND archived_at <= ?1`
    )
    .bind(cutoff)
    .all();

  const ids = (results || []).map((row: any) => row.id).filter(Boolean);
  if (!ids.length) return 0;

  for (const id of ids) {
    await db.prepare(`DELETE FROM attendance_sessions WHERE student_id = ?1`).bind(id).run();
    await db.prepare(`DELETE FROM belt_progress WHERE student_id = ?1`).bind(id).run();
    await db.prepare(`DELETE FROM login_events WHERE student_id = ?1`).bind(id).run();
    await db.prepare(`DELETE FROM student_notes WHERE student_id = ?1`).bind(id).run();
    await db.prepare(`DELETE FROM memberships WHERE student_id = ?1`).bind(id).run();
    await db.prepare(`DELETE FROM student_payments WHERE student_id = ?1`).bind(id).run();
    await db.prepare(`DELETE FROM students WHERE id = ?1`).bind(id).run();
  }
  return ids.length;
};

const normalizeBeltSlug = (name: string) => {
  const slug = (name || '')
    .toLowerCase()
    .trim()
    .replace(/belt/g, '')
    .replace(/dan/g, '')
    .replace(/degree/g, '')
    .replace(/[^a-z- ]/g, '')
    .replace(/\s+/g, '-');
  if (!slug) {
    return 'white';
  }
  if (slug.includes('high-yellow')) return 'high-yellow';
  if (slug.includes('high-white')) return 'high-white';
  if (slug.includes('high-green')) return 'high-green';
  if (slug.includes('high-blue')) return 'high-blue';
  if (slug.includes('high-red')) return 'high-red';
  if (slug.includes('white')) return 'white';
  if (slug.includes('yellow')) return 'yellow';
  if (slug.includes('green')) return 'green';
  if (slug.includes('blue')) return 'blue';
  if (slug.includes('red')) return 'red';
  if (slug.includes('black')) return 'black';
  return slug;
};

const resolveLessonsRequired = (currentBelt: string) => {
  const slug = normalizeBeltSlug(currentBelt);
  const index = BELT_ORDER.indexOf(slug);
  const nextSlug =
    index >= 0 && index < BELT_ORDER.length - 1 ? BELT_ORDER[index + 1] : slug;
  return BELT_ATTENDANCE_TARGETS[nextSlug] || 25;
};

const fetchPortalProgress = async (db: D1Database, studentId: string) => {
  const { results } = await db
    .prepare(
      `SELECT belt_slug, file_name, uploaded_at
       FROM belt_progress
       WHERE student_id = ?1
       ORDER BY datetime(uploaded_at)`
    )
    .bind(studentId)
    .all();

  return (results || []).map((row: any) => ({
    beltSlug: row.belt_slug,
    fileName: row.file_name,
    uploadedAt: row.uploaded_at
  }));
};

const normalizeBirthDate = (value: string) => (value || '').trim();

const issuePortalToken = async (studentId: string, env: Env) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: studentId,
      scope: 'portal',
      iat: nowSeconds,
      exp: nowSeconds + TOKEN_TTL_SECONDS
    },
    getJwtSecret(env)
  );
};

const issueAdminToken = async (env: Env, subject = 'master-ara') => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: subject,
      scope: 'admin',
      iat: nowSeconds,
      exp: nowSeconds + TOKEN_TTL_SECONDS
    },
    getJwtSecret(env)
  );
};

type AuthResult =
  | {
      studentId: string;
      claims: JWTPayload;
    }
  | { error: Response };

const authenticateRequest = async (c: Context<{ Bindings: Env }>): Promise<AuthResult> => {
  const authHeader = c.req.header('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: c.json({ error: 'Unauthorized' }, 401) };
  }
  const token = authHeader.slice(7).trim();
  try {
    const payload: any = await verify(token, getJwtSecret(c.env));
    const studentId = (payload.sub || '').toString();
    if (!studentId) {
      return { error: c.json({ error: 'Unauthorized' }, 401) };
    }
    return { studentId, claims: payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token';
    if (/exp/i.test(message)) {
      return { error: c.json({ error: 'Session expired' }, 401) };
    }
    return { error: c.json({ error: 'Unauthorized' }, 401) };
  }
};

const authenticateAdminRequest = async (c: Context<{ Bindings: Env }>) => {
  const authHeader = c.req.header('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Admin authorization required' }, 401);
  }
  const token = authHeader.slice(7).trim();
  try {
    const payload: any = await verify(token, getJwtSecret(c.env));
    if (payload.scope !== 'admin') {
      throw new Error('Invalid scope');
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return c.json({ error: message }, 401);
  }
};

const requireKioskAuth = (c: Context<{ Bindings: Env }>) => {
  const provided = c.req.header('X-Kiosk-Key') || '';
  const expected = getKioskSecret(c.env);
  if (!expected || provided !== expected) {
    return c.json({ error: 'Unauthorized kiosk' }, 401);
  }
  return null;
};

const buildAttendanceSummary = async (
  db: D1Database,
  studentId: string,
  currentBelt: string,
  options?: { sinceIso?: string }
) => {
  const sinceIso =
    options?.sinceIso ||
    new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const totals = await db
    .prepare(
      `SELECT
         COUNT(*) AS total_sessions,
         MIN(created_at) AS first_session,
         MAX(created_at) AS last_session
       FROM attendance_sessions
       WHERE student_id = ?1
         AND datetime(created_at) >= datetime(?2)`
    )
    .bind(studentId, sinceIso)
    .first<any>();

  const breakdownQuery = await db
    .prepare(
      `SELECT class_type, COUNT(*) AS count
       FROM attendance_sessions
       WHERE student_id = ?1
         AND datetime(created_at) >= datetime(?2)
       GROUP BY class_type`
    )
    .bind(studentId, sinceIso)
    .all();

  const recentQuery = await db
    .prepare(
      `SELECT class_type, class_level, created_at
       FROM attendance_sessions
       WHERE student_id = ?1
       ORDER BY datetime(created_at) DESC
       LIMIT 10`
    )
    .bind(studentId)
    .all();

  const lessonsRequired = resolveLessonsRequired(currentBelt || '');
  const sessionCount = totals?.total_sessions || 0;
  const attendancePercent = lessonsRequired
    ? Number(Math.min(1, sessionCount / lessonsRequired) * 100).toFixed(1)
    : '0.0';

  return {
    since: sinceIso,
    totals: {
      sessions: sessionCount,
      firstSession: totals?.first_session || null,
      lastSession: totals?.last_session || null
    },
    breakdown: (breakdownQuery.results || []).map((row: any) => ({
      classType: row.class_type,
      sessions: row.count
    })),
    recent: (recentQuery.results || []).map((row: any) => ({
      classType: row.class_type,
      classLevel: row.class_level,
      checkInAt: row.created_at
    })),
    targetLessons: lessonsRequired,
    attendancePercent: Number(attendancePercent)
  };
};

app.get('/', (c) => c.json({ message: 'Portal Worker API' }));

app.get('/site/banners', async (c) => {
  const banners = await fetchSiteBanners(c.env.PORTAL_DB, { includeInactive: false });
  return c.json({
    banners,
    generatedAt: new Date().toISOString()
  });
});

app.post('/portal/admin/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const username = (body.username || '').trim();
  const password = (body.password || '').trim();
  const pin = (body.pin || '').trim();

  const expected = getAdminCredentials(c.env);
  if (!username || !password) {
    return c.json({ error: 'Username and password are required' }, 400);
  }
  if (
    username !== expected.username ||
    password !== expected.password ||
    (expected.pin && pin !== expected.pin)
  ) {
    return c.json({ error: 'Invalid admin credentials' }, 401);
  }

  const token = await issueAdminToken(c.env, username);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

  return c.json({ token, expiresAt });
});

app.get('/portal/admin/banners', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;

  const banners = await fetchSiteBanners(c.env.PORTAL_DB, { includeInactive: true });
  return c.json({
    banners,
    generatedAt: new Date().toISOString()
  });
});

app.post('/portal/admin/banners', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;

  const body = await c.req.json().catch(() => ({}));
  const rawId = (body.id || '').toString().trim();
  const title = (body.title || '').toString().trim() || null;
  const imageUrl = (body.imageUrl || body.image_url || body.image || '').toString().trim();
  const linkUrl = (body.linkUrl || body.link_url || '').toString().trim() || null;
  const altText = (body.altText || body.alt_text || '').toString().trim() || null;
  const sortInput = body.sortOrder ?? body.sort_order;
  const requestedSort =
    Number.isFinite(Number(sortInput)) && sortInput !== '' ? Number(sortInput) : null;
  const now = new Date().toISOString();

  if (rawId) {
    const existing = await c.env.PORTAL_DB.prepare(
      `SELECT id, title, image_url, link_url, alt_text, is_active, sort_order, created_at, updated_at
       FROM site_banners
       WHERE id = ?1`
    )
      .bind(rawId)
      .first<any>();
    if (!existing) {
      return c.json({ error: 'Banner not found' }, 404);
    }
    const resolvedImage = imageUrl || existing.image_url;
    if (!resolvedImage) {
      return c.json({ error: 'imageUrl is required' }, 400);
    }
    const isActive = coerceBoolean(body.isActive ?? body.is_active, Boolean(existing.is_active));
    const nextSort =
      requestedSort !== null
        ? requestedSort
        : Number.isFinite(Number(existing.sort_order))
            ? Number(existing.sort_order)
            : 0;

    await c.env.PORTAL_DB.prepare(
      `UPDATE site_banners
         SET title = ?1,
             image_url = ?2,
             link_url = ?3,
             alt_text = ?4,
             is_active = ?5,
             sort_order = ?6,
             updated_at = ?7
       WHERE id = ?8`
    )
      .bind(
        title ?? existing.title,
        resolvedImage,
        linkUrl ?? existing.link_url,
        altText ?? existing.alt_text,
        isActive ? 1 : 0,
        nextSort,
        now,
        rawId
      )
      .run();

    const updated = await c.env.PORTAL_DB.prepare(
      `SELECT id, title, image_url, link_url, alt_text, is_active, sort_order, created_at, updated_at
       FROM site_banners
       WHERE id = ?1`
    )
      .bind(rawId)
      .first<any>();
    return c.json({ ok: true, banner: mapSiteBanner(updated) });
  }

  if (!imageUrl) {
    return c.json({ error: 'imageUrl is required' }, 400);
  }

  const id = crypto.randomUUID();
  const isActive = coerceBoolean(body.isActive ?? body.is_active, true);
  const sortOrder = requestedSort !== null ? requestedSort : await getNextBannerSortOrder(c.env.PORTAL_DB);

  await c.env.PORTAL_DB.prepare(
    `INSERT INTO site_banners
       (id, title, image_url, link_url, alt_text, is_active, sort_order, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)`
  )
    .bind(id, title, imageUrl, linkUrl, altText, isActive ? 1 : 0, sortOrder, now)
    .run();

  return c.json({
    ok: true,
    banner: {
      id,
      title,
      imageUrl,
      linkUrl,
      altText,
      isActive,
      sortOrder,
      createdAt: now,
      updatedAt: now
    }
  });
});

app.post('/portal/admin/banners/reorder', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;

  const body = await c.req.json().catch(() => ({}));
  const order = Array.isArray(body.order) ? body.order.filter(Boolean) : [];
  if (!order.length) {
    return c.json({ error: 'order array is required' }, 400);
  }

  const now = new Date().toISOString();
  for (let idx = 0; idx < order.length; idx += 1) {
    const id = String(order[idx]).trim();
    if (!id) continue;
    await c.env.PORTAL_DB.prepare(
      `UPDATE site_banners
         SET sort_order = ?1,
             updated_at = ?2
       WHERE id = ?3`
    )
      .bind(idx, now, id)
      .run();
  }

  const banners = await fetchSiteBanners(c.env.PORTAL_DB, { includeInactive: true });
  return c.json({ ok: true, banners });
});

app.delete('/portal/admin/banners/:bannerId', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;

  const bannerId = c.req.param('bannerId').trim();
  if (!bannerId) {
    return c.json({ error: 'Banner id is required' }, 400);
  }

  await c.env.PORTAL_DB.prepare(`DELETE FROM site_banners WHERE id = ?1`).bind(bannerId).run();
  return c.json({ ok: true });
});

app.post('/portal/login-event', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const studentId = (body.studentId || '').trim();
  const action = (body.action || 'login').trim().toLowerCase();
  const actor = (body.actor || 'student').trim().toLowerCase();
  const birthDate = normalizeBirthDate(body.birthDate || '');

  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }

  await purgeArchivedStudents(c.env.PORTAL_DB);

  const isLoginAttempt = action === 'login';
  let token: string | null = null;
  let studentProfile: any = null;
  let progressSnapshot: any = null;
  let canonicalId = studentId;

  if (isLoginAttempt) {
    if (!birthDate) {
      return c.json({ error: 'birthDate is required for login' }, 400);
    }
    const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
    if (!student) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    canonicalId = student.id;
    if (student.is_suspended) {
      return c.json(
        {
          error: 'Account suspended',
          reason: student.suspended_reason || 'Contact the studio to resolve billing.'
        },
        403
      );
    }

    const storedBirthDate = normalizeBirthDate(student.birth_date);
    if (!storedBirthDate || storedBirthDate !== birthDate) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const records = await fetchPortalProgress(c.env.PORTAL_DB, canonicalId);
    token = await issuePortalToken(canonicalId, c.env);
    studentProfile = sanitizeStudentRecord(student);
    progressSnapshot = {
      records,
      generatedAt: new Date().toISOString()
    };
  }

  const timestamp = new Date().toISOString();
  await c.env.PORTAL_DB.prepare(
    `INSERT INTO login_events (student_id, action, actor, created_at)
     VALUES (?1, ?2, ?3, ?4)`
  )
    .bind(canonicalId, action, actor, timestamp)
    .run();

  const payload: Record<string, unknown> = { ok: true, recordedAt: timestamp };
  if (token && studentProfile && progressSnapshot) {
    payload.token = token;
    payload.student = studentProfile;
    payload.progress = progressSnapshot;
  }

  return c.json(payload);
});

app.post('/portal/progress', async (c) => {
  const auth = await authenticateRequest(c);
  if ('error' in auth) {
    return auth.error;
  }

  const body = await c.req.json().catch(() => ({}));
  const studentId = (body.studentId || '').trim();
  const beltSlug = (body.beltSlug || '').trim().toLowerCase();
  const fileName = body.fileName ? String(body.fileName).trim() : null;
  const uploadedAtInput = (body.uploadedAt || '').trim();

  if (!studentId || !beltSlug) {
    return c.json({ error: 'studentId and beltSlug are required' }, 400);
  }

  if (studentId.toLowerCase() !== auth.studentId.toLowerCase()) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  let uploadedAt = new Date();
  if (uploadedAtInput) {
    const parsed = new Date(uploadedAtInput);
    if (!Number.isNaN(parsed.getTime())) {
      uploadedAt = parsed;
    }
  }

  const uploadedIso = uploadedAt.toISOString();
  const createdIso = new Date().toISOString();

  const existingProgress = await c.env.PORTAL_DB.prepare(
    `SELECT id FROM belt_progress WHERE student_id = ?1 AND belt_slug = ?2`
  )
    .bind(studentId, beltSlug)
    .first<{ id?: string }>();

  await c.env.PORTAL_DB.prepare(
    `INSERT INTO belt_progress (student_id, belt_slug, file_name, uploaded_at, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(student_id, belt_slug)
     DO UPDATE SET file_name = excluded.file_name,
                   uploaded_at = excluded.uploaded_at,
                   created_at = excluded.created_at`
  )
    .bind(studentId, beltSlug, fileName, uploadedIso, createdIso)
    .run();

  let attendanceReset = false;
  let attendance = null;
  if (!existingProgress?.id) {
    await c.env.PORTAL_DB.prepare(`DELETE FROM attendance_sessions WHERE student_id = ?1`)
      .bind(studentId)
      .run();
    attendanceReset = true;
    const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
    attendance = await buildAttendanceSummary(
      c.env.PORTAL_DB,
      studentId,
      student?.current_belt || ''
    );
  }

  return c.json({ ok: true, beltSlug, uploadedAt: uploadedIso, attendanceReset, attendance });
});

app.get('/portal/progress/:studentId', async (c) => {
  const auth = await authenticateRequest(c);
  if ('error' in auth) {
    return auth.error;
  }
  const studentId = c.req.param('studentId').trim();
  if (!studentId) {
    return c.json({ error: 'Invalid student id' }, 400);
  }
  if (studentId.toLowerCase() !== auth.studentId.toLowerCase()) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const records = await fetchPortalProgress(c.env.PORTAL_DB, studentId);

  return c.json({
    records,
    generatedAt: new Date().toISOString()
  });
});

app.get('/portal/profile', async (c) => {
  const auth = await authenticateRequest(c);
  if ('error' in auth) {
    return auth.error;
  }

  const student = await fetchStudentById(c.env.PORTAL_DB, auth.studentId);
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  return c.json({ student: sanitizeStudentRecord(student) });
});

app.get('/kiosk/classes', async (c) => {
  const events = await fetchActiveEvents(c.env.PORTAL_DB);
  return c.json({
    classes: kioskClassCatalog,
    events,
    generatedAt: new Date().toISOString()
  });
});

app.post('/kiosk/check-in', async (c) => {
  const authError = requireKioskAuth(c);
  if (authError) {
    return authError;
  }

  const body = await c.req.json().catch(() => ({}));
  const studentId = (body.studentId || '').trim();
  const classType = (body.classType || '').trim();
  const eventId = (body.eventId || '').trim();
  const classLevel = (body.classLevel || '').trim();
  const kioskId = (body.kioskId || 'front-desk').trim();
  const source = (body.source || 'kiosk').toString();

  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }
  if (!classType && !eventId) {
    return c.json({ error: 'classType is required' }, 400);
  }
  const nowEastern = getEasternDate();
  const weekday = nowEastern.getDay() === 0 ? 7 : nowEastern.getDay();
  const isEventCheckIn = Boolean(eventId);
  if (!isEventCheckIn && !KIOSK_ALLOWED_DAYS.has(weekday)) {
    return c.json(
      { error: 'Kiosk check-ins are limited to Monday, Wednesday, and Friday. See the front desk.' },
      403
    );
  }

  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  if (!student) {
    return c.json({ error: 'Unknown student ID' }, 404);
  }
  const status = (student.status || '').toLowerCase();
  if (student.is_suspended || ['inactive', 'suspended', 'frozen'].includes(status)) {
    return c.json(
      {
        error: 'Account deactivated',
        reason: student.suspended_reason || 'See the front desk to reactivate.'
      },
      403
    );
  }
  if (student.is_suspended) {
    return c.json(
      {
        error: 'Account deactivated',
        reason: student.suspended_reason || 'See the front desk to reactivate.'
      },
      403
    );
  }

  const canonicalId = student.id;
  let resolvedClassType = classType || 'event';
  let resolvedClassLevel = classLevel || null;

  if (isEventCheckIn) {
    const event = await c.env.PORTAL_DB
      .prepare(
        `SELECT id, name, is_active, start_at, end_at
         FROM special_events
         WHERE id = ?1`
      )
      .bind(eventId)
      .first<any>();
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }
    const active = Boolean(event.is_active);
    const nowIso = nowEastern.toISOString();
    const withinWindow =
      (!event.start_at || new Date(event.start_at) <= nowEastern) &&
      (!event.end_at || new Date(event.end_at) >= nowEastern);
    if (!active || !withinWindow) {
      return c.json({ error: 'Event is not accepting check-ins' }, 403);
    }
    resolvedClassType = `event:${event.id}`;
    resolvedClassLevel = event.type ? `${event.type}: ${event.name || 'Special Event'}` : event.name || 'Special Event';
  }
  const timestamp = new Date().toISOString();
  await c.env.PORTAL_DB.prepare(
    `INSERT INTO attendance_sessions
       (id, student_id, class_type, class_level, kiosk_id, source, event_id, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  )
    .bind(
      crypto.randomUUID(),
      canonicalId,
      resolvedClassType,
      resolvedClassLevel,
      kioskId || null,
      source,
      isEventCheckIn ? eventId : null,
      timestamp
    )
    .run();

  const summary = await buildAttendanceSummary(
    c.env.PORTAL_DB,
    canonicalId,
    student.current_belt || ''
  );

  return c.json({
    ok: true,
    recordedAt: timestamp,
    student: sanitizeStudentRecord(student),
    classType: resolvedClassType,
    classLevel: resolvedClassLevel,
    attendancePercent: summary.attendancePercent
  });
});

app.get('/portal/attendance/:studentId', async (c) => {
  const auth = await authenticateRequest(c);
  if ('error' in auth) {
    return auth.error;
  }

  const paramId = c.req.param('studentId').trim();
  if (!paramId) {
    return c.json({ error: 'Invalid student id' }, 400);
  }
  if (paramId.toLowerCase() !== auth.studentId.toLowerCase()) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const sinceQuery = c.req.query('since');
  const student = await fetchStudentById(c.env.PORTAL_DB, paramId);
  const summary = await buildAttendanceSummary(
    c.env.PORTAL_DB,
    paramId,
    student?.current_belt || '',
    { sinceIso: sinceQuery }
  );

  return c.json(summary);
});

app.get('/portal/admin/activity', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) {
    return authError;
  }
  await purgeArchivedStudents(c.env.PORTAL_DB);
  const activeFilter = await resolveArchiveFilter(c.env.PORTAL_DB);
  const activeFilter = await resolveArchiveFilter(c.env.PORTAL_DB);
  const activeFilterAlias = await resolveArchiveFilter(c.env.PORTAL_DB, 's');

  let limit = 200;
  const queryLimit = c.req.query('limit');
  if (queryLimit) {
    const parsed = parseInt(queryLimit, 10);
    if (!Number.isNaN(parsed)) {
      limit = Math.min(Math.max(parsed, 1), 1000);
    }
  }

  const eventsQuery = await c.env.PORTAL_DB.prepare(
    `SELECT student_id, action, actor, created_at
     FROM login_events
     WHERE student_id IN (
       SELECT id FROM students WHERE ${activeFilter}
     )
     ORDER BY datetime(created_at) DESC
     LIMIT ?1`
  )
    .bind(limit)
    .all();

  const summaryQuery = await c.env.PORTAL_DB.prepare(
    `SELECT
       le.student_id,
       MAX(s.name) AS student_name,
       MAX(s.current_belt) AS student_belt,
       MAX(s.is_suspended) AS is_suspended,
       MAX(s.suspended_reason) AS suspended_reason,
       MAX(s.suspended_at) AS suspended_at,
       COUNT(*) AS total_events,
       SUM(CASE WHEN le.action = 'login' THEN 1 ELSE 0 END) AS login_events,
       MAX(le.created_at) AS last_event,
       (
         SELECT bp.belt_slug
         FROM belt_progress bp
         WHERE bp.student_id = le.student_id
         ORDER BY datetime(bp.uploaded_at) DESC
         LIMIT 1
       ) AS latest_belt,
       (
         SELECT bp.uploaded_at
         FROM belt_progress bp
         WHERE bp.student_id = le.student_id
         ORDER BY datetime(bp.uploaded_at) DESC
         LIMIT 1
       ) AS latest_belt_uploaded
     FROM login_events le
     LEFT JOIN students s ON s.id = le.student_id AND ${activeFilterAlias}
     WHERE le.student_id IN (
       SELECT id FROM students WHERE ${activeFilter}
     )
     GROUP BY le.student_id
     ORDER BY datetime(last_event) DESC`
  ).all();

  const events = (eventsQuery.results || []).map((row: any) => ({
    studentId: row.student_id,
    action: row.action,
    actor: row.actor,
    recordedAt: row.created_at
  }));

  const summary = (summaryQuery.results || []).map((row: any) => ({
    studentId: row.student_id,
    name: row.student_name,
    currentBelt: row.student_belt,
    isSuspended: row.is_suspended,
    suspendedReason: row.suspended_reason,
    suspendedAt: row.suspended_at,
    totalEvents: row.total_events,
    loginEvents: row.login_events,
    lastEventAt: row.last_event,
    latestBelt: row.latest_belt,
    latestBeltUploadedAt: row.latest_belt_uploaded
  }));

  return c.json({
    events,
    summary,
    generatedAt: new Date().toISOString()
  });
});

app.get('/portal/admin/attendance', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) {
    return authError;
  }
  await purgeArchivedStudents(c.env.PORTAL_DB);

  let limit = 50;
  const queryLimit = c.req.query('limit');
  if (queryLimit) {
    const parsed = parseInt(queryLimit, 10);
    if (!Number.isNaN(parsed)) {
      limit = Math.min(Math.max(parsed, 1), 200);
    }
  }

  const { results } = await c.env.PORTAL_DB.prepare(
    `SELECT student_id, class_type, class_level, kiosk_id, created_at
     FROM attendance_sessions
     ORDER BY datetime(created_at) DESC
     LIMIT ?1`
  )
    .bind(limit)
    .all();

  const percentCache = new Map<string, number>();
  const sessions = [];
  for (const row of results || []) {
    let percent = percentCache.get(row.student_id);
    if (percent === undefined) {
      const student = await fetchStudentById(c.env.PORTAL_DB, row.student_id);
      if (!student) {
        continue;
      }
      const summary = await buildAttendanceSummary(
        c.env.PORTAL_DB,
        row.student_id,
        student?.current_belt || ''
      );
      percent = summary.attendancePercent;
      percentCache.set(row.student_id, percent);
    }
    sessions.push({
      studentId: row.student_id,
      classType: row.class_type,
      classLevel: row.class_level,
      kioskId: row.kiosk_id,
      checkInAt: row.created_at,
      percentOfGoal: percent
    });
  }

  return c.json({
    sessions,
    generatedAt: new Date().toISOString()
  });
});

app.get('/portal/admin/events', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) {
    return authError;
  }
  const events = await fetchAllEvents(c.env.PORTAL_DB);
  return c.json({ events, generatedAt: new Date().toISOString() });
});

app.post('/portal/admin/events', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;

  const body = await c.req.json().catch(() => ({}));
  const name = (body.name || '').toString().trim();
  const description = (body.description || '').toString().trim();
  const type =
    (body.type || body.eventType || '').toString().trim() || 'Special Class';
  const startAt = (body.startAt || '').toString().trim();
  const endAt = (body.endAt || '').toString().trim();
  const capacityValue = body.capacity;
  const isActive = Boolean(body.isActive);

  if (!name || !startAt) {
    return c.json({ error: 'name and startAt are required' }, 400);
  }
  const parsedCapacity = Number(capacityValue);
  const capacity =
    capacityValue === null || capacityValue === undefined || Number.isNaN(parsedCapacity)
      ? null
      : parsedCapacity;

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await c.env.PORTAL_DB.prepare(
    `INSERT INTO special_events
       (id, name, description, event_type, start_at, end_at, capacity, is_active, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)`
  )
    .bind(
      id,
      name,
      description || null,
      type,
      startAt,
      endAt || null,
      capacity,
      isActive ? 1 : 0,
      now
    )
    .run();

  const events = await fetchAllEvents(c.env.PORTAL_DB);
  return c.json({ ok: true, eventId: id, events });
});

app.post('/portal/admin/events/:eventId/toggle', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;
  const eventId = c.req.param('eventId').trim();
  if (!eventId) return c.json({ error: 'eventId is required' }, 400);
  const body = await c.req.json().catch(() => ({}));
  const activate = Boolean(body.active);
  const now = new Date().toISOString();
  await c.env.PORTAL_DB.prepare(
    `UPDATE special_events
     SET is_active = ?1,
         updated_at = ?2
     WHERE id = ?3`
  )
    .bind(activate ? 1 : 0, now, eventId)
    .run();
  const events = await fetchAllEvents(c.env.PORTAL_DB);
  return c.json({ ok: true, events });
});

app.post('/portal/admin/attendance/adjust', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) {
    return authError;
  }

  const body = await c.req.json().catch(() => ({}));
  const studentId = (body.studentId || '').trim();
  const deltaInput = Number(body.delta ?? 0);
  const note = (body.note || '').toString().trim();
  const classType = (body.classType || 'basic').toString().trim() || 'basic';
  const classLevel =
    (body.classLevel || '').toString().trim() || resolveClassLevelLabel(classType);

  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }

  if (!Number.isFinite(deltaInput) || deltaInput === 0) {
    return c.json({ error: 'delta must be a non-zero number' }, 400);
  }

  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const delta = Math.trunc(deltaInput);
  let added = 0;
  let removed = 0;
  const now = new Date().toISOString();

  if (delta > 0) {
    added = await seedAttendanceSessions(c.env.PORTAL_DB, student.id, {
      count: delta,
      classType,
      classLevel,
      kioskId: 'admin-panel',
      source: note ? `admin-adjust:${note.slice(0, 48)}` : 'admin-adjust'
    });
  } else if (delta < 0) {
    removed = await removeAttendanceSessions(c.env.PORTAL_DB, student.id, Math.abs(delta));
  }

  await c.env.PORTAL_DB.prepare(
    `UPDATE students
       SET updated_at = ?1
     WHERE id = ?2`
  )
    .bind(now, student.id)
    .run();

  const refreshed = await fetchStudentById(c.env.PORTAL_DB, student.id);
  const summary = await buildAttendanceSummary(
    c.env.PORTAL_DB,
    student.id,
    refreshed?.current_belt || ''
  );

  return c.json({
    ok: true,
    student: sanitizeStudentRecord(refreshed),
    added,
    removed,
    attendance: summary
  });
});

app.get('/portal/admin/students', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) {
    return authError;
  }
  await purgeArchivedStudents(c.env.PORTAL_DB);

  let limit = 500;
  const queryLimit = c.req.query('limit');
  if (queryLimit) {
    const parsed = parseInt(queryLimit, 10);
    if (!Number.isNaN(parsed)) {
      limit = Math.min(Math.max(parsed, 1), 1000);
    }
  }

  const { results } = await c.env.PORTAL_DB.prepare(
    `SELECT id, name, birth_date, phone, email, current_belt, membership_type, status, parent_name, emergency_contact, address, is_suspended, suspended_reason, suspended_at, created_at, updated_at
     FROM students
     WHERE ${activeFilter}
     ORDER BY name ASC
     LIMIT ?1`
  )
    .bind(limit)
    .all();

  const students = (results || []).map((row: any) => sanitizeStudentRecord(row));

  return c.json({
    students,
    generatedAt: new Date().toISOString()
  });
});

app.post('/portal/admin/students/membership', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;

  const body = await c.req.json().catch(() => ({}));
  const studentId = (body.studentId || '').trim();
  const membershipType = (body.membershipType || '').toString().trim() || null;
  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }

  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const timestamp = new Date().toISOString();
  await c.env.PORTAL_DB.prepare(
    `UPDATE students
     SET membership_type = ?1,
         updated_at = ?2
     WHERE id = ?3`
  )
    .bind(membershipType, timestamp, student.id)
    .run();

  const updated = await fetchStudentById(c.env.PORTAL_DB, student.id);
  return c.json({ ok: true, student: sanitizeStudentRecord(updated) });
});

app.post('/portal/admin/students/:studentId/archive', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;
  await purgeArchivedStudents(c.env.PORTAL_DB);
  const archiveSupported = await ensureArchiveColumn(c.env.PORTAL_DB);
  if (!archiveSupported) {
    return c.json({ error: 'Archive support not enabled. Run migrations.' }, 500);
  }

  const studentId = c.req.param('studentId').trim();
  if (!studentId) {
    return c.json({ error: 'Student id is required' }, 400);
  }

  const student = await fetchStudentById(c.env.PORTAL_DB, studentId, {
    includeArchived: true
  });
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  if (student.is_archived) {
    return c.json({
      ok: true,
      archivedAt: student.archived_at,
      student: sanitizeStudentRecord(student)
    });
  }

  const body = await c.req.json().catch(() => ({}));
  const reason = (body.reason || '').toString().trim();
  const archivedBy = (body.archivedBy || 'admin').toString().trim() || 'admin';
  const now = new Date().toISOString();

  await c.env.PORTAL_DB.prepare(
    `UPDATE students
       SET is_archived = 1,
           archived_at = ?1,
           archived_reason = ?2,
           archived_by = ?3,
           status = 'archived',
           updated_at = ?4
     WHERE id = ?5`
  )
    .bind(now, reason || null, archivedBy, now, student.id)
    .run();

  const updated = await fetchStudentById(c.env.PORTAL_DB, student.id, {
    includeArchived: true
  });

  return c.json({
    ok: true,
    archivedAt: now,
    student: sanitizeStudentRecord(updated)
  });
});

app.patch('/portal/admin/students/:studentId', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;

  const studentId = c.req.param('studentId').trim();
  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }

  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const name = (body.name || '').toString().trim();
  const birthDate = normalizeBirthDate(body.birthDate || student.birth_date || '');
  const phone = (body.phone || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const currentBelt = (body.currentBelt || '').toString().trim();
  const membershipProvided = Object.prototype.hasOwnProperty.call(body, 'membershipType');
  const membershipType = membershipProvided ? (body.membershipType || '').toString().trim() : '';
  const status = (body.status || '').toString().trim();
  const parentName = (body.parentName || '').toString().trim();
  const emergencyContact = (body.emergencyContact || '').toString().trim();
  const address = (body.address || '').toString().trim();

  const updates: string[] = [];
  const values: any[] = [];

  if (name) {
    updates.push(`name = ?${updates.length + 1}`);
    values.push(name);
  }
  if (birthDate) {
    updates.push(`birth_date = ?${updates.length + 1}`);
    values.push(birthDate);
  }
  if (phone) {
    updates.push(`phone = ?${updates.length + 1}`);
    values.push(phone);
  }
  if (email) {
    updates.push(`email = ?${updates.length + 1}`);
    values.push(email);
  }
  if (currentBelt) {
    updates.push(`current_belt = ?${updates.length + 1}`);
    values.push(currentBelt);
  }
  if (membershipProvided) {
    updates.push(`membership_type = ?${updates.length + 1}`);
    values.push(membershipType || null);
  }
  if (status) {
    updates.push(`status = ?${updates.length + 1}`);
    values.push(status);
  }
  if (parentName) {
    updates.push(`parent_name = ?${updates.length + 1}`);
    values.push(parentName);
  }
  if (emergencyContact) {
    updates.push(`emergency_contact = ?${updates.length + 1}`);
    values.push(emergencyContact);
  }
  if (address) {
    updates.push(`address = ?${updates.length + 1}`);
    values.push(address);
  }

  if (!updates.length) {
    return c.json({ error: 'No valid fields provided' }, 400);
  }

  const timestamp = new Date().toISOString();
  updates.push(`updated_at = ?${updates.length + 1}`);
  values.push(timestamp);
  values.push(student.id);

  const query = `UPDATE students SET ${updates.join(', ')} WHERE id = ?${updates.length + 1}`;
  await c.env.PORTAL_DB.prepare(query).bind(...values).run();

  const updated = await fetchStudentById(c.env.PORTAL_DB, student.id);
  return c.json({ ok: true, student: sanitizeStudentRecord(updated) });
});

app.post('/portal/admin/students/full', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;

  const body = await c.req.json().catch(() => ({}));
  const firstName = (body.firstName || '').toString().trim();
  const lastName = (body.lastName || '').toString().trim();
  const name = `${firstName} ${lastName}`.trim();
  const birthDate = normalizeBirthDate(body.birthDate || '');
  const phone = (body.phone || '').toString().trim() || null;
  const email = (body.email || '').toString().trim() || null;
  const parentName = (body.parentName || '').toString().trim() || null;
  const emergencyContact = (body.emergencyContact || '').toString().trim() || null;
  const address = (body.address || '').toString().trim() || null;
  const status = (body.status || 'active').toString().trim().toLowerCase() || 'active';
  const currentBelt = (body.currentBelt || 'White Belt').toString().trim() || 'White Belt';

  const membershipType = (body.membershipType || '').toString().trim();
  const membershipStart = (body.membershipStart || '').toString().trim() || null;
  const billingCycle = (body.billingCycle || '').toString().trim() || null;
  const paymentMethod = (body.paymentMethod || '').toString().trim() || null;

  const noteMessage = (body.initialNote || '').toString().trim();
  const noteType = (body.initialNoteType || 'note').toString().trim() || 'note';
  const noteAuthor = (body.initialNoteAuthor || 'Admin').toString().trim() || 'Admin';

  if (!name || !birthDate) {
    return c.json({ error: 'Name and birthDate are required' }, 400);
  }

  const studentId = await generateStudentId(c.env.PORTAL_DB);
  const now = new Date().toISOString();
  await c.env.PORTAL_DB.prepare(
    `INSERT INTO students
       (id, name, birth_date, phone, email, current_belt, membership_type, status, parent_name, emergency_contact, address, is_suspended, suspended_reason, suspended_at, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 0, NULL, NULL, ?12, ?12)`
  )
    .bind(
      studentId,
      name,
      birthDate,
      phone,
      email,
      currentBelt,
      membershipType || null,
      status,
      parentName,
      emergencyContact,
      address,
      now
    )
    .run();

  if (membershipType) {
    await c.env.PORTAL_DB.prepare(
      `INSERT INTO memberships
         (id, student_id, membership_type, start_date, end_date, billing_cycle, payment_method, status, created_at)
       VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, 'active', ?7)`
    )
      .bind(crypto.randomUUID(), studentId, membershipType, membershipStart, billingCycle, paymentMethod, now)
      .run();
  }

  if (noteMessage) {
    const safeType = ['note', 'payment', 'message'].includes(noteType) ? noteType : 'note';
    await c.env.PORTAL_DB.prepare(
      `INSERT INTO student_notes (id, student_id, note_type, message, author, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
      .bind(crypto.randomUUID(), studentId, safeType, noteMessage, noteAuthor, now)
      .run();
  }

  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  return c.json({
    ok: true,
    student: sanitizeStudentRecord(student),
    login: {
      studentId,
      birthDate
    }
  });
});

app.post('/portal/admin/students/:studentId/payments', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;
  const studentId = c.req.param('studentId').trim();
  if (!studentId) return c.json({ error: 'studentId is required' }, 400);
  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  if (!student) return c.json({ error: 'Student not found' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const amount = Number(body.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return c.json({ error: 'Valid amount is required' }, 400);
  }
  const method = (body.method || '').toString().trim() || null;
  const statusInput = (body.status || 'paid').toString().trim() || 'paid';
  const note = (body.note || '').toString().trim() || null;
  const membershipId = (body.membershipId || '').toString().trim() || null;
  const now = new Date().toISOString();

  await c.env.PORTAL_DB.prepare(
    `INSERT INTO student_payments
       (id, student_id, amount, method, status, note, created_at, membership_id)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  )
    .bind(crypto.randomUUID(), studentId, amount, method, statusInput, note, now, membershipId || null)
    .run();

  return c.json({ ok: true });
});

app.get('/portal/admin/students/:studentId/profile', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;
  const studentId = c.req.param('studentId').trim();
  if (!studentId) return c.json({ error: 'studentId is required' }, 400);
  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  if (!student) return c.json({ error: 'Student not found' }, 404);

  const notesQuery = await c.env.PORTAL_DB.prepare(
    `SELECT id, note_type, message, author, created_at
     FROM student_notes
     WHERE student_id = ?1
     ORDER BY datetime(created_at) DESC
     LIMIT 50`
  )
    .bind(studentId)
    .all();

  const membershipQuery = await c.env.PORTAL_DB.prepare(
    `SELECT id, membership_type, start_date, end_date, billing_cycle, payment_method, status, created_at
     FROM memberships
     WHERE student_id = ?1
     ORDER BY datetime(created_at) DESC
     LIMIT 1`
  )
    .bind(studentId)
    .first();

  const paymentsQuery = await c.env.PORTAL_DB.prepare(
    `SELECT id, amount, method, status, note, created_at, membership_id
     FROM student_payments
     WHERE student_id = ?1
     ORDER BY datetime(created_at) DESC
     LIMIT 50`
    )
    .bind(studentId)
    .all();

  const attendance = await buildAttendanceSummary(
    c.env.PORTAL_DB,
    student.id,
    student.current_belt || ''
  );

  return c.json({
    student: sanitizeStudentRecord(student),
    membership: membershipQuery
      ? {
          id: membershipQuery.id,
          type: membershipQuery.membership_type,
          startDate: membershipQuery.start_date,
          endDate: membershipQuery.end_date,
          billingCycle: membershipQuery.billing_cycle,
          paymentMethod: membershipQuery.payment_method,
          status: membershipQuery.status,
          createdAt: membershipQuery.created_at
        }
      : null,
    notes: (notesQuery.results || []).map((row: any) => ({
      id: row.id,
      noteType: row.note_type,
      message: row.message,
      author: row.author,
      createdAt: row.created_at
    })),
    payments: (paymentsQuery.results || []).map((row: any) => ({
      id: row.id,
      amount: row.amount,
      method: row.method,
      status: row.status,
      note: row.note,
      createdAt: row.created_at,
      membershipId: row.membership_id
    })),
    attendance
  });
});

app.get('/portal/admin/students/:studentId/notes', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;

  const studentId = c.req.param('studentId').trim();
  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }
  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const { results } = await c.env.PORTAL_DB.prepare(
    `SELECT id, note_type, message, author, created_at
     FROM student_notes
     WHERE student_id = ?1
     ORDER BY datetime(created_at) DESC
     LIMIT 100`
  )
    .bind(studentId)
    .all();

  return c.json({
    notes: (results || []).map((row: any) => ({
      id: row.id,
      noteType: row.note_type,
      message: row.message,
      author: row.author,
      createdAt: row.created_at
    })),
    generatedAt: new Date().toISOString()
  });
});

app.post('/portal/admin/students/:studentId/notes', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) return authError;

  const studentId = c.req.param('studentId').trim();
  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }
  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const noteType = (body.noteType || 'note').toString().trim().toLowerCase();
  const message = (body.message || '').toString().trim();
  const author = (body.author || '').toString().trim() || 'Admin';
  if (!message) {
    return c.json({ error: 'message is required' }, 400);
  }
  const allowed = new Set(['note', 'payment', 'message']);
  const safeType = allowed.has(noteType) ? noteType : 'note';
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await c.env.PORTAL_DB.prepare(
    `INSERT INTO student_notes (id, student_id, note_type, message, author, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  )
    .bind(id, studentId, safeType, message, author, now)
    .run();

  return c.json({
    ok: true,
    note: { id, studentId, noteType: safeType, message, author, createdAt: now }
  });
});

app.post('/portal/admin/students', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) {
    return authError;
  }

  const body = await c.req.json().catch(() => ({}));
  const name = (body.name || '').toString().trim();
  const birthDate = normalizeBirthDate(body.birthDate || '');
  const phone = (body.phone || '').toString().trim() || null;
  const email = (body.email || '').toString().trim() || null;
  const currentBelt = (body.currentBelt || '').toString().trim() || 'White Belt';
  const classTypeInput = (body.classType || '').toString().trim().toLowerCase();
  const classType = classTypeInput || 'basic';
  const classLevel = body.classLevel
    ? (body.classLevel || '').toString().trim()
    : resolveClassLevelLabel(classType);
  const rawCount = parseInt((body.initialAttendanceDays || '').toString(), 10);
  const attendanceCount = Number.isFinite(rawCount) ? Math.min(Math.max(rawCount, 0), 10) : 0;
  const attendanceDates = Array.isArray(body.attendanceDates) ? body.attendanceDates : [];

  if (!name || !birthDate) {
    return c.json({ error: 'name and birthDate are required' }, 400);
  }

  const studentId = await generateStudentId(c.env.PORTAL_DB);
  const timestamp = new Date().toISOString();

  await c.env.PORTAL_DB.prepare(
    `INSERT INTO students
       (id, name, birth_date, phone, email, current_belt, is_suspended, suspended_reason, suspended_at, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, NULL, NULL, ?7, ?7)`
  )
    .bind(studentId, name, birthDate, phone, email, currentBelt, timestamp)
    .run();

  let attendanceSeeded = 0;
  if (attendanceCount > 0 || attendanceDates.length) {
    attendanceSeeded = await seedAttendanceSessions(c.env.PORTAL_DB, studentId, {
      count: attendanceCount,
      dates: attendanceDates,
      classType,
      classLevel
    });
  }

  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  return c.json({
    ok: true,
    student: sanitizeStudentRecord(student),
    login: {
      studentId,
      birthDate
    },
    attendanceSeeded
  });
});

app.post('/portal/admin/suspensions', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) {
    return authError;
  }

  const body = await c.req.json().catch(() => ({}));
  const studentId = (body.studentId || '').trim();
  const action = (body.action || '').trim().toLowerCase();
  const reasonInput = (body.reason || '').trim();

  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }
  if (!['suspend', 'resume'].includes(action)) {
    return c.json({ error: 'action must be suspend or resume' }, 400);
  }

  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const suspend = action === 'suspend';
  const timestamp = new Date().toISOString();
  await c.env.PORTAL_DB.prepare(
    `UPDATE students
     SET is_suspended = ?1,
         suspended_reason = ?2,
         suspended_at = ?3,
         updated_at = ?4
     WHERE id = ?5`
  )
    .bind(
      suspend ? 1 : 0,
      suspend ? reasonInput || 'Billing issue' : null,
      suspend ? timestamp : null,
      timestamp,
      student.id
    )
    .run();

  const updated = await fetchStudentById(c.env.PORTAL_DB, student.id);
  return c.json({
    ok: true,
    student: sanitizeStudentRecord(updated)
  });
});

app.get('/portal/admin/report-card/:studentId', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) {
    return authError;
  }

  const studentId = c.req.param('studentId').trim();
  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }

  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  if (!student) {
    return c.json({ error: 'Student not found' }, 404);
  }

  const summary = await buildAttendanceSummary(
    c.env.PORTAL_DB,
    student.id,
    student.current_belt || ''
  );
  const progress = await fetchPortalProgress(c.env.PORTAL_DB, student.id);

  return c.json({
    student: sanitizeStudentRecord(student),
    membershipType: student.membership_type || null,
    attendance: summary,
    progress: {
      records: progress,
      generatedAt: new Date().toISOString()
    }
  });
});

app.post('/portal/admin/email/send', async (c) => {
  const authError = await authenticateAdminRequest(c);
  if (authError) {
    return authError;
  }
  const body = await c.req.json().catch(() => null);
  let recipientType = body?.recipientType || body?.audience || 'all';
  recipientType = recipientType === 'single' ? 'student' : recipientType;
  const belt = body?.belt || '';
  const className = body?.className || '';
  const studentId = body?.studentId || '';
   const directEmail = (body?.directEmail || '').toString().trim();
  const subject = body?.subject || '';
  const message = body?.message || '';
  if (!subject || !message) {
    return c.json({ error: 'Subject and message are required.' }, 400);
  }
  if (directEmail && !isValidEmail(directEmail)) {
    return c.json({ error: 'Enter a valid direct email address.' }, 400);
  }
  if (!directEmail && recipientType === 'student' && !studentId) {
    return c.json({ error: 'studentId is required for a single-student email.' }, 400);
  }
  try {
    const recipients = directEmail
      ? [{ email: directEmail, name: studentId || 'Recipient' }]
      : await fetchEmailRecipients(c.env.PORTAL_DB, recipientType, {
          belt,
          className,
          studentId
        });
    if (!recipients.length) {
      return c.json({ error: 'No recipients found for that audience.' }, 400);
    }
    await sendBrevoEmail(c.env, {
      to: recipients,
      subject,
      htmlContent: `<p>${message}</p>`
    });
    return c.json({
      ok: true,
      recipientType,
      sentTo: recipients.length,
      queuedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Email send failed', error);
    return c.json({ error: error?.message || 'Email send failed.' }, 500);
  }
});

export default app;
