from src.extensions import hash_password, verify_password
from flask_jwt_extended import create_access_token
from src.db import get_connection
from src.alerts.service import is_email_verified, cleanup_verified_otp
import datetime

# Register user
def register_user(data):
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Validate input
        if not data or "email" not in data or "password" not in data:
            return {"error": "Email and password are required"}, 400

        # Check if email is verified via OTP
        if not is_email_verified(data["email"]):
            return {"error": "Email not verified. Please verify your email with OTP first."}, 400

        # Check if user already exists
        cur.execute(
            "SELECT uid FROM user WHERE email = %s",
            (data["email"],)
        )
        if cur.fetchone():
            return {"error": "User already exists"}, 400

        # Validate password
        password = str(data["password"]).strip()
        
        if len(password) < 6:
            return {"error": "Password must be at least 6 characters"}, 400
        
        # Hash the password
        password_hash = hash_password(password)

        cur.execute("""
            INSERT INTO user (email, password_hash, name)
            VALUES (%s, %s, %s)
        """, (
            data["email"],
            password_hash,
            data.get("name")
        ))

        conn.commit()
        
        # Cleanup OTP after successful registration
        cleanup_verified_otp(data["email"])

        return {"message": "User registered successfully"}, 201
    
    except Exception as e:
        return {"error": f"Registration failed: {str(e)}"}, 500


# Login user
def login_user(data):
    conn = get_connection()
    cur = conn.cursor()

    # Validate input
    if not data or "email" not in data or "password" not in data:
        return {"error": "Email and password are required"}, 400

    cur.execute(
        "SELECT uid, password_hash FROM user WHERE email = %s",
        (data["email"],)
    )
    user = cur.fetchone()

    # Validate password
    password = str(data["password"]).strip()

    if not user or not verify_password(password, user["password_hash"]):
        return {"error": "Invalid credentials"}, 401

    token = create_access_token(
        identity=str(user["uid"]),
        expires_delta=datetime.timedelta(hours=1)
    )

    return {"token": token}, 200
