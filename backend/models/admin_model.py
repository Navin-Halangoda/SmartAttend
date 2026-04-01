from db import get_db_connection
from werkzeug.security import generate_password_hash

def get_admin_by_username(username):
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT id, first_name, last_name, email, username, password_hash, is_active FROM admins WHERE username = ?",
            (username,)
        ).fetchone()

def get_admin_by_email(email):
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT * FROM admins WHERE email = ?",
            (email,)
        ).fetchone()

def get_admin_by_id(admin_id):
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT id, first_name, last_name, email, username, is_active, created_at, updated_at FROM admins WHERE id = ?",
            (admin_id,)
        ).fetchone()

def get_all_admins():
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT id, first_name, last_name, email, username, is_active, created_at, updated_at FROM admins WHERE is_active = 1 ORDER BY created_at DESC"
        ).fetchall()

def update_admin_profile(admin_id, first_name=None, last_name=None, email=None):
    import datetime
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db_connection() as conn:
        admin = conn.execute("SELECT * FROM admins WHERE id = ?", (admin_id,)).fetchone()
        if not admin:
            return None
        
        new_first_name = first_name if first_name else admin["first_name"]
        new_last_name = last_name if last_name else admin["last_name"]
        new_email = email if email else admin["email"]
        
        conn.execute(
            """
            UPDATE admins
            SET first_name = ?, last_name = ?, email = ?, updated_at = ?
            WHERE id = ?
            """,
            (new_first_name, new_last_name, new_email, now_iso, admin_id)
        )
        conn.commit()
        return get_admin_by_id(admin_id)

def delete_admin(admin_id):
    with get_db_connection() as conn:
        conn.execute("DELETE FROM admins WHERE id = ?", (admin_id,))
        conn.commit()
        return True

def create_or_update_admin(first_name, last_name, email, token, expires_at):
    import datetime
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db_connection() as conn:
        existing = get_admin_by_email(email)
        if existing:
            conn.execute(
                """
                UPDATE admins
                SET first_name = ?, last_name = ?, invite_token = ?, invite_expires_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (first_name, last_name, token, expires_at, now_iso, existing["id"]),
            )
        else:
            conn.execute(
                """
                INSERT INTO admins (first_name, last_name, email, invite_token, invite_expires_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (first_name, last_name, email, token, expires_at, now_iso, now_iso),
            )
        conn.commit()