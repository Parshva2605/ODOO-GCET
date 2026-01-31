# ===== STATISTICS ROUTES =====
from flask import Blueprint, request, jsonify
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import execute_query
from routes.auth import verify_token
import logging

# ===== BLUEPRINT SETUP =====
stats_bp = Blueprint('stats', __name__)
logger = logging.getLogger(__name__)

# ===== HELPER FUNCTIONS =====

def get_user_from_token():
    """
    Extract user_id from JWT token in Authorization header
    Returns: user_id if valid, None if invalid
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if payload:
            return payload['user_id']
        return None
    except Exception as e:
        logger.error(f"❌ Error getting user from token: {str(e)}")
        return None

# ===== STATISTICS ENDPOINTS =====

@stats_bp.route('/budgets/count', methods=['GET'])
def get_budgets_count():
    """
    Get total number of budgets for logged-in user
    Returns: JSON with count
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        query = "SELECT COUNT(*) as count FROM budgets WHERE user_id = %s"
        result = execute_query(query, (user_id,))
        
        count = result[0]['count'] if result else 0
        logger.info(f"📊 Budgets count for user {user_id}: {count}")
        
        return jsonify({'success': True, 'count': count}), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting budgets count: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@stats_bp.route('/contacts/count', methods=['GET'])
def get_contacts_count():
    """
    Get total number of contacts for logged-in user
    Returns: JSON with count
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        query = "SELECT COUNT(*) as count FROM contacts WHERE user_id = %s"
        result = execute_query(query, (user_id,))
        
        count = result[0]['count'] if result else 0
        logger.info(f"📊 Contacts count for user {user_id}: {count}")
        
        return jsonify({'success': True, 'count': count}), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting contacts count: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@stats_bp.route('/products/count', methods=['GET'])
def get_products_count():
    """
    Get total number of products for logged-in user
    Returns: JSON with count
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        query = "SELECT COUNT(*) as count FROM products WHERE user_id = %s"
        result = execute_query(query, (user_id,))
        
        count = result[0]['count'] if result else 0
        logger.info(f"📊 Products count for user {user_id}: {count}")
        
        return jsonify({'success': True, 'count': count}), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting products count: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@stats_bp.route('/purchase-orders/count', methods=['GET'])
def get_purchase_orders_count():
    """
    Get total number of purchase orders for logged-in user
    Returns: JSON with count
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        query = "SELECT COUNT(*) as count FROM purchase_orders WHERE user_id = %s"
        result = execute_query(query, (user_id,))
        
        count = result[0]['count'] if result else 0
        logger.info(f"📊 Purchase Orders count for user {user_id}: {count}")
        
        return jsonify({'success': True, 'count': count}), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting purchase orders count: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500