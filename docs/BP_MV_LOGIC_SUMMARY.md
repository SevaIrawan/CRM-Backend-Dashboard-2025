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

## **2. bp_quarter_summary_myr (QUARTERLY/MONTHLY MODE) - OPTIMIZED**

### **✅ VALID - Financial Aggregates + Member Metrics + Trend KPIs**
MV ini **MENYIMPAN** financial aggregates + pre-calculated member metrics + trend KPIs:

#### **Financial Aggregates:**
- `deposit_amount`, `deposit_cases`
- `withdraw_amount`, `withdraw_cases`
- `add_transaction`, `deduct_transaction`
- `bonus`, `add_bonus`, `deduct_bonus`
- `bets_amount`, `valid_amount`
- `ggr` - deposit_amount - withdraw_amount (pre-calculated)
- `net_profit` - (deposit + add) - (withdraw + deduct) (pre-calculated)
- `new_register`, `new_depositor` (from `new_register_monthly_mv` JOIN)

#### **✅ Member Metrics (Pre-calculated di MV):**
- `active_member` - SUM(COUNT DISTINCT userkey per brand) ✅
- `pure_member` - active_member - new_depositor ✅

#### **✅ Trend KPIs (Pre-calculated di MV untuk Charts):**
- `atv` - deposit_amount / deposit_cases ✅
- `pf` - deposit_cases / active_member ✅
- `da_user` - deposit_amount / active_member ✅
- `ggr_user` - net_profit / active_member ✅
- `winrate` - (deposit - withdraw) / deposit × 100 ✅
- `withdrawal_rate` - withdraw_cases / deposit_cases × 100 ✅

### **❌ TETAP CALCULATE di API:**

#### **Pure User (Different Logic):**
- `pure_user` - COUNT DISTINCT unique_code (berbeda dari active_member!)

#### **Cohort Metrics (Perlu Comparison Logic):**
- `retention_member`, `reactivation_member`, `churn_member`
- `retention_rate`, `reactivation_rate`, `churn_rate`

### **ALASAN Pre-calculate di MV:**
- **Active Member** dapat di-SUM dari per-brand data (COUNT DISTINCT per brand, lalu SUM)
- **Trend KPIs** (ATV, PF, DA User, GGR User) hanya butuh active_member yang sudah ada
- **Performance:** Chart loading <100ms (vs 300-600ms kalau calculate real-time)
- **Trade-off:** MV creation 30-60s, tapi acceptable untuk quarterly refresh

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

### **Quarterly Mode (OPTIMIZED):**
```typescript
// ✅ Fetch financial aggregates + member metrics + trend KPIs FROM bp_quarter_summary_myr (MV)
const { data: mvData } = await supabase
  .from('bp_quarter_summary_myr')
  .select('*')
  .eq('currency', 'MYR')
  .eq('year', currentYear)
  .eq('period', currentQuarter)
  .eq('line', 'ALL')
  .single()

// ✅ Use ALL pre-calculated values from MV
const { 
  deposit_amount, 
  deposit_cases, 
  withdraw_amount, 
  ggr,              // ← Pre-calculated!
  net_profit,       // ← Pre-calculated!
  active_member,    // ← Pre-calculated! ✅
  pure_member,      // ← Pre-calculated! ✅
  atv,              // ← Pre-calculated! ✅
  pf,               // ← Pre-calculated! ✅
  da_user,          // ← Pre-calculated! ✅
  ggr_user,         // ← Pre-calculated! ✅
  winrate,          // ← Pre-calculated!
  withdrawal_rate,  // ← Pre-calculated!
  bonus,
  valid_amount,
  new_depositor 
} = mvData

// ❌ ONLY calculate Pure User + Cohort metrics via LOGIC (from blue_whale_myr)
pureUser = COUNT DISTINCT unique_code FROM blue_whale_myr WHERE quarter = Q4
bonusUsage = bonus / valid_amount

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

### **bp_quarter_summary_myr (OPTIMIZED):**
```sql
-- ✅ VALID COLUMNS (stored in MV)
uniquekey, currency, line, period_type, period, year, month
start_date, end_date, total_days

-- ✅ Financial aggregates (SUM)
deposit_amount, deposit_cases
withdraw_amount, withdraw_cases
add_transaction, deduct_transaction
bonus, add_bonus, deduct_bonus
bets_amount, valid_amount

-- ✅ Pre-calculated KPIs (AFTER SUM)
ggr (SUM(deposit) - SUM(withdraw))
net_profit ((SUM(deposit) + SUM(add)) - (SUM(withdraw) + SUM(deduct)))
winrate (GGR / SUM(deposit) × 100)
withdrawal_rate (SUM(withdraw_cases) / SUM(deposit_cases) × 100)

-- ✅ Member metrics (Pre-calculated)
active_member (SUM dari COUNT DISTINCT per brand)
pure_member (active_member - new_depositor)

-- ✅ Trend KPIs (Pre-calculated for Charts)
atv (SUM(deposit_amount) / SUM(deposit_cases))
pf (SUM(deposit_cases) / SUM(active_member))
da_user (SUM(deposit_amount) / SUM(active_member))
ggr_user (net_profit / SUM(active_member))

-- ✅ New user metrics (from JOIN)
new_register, new_depositor

-- ❌ NOT STORED (calculate in API - different logic or need comparison)
-- pure_user (COUNT DISTINCT unique_code - different from active_member)
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

### **Quarterly Mode (OPTIMIZED):**
- **MV fetch:** Fast (< 50ms) - ambil financial aggregates + member metrics + 10 pre-calculated KPIs
- **API calculation:** Fast (100-200ms) - ONLY pure_user + cohort metrics
- **Total response:** 150-250ms ✅ **MUCH FASTER!**
- **Pre-calculated in MV:** Active Member, Pure Member, GGR, Net Profit, ATV, PF, DA User, GGR User, Winrate, Withdrawal Rate
- **MV creation:** Medium (30-60s) - acceptable for quarterly refresh

---

## **6. DATA SOURCES**

| Metric | Daily Mode | Quarterly Mode (OPTIMIZED) |
|--------|-----------|----------------|
| **Financial Aggregates** | `bp_daily_summary_myr` | `bp_quarter_summary_myr` |
| **GGR** | `bp_daily_summary_myr` (MV) ✅ | `bp_quarter_summary_myr` (MV) ✅ |
| **Net Profit** | `bp_daily_summary_myr` (MV) ✅ | `bp_quarter_summary_myr` (MV) ✅ |
| **Active Member** | `blue_whale_myr` (LOGIC) | `bp_quarter_summary_myr` (MV) ✅ |
| **Pure Member** | Calculated (LOGIC) | `bp_quarter_summary_myr` (MV) ✅ |
| **ATV** | `bp_daily_summary_myr` (MV) ✅ | `bp_quarter_summary_myr` (MV) ✅ |
| **PF** | Calculated (LOGIC) | `bp_quarter_summary_myr` (MV) ✅ |
| **DA User** | Calculated (LOGIC) | `bp_quarter_summary_myr` (MV) ✅ |
| **GGR User** | Calculated (LOGIC) | `bp_quarter_summary_myr` (MV) ✅ |
| **Winrate** | `bp_daily_summary_myr` (MV) ✅ | `bp_quarter_summary_myr` (MV) ✅ |
| **Withdrawal Rate** | `bp_daily_summary_myr` (MV) ✅ | `bp_quarter_summary_myr` (MV) ✅ |
| **Hold %** | `bp_daily_summary_myr` (MV) ✅ | Calculated (LOGIC) |
| **Conversion Rate** | `bp_daily_summary_myr` (MV) ✅ | Calculated (LOGIC) |
| **Pure User** | `blue_whale_myr` (LOGIC) | `blue_whale_myr` (LOGIC) |
| **Bonus Usage** | Calculated (LOGIC) | Calculated (LOGIC) |
| **Retention** | `blue_whale_myr` (LOGIC) | `blue_whale_myr` (LOGIC) |
| **Reactivation** | `blue_whale_myr` (LOGIC) | `blue_whale_myr` (LOGIC) |
| **Churn** | `blue_whale_myr` (LOGIC) | `blue_whale_myr` (LOGIC) |

---

## **7. SUMMARY**

✅ **bp_daily_summary_myr:**
- Simpan financial aggregates (SUM only)
- Pre-calculate: GGR, Net Profit, ATV, Winrate, Withdrawal Rate, Hold %, Conversion Rate
- Member metrics (Active Member, Pure User, etc.) + other KPIs calculate via API logic (fast untuk 7-31 days)

✅ **bp_quarter_summary_myr (OPTIMIZED):**
- Simpan financial aggregates + member metrics + trend KPIs
- Pre-calculate: **Active Member, Pure Member**, GGR, Net Profit, **ATV, PF, DA User, GGR User**, Winrate, Withdrawal Rate
- ONLY calculate: Pure User (different logic) + Cohort metrics (need comparison)

🎯 **Kesimpulan:** 
- Daily mode: Response ~200-500ms (COUNT DISTINCT untuk 7-31 days)
- Quarterly mode: Response ~150-250ms ✅ **FASTER!** (most KPIs dari MV)
- MV creation: 30-60s (acceptable untuk quarterly refresh)
- **Chart Loading:** <100ms (fetch dari MV, no calculation needed!)

📊 **Performance Advantage:**
- DA User vs GGR User Chart: ✅ Fetch dari MV (both modes)
- ATV vs PF Chart: ✅ Fetch dari MV (both modes)
- Active Member vs Pure Member Chart: ✅ Fetch dari MV (quarterly mode)

---

**END OF DOCUMENT**

