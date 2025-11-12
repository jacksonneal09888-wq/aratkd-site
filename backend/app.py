import os
import sqlite3
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import jwt

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/portal/*": {"origins": "*"}, r"/chat": {"origins": "*"}})

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DATABASE_PATH = Path(os.getenv("PORTAL_DB_PATH", Path(__file__).resolve().parent / "portal.db"))
ADMIN_PORTAL_KEY = os.getenv("ADMIN_PORTAL_KEY")
JWT_SECRET = os.getenv("PORTAL_JWT_SECRET") or ADMIN_PORTAL_KEY or "change-me"
try:
    JWT_EXP_MINUTES = int(os.getenv("PORTAL_JWT_EXP_MINUTES", "1440"))
except ValueError:
    JWT_EXP_MINUTES = 1440
JWT_ALGORITHM = "HS256"


def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS login_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor TEXT NOT NULL DEFAULT 'student',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS belt_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                belt_slug TEXT NOT NULL,
                file_name TEXT,
                uploaded_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(student_id, belt_slug)
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_belt_progress_student ON belt_progress(student_id)"
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                birth_date TEXT NOT NULL,
                phone TEXT,
                current_belt TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_students_id ON students(id)")
        conn.commit()


def find_student_record(student_id):
    if not student_id:
        return None
    lookup = student_id.strip().lower()
    with get_db_connection() as conn:
        row = conn.execute(
            """
            SELECT id, name, birth_date, phone, current_belt
            FROM students
            WHERE LOWER(id) = ?
            LIMIT 1
            """,
            (lookup,)
        ).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "name": row["name"],
            "birthDate": row["birth_date"],
            "phone": row["phone"],
            "currentBelt": row["current_belt"]
        }


def sanitize_student_record(student):
    if not student:
        return None
    return {
        "id": student.get("id"),
        "name": student.get("name"),
        "currentBelt": student.get("currentBelt")
    }


def issue_portal_token(student_id):
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=JWT_EXP_MINUTES)
    payload = {
        "sub": student_id,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "scope": "portal"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def fetch_portal_progress(student_id):
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT belt_slug, file_name, uploaded_at
            FROM belt_progress
            WHERE student_id = ?
            ORDER BY datetime(uploaded_at) ASC
            """,
            (student_id,)
        ).fetchall()

    return [
        {
            "beltSlug": row["belt_slug"],
            "fileName": row["file_name"],
            "uploadedAt": row["uploaded_at"]
        }
        for row in rows
    ]


def require_portal_auth(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        auth_header = (request.headers.get("Authorization") or "").strip()
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401

        token = auth_header.split(" ", 1)[1].strip()
        try:
            claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        requested_student_id = kwargs.get("student_id") or ""
        token_student_id = (claims.get("sub") or "").strip()
        if requested_student_id and token_student_id.lower() != requested_student_id.lower():
            return jsonify({"error": "Forbidden"}), 403

        g.portal_claims = claims
        return view_func(*args, **kwargs)

    return wrapper


# Initialize database immediately on module load
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
init_db()


@app.route('/')
def home():
    return jsonify({"message": "Master Ara Bot backend is running!"})

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message')
    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for Master Ara's Martial Arts."},
                {"role": "user", "content": user_message}
            ]
        )
        llm_response = response.choices[0].message.content
        return jsonify({"response": llm_response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def is_authorized_admin(inbound_request):
    if not ADMIN_PORTAL_KEY:
        return True

    provided = inbound_request.headers.get("X-Admin-Key") or inbound_request.args.get("adminKey")
    return bool(provided and provided == ADMIN_PORTAL_KEY)


@app.route("/portal/login-event", methods=["POST"])
def record_portal_event():
    payload = request.get_json(silent=True) or {}
    student_id = (payload.get("studentId") or "").strip()
    action = (payload.get("action") or "login").strip().lower()
    actor = (payload.get("actor") or "student").strip().lower()
    birth_date = (payload.get("birthDate") or "").strip()

    if not student_id:
        return jsonify({"error": "studentId is required"}), 400

    is_login_attempt = action == "login"
    token = None
    student = None
    progress_snapshot = None
    student_profile = None

    if is_login_attempt:
        if not birth_date:
            return jsonify({"error": "birthDate is required for login"}), 400

        student = find_student_record(student_id)
        if not student:
            return jsonify({"error": "Invalid credentials"}), 401

        stored_birth_date = (student.get("birthDate") or "").strip()
        if stored_birth_date != birth_date:
            return jsonify({"error": "Invalid credentials"}), 401

        canonical_id = (student.get("id") or student_id).strip()
        try:
            records = fetch_portal_progress(student_id)
        except sqlite3.Error as error:
            return jsonify({"error": f"Failed to load progress: {error}"}), 500

        token = issue_portal_token(canonical_id)
        student_profile = sanitize_student_record(student)
        progress_snapshot = {
            "records": records,
            "generatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z"
        }

    timestamp = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    try:
        with get_db_connection() as conn:
            conn.execute(
                "INSERT INTO login_events (student_id, action, actor, created_at) VALUES (?, ?, ?, ?)",
                (student_id, action, actor, timestamp)
            )
            conn.commit()
    except sqlite3.Error as error:
        return jsonify({"error": f"Failed to record event: {error}"}), 500

    response_payload = {"ok": True, "recordedAt": timestamp}
    if token:
        response_payload["token"] = token
        response_payload["student"] = student_profile
        response_payload["progress"] = progress_snapshot

    return jsonify(response_payload)


@app.route("/portal/progress/<student_id>", methods=["GET"])
@require_portal_auth
def get_portal_progress(student_id):
    sanitized_id = (student_id or "").strip()
    if not sanitized_id:
        return jsonify({"error": "Invalid student ID"}), 400

    try:
        records = fetch_portal_progress(sanitized_id)
    except sqlite3.Error as error:
        return jsonify({"error": f"Failed to load progress: {error}"}), 500

    return jsonify(
        {
            "records": records,
            "generatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z"
        }
    )


@app.route("/portal/profile", methods=["GET"])
@require_portal_auth
def get_portal_profile():
    student_id = (g.portal_claims.get("sub") or "").strip()
    if not student_id:
        return jsonify({"error": "Unauthorized"}), 401

    student = find_student_record(student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    return jsonify({"student": sanitize_student_record(student)})


@app.route("/portal/progress", methods=["POST"])
@require_portal_auth
def save_portal_progress():
    payload = request.get_json(silent=True) or {}
    student_id = (payload.get("studentId") or "").strip()
    belt_slug = (payload.get("beltSlug") or "").strip().lower()
    file_name = (payload.get("fileName") or "").strip() or None
    uploaded_at = (payload.get("uploadedAt") or "").strip()

    if not student_id or not belt_slug:
        return jsonify({"error": "studentId and beltSlug are required"}), 400

    token_student_id = (g.portal_claims.get("sub") or "").strip()
    if not token_student_id or token_student_id.lower() != student_id.lower():
        return jsonify({"error": "Forbidden"}), 403

    try:
        timestamp = datetime.fromisoformat(uploaded_at.replace("Z", "+00:00")) if uploaded_at else datetime.utcnow()
    except ValueError:
        timestamp = datetime.utcnow()

    iso_timestamp = timestamp.isoformat(timespec="seconds") + "Z"
    created_at = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    try:
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO belt_progress (student_id, belt_slug, file_name, uploaded_at, created_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(student_id, belt_slug) DO UPDATE SET
                    file_name = excluded.file_name,
                    uploaded_at = excluded.uploaded_at,
                    created_at = excluded.created_at
                """,
                (student_id, belt_slug, file_name, iso_timestamp, created_at)
            )
            conn.commit()
    except sqlite3.Error as error:
        return jsonify({"error": f"Failed to save progress: {error}"}), 500

    return jsonify({"ok": True, "beltSlug": belt_slug, "uploadedAt": iso_timestamp})


@app.route("/portal/admin/activity", methods=["GET"])
def portal_activity():
    if not is_authorized_admin(request):
        return jsonify({"error": "Unauthorized"}), 401

    raw_limit = request.args.get("limit", "200")
    try:
        limit = max(1, min(1000, int(raw_limit)))
    except ValueError:
        limit = 200

    try:
        with get_db_connection() as conn:
            events = conn.execute(
                """
                SELECT student_id, action, actor, created_at
                FROM login_events
                ORDER BY datetime(created_at) DESC
                LIMIT ?
                """,
                (limit,)
            ).fetchall()

            summaries = conn.execute(
                """
                SELECT
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
                ORDER BY datetime(last_event) DESC
                """
            ).fetchall()
    except sqlite3.Error as error:
        return jsonify({"error": f"Failed to fetch activity: {error}"}), 500

    event_payload = [
        {
            "studentId": row["student_id"],
            "action": row["action"],
            "actor": row["actor"],
            "recordedAt": row["created_at"]
        }
        for row in events
    ]

    summary_payload = [
        {
            "studentId": row["student_id"],
            "totalEvents": row["total_events"],
            "loginEvents": row["login_events"],
            "lastEventAt": row["last_event"],
            "latestBelt": row["latest_belt"],
            "latestBeltUploadedAt": row["latest_belt_uploaded"]
        }
        for row in summaries
    ]

    return jsonify(
        {
            "events": event_payload,
            "summary": summary_payload,
            "generatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z"
        }
    )


if __name__ == '__main__':
    app.run(debug=True)
