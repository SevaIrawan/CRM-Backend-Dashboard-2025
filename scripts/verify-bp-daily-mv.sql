-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFY bp_daily_summary_myr EXISTENCE AND DATA
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'bp_daily_summary_myr'
) as table_exists;

-- 2. If exists, count total rows
SELECT COUNT(*) as total_rows 
FROM bp_daily_summary_myr;

-- 3. Check date range
SELECT MIN(date) as min_date, MAX(date) as max_date 
FROM bp_daily_summary_myr;

-- 4. Check October 2025 data (last 7 days)
SELECT 
  date,
  line,
  active_member,
  deposit_amount,
  ggr,
  retention_member,
  reactivation_member,
  churn_member
FROM bp_daily_summary_myr
WHERE date >= '2025-10-14' 
  AND date <= '2025-10-21'
ORDER BY date DESC, line
LIMIT 20;

-- 5. Check distinct lines
SELECT DISTINCT line 
FROM bp_daily_summary_myr 
ORDER BY line;

