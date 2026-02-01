// ============================================
// GLOBAL VARIABLES
// ============================================
let analyticalAccounts = [];
let currentStatus = 'new';
let editingBudgetId = null;

// ============================================
// AUTHENTICATION & INITIALIZATION
// ============================================
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    
    if (userName && user.name) {
        userName.textContent = user.name;
    }
    if (userEmail && user.email) {
        userEmail.textContent = user.email;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Budget page initializing...');
    
    if (!checkAuth()) return;
    
    loadUserInfo();
    await loadAnalyticalAccounts();
    setupTabNavigation();
    setupFormHandler();
    
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
    
    // Load draft budgets by default instead of showing new form
    // Also activate the draft tab
    const draftTab = document.querySelector('[data-status="draft"]');
    if (draftTab) {
        // Remove active from all tabs
        document.querySelectorAll('#budgetTabs .nav-link').forEach(tab => {
            tab.classList.remove('active');
        });
        // Activate draft tab
        draftTab.classList.add('active');
    }
    
    loadBudgetsByStatus('draft');
    
    console.log('✅ Budget page initialized');
});

// ============================================
// LOAD ANALYTICAL ACCOUNTS
// ============================================
async function loadAnalyticalAccounts() {
    const token = localStorage.getItem('token');
    
    console.log('🔄 Loading analytical accounts...');
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/analytical-accounts', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        console.log('📡 API Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            
            console.log('📦 Raw API data:', data);
            console.log('📦 Data type:', typeof data);
            console.log('📦 Is array?', Array.isArray(data));
            
            // Handle different response formats
            let accounts = [];
            
            if (Array.isArray(data)) {
                // Direct array format
                accounts = data;
                console.log('📋 Using direct array format');
            } else if (data && data.success && Array.isArray(data.accounts)) {
                // Wrapped format: {success: true, accounts: [...]}
                accounts = data.accounts;
                console.log('📋 Using wrapped format - extracted accounts array');
            } else if (data && Array.isArray(data.accounts)) {
                // Just accounts property
                accounts = data.accounts;
                console.log('📋 Using accounts property');
            } else {
                console.error('❌ Unexpected data format:', data);
                accounts = [];
            }
            
            analyticalAccounts = accounts;
            console.log('✅ Loaded ' + analyticalAccounts.length + ' analytical accounts');
            
            // Log each account for debugging
            if (analyticalAccounts.length > 0) {
                console.log('📋 First account sample:', analyticalAccounts[0]);
                analyticalAccounts.forEach((acc, index) => {
                    console.log('Account ' + index + ':', {
                        id: acc.id,
                        code: acc.code,
                        name: acc.name
                    });
                });
            } else {
                console.warn('⚠️ No analytical accounts found! Please create some first.');
            }
        } else {
            console.error('❌ Failed to load analytical accounts, status:', response.status);
            analyticalAccounts = [];
        }
    } catch (error) {
        console.error('❌ Error loading analytical accounts:', error);
        analyticalAccounts = [];
    }
    
    // LOG FINAL STATE for debugging
    console.log('📊 Final analyticalAccounts:', analyticalAccounts);
    console.log('📊 Is array?', Array.isArray(analyticalAccounts));
    console.log('📊 Array length:', analyticalAccounts.length);
}

// ============================================
// TAB NAVIGATION
// ============================================
function setupTabNavigation() {
    const tabs = document.querySelectorAll('#budgetTabs .nav-link');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active to clicked
            this.classList.add('active');
            
            const status = this.getAttribute('data-status');
            const tabType = this.getAttribute('data-tab');
            
            currentStatus = status;
            
            // Show/hide filters based on tab type
            const filtersCard = document.getElementById('budgetFiltersCard');
            if (tabType === 'form') {
                // Hide filters for New Budget tab
                if (filtersCard) filtersCard.style.display = 'none';
                showNewBudgetForm();
            } else {
                // Show filters for list tabs
                if (filtersCard) filtersCard.style.display = 'block';
                loadBudgetsByStatus(status);
            }
        });
    });
    
    console.log('✅ Tab navigation setup complete');
}

// ============================================
// SHOW NEW BUDGET FORM
// ============================================
function showNewBudgetForm() {
    document.getElementById('budgetFormView').style.display = 'block';
    document.getElementById('budgetListView').style.display = 'none';
    
    // Hide filters for New Budget form
    const filtersCard = document.getElementById('budgetFiltersCard');
    if (filtersCard) filtersCard.style.display = 'none';
    
    // Clear form completely
    document.getElementById('budgetForm').reset();
    document.getElementById('budgetId').value = ''; // Explicitly clear
    document.getElementById('budgetStatus').value = 'draft'; // Set default status
    document.getElementById('budgetLinesBody').innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted">
                <i class="fas fa-info-circle"></i>
                Click "Add Line" to add budget lines
            </td>
        </tr>
    `;
    
    // Clear any validation errors
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelector('#budgetLinesBody').style.border = '';
    
    // Reset totals
    document.getElementById('totalPlanned').textContent = '₹0.00';
    document.getElementById('totalAchieved').textContent = '₹0.00';
    document.getElementById('totalPercentage').textContent = '0%';
    document.getElementById('totalToAchieve').textContent = '₹0.00';
    
    document.getElementById('formTitle').textContent = 'Create New Budget';
    document.getElementById('revisionInfo').style.display = 'none';
    
    // Hide refresh button for new budgets
    document.getElementById('refreshAchievementsBtn').style.display = 'none';
    
    // Clear editing state
    editingBudgetId = null;
    
    console.log('✅ New budget form displayed and cleared');
    console.log('📝 Budget ID field value:', document.getElementById('budgetId').value);
    console.log('📝 Budget status set to:', document.getElementById('budgetStatus').value);
    console.log('📝 Editing budget ID:', editingBudgetId);
}

window.showNewBudgetForm = showNewBudgetForm;

// ============================================
// LOAD BUDGETS BY STATUS
// ============================================
async function loadBudgetsByStatus(status) {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('budgetListBody');
    
    console.log('🔄 Loading budgets with status:', status);
    
    // Show list view
    document.getElementById('budgetFormView').style.display = 'none';
    document.getElementById('budgetListView').style.display = 'block';
    
    // Update list title
    const titles = {
        'draft': 'Draft Budgets',
        'confirm': 'Confirmed Budgets',
        'revised': 'Revised Budgets',
        'archived': 'Archived Budgets'
    };
    document.getElementById('listTitle').textContent = titles[status] || 'Budgets';
    
    // Show loading
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading budgets...</p>
            </td>
        </tr>
    `;
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/budgets?status=' + status, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const budgets = await response.json();
            
            // Cache and display with filters applied
            cacheAndDisplayBudgets(budgets);
            
            // Show chart for first budget if available
            if (budgets.length > 0) {
                showBudgetChart(budgets[0].id);
                
                // Highlight first row
                setTimeout(() => {
                    const firstRow = document.querySelector('#budgetListBody tr');
                    if (firstRow) {
                        firstRow.classList.add('table-active');
                    }
                }, 100);
            } else {
                showChartMessage('No budgets to display');
            }
            
            console.log('✅ Loaded budgets:', budgets.length);
        } else {
            displayBudgetList([], status);
            showChartMessage('No budgets found');
        }
    } catch (error) {
        console.error('❌ Error loading budgets:', error);
        displayBudgetList([], status);
        showChartMessage('Failed to load budgets');
    }
}

// ============================================
// DISPLAY BUDGET LIST
// ============================================
function displayBudgetList(budgets, status) {
    const tbody = document.getElementById('budgetListBody');
    tbody.innerHTML = '';
    
    if (budgets.length === 0) {
        const searchTerm = document.getElementById('budgetSearchInput').value;
        const hasFilters = searchTerm ||
                          document.getElementById('filterStartDate').value ||
                          document.getElementById('filterEndDate').value;
        
        if (hasFilters) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-search fa-3x mb-3 d-block"></i>
                        <p class="mb-2">No budgets match your search criteria</p>
                        <button class="btn btn-sm btn-secondary" onclick="clearFilters()">
                            <i class="fas fa-times"></i> Clear Filters
                        </button>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-info-circle"></i>
                        No ${status} budgets found. Create a new budget to get started.
                    </td>
                </tr>
            `;
        }
        return;
    }
    
    budgets.forEach(budget => {
        const row = document.createElement('tr');
        
        // Make row clickable to show chart
        row.style.cursor = 'pointer';
        row.onclick = function(e) {
            // Don't trigger if clicking action buttons
            if (e.target.closest('button')) {
                return;
            }
            showBudgetChart(budget.id);
            
            // Highlight selected row
            document.querySelectorAll('#budgetListBody tr').forEach(r => {
                r.classList.remove('table-active');
            });
            row.classList.add('table-active');
        };
        
        const statusBadge = {
            'draft': 'secondary',
            'confirm': 'success',
            'revised': 'warning',
            'archived': 'dark'
        };
        
        const statusColor = statusBadge[budget.status] || 'secondary';
        
        // Build action buttons based on status
        let actionButtons = `
            <button class="btn btn-sm btn-info" onclick="viewBudget(${budget.id})" title="View">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-primary" onclick="generateReport(${budget.id})" title="Generate Report">
                <i class="fas fa-file-pdf"></i>
            </button>
        `;
        
        // Only show edit for non-archived budgets
        if (budget.status !== 'archived') {
            actionButtons += `
                <button class="btn btn-sm btn-warning" onclick="editBudget(${budget.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
            `;
        }
        
        if (budget.status === 'draft') {
            actionButtons += `
                <button class="btn btn-sm btn-success" onclick="confirmBudget(${budget.id})" title="Confirm">
                    <i class="fas fa-check"></i>
                </button>
            `;
        }
        
        if (budget.status === 'confirm') {
            actionButtons += `
                <button class="btn btn-sm btn-brown" onclick="reviseBudget(${budget.id})" title="Revise">
                    <i class="fas fa-history"></i>
                </button>
            `;
        }
        
        // Show different buttons for archived budgets
        if (budget.status === 'archived') {
            actionButtons += `
                <button class="btn btn-sm btn-success" onclick="restoreBudget(${budget.id})" title="Restore to Draft">
                    <i class="fas fa-undo"></i> Restore
                </button>
            `;
        } else {
            actionButtons += `
                <button class="btn btn-sm btn-danger" onclick="deleteBudget(${budget.id})" title="Archive">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
        
        row.innerHTML = `
            <td><strong>${escapeHtml(budget.name)}</strong></td>
            <td>${formatDate(budget.start_date)}</td>
            <td>${formatDate(budget.end_date)}</td>
            <td><span class="badge bg-${statusColor}">${budget.status}</span></td>
            <td><strong>₹${formatNumber(budget.total_planned || 0)}</strong></td>
            <td>₹${formatNumber(budget.total_achieved || 0)}</td>
            <td class="table-actions">${actionButtons}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log('✅ Displayed ' + budgets.length + ' budgets');
}

// ============================================
// ADD BUDGET LINE (Dynamic Row)
// ============================================
function addBudgetLine(lineData = null) {
    console.log('➕ Adding budget line...');
    
    // Check if analytical accounts loaded
    if (!analyticalAccounts || analyticalAccounts.length === 0) {
        // Show inline warning message
        const tbody = document.getElementById('budgetLinesBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="alert alert-warning d-inline-block">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>No Analytical Accounts Found!</strong><br>
                        Please go to <a href="analytical-accounts.html" class="alert-link">Analytical Accounts</a> page and create accounts first.
                    </div>
                </td>
            </tr>
        `;
        console.warn('⚠️ No analytical accounts available');
        return;
    }
    
    const tbody = document.getElementById('budgetLinesBody');
    
    // Remove "no lines" message if exists
    const noLinesRow = tbody.querySelector('td[colspan="7"]');
    if (noLinesRow) {
        tbody.innerHTML = '';
    }
    
    const row = document.createElement('tr');
    
    // Build analytical account dropdown
    let accountOptions = '<option value="">-- Select Analytical Account --</option>';
    
    // SAFE CHECK: Make sure analyticalAccounts is actually an array
    if (Array.isArray(analyticalAccounts) && analyticalAccounts.length > 0) {
        console.log('🔧 Building dropdown with', analyticalAccounts.length, 'accounts');
        
        analyticalAccounts.forEach((acc, index) => {
            // Handle different account data formats
            const accountId = acc.id || acc.account_id;
            const accountCode = acc.code || acc.account_code || `ACC${accountId}`;
            const accountName = acc.name || acc.account_name || 'Unnamed Account';
            
            console.log('Processing account', index, ':', {id: accountId, code: accountCode, name: accountName});
            
            if (accountId) {
                const selected = lineData && lineData.analytical_account_id === accountId ? 'selected' : '';
                const displayText = accountCode ? `${accountCode} - ${accountName}` : accountName;
                accountOptions += `<option value="${accountId}" ${selected}>${displayText}</option>`;
            }
        });
        
        console.log('✅ Dropdown built successfully with', analyticalAccounts.length, 'options');
    } else {
        // If no accounts, show error message
        accountOptions += '<option value="" disabled>No analytical accounts available - Please create some first</option>';
        console.error('❌ analyticalAccounts is not a valid array:', {
            type: typeof analyticalAccounts,
            isArray: Array.isArray(analyticalAccounts),
            length: analyticalAccounts ? analyticalAccounts.length : 'N/A',
            data: analyticalAccounts
        });
    }
    
    row.innerHTML = `
        <td>
            <select class="form-control line-analytical-account" required>
                ${accountOptions}
            </select>
        </td>
        <td>
            <select class="form-control line-type" required>
                <option value="expense" ${!lineData || lineData.type === 'expense' ? 'selected' : ''}>Expense</option>
                <option value="income" ${lineData && lineData.type === 'income' ? 'selected' : ''}>Income</option>
            </select>
        </td>
        <td>
            <input type="number" class="form-control line-planned-amount" step="0.01" min="0.01"
                    value="${lineData ? lineData.planned_amount : ''}" placeholder="Enter amount" required
                    onchange="calculateBudgetTotals()" oninput="calculateBudgetTotals()">
        </td>
        <td>
            <input type="text" class="form-control bg-light achieved-amount" value="${lineData ? formatNumber(lineData.achieved_amount) : '0.00'}" readonly>
        </td>
        <td>
            <input type="text" class="form-control bg-light achieved-percentage" value="${lineData && lineData.planned_amount > 0 ? ((lineData.achieved_amount / lineData.planned_amount) * 100).toFixed(1) + '%' : '0%'}" readonly>
        </td>
        <td>
            <input type="text" class="form-control bg-light amount-to-achieve" value="${lineData ? formatNumber(Math.max(0, lineData.planned_amount - lineData.achieved_amount)) : '0.00'}" readonly>
        </td>
        <td class="text-center">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeBudgetLine(this)" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(row);
    
    // Calculate totals after adding line
    calculateBudgetTotals();
    
    console.log('✅ Budget line added successfully');
}

window.addBudgetLine = addBudgetLine;

// ============================================
// REMOVE BUDGET LINE
// ============================================
function removeBudgetLine(button) {
    const row = button.closest('tr');
    const tbody = row.parentElement;
    
    row.remove();
    
    // If no rows left, show message
    if (tbody.children.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-info-circle"></i>
                    Click "Add Line" to add budget lines
                </td>
            </tr>
        `;
    }
    
    // Calculate totals after removing line
    calculateBudgetTotals();
    
    console.log('✅ Budget line removed');
}

window.removeBudgetLine = removeBudgetLine;

// ============================================
// CALCULATE BUDGET TOTALS
// ============================================
function calculateBudgetTotals() {
    const lineRows = document.querySelectorAll('#budgetLinesBody tr');
    let totalPlanned = 0;
    let totalAchieved = 0;
    
    lineRows.forEach(row => {
        const plannedInput = row.querySelector('.line-planned-amount');
        const achievedInput = row.querySelector('.achieved-amount');
        
        if (plannedInput && achievedInput) {
            const planned = parseFloat(plannedInput.value) || 0;
            // Parse achieved amount, removing currency symbols and commas
            const achievedText = achievedInput.value.replace(/[₹,]/g, '');
            const achieved = parseFloat(achievedText) || 0;
            
            totalPlanned += planned;
            totalAchieved += achieved;
            
            // Update calculated fields for this row
            const percentageInput = row.querySelector('.achieved-percentage');
            const toAchieveInput = row.querySelector('.amount-to-achieve');
            
            if (percentageInput) {
                const percentage = planned > 0 ? ((achieved / planned) * 100).toFixed(1) : 0;
                percentageInput.value = percentage + '%';
            }
            
            if (toAchieveInput) {
                const toAchieve = Math.max(0, planned - achieved);
                toAchieveInput.value = formatNumber(toAchieve);
            }
        }
    });
    
    // Calculate percentage and amount to achieve
    const totalPercentage = totalPlanned > 0 ? ((totalAchieved / totalPlanned) * 100) : 0;
    const totalToAchieve = Math.max(0, totalPlanned - totalAchieved);
    
    // Update totals display
    document.getElementById('totalPlanned').textContent = '₹' + formatNumber(totalPlanned);
    document.getElementById('totalAchieved').textContent = '₹' + formatNumber(totalAchieved);
    document.getElementById('totalPercentage').textContent = totalPercentage.toFixed(1) + '%';
    document.getElementById('totalToAchieve').textContent = '₹' + formatNumber(totalToAchieve);
    
    console.log('📊 Totals calculated:', {
        planned: totalPlanned,
        achieved: totalAchieved,
        percentage: totalPercentage.toFixed(1) + '%',
        toAchieve: totalToAchieve
    });
}

window.calculateBudgetTotals = calculateBudgetTotals;

// ============================================
// SETUP FORM HANDLER
// ============================================
function setupFormHandler() {
    document.getElementById('budgetForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveBudget();
    });
    
    console.log('✅ Form handler setup complete');
}

// ============================================
// SAVE BUDGET
// ============================================
async function saveBudget() {
    const token = localStorage.getItem('token');
    const budgetId = document.getElementById('budgetId').value;
    
    console.log('💾 Saving budget...');
    
    // Clear previous validation errors
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    
    // Collect form data
    const budgetData = {
        name: document.getElementById('budgetName').value.trim(),
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        status: document.getElementById('budgetStatus').value,
        lines: []
    };
    
    // Validate
    if (!budgetData.name) {
        document.getElementById('budgetName').classList.add('is-invalid');
        console.error('Budget name is required');
        return;
    }
    
    if (!budgetData.start_date || !budgetData.end_date) {
        if (!budgetData.start_date) document.getElementById('startDate').classList.add('is-invalid');
        if (!budgetData.end_date) document.getElementById('endDate').classList.add('is-invalid');
        console.error('Start date and end date are required');
        return;
    }
    
    if (new Date(budgetData.start_date) >= new Date(budgetData.end_date)) {
        document.getElementById('startDate').classList.add('is-invalid');
        document.getElementById('endDate').classList.add('is-invalid');
        console.error('End date must be after start date');
        return;
    }
    
    // Collect lines
    const lineRows = document.querySelectorAll('#budgetLinesBody tr');
    
    lineRows.forEach(row => {
        const accountSelect = row.querySelector('.line-analytical-account');
        const typeSelect = row.querySelector('.line-type');
        const amountInput = row.querySelector('.line-planned-amount');
        
        if (accountSelect && typeSelect && amountInput) {
            const accountId = parseInt(accountSelect.value);
            const type = typeSelect.value;
            const amount = parseFloat(amountInput.value);
            
            if (accountId && type && amount > 0) {
                budgetData.lines.push({
                    analytical_account_id: accountId,
                    type: type,
                    planned_amount: amount
                });
            }
        }
    });
    
    if (budgetData.lines.length === 0) {
        // Highlight the budget lines section
        document.querySelector('#budgetLinesBody').style.border = '2px solid #dc3545';
        setTimeout(() => {
            document.querySelector('#budgetLinesBody').style.border = '';
        }, 3000);
        console.error('Please add at least one budget line with planned amount > 0');
        return;
    }
    
    console.log('📤 Budget data:', budgetData);
    
    try {
        const url = budgetId ? 'http://127.0.0.1:5000/api/budgets/' + budgetId : 'http://127.0.0.1:5000/api/budgets';
        const method = budgetId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(budgetData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Budget saved successfully!');
            
            // CLEAR FORM completely after save
            document.getElementById('budgetForm').reset();
            document.getElementById('budgetId').value = '';
            document.getElementById('budgetStatus').value = 'draft'; // Reset to default status
            document.getElementById('budgetLinesBody').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-info-circle"></i>
                        Click "Add Line" to add budget lines
                    </td>
                </tr>
            `;
            
            // Clear validation errors
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            document.querySelector('#budgetLinesBody').style.border = '';
            
            // Reset totals
            document.getElementById('totalPlanned').textContent = '₹0.00';
            document.getElementById('totalAchieved').textContent = '₹0.00';
            document.getElementById('totalPercentage').textContent = '0%';
            document.getElementById('totalToAchieve').textContent = '₹0.00';
            
            editingBudgetId = null;
            
            console.log('🧹 Form cleared after successful save');
            console.log('📝 Budget ID field cleared:', document.getElementById('budgetId').value);
            
            // Reload draft budgets list
            const draftTab = document.querySelector('[data-status="draft"]');
            if (draftTab) {
                draftTab.click();
            }
        } else {
            const error = await response.json();
            const errorMessage = error.error || 'Failed to save budget';
            console.error('❌ Error saving budget:', errorMessage);
            
            // Show error to user
            alert('Error saving budget: ' + errorMessage);
        }
    } catch (error) {
        console.error('❌ Error saving budget:', error);
        alert('Network error: Failed to save budget. Please check your connection.');
    }
}

// ============================================
// VIEW BUDGET
// ============================================
async function viewBudget(id) {
    await editBudget(id);
    
    // Show refresh button for existing budgets
    document.getElementById('refreshAchievementsBtn').style.display = 'inline-block';
    
    // Make form readonly
    document.querySelectorAll('#budgetForm input, #budgetForm select').forEach(el => {
        el.setAttribute('disabled', true);
    });
    
    document.querySelector('#budgetForm button[type="submit"]').style.display = 'none';
}

window.viewBudget = viewBudget;

// ============================================
// EDIT BUDGET
// ============================================
async function editBudget(id) {
    const token = localStorage.getItem('token');
    
    console.log('✏️ Loading budget for edit:', id);
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/budgets/' + id, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const budget = await response.json();
            
            // Show form
            document.getElementById('budgetFormView').style.display = 'block';
            document.getElementById('budgetListView').style.display = 'none';
            
            // Set active tab to New Budget
            document.querySelectorAll('#budgetTabs .nav-link').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-status="new"]').classList.add('active');
            
            // Fill form
            document.getElementById('budgetId').value = budget.id;
            document.getElementById('budgetName').value = budget.name;
            document.getElementById('startDate').value = budget.start_date;
            document.getElementById('endDate').value = budget.end_date;
            document.getElementById('budgetStatus').value = budget.status;
            
            document.getElementById('formTitle').textContent = 'Edit Budget';
            
            // Show refresh button for existing budgets
            document.getElementById('refreshAchievementsBtn').style.display = 'inline-block';
            
            // Clear lines and add from budget
            document.getElementById('budgetLinesBody').innerHTML = '';
            
            if (budget.lines && budget.lines.length > 0) {
                budget.lines.forEach(line => addBudgetLine(line));
                // Calculate totals after loading all lines
                calculateBudgetTotals();
            }
            
            editingBudgetId = id;
            
            console.log('✅ Budget loaded for editing');
        } else {
            console.error('Failed to load budget');
        }
    } catch (error) {
        console.error('❌ Error loading budget:', error);
    }
}

window.editBudget = editBudget;

// ============================================
// CONFIRM BUDGET
// ============================================
async function confirmBudget(id) {
    if (!confirm('Confirm this budget? It will move from Draft to Confirmed status.')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    console.log('✅ Confirming budget:', id);
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/budgets/' + id + '/confirm', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            alert('✅ Budget confirmed successfully!');
            console.log('✅ Budget confirmed successfully!');
            loadBudgetsByStatus('draft'); // Reload current list
        } else {
            alert('❌ Failed to confirm budget');
            console.error('Failed to confirm budget');
        }
    } catch (error) {
        console.error('❌ Error confirming budget:', error);
        alert('❌ Error confirming budget: ' + error.message);
    }
}

window.confirmBudget = confirmBudget;

// ============================================
// REVISE BUDGET
// ============================================
async function reviseBudget(id) {
    if (!confirm('Create a revision of this budget?\n\nA new draft budget will be created with .r1 suffix.\nThe original will be marked as "revised".')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    console.log('🔄 Creating revision of budget:', id);
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/budgets/' + id + '/revise', {
            method: 'POST',
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Revision result:', result);
            
            alert('✅ Budget revision created successfully!\n\nNew budget: ' + result.name + '\n\nRedirecting to Draft Budgets...');
            
            // Reload confirmed budgets first to show updated status
            await loadBudgetsByStatus('confirm');
            
            // Then switch to draft tab to see new revision
            setTimeout(() => {
                const draftTab = document.querySelector('[data-status="draft"]');
                if (draftTab) {
                    draftTab.click();
                }
            }, 1000);
        } else {
            const error = await response.json();
            console.error('Revision failed:', error);
            alert('❌ Failed to create revision: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('❌ Error creating revision:', error);
        alert('❌ Failed to create revision. Check console for details.');
    }
}

window.reviseBudget = reviseBudget;

// ============================================
// DELETE BUDGET
// ============================================
async function deleteBudget(id) {
    if (!confirm('Archive this budget? It will be moved to archived status.')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    console.log('🗑️ Archiving budget:', id);
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/budgets/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            alert('✅ Budget archived successfully!');
            console.log('✅ Budget archived successfully!');
            loadBudgetsByStatus(currentStatus); // Reload current list
        } else {
            alert('❌ Failed to archive budget');
            console.error('Failed to archive budget');
        }
    } catch (error) {
        console.error('❌ Error archiving budget:', error);
        alert('❌ Error archiving budget: ' + error.message);
    }
}

window.deleteBudget = deleteBudget;

// ============================================
// RESTORE BUDGET (Unarchive)
// ============================================
// RESTORE BUDGET (Archived → Draft)
// ============================================
async function restoreBudget(id) {
    if (!confirm('Restore this budget?\n\nIt will be moved back to Draft status and you can edit it again.')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    console.log('♻️ Restoring budget:', id);
    
    try {
        // Update budget status back to draft
        const response = await fetch('http://127.0.0.1:5000/api/budgets/' + id, {
            method: 'PUT',
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'draft'
            })
        });
        
        if (response.ok) {
            alert('✅ Budget restored successfully!\n\nMoving to Draft Budgets...');
            console.log('✅ Budget restored successfully!');
            
            // Reload archived list
            await loadBudgetsByStatus('archived');
            
            // Then switch to draft tab
            setTimeout(() => {
                const draftTab = document.querySelector('[data-status="draft"]');
                if (draftTab) {
                    draftTab.click();
                }
            }, 1000);
        } else {
            const error = await response.json();
            alert('❌ Failed to restore budget: ' + (error.error || 'Unknown error'));
            console.error('Failed to restore budget');
        }
    } catch (error) {
        console.error('❌ Error restoring budget:', error);
        alert('❌ Failed to restore budget. Check console for details.');
    }
}

window.restoreBudget = restoreBudget;

// ============================================
// REFRESH ACHIEVEMENTS FROM JOURNAL ENTRIES
// ============================================
async function refreshAchievements() {
    const budgetId = document.getElementById('budgetId').value;
    
    if (!budgetId) {
        alert('Please save the budget first before refreshing achievements');
        return;
    }
    
    const token = localStorage.getItem('token');
    const btn = document.getElementById('refreshAchievementsBtn');
    
    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
    
    console.log('🔄 Refreshing achievements for budget:', budgetId);
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/budgets/' + budgetId + '/calculate-achievements', {
            method: 'POST',
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            
            alert(`✅ Achievements calculated!\n\nTotal Achieved: ₹${formatNumber(result.total_achieved)}\nLines Updated: ${result.lines_updated}`);
            
            // Reload the budget to show updated values
            await editBudget(budgetId);
            
            // Recalculate totals
            calculateBudgetTotals();
            
            console.log('✅ Achievements refreshed:', result);
        } else {
            const error = await response.json();
            alert('❌ Failed to calculate achievements: ' + (error.error || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('❌ Error refreshing achievements:', error);
        alert('❌ Failed to refresh achievements. Check console for details.');
    } finally {
        // Reset button
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Achievements';
    }
}

window.refreshAchievements = refreshAchievements;

// ============================================
// SEARCH AND FILTER BUDGETS
// ============================================
let allBudgetsCache = []; // Store all budgets for filtering

// Store budgets when loaded
function cacheAndDisplayBudgets(budgets) {
    allBudgetsCache = budgets;
    filterBudgets();
}

// Apply filters to cached budgets
function filterBudgets() {
    const searchTerm = document.getElementById('budgetSearchInput').value.toLowerCase();
    const startDateFilter = document.getElementById('filterStartDate').value;
    const endDateFilter = document.getElementById('filterEndDate').value;
    
    console.log('🔍 Filtering budgets:', { searchTerm, startDateFilter, endDateFilter });
    
    let filtered = allBudgetsCache.filter(budget => {
        // Search by name
        if (searchTerm && !budget.name.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        // Filter by start date
        if (startDateFilter && budget.start_date < startDateFilter) {
            return false;
        }
        
        // Filter by end date
        if (endDateFilter && budget.end_date > endDateFilter) {
            return false;
        }
        
        return true;
    });
    
    console.log(`✅ Filtered: ${filtered.length} of ${allBudgetsCache.length} budgets`);
    
    displayBudgetList(filtered, currentStatus);
}

// Clear all filters
function clearFilters() {
    document.getElementById('budgetSearchInput').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    
    filterBudgets();
    
    console.log('🧹 Filters cleared');
}

window.filterBudgets = filterBudgets;
window.clearFilters = clearFilters;

// ============================================
// PIE CHART VISUALIZATION
// ============================================
let budgetChart = null;

async function showBudgetChart(budgetId) {
    const token = localStorage.getItem('token');
    
    console.log('📊 Loading chart for budget:', budgetId);
    
    try {
        // Fetch budget details
        const response = await fetch('http://127.0.0.1:5000/api/budgets/' + budgetId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load budget');
        }
        
        const budget = await response.json();
        
        // Fetch analytical accounts for names
        const accountsResponse = await fetch('http://127.0.0.1:5000/api/analytical-accounts', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        let accounts = [];
        if (accountsResponse.ok) {
            const accountsData = await accountsResponse.json();
            // Handle different response formats
            if (Array.isArray(accountsData)) {
                accounts = accountsData;
            } else if (accountsData && Array.isArray(accountsData.accounts)) {
                accounts = accountsData.accounts;
            }
        }
        
        // Create accounts map
        const accountsMap = {};
        accounts.forEach(acc => {
            accountsMap[acc.id] = acc;
        });
        
        // Prepare chart data
        if (!budget.lines || budget.lines.length === 0) {
            showChartMessage('No budget lines to display');
            return;
        }
        
        const labels = [];
        const data = [];
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ];
        
        budget.lines.forEach((line, index) => {
            const account = accountsMap[line.analytical_account_id];
            if (account) {
                labels.push(account.name);
                data.push(parseFloat(line.planned_amount || 0));
            }
        });
        
        // Update chart title
        document.getElementById('chartBudgetTitle').innerHTML = 
            '<i class="fas fa-chart-pie text-primary"></i> ' + escapeHtml(budget.name);
        
        // Hide message, show canvas
        document.getElementById('chartMessage').style.display = 'none';
        document.getElementById('budgetPieChart').style.display = 'block';
        
        // Destroy existing chart
        if (budgetChart) {
            budgetChart.destroy();
        }
        
        // Create new chart
        const ctx = document.getElementById('budgetPieChart').getContext('2d');
        budgetChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return label + ': ₹' + formatNumber(value) + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Chart created successfully');
        
    } catch (error) {
        console.error('❌ Error loading chart:', error);
        showChartMessage('Failed to load chart');
    }
}

function showChartMessage(message) {
    document.getElementById('budgetPieChart').style.display = 'none';
    document.getElementById('chartMessage').style.display = 'block';
    document.getElementById('chartMessage').innerHTML = 
        '<i class="fas fa-info-circle fa-2x mb-2 d-block"></i><p>' + message + '</p>';
}

window.showBudgetChart = showBudgetChart;

// ============================================
// GENERATE BUDGET REPORT
// ============================================
async function generateReport(budgetId) {
    const token = localStorage.getItem('token');
    
    console.log('📊 Generating report for budget:', budgetId);
    
    try {
        // Fetch budget data
        const response = await fetch('http://127.0.0.1:5000/api/budgets/' + budgetId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) {
            alert('Failed to load budget data');
            return;
        }
        
        const budget = await response.json();
        
        // Fetch analytical accounts for line details
        const accountsResponse = await fetch('http://127.0.0.1:5000/api/analytical-accounts', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        let accounts = [];
        if (accountsResponse.ok) {
            const accountsData = await accountsResponse.json();
            // Handle different response formats
            if (Array.isArray(accountsData)) {
                accounts = accountsData;
            } else if (accountsData && Array.isArray(accountsData.accounts)) {
                accounts = accountsData.accounts;
            }
        }
        
        // Create accounts map
        const accountsMap = {};
        accounts.forEach(acc => {
            accountsMap[acc.id] = acc;
        });
        
        // Calculate totals
        let totalPlanned = 0;
        let totalAchieved = 0;
        
        if (budget.lines && budget.lines.length > 0) {
            budget.lines.forEach(line => {
                totalPlanned += parseFloat(line.planned_amount || 0);
                totalAchieved += parseFloat(line.achieved_amount || 0);
            });
        }
        
        // Generate report HTML
        const reportHTML = `
            <div class="report-container" style="font-family: Arial, sans-serif;">
                <!-- Header -->
                <div class="text-center mb-4 pb-3 border-bottom">
                    <h2 class="fw-bold text-brown">${escapeHtml(budget.name)}</h2>
                    <p class="text-muted mb-0">Budget Report - Shiv Furniture</p>
                    <p class="text-muted mb-0">Period: ${formatDate(budget.start_date)} to ${formatDate(budget.end_date)}</p>
                    <p class="mb-0">
                        <span class="badge bg-${getStatusColor(budget.status)}">${budget.status.toUpperCase()}</span>
                    </p>
                </div>
                
                <!-- Summary Section -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h6 class="text-muted mb-2">Total Planned</h6>
                                <h4 class="mb-0 text-primary">₹${formatNumber(totalPlanned)}</h4>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h6 class="text-muted mb-2">Total Achieved</h6>
                                <h4 class="mb-0 text-success">₹${formatNumber(totalAchieved)}</h4>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h6 class="text-muted mb-2">Achievement %</h6>
                                <h4 class="mb-0 text-info">${totalPlanned > 0 ? ((totalAchieved / totalPlanned) * 100).toFixed(2) : 0}%</h4>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h6 class="text-muted mb-2">To Achieve</h6>
                                <h4 class="mb-0 text-warning">₹${formatNumber(Math.max(0, totalPlanned - totalAchieved))}</h4>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Budget Lines Table -->
                <h5 class="fw-bold mb-3">Budget Lines Details</h5>
                <table class="table table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th style="width: 30%;">Analytical Account</th>
                            <th style="width: 10%;">Type</th>
                            <th style="width: 15%;">Planned Amount</th>
                            <th style="width: 15%;">Achieved Amount</th>
                            <th style="width: 15%;">Achievement %</th>
                            <th style="width: 15%;">To Achieve</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${budget.lines && budget.lines.length > 0 ? budget.lines.map(line => {
                            const account = accountsMap[line.analytical_account_id];
                            const accountName = account ? `${account.code} - ${account.name}` : 'Unknown Account';
                            const planned = parseFloat(line.planned_amount || 0);
                            const achieved = parseFloat(line.achieved_amount || 0);
                            const percentage = planned > 0 ? ((achieved / planned) * 100).toFixed(2) : 0;
                            const toAchieve = Math.max(0, planned - achieved);
                            
                            return `
                                <tr>
                                    <td>${escapeHtml(accountName)}</td>
                                    <td><span class="badge bg-${line.type === 'income' ? 'success' : 'danger'}">${line.type}</span></td>
                                    <td class="text-end">₹${formatNumber(planned)}</td>
                                    <td class="text-end">₹${formatNumber(achieved)}</td>
                                    <td class="text-end">${percentage}%</td>
                                    <td class="text-end">₹${formatNumber(toAchieve)}</td>
                                </tr>
                            `;
                        }).join('') : '<tr><td colspan="6" class="text-center text-muted">No budget lines</td></tr>'}
                    </tbody>
                    <tfoot class="table-light fw-bold">
                        <tr>
                            <td colspan="2" class="text-end">TOTAL:</td>
                            <td class="text-end">₹${formatNumber(totalPlanned)}</td>
                            <td class="text-end">₹${formatNumber(totalAchieved)}</td>
                            <td class="text-end">${totalPlanned > 0 ? ((totalAchieved / totalPlanned) * 100).toFixed(2) : 0}%</td>
                            <td class="text-end">₹${formatNumber(Math.max(0, totalPlanned - totalAchieved))}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <!-- Footer -->
                <div class="text-center mt-4 pt-3 border-top text-muted">
                    <small>Generated on ${new Date().toLocaleString('en-IN')}</small>
                </div>
            </div>
        `;
        
        // Insert into modal
        document.getElementById('reportContent').innerHTML = reportHTML;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('budgetReportModal'));
        modal.show();
        
        console.log('✅ Report generated successfully');
        
    } catch (error) {
        console.error('❌ Error generating report:', error);
        alert('Failed to generate report');
    }
}

window.generateReport = generateReport;

// ============================================
// PRINT REPORT
// ============================================
function printReport() {
    const printContent = document.getElementById('reportContent').innerHTML;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Budget Report</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { 
                    padding: 20px; 
                    font-family: Arial, sans-serif;
                }
                .text-brown { color: #8B4513; }
                @media print {
                    .no-print { display: none; }
                    body { padding: 10px; }
                }
            </style>
        </head>
        <body>
            ${printContent}
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    }
                }
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

window.printReport = printReport;

// ============================================
// HELPER FUNCTION FOR STATUS COLORS
// ============================================
function getStatusColor(status) {
    const statusColors = {
        'draft': 'secondary',
        'confirm': 'success',
        'revised': 'warning',
        'archived': 'dark'
    };
    return statusColors[status] || 'secondary';
}

// ============================================
// CANCEL FORM
// ============================================
function cancelForm() {
    // Switch to draft budgets tab
    const draftTab = document.querySelector('[data-status="draft"]');
    if (draftTab) {
        draftTab.click();
    }
}

window.cancelForm = cancelForm;

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

function formatNumber(num) {
    return parseFloat(num || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('✅ budgets.js loaded');