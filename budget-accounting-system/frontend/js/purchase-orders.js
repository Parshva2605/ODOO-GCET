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

// Load Purchase Orders
async function loadPurchaseOrders() {
    try {
        const response = await fetch(API_URL + '/api/purchase-orders', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (!response.ok) throw new Error('Failed to fetch');

        const orders = await response.json();
        displayPurchaseOrders(orders);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('poTableBody').innerHTML = `
            <tr><td colspan="6" class="text-center text-danger">Error loading purchase orders</td></tr>
        `;
    }
}

function displayPurchaseOrders(orders) {
    const tbody = document.getElementById('poTableBody');

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No purchase orders yet</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(po => `
        <tr>
            <td><strong>${po.reference}</strong></td>
            <td>${formatDate(po.date)}</td>
            <td>${po.vendor_name || 'N/A'}</td>
            <td>₹${formatNumber(po.total)}</td>
            <td><span class="badge bg-${po.state === 'confirmed' ? 'success' : 'warning'}">${po.state}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewPO(${po.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Load Vendors
async function loadVendors() {
    console.log('🔄 Loading vendors...');
    
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
            
            const vendors = contacts.filter(c => c.type === 'vendor');
            console.log('Vendors filtered:', vendors);

            const select = document.getElementById('poVendor');

            if (!select) {
                console.error('❌ poVendor select element not found!');
                return;
            }

            select.innerHTML = '<option value="">Select Vendor</option>';

            if (vendors.length === 0) {
                select.innerHTML += '<option value="" disabled>No vendors found - Create vendors first</option>';
                console.warn('⚠️ No vendors in database!');
                return;
            }

            vendors.forEach(v => {
                const option = document.createElement('option');
                option.value = v.id;
                option.textContent = v.name;
                select.appendChild(option);
                console.log('Added vendor:', v.name);
            });

            console.log('✅ Loaded', vendors.length, 'vendors');
        } else {
            const errorData = await response.json();
            console.error('❌ Failed to fetch contacts:', response.status, errorData);
            alert('Failed to load vendors: ' + (errorData.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('❌ Error loading vendors:', error);
        alert('Error loading vendors. Check console for details.');
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
                option.dataset.price = p.price || 0;
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
function openPOModal() {
    document.getElementById('poForm').reset();
    document.getElementById('poLines').innerHTML = '';
    document.getElementById('poTotal').textContent = '0.00';

    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('poDate').value = today;

    // Generate reference
    const ref = 'PO' + Date.now().toString().slice(-8);
    document.getElementById('poReference').value = ref;

    lineCounter = 0;
    addPOLine();

    const modal = new bootstrap.Modal(document.getElementById('poModal'));
    modal.show();
}

// Add Line
function addPOLine() {
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

    document.getElementById('poLines').insertAdjacentHTML('beforeend', lineHtml);
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

    document.getElementById('poTotal').textContent = formatNumber(total);
}

// Remove Line
function removeLine(lineId) {
    document.getElementById(lineId).remove();
    calculateTotal();
}

// Save PO
async function savePO() {
    const reference = document.getElementById('poReference').value;
    const date = document.getElementById('poDate').value;
    const vendorId = document.getElementById('poVendor').value;

    if (!reference || !date || !vendorId) {
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

    const total = parseFloat(document.getElementById('poTotal').textContent);

    const data = {
        reference: reference,
        date: date,
        vendor_id: vendorId,
        state: 'draft',
        total: total,
        lines: lines
    };

    try {
        const response = await fetch(API_URL + '/api/purchase-orders', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Purchase Order created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('poModal')).hide();
            loadPurchaseOrders();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to create purchase order');
    }
}

// View PO
async function viewPO(poId) {
    try {
        const response = await fetch(API_URL + '/api/purchase-orders/' + poId, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (response.ok) {
            const po = await response.json();
            alert('PO: ' + po.reference + '\nVendor: ' + po.vendor_name + '\nTotal: ₹' + formatNumber(po.total));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Purchase Orders page loading...');

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

    console.log('🔄 Starting to load vendors and purchase orders...');
    loadVendors();
    loadPurchaseOrders();

    console.log('✅ Purchase Orders ready!');
});