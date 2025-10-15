# 📊 ANALISIS STRUKTUR TABLE: blue_whale_myr_monthly_summary
## Persiapan Build Overview MYR Page

> **Table Type**: Materialized View  
> **Currency**: MYR (Malaysian Ringgit)  
> **Source Tables**: `blue_whale_myr` + `new_register`  
> **Analysis Date**: October 14, 2025

---

## 📋 TABLE OF CONTENTS

1. [Overview Struktur](#1-overview-struktur)
2. [GROUPING SETS Logic](#2-grouping-sets-logic)
3. [Column Specifications](#3-column-specifications)
4. [KPI Calculations](#4-kpi-calculations)
5. [Indexes](#5-indexes)
6. [Query Patterns](#6-query-patterns)
7. [Comparison with USC](#7-comparison-with-usc)
8. [Implementation Plan](#8-implementation-plan)

---

## 1. OVERVIEW STRUKTUR

### 1.1 Materialized View Purpose
Table ini adalah **pre-aggregated monthly summary** untuk currency MYR dengan:
- ✅ **Aggregasi Bulanan** per Line
- ✅ **ROLLUP "ALL"** untuk month dan line
- ✅ **DISTINCT COUNT** untuk Active Member dan Pure User
- ✅ **SUM Aggregates** untuk semua transaksi
- ✅ **Derived KPIs** calculated from aggregates

### 1.2 Data Sources

```sql
-- Source 1: blue_whale_myr (main transactions)
FROM blue_whale_myr
WHERE currency = 'MYR'

-- Source 2: new_register (registration data)
FROM new_register
WHERE currency = 'MYR'
-- uniquekey format: "line-YYYY-MM-DD-currency"
```

### 1.3 Key Features

| Feature | Description |
|---------|-------------|
| **Granularity** | Monthly (year, month, line) + ROLLUP |
| **Currency Lock** | MYR only |
| **UNIQUE Tracking** | Active Member (userkey) + Pure User (unique_code) |
| **Aggregation** | SUM for amounts/cases, COUNT DISTINCT for members |
| **Rollup Levels** | 4 levels via GROUPING SETS |

---

## 2. GROUPING SETS LOGIC

### 2.1 GROUPING SETS Structure

```sql
GROUPING SETS (
    (year, month, line),    -- Level 1: Normal monthly per line
    (year, month),          -- Level 2: Month ALL (all lines combined)
    (year, line),           -- Level 3: Year ALL (all months combined)
    (year)                  -- Level 4: Both ALL (year total)
)
```

### 2.2 ROLLUP Indicators

```sql
-- MONTH rollup indicator
CASE WHEN GROUPING(month)=1 THEN 0 ELSE month END AS month
-- month = 0 means "ALL months"

-- LINE rollup indicator
CASE WHEN GROUPING(line)=1 THEN 'ALL' ELSE line END AS line
-- line = 'ALL' means "ALL lines"
```

### 2.3 Rollup Examples

| year | month | line | Description |
|------|-------|------|-------------|
| 2025 | 9 | 4D | September 2025 for line 4D |
| 2025 | 9 | ALL | September 2025 for ALL lines |
| 2025 | 0 | 4D | Full year 2025 for line 4D |
| 2025 | 0 | ALL | Full year 2025 for ALL lines |

### 2.4 Query Patterns

```sql
-- Get specific month + line
WHERE year = 2025 AND month = 9 AND line = '4D'

-- Get specific month, all lines
WHERE year = 2025 AND month = 9 AND line = 'ALL'

-- Get full year for specific line
WHERE year = 2025 AND month = 0 AND line = '4D'

-- Get full year, all lines
WHERE year = 2025 AND month = 0 AND line = 'ALL'
```

---

## 3. COLUMN SPECIFICATIONS

### 3.1 Dimension Columns

| Column | Type | Values | Description |
|--------|------|--------|-------------|
| `year` | INT | 2021-2025 | Year (EXTRACT from date) |
| `month` | INT | 0-12 | Month (0 = ALL, 1-12 = normal) |
| `line` | TEXT | 'ALL', '4D', etc. | Line name or 'ALL' |
| `currency` | TEXT | 'MYR' | Currency (locked to MYR) |

### 3.2 UNIQUE KPI Columns (DISTINCT COUNT)

| Column | Calculation | Description |
|--------|-------------|-------------|
| `active_member` | COUNT(DISTINCT userkey WHERE deposit_cases > 0) | Unique users with deposits |
| `pure_user` | COUNT(DISTINCT unique_code WHERE deposit_cases > 0) | Unique codes with deposits |

**⚠️ CRITICAL**: These are **DISTINCT counts** at the aggregation level, NOT summable!

### 3.3 SUM Aggregate Columns

| Column | Source | Unit | Description |
|--------|--------|------|-------------|
| `deposit_cases` | SUM(deposit_cases) | Cases | Total deposit transactions |
| `deposit_amount` | SUM(deposit_amount) | MYR | Total deposit amount |
| `withdraw_cases` | SUM(withdraw_cases) | Cases | Total withdraw transactions |
| `withdraw_amount` | SUM(withdraw_amount) | MYR | Total withdraw amount |
| `bonus` | SUM(bonus) | MYR | Total bonus |
| `add_bonus` | SUM(add_bonus) | MYR | Total bonus added |
| `add_transaction` | SUM(add_transaction) | MYR | Total transaction adjustments (positive) |
| `deduct_bonus` | SUM(deduct_bonus) | MYR | Total bonus deducted |
| `deduct_transaction` | SUM(deduct_transaction) | MYR | Total transaction adjustments (negative) |
| `bets_amount` | SUM(bets_amount) | MYR | Total bets placed |
| `valid_amount` | SUM(valid_amount) | MYR | Total valid bets |
| `cases_bets` | SUM(cases_bets) | Cases | Total bet cases |
| `cases_adjustment` | SUM(cases_adjustment) | Cases | Total adjustment cases |

### 3.4 Registration Columns (from new_register table)

| Column | Calculation | Description |
|--------|-------------|-------------|
| `new_register` | SUM from new_register table | New registrations |
| `new_depositor` | SUM from new_register table | New depositors |

**JOIN Logic**:
```sql
LEFT JOIN nr_rollup n
  ON  n.year     = a.year
  AND n.month    = a.month
  AND n.line     = a.line
  AND n.currency = a.currency
```

---

## 4. KPI CALCULATIONS

### 4.1 Basic Derived KPIs (from SUM)

```sql
-- GGR (Gross Gaming Revenue)
ggr = deposit_amount - withdraw_amount

-- NET PROFIT
net_profit = deposit_amount + add_transaction - withdraw_amount - deduct_transaction

-- PURE MEMBER (calculated, not DISTINCT)
pure_member = active_member - new_depositor
```

### 4.2 Ratio KPIs

```sql
-- WINRATE = Net Profit / Deposit Amount
winrate = net_profit / NULLIF(deposit_amount, 0)

-- WITHDRAWAL RATE = Withdraw Cases / Deposit Cases
withdrawal_rate = withdraw_cases / NULLIF(deposit_cases, 0)

-- ATV (Average Transaction Value) = Deposit Amount / Deposit Cases
atv = deposit_amount / NULLIF(deposit_cases, 0)

-- PURCHASE FREQUENCY = Deposit Cases / Active Member
purchase_frequency = deposit_cases / NULLIF(active_member, 0)

-- GGR USER = Net Profit / Active Member
ggr_user = net_profit / NULLIF(active_member, 0)

-- DA USER (Deposit Amount per User) = Deposit Amount / Active Member
da_user = deposit_amount / NULLIF(active_member, 0)

-- HOLD PERCENTAGE = Net Profit / Valid Amount
hold_percentage = net_profit / NULLIF(valid_amount, 0)

-- CONVERSION RATE = New Depositor / New Register
conversion_rate = new_depositor / NULLIF(new_register, 0)
```

### 4.3 KPI Classification

| KPI Type | KPIs | Format |
|----------|------|--------|
| **UNIQUE (DISTINCT)** | active_member, pure_user | Integer (0,000) |
| **AMOUNT (SUM)** | deposit_amount, withdraw_amount, ggr, net_profit, bonus, etc. | Currency (RM 0,000.00) |
| **CASES (SUM)** | deposit_cases, withdraw_cases, cases_bets, cases_adjustment | Integer (0,000) |
| **RATIO (CALCULATED)** | atv, ggr_user, da_user, purchase_frequency | Numeric (0,000.00) |
| **PERCENTAGE (CALCULATED)** | winrate, withdrawal_rate, hold_percentage, conversion_rate | Percentage (0.00%) |

### 4.4 Missing KPIs (need calculation in Logic layer)

The following KPIs are **NOT in MV** and need to be calculated in application logic:

```typescript
// From KPILogic.tsx - need to calculate manually
- churnMember         // Requires time-series analysis
- churnRate           // churnMember / previousActiveMember
- retentionRate       // 1 - churnRate
- growthRate          // (currentActive - previousActive) / previousActive
- customerLifetimeValue // atv × purchaseFrequency × avgCustomerLifespan
- avgCustomerLifespan   // Requires cohort analysis
- customerMaturityIndex // Requires custom calculation
- ggrPerPureUser        // ggr / pure_user
- headcount             // External data source
- depositAmountUser     // Same as da_user
```

---

## 5. INDEXES

### 5.1 Index Structure

```sql
-- Primary lookup: currency + year + month + line
CREATE INDEX ix_myr_monthly_currency_year_month_line
  ON blue_whale_myr_monthly_summary (currency, year, month, line);

-- Year + Month lookup (for line='ALL' queries)
CREATE INDEX ix_myr_monthly_year_month
  ON blue_whale_myr_monthly_summary (year, month);

-- Line + Month lookup (for year aggregations)
CREATE INDEX ix_myr_monthly_line_month
  ON blue_whale_myr_monthly_summary (line, month);

-- Active Member lookup (for filtering/sorting)
CREATE INDEX ix_myr_monthly_active_member
  ON blue_whale_myr_monthly_summary (active_member);
```

### 5.2 Optimal Query Patterns

```sql
-- FAST: Uses primary index
SELECT * FROM blue_whale_myr_monthly_summary
WHERE currency = 'MYR' AND year = 2025 AND month = 9 AND line = 'ALL';

-- FAST: Uses year_month index
SELECT * FROM blue_whale_myr_monthly_summary
WHERE year = 2025 AND month = 9;

-- FAST: Uses line_month index
SELECT * FROM blue_whale_myr_monthly_summary
WHERE line = '4D' AND month BETWEEN 1 AND 12;
```

---

## 6. QUERY PATTERNS

### 6.1 Slicer Options Query

```sql
-- Get available years
SELECT DISTINCT year 
FROM blue_whale_myr_monthly_summary
WHERE currency = 'MYR'
ORDER BY year DESC;

-- Get available months for specific year
SELECT DISTINCT month
FROM blue_whale_myr_monthly_summary
WHERE currency = 'MYR' AND year = 2025 AND month > 0
ORDER BY month;

-- Get available lines
SELECT DISTINCT line
FROM blue_whale_myr_monthly_summary
WHERE currency = 'MYR' AND line <> 'ALL'
ORDER BY line;
```

### 6.2 KPI Data Query (for StatCard)

```sql
-- Get specific month data (for Daily Average + MoM)
SELECT 
    active_member,
    pure_user,
    deposit_amount,
    withdraw_amount,
    ggr,
    net_profit,
    deposit_cases,
    withdraw_cases,
    atv,
    purchase_frequency,
    ggr_user,
    da_user,
    new_register,
    new_depositor,
    pure_member
FROM blue_whale_myr_monthly_summary
WHERE currency = 'MYR'
  AND year = 2025
  AND month = 9
  AND line = 'ALL';
```

### 6.3 Chart Data Query (for Yearly Trends)

```sql
-- Get all months for specific year (for Line Charts)
SELECT 
    month,
    deposit_amount,
    withdraw_amount,
    ggr,
    deposit_cases,
    withdraw_cases,
    active_member,
    purchase_frequency
FROM blue_whale_myr_monthly_summary
WHERE currency = 'MYR'
  AND year = 2025
  AND month > 0  -- Exclude rollup (month=0)
  AND line = 'ALL'
ORDER BY month;
```

### 6.4 Month-Year Mapping (for Dynamic Slicer)

```sql
-- Get month-year combinations for dynamic filtering
SELECT DISTINCT 
    month,
    year
FROM blue_whale_myr_monthly_summary
WHERE currency = 'MYR'
  AND month > 0  -- Exclude rollup
ORDER BY year DESC, month;
```

---

## 7. COMPARISON WITH USC

### 7.1 Similarities

| Aspect | MYR | USC | Status |
|--------|-----|-----|--------|
| **Structure** | Materialized View | Materialized View | ✅ Same |
| **GROUPING SETS** | 4 levels | 4 levels | ✅ Same |
| **month=0 indicator** | Yes | Yes | ✅ Same |
| **line='ALL' indicator** | Yes | Yes | ✅ Same |
| **UNIQUE KPIs** | active_member, pure_user | active_member, pure_user | ✅ Same |
| **Derived KPIs** | ggr, net_profit, atv, etc. | ggr, net_profit, atv, etc. | ✅ Same |
| **Join new_register** | Yes | Yes | ✅ Same |

### 7.2 Differences

| Aspect | MYR | USC | Impact |
|--------|-----|-----|--------|
| **Table Name** | `blue_whale_myr_monthly_summary` | `blue_whale_usc_summary` | API route naming |
| **Currency** | MYR (RM) | USC (USD) | Format helpers |
| **Source Table** | `blue_whale_myr` | `blue_whale_usc` | None (abstracted) |

### 7.3 Logic Reusability

**Can we reuse USC logic?**
- ✅ **Slicer API pattern**: YES - same structure
- ✅ **Chart data API**: YES - same aggregation
- ✅ **Daily Average logic**: YES - same calculation
- ✅ **MoM logic**: YES - same formula
- ⚠️ **KPI Logic**: PARTIAL - need currency lock to MYR

---

## 8. IMPLEMENTATION PLAN

### 8.1 Required Files

```
1. API Routes:
   - app/api/myr-overview/slicer-options/route.ts
   - app/api/myr-overview/chart-data/route.ts

2. Page:
   - app/myr/overview/page.tsx

3. Logic (Option A - Reuse existing):
   - lib/KPILogic.tsx (with currency='MYR' lock)
   - lib/dailyAverageLogic.ts (currency agnostic)
   - lib/momLogic.ts (currency agnostic)

   OR (Option B - New dedicated):
   - lib/MYRDailyAverageAndMoM.ts (similar to USC)
```

### 8.2 Key Differences from USC

```typescript
// 1. Table name
const TABLE_NAME = 'blue_whale_myr_monthly_summary'  // vs blue_whale_usc_summary

// 2. Currency lock
const CURRENCY = 'MYR'  // vs 'USC'

// 3. Currency symbol
const SYMBOL = 'RM'  // vs 'USD'

// 4. Everything else is IDENTICAL
```

### 8.3 Implementation Steps

**Step 1: Create API Routes** (Copy from USC, change table name + currency)
```typescript
// app/api/myr-overview/slicer-options/route.ts
- Query: blue_whale_myr_monthly_summary
- Filter: currency = 'MYR'
- Return: years, months, lines, defaults

// app/api/myr-overview/chart-data/route.ts
- Query: blue_whale_myr_monthly_summary
- Filter: currency = 'MYR' AND month > 0
- Return: monthly aggregates for charts
```

**Step 2: Create Page** (Copy from USC Overview, minimal changes)
```typescript
// app/myr/overview/page.tsx
- Currency lock: 'MYR'
- API endpoints: '/api/myr-overview/...'
- Format: formatCurrencyKPI(value, 'MYR')
- Everything else identical
```

**Step 3: Logic Layer** (Reuse or create new)
```typescript
// Option A: Reuse KPILogic.tsx
const filters = {
  year: '2025',
  month: 'September',
  currency: 'MYR',  // Lock here
  line: 'ALL'
}

// Option B: Create MYRDailyAverageAndMoM.ts
// Copy from USCDailyAverageAndMoM.ts
// Change table name + currency
```

### 8.4 Testing Checklist

```sql
-- Test 1: Verify data exists
SELECT COUNT(*) FROM blue_whale_myr_monthly_summary
WHERE currency = 'MYR';

-- Test 2: Check latest month
SELECT year, month, line, active_member, deposit_amount
FROM blue_whale_myr_monthly_summary
WHERE currency = 'MYR'
ORDER BY year DESC, month DESC
LIMIT 10;

-- Test 3: Verify ALL rollup
SELECT year, month, line, active_member, deposit_amount
FROM blue_whale_myr_monthly_summary
WHERE currency = 'MYR' AND line = 'ALL' AND month > 0
ORDER BY year DESC, month DESC
LIMIT 10;

-- Test 4: Check year rollup
SELECT year, month, line, active_member, deposit_amount
FROM blue_whale_myr_monthly_summary
WHERE currency = 'MYR' AND month = 0 AND line = 'ALL'
ORDER BY year DESC
LIMIT 10;
```

---

## 9. CRITICAL NOTES

### 9.1 UNIQUE KPIs Handling

⚠️ **IMPORTANT**: `active_member` and `pure_user` are **DISTINCT counts** at each aggregation level.

**DO NOT SUM THEM** when aggregating further!

```typescript
// ❌ WRONG
const totalActive = data.reduce((sum, row) => sum + row.active_member, 0)

// ✅ CORRECT - Use pre-aggregated value
const totalActive = data.find(row => row.line === 'ALL')?.active_member || 0
```

### 9.2 Month = 0 Handling

```typescript
// For slicer: Show only normal months (1-12)
const months = data.filter(row => row.month > 0)

// For year total: Use month = 0
const yearTotal = data.find(row => row.month === 0 && row.line === 'ALL')
```

### 9.3 Missing KPIs Strategy

**For KPIs not in MV**:
1. Calculate in application logic (client-side or API)
2. Use formulas from KPILogic.tsx
3. May require additional database queries

```typescript
// Example: Churn calculation
const churnMember = await calculateChurnFromDaily(year, month, 'MYR')
const churnRate = (churnMember / previousActiveMember) * 100
```

---

## 10. SUMMARY

### 10.1 Table Strengths

✅ **Pre-aggregated** - Fast queries  
✅ **GROUPING SETS** - Flexible rollup levels  
✅ **DISTINCT tracking** - Accurate unique counts  
✅ **Derived KPIs** - Common calculations included  
✅ **Indexed** - Optimized for common queries

### 10.2 Limitations

⚠️ **No time-series KPIs** (churn, retention, growth)  
⚠️ **No cohort analysis** (ACL, CLV components)  
⚠️ **DISTINCT not summable** across aggregations  
⚠️ **Monthly granularity only** (no daily breakdown)

### 10.3 Implementation Readiness

**Readiness Score: 95%** 🟢

- ✅ Table structure understood
- ✅ Query patterns identified
- ✅ USC reference available (almost identical)
- ✅ Logic layers reusable
- ⚠️ Need to create API routes
- ⚠️ Need to create page file

**Recommendation**: **Proceed with implementation** using USC Overview as template.

---

**Document Version**: 1.0  
**Analysis Date**: October 14, 2025  
**Table**: `blue_whale_myr_monthly_summary`  
**Analyst**: NEXMAX Development Team  
**Status**: ✅ READY FOR IMPLEMENTATION

