-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TEST CHURN LOGIC (Sep 30, 2025 - SBMY)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Step 1: Manual calculation (active Sept 29, NOT active Sept 30)
SELECT 
  COUNT(DISTINCT prev_day.userkey) as manual_churn_count
FROM blue_whale_myr prev_day
LEFT JOIN blue_whale_myr current_day
  ON prev_day.userkey = current_day.userkey
  AND prev_day.line = current_day.line
  AND current_day.date = '2025-09-30'
  AND current_day.deposit_cases > 0
WHERE prev_day.currency = 'MYR'
  AND prev_day.line = 'SBMY'
  AND prev_day.date = '2025-09-29'
  AND prev_day.deposit_cases > 0
  AND current_day.userkey IS NULL;  -- NOT active Sept 30

-- Step 2: Check MV value
SELECT 
  date,
  line,
  churn_member as mv_churn_count
FROM bp_daily_summary_myr
WHERE date = '2025-09-30'
  AND line = 'SBMY';

-- Step 3: Sample churn users (first 10)
SELECT 
  prev_day.userkey,
  prev_day.date as last_active_date,
  prev_day.deposit_cases as last_deposit_cases,
  current_day.userkey as still_active_next_day
FROM blue_whale_myr prev_day
LEFT JOIN blue_whale_myr current_day
  ON prev_day.userkey = current_day.userkey
  AND prev_day.line = current_day.line
  AND current_day.date = '2025-09-30'
  AND current_day.deposit_cases > 0
WHERE prev_day.currency = 'MYR'
  AND prev_day.line = 'SBMY'
  AND prev_day.date = '2025-09-29'
  AND prev_day.deposit_cases > 0
  AND current_day.userkey IS NULL  -- Churn users
LIMIT 10;

-- Step 4: Cross-check - Active Sept 29
SELECT 
  COUNT(DISTINCT userkey) as active_sept_29
FROM blue_whale_myr
WHERE currency = 'MYR'
  AND line = 'SBMY'
  AND date = '2025-09-29'
  AND deposit_cases > 0;

