import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "trendwise")
    JWT_ACCESS_EXPIRES = int(os.getenv("JWT_ACCESS_EXPIRES", 3600))
    
    # MySQL Configuration
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_USERNAME = os.getenv("MYSQL_USERNAME", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "defaultdb")
    
    # AI Configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    # SMTP Email Configuration
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SENDER_EMAIL = os.getenv("SENDER_EMAIL")
    SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")
    
    # MongoDB Configuration (optional)
    MONGO_URI = os.getenv("MONGO_URI")

# Export for backward compatibility
MYSQL_HOST = Config.MYSQL_HOST
MYSQL_USERNAME = Config.MYSQL_USERNAME
MYSQL_PASSWORD = Config.MYSQL_PASSWORD
MYSQL_PORT = Config.MYSQL_PORT
MYSQL_DATABASE = Config.MYSQL_DATABASE