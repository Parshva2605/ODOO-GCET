from flask import Flask, request, jsonify, render_template_string, redirect
import uuid
import hashlib
import base64
import json
import requests
import qrcode
import io
from base64 import b64encode

app = Flask(__name__)

# PhonePe UAT Credentials
MERCHANT_ID = "PGTESTPAYUAT86"
SALT_KEY = "96434309-7796-489d-8924-ab56988a6076"
SALT_INDEX = 1
PAY_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay"

# Store pending payments in memory (use database in production)
pending_payments = {}

# Updated for mobile access - use your computer's IP
BASE_URL = "http://192.168.205.229:5000"  # Now accessible from phone on same WiFi

@app.route('/')
def home():
    """Admin page to create invoices"""
    return render_template_string('''
<!DOCTYPE html>
<html>
<head>
    <title>Shiv Furniture - Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: Arial, sans-serif;
            padding: 20px;
            min-height: 100vh;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 { color: #914F1E; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input { 
            width: 100%; 
            padding: 12px; 
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
        }
        button { 
            width: 100%; 
            padding: 15px; 
            background: #914F1E;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            cursor: pointer;
            font-weight: bold;
        }
        button:hover { background: #723e18; }
        #qrCode { 
            margin-top: 30px; 
            text-align: center;
            display: none;
        }
        #qrCode img { 
            max-width: 300px; 
            border: 5px solid #914F1E;
            border-radius: 10px;
        }
        .status { 
            margin-top: 20px; 
            padding: 15px;
            border-radius: 8px;
            display: none;
        }
        .status.pending { background: #fff3cd; color: #856404; display: block; }
        .status.success { background: #d4edda; color: #155724; display: block; }
        .status.failed { background: #f8d7da; color: #721c24; display: block; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🪑 Shiv Furniture - Create Invoice</h1>
        
        <div class="form-group">
            <label>Customer Name:</label>
            <input type="text" id="customerName" placeholder="Enter customer name" value="Ramesh Patel">
        </div>
        
        <div class="form-group">
            <label>Invoice Amount (₹):</label>
            <input type="number" id="amount" placeholder="Enter amount" value="749">
        </div>
        
        <button onclick="generateQR()">Generate Payment QR Code</button>
        
        <div id="qrCode">
            <h3>📱 Scan this QR on Mobile Phone</h3>
            <img id="qrImage" src="">
            <p><strong>Invoice ID: <span id="invoiceId"></span></strong></p>
            <div id="statusDiv" class="status">
                <strong>Status:</strong> <span id="statusText">Waiting for payment...</span>
            </div>
        </div>
    </div>

    <script>
        let currentInvoiceId = null;
        let checkInterval = null;

        async function generateQR() {
            const customerName = document.getElementById('customerName').value;
            const amount = document.getElementById('amount').value;

            if (!customerName || !amount || amount <= 0) {
                alert('Please fill all fields');
                return;
            }

            try {
                const response = await fetch('/create-invoice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        customer_name: customerName,
                        amount: parseFloat(amount)
                    })
                });

                const data = await response.json();

                if (data.success) {
                    currentInvoiceId = data.invoice_id;
                    document.getElementById('invoiceId').textContent = data.invoice_id;
                    document.getElementById('qrImage').src = data.qr_code;
                    document.getElementById('qrCode').style.display = 'block';
                    document.getElementById('statusDiv').className = 'status pending';
                    document.getElementById('statusText').textContent = 'Waiting for payment...';
                    
                    // Start checking payment status
                    startStatusCheck();
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                alert('Connection error: ' + error.message);
            }
        }

        function startStatusCheck() {
            if (checkInterval) clearInterval(checkInterval);
            
            checkInterval = setInterval(async () => {
                if (!currentInvoiceId) return;

                try {
                    const response = await fetch(`/check-status/${currentInvoiceId}`);
                    const data = await response.json();

                    if (data.status === 'paid') {
                        document.getElementById('statusDiv').className = 'status success';
                        document.getElementById('statusText').textContent = '✅ Payment Received!';
                        clearInterval(checkInterval);
                    } else if (data.status === 'cancelled') {
                        document.getElementById('statusDiv').className = 'status failed';
                        document.getElementById('statusText').textContent = '❌ Payment Cancelled';
                        clearInterval(checkInterval);
                    }
                } catch (error) {
                    console.error('Status check error:', error);
                }
            }, 2000); // Check every 2 seconds
        }
    </script>
</body>
</html>
    ''')

@app.route('/create-invoice', methods=['POST'])
def create_invoice():
    """Create invoice and generate QR code"""
    try:
        data = request.get_json()
        customer_name = data.get('customer_name')
        amount = float(data.get('amount'))
        
        # Generate unique invoice ID
        invoice_id = "INV" + str(uuid.uuid4().hex)[:8].upper()
        
        # Store pending payment
        pending_payments[invoice_id] = {
            'customer_name': customer_name,
            'amount': amount,
            'status': 'pending'
        }
        
        # Generate payment URL for mobile
        payment_url = f"{BASE_URL}/pay/{invoice_id}"
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(payment_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        qr_base64 = b64encode(buf.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'invoice_id': invoice_id,
            'qr_code': f'data:image/png;base64,{qr_base64}'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/pay/<invoice_id>')
def payment_page(invoice_id):
    """Mobile payment page (opened when QR is scanned)"""
    
    if invoice_id not in pending_payments:
        return "Invoice not found", 404
    
    invoice = pending_payments[invoice_id]
    
    return render_template_string('''
<!DOCTYPE html>
<html>
<head>
    <title>Payment - Shiv Furniture</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: #F7DCB9;
            font-family: Arial, sans-serif;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .card { 
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 100%;
            text-align: center;
        }
        h1 { color: #914F1E; margin-bottom: 10px; font-size: 24px; }
        .invoice-info { 
            background: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .invoice-info p { margin: 10px 0; font-size: 16px; }
        .amount { 
            font-size: 32px; 
            color: #914F1E;
            font-weight: bold;
            margin: 20px 0;
        }
        button { 
            width: 100%; 
            padding: 18px; 
            margin: 10px 0;
            border: none;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .btn-pay { 
            background: #28a745;
            color: white;
        }
        .btn-pay:hover { background: #218838; }
        .btn-cancel { 
            background: #dc3545;
            color: white;
        }
        .btn-cancel:hover { background: #c82333; }
        .btn-phonepe {
            background: #5f259f;
            color: white;
        }
        .btn-phonepe:hover { background: #4a1d7d; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🪑 Shiv Furniture</h1>
        <p>Payment Request</p>
        
        <div class="invoice-info">
            <p><strong>Invoice:</strong> {{ invoice_id }}</p>
            <p><strong>Customer:</strong> {{ customer_name }}</p>
            <div class="amount">₹{{ amount }}</div>
        </div>
        
        <h3>Choose Payment Method:</h3>
        
        <button class="btn-phonepe" onclick="payWithPhonePe()">
            📱 Pay with PhonePe
        </button>
        
        <button class="btn-pay" onclick="markAsPaid()">
            ✅ Mark as Paid (Cash/Other)
        </button>
        
        <button class="btn-cancel" onclick="cancelPayment()">
            ❌ Cancel
        </button>
    </div>

    <script>
        const invoiceId = '{{ invoice_id }}';
        const amount = {{ amount }};

        async function payWithPhonePe() {
            try {
                const btn = event.target;
                btn.disabled = true;
                btn.textContent = 'Connecting to PhonePe...';

                const response = await fetch('/phonepe-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ invoice_id: invoiceId, amount: amount })
                });

                const data = await response.json();

                if (data.success && data.payment_url) {
                    window.location.href = data.payment_url;
                } else {
                    alert('PhonePe payment failed: ' + (data.error || 'Unknown error'));
                    btn.disabled = false;
                    btn.textContent = '📱 Pay with PhonePe';
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        async function markAsPaid() {
            if (!confirm('Confirm payment received?')) return;

            try {
                const response = await fetch('/confirm-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ invoice_id: invoiceId, method: 'cash' })
                });

                const data = await response.json();

                if (data.success) {
                    alert('✅ Payment confirmed!');
                    window.location.reload();
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        async function cancelPayment() {
            if (!confirm('Cancel this payment?')) return;

            try {
                const response = await fetch('/cancel-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ invoice_id: invoiceId })
                });

                const data = await response.json();

                if (data.success) {
                    alert('❌ Payment cancelled');
                    window.close();
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
    </script>
</body>
</html>
    ''', invoice_id=invoice_id, customer_name=invoice['customer_name'], amount=invoice['amount'])

@app.route('/phonepe-payment', methods=['POST'])
def phonepe_payment():
    """Initiate PhonePe payment"""
    try:
        data = request.get_json()
        invoice_id = data.get('invoice_id')
        amount = int(float(data.get('amount')) * 100)  # Convert to paise
        
        txn_id = "SHIV" + str(uuid.uuid4().hex)[:12].upper()
        user_id = "USER" + str(uuid.uuid4().hex)[:6].upper()

        payload = {
            "merchantId": MERCHANT_ID,
            "merchantTransactionId": txn_id,
            "merchantUserId": user_id,
            "amount": amount,
            "redirectUrl": f"{BASE_URL}/phonepe-callback?invoice_id={invoice_id}&txn_id={txn_id}",
            "redirectMode": "REDIRECT",
            "paymentInstrument": {"type": "PAY_PAGE"}
        }

        base64_payload = base64.b64encode(json.dumps(payload).encode()).decode()
        main_string = base64_payload + "/pg/v1/pay" + SALT_KEY
        sha256_val = hashlib.sha256(main_string.encode()).hexdigest()
        x_verify = f"{sha256_val}###{SALT_INDEX}"

        headers = {
            "Content-Type": "application/json",
            "X-VERIFY": x_verify,
            "accept": "application/json"
        }
        
        response = requests.post(PAY_URL, json={"request": base64_payload}, headers=headers)
        res_data = response.json()

        print(f"\n--- PHONEPE REQUEST ---")
        print(f"Status: {response.status_code}")
        print(f"Response: {res_data}")
        print(f"-----------------------\n")

        if res_data.get('success'):
            pay_url = res_data['data']['instrumentResponse']['redirectInfo']['url']
            return jsonify({"success": True, "payment_url": pay_url})
        else:
            return jsonify({"success": False, "error": res_data.get('message', 'Failed')}), 400

    except Exception as e:
        print(f"PhonePe Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/phonepe-callback')
def phonepe_callback():
    """PhonePe redirect after payment"""
    invoice_id = request.args.get('invoice_id')
    txn_id = request.args.get('txn_id')
    
    # Mark as paid
    if invoice_id in pending_payments:
        pending_payments[invoice_id]['status'] = 'paid'
        pending_payments[invoice_id]['txn_id'] = txn_id
    
    return render_template_string('''
<!DOCTYPE html>
<html>
<head>
    <title>Payment Success</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            background: #d4edda;
            font-family: Arial;
            text-align: center;
            padding: 50px;
        }
        h1 { color: #155724; font-size: 36px; }
        .check { font-size: 72px; color: #28a745; }
    </style>
</head>
<body>
    <div class="check">✅</div>
    <h1>Payment Successful!</h1>
    <p>Invoice: {{ invoice_id }}</p>
    <p>Transaction: {{ txn_id }}</p>
    <script>
        setTimeout(() => window.close(), 3000);
    </script>
</body>
</html>
    ''', invoice_id=invoice_id, txn_id=txn_id)

@app.route('/confirm-payment', methods=['POST'])
def confirm_payment():
    """Mark payment as paid (cash/other)"""
    try:
        data = request.get_json()
        invoice_id = data.get('invoice_id')
        
        if invoice_id in pending_payments:
            pending_payments[invoice_id]['status'] = 'paid'
            pending_payments[invoice_id]['payment_method'] = data.get('method', 'cash')
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Invoice not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/cancel-payment', methods=['POST'])
def cancel_payment():
    """Cancel payment"""
    try:
        data = request.get_json()
        invoice_id = data.get('invoice_id')
        
        if invoice_id in pending_payments:
            pending_payments[invoice_id]['status'] = 'cancelled'
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Invoice not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/check-status/<invoice_id>')
def check_status(invoice_id):
    """Check payment status"""
    if invoice_id in pending_payments:
        return jsonify({'status': pending_payments[invoice_id]['status']})
    return jsonify({'status': 'not_found'}), 404

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 SHIV FURNITURE PAYMENT SYSTEM")
    print("="*50)
    print("\n📝 For LOCAL testing:")
    print("   Open: http://127.0.0.1:5000")
    print("\n📱 For MOBILE testing:")
    print("   1. Run: ngrok http 5000")
    print("   2. Update BASE_URL in code with ngrok URL")
    print("   3. Restart server")
    print("\n" + "="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)