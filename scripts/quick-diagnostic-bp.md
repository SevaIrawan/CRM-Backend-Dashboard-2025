# BUSINESS PERFORMANCE - QUICK DIAGNOSTIC

## USER REPORTED ISSUE: "data di KPI tidak tampil"

### SYMPTOMS FROM SCREENSHOT:
1. ✅ Page loads successfully
2. ❌ Pure Active = -727 (NEGATIVE!)
3. ❌ Most KPIs showing 0
4. ❌ Browser console shows "4 errors"

---

## DIAGNOSTIC STEPS:

### 1. CHECK MV TABLES
**Run this in Supabase SQL Editor:**

```sql
-- Check bp_daily_summary_myr
SELECT COUNT(*) as daily_rows FROM bp_daily_summary_myr;

-- Check bp_quarter_summary_myr  
SELECT COUNT(*) as quarter_rows FROM bp_quarter_summary_myr;

-- Check sample data
SELECT * FROM bp_daily_summary_myr WHERE line='ALL' LIMIT 5;
SELECT * FROM bp_quarter_summary_myr WHERE line='ALL' LIMIT 5;
```

**EXPECTED:**
- `bp_daily_summary_myr`: Should have ~1,982 rows (per terminal log)
- `bp_quarter_summary_myr`: Should have data for 2025

**IF ZERO ROWS:**
- Tables exist but not populated
- Run `create-bp-daily-summary-myr.sql` and `create-bp-quarter-summary-myr.sql`

---

### 2. CHECK API RESPONSE
**Open Browser Console (F12) and check:**

Network Tab → Look for:
- `/api/myr-business-performance/data?year=2025&quarter=Q4&isDateRange=false`

**Check response:**
```json
{
  "success": true,
  "mode": "quarterly",
  "kpis": {
    "grossGamingRevenue": 0,  // ← Should not be 0!
    "activeMember": 0,        // ← Should not be 0!
    "pureActive": -727,       // ← NEGATIVE = ERROR!
    ...
  }
}
```

---

### 3. CHECK BROWSER CONSOLE ERRORS
Look for:
- Red error messages
- Failed API calls
- TypeScript errors

---

## MOST LIKELY ROOT CAUSES:

### A. MV TABLES NOT POPULATED ⚠️
**Solution:** User needs to run SQL scripts to create and populate:
1. `scripts/create-bp-daily-summary-myr.sql`
2. `scripts/create-bp-quarter-summary-myr.sql`

### B. NEGATIVE PURE ACTIVE (-727) 🔴
**Cause:** `Pure Active = Active Member - New Depositor`
- If `Active Member = 0` and `New Depositor = 727`
- Result: `0 - 727 = -727`

**This means:**
- `new_register` table has data (727 new depositors)
- BUT `blue_whale_myr` returns 0 active members
- Possible reason: Query filters are too strict or wrong month

### C. API LOGIC ERROR
**Check:** `app/api/myr-business-performance/data/route.ts`
- Line ~470: `calculateActiveMember()` 
- Ensure query is correct for Q4 2025

---

## IMMEDIATE ACTION NEEDED:

**USER MUST:**
1. **Open Supabase SQL Editor**
2. **Run:** `SELECT COUNT(*) FROM bp_daily_summary_myr;`
3. **Run:** `SELECT COUNT(*) FROM bp_quarter_summary_myr;`
4. **Report back:** Do these tables have data?

**IF ZERO ROWS → User needs to create MV tables first!**

---

## NEXT STEPS AFTER DIAGNOSIS:

### If MV Tables Empty:
→ User runs `create-bp-daily-summary-myr.sql` + `create-bp-quarter-summary-myr.sql`

### If MV Tables Have Data:
→ Check API query logic (month_num vs month string issue)

### If Browser Errors:
→ Check console and fix frontend issues

---

**WAITING FOR USER TO CHECK SUPABASE TABLES STATUS! 🚨**

