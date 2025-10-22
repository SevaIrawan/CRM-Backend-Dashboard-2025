-- ============================================================================
-- VERIFICATION QUERIES for bp_quarter_summary_myr (SIMPLIFIED VERSION)
-- ============================================================================
-- Purpose: Check MV data after creation
-- Run this AFTER create-bp-quarter-summary-myr.sql completes successfully
-- ============================================================================

-- 1. Check total rows (should have 4 types × multiple time periods)
SELECT 
  period_type,
  CASE WHEN line = 'ALL' THEN 'ALL' ELSE 'Per Brand' END as aggregation_level,
  COUNT(*) as total_rows
FROM bp_quarter_summary_myr
WHERE currency = 'MYR'
GROUP BY period_type, CASE WHEN line = 'ALL' THEN 'ALL' ELSE 'Per Brand' END
ORDER BY period_type, aggregation_level;

-- 2. Check latest quarter data (Q4 2025) - Financial aggregates only
SELECT 
  uniquekey,
  line,
  period_type,
  period,
  year,
  month,
  deposit_amount,
  withdraw_amount,
  ggr,
  net_profit,
  new_register,
  new_depositor
FROM bp_quarter_summary_myr
WHERE currency = 'MYR'
  AND year = 2025
  AND period = 'Q4'
ORDER BY period_type DESC, line;

-- 3. Check monthly data for October 2025
SELECT 
  uniquekey,
  line,
  period_type,
  month,
  deposit_amount,
  deposit_cases,
  withdraw_amount,
  withdraw_cases,
  ggr,
  net_profit,
  new_register,
  new_depositor
FROM bp_quarter_summary_myr
WHERE currency = 'MYR'
  AND year = 2025
  AND month = 10
ORDER BY line;

-- 4. Compare Q3 vs Q4 2025 (QUARTERLY - Per Brand)
SELECT 
  period,
  line,
  deposit_amount,
  ggr,
  net_profit,
  new_depositor
FROM bp_quarter_summary_myr
WHERE currency = 'MYR'
  AND year = 2025
  AND period IN ('Q3', 'Q4')
  AND period_type = 'QUARTERLY'
  AND line != 'ALL'
ORDER BY line, period;

-- 5. Compare Q3 vs Q4 2025 (QUARTERLY - ALL)
SELECT 
  period,
  line,
  deposit_amount,
  deposit_cases,
  ggr,
  net_profit
FROM bp_quarter_summary_myr
WHERE currency = 'MYR'
  AND year = 2025
  AND period IN ('Q3', 'Q4')
  AND period_type = 'QUARTERLY'
  AND line = 'ALL'
ORDER BY period;

-- 6. Compare Sept vs Oct 2025 (MONTHLY - ALL)
SELECT 
  month,
  line,
  deposit_amount,
  ggr,
  net_profit
FROM bp_quarter_summary_myr
WHERE currency = 'MYR'
  AND year = 2025
  AND month IN (9, 10)
  AND period_type = 'MONTHLY'
  AND line = 'ALL'
ORDER BY month;

-- 7. Check GGR calculation (should be: deposit - withdraw)
SELECT 
  uniquekey,
  line,
  deposit_amount,
  withdraw_amount,
  ggr,
  -- Verify: ggr = deposit_amount - withdraw_amount
  (deposit_amount - withdraw_amount) as ggr_check,
  CASE 
    WHEN ABS(ggr - (deposit_amount - withdraw_amount)) < 0.01 THEN '✅ Valid'
    ELSE '❌ ERROR: GGR mismatch'
  END as validation
FROM bp_quarter_summary_myr
WHERE currency = 'MYR'
  AND year = 2025
  AND month = 10
  AND line = 'ALL'
  AND period_type = 'MONTHLY';

-- 8. Check Net Profit calculation (should be: (deposit + add) - (withdraw + deduct))
SELECT 
  uniquekey,
  line,
  deposit_amount,
  withdraw_amount,
  add_transaction,
  deduct_transaction,
  net_profit,
  -- Verify: net_profit = (deposit + add) - (withdraw + deduct)
  ((deposit_amount + add_transaction) - (withdraw_amount + deduct_transaction)) as net_profit_check,
  CASE 
    WHEN ABS(net_profit - ((deposit_amount + add_transaction) - (withdraw_amount + deduct_transaction))) < 0.01 THEN '✅ Valid'
    ELSE '❌ ERROR: Net Profit mismatch'
  END as validation
FROM bp_quarter_summary_myr
WHERE currency = 'MYR'
  AND year = 2025
  AND month = 10
  AND line = 'ALL'
  AND period_type = 'MONTHLY';

-- 9. Check Winrate calculation (should be: GGR / deposit = (deposit - withdraw) / deposit)
SELECT 
  uniquekey,
  line,
  deposit_amount,
  withdraw_amount,
  ggr,
  winrate,
  -- Verify: winrate = (deposit_amount - withdraw_amount) / deposit_amount = ggr / deposit_amount
  CASE WHEN deposit_amount > 0 THEN (deposit_amount - withdraw_amount) / deposit_amount ELSE 0 END as winrate_check,
  CASE 
    WHEN ABS(winrate - (CASE WHEN deposit_amount > 0 THEN (deposit_amount - withdraw_amount) / deposit_amount ELSE 0 END)) < 0.0001 THEN '✅ Valid'
    ELSE '❌ ERROR: Winrate mismatch'
  END as validation
FROM bp_quarter_summary_myr
WHERE currency = 'MYR'
  AND year = 2025
  AND month = 10
  AND line = 'ALL'
  AND period_type = 'MONTHLY';

-- 10. Check Withdrawal Rate calculation (should be: withdraw_cases / deposit_cases)
SELECT 
  uniquekey,
  line,
  deposit_cases,
  withdraw_cases,
  withdrawal_rate,
  -- Verify: withdrawal_rate = withdraw_cases / deposit_cases
  CASE WHEN deposit_cases > 0 THEN withdraw_cases::NUMERIC / deposit_cases ELSE 0 END as withdrawal_rate_check,
  CASE 
    WHEN ABS(withdrawal_rate - (CASE WHEN deposit_cases > 0 THEN withdraw_cases::NUMERIC / deposit_cases ELSE 0 END)) < 0.0001 THEN '✅ Valid'
    ELSE '❌ ERROR: Withdrawal Rate mismatch'
  END as validation
FROM bp_quarter_summary_myr
WHERE currency = 'MYR'
  AND year = 2025
  AND month = 10
  AND line = 'ALL'
  AND period_type = 'MONTHLY';

-- ============================================================================
-- NOTE: All KPIs must be CALCULATED in API
-- ============================================================================
-- This MV only stores FINANCIAL AGGREGATES (SUM values)
-- 
-- API must calculate:
-- - active_member (COUNT DISTINCT userkey from blue_whale_myr)
-- - pure_user (COUNT DISTINCT unique_code from blue_whale_myr)
-- - pure_member (active_member - new_depositor)
-- - ATV (deposit_amount / deposit_cases)
-- - PF (deposit_cases / active_member)
-- - DA User (deposit_amount / active_member)
-- - GGR User (net_profit / active_member)
-- - Bonus Usage Rate (bonus / valid_amount)
-- - Winrate (withdraw_amount / deposit_amount)
-- - Withdrawal Rate (withdraw_cases / deposit_cases)
-- - Retention, Reactivation, Churn (via API logic)
-- ============================================================================

-- END OF VERIFICATION
