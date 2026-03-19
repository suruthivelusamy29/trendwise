from src.config import Config
import pymysql
import logging

logger = logging.getLogger(__name__)

class DatabaseConnection:
    """Database connection manager with connection pooling support"""
    
    _connection_params = {
        'charset': 'utf8mb4',
        'connect_timeout': 10,
        'cursorclass': pymysql.cursors.DictCursor,
        'read_timeout': 10,
        'write_timeout': 10,
        'autocommit': False
    }
    
    @classmethod
    def get_connection(cls):
        """Get a new database connection"""
        try:
            return pymysql.connect(
                host=Config.MYSQL_HOST,
                user=Config.MYSQL_USERNAME,
                password=Config.MYSQL_PASSWORD,
                port=Config.MYSQL_PORT,
                db=Config.MYSQL_DATABASE,
                **cls._connection_params
            )
        except pymysql.Error as e:
            logger.error(f"Database connection error: {e}")
            raise
    
    @classmethod
    def test_connection(cls):
        """Test database connection"""
        try:
            conn = cls.get_connection()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False

# Main function for backward compatibility
def get_db_connection():
    """Get database connection (primary function)"""
    return DatabaseConnection.get_connection()

# Alias for backward compatibility
def get_connection():
    """Get database connection (alias)"""
    return get_db_connection()