-- ============================================================================
-- SIMPLIFIED MATERIALIZED VIEW: bp_quarter_summary_myr
-- ============================================================================
-- Purpose: LIGHTWEIGHT MV untuk Business Performance (MYR)
-- Strategy: Hanya simpan FINANCIAL AGGREGATES, semua KPI calculate di API
--
-- Data Levels:
--   1. MONTHLY - Per Brand (e.g., JMMY-2025-10-MYR)
--   2. MONTHLY - ALL Brands (e.g., ALL-2025-10-MYR)
--   3. QUARTERLY - Per Brand (e.g., JMMY-Q4-2025-MYR)
--   4. QUARTERLY - ALL Brands (e.g., ALL-Q4-2025-MYR)
--
-- What's Stored (LIGHTWEIGHT):
--   - Financial aggregates (deposit, withdraw, bonus, etc.) - SUM only
--   - new_register, new_depositor (from JOIN)
--   - Date info (year, month, quarter, period_type)
--
-- What's NOT Stored (CALCULATE in API):
--   - active_member (COUNT DISTINCT in API)
--   - pure_user (COUNT DISTINCT in API)
--   - All KPIs: ATV, PF, DA User, GGR User, etc. (API)
--   - Cohort metrics: Retention, Reactivation, Churn (API)
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS bp_quarter_summary_myr CASCADE;

CREATE MATERIALIZED VIEW bp_quarter_summary_myr AS

-- ============================================================================
-- CTE 1: MONTHLY AGGREGATES PER BRAND
-- Simple GROUP BY - NO complex subqueries
-- ============================================================================
WITH monthly_per_brand AS (
  SELECT 
    -- Identifiers
    line,
    EXTRACT(YEAR FROM date)::INTEGER as year,
    EXTRACT(MONTH FROM date)::INTEGER as month,
    CASE 
      WHEN EXTRACT(MONTH FROM date) IN (1,2,3) THEN 'Q1'
      WHEN EXTRACT(MONTH FROM date) IN (4,5,6) THEN 'Q2'
      WHEN EXTRACT(MONTH FROM date) IN (7,8,9) THEN 'Q3'
      ELSE 'Q4'
    END as quarter,
    currency,
    line || '-' || EXTRACT(YEAR FROM date) || '-' || EXTRACT(MONTH FROM date) || '-' || currency as uniquekey,
    
    -- Date range
    MIN(date) as start_date,
    MAX(date) as end_date,
    COUNT(DISTINCT date) as total_days,
    
    -- ✅ FINANCIAL AGGREGATES ONLY (SUM - FAST!)
    SUM(deposit_amount) as deposit_amount,
    SUM(deposit_cases) as deposit_cases,
    SUM(withdraw_amount) as withdraw_amount,
    SUM(withdraw_cases) as withdraw_cases,
    SUM(add_transaction) as add_transaction,
    SUM(deduct_transaction) as deduct_transaction,
    SUM(bonus) as bonus,
    SUM(add_bonus) as add_bonus,
    SUM(deduct_bonus) as deduct_bonus,
    SUM(bets_amount) as bets_amount,
    SUM(valid_amount) as valid_amount
    
  FROM blue_whale_myr
  WHERE currency = 'MYR'
    AND line IS NOT NULL
    AND line != ''
    AND line != 'ALL'
  GROUP BY line, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), currency
),

-- ============================================================================
-- CTE 2: JOIN WITH NEW_REGISTER_MONTHLY_MV
-- ============================================================================
monthly_with_new_register AS (
  SELECT 
    mpb.*,
    COALESCE(nr.new_register, 0) as new_register,
    COALESCE(nr.new_depositor, 0) as new_depositor
  FROM monthly_per_brand mpb
  LEFT JOIN new_register_monthly_mv nr
    ON mpb.uniquekey = nr.uniquekey
),

-- ============================================================================
-- CTE 3: MONTHLY ROWS (Per Brand)
-- ============================================================================
monthly_rows AS (
  SELECT 
    uniquekey,
    currency,
    line,
    'MONTHLY' as period_type,
    quarter as period,
    year,
    month,
    start_date,
    end_date,
    total_days,
    
    -- Financial metrics
    deposit_amount,
    deposit_cases,
    withdraw_amount,
    withdraw_cases,
    add_transaction,
    deduct_transaction,
    bonus,
    add_bonus,
    deduct_bonus,
    bets_amount,
    valid_amount,
    
    -- New user metrics (from JOIN)
    new_register,
    new_depositor,
    
    -- ✅ Calculated KPIs (AFTER SUM)
    deposit_amount - withdraw_amount as ggr,
    (deposit_amount + add_transaction) - (withdraw_amount + deduct_transaction) as net_profit,
    CASE WHEN deposit_amount > 0 THEN (deposit_amount - withdraw_amount) / deposit_amount ELSE 0 END as winrate,
    CASE WHEN deposit_cases > 0 THEN withdraw_cases::NUMERIC / deposit_cases ELSE 0 END as withdrawal_rate
    
  FROM monthly_with_new_register
),

-- ============================================================================
-- CTE 4: MONTHLY ALL (Aggregate all brands per month)
-- ============================================================================
monthly_all AS (
  SELECT 
    'ALL-' || year || '-' || month || '-' || currency as uniquekey,
    currency,
    'ALL' as line,
    'MONTHLY' as period_type,
    period,
    year,
    month,
    MIN(start_date) as start_date,
    MAX(end_date) as end_date,
    MAX(total_days) as total_days,
    
    -- ✅ SUM financial metrics
    SUM(deposit_amount) as deposit_amount,
    SUM(deposit_cases) as deposit_cases,
    SUM(withdraw_amount) as withdraw_amount,
    SUM(withdraw_cases) as withdraw_cases,
    SUM(add_transaction) as add_transaction,
    SUM(deduct_transaction) as deduct_transaction,
    SUM(bonus) as bonus,
    SUM(add_bonus) as add_bonus,
    SUM(deduct_bonus) as deduct_bonus,
    SUM(bets_amount) as bets_amount,
    SUM(valid_amount) as valid_amount,
    
    SUM(new_register) as new_register,
    SUM(new_depositor) as new_depositor,
    
    -- ✅ Calculated KPIs (AFTER SUM of all brands)
    SUM(deposit_amount) - SUM(withdraw_amount) as ggr,
    (SUM(deposit_amount) + SUM(add_transaction)) - (SUM(withdraw_amount) + SUM(deduct_transaction)) as net_profit,
    CASE WHEN SUM(deposit_amount) > 0 THEN (SUM(deposit_amount) - SUM(withdraw_amount)) / SUM(deposit_amount) ELSE 0 END as winrate,
    CASE WHEN SUM(deposit_cases) > 0 THEN SUM(withdraw_cases)::NUMERIC / SUM(deposit_cases) ELSE 0 END as withdrawal_rate
    
  FROM monthly_rows
  GROUP BY year, month, period, currency
),

-- ============================================================================
-- CTE 5: QUARTERLY PER BRAND (Aggregate monthly rows to quarterly)
-- ============================================================================
quarterly_per_brand AS (
  SELECT 
    line || '-' || period || '-' || year || '-' || currency as uniquekey,
    currency,
    line,
    'QUARTERLY' as period_type,
    period,
    year,
    NULL::INTEGER as month,
    MIN(start_date) as start_date,
    MAX(end_date) as end_date,
    SUM(total_days) as total_days,
    
    -- ✅ SUM financial metrics across quarter
    SUM(deposit_amount) as deposit_amount,
    SUM(deposit_cases) as deposit_cases,
    SUM(withdraw_amount) as withdraw_amount,
    SUM(withdraw_cases) as withdraw_cases,
    SUM(add_transaction) as add_transaction,
    SUM(deduct_transaction) as deduct_transaction,
    SUM(bonus) as bonus,
    SUM(add_bonus) as add_bonus,
    SUM(deduct_bonus) as deduct_bonus,
    SUM(bets_amount) as bets_amount,
    SUM(valid_amount) as valid_amount,
    
    SUM(new_register) as new_register,
    SUM(new_depositor) as new_depositor,
    
    -- ✅ Calculated KPIs (AFTER SUM across quarter)
    SUM(deposit_amount) - SUM(withdraw_amount) as ggr,
    (SUM(deposit_amount) + SUM(add_transaction)) - (SUM(withdraw_amount) + SUM(deduct_transaction)) as net_profit,
    CASE WHEN SUM(deposit_amount) > 0 THEN (SUM(deposit_amount) - SUM(withdraw_amount)) / SUM(deposit_amount) ELSE 0 END as winrate,
    CASE WHEN SUM(deposit_cases) > 0 THEN SUM(withdraw_cases)::NUMERIC / SUM(deposit_cases) ELSE 0 END as withdrawal_rate
    
  FROM monthly_rows
  GROUP BY line, period, year, currency
),

-- ============================================================================
-- CTE 6: QUARTERLY ALL (Aggregate all brands per quarter)
-- ============================================================================
quarterly_all AS (
  SELECT 
    'ALL-' || period || '-' || year || '-' || currency as uniquekey,
    currency,
    'ALL' as line,
    'QUARTERLY' as period_type,
    period,
    year,
    NULL::INTEGER as month,
    MIN(start_date) as start_date,
    MAX(end_date) as end_date,
    SUM(total_days) as total_days,
    
    -- ✅ SUM all financial metrics
    SUM(deposit_amount) as deposit_amount,
    SUM(deposit_cases) as deposit_cases,
    SUM(withdraw_amount) as withdraw_amount,
    SUM(withdraw_cases) as withdraw_cases,
    SUM(add_transaction) as add_transaction,
    SUM(deduct_transaction) as deduct_transaction,
    SUM(bonus) as bonus,
    SUM(add_bonus) as add_bonus,
    SUM(deduct_bonus) as deduct_bonus,
    SUM(bets_amount) as bets_amount,
    SUM(valid_amount) as valid_amount,
    
    SUM(new_register) as new_register,
    SUM(new_depositor) as new_depositor,
    
    -- ✅ Calculated KPIs (AFTER SUM of all brands in quarter)
    SUM(deposit_amount) - SUM(withdraw_amount) as ggr,
    (SUM(deposit_amount) + SUM(add_transaction)) - (SUM(withdraw_amount) + SUM(deduct_transaction)) as net_profit,
    CASE WHEN SUM(deposit_amount) > 0 THEN (SUM(deposit_amount) - SUM(withdraw_amount)) / SUM(deposit_amount) ELSE 0 END as winrate,
    CASE WHEN SUM(deposit_cases) > 0 THEN SUM(withdraw_cases)::NUMERIC / SUM(deposit_cases) ELSE 0 END as withdrawal_rate
    
  FROM quarterly_per_brand
  GROUP BY period, year, currency
)

-- ============================================================================
-- FINAL UNION: Combine all 4 types
-- ============================================================================
SELECT * FROM monthly_rows
UNION ALL
SELECT * FROM monthly_all
UNION ALL
SELECT * FROM quarterly_per_brand
UNION ALL
SELECT * FROM quarterly_all

ORDER BY year DESC, period DESC, month DESC NULLS LAST, line;

-- ============================================================================
-- CREATE INDEX for fast queries
-- ============================================================================
CREATE INDEX idx_bp_quarter_summary_myr_uniquekey ON bp_quarter_summary_myr(uniquekey);
CREATE INDEX idx_bp_quarter_summary_myr_lookup ON bp_quarter_summary_myr(currency, year, period, period_type, line);
CREATE INDEX idx_bp_quarter_summary_myr_monthly ON bp_quarter_summary_myr(currency, year, month, line) WHERE period_type = 'MONTHLY';
CREATE INDEX idx_bp_quarter_summary_myr_quarterly ON bp_quarter_summary_myr(currency, year, period, line) WHERE period_type = 'QUARTERLY';

-- ============================================================================
-- DONE! Verification queries: verify-bp-quarter-summary-myr.sql
-- ============================================================================
