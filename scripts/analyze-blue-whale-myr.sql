-- ============================================================================
-- ANALYZE BLUE_WHALE_MYR TABLE STRUCTURE
-- ============================================================================
-- Purpose: Check if blue_whale_myr can fulfill ALL BP page requirements
-- Date: 2025-10-21
-- ============================================================================

-- ============================================================================
-- 1. CHECK TABLE STRUCTURE (Columns & Data Types)
-- ============================================================================
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'blue_whale_myr'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. CHECK SAMPLE DATA (First 5 rows)
-- ============================================================================
SELECT * 
FROM blue_whale_myr 
WHERE year = 2025 
ORDER BY date DESC 
LIMIT 5;

-- ============================================================================
-- 3. CHECK DISTINCT VALUES FOR KEY COLUMNS
-- ============================================================================

-- 3a. Check distinct brands/lines
SELECT DISTINCT line, COUNT(*) as row_count
FROM blue_whale_myr
WHERE year = 2025
GROUP BY line
ORDER BY line;

-- 3b. Check date range
SELECT 
    MIN(date) as earliest_date,
    MAX(date) as latest_date,
    COUNT(DISTINCT date) as total_days,
    COUNT(DISTINCT year) as total_years,
    COUNT(DISTINCT month) as total_months
FROM blue_whale_myr;

-- 3c. Check if first_deposit_date exists and populated
SELECT 
    COUNT(*) as total_rows,
    COUNT(first_deposit_date) as rows_with_first_deposit,
    COUNT(*) - COUNT(first_deposit_date) as rows_without_first_deposit,
    ROUND(100.0 * COUNT(first_deposit_date) / COUNT(*), 2) as percentage_populated
FROM blue_whale_myr
WHERE year = 2025;

-- ============================================================================
-- 4. CHECK DATA COMPLETENESS FOR KEY METRICS
-- ============================================================================

-- 4a. Financial columns
SELECT 
    'deposit_amount' as metric,
    COUNT(*) as total_rows,
    COUNT(deposit_amount) as non_null_rows,
    SUM(CASE WHEN deposit_amount > 0 THEN 1 ELSE 0 END) as positive_values,
    MIN(deposit_amount) as min_value,
    MAX(deposit_amount) as max_value
FROM blue_whale_myr
WHERE year = 2025

UNION ALL

SELECT 
    'withdraw_amount',
    COUNT(*),
    COUNT(withdraw_amount),
    SUM(CASE WHEN withdraw_amount > 0 THEN 1 ELSE 0 END),
    MIN(withdraw_amount),
    MAX(withdraw_amount)
FROM blue_whale_myr
WHERE year = 2025

UNION ALL

SELECT 
    'deposit_cases',
    COUNT(*),
    COUNT(deposit_cases),
    SUM(CASE WHEN deposit_cases > 0 THEN 1 ELSE 0 END),
    MIN(deposit_cases),
    MAX(deposit_cases)
FROM blue_whale_myr
WHERE year = 2025

UNION ALL

SELECT 
    'withdraw_cases',
    COUNT(*),
    COUNT(withdraw_cases),
    SUM(CASE WHEN withdraw_cases > 0 THEN 1 ELSE 0 END),
    MIN(withdraw_cases),
    MAX(withdraw_cases)
FROM blue_whale_myr
WHERE year = 2025

UNION ALL

SELECT 
    'add_transaction',
    COUNT(*),
    COUNT(add_transaction),
    SUM(CASE WHEN add_transaction > 0 THEN 1 ELSE 0 END),
    MIN(add_transaction),
    MAX(add_transaction)
FROM blue_whale_myr
WHERE year = 2025

UNION ALL

SELECT 
    'deduct_transaction',
    COUNT(*),
    COUNT(deduct_transaction),
    SUM(CASE WHEN deduct_transaction > 0 THEN 1 ELSE 0 END),
    MIN(deduct_transaction),
    MAX(deduct_transaction)
FROM blue_whale_myr
WHERE year = 2025

UNION ALL

SELECT 
    'bonus',
    COUNT(*),
    COUNT(bonus),
    SUM(CASE WHEN bonus > 0 THEN 1 ELSE 0 END),
    MIN(bonus),
    MAX(bonus)
FROM blue_whale_myr
WHERE year = 2025

UNION ALL

SELECT 
    'add_bonus',
    COUNT(*),
    COUNT(add_bonus),
    SUM(CASE WHEN add_bonus > 0 THEN 1 ELSE 0 END),
    MIN(add_bonus),
    MAX(add_bonus)
FROM blue_whale_myr
WHERE year = 2025;

-- ============================================================================
-- 5. CHECK USER-LEVEL DATA (for cohort calculation)
-- ============================================================================

-- 5a. Check unique users
SELECT 
    COUNT(DISTINCT userkey) as total_unique_users,
    COUNT(*) as total_rows,
    ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT userkey), 2) as avg_rows_per_user
FROM blue_whale_myr
WHERE year = 2025;

-- 5b. Sample user activity (1 user)
SELECT 
    date,
    line,
    userkey,
    first_deposit_date,
    deposit_amount,
    withdraw_amount,
    deposit_cases,
    withdraw_cases
FROM blue_whale_myr
WHERE year = 2025 
  AND userkey = (
    SELECT userkey 
    FROM blue_whale_myr 
    WHERE year = 2025 
    LIMIT 1
  )
ORDER BY date DESC
LIMIT 10;

-- ============================================================================
-- 6. TEST COHORT LOGIC (Sample for 1 day)
-- ============================================================================

-- 6a. Active member count (today)
SELECT 
    date,
    line,
    COUNT(DISTINCT userkey) as active_member
FROM blue_whale_myr
WHERE date = '2025-10-21'
  AND deposit_cases > 0
GROUP BY date, line
ORDER BY line;

-- 6b. New depositor count (first_deposit_date = today)
SELECT 
    date,
    line,
    COUNT(DISTINCT CASE 
        WHEN first_deposit_date = date THEN userkey 
    END) as new_depositor
FROM blue_whale_myr
WHERE date = '2025-10-21'
  AND deposit_cases > 0
GROUP BY date, line
ORDER BY line;

-- 6c. Check if previous day data exists
SELECT 
    date,
    line,
    COUNT(DISTINCT userkey) as active_member
FROM blue_whale_myr
WHERE date = '2025-10-20'
  AND deposit_cases > 0
GROUP BY date, line
ORDER BY line;

-- ============================================================================
-- 7. CHECK INDEXES (Performance optimization)
-- ============================================================================
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'blue_whale_myr';

-- ============================================================================
-- 8. CHECK TABLE SIZE & ROW COUNT
-- ============================================================================
SELECT 
    pg_size_pretty(pg_total_relation_size('blue_whale_myr')) as total_size,
    pg_size_pretty(pg_relation_size('blue_whale_myr')) as table_size,
    pg_size_pretty(pg_indexes_size('blue_whale_myr')) as indexes_size,
    (SELECT COUNT(*) FROM blue_whale_myr) as total_rows,
    (SELECT COUNT(*) FROM blue_whale_myr WHERE year = 2025) as rows_2025;

-- ============================================================================
-- END OF ANALYSIS
-- ============================================================================

