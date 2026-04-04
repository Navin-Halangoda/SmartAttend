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
    update_admin_password,
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


@auth_bp.route("/api/update-password", methods=["PUT"])
@require_auth
def update_password():
    user_id = int(g.current_user.get("sub"))
    admin = get_admin_by_id(user_id)
    if not admin:
        return jsonify({"message": "User not found."}), 404

    data = request.get_json(silent=True) or {}
    current_password = data.get("currentPassword") or ""
    new_password = data.get("newPassword") or ""
    confirm_password = data.get("confirmPassword") or ""

    if not current_password or not new_password or not confirm_password:
        return jsonify({"message": "All password fields are required."}), 400

    if not check_password_hash(admin["password_hash"], current_password):
        return jsonify({"message": "Current password is incorrect."}), 401

    if new_password != confirm_password:
        return jsonify({"message": "New password and confirm password must match."}), 400

    if len(new_password) < 8:
        return jsonify({"message": "Password must be at least 8 characters."}), 400

    if new_password == current_password:
        return jsonify({"message": "New password must be different from current password."}), 400

    new_password_hash = generate_password_hash(new_password)
    update_admin_password(user_id, new_password_hash)

    return jsonify({"message": "Password updated successfully."}), 200


@auth_bp.route("/api/available-cameras", methods=["GET"])
@require_auth
def get_available_cameras():
    import cv2
    available = []
    for i in range(5):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            cap.release()
            available.append(i)
        else:
            cap.release()
    return jsonify({"cameras": available}), 200


@auth_bp.route("/api/test-camera", methods=["POST"])
@require_auth
def test_camera():
    import cv2
    data = request.get_json(silent=True) or {}
    camera_config = (data.get("camera") or "").strip()
    
    if not camera_config:
        return jsonify({"message": "Camera configuration is required."}), 400
    
    try:
        if camera_config.startswith("http"):
            cap = cv2.VideoCapture(camera_config)
        else:
            cap = cv2.VideoCapture(int(camera_config))
        
        if cap.isOpened():
            ret, _ = cap.read()
            cap.release()
            if ret:
                return jsonify({"message": "Camera is working.", "success": True}), 200
            else:
                return jsonify({"message": "Camera could not capture frame.", "success": False}), 200
        else:
            return jsonify({"message": "Camera could not be opened.", "success": False}), 200
    except Exception as e:
        return jsonify({"message": f"Error testing camera: {str(e)}", "success": False}), 200


@auth_bp.route("/api/camera-settings", methods=["GET"])
@require_auth
def get_camera_settings():
    from models.admin_model import get_or_create_camera_settings
    user_id = int(g.current_user.get("sub"))
    settings = get_or_create_camera_settings(user_id)
    return jsonify(settings), 200


@auth_bp.route("/api/camera-settings", methods=["PUT"])
@require_auth
def save_camera_settings():
    from models.admin_model import update_camera_settings
    user_id = int(g.current_user.get("sub"))
    data = request.get_json(silent=True) or {}

    add_member_camera = data.get("add_member_camera")
    attendance_camera = data.get("attendance_camera")

    if isinstance(add_member_camera, str):
        add_member_camera = add_member_camera.strip() or "0"
    if isinstance(attendance_camera, str):
        attendance_camera = attendance_camera.strip() or "0"

    if add_member_camera is None and attendance_camera is None:
        return jsonify({"message": "At least one camera configuration is required."}), 400

    update_camera_settings(
        user_id,
        add_member_camera=add_member_camera,
        attendance_camera=attendance_camera,
    )
    return jsonify({"message": "Camera settings saved successfully."}), 200
