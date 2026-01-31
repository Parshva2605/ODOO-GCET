# ===== ANALYTICAL ACCOUNTS ROUTES =====
from flask import Blueprint, request, jsonify
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import execute_query, execute_insert, execute_update
from utils.auth import token_required
import logging

# ===== BLUEPRINT SETUP =====
analytical_accounts_bp = Blueprint('analytical_accounts', __name__)
logger = logging.getLogger(__name__)

# ===== HELPER FUNCTIONS =====
# (No helper functions needed - using @token_required decorator)

# ===== ANALYTICAL ACCOUNTS ENDPOINTS =====

@analytical_accounts_bp.route('/analytical-accounts', methods=['GET'])
@token_required
def get_analytical_accounts(current_user):
    """
    Get all analytical accounts for logged-in user
    Returns: JSON with accounts array
    """
    try:
        user_id = current_user['id']
        
        query = """
            SELECT id, name, code, created_at
            FROM analytical_accounts
            WHERE user_id = %s
            ORDER BY code ASC
        """
        accounts = execute_query(query, (user_id,))
        
        logger.info(f"📋 Retrieved {len(accounts)} analytical accounts for user {user_id}")
        
        return jsonify({
            'success': True,
            'accounts': accounts
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting analytical accounts: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@analytical_accounts_bp.route('/analytical-accounts', methods=['POST'])
@token_required
def create_analytical_account(current_user):
    """
    Create new analytical account
    Expected JSON: name, code
    Returns: JSON with success status and account_id
    """
    try:
        user_id = current_user['id']
        
        data = request.get_json()
        
        logger.info(f"📝 Analytical account data received: {data}")
        
        # Validate required fields with None checks
        name = data.get('name', '') if data.get('name') else ''
        name = name.strip() if name else ''
        
        code = data.get('code', '') if data.get('code') else ''
        code = code.strip() if code else ''
        
        if not name:
            return jsonify({'success': False, 'message': 'Account name is required'}), 400
        
        if not code:
            return jsonify({'success': False, 'message': 'Account code is required'}), 400
        
        # Check if code already exists for this user
        check_query = "SELECT id FROM analytical_accounts WHERE code = %s AND user_id = %s"
        existing = execute_query(check_query, (code, user_id))
        
        if existing:
            return jsonify({'success': False, 'message': 'Account code already exists'}), 400
        
        logger.info(f"✅ Validated - Code: {code}, Name: {name}")
        
        # Insert analytical account
        query = """
            INSERT INTO analytical_accounts (user_id, name, code)
            VALUES (%s, %s, %s)
            RETURNING id
        """
        params = (user_id, name, code)
        result = execute_insert(query, params)
        
        if result:
            account_id = result[0]['id']
            logger.info(f"✅ Analytical account created: ID {account_id}, Code: {code}, Name: {name}")
            
            return jsonify({
                'success': True,
                'message': 'Analytical account created successfully',
                'account_id': account_id
            }), 201
        else:
            raise Exception("Failed to create analytical account")
        
    except Exception as e:
        logger.error(f"❌ Error creating analytical account: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Server error', 'error': str(e)}), 500

@analytical_accounts_bp.route('/analytical-accounts/<int:account_id>', methods=['PUT'])
@token_required
def update_analytical_account(current_user, account_id):
    """
    Update existing analytical account
    Parameters: account_id in URL
    Expected JSON: name, code
    Returns: JSON with success status
    """
    try:
        user_id = current_user['id']
        
        # Check if account belongs to user
        check_query = "SELECT id FROM analytical_accounts WHERE id = %s AND user_id = %s"
        existing = execute_query(check_query, (account_id, user_id))
        
        if not existing:
            return jsonify({'success': False, 'message': 'Analytical account not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields with None checks
        name = data.get('name', '') if data.get('name') else ''
        name = name.strip() if name else ''
        
        code = data.get('code', '') if data.get('code') else ''
        code = code.strip() if code else ''
        
        if not name:
            return jsonify({'success': False, 'message': 'Account name is required'}), 400
        
        if not code:
            return jsonify({'success': False, 'message': 'Account code is required'}), 400
        
        # Check if code already exists for this user (excluding current account)
        check_query = "SELECT id FROM analytical_accounts WHERE code = %s AND user_id = %s AND id != %s"
        existing_code = execute_query(check_query, (code, user_id, account_id))
        
        if existing_code:
            return jsonify({'success': False, 'message': 'Account code already exists'}), 400
        
        # Update analytical account
        query = """
            UPDATE analytical_accounts
            SET name = %s, code = %s
            WHERE id = %s AND user_id = %s
        """
        params = (name, code, account_id, user_id)
        execute_update(query, params)
        
        logger.info(f"✅ Analytical account updated: ID {account_id}, Code: {code}, Name: {name}")
        
        return jsonify({
            'success': True,
            'message': 'Analytical account updated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error updating analytical account: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@analytical_accounts_bp.route('/analytical-accounts/<int:account_id>', methods=['DELETE'])
@token_required
def delete_analytical_account(current_user, account_id):
    """
    Delete analytical account
    Parameters: account_id in URL
    Returns: JSON with success status
    """
    try:
        user_id = current_user['id']
        
        # Check if account belongs to user and get details for logging
        check_query = "SELECT name, code FROM analytical_accounts WHERE id = %s AND user_id = %s"
        existing = execute_query(check_query, (account_id, user_id))
        
        if not existing:
            return jsonify({'success': False, 'message': 'Analytical account not found'}), 404
        
        account_name = existing[0]['name']
        account_code = existing[0]['code']
        
        # Delete analytical account
        query = "DELETE FROM analytical_accounts WHERE id = %s AND user_id = %s"
        execute_update(query, (account_id, user_id))
        
        logger.info(f"🗑️ Analytical account deleted: ID {account_id}, Code: {account_code}, Name: {account_name}")
        
        return jsonify({
            'success': True,
            'message': 'Analytical account deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error deleting analytical account: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500