import random
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify, g
from werkzeug.security import check_password_hash, generate_password_hash

from auth.jwt_auth import create_jwt_token
from auth.jwt_auth import require_auth
from email_utils import send_otp_email
from models.admin_model import (
    get_admin_by_username,
    upsert_pending_user,
    verify_signup_otp,
    get_admin_by_id,
)

auth_bp = Blueprint("auth_bp", __name__)


@auth_bp.route("/api/signup", methods=["POST"])
def signup_user():
    data = request.get_json(silent=True) or {}
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not first_name or not last_name or not email or not username or not password or not confirm_password:
        return jsonify({"message": "All fields are required."}), 400

    if password != confirm_password:
        return jsonify({"message": "Password and confirm password must match."}), 400

    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters."}), 400

    otp_code = f"{random.randint(0, 999999):06d}"
    otp_expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

    result = upsert_pending_user(
        first_name=first_name,
        last_name=last_name,
        email=email,
        username=username,
        password_hash=generate_password_hash(password),
        otp_code=otp_code,
        otp_expires_at=otp_expires_at,
    )

    if result == "email_exists":
        return jsonify({"message": "Email is already registered and verified."}), 409
    if result == "username_exists":
        return jsonify({"message": "Username is already taken."}), 409

    try:
        send_otp_email(email, first_name, otp_code)
    except Exception as exc:
        return jsonify({"message": f"Signup saved but OTP email failed: {str(exc)}"}), 500

    return jsonify({"message": "Signup successful. OTP sent to your email."}), 201


@auth_bp.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()

    if not email or not otp:
        return jsonify({"message": "Email and OTP are required."}), 400

    if len(otp) != 6 or not otp.isdigit():
        return jsonify({"message": "OTP must be a 6-digit code."}), 400

    ok, error = verify_signup_otp(email, otp)
    if not ok:
        return jsonify({"message": error}), 400

    return jsonify({"message": "Email verified successfully. Please login."})

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
        return jsonify({"message": "Please verify your email with OTP before login."}), 403

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


@auth_bp.route("/api/me", methods=["GET"])
@require_auth
def get_current_user():
    user_id = int(g.current_user.get("sub"))
    admin = get_admin_by_id(user_id)
    if not admin:
        return jsonify({"message": "User not found."}), 404

    return jsonify(dict(admin))
