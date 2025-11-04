import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, desc, eq, sql } from 'drizzle-orm';

interface Env {
  PORTAL_DB: D1Database;
  ADMIN_PORTAL_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

const loginTable = {
  table: 'login_events',
  studentId: 'student_id',
  action: 'action',
  actor: 'actor',
  createdAt: 'created_at'
} as const;

const progressTable = {
  table: 'belt_progress',
  studentId: 'student_id',
  beltSlug: 'belt_slug',
  fileName: 'file_name',
  uploadedAt: 'uploaded_at',
  createdAt: 'created_at'
} as const;

function getDb(env: Env) {
  return drizzle(env.PORTAL_DB);
}

app.get('/', (c) => c.json({ message: 'Portal Worker API' }));

app.post('/portal/login-event', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const studentId = (body.studentId || '').trim();
  const action = (body.action || 'login').trim().toLowerCase();
  const actor = (body.actor || 'student').trim().toLowerCase();

  if (!studentId) {
    return c.json({ error: 'studentId is required' }, 400);
  }

  const timestamp = new Date().toISOString();
  const db = getDb(c.env);
  await db
    .insert(loginTable.table)
    .values({
      [loginTable.studentId]: studentId,
      [loginTable.action]: action,
      [loginTable.actor]: actor,
      [loginTable.createdAt]: timestamp
    })
    .run();

  return c.json({ ok: true, recordedAt: timestamp });
});

app.post('/portal/progress', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const studentId = (body.studentId || '').trim();
  const beltSlug = (body.beltSlug || '').trim().toLowerCase();
  const fileName = body.fileName ? String(body.fileName).trim() : null;
  const uploadedAtInput = (body.uploadedAt || '').trim();

  if (!studentId || !beltSlug) {
    return c.json({ error: 'studentId and beltSlug are required' }, 400);
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

  const db = getDb(c.env);
  await db
    .insert(progressTable.table)
    .values({
      [progressTable.studentId]: studentId,
      [progressTable.beltSlug]: beltSlug,
      [progressTable.fileName]: fileName,
      [progressTable.uploadedAt]: uploadedIso,
      [progressTable.createdAt]: createdIso
    })
    .onConflictDoUpdate({
      target: [progressTable.studentId, progressTable.beltSlug],
      set: {
        [progressTable.fileName]: fileName,
        [progressTable.uploadedAt]: uploadedIso,
        [progressTable.createdAt]: createdIso
      }
    })
    .run();

  return c.json({ ok: true, beltSlug, uploadedAt: uploadedIso });
});

app.get('/portal/progress/:studentId', async (c) => {
  const studentId = c.req.param('studentId').trim();
  if (!studentId) {
    return c.json({ error: 'Invalid student id' }, 400);
  }

  const db = getDb(c.env);
  const rows = await db
    .select()
    .from(progressTable.table)
    .where(eq(progressTable.studentId, studentId))
    .orderBy(progressTable.uploadedAt)
    .run();

  const records = rows.map((row: any) => ({
    beltSlug: row[progressTable.beltSlug],
    fileName: row[progressTable.fileName],
    uploadedAt: row[progressTable.uploadedAt]
  }));

  if (!records.length) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({
    records,
    generatedAt: new Date().toISOString()
  });
});

app.get('/portal/admin/activity', async (c) => {
  const headerKey = c.req.header('X-Admin-Key');
  const queryKey = c.req.query('adminKey');
  const expected = c.env.ADMIN_PORTAL_KEY;

  if (expected && expected !== headerKey && expected !== queryKey) {
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

  const db = getDb(c.env);

  const events = await db
    .select()
    .from(loginTable.table)
    .orderBy(desc(loginTable.createdAt))
    .limit(limit)
    .run();

  const summaries = await db
    .prepare(
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
    )
    .all();

  const eventPayload = events.map((row: any) => ({
    studentId: row[loginTable.studentId],
    action: row[loginTable.action],
    actor: row[loginTable.actor],
    recordedAt: row[loginTable.createdAt]
  }));

  const summaryPayload = summaries.map((row: any) => ({
    studentId: row.student_id,
    totalEvents: row.total_events,
    loginEvents: row.login_events,
    lastEventAt: row.last_event,
    latestBelt: row.latest_belt,
    latestBeltUploadedAt: row.latest_belt_uploaded
  }));

  return c.json({
    events: eventPayload,
    summary: summaryPayload,
    generatedAt: new Date().toISOString()
  });
});

export default app;
