// ========================================
// FILE: auto-analytical-model.js
// PURPOSE: Auto Analytical Model functionality with rules engine
// FUNCTIONS:
//   Line 20  : checkAuth() - Verify authentication
//   Line 35  : loadAnalyticalAccounts() - Load analytics master list
//   Line 60  : loadContacts() - Load partners for dropdown
//   Line 85  : loadProductCategories() - Load unique categories
//   Line 110 : loadModels() - Load existing models
//   Line 140 : displayModels() - Render models in table
//   Line 180 : switchTab() - Handle tab switching
//   Line 200 : showNewForm() - Show creation form
//   Line 220 : cancelModelForm() - Hide form, show list
//   Line 240 : handleSaveModel() - Save rule to backend
//   Line 300 : editModel() - Edit existing model
//   Line 320 : deleteModel() - Delete model
//   Line 340 : changeStatus() - Change model status
//   Line 360 : initAutoAnalyticalModel() - Initialize page
// ========================================

// ===== CONFIGURATION =====
const API_BASE_URL = 'http://127.0.0.1:5000/api';
let allAnalyticalAccounts = [];
let allContacts = [];
let allProductCategories = [];
let allModels = [];
let currentTab = 'confirm';

// ===== AUTHENTICATION =====

/**
 * Check if user is logged in, redirect to login if not
 */
function checkAuth() {
    console.log('🔐 [AUTO-ANALYTICAL-MODEL.JS:20] Checking authentication...');
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        alert('Please log in to access auto analytical model');
        window.location.href = 'login.html';
        return false;
    }
    
    console.log('✅ User is authenticated');
    return true;
}

// ===== DATA LOADING =====

/**
 * Load analytical accounts for master list and dropdown
 */
async function loadAnalyticalAccounts() {
    console.log('📊 [AUTO-ANALYTICAL-MODEL.JS:35] Loading analytical accounts...');
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(API_BASE_URL + '/analytical-accounts', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const data = await response.json();
        
        if (data.success) {
            allAnalyticalAccounts = data.accounts || [];
            displayAnalyticalAccountsList();
            populateAnalyticsDropdown();
        }
        
    } catch (error) {
        console.error('❌ Error loading analytical accounts:', error);
    }
}

/**
 * Display analytical accounts in left panel
 */
function displayAnalyticalAccountsList() {
    const analyticsList = document.getElementById('analyticsList');
    
    if (allAnalyticalAccounts.length === 0) {
        analyticsList.innerHTML = '<p class="text-muted">No analytical accounts found. <a href="analytical-accounts.html">Create some first</a>.</p>';
        return;
    }
    
    analyticsList.innerHTML = allAnalyticalAccounts.map(account => `
        <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
            <div>
                <span class="badge bg-secondary me-2">${account.code}</span>
                <span>${account.name}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Load contacts for partner dropdown
 */
async function loadContacts() {
    console.log('👥 [AUTO-ANALYTICAL-MODEL.JS:60] Loading contacts...');
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(API_BASE_URL + '/contacts', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const data = await response.json();
        
        if (data.success) {
            allContacts = data.contacts || [];
            populatePartnerDropdown();
        }
        
    } catch (error) {
        console.error('❌ Error loading contacts:', error);
    }
}

/**
 * Load unique product categories
 */
async function loadProductCategories() {
    console.log('📦 [AUTO-ANALYTICAL-MODEL.JS:85] Loading product categories...');
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(API_BASE_URL + '/products', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const products = data.products || [];
            const categories = [...new Set(products.map(p => p.category).filter(c => c))];
            allProductCategories = categories;
            populateCategoryDropdown();
        }
        
    } catch (error) {
        console.error('❌ Error loading product categories:', error);
    }
}

/**
 * Load existing models
 */
async function loadModels() {
    console.log('🤖 [AUTO-ANALYTICAL-MODEL.JS:110] Loading models...');
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(API_BASE_URL + '/auto-analytical-models', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const data = await response.json();
        
        if (data.success) {
            allModels = data.models || [];
            displayModels();
        }
        
    } catch (error) {
        console.error('❌ Error loading models:', error);
        displayModels([]);
    }
}

/**
 * Display models in table based on current tab
 */
function displayModels() {
    console.log('📋 [AUTO-ANALYTICAL-MODEL.JS:140] Displaying models for tab:', currentTab);
    
    let filteredModels = [];
    let tbody;
    
    if (currentTab === 'confirm') {
        filteredModels = allModels.filter(m => m.status === 'confirm');
        tbody = document.getElementById('modelsTableBody');
    } else if (currentTab === 'archived') {
        filteredModels = allModels.filter(m => m.status === 'cancelled');
        tbody = document.getElementById('archivedModelsTableBody');
    }
    
    if (!tbody) return;
    
    if (filteredModels.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="fas fa-robot fa-2x mb-2"></i>
                    <p>No ${currentTab} models found.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredModels.map(model => {
        const statusBadge = getStatusBadge(model.status);
        const partnerName = model.partner_name || 'Any Partner';
        const productCategory = model.product_category || 'Any Product';
        const analyticsName = model.analytical_account_name || 'Unknown';
        
        return `
            <tr>
                <td>${partnerName}</td>
                <td>${productCategory}</td>
                <td><span class="badge bg-info">${analyticsName}</span></td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editModel(${model.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteModel(${model.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
    switch (status) {
        case 'draft': return '<span class="badge bg-warning">Draft</span>';
        case 'confirm': return '<span class="badge bg-success">Confirmed</span>';
        case 'cancelled': return '<span class="badge bg-danger">Cancelled</span>';
        default: return '<span class="badge bg-secondary">Unknown</span>';
    }
}

// ===== DROPDOWN POPULATION =====

/**
 * Populate analytics dropdown
 */
function populateAnalyticsDropdown() {
    const select = document.getElementById('analyticsToApply');
    select.innerHTML = '<option value="">Select from Analytics Master</option>';
    
    allAnalyticalAccounts.forEach(account => {
        select.innerHTML += `<option value="${account.id}">${account.code} - ${account.name}</option>`;
    });
}

/**
 * Populate partner dropdown
 */
function populatePartnerDropdown() {
    const select = document.getElementById('partnerTag');
    select.innerHTML = '<option value="">Select Partner (Optional)</option>';
    
    allContacts.forEach(contact => {
        select.innerHTML += `<option value="${contact.id}">${contact.name} (${contact.contact_type})</option>`;
    });
}

/**
 * Populate category dropdown
 */
function populateCategoryDropdown() {
    const select = document.getElementById('productCategory');
    select.innerHTML = '<option value="">Select Category (Optional)</option>';
    
    allProductCategories.forEach(category => {
        select.innerHTML += `<option value="${category}">${category}</option>`;
    });
}

// ===== TAB SWITCHING =====

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    console.log('🔄 [AUTO-ANALYTICAL-MODEL.JS:180] Switching to tab:', tabName);
    
    currentTab = tabName;
    
    // Update tab active states
    document.querySelectorAll('#modelTabs .nav-link').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`#modelTabs .nav-link[data-tab="${tabName}"]`).classList.add('active');
    
    // Show/hide content
    document.getElementById('newModelForm').style.display = tabName === 'new' ? 'block' : 'none';
    document.getElementById('confirmedModels').style.display = tabName === 'confirm' ? 'block' : 'none';
    document.getElementById('archivedModels').style.display = tabName === 'archived' ? 'block' : 'none';
    
    if (tabName !== 'new') {
        displayModels();
    }
}

// ===== FORM FUNCTIONS =====

/**
 * Show new model form
 */
function showNewForm() {
    console.log('➕ [AUTO-ANALYTICAL-MODEL.JS:200] Showing new model form');
    
    document.getElementById('analyticalModelForm').reset();
    document.getElementById('modelId').value = '';
    switchTab('new');
}

/**
 * Cancel model form and return to list
 */
function cancelModelForm() {
    console.log('❌ [AUTO-ANALYTICAL-MODEL.JS:220] Cancelling model form');
    
    switchTab('confirm');
}

/**
 * Handle save model form submission
 */
async function handleSaveModel(event) {
    event.preventDefault();
    console.log('💾 [AUTO-ANALYTICAL-MODEL.JS:240] Saving model...');
    
    const modelId = document.getElementById('modelId').value;
    const modelData = {
        partner_id: document.getElementById('partnerTag').value || null,
        product_category: document.getElementById('productCategory').value || null,
        analytical_account_id: document.getElementById('analyticsToApply').value,
        status: document.getElementById('modelStatus').value
    };
    
    // Validate required fields
    if (!modelData.analytical_account_id) {
        alert('Please select an analytical account to apply');
        return;
    }
    
    const isEdit = modelId ? true : false;
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit 
        ? API_BASE_URL + '/auto-analytical-models/' + modelId
        : API_BASE_URL + '/auto-analytical-models';
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(modelData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(isEdit ? 'Model updated successfully!' : 'Model created successfully!');
            loadModels();
            switchTab('confirm');
        } else {
            alert('Error: ' + (data.message || 'Failed to save model'));
        }
        
    } catch (error) {
        console.error('❌ Error saving model:', error);
        alert('Failed to save model. Please check your connection.');
    }
}

/**
 * Edit existing model
 */
function editModel(modelId) {
    console.log('✏️ [AUTO-ANALYTICAL-MODEL.JS:300] Editing model:', modelId);
    
    const model = allModels.find(m => m.id === modelId);
    
    if (!model) {
        alert('Model not found');
        return;
    }
    
    // Fill form
    document.getElementById('modelId').value = model.id;
    document.getElementById('partnerTag').value = model.partner_id || '';
    document.getElementById('productCategory').value = model.product_category || '';
    document.getElementById('analyticsToApply').value = model.analytical_account_id;
    document.getElementById('modelStatus').value = model.status;
    
    switchTab('new');
}

/**
 * Delete model
 */
async function deleteModel(modelId) {
    console.log('🗑️ [AUTO-ANALYTICAL-MODEL.JS:320] Deleting model:', modelId);
    
    if (!confirm('Are you sure you want to delete this model?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(API_BASE_URL + '/auto-analytical-models/' + modelId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Model deleted successfully!');
            loadModels();
        } else {
            alert('Error: ' + (data.message || 'Failed to delete model'));
        }
        
    } catch (error) {
        console.error('❌ Error deleting model:', error);
        alert('Failed to delete model. Please check your connection.');
    }
}

// ===== INITIALIZATION =====

/**
 * Initialize auto analytical model page
 */
function initAutoAnalyticalModel() {
    console.log('🚀 [AUTO-ANALYTICAL-MODEL.JS:360] Initializing auto analytical model page...');
    
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
    
    // Load all data
    loadAnalyticalAccounts();
    loadContacts();
    loadProductCategories();
    loadModels();
    
    // Attach event listeners
    const modelForm = document.getElementById('analyticalModelForm');
    if (modelForm) {
        modelForm.addEventListener('submit', handleSaveModel);
    }
    
    // Tab click handlers
    document.querySelectorAll('#modelTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Logout handler
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
    
    console.log('✅ [AUTO-ANALYTICAL-MODEL.JS:360] Auto analytical model page initialized');
}

// ===== GLOBAL FUNCTIONS =====
window.showNewForm = showNewForm;
window.cancelModelForm = cancelModelForm;
window.editModel = editModel;
window.deleteModel = deleteModel;

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', initAutoAnalyticalModel);