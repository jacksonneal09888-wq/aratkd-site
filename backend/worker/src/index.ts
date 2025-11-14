import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify, type JWTPayload } from 'hono/jwt';

interface Env {
  PORTAL_DB: D1Database;
  ADMIN_PORTAL_KEY?: string;
  KIOSK_PORTAL_KEY?: string;
  PORTAL_JWT_SECRET?: string;
}

const app = new Hono<{ Bindings: Env }>();

const ALLOWED_METHODS = 'GET,POST,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type,Authorization,X-Admin-Key';

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

const sanitizeStudentRecord = (row: any) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    currentBelt: row.current_belt || 'White Belt'
  };
};

const fetchStudentById = (db: D1Database, studentId: string) => {
  const lookup = studentId.trim().toLowerCase();
  return db
    .prepare(
      `SELECT id, name, birth_date, phone, current_belt
       FROM students
       WHERE LOWER(id) = ?1
       LIMIT 1`
    )
    .bind(lookup)
    .first<any>();
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

const requireKioskAuth = (c: Context<{ Bindings: Env }>) => {
  const provided = c.req.header('X-Kiosk-Key') || '';
  const expected = getKioskSecret(c.env);
  if (!expected || provided !== expected) {
    return c.json({ error: 'Unauthorized kiosk' }, 401);
  }
  return null;
};

const hasValidAdminKey = (c: Context<{ Bindings: Env }>) => {
  const expected = c.env.ADMIN_PORTAL_KEY;
  if (!expected) {
    return true;
  }
  const headerKey = c.req.header('X-Admin-Key');
  const queryKey = c.req.query('adminKey');
  return expected === headerKey || expected === queryKey;
};

app.get('/', (c) => c.json({ message: 'Portal Worker API' }));

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

  const timestamp = new Date().toISOString();
  await c.env.PORTAL_DB.prepare(
    `INSERT INTO attendance_sessions
       (id, student_id, class_type, class_level, kiosk_id, source, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(crypto.randomUUID(), student.id, classType, classLevel || null, kioskId || null, source, timestamp)
    .run();

  return c.json({
    ok: true,
    recordedAt: timestamp,
    student: sanitizeStudentRecord(student),
    classType,
    classLevel: classLevel || null
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
  const defaultSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const sinceIso = sinceQuery ? new Date(sinceQuery).toISOString() : defaultSince;

  const totals = await c.env.PORTAL_DB.prepare(
    `SELECT
        COUNT(*) AS total_sessions,
        MIN(created_at) AS first_session,
        MAX(created_at) AS last_session
     FROM attendance_sessions
     WHERE student_id = ?1
       AND datetime(created_at) >= datetime(?2)`
  )
    .bind(paramId, sinceIso)
    .first<any>();

  const breakdownQuery = await c.env.PORTAL_DB.prepare(
    `SELECT class_type, COUNT(*) AS count
     FROM attendance_sessions
     WHERE student_id = ?1
       AND datetime(created_at) >= datetime(?2)
     GROUP BY class_type`
  )
    .bind(paramId, sinceIso)
    .all();

  const recentSessions = await c.env.PORTAL_DB.prepare(
    `SELECT class_type, class_level, created_at
     FROM attendance_sessions
     WHERE student_id = ?1
     ORDER BY datetime(created_at) DESC
     LIMIT 10`
  )
    .bind(paramId)
    .all();

  return c.json({
    since: sinceIso,
    totals: {
      sessions: totals?.total_sessions || 0,
      firstSession: totals?.first_session || null,
      lastSession: totals?.last_session || null
    },
    breakdown: (breakdownQuery.results || []).map((row: any) => ({
      classType: row.class_type,
      sessions: row.count
    })),
    recent: (recentSessions.results || []).map((row: any) => ({
      classType: row.class_type,
      classLevel: row.class_level,
      checkInAt: row.created_at
    }))
  });
});

app.get('/portal/admin/activity', async (c) => {
  if (!hasValidAdminKey(c)) {
    return c.json({ error: 'Unauthorized' }, 401);
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
  if (!hasValidAdminKey(c)) {
    return c.json({ error: 'Unauthorized' }, 401);
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

  return c.json({
    sessions: (results || []).map((row: any) => ({
      studentId: row.student_id,
      classType: row.class_type,
      classLevel: row.class_level,
      kioskId: row.kiosk_id,
      checkInAt: row.created_at
    })),
    generatedAt: new Date().toISOString()
  });
});

export default app;
