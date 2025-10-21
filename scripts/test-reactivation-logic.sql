-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🧪 TEST QUERIES: REACTIVATION LOGIC VALIDATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Purpose: Verify reactivation member calculation logic
-- Logic: Inactive > 30 days & NOT new depositor current month
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TEST 1: Check User Activity Pattern with first_deposit_date
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WITH user_activity AS (
  SELECT 
    userkey,
    line,
    date,
    first_deposit_date,
    deposit_cases,
    LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as prev_active_date,
    date - LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as days_since_last_active,
    -- Check if new depositor current month
    CASE 
      WHEN EXTRACT(YEAR FROM first_deposit_date) = EXTRACT(YEAR FROM date)
        AND EXTRACT(MONTH FROM first_deposit_date) = EXTRACT(MONTH FROM date)
      THEN 'YES'
      ELSE 'NO'
    END as is_new_depositor_current_month
  FROM blue_whale_myr
  WHERE currency = 'MYR'
    AND deposit_cases > 0
    AND date >= CURRENT_DATE - INTERVAL '90 days'
  ORDER BY userkey, line, date
)

SELECT 
  userkey,
  line,
  date as current_date,
  prev_active_date,
  days_since_last_active,
  first_deposit_date,
  is_new_depositor_current_month,
  CASE 
    WHEN days_since_last_active > 30 AND is_new_depositor_current_month = 'NO' 
    THEN '✅ REACTIVATION'
    WHEN days_since_last_active > 30 AND is_new_depositor_current_month = 'YES'
    THEN '❌ NEW DEPOSITOR (Excluded)'
    WHEN days_since_last_active <= 30
    THEN '⏺️ RETENTION/ACTIVE'
    WHEN days_since_last_active IS NULL
    THEN '🆕 FIRST ACTIVITY'
    ELSE '❓ OTHER'
  END as status
FROM user_activity
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, 
  CASE 
    WHEN days_since_last_active > 30 AND is_new_depositor_current_month = 'NO' THEN 1
    ELSE 2
  END,
  userkey
LIMIT 50;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TEST 2: Count Reactivation Members per Date
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WITH user_activity AS (
  SELECT 
    userkey,
    line,
    date,
    first_deposit_date,
    LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as prev_active_date,
    date - LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as days_since_last_active
  FROM blue_whale_myr
  WHERE currency = 'MYR'
    AND deposit_cases > 0
)

SELECT 
  date,
  line,
  COUNT(DISTINCT userkey) as reactivation_count
FROM user_activity
WHERE days_since_last_active > 30
  AND NOT (
    EXTRACT(YEAR FROM first_deposit_date) = EXTRACT(YEAR FROM date)
    AND EXTRACT(MONTH FROM first_deposit_date) = EXTRACT(MONTH FROM date)
  )
  AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date, line
ORDER BY date DESC, line;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TEST 3: Validate Reactivation Examples
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Find specific examples of reactivation users
WITH user_activity AS (
  SELECT 
    userkey,
    line,
    date,
    first_deposit_date,
    deposit_cases,
    LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as prev_active_date,
    date - LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as days_since_last_active
  FROM blue_whale_myr
  WHERE currency = 'MYR'
    AND deposit_cases > 0
    AND date >= CURRENT_DATE - INTERVAL '90 days'
)

SELECT 
  userkey,
  line,
  date as return_date,
  prev_active_date as last_active_before_return,
  days_since_last_active as days_inactive,
  first_deposit_date,
  DATE_PART('year', first_deposit_date) as first_deposit_year,
  DATE_PART('month', first_deposit_date) as first_deposit_month,
  DATE_PART('year', date) as current_year,
  DATE_PART('month', date) as current_month,
  CASE 
    WHEN DATE_PART('year', first_deposit_date) = DATE_PART('year', date)
      AND DATE_PART('month', first_deposit_date) = DATE_PART('month', date)
    THEN '❌ NEW DEPOSITOR CURRENT MONTH'
    ELSE '✅ OLD USER'
  END as user_type
FROM user_activity
WHERE days_since_last_active > 30
  AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY days_since_last_active DESC
LIMIT 20;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TEST 4: Compare with New Depositor from new_register table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Verify that reactivation logic correctly excludes new depositors
WITH reactivation_candidates AS (
  SELECT 
    userkey,
    line,
    date,
    first_deposit_date,
    LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as prev_active_date,
    date - LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as days_since_last_active
  FROM blue_whale_myr
  WHERE currency = 'MYR'
    AND deposit_cases > 0
    AND date = CURRENT_DATE - INTERVAL '1 day'  -- Yesterday
),
new_dep_check AS (
  SELECT 
    rc.*,
    nr.new_depositor as new_depositor_count,
    CASE 
      WHEN EXTRACT(YEAR FROM rc.first_deposit_date) = EXTRACT(YEAR FROM rc.date)
        AND EXTRACT(MONTH FROM rc.first_deposit_date) = EXTRACT(MONTH FROM rc.date)
      THEN 'NEW_DEPOSITOR'
      ELSE 'OLD_USER'
    END as classification
  FROM reactivation_candidates rc
  LEFT JOIN new_register nr
    ON rc.date = nr.date
    AND rc.line = nr.line
    AND nr.currency = 'MYR'
  WHERE rc.days_since_last_active > 30
)

SELECT 
  date,
  line,
  classification,
  COUNT(DISTINCT userkey) as user_count,
  CASE 
    WHEN classification = 'OLD_USER' THEN '✅ REACTIVATION'
    ELSE '❌ EXCLUDED (New Depositor)'
  END as status
FROM new_dep_check
GROUP BY date, line, classification
ORDER BY date DESC, line, classification;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TEST 5: Edge Cases Check
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Check for edge cases that might cause issues
SELECT 
  'Edge Case Analysis' as test_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT userkey) as unique_users,
  COUNT(CASE WHEN first_deposit_date IS NULL THEN 1 END) as null_first_deposit,
  COUNT(CASE WHEN first_deposit_date > date THEN 1 END) as future_first_deposit,
  COUNT(CASE WHEN deposit_cases <= 0 THEN 1 END) as zero_deposit_cases
FROM blue_whale_myr
WHERE currency = 'MYR'
  AND date >= CURRENT_DATE - INTERVAL '7 days';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TEST 6: Daily Reactivation Count Trend (Last 30 Days)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WITH user_activity AS (
  SELECT 
    userkey,
    line,
    date,
    first_deposit_date,
    LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as prev_active_date,
    date - LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as days_since_last_active
  FROM blue_whale_myr
  WHERE currency = 'MYR'
    AND deposit_cases > 0
)

SELECT 
  date,
  line,
  COUNT(DISTINCT userkey) as reactivation_member,
  AVG(days_since_last_active) as avg_days_inactive,
  MIN(days_since_last_active) as min_days_inactive,
  MAX(days_since_last_active) as max_days_inactive
FROM user_activity
WHERE days_since_last_active > 30
  AND NOT (
    EXTRACT(YEAR FROM first_deposit_date) = EXTRACT(YEAR FROM date)
    AND EXTRACT(MONTH FROM first_deposit_date) = EXTRACT(MONTH FROM date)
  )
  AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date, line
ORDER BY date DESC, line;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 EXPECTED RESULTS:
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. All reactivation users have days_since_last_active > 30
-- 2. All reactivation users have first_deposit_date NOT in current month
-- 3. No NULL first_deposit_date in reactivation users
-- 4. Reactivation count matches MV data (if MV already created)
-- 5. Trend shows realistic reactivation patterns
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

