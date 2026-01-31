-- =====================================================
-- Migration: 006_create_budgets.sql
-- Purpose: Create budget module tables
-- Date: 2026-01-31
-- =====================================================

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS budget_lines CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;

-- 1. BUDGETS TABLE (Master)
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'revised', 'archived')),
    revision_of INTEGER REFERENCES budgets(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. BUDGET_LINES TABLE (Lines)
CREATE TABLE budget_lines (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    analytical_account_id INTEGER NOT NULL REFERENCES analytical_accounts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    planned_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    achieved_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE INDEXES
CREATE INDEX idx_budgets_user ON budgets(user_id);
CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date);
CREATE INDEX idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX idx_budget_lines_analytical ON budget_lines(analytical_account_id);

-- ADD COMMENTS
COMMENT ON TABLE budgets IS 'Budget master records with periods';
COMMENT ON TABLE budget_lines IS 'Budget lines with analytical accounts and amounts';
COMMENT ON COLUMN budgets.revision_of IS 'Link to original budget if this is a revision';
COMMENT ON COLUMN budget_lines.achieved_amount IS 'Auto-calculated from posted transactions';

-- CREATE TRIGGER FUNCTION FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ADD TRIGGERS FOR UPDATED_AT
CREATE TRIGGER update_budgets_updated_at 
    BEFORE UPDATE ON budgets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_lines_updated_at 
    BEFORE UPDATE ON budget_lines 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- INSERT SAMPLE DATA
INSERT INTO budgets (user_id, name, start_date, end_date, status) VALUES
(1, 'Q1 2026 Budget', '2026-01-01', '2026-03-31', 'confirmed'),
(1, 'Q2 2026 Budget', '2026-04-01', '2026-06-30', 'draft');

-- Get budget IDs for sample data
DO $$
DECLARE
    q1_budget_id INTEGER;
    q2_budget_id INTEGER;
BEGIN
    SELECT id INTO q1_budget_id FROM budgets WHERE name = 'Q1 2026 Budget' LIMIT 1;
    SELECT id INTO q2_budget_id FROM budgets WHERE name = 'Q2 2026 Budget' LIMIT 1;
    
    -- Insert budget lines
    IF q1_budget_id IS NOT NULL THEN
        INSERT INTO budget_lines (budget_id, analytical_account_id, type, planned_amount, achieved_amount) VALUES
        (q1_budget_id, 1, 'expense', 50000.00, 15000.00),
        (q1_budget_id, 2, 'expense', 75000.00, 25000.00),
        (q1_budget_id, 3, 'expense', 100000.00, 30000.00);
    END IF;
    
    IF q2_budget_id IS NOT NULL THEN
        INSERT INTO budget_lines (budget_id, analytical_account_id, type, planned_amount, achieved_amount) VALUES
        (q2_budget_id, 1, 'expense', 60000.00, 0.00),
        (q2_budget_id, 2, 'expense', 80000.00, 0.00);
    END IF;
END $$;

-- Migration completed
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 006_create_budgets.sql completed successfully';
    RAISE NOTICE '📊 Created tables: budgets, budget_lines';
    RAISE NOTICE '🔍 Created indexes: 5 performance indexes';
    RAISE NOTICE '📝 Inserted sample data: 2 budgets with 5 lines';
END $$;