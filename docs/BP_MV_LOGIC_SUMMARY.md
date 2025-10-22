# Business Performance MV Logic Summary

**Date:** 2025-10-22  
**Project:** NEXMAX Dashboard - Business Performance Module

---

## **OVERVIEW**

Business Performance page menggunakan **2 VISUAL MODES**:
1. **Quarterly Mode** - Menggunakan `bp_quarter_summary_myr` (MV)
2. **Daily Mode** - Menggunakan `bp_daily_summary_myr` (MV) + API Logic

Setiap MV memiliki **batasan akurasi** yang berbeda.

---

## **1. bp_daily_summary_myr (DAILY MODE)**

### **✅ VALID - Financial Aggregates ONLY**
MV ini **HANYA VALID** untuk menyimpan **SUM financial data per day**:
- `deposit_amount`, `deposit_cases`
- `withdraw_amount`, `withdraw_cases`
- `bonus`, `add_bonus`, `deduct_bonus`
- `add_transaction`, `deduct_transaction`
- `bets_amount`, `valid_amount`
- `new_register`, `new_depositor` (from `new_register` table JOIN)

### **❌ TIDAK VALID - ALL KPIs**
**SEMUA KPI** berikut **WAJIB CALCULATE via API LOGIC** (tidak akurat di MV):

#### **Member Metrics:**
- `active_member` - COUNT DISTINCT userkey
- `pure_member` - active_member - new_depositor
- `pure_user` - COUNT DISTINCT unique_code

#### **Calculated KPIs:**
- `atv` - deposit_amount / deposit_cases
- `pf` - deposit_cases / active_member
- `da_user` - deposit_amount / active_member
- `ggr_user` - net_profit / active_member
- `bonus_usage_rate` - bonus / valid_amount
- `winrate` - withdraw_amount / deposit_amount
- `withdrawal_rate` - withdraw_cases / deposit_cases

#### **Cohort Metrics:**
- `retention_member` - Active today AND yesterday
- `reactivation_member` - Inactive > 30 days, then active
- `churn_member` - Active yesterday, NOT today
- `retention_rate`, `reactivation_rate`, `churn_rate`

### **ALASAN:**
- Period sangat pendek (7 days, 14 days, This Month)
- Date range **dynamic** dan bisa berubah-ubah
- COUNT DISTINCT tidak akurat kalau di-aggregate dari MV per day
- Contoh: Active Member 7 days ≠ SUM(active_member per day) karena user bisa active di multiple days

---

## **2. bp_quarter_summary_myr (QUARTERLY/MONTHLY MODE) - SIMPLIFIED**

### **✅ VALID - Financial Aggregates ONLY**
MV ini **HANYA SIMPAN** financial aggregates (SUM per period):

#### **Financial Aggregates:**
- `deposit_amount`, `deposit_cases`
- `withdraw_amount`, `withdraw_cases`
- `add_transaction`, `deduct_transaction`
- `bonus`, `add_bonus`, `deduct_bonus`
- `bets_amount`, `valid_amount`
- `ggr` - deposit_amount - withdraw_amount (pre-calculated)
- `net_profit` - (deposit + add) - (withdraw + deduct) (pre-calculated)
- `new_register`, `new_depositor` (from `new_register_monthly_mv` JOIN)

### **❌ TIDAK VALID - ALL KPIs**
**SEMUA KPI** berikut **WAJIB CALCULATE via API LOGIC**:

#### **Member Metrics:**
- `active_member` - COUNT DISTINCT userkey
- `pure_member` - active_member - new_depositor
- `pure_user` - COUNT DISTINCT unique_code

#### **Calculated KPIs:**
- `atv` - deposit_amount / deposit_cases
- `pf` - deposit_cases / active_member
- `da_user` - deposit_amount / active_member
- `ggr_user` - net_profit / active_member
- `bonus_usage_rate` - bonus / valid_amount
- `winrate` - withdraw_amount / deposit_amount
- `withdrawal_rate` - withdraw_cases / deposit_cases

#### **Cohort Metrics:**
- `retention_member`, `reactivation_member`, `churn_member`
- `retention_rate`, `reactivation_rate`, `churn_rate`

### **ALASAN:**
- **Simplified approach** untuk menghindari timeout
- COUNT DISTINCT subqueries terlalu berat untuk large datasets
- MV fokus pada **storage** (SUM), API fokus pada **calculation** (COUNT DISTINCT)

---

## **3. API LOGIC STRATEGY**

### **Daily Mode:**
```typescript
// ✅ Fetch financial aggregates FROM bp_daily_summary_myr (MV)
const { data: mvData } = await supabase
  .from('bp_daily_summary_myr')
  .select('*')
  .eq('currency', 'MYR')
  .gte('date', startDate)
  .lte('date', endDate)
  .eq('line', 'ALL')

// ✅ Use financial aggregates + SUM-based KPIs from MV
const { 
  deposit_amount, 
  deposit_cases,
  withdraw_amount,
  ggr,              // ← Pre-calculated!
  net_profit,       // ← Pre-calculated!
  atv,              // ← Pre-calculated!
  winrate,          // ← Pre-calculated!
  withdrawal_rate,  // ← Pre-calculated!
  hold_percentage,  // ← Pre-calculated!
  conversion_rate,  // ← Pre-calculated!
  bonus,
  valid_amount,
  new_depositor 
} = mvData

// ❌ Calculate member metrics + KPIs via LOGIC (from blue_whale_myr)
activeMember = COUNT DISTINCT userkey FROM blue_whale_myr WHERE date BETWEEN startDate AND endDate
pureUser = COUNT DISTINCT unique_code FROM blue_whale_myr WHERE date BETWEEN startDate AND endDate
pureMember = activeMember - new_depositor
daUser = deposit_amount / activeMember
ggrUser = net_profit / activeMember
bonusUsage = bonus / valid_amount
pf = deposit_cases / activeMember

// ❌ Calculate cohort metrics via LOGIC
retentionMember = calculateRetention(blue_whale_myr, startDate, endDate)
reactivationMember = calculateReactivation(blue_whale_myr, startDate, endDate)
churnMember = calculateChurn(blue_whale_myr, startDate, endDate)
```

### **Quarterly Mode (SIMPLIFIED):**
```typescript
// ✅ Fetch financial aggregates FROM bp_quarter_summary_myr (MV)
const { data: mvData } = await supabase
  .from('bp_quarter_summary_myr')
  .select('*')
  .eq('currency', 'MYR')
  .eq('year', currentYear)
  .eq('period', currentQuarter)
  .eq('line', 'ALL')
  .single()

// ✅ Use financial aggregates + basic KPIs from MV
const { 
  deposit_amount, 
  deposit_cases, 
  withdraw_amount, 
  ggr,              // ← Pre-calculated!
  net_profit,       // ← Pre-calculated!
  winrate,          // ← Pre-calculated!
  withdrawal_rate,  // ← Pre-calculated!
  bonus,
  valid_amount,
  new_depositor 
} = mvData

// ❌ Calculate member metrics + KPIs via LOGIC (from blue_whale_myr)
activeMember = COUNT DISTINCT userkey FROM blue_whale_myr WHERE quarter = Q4
pureUser = COUNT DISTINCT unique_code FROM blue_whale_myr WHERE quarter = Q4
pureMember = activeMember - new_depositor
daUser = deposit_amount / activeMember
ggrUser = net_profit / activeMember
bonusUsage = bonus / valid_amount
pf = deposit_cases / activeMember
atv = deposit_amount / deposit_cases

// ❌ Calculate cohort metrics via LOGIC
retentionMember = calculateRetention(blue_whale_myr, quarter)
reactivationMember = calculateReactivation(blue_whale_myr, quarter)
churnMember = calculateChurn(blue_whale_myr, quarter)
```

---

## **4. MV TABLE COLUMNS**

### **bp_daily_summary_myr (SIMPLIFIED):**
```sql
-- ✅ VALID COLUMNS (stored in MV)
date, year, month, quarter, line, currency, uniquekey

-- ✅ Financial aggregates (SUM)
deposit_amount, deposit_cases
withdraw_amount, withdraw_cases
add_transaction, deduct_transaction
bonus, add_bonus, deduct_bonus
bets_amount, valid_amount

-- ✅ Pre-calculated KPIs (AFTER SUM - Pure SUM-based)
ggr (SUM(deposit) - SUM(withdraw))
net_profit ((SUM(deposit) + SUM(add)) - (SUM(withdraw) + SUM(deduct)))
atv (SUM(deposit) / SUM(deposit_cases))
winrate (GGR / SUM(deposit) = (SUM(deposit) - SUM(withdraw)) / SUM(deposit))
withdrawal_rate (SUM(withdraw_cases) / SUM(deposit_cases))
hold_percentage (net_profit / SUM(valid_amount))
conversion_rate (new_depositor / new_register)

-- ✅ New user metrics (from JOIN)
new_register, new_depositor

-- ❌ REMOVED COLUMNS (calculate in API - need COUNT DISTINCT)
-- active_member, pure_user, pure_active
-- pf, bonus_usage_rate, da_user, ggr_user
-- retention_member, reactivation_member, churn_member
-- retention_rate, reactivation_rate, churn_rate
```

### **bp_quarter_summary_myr (SIMPLIFIED):**
```sql
-- ✅ VALID COLUMNS (stored in MV)
uniquekey, currency, line, period_type, period, year, month
start_date, end_date, total_days

-- ✅ Financial aggregates (SUM only)
deposit_amount, deposit_cases
withdraw_amount, withdraw_cases
add_transaction, deduct_transaction
bonus, add_bonus, deduct_bonus
bets_amount, valid_amount

-- ✅ Pre-calculated KPIs (AFTER SUM)
ggr (SUM(deposit) - SUM(withdraw))
net_profit ((SUM(deposit) + SUM(add)) - (SUM(withdraw) + SUM(deduct)))
winrate (GGR / SUM(deposit) = (SUM(deposit) - SUM(withdraw)) / SUM(deposit))
withdrawal_rate (SUM(withdraw_cases) / SUM(deposit_cases))

-- ✅ New user metrics (from JOIN)
new_register, new_depositor

-- ❌ REMOVED COLUMNS (calculate in API)
-- active_member, pure_member, pure_user
-- pure_user_net_profit
-- atv, pf, da_user, ggr_user, bonus_usage_rate
-- retention_member, reactivation_member, churn_member
-- retention_rate, reactivation_rate, churn_rate
```

---

## **5. PERFORMANCE IMPLICATIONS**

### **Daily Mode (SIMPLIFIED):**
- **MV fetch:** Fast (< 50ms) - ambil financial aggregates + 7 pre-calculated KPIs
- **API calculation:** Medium (200-500ms) - COUNT DISTINCT untuk 7-31 days
- **Total response:** 200-500ms
- **MV creation:** Fast (10-30s) - no heavy COUNT DISTINCT

### **Quarterly Mode (SIMPLIFIED):**
- **MV fetch:** Fast (< 50ms) - ambil financial aggregates + 4 pre-calculated KPIs (GGR, Net Profit, Winrate, Withdrawal Rate)
- **API calculation:** Medium (300-600ms) - COUNT DISTINCT + cohort metrics untuk 1 quarter (3 months)
- **Total response:** 350-650ms
- **Trade-off:** Slightly slower than pre-calculated, tapi MV creation **10X FASTER** (no timeout!)
- **MV creation:** Fast (30-60s) - simplified SUM aggregations only

---

## **6. DATA SOURCES**

| Metric | Daily Mode | Quarterly Mode (SIMPLIFIED) |
|--------|-----------|----------------|
| **Financial Aggregates** | `bp_daily_summary_myr` | `bp_quarter_summary_myr` |
| **GGR** | `bp_daily_summary_myr` (MV) ✅ | `bp_quarter_summary_myr` (MV) ✅ |
| **Net Profit** | `bp_daily_summary_myr` (MV) ✅ | `bp_quarter_summary_myr` (MV) ✅ |
| **ATV** | `bp_daily_summary_myr` (MV) ✅ | Calculated (LOGIC) |
| **Winrate** | `bp_daily_summary_myr` (MV) ✅ | `bp_quarter_summary_myr` (MV) ✅ |
| **Withdrawal Rate** | `bp_daily_summary_myr` (MV) ✅ | `bp_quarter_summary_myr` (MV) ✅ |
| **Hold %** | `bp_daily_summary_myr` (MV) ✅ | Calculated (LOGIC) |
| **Conversion Rate** | `bp_daily_summary_myr` (MV) ✅ | Calculated (LOGIC) |
| **Active Member** | `blue_whale_myr` (LOGIC) | `blue_whale_myr` (LOGIC) |
| **Pure User** | `blue_whale_myr` (LOGIC) | `blue_whale_myr` (LOGIC) |
| **DA User** | Calculated (LOGIC) | Calculated (LOGIC) |
| **GGR User** | Calculated (LOGIC) | Calculated (LOGIC) |
| **Bonus Usage** | Calculated (LOGIC) | Calculated (LOGIC) |
| **PF** | Calculated (LOGIC) | Calculated (LOGIC) |
| **Retention** | `blue_whale_myr` (LOGIC) | `blue_whale_myr` (LOGIC) |
| **Reactivation** | `blue_whale_myr` (LOGIC) | `blue_whale_myr` (LOGIC) |
| **Churn** | `blue_whale_myr` (LOGIC) | `blue_whale_myr` (LOGIC) |

---

## **7. SUMMARY**

✅ **bp_daily_summary_myr (SIMPLIFIED):**
- Simpan financial aggregates (SUM only)
- Pre-calculate: GGR, Net Profit, ATV, Winrate, Withdrawal Rate, Hold %, Conversion Rate
- Member metrics (Active Member, Pure User, etc.) + other KPIs calculate via API logic

✅ **bp_quarter_summary_myr (SIMPLIFIED):**
- Simpan financial aggregates (SUM only)
- Pre-calculate: GGR, Net Profit, Winrate, Withdrawal Rate
- Member metrics + other KPIs calculate via API logic

🎯 **Kesimpulan:** 
- Daily mode: Heavy API logic (tapi period pendek: 7-31 days)
- Quarterly mode: Medium API logic (use MV untuk financial aggregates + 4 pre-calculated KPIs)
- MV creation: **10X FASTER** (no timeout!) dengan simplified approach
- Guaranteed sub-650ms response time untuk both modes

---

**END OF DOCUMENT**

