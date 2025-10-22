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
--   - Per Line per Date aggregation + line='ALL' (total per date)
--   - ✅ VALID in MV: Financial aggregates + SUM-based KPIs
--      • new_register, new_depositor (from JOIN)
--      • GGR, Net Profit, ATV, Winrate, Withdrawal Rate, Hold %, Conversion Rate
--   - ❌ MUST BE CALCULATED via API (need COUNT DISTINCT):
--      • Active Member, Pure User, Pure Active, PF, Bonus Usage Rate, DA User, GGR User
--      • Retention, Reactivation, Churn (member + rate)
--   - uniquekey for JOIN: line || '-' || date || '-' || currency
-- ===========================================

-- Step 1: Drop existing MV
DROP MATERIALIZED VIEW IF EXISTS bp_daily_summary_myr CASCADE;

-- Step 2: Create MV
CREATE MATERIALIZED VIEW bp_daily_summary_myr AS

WITH 
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CTE 1: DAILY FINANCIAL AGGREGATES per DATE/LINE
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
    
    -- ✅ SUM FINANCIAL COLUMNS (NO COUNT DISTINCT)
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
-- CTE 2: JOIN dengan new_register (using uniquekey)
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
  -- ✅ NEW USER METRICS (from JOIN)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  new_register,
  new_depositor,
  
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
  -- ✅ PRE-CALCULATED KPIs (AFTER SUM - Pure SUM-based)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  -- GGR = SUM(deposit) - SUM(withdraw)
  (sum_deposit_amount - sum_withdraw_amount) as ggr,
  
  -- Net Profit = (SUM(deposit) + SUM(add)) - (SUM(withdraw) + SUM(deduct))
  (sum_deposit_amount + sum_add_transaction - sum_withdraw_amount - sum_deduct_transaction) as net_profit,
  
  -- ATV = SUM(deposit) / SUM(deposit_cases)
  CASE 
    WHEN sum_deposit_cases > 0 
    THEN sum_deposit_amount::NUMERIC / sum_deposit_cases
    ELSE 0 
  END as atv,
  
  -- Winrate = GGR / SUM(deposit) = (SUM(deposit) - SUM(withdraw)) / SUM(deposit)
  CASE 
    WHEN sum_deposit_amount > 0 
    THEN ((sum_deposit_amount - sum_withdraw_amount)::NUMERIC / sum_deposit_amount) * 100
    ELSE 0 
  END as winrate,
  
  -- Withdrawal Rate = SUM(withdraw_cases) / SUM(deposit_cases)
  CASE 
    WHEN sum_deposit_cases > 0 
    THEN (sum_withdraw_cases::NUMERIC / sum_deposit_cases) * 100
    ELSE 0 
  END as withdrawal_rate,
  
  -- Hold Percentage = net_profit / SUM(valid_amount)
  CASE 
    WHEN sum_valid_amount > 0 
    THEN ((sum_deposit_amount + sum_add_transaction - sum_withdraw_amount - sum_deduct_transaction)::NUMERIC / sum_valid_amount) * 100
    ELSE 0 
  END as hold_percentage,
  
  -- Conversion Rate = new_depositor / new_register
  CASE 
    WHEN new_register > 0 
    THEN (new_depositor::NUMERIC / new_register) * 100
    ELSE 0
  END as conversion_rate
  
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- ❌ REMOVED (Calculate in API - need COUNT DISTINCT):
  -- active_member, pure_user, pure_active, pf, bonus_usage_rate, 
  -- da_user, ggr_user, retention, reactivation, churn
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FROM with_new_users

UNION ALL

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- AGGREGATED ROW: line='ALL' (TOTAL ALL BRANDS PER DATE)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT 
  date,
  year,
  month,
  quarter,
  'ALL' as line,
  currency,
  'ALL-' || date || '-' || currency as uniquekey,
  
  -- ✅ NEW USER METRICS (SUM from all brands)
  SUM(new_register) as new_register,
  SUM(new_depositor) as new_depositor,
  
  -- ✅ FINANCIAL AGGREGATES (SUM from all brands)
  SUM(sum_deposit_amount) as deposit_amount,
  SUM(sum_deposit_cases) as deposit_cases,
  SUM(sum_withdraw_amount) as withdraw_amount,
  SUM(sum_withdraw_cases) as withdraw_cases,
  SUM(sum_bonus) as bonus,
  SUM(sum_add_bonus) as add_bonus,
  SUM(sum_add_transaction) as add_transaction,
  SUM(sum_deduct_bonus) as deduct_bonus,
  SUM(sum_deduct_transaction) as deduct_transaction,
  SUM(sum_bets_amount) as bets_amount,
  SUM(sum_valid_amount) as valid_amount,
  
  -- ✅ PRE-CALCULATED KPIs (AFTER SUM of all brands)
  SUM(sum_deposit_amount) - SUM(sum_withdraw_amount) as ggr,
  SUM(sum_deposit_amount) + SUM(sum_add_transaction) - SUM(sum_withdraw_amount) - SUM(sum_deduct_transaction) as net_profit,
  
  CASE 
    WHEN SUM(sum_deposit_cases) > 0 
    THEN SUM(sum_deposit_amount)::NUMERIC / SUM(sum_deposit_cases)
    ELSE 0 
  END as atv,
  
  CASE 
    WHEN SUM(sum_deposit_amount) > 0 
    THEN ((SUM(sum_deposit_amount) - SUM(sum_withdraw_amount))::NUMERIC / SUM(sum_deposit_amount)) * 100
    ELSE 0 
  END as winrate,
  
  CASE 
    WHEN SUM(sum_deposit_cases) > 0 
    THEN (SUM(sum_withdraw_cases)::NUMERIC / SUM(sum_deposit_cases)) * 100
    ELSE 0 
  END as withdrawal_rate,
  
  CASE 
    WHEN SUM(sum_valid_amount) > 0 
    THEN ((SUM(sum_deposit_amount) + SUM(sum_add_transaction) - SUM(sum_withdraw_amount) - SUM(sum_deduct_transaction))::NUMERIC / SUM(sum_valid_amount)) * 100
    ELSE 0 
  END as hold_percentage,
  
  CASE 
    WHEN SUM(new_register) > 0 
    THEN (SUM(new_depositor)::NUMERIC / SUM(new_register)) * 100
    ELSE 0
  END as conversion_rate

FROM with_new_users
GROUP BY date, year, month, quarter, currency

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
  new_register,
  new_depositor,
  deposit_amount,
  withdraw_amount,
  ggr,
  net_profit,
  atv,
  winrate,
  withdrawal_rate
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

-- Validate: GGR = Deposit - Withdraw
SELECT 
  date,
  line,
  deposit_amount,
  withdraw_amount,
  ggr,
  deposit_amount - withdraw_amount as calc_ggr,
  CASE 
    WHEN ABS(ggr - (deposit_amount - withdraw_amount)) < 0.01 THEN '✅ VALID'
    ELSE '❌ MISMATCH'
  END as validation
FROM bp_daily_summary_myr
WHERE date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY date DESC, line
LIMIT 10;

-- Validate: Winrate = GGR / Deposit
SELECT 
  date,
  line,
  deposit_amount,
  ggr,
  winrate,
  CASE WHEN deposit_amount > 0 THEN (ggr / deposit_amount) * 100 ELSE 0 END as calc_winrate,
  CASE 
    WHEN ABS(winrate - (CASE WHEN deposit_amount > 0 THEN (ggr / deposit_amount) * 100 ELSE 0 END)) < 0.01 THEN '✅ VALID'
    ELSE '❌ MISMATCH'
  END as validation
FROM bp_daily_summary_myr
WHERE date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY date DESC, line
LIMIT 10;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📝 CRITICAL NOTES (SIMPLIFIED DAILY MV)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. MV stores: Financial aggregates + SUM-based KPIs only
-- 2. Pre-calculated KPIs: GGR, Net Profit, ATV, Winrate, Withdrawal Rate, Hold %, Conversion Rate
-- 3. API calculates: Active Member, Pure User, Pure Active, PF, Bonus Usage, DA User, GGR User
-- 4. API calculates: Retention, Reactivation, Churn (need COUNT DISTINCT + cohort logic)
-- 5. JOIN Pattern: Uses uniquekey (line-date-currency) with new_register
-- 6. Formula: Winrate = GGR / Deposit = (Deposit - Withdraw) / Deposit
-- 7. Performance: Fast refresh (~10-30s), sub-100ms query, minimal aggregation
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
