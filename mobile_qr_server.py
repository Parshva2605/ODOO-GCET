from flask import Flask, request, jsonify, render_template_string
import uuid
import hashlib
import base64
import json
import requests
import qrcode
import io
from base64 import b64encode
import socket

app = Flask(__name__)

# PhonePe UAT Credentials
MERCHANT_ID = "PGTESTPAYUAT86"
SALT_KEY = "96434309-7796-489d-8924-ab56988a6076"
SALT_INDEX = 1
PAY_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay"

# Store pending payments
pending_payments = {}

def get_local_ip():
    """Get the local IP address"""
    try:
        # Connect to a remote server to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "192.168.1.100"  # fallback

# Get local IP automatically
LOCAL_IP = get_local_ip()
BASE_URL = f"http://{LOCAL_IP}:3000"

@app.route('/')
def home():
    """Admin page to create invoices"""
    return render_template_string('''
<!DOCTYPE html>
<html>
<head>
    <title>Shiv Furniture - QR Payment</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: Arial, sans-serif;
            padding: 15px;
            min-height: 100vh;
        }
        .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 { color: #914F1E; margin-bottom: 25px; text-align: center; }
        .server-info {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        .form-group { margin-bottom: 15px; }
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
        #qrSection { 
            margin-top: 25px; 
            text-align: center;
            display: none;
        }
        #qrSection img { 
            max-width: 250px; 
            border: 3px solid #914F1E;
            border-radius: 10px;
            margin: 15px 0;
        }
        .status { 
            margin-top: 15px; 
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
        }
        .status.pending { background: #fff3cd; color: #856404; }
        .status.success { background: #d4edda; color: #155724; }
        .status.failed { background: #f8d7da; color: #721c24; }
        .mobile-url {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🪑 Shiv Furniture</h1>
        
        <div class="server-info">
            <strong>📱 Server Running On:</strong><br>
            <div class="mobile-url">{{ base_url }}</div>
            <small>Make sure your phone is on the same WiFi network</small>
        </div>
        
        <div class="form-group">
            <label>Customer Name:</label>
            <input type="text" id="customerName" placeholder="Enter customer name" value="Ramesh Patel">
        </div>
        
        <div class="form-group">
            <label>Amount (₹):</label>
            <input type="number" id="amount" placeholder="Enter amount" value="749">
        </div>
        
        <button onclick="generateQR()">🔄 Generate QR Code</button>
        
        <div id="qrSection">
            <h3>📱 Scan with Phone</h3>
            <img id="qrImage" src="">
            <div><strong>Invoice: <span id="invoiceId"></span></strong></div>
            <div id="statusDiv" class="status pending">
                <span id="statusText">⏳ Waiting for payment...</span>
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
                    document.getElementById('qrSection').style.display = 'block';
                    document.getElementById('statusDiv').className = 'status pending';
                    document.getElementById('statusText').textContent = '⏳ Waiting for payment...';
                    
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
            }, 2000);
        }
    </script>
</body>
</html>
    ''', base_url=BASE_URL)

@app.route('/create-invoice', methods=['POST'])
def create_invoice():
    """Create invoice and generate QR code"""
    try:
        data = request.get_json()
        customer_name = data.get('customer_name')
        amount = float(data.get('amount'))
        
        invoice_id = "INV" + str(uuid.uuid4().hex)[:8].upper()
        
        pending_payments[invoice_id] = {
            'customer_name': customer_name,
            'amount': amount,
            'status': 'pending'
        }
        
        payment_url = f"{BASE_URL}/pay/{invoice_id}"
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=8, border=4)
        qr.add_data(payment_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        qr_base64 = b64encode(buf.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'invoice_id': invoice_id,
            'qr_code': f'data:image/png;base64,{qr_base64}',
            'payment_url': payment_url
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/pay/<invoice_id>')
def payment_page(invoice_id):
    """Mobile payment page"""
    
    if invoice_id not in pending_payments:
        return render_template_string('''
<!DOCTYPE html>
<html>
<head>
    <title>Invoice Not Found</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: Arial; 
            text-align: center; 
            padding: 50px; 
            background: #f8d7da; 
            color: #721c24;
        }
        h1 { font-size: 24px; }
    </style>
</head>
<body>
    <h1>❌ Invoice Not Found</h1>
    <p>This invoice does not exist or has expired.</p>
</body>
</html>
        '''), 404
    
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
        }
        .card { 
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 20px auto;
            text-align: center;
        }
        h1 { color: #914F1E; margin-bottom: 15px; font-size: 22px; }
        .invoice-info { 
            background: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .invoice-info p { margin: 8px 0; font-size: 16px; }
        .amount { 
            font-size: 28px; 
            color: #914F1E;
            font-weight: bold;
            margin: 15px 0;
        }
        button { 
            width: 100%; 
            padding: 16px; 
            margin: 8px 0;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        }
        .btn-phonepe { 
            background: #5f259f;
            color: white;
        }
        .btn-cash { 
            background: #28a745;
            color: white;
        }
        .btn-cancel { 
            background: #dc3545;
            color: white;
        }
        .loading {
            opacity: 0.7;
            pointer-events: none;
        }
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
        
        <button class="btn-cash" onclick="markAsPaid()">
            💵 Mark as Paid (Cash)
        </button>
        
        <button class="btn-cancel" onclick="cancelPayment()">
            ❌ Cancel Payment
        </button>
    </div>

    <script>
        const invoiceId = '{{ invoice_id }}';
        const amount = {{ amount }};

        async function payWithPhonePe() {
            const btn = event.target;
            btn.classList.add('loading');
            btn.textContent = 'Connecting to PhonePe...';

            try {
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
                    btn.classList.remove('loading');
                    btn.textContent = '📱 Pay with PhonePe';
                }
            } catch (error) {
                alert('Error: ' + error.message);
                btn.classList.remove('loading');
                btn.textContent = '📱 Pay with PhonePe';
            }
        }

        async function markAsPaid() {
            if (!confirm('Confirm payment received in cash?')) return;

            try {
                const response = await fetch('/confirm-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ invoice_id: invoiceId, method: 'cash' })
                });

                const data = await response.json();

                if (data.success) {
                    document.body.innerHTML = `
                        <div class="card" style="background: #d4edda; color: #155724;">
                            <h1>✅ Payment Confirmed!</h1>
                            <p>Cash payment received for Invoice ${invoiceId}</p>
                            <p>Amount: ₹${amount}</p>
                        </div>
                    `;
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
                    document.body.innerHTML = `
                        <div class="card" style="background: #f8d7da; color: #721c24;">
                            <h1>❌ Payment Cancelled</h1>
                            <p>Invoice ${invoiceId} has been cancelled</p>
                        </div>
                    `;
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
        amount = int(float(data.get('amount')) * 100)
        
        txn_id = "SHIV" + str(uuid.uuid4().hex)[:12].upper()
        user_id = "USER" + str(uuid.uuid4().hex)[:6].upper()

        payload = {
            "merchantId": MERCHANT_ID,
            "merchantTransactionId": txn_id,
            "merchantUserId": user_id,
            "amount": amount,
            "redirectUrl": f"{BASE_URL}/phonepe-success?invoice_id={invoice_id}&txn_id={txn_id}",
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
        print(f"Invoice: {invoice_id}")
        print(f"Amount: ₹{amount/100}")
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

@app.route('/phonepe-success')
def phonepe_success():
    """PhonePe success callback"""
    invoice_id = request.args.get('invoice_id')
    txn_id = request.args.get('txn_id')
    
    if invoice_id in pending_payments:
        pending_payments[invoice_id]['status'] = 'paid'
        pending_payments[invoice_id]['txn_id'] = txn_id
        pending_payments[invoice_id]['payment_method'] = 'phonepe'
    
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
            padding: 30px;
        }
        .success-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 400px;
            margin: 0 auto;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        h1 { color: #155724; font-size: 28px; margin-bottom: 20px; }
        .check { font-size: 60px; color: #28a745; margin-bottom: 20px; }
        p { margin: 10px 0; font-size: 16px; }
    </style>
</head>
<body>
    <div class="success-card">
        <div class="check">✅</div>
        <h1>Payment Successful!</h1>
        <p><strong>Invoice:</strong> {{ invoice_id }}</p>
        <p><strong>Transaction:</strong> {{ txn_id }}</p>
        <p><strong>Payment Method:</strong> PhonePe</p>
        <p style="margin-top: 20px; color: #666;">
            This window will close automatically in 5 seconds
        </p>
    </div>
    <script>
        setTimeout(() => {
            window.close();
            // If window.close() doesn't work, redirect to a thank you page
            window.location.href = '/';
        }, 5000);
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
    print("\n" + "="*60)
    print("🚀 MOBILE QR PAYMENT SYSTEM - READY!")
    print("="*60)
    print(f"\n📱 MOBILE ACCESS:")
    print(f"   Server IP: {LOCAL_IP}")
    print(f"   Full URL: {BASE_URL}")
    print(f"\n💻 COMPUTER ACCESS:")
    print(f"   Local: http://127.0.0.1:3000")
    print(f"   Network: {BASE_URL}")
    print(f"\n📋 INSTRUCTIONS:")
    print(f"   1. Open {BASE_URL} on computer")
    print(f"   2. Create invoice and generate QR")
    print(f"   3. Scan QR with phone (same WiFi)")
    print(f"   4. Complete payment on phone")
    print(f"   5. See status update on computer")
    print("\n" + "="*60 + "\n")
    
    # Use port 3000 to avoid conflicts
    app.run(host='0.0.0.0', port=3000, debug=True)