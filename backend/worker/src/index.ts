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
}

const app = new Hono<{ Bindings: Env }>();

const ALLOWED_METHODS = 'GET,POST,OPTIONS';
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

const getJwtSecret = (env: Env) => env.PORTAL_JWT_SECRET || env.ADMIN_PORTAL_KEY || 'change-me';
const getKioskSecret = (env: Env) => env.KIOSK_PORTAL_KEY || env.ADMIN_PORTAL_KEY || 'kiosk-dev-key';
const getAdminCredentials = (env: Env) => ({
  username: env.ADMIN_MASTER_USERNAME || 'MasterAra',
  password: env.ADMIN_MASTER_PASSWORD || 'AraTKD',
  pin: env.ADMIN_MASTER_PIN || ''
});

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
  return {
    id: row.id,
    name: row.name,
    currentBelt: row.current_belt || 'White Belt',
    birthDate: row.birth_date || null,
    phone: row.phone || null,
    isSuspended: Boolean(row.is_suspended),
    suspendedReason: row.suspended_reason || null,
    suspendedAt: row.suspended_at || null
  };
};

const fetchStudentById = (db: D1Database, studentId: string) => {
  const lookup = studentId.trim().toLowerCase();
  return db
    .prepare(
      `SELECT id, name, birth_date, phone, current_belt, is_suspended, suspended_reason, suspended_at
       FROM students
       WHERE LOWER(id) = ?1
       LIMIT 1`
    )
    .bind(lookup)
    .first<any>();
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

app.post('/portal/login-event', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const studentId = (body.studentId || '').trim();
  const action = (body.action || 'login').trim().toLowerCase();
  const actor = (body.actor || 'student').trim().toLowerCase();
  const birthDate = normalizeBirthDate(body.birthDate || '');

  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }

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

  return c.json({ ok: true, beltSlug, uploadedAt: uploadedIso });
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

app.get('/kiosk/classes', (c) =>
  c.json({
    classes: kioskClassCatalog,
    generatedAt: new Date().toISOString()
  })
);

app.post('/kiosk/check-in', async (c) => {
  const authError = requireKioskAuth(c);
  if (authError) {
    return authError;
  }

  const body = await c.req.json().catch(() => ({}));
  const studentId = (body.studentId || '').trim();
  const classType = (body.classType || '').trim();
  const classLevel = (body.classLevel || '').trim();
  const kioskId = (body.kioskId || 'front-desk').trim();
  const source = (body.source || 'kiosk').toString();

  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }
  if (!classType) {
    return c.json({ error: 'classType is required' }, 400);
  }

  const student = await fetchStudentById(c.env.PORTAL_DB, studentId);
  if (!student) {
    return c.json({ error: 'Unknown student ID' }, 404);
  }

  const canonicalId = student.id;
  const timestamp = new Date().toISOString();
  await c.env.PORTAL_DB.prepare(
    `INSERT INTO attendance_sessions
       (id, student_id, class_type, class_level, kiosk_id, source, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(crypto.randomUUID(), canonicalId, classType, classLevel || null, kioskId || null, source, timestamp)
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
    classType,
    classLevel: classLevel || null,
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
     LEFT JOIN students s ON s.id = le.student_id
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
    attendance: summary,
    progress: {
      records: progress,
      generatedAt: new Date().toISOString()
    }
  });
});

export default app;
