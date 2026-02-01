const API_URL = 'http://127.0.0.1:5000';
let currentInvoiceId = null;
let currentPaymentData = null; // Store current payment data

function getPortalToken() {
    return localStorage.getItem('portal_token');
}

function getPortalContact() {
    return JSON.parse(localStorage.getItem('portal_contact'));
}

function portalLogout() {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_contact');
    window.location.href = 'portal-login.html';
}

function checkPortalAuth() {
    if (!getPortalToken()) {
        window.location.href = 'portal-login.html';
        return false;
    }
    return true;
}

function formatNumber(num) {
    return parseFloat(num || 0).toFixed(2);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
}

async function loadInvoices() {
    try {
        const response = await fetch(API_URL + '/api/portal/invoices', {
            headers: { 'Authorization': 'Bearer ' + getPortalToken() }
        });

        if (!response.ok) throw new Error('Failed to fetch');

        const invoices = await response.json();
        displayInvoices(invoices);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('invoicesTable').innerHTML = `
            <tr><td colspan="7" class="text-center text-danger">Error loading invoices</td></tr>
        `;
    }
}

function displayInvoices(invoices) {
    const tbody = document.getElementById('invoicesTable');

    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No invoices found</td></tr>';
        return;
    }

    tbody.innerHTML = invoices.map(inv => {
        const dueDate = new Date(inv.date);
        dueDate.setDate(dueDate.getDate() + 30); // 30 days due
        
        return `
        <tr>
            <td><strong>${inv.reference}</strong></td>
            <td>${formatDate(inv.date)}</td>
            <td>${formatDate(dueDate)}</td>
            <td>₹${formatNumber(inv.total)}</td>
            <td>₹${formatNumber(inv.amount_due)}</td>
            <td>
                <span class="badge bg-${
                    inv.payment_status === 'paid' ? 'success' :
                    inv.payment_status === 'partial' ? 'warning' : 'danger'
                }">
                    ${inv.payment_status === 'paid' ? 'Paid' :
                       inv.payment_status === 'partial' ? 'Partial' : 'Pay Now'}
                </span>
            </td>
            <td>
                ${inv.payment_status !== 'paid' ? `
                    <button class="btn btn-sm btn-primary" onclick="openPayment(${inv.id}, '${inv.reference}', ${inv.amount_due})">
                        <i class="fas fa-qrcode"></i> Pay
                    </button>
                ` : `
                    <span class="text-success"><i class="fas fa-check-circle"></i> Paid</span>
                `}
            </td>
        </tr>
    `}).join('');
}

async function openPayment(invoiceId, reference, amount) {
    currentInvoiceId = invoiceId;
    
    document.getElementById('payInvoiceRef').textContent = reference;
    document.getElementById('payAmount').textContent = formatNumber(amount);
    
    try {
        const response = await fetch(API_URL + `/api/portal/invoices/${invoiceId}/qr`, {
            headers: { 'Authorization': 'Bearer ' + getPortalToken() }
        });

        if (!response.ok) throw new Error('Failed to generate QR');

        const data = await response.json();
        
        // Store payment data for PhonePe
        currentPaymentData = {
            amount: data.amount,
            reference: reference,
            upiId: data.upi_id,
            upiString: data.qr_data
        };
        
        document.getElementById('upiId').textContent = data.upi_id;
        
        // Generate QR Code (centered)
        const qrContainer = document.getElementById('qrCodeContainer');
        qrContainer.innerHTML = ''; // Clear previous QR
        
        new QRCode(qrContainer, {
            text: data.qr_data,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
        modal.show();

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate payment QR code');
    }
}

async function confirmPayment() {
    if (!currentInvoiceId) return;
    
    if (!confirm('Have you completed the payment?')) {
        return;
    }
    
    try {
        const response = await fetch(API_URL + `/api/customer-invoices/${currentInvoiceId}/payment`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + getPortalToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                payment_type: 'online',
                amount: parseFloat(document.getElementById('payAmount').textContent)
            })
        });

        if (response.ok) {
            alert('Payment recorded successfully!');
            bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
            loadInvoices(); // Reload
        } else {
            alert('Failed to record payment. Please contact support.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Payment confirmation failed');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (!checkPortalAuth()) return;
    
    const contact = getPortalContact();
    document.getElementById('portalUserName').textContent = contact.name;
    
    loadInvoices();
});

// PhonePe Integration (Test Mode)
function openPhonePe() {
    if (!currentPaymentData) {
        alert('Payment data not loaded');
        return;
    }
    
    // PhonePe Test Mode URL
    // In production, use PhonePe SDK or API
    const phonePeTestUrl = createPhonePeTestUrl(
        currentPaymentData.amount,
        currentPaymentData.reference,
        currentPaymentData.upiId
    );
    
    // For demo: Show alert with payment simulator
    showPhonePeSimulator(currentPaymentData);
}

function createPhonePeTestUrl(amount, reference, upiId) {
    // PhonePe URL scheme (works on mobile)
    // Format: phonepe://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&tn=NOTE
    const merchantName = encodeURIComponent('Shiv Furniture');
    const note = encodeURIComponent(`Invoice ${reference}`);
    
    return `phonepe://pay?pa=${upiId}&pn=${merchantName}&am=${amount}&tn=${note}&cu=INR`;
}

function showPhonePeSimulator(paymentData) {
    // Create PhonePe payment simulator
    const simulatorHtml = `
        <div class="phonepe-simulator">
            <div class="phonepe-header bg-purple text-white p-3">
                <h5><i class="fas fa-mobile-alt"></i> PhonePe Payment (Test Mode)</h5>
            </div>
            <div class="p-4">
                <div class="text-center mb-4">
                    <div class="bg-light p-3 rounded">
                        <h6 class="text-muted mb-2">Pay to</h6>
                        <h4>Shiv Furniture</h4>
                        <p class="text-muted mb-0">${paymentData.upiId}</p>
                    </div>
                </div>
                
                <div class="alert alert-warning">
                    <strong>Amount: ₹${formatNumber(paymentData.amount)}</strong>
                    <br>
                    <small>Invoice: ${paymentData.reference}</small>
                </div>
                
                <div class="d-grid gap-2">
                    <button class="btn btn-purple btn-lg" onclick="simulatePhonePeSuccess()">
                        <i class="fas fa-check-circle"></i> Pay ₹${formatNumber(paymentData.amount)}
                    </button>
                    <button class="btn btn-outline-secondary" onclick="closePhonePeSimulator()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
                
                <p class="text-center text-muted small mt-3">
                    <i class="fas fa-info-circle"></i> This is a test payment simulator
                </p>
            </div>
        </div>
    `;
    
    // Show simulator in modal
    const phonePeTab = document.getElementById('phonePeTab');
    phonePeTab.innerHTML = simulatorHtml;
}

function simulatePhonePeSuccess() {
    // Simulate successful payment
    const processingHtml = `
        <div class="text-center py-5">
            <div class="spinner-border text-purple mb-3" role="status">
                <span class="visually-hidden">Processing...</span>
            </div>
            <h5>Processing payment...</h5>
        </div>
    `;
    
    document.getElementById('phonePeTab').innerHTML = processingHtml;
    
    // Simulate payment success after 2 seconds
    setTimeout(() => {
        const successHtml = `
            <div class="text-center py-5">
                <div class="text-success mb-3">
                    <i class="fas fa-check-circle fa-5x"></i>
                </div>
                <h4 class="text-success">Payment Successful!</h4>
                <p class="text-muted">Transaction ID: TXN${Date.now().toString().slice(-10)}</p>
                <p>Amount: ₹${document.getElementById('payAmount').textContent}</p>
                <button class="btn btn-primary mt-3" onclick="confirmPayment()">
                    Continue
                </button>
            </div>
        `;
        document.getElementById('phonePeTab').innerHTML = successHtml;
    }, 2000);
}

function closePhonePeSimulator() {
    // Reset PhonePe tab
    document.getElementById('phonePeTab').innerHTML = `
        <p class="text-muted mb-3">Pay using PhonePe app directly</p>
        <button class="btn btn-lg btn-purple mb-3" onclick="openPhonePe()">
            <i class="fas fa-mobile-alt"></i> Open PhonePe
        </button>
        <p class="text-muted small">
            <i class="fas fa-info-circle"></i> Test Mode: Will open PhonePe payment simulator
        </p>
    `;
}

// Add window functions for global access
window.openPhonePe = openPhonePe;
window.simulatePhonePeSuccess = simulatePhonePeSuccess;
window.closePhonePeSimulator = closePhonePeSimulator;