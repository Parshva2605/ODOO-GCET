// ============================================
// REPORTS.JS - Simple & Clean
// ============================================

const API_URL = 'http://127.0.0.1:5000';

// Auth check
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Logout
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

// Get token
function getToken() {
    return localStorage.getItem('token');
}

// Format number
function formatNumber(num) {
    return parseFloat(num || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.report-tab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    
    // Show selected tab
    document.getElementById('content-' + tab).style.display = 'block';
    document.getElementById('tab-' + tab).classList.add('active');
    
    console.log('Switched to tab:', tab);
}

// ============================================
// LOAD DROPDOWNS
// ============================================
async function loadAccounts() {
    try {
        const response = await fetch(API_URL + '/api/accounts', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        
        if (response.ok) {
            const accounts = await response.json();
            const select = document.getElementById('gl-account');
            select.innerHTML = '<option value="">All Accounts</option>';
            
            accounts.forEach(acc => {
                const option = document.createElement('option');
                option.value = acc.id;
                option.textContent = acc.code + ' - ' + acc.name;
                select.appendChild(option);
            });
            
            console.log('✅ Loaded', accounts.length, 'accounts');
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

async function loadAnalyticalAccounts() {
    try {
        const response = await fetch(API_URL + '/api/analytical-accounts', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        
        if (response.ok) {
            const accounts = await response.json();
            const select = document.getElementById('ar-analytical');
            select.innerHTML = '<option value="">All Accounts</option>';
            
            accounts.forEach(acc => {
                const option = document.createElement('option');
                option.value = acc.id;
                option.textContent = acc.name;
                select.appendChild(option);
            });
            
            console.log('✅ Loaded', accounts.length, 'analytical accounts');
        }
    } catch (error) {
        console.error('Error loading analytical accounts:', error);
    }
}

// ============================================
// GENERAL LEDGER REPORT
// ============================================
async function generateGL() {
    const accountId = document.getElementById('gl-account').value;
    const startDate = document.getElementById('gl-start').value;
    const endDate = document.getElementById('gl-end').value;
    
    const resultDiv = document.getElementById('gl-result');
    resultDiv.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-3x"></i><p class="mt-3">Generating report...</p></div>';
    
    console.log('📊 Generating General Ledger...', { accountId, startDate, endDate });
    
    try {
        const response = await fetch(API_URL + '/api/reports/general-ledger', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account_id: accountId || null,
                start_date: startDate || null,
                end_date: endDate || null
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate report');
        }
        
        const data = await response.json();
        
        if (data.length === 0) {
            resultDiv.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-inbox fa-3x mb-3"></i><p>No transactions found</p></div>';
            return;
        }
        
        // Group by account
        const grouped = {};
        data.forEach(row => {
            const key = row.account_code;
            if (!grouped[key]) {
                grouped[key] = {
                    code: row.account_code,
                    name: row.account_name,
                    rows: [],
                    totalDebit: 0,
                    totalCredit: 0
                };
            }
            grouped[key].rows.push(row);
            grouped[key].totalDebit += parseFloat(row.debit || 0);
            grouped[key].totalCredit += parseFloat(row.credit || 0);
        });
        
        // Build HTML
        let html = '<h5 class="mb-3">General Ledger Report</h5>';
        html += '<p class="text-muted small">Period: ' + (startDate ? formatDate(startDate) : 'Beginning') + ' to ' + (endDate ? formatDate(endDate) : 'Today') + '</p>';
        
        Object.values(grouped).forEach(group => {
            html += '<div class="mb-4">';
            html += '<h6 class="bg-light p-2">' + group.code + ' - ' + escapeHtml(group.name) + '</h6>';
            html += '<table class="table table-sm table-bordered">';
            html += '<thead class="table-light"><tr><th>Date</th><th>Reference</th><th>Label</th><th class="text-end">Debit</th><th class="text-end">Credit</th></tr></thead>';
            html += '<tbody>';
            
            group.rows.forEach(row => {
                html += '<tr>';
                html += '<td>' + formatDate(row.date) + '</td>';
                html += '<td>' + escapeHtml(row.reference) + '</td>';
                html += '<td>' + escapeHtml(row.label) + '</td>';
                html += '<td class="text-end">' + (row.debit > 0 ? '₹' + formatNumber(row.debit) : '-') + '</td>';
                html += '<td class="text-end">' + (row.credit > 0 ? '₹' + formatNumber(row.credit) : '-') + '</td>';
                html += '</tr>';
            });
            
            html += '</tbody>';
            html += '<tfoot class="table-light fw-bold"><tr><td colspan="3" class="text-end">TOTAL:</td><td class="text-end">₹' + formatNumber(group.totalDebit) + '</td><td class="text-end">₹' + formatNumber(group.totalCredit) + '</td></tr></tfoot>';
            html += '</table></div>';
        });
        
        resultDiv.innerHTML = html;
        console.log('✅ General Ledger displayed');
        
    } catch (error) {
        console.error('❌ Error:', error);
        resultDiv.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> Error: ' + error.message + '</div>';
    }
}

// ============================================
// TRIAL BALANCE REPORT
// ============================================
async function generateTB() {
    const asOfDate = document.getElementById('tb-date').value;
    
    const resultDiv = document.getElementById('tb-result');
    resultDiv.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-3x"></i><p class="mt-3">Generating report...</p></div>';
    
    console.log('📊 Generating Trial Balance...', { asOfDate });
    
    try {
        const response = await fetch(API_URL + '/api/reports/trial-balance', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                as_of_date: asOfDate || null
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate report');
        }
        
        const data = await response.json();
        
        if (data.length === 0) {
            resultDiv.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-inbox fa-3x mb-3"></i><p>No accounts found</p></div>';
            return;
        }
        
        let totalDebit = 0;
        let totalCredit = 0;
        
        let html = '<h5 class="mb-3">Trial Balance</h5>';
        html += '<p class="text-muted small">As of: ' + (asOfDate ? formatDate(asOfDate) : 'Today') + '</p>';
        html += '<table class="table table-bordered">';
        html += '<thead class="table-light"><tr><th>Code</th><th>Account Name</th><th>Type</th><th class="text-end">Debit</th><th class="text-end">Credit</th></tr></thead>';
        html += '<tbody>';
        
        data.forEach(row => {
            const debit = parseFloat(row.total_debit || 0);
            const credit = parseFloat(row.total_credit || 0);
            
            if (debit > 0 || credit > 0) {
                totalDebit += debit;
                totalCredit += credit;
                
                html += '<tr>';
                html += '<td>' + row.code + '</td>';
                html += '<td>' + escapeHtml(row.name) + '</td>';
                html += '<td><span class="badge bg-secondary">' + row.type + '</span></td>';
                html += '<td class="text-end">' + (debit > 0 ? '₹' + formatNumber(debit) : '-') + '</td>';
                html += '<td class="text-end">' + (credit > 0 ? '₹' + formatNumber(credit) : '-') + '</td>';
                html += '</tr>';
            }
        });
        
        html += '</tbody>';
        html += '<tfoot class="table-light fw-bold"><tr><td colspan="3" class="text-end">TOTAL:</td><td class="text-end">₹' + formatNumber(totalDebit) + '</td><td class="text-end">₹' + formatNumber(totalCredit) + '</td></tr></tfoot>';
        html += '</table>';
        
        const diff = Math.abs(totalDebit - totalCredit);
        const balanced = diff < 0.01;
        
        html += '<div class="alert alert-' + (balanced ? 'success' : 'danger') + ' mt-3">';
        html += '<strong><i class="fas fa-' + (balanced ? 'check-circle' : 'exclamation-triangle') + '"></i> ';
        html += balanced ? 'Books are BALANCED!' : 'Books are NOT balanced!';
        html += '</strong><br>Difference: ₹' + formatNumber(diff) + '</div>';
        
        resultDiv.innerHTML = html;
        console.log('✅ Trial Balance displayed');
        
    } catch (error) {
        console.error('❌ Error:', error);
        resultDiv.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> Error: ' + error.message + '</div>';
    }
}

// ============================================
// ANALYTICAL REPORT
// ============================================
async function generateAR() {
    const analyticalId = document.getElementById('ar-analytical').value;
    const startDate = document.getElementById('ar-start').value;
    const endDate = document.getElementById('ar-end').value;
    
    const resultDiv = document.getElementById('ar-result');
    resultDiv.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-3x"></i><p class="mt-3">Generating report...</p></div>';
    
    console.log('📊 Generating Analytical Report...', { analyticalId, startDate, endDate });
    
    try {
        const response = await fetch(API_URL + '/api/reports/analytical', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                analytical_id: analyticalId || null,
                start_date: startDate || null,
                end_date: endDate || null
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate report');
        }
        
        const data = await response.json();
        
        // Filter out null entries
        const filtered = data.filter(row => row.date);
        
        if (filtered.length === 0) {
            resultDiv.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-inbox fa-3x mb-3"></i><p>No analytical transactions found</p></div>';
            return;
        }
        
        // Group by analytical account
        const grouped = {};
        filtered.forEach(row => {
            const key = row.analytical_name;
            if (!grouped[key]) {
                grouped[key] = {
                    name: row.analytical_name,
                    rows: [],
                    totalDebit: 0,
                    totalCredit: 0
                };
            }
            grouped[key].rows.push(row);
            grouped[key].totalDebit += parseFloat(row.debit || 0);
            grouped[key].totalCredit += parseFloat(row.credit || 0);
        });
        
        let html = '<h5 class="mb-3">Analytical Report</h5>';
        html += '<p class="text-muted small">Period: ' + (startDate ? formatDate(startDate) : 'Beginning') + ' to ' + (endDate ? formatDate(endDate) : 'Today') + '</p>';
        
        Object.values(grouped).forEach(group => {
            html += '<div class="mb-4">';
            html += '<h6 class="bg-light p-2">' + escapeHtml(group.name) + '</h6>';
            html += '<table class="table table-sm table-bordered">';
            html += '<thead class="table-light"><tr><th>Date</th><th>Reference</th><th>Label</th><th class="text-end">Debit</th><th class="text-end">Credit</th></tr></thead>';
            html += '<tbody>';
            
            group.rows.forEach(row => {
                html += '<tr>';
                html += '<td>' + formatDate(row.date) + '</td>';
                html += '<td>' + escapeHtml(row.reference) + '</td>';
                html += '<td>' + escapeHtml(row.label) + '</td>';
                html += '<td class="text-end">' + (row.debit > 0 ? '₹' + formatNumber(row.debit) : '-') + '</td>';
                html += '<td class="text-end">' + (row.credit > 0 ? '₹' + formatNumber(row.credit) : '-') + '</td>';
                html += '</tr>';
            });
            
            html += '</tbody>';
            html += '<tfoot class="table-light fw-bold"><tr><td colspan="3" class="text-end">TOTAL:</td><td class="text-end">₹' + formatNumber(group.totalDebit) + '</td><td class="text-end">₹' + formatNumber(group.totalCredit) + '</td></tr></tfoot>';
            html += '</table></div>';
        });
        
        resultDiv.innerHTML = html;
        console.log('✅ Analytical Report displayed');
        
    } catch (error) {
        console.error('❌ Error:', error);
        resultDiv.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> Error: ' + error.message + '</div>';
    }
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Reports page loading...');
    
    if (!checkAuth()) {
        return;
    }
    
    // Load user email
    const token = getToken();
    fetch(API_URL + '/api/auth/profile', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(r => r.json())
    .then(user => {
        document.getElementById('userEmail').textContent = user.email;
    });
    
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
    
    // Load dropdowns
    loadAccounts();
    loadAnalyticalAccounts();
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    document.getElementById('gl-start').value = firstDay;
    document.getElementById('gl-end').value = today;
    document.getElementById('tb-date').value = today;
    document.getElementById('ar-start').value = firstDay;
    document.getElementById('ar-end').value = today;
    
    console.log('✅ Reports page ready!');
});