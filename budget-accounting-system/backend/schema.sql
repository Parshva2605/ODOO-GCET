-- =====================================================
-- Budget Accounting System Database Schema
-- Company: Shiv Furniture
-- Version: 1.0
-- Created: 2026-01-31
-- =====================================================

-- Database comment
COMMENT ON DATABASE budget_system IS 'Budget Accounting System for Shiv Furniture';

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    gstin VARCHAR(15),
    role VARCHAR(20) DEFAULT 'portal_user' CHECK (role IN ('admin', 'portal_user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Add comments
COMMENT ON TABLE users IS 'Stores user accounts for the system';
COMMENT ON COLUMN users.role IS 'User role: admin or portal_user';
COMMENT ON COLUMN users.gstin IS 'GST Identification Number for invoicing';

-- =====================================================
-- 2. CONTACTS TABLE
-- =====================================================
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('customer', 'vendor')),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    company_name VARCHAR(255),
    gstin VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_type ON contacts(contact_type);

-- Add comments
COMMENT ON TABLE contacts IS 'Stores customer and vendor information';
COMMENT ON COLUMN contacts.contact_type IS 'Type: customer or vendor';

-- =====================================================
-- 3. PRODUCTS TABLE
-- =====================================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    sales_price DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category ON products(category);

-- Add comments
COMMENT ON TABLE products IS 'Stores product master data';

-- =====================================================
-- 4. ANALYTICAL_ACCOUNTS TABLE
-- =====================================================
CREATE TABLE analytical_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_analytical_accounts_user_id ON analytical_accounts(user_id);
CREATE INDEX idx_analytical_accounts_code ON analytical_accounts(code);

-- Add comments
COMMENT ON TABLE analytical_accounts IS 'Cost centers for budget tracking';

-- =====================================================
-- 5. BUDGETS TABLE
-- =====================================================
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'revised', 'canceled')),
    revision_id INTEGER REFERENCES budgets(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date);

-- Add comments
COMMENT ON TABLE budgets IS 'Budget headers with period dates';
COMMENT ON COLUMN budgets.status IS 'Status: draft, confirmed, revised, or canceled';
COMMENT ON COLUMN budgets.revision_id IS 'Links to original budget if this is a revision';

-- =====================================================
-- 6. BUDGET_LINES TABLE
-- =====================================================
CREATE TABLE budget_lines (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    analytical_account_id INTEGER NOT NULL REFERENCES analytical_accounts(id) ON DELETE CASCADE,
    budget_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_budget_lines_budget_id ON budget_lines(budget_id);
CREATE INDEX idx_budget_lines_analytical_account_id ON budget_lines(analytical_account_id);

-- Add comments
COMMENT ON TABLE budget_lines IS 'Budget line items linked to analytical accounts';
COMMENT ON COLUMN budget_lines.budget_amount IS 'Planned budget amount';

-- =====================================================
-- 7. PURCHASE_ORDERS TABLE
-- =====================================================
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed')),
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_purchase_orders_user_id ON purchase_orders(user_id);
CREATE INDEX idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

-- Add comments
COMMENT ON TABLE purchase_orders IS 'Purchase orders to vendors';

-- =====================================================
-- 8. PURCHASE_ORDER_LINES TABLE
-- =====================================================
CREATE TABLE purchase_order_lines (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    analytical_account_id INTEGER REFERENCES analytical_accounts(id) ON DELETE SET NULL,
    description VARCHAR(500),
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_po_lines_po_id ON purchase_order_lines(purchase_order_id);
CREATE INDEX idx_po_lines_analytical_account_id ON purchase_order_lines(analytical_account_id);

-- Add comments
COMMENT ON TABLE purchase_order_lines IS 'Line items for purchase orders';

-- =====================================================
-- 9. INSERT SAMPLE DATA
-- =====================================================

-- Insert admin user (password: admin123)
-- Note: Password hash for 'admin123' using bcrypt - will be generated by backend
INSERT INTO users (name, email, password_hash, company_name, gstin, role) 
VALUES (
    'Admin User',
    'admin@shivfurniture.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lk3UGn.oXXXX',
    'Shiv Furniture',
    '22AAAAA0000A1Z5',
    'admin'
);

-- Insert sample analytical accounts
INSERT INTO analytical_accounts (user_id, name, code) VALUES 
(1, 'Marketing', 'MARK001'),
(1, 'Operations', 'OPS001'),
(1, 'Production', 'PROD001');

-- Insert sample products
INSERT INTO products (user_id, name, category, cost_price, sales_price) VALUES
(1, 'Office Chair', 'Furniture', 2000.00, 3500.00),
(1, 'Wooden Table', 'Furniture', 5000.00, 8500.00);

-- Insert sample contacts
INSERT INTO contacts (user_id, contact_type, name, email, phone, company_name, gstin) VALUES
(1, 'vendor', 'ABC Suppliers', 'contact@abcsuppliers.com', '+91-9876543210', 'ABC Suppliers Pvt Ltd', '27AAAAA0000A1Z5'),
(1, 'customer', 'XYZ Corporation', 'orders@xyzcorp.com', '+91-9876543211', 'XYZ Corporation Ltd', '29AAAAA0000A1Z5');

-- Insert sample budget
INSERT INTO budgets (user_id, name, start_date, end_date, status) VALUES
(1, 'Q1 2026 Budget', '2026-01-01', '2026-03-31', 'draft');

-- Insert sample budget lines
INSERT INTO budget_lines (budget_id, analytical_account_id, budget_amount) VALUES
(1, 1, 50000.00),  -- Marketing: 50,000
(1, 2, 75000.00),  -- Operations: 75,000
(1, 3, 100000.00); -- Production: 100,000

-- =====================================================
-- 10. ADDITIONAL CONSTRAINTS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Budget Accounting System schema created successfully!';
    RAISE NOTICE '📊 Tables created: 8';
    RAISE NOTICE '🔍 Indexes created: 15';
    RAISE NOTICE '👤 Sample admin user: admin@shivfurniture.com';
    RAISE NOTICE '🏢 Company: Shiv Furniture';
END $$;