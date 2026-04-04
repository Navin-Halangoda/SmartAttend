import sqlite3

from db import get_db_connection


def create_attendance(admin_username, name, member_id, date, time):
    with get_db_connection() as conn:
        try:
            cursor = conn.execute(
                """
                INSERT INTO attendance (admin_username, name, member_id, date, time)
                VALUES (?, ?, ?, ?, ?)
                """,
                (admin_username, name, member_id, date, time),
            )
            conn.commit()
            return True, None, cursor.lastrowid
        except sqlite3.IntegrityError:
            return False, "Attendance already marked for this member today.", None


def get_attendance_by_admin(admin_username):
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, admin_username, name, member_id, date, time
            FROM attendance
            WHERE admin_username = ?
            ORDER BY date DESC, time DESC, id DESC
            """,
            (admin_username,),
        ).fetchall()
        return [dict(row) for row in rows]


def delete_attendance(admin_username, row_id):
    with get_db_connection() as conn:
        row = conn.execute(
            """
            SELECT id, admin_username, name, member_id, date, time
            FROM attendance
            WHERE id = ? AND admin_username = ?
            """,
            (row_id, admin_username),
        ).fetchone()
        if not row:
            return False, None

        conn.execute(
            "DELETE FROM attendance WHERE id = ? AND admin_username = ?",
            (row_id, admin_username),
        )
        conn.commit()
        return True, dict(row)
