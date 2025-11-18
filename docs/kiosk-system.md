# Ara TKD Attendance Kiosk & Portal Sync

This document captures the moving pieces that replace RhinoFit with the in-house kiosk + portal stack.

## Components

| Piece | Path / Endpoint | Notes |
| --- | --- | --- |
| Kiosk UI | `kiosk.html` + `assets/js/kiosk.js` | Runs in browser kiosk mode. Student taps class, enters ID via keypad. |
| Worker API | `backend/worker/src/index.ts` | New `/kiosk/*` and `/portal/attendance/*` routes log attendance in D1 and expose summaries. |
| Attendance table | D1 table `attendance_sessions` | Stores every check-in (student, class, kiosk, timestamp). |
| Portal Readiness | `assets/js/student-portal.js` | Can fetch new attendance summary endpoint to auto-fill readiness tracker (future). |

## Deploy / Configure

1. **Create the D1 table** (run once in Cloudflare dashboard or via wrangler):

```sql
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  class_type TEXT,
  class_level TEXT,
  kiosk_id TEXT,
  source TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_student_at
  ON attendance_sessions (student_id, created_at);
```

2. **Set secrets in the Worker:**

| Name | Example | Purpose |
| --- | --- | --- |
| `ADMIN_PORTAL_KEY` | `ara-admin-key-2024` | Existing admin dashboard + kiosk fallback. |
| `KIOSK_PORTAL_KEY` *(optional)* | `ara-kiosk-frontend` | Dedicated secret for kiosk check-ins. If omitted the worker falls back to `ADMIN_PORTAL_KEY`. |

3. **Update front-end data attributes:**

| File | Attribute | Description |
| --- | --- | --- |
| `student-portal.html` `<body>` | `data-admin-key`, `data-admin-pin` | Instructor dashboard pin/secret. |
| `kiosk.html` `<body>` | `data-api-base`, `data-kiosk-key`, `data-kiosk-id` | API origin + kiosk key + label (e.g., `front-desk`). |

> ⚠️ Treat the kiosk key like a password. Only load `kiosk.html` on the locked-down front-door device.

4. **Run `npx wrangler deploy`** (or use the Cloudflare dashboard Deploy button) to publish the updated Worker.

## API Cheatsheet

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/kiosk/classes` | none | Returns the current class catalog for the kiosk UI. |
| `POST` | `/kiosk/check-in` | `X-Kiosk-Key` header | Logs an attendance session. Body: `{ studentId, classType, classLevel?, kioskId? }`. |
| `GET` | `/portal/attendance/:studentId` | Bearer token (student) | Returns totals + breakdown for the student (default last 90 days, `?since=` override). |
| `GET` | `/portal/admin/attendance` | `X-Admin-Key` | Lists the latest check-ins for staff dashboards. |

> ℹ️ Check-ins are limited to Monday, Wednesday, and Friday by default. Update `ALLOWED_DAYS` in `assets/js/kiosk.js` and `KIOSK_ALLOWED_DAYS` in `backend/worker/src/index.ts` if the training calendar changes.

## Kiosk UX Flow

1. Student taps their class card (Little Ninjas 4:30, Basic 5:00, or Advanced 6:00).
2. Student enters ID via on-screen keypad.
3. Device sends `POST /kiosk/check-in` with kiosk key header.
4. Worker validates student, writes to `attendance_sessions`, returns confirmation.
5. Portal readiness tracker can poll `/portal/attendance/:studentId` to auto-fill attendance counts.

## Security Notes

- Lock the kiosk computer in full-screen browser mode (ChromeOS, Windows assigned access, etc.).
- Disable OS-level keyboard shortcuts / exit gestures so DevTools / other sites cannot load.
- Rotate `KIOSK_PORTAL_KEY` periodically. Update both Cloudflare secret and `data-kiosk-key` simultaneously.
- Attendance data lives in D1. Payment links should continue to flow through Stripe/Square—never store raw card data.

## Next Steps

1. Feed `/portal/attendance/:studentId` data into the readiness tracker so lesson counts + attendance % auto-populate.
2. Expose payment status via Worker (`/portal/billing`) and lock kiosk check-ins when tuition is overdue.
3. Wrap the kiosk + portal in a native shell (Capacitor/Flutter) for iOS/Android once the APIs stabilize.
