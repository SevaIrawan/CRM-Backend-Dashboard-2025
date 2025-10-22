-- ============================================
-- CHECK BP MV TABLES STATUS
-- ============================================

-- 1. Check if bp_daily_summary_myr exists and has data
SELECT 
  'bp_daily_summary_myr' as table_name,
  COUNT(*) as row_count,
  MIN(date) as min_date,
  MAX(date) as max_date,
  COUNT(DISTINCT line) as brand_count
FROM bp_daily_summary_myr;

-- 2. Check if bp_quarter_summary_myr exists and has data
SELECT 
  'bp_quarter_summary_myr' as table_name,
  COUNT(*) as row_count,
  MIN(year) as min_year,
  MAX(year) as max_year,
  COUNT(DISTINCT line) as brand_count
FROM bp_quarter_summary_myr;

-- 3. Check sample data from bp_daily_summary_myr
SELECT 
  date,
  line,
  ggr,
  deposit_amount,
  withdraw_amount,
  new_register,
  new_depositor
FROM bp_daily_summary_myr
WHERE line = 'ALL'
  AND date >= '2025-10-01'
ORDER BY date DESC
LIMIT 10;

-- 4. Check sample data from bp_quarter_summary_myr
SELECT 
  year,
  period,
  period_type,
  line,
  ggr,
  deposit_amount,
  withdraw_amount
FROM bp_quarter_summary_myr
WHERE line = 'ALL'
ORDER BY year DESC, period DESC
LIMIT 10;

