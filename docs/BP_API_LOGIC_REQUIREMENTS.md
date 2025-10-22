# BUSINESS PERFORMANCE - API LOGIC REQUIREMENTS
## Comprehensive Guide for KPI Calculations

> **Purpose:** Document all KPI calculations that MUST be performed in API layer
> **Reason:** `bp_daily_summary_myr` and `bp_quarter_summary_myr` MVs only store financial aggregates + basic SUM-based KPIs
> **Data Sources:** `blue_whale_myr` (master), `new_register`, `bp_target`, MVs (for aggregates only)

---

## **TABLE OF CONTENTS**
1. [Member Metrics (COUNT DISTINCT)](#1-member-metrics-count-distinct)
2. [Per-User KPIs (Division-based)](#2-per-user-kpis-division-based)
3. [Pure User Net Profit (Aggregate)](#3-pure-user-net-profit-aggregate)
4. [Cohort Metrics (Retention, Reactivation, Churn)](#4-cohort-metrics-retention-reactivation-churn)
5. [KPIs in MV but Need Recalculation for Total](#5-kpis-in-mv-but-need-recalculation-for-total)
6. [Comparison Logic (MoM, Date-to-Date)](#6-comparison-logic-mom-date-to-date)
7. [Chart-Specific Aggregations](#7-chart-specific-aggregations)
8. [Query Optimization Tips](#8-query-optimization-tips)

---

## **1. MEMBER METRICS (COUNT DISTINCT)**

### **1.1 Active Member**
**Definition:** Unique users (`userkey`) with at least 1 deposit transaction

**Logic:**
```typescript
// Daily Mode
const { count: activeMember } = await supabase
  .from('blue_whale_myr')
  .select('userkey', { count: 'exact', head: true })
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .gt('deposit_cases', 0)
```

**SQL Equivalent:**
```sql
SELECT COUNT(DISTINCT userkey) as active_member
FROM blue_whale_myr
WHERE currency = 'MYR'
  AND date BETWEEN '2025-10-01' AND '2025-10-20'
  AND deposit_cases > 0
```

**Performance:** 
- Daily (7-31 days): ~100-200ms
- Quarterly (3 months): ~300-500ms

---

### **1.2 Pure User**
**Definition:** Unique real users (`unique_code`) with at least 1 deposit transaction (removes duplicates across brands)

**Logic:**
```typescript
// Daily Mode
const { count: pureUser } = await supabase
  .from('blue_whale_myr')
  .select('unique_code', { count: 'exact', head: true })
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .gt('deposit_cases', 0)
  .not('unique_code', 'is', null)
```

**SQL Equivalent:**
```sql
SELECT COUNT(DISTINCT unique_code) as pure_user
FROM blue_whale_myr
WHERE currency = 'MYR'
  AND date BETWEEN '2025-10-01' AND '2025-10-20'
  AND deposit_cases > 0
  AND unique_code IS NOT NULL
```

**Note:** `unique_code` can play in multiple brands, so COUNT DISTINCT removes duplicates

---

### **1.3 Pure Active / Pure Member**
**Definition:** Active Member minus New Depositor (existing users who are still active)

**Formula:**
```typescript
pureMember = activeMember - newDepositor
```

**Logic:**
```typescript
// Get Active Member (see 1.1)
const activeMember = await getActiveMember(startDate, endDate)

// Get New Depositor from new_register table or MV
const { data: newRegisterData } = await supabase
  .from('new_register')
  .select('new_depositor')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)

const newDepositor = newRegisterData.reduce((sum, row) => sum + row.new_depositor, 0)

// Calculate Pure Member
const pureMember = activeMember - newDepositor
```

**Alternative (using MV for new_depositor):**
```typescript
// Daily Mode - from bp_daily_summary_myr
const { data: mvData } = await supabase
  .from('bp_daily_summary_myr')
  .select('new_depositor')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .eq('line', 'ALL')

const newDepositor = mvData.reduce((sum, row) => sum + row.new_depositor, 0)
const pureMember = activeMember - newDepositor
```

---

## **2. PER-USER KPIs (DIVISION-BASED)**

These KPIs require dividing financial aggregates by member counts.

### **2.1 DA User (Deposit Amount per User)**
**Formula:** `DA User = Total Deposit Amount / Active Member`

**Logic:**
```typescript
// Get Active Member (COUNT DISTINCT)
const activeMember = await getActiveMember(startDate, endDate)

// Get Deposit Amount from MV
const { data: mvData } = await supabase
  .from('bp_daily_summary_myr')
  .select('deposit_amount')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .eq('line', 'ALL')

const depositAmount = mvData.reduce((sum, row) => sum + row.deposit_amount, 0)

// Calculate DA User
const daUser = activeMember > 0 ? depositAmount / activeMember : 0
```

---

### **2.2 GGR User**
**Formula:** `GGR User = Net Profit / Active Member`

**Logic:**
```typescript
// Get Active Member (COUNT DISTINCT)
const activeMember = await getActiveMember(startDate, endDate)

// Get Net Profit from MV (pre-calculated)
const { data: mvData } = await supabase
  .from('bp_daily_summary_myr')
  .select('net_profit')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .eq('line', 'ALL')

const netProfit = mvData.reduce((sum, row) => sum + row.net_profit, 0)

// Calculate GGR User
const ggrUser = activeMember > 0 ? netProfit / activeMember : 0
```

**⚠️ CRITICAL:** GGR User uses **Net Profit**, NOT GGR!

---

### **2.3 Purchase Frequency (PF)**
**Formula:** `PF = Total Deposit Cases / Active Member`

**Logic:**
```typescript
// Get Active Member (COUNT DISTINCT)
const activeMember = await getActiveMember(startDate, endDate)

// Get Deposit Cases from MV
const { data: mvData } = await supabase
  .from('bp_daily_summary_myr')
  .select('deposit_cases')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .eq('line', 'ALL')

const depositCases = mvData.reduce((sum, row) => sum + row.deposit_cases, 0)

// Calculate PF
const pf = activeMember > 0 ? depositCases / activeMember : 0
```

**Format:** Display as decimal (e.g., 2.5x means 2.5 deposits per user)

---

### **2.4 Bonus Usage Rate**
**Formula:** `Bonus Usage = (Total Bonus + Add Bonus - Deduct Bonus) / Valid Amount`

**Logic:**
```typescript
// Get aggregates from MV
const { data: mvData } = await supabase
  .from('bp_daily_summary_myr')
  .select('bonus, add_bonus, deduct_bonus, valid_amount')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .eq('line', 'ALL')

const bonus = mvData.reduce((sum, row) => sum + row.bonus, 0)
const addBonus = mvData.reduce((sum, row) => sum + row.add_bonus, 0)
const deductBonus = mvData.reduce((sum, row) => sum + row.deduct_bonus, 0)
const validAmount = mvData.reduce((sum, row) => sum + row.valid_amount, 0)

// Calculate Bonus Usage Rate
const bonusUsageRate = validAmount > 0 
  ? ((bonus + addBonus - deductBonus) / validAmount) * 100 
  : 0
```

**Format:** Display as percentage (e.g., 15.23%)

---

## **3. PURE USER NET PROFIT (AGGREGATE)**

### **Definition**
**Pure User Net Profit** is the **TOTAL net profit** generated by all Pure Users (unique `unique_code`) during the selected period. This is NOT an average per user, but the **sum of net profit** from all users.

### **Formula:**
```typescript
Pure User Net Profit = SUM(net_profit) for all unique_code with deposit_cases > 0
```

### **Logic:**
```typescript
// Step 1: Get all unique_code with deposits in the period
const { data: pureUsers } = await supabase
  .from('blue_whale_myr')
  .select('unique_code')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .gt('deposit_cases', 0)
  .not('unique_code', 'is', null)

const uniqueCodes = [...new Set(pureUsers?.map(u => u.unique_code) || [])]

// Step 2: Calculate total net profit for these unique_code
const { data: profitData } = await supabase
  .from('blue_whale_myr')
  .select('unique_code, deposit_amount, withdraw_amount, add_transaction, deduct_transaction')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .in('unique_code', uniqueCodes)

// Step 3: Sum net profit
let pureUserNetProfit = 0
profitData?.forEach(row => {
  const netProfit = (row.deposit_amount + row.add_transaction) - (row.withdraw_amount + row.deduct_transaction)
  pureUserNetProfit += netProfit
})

return pureUserNetProfit
```

### **Alternative (More Efficient):**
```typescript
// Aggregate in database using RPC or raw SQL
const { data } = await supabase.rpc('calculate_pure_user_net_profit', {
  p_currency: 'MYR',
  p_start_date: startDate,
  p_end_date: endDate
})

// RPC Function:
// CREATE OR REPLACE FUNCTION calculate_pure_user_net_profit(
//   p_currency TEXT,
//   p_start_date DATE,
//   p_end_date DATE
// ) RETURNS NUMERIC AS $$
// BEGIN
//   RETURN (
//     SELECT SUM(
//       (deposit_amount + add_transaction) - (withdraw_amount + deduct_transaction)
//     )
//     FROM blue_whale_myr
//     WHERE currency = p_currency
//       AND date BETWEEN p_start_date AND p_end_date
//       AND deposit_cases > 0
//       AND unique_code IS NOT NULL
//   );
// END;
// $$ LANGUAGE plpgsql;
```

### **Per-Brand Calculation:**
```sql
-- For Brand GGR Contribution or per-brand analysis
SELECT 
  line,
  SUM((deposit_amount + add_transaction) - (withdraw_amount + deduct_transaction)) as pure_user_net_profit
FROM blue_whale_myr
WHERE currency = 'MYR'
  AND date BETWEEN '2025-10-01' AND '2025-10-20'
  AND deposit_cases > 0
  AND unique_code IS NOT NULL
GROUP BY line
ORDER BY pure_user_net_profit DESC
```

### **'ALL' (Total for Currency/Market):**
For the "ALL" aggregation, simply sum the net profit across all brands:

```typescript
// Since unique_code can appear in multiple brands, summing per-brand net profit
// will give the correct total (user contribution is counted per brand)
const { data: allBrands } = await supabase
  .from('blue_whale_myr')
  .select('deposit_amount, withdraw_amount, add_transaction, deduct_transaction')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .gt('deposit_cases', 0)
  .not('unique_code', 'is', null)

const pureUserNetProfitAll = allBrands.reduce((sum, row) => {
  return sum + ((row.deposit_amount + row.add_transaction) - (row.withdraw_amount + row.deduct_transaction))
}, 0)
```

**⚠️ CRITICAL DIFFERENCE:**
- **Pure User (Count):** COUNT DISTINCT unique_code → Cannot be summed from per-brand counts
- **Pure User Net Profit (Amount):** SUM of net profit → CAN be summed from per-brand net profits

### **Format:** 
Display as currency (e.g., "RM 1,234,567.89")

---

## **4. COHORT METRICS (RETENTION, REACTIVATION, CHURN)**

### **4.1 Retention Member**
**Definition:** Users active in BOTH current period AND previous period

**Daily Mode Logic:**
```sql
-- For date range (e.g., Oct 1-20)
-- Previous period: Same number of days before start date (e.g., Sept 11-30 for 20-day period)

SELECT COUNT(DISTINCT bw_current.userkey) as retention_member
FROM blue_whale_myr bw_current
INNER JOIN blue_whale_myr bw_prev
  ON bw_current.userkey = bw_prev.userkey
  AND bw_current.currency = bw_prev.currency
WHERE bw_current.currency = 'MYR'
  AND bw_current.date BETWEEN '2025-10-01' AND '2025-10-20'
  AND bw_current.deposit_cases > 0
  AND bw_prev.date BETWEEN '2025-09-11' AND '2025-09-30'
  AND bw_prev.deposit_cases > 0
```

**Quarterly Mode Logic:**
```sql
-- For Q4 2025
-- Previous period: Q3 2025

SELECT COUNT(DISTINCT bw_current.userkey) as retention_member
FROM blue_whale_myr bw_current
INNER JOIN blue_whale_myr bw_prev
  ON bw_current.userkey = bw_prev.userkey
  AND bw_current.currency = bw_prev.currency
WHERE bw_current.currency = 'MYR'
  AND EXTRACT(YEAR FROM bw_current.date) = 2025
  AND EXTRACT(QUARTER FROM bw_current.date) = 4
  AND bw_current.deposit_cases > 0
  AND EXTRACT(YEAR FROM bw_prev.date) = 2025
  AND EXTRACT(QUARTER FROM bw_prev.date) = 3
  AND bw_prev.deposit_cases > 0
```

**TypeScript Implementation:**
```typescript
async function calculateRetentionMember(
  currency: string,
  currentStart: string,
  currentEnd: string,
  prevStart: string,
  prevEnd: string
): Promise<number> {
  // Get active users in current period
  const { data: currentUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', currency)
    .gte('date', currentStart)
    .lte('date', currentEnd)
    .gt('deposit_cases', 0)
  
  const currentUserKeys = [...new Set(currentUsers?.map(u => u.userkey) || [])]
  
  // Get active users in previous period
  const { data: prevUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', currency)
    .gte('date', prevStart)
    .lte('date', prevEnd)
    .gt('deposit_cases', 0)
  
  const prevUserKeys = new Set(prevUsers?.map(u => u.userkey) || [])
  
  // Count intersection (users in both periods)
  const retentionMember = currentUserKeys.filter(key => prevUserKeys.has(key)).length
  
  return retentionMember
}
```

---

### **4.2 Reactivation Member**
**Definition:** Users active in current period, NOT active in previous period, AND NOT new depositors

**Daily Mode Logic:**
```sql
-- For date range (e.g., Oct 1-20)
-- Previous period: Same number of days before start date
-- Check first_deposit_date to exclude new depositors

SELECT COUNT(DISTINCT bw_current.userkey) as reactivation_member
FROM blue_whale_myr bw_current
LEFT JOIN blue_whale_myr bw_prev
  ON bw_current.userkey = bw_prev.userkey
  AND bw_current.currency = bw_prev.currency
  AND bw_prev.date BETWEEN '2025-09-11' AND '2025-09-30'
  AND bw_prev.deposit_cases > 0
WHERE bw_current.currency = 'MYR'
  AND bw_current.date BETWEEN '2025-10-01' AND '2025-10-20'
  AND bw_current.deposit_cases > 0
  AND bw_prev.userkey IS NULL  -- NOT active in previous period
  AND bw_current.first_deposit_date < '2025-10-01'  -- NOT new depositor in current period
```

**Quarterly Mode Logic (Skip 1 Month):**
```sql
-- For Q4 2025 (Oct, Nov, Dec)
-- Previous period: Q3 2025 (Jul, Aug, Sep)
-- Reactivation = Active in Q4, NOT active in Q3, NOT new in Q4
-- "Skip 1 month" = Active in June, Inactive in July, August, September, Active again in October

SELECT COUNT(DISTINCT bw_current.userkey) as reactivation_member
FROM blue_whale_myr bw_current
LEFT JOIN blue_whale_myr bw_prev
  ON bw_current.userkey = bw_prev.userkey
  AND bw_current.currency = bw_prev.currency
  AND EXTRACT(YEAR FROM bw_prev.date) = 2025
  AND EXTRACT(QUARTER FROM bw_prev.date) = 3
  AND bw_prev.deposit_cases > 0
WHERE bw_current.currency = 'MYR'
  AND EXTRACT(YEAR FROM bw_current.date) = 2025
  AND EXTRACT(QUARTER FROM bw_current.date) = 4
  AND bw_current.deposit_cases > 0
  AND bw_prev.userkey IS NULL  -- NOT active in Q3
  AND bw_current.first_deposit_date < '2025-10-01'  -- NOT new depositor in Q4
```

**TypeScript Implementation:**
```typescript
async function calculateReactivationMember(
  currency: string,
  currentStart: string,
  currentEnd: string,
  prevStart: string,
  prevEnd: string
): Promise<number> {
  // Get active users in current period
  const { data: currentUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey, first_deposit_date')
    .eq('currency', currency)
    .gte('date', currentStart)
    .lte('date', currentEnd)
    .gt('deposit_cases', 0)
  
  // Get unique current users (with earliest first_deposit_date per userkey)
  const currentUserMap = new Map()
  currentUsers?.forEach(u => {
    if (!currentUserMap.has(u.userkey) || u.first_deposit_date < currentUserMap.get(u.userkey)) {
      currentUserMap.set(u.userkey, u.first_deposit_date)
    }
  })
  
  // Get active users in previous period
  const { data: prevUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', currency)
    .gte('date', prevStart)
    .lte('date', prevEnd)
    .gt('deposit_cases', 0)
  
  const prevUserKeys = new Set(prevUsers?.map(u => u.userkey) || [])
  
  // Count users: in current, NOT in previous, AND first_deposit_date before current period
  let reactivationMember = 0
  currentUserMap.forEach((firstDepositDate, userkey) => {
    if (!prevUserKeys.has(userkey) && firstDepositDate < currentStart) {
      reactivationMember++
    }
  })
  
  return reactivationMember
}
```

---

### **4.3 Churn Member**
**Definition:** Users active in previous period, NOT active in current period

**Daily Mode Logic:**
```sql
-- For date range (e.g., Oct 1-20)
-- Previous period: Same number of days before start date

SELECT COUNT(DISTINCT bw_prev.userkey) as churn_member
FROM blue_whale_myr bw_prev
LEFT JOIN blue_whale_myr bw_current
  ON bw_prev.userkey = bw_current.userkey
  AND bw_prev.currency = bw_current.currency
  AND bw_current.date BETWEEN '2025-10-01' AND '2025-10-20'
  AND bw_current.deposit_cases > 0
WHERE bw_prev.currency = 'MYR'
  AND bw_prev.date BETWEEN '2025-09-11' AND '2025-09-30'
  AND bw_prev.deposit_cases > 0
  AND bw_current.userkey IS NULL  -- NOT active in current period
```

**TypeScript Implementation:**
```typescript
async function calculateChurnMember(
  currency: string,
  currentStart: string,
  currentEnd: string,
  prevStart: string,
  prevEnd: string
): Promise<number> {
  // Get active users in previous period
  const { data: prevUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', currency)
    .gte('date', prevStart)
    .lte('date', prevEnd)
    .gt('deposit_cases', 0)
  
  const prevUserKeys = [...new Set(prevUsers?.map(u => u.userkey) || [])]
  
  // Get active users in current period
  const { data: currentUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', currency)
    .gte('date', currentStart)
    .lte('date', currentEnd)
    .gt('deposit_cases', 0)
  
  const currentUserKeys = new Set(currentUsers?.map(u => u.userkey) || [])
  
  // Count users: in previous, NOT in current
  const churnMember = prevUserKeys.filter(key => !currentUserKeys.has(key)).length
  
  return churnMember
}
```

---

### **4.4 Cohort Rates**

**Retention Rate:**
```typescript
// Formula: Retention Member / Active Member (previous period) * 100
const retentionRate = prevActiveMember > 0 
  ? (retentionMember / prevActiveMember) * 100 
  : 0
```

**Reactivation Rate:**
```typescript
// Formula: Reactivation Member / Active Member (current period) * 100
const reactivationRate = activeMember > 0 
  ? (reactivationMember / activeMember) * 100 
  : 0
```

**Churn Rate:**
```typescript
// Formula: Churn Member / Active Member (previous period) * 100
const churnRate = prevActiveMember > 0 
  ? (churnMember / prevActiveMember) * 100 
  : 0
```

---

## **5. KPIs IN MV BUT NEED RECALCULATION FOR TOTAL**

### **5.1 Average Transaction Value (ATV)**

**Why Recalculation Needed?**
- ATV is **pre-calculated per row** in MV (for each date/line)
- For **KPI Card Total**, we need to recalculate from **aggregated SUM** across all rows

**Formula:**
```typescript
ATV (Total) = SUM(deposit_amount) / SUM(deposit_cases)
```

**❌ WRONG (Don't average the ATV values):**
```typescript
// This is WRONG!
const avgATV = mvData.reduce((sum, row) => sum + row.atv, 0) / mvData.length
```

**✅ CORRECT (Recalculate from SUM aggregates):**
```typescript
// Daily Mode
const { data: mvData } = await supabase
  .from('bp_daily_summary_myr')
  .select('deposit_amount, deposit_cases')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .eq('line', 'ALL')

// Aggregate in memory
const totalDepositAmount = mvData.reduce((sum, row) => sum + row.deposit_amount, 0)
const totalDepositCases = mvData.reduce((sum, row) => sum + row.deposit_cases, 0)

// Recalculate ATV
const atv = totalDepositCases > 0 ? totalDepositAmount / totalDepositCases : 0
```

**Quarterly Mode (ATV NOT in MV, must calculate):**
```typescript
// Quarterly Mode - bp_quarter_summary_myr does NOT have ATV pre-calculated
const { data: mvData } = await supabase
  .from('bp_quarter_summary_myr')
  .select('deposit_amount, deposit_cases')
  .eq('currency', 'MYR')
  .eq('year', currentYear)
  .eq('period', currentQuarter)
  .eq('period_type', 'QUARTERLY')
  .eq('line', 'ALL')
  .single()

// Calculate ATV
const atv = mvData.deposit_cases > 0 
  ? mvData.deposit_amount / mvData.deposit_cases 
  : 0
```

**Example:**
```
Day 1: Deposit = 1000, Cases = 10, ATV = 100
Day 2: Deposit = 2000, Cases = 20, ATV = 100
Day 3: Deposit = 3000, Cases = 50, ATV = 60

❌ WRONG: Average ATV = (100 + 100 + 60) / 3 = 86.67
✅ CORRECT: Total ATV = (1000 + 2000 + 3000) / (10 + 20 + 50) = 6000 / 80 = 75
```

**Format:** Display as currency (e.g., "RM 75.00")

---

## **6. COMPARISON LOGIC (MoM, DATE-TO-DATE)**

Refer to `lib/businessPerformanceComparison.ts` for helper functions.

### **6.1 Previous Period Calculation**

**Rule:**
1. **Incomplete Period (Current Month/Quarter):** Date-to-Date comparison
2. **Complete Period:** Month-to-Month or Quarter-to-Quarter comparison

**Example:**
```typescript
import { calculatePreviousPeriod } from '@/lib/businessPerformanceComparison'

// For Oct 1-20, 2025 (20 days, incomplete month)
const { prevStart, prevEnd, comparisonType } = calculatePreviousPeriod(
  '2025-10-01',
  '2025-10-20',
  false // isQuarterComplete
)
// Result: prevStart = '2025-09-01', prevEnd = '2025-09-20', comparisonType = 'DATE_TO_DATE'

// For Sept 1-30, 2025 (complete month)
const { prevStart, prevEnd, comparisonType } = calculatePreviousPeriod(
  '2025-09-01',
  '2025-09-30',
  false // isQuarterComplete
)
// Result: prevStart = '2025-08-01', prevEnd = '2025-08-31', comparisonType = 'MONTH_TO_MONTH'
```

---

### **6.2 MoM Change Calculation**

```typescript
import { calculateMoMChange } from '@/lib/businessPerformanceComparison'

const momChange = calculateMoMChange(currentValue, previousValue)
// Returns: { value: 25.5, isIncrease: true }
```

**Formula:** `((Current - Previous) / Previous) * 100`

---

### **6.3 Average Daily Calculation**

```typescript
import { calculateAverageDaily, getTotalDaysInPeriod } from '@/lib/businessPerformanceComparison'

const totalDays = getTotalDaysInPeriod('2025-10-01', '2025-10-20')
// Result: 20

const avgDaily = calculateAverageDaily(1000000, totalDays)
// Result: 50000 (1000000 / 20)
```

---

## **7. CHART-SPECIFIC AGGREGATIONS**

### **7.1 GGR Trend (Line Chart)**
**Requirement:** Show GGR per period (daily or quarterly)

**Daily Mode:**
```typescript
// Fetch from MV (GGR already pre-calculated)
const { data: chartData } = await supabase
  .from('bp_daily_summary_myr')
  .select('date, ggr')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .eq('line', 'ALL')
  .order('date', { ascending: true })

// Format for chart
const categories = chartData.map(row => format(parseISO(row.date), 'MMM dd'))
const series = [{
  name: 'GGR',
  data: chartData.map(row => row.ggr),
  color: '#3B82F6'
}]
```

**Quarterly Mode:**
```typescript
// Fetch from MV (GGR already pre-calculated)
const { data: chartData } = await supabase
  .from('bp_quarter_summary_myr')
  .select('period, ggr')
  .eq('currency', 'MYR')
  .eq('year', currentYear)
  .eq('period_type', 'QUARTERLY')
  .eq('line', 'ALL')
  .order('period', { ascending: true })

// Format for chart
const categories = chartData.map(row => row.period) // ['Q1', 'Q2', 'Q3', 'Q4']
const series = [{
  name: 'GGR',
  data: chartData.map(row => row.ggr),
  color: '#3B82F6'
}]
```

---

### **7.2 Brand GGR Contribution (Stacked Bar)**
**Requirement:** Show GGR contribution per brand (SBMY, LVMY, JMMY, STMY) for each period

**Daily Mode:**
```typescript
// Fetch per-brand data from MV
const { data: brandData } = await supabase
  .from('bp_daily_summary_myr')
  .select('date, line, ggr')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .neq('line', 'ALL')
  .order('date', { ascending: true })

// Group by date, then by brand
const groupedByDate = {}
brandData.forEach(row => {
  if (!groupedByDate[row.date]) {
    groupedByDate[row.date] = {}
  }
  groupedByDate[row.date][row.line] = row.ggr
})

// Detect unique brands (dynamic)
const brands = [...new Set(brandData.map(row => row.line))].sort()

// Format for stacked bar chart
const categories = Object.keys(groupedByDate).map(date => format(parseISO(date), 'MMM dd'))
const series = brands.map((brand, index) => ({
  name: brand,
  data: Object.values(groupedByDate).map(dateData => dateData[brand] || 0),
  color: BRAND_COLORS[index % BRAND_COLORS.length]
}))
```

---

### **7.3 Bonus Usage Rate per Brand (Bar Chart)**
**Requirement:** Show bonus usage rate for each brand

**Logic:**
```typescript
// Fetch per-brand financial data from MV
const { data: brandData } = await supabase
  .from('bp_daily_summary_myr')
  .select('line, bonus, add_bonus, deduct_bonus, valid_amount')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .neq('line', 'ALL')

// Aggregate by brand
const brandAggregates = {}
brandData.forEach(row => {
  if (!brandAggregates[row.line]) {
    brandAggregates[row.line] = { bonus: 0, addBonus: 0, deductBonus: 0, validAmount: 0 }
  }
  brandAggregates[row.line].bonus += row.bonus
  brandAggregates[row.line].addBonus += row.add_bonus
  brandAggregates[row.line].deductBonus += row.deduct_bonus
  brandAggregates[row.line].validAmount += row.valid_amount
})

// Calculate rate per brand
const categories = Object.keys(brandAggregates).sort()
const data = categories.map(brand => {
  const { bonus, addBonus, deductBonus, validAmount } = brandAggregates[brand]
  return validAmount > 0 
    ? ((bonus + addBonus - deductBonus) / validAmount) * 100 
    : 0
})

const series = [{
  name: 'Bonus Usage Rate',
  data: data,
  color: '#3B82F6'
}]
```

---

### **7.4 Retention vs Churn Rate (Dual Bar Chart)**
**Requirement:** Show retention rate and churn rate per brand

**Logic:**
```typescript
// Step 1: Detect unique brands from current period
const { data: currentBrandData } = await supabase
  .from('blue_whale_myr')
  .select('line')
  .eq('currency', 'MYR')
  .gte('date', currentStart)
  .lte('date', currentEnd)
  .gt('deposit_cases', 0)
  .neq('line', 'ALL')

const brands = [...new Set(currentBrandData?.map(row => row.line) || [])].sort()

// Step 2: Calculate retention and churn for each brand
const retentionData = []
const churnData = []

for (const brand of brands) {
  // Get active members in current period for this brand
  const { data: currentUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', 'MYR')
    .eq('line', brand)
    .gte('date', currentStart)
    .lte('date', currentEnd)
    .gt('deposit_cases', 0)
  
  const currentUserKeys = [...new Set(currentUsers?.map(u => u.userkey) || [])]
  const activeMemberCurrent = currentUserKeys.length
  
  // Get active members in previous period for this brand
  const { data: prevUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', 'MYR')
    .eq('line', brand)
    .gte('date', prevStart)
    .lte('date', prevEnd)
    .gt('deposit_cases', 0)
  
  const prevUserKeys = new Set(prevUsers?.map(u => u.userkey) || [])
  const activeMemberPrev = prevUserKeys.size
  
  // Calculate retention (users in both periods)
  const retentionMember = currentUserKeys.filter(key => prevUserKeys.has(key)).length
  const retentionRate = activeMemberPrev > 0 ? (retentionMember / activeMemberPrev) * 100 : 0
  
  // Calculate churn (users in previous, NOT in current)
  const currentUserKeySet = new Set(currentUserKeys)
  const churnMember = [...prevUserKeys].filter(key => !currentUserKeySet.has(key)).length
  const churnRate = activeMemberPrev > 0 ? (churnMember / activeMemberPrev) * 100 : 0
  
  retentionData.push(retentionRate)
  churnData.push(churnRate)
}

// Format for dual bar chart
const categories = brands
const series = [
  {
    name: 'Retention Rate',
    data: retentionData,
    color: '#3B82F6'
  },
  {
    name: 'Churn Rate',
    data: churnData,
    color: '#F97316'
  }
]
```

---

## **8. QUERY OPTIMIZATION TIPS**

### **8.1 Use Parallel Queries**
```typescript
// ❌ BAD: Sequential queries (slow)
const activeMember = await getActiveMember()
const pureUser = await getPureUser()
const retention = await getRetention()

// ✅ GOOD: Parallel queries (fast)
const [activeMember, pureUser, retention] = await Promise.all([
  getActiveMember(),
  getPureUser(),
  getRetention()
])
```

---

### **8.2 Fetch MV Data Once**
```typescript
// ✅ Fetch all needed columns in one query
const { data: mvData } = await supabase
  .from('bp_daily_summary_myr')
  .select('deposit_amount, deposit_cases, withdraw_amount, ggr, net_profit, atv, winrate')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .eq('line', 'ALL')

// Aggregate in memory
const depositAmount = mvData.reduce((sum, row) => sum + row.deposit_amount, 0)
const ggr = mvData.reduce((sum, row) => sum + row.ggr, 0)
// ... etc
```

---

### **8.3 Filter Early**
```typescript
// ✅ Apply filters in database query, not in JavaScript
const { data } = await supabase
  .from('blue_whale_myr')
  .select('userkey')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .gt('deposit_cases', 0)  // ← Filter in database
  .neq('line', 'ALL')      // ← Filter in database

// ❌ BAD: Fetch all data, then filter in JavaScript
const { data } = await supabase
  .from('blue_whale_myr')
  .select('*')

const filtered = data.filter(row => 
  row.currency === 'MYR' && 
  row.deposit_cases > 0
) // ← Slow!
```

---

### **8.4 Use COUNT Queries for Large Datasets**
```typescript
// ✅ GOOD: Use count query (fast)
const { count: activeMember } = await supabase
  .from('blue_whale_myr')
  .select('userkey', { count: 'exact', head: true })
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .gt('deposit_cases', 0)

// ❌ BAD: Fetch all data, then count (slow for large datasets)
const { data } = await supabase
  .from('blue_whale_myr')
  .select('userkey')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .gt('deposit_cases', 0)

const activeMember = new Set(data.map(row => row.userkey)).size
```

---

## **9. SUMMARY CHECKLIST**

### **A. KPIs WAJIB Calculate in API (Must Use Logic):**
- [ ] **Active Member** (COUNT DISTINCT userkey from `blue_whale_myr`)
- [ ] **Pure User** (COUNT DISTINCT unique_code from `blue_whale_myr`)
- [ ] **Pure Active / Pure Member** (Active Member - New Depositor)
- [ ] **Pure User Net Profit** (SUM net profit for all unique_code with deposits)
- [ ] **DA User** (Deposit Amount / Active Member)
- [ ] **GGR User** (Net Profit / Active Member)
- [ ] **Purchase Frequency (PF)** (Deposit Cases / Active Member)
- [ ] **Bonus Usage Rate** ((Bonus + Add - Deduct) / Valid Amount * 100)
- [ ] **Retention Member** (COUNT users in both periods)
- [ ] **Retention Rate** (Retention / Prev Active Member * 100)
- [ ] **Reactivation Member** (COUNT users in current, NOT prev, NOT new)
- [ ] **Reactivation Rate** (Reactivation / Active Member * 100)
- [ ] **Churn Member** (COUNT users in prev, NOT current)
- [ ] **Churn Rate** (Churn / Prev Active Member * 100)

### **B. KPI in MV but Need Recalculation for KPI Card Total:**
- [ ] **ATV (Average Transaction Value)** - Must recalculate: SUM(deposit_amount) / SUM(deposit_cases)
  - ⚠️ ATV exists per-row in `bp_daily_summary_myr`, but DON'T average the ATV values
  - ✅ Recalculate from aggregated SUM across all rows

### **C. KPIs Already in MV (No Calculation Needed):**
- [x] **GGR** (from `bp_daily_summary_myr` and `bp_quarter_summary_myr`)
- [x] **Net Profit** (from `bp_daily_summary_myr` and `bp_quarter_summary_myr`)
- [x] **Winrate** (from `bp_daily_summary_myr` and `bp_quarter_summary_myr`)
- [x] **Withdrawal Rate** (from `bp_daily_summary_myr` and `bp_quarter_summary_myr`)
- [x] **Hold Percentage** (from `bp_daily_summary_myr` only)
- [x] **Conversion Rate** (from `bp_daily_summary_myr` only)
- [x] **Financial Aggregates** (deposit, withdraw, bonus, etc. - all MVs)
- [x] **New Register, New Depositor** (from MV via JOIN with `new_register`)

---

## **10. QUICK REFERENCE TABLE**

| KPI | Daily Mode | Quarterly Mode | Calculation Method |
|-----|------------|----------------|-------------------|
| **Active Member** | `blue_whale_myr` (API) | `blue_whale_myr` (API) | COUNT DISTINCT userkey |
| **Pure User** | `blue_whale_myr` (API) | `blue_whale_myr` (API) | COUNT DISTINCT unique_code |
| **Pure Active** | API Logic | API Logic | Active - New Depositor |
| **Pure User Net Profit** | `blue_whale_myr` (API) | `blue_whale_myr` (API) | SUM net_profit for unique_code |
| **GGR** | `bp_daily_summary_myr` ✅ | `bp_quarter_summary_myr` ✅ | Pre-calculated in MV |
| **Net Profit** | `bp_daily_summary_myr` ✅ | `bp_quarter_summary_myr` ✅ | Pre-calculated in MV |
| **ATV** | Recalculate (API) ⚠️ | Calculate (API) | SUM(deposit) / SUM(cases) |
| **Winrate** | `bp_daily_summary_myr` ✅ | `bp_quarter_summary_myr` ✅ | Pre-calculated in MV |
| **Withdrawal Rate** | `bp_daily_summary_myr` ✅ | `bp_quarter_summary_myr` ✅ | Pre-calculated in MV |
| **PF** | API Logic | API Logic | Deposit Cases / Active Member |
| **DA User** | API Logic | API Logic | Deposit Amount / Active Member |
| **GGR User** | API Logic | API Logic | Net Profit / Active Member |
| **Bonus Usage** | API Logic | API Logic | (Bonus ± adjustments) / Valid Amount |
| **Retention** | `blue_whale_myr` (API) | `blue_whale_myr` (API) | COUNT users in both periods |
| **Reactivation** | `blue_whale_myr` (API) | `blue_whale_myr` (API) | COUNT users: current, NOT prev, NOT new |
| **Churn** | `blue_whale_myr` (API) | `blue_whale_myr` (API) | COUNT users: prev, NOT current |

---

**END OF DOCUMENT**

