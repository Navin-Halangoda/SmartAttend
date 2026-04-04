import os
import csv

import cv2
from flask import Blueprint, g, jsonify, request
import numpy as np
from datetime import datetime
from sklearn.neighbors import KNeighborsClassifier
import mediapipe as mp

from auth.jwt_auth import require_auth
from models.admin_model import get_or_create_camera_settings
from models.attendance_model import create_attendance, delete_attendance, get_attendance_by_admin
from models.member_model import create_member, delete_member, get_members_by_admin, update_member

from mediapipe.tasks import python
from mediapipe.tasks.python import vision


model_path = "blaze_face_short_range.tflite"

base_options = python.BaseOptions(model_asset_path=model_path)
options = vision.FaceDetectorOptions(base_options=base_options)

detector = vision.FaceDetector.create_from_options(options)


def _normalize_camera_source(camera_value):
    value = str(camera_value or "0").strip()
    if value.isdigit():
        return int(value)
    return value


def _get_camera_source(admin_id, setting_key):
    settings = get_or_create_camera_settings(admin_id)
    return _normalize_camera_source(settings.get(setting_key) or "0")


def _camera_connected(camera_source):
    cap = cv2.VideoCapture(camera_source)
    if not cap.isOpened():
        cap.release()
        return False
    ok, _ = cap.read()
    cap.release()
    return bool(ok)


def capture_image(save_path, camera_source):
    os.makedirs(save_path, exist_ok=True)
    cap = cv2.VideoCapture(camera_source)
    if not cap.isOpened():
        cap.release()
        return False
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
    return True


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


def _attendance_file_path(admin_username):
    return f"excels/{admin_username}_attendance.csv"


def _ensure_attendance_file(file_name):
    os.makedirs(os.path.dirname(file_name), exist_ok=True)
    if not os.path.exists(file_name):
        with open(file_name, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Name", "Member ID", "Date", "Time"])


def markAttendance(admin_username, name, member_id):
    file_name = _attendance_file_path(admin_username)

    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    time_now = now.strftime("%H:%M:%S")

    created, _, _ = create_attendance(
        admin_username=admin_username,
        name=name,
        member_id=member_id,
        date=today,
        time=time_now,
    )

    if not created:
        return False

    _ensure_attendance_file(file_name)

    # Keep CSV in sync with DB inserts and avoid duplicate lines if file already had the same row.
    with open(file_name, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if (
                row.get("Name") == name
                and row.get("Member ID") == member_id
                and row.get("Date") == today
            ):
                return True

    with open(file_name, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([name, member_id, today, time_now])

    print(f"Attendance marked: {name}")
    return True


def remove_attendance_from_csv(admin_username, name, member_id, date, time):
    file_name = _attendance_file_path(admin_username)
    if not os.path.exists(file_name):
        return

    _ensure_attendance_file(file_name)
    with open(file_name, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        filtered_rows = []
        for row in reader:
            should_remove = (
                row.get("Name") == name
                and row.get("Member ID") == member_id
                and row.get("Date") == date
                and row.get("Time") == time
            )
            if not should_remove:
                filtered_rows.append(row)

    with open(file_name, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Name", "Member ID", "Date", "Time"])
        writer.writeheader()
        writer.writerows(filtered_rows)


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

    admin_id = int((g.current_user or {}).get("sub"))
    add_member_camera = _get_camera_source(admin_id, "add_member_camera")

    if not _camera_connected(add_member_camera):
        return jsonify({"message": "Configured Add Member camera is not connected. Please test camera in Settings."}), 400

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

    capture_image(dataset_path, add_member_camera)

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


@member_bp.route("/api/attendance", methods=["GET"])
@require_auth
def list_attendance():
    admin_username = _current_admin_username()
    if not admin_username:
        return jsonify({"message": "Admin username not found in token payload."}), 401

    attendance_rows = get_attendance_by_admin(admin_username)
    return jsonify({"attendance": attendance_rows}), 200


@member_bp.route("/api/attendance/<int:row_id>", methods=["DELETE"])
@require_auth
def remove_attendance(row_id):
    admin_username = _current_admin_username()
    if not admin_username:
        return jsonify({"message": "Admin username not found in token payload."}), 401

    deleted, row = delete_attendance(admin_username=admin_username, row_id=row_id)
    if not deleted:
        return jsonify({"message": "Attendance record not found."}), 404

    remove_attendance_from_csv(
        admin_username=admin_username,
        name=row["name"],
        member_id=row["member_id"],
        date=row["date"],
        time=row["time"],
    )
    return jsonify({"message": "Attendance deleted successfully."}), 200

@member_bp.route("/api/members/attendence", methods=["PATCH"])
@member_bp.route("/api/members/attendance", methods=["PATCH"])
@require_auth
def mark_attendence():
    admin_username = _current_admin_username()
    if not admin_username:
        return jsonify({"message": "Admin username not found in token payload."}), 401
    admin_id = int((g.current_user or {}).get("sub"))
    attendance_camera = _get_camera_source(admin_id, "attendance_camera")

    if not _camera_connected(attendance_camera):
        return jsonify({"message": "Configured Attendance camera is not connected. Please test camera in Settings."}), 400

    path = f"datasets/{admin_username}_dataset"
    if not os.path.isdir(path):
        return jsonify({"message": "No dataset found for this admin."}), 400

    faces = []
    labels = []

    for person in os.listdir(path):
        person_path = os.path.join(path, person)

        if os.path.isdir(person_path):
            for img_name in os.listdir(person_path):
                img_path = os.path.join(person_path, img_name)
                img = cv2.imread(img_path)

                if img is None:
                    continue

                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

                # Convert to MediaPipe Image
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

                detection_result = detector.detect(mp_image)

                if detection_result.detections:
                    for detection in detection_result.detections:
                        bbox = detection.bounding_box

                        x, y, w, h = bbox.origin_x, bbox.origin_y, bbox.width, bbox.height

                        face = img[y:y+h, x:x+w]

                        if face.size == 0:
                            continue

                        face = cv2.resize(face, (100, 100))
                        face = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)

                        faces.append(face.flatten())
                        labels.append(person)

    if not faces:
        return jsonify({"message": "No valid face data found in dataset."}), 400

    knn = KNeighborsClassifier(n_neighbors=3)
    knn.fit(faces, labels)

    cap = cv2.VideoCapture(attendance_camera)
    newly_marked = 0

    while True:
        success, frame = cap.read()
        if not success:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        detection_result = detector.detect(mp_image)

        if detection_result.detections:
            for detection in detection_result.detections:
                bbox = detection.bounding_box
                x, y, w, h = bbox.origin_x, bbox.origin_y, bbox.width, bbox.height

                x = max(0, x)
                y = max(0, y)
                w = max(0, w)
                h = max(0, h)

                face = frame[y:y+h, x:x+w]

                if face.size == 0:
                    continue

                face_resized = cv2.resize(face, (100, 100))
                face_gray = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
                face_flat = face_gray.flatten().reshape(1, -1)

                name = knn.predict(face_flat)[0]
                name, member_id = name.rsplit("_", 1)

                if markAttendance(admin_username, name, member_id):
                    newly_marked += 1

                cv2.rectangle(frame, (x, y), (x+w, y+h), (0,255,0), 2)
                cv2.putText(frame, name, (x, y-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)

        cv2.imshow("For close the camera press 'q'", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

    return jsonify({"message": f"Attendence process completed. New records saved: {newly_marked}."}), 200
