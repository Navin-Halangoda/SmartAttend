from flask import Blueprint, request, jsonify
from auth.jwt_auth import create_jwt_token
from models.admin_model import get_admin_by_username
from auth.token import get_serializer
from db import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import SignatureExpired, BadSignature
from datetime import datetime, timezone
from config import Config

auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.route("/api/login", methods=["POST"])
def login_user():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "")

    if not username or not password:
        return jsonify({"message": "Username and password are required."}), 400

    admin = get_admin_by_username(username)
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
@auth_bp.route("/api/admin/setup-account", methods=["GET"])
def validate_setup_token():
    token = (request.args.get("token") or "").strip()
    if not token:
        return jsonify({"message": "Token is required."}), 400

    serializer = get_serializer()
    try:
        payload = serializer.loads(token, max_age=Config.TOKEN_EXPIRES_SECONDS)
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


@auth_bp.route("/api/admin/setup-account", methods=["POST"])
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
        payload = serializer.loads(token, max_age=Config.TOKEN_EXPIRES_SECONDS)
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
