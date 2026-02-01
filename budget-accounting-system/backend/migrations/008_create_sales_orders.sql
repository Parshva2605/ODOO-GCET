-- Sales Orders Migration
-- Creates sales_orders and sales_order_lines tables

-- Sales Orders Table
CREATE TABLE IF NOT EXISTS sales_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    reference VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    customer_id INTEGER,
    state VARCHAR(20) DEFAULT 'draft',
    total DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES contacts(id)
);

-- Sales Order Lines Table
CREATE TABLE IF NOT EXISTS sales_order_lines (
    id SERIAL PRIMARY KEY,
    sales_order_id INTEGER NOT NULL,
    product_id INTEGER,
    description TEXT,
    quantity DECIMAL(10,2) DEFAULT 1,
    price DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    analytical_account_id INTEGER,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (analytical_account_id) REFERENCES analytical_accounts(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_so_user ON sales_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_so_lines ON sales_order_lines(sales_order_id);

-- Add sample sales orders
INSERT INTO sales_orders (user_id, reference, date, customer_id, state, total)
SELECT 1, 'SO-2026-001', '2026-01-25', id, 'confirmed', 90000.00
FROM contacts WHERE contact_type = 'customer' LIMIT 1;

INSERT INTO sales_order_lines (sales_order_id, product_id, description, quantity, price, subtotal)
SELECT 
    currval('sales_orders_id_seq'),
    id,
    'Teak Wood Sofa',
    2,
    45000.00,
    90000.00
FROM products WHERE name = 'Teak Wood Sofa' LIMIT 1;