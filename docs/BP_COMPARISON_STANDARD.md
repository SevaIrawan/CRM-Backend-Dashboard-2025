# BUSINESS PERFORMANCE COMPARISON STANDARD

**File:** `lib/businessPerformanceComparison.ts`

---

## **3 COMPARISON MODES**

### **1. DATE-TO-DATE (Partial/Incomplete Period)**
**When:** Period masih berjalan, data belum complete

**Examples:**
- Oct 1-20 (bulan berjalan) → Sept 1-20
- Q4 Oct 1-20 (quarter berjalan) → Sept 1-20
- 7 Days (Oct 14-20) → Sept 14-20
- 14 Days (Oct 7-20) → Sept 7-20

**Formula:** `prevDate = currentDate - 1 month`

---

### **2. MONTH-TO-MONTH (Complete Month)**
**When:** Bulan sudah complete (full month data available)

**Examples:**
- Sept 1-30 (complete) → Aug 1-31
- Feb 1-28 (complete) → Jan 1-31
- July 1-31 (complete) → June 1-30

**Formula:** Previous = full previous month (1st to last day)

---

### **3. QUARTER-TO-QUARTER (Complete Quarter)**
**When:** Quarter sudah complete (3 bulan penuh)

**Examples:**
- Q3 2025 (Jul-Sep complete) → Q2 2025 (Apr-Jun)
- Q2 2025 (Apr-Jun complete) → Q1 2025 (Jan-Mar)
- Q1 2025 (Jan-Mar complete) → Q4 2024 (Oct-Dec)

**Formula:** Previous = previous quarter (full 3 months)

---

## **MAIN FUNCTIONS**

### **1. `calculatePreviousPeriod()`**
Calculate previous period based on mode detection

```typescript
const result = calculatePreviousPeriod(
  'Daily',           // mode: 'Quarter' or 'Daily'
  'Q4',              // quarter
  2025,              // year
  '2025-10-01',      // startDate
  '2025-10-20',      // endDate
  '2025-10-20'       // maxDateInData
)

// Returns:
{
  prevStartDate: '2025-09-01',
  prevEndDate: '2025-09-20',
  comparisonMode: 'DATE_TO_DATE'
}
```

---

### **2. `calculateAverageDaily()`**
Calculate average daily value

```typescript
const avgDaily = calculateAverageDaily(
  652442,            // totalValue (GGR Oct 1-20)
  '2025-10-01',      // startDate
  '2025-10-20'       // endDate
)

// Returns: 32622.1 (652442 / 20 days)
```

---

### **3. `calculateMoMChange()`**
Calculate Month-over-Month percentage change

```typescript
const momChange = calculateMoMChange(
  652442,    // currentValue
  600000     // previousValue
)

// Returns: 8.74 (meaning +8.74%)
```

---

### **4. `formatComparisonLabel()`**
Format comparison label for display

```typescript
const label = formatComparisonLabel(
  'QUARTER_TO_QUARTER',
  'Q3',
  2025
)

// Returns: "vs Q2 2025"
```

---

## **DETECTION LOGIC EXAMPLES**

### **Example 1: Q4 Berjalan (Oct 1-20)**
```typescript
Input:
  mode: 'Quarter'
  quarter: 'Q4'
  year: 2025
  startDate: '2025-10-01'
  endDate: '2025-10-20'
  maxDateInData: '2025-10-20'

Detection:
  isQuarterComplete(Q4, 2025, Oct 20) = false
  → Quarter masih berjalan (hanya Oct, belum Nov-Dec)

Output:
  prevStartDate: '2025-09-01'
  prevEndDate: '2025-09-20'
  comparisonMode: 'DATE_TO_DATE'
```

---

### **Example 2: Q3 Complete (Jul-Sep)**
```typescript
Input:
  mode: 'Quarter'
  quarter: 'Q3'
  year: 2025
  startDate: '2025-07-01'
  endDate: '2025-09-30'
  maxDateInData: '2025-10-20'

Detection:
  isQuarterComplete(Q3, 2025, Oct 20) = true
  → Quarter sudah complete (Jul, Aug, Sep penuh)

Output:
  prevStartDate: '2025-04-01' (Q2 start)
  prevEndDate: '2025-06-30' (Q2 end)
  comparisonMode: 'QUARTER_TO_QUARTER'
```

---

### **Example 3: October Berjalan (Oct 1-20)**
```typescript
Input:
  mode: 'Daily'
  startDate: '2025-10-01'
  endDate: '2025-10-20'
  maxDateInData: '2025-10-20'

Detection:
  isCompleteMonth('2025-10-01', '2025-10-20', '2025-10-20') = false
  → Bulan masih berjalan (belum Oct 31)

Output:
  prevStartDate: '2025-09-01'
  prevEndDate: '2025-09-20'
  comparisonMode: 'DATE_TO_DATE'
```

---

### **Example 4: September Complete (Sept 1-30)**
```typescript
Input:
  mode: 'Daily'
  startDate: '2025-09-01'
  endDate: '2025-09-30'
  maxDateInData: '2025-10-20'

Detection:
  isCompleteMonth('2025-09-01', '2025-09-30', '2025-10-20') = true
  → Bulan sudah complete (Sept 1-30 full month)

Output:
  prevStartDate: '2025-08-01'
  prevEndDate: '2025-08-31'
  comparisonMode: 'MONTH_TO_MONTH'
```

---

### **Example 5: Custom 7 Days (Oct 14-20)**
```typescript
Input:
  mode: 'Daily'
  startDate: '2025-10-14'
  endDate: '2025-10-20'
  maxDateInData: '2025-10-20'

Detection:
  isCompleteMonth('2025-10-14', '2025-10-20', '2025-10-20') = false
  → Custom range (not full month)

Output:
  prevStartDate: '2025-09-14'
  prevEndDate: '2025-09-20'
  comparisonMode: 'DATE_TO_DATE'
```

---

## **INTEGRATION TO API**

### **Step 1: Import Helper**
```typescript
import {
  calculatePreviousPeriod,
  calculateAverageDaily,
  calculateMoMChange,
  formatComparisonLabel
} from '@/lib/businessPerformanceComparison'
```

### **Step 2: Detect & Calculate Previous Period**
```typescript
// In API route
const { prevStartDate, prevEndDate, comparisonMode } = calculatePreviousPeriod(
  isDateRange ? 'Daily' : 'Quarter',
  quarter,
  parseInt(year),
  startDate || currentStartDate,
  endDate || currentEndDate,
  maxDateInData // from slicer-options API
)

console.log(`🔄 [BP API] Comparison Mode: ${comparisonMode}`)
```

### **Step 3: Query Previous Period Data**
```typescript
// Query previous period data from blue_whale_myr
const { data: prevPeriodData } = await supabase
  .from('blue_whale_myr')
  .select('*')
  .eq('currency', 'MYR')
  .gte('date', prevStartDate)
  .lte('date', prevEndDate)
```

### **Step 4: Calculate Comparison Metrics**
```typescript
// Calculate current period metrics
const currentGGR = 652442
const currentActiveMember = 3095

// Calculate previous period metrics
const prevGGR = 600000
const prevActiveMember = 2800

// Calculate MoM change
const ggrMoMChange = calculateMoMChange(currentGGR, prevGGR)
// Returns: 8.74%

// Calculate average daily
const ggrAvgDaily = calculateAverageDaily(currentGGR, startDate, endDate)
// Returns: 32622.1

// Format comparison label
const comparisonLabel = formatComparisonLabel(comparisonMode, quarter, year)
// Returns: "vs Same Period Last Month" or "vs Q2 2025"
```

---

## **NEXT STEPS**

1. ✅ **Helper Functions Created** (`lib/businessPerformanceComparison.ts`)
2. ⏳ **Integrate to API Route** (`app/api/myr-business-performance/data/route.ts`)
   - Add previous period queries
   - Calculate comparison metrics for all KPIs
   - Calculate per-brand retention/churn/activation with previous period
3. ⏳ **Update Frontend** (`app/myr/business-performance/page.tsx`)
   - Display comparison labels
   - Show MoM change indicators
   - Update chart data with correct comparison
4. ⏳ **Test All Scenarios**
   - Q4 berjalan (Oct 1-20)
   - Q3 complete (Jul-Sep)
   - This Month (Oct 1-20)
   - 7 Days, 14 Days
   - September complete

---

## **KEY PRINCIPLES**

✅ **Apple-to-Apple:** Same comparison type for same data state
✅ **Auto-Detection:** System automatically detects correct comparison mode
✅ **Date-to-Date:** For partial/incomplete periods
✅ **Month-to-Month:** For complete months (avoid ambiguity)
✅ **Quarter-to-Quarter:** For complete quarters (full 3 months)
✅ **No Hardcoding:** All logic dynamic based on actual data availability

