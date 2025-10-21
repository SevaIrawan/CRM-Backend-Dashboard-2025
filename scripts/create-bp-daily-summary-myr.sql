-- ===========================================
-- MATERIALIZED VIEW: bp_daily_summary_myr
-- ===========================================
-- Purpose: Daily summary untuk Business Performance Page (MYR)
-- Based on blue_whale_myr_summary pattern
-- 
-- Data Sources:
--   1. blue_whale_myr (master table)
--   2. new_register (via uniquekey JOIN)
-- 
-- Key Features:
--   - Per Line per Date aggregation
--   - Cohort calculations (Retention, Reactivation, Churn)
--   - Reactivation: Inactive > 30 days & NOT new depositor current month
--   - uniquekey for JOIN: line || '-' || date || '-' || currency
-- ===========================================

-- Step 1: Drop existing MV
DROP MATERIALIZED VIEW IF EXISTS bp_daily_summary_myr CASCADE;

-- Step 2: Create MV
CREATE MATERIALIZED VIEW bp_daily_summary_myr AS

WITH 
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CTE 1: USER ACTIVITY TRACKING (for cohort logic)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
user_activity AS (
  SELECT 
    userkey,
    line,
    date as current_date,
    first_deposit_date,
    deposit_cases,
    -- Previous active date
    LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as prev_active_date,
    -- Days since last active
    date - LAG(date) OVER (PARTITION BY userkey, line ORDER BY date) as days_since_last_active
  FROM blue_whale_myr
  WHERE currency = 'MYR'
    AND deposit_cases > 0
),

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CTE 2: DAILY FINANCIAL AGGREGATES per DATE/LINE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
daily_aggregated AS (
  SELECT 
    date,
    EXTRACT(YEAR FROM date)::TEXT as year,
    EXTRACT(MONTH FROM date)::TEXT as month,
    CASE 
      WHEN EXTRACT(MONTH FROM date) IN (1,2,3) THEN 'Q1'
      WHEN EXTRACT(MONTH FROM date) IN (4,5,6) THEN 'Q2'
      WHEN EXTRACT(MONTH FROM date) IN (7,8,9) THEN 'Q3'
      ELSE 'Q4'
    END as quarter,
    line,
    currency,
    
    -- ✅ uniquekey untuk JOIN dengan new_register
    line || '-' || date || '-' || currency as uniquekey,
    
    -- ✅ ACTIVE MEMBER & PURE USER
    COUNT(DISTINCT CASE WHEN deposit_cases > 0 THEN userkey END) as active_member,
    COUNT(DISTINCT CASE WHEN deposit_cases > 0 THEN unique_code END) as pure_user,
    
    -- ✅ SUM FINANCIAL COLUMNS
    SUM(deposit_amount) as sum_deposit_amount,
    SUM(deposit_cases) as sum_deposit_cases,
    SUM(withdraw_amount) as sum_withdraw_amount,
    SUM(withdraw_cases) as sum_withdraw_cases,
    SUM(bonus) as sum_bonus,
    SUM(add_bonus) as sum_add_bonus,
    SUM(add_transaction) as sum_add_transaction,
    SUM(deduct_bonus) as sum_deduct_bonus,
    SUM(deduct_transaction) as sum_deduct_transaction,
    SUM(bets_amount) as sum_bets_amount,
    SUM(valid_amount) as sum_valid_amount
    
  FROM blue_whale_myr
  WHERE currency = 'MYR'
  GROUP BY date, year, month, line, currency
),

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CTE 3: RETENTION MEMBER (Active today AND yesterday)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
retention_data AS (
  SELECT 
    current_date as date,
    line,
    COUNT(DISTINCT userkey) as retention_member
  FROM user_activity
  WHERE days_since_last_active = 1  -- Active yesterday and today
  GROUP BY current_date, line
),

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CTE 4: REACTIVATION MEMBER 
-- Logic: Inactive > 30 days & NOT new depositor current month
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
reactivation_data AS (
  SELECT 
    current_date as date,
    line,
    COUNT(DISTINCT userkey) as reactivation_member
  FROM user_activity
  WHERE days_since_last_active > 30  -- Inactive > 30 days
    -- NOT New Depositor current month (using first_deposit_date)
    AND NOT (
      EXTRACT(YEAR FROM first_deposit_date) = EXTRACT(YEAR FROM current_date)
      AND EXTRACT(MONTH FROM first_deposit_date) = EXTRACT(MONTH FROM current_date)
    )
  GROUP BY current_date, line
),

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CTE 5: CHURN MEMBER (Active yesterday, NOT today)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
churn_data AS (
  SELECT 
    prev_day.date + INTERVAL '1 day' as date,
    prev_day.line,
    COUNT(DISTINCT prev_day.userkey) as churn_member
  FROM blue_whale_myr prev_day
  LEFT JOIN blue_whale_myr current_day
    ON prev_day.userkey = current_day.userkey
    AND prev_day.line = current_day.line
    AND current_day.date = prev_day.date + INTERVAL '1 day'
    AND current_day.deposit_cases > 0
  WHERE prev_day.currency = 'MYR'
    AND prev_day.deposit_cases > 0
    AND current_day.userkey IS NULL  -- NOT active next day
  GROUP BY prev_day.date, prev_day.line
),

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CTE 6: JOIN dengan new_register (using uniquekey)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with_new_users AS (
  SELECT 
    da.*,
    -- ✅ JOIN dengan new_register menggunakan uniquekey
    COALESCE(nr.new_register, 0) as new_register,
    COALESCE(nr.new_depositor, 0) as new_depositor
  FROM daily_aggregated da
  LEFT JOIN new_register nr ON (
    nr.uniquekey = da.uniquekey
    AND nr.currency = 'MYR'
  )
),

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CTE 7: JOIN dengan cohort data (retention, reactivation, churn)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
with_cohorts AS (
  SELECT 
    wnu.*,
    COALESCE(rt.retention_member, 0) as retention_member,
    COALESCE(ra.reactivation_member, 0) as reactivation_member,
    COALESCE(ch.churn_member, 0) as churn_member
  FROM with_new_users wnu
  LEFT JOIN retention_data rt 
    ON wnu.date = rt.date 
    AND wnu.line = rt.line
  LEFT JOIN reactivation_data ra 
    ON wnu.date = ra.date 
    AND wnu.line = ra.line
  LEFT JOIN churn_data ch 
    ON wnu.date = ch.date 
    AND wnu.line = ch.line
)

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FINAL SELECT: All columns + Calculated KPIs
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT 
  date,
  year,
  month,
  quarter,
  line,
  currency,
  uniquekey,
  
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- ✅ MEMBER METRICS
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  active_member,
  pure_user,
  new_register,
  new_depositor,
  retention_member,
  reactivation_member,
  churn_member,
  
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- ✅ FINANCIAL AGGREGATES (SUM)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sum_deposit_amount as deposit_amount,
  sum_deposit_cases as deposit_cases,
  sum_withdraw_amount as withdraw_amount,
  sum_withdraw_cases as withdraw_cases,
  sum_bonus as bonus,
  sum_add_bonus as add_bonus,
  sum_add_transaction as add_transaction,
  sum_deduct_bonus as deduct_bonus,
  sum_deduct_transaction as deduct_transaction,
  sum_bets_amount as bets_amount,
  sum_valid_amount as valid_amount,
  
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- ✅ CALCULATED KPIs (from SUM aggregates)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  -- Pure Active/Pure Member = Active Member - New Depositor
  (active_member - new_depositor) as pure_active,
  
  -- GGR = sum[deposit_amount] - sum[withdraw_amount]
  (sum_deposit_amount - sum_withdraw_amount) as ggr,
  
  -- Net Profit = sum[deposit] - sum[withdraw] - sum[deduct_trans] + sum[add_trans]
  (sum_deposit_amount + sum_add_transaction - sum_withdraw_amount - sum_deduct_transaction) as net_profit,
  
  -- ATV = sum[deposit_amount] / sum[deposit_cases]
  CASE 
    WHEN sum_deposit_cases > 0 
    THEN sum_deposit_amount::NUMERIC / sum_deposit_cases
    ELSE 0 
  END as atv,
  
  -- PF (Purchase Frequency) = sum[deposit_cases] / active_member
  CASE 
    WHEN active_member > 0
    THEN sum_deposit_cases::NUMERIC / active_member
    ELSE 0
  END as pf,
  
  -- Win Rate = (sum[deposit] - sum[withdraw]) / sum[deposit] * 100
  CASE 
    WHEN sum_deposit_amount > 0 
    THEN ((sum_deposit_amount - sum_withdraw_amount)::NUMERIC / sum_deposit_amount) * 100
    ELSE 0 
  END as winrate,
  
  -- Withdrawal Rate = sum[withdraw_cases] / sum[deposit_cases] * 100
  CASE 
    WHEN sum_deposit_cases > 0 
    THEN (sum_withdraw_cases::NUMERIC / sum_deposit_cases) * 100
    ELSE 0 
  END as withdrawal_rate,
  
  -- Bonus Usage Rate = (sum[bonus] + sum[add_bonus] - sum[deduct_bonus]) / active_member
  CASE 
    WHEN active_member > 0 
    THEN (sum_bonus + sum_add_bonus - sum_deduct_bonus)::NUMERIC / active_member
    ELSE 0 
  END as bonus_usage_rate,
  
  -- Hold Percentage = net_profit / valid_amount * 100
  CASE 
    WHEN sum_valid_amount > 0 
    THEN ((sum_deposit_amount + sum_add_transaction - sum_withdraw_amount - sum_deduct_transaction)::NUMERIC / sum_valid_amount) * 100
    ELSE 0 
  END as hold_percentage,
  
  -- DA User (Deposit Amount per User) = sum[deposit_amount] / active_member
  CASE 
    WHEN active_member > 0
    THEN sum_deposit_amount::NUMERIC / active_member
    ELSE 0
  END as da_user,
  
  -- GGR User = Net Profit / Active Member
  CASE 
    WHEN active_member > 0
    THEN (sum_deposit_amount + sum_add_transaction - sum_withdraw_amount - sum_deduct_transaction)::NUMERIC / active_member
    ELSE 0
  END as ggr_user,
  
  -- Conversion Rate = new_depositor / new_register * 100
  CASE 
    WHEN new_register > 0 
    THEN (new_depositor::NUMERIC / new_register) * 100
    ELSE 0
  END as conversion_rate,
  
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- ✅ COHORT RATES (%)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  -- Retention Rate = retention / (retention + churn) * 100
  CASE 
    WHEN (retention_member + churn_member) > 0
    THEN (retention_member::NUMERIC / (retention_member + churn_member)) * 100
    ELSE 0
  END as retention_rate,
  
  -- Churn Rate = 100 - retention_rate
  CASE 
    WHEN (retention_member + churn_member) > 0
    THEN 100 - ((retention_member::NUMERIC / (retention_member + churn_member)) * 100)
    ELSE 0
  END as churn_rate,
  
  -- Reactivation Rate = reactivation / (reactivation + retention) * 100
  CASE 
    WHEN (reactivation_member + retention_member) > 0
    THEN (reactivation_member::NUMERIC / (reactivation_member + retention_member)) * 100
    ELSE 0
  END as reactivation_rate

FROM with_cohorts
ORDER BY date DESC, line;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 3: Create Indexes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX idx_bp_daily_myr_date ON bp_daily_summary_myr(date);
CREATE INDEX idx_bp_daily_myr_year_month ON bp_daily_summary_myr(year, month);
CREATE INDEX idx_bp_daily_myr_line ON bp_daily_summary_myr(line);
CREATE INDEX idx_bp_daily_myr_currency ON bp_daily_summary_myr(currency);
CREATE INDEX idx_bp_daily_myr_uniquekey ON bp_daily_summary_myr(uniquekey);
CREATE INDEX idx_bp_daily_myr_date_line ON bp_daily_summary_myr(date DESC, line);
CREATE INDEX idx_bp_daily_myr_quarter ON bp_daily_summary_myr(year, quarter);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Step 4: Refresh MV
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFRESH MATERIALIZED VIEW bp_daily_summary_myr;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION QUERIES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Check MV structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bp_daily_summary_myr' 
ORDER BY ordinal_position;

-- 2. Check sample data (last 7 days)
SELECT 
  date,
  line,
  active_member,
  new_depositor,
  pure_active,
  retention_member,
  reactivation_member,
  churn_member,
  ggr,
  net_profit,
  ggr_user
FROM bp_daily_summary_myr 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, line
LIMIT 20;

-- 3. Check data count
SELECT COUNT(*) as total_records FROM bp_daily_summary_myr;

-- 4. Check currency filter
SELECT DISTINCT currency FROM bp_daily_summary_myr;

-- 5. Check date range
SELECT MIN(date) as min_date, MAX(date) as max_date FROM bp_daily_summary_myr;

-- 6. Check lines
SELECT DISTINCT line FROM bp_daily_summary_myr ORDER BY line;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VALIDATION QUERIES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Validate: Active Member = New Depositor + Pure Active
SELECT 
  date,
  line,
  active_member,
  new_depositor,
  pure_active,
  (active_member - (new_depositor + pure_active)) as difference,
  CASE 
    WHEN active_member = new_depositor + pure_active THEN '✅ VALID'
    ELSE '❌ MISMATCH'
  END as validation
FROM bp_daily_summary_myr
WHERE date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY date DESC, line;

-- Validate: Pure Active = Retention + Reactivation
SELECT 
  date,
  line,
  pure_active,
  retention_member,
  reactivation_member,
  (pure_active - (retention_member + reactivation_member)) as difference,
  CASE 
    WHEN pure_active = retention_member + reactivation_member THEN '✅ VALID'
    ELSE '⚠️ CHECK'
  END as validation
FROM bp_daily_summary_myr
WHERE date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY date DESC, line;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📝 CRITICAL NOTES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. JOIN Pattern: Uses uniquekey (line-date-currency) same as new_register
-- 2. Reactivation Logic: Inactive > 30 days & NOT new depositor current month
-- 3. GGR User Formula: Net Profit / Active Member (NOT ggr / active)
-- 4. All KPIs: Calculated from SUM aggregates first
-- 5. COALESCE: Used for NULL safety in all JOINs
-- 6. Performance: ~3-5 min refresh, <100ms query from MV
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
