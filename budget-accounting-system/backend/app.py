from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from config import Config
from utils.auth import token_required
from utils.db import get_connection, release_connection, execute_query, execute_update, execute_insert
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
        
        results = execute_query(query, tuple(params))
        
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
        
        results = execute_query(query, tuple(params))
        
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
        
        results = execute_query(query, tuple(params))
        
        logger.info(f'✅ Analytical Report generated: {len(results)} rows')
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f'❌ Error generating analytical report: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

logger.info("✅ Reports API routes registered")

# ============================================
# PURCHASE ORDERS API
# ============================================

@app.route('/api/purchase-orders', methods=['GET'])
@token_required
def get_purchase_orders(current_user):
    """Get all purchase orders for current user"""
    try:
        user_id = current_user['id']
        
        query = """
        SELECT 
            po.id, po.reference, po.date, po.vendor_id, po.state, po.total,
            c.name as vendor_name
        FROM purchase_orders po
        LEFT JOIN contacts c ON po.vendor_id = c.id
        WHERE po.user_id = %s
        ORDER BY po.date DESC, po.id DESC
        """
        
        results = execute_query(query, (user_id,))
        
        logger.info(f'✅ Retrieved {len(results)} purchase orders')
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f'❌ Error fetching purchase orders: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchase-orders', methods=['POST'])
@token_required
def create_purchase_order(current_user):
    """Create new purchase order"""
    connection = None
    cursor = None
    try:
        user_id = current_user['id']
        data = request.get_json()
        
        connection = get_connection()
        cursor = connection.cursor()
        
        # Insert purchase order
        query = """
        INSERT INTO purchase_orders (user_id, reference, date, vendor_id, state, total)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """
        
        cursor.execute(query, (
            user_id,
            data['reference'],
            data['date'],
            data['vendor_id'],
            data.get('state', 'draft'),
            data.get('total', 0)
        ))
        
        po_id = cursor.fetchone()[0]
        
        # Insert purchase order lines
        if 'lines' in data:
            for line in data['lines']:
                line_query = """
                INSERT INTO purchase_order_lines 
                (purchase_order_id, product_id, description, quantity, price, subtotal, analytical_account_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(line_query, (
                    po_id,
                    line.get('product_id'),
                    line.get('description'),
                    line.get('quantity', 1),
                    line.get('price', 0),
                    line.get('subtotal', 0),
                    line.get('analytical_account_id')
                ))
        
        connection.commit()
        
        logger.info(f'✅ Purchase order created: {po_id}')
        return jsonify({'id': po_id, 'message': 'Purchase order created'}), 201
        
    except Exception as e:
        if connection:
            connection.rollback()
        logger.error(f'❌ Error creating purchase order: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            release_connection(connection)

@app.route('/api/purchase-orders/<int:po_id>', methods=['GET'])
@token_required
def get_purchase_order(current_user, po_id):
    """Get single purchase order with lines"""
    try:
        user_id = current_user['id']
        
        # Get PO header
        query = """
        SELECT po.*, c.name as vendor_name
        FROM purchase_orders po
        LEFT JOIN contacts c ON po.vendor_id = c.id
        WHERE po.id = %s AND po.user_id = %s
        """
        
        results = execute_query(query, (po_id, user_id))
        
        if not results:
            return jsonify({'error': 'Purchase order not found'}), 404
            
        po = results[0]
        
        # Get PO lines
        lines_query = """
        SELECT pol.*, p.name as product_name, aa.name as analytical_name
        FROM purchase_order_lines pol
        LEFT JOIN products p ON pol.product_id = p.id
        LEFT JOIN analytical_accounts aa ON pol.analytical_account_id = aa.id
        WHERE pol.purchase_order_id = %s
        """
        
        po['lines'] = execute_query(lines_query, (po_id,))
        
        return jsonify(po), 200
        
    except Exception as e:
        logger.error(f'❌ Error fetching purchase order: {str(e)}')
        return jsonify({'error': str(e)}), 500
        
    except Exception as e:
        logger.error(f'❌ Error fetching purchase order: {str(e)}')
        return jsonify({'error': str(e)}), 500

logger.info("✅ Purchase Orders API routes registered")

# ============================================
# SALES ORDERS API
# ============================================

@app.route('/api/sales-orders', methods=['GET'])
@token_required
def get_sales_orders(current_user):
    """Get all sales orders for current user"""
    try:
        user_id = current_user['id']
        
        query = """
        SELECT 
            so.id, so.reference, so.date, so.customer_id, so.state, so.total,
            c.name as customer_name
        FROM sales_orders so
        LEFT JOIN contacts c ON so.customer_id = c.id
        WHERE so.user_id = %s
        ORDER BY so.date DESC, so.id DESC
        """
        
        results = execute_query(query, (user_id,))
        
        logger.info(f'✅ Retrieved {len(results)} sales orders')
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f'❌ Error fetching sales orders: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/sales-orders', methods=['POST'])
@token_required
def create_sales_order(current_user):
    """Create new sales order"""
    connection = None
    cursor = None
    try:
        user_id = current_user['id']
        data = request.get_json()
        
        connection = get_connection()
        cursor = connection.cursor()
        
        # Insert sales order
        query = """
        INSERT INTO sales_orders (user_id, reference, date, customer_id, state, total)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """
        
        cursor.execute(query, (
            user_id,
            data['reference'],
            data['date'],
            data['customer_id'],
            data.get('state', 'draft'),
            data.get('total', 0)
        ))
        
        so_id = cursor.fetchone()[0]
        
        # Insert sales order lines
        if 'lines' in data:
            for line in data['lines']:
                line_query = """
                INSERT INTO sales_order_lines 
                (sales_order_id, product_id, description, quantity, price, subtotal, analytical_account_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(line_query, (
                    so_id,
                    line.get('product_id'),
                    line.get('description'),
                    line.get('quantity', 1),
                    line.get('price', 0),
                    line.get('subtotal', 0),
                    line.get('analytical_account_id')
                ))
        
        connection.commit()
        
        logger.info(f'✅ Sales order created: {so_id}')
        return jsonify({'id': so_id, 'message': 'Sales order created'}), 201
        
    except Exception as e:
        if connection:
            connection.rollback()
        logger.error(f'❌ Error creating sales order: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            release_connection(connection)

@app.route('/api/sales-orders/<int:so_id>', methods=['GET'])
@token_required
def get_sales_order(current_user, so_id):
    """Get single sales order with lines"""
    try:
        user_id = current_user['id']
        
        # Get SO header
        query = """
        SELECT so.*, c.name as customer_name
        FROM sales_orders so
        LEFT JOIN contacts c ON so.customer_id = c.id
        WHERE so.id = %s AND so.user_id = %s
        """
        
        results = execute_query(query, (so_id, user_id))
        
        if not results:
            return jsonify({'error': 'Sales order not found'}), 404
            
        so = results[0]
        
        # Get SO lines
        lines_query = """
        SELECT sol.*, p.name as product_name, aa.name as analytical_name
        FROM sales_order_lines sol
        LEFT JOIN products p ON sol.product_id = p.id
        LEFT JOIN analytical_accounts aa ON sol.analytical_account_id = aa.id
        WHERE sol.sales_order_id = %s
        """
        
        so['lines'] = execute_query(lines_query, (so_id,))
        
        return jsonify(so), 200
        
    except Exception as e:
        logger.error(f'❌ Error fetching sales order: {str(e)}')
        return jsonify({'error': str(e)}), 500

logger.info("✅ Sales Orders API routes registered")

# ============================================
# CUSTOMER INVOICES API
# ============================================

@app.route('/api/customer-invoices', methods=['GET'])
@token_required
def get_customer_invoices(current_user):
    """Get all customer invoices for current user"""
    try:
        user_id = current_user['id']
        
        query = """
        SELECT 
            ci.id, ci.reference, ci.date, ci.customer_id, ci.state, ci.total, ci.payment_status,
            ci.paid_via_cash, ci.paid_via_bank, ci.paid_via_online, ci.amount_due,
            c.name as customer_name
        FROM customer_invoices ci
        LEFT JOIN contacts c ON ci.customer_id = c.id
        WHERE ci.user_id = %s
        ORDER BY ci.date DESC, ci.id DESC
        """
        
        results = execute_query(query, (user_id,))
        
        logger.info(f'✅ Retrieved {len(results)} customer invoices')
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f'❌ Error fetching customer invoices: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/customer-invoices', methods=['POST'])
@token_required
def create_customer_invoice(current_user):
    """Create new customer invoice with payment tracking"""
    connection = None
    cursor = None
    try:
        user_id = current_user['id']
        data = request.get_json()
        
        connection = get_connection()
        cursor = connection.cursor()
        
        # Calculate totals
        total = float(data.get('total', 0))
        paid_cash = float(data.get('paid_via_cash', 0))
        paid_bank = float(data.get('paid_via_bank', 0))
        paid_online = float(data.get('paid_via_online', 0))
        amount_due = total - (paid_cash + paid_bank + paid_online)
        
        # Determine payment status
        if amount_due <= 0:
            payment_status = 'paid'
        elif paid_cash + paid_bank + paid_online > 0:
            payment_status = 'partial'
        else:
            payment_status = 'not_paid'
        
        # Insert customer invoice
        query = """
        INSERT INTO customer_invoices 
        (user_id, reference, date, customer_id, state, total,
         paid_via_cash, paid_via_bank, paid_via_online, amount_due, payment_status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """
        
        cursor.execute(query, (
            user_id,
            data['reference'],
            data['date'],
            data['customer_id'],
            data.get('state', 'draft'),
            total,
            paid_cash,
            paid_bank,
            paid_online,
            amount_due,
            payment_status
        ))
        
        invoice_id = cursor.fetchone()[0]
        
        # Insert invoice lines
        if 'lines' in data:
            for line in data['lines']:
                line_query = """
                INSERT INTO customer_invoice_lines 
                (customer_invoice_id, product_id, description, quantity, price, subtotal, analytical_account_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(line_query, (
                    invoice_id,
                    line.get('product_id'),
                    line.get('description'),
                    line.get('quantity', 1),
                    line.get('price', 0),
                    line.get('subtotal', 0),
                    line.get('analytical_account_id')
                ))
        
        connection.commit()
        
        logger.info(f'✅ Customer invoice created: {invoice_id}')
        return jsonify({'id': invoice_id, 'message': 'Invoice created'}), 201
        
    except Exception as e:
        if connection:
            connection.rollback()
        logger.error(f'❌ Error creating customer invoice: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            release_connection(connection)

@app.route('/api/customer-invoices/<int:invoice_id>', methods=['GET'])
@token_required
def get_customer_invoice(current_user, invoice_id):
    """Get single customer invoice with lines"""
    try:
        user_id = current_user['id']
        
        # Get invoice header
        query = """
        SELECT ci.*, c.name as customer_name, c.email as customer_email
        FROM customer_invoices ci
        LEFT JOIN contacts c ON ci.customer_id = c.id
        WHERE ci.id = %s AND ci.user_id = %s
        """
        
        results = execute_query(query, (invoice_id, user_id))
        
        if not results:
            return jsonify({'error': 'Invoice not found'}), 404
            
        invoice = results[0]
        
        # Get invoice lines
        lines_query = """
        SELECT cil.*, p.name as product_name, aa.name as analytical_name
        FROM customer_invoice_lines cil
        LEFT JOIN products p ON cil.product_id = p.id
        LEFT JOIN analytical_accounts aa ON cil.analytical_account_id = aa.id
        WHERE cil.customer_invoice_id = %s
        """
        
        invoice['lines'] = execute_query(lines_query, (invoice_id,))
        
        return jsonify(invoice), 200
        
    except Exception as e:
        logger.error(f'❌ Error fetching customer invoice: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/customer-invoices/<int:invoice_id>/payment', methods=['POST'])
@token_required
def record_invoice_payment(current_user, invoice_id):
    """Record payment for invoice"""
    connection = None
    cursor = None
    try:
        user_id = current_user['id']
        data = request.get_json()
        
        connection = get_connection()
        cursor = connection.cursor()
        
        # Get current invoice
        cursor.execute("""
            SELECT total, paid_via_cash, paid_via_bank, paid_via_online 
            FROM customer_invoices 
            WHERE id = %s AND user_id = %s
        """, (invoice_id, user_id))
        
        invoice = cursor.fetchone()
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        
        total, paid_cash, paid_bank, paid_online = invoice
        
        # Add new payment
        payment_type = data.get('payment_type', 'online')
        amount = float(data.get('amount', 0))
        
        if payment_type == 'cash':
            paid_cash += amount
        elif payment_type == 'bank':
            paid_bank += amount
        else:
            paid_online += amount
        
        # Update invoice (trigger will handle payment status)
        update_query = """
        UPDATE customer_invoices 
        SET paid_via_cash = %s, paid_via_bank = %s, paid_via_online = %s
        WHERE id = %s AND user_id = %s
        """
        
        cursor.execute(update_query, (paid_cash, paid_bank, paid_online, invoice_id, user_id))
        
        connection.commit()
        
        logger.info(f'✅ Payment recorded for invoice: {invoice_id}')
        return jsonify({'message': 'Payment recorded successfully'}), 200
        
    except Exception as e:
        if connection:
            connection.rollback()
        logger.error(f'❌ Error recording payment: {str(e)}')
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            release_connection(connection)

logger.info("✅ Customer Invoices API routes registered")

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