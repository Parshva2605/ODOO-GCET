// ========================================
// FILE: contacts.js
// PURPOSE: Contacts management functionality
// FUNCTIONS:
//   Line 20  : checkAuth() - Verify authentication
//   Line 35  : loadContacts() - Fetch and display contacts
//   Line 80  : filterContacts() - Filter by type (all/customer/vendor)
//   Line 100 : openAddModal() - Open modal for new contact
//   Line 115 : openEditModal() - Open modal for edit with data
//   Line 140 : handleSaveContact() - Save new/edited contact
//   Line 200 : handleDeleteContact() - Delete contact
//   Line 230 : initContacts() - Initialize page
// ========================================

// ===== CONFIGURATION =====
const API_BASE_URL = 'http://127.0.0.1:5000/api';
let allContacts = []; // Store all contacts for filtering

// ===== AUTHENTICATION =====

/**
 * Check if user is logged in, redirect to login if not
 */
function checkAuth() {
    console.log('🔐 [CONTACTS.JS:20] Checking authentication...');
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        alert('Please log in to access contacts');
        window.location.href = 'login.html';
        return false;
    }
    
    console.log('✅ User is authenticated');
    return true;
}

// ===== DATA LOADING =====

/**
 * Fetch contacts from backend and display in table
 */
async function loadContacts() {
    console.log('📊 [CONTACTS.JS:35] Loading contacts...');
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ No token available');
        return;
    }
    
    try {
        const response = await fetch(API_BASE_URL + '/contacts', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            allContacts = data.contacts || [];
            console.log('✅ Loaded contacts:', allContacts.length);
            displayContacts(allContacts);
        } else {
            console.log('⚠️ No contacts found or error:', data.message);
            allContacts = [];
            displayContacts([]);
        }
        
    } catch (error) {
        console.error('❌ Error loading contacts:', error);
        allContacts = [];
        displayContacts([]);
    }
}

/**
 * Render contacts in table
 * @param {Array} contacts - Array of contact objects
 */
function displayContacts(contacts) {
    console.log('📋 [CONTACTS.JS:70] Displaying contacts:', contacts.length);
    
    const tbody = document.getElementById('contactsTableBody');
    
    if (!tbody) {
        console.error('❌ Table body not found');
        return;
    }
    
    if (!contacts || contacts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-address-book fa-3x mb-3"></i>
                    <p>No contacts found. Click "Add Contact" to create one.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = contacts.map(contact => {
        const typeBadge = contact.contact_type === 'customer' 
            ? '<span class="badge bg-success">Customer</span>'
            : '<span class="badge bg-primary">Vendor</span>';
        
        return `
            <tr>
                <td>${contact.name}</td>
                <td>${typeBadge}</td>
                <td>${contact.email || '-'}</td>
                <td>${contact.phone || '-'}</td>
                <td>${contact.company_name || '-'}</td>
                <td>${contact.gstin || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditModal(${contact.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="handleDeleteContact(${contact.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== FILTERING =====

/**
 * Filter contacts by type
 * @param {string} type - 'all', 'customer', or 'vendor'
 */
function filterContacts(type) {
    console.log('🔍 [CONTACTS.JS:80] Filtering by:', type);
    
    let filtered;
    
    if (type === 'all') {
        filtered = allContacts;
    } else {
        filtered = allContacts.filter(contact => contact.contact_type === type);
    }
    
    displayContacts(filtered);
    
    // Update active tab styling
    document.querySelectorAll('#contactTabs .nav-link').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`#contactTabs .nav-link[data-filter="${type}"]`).classList.add('active');
}

// ===== MODAL FUNCTIONS =====

/**
 * Open modal for adding new contact
 */
function openAddModal() {
    console.log('➕ [CONTACTS.JS:100] Opening add contact modal');
    
    // Clear form
    document.getElementById('contactForm').reset();
    document.getElementById('contactId').value = '';
    
    // Set modal title
    document.getElementById('modalTitle').textContent = 'Add Contact';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('contactModal'));
    modal.show();
}

/**
 * Open modal with contact data for editing
 * @param {number} contactId - ID of contact to edit
 */
function openEditModal(contactId) {
    console.log('✏️ [CONTACTS.JS:115] Opening edit modal for contact:', contactId);
    
    const contact = allContacts.find(c => c.id === contactId);
    
    if (!contact) {
        console.error('❌ Contact not found:', contactId);
        alert('Contact not found');
        return;
    }
    
    // Fill form fields
    document.getElementById('contactId').value = contact.id;
    document.getElementById('contactType').value = contact.contact_type;
    document.getElementById('contactName').value = contact.name;
    document.getElementById('contactEmail').value = contact.email || '';
    document.getElementById('contactPhone').value = contact.phone || '';
    document.getElementById('contactCompany').value = contact.company_name || '';
    document.getElementById('contactGstin').value = contact.gstin || '';
    
    // Set modal title
    document.getElementById('modalTitle').textContent = 'Edit Contact';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('contactModal'));
    modal.show();
}

// ===== CRUD OPERATIONS =====

/**
 * Save new or update existing contact
 * @param {Event} event - Form submit event
 */
async function handleSaveContact(event) {
    event.preventDefault();
    console.log('💾 [CONTACTS.JS:140] Saving contact...');
    
    // Get form values
    const contactId = document.getElementById('contactId').value;
    const contactData = {
        contact_type: document.getElementById('contactType').value,
        name: document.getElementById('contactName').value.trim(),
        email: document.getElementById('contactEmail').value.trim() || null,
        phone: document.getElementById('contactPhone').value.trim() || null,
        company_name: document.getElementById('contactCompany').value.trim() || null,
        gstin: document.getElementById('contactGstin').value.trim() || null
    };
    
    // Validate required fields
    if (!contactData.contact_type || !contactData.name) {
        alert('Please fill all required fields (Type and Name)');
        return;
    }
    
    // Determine if add or edit
    const isEdit = contactId ? true : false;
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit 
        ? API_BASE_URL + '/contacts/' + contactId
        : API_BASE_URL + '/contacts';
    
    // Show loading state
    const saveBtn = document.getElementById('saveContactBtn');
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
            body: JSON.stringify(contactData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Contact saved successfully');
            alert(isEdit ? 'Contact updated successfully!' : 'Contact added successfully!');
            
            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('contactModal'));
            modal.hide();
            
            // Reload contacts
            loadContacts();
        } else {
            console.error('❌ Error saving contact:', data.message);
            alert('Error: ' + (data.message || 'Failed to save contact'));
        }
        
    } catch (error) {
        console.error('❌ Network error saving contact:', error);
        alert('Failed to save contact. Please check your connection.');
    } finally {
        // Reset button state
        saveBtn.disabled = false;
        saveText.textContent = 'Save Contact';
        saveSpinner.style.display = 'none';
    }
}

/**
 * Delete contact with confirmation
 * @param {number} contactId - ID of contact to delete
 */
async function handleDeleteContact(contactId) {
    console.log('🗑️ [CONTACTS.JS:200] Deleting contact:', contactId);
    
    const contact = allContacts.find(c => c.id === contactId);
    
    if (!contact) {
        console.error('❌ Contact not found:', contactId);
        alert('Contact not found');
        return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${contact.name}"?\n\nThis action cannot be undone.`)) {
        console.log('❌ Delete cancelled by user');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(API_BASE_URL + '/contacts/' + contactId, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Contact deleted successfully');
            alert('Contact deleted successfully!');
            loadContacts(); // Reload list
        } else {
            console.error('❌ Error deleting contact:', data.message);
            alert('Error: ' + (data.message || 'Failed to delete contact'));
        }
        
    } catch (error) {
        console.error('❌ Network error deleting contact:', error);
        alert('Failed to delete contact. Please check your connection.');
    }
}

// ===== INITIALIZATION =====

/**
 * Initialize contacts page on load
 */
function initContacts() {
    console.log('🚀 [CONTACTS.JS:230] Initializing contacts page...');
    
    // Check authentication
    if (!checkAuth()) {
        return;
    }
    
    // Load user info (from dashboard.js pattern)
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
    
    // Load contacts
    loadContacts();
    
    // Attach event listeners
    const addContactBtn = document.getElementById('addContactBtn');
    if (addContactBtn) {
        addContactBtn.addEventListener('click', openAddModal);
        console.log('✅ Add contact button handler attached');
    }
    
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleSaveContact);
        console.log('✅ Contact form handler attached');
    }
    
    // Attach tab click handlers
    document.querySelectorAll('#contactTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const filter = tab.getAttribute('data-filter');
            filterContacts(filter);
        });
    });
    console.log('✅ Tab handlers attached');
    
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
    
    console.log('✅ [CONTACTS.JS:230] Contacts page initialized successfully');
}

// ===== GLOBAL FUNCTIONS =====
// Make functions available globally for onclick handlers
window.openEditModal = openEditModal;
window.handleDeleteContact = handleDeleteContact;

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', initContacts);