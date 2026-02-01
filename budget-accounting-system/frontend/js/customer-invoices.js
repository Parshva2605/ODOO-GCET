const API_URL = 'http://127.0.0.1:5000';
let lineCounter = 0;

// Auth
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

// Format
function formatNumber(num) {
    return parseFloat(num || 0).toFixed(2);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
}

// Load Customer Invoices
async function loadCustomerInvoices() {
    try {
        const response = await fetch(API_URL + '/api/customer-invoices', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (!response.ok) throw new Error('Failed to fetch');

        const invoices = await response.json();
        displayCustomerInvoices(invoices);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('invoiceTableBody').innerHTML = `
            <tr><td colspan="7" class="text-center text-danger">Error loading customer invoices</td></tr>
        `;
    }
}

function displayCustomerInvoices(invoices) {
    const tbody = document.getElementById('invoiceTableBody');

    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No customer invoices yet</td></tr>';
        return;
    }

    tbody.innerHTML = invoices.map(invoice => {
        const paymentBadge = getPaymentStatusBadge(invoice.payment_status);
        const stateBadge = getStateBadge(invoice.state);
        
        return `
            <tr>
                <td><strong>${invoice.reference}</strong></td>
                <td>${formatDate(invoice.date)}</td>
                <td>${invoice.customer_name || 'N/A'}</td>
                <td>₹${formatNumber(invoice.total)}</td>
                <td>${stateBadge}</td>
                <td>${paymentBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewInvoice(${invoice.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${invoice.payment_status !== 'paid' ? `
                    <button class="btn btn-sm btn-outline-success" onclick="recordPayment(${invoice.id})">
                        <i class="fas fa-money-bill"></i> Pay
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function getPaymentStatusBadge(status) {
    const badges = {
        'not_paid': '<span class="badge bg-danger">Not Paid</span>',
        'partial': '<span class="badge bg-warning">Partial</span>',
        'paid': '<span class="badge bg-success">Paid</span>',
        'overdue': '<span class="badge bg-dark">Overdue</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

function getStateBadge(state) {
    const badges = {
        'draft': '<span class="badge bg-secondary">Draft</span>',
        'posted': '<span class="badge bg-success">Posted</span>',
        'cancelled': '<span class="badge bg-danger">Cancelled</span>'
    };
    return badges[state] || '<span class="badge bg-secondary">Unknown</span>';
}

// Load Customers
async function loadCustomers() {
    console.log('🔄 Loading customers...');
    
    try {
        const response = await fetch(API_URL + '/api/contacts', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        console.log('Response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Contacts response:', data);
            
            // Handle different response formats
            let contacts = [];
            if (Array.isArray(data)) {
                contacts = data;
            } else if (data && Array.isArray(data.contacts)) {
                contacts = data.contacts;
            } else if (data && data.success && Array.isArray(data.contacts)) {
                contacts = data.contacts;
            }
            
            console.log('Contacts extracted:', contacts);
            
            const customers = contacts.filter(c => c.type === 'customer');
            console.log('Customers filtered:', customers);

            const select = document.getElementById('invoiceCustomer');

            if (!select) {
                console.error('❌ invoiceCustomer select element not found!');
                return;
            }

            select.innerHTML = '<option value="">Select Customer</option>';

            if (customers.length === 0) {
                select.innerHTML += '<option value="" disabled>No customers found - Create customers first</option>';
                console.warn('⚠️ No customers in database!');
                return;
            }

            customers.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = c.name;
                select.appendChild(option);
                console.log('Added customer:', c.name);
            });

            console.log('✅ Loaded', customers.length, 'customers');
        } else {
            const errorData = await response.json();
            console.error('❌ Failed to fetch contacts:', response.status, errorData);
            alert('Failed to load customers: ' + (errorData.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('❌ Error loading customers:', error);
        alert('Error loading customers. Check console for details.');
    }
}

// Load Products
async function loadProducts(selectId) {
    try {
        const response = await fetch(API_URL + '/api/products', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (response.ok) {
            const productsData = await response.json();
            
            // Handle different response formats
            let products = [];
            if (Array.isArray(productsData)) {
                products = productsData;
            } else if (productsData && Array.isArray(productsData.products)) {
                products = productsData.products;
            }
            
            const select = document.getElementById(selectId);

            select.innerHTML = '<option value="">Select Product</option>';
            products.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name;
                // Use selling price for invoices
                option.dataset.price = p.sales_price || p.selling_price || p.price || 0;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load Analytical Accounts
async function loadAnalyticalAccounts(selectId) {
    try {
        const response = await fetch(API_URL + '/api/analytical-accounts', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (response.ok) {
            const accountsData = await response.json();
            
            // Handle different response formats
            let accounts = [];
            if (Array.isArray(accountsData)) {
                accounts = accountsData;
            } else if (accountsData && Array.isArray(accountsData.accounts)) {
                accounts = accountsData.accounts;
            }
            
            const select = document.getElementById(selectId);

            select.innerHTML = '<option value="">None</option>';
            accounts.forEach(a => {
                const option = document.createElement('option');
                option.value = a.id;
                option.textContent = a.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading analytical accounts:', error);
    }
}

// Open Modal
function openInvoiceModal() {
    document.getElementById('invoiceForm').reset();
    document.getElementById('invoiceLines').innerHTML = '';
    document.getElementById('invoiceTotal').textContent = '0.00';

    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;

    // Generate reference
    const ref = 'INV' + Date.now().toString().slice(-8);
    document.getElementById('invoiceReference').value = ref;

    lineCounter = 0;
    addInvoiceLine();

    const modal = new bootstrap.Modal(document.getElementById('invoiceModal'));
    modal.show();
}

// Add Line
function addInvoiceLine() {
    lineCounter++;
    const lineId = 'line-' + lineCounter;

    const lineHtml = `
        <div class="card mb-2" id="${lineId}">
            <div class="card-body">
                <div class="row g-2">
                    <div class="col-md-3">
                        <label class="form-label">Product</label>
                        <select class="form-select line-product" id="product-${lineCounter}" onchange="updateLinePrice(${lineCounter})">
                            <option value="">Select Product</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Description</label>
                        <input type="text" class="form-control line-description" id="desc-${lineCounter}">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Quantity</label>
                        <input type="number" class="form-control line-quantity" id="qty-${lineCounter}" value="1" min="1" onchange="calculateLine(${lineCounter})">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Price</label>
                        <input type="number" class="form-control line-price" id="price-${lineCounter}" value="0" min="0" onchange="calculateLine(${lineCounter})">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Subtotal</label>
                        <input type="number" class="form-control line-subtotal" id="subtotal-${lineCounter}" value="0" readonly>
                        <button type="button" class="btn btn-sm btn-outline-danger mt-1" onclick="removeLine('${lineId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="row g-2 mt-1">
                    <div class="col-md-12">
                        <label class="form-label">Analytical Account</label>
                        <select class="form-select line-analytical" id="analytical-${lineCounter}">
                            <option value="">None</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('invoiceLines').insertAdjacentHTML('beforeend', lineHtml);
    loadProducts('product-' + lineCounter);
    loadAnalyticalAccounts('analytical-' + lineCounter);
}

// Update Price from Product
function updateLinePrice(lineNum) {
    const productSelect = document.getElementById('product-' + lineNum);
    const selectedOption = productSelect.options[productSelect.selectedIndex];

    if (selectedOption && selectedOption.dataset.price) {
        document.getElementById('price-' + lineNum).value = selectedOption.dataset.price;
        calculateLine(lineNum);
    }
}

// Calculate Line
function calculateLine(lineNum) {
    const qty = parseFloat(document.getElementById('qty-' + lineNum).value) || 0;
    const price = parseFloat(document.getElementById('price-' + lineNum).value) || 0;
    const subtotal = qty * price;

    document.getElementById('subtotal-' + lineNum).value = formatNumber(subtotal);
    calculateTotal();
}

// Calculate Total
function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.line-subtotal').forEach(input => {
        total += parseFloat(input.value) || 0;
    });

    document.getElementById('invoiceTotal').textContent = formatNumber(total);
    
    // Recalculate due amount when total changes
    calculateDue();
}

// Calculate amount due
function calculateDue() {
    const total = parseFloat(document.getElementById('invoiceTotal').textContent) || 0;
    const paidCash = parseFloat(document.getElementById('paidCash').value) || 0;
    const paidBank = parseFloat(document.getElementById('paidBank').value) || 0;
    const paidOnline = parseFloat(document.getElementById('paidOnline').value) || 0;
    
    const totalPaid = paidCash + paidBank + paidOnline;
    const amountDue = total - totalPaid;
    
    document.getElementById('amountDue').textContent = formatNumber(amountDue);
    
    // Update payment status badge
    const statusBadge = document.getElementById('paymentStatus');
    if (amountDue <= 0) {
        statusBadge.textContent = 'Paid';
        statusBadge.className = 'badge bg-success';
    } else if (totalPaid > 0) {
        statusBadge.textContent = 'Partial';
        statusBadge.className = 'badge bg-warning';
    } else {
        statusBadge.textContent = 'Not Paid';
        statusBadge.className = 'badge bg-danger';
    }
}

// Remove Line
function removeLine(lineId) {
    document.getElementById(lineId).remove();
    calculateTotal();
}

// Save Invoice
async function saveInvoice() {
    const reference = document.getElementById('invoiceReference').value;
    const date = document.getElementById('invoiceDate').value;
    const customerId = document.getElementById('invoiceCustomer').value;
    const state = document.getElementById('invoiceState').value;

    if (!reference || !date || !customerId) {
        alert('Please fill required fields');
        return;
    }

    const lines = [];
    document.querySelectorAll('.line-product').forEach((select, index) => {
        const lineNum = select.id.split('-')[1];
        const productId = document.getElementById('product-' + lineNum).value;
        const description = document.getElementById('desc-' + lineNum).value;
        const quantity = parseFloat(document.getElementById('qty-' + lineNum).value) || 1;
        const price = parseFloat(document.getElementById('price-' + lineNum).value) || 0;
        const subtotal = parseFloat(document.getElementById('subtotal-' + lineNum).value) || 0;
        const analyticalId = document.getElementById('analytical-' + lineNum).value;

        if (productId) {
            lines.push({
                product_id: productId,
                description: description,
                quantity: quantity,
                price: price,
                subtotal: subtotal,
                analytical_account_id: analyticalId || null
            });
        }
    });

    if (lines.length === 0) {
        alert('Please add at least one line item');
        return;
    }

    const total = parseFloat(document.getElementById('invoiceTotal').textContent);
    const paidCash = parseFloat(document.getElementById('paidCash').value) || 0;
    const paidBank = parseFloat(document.getElementById('paidBank').value) || 0;
    const paidOnline = parseFloat(document.getElementById('paidOnline').value) || 0;

    const data = {
        reference: reference,
        date: date,
        customer_id: customerId,
        state: state,
        total: total,
        paid_via_cash: paidCash,
        paid_via_bank: paidBank,
        paid_via_online: paidOnline,
        lines: lines
    };

    try {
        const response = await fetch(API_URL + '/api/customer-invoices', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Customer Invoice created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('invoiceModal')).hide();
            loadCustomerInvoices();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to create customer invoice');
    }
}

// View Invoice
async function viewInvoice(invoiceId) {
    try {
        const response = await fetch(API_URL + '/api/customer-invoices/' + invoiceId, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (response.ok) {
            const invoice = await response.json();
            alert('Invoice: ' + invoice.reference + '\nCustomer: ' + invoice.customer_name + '\nTotal: ₹' + formatNumber(invoice.total) + '\nPayment: ' + invoice.payment_status);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Record Payment
async function recordPayment(invoiceId) {
    const amount = prompt('Enter payment amount:');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    const paymentType = prompt('Payment type (cash/bank/online):', 'online');
    if (!paymentType || !['cash', 'bank', 'online'].includes(paymentType.toLowerCase())) {
        alert('Please enter valid payment type: cash, bank, or online');
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/api/customer-invoices/' + invoiceId + '/payment', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                payment_type: paymentType.toLowerCase()
            })
        });

        if (response.ok) {
            alert('Payment recorded successfully!');
            loadCustomerInvoices();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to record payment');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Customer Invoices page loading...');

    if (!checkAuth()) return;

    // Load user info
    loadUserInfo();

function loadUserInfo() {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const userNameElement = document.getElementById('userName');
            const userEmailElement = document.getElementById('userEmail');
            
            if (userNameElement) {
                userNameElement.textContent = user.name || 'Unknown User';
            }
            
            if (userEmailElement) {
                userEmailElement.textContent = user.email || 'No email';
            }
        }
    } catch (error) {
        console.error('❌ Error loading user info:', error);
        const userNameElement = document.getElementById('userName');
        const userEmailElement = document.getElementById('userEmail');
        
        if (userNameElement) {
            userNameElement.textContent = 'Error loading user';
        }
        if (userEmailElement) {
            userEmailElement.textContent = 'Please refresh';
        }
    }
}

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Setup mobile menu button
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }

    console.log('🔄 Starting to load customers and invoices...');
    loadCustomers();
    loadCustomerInvoices();

    console.log('✅ Customer Invoices ready!');
});

// Make functions available globally
window.calculateDue = calculateDue;
window.recordPayment = recordPayment;