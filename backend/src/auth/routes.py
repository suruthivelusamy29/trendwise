from flask import Blueprint, request
from src.auth.service import register_user, login_user

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    return register_user(data)

@auth_bp.route("/login", methods=["POST"])
def login():
    return login_user(request.json)
