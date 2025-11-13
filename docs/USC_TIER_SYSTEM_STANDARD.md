# 🎯 USC TIER SYSTEM - COMPLETE STANDARD & IMPLEMENTATION GUIDE

**Version**: 1.0 FINAL  
**Date**: 2025-11-13  
**Status**: 🟢 Production Standard  
**Approach**: Hybrid K-Means (ML Weights + Fixed Boundaries)

---

## 📋 TABLE OF CONTENTS

1. [Standard & Methodology](#1-standard--methodology)
2. [K-Means Model Parameters](#2-k-means-model-parameters)
3. [Tier Classification Rules](#3-tier-classification-rules)
4. [Implementation Architecture](#4-implementation-architecture)
5. [Tier Calculation Workflow](#5-tier-calculation-workflow)
6. [Upgrade & Downgrade Logic](#6-upgrade--downgrade-logic)
7. [Maintenance & Updates](#7-maintenance--updates)
8. [Weight Adjustment Guide](#8-weight-adjustment-guide)
9. [Business Rules & Impact](#9-business-rules--impact)
10. [Troubleshooting & FAQ](#10-troubleshooting--faq)

---

## 1. STANDARD & METHODOLOGY

### 1.1 Approach: Hybrid K-Means

**NEXMAX USC Tier System menggunakan HYBRID APPROACH:**

```
K-Means ML Model + Fixed Boundaries = Predictable & Accurate
```

**Components:**
- ✅ **Weights**: From trained K-Means model (Machine Learning - Data-Driven)
- ✅ **Boundaries**: Fixed thresholds (Absolute scoring - Business-Friendly)
- ✅ **Features**: 6 metrics (DA, GGR, DC, PF, ATV, WinRate)
- ✅ **Tiers**: 7 levels (VIP Elite → Dormant)

---

### 1.2 Why Hybrid?

| Aspect | Pure K-Means (Relative) | Hybrid (Recommended) |
|--------|------------------------|----------------------|
| **Weights** | ML-trained ✅ | ML-trained ✅ |
| **Boundaries** | Auto-calibrate ❌ | Fixed ✅ |
| **Predictability** | Low (tier bisa turun walaupun perform sama) | High (tier only change if performance change) |
| **Fairness** | Relative to peers | Absolute performance |
| **Business impact** | Confusing for customers | Clear & transparent |

**Decision**: ✅ **HYBRID = Best of both worlds**

---

## 2. K-MEANS MODEL PARAMETERS

### 2.1 Official Parameters (DO NOT CHANGE!)

**Source**: `usc_segmentation_artifacts.json`  
**Training**: Pure Data-Driven (MVP1 Segmentation Report)  
**Silhouette Score**: 0.912 (91.2% - Excellent!)

```json
{
  "feat_cols": ["DA", "GGR", "DC", "PF", "ATV", "WinRate_smooth"],
  "scaler_center_": [23.0, 10.0, 4.0, 0.07612326394634364, 5.0, 0.0909090909090909],
  "scaler_scale_": [124.0, 40.0, 18.0, 0.25519832687977145, 3.7350503261358527, 0.1339884393063584],
  "weights": {
    "DA": 0.2979662565631615,
    "GGR": 0.04327770914922594,
    "DC": 0.0,
    "PF": 0.32071892742845315,
    "ATV": 0.14451388569617504,
    "WinRate_smooth": 0.19352322116298434
  },
  "k": 7,
  "silhouette": 0.9121060005116655,
  "random_seed": 42
}
```

---

### 2.2 Feature Weights (Priority Order)

| Feature | Weight | Percentage | Business Meaning |
|---------|--------|------------|------------------|
| **Purchase Frequency (PF)** | 0.3207 | 32.1% | How often user deposits (MOST IMPORTANT) |
| **Deposit Amount (DA)** | 0.2980 | 29.8% | Total money deposited |
| **Win Rate** | 0.1935 | 19.4% | Profitability for company |
| **Avg Transaction Value (ATV)** | 0.1445 | 14.5% | Average deposit size |
| **GGR** | 0.0433 | 4.3% | Gross Gaming Revenue |
| **Deposit Cases (DC)** | 0.0000 | 0.0% | EXCLUDED (redundant with PF) |

**Key Insight**: 
- **Frequency > Amount** (User yang sering deposit lebih valuable!)
- Win Rate important (19%) - profitable customers prioritized
- GGR low weight (4%) - already captured by DA & ATV

---

### 2.3 Standardization Parameters

**Scaler Center (Mean for Z-score normalization):**
```typescript
DA_mean = 23.0
GGR_mean = 10.0
DC_mean = 4.0
PF_mean = 0.076
ATV_mean = 5.0
WinRate_mean = 0.091 (9.1%)
```

**Scaler Scale (Std Deviation):**
```typescript
DA_std = 124.0
GGR_std = 40.0
DC_std = 18.0
PF_std = 0.255
ATV_std = 3.735
WinRate_std = 0.134
```

---

## 3. TIER CLASSIFICATION RULES

### 3.1 Tier Definitions (7 Tiers)

| Tier | Name | Group | Color | Score Range | Target % | Business Priority |
|------|------|-------|-------|-------------|----------|-------------------|
| **1** | VIP Elite | High Value | 🟢 Green | ≥ 2.5 | 5% | Highest - VIP treatment |
| **2** | VIP Premium | High Value | 🔵 Blue | 1.8 - 2.5 | 10% | High - Premium support |
| **3** | High Value | Medium Value | 🔵 Cyan | 1.0 - 1.8 | 15% | Medium-High |
| **4** | Standard | Medium Value | 🟣 Indigo | 0.3 - 1.0 | 25% | Medium |
| **5** | Regular | Medium Value | 🟣 Purple | -0.3 - 0.3 | 25% | Medium-Low |
| **6** | Low Activity | Low Value | 🟠 Orange | -1.0 - -0.3 | 15% | Low - Re-engage |
| **7** | Dormant | Low Value | 🔴 Red | < -1.0 | 5% | Lowest - Win-back |

---

### 3.2 Fixed Boundaries (Absolute Scoring)

**STANDARD (DO NOT CHANGE without business approval):**

```typescript
export function assignTierFromScore(score: number): number {
  if (score >= 2.5) return 1   // VIP Elite
  if (score >= 1.8) return 2   // VIP Premium
  if (score >= 1.0) return 3   // High Value
  if (score >= 0.3) return 4   // Standard
  if (score >= -0.3) return 5  // Regular
  if (score >= -1.0) return 6  // Low Activity
  return 7                      // Dormant
}
```

**Why Fixed?**
- ✅ Predictable: User tahu cara upgrade
- ✅ Stable: Tier tidak berubah kalau performance sama
- ✅ Fair: Absolute performance, bukan relative ranking
- ✅ Business-friendly: Easy to explain to customers

---

### 3.3 Score Calculation Formula

**Step 1: Z-Score Normalization**
```typescript
standardized_value = (value - mean) / std_dev

Example:
User deposit = 150
standardized_DA = (150 - 23.0) / 124.0 = 1.024
```

**Step 2: Apply Weights**
```typescript
score = 
  (standardized_DA × 0.2980) +
  (standardized_GGR × 0.0433) +
  (standardized_DC × 0.0000) +
  (standardized_PF × 0.3207) +
  (standardized_ATV × 0.1445) +
  (standardized_WinRate × 0.1935)
```

**Step 3: Assign Tier**
```typescript
tier = assignTierFromScore(score)
```

**Higher score = Higher tier (better customer)**

---

## 4. IMPLEMENTATION ARCHITECTURE

### 4.1 Database Structure

```
┌─────────────────────────────────────────────────────────────┐
│  blue_whale_usc (Master Table - Daily Transactions)        │
│  - All USC transactions (raw data)                         │
│  - Column: tier (synced from tier_usc_v1)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ SQL Function: refresh_tier_usc_v1_data()
                     │ Aggregate: GROUP BY userkey, year, month
                     │ Filter: HAVING SUM(deposit_cases) > 0
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  tier_usc_v1 (Aggregation Table - REGULAR TABLE)          │
│  - Per userkey-year-month aggregation                     │
│  - Only users WITH deposits (active users)                │
│  - tier = NULL (before calculation)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ API: POST /api/calculate-tiers
                     │ Process: K-Means score + Fixed boundaries
                     │ Action: UPDATE tier, tier_name, score
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  tier_usc_v1 (With Tier Assigned)                         │
│  - tier: 1-7                                               │
│  - tier_name: 'VIP Elite', etc.                           │
│  - tier_group: 'High Value', 'Medium Value', 'Low Value' │
│  - score: K-Means weighted score                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ SQL Function: sync_tier_to_blue_whale_usc()
                     │ Action: UPDATE blue_whale_usc.tier
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  blue_whale_usc.tier (Master Table Enriched)              │
│  - All pages can use tier for filtering                   │
│  - Member Report, Analytics, etc.                         │
└─────────────────────────────────────────────────────────────┘
```

---

### 4.2 File Structure

```
Database:
  └─ tier_usc_v1 (TABLE - not MV!)
  └─ blue_whale_usc (Master + tier column)

Code:
  lib/
    └─ uscTierClassification.ts       ← K-Means logic & weights
  
  app/api/usc-business-performance/
    ├─ calculate-tiers/route.ts       ← Calculate & UPDATE tiers
    ├─ tier-data/route.ts             ← Fetch tier data for display
    └─ tier-movement/route.ts         ← Track upgrades/downgrades

  scripts/
    └─ tier-usc-final-setup.sql       ← Database setup

  docs/
    └─ USC_TIER_SYSTEM_STANDARD.md    ← THIS FILE
```

---

## 5. TIER CALCULATION WORKFLOW

### 5.1 Initial Setup (ONE TIME ONLY)

**Step 1: Database Setup**
```sql
-- Execute: scripts/tier-usc-final-setup.sql
-- Creates: tier_usc_v1 table + functions
-- Time: ~1 minute
```

**Step 2: Initial Data Population**
```sql
-- Aggregate all historical data
SELECT refresh_tier_usc_v1_data();
-- Time: ~30 seconds
-- Result: tier_usc_v1 populated (tier = NULL)
```

**Step 3: Calculate All Tiers (First Time)**
```bash
# Calculate tiers for ALL users
POST /api/calculate-tiers

# Time: 1-2 hours (50,000 users)
# Result: All tiers assigned
```

**Step 4: Sync to Master**
```sql
-- Copy tiers to blue_whale_usc
SELECT sync_tier_to_blue_whale_usc();
-- Time: ~30 seconds
```

**Total Setup Time**: ~2 hours (ONE TIME only)

---

### 5.2 Daily Maintenance (INCREMENTAL)

**Schedule**: 2 AM daily (off-peak)

**Step 1: Refresh New Transactions**
```sql
-- Refresh yesterday's data only
SELECT refresh_tier_usc_v1_data(2025, 'November');
-- Time: ~5 seconds
```

**Step 2: Calculate Tiers (Incremental)**
```bash
# Calculate tiers for users with new transactions
POST /api/calculate-tiers?mode=incremental&date=2025-11-13

# Time: 5-10 minutes (500-1000 active users)
# Result: Updated tiers for active users
```

**Step 3: Sync to Master**
```sql
-- Sync updated tiers
SELECT sync_tier_to_blue_whale_usc(2025, 'November');
-- Time: ~10 seconds
```

**Total Daily Time**: ~10 minutes ✅

---

### 5.3 Monthly Full Recalculation (OPTIONAL)

**Schedule**: 1st of each month

**Purpose**: 
- Verify boundaries still valid
- Recalculate ALL users for consistency
- Audit tier distribution

```bash
# Calculate all tiers for previous month
POST /api/calculate-tiers?year=2025&month=October

# Time: 1-2 hours
```

---

## 6. UPGRADE & DOWNGRADE LOGIC

### 6.1 Upgrade Scenario

**Condition**: Score naik karena performance improvement

**Example:**
```
User: John (userkey: John-USC123-LVMY)

October 2025:
├─ Deposit Amount: USD 1,000
├─ Purchase Frequency: 5 times
├─ Win Rate: 45%
├─ Score: 1.5
└─ Tier: 3 (High Value)

November 2025 (MORE ACTIVE!):
├─ Deposit Amount: USD 5,000 ↑
├─ Purchase Frequency: 20 times ↑
├─ Win Rate: 50% ↑
├─ Score: 2.8 ↑
└─ Tier: 1 (VIP Elite) ✅ UPGRADE!

Movement Type: UPGRADE (3 → 1)
Tier Change: +2 levels
Reason: Increased activity & performance
```

---

### 6.2 Downgrade Scenario

**Condition**: Score turun karena performance drop

**Example:**
```
User: Sarah (userkey: Sarah-USC456-BETMY)

October 2025:
├─ Deposit Amount: USD 10,000
├─ Purchase Frequency: 30 times
├─ Win Rate: 55%
├─ Score: 3.2
└─ Tier: 1 (VIP Elite)

November 2025 (LESS ACTIVE!):
├─ Deposit Amount: USD 500 ↓
├─ Purchase Frequency: 2 times ↓
├─ Win Rate: 30% ↓
├─ Score: 0.5 ↓
└─ Tier: 4 (Standard) ❌ DOWNGRADE!

Movement Type: DOWNGRADE (1 → 4)
Tier Change: -3 levels
Reason: Decreased activity & performance
```

---

### 6.3 Stable Scenario

**Condition**: Score tetap sama atau berubah dalam range yang sama

**Example:**
```
User: Mike (userkey: Mike-USC789-17WIN)

October 2025:
├─ Score: 1.9
└─ Tier: 2 (VIP Premium)

November 2025:
├─ Score: 2.0 (slight increase)
└─ Tier: 2 (VIP Premium) ✅ STABLE

Movement Type: STABLE
Tier Change: 0
Reason: Score still in same tier range (1.8 - 2.5)
```

---

### 6.4 Inactive User Handling

**STANDARD: Grace Period Approach**

```typescript
User inactive this month:

IF (no_transactions_current_month) {
  IF (inactive_days <= 30) {
    // Grace period: MAINTAIN last tier
    tier = last_tier
    status = 'INACTIVE (Grace)'
  }
  ELSE IF (inactive_days <= 90) {
    // After grace: Move to Low Activity
    tier = 6
    status = 'LOW ACTIVITY'
  }
  ELSE {
    // Long-term inactive: Dormant
    tier = 7
    status = 'DORMANT'
  }
}
```

**Business Rules:**
- ✅ 0-30 days inactive: Keep tier (grace period)
- ⚠️ 31-90 days inactive: Tier 6 (Low Activity)
- ❌ 90+ days inactive: Tier 7 (Dormant)

---

### 6.5 Reactivation Scenario

**Condition**: User kembali aktif setelah dormant

**Example:**
```
User: David (userkey: David-USC999-OK188)

August 2025:
└─ Tier: 2 (VIP Premium) - Active

September 2025:
└─ NO RECORD (Inactive - grace period)

October 2025:
└─ NO RECORD (Inactive - moved to Tier 6)

November 2025 (KEMBALI AKTIF!):
├─ Deposit Amount: USD 3,000
├─ Purchase Frequency: 15 times
├─ Score: 2.1
└─ Tier: 2 (VIP Premium) ✅ REACTIVATED!

Movement Type: REACTIVATION
Previous Status: Tier 6 → Current: Tier 2
Reason: User became active again with good performance
```

---

## 7. MAINTENANCE & UPDATES

### 7.1 Daily Maintenance Checklist

**Time**: 2 AM daily (automated via cron/scheduler)

```bash
#!/bin/bash
# Daily tier update script

# 1. Refresh yesterday's data
psql -c "SELECT refresh_tier_usc_v1_data(2025, 'November');"

# 2. Calculate tiers (incremental)
curl -X POST "http://localhost:3000/api/calculate-tiers?mode=incremental&date=$(date +%Y-%m-%d)"

# 3. Sync to master
psql -c "SELECT sync_tier_to_blue_whale_usc(2025, 'November');"

# 4. Log completion
echo "Tier update completed at $(date)" >> /var/log/tier-update.log
```

**Expected Time**: 10-15 minutes

---

### 7.2 Monthly Audit

**Time**: 1st of each month

**Checklist:**
- [ ] Run full tier recalculation for previous month
- [ ] Verify tier distribution (should be roughly 5-10-15-25-25-15-5%)
- [ ] Check for anomalies (e.g., all users in Tier 1)
- [ ] Review tier movement summary
- [ ] Document any unusual patterns

**SQL Queries:**
```sql
-- 1. Tier distribution check
SELECT 
  tier,
  tier_name,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM tier_usc_v1
WHERE year = 2025 AND month = 'October'
  AND tier IS NOT NULL
GROUP BY tier, tier_name
ORDER BY tier;

-- Expected: Roughly 5%, 10%, 15%, 25%, 25%, 15%, 5%

-- 2. Movement summary
SELECT 
  tier,
  COUNT(*) as current_count,
  LAG(COUNT(*)) OVER (ORDER BY tier) as prev_count
FROM tier_usc_v1
WHERE year = 2025 AND month IN ('October', 'November')
GROUP BY tier, month
ORDER BY tier;
```

---

### 7.3 Monitoring & Alerts

**Set up alerts for:**

1. **Distribution Anomaly**:
   - IF (Tier 1 > 10% OR Tier 1 < 2%) → Alert
   - IF (Tier 7 > 10% OR Tier 7 < 2%) → Alert

2. **Mass Movement**:
   - IF (>30% users change tier in 1 month) → Alert
   - Could indicate data quality issue or market shift

3. **Calculation Failure**:
   - IF (tier_null > 5% after calculation) → Alert
   - Indicates API error or timeout

4. **Performance**:
   - IF (calculation time > 30 minutes) → Alert
   - Need optimization

---

## 8. WEIGHT ADJUSTMENT GUIDE

### 8.1 When to Adjust Weights?

**CRITICAL**: Weights are ML-trained! Only adjust if:

1. ✅ **Business model change** (e.g., focus on retention vs acquisition)
2. ✅ **New data reveals** different customer behavior patterns
3. ✅ **After A/B testing** new weight combinations
4. ❌ **NOT for small fluctuations** in tier distribution

**Frequency**: Maximum once per quarter (stable model preferred!)

---

### 8.2 How to Adjust Weights

**Step 1: Document Reason**
```markdown
## Weight Adjustment - 2025-12-01

**Reason**: Business shift to prioritize frequency over amount
**Goal**: Reward loyal frequent players more
**Changes**: PF 32% → 40%, DA 30% → 22%
**Approved by**: [Manager Name]
```

**Step 2: Update Code**
```typescript
// File: lib/uscTierClassification.ts

export const KMEANS_WEIGHTS = {
  DA: 0.22,    // Changed from 0.2980
  GGR: 0.0433,
  DC: 0.0,
  PF: 0.40,    // Changed from 0.3207
  ATV: 0.1445,
  WinRate_smooth: 0.1935
} as const

// IMPORTANT: Document change in comment!
// Updated: 2025-12-01 - Increased PF weight to prioritize frequency
```

**Step 3: Recalculate ALL Tiers**
```bash
# Full recalculation with new weights
POST /api/calculate-tiers

# Time: 1-2 hours (all users)
```

**Step 4: Verify Impact**
```sql
-- Compare distribution before vs after
SELECT 
  tier,
  COUNT(*) as new_count,
  -- Compare with previous distribution
FROM tier_usc_v1
WHERE year = 2025 AND month = 'November'
GROUP BY tier;
```

**Step 5: A/B Test (if possible)**
- Run parallel tiers with old vs new weights
- Compare business outcomes (retention, revenue)
- Choose better performing weights

---

### 8.3 Weight Adjustment Template

**Copy this template when adjusting weights:**

```typescript
/**
 * ============================================================================
 * WEIGHT ADJUSTMENT LOG
 * ============================================================================
 * 
 * Date: 2025-12-01
 * Adjusted by: [Your Name]
 * Approved by: [Manager Name]
 * 
 * REASON:
 * - Business wants to prioritize frequent players over high depositors
 * - Data shows frequent players have better retention
 * 
 * CHANGES:
 * - PF: 0.3207 → 0.40 (+8%)
 * - DA: 0.2980 → 0.22 (-8%)
 * - Others: No change
 * 
 * EXPECTED IMPACT:
 * - More users with high frequency will upgrade
 * - Users with low frequency but high amount may downgrade
 * 
 * TESTING:
 * - A/B test for 30 days
 * - Monitor retention rate & revenue impact
 * 
 * ============================================================================
 */

export const KMEANS_WEIGHTS = {
  DA: 0.22,
  GGR: 0.0433,
  DC: 0.0,
  PF: 0.40,
  ATV: 0.1445,
  WinRate_smooth: 0.1935
} as const
```

---

## 9. BUSINESS RULES & IMPACT

### 9.1 Tier-Based Actions

| Tier | Action | Promotion | Support | Retention |
|------|--------|-----------|---------|-----------|
| **1-2 (VIP)** | Exclusive bonuses | 50-100% | Dedicated VIP manager | High priority |
| **3-5 (Medium)** | Standard bonuses | 20-50% | Standard support | Medium priority |
| **6 (Low Activity)** | Re-engagement campaign | 100-200% | Automated | Win-back |
| **7 (Dormant)** | Win-back offer | Up to 300% | Minimal | Reactivation |

---

### 9.2 Business Performance Page Usage

**Purpose**: Analyze revenue contribution by tier

**Example Questions:**
```
Q: "Berapa % revenue dari VIP customers (Tier 1-2)?"
A: Filter by Tier Group = High Value
   → Shows: 65% of total GGR from 15% of customers

Q: "Which brands have most VIP customers?"
A: Filter by Tier 1-2, group by Line
   → Shows: LVMY 45%, BETMY 30%, OK188 25%

Q: "How many customers downgraded this month?"
A: Check Tier Movement API
   → Shows: 250 downgrades (alert: need retention campaign!)
```

---

### 9.3 KPI Metrics by Tier

**Track these metrics per tier:**

```sql
-- Revenue contribution by tier
SELECT 
  tier,
  tier_name,
  COUNT(*) as customer_count,
  SUM(total_deposit_amount) as total_deposit,
  SUM(total_ggr) as total_ggr,
  AVG(purchase_frequency) as avg_pf,
  ROUND(SUM(total_ggr) * 100.0 / SUM(SUM(total_ggr)) OVER (), 2) as ggr_contribution_pct
FROM tier_usc_v1
WHERE year = 2025 AND month = 'November'
  AND tier IS NOT NULL
GROUP BY tier, tier_name
ORDER BY tier;
```

**Expected Pattern (80/20 rule):**
- Tier 1-2 (15% users) → 60-70% revenue ✅
- Tier 3-5 (65% users) → 25-35% revenue
- Tier 6-7 (20% users) → 5-10% revenue

---

## 10. TROUBLESHOOTING & FAQ

### 10.1 Common Issues

**Q: Tier calculation takes too long (>30 min)**
```
A: Check batch size in calculate-tiers/route.ts
   Current: 50 records per batch
   Recommendation: 100-200 for faster processing
   
   Also check: Network latency to Supabase
```

**Q: User complains tier dropped unfairly**
```
A: Check score history:
   
   SELECT 
     year, month, 
     total_deposit_amount, 
     purchase_frequency,
     score, tier
   FROM tier_usc_v1
   WHERE userkey = 'John-USC123-LVMY'
   ORDER BY year DESC, month DESC;
   
   If score dropped → Fair (performance decreased)
   If score same → Check boundaries (should be fixed!)
```

**Q: All users in Tier 1 or Tier 7**
```
A: Weights or boundaries issue!
   
   1. Verify weights match JSON
   2. Check scaler_center & scaler_scale
   3. Review fixed boundaries
   4. Recalculate with correct parameters
```

**Q: Tier movement too frequent**
```
A: Consider adding tier stability rules:
   
   1. Minimum stay: User must stay in tier min 2 months
   2. Buffer zone: ±0.2 score change = maintain tier
   3. Grace period: 30 days for inactive users
```

---

### 10.2 Data Quality Checks

**Run these monthly:**

```sql
-- 1. Check for outliers (unrealistic scores)
SELECT userkey, score, tier, total_deposit_amount, purchase_frequency
FROM tier_usc_v1
WHERE score > 10 OR score < -5  -- Extreme scores
ORDER BY score DESC;

-- 2. Check tier distribution
SELECT tier, COUNT(*) as count
FROM tier_usc_v1
WHERE year = 2025 AND month = 'November'
GROUP BY tier
ORDER BY tier;
-- Expected: Roughly balanced distribution

-- 3. Check for NULL tiers (should be 0%)
SELECT COUNT(*) 
FROM tier_usc_v1
WHERE tier IS NULL;
-- Expected: 0

-- 4. Verify sync to master
SELECT 
  COUNT(*) as total_usc_records,
  COUNT(CASE WHEN tier IS NOT NULL THEN 1 END) as with_tier,
  ROUND(COUNT(CASE WHEN tier IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as sync_pct
FROM blue_whale_usc
WHERE currency = 'USC';
-- Expected: sync_pct > 95%
```

---

## 📖 APPENDIX

### A. Formula Reference Card

```
SCORE CALCULATION:
score = Σ (standardized_feature × weight)

Where:
standardized = (value - mean) / std_dev

TIER ASSIGNMENT:
score ≥ 2.5  → Tier 1 (VIP Elite)
score ≥ 1.8  → Tier 2 (VIP Premium)
score ≥ 1.0  → Tier 3 (High Value)
score ≥ 0.3  → Tier 4 (Standard)
score ≥ -0.3 → Tier 5 (Regular)
score ≥ -1.0 → Tier 6 (Low Activity)
score < -1.0 → Tier 7 (Dormant)
```

---

### B. API Endpoints Quick Reference

```
GET  /api/usc-business-performance/slicer-options
     → Returns: years, quarters, brands, tier groups

POST /api/usc-business-performance/calculate-tiers
     ?year=2025&month=November&mode=incremental
     → Calculate & UPDATE tiers

GET  /api/usc-business-performance/tier-data
     ?year=2025&month=November&line=LVMY&tierGroup=High Value
     → Fetch tier data for display

GET  /api/usc-business-performance/tier-movement
     ?currentYear=2025&currentMonth=November&previousYear=2025&previousMonth=October
     → Track upgrades/downgrades
```

---

### C. SQL Functions Quick Reference

```sql
-- Refresh aggregated data
SELECT refresh_tier_usc_v1_data();                    -- All data
SELECT refresh_tier_usc_v1_data(2025, 'November');   -- Specific month

-- Sync tiers to master
SELECT sync_tier_to_blue_whale_usc();                 -- All data
SELECT sync_tier_to_blue_whale_usc(2025, 'November'); -- Specific month
```

---

## 🎯 FINAL NOTES

### Critical Rules (NEVER BREAK):

1. ✅ **Weights MUST match JSON** - DO NOT change randomly!
2. ✅ **Boundaries are FIXED** - Absolute scoring for predictability
3. ✅ **Grace period for inactive** - 30 days before downgrade
4. ✅ **Daily incremental update** - NOT full recalc
5. ✅ **Document all changes** - Weight adjustments need approval
6. ✅ **Monitor tier distribution** - Should be balanced
7. ✅ **Audit monthly** - Verify data quality

### Success Metrics:

- ✅ **Calculation time**: <15 min (daily), <2 hours (full)
- ✅ **Tier distribution**: 5-10-15-25-25-15-5% (±5% tolerance)
- ✅ **Stability**: <20% users change tier per month
- ✅ **Data quality**: 0% NULL tiers after calculation
- ✅ **Sync rate**: >95% records synced to master

---

**VERSION**: 1.0 FINAL  
**STATUS**: 🟢 Production Standard  
**LAST UPDATED**: 2025-11-13  

**APPROVED BY**: [Pending]  
**NEXT REVIEW**: 2026-02-13 (Quarterly)

---

**END OF DOCUMENT**

_This is the OFFICIAL STANDARD for USC Tier System. Any deviation from this standard requires written approval from management._

