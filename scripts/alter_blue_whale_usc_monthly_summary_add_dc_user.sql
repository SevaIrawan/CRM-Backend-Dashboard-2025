-- ============================================================================
-- SCRIPT: ALTER blue_whale_usc_monthly_summary MV
-- ============================================================================
-- Purpose: 
--   1. Add new column: dc_user = deposit_cases / active_member
--   2. Remove column: purchase_frequency (to avoid ambiguity)
--
-- Note: Materialized Views cannot be ALTERed directly, so we need to:
--   - DROP existing MV
--   - CREATE new MV with updated structure
--
-- IMPORTANT: 
--   - Adjust new_register and new_depositor calculation based on your actual MV structure
--   - This script assumes they come from JOIN with new_register table or are pre-calculated
-- ============================================================================

-- Step 1: DROP existing Materialized View
DROP MATERIALIZED VIEW IF EXISTS blue_whale_usc_monthly_summary CASCADE;

-- Step 2: CREATE new Materialized View with dc_user and without purchase_frequency
-- NOTE: Adjust the new_register/new_depositor logic based on your actual MV structure
CREATE MATERIALIZED VIEW blue_whale_usc_monthly_summary AS
WITH monthly_aggregated AS (
  SELECT 
    line,
    year,
    EXTRACT(MONTH FROM date)::INTEGER as month,
    currency,
    
    -- Financial aggregates (SUM)
    SUM(deposit_amount) as deposit_amount,
    SUM(withdraw_amount) as withdraw_amount,
    SUM(net_profit) as net_profit,
    SUM(ggr) as ggr,
    SUM(valid_amount) as valid_amount,
    SUM(deposit_cases) as deposit_cases,
    SUM(withdraw_cases) as withdraw_cases,
    SUM(add_transaction) as add_transaction,
    SUM(deduct_transaction) as deduct_transaction,
    SUM(bonus) as bonus,
    SUM(add_bonus) as add_bonus,
    SUM(deduct_bonus) as deduct_bonus,
    
    -- Member counts (COUNT DISTINCT)
    COUNT(DISTINCT userkey) FILTER (WHERE deposit_cases > 0) as active_member,
    COUNT(DISTINCT unique_code) FILTER (WHERE deposit_cases > 0) as pure_member
    
  FROM blue_whale_usc
  WHERE currency = 'USC'
  GROUP BY line, year, EXTRACT(MONTH FROM date), currency
),
monthly_with_new_users AS (
  SELECT 
    ma.*,
    -- ✅ JOIN with new_register table for new_register and new_depositor
    -- Adjust uniquekey format based on your new_register table structure
    -- Format: line-year-month-currency
    COALESCE(nr.new_register, 0) as new_register,
    COALESCE(nr.new_depositor, 0) as new_depositor
  FROM monthly_aggregated ma
  LEFT JOIN new_register nr ON (
    nr.uniquekey = ma.line || '-' || ma.year || '-' || ma.month || '-' || ma.currency
    AND nr.currency = 'USC'
  )
),
monthly_with_kpis AS (
  SELECT 
    *,
    
    -- Pre-calculated KPIs
    CASE 
      WHEN deposit_cases > 0 
      THEN deposit_amount / deposit_cases 
      ELSE 0 
    END as atv,
    
    -- ✅ NEW: DC User = deposit_cases / active_member
    CASE 
      WHEN active_member > 0 
      THEN deposit_cases::NUMERIC / active_member 
      ELSE 0 
    END as dc_user,
    
    -- DA User = deposit_amount / active_member
    CASE 
      WHEN active_member > 0 
      THEN deposit_amount::NUMERIC / active_member 
      ELSE 0 
    END as da_user,
    
    -- GGR User = net_profit / active_member
    CASE 
      WHEN active_member > 0 
      THEN net_profit::NUMERIC / active_member 
      ELSE 0 
    END as ggr_user,
    
    -- Winrate = (ggr / deposit_amount) * 100
    CASE 
      WHEN deposit_amount > 0 
      THEN (ggr / deposit_amount) * 100 
      ELSE 0 
    END as winrate,
    
    -- Withdrawal Rate = (withdraw_cases / deposit_cases) * 100
    CASE 
      WHEN deposit_cases > 0 
      THEN (withdraw_cases::NUMERIC / deposit_cases) * 100 
      ELSE 0 
    END as withdrawal_rate,
    
    -- Conversion Rate = (new_depositor / new_register) * 100
    CASE 
      WHEN new_register > 0 
      THEN (new_depositor::NUMERIC / new_register) * 100 
      ELSE 0 
    END as conversion_rate,
    
    -- Hold Percentage = (net_profit / valid_amount) * 100
    CASE 
      WHEN valid_amount > 0 
      THEN (net_profit / valid_amount) * 100 
      ELSE 0 
    END as hold_percentage
    
  FROM monthly_aggregated
)
SELECT 
  line,
  year,
  month,
  currency,
  deposit_amount,
  withdraw_amount,
  net_profit,
  ggr,
  valid_amount,
  deposit_cases,
  withdraw_cases,
  active_member,
  pure_member,
  new_register,
  new_depositor,
  atv,
  dc_user,  -- ✅ NEW COLUMN: deposit_cases / active_member
  da_user,
  ggr_user,
  winrate,
  withdrawal_rate,
  conversion_rate,
  hold_percentage
FROM monthly_with_kpis

UNION ALL

-- Add rollup row for 'ALL' line (month = 0)
SELECT 
  'ALL' as line,
  year,
  0 as month,  -- 0 = rollup indicator
  currency,
  SUM(deposit_amount) as deposit_amount,
  SUM(withdraw_amount) as withdraw_amount,
  SUM(net_profit) as net_profit,
  SUM(ggr) as ggr,
  SUM(valid_amount) as valid_amount,
  SUM(deposit_cases) as deposit_cases,
  SUM(withdraw_cases) as withdraw_cases,
  SUM(active_member) as active_member,  -- Sum of active_member (not COUNT DISTINCT for rollup)
  SUM(pure_member) as pure_member,  -- Sum of pure_member (not COUNT DISTINCT for rollup)
  SUM(new_register) as new_register,
  SUM(new_depositor) as new_depositor,
  CASE 
    WHEN SUM(deposit_cases) > 0 
    THEN SUM(deposit_amount) / SUM(deposit_cases) 
    ELSE 0 
  END as atv,
  -- ✅ NEW: DC User for rollup = SUM(deposit_cases) / SUM(active_member)
  CASE 
    WHEN SUM(active_member) > 0 
    THEN SUM(deposit_cases)::NUMERIC / SUM(active_member) 
    ELSE 0 
  END as dc_user,
  CASE 
    WHEN SUM(active_member) > 0 
    THEN SUM(deposit_amount)::NUMERIC / SUM(active_member) 
    ELSE 0 
  END as da_user,
  CASE 
    WHEN SUM(active_member) > 0 
    THEN SUM(net_profit)::NUMERIC / SUM(active_member) 
    ELSE 0 
  END as ggr_user,
  CASE 
    WHEN SUM(deposit_amount) > 0 
    THEN (SUM(ggr) / SUM(deposit_amount)) * 100 
    ELSE 0 
  END as winrate,
  CASE 
    WHEN SUM(deposit_cases) > 0 
    THEN (SUM(withdraw_cases)::NUMERIC / SUM(deposit_cases)) * 100 
    ELSE 0 
  END as withdrawal_rate,
  CASE 
    WHEN SUM(new_register) > 0 
    THEN (SUM(new_depositor)::NUMERIC / SUM(new_register)) * 100 
    ELSE 0 
  END as conversion_rate,
  CASE 
    WHEN SUM(valid_amount) > 0 
    THEN (SUM(net_profit) / SUM(valid_amount)) * 100 
    ELSE 0 
  END as hold_percentage
FROM monthly_with_kpis
WHERE line != 'ALL'
GROUP BY year, currency;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_usc_monthly_summary_line_year_month 
  ON blue_whale_usc_monthly_summary(line, year, month, currency);

CREATE INDEX IF NOT EXISTS idx_usc_monthly_summary_currency_year 
  ON blue_whale_usc_monthly_summary(currency, year);

-- Step 4: Refresh the Materialized View
REFRESH MATERIALIZED VIEW blue_whale_usc_monthly_summary;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Check if dc_user column exists and purchase_frequency is removed:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'blue_whale_usc_monthly_summary'
-- ORDER BY ordinal_position;

-- Sample query to verify dc_user calculation:
-- SELECT 
--   line, year, month, 
--   deposit_cases, active_member, 
--   dc_user,
--   CASE WHEN active_member > 0 THEN deposit_cases::NUMERIC / active_member ELSE 0 END as calculated_dc_user
-- FROM blue_whale_usc_monthly_summary
-- WHERE currency = 'USC' AND year = 2025 AND month > 0
-- LIMIT 10;
-- ============================================================================

