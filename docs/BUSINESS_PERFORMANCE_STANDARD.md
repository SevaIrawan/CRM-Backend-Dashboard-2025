# BUSINESS PERFORMANCE PAGE - STANDARD KHUSUS

## 📋 OVERVIEW

Business Performance Page adalah page khusus yang berbeda dengan page-page lain di NEXMAX Dashboard karena:
- **6 KPI Cards** berbeda (4 Standard + 2 Dual KPI Grid)
- **10 Charts** berbeda (Line, Mixed Bar+Line, Bar, Stacked Bar, Sankey)
- **Slicer Khusus** (Quarter + Date Range)
- **Dummy Data** untuk design preview sebelum real data implementation

## 🎯 PAGE STRUCTURE

### ROW 1: KPI CARDS (6 Cards)
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Target Achieve  │ Gross Gaming    │ Active Member   │ Pure Active     │ Transaction     │ User Value      │
│ Rate            │ Revenue         │                 │                 │ Metrics         │ Metrics         │
│ (Progress Bar)  │ (Standard)      │ (Standard)      │ (Standard)      │ (Dual KPI Grid) │ (Dual KPI Grid) │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**Components:**
1. `ProgressBarStatCard` - Target Achieve Rate dengan progress bar
2. `StatCard` (x3) - GGR, Active Member, Pure Active
3. `DualKPICard` (x2) - Transaction Metrics (ATV & PF), User Value Metrics (GGR User & DA User)
   - **Icons REGISTERED in CentralIcon:**
     - Transaction Metrics: Bar chart (3 columns) icon
     - User Value Metrics: Hand holding dollar icon

### ROW 2: LINE CHARTS (2 Charts)
```
┌────────────────────────────────────┬────────────────────────────────────┐
│ FORECAST Q4 - GROSS GAMING REVENUE │ GROSS GAMING REVENUE TREND         │
│ (Triple Line: Blue, Green, Orange) │ (Single Line: Blue)                │
└────────────────────────────────────┴────────────────────────────────────┘
```

**Components:**
- `LineChart` dengan 3 series:
  - **Actual GGR** (Blue #3B82F6) - Real performance
  - **Target GGR** (Green #10b981) - Goal to achieve (usually highest)
  - **Forecast GGR** (Orange #F97316) - Realistic prediction
- `LineChart` dengan 1 series (GGR Trend)

**Business Logic:**
- Target line = Aspirational goal (paling tinggi)
- Forecast line = Prediksi realistis (antara actual dan target)
- Actual line = Real performance (gradually approaching target)
- Kalau Actual > Target = OVERACHIEVING ✅

### ROW 3: MIXED CHARTS (2 Charts)
```
┌────────────────────────────────────┬────────────────────────────────────┐
│ DEPOSIT AMOUNT VS CASES            │ WITHDRAW AMOUNT VS CASES           │
│ (Bar + Line: Blue bar + Orange line)│ (Bar + Line: Blue bar + Orange line)│
└────────────────────────────────────┴────────────────────────────────────┘
```

**Components:**
- `MixedChart` (Recharts ComposedChart) dengan Bar + Line

### ROW 4: DUAL LINE + BAR (2 Charts)
```
┌────────────────────────────────────┬────────────────────────────────────┐
│ WINRATE VS WITHDRAW RATE           │ BONUS USAGE RATE (%)               │
│ (Dual Line: Blue & Orange, Period) │ (Single Bar: Orange, PER BRAND)    │
└────────────────────────────────────┴────────────────────────────────────┘
```

**Components:**
- `LineChart` dengan 2 series (Winrate vs Withdraw Rate) - Data per Period
- `BarChart` dengan 1 series (Bonus Usage Rate) - **Data PER BRAND/LINE**

**IMPORTANT:**
- Bonus Usage Rate: X-axis = Brand names (SBMY, LVMY, JMMY, STMY), NOT monthly periods

### ROW 5: BAR CHARTS (2 Charts)
```
┌────────────────────────────────────┬────────────────────────────────────┐
│ RETENTION RATE (%)                 │ ACTIVATION RATE (%)                │
│ (Single Bar: Blue, PER BRAND)      │ (Single Bar: Orange, PER BRAND)    │
└────────────────────────────────────┴────────────────────────────────────┘
```

**Components:**
- `BarChart` dengan 1 series (Retention Rate - Blue) - **Data PER BRAND/LINE**
- `BarChart` dengan 1 series (Activation Rate - Orange) - **Data PER BRAND/LINE**

**IMPORTANT:**
- X-axis = Brand names (SBMY, LVMY, JMMY, STMY), NOT monthly periods
- Data source: Brand-specific rates from Supabase (dummy: 4 brands)

**Data Labels:**
- Format: **2 decimal** dengan % symbol (e.g., `71.50%`)
- Applies to: Retention Rate, Activation Rate, Bonus Usage Rate, Winrate, Withdraw Rate

### ROW 6: STACKED BAR + SANKEY (2 Charts)
```
┌────────────────────────────────────┬────────────────────────────────────┐
│ BRAND GGR CONTRIBUTION (STACKED)   │ CROSS-BRAND CUSTOMER FLOW          │
│ (Stacked Bar: Multi-color)         │ (Sankey Diagram: Multi-color)      │
└────────────────────────────────────┴────────────────────────────────────┘
```

**Components:**
- `StackedBarChart` dengan 4 series (SBMY, LVMY, STMY, JMMY)
- `SankeyChart` (Recharts Sankey) untuk customer flow
  - Flow: New Register → Brands → Retained/Churned
  - Brands: SBMY, LVMY, STMY, JMMY

### ENDING: SLICER INFO
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Showing data for: 2025 | Q4 | 2025-10-01 to 2025-12-31 | Dummy Data      │
└──────────────────────────────────────────────────────────────────────────┘
```

## 🎨 DESIGN STANDARD

### Font Sizes (COMPACT & PROFESSIONAL)
```typescript
// KHUSUS Business Performance Page - Lebih compact dari page lain
StatCard Value: 22px           // Standard pages: 28px
DualKPICard Value: 18px        // Smaller untuk dual grid
ProgressBar Value: 22px        // Same as StatCard
Additional KPI: 10px           // Smaller untuk daily avg
Comparison: 11px               // Smaller untuk MoM
Progress Bar Height: 6px       // Thinner untuk compact look
Current/Target Label: 10px     // Smaller untuk progress info
```

### Chart Colors
```typescript
// STANDARD: Blue & Orange (kecuali Stacked & Sankey)
Primary: #3B82F6    // Blue - untuk single chart atau dataset pertama
Secondary: #F97316  // Orange - untuk dataset kedua

// EXCEPTION: Stacked Bar & Sankey (Multi-color allowed)
Stacked: ['#3B82F6', '#F97316', '#10b981', '#8b5cf6', '#f59e0b']
Sankey: ['#3B82F6', '#10b981', '#F97316', '#8b5cf6', '#06b6d4']
```

### Label Colors
```typescript
// ALL LABELS: BLACK ONLY
Label Color: #374151  // Dark gray - untuk SEMUA data labels
```

## 📊 COMPONENT STANDARD

### 1. DualKPICard (Transaction Metrics & User Value Metrics)

**Structure:**
```
┌─────────────────────────────────────────────┐
│ TRANSACTION METRICS              [ICON]     │
├─────────────────────┬───────────────────────┤
│ ATV          +3.2%  │ PF           +0.5x    │
│ RM 285              │ 3.8x                  │
└─────────────────────┴───────────────────────┘
```

**Key Features:**
- Icon HANYA di Title Card (bukan di individual KPI)
- Label KPI KIRI, Comparison MoM KANAN (rata kanan)
- Padding reduced: `paddingRight: 6px`, `paddingLeft: 6px`
- Value di bawah label, BOLD, size 20px

**IMPORTANT - Icon Pattern:**
- ✅ CORRECT: `icon="Transaction Metrics"` (pass NAMA icon as string)
- ❌ WRONG: `icon={getKpiIcon('Transaction Metrics')}` (jangan call getKpiIcon di page)
- Component akan call `getKpiIcon(icon)` internally untuk convert nama ke SVG
- Sama seperti StatCard pattern yang sudah ada di project

**Props:**
```typescript
{
  title: "Transaction Metrics",
  icon: "Transaction Metrics",  // Pass NAMA icon (bukan hasil getKpiIcon) - Component akan call getKpiIcon internally
  kpi1: {
    label: 'ATV',                // TIDAK ada icon
    value: 'RM 285',
    comparison: { percentage: '+3.2%', isPositive: true }
  },
  kpi2: {
    label: 'PF',                 // TIDAK ada icon
    value: '3.8x',
    comparison: { percentage: '+0.5x', isPositive: true }
  }
}
```

### 2. MixedChart (Dual-Axis: Bar + Line)

**Key Features:**
- Bar (Amount) = Blue (#3B82F6)
- Line (Cases) = Orange (#F97316)
- Label Bar: position `top`
- Label Line: position `bottom`, offset `10`
- ALL labels: BLACK (#374151)

### 3. ProgressBarStatCard (Target Achieve Rate)

**Key Features:**
- Progress bar visual untuk target vs achievement
- Display "Current" dan "Target" values di bawah progress bar
- **NO comparison last month** (karena sudah ada current vs target)
- Icon di title card
- Compact design: Value 22px, Progress bar 6px height, Labels 10px

**Styling (Compact):**
```typescript
Value: fontSize 22px (vs 28px standard)
Progress Bar: height 6px (vs 8px standard)
Current/Target: fontSize 10px (vs 11px standard)
Margins: Reduced untuk compact layout
```

## 🔧 SLICERS

### Toggle: Mode Selector (NEW)
**Visual:**
- ✅ **OFF (RED)** - Month Mode (default)
  - Data based on Quarter slicer
  - Quick Date Filter DISABLED (grey, opacity 0.4)
  - Quarter slicer ACTIVE
- ✅ **ON (GREEN)** - Daily Mode
  - Data based on Quick Date Filter
  - Quarter slicer DISABLED (grey, opacity 0.4)
  - Quick Date Filter ACTIVE

**Design:**
```typescript
// Toggle OFF (Default)
Background: #ef4444 (Red)
Knob: Left position
Label: "Month Mode"

// Toggle ON
Background: #10b981 (Green)
Knob: Right position (translateX(26px))
Label: "Daily Mode"

Size: 52px x 26px
Knob: 20px diameter
Transition: 0.3s ease
```

### Standard Slicers
1. **YearSlicer** - Select year (always active)
2. **QuarterSlicer** - Q1, Q2, Q3, Q4 (disabled when toggle ON)
3. **QuickDateFilter** - 4 button presets (disabled when toggle OFF)

### 📅 QUICK DATE FILTER (NEW - STANDARD KHUSUS BP PAGE)

**Purpose:**
- Simple & fast date selection untuk Daily Mode
- Professional UX - 1 click sahaja (no manual date picking)
- Standardized periods untuk business analysis

**4 Button Presets:**
```
┌──────────┬───────────┬──────────────┬──────────────┐
│  7 Days  │  14 Days  │  This Month  │  Last Month  │
└──────────┴───────────┴──────────────┴──────────────┘
```

**Button Logic:**

| Button | Calculation | Example (Today = Oct 20, 2025) |
|--------|-------------|--------------------------------|
| **7 Days** | Today - 6 days → Today | Oct 14 - Oct 20 (7 days / 1 week) |
| **14 Days** | Today - 13 days → Today | Oct 7 - Oct 20 (14 days / 2 weeks) |
| **This Month** | Month start → Today | Oct 1 - Oct 20 (MTD) |
| **Last Month** | Previous month (full) | Sep 1 - Sep 30 (30 days) |

**Visual States:**
```typescript
// ACTIVE Button
Background: #3B82F6 (Blue)
Color: #FFFFFF (White)
Border: 1px solid #3B82F6
Font Weight: 600

// INACTIVE Button
Background: #FFFFFF (White)
Color: #374151 (Dark grey)
Border: 1px solid #D1D5DB
Font Weight: 500

// DISABLED Button (when toggle OFF)
Background: #F3F4F6 (Light grey)
Color: #9CA3AF (Grey)
Border: 1px solid #E5E7EB
Cursor: not-allowed
Opacity: 0.4
```

**Hover Effects:**
```typescript
// Hover on INACTIVE button
Background: #F9FAFB (Light blue-grey)
Border: 1px solid #9CA3AF
Transition: all 0.2s ease
```

**Advantages:**
- ✅ **Super Fast** - 1 click, instant result
- ✅ **Professional** - Clean, modern UI (like Google Analytics)
- ✅ **Standardized** - Consistent periods untuk comparison
- ✅ **No Confusion** - 4 clear options, no overwhelm
- ✅ **Mobile-Friendly** - Easy tap targets
- ✅ **Business-Oriented** - Meaningful periods untuk decision making

**Implementation:**
```typescript
import QuickDateFilter from '@/components/QuickDateFilter'
import { 
  QuickDateFilterType, 
  calculateQuickDateRange 
} from '@/lib/businessPerformanceHelper'

// State
const [activeFilter, setActiveFilter] = useState<QuickDateFilterType>('7_DAYS')

// Handler
const handleFilterChange = (filterType: QuickDateFilterType) => {
  setActiveFilter(filterType)
  const { startDate, endDate } = calculateQuickDateRange(filterType)
  // Fetch data with startDate & endDate
}

// Render
<QuickDateFilter
  activeFilter={activeFilter}
  onFilterChange={handleFilterChange}
  disabled={!isDateRangeMode}  // Disabled when toggle OFF
/>
```

**Helper Functions:**
- `calculateQuickDateRange(filterType)` - Auto-calculate date range
- `formatDateForAPI(date)` - Format untuk API call (YYYY-MM-DD)
- `formatDateForDisplay(dateStr)` - Format untuk display (MMM DD, YYYY)
- `boundDateRangeToQuarter(start, end, min, max)` - Ensure date range dalam quarter boundary

### 🔒 VALIDATION SYSTEM

**LOCK: Quarter Boundary** ✅
- Quick Date Filter calculations **bounded** by selected quarter data
- Example: Q4 selected (Oct 1 - Oct 20 available) → "This Month" = Oct 1 - Oct 20, NOT Oct 1 - Oct 31
- Purpose: Ensure data consistency with available data in quarter

**Built-in Period Limits:**
- ✅ **7 Days** - Always 7 days (1 week)
- ✅ **14 Days** - Always 14 days (2 weeks)
- ✅ **This Month** - Month-to-date (bounded by today)
- ✅ **Last Month** - Full previous month (always ≤ 31 days)

**No Manual Date Selection = No Invalid Range** 🎯
- Users cannot select invalid date ranges
- All periods predefined & validated
- Auto-bounded to quarter data availability

### Slicer Logic
```typescript
// Mode Toggle Logic
isDateRangeMode = false (default)
  → Use Quarter for data filtering
  → Quarter slicer: enabled
  → Quick Date Filter: disabled (opacity 0.4, pointerEvents none)

isDateRangeMode = true (Daily Mode)
  → Use Quick Date Filter for data filtering
  → Quarter slicer: disabled (opacity 0.4, pointerEvents none)
  → Quick Date Filter: enabled
  → Auto-calculate date range based on button selected
  → 🔒 Date range auto-bounded to quarter data

// Quarter mengonversi ke date range
Q1 = January - March
Q2 = April - June
Q3 = July - September
Q4 = October - December

// Quick Date Filter Calculation
const { startDate, endDate } = calculateQuickDateRange(filterType)

// Example (Today = Oct 20, 2025, Q4 selected):
'7_DAYS'      → Oct 14 - Oct 20  (7 days / 1 week)
'14_DAYS'     → Oct 7 - Oct 20   (14 days / 2 weeks)
'THIS_MONTH'  → Oct 1 - Oct 20   (MTD)
'LAST_MONTH'  → Sep 1 - Sep 30   (Full month, bounded to Q3 if Q3 selected)
```

## 📦 DATA SOURCE

### ⚠️ 2-PHASE APPROACH

**PHASE 1: WIREFRAME (CURRENT) - DUMMY DATA**
- ✅ Purpose: Presentation ke atasan untuk approval
- ✅ Data: Dummy data untuk design preview
- ✅ File: `lib/businessPerformanceHelper.ts`
- ✅ Functions: `getDummyKPIData()`, `getDummyChartData()`
- ✅ Status: **PRODUCTION READY (Dummy Data)**

**PHASE 2: REAL DATA (FUTURE) - AFTER APPROVAL**
- 🚧 Purpose: Migrasi ke real data dari Supabase
- 🚧 Prerequisite: Wireframe disetujui atasan
- 🚧 Target Input Table: Belum dibuat
- 🚧 Functions: `fetchRealKPIData()`, `fetchRealChartData()`
- 🚧 Source: Supabase + Blue Whale tables
- 🚧 Status: **PENDING (Waiting for Approval)**

### Brand Lists (MYR)
```typescript
BRANDS.MYR = ['SBMY', 'LVMY', 'STMY', 'JMMY']

// Brand Colors (for charts)
SBMY: #3B82F6 (Blue)
LVMY: #F97316 (Orange)
STMY: #10b981 (Green)
JMMY: #8b5cf6 (Purple)
```

**Current Implementation:**
- ✅ Stacked Bar Chart: 4 brands (SBMY, LVMY, STMY, JMMY)
- ✅ Sankey Diagram: 4 brands flow (New Register → Brands → Retained/Churned)
- ✅ Dummy data: Aggregated untuk ALL brands

**Note:** Brand-specific filtering & detailed data akan diimplementasi di PHASE 2 (real data)

## 🔄 DATA FLOW

```
User Select Slicer
    ↓
Check isRealDataAvailable()
    ↓
    ├─ TRUE → fetchRealKPIData() + fetchRealChartData()
    │         from Supabase (Target Table + Blue Whale)
    │
    └─ FALSE → getDummyKPIData() + getDummyChartData()
              from businessPerformanceHelper.ts
    ↓
Render KPI Cards + Charts
    ↓
Display Slicer Info (with data source label)
```

## 📝 FILE ORGANIZATION

```
lib/
  └── businessPerformanceHelper.ts     // ⭐ STANDARD KHUSUS - All data & logic
                                       // NEW: Quick Date Filter logic & helpers

components/
  ├── DualKPICard.tsx                  // Dual KPI Grid component
  ├── ProgressBarStatCard.tsx          // Target Achieve Rate component
  ├── MixedChart.tsx                   // Dual-axis (Bar + Line) chart
  ├── SankeyChart.tsx                  // Sankey diagram
  ├── QuickDateFilter.tsx              // ⭐ NEW: Quick Date Filter (4 buttons)
  └── slicers/
      └── QuarterSlicer.tsx            // Q1-Q4 selector

app/
  ├── myr/business-performance/
  ├── sgd/business-performance/
  └── usc/business-performance/

docs/
  └── BUSINESS_PERFORMANCE_STANDARD.md // ⭐ This file
```

**🆕 NEW FILES (Quick Date Filter System):**
- `lib/businessPerformanceHelper.ts` - Extended with:
  - `QuickDateFilterType` type definition
  - `QUICK_DATE_FILTER_LABELS` constants
  - `calculateQuickDateRange()` function
  - `boundDateRangeToQuarter()` function
  - `formatDateForAPI()` function
  - `formatDateForDisplay()` function
- `components/QuickDateFilter.tsx` - New component:
  - 4 button presets (7 Days, 30 Days, This Month, Last Month)
  - Active/inactive/disabled states
  - Hover effects
  - Professional styling

## ⚠️ CRITICAL RULES

### 1. Chart Colors
- ✅ **BLUE (#3B82F6) & ORANGE (#F97316)** untuk semua chart (kecuali Stacked & Sankey)
- ❌ JANGAN pakai warna lain (green, purple, etc) untuk single/dual chart

### 2. Label Colors
- ✅ **BLACK (#374151)** untuk SEMUA data labels
- ❌ JANGAN pakai warna line/bar untuk labels

### 3. DualKPICard Icon
- ✅ Icon HANYA di **TITLE** card
- ❌ JANGAN add icon di individual KPI (ATV, PF, GGR USER, DA USER)

### 4. Label Positioning
- ✅ Dual-line chart: offset **8/-8** (STANDARD)
- ❌ JANGAN pakai dynamic offset atau logic lain

### 5. Tooltip Format
- ✅ Rate/Percentage: `formatPercentageKPI()` - NO "RM"
- ✅ Amount: `formatCurrencyKPI()` - dengan "RM"
- ✅ Cases: `formatIntegerKPI()` - dengan "cases" suffix

### 6. DualKPICard Padding
- ✅ `paddingRight: 6px`, `paddingLeft: 6px`
- ❌ JANGAN pakai padding besar (12px+) - akan bikin label & MoM rapat/kumpul

### 7. Font Sizes (COMPACT & PROFESSIONAL)
- ✅ **KHUSUS Business Performance Page** - lebih compact dari page lain
- ✅ StatCard Value: **22px** (standard pages: 28px)
- ✅ DualKPICard Value: **18px** (lebih kecil untuk dual grid)
- ✅ Custom styles via `.bp-page` className
- ❌ JANGAN apply font size ini ke page lain - ini khusus BP page sahaja

### 8. Toggle Mode Selector
- ✅ **Default: OFF (RED)** - Month Mode (Quarter slicer active)
- ✅ **ON: GREEN** - Date Range Mode (Date Range slicer active)
- ✅ Disabled slicer: opacity 0.4, pointerEvents none
- ✅ Visual feedback: Background color RED → GREEN
- ✅ Knob animation: translateX(26px) when ON
- ❌ JANGAN ubah default state - harus OFF (Month Mode)

## 🚀 USAGE EXAMPLE

```typescript
import { 
  getDummyKPIData, 
  getDummyChartData, 
  BP_CHART_COLORS,
  getDataSourceLabel 
} from '@/lib/businessPerformanceHelper'

export default function BusinessPerformancePage() {
  const kpiData = getDummyKPIData()
  const chartData = getDummyChartData()
  
  return (
    <Layout>
      {/* KPI Cards Row */}
      <StatCard {...kpiData.grossGamingRevenue} />
      <DualKPICard 
        title="Transaction Metrics"
        icon="Transaction Metrics"
        kpi1={kpiData.transactionMetrics.atv}
        kpi2={kpiData.transactionMetrics.pf}
      />
      
      {/* Charts Row */}
      <LineChart 
        data={chartData.ggrTrend.data}
        color={BP_CHART_COLORS.primary}
      />
      
      {/* Slicer Info */}
      <div className="slicer-info">
        <p>{getDataSourceLabel()}</p>
      </div>
    </Layout>
  )
}
```

## 📌 PROJECT PHASES

### ✅ PHASE 1: WIREFRAME (COMPLETED)
- [x] Create Business Performance Page structure
- [x] Implement 6 KPI Cards (4 Standard + 2 Dual Grid)
- [x] Implement 10 Charts (Line, Mixed, Bar, Stacked, Sankey)
- [x] Add Toggle Mode Selector (Month/Date Range)
- [x] Add Slicers (Year, Quarter, Date Range)
- [x] Create dummy data untuk design preview
- [x] Add MYR brand list (SBMY, LVMY, STMY, JMMY)
- [x] Create documentation & helper functions
- [x] Compact & Professional styling
- [x] **STATUS: READY FOR WIREFRAME PRESENTATION** 🎯

### 🚧 PHASE 2: REAL DATA (PENDING APPROVAL)
**Prerequisite:** Wireframe disetujui atasan ✅

**Tasks:**
1. [ ] Create Target Input Table di Supabase
2. [ ] Create API routes untuk fetch real data
3. [ ] Implement `fetchRealKPIData()` function
4. [ ] Implement `fetchRealChartData()` function
5. [ ] Integrate with Blue Whale tables
6. [ ] Add data validation & error handling
7. [ ] Add loading states untuk real data fetch
8. [ ] Add brand filtering logic
9. [ ] Test with real data from Supabase
10. [ ] Update `isRealDataAvailable()` to return true
11. [ ] Deploy to production

---

**Last Updated:** 2025-10-19  
**Version:** 1.0.0  
**Current Phase:** ✅ PHASE 1 (WIREFRAME - READY)  
**Next Phase:** 🚧 PHASE 2 (REAL DATA - WAITING FOR APPROVAL)

