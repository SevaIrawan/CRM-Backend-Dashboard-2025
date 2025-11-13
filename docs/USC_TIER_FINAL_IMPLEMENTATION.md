# 🎯 USC TIER SYSTEM - FINAL IMPLEMENTATION

## ✅ **ARCHITECTURE: TABLE + API APPROACH**

**Version**: FINAL  
**Date**: 2025-11-13  
**Status**: 🟢 Ready for Production

---

## 📊 **ARCHITECTURE OVERVIEW**

```
┌──────────────────────────────────────────────────────────────┐
│  blue_whale_usc (Master Table - Raw Transactions)           │
│  - All USC transactions                                      │
│  - Column: tier (synced from tier_usc_v1)                   │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ SQL Function: refresh_tier_usc_v1_data()
                     │ (Aggregate per userkey + year + month)
                     ↓
┌──────────────────────────────────────────────────────────────┐
│  tier_usc_v1 (REGULAR TABLE - NOT MV!)                      │
│  - Aggregated metrics per userkey-year-month                │
│  - tier = NULL (after refresh)                              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ API: POST /api/calculate-tiers
                     │ (K-Means calculation in TypeScript)
                     │ UPDATE tier_usc_v1 SET tier = X
                     ↓
┌──────────────────────────────────────────────────────────────┐
│  tier_usc_v1 (TABLE with Tier Calculated)                   │
│  - tier = 1-7 (calculated by API)                           │
│  - tier_name = 'VIP Elite', 'VIP Premium', etc.            │
│  - tier_group = 'High Value', 'Medium Value', 'Low Value'  │
│  - score = K-Means weighted score                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ SQL Function: sync_tier_to_blue_whale_usc()
                     │ UPDATE blue_whale_usc SET tier = tier_usc_v1.tier
                     ↓
┌──────────────────────────────────────────────────────────────┐
│  blue_whale_usc.tier (Enriched Master Table)                │
│  - All pages can use tier column directly!                  │
│  - Member Report, Retention, Analytics, etc.                │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 **WHY TABLE + API (NOT MV)?**

### **❌ Why NOT Materialized View?**
- MV is **READ-ONLY** → Cannot UPDATE tier after creation
- Complex K-Means in MV → **Timeout risk**
- Hard to maintain/adjust logic
- Cannot batch process

### **✅ Why REGULAR TABLE + API?**
- ✅ Table can be UPDATED by API
- ✅ K-Means calculation **flexible** & **maintainable** in TypeScript
- ✅ **Batch processing** → No timeout
- ✅ **Error handling** & **logging** in API
- ✅ Production-ready approach
- ✅ Easy to adjust weights and parameters

---

## 🔧 **SETUP GUIDE**

### **STEP 1: Run SQL Script in Supabase**

**File**: `scripts/tier-usc-final-setup.sql`

**This script will**:
1. ✅ DROP all old versions (MV, TABLE, VIEWS, FUNCTIONS)
2. ✅ CREATE TABLE `tier_usc_v1` (REGULAR TABLE)
3. ✅ CREATE function `refresh_tier_usc_v1_data()`
4. ✅ CREATE function `sync_tier_to_blue_whale_usc()`
5. ✅ ADD column `tier` to `blue_whale_usc`
6. ✅ CREATE indexes for performance
7. ✅ POPULATE initial data (tier=NULL)

**Execute in Supabase SQL Editor**:
```sql
-- Copy entire content from tier-usc-final-setup.sql
-- Paste and Run
```

**Verify**:
```sql
-- Check table created
SELECT COUNT(*) FROM tier_usc_v1;

-- Check tier column added to master
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'blue_whale_usc' AND column_name = 'tier';

-- Check data populated (tier should be NULL)
SELECT 
  year, month, 
  COUNT(*) as records,
  COUNT(CASE WHEN tier IS NULL THEN 1 END) as tier_null
FROM tier_usc_v1
GROUP BY year, month
ORDER BY year DESC, month DESC
LIMIT 5;
```

---

### **STEP 2: Calculate Tiers via API**

**Start Next.js server**:
```bash
npm run dev
```

**Call API** (Thunder Client / Postman / curl):
```bash
# Calculate ALL periods
POST http://localhost:3000/api/usc-business-performance/calculate-tiers

# Or specific period
POST http://localhost:3000/api/usc-business-performance/calculate-tiers?year=2025&month=November
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Tiers calculated and updated successfully",
  "data": {
    "totalProcessed": 34118,
    "totalUpdated": 34118,
    "periods": 11,
    "distributions": {
      "2025-November": {
        "boundaries": [...],
        "distribution": {
          "1": { "tier": 1, "tierName": "VIP Elite", "count": 460, "percentage": 14.27 },
          "2": { "tier": 2, "tierName": "VIP Premium", "count": 461, "percentage": 14.30 },
          ...
        }
      }
    }
  }
}
```

**Verify in database**:
```sql
-- Check tier assigned
SELECT 
  tier,
  tier_name,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM tier_usc_v1
WHERE tier IS NOT NULL
GROUP BY tier, tier_name
ORDER BY tier;
```

---

### **STEP 3: Sync Tier to Master Table**

**Execute in Supabase**:
```sql
SELECT sync_tier_to_blue_whale_usc();
-- Returns: number of rows updated (e.g., 500000)
```

**Verify**:
```sql
-- Check blue_whale_usc now has tier
SELECT 
  userkey,
  user_name,
  deposit_amount,
  tier
FROM blue_whale_usc
WHERE currency = 'USC'
  AND tier IS NOT NULL
LIMIT 20;
```

---

## 🔄 **DAILY MAINTENANCE WORKFLOW**

### **Option A: Refresh All Data**

```sql
-- 1. Refresh aggregated data
SELECT refresh_tier_usc_v1_data();
```

```bash
# 2. Calculate tiers via API
curl -X POST http://localhost:3000/api/usc-business-performance/calculate-tiers
```

```sql
-- 3. Sync to master table
SELECT sync_tier_to_blue_whale_usc();
```

---

### **Option B: Incremental (New Month Only)**

```sql
-- 1. Refresh December data only
SELECT refresh_tier_usc_v1_data(2025, 'December');
```

```bash
# 2. Calculate December tiers
curl -X POST "http://localhost:3000/api/usc-business-performance/calculate-tiers?year=2025&month=December"
```

```sql
-- 3. Sync December tiers
SELECT sync_tier_to_blue_whale_usc(2025, 'December');
```

---

## 📊 **K-MEANS ALGORITHM DETAILS**

### **7 Tier Classification**

| Tier | Name | Group | Color | Target % |
|------|------|-------|-------|----------|
| 1 | VIP Elite | High Value | 🟢 Green | 5% |
| 2 | VIP Premium | High Value | 🔵 Blue | 10% |
| 3 | High Value | Medium Value | 🔵 Cyan | 15% |
| 4 | Standard | Medium Value | 🟣 Indigo | 25% |
| 5 | Regular | Medium Value | 🟣 Purple | 25% |
| 6 | Low Activity | Low Value | 🟠 Orange | 15% |
| 7 | Dormant | Low Value | 🔴 Red | 5% |

### **Feature Weights (Pure Data-Driven)**
```
Purchase Frequency (PF):     32.1%  ← Most important!
Deposit Amount (DA):         29.8%
Win Rate:                    19.0%
Avg Transaction Value (ATV): 14.5%
GGR:                          4.0%
Deposit Cases (DC):           0.0%  ← Excluded (redundant with PF)
```

### **Score Calculation**
```typescript
// Step 1: Z-score normalization
standardized = (value - mean) / std_dev

// Step 2: Apply weights
score = 
  (standardized_DA × 0.298) +
  (standardized_PF × 0.321) +
  (standardized_ATV × 0.145) +
  (standardized_WinRate × 0.19) +
  (standardized_GGR × 0.04)

// Step 3: Assign tier based on calibrated boundaries
// Higher score = Better customer (Tier 1)
```

---

## 💡 **USAGE IN BUSINESS PERFORMANCE PAGE**

### **Slicer Options API**
```typescript
// GET /api/usc-business-performance/slicer-options
{
  years: ['2025', '2024'],
  quarters: { '2025': ['Q1', 'Q2', 'Q3', 'Q4'] },
  brands: ['ALL', 'LVMY', 'BETMY', ...],
  tierGroups: ['ALL', 'High Value', 'Medium Value', 'Low Value'],
  defaults: { year: '2025', quarter: 'Q4', line: 'ALL', tierGroup: 'ALL' }
}
```

### **Tier Data API**
```typescript
// GET /api/usc-business-performance/tier-data
//   ?year=2025&month=November&line=LVMY&tierGroup=High Value

{
  records: [...],
  totalRecords: 5000,
  tierDistribution: {
    1: { count: 460, percentage: 14.27, avgDA: 50000, avgGGR: 25000 },
    2: { count: 461, percentage: 14.30, avgDA: 30000, avgGGR: 15000 },
    ...
  },
  aggregationMode: 'MONTHLY'
}
```

### **Tier Movement API**
```typescript
// GET /api/usc-business-performance/tier-movement
//   ?currentYear=2025&currentMonth=November
//   &previousYear=2025&previousMonth=October

{
  summary: {
    totalUpgrades: 150,
    totalDowngrades: 120,
    totalStable: 2500,
    totalNew: 300,
    totalChurned: 100
  },
  topUpgrades: [...],
  topDowngrades: [...]
}
```

---

## 🔍 **MONITORING & TROUBLESHOOTING**

### **Check Data Freshness**
```sql
SELECT 
  year,
  month,
  COUNT(*) as records,
  MAX(updated_at) as last_update
FROM tier_usc_v1
GROUP BY year, month
ORDER BY year DESC, month DESC;
```

### **Check Tier Distribution**
```sql
SELECT 
  tier,
  tier_name,
  COUNT(*) as count,
  ROUND(AVG(score), 4) as avg_score,
  ROUND(AVG(total_deposit_amount), 2) as avg_da,
  ROUND(AVG(purchase_frequency), 2) as avg_pf
FROM tier_usc_v1
WHERE tier IS NOT NULL
GROUP BY tier, tier_name
ORDER BY tier;
```

### **Check Sync Status**
```sql
-- How many blue_whale_usc records have tier?
SELECT 
  COUNT(*) as total_usc_records,
  COUNT(CASE WHEN tier IS NOT NULL THEN 1 END) as with_tier,
  ROUND(COUNT(CASE WHEN tier IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as percentage
FROM blue_whale_usc
WHERE currency = 'USC';
```

---

## ⚡ **PERFORMANCE NOTES**

- **Refresh function**: ~5-10 seconds (all data)
- **API calculation**: ~2-3 minutes (all periods, ~35K records)
- **Sync function**: ~10-20 seconds (500K+ records)
- **Total workflow**: ~3-4 minutes

**Recommendation**: Run during off-peak hours (2 AM daily)

---

## 📁 **FILE STRUCTURE**

```
scripts/
  └── tier-usc-final-setup.sql          ← ONE SQL file (FINAL)

lib/
  └── uscTierClassification.ts          ← K-Means logic

app/api/usc-business-performance/
  ├── slicer-options/route.ts          ← Slicer API
  ├── calculate-tiers/route.ts         ← Calculate API
  ├── tier-data/route.ts               ← Tier data API
  └── tier-movement/route.ts           ← Movement API

docs/
  └── USC_TIER_FINAL_IMPLEMENTATION.md ← THIS FILE
```

---

## ✅ **CHECKLIST**

- [ ] SQL script executed successfully
- [ ] Table `tier_usc_v1` created (REGULAR TABLE)
- [ ] Column `tier` added to `blue_whale_usc`
- [ ] Functions created (`refresh_tier_usc_v1_data`, `sync_tier_to_blue_whale_usc`)
- [ ] Initial data populated (tier = NULL)
- [ ] Next.js dev server running
- [ ] API calculate tiers called successfully
- [ ] Tier distribution verified (7 tiers, proper distribution)
- [ ] Sync function executed
- [ ] `blue_whale_usc.tier` populated
- [ ] Daily workflow scheduled (optional)

---

## 🎯 **FINAL NOTES**

### **CRITICAL POINTS**:
1. ✅ `tier_usc_v1` is a **REGULAR TABLE** (NOT MV!)
2. ✅ Tier calculated in **API** (TypeScript K-Means)
3. ✅ Table can be **UPDATED** by API
4. ✅ No timeout issues (batch processing)
5. ✅ Production-ready architecture

### **DO NOT**:
- ❌ Create Materialized View for tier calculation
- ❌ Calculate K-Means in SQL (use API instead)
- ❌ Use old documentation files (all deleted)
- ❌ Mix MV and TABLE approaches

---

**STATUS**: 🟢 Ready for Production  
**Version**: FINAL  
**Last Updated**: 2025-11-13

---

**END OF DOCUMENTATION**
