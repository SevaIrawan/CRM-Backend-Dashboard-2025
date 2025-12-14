-- ============================================================================
-- CHECK UPDATE_UNIQUE_CODE STATUS
-- ============================================================================
-- Purpose: Count berapa banyak unique_code yang sudah update
-- Logic: Compare unique_code dengan update_unique_code
-- ============================================================================

-- ============================================================================
-- OVERALL STATUS (All Tables: USC, MYR, SGD)
-- ============================================================================

-- USC Table
SELECT 
  'USC' as currency,
  COUNT(*) as total_rows,
  COUNT(update_unique_code) as rows_with_update_unique_code,
  COUNT(*) - COUNT(update_unique_code) as rows_missing_update_unique_code,
  COUNT(CASE WHEN unique_code != update_unique_code THEN 1 END) as rows_updated,
  COUNT(CASE WHEN unique_code = update_unique_code THEN 1 END) as rows_same,
  COUNT(CASE WHEN update_unique_code IS NULL THEN 1 END) as rows_null,
  ROUND(COUNT(CASE WHEN unique_code != update_unique_code THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as percent_updated
FROM blue_whale_usc

UNION ALL

-- MYR Table
SELECT 
  'MYR' as currency,
  COUNT(*) as total_rows,
  COUNT(update_unique_code) as rows_with_update_unique_code,
  COUNT(*) - COUNT(update_unique_code) as rows_missing_update_unique_code,
  COUNT(CASE WHEN unique_code != update_unique_code THEN 1 END) as rows_updated,
  COUNT(CASE WHEN unique_code = update_unique_code THEN 1 END) as rows_same,
  COUNT(CASE WHEN update_unique_code IS NULL THEN 1 END) as rows_null,
  ROUND(COUNT(CASE WHEN unique_code != update_unique_code THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as percent_updated
FROM blue_whale_myr

UNION ALL

-- SGD Table
SELECT 
  'SGD' as currency,
  COUNT(*) as total_rows,
  COUNT(update_unique_code) as rows_with_update_unique_code,
  COUNT(*) - COUNT(update_unique_code) as rows_missing_update_unique_code,
  COUNT(CASE WHEN unique_code != update_unique_code THEN 1 END) as rows_updated,
  COUNT(CASE WHEN unique_code = update_unique_code THEN 1 END) as rows_same,
  COUNT(CASE WHEN update_unique_code IS NULL THEN 1 END) as rows_null,
  ROUND(COUNT(CASE WHEN unique_code != update_unique_code THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as percent_updated
FROM blue_whale_sgd

ORDER BY currency;

-- ============================================================================
-- DETAILED STATUS PER TABLE (USC)
-- ============================================================================
SELECT 
  'USC' as currency,
  COUNT(*) as total_rows,
  COUNT(update_unique_code) as rows_with_update_unique_code,
  COUNT(*) - COUNT(update_unique_code) as rows_missing_update_unique_code,
  COUNT(CASE WHEN unique_code != update_unique_code THEN 1 END) as rows_updated,
  COUNT(CASE WHEN unique_code = update_unique_code THEN 1 END) as rows_same,
  COUNT(CASE WHEN update_unique_code IS NULL THEN 1 END) as rows_null,
  ROUND(COUNT(CASE WHEN unique_code != update_unique_code THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as percent_updated
FROM blue_whale_usc;

-- ============================================================================
-- SAMPLE DATA: Rows yang sudah update (unique_code != update_unique_code)
-- ============================================================================
SELECT 
  user_unique,
  unique_code,
  update_unique_code,
  last_deposit_date,
  COUNT(*) as row_count
FROM blue_whale_usc
WHERE unique_code != update_unique_code
  AND update_unique_code IS NOT NULL
GROUP BY user_unique, unique_code, update_unique_code, last_deposit_date
ORDER BY row_count DESC
LIMIT 20;

-- ============================================================================
-- SAMPLE DATA: Rows yang belum di-backfill (update_unique_code IS NULL)
-- ============================================================================
SELECT 
  user_unique,
  unique_code,
  update_unique_code,
  last_deposit_date,
  COUNT(*) as row_count
FROM blue_whale_usc
WHERE update_unique_code IS NULL
GROUP BY user_unique, unique_code, update_unique_code, last_deposit_date
ORDER BY row_count DESC
LIMIT 20;

-- ============================================================================
-- SUMMARY BY user_unique: Count distinct unique_code vs update_unique_code
-- ============================================================================
SELECT 
  user_unique,
  COUNT(DISTINCT unique_code) as distinct_unique_codes,
  COUNT(DISTINCT update_unique_code) as distinct_update_unique_codes,
  COUNT(*) as total_rows,
  MAX(last_deposit_date) as latest_deposit_date
FROM blue_whale_usc
WHERE user_unique IS NOT NULL
GROUP BY user_unique
HAVING COUNT(DISTINCT unique_code) > 1  -- Only show user_unique yang punya multiple unique_code
ORDER BY distinct_unique_codes DESC, total_rows DESC
LIMIT 20;

-- ============================================================================
-- DONE!
-- ============================================================================

