import os
import sqlite3
from config import Config

os.makedirs(os.path.dirname(Config.DB_PATH), exist_ok=True)

def get_db_connection():
    conn = sqlite3.connect(Config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    admin_query = """
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        username TEXT UNIQUE,
        password_hash TEXT,
        is_active INTEGER NOT NULL DEFAULT 0,
        invite_token TEXT,
        invite_expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """

    member_query = """
    CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_username TEXT NOT NULL,
        name TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        contactNumber TEXT NOT NULL UNIQUE,
        member_id TEXT NOT NULL UNIQUE,
        datasetPath TEXT NOT NULL UNIQUE
    )
    """

    attendance_query = """
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_username TEXT NOT NULL,
        name TEXT NOT NULL,
        member_id TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        UNIQUE(admin_username, member_id, date)
    )
    """

    camera_settings_query = """
    CREATE TABLE IF NOT EXISTS camera_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL UNIQUE,
        add_member_camera TEXT,
        attendance_camera TEXT
    )
    """

    with get_db_connection() as conn:
        conn.execute(admin_query)
        conn.execute(member_query)
        conn.execute(attendance_query)
        conn.execute(camera_settings_query)
        conn.commit()

init_db()