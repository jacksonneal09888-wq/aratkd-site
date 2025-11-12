#!/usr/bin/env python3
"""
Utility script to import or update student roster records in the portal database.

Usage:
    python backend/scripts/import_students.py /path/to/private/students.json

The JSON file should contain an array of objects with at least:
    {
        "id": "ARA001",
        "name": "Student Name",
        "birthDate": "YYYY-MM-DD",
        "phone": "optional",
        "currentBelt": "High White Belt"
    }

Keep the JSON file outside of the repository so sensitive data never lands in git.
"""

import argparse
import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

DEFAULT_DB_PATH = Path(
    os.getenv("PORTAL_DB_PATH", Path(__file__).resolve().parent.parent / "portal.db")
)


def load_students(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig") as handle:
        data = json.load(handle)
        if not isinstance(data, list):
            raise ValueError("Student data must be a JSON array.")
        normalized = []
        for entry in data:
            if not isinstance(entry, dict):
                continue
            student_id = (entry.get("id") or "").strip()
            name = (entry.get("name") or "").strip()
            birth_date = (entry.get("birthDate") or "").strip()
            if not student_id or not name or not birth_date:
                raise ValueError(f"Invalid student entry: {entry}")
            normalized.append(
                {
                    "id": student_id,
                    "name": name,
                    "birth_date": birth_date,
                    "phone": (entry.get("phone") or "").strip() or None,
                    "current_belt": (entry.get("currentBelt") or "").strip() or None,
                }
            )
        return normalized


def import_students(source: Path, db_path: Path, truncate: bool = False) -> int:
    roster = load_students(source)
    if not roster:
        return 0

    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
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
        now = datetime.utcnow().isoformat(timespec="seconds") + "Z"

        if truncate:
            conn.execute("DELETE FROM students")

        for record in roster:
            conn.execute(
                """
                INSERT INTO students (id, name, birth_date, phone, current_belt, created_at, updated_at)
                VALUES (:id, :name, :birth_date, :phone, :current_belt, :created_at, :updated_at)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    birth_date=excluded.birth_date,
                    phone=excluded.phone,
                    current_belt=excluded.current_belt,
                    updated_at=excluded.updated_at
                """,
                {
                    **record,
                    "created_at": now,
                    "updated_at": now,
                },
            )

        conn.commit()
    finally:
        conn.close()

    return len(roster)


def main():
    parser = argparse.ArgumentParser(description="Import student roster into the portal database.")
    parser.add_argument("source", type=Path, help="Path to the private students JSON file.")
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"Path to the portal SQLite DB (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Delete existing student records before import.",
    )
    args = parser.parse_args()

    if not args.source.exists():
        raise SystemExit(f"Source file not found: {args.source}")

    imported = import_students(args.source, args.db, truncate=args.truncate)
    print(f"Imported {imported} student record(s) into {args.db}")


if __name__ == "__main__":
    main()
