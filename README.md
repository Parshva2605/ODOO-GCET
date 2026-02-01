# 🪑 Shiv Furniture - Budget Accounting System

A comprehensive web-based accounting and budget management system built with Flask (Python) backend and vanilla JavaScript frontend.

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [PhonePe Integration](#phonepe-integration)
- [Contributing](#contributing)

## ✨ Features

### Core Accounting Features
- **Dashboard** - Real-time overview of financial metrics
- **Contacts Management** - Manage customers and vendors
- **Products Management** - Product catalog with pricing
- **Analytical Accounts** - Track expenses by categories
- **Auto Analytical Models** - Automatic expense categorization
- **Budgets** - Create and monitor budgets with real-time tracking
- **Purchase Orders** - Vendor purchase order management
- **Sales Orders** - Customer sales order management
- **Customer Invoices** - Invoice generation and payment tracking

### Payment Features
- **PhonePe Integration** - UAT payment gateway integration
- **Customer Portal** - Self-service portal for customers to view and pay invoices
- **QR Code Payments** - Generate QR codes for mobile payments
- **Multiple Payment Methods** - Cash, Bank Transfer, Online payments
- **Real-time Payment Status** - Automatic invoice status updates

### User Management
- **Authentication** - Secure login system with JWT tokens
- **Role-based Access** - Admin and Portal user roles
- **Multi-user Support** - Multiple users with isolated data

## 🛠️ Technology Stack

### Backend
- **Python 3.10+**
- **Flask** - Web framework
- **PostgreSQL** - Database
- **psycopg2** - PostgreSQL adapter
- **JWT** - Authentication tokens
- **Requests** - HTTP library for PhonePe API

### Frontend
- **HTML5/CSS3**
- **JavaScript (Vanilla)**
- **Bootstrap 5** - UI framework
- **Font Awesome** - Icons

### Payment Gateway
- **PhonePe UAT** - Test payment gateway integration

## 📦 Installation

### Prerequisites
- Python 3.10 or higher
- PostgreSQL 12 or higher
- pip (Python package manager)

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd budget-accounting-system
```

### Step 2: Install Python Dependencies
```bash
cd budget-accounting-system/backend
pip install -r requirements.txt
```

### Step 3: Database Setup
```bash
# Create PostgreSQL database
createdb budget_system

# Run migrations
python run_migrations.py
```

### Step 4: Configure Environment
Edit `budget-accounting-system/backend/config.py`:
```python
DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'budget_system'
DB_USER = 'your_username'
DB_PASSWORD = 'your_password'
```

### Step 5: Start the Server
```bash
cd budget-accounting-system/backend
python app.py
```

The application will be available at: `http://127.0.0.1:5000`

## ⚙️ Configuration

### PhonePe Configuration
Update PhonePe credentials in `budget-accounting-system/backend/app.py`:
```python
PHONEPE_MERCHANT_ID = "YOUR_MERCHANT_ID"
PHONEPE_SALT_KEY = "YOUR_SALT_KEY"
PHONEPE_SALT_INDEX = 1
```

### Database Configuration
Edit `budget-accounting-system/backend/config.py` with your PostgreSQL credentials.

## 🚀 Usage

### Admin Access
1. Navigate to `http://127.0.0.1:5000/login.html`
2. Login with admin credentials
3. Access all features from the sidebar menu

### Customer Portal Access
1. Navigate to `http://127.0.0.1:5000/portal-login.html`
2. Enter customer email (no password required for demo)
3. View invoices and make payments

### Creating Your First Invoice
1. Go to **Contacts** → Add a customer
2. Go to **Products** → Add products
3. Go to **Customer Invoices** → Create new invoice
4. Select customer, add products, save
5. Customer can now pay via portal

### Making a Payment (Customer Portal)
1. Login to customer portal
2. View invoices
3. Click **Pay** on any unpaid invoice
4. Click **Pay with PhonePe UAT**
5. Complete payment on PhonePe simulator
6. Invoice status automatically updates to "Paid"

## 📁 Project Structure

```
budget-accounting-system/
├── backend/
│   ├── app.py                      # Main Flask application
│   ├── config.py                   # Database configuration
│   ├── requirements.txt            # Python dependencies
│   ├── run_migrations.py           # Database migration script
│   ├── schema.sql                  # Database schema
│   ├── routes/                     # API route modules
│   │   ├── auth.py                 # Authentication routes
│   │   ├── contacts.py             # Contacts API
│   │   ├── products.py             # Products API
│   │   ├── budgets.py              # Budgets API
│   │   └── ...
│   ├── utils/                      # Utility modules
│   │   ├── auth.py                 # Auth helpers
│   │   └── db.py                   # Database helpers
│   └── migrations/                 # SQL migration files
│
├── frontend/
│   ├── login.html                  # Admin login page
│   ├── signup.html                 # Admin signup page
│   ├── dashboard.html              # Main dashboard
│   ├── contacts.html               # Contacts management
│   ├── products.html               # Products management
│   ├── analytical-accounts.html    # Analytical accounts
│   ├── budgets.html                # Budget management
│   ├── purchase-orders.html        # Purchase orders
│   ├── sales-orders.html           # Sales orders
│   ├── customer-invoices.html      # Customer invoices
│   ├── portal-login.html           # Customer portal login
│   ├── portal-dashboard.html       # Customer portal dashboard
│   ├── phonepe-callback.html       # PhonePe payment callback
│   ├── css/
│   │   ├── styles.css              # Global styles
│   │   └── dashboard.css           # Dashboard styles
│   └── js/
│       ├── auth.js                 # Authentication logic
│       ├── dashboard.js            # Dashboard logic
│       ├── contacts.js             # Contacts logic
│       ├── products.js             # Products logic
│       ├── budgets.js              # Budgets logic
│       ├── portal-dashboard.js     # Portal logic
│       └── ...
│
└── README.md                       # This file
```

## 🔌 API Documentation

### Authentication
```
POST /api/auth/signup    - Create new user account
POST /api/auth/login     - Login and get JWT token
```

### Contacts
```
GET    /api/contacts           - Get all contacts
POST   /api/contacts           - Create new contact
GET    /api/contacts/:id       - Get contact by ID
PUT    /api/contacts/:id       - Update contact
DELETE /api/contacts/:id       - Delete contact
```

### Products
```
GET    /api/products           - Get all products
POST   /api/products           - Create new product
GET    /api/products/:id       - Get product by ID
PUT    /api/products/:id       - Update product
DELETE /api/products/:id       - Delete product
```

### Customer Invoices
```
GET    /api/customer-invoices           - Get all invoices
POST   /api/customer-invoices           - Create new invoice
GET    /api/customer-invoices/:id       - Get invoice by ID
POST   /api/customer-invoices/:id/payment - Record payment
```

### Portal
```
POST   /api/portal/login                - Portal login (email only)
GET    /api/portal/invoices             - Get customer invoices
```

### PhonePe Payment
```
POST   /api/phonepe/initiate            - Initiate PhonePe payment
GET    /api/phonepe/verify/:txn_id      - Verify payment status
POST   /api/phonepe/test-payment        - Test payment (no auth)
GET    /api/phonepe/verify-test/:txn_id - Test verify (no auth)
```

## 💳 PhonePe Integration

### UAT Environment
The system uses PhonePe's UAT (User Acceptance Testing) environment for testing payments.

### Payment Flow
1. Customer clicks "Pay" on invoice
2. System generates PhonePe payment request
3. Customer redirected to PhonePe UAT simulator
4. QR code generated on PhonePe's page
5. Customer completes dummy payment
6. PhonePe redirects back to callback page
7. System verifies payment and updates invoice status

### Test Credentials
```
Merchant ID: PGTESTPAYUAT86
Salt Key: 96434309-7796-489d-8924-ab56988a6076
Salt Index: 1
```

### Callback URL
```
http://127.0.0.1:5000/phonepe-callback.html
```

## 🎨 UI Features

### Responsive Design
- Mobile-friendly interface
- Bootstrap 5 responsive grid
- Touch-optimized controls

### User Experience
- Real-time form validation
- Loading spinners for async operations
- Success/error notifications
- Consistent color scheme (Brown/Beige theme)

### Accessibility
- Semantic HTML
- ARIA labels
- Keyboard navigation support
- High contrast colors

## 🔒 Security Features

- JWT token-based authentication
- Password hashing (bcrypt)
- SQL injection prevention (parameterized queries)
- CORS configuration
- Input validation and sanitization

## 📊 Database Schema

### Main Tables
- `users` - System users
- `contacts` - Customers and vendors
- `products` - Product catalog
- `analytical_accounts` - Expense categories
- `budgets` - Budget definitions
- `purchase_orders` - Purchase orders
- `sales_orders` - Sales orders
- `customer_invoices` - Customer invoices
- `payments` - Payment records
- `phonepe_transactions` - PhonePe transaction logs

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
psql -l | grep budget_system
```

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### PhonePe Payment Fails
- Verify merchant credentials are correct
- Check callback URL is accessible
- Ensure using UAT environment credentials

## 📝 Development Notes

### Adding New Features
1. Create database migration in `migrations/`
2. Add API routes in `routes/`
3. Create frontend HTML/JS files
4. Update this README

### Code Style
- Python: PEP 8
- JavaScript: ES6+
- HTML/CSS: BEM naming convention

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is proprietary software for Shiv Furniture.

## 👥 Authors

- **Development Team** - Initial work

## 🙏 Acknowledgments

- Bootstrap team for the UI framework
- PhonePe for payment gateway integration
- PostgreSQL community

## 📞 Support

For support, email: support@shivfurniture.com

---

**Version:** 1.0.0  
**Last Updated:** February 2026  
**Status:** Production Ready ✅
