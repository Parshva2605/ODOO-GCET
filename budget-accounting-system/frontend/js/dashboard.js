// ========================================
// FILE: dashboard.js
// PURPOSE: Dashboard functionality and data loading
// FUNCTIONS:
//   Line 20  : checkAuth() - Verify user is logged in
//   Line 45  : loadUserInfo() - Display user name and email
//   Line 70  : loadStatistics() - Fetch and display stats
//   Line 120 : handleLogout() - Logout functionality
//   Line 140 : initDashboard() - Initialize on page load
// ========================================

// ===== CONFIGURATION =====
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// ===== AUTHENTICATION FUNCTIONS =====

/**
 * Check if user is logged in, redirect to login if not
 * @returns {string|null} - JWT token if authenticated
 */
function checkAuth() {
    console.log('🔐 [DASHBOARD.JS:20] Checking authentication...');
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        alert('Please log in to access the dashboard');
        window.location.href = 'login.html';
        return null;
    }
    
    console.log('✅ User is authenticated');
    return token;
}

/**
 * Load and display logged-in user's information
 */
function loadUserInfo() {
    console.log('👤 [DASHBOARD.JS:45] Loading user info...');
    
    try {
        const userStr = localStorage.getItem('user');
        
        if (!userStr) {
            console.log('❌ No user data found');
            return;
        }
        
        const user = JSON.parse(userStr);
        
        // Update UI elements
        const userNameElement = document.getElementById('userName');
        const userEmailElement = document.getElementById('userEmail');
        
        if (userNameElement) {
            userNameElement.textContent = user.name || 'Unknown User';
        }
        
        if (userEmailElement) {
            userEmailElement.textContent = user.email || 'No email';
        }
        
        console.log('✅ [DASHBOARD.JS:45] User info loaded:', user.name);
        
    } catch (error) {
        console.error('❌ Error loading user info:', error);
        document.getElementById('userName').textContent = 'Error loading user';
        document.getElementById('userEmail').textContent = 'Please refresh';
    }
}

// ===== DATA LOADING FUNCTIONS =====

/**
 * Fetch statistics from backend and update stat cards
 */
async function loadStatistics() {
    console.log('📊 [DASHBOARD.JS:70] Loading statistics...');
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ No token available for API calls');
        return;
    }
    
    try {
        // Set loading state
        document.getElementById('totalBudgets').textContent = '...';
        document.getElementById('totalContacts').textContent = '...';
        document.getElementById('totalProducts').textContent = '...';
        document.getElementById('totalPurchaseOrders').textContent = '...';
        
        // Fetch budgets count
        try {
            const budgetResponse = await fetch(API_BASE_URL + '/budgets/count', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (budgetResponse.ok) {
                const budgetData = await budgetResponse.json();
                document.getElementById('totalBudgets').textContent = budgetData.count || 0;
            } else {
                document.getElementById('totalBudgets').textContent = '0';
            }
        } catch (error) {
            console.log('⚠️ Budgets API not available yet');
            document.getElementById('totalBudgets').textContent = '0';
        }
        
        // Fetch contacts count
        try {
            const contactResponse = await fetch(API_BASE_URL + '/contacts/count', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (contactResponse.ok) {
                const contactData = await contactResponse.json();
                document.getElementById('totalContacts').textContent = contactData.count || 0;
            } else {
                document.getElementById('totalContacts').textContent = '0';
            }
        } catch (error) {
            console.log('⚠️ Contacts API not available yet');
            document.getElementById('totalContacts').textContent = '0';
        }
        
        // Fetch products count
        try {
            const productResponse = await fetch(API_BASE_URL + '/products/count', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (productResponse.ok) {
                const productData = await productResponse.json();
                document.getElementById('totalProducts').textContent = productData.count || 0;
            } else {
                document.getElementById('totalProducts').textContent = '0';
            }
        } catch (error) {
            console.log('⚠️ Products API not available yet');
            document.getElementById('totalProducts').textContent = '0';
        }
        
        // Fetch purchase orders count
        try {
            const poResponse = await fetch(API_BASE_URL + '/purchase-orders/count', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (poResponse.ok) {
                const poData = await poResponse.json();
                document.getElementById('totalPurchaseOrders').textContent = poData.count || 0;
            } else {
                document.getElementById('totalPurchaseOrders').textContent = '0';
            }
        } catch (error) {
            console.log('⚠️ Purchase Orders API not available yet');
            document.getElementById('totalPurchaseOrders').textContent = '0';
        }
        
        console.log('✅ [DASHBOARD.JS:70] Statistics loaded successfully');
        
    } catch (error) {
        console.error('❌ [DASHBOARD.JS:70] Error loading statistics:', error);
        
        // Set all to 0 if error
        document.getElementById('totalBudgets').textContent = '0';
        document.getElementById('totalContacts').textContent = '0';
        document.getElementById('totalProducts').textContent = '0';
        document.getElementById('totalPurchaseOrders').textContent = '0';
    }
}

/**
 * Load recent activity placeholder
 */
function loadRecentActivity() {
    console.log('📝 [DASHBOARD.JS:110] Loading recent activity...');
    
    const recentActivityElement = document.getElementById('recentActivity');
    
    if (recentActivityElement) {
        recentActivityElement.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-clock fa-3x text-muted mb-3"></i>
                <p class="text-muted">No recent activity yet. Start by creating contacts or budgets!</p>
                <div class="mt-3">
                    <button class="btn btn-primary btn-sm me-2" onclick="window.location.href='contacts.html'">
                        <i class="fas fa-plus"></i> Add Contact
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="window.location.href='budgets.html'">
                        <i class="fas fa-plus"></i> Create Budget
                    </button>
                </div>
            </div>
        `;
    }
    
    console.log('📝 [DASHBOARD.JS:110] Recent activity placeholder loaded');
}

// ===== LOGOUT FUNCTIONALITY =====

/**
 * Clear user data and redirect to login
 */
function handleLogout() {
    console.log('🚪 [DASHBOARD.JS:120] Logging out...');
    
    // Clear stored data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberedEmail'); // Also clear remembered email
    
    console.log('✅ Token and user data cleared');
    
    // Show success message
    alert('Logged out successfully');
    
    // Redirect to login page after short delay
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}

// ===== MOBILE MENU FUNCTIONALITY =====

/**
 * Toggle mobile sidebar
 */
function toggleMobileMenu() {
    console.log('📱 [DASHBOARD.JS:135] Toggling mobile menu...');
    
    const sidebar = document.getElementById('sidebar');
    
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// ===== INITIALIZATION =====

/**
 * Initialize dashboard when page loads
 */
function initDashboard() {
    console.log('🚀 [DASHBOARD.JS:140] Initializing dashboard...');
    
    // Check authentication first
    const token = checkAuth();
    
    if (!token) {
        return; // Will redirect to login
    }
    
    // Load user information
    loadUserInfo();
    
    // Load statistics
    loadStatistics();
    
    // Load recent activity
    loadRecentActivity();
    
    // Attach event handlers
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('✅ Logout button handler attached');
    }
    
    // Attach mobile menu handler
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        console.log('✅ Mobile menu handler attached');
    }
    
    // Close mobile menu when clicking on main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        });
    }
    
    console.log('✅ [DASHBOARD.JS:140] Dashboard initialized successfully');
}

// ===== EVENT LISTENERS =====

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
    console.log('🔄 Navigation detected, checking auth...');
    checkAuth();
});

// Auto-refresh statistics every 5 minutes
setInterval(() => {
    console.log('🔄 Auto-refreshing statistics...');
    loadStatistics();
}, 5 * 60 * 1000); // 5 minutes