import { Hono } from 'hono';

interface Env {
  PORTAL_DB: D1Database;
  ADMIN_PORTAL_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

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
  await c.env.PORTAL_DB.prepare(
    `INSERT INTO login_events (student_id, action, actor, created_at)
     VALUES (?1, ?2, ?3, ?4)`
  )
    .bind(studentId, action, actor, timestamp)
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
  const studentId = c.req.param('studentId').trim();
  if (!studentId) {
    return c.json({ error: 'Invalid student id' }, 400);
  }

  const { results } = await c.env.PORTAL_DB.prepare(
    `SELECT belt_slug, file_name, uploaded_at
     FROM belt_progress
     WHERE student_id = ?1
     ORDER BY datetime(uploaded_at)`
  )
    .bind(studentId)
    .all();

  if (!results?.length) {
    return c.json({ error: 'Not found' }, 404);
  }

  const records = results.map((row: any) => ({
    beltSlug: row.belt_slug,
    fileName: row.file_name,
    uploadedAt: row.uploaded_at
  }));

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

export default app;
