from db import get_db_connection
from datetime import datetime, timezone


def get_admin_by_username(username):
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT id, first_name, last_name, email, username, password_hash, is_active FROM admins WHERE username = ?",
            (username,)
        ).fetchone()

def get_admin_by_email(email):
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT id, first_name, last_name, email, username, password_hash, is_active, invite_token, invite_expires_at FROM admins WHERE email = ?",
            (email,)
        ).fetchone()

def get_admin_by_id(admin_id):
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT id, first_name, last_name, email, username, password_hash, is_active, created_at, updated_at FROM admins WHERE id = ?",
            (admin_id,)
        ).fetchone()


def upsert_pending_user(first_name, last_name, email, username, password_hash, otp_code, otp_expires_at):
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        email_row = conn.execute(
            "SELECT id, is_active FROM admins WHERE email = ?",
            (email,),
        ).fetchone()

        username_row = conn.execute(
            "SELECT id, email, is_active FROM admins WHERE username = ?",
            (username,),
        ).fetchone()

        if email_row and int(email_row["is_active"]) == 1:
            return "email_exists"

        if username_row and (not email_row or int(username_row["id"]) != int(email_row["id"])) and int(username_row["is_active"]) == 1:
            return "username_exists"

        if email_row:
            conn.execute(
                """
                UPDATE admins
                SET first_name = ?,
                    last_name = ?,
                    username = ?,
                    password_hash = ?,
                    invite_token = ?,
                    invite_expires_at = ?,
                    is_active = 0,
                    updated_at = ?
                WHERE id = ?
                """,
                (first_name, last_name, username, password_hash, otp_code, otp_expires_at, now_iso, email_row["id"]),
            )
            conn.commit()
            return "updated"

        conn.execute(
            """
            INSERT INTO admins (
                first_name,
                last_name,
                email,
                username,
                password_hash,
                is_active,
                invite_token,
                invite_expires_at,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
            """,
            (first_name, last_name, email, username, password_hash, otp_code, otp_expires_at, now_iso, now_iso),
        )
        conn.commit()
        return "created"


def verify_signup_otp(email, otp_code):
    with get_db_connection() as conn:
        user = conn.execute(
            "SELECT id, invite_token, invite_expires_at FROM admins WHERE email = ?",
            (email,),
        ).fetchone()

        if not user:
            return False, "User not found for this email."

        if not user["invite_token"] or user["invite_token"] != otp_code:
            return False, "Invalid OTP."

        expires_raw = user["invite_expires_at"]
        if not expires_raw:
            return False, "OTP expired. Please signup again."

        expires_at = datetime.fromisoformat(expires_raw)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) > expires_at:
            return False, "OTP expired. Please signup again."

        now_iso = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            UPDATE admins
            SET is_active = 1,
                invite_token = NULL,
                invite_expires_at = NULL,
                updated_at = ?
            WHERE id = ?
            """,
            (now_iso, user["id"]),
        )
        conn.commit()

    return True, None


def update_admin_password(admin_id, new_password_hash):
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        conn.execute(
            """
            UPDATE admins
            SET password_hash = ?, updated_at = ?
            WHERE id = ?
            """,
            (new_password_hash, now_iso, admin_id),
        )
        conn.commit()
        return True


def get_or_create_camera_settings(admin_id):
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT id, admin_id, add_member_camera, attendance_camera FROM camera_settings WHERE admin_id = ?",
            (admin_id,),
        ).fetchone()
        if row:
            return dict(row)
        
        cursor = conn.execute(
            "INSERT INTO camera_settings (admin_id, add_member_camera, attendance_camera) VALUES (?, ?, ?)",
            (admin_id, "0", "0"),
        )
        conn.commit()
        return {
            "id": cursor.lastrowid,
            "admin_id": admin_id,
            "add_member_camera": "0",
            "attendance_camera": "0",
        }


def update_camera_settings(admin_id, add_member_camera=None, attendance_camera=None):
    with get_db_connection() as conn:
        updates = []
        params = []
        if add_member_camera is not None:
            updates.append("add_member_camera = ?")
            params.append(add_member_camera)
        if attendance_camera is not None:
            updates.append("attendance_camera = ?")
            params.append(attendance_camera)
        
        if not updates:
            return False
        
        params.append(admin_id)
        query = f"UPDATE camera_settings SET {', '.join(updates)} WHERE admin_id = ?"
        conn.execute(query, params)
        conn.commit()
        return True