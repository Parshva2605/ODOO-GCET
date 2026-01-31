import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """
    Configuration class for Budget Accounting System
    Contains all application settings and database configuration
    """
    
    # ===== FLASK CONFIGURATION =====
    SECRET_KEY = 'your-secret-key-change-in-production'
    DEBUG = True
    
    # ===== POSTGRESQL DATABASE CONFIGURATION =====
    DB_HOST = 'localhost'
    DB_PORT = '5432'
    DB_NAME = 'budget_system'
    DB_USER = 'postgres'
    DB_PASSWORD = 'parshva123'
    
    # ===== JWT CONFIGURATION =====
    JWT_SECRET_KEY = 'jwt-secret-key-change-in-production'
    JWT_EXPIRATION_HOURS = 24
    
    # ===== CORS CONFIGURATION =====
    CORS_ORIGINS = '*'  # Allow all origins for development
    
    # ===== RAZORPAY CONFIGURATION (TEST MODE) =====
    RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_ID'
    RAZORPAY_KEY_SECRET = 'YOUR_KEY_SECRET'
    
    # ===== APPLICATION CONFIGURATION =====
    API_PREFIX = '/api'
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    @staticmethod
    def get_database_url():
        """
        Generate PostgreSQL connection string
        Returns: Database connection string for psycopg2
        """
        return f"host={Config.DB_HOST} port={Config.DB_PORT} dbname={Config.DB_NAME} user={Config.DB_USER} password={Config.DB_PASSWORD}"