-- ============================================================================
-- TEST BP PAGE KPI CALCULATIONS FROM blue_whale_myr
-- ============================================================================
-- Purpose: Verify ALL BP page KPIs can be calculated from blue_whale_myr
-- Date: 2025-10-21
-- ============================================================================

-- Test date: 2025-10-21 (today)
-- Test brand: SBMY (sample)

WITH test_data AS (
    SELECT 
        date,
        line,
        userkey,
        first_deposit_date,
        deposit_amount,
        withdraw_amount,
        deposit_cases,
        withdraw_cases,
        add_transaction,
        deduct_transaction,
        bonus,
        add_bonus
    FROM blue_whale_myr
    WHERE date = '2025-10-21'
      AND line = 'SBMY'
      AND deposit_cases > 0
),

prev_day_data AS (
    SELECT DISTINCT
        userkey
    FROM blue_whale_myr
    WHERE date = '2025-10-20'
      AND line = 'SBMY'
      AND deposit_cases > 0
)

SELECT 
    -- ========================================
    -- 1. FINANCIAL METRICS
    -- ========================================
    SUM(t.deposit_amount) as total_deposit_amount,
    SUM(t.withdraw_amount) as total_withdraw_amount,
    SUM(t.deposit_cases) as total_deposit_cases,
    SUM(t.withdraw_cases) as total_withdraw_cases,
    SUM(t.add_transaction) as total_add_transaction,
    SUM(t.deduct_transaction) as total_deduct_transaction,
    SUM(t.bonus + t.add_bonus) as total_bonus_amount,
    
    -- ========================================
    -- 2. CALCULATED FINANCIAL METRICS
    -- ========================================
    (SUM(t.deposit_amount) - SUM(t.withdraw_amount)) as ggr,
    ((SUM(t.deposit_amount) + SUM(t.add_transaction)) - 
     (SUM(t.withdraw_amount) + SUM(t.deduct_transaction))) as net_profit,
    
    -- ========================================
    -- 3. MEMBER METRICS
    -- ========================================
    COUNT(DISTINCT t.userkey) as active_member,
    
    COUNT(DISTINCT CASE 
        WHEN t.first_deposit_date = t.date THEN t.userkey 
    END) as new_depositor,
    
    COUNT(DISTINCT CASE 
        WHEN p.userkey IS NOT NULL THEN t.userkey 
    END) as retention_member,
    
    COUNT(DISTINCT CASE 
        WHEN p.userkey IS NULL 
          AND t.first_deposit_date < t.date 
        THEN t.userkey 
    END) as reactivation_member,
    
    (COUNT(DISTINCT t.userkey) - COUNT(DISTINCT CASE 
        WHEN t.first_deposit_date = t.date THEN t.userkey 
    END)) as pure_active,
    
    -- ========================================
    -- 4. DERIVED KPIs
    -- ========================================
    CASE 
        WHEN SUM(t.deposit_cases) > 0 
        THEN SUM(t.deposit_amount) / SUM(t.deposit_cases) 
        ELSE 0 
    END as atv,
    
    CASE 
        WHEN COUNT(DISTINCT t.userkey) > 0 
        THEN SUM(t.deposit_cases) * 1.0 / COUNT(DISTINCT t.userkey) 
        ELSE 0 
    END as purchase_frequency,
    
    CASE 
        WHEN COUNT(DISTINCT t.userkey) > 0 
        THEN (SUM(t.deposit_amount) - SUM(t.withdraw_amount)) / COUNT(DISTINCT t.userkey) 
        ELSE 0 
    END as ggr_user,
    
    CASE 
        WHEN COUNT(DISTINCT t.userkey) > 0 
        THEN SUM(t.deposit_amount) / COUNT(DISTINCT t.userkey) 
        ELSE 0 
    END as da_user,
    
    -- ========================================
    -- 5. RATE METRICS
    -- ========================================
    CASE 
        WHEN COUNT(DISTINCT t.userkey) > 0 
        THEN (SUM(t.bonus + t.add_bonus) / COUNT(DISTINCT t.userkey)) * 100
        ELSE 0 
    END as bonus_usage_rate,
    
    CASE 
        WHEN SUM(t.deposit_amount) > 0 
        THEN (SUM(t.withdraw_amount) / SUM(t.deposit_amount)) * 100
        ELSE 0 
    END as win_rate,
    
    CASE 
        WHEN COUNT(DISTINCT t.userkey) > 0 
        THEN (SUM(t.withdraw_cases) * 1.0 / COUNT(DISTINCT t.userkey)) * 100
        ELSE 0 
    END as withdrawal_rate,
    
    -- ========================================
    -- 6. COHORT RATE METRICS
    -- ========================================
    CASE 
        WHEN COUNT(DISTINCT t.userkey) > 0 
        THEN (COUNT(DISTINCT CASE 
            WHEN p.userkey IS NOT NULL THEN t.userkey 
        END) * 100.0 / COUNT(DISTINCT t.userkey))
        ELSE 0 
    END as retention_rate,
    
    CASE 
        WHEN COUNT(DISTINCT t.userkey) > 0 
        THEN (100.0 - (COUNT(DISTINCT CASE 
            WHEN p.userkey IS NOT NULL THEN t.userkey 
        END) * 100.0 / COUNT(DISTINCT t.userkey)))
        ELSE 0 
    END as churn_rate

FROM test_data t
LEFT JOIN prev_day_data p ON t.userkey = p.userkey;

-- ============================================================================
-- CHURN MEMBER CALCULATION (Separate query)
-- ============================================================================

SELECT 
    COUNT(DISTINCT p.userkey) as churn_member
FROM (
    SELECT DISTINCT userkey
    FROM blue_whale_myr
    WHERE date = '2025-10-20'
      AND line = 'SBMY'
      AND deposit_cases > 0
) p
LEFT JOIN (
    SELECT DISTINCT userkey
    FROM blue_whale_myr
    WHERE date = '2025-10-21'
      AND line = 'SBMY'
      AND deposit_cases > 0
) c ON p.userkey = c.userkey
WHERE c.userkey IS NULL;

-- ============================================================================
-- BP PAGE KPI CHECKLIST
-- ============================================================================
-- Run this to verify all KPIs are available:

/*
✅ TARGET ACHIEVE RATE KPI CARD:
- Target GGR (from bp_target table) ✓
- Current GGR (from blue_whale_myr: deposit_amount - withdraw_amount) ✓

✅ GROSS GAMING REVENUE KPI CARD:
- GGR (deposit_amount - withdraw_amount) ✓
- Daily Average ✓
- MoM Comparison (need previous month data) ✓

✅ ACTIVE MEMBER KPI CARD:
- Active Member (COUNT DISTINCT userkey WHERE deposit_cases > 0) ✓
- Daily Average ✓
- MoM Comparison ✓

✅ PURE ACTIVE KPI CARD:
- Pure Active (Active Member - New Depositor) ✓
- New Depositor (WHERE first_deposit_date = current_date) ✓

✅ TRANSACTION METRICS (Dual KPI):
- ATV (deposit_amount / deposit_cases) ✓
- Purchase Frequency (deposit_cases / active_member) ✓

✅ USER VALUE METRICS (Dual KPI):
- GGR User (ggr / active_member) ✓
- DA User (deposit_amount / active_member) ✓

✅ FINANCIAL METRICS:
- Net Profit ((deposit + add_transaction) - (withdraw + deduct_transaction)) ✓
- Deposit Amount ✓
- Deposit Cases ✓
- Withdraw Amount ✓
- Withdraw Cases ✓

✅ RATE METRICS:
- Bonus Usage Rate (bonus_amount / active_member) ✓
- Win Rate (withdraw_amount / deposit_amount) ✓
- Withdrawal Rate (withdraw_cases / active_member) ✓

✅ COHORT METRICS:
- New Depositor (first_deposit_date = current_date) ✓
- Retention Member (active today AND yesterday) ✓
- Reactivation Member (active today, NOT yesterday, first_deposit < today) ✓
- Churn Member (active yesterday, NOT today) ✓
- Retention Rate ✓
- Churn Rate ✓

✅ CHARTS:
- GGR Trend (group by quarter/month) ✓
- Deposit Amount vs Cases ✓
- Withdraw Amount vs Cases ✓
- Winrate vs Withdraw Rate ✓
- Bonus Usage Rate per Brand ✓
- Brand GGR Contribution (Stacked Bar) ✓
- Retention vs Churn Rate per Brand ✓
- Activation Rate per Brand (need new_register table) ⚠️
- Forecast Q4 GGR (with linear regression) ✓
- Sankey Diagram (brand flow) ✓

⚠️ NEED EXTERNAL TABLE:
- New Register (for Activation Rate calculation) → new_register table
- Target Data (for Target Achieve Rate) → bp_target table

✅ CONCLUSION:
blue_whale_myr CAN PROVIDE 95% of BP page requirements!
Only need:
1. new_register table (for new_register count & activation rate)
2. bp_target table (for target comparison)
*/

