import os
import sqlite3
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/portal/*": {"origins": "*"}, r"/chat": {"origins": "*"}})

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DATABASE_PATH = Path(os.getenv("PORTAL_DB_PATH", Path(__file__).resolve().parent / "portal.db"))
ADMIN_PORTAL_KEY = os.getenv("ADMIN_PORTAL_KEY")


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
        conn.commit()


@app.before_first_request
def bootstrap():
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

    if not student_id:
        return jsonify({"error": "studentId is required"}), 400

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

    return jsonify({"ok": True, "recordedAt": timestamp})


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
                SELECT student_id,
                       COUNT(*) AS total_events,
                       SUM(CASE WHEN action = 'login' THEN 1 ELSE 0 END) AS login_events,
                       MAX(created_at) AS last_event
                FROM login_events
                GROUP BY student_id
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
            "lastEventAt": row["last_event"]
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
