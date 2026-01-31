-- ============================================
-- PURCHASE ORDERS MIGRATION
-- File: 007_create_purchase_orders.sql
-- ============================================

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS purchase_order_lines CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;

-- Purchase Orders Table
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    reference VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    vendor_id INTEGER,
    state VARCHAR(20) DEFAULT 'draft',
    total DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (vendor_id) REFERENCES contacts(id)
);

-- Purchase Order Lines Table
CREATE TABLE purchase_order_lines (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL,
    product_id INTEGER,
    description TEXT,
    quantity DECIMAL(10,2) DEFAULT 1,
    price DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    analytical_account_id INTEGER,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (analytical_account_id) REFERENCES analytical_accounts(id)
);

-- Indexes for performance
CREATE INDEX idx_po_user ON purchase_orders(user_id);
CREATE INDEX idx_po_lines ON purchase_order_lines(purchase_order_id);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_po_state ON purchase_orders(state);

-- Comments
COMMENT ON TABLE purchase_orders IS 'Purchase orders from vendors';
COMMENT ON TABLE purchase_order_lines IS 'Line items for purchase orders';
COMMENT ON COLUMN purchase_orders.state IS 'draft, confirmed, received, cancelled';
COMMENT ON COLUMN purchase_orders.reference IS 'PO number/reference';
COMMENT ON COLUMN purchase_order_lines.subtotal IS 'quantity * price';