from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
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

# ===== ROUTES =====

@app.route('/')
def home():
    """
    Home route - API information
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