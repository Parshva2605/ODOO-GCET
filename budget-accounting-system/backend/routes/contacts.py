# ===== CONTACTS ROUTES =====
from flask import Blueprint, request, jsonify
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import execute_query, execute_insert, execute_update
from utils.auth import token_required
import logging

# ===== BLUEPRINT SETUP =====
contacts_bp = Blueprint('contacts', __name__)
logger = logging.getLogger(__name__)

# ===== HELPER FUNCTIONS =====
# (No helper functions needed - using @token_required decorator)

# ===== CONTACTS ENDPOINTS =====

@contacts_bp.route('/contacts', methods=['GET'])
@token_required
def get_contacts(current_user):
    """
    Get all contacts for logged-in user
    Returns: JSON with contacts array
    """
    try:
        user_id = current_user['id']
        
        query = """
            SELECT id, contact_type as type, name, email, phone, company_name, gstin, created_at
            FROM contacts
            WHERE user_id = %s
            ORDER BY created_at DESC
        """
        contacts = execute_query(query, (user_id,))
        
        logger.info(f"📋 Retrieved {len(contacts)} contacts for user {user_id}")
        
        return jsonify({
            'success': True,
            'contacts': contacts
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting contacts: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@contacts_bp.route('/contacts', methods=['POST'])
@token_required
def create_contact(current_user):
    """
    Create new contact
    Expected JSON: contact_type, name, email, phone, company_name, gstin
    Returns: JSON with success status and contact_id
    """
    try:
        user_id = current_user['id']
        
        data = request.get_json()
        
        logger.info(f"📝 Contact data received: {data}")
        
        # Validate required fields with None checks
        contact_type = data.get('contact_type', '') if data.get('contact_type') else ''
        contact_type = contact_type.strip() if contact_type else ''
        
        name = data.get('name', '') if data.get('name') else ''
        name = name.strip() if name else ''
        
        if not contact_type or contact_type not in ['customer', 'vendor']:
            return jsonify({'success': False, 'message': 'Valid contact type required (customer or vendor)'}), 400
        
        if not name:
            return jsonify({'success': False, 'message': 'Name is required'}), 400
        
        # Optional fields - handle None values
        email = data.get('email')
        email = email.strip() if email else None
        
        phone = data.get('phone')
        phone = phone.strip() if phone else None
        
        company_name = data.get('company_name')
        company_name = company_name.strip() if company_name else None
        
        gstin = data.get('gstin')
        gstin = gstin.strip() if gstin else None
        
        logger.info(f"✅ Validated - Type: {contact_type}, Name: {name}")
        
        # Insert contact
        query = """
            INSERT INTO contacts (user_id, contact_type, name, email, phone, company_name, gstin)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        params = (user_id, contact_type, name, email, phone, company_name, gstin)
        result = execute_insert(query, params)
        
        if result:
            contact_id = result[0]['id']
            logger.info(f"✅ Contact created: ID {contact_id}, Name: {name}, Type: {contact_type}")
            
            return jsonify({
                'success': True,
                'message': 'Contact created successfully',
                'contact_id': contact_id
            }), 201
        else:
            raise Exception("Failed to create contact")
        
    except Exception as e:
        logger.error(f"❌ Error creating contact: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': 'Server error', 'error': str(e)}), 500

@contacts_bp.route('/contacts/<int:contact_id>', methods=['PUT'])
@token_required
def update_contact(current_user, contact_id):
    """
    Update existing contact
    Parameters: contact_id in URL
    Expected JSON: contact_type, name, email, phone, company_name, gstin
    Returns: JSON with success status
    """
    try:
        user_id = current_user['id']
        
        # Check if contact belongs to user
        check_query = "SELECT id FROM contacts WHERE id = %s AND user_id = %s"
        existing = execute_query(check_query, (contact_id, user_id))
        
        if not existing:
            return jsonify({'success': False, 'message': 'Contact not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields with None checks
        contact_type = data.get('contact_type', '') if data.get('contact_type') else ''
        contact_type = contact_type.strip() if contact_type else ''
        
        name = data.get('name', '') if data.get('name') else ''
        name = name.strip() if name else ''
        
        if not contact_type or contact_type not in ['customer', 'vendor']:
            return jsonify({'success': False, 'message': 'Valid contact type required'}), 400
        
        if not name:
            return jsonify({'success': False, 'message': 'Name is required'}), 400
        
        # Optional fields
        email = data.get('email')
        email = email.strip() if email else None
        
        phone = data.get('phone')
        phone = phone.strip() if phone else None
        
        company_name = data.get('company_name')
        company_name = company_name.strip() if company_name else None
        
        gstin = data.get('gstin')
        gstin = gstin.strip() if gstin else None
        
        # Update contact
        query = """
            UPDATE contacts
            SET contact_type = %s, name = %s, email = %s, phone = %s,
                company_name = %s, gstin = %s
            WHERE id = %s AND user_id = %s
        """
        params = (contact_type, name, email, phone, company_name, gstin, contact_id, user_id)
        execute_update(query, params)
        
        logger.info(f"✅ Contact updated: ID {contact_id}, Name: {name}")
        
        return jsonify({
            'success': True,
            'message': 'Contact updated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error updating contact: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500

@contacts_bp.route('/contacts/<int:contact_id>', methods=['DELETE'])
@token_required
def delete_contact(current_user, contact_id):
    """
    Delete contact
    Parameters: contact_id in URL
    Returns: JSON with success status
    """
    try:
        user_id = current_user['id']
        
        # Check if contact belongs to user and get name for logging
        check_query = "SELECT name FROM contacts WHERE id = %s AND user_id = %s"
        existing = execute_query(check_query, (contact_id, user_id))
        
        if not existing:
            return jsonify({'success': False, 'message': 'Contact not found'}), 404
        
        contact_name = existing[0]['name']
        
        # Delete contact
        query = "DELETE FROM contacts WHERE id = %s AND user_id = %s"
        execute_update(query, (contact_id, user_id))
        
        logger.info(f"🗑️ Contact deleted: ID {contact_id}, Name: {contact_name}")
        
        return jsonify({
            'success': True,
            'message': 'Contact deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error deleting contact: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error'}), 500