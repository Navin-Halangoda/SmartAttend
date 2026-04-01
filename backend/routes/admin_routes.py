from flask import Blueprint, request, jsonify
from auth.jwt_auth import require_auth
from auth.token import get_serializer
from email_utils import send_setup_email
from models.admin_model import (
    create_or_update_admin,
    get_admin_by_email,
    get_admin_by_id,
    get_all_admins,
    update_admin_profile,
    delete_admin,
)
from itsdangerous import SignatureExpired, BadSignature
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash
from flask import g

admin_bp = Blueprint("admin_bp", __name__)

@admin_bp.route("/api/register_admin", methods=["POST"])
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
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=24*60*60)).isoformat()

    create_or_update_admin(first_name, last_name, email, token, expires_at)

    setup_link = f"http://localhost:5173/setup-account?token={token}"
    try:
        send_setup_email(email, first_name, setup_link)
    except Exception as exc:
        return jsonify({"message": f"Registration saved but email could not be sent: {str(exc)}"}), 500

    return jsonify({"message": "Admin registered successfully. Setup link sent to email."}), 201


@admin_bp.route("/api/admins", methods=["GET"])
@require_auth
def list_admins():
    """Get all active admins"""
    admins = get_all_admins()
    return jsonify([dict(admin) for admin in admins])


@admin_bp.route("/api/admins/<int:admin_id>", methods=["GET"])
@require_auth
def get_admin(admin_id):
    """Get a single admin by ID"""
    admin = get_admin_by_id(admin_id)
    if not admin:
        return jsonify({"message": "Admin not found."}), 404
    return jsonify(dict(admin))


@admin_bp.route("/api/admins/<int:admin_id>", methods=["PUT"])
@require_auth
def update_admin(admin_id):
    """Update an admin's profile (only by them or by authorized user)"""
    current_user_id = int(g.current_user.get("sub"))
    # Allow admins to update only themselves for now
    if current_user_id != admin_id:
        return jsonify({"message": "You can only update your own profile."}), 403

    data = request.get_json(silent=True) or {}
    first_name = (data.get("first_name") or "").strip() or None
    last_name = (data.get("last_name") or "").strip() or None
    email = (data.get("email") or "").strip().lower() or None

    if not first_name and not last_name and not email:
        return jsonify({"message": "Provide at least one field to update."}), 400

    updated = update_admin_profile(admin_id, first_name, last_name, email)
    if not updated:
        return jsonify({"message": "Admin not found."}), 404

    return jsonify({"message": "Profile updated successfully.", "admin": dict(updated)})


@admin_bp.route("/api/admins/<int:admin_id>", methods=["DELETE"])
@require_auth
def delete_admin_account(admin_id):
    """Delete an admin account (only by them or by authorized user)"""
    # current_user_id = int(g.current_user.get("sub"))
    # # Allow admins to delete only themselves for now
    # if current_user_id != admin_id:
    #     return jsonify({"message": "You can only delete your own account."}), 403

    admin = get_admin_by_id(admin_id)
    if not admin:
        return jsonify({"message": "Admin not found."}), 404

    delete_admin(admin_id)
    return jsonify({"message": "Account deleted successfully."})


@admin_bp.route("/api/me", methods=["GET"])
@require_auth
def get_current_user():
    """Get information about the current logged-in user"""
    admin_id = int(g.current_user.get("sub"))
    admin = get_admin_by_id(admin_id)
    if not admin:
        return jsonify({"message": "User not found."}), 404
    return jsonify(dict(admin))


@admin_bp.route("/api/me", methods=["PUT"])
@require_auth
def update_current_user():
    """Update current user profile"""
    admin_id = int(g.current_user.get("sub"))
    data = request.get_json(silent=True) or {}
    first_name = (data.get("first_name") or "").strip() or None
    last_name = (data.get("last_name") or "").strip() or None
    email = (data.get("email") or "").strip().lower() or None

    if not first_name and not last_name and not email:
        return jsonify({"message": "Provide at least one field to update."}), 400

    updated = update_admin_profile(admin_id, first_name, last_name, email)
    if not updated:
        return jsonify({"message": "User not found."}), 404

    return jsonify({"message": "Profile updated successfully.", "admin": dict(updated)})


@admin_bp.route("/api/me", methods=["DELETE"])
@require_auth
def delete_current_user():
    """Delete current user account"""
    admin_id = int(g.current_user.get("sub"))
    admin = get_admin_by_id(admin_id)
    if not admin:
        return jsonify({"message": "User not found."}), 404

    delete_admin(admin_id)
    return jsonify({"message": "Account deleted successfully."})