from flask import Flask
from flask_cors import CORS
from config import Config
from routes.auth_routes import auth_bp
from routes.member_routes import member_bp

app = Flask(__name__)
CORS(app)
app.config.from_object(Config)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(member_bp)


if __name__ == "__main__":
    app.run(debug=True)