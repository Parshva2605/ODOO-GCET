const API_URL = 'http://127.0.0.1:5000';

async function portalLogin() {
    const email = document.getElementById('portalEmail').value.trim();
    
    if (!email) {
        showError('Please enter your email address');
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/api/portal/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Save portal token
            localStorage.setItem('portal_token', data.token);
            localStorage.setItem('portal_contact', JSON.stringify(data.contact));
            
            // Redirect to portal dashboard
            window.location.href = 'portal-dashboard.html';
        } else {
            const error = await response.json();
            showError(error.error || 'Login failed. Please check your email.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection error. Please try again.');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Enter key login
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('portalEmail').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            portalLogin();
        }
    });
});