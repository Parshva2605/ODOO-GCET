# ===== AUTO ANALYTICAL MODELS ROUTES =====
from flask import Blueprint, request, jsonify
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import execute_query, execute_insert, execute_update
from routes.auth import verify_token
import logging

# ===== BLUEPRINT SETUP =====
auto_analytical_models_bp = Blueprint('auto_analytical_models', __name__)
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
        
        return payload['user_id'] if payload else None
    except Exception as e:
        logger.error(f"❌ Error getting user from token: {str(e)}")
        return None

# ===== AUTO ANALYTICAL MODELS ENDPOINTS =====

@auto_analytical_models_bp.route('/auto-analytical-models', methods=['GET'])
def get_auto_analytical_models():
    """
    Get all auto analytical models for logged-in user with JOINs
    Returns: JSON with models array including partner and analytical account names
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        query = """
            SELECT 
                aam.id,
                aam.partner_id,
                aam.product_category,
                aam.analytical_account_id,
                aam.status,
                aam.created_at,
                c.name as partner_name,
                aa.name as analytical_account_name,
                aa.code as analytical_account_code
            FROM auto_analytical_models aam
            LEFT JOIN contacts c ON aam.partner_id = c.id
            LEFT JOIN analytical_accounts aa ON aam.analytical_account_id = aa.id
            WHERE aam.user_id = %s
            ORDER BY aam.created_at DESC
        """
        models = execute_query(query, (user_id,))
        
        logger.info(f"📋 Retrieved {len(models)} auto analytical models for user {user_id}")
        
        return jsonify({
            'success': True,
            'models': models
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting auto analytical models: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@auto_analytical_models_bp.route('/auto-analytical-models', methods=['POST'])
def create_auto_analytical_model():
    """
    Create new auto analytical model
    Expected JSON: partner_id, product_category, analytical_account_id, status
    Returns: JSON with success status and model_id
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        data = request.get_json()
        
        logger.info(f"📝 Auto analytical model data received: {data}")
        
        # Validate required fields
        analytical_account_id = data.get('analytical_account_id')
        if not analytical_account_id:
            return jsonify({'success': False, 'message': 'Analytical account is required'}), 400
        
        # Verify analytical account belongs to user
        check_query = "SELECT id FROM analytical_accounts WHERE id = %s AND user_id = %s"
        account_exists = execute_query(check_query, (analytical_account_id, user_id))
        if not account_exists:
            return jsonify({'success': False, 'message': 'Invalid analytical account'}), 400
        
        # Optional fields
        partner_id = data.get('partner_id') or None
        product_category = data.get('product_category') or None
        status = data.get('status', 'draft')
        
        # Validate partner if provided
        if partner_id:
            partner_check = "SELECT id FROM contacts WHERE id = %s AND user_id = %s"
            partner_exists = execute_query(partner_check, (partner_id, user_id))
            if not partner_exists:
                return jsonify({'success': False, 'message': 'Invalid partner'}), 400
        
        # Validate status
        if status not in ['draft', 'confirm', 'cancelled']:
            status = 'draft'
        
        logger.info(f"✅ Validated - Partner: {partner_id}, Category: {product_category}, Analytics: {analytical_account_id}")
        
        # Insert auto analytical model
        query = """
            INSERT INTO auto_analytical_models (user_id, partner_id, product_category, analytical_account_id, status)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """
        params = (user_id, partner_id, product_category, analytical_account_id, status)
        result = execute_insert(query, params)
        
        if result:
            model_id = result[0]['id']
            logger.info(f"✅ Auto analytical model created: ID {model_id}")
            
            return jsonify({
                'success': True,
                'message': 'Auto analytical model created successfully',
                'model_id': model_id
            }), 201
        else:
            raise Exception("Failed to create auto analytical model")
        
    except Exception as e:
        logger.error(f"❌ Error creating auto analytical model: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Server error', 'error': str(e)}), 500

@auto_analytical_models_bp.route('/auto-analytical-models/<int:model_id>', methods=['PUT'])
def update_auto_analytical_model(model_id):
    """
    Update existing auto analytical model
    Parameters: model_id in URL
    Expected JSON: partner_id, product_category, analytical_account_id, status
    Returns: JSON with success status
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        # Check if model belongs to user
        check_query = "SELECT id FROM auto_analytical_models WHERE id = %s AND user_id = %s"
        existing = execute_query(check_query, (model_id, user_id))
        
        if not existing:
            return jsonify({'success': False, 'message': 'Auto analytical model not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        analytical_account_id = data.get('analytical_account_id')
        if not analytical_account_id:
            return jsonify({'success': False, 'message': 'Analytical account is required'}), 400
        
        # Verify analytical account belongs to user
        account_check = "SELECT id FROM analytical_accounts WHERE id = %s AND user_id = %s"
        account_exists = execute_query(account_check, (analytical_account_id, user_id))
        if not account_exists:
            return jsonify({'success': False, 'message': 'Invalid analytical account'}), 400
        
        # Optional fields
        partner_id = data.get('partner_id') or None
        product_category = data.get('product_category') or None
        status = data.get('status', 'draft')
        
        # Validate partner if provided
        if partner_id:
            partner_check = "SELECT id FROM contacts WHERE id = %s AND user_id = %s"
            partner_exists = execute_query(partner_check, (partner_id, user_id))
            if not partner_exists:
                return jsonify({'success': False, 'message': 'Invalid partner'}), 400
        
        # Validate status
        if status not in ['draft', 'confirm', 'cancelled']:
            status = 'draft'
        
        # Update auto analytical model
        query = """
            UPDATE auto_analytical_models
            SET partner_id = %s, product_category = %s, analytical_account_id = %s, status = %s
            WHERE id = %s AND user_id = %s
        """
        params = (partner_id, product_category, analytical_account_id, status, model_id, user_id)
        execute_update(query, params)
        
        logger.info(f"✅ Auto analytical model updated: ID {model_id}")
        
        return jsonify({
            'success': True,
            'message': 'Auto analytical model updated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error updating auto analytical model: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@auto_analytical_models_bp.route('/auto-analytical-models/<int:model_id>', methods=['DELETE'])
def delete_auto_analytical_model(model_id):
    """
    Delete auto analytical model
    Parameters: model_id in URL
    Returns: JSON with success status
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        # Check if model belongs to user
        check_query = "SELECT id FROM auto_analytical_models WHERE id = %s AND user_id = %s"
        existing = execute_query(check_query, (model_id, user_id))
        
        if not existing:
            return jsonify({'success': False, 'message': 'Auto analytical model not found'}), 404
        
        # Delete auto analytical model
        query = "DELETE FROM auto_analytical_models WHERE id = %s AND user_id = %s"
        execute_update(query, (model_id, user_id))
        
        logger.info(f"🗑️ Auto analytical model deleted: ID {model_id}")
        
        return jsonify({
            'success': True,
            'message': 'Auto analytical model deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error deleting auto analytical model: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@auto_analytical_models_bp.route('/auto-analytical-models/match', methods=['GET'])
def match_auto_analytical_model():
    """
    Find matching auto analytical model for transaction
    Query params: partner_id, product_category
    Returns: Best matching model with highest score
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        # Get query parameters
        partner_id = request.args.get('partner_id')
        product_category = request.args.get('product_category')
        
        logger.info(f"🔍 Matching request - Partner: {partner_id}, Category: {product_category}")
        
        # Get all confirmed models for user
        query = """
            SELECT 
                aam.id,
                aam.partner_id,
                aam.product_category,
                aam.analytical_account_id,
                aa.name as analytical_account_name,
                aa.code as analytical_account_code
            FROM auto_analytical_models aam
            LEFT JOIN analytical_accounts aa ON aam.analytical_account_id = aa.id
            WHERE aam.user_id = %s AND aam.status = 'confirm'
        """
        models = execute_query(query, (user_id,))
        
        if not models:
            logger.info("ℹ️ No confirmed models found")
            return jsonify({
                'success': True,
                'match': None,
                'message': 'No matching rules found'
            }), 200
        
        # Score each model
        best_match = None
        best_score = 0
        
        for model in models:
            score = 0
            
            # Score partner match
            if model['partner_id']:
                if partner_id and str(model['partner_id']) == str(partner_id):
                    score += 1
                else:
                    # If model specifies partner but doesn't match, skip this model
                    continue
            
            # Score product category match
            if model['product_category']:
                if product_category and model['product_category'] == product_category:
                    score += 1
                else:
                    # If model specifies category but doesn't match, skip this model
                    continue
            
            # Update best match if this score is higher
            if score > best_score:
                best_score = score
                best_match = model
        
        if best_match:
            logger.info(f"✅ Best match found: Model ID {best_match['id']}, Score: {best_score}")
            return jsonify({
                'success': True,
                'match': {
                    'model_id': best_match['id'],
                    'analytical_account_id': best_match['analytical_account_id'],
                    'analytical_account_name': best_match['analytical_account_name'],
                    'analytical_account_code': best_match['analytical_account_code'],
                    'score': best_score
                }
            }), 200
        else:
            logger.info("ℹ️ No matching rules found")
            return jsonify({
                'success': True,
                'match': None,
                'message': 'No matching rules found'
            }), 200
        
    except Exception as e:
        logger.error(f"❌ Error matching auto analytical model: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500