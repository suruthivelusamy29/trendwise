import bcrypt
from flask_jwt_extended import JWTManager, get_jwt_identity as _get_jwt_identity

def hash_password(password):
    """Hash a password using bcrypt"""
    if isinstance(password, str):
        password = password.encode('utf-8')
    return bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    """Verify a password against a hash"""
    if isinstance(password, str):
        password = password.encode('utf-8')
    if isinstance(hashed, str):
        hashed = hashed.encode('utf-8')
    return bcrypt.checkpw(password, hashed)

def get_current_user_id():
    """Get current user ID as integer from JWT token"""
    return int(_get_jwt_identity())

jwt = JWTManager()
