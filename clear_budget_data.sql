-- =====================================================
-- CLEAR OLD BUDGET DATA & PREPARE FOR NEW STRUCTURE
-- Safe cleanup for budget module rebuild
-- =====================================================

-- Drop old budget tables (they had different structure)
DROP TABLE IF EXISTS budget_lines CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;

-- Verify old tables are removed
SELECT '✅ Old budget tables dropped, ready for new structure' as status;

-- =====================================================
-- NOW RUN THE BUILD #1 SQL IN pgAdmin
-- =====================================================
-- After running this, execute the BUILD #1 CREATE TABLE commands