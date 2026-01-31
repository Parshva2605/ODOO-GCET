// ========================================
// FILE: products.js
// PURPOSE: Products management functionality
// FUNCTIONS:
//   Line 20  : checkAuth() - Verify authentication
//   Line 35  : loadProducts() - Fetch and display products
//   Line 70  : displayProducts() - Render products in table
//   Line 100 : openAddModal() - Open modal for new product
//   Line 115 : openEditModal() - Open modal for edit with data
//   Line 140 : handleSaveProduct() - Save new/edited product
//   Line 200 : handleDeleteProduct() - Delete product
//   Line 230 : initProducts() - Initialize page
// ========================================

// ===== CONFIGURATION =====
const API_BASE_URL = 'http://127.0.0.1:5000/api';
let allProducts = []; // Store all products

// ===== UTILITY FUNCTIONS =====

/**
 * Format currency display
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
const formatCurrency = (amount) => {
    return '₹' + parseFloat(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// ===== AUTHENTICATION =====

/**
 * Check if user is logged in, redirect to login if not
 */
function checkAuth() {
    console.log('🔐 [PRODUCTS.JS:20] Checking authentication...');
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        alert('Please log in to access products');
        window.location.href = 'login.html';
        return false;
    }
    
    console.log('✅ User is authenticated');
    return true;
}

// ===== DATA LOADING =====

/**
 * Fetch products from backend and display in table
 */
async function loadProducts() {
    console.log('📊 [PRODUCTS.JS:35] Loading products...');
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ No token available');
        return;
    }
    
    try {
        const response = await fetch(API_BASE_URL + '/products', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            allProducts = data.products || [];
            console.log('✅ Loaded products:', allProducts.length);
            displayProducts(allProducts);
        } else {
            console.log('⚠️ No products found or error:', data.message);
            allProducts = [];
            displayProducts([]);
        }
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        allProducts = [];
        displayProducts([]);
    }
}

/**
 * Render products in table
 * @param {Array} products - Array of product objects
 */
function displayProducts(products) {
    console.log('📋 [PRODUCTS.JS:70] Displaying products:', products.length);
    
    const tbody = document.getElementById('productsTableBody');
    
    if (!tbody) {
        console.error('❌ Table body not found');
        return;
    }
    
    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="fas fa-box fa-3x mb-3"></i>
                    <p>No products found. Click "Add Product" to create one.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = products.map(product => {
        return `
            <tr>
                <td>${product.name}</td>
                <td>${product.category || '-'}</td>
                <td>${formatCurrency(product.cost_price)}</td>
                <td>${formatCurrency(product.sales_price)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditModal(${product.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="handleDeleteProduct(${product.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== MODAL FUNCTIONS =====

/**
 * Open modal for adding new product
 */
function openAddModal() {
    console.log('➕ [PRODUCTS.JS:100] Opening add product modal');
    
    // Clear form
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    
    // Set modal title
    document.getElementById('modalTitle').textContent = 'Add Product';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

/**
 * Open modal with product data for editing
 * @param {number} productId - ID of product to edit
 */
function openEditModal(productId) {
    console.log('✏️ [PRODUCTS.JS:115] Opening edit modal for product:', productId);
    
    const product = allProducts.find(p => p.id === productId);
    
    if (!product) {
        console.error('❌ Product not found:', productId);
        alert('Product not found');
        return;
    }
    
    // Fill form fields
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productCost').value = product.cost_price || '';
    document.getElementById('productSales').value = product.sales_price || '';
    
    // Set modal title
    document.getElementById('modalTitle').textContent = 'Edit Product';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

// ===== CRUD OPERATIONS =====

/**
 * Save new or update existing product
 * @param {Event} event - Form submit event
 */
async function handleSaveProduct(event) {
    event.preventDefault();
    console.log('💾 [PRODUCTS.JS:140] Saving product...');
    
    // Get form values
    const productId = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value.trim() || null,
        cost_price: parseFloat(document.getElementById('productCost').value) || 0,
        sales_price: parseFloat(document.getElementById('productSales').value) || 0
    };
    
    // Validate required fields
    if (!productData.name) {
        alert('Please enter product name');
        return;
    }
    
    // Validate prices
    if (productData.cost_price < 0 || productData.sales_price < 0) {
        alert('Prices cannot be negative');
        return;
    }
    
    // Determine if add or edit
    const isEdit = productId ? true : false;
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit 
        ? API_BASE_URL + '/products/' + productId
        : API_BASE_URL + '/products';
    
    // Show loading state
    const saveBtn = document.getElementById('saveProductBtn');
    const saveText = document.getElementById('saveButtonText');
    const saveSpinner = document.getElementById('saveButtonSpinner');
    
    saveBtn.disabled = true;
    saveText.textContent = isEdit ? 'Updating...' : 'Saving...';
    saveSpinner.style.display = 'inline-block';
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(productData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Product saved successfully');
            alert(isEdit ? 'Product updated successfully!' : 'Product added successfully!');
            
            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            modal.hide();
            
            // Reload products
            loadProducts();
        } else {
            console.error('❌ Error saving product:', data.message);
            alert('Error: ' + (data.message || 'Failed to save product'));
        }
        
    } catch (error) {
        console.error('❌ Network error saving product:', error);
        alert('Failed to save product. Please check your connection.');
    } finally {
        // Reset button state
        saveBtn.disabled = false;
        saveText.textContent = 'Save Product';
        saveSpinner.style.display = 'none';
    }
}

/**
 * Delete product with confirmation
 * @param {number} productId - ID of product to delete
 */
async function handleDeleteProduct(productId) {
    console.log('🗑️ [PRODUCTS.JS:200] Deleting product:', productId);
    
    const product = allProducts.find(p => p.id === productId);
    
    if (!product) {
        console.error('❌ Product not found:', productId);
        alert('Product not found');
        return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${product.name}"?\n\nThis action cannot be undone.`)) {
        console.log('❌ Delete cancelled by user');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(API_BASE_URL + '/products/' + productId, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Product deleted successfully');
            alert('Product deleted successfully!');
            loadProducts(); // Reload list
        } else {
            console.error('❌ Error deleting product:', data.message);
            alert('Error: ' + (data.message || 'Failed to delete product'));
        }
        
    } catch (error) {
        console.error('❌ Network error deleting product:', error);
        alert('Failed to delete product. Please check your connection.');
    }
}

// ===== INITIALIZATION =====

/**
 * Initialize products page on load
 */
function initProducts() {
    console.log('🚀 [PRODUCTS.JS:230] Initializing products page...');
    
    // Check authentication
    if (!checkAuth()) {
        return;
    }
    
    // Load user info
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            document.getElementById('userName').textContent = user.name || 'Unknown User';
            document.getElementById('userEmail').textContent = user.email || 'No email';
        }
    } catch (error) {
        console.error('❌ Error loading user info:', error);
    }
    
    // Load products
    loadProducts();
    
    // Attach event listeners
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', openAddModal);
        console.log('✅ Add product button handler attached');
    }
    
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleSaveProduct);
        console.log('✅ Product form handler attached');
    }
    
    // Attach logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }
    
    // Mobile menu handler
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }
    
    console.log('✅ [PRODUCTS.JS:230] Products page initialized successfully');
}

// ===== GLOBAL FUNCTIONS =====
// Make functions available globally for onclick handlers
window.openEditModal = openEditModal;
window.handleDeleteProduct = handleDeleteProduct;

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', initProducts);