import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g
from config import Config

def create_jwt_token(admin):
    now_utc = datetime.now(timezone.utc)
    payload = {
        "sub": str(admin["id"]),
        "username": admin["username"],
        "email": admin["email"],
        "iat": int(now_utc.timestamp()),
        "exp": int((now_utc + timedelta(hours=Config.JWT_EXPIRES_HOURS)).timestamp()),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

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
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
            g.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Session expired. Please login again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token."}), 401
        return view_func(*args, **kwargs)
    return wrapped