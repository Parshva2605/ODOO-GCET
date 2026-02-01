const API_URL = 'http://127.0.0.1:5000';
let currentInvoiceId = null;
let currentPaymentData = null;

function getPortalToken() {
    return localStorage.getItem('portal_token');
}

function getPortalContact() {
    return JSON.parse(localStorage.getItem('portal_contact') || '{}');
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
        document.getElementById('invoicesTable').innerHTML = 
            '<tr><td colspan="7" class="text-center text-danger">Error loading invoices</td></tr>';
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
        dueDate.setDate(dueDate.getDate() + 30);
        
        const statusBadge = inv.payment_status === 'paid' ? 'success' :
                           inv.payment_status === 'partial' ? 'warning' : 'danger';
        const statusText = inv.payment_status === 'paid' ? 'Paid' :
                          inv.payment_status === 'partial' ? 'Partial' : 'Pay Now';
        
        return `
        <tr>
            <td><strong>${inv.reference}</strong></td>
            <td>${formatDate(inv.date)}</td>
            <td>${formatDate(dueDate)}</td>
            <td>₹${formatNumber(inv.total)}</td>
            <td>₹${formatNumber(inv.amount_due)}</td>
            <td><span class="badge bg-${statusBadge}">${statusText}</span></td>
            <td>
                ${inv.payment_status !== 'paid' ? 
                    `<button class="btn btn-sm btn-primary" onclick="openPayment(${inv.id}, '${inv.reference}', ${inv.amount_due})">
                        <i class="fas fa-credit-card"></i> Pay
                    </button>` :
                    `<span class="text-success"><i class="fas fa-check-circle"></i> Paid</span>`
                }
            </td>
        </tr>
        `;
    }).join('');
}

async function openPayment(invoiceId, reference, amount) {
    currentInvoiceId = invoiceId;
    
    document.getElementById('payInvoiceRef').textContent = reference;
    document.getElementById('payAmount').textContent = formatNumber(amount);
    
    // Also update PhonePe amount
    const phonePeAmountElement = document.getElementById('phonePeAmount');
    if (phonePeAmountElement) {
        phonePeAmountElement.textContent = formatNumber(amount);
    }
    
    try {
        currentPaymentData = {
            amount: amount,
            reference: reference
        };
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
        modal.show();

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to open payment modal');
    }
}

async function openPhonePe() {
    console.log('openPhonePe called');
    console.log('currentInvoiceId:', currentInvoiceId);
    console.log('currentPaymentData:', currentPaymentData);
    
    if (!currentInvoiceId || !currentPaymentData) {
        alert('Payment data not loaded. Please try clicking Pay button again.');
        return;
    }
    
    try {
        const phonePeTab = document.getElementById('phonePeTab');
        phonePeTab.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-purple mb-3" role="status"></div>
                <h5>Connecting to PhonePe UAT Simulator...</h5>
                <p class="text-muted small">Redirecting to official PhonePe simulator</p>
                <p class="small">Invoice ID: ${currentInvoiceId}</p>
                <p class="small">Amount: ₹${currentPaymentData.amount}</p>
            </div>
        `;
        
        console.log('Making API call to test endpoint (no auth required)');
        
        // Use test endpoint without authentication
        const response = await fetch(API_URL + '/api/phonepe/test-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invoice_id: currentInvoiceId,
                amount: currentPaymentData.amount
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok && data.success && data.payment_url) {
            console.log('PhonePe UAT Simulator URL received:', data.payment_url);
            
            // Store transaction details for callback
            localStorage.setItem('phonepe_txn_id', data.merchant_transaction_id);
            localStorage.setItem('phonepe_invoice_id', currentInvoiceId);
            
            // Show success message before redirect
            phonePeTab.innerHTML = `
                <div class="text-center py-4">
                    <div class="text-success mb-3">
                        <i class="fas fa-check-circle fa-3x"></i>
                    </div>
                    <h5 class="text-success">Redirecting to PhonePe...</h5>
                    <p class="text-muted">You will be redirected to the official PhonePe UAT simulator</p>
                    <p class="small"><strong>Transaction ID:</strong> ${data.merchant_transaction_id}</p>
                    <p class="small"><strong>Payment URL:</strong> ${data.payment_url}</p>
                    <button class="btn btn-sm btn-primary mt-2" onclick="window.location.href='${data.payment_url}'">
                        Click here if not redirected
                    </button>
                </div>
            `;
            
            // Redirect to PhonePe UAT simulator after short delay
            setTimeout(() => {
                console.log('Redirecting to:', data.payment_url);
                window.location.href = data.payment_url;
            }, 3000);
            
        } else {
            console.error('API Error:', data);
            throw new Error(data.error || 'Failed to initiate payment');
        }
        
    } catch (error) {
        console.error('PhonePe error:', error);
        
        const phonePeTab = document.getElementById('phonePeTab');
        phonePeTab.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> 
                <strong>Payment Failed:</strong> ${error.message}
                <br><small>Please try again or contact support</small>
                <br><small>Check browser console for more details</small>
            </div>
            <button class="btn btn-purple" onclick="openPhonePe()">
                <i class="fas fa-redo"></i> Retry Payment
            </button>
        `;
    }
}

async function confirmPayment() {
    if (!currentInvoiceId) return;
    
    if (!confirm('Have you completed the payment?')) {
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/api/customer-invoices/' + currentInvoiceId + '/payment', {
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
            loadInvoices();
        } else {
            alert('Failed to record payment. Please contact support.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Payment confirmation failed');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Portal dashboard loading...');
    
    if (!checkPortalAuth()) return;
    
    const contact = getPortalContact();
    document.getElementById('portalUserName').textContent = contact.name || 'User';
    
    loadInvoices();
    
    console.log('Portal dashboard ready!');
});

window.openPayment = openPayment;
window.openPhonePe = openPhonePe;
window.confirmPayment = confirmPayment;
window.portalLogout = portalLogout;