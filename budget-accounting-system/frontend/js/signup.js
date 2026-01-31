// ========================================
// FILE: signup.js
// PURPOSE: Handle signup page functionality
// FUNCTIONS:
//   Line 20  : showMessage() - Display error/success messages
//   Line 45  : validateEmail() - Validate email format
//   Line 60  : validatePassword() - Check password strength
//   Line 75  : handleSignup() - Main signup form handler
//   Line 150 : togglePassword() - Show/hide password fields
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
    console.log('📢 [SIGNUP.JS:20] showMessage():', message, type);
    
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
    console.log('🔍 [SIGNUP.JS:45] validateEmail():', email);
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const result = emailRegex.test(email);
    
    console.log('🔍 [SIGNUP.JS:45] validateEmail():', email, 'Valid:', result);
    return result;
}

/**
 * Check if password meets requirements
 * @param {string} password - Password to validate
 * @returns {object} - {valid: boolean, message: string}
 */
function validatePassword(password) {
    console.log('🔒 [SIGNUP.JS:60] validatePassword() called');
    
    if (password.length < 6) {
        return {
            valid: false,
            message: 'Password must be at least 6 characters'
        };
    }
    
    return {
        valid: true,
        message: 'Password is valid'
    };
}

// ===== MAIN FUNCTIONS =====

/**
 * Handle signup form submission
 * @param {Event} event - Form submit event
 */
async function handleSignup(event) {
    event.preventDefault();
    console.log('🔵 [SIGNUP.JS:75] handleSignup() START');
    
    // Get form values
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const company = document.getElementById('signupCompany').value.trim();
    const gstin = document.getElementById('signupGstin').value.trim();
    
    console.log('📝 Form data:', { name, email, company, gstin });
    
    // Validate inputs
    if (!name) {
        showMessage('Please enter your name', 'error');
        return;
    }
    
    if (!email) {
        showMessage('Please enter your email', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showMessage('Please enter a valid email', 'error');
        return;
    }
    
    if (!password) {
        showMessage('Please enter a password', 'error');
        return;
    }
    
    // Check password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        showMessage(passwordValidation.message, 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    // Show loading state
    const signupBtn = document.getElementById('signupBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    
    btnText.textContent = 'Creating Account...';
    btnSpinner.style.display = 'inline-block';
    signupBtn.disabled = true;
    
    // Make API call
    try {
        console.log('🌐 [SIGNUP.JS:75] Making API call to:', API_BASE_URL + '/auth/signup');
        
        const response = await fetch(API_BASE_URL + '/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                company_name: company || null,
                gstin: gstin || null
            })
        });
        
        const data = await response.json();
        console.log('📥 API Response:', data);
        
        if (data.success) {
            // Show success message
            showMessage('Account created successfully! Redirecting to login...', 'success');
            console.log('✅ Signup successful, user_id:', data.user_id);
            
            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } else {
            // Show error message
            showMessage(data.message || 'Signup failed', 'error');
            
            // Reset button
            btnText.textContent = 'Sign Up';
            btnSpinner.style.display = 'none';
            signupBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('❌ [SIGNUP.JS:75] Network error:', error);
        showMessage('Connection error. Please check if server is running.', 'error');
        
        // Reset button
        btnText.textContent = 'Sign Up';
        btnSpinner.style.display = 'none';
        signupBtn.disabled = false;
    }
    
    console.log('✅ [SIGNUP.JS:75] handleSignup() END');
}

/**
 * Toggle password visibility for any password field
 * @param {string} fieldId - ID of password input
 * @param {string} toggleBtnId - ID of toggle button
 */
function togglePasswordField(fieldId, toggleBtnId) {
    console.log('👁️ [SIGNUP.JS:150] togglePasswordField():', fieldId, toggleBtnId);
    
    const passwordInput = document.getElementById(fieldId);
    const toggleButton = document.getElementById(toggleBtnId);
    const toggleIcon = toggleButton.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
        console.log('👁️ Password shown for:', fieldId);
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
        console.log('👁️ Password hidden for:', fieldId);
    }
}

// ===== EVENT LISTENERS =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 [SIGNUP.JS] Page loaded, initializing...');
    
    // Attach signup form handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
        console.log('✅ Signup form handler attached');
    }
    
    // Attach password toggle handlers
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            togglePasswordField('signupPassword', 'togglePassword');
        });
        console.log('✅ Password toggle handler attached');
    }
    
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', function() {
            togglePasswordField('signupConfirmPassword', 'toggleConfirmPassword');
        });
        console.log('✅ Confirm password toggle handler attached');
    }
    
    console.log('✅ [SIGNUP.JS] Initialization complete');
});