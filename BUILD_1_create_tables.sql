-- =====================================================
-- BUILD #1: CREATE BUDGET DATABASE TABLES
-- Enhanced structure with income/expense tracking
-- =====================================================

-- Create budgets master table
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirm', 'revised', 'archived')),
    revision_of INTEGER REFERENCES budgets(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create budget lines table
CREATE TABLE IF NOT EXISTS budget_lines (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    analytical_account_id INTEGER NOT NULL REFERENCES analytical_accounts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    planned_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    achieved_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_dates ON budgets(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_analytical ON budget_lines(analytical_account_id);

-- Add update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at 
    BEFORE UPDATE ON budgets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budget_lines_updated_at ON budget_lines;
CREATE TRIGGER update_budget_lines_updated_at 
    BEFORE UPDATE ON budget_lines 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verify creation
SELECT 'budgets table' as table_name, COUNT(*) as rows FROM budgets
UNION ALL
SELECT 'budget_lines table' as table_name, COUNT(*) as rows FROM budget_lines;

SELECT '✅ Database tables created successfully!' as status;

-- Show table structure
SELECT 
    'budgets' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'budgets' 
ORDER BY ordinal_position;

SELECT 
    'budget_lines' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'budget_lines' 
ORDER BY ordinal_position;