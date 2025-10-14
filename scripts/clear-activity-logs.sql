-- ========================================
-- CLEAR ALL ACTIVITY LOGS
-- ========================================

-- Delete all records from user_activity_logs table
DELETE FROM user_activity_logs;

-- Reset the sequence to start from 1
SELECT setval('user_activity_logs_id_seq', 1, false);

-- Verify table is empty
SELECT COUNT(*) as total_records FROM user_activity_logs;
