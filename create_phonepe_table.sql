-- Create PhonePe transactions tracking table
CREATE TABLE IF NOT EXISTS phonepe_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    merchant_transaction_id VARCHAR(100) UNIQUE NOT NULL,
    phonepe_transaction_id VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    response_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (invoice_id) REFERENCES customer_invoices(id)
);

CREATE INDEX IF NOT EXISTS idx_phonepe_merchant_txn ON phonepe_transactions(merchant_transaction_id);
CREATE INDEX IF NOT EXISTS idx_phonepe_invoice ON phonepe_transactions(invoice_id);

-- Verify
SELECT * FROM phonepe_transactions;