import os
import smtplib
import sqlite3
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from functools import wraps

import jwt
from dotenv import load_dotenv
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash


load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-me-in-production")
app.config["FRONTEND_BASE_URL"] = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER")
app.config["MAIL_PORT"] = int(os.getenv("MAIL_PORT", "587"))
app.config["MAIL_USE_TLS"] = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
app.config["MAIL_USE_SSL"] = os.getenv("MAIL_USE_SSL", "False").lower() == "true"
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER")
app.config["TOKEN_EXPIRES_SECONDS"] = 24 * 60 * 60
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", app.config["SECRET_KEY"])
app.config["JWT_EXPIRES_HOURS"] = int(os.getenv("JWT_EXPIRES_HOURS", "24"))

DB_PATH = os.path.join(BASE_DIR, "db", "attendance.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def get_db_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    query = """
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
    with get_db_connection() as conn:
        conn.execute(query)
        conn.commit()


init_db()


def get_serializer():
    return URLSafeTimedSerializer(app.config["SECRET_KEY"])


def create_jwt_token(admin):
    now_utc = datetime.now(timezone.utc)
    payload = {
        "sub": str(admin["id"]),
        "username": admin["username"],
        "email": admin["email"],
        "iat": int(now_utc.timestamp()),
        "exp": int((now_utc + timedelta(hours=app.config["JWT_EXPIRES_HOURS"])).timestamp()),
    }
    return jwt.encode(payload, app.config["JWT_SECRET_KEY"], algorithm="HS256")


def require_auth(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = ""
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({"message": "Authorization token is missing."}), 401

        try:
            payload = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            g.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Session expired. Please login again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token."}), 401

        return view_func(*args, **kwargs)

    return wrapped


def send_setup_email(recipient_email, first_name, setup_link):
    if not app.config["MAIL_SERVER"] or not app.config["MAIL_USERNAME"] or not app.config["MAIL_PASSWORD"]:
        raise RuntimeError("Email settings are missing. Set MAIL_SERVER, MAIL_USERNAME and MAIL_PASSWORD.")

    subject = "Set up your admin account"
    text_body = (
        f"Hello {first_name},\n\n"
        "Your admin registration has been approved.\n"
        "Use the link below to set your account username and password:\n\n"
        f"{setup_link}\n\n"
        "This link expires in 24 hours.\n"
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = app.config["MAIL_DEFAULT_SENDER"]
    message["To"] = recipient_email
    message.set_content(text_body)

    if app.config["MAIL_USE_SSL"]:
        with smtplib.SMTP_SSL(app.config["MAIL_SERVER"], app.config["MAIL_PORT"]) as server:
            server.login(app.config["MAIL_USERNAME"], app.config["MAIL_PASSWORD"])
            server.send_message(message)
    else:
        with smtplib.SMTP(app.config["MAIL_SERVER"], app.config["MAIL_PORT"]) as server:
            if app.config["MAIL_USE_TLS"]:
                server.starttls()
            server.login(app.config["MAIL_USERNAME"], app.config["MAIL_PASSWORD"])
            server.send_message(message)


@app.route("/")
def root():
    return "Attendance API running"


@app.route("/api/login", methods=["POST"])
def login_user():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"message": "Username and password are required."}), 400

    with get_db_connection() as conn:
        admin = conn.execute(
            "SELECT id, first_name, last_name, email, username, password_hash, is_active FROM admins WHERE username = ?",
            (username,),
        ).fetchone()

    if not admin:
        return jsonify({"message": "Invalid username or password."}), 401

    if int(admin["is_active"]) != 1 or not admin["password_hash"]:
        return jsonify({"message": "Account setup is not complete."}), 403

    if not check_password_hash(admin["password_hash"], password):
        return jsonify({"message": "Invalid username or password."}), 401

    token = create_jwt_token(admin)
    return jsonify(
        {
            "message": "Login successful.",
            "token": token,
            "user": {
                "first_name": admin["first_name"],
                "last_name": admin["last_name"],
                "email": admin["email"],
                "username": admin["username"],
            },
        }
    )


@app.route("/api/register_admin", methods=["POST"])
@require_auth
def register_admin():
    data = request.get_json(silent=True) or {}
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip().lower()

    if not first_name or not last_name or not email:
        return jsonify({"message": "First name, last name and email are required."}), 400

    serializer = get_serializer()
    token = serializer.dumps({"email": email, "purpose": "admin_setup"})
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=app.config["TOKEN_EXPIRES_SECONDS"])).isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        existing = conn.execute("SELECT id, is_active FROM admins WHERE email = ?", (email,)).fetchone()

        if existing and int(existing["is_active"]) == 1:
            return jsonify({"message": "This admin email is already active."}), 409

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

    setup_link = f"{app.config['FRONTEND_BASE_URL'].rstrip('/')}/setup-account?token={token}"

    try:
        send_setup_email(email, first_name, setup_link)
    except Exception as exc:
        return jsonify({"message": f"Registration saved but email could not be sent: {str(exc)}"}), 500

    return jsonify({"message": "Admin registered successfully. Setup link sent to email."}), 201


@app.route("/api/admin/setup-account", methods=["GET"])
def validate_setup_token():
    token = (request.args.get("token") or "").strip()
    if not token:
        return jsonify({"message": "Token is required."}), 400

    serializer = get_serializer()
    try:
        payload = serializer.loads(token, max_age=app.config["TOKEN_EXPIRES_SECONDS"])
    except SignatureExpired:
        return jsonify({"message": "Token expired. Request a new registration link."}), 400
    except BadSignature:
        return jsonify({"message": "Invalid token."}), 400

    if payload.get("purpose") != "admin_setup":
        return jsonify({"message": "Invalid token purpose."}), 400

    email = payload.get("email", "").strip().lower()
    with get_db_connection() as conn:
        admin = conn.execute(
            "SELECT first_name, last_name, email, is_active, invite_token FROM admins WHERE email = ?",
            (email,),
        ).fetchone()

    if not admin:
        return jsonify({"message": "Admin registration not found."}), 404

    if int(admin["is_active"]) == 1:
        return jsonify({"message": "Account already set up."}), 409

    if admin["invite_token"] != token:
        return jsonify({"message": "Token does not match latest invitation."}), 400

    return jsonify(
        {
            "first_name": admin["first_name"],
            "last_name": admin["last_name"],
            "email": admin["email"],
        }
    )


@app.route("/api/admin/setup-account", methods=["POST"])
def create_admin_account():
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not token or not username or not password or not confirm_password:
        return jsonify({"message": "Token, username, password and confirm password are required."}), 400

    if password != confirm_password:
        return jsonify({"message": "Password and confirm password must match."}), 400

    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters."}), 400

    serializer = get_serializer()
    try:
        payload = serializer.loads(token, max_age=app.config["TOKEN_EXPIRES_SECONDS"])
    except SignatureExpired:
        return jsonify({"message": "Token expired. Request a new registration link."}), 400
    except BadSignature:
        return jsonify({"message": "Invalid token."}), 400

    if payload.get("purpose") != "admin_setup":
        return jsonify({"message": "Invalid token purpose."}), 400

    email = payload.get("email", "").strip().lower()

    with get_db_connection() as conn:
        admin = conn.execute(
            "SELECT id, is_active, invite_token FROM admins WHERE email = ?",
            (email,),
        ).fetchone()
        username_exists = conn.execute(
            "SELECT id FROM admins WHERE username = ?",
            (username,),
        ).fetchone()

        if not admin:
            return jsonify({"message": "Admin registration not found."}), 404

        if int(admin["is_active"]) == 1:
            return jsonify({"message": "Account already set up."}), 409

        if admin["invite_token"] != token:
            return jsonify({"message": "Token does not match latest invitation."}), 400

        if username_exists:
            return jsonify({"message": "Username already taken."}), 409

        now_iso = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            UPDATE admins
            SET username = ?,
                password_hash = ?,
                is_active = 1,
                invite_token = NULL,
                invite_expires_at = NULL,
                updated_at = ?
            WHERE id = ?
            """,
            (username, generate_password_hash(password), now_iso, admin["id"]),
        )
        conn.commit()

    return jsonify({"message": "Admin account created successfully."}), 201


if __name__ == "__main__":
    app.run(debug=True)
