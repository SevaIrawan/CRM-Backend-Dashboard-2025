# SETUP: bp_quarter_summary_myr MATERIALIZED VIEW

**Purpose:** Pre-aggregated quarterly and monthly summary for Business Performance page

---

## **TABLE STRUCTURE**

### **4 Aggregation Levels:**

1. **MONTHLY - Per Brand** (e.g., `JMMY-2025-10-MYR`)
   - Active Member, GGR, KPIs per brand per month
   - Direct JOIN with `new_register_monthly_mv`

2. **MONTHLY - ALL Brands** (e.g., `ALL-2025-10-MYR`)
   - Total across all brands per month
   - COUNT DISTINCT for accurate member counts

3. **QUARTERLY - Per Brand** (e.g., `JMMY-Q4-2025-MYR`)
   - 3-month aggregate per brand
   - Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec

4. **QUARTERLY - ALL Brands** (e.g., `ALL-Q4-2025-MYR`)
   - Total across all brands for entire quarter

---

## **PRE-CALCULATED KPIs**

### **Member Metrics:**
- `active_member` - COUNT DISTINCT userkey with deposit_cases > 0 (account level)
- `pure_member` - active_member - new_depositor (existing accounts)
- `pure_user` - COUNT DISTINCT unique_code with deposit_cases > 0 (unique users, cross-brand)
- `new_register` - From `new_register_monthly_mv` (JOIN)
- `new_depositor` - From `new_register_monthly_mv` (JOIN)

**❌ COHORT METRICS NOT INCLUDED:**
- `retention_member` - **MUST BE CALCULATED via API LOGIC** (not accurate in MV)
- `reactivation_member` - **MUST BE CALCULATED via API LOGIC** (not accurate in MV)
- `churn_member` - **MUST BE CALCULATED via API LOGIC** (not accurate in MV)

### **Financial Metrics:**
- `deposit_amount`, `deposit_cases`
- `withdraw_amount`, `withdraw_cases`
- `add_transaction`, `deduct_transaction`
- `bonus`, `bets_amount`, `valid_amount`

### **Calculated KPIs:**
- `ggr` = deposit_amount - withdraw_amount
- `net_profit` = (deposit + add) - (withdraw + deduct)
- `pure_user_net_profit` = Total net profit from pure users (SUM, not average)
- `atv` = deposit_amount / deposit_cases
- `pf` = deposit_cases / active_member
- `da_user` = deposit_amount / active_member
- `ggr_user` = net_profit / active_member
- `bonus_usage_rate` = bonus / valid_amount
- `winrate` = withdraw_amount / deposit_amount
- `withdrawal_rate` = withdraw_cases / deposit_cases

### **Cohort Rates (%):**
**❌ NOT INCLUDED IN MV - MUST BE CALCULATED via API LOGIC**
- `retention_rate` = CALCULATED IN API
- `reactivation_rate` = CALCULATED IN API ← **"Activation Rate" chart uses this**
- `churn_rate` = CALCULATED IN API

---

## **SETUP INSTRUCTIONS**

### **Step 1: Create Materialized View**
```sql
-- Execute in Supabase SQL Editor
-- File: scripts/create-bp-quarter-summary-myr.sql

-- This will:
-- 1. DROP existing MV (if any)
-- 2. CREATE new MV with all 4 aggregation levels
-- 3. CREATE indexes for fast queries
-- Estimated time: 2-5 minutes for large datasets
```

### **Step 2: Verify Data (Run in SEPARATE SQL tab)**
```sql
-- Execute in NEW Supabase SQL Editor tab
-- File: scripts/verify-bp-quarter-summary-myr.sql

-- This will check:
-- 1. Total rows and aggregation levels
-- 2. Latest quarter data
-- 3. KPI calculations accuracy
-- Run these queries ONE BY ONE to avoid timeout
```

**Expected output:**
- MONTHLY | ALL: ~24 rows (2 years × 12 months)
- MONTHLY | Per Brand: ~96 rows (2 years × 12 months × 4 brands)
- QUARTERLY | ALL: ~8 rows (2 years × 4 quarters)
- QUARTERLY | Per Brand: ~32 rows (2 years × 4 quarters × 4 brands)

### **Step 3: Test API Integration**

**Example Query (API):**
```typescript
// Get Q4 2025 Total (ALL brands)
const { data } = await supabase
  .from('bp_quarter_summary_myr')
  .select('*')
  .eq('uniquekey', 'ALL-Q4-2025-MYR')
  .single()

// Returns pre-calculated KPIs (no aggregation needed!)
```

---

## **REFRESH STRATEGY**

### **Manual Refresh:**
```sql
REFRESH MATERIALIZED VIEW bp_quarter_summary_myr;
```

### **Automated Refresh (Optional):**
```sql
-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_bp_quarter_summary_myr()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW bp_quarter_summary_myr;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily refresh (using pg_cron extension)
SELECT cron.schedule(
  'refresh-bp-quarter-summary-myr',
  '0 2 * * *',  -- Every day at 2 AM
  'SELECT refresh_bp_quarter_summary_myr();'
);
```

---

## **BENEFITS**

✅ **No Real-Time Aggregation** - Basic KPIs pre-calculated
✅ **Fast Quarterly Queries** - Direct Q4 total (no SUM needed)
✅ **Fast Monthly Queries** - Direct Oct total
✅ **Fast Comparison** - Sept vs Oct instant (no re-calculation)
✅ **Consistent Logic** - All formulas centralized in MV
✅ **Per-Brand Ready** - Brand breakdown pre-computed
✅ **JOIN Integration** - new_register/new_depositor from `new_register_monthly_mv`
✅ **Pure User Tracking** - Cross-brand unique users (no duplication)

---

## **INTEGRATION TO API**

```typescript
// Example: Get Q4 2025 data
const { data } = await supabase
  .from('bp_quarter_summary_myr')
  .select('*')
  .eq('uniquekey', 'ALL-Q4-2025-MYR')
  .single()

// Returns pre-calculated KPIs:
{
  active_member: 3095,
  pure_user: 2845,  // ← Cross-brand unique users
  pure_user_net_profit: 598123.45,  // ← Total from pure users
  ggr: 652442.26,
  net_profit: 646846.18,
  atv: 4.23,
  pf: 2.15,
  da_user: 210.82,
  ggr_user: 209.02,
  bonus_usage_rate: 0.08,
  winrate: 0.65
  
  // ❌ Cohort metrics (Retention, Reactivation, Churn)
  // MUST BE CALCULATED via API logic (not in MV)
}
```

---

## **TROUBLESHOOTING**

### **Issue: MV creation fails**
- Check if `new_register_monthly_mv` exists
- Verify `blue_whale_myr` table has data
- Check for sufficient memory/disk space
- Try running script in SEPARATE SQL tab (not combined with verification)

### **Issue: Timeout during creation**
- **SOLUTION:** Run `create-bp-quarter-summary-myr.sql` ONLY (without verification)
- Verification queries moved to separate file: `verify-bp-quarter-summary-myr.sql`
- Run verification in NEW SQL tab AFTER MV creation completes

### **Issue: Active Member count doesn't match**
- Ensure using COUNT DISTINCT (not SUM) for "ALL" aggregates
- Verify `deposit_cases > 0` filter applied
- Check for NULL userkeys

### **Issue: Pure User > Active Member**
- Run verification query #7 in `verify-bp-quarter-summary-myr.sql`
- This should never happen (pure_user ≤ active_member always)

---

## **NEXT STEPS**

After MV is created and verified:
1. ✅ **Update API Route** to query from `bp_quarter_summary_myr`
2. ✅ **Remove complex aggregations** from API (use pre-calculated KPIs)
3. ✅ **Test all scenarios** (Q4, Oct, comparison, per-brand)
4. ✅ **Monitor performance** (should be < 100ms queries)

---

## **NOTES**

- **Reactivation Rate** = What the "Activation Rate (%)" chart displays
- **uniquekey** format differs between MONTHLY and QUARTERLY
- **COUNT DISTINCT** used for accurate member counts across brands
- **SUM** used for financial metrics aggregation
- **Cohort logic** requires previous period data to calculate rates

