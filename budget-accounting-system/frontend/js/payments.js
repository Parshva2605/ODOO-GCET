const API_URL = 'http://127.0.0.1:5000';

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function getToken() {
    return localStorage.getItem('token');
}

function formatNumber(num) {
    return parseFloat(num || 0).toFixed(2);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
}

async function loadPayments() {
    try {
        const response = await fetch(API_URL + '/api/payments', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (!response.ok) throw new Error('Failed to fetch');

        const payments = await response.json();
        displayPayments(payments);
        calculateTotals(payments);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('paymentsBody').innerHTML = `
            <tr><td colspan="8" class="text-center text-danger">Error loading payments</td></tr>
        `;
    }
}

function displayPayments(payments) {
    const tbody = document.getElementById('paymentsBody');

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No payments recorded yet</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(payment => `
        <tr>
            <td><strong>${payment.reference}</strong></td>
            <td>${formatDate(payment.date)}</td>
            <td>
                <span class="badge bg-${payment.payment_type === 'customer' ? 'success' : 'danger'}">
                    ${payment.payment_type === 'customer' ? 'Received' : 'Paid'}
                </span>
            </td>
            <td>${payment.contact_name || 'N/A'}</td>
            <td>${payment.document_reference || 'N/A'}</td>
            <td>
                <span class="badge bg-secondary">
                    ${payment.payment_method === 'cash' ? 'Cash' :
                       payment.payment_method === 'bank' ? 'Bank' : 'Online'}
                </span>
            </td>
            <td class="${payment.payment_type === 'customer' ? 'text-success' : 'text-danger'}">
                ${payment.payment_type === 'customer' ? '+' : '-'}₹${formatNumber(payment.amount)}
            </td>
            <td>${payment.notes || '-'}</td>
        </tr>
    `).join('');
}

function calculateTotals(payments) {
    let customerTotal = 0;
    let vendorTotal = 0;

    payments.forEach(payment => {
        if (payment.payment_type === 'customer') {
            customerTotal += parseFloat(payment.amount);
        } else {
            vendorTotal += parseFloat(payment.amount);
        }
    });

    const netCashFlow = customerTotal - vendorTotal;

    document.getElementById('customerPaymentsTotal').textContent = '₹' + formatNumber(customerTotal);
    document.getElementById('vendorPaymentsTotal').textContent = '₹' + formatNumber(vendorTotal);
    document.getElementById('netCashFlow').textContent = '₹' + formatNumber(netCashFlow);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Payments page loading...');

    if (!checkAuth()) return;

    // Load user
    fetch(API_URL + '/api/auth/profile', {
        headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    .then(r => r.json())
    .then(user => {
        document.getElementById('userEmail').textContent = user.email;
    });

    loadPayments();

    console.log('✅ Payments page ready!');
});