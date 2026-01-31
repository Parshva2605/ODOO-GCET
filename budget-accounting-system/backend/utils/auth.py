"""
Authentication utilities for the Budget Accounting System
"""
from functools import wraps
from flask import request, jsonify
from routes.auth import verify_token
from utils.db import execute_query
import logging

logger = logging.getLogger(__name__)

def token_required(f):
    """
    Decorator to require JWT token authentication
    
    Usage:
        @token_required
        def protected_route(current_user):
            # current_user contains user data from token
            pass
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            # Get token from Authorization header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Authorization token required'}), 401
            
            token = auth_header.split(' ')[1]
            
            # Verify token
            payload = verify_token(token)
            if not payload:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            # Get user data from database
            user_query = """
                SELECT id, name, email, company_name, role
                FROM users 
                WHERE id = %s
            """
            
            users = execute_query(user_query, (payload['user_id'],))
            
            if not users:
                return jsonify({'error': 'User not found'}), 401
            
            current_user = users[0]
            
            # Call the original function with current_user
            return f(current_user, *args, **kwargs)
            
        except Exception as e:
            logger.error(f"❌ Token validation error: {str(e)}")
            return jsonify({'error': 'Authentication failed'}), 401
    
    return decorated

def get_current_user():
    """
    Get current user from JWT token without decorator
    
    Returns:
        dict: User data if authenticated, None if not
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return None
        
        user_query = """
            SELECT id, name, email, company_name, role
            FROM users 
            WHERE id = %s
        """
        
        users = execute_query(user_query, (payload['user_id'],))
        return users[0] if users else None
        
    except Exception as e:
        logger.error(f"❌ Get current user error: {str(e)}")
        return None