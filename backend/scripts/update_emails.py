#!/usr/bin/env python3
"""
Update student contact records (email/phone) from a CSV or JSON file.

The source file should stay outside git to avoid committing student PII.
Examples:
    python backend/scripts/update_emails.py /secure/path/roster-email-template.csv
    python backend/scripts/update_emails.py /secure/path/roster.json --d1-sql /tmp/d1-email-updates.sql
"""

import argparse
import csv
import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

DEFAULT_DB_PATH = Path(os.getenv("PORTAL_DB_PATH", Path(__file__).resolve().parent.parent / "portal.db"))


def load_source(path: Path) -> List[Dict[str, Any]]:
    """Load contact updates from a CSV or JSON file."""
    if path.suffix.lower() in {".csv", ".tsv"}:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            data = list(reader)
    else:
        with path.open("r", encoding="utf-8-sig") as handle:
            data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("Source data must be an array of objects/rows.")
    return normalize_records(data)


def normalize_records(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Keep only usable fields and normalize keys."""
    normalized = []
    for idx, row in enumerate(rows, start=1):
        student_id = (
            (row.get("student_id") or row.get("id") or row.get("studentId") or "").strip()
        )
        email = (row.get("email") or "").strip()
        phone = (row.get("phone") or "").strip()
        name = (row.get("name") or "").strip()
        if not student_id:
            # Skip rows without an ID so we do not write a bad update.
            continue
        normalized.append(
            {
                "id": student_id,
                "email": email or None,
                "phone": phone or None,
                "name": name or None,
                "row": idx,
            }
        )
    return normalized


def update_database(records: List[Dict[str, Any]], db_path: Path) -> Tuple[int, List[str]]:
    """Apply updates to the SQLite database."""
    if not records:
        return 0, []
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        now = datetime.utcnow().isoformat(timespec="seconds") + "Z"
        updated = 0
        missing: List[str] = []
        for rec in records:
            updates = []
            values = []
            if rec.get("email"):
                updates.append(f"email = ?{len(values) + 1}")
                values.append(rec["email"])
            if rec.get("phone"):
                updates.append(f"phone = ?{len(values) + 1}")
                values.append(rec["phone"])
            if not updates:
                continue
            updates.append(f"updated_at = ?{len(values) + 1}")
            values.append(now)
            values.append(rec["id"])
            query = f"UPDATE students SET {', '.join(updates)} WHERE LOWER(id) = LOWER(?{len(values)})"
            cur = conn.execute(query, values)
            if cur.rowcount and cur.rowcount > 0:
                updated += 1
            else:
                missing.append(rec["id"])
        conn.commit()
    finally:
        conn.close()
    return updated, missing


def emit_d1_sql(records: List[Dict[str, Any]], sql_path: Path) -> None:
    """Emit UPDATE statements for Cloudflare D1."""
    if not records:
        sql_path.write_text("-- No updates provided.\n", encoding="utf-8")
        return

    def sql_value(value: Any) -> str:
        if value is None:
            return "NULL"
        if isinstance(value, str):
            return "'" + value.replace("'", "''") + "'"
        return str(value)

    now = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    lines = ["-- Upsert email/phone contacts", "BEGIN TRANSACTION;"]
    for rec in records:
        set_parts = []
        if rec.get("email"):
            set_parts.append(f"email = {sql_value(rec['email'])}")
        if rec.get("phone"):
            set_parts.append(f"phone = {sql_value(rec['phone'])}")
        if not set_parts:
            continue
        set_parts.append(f"updated_at = {sql_value(now)}")
        where_id = sql_value(rec["id"])
        lines.append(
            f"UPDATE students SET {', '.join(set_parts)} WHERE LOWER(id) = LOWER({where_id});"
        )
    lines.append("COMMIT;")
    sql_path.parent.mkdir(parents=True, exist_ok=True)
    sql_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Update student email/phone contact info in the portal database."
    )
    parser.add_argument("source", type=Path, help="CSV or JSON file with id,email[,phone] columns.")
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"Path to the portal SQLite DB (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument(
        "--d1-sql",
        type=Path,
        help="Optional path to write SQL updates for Cloudflare D1 (wrangler execute).",
    )
    args = parser.parse_args()

    if not args.source.exists():
        raise SystemExit(f"Source file not found: {args.source}")

    try:
        records = load_source(args.source)
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(f"Unable to read source file: {exc}") from exc

    # Keep only rows that actually have something to update.
    records = [rec for rec in records if rec.get("email") or rec.get("phone")]
    if not records:
        raise SystemExit("No records contained an email or phone to update.")

    updated, missing = update_database(records, args.db)
    print(f"Updated {updated} student(s) in {args.db}")
    if missing:
        print(f"Students not found (not updated): {', '.join(sorted(set(missing)))}")

    if args.d1_sql:
        emit_d1_sql(records, args.d1_sql)
        print(f"Wrote D1 SQL update script to {args.d1_sql}")


if __name__ == "__main__":
    main()
