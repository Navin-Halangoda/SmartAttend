from itsdangerous import URLSafeTimedSerializer
from config import Config

def get_serializer():
    return URLSafeTimedSerializer(Config.SECRET_KEY)