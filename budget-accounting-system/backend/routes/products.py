# ===== PRODUCTS ROUTES =====
from flask import Blueprint, request, jsonify
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import execute_query, execute_insert, execute_update
from routes.auth import verify_token
import logging

# ===== BLUEPRINT SETUP =====
products_bp = Blueprint('products', __name__)
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

# ===== PRODUCTS ENDPOINTS =====

@products_bp.route('/products', methods=['GET'])
def get_products():
    """
    Get all products for logged-in user
    Returns: JSON with products array
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        query = """
            SELECT id, name, category, cost_price, sales_price, created_at
            FROM products
            WHERE user_id = %s
            ORDER BY created_at DESC
        """
        products = execute_query(query, (user_id,))
        
        logger.info(f"📋 Retrieved {len(products)} products for user {user_id}")
        
        return jsonify({
            'success': True,
            'products': products
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting products: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@products_bp.route('/products', methods=['POST'])
def create_product():
    """
    Create new product
    Expected JSON: name, category, cost_price, sales_price
    Returns: JSON with success status and product_id
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        data = request.get_json()
        
        logger.info(f"📝 Product data received: {data}")
        
        # Validate required fields with None checks
        name = data.get('name', '') if data.get('name') else ''
        name = name.strip() if name else ''
        
        if not name:
            return jsonify({'success': False, 'message': 'Product name is required'}), 400
        
        # Optional fields - handle None values
        category = data.get('category')
        category = category.strip() if category else None
        
        # Price fields with validation
        try:
            cost_price = float(data.get('cost_price', 0)) if data.get('cost_price') is not None else 0.00
            sales_price = float(data.get('sales_price', 0)) if data.get('sales_price') is not None else 0.00
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid price format'}), 400
        
        # Validate prices are not negative
        if cost_price < 0 or sales_price < 0:
            return jsonify({'success': False, 'message': 'Prices cannot be negative'}), 400
        
        logger.info(f"✅ Validated - Name: {name}, Cost: {cost_price}, Sales: {sales_price}")
        
        # Insert product
        query = """
            INSERT INTO products (user_id, name, category, cost_price, sales_price)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """
        params = (user_id, name, category, cost_price, sales_price)
        result = execute_insert(query, params)
        
        if result:
            product_id = result[0]['id']
            logger.info(f"✅ Product created: ID {product_id}, Name: {name}")
            
            return jsonify({
                'success': True,
                'message': 'Product created successfully',
                'product_id': product_id
            }), 201
        else:
            raise Exception("Failed to create product")
        
    except Exception as e:
        logger.error(f"❌ Error creating product: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Server error', 'error': str(e)}), 500

@products_bp.route('/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    """
    Update existing product
    Parameters: product_id in URL
    Expected JSON: name, category, cost_price, sales_price
    Returns: JSON with success status
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        # Check if product belongs to user
        check_query = "SELECT id FROM products WHERE id = %s AND user_id = %s"
        existing = execute_query(check_query, (product_id, user_id))
        
        if not existing:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields with None checks
        name = data.get('name', '') if data.get('name') else ''
        name = name.strip() if name else ''
        
        if not name:
            return jsonify({'success': False, 'message': 'Product name is required'}), 400
        
        # Optional fields
        category = data.get('category')
        category = category.strip() if category else None
        
        # Price fields with validation
        try:
            cost_price = float(data.get('cost_price', 0)) if data.get('cost_price') is not None else 0.00
            sales_price = float(data.get('sales_price', 0)) if data.get('sales_price') is not None else 0.00
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Invalid price format'}), 400
        
        # Validate prices are not negative
        if cost_price < 0 or sales_price < 0:
            return jsonify({'success': False, 'message': 'Prices cannot be negative'}), 400
        
        # Update product
        query = """
            UPDATE products
            SET name = %s, category = %s, cost_price = %s, sales_price = %s
            WHERE id = %s AND user_id = %s
        """
        params = (name, category, cost_price, sales_price, product_id, user_id)
        execute_update(query, params)
        
        logger.info(f"✅ Product updated: ID {product_id}, Name: {name}")
        
        return jsonify({
            'success': True,
            'message': 'Product updated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error updating product: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@products_bp.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    """
    Delete product
    Parameters: product_id in URL
    Returns: JSON with success status
    """
    try:
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        
        # Check if product belongs to user and get name for logging
        check_query = "SELECT name FROM products WHERE id = %s AND user_id = %s"
        existing = execute_query(check_query, (product_id, user_id))
        
        if not existing:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        
        product_name = existing[0]['name']
        
        # Delete product
        query = "DELETE FROM products WHERE id = %s AND user_id = %s"
        execute_update(query, (product_id, user_id))
        
        logger.info(f"🗑️ Product deleted: ID {product_id}, Name: {product_name}")
        
        return jsonify({
            'success': True,
            'message': 'Product deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error deleting product: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500