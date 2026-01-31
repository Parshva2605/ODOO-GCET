from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from config import Config
from utils.auth import token_required
from utils.db import get_connection
import logging

# ===== SETUP LOGGING =====
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s:%(name)s:%(message)s'
)
logger = logging.getLogger(__name__)

# ===== FLASK APP INITIALIZATION =====
app = Flask(__name__)
app.config.from_object(Config)
logger.info("🚀 Flask app initialized")

# ===== CORS CONFIGURATION =====
CORS(app, resources={r"/api/*": {"origins": "*"}})
logger.info("✅ CORS enabled")

# ===== REGISTER BLUEPRINTS =====
from routes.auth import auth_bp
app.register_blueprint(auth_bp, url_prefix='/api/auth')
logger.info("✅ Auth routes registered")

from routes.stats import stats_bp
app.register_blueprint(stats_bp, url_prefix='/api')
logger.info("✅ Stats routes registered")

from routes.contacts import contacts_bp
app.register_blueprint(contacts_bp, url_prefix='/api')
logger.info("✅ Contacts routes registered")

from routes.products import products_bp
app.register_blueprint(products_bp, url_prefix='/api')
logger.info("✅ Products routes registered")

from routes.analytical_accounts import analytical_accounts_bp
app.register_blueprint(analytical_accounts_bp, url_prefix='/api')
logger.info("✅ Analytical Accounts routes registered")

from routes.auto_analytical_models import auto_analytical_models_bp
app.register_blueprint(auto_analytical_models_bp, url_prefix='/api')
logger.info("✅ Auto Analytical Models routes registered")

from routes.budgets import budgets_bp
app.register_blueprint(budgets_bp, url_prefix='/api')
logger.info("✅ Budgets routes registered")

# ===== FRONTEND SERVING ROUTES =====

@app.route('/')
def serve_frontend():
    """Serve the login page as the default frontend page"""
    return send_from_directory('../frontend', 'login.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve all frontend static files (HTML, CSS, JS, images)"""
    return send_from_directory('../frontend', path)

logger.info("✅ Frontend serving routes registered")

# ============================================
# SIMPLE REPORTS API
# ============================================

@app.route('/api/reports/general-ledger', methods=['POST'])
@token_required
def general_ledger_report(current_user):
    """Generate General Ledger Report"""
    try:
        user_id = current_user['id']
        data = request.get_json()
        
        account_id = data.get('account_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Build query
        query = """
        SELECT 
            je.id as entry_id,
            je.date,
            je.reference,
            ji.label,
            ji.debit,
            ji.credit,
            ca.code as account_code,
            ca.name as account_name
        FROM journal_entries je
        JOIN journal_items ji ON je.id = ji.entry_id
        JOIN chart_of_accounts ca ON ji.account_id = ca.id
        WHERE je.user_id = %s
        AND je.state = 'posted'
        """
        
        params = [user_id]
        
        if account_id:
            query += " AND ji.account_id = %s"
            params.append(account_id)
        
        if start_date:
            query += " AND je.date >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND je.date <= %s"
            params.append(end_date)
        
        query += " ORDER BY ca.code, je.date, je.id"
        
        cursor.execute(query, tuple(params))
        
        # Fetch results
        columns = [desc[0] for desc in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))
        
        cursor.close()
        conn.close()
        
        logger.info(f'✅ General Ledger generated: {len(results)} rows')
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f'❌ Error generating general ledger: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/trial-balance', methods=['POST'])
@token_required
def trial_balance_report(current_user):
    """Generate Trial Balance Report"""
    try:
        user_id = current_user['id']
        data = request.get_json()
        
        as_of_date = data.get('as_of_date')
        
        conn = get_connection()
        cursor = conn.cursor()
        
        query = """
        SELECT 
            ca.id,
            ca.code,
            ca.name,
            ca.type,
            COALESCE(SUM(ji.debit), 0) as total_debit,
            COALESCE(SUM(ji.credit), 0) as total_credit
        FROM chart_of_accounts ca
        LEFT JOIN journal_items ji ON ca.id = ji.account_id
        LEFT JOIN journal_entries je ON ji.entry_id = je.id
        WHERE ca.user_id = %s
        """
        
        params = [user_id]
        
        if as_of_date:
            query += " AND (je.date <= %s OR je.date IS NULL)"
            params.append(as_of_date)
        
        query += " AND (je.state = 'posted' OR je.state IS NULL)"
        query += " GROUP BY ca.id, ca.code, ca.name, ca.type"
        query += " ORDER BY ca.code"
        
        cursor.execute(query, tuple(params))
        
        columns = [desc[0] for desc in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))
        
        cursor.close()
        conn.close()
        
        logger.info(f'✅ Trial Balance generated: {len(results)} accounts')
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f'❌ Error generating trial balance: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/analytical', methods=['POST'])
@token_required
def analytical_report(current_user):
    """Generate Analytical Account Report"""
    try:
        user_id = current_user['id']
        data = request.get_json()
        
        analytical_id = data.get('analytical_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        conn = get_connection()
        cursor = conn.cursor()
        
        query = """
        SELECT 
            aa.id,
            aa.name as analytical_name,
            je.date,
            je.reference,
            ji.label,
            ji.debit,
            ji.credit
        FROM analytical_accounts aa
        LEFT JOIN journal_items ji ON aa.id = ji.analytical_account_id
        LEFT JOIN journal_entries je ON ji.entry_id = je.id
        WHERE aa.user_id = %s
        """
        
        params = [user_id]
        
        if analytical_id:
            query += " AND aa.id = %s"
            params.append(analytical_id)
        
        if start_date:
            query += " AND (je.date >= %s OR je.date IS NULL)"
            params.append(start_date)
        
        if end_date:
            query += " AND (je.date <= %s OR je.date IS NULL)"
            params.append(end_date)
        
        query += " AND (je.state = 'posted' OR je.state IS NULL)"
        query += " ORDER BY aa.name, je.date"
        
        cursor.execute(query, tuple(params))
        
        columns = [desc[0] for desc in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))
        
        cursor.close()
        conn.close()
        
        logger.info(f'✅ Analytical Report generated: {len(results)} rows')
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f'❌ Error generating analytical report: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

logger.info("✅ Reports API routes registered")

# ===== API ROUTES =====

@app.route('/api/')
def api_home():
    """
    API information route
    Returns: JSON with API details
    """
    return jsonify({
        'message': 'Budget Accounting System API',
        'version': '1.0',
        'status': 'running'
    })

@app.route('/api/health')
def health_check():
    """
    Health check route for monitoring
    Returns: JSON with system health status
    """
    return jsonify({
        'status': 'healthy',
        'database': 'connected'
    })

@app.route('/api/test-db')
def test_database():
    """
    Test database connection route
    Returns: JSON with connection test results
    """
    try:
        from utils.db import test_connection
        result = test_connection()
        return jsonify({
            'success': True,
            'message': 'Database connection successful',
            'result': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Database connection failed',
            'error': str(e)
        }), 500

# ===== ERROR HANDLERS =====

@app.errorhandler(404)
def not_found(error):
    """
    Handle 404 Not Found errors
    Returns: JSON error response
    """
    return jsonify({
        'success': False,
        'message': 'Resource not found',
        'error': 'The requested URL was not found on the server'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """
    Handle 500 Internal Server Error
    Returns: JSON error response
    """
    return jsonify({
        'success': False,
        'message': 'Internal server error',
        'error': str(error)
    }), 500

# ===== MAIN EXECUTION =====
if __name__ == '__main__':
    logger.info('Starting Budget Accounting System API...')
    logger.info(f'API running on http://127.0.0.1:5000')
    logger.info(f'Database: {Config.DB_NAME}')
    app.run(host='0.0.0.0', port=5000, debug=True)