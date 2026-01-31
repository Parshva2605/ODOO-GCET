// ========================================
// FILE: analytical-accounts.js
// PURPOSE: Analytical accounts management functionality
// FUNCTIONS:
//   Line 20  : checkAuth() - Verify authentication
//   Line 35  : loadAnalyticalAccounts() - Fetch and display accounts
//   Line 70  : displayAnalyticalAccounts() - Render accounts in table
//   Line 100 : openAddModal() - Open modal for new account
//   Line 115 : openEditModal() - Open modal for edit with data
//   Line 140 : handleSaveAccount() - Save new/edited account
//   Line 200 : handleDeleteAccount() - Delete account
//   Line 230 : initAnalyticalAccounts() - Initialize page
// ========================================

// ===== CONFIGURATION =====
const API_BASE_URL = 'http://127.0.0.1:5000/api';
let allAnalyticalAccounts = []; // Store all analytical accounts

// ===== AUTHENTICATION =====

/**
 * Check if user is logged in, redirect to login if not
 */
function checkAuth() {
    console.log('🔐 [ANALYTICAL-ACCOUNTS.JS:20] Checking authentication...');
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        alert('Please log in to access analytical accounts');
        window.location.href = 'login.html';
        return false;
    }
    
    console.log('✅ User is authenticated');
    return true;
}

// ===== DATA LOADING =====

/**
 * Fetch analytical accounts from backend and display in table
 */
async function loadAnalyticalAccounts() {
    console.log('📊 [ANALYTICAL-ACCOUNTS.JS:35] Loading analytical accounts...');
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ No token available');
        return;
    }
    
    try {
        const response = await fetch(API_BASE_URL + '/analytical-accounts', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            allAnalyticalAccounts = data.accounts || [];
            console.log('✅ Loaded analytical accounts:', allAnalyticalAccounts.length);
            displayAnalyticalAccounts(allAnalyticalAccounts);
        } else {
            console.log('⚠️ No analytical accounts found or error:', data.message);
            allAnalyticalAccounts = [];
            displayAnalyticalAccounts([]);
        }
        
    } catch (error) {
        console.error('❌ Error loading analytical accounts:', error);
        allAnalyticalAccounts = [];
        displayAnalyticalAccounts([]);
    }
}

/**
 * Render analytical accounts in table
 * @param {Array} accounts - Array of analytical account objects
 */
function displayAnalyticalAccounts(accounts) {
    console.log('📋 [ANALYTICAL-ACCOUNTS.JS:70] Displaying analytical accounts:', accounts.length);
    
    const tbody = document.getElementById('analyticalAccountsTableBody');
    
    if (!tbody) {
        console.error('❌ Table body not found');
        return;
    }
    
    if (!accounts || accounts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted py-4">
                    <i class="fas fa-chart-pie fa-3x mb-3"></i>
                    <p>No analytical accounts found. Click "Add Analytical Account" to create one.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = accounts.map(account => {
        return `
            <tr>
                <td><span class="badge bg-secondary">${account.code}</span></td>
                <td>${account.name}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditModal(${account.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="handleDeleteAccount(${account.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== MODAL FUNCTIONS =====

/**
 * Open modal for adding new analytical account
 */
function openAddModal() {
    console.log('➕ [ANALYTICAL-ACCOUNTS.JS:100] Opening add analytical account modal');
    
    // Clear form
    document.getElementById('analyticalAccountForm').reset();
    document.getElementById('accountId').value = '';
    
    // Set modal title
    document.getElementById('modalTitle').textContent = 'Add Analytical Account';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('analyticalAccountModal'));
    modal.show();
}

/**
 * Open modal with analytical account data for editing
 * @param {number} accountId - ID of account to edit
 */
function openEditModal(accountId) {
    console.log('✏️ [ANALYTICAL-ACCOUNTS.JS:115] Opening edit modal for account:', accountId);
    
    const account = allAnalyticalAccounts.find(a => a.id === accountId);
    
    if (!account) {
        console.error('❌ Analytical account not found:', accountId);
        alert('Analytical account not found');
        return;
    }
    
    // Fill form fields
    document.getElementById('accountId').value = account.id;
    document.getElementById('accountCode').value = account.code;
    document.getElementById('accountName').value = account.name;
    
    // Set modal title
    document.getElementById('modalTitle').textContent = 'Edit Analytical Account';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('analyticalAccountModal'));
    modal.show();
}

// ===== CRUD OPERATIONS =====

/**
 * Save new or update existing analytical account
 * @param {Event} event - Form submit event
 */
async function handleSaveAccount(event) {
    event.preventDefault();
    console.log('💾 [ANALYTICAL-ACCOUNTS.JS:140] Saving analytical account...');
    
    // Get form values
    const accountId = document.getElementById('accountId').value;
    const accountData = {
        code: document.getElementById('accountCode').value.trim(),
        name: document.getElementById('accountName').value.trim()
    };
    
    // Validate required fields
    if (!accountData.code || !accountData.name) {
        alert('Please fill all required fields (Code and Name)');
        return;
    }
    
    // Determine if add or edit
    const isEdit = accountId ? true : false;
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit 
        ? API_BASE_URL + '/analytical-accounts/' + accountId
        : API_BASE_URL + '/analytical-accounts';
    
    // Show loading state
    const saveBtn = document.getElementById('saveAccountBtn');
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
            body: JSON.stringify(accountData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Analytical account saved successfully');
            alert(isEdit ? 'Analytical account updated successfully!' : 'Analytical account added successfully!');
            
            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('analyticalAccountModal'));
            modal.hide();
            
            // Reload accounts
            loadAnalyticalAccounts();
        } else {
            console.error('❌ Error saving analytical account:', data.message);
            alert('Error: ' + (data.message || 'Failed to save analytical account'));
        }
        
    } catch (error) {
        console.error('❌ Network error saving analytical account:', error);
        alert('Failed to save analytical account. Please check your connection.');
    } finally {
        // Reset button state
        saveBtn.disabled = false;
        saveText.textContent = 'Save Account';
        saveSpinner.style.display = 'none';
    }
}

/**
 * Delete analytical account with confirmation
 * @param {number} accountId - ID of account to delete
 */
async function handleDeleteAccount(accountId) {
    console.log('🗑️ [ANALYTICAL-ACCOUNTS.JS:200] Deleting analytical account:', accountId);
    
    const account = allAnalyticalAccounts.find(a => a.id === accountId);
    
    if (!account) {
        console.error('❌ Analytical account not found:', accountId);
        alert('Analytical account not found');
        return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${account.code} - ${account.name}"?\n\nThis action cannot be undone.`)) {
        console.log('❌ Delete cancelled by user');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(API_BASE_URL + '/analytical-accounts/' + accountId, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Analytical account deleted successfully');
            alert('Analytical account deleted successfully!');
            loadAnalyticalAccounts(); // Reload list
        } else {
            console.error('❌ Error deleting analytical account:', data.message);
            alert('Error: ' + (data.message || 'Failed to delete analytical account'));
        }
        
    } catch (error) {
        console.error('❌ Network error deleting analytical account:', error);
        alert('Failed to delete analytical account. Please check your connection.');
    }
}

// ===== INITIALIZATION =====

/**
 * Initialize analytical accounts page on load
 */
function initAnalyticalAccounts() {
    console.log('🚀 [ANALYTICAL-ACCOUNTS.JS:230] Initializing analytical accounts page...');
    
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
    
    // Load analytical accounts
    loadAnalyticalAccounts();
    
    // Attach event listeners
    const addAccountBtn = document.getElementById('addAnalyticalAccountBtn');
    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', openAddModal);
        console.log('✅ Add analytical account button handler attached');
    }
    
    const accountForm = document.getElementById('analyticalAccountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', handleSaveAccount);
        console.log('✅ Analytical account form handler attached');
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
    
    console.log('✅ [ANALYTICAL-ACCOUNTS.JS:230] Analytical accounts page initialized successfully');
}

// ===== GLOBAL FUNCTIONS =====
// Make functions available globally for onclick handlers
window.openEditModal = openEditModal;
window.handleDeleteAccount = handleDeleteAccount;

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', initAnalyticalAccounts);