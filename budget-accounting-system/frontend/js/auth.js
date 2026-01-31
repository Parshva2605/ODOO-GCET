// ========================================
// FILE: auth.js
// PURPOSE: Handle login page functionality
// FUNCTIONS:
//   Line 20  : showMessage() - Display error/success messages
//   Line 45  : validateEmail() - Validate email format
//   Line 60  : handleLogin() - Main login form handler
//   Line 100 : togglePassword() - Show/hide password
//   Line 115 : loadRememberedEmail() - Auto-fill saved email
// ========================================

// ===== CONFIGURATION =====
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// ===== UTILITY FUNCTIONS =====

/**
 * Display error or success message to user
 * @param {string} message - Message to display
 * @param {string} type - 'error' or 'success'
 */
function showMessage(message, type) {
    console.log('📢 [AUTH.JS:20] showMessage():', message, type);
    
    const messageBox = document.getElementById('messageBox');
    if (messageBox) {
        messageBox.innerHTML = message;
        messageBox.className = 'message-box';
        messageBox.classList.add(type);
        messageBox.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, 5000);
    }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateEmail(email) {
    console.log('🔍 [AUTH.JS:45] validateEmail():', email);
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const result = emailRegex.test(email);
    
    console.log('🔍 [AUTH.JS:45] validateEmail():', email, 'Valid:', result);
    return result;
}

// ===== MAIN FUNCTIONS =====

/**
 * Handle login form submission
 * @param {Event} event - Form submit event
 */
async function handleLogin(event) {
    event.preventDefault();
    console.log('🔵 [AUTH.JS:60] handleLogin() START');
    
    // Get form values
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    console.log('📝 Email:', email, 'RememberMe:', rememberMe);
    
    // Validate inputs
    if (!email) {
        showMessage('Please enter your email', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showMessage('Please enter a valid email', 'error');
        return;
    }
    
    if (!password) {
        showMessage('Please enter your password', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Show loading state
    const loginBtn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    
    btnText.textContent = 'Logging in...';
    btnSpinner.style.display = 'inline-block';
    loginBtn.disabled = true;
    
    // Make API call
    try {
        console.log('🌐 [AUTH.JS:60] Making API call to:', API_BASE_URL + '/auth/login');
        
        const response = await fetch(API_BASE_URL + '/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        console.log('📥 API Response:', data);
        
        if (data.success) {
            // Save token to localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('✅ Token saved to localStorage');
            
            // Save email if Remember Me is checked
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
                console.log('✅ Email saved for remember me');
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            
            // Show success message
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard after 1 second
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } else {
            // Show error message
            showMessage(data.message || 'Login failed', 'error');
            
            // Reset button
            btnText.textContent = 'Login';
            btnSpinner.style.display = 'none';
            loginBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('❌ [AUTH.JS:60] Network error:', error);
        showMessage('Connection error. Please check if server is running.', 'error');
        
        // Reset button
        btnText.textContent = 'Login';
        btnSpinner.style.display = 'none';
        loginBtn.disabled = false;
    }
    
    console.log('✅ [AUTH.JS:60] handleLogin() END');
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility() {
    console.log('👁️ [AUTH.JS:100] togglePassword() called');
    
    const passwordInput = document.getElementById('loginPassword');
    const toggleButton = document.getElementById('togglePassword');
    const toggleIcon = toggleButton.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
        console.log('👁️ Password shown');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
        console.log('👁️ Password hidden');
    }
}

/**
 * Load remembered email from localStorage
 */
function loadRememberedEmail() {
    console.log('💾 [AUTH.JS:115] loadRememberedEmail() called');
    
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    
    if (rememberedEmail) {
        const emailInput = document.getElementById('loginEmail');
        const rememberCheckbox = document.getElementById('rememberMe');
        
        if (emailInput) {
            emailInput.value = rememberedEmail;
            console.log('✅ Loaded remembered email:', rememberedEmail);
        }
        
        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
            console.log('✅ Remember me checkbox checked');
        }
    } else {
        console.log('ℹ️ No remembered email found');
    }
}

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 [AUTH.JS] Page loaded, initializing...');
    
    // Load remembered email
    loadRememberedEmail();
    
    // Attach login form submit handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('✅ Login form handler attached');
    }
    
    // Attach password toggle handler
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', togglePasswordVisibility);
        console.log('✅ Password toggle handler attached');
    }
    
    console.log('✅ [AUTH.JS] Initialization complete');
});