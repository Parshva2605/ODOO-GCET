# ===== AUTHENTICATION ROUTES =====
from flask import Blueprint, request, jsonify
import bcrypt
import jwt
from datetime import datetime, timedelta
import sys
import os
import re

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from utils.db import execute_query, execute_update
import logging

# ===== BLUEPRINT SETUP =====
auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

# ===== HELPER FUNCTIONS =====

def hash_password(password):
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password, password_hash):
    """Verify password against hash"""
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            password_hash.encode('utf-8')
        )
    except Exception as e:
        logger.error(f"❌ Password verification error: {str(e)}")
        return False

def generate_token(user_data):
    """
    Generate JWT token for authenticated user
    
    Args:
        user_data (dict): Dictionary containing user_id, email, role
        
    Returns:
        str: JWT token
    """
    payload = {
        'user_id': user_data['user_id'],
        'email': user_data['email'],
        'role': user_data['role'],
        'exp': datetime.utcnow() + timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')
    return token

def verify_token(token):
    """
    Verify JWT token
    
    Args:
        token (str): JWT token string
        
    Returns:
        dict or None: Decoded payload if valid, None if invalid
    """
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def validate_email(email):
    """
    Validate email format
    
    Args:
        email (str): Email address to validate
        
    Returns:
        bool: True if valid email format
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

# ===== AUTHENTICATION ROUTES =====

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    Register new user account
    
    Expected JSON:
        - name (required)
        - email (required)
        - password (required)
        - company_name (optional)
        - gstin (optional)
    
    Returns:
        JSON response with success/error message
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Extract required fields
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        company_name = data.get('company_name', '').strip()
        gstin = data.get('gstin', '').strip()
        
        # Validate required fields
        if not name:
            return jsonify({
                'success': False,
                'message': 'Name is required'
            }), 400
            
        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
            
        if not password:
            return jsonify({
                'success': False,
                'message': 'Password is required'
            }), 400
        
        # Validate email format
        if not validate_email(email):
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        
        # Validate password length
        if len(password) < 6:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 6 characters long'
            }), 400
        
        # Check if email already exists
        check_query = "SELECT id FROM users WHERE email = %s"
        existing_user = execute_query(check_query, (email,))
        
        if existing_user:
            logger.info(f"❌ Signup attempt with existing email: {email}")
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 400
        
        # Hash password
        hashed_password = hash_password(password)
        
        # Insert new user - use execute_update which commits the transaction
        insert_query = """
            INSERT INTO users (name, email, password_hash, company_name, gstin, role) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        params = (name, email, hashed_password, company_name, gstin, 'portal_user')
        
        # Use execute_update for INSERT
        from utils.db import execute_update
        execute_update(insert_query, params)
        
        # Get the newly created user
        user_query = "SELECT id FROM users WHERE email = %s"
        result = execute_query(user_query, (email,))
        user_id = result[0]['id']
        
        if result:
            logger.info(f"✅ New user registered successfully: {email} (ID: {user_id})")
            
            return jsonify({
                'success': True,
                'message': 'Account created successfully',
                'user_id': user_id
            }), 201
        else:
            logger.error(f"❌ Failed to create user: {email}")
            return jsonify({
                'success': False,
                'message': 'Failed to create account'
            }), 500
            
    except Exception as e:
        logger.error(f"❌ Signup error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    try:
        # Get request data
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        logger.info(f"🔐 Login attempt for: {email}")
        
        # Validate input
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        # Check if user exists
        query = "SELECT id, name, email, password_hash, role FROM users WHERE email = %s"
        result = execute_query(query, (email,))
        
        if not result or len(result) == 0:
            logger.warning(f"⚠️ User not found: {email}")
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        user = result[0]
        logger.info(f"✅ User found: {user['email']}")
        
        # Debug: Print password hash (remove in production!)
        logger.info(f"🔍 Password hash from DB: {user['password_hash'][:50]}...")
        logger.info(f"🔍 Password to verify: {password}")
        
        # Verify password
        is_valid = verify_password(password, user['password_hash'])
        logger.info(f"🔍 Password verification result: {is_valid}")
        
        if not is_valid:
            logger.warning(f"❌ Invalid password for: {email}")
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        # Generate token
        user_data = {
            'user_id': user['id'],
            'email': user['email'],
            'role': user['role']
        }
        token = generate_token(user_data)
        
        logger.info(f"✅ Login successful for: {email}")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Server error during login',
            'error': str(e)
        }), 500

@auth_bp.route('/verify', methods=['GET'])
def verify():
    """
    Verify if JWT token is valid
    
    Headers:
        Authorization: Bearer <token>
    
    Returns:
        JSON response with user data if token is valid
    """
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({
                'success': False,
                'message': 'Authorization header missing'
            }), 401
        
        # Extract token from "Bearer <token>"
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return jsonify({
                'success': False,
                'message': 'Invalid authorization header format'
            }), 401
        
        # Verify token
        payload = verify_token(token)
        
        if not payload:
            return jsonify({
                'success': False,
                'message': 'Invalid or expired token'
            }), 401
        
        # Get user details from database
        user_query = "SELECT id, name, email, role FROM users WHERE id = %s"
        users = execute_query(user_query, (payload['user_id'],))
        
        if not users:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 401
        
        user = users[0]
        
        logger.info(f"✅ 🔐 Token verified for user: {user['email']}")
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Token verification error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500