import os

import cv2
from flask import Blueprint, g, jsonify, request

from auth.jwt_auth import require_auth
from models.member_model import create_member, delete_member, get_members_by_admin, update_member


def capture_image(save_path):
    os.makedirs(save_path, exist_ok=True)
    cap = cv2.VideoCapture(0)
    count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        cv2.imshow("Capture[press the space button ]", frame)
        if cv2.waitKey(1) & 0xFF == ord(" "):
            cv2.imwrite(f"{save_path}/{count}.jpg", frame)
            count += 1
        if count >= 50:
            break
    cap.release()
    cv2.destroyAllWindows()


member_bp = Blueprint("member_bp", __name__)


def _parse_member_payload(data):
    name = (data.get("name") or "").strip()
    contact_number = (data.get("contactNumber") or "").strip()
    member_id = (data.get("member_id") or data.get("memberId") or "").strip()
    date_of_birth = (data.get("dateOfBirth") or data.get("date_of_birth") or "").strip()

    if not name or not contact_number or not member_id or not date_of_birth:
        return None, (jsonify({"message": "name, dateOfBirth, contactNumber, and member_id are required."}), 400)

    return {
        "name": name,
        "contact_number": contact_number,
        "member_id": member_id,
        "date_of_birth": date_of_birth,
    }, None


def _current_admin_username():
    return (g.current_user or {}).get("username")


@member_bp.route("/api/members", methods=["GET"])
@require_auth
def list_members():
    admin_username = _current_admin_username()
    if not admin_username:
        return jsonify({"message": "Admin username not found in token payload."}), 401

    members = get_members_by_admin(admin_username)
    return jsonify({"members": members}), 200


@member_bp.route("/api/members", methods=["POST"])
@require_auth
def save_member():
    admin_username = _current_admin_username()
    if not admin_username:
        return jsonify({"message": "Admin username not found in token payload."}), 401

    data = request.get_json(silent=True) or {}
    payload, error_response = _parse_member_payload(data)
    if error_response:
        return error_response

    dataset_path = f"datasets/{admin_username}_dataset/{payload['name']}_{payload['member_id']}"

    ok, error, row_id = create_member(
        admin_username=admin_username,
        name=payload["name"],
        date_of_birth=payload["date_of_birth"],
        contact_number=payload["contact_number"],
        member_id=payload["member_id"],
        dataset_path=dataset_path,
    )

    if not ok:
        return jsonify({"message": error}), 409

    capture_image(dataset_path)

    return (
        jsonify(
            {
                "message": "Member saved successfully.",
                "member": {
                    "id": row_id,
                    "admin_username": admin_username,
                    "name": payload["name"],
                    "dateOfBirth": payload["date_of_birth"],
                    "contactNumber": payload["contact_number"],
                    "member_id": payload["member_id"],
                    "datasetPath": dataset_path,
                },
            }
        ),
        201,
    )


@member_bp.route("/api/members/<int:row_id>", methods=["PUT"])
@require_auth
def edit_member(row_id):
    admin_username = _current_admin_username()
    if not admin_username:
        return jsonify({"message": "Admin username not found in token payload."}), 401

    data = request.get_json(silent=True) or {}
    payload, error_response = _parse_member_payload(data)
    if error_response:
        return error_response

    ok, error, _ = update_member(
        admin_username=admin_username,
        row_id=row_id,
        name=payload["name"],
        date_of_birth=payload["date_of_birth"],
        contact_number=payload["contact_number"],
        member_id=payload["member_id"],
    )
    if not ok:
        status_code = 404 if error == "Member not found." else 409
        return jsonify({"message": error}), status_code

    return jsonify({"message": "Member updated successfully."}), 200


@member_bp.route("/api/members/<int:row_id>", methods=["DELETE"])
@require_auth
def remove_member(row_id):
    admin_username = _current_admin_username()
    if not admin_username:
        return jsonify({"message": "Admin username not found in token payload."}), 401

    deleted = delete_member(admin_username=admin_username, row_id=row_id)
    if not deleted:
        return jsonify({"message": "Member not found."}), 404

    return jsonify({"message": "Member deleted successfully."}), 200
