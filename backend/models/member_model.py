import sqlite3

from db import get_db_connection


def _map_integrity_error(exc):
    message = str(exc)
    if "contactNumber" in message:
        return "Contact number already exists."
    if "member_id" in message:
        return "Member ID already exists."
    if "datasetPath" in message:
        return "Dataset path already exists."
    return "Could not save member due to a data conflict."


def create_member(admin_username, name, date_of_birth, contact_number, member_id, dataset_path):
    with get_db_connection() as conn:
        try:
            cursor = conn.execute(
                """
                INSERT INTO members (admin_username, name, date_of_birth, contactNumber, member_id, datasetPath)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (admin_username, name, date_of_birth, contact_number, member_id, dataset_path),
            )
            conn.commit()
            return True, None, cursor.lastrowid
        except sqlite3.IntegrityError as exc:
            return False, _map_integrity_error(exc), None


def get_members_by_admin(admin_username):
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, admin_username, name, date_of_birth, contactNumber, member_id, datasetPath
            FROM members
            WHERE admin_username = ?
            ORDER BY id DESC
            """,
            (admin_username,),
        ).fetchall()
        return [dict(row) for row in rows]


def update_member(admin_username, row_id, name, date_of_birth, contact_number, member_id):
    with get_db_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM members WHERE id = ? AND admin_username = ?",
            (row_id, admin_username),
        ).fetchone()
        if not existing:
            return False, "Member not found.", 0

        try:
            cursor = conn.execute(
                """
                UPDATE members
                SET name = ?, date_of_birth = ?, contactNumber = ?, member_id = ?
                WHERE id = ? AND admin_username = ?
                """,
                (name, date_of_birth, contact_number, member_id, row_id, admin_username),
            )
            conn.commit()
            return True, None, cursor.rowcount
        except sqlite3.IntegrityError as exc:
            return False, _map_integrity_error(exc), 0


def delete_member(admin_username, row_id):
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT id, datasetPath FROM members WHERE id = ? AND admin_username = ?",
            (row_id, admin_username),
        ).fetchone()
        if not row:
            return False, None

        cursor = conn.execute(
            "DELETE FROM members WHERE id = ? AND admin_username = ?",
            (row_id, admin_username),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return False, None

        return True, dict(row)