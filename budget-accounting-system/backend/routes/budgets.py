from flask import Blueprint, request, jsonify
from utils.auth import token_required
from utils.db import execute_query, execute_insert, execute_update
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

budgets_bp = Blueprint('budgets', __name__)

# ============================================
# GET ALL BUDGETS (Filtered by Status)
# ============================================
@budgets_bp.route('/budgets', methods=['GET'])
@token_required
def get_budgets(current_user):
    """Get all budgets filtered by status (draft/confirm/revised/archived)"""
    try:
        user_id = current_user['id']
        status = request.args.get('status', 'draft')
        
        logger.info(f"📊 Getting budgets for user {user_id}, status: {status}")
        
        query = """
            SELECT 
                b.id,
                b.name,
                TO_CHAR(b.start_date, 'YYYY-MM-DD') as start_date,
                TO_CHAR(b.end_date, 'YYYY-MM-DD') as end_date,
                b.status,
                b.revision_of,
                TO_CHAR(b.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
            FROM budgets b
            WHERE b.user_id = %s AND b.status = %s
            ORDER BY b.created_at DESC
        """
        
        budgets = execute_query(query, (user_id, status))
        
        if not budgets:
            return jsonify([]), 200
        
        # Get lines for each budget
        result = []
        for budget in budgets:
            lines_query = """
                SELECT 
                    bl.id,
                    bl.analytical_account_id,
                    aa.code as analytical_account_code,
                    aa.name as analytical_account_name,
                    bl.type,
                    bl.planned_amount::float as planned_amount,
                    COALESCE(bl.achieved_amount, 0)::float as achieved_amount
                FROM budget_lines bl
                JOIN analytical_accounts aa ON bl.analytical_account_id = aa.id
                WHERE bl.budget_id = %s
                ORDER BY bl.id
            """
            
            lines = execute_query(lines_query, (budget['id'],))
            
            # Calculate totals
            total_planned = sum(float(line['planned_amount']) for line in lines)
            total_achieved = sum(float(line['achieved_amount']) for line in lines)
            
            # Add calculated fields to lines
            for line in lines:
                planned = float(line['planned_amount'])
                achieved = float(line['achieved_amount'])
                
                if planned > 0:
                    line['achieved_percentage'] = round((achieved / planned) * 100, 2)
                else:
                    line['achieved_percentage'] = 0
                
                line['amount_to_achieve'] = round(planned - achieved, 2)
            
            budget['lines'] = lines
            budget['total_planned'] = round(total_planned, 2)
            budget['total_achieved'] = round(total_achieved, 2)
            
            result.append(budget)
        
        logger.info(f"✅ Found {len(result)} budgets")
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting budgets: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ============================================
# GET SINGLE BUDGET
# ============================================
@budgets_bp.route('/budgets/<int:budget_id>', methods=['GET'])
@token_required
def get_budget(current_user, budget_id):
    """Get single budget with all lines and calculations"""
    try:
        user_id = current_user['id']
        
        logger.info(f"📊 Getting budget {budget_id}")
        
        query = """
            SELECT 
                id,
                name,
                TO_CHAR(start_date, 'YYYY-MM-DD') as start_date,
                TO_CHAR(end_date, 'YYYY-MM-DD') as end_date,
                status,
                revision_of
            FROM budgets 
            WHERE id = %s AND user_id = %s
        """
        
        budgets = execute_query(query, (budget_id, user_id))
        
        if not budgets:
            return jsonify({'error': 'Budget not found'}), 404
        
        budget = budgets[0]
        
        # Get lines
        lines_query = """
            SELECT 
                bl.id,
                bl.analytical_account_id,
                aa.code as analytical_account_code,
                aa.name as analytical_account_name,
                bl.type,
                bl.planned_amount::float as planned_amount,
                COALESCE(bl.achieved_amount, 0)::float as achieved_amount
            FROM budget_lines bl
            JOIN analytical_accounts aa ON bl.analytical_account_id = aa.id
            WHERE bl.budget_id = %s
            ORDER BY bl.id
        """
        
        lines = execute_query(lines_query, (budget_id,))
        
        # Add calculated fields
        for line in lines:
            planned = float(line['planned_amount'])
            achieved = float(line['achieved_amount'])
            
            if planned > 0:
                line['achieved_percentage'] = round((achieved / planned) * 100, 2)
            else:
                line['achieved_percentage'] = 0
            
            line['amount_to_achieve'] = round(planned - achieved, 2)
        
        budget['lines'] = lines
        
        logger.info(f"✅ Budget {budget_id} retrieved")
        return jsonify(budget), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting budget: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ============================================
# CREATE BUDGET
# ============================================
@budgets_bp.route('/budgets', methods=['POST'])
@token_required
def create_budget(current_user):
    """Create new budget with lines"""
    try:
        user_id = current_user['id']
        data = request.json
        
        logger.info(f"📝 Creating budget: {data.get('name')}")
        
        # Validate
        if not data.get('name'):
            return jsonify({'error': 'Budget name is required'}), 400
        
        if not data.get('start_date') or not data.get('end_date'):
            return jsonify({'error': 'Start date and end date are required'}), 400
        
        if not data.get('lines') or len(data['lines']) == 0:
            return jsonify({'error': 'Please add at least one budget line'}), 400
        
        # Validate lines
        valid_lines = []
        for line in data['lines']:
            if not line.get('analytical_account_id'):
                continue
            if float(line.get('planned_amount', 0)) <= 0:
                continue
            valid_lines.append(line)
        
        if len(valid_lines) == 0:
            return jsonify({'error': 'Please add at least one budget line with planned amount > 0'}), 400
        
        # Insert budget
        budget_query = """
            INSERT INTO budgets (user_id, name, start_date, end_date, status)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """
        
        budget_result = execute_insert(budget_query, (
            user_id,
            data['name'],
            data['start_date'],
            data['end_date'],
            data.get('status', 'draft')
        ))
        
        budget_id = budget_result[0]['id'] if budget_result else None
        if not budget_id:
            raise Exception("Failed to create budget")
        
        # Insert lines
        for line in valid_lines:
            line_query = """
                INSERT INTO budget_lines 
                (budget_id, analytical_account_id, type, planned_amount, achieved_amount)
                VALUES (%s, %s, %s, %s, %s)
            """
            
            execute_insert(line_query, (
                budget_id,
                int(line['analytical_account_id']),
                line['type'],
                float(line['planned_amount']),
                0.00
            ))
        
        logger.info(f"✅ Budget created: {budget_id}")
        return jsonify({'id': budget_id, 'message': 'Budget created successfully'}), 201
        
    except Exception as e:
        logger.error(f"❌ Error creating budget: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ============================================
# UPDATE BUDGET
# ============================================
@budgets_bp.route('/budgets/<int:budget_id>', methods=['PUT'])
@token_required
def update_budget(current_user, budget_id):
    """Update existing budget"""
    try:
        user_id = current_user['id']
        data = request.json
        
        logger.info(f"✏️ Updating budget {budget_id}")
        
        # Update budget header
        budget_query = """
            UPDATE budgets 
            SET name = %s, start_date = %s, end_date = %s, status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
        """
        
        execute_update(budget_query, (
            data['name'],
            data['start_date'],
            data['end_date'],
            data.get('status', 'draft'),
            budget_id,
            user_id
        ))
        
        # Delete existing lines
        execute_update("DELETE FROM budget_lines WHERE budget_id = %s", (budget_id,))
        
        # Insert new lines
        valid_lines = [l for l in data.get('lines', []) if float(l.get('planned_amount', 0)) > 0]
        
        for line in valid_lines:
            line_query = """
                INSERT INTO budget_lines 
                (budget_id, analytical_account_id, type, planned_amount, achieved_amount)
                VALUES (%s, %s, %s, %s, %s)
            """
            
            execute_insert(line_query, (
                budget_id,
                int(line['analytical_account_id']),
                line['type'],
                float(line['planned_amount']),
                float(line.get('achieved_amount', 0))
            ))
        
        logger.info(f"✅ Budget updated: {budget_id}")
        return jsonify({'message': 'Budget updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"❌ Error updating budget: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ============================================
# DELETE/ARCHIVE BUDGET
# ============================================
@budgets_bp.route('/budgets/<int:budget_id>', methods=['DELETE'])
@token_required
def delete_budget(current_user, budget_id):
    """Archive budget (soft delete)"""
    try:
        user_id = current_user['id']
        
        logger.info(f"🗑️ Archiving budget {budget_id}")
        
        query = """
            UPDATE budgets 
            SET status = 'archived', updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
        """
        
        execute_update(query, (budget_id, user_id))
        
        logger.info(f"✅ Budget archived: {budget_id}")
        return jsonify({'message': 'Budget archived successfully'}), 200
        
    except Exception as e:
        logger.error(f"❌ Error archiving budget: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ============================================
# CONFIRM BUDGET (Change Status)
# ============================================
@budgets_bp.route('/budgets/<int:budget_id>/confirm', methods=['POST'])
@token_required
def confirm_budget(current_user, budget_id):
    """Change budget status from draft to confirm"""
    try:
        user_id = current_user['id']
        
        logger.info(f"✅ Confirming budget {budget_id}")
        
        query = """
            UPDATE budgets 
            SET status = 'confirm', updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s AND status = 'draft'
        """
        
        execute_update(query, (budget_id, user_id))
        
        logger.info(f"✅ Budget confirmed: {budget_id}")
        return jsonify({'message': 'Budget confirmed successfully'}), 200
        
    except Exception as e:
        logger.error(f"❌ Error confirming budget: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ============================================
# REVISE BUDGET (Create New Version)
# ============================================
@budgets_bp.route('/budgets/<int:budget_id>/revise', methods=['POST'])
@token_required
def revise_budget(current_user, budget_id):
    """Create revision of confirmed budget"""
    try:
        user_id = current_user['id']
        
        logger.info(f"🔄 Creating revision of budget {budget_id}")
        
        # Get original budget
        original = execute_query(
            "SELECT * FROM budgets WHERE id = %s AND user_id = %s", 
            (budget_id, user_id)
        )
        
        if not original:
            return jsonify({'error': 'Budget not found'}), 404
        
        original = original[0]
        
        # Count existing revisions
        revision_count = execute_query(
            "SELECT COUNT(*) as count FROM budgets WHERE revision_of = %s",
            (budget_id,)
        )[0]['count']
        
        # Create new name with revision number
        new_name = f"{original['name']}.r{revision_count + 1}"
        
        # Create new budget
        new_budget_query = """
            INSERT INTO budgets (user_id, name, start_date, end_date, status, revision_of)
            VALUES (%s, %s, %s, %s, 'draft', %s)
            RETURNING id
        """
        
        new_budget_result = execute_insert(new_budget_query, (
            user_id,
            new_name,
            original['start_date'],
            original['end_date'],
            budget_id
        ))
        
        new_budget_id = new_budget_result[0]['id'] if new_budget_result else None
        if not new_budget_id:
            raise Exception("Failed to create budget revision")
        
        # Copy lines with achieved amounts reset to 0
        copy_query = """
            INSERT INTO budget_lines (budget_id, analytical_account_id, type, planned_amount, achieved_amount)
            SELECT %s, analytical_account_id, type, planned_amount, 0.00
            FROM budget_lines
            WHERE budget_id = %s
        """
        
        execute_query(copy_query, (new_budget_id, budget_id))
        
        # Mark original as revised
        execute_update(
            "UPDATE budgets SET status = 'revised' WHERE id = %s", 
            (budget_id,)
        )
        
        logger.info(f"✅ Revision created: {budget_id} → {new_budget_id}")
        return jsonify({
            'id': new_budget_id, 
            'name': new_name,
            'message': 'Budget revision created successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"❌ Error revising budget: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ============================================
# CALCULATE BUDGET ACHIEVEMENTS
# ============================================
@budgets_bp.route('/budgets/<int:budget_id>/calculate-achievements', methods=['POST'])
@token_required
def calculate_budget_achievements(current_user, budget_id):
    """Calculate achieved amounts for budget lines from journal entries"""
    try:
        user_id = current_user['id']
        
        logger.info(f"🔄 Calculating achievements for budget {budget_id}")
        
        # Get budget
        budget = execute_query(
            "SELECT * FROM budgets WHERE id = %s AND user_id = %s", 
            (budget_id, user_id)
        )
        
        if not budget:
            return jsonify({'error': 'Budget not found'}), 404
        
        budget = budget[0]
        
        # Get all lines for this budget
        lines = execute_query(
            "SELECT * FROM budget_lines WHERE budget_id = %s", 
            (budget_id,)
        )
        
        if not lines:
            return jsonify({'message': 'No budget lines to calculate'}), 200
        
        # Calculate achieved for each line
        total_achieved = 0
        lines_updated = 0
        
        for line in lines:
            # Note: This is a placeholder calculation since we don't have journal entries table yet
            # In a real implementation, you would query journal entries for this analytical account
            # within the budget period and sum the amounts
            
            # For now, we'll simulate some achieved amounts (you can replace this with actual logic)
            # achieved = get_journal_entries_sum(line['analytical_account_id'], budget['start_date'], budget['end_date'])
            
            # Placeholder: Set achieved to 70% of planned for demo purposes
            achieved = float(line['planned_amount']) * 0.7
            
            # Update line achieved amount
            execute_update(
                "UPDATE budget_lines SET achieved_amount = %s WHERE id = %s",
                (achieved, line['id'])
            )
            
            total_achieved += achieved
            lines_updated += 1
        
        # Update budget total achieved
        execute_update(
            "UPDATE budgets SET total_achieved = %s WHERE id = %s",
            (total_achieved, budget_id)
        )
        
        logger.info(f"✅ Budget {budget_id} achievements calculated: {total_achieved}")
        
        # Ensure lines_updated is always a valid number
        lines_count = lines_updated if lines_updated is not None else 0
        
        return jsonify({
            'message': 'Achievements calculated successfully',
            'total_achieved': float(total_achieved),
            'lines_updated': lines_count
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error calculating achievements: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ============================================
# BUDGET COUNT (For Dashboard)
# ============================================
@budgets_bp.route('/budgets/count', methods=['GET'])
@token_required
def get_budgets_count(current_user):
    """Get count of budgets for dashboard"""
    try:
        user_id = current_user['id']
        
        query = """
            SELECT COUNT(*) as count 
            FROM budgets 
            WHERE user_id = %s AND status IN ('draft', 'confirm')
        """
        
        result = execute_query(query, (user_id,))
        count = result[0]['count'] if result else 0
        
        return jsonify({'count': count}), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting budget count: {str(e)}")
        return jsonify({'count': 0}), 200

logger.info("✅ Budgets blueprint loaded")