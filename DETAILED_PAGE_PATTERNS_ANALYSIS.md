# DETAILED PAGE PATTERNS ANALYSIS - NEXMAX DASHBOARD

## 📋 EXECUTIVE SUMMARY

Dokumen ini berisi analisis detail setiap page di NEXMAX Dashboard untuk memastikan optimasi dilakukan dengan benar tanpa merusak struktur yang sudah ada.

**Total Pages Scanned**: 42 pages
- MYR: 15 pages
- SGD: 11 pages  
- USC: 9 pages
- Admin: 4 pages
- Others: 3 pages

**Last Updated**: 2025-01-XX - Complete detailed scan of all pages, API routes, logic files, and patterns

---

## 🗄️ DATABASE TABLES & MATERIALIZED VIEWS

### Master Tables (High Precision - COUNT DISTINCT)
| Table | Currency | Purpose | Key Columns |
|-------|----------|---------|-------------|
| `blue_whale_myr` | MYR | Daily transaction master data | userkey, unique_code, date, line, deposit_cases, deposit_amount, withdraw_amount |
| `blue_whale_sgd` | SGD | Daily transaction master data | Same structure as MYR |
| `blue_whale_usc` | USC | Daily transaction master data | Same structure as MYR |
| `new_register` | All | New registration data | uniquekey, line, date, currency, new_register, new_depositor |

**Usage**: COUNT DISTINCT untuk Active Member, Pure User, Churn Member, Retention Analysis

### Materialized Views (Performance - SUM Aggregates)
| MV Table | Currency | Purpose | Key Columns |
|----------|----------|---------|-------------|
| `blue_whale_myr_monthly_summary` | MYR | Monthly aggregates | line, year, month (INT), currency, deposit_amount, withdraw_amount, active_member, pure_member |
| `blue_whale_sgd_monthly_summary` | SGD | Monthly aggregates | Same structure as MYR |
| `blue_whale_usc_summary` | USC | Monthly aggregates | Same structure as MYR (note: different name!) |
| `bp_daily_summary_myr` | MYR | Daily aggregates for BP page | date, line, currency, deposit_amount, withdraw_amount, + 7 pre-calculated KPIs |
| `bp_quarter_summary_myr` | MYR | Quarterly aggregates for BP page | year, quarter, line, currency, deposit_amount, withdraw_amount, + 4 pre-calculated KPIs |

**Usage**: SUM aggregates untuk amounts, cases, bonuses, pre-calculated KPIs

### System Tables
| Table | Purpose |
|-------|---------|
| `bp_target` | Target values per currency/quarter/brand |
| `bp_target_audit_log` | Audit trail for target changes |
| `activity_logs` | User activity tracking |
| `page_visibility` | Page ON/OFF control |
| `feedback` | User feedback |
| `exchange_rate` | Currency conversion rates (sgd_to_myr, usd_to_myr) |
| `overall_label_myr_mv` | Overall label data for MYR |

---

## 🔍 DATA LOADING PATTERNS

### Pattern 1: AUTO-LOAD dengan initialLoadDone (Overview Pages)

**Pages yang menggunakan:**
- `/myr/overview/page.tsx`
- `/sgd/overview/page.tsx`
- `/usc/overview/page.tsx`

**Pattern:**
```typescript
const [initialLoadDone, setInitialLoadDone] = useState(false)

// Auto-load KPI data ONCE when defaults are set (initial load only)
useEffect(() => {
  if (!initialLoadDone && selectedYear && selectedMonth && selectedLine) {
    console.log('✅ Initial load with defaults:', { selectedYear, selectedMonth, selectedLine })
    setTimeout(() => {
      loadKPIData()
      loadChartData()
      setInitialLoadDone(true)
    }, 100)
  }
}, [selectedYear, selectedMonth, selectedLine, initialLoadDone])
```

**Karakteristik:**
- ✅ Auto-load sekali saat defaults dari API sudah set
- ✅ Manual search button untuk reload data
- ✅ Menggunakan `getAllMYRKPIsWithMoM` / `getAllSGDKPIsWithMoM` / `getAllUSCKPIsWithMoM` dari logic files
- ✅ Chart data dari separate API endpoint (`/api/{market}-overview/chart-data`)

---

### Pattern 2: AUTO-LOAD dengan initialLoadDone (Customer Retention Pages)

**Pages yang menggunakan:**
- `/myr/customer-retention/page.tsx`
- `/sgd/customer-retention/page.tsx`
- `/usc/customer-retention/page.tsx`

**Pattern:**
```typescript
const [initialLoadDone, setInitialLoadDone] = useState(false)

// Auto-load data ONCE when defaults are set from API (initial load only)
useEffect(() => {
  if (!initialLoadDone && line && year && month) {
    console.log('✅ Initial load with defaults:', { line, year, month })
    fetchCustomerRetentionData()
    setInitialLoadDone(true)
  }
}, [line, year, month, initialLoadDone])

// Reload on pagination OR status filter change
useEffect(() => {
  const isInitialMount = pagination.currentPage === 1 && pagination.totalPages === 1 && pagination.totalRecords === 0
  if (!isInitialMount && line && year && month) {
    fetchCustomerRetentionData()
  }
}, [pagination.currentPage, statusFilter])
```

**Karakteristik:**
- ✅ Auto-load sekali saat defaults dari API sudah set
- ✅ Manual search button (`handleApplyFilters`) untuk reload dengan filter baru
- ✅ Auto-reload saat pagination atau status filter berubah
- ✅ Data dari `/api/{market}-customer-retention/data`
- ✅ Export dari `/api/{market}-customer-retention/export`

---

### Pattern 3: AUTO-LOAD dengan initialLoadDone (Churn Member Pages)

**Pages yang menggunakan:**
- `/myr/churn-member/page.tsx`
- `/sgd/churn-member/page.tsx`
- `/usc/churn-member/page.tsx`

**Pattern:**
```typescript
const [initialLoadDone, setInitialLoadDone] = useState(false)

// Auto-load data ONCE when defaults are set from API (initial load only)
useEffect(() => {
  if (!initialLoadDone && line && year && month && month !== 'ALL' && year !== 'ALL') {
    console.log('✅ Initial load with defaults:', { line, year, month })
    fetchChurnMemberData(1)
    setInitialLoadDone(true)
  }
}, [line, year, month, initialLoadDone, fetchChurnMemberData])

// Reload on pagination change ONLY (NOT on status filter change - use Search button)
useEffect(() => {
  const isInitialMount = pagination.currentPage === 1 && pagination.totalPages === 1 && pagination.totalRecords === 0
  if (!isInitialMount && initialLoadDone && line && year && month && month !== 'ALL' && year !== 'ALL') {
    fetchChurnMemberData(pagination.currentPage)
  }
}, [pagination.currentPage])
```

**Karakteristik:**
- ✅ Auto-load sekali saat defaults dari API sudah set
- ✅ Manual search button (`handleApplyFilters`) untuk reload dengan filter baru
- ✅ Auto-reload hanya saat pagination berubah (BUKAN saat status filter berubah)
- ✅ Validasi: `month !== 'ALL' && year !== 'ALL'` sebelum fetch
- ✅ Data dari `/api/{market}-churn-member/data`
- ✅ Export dari `/api/{market}-churn-member/export`

---

### Pattern 4: AUTO-LOAD dengan autoLoaded (KPI Comparison Pages)

**Pages yang menggunakan:**
- `/myr/kpi-comparison/page.tsx`
- `/sgd/kpi-comparison/page.tsx`
- `/usc/kpi-comparison/page.tsx`

**Pattern:**
```typescript
const [autoLoaded, setAutoLoaded] = useState<boolean>(false)

// Manual Search trigger (no auto-reload on slicer change)
const handleSearch = async () => {
  if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) return
  // ... fetch data
}

// Auto-load once after defaults are set
useEffect(() => {
  if (!autoLoaded && periodAStart && periodAEnd && periodBStart && periodBEnd) {
    setAutoLoaded(true)
    handleSearch()
  }
}, [autoLoaded, periodAStart, periodAEnd, periodBStart, periodBEnd, selectedLine])
```

**Karakteristik:**
- ✅ Auto-load sekali saat date ranges sudah set dari API
- ✅ Manual search button untuk reload
- ✅ Tidak auto-reload saat slicer berubah
- ✅ Data dari `/api/{market}-kpi-comparison/data`
- ✅ Date range picker untuk Period A dan Period B

---

### Pattern 5: AUTO-LOAD dengan loadKPIDataWithDefaults (USC Business Performance)

**Page yang menggunakan:**
- `/usc/business-performance/page.tsx`

**Pattern:**
```typescript
// Load slicer options on mount
useEffect(() => {
  const loadSlicerOptions = async () => {
    // ... fetch slicer options
    if (result.success) {
      setSlicerOptions(result.data)
      setSelectedYear(result.data.defaults.year)
      setSelectedMonth(result.data.defaults.month)
      setSelectedLine(result.data.defaults.line)
      
      // AUTO-LOAD data pertama kali dengan default values (selepas slicer ready)
      loadKPIDataWithDefaults(
        result.data.defaults.year,
        result.data.defaults.month,
        result.data.defaults.line,
        allowedBrands
      )
    }
  }
  loadSlicerOptions()
}, [])

// Helper function to load data with specific values
const loadKPIDataWithDefaults = async (year: string, month: string, line: string, allowedBrands: any) => {
  // ... fetch data
}

// Function to load KPI data (triggered by Search button only)
const loadKPIData = async () => {
  // ... fetch data
}
```

**Karakteristik:**
- ✅ Auto-load sekali saat slicer options loaded
- ✅ Manual search button untuk reload
- ✅ Data dari `/api/usc-business-performance/data`
- ✅ Menggunakan `getAllUSCBPKPIsWithMoM` dari `USCBusinessPerformanceLogic.ts`

---

### Pattern 6: AUTO-LOAD dengan useEffect dependencies (MYR Business Performance)

**Page yang menggunakan:**
- `/myr/business-performance/page.tsx`

**Pattern:**
```typescript
// FETCH KPI DATA WHEN FILTERS CHANGE
useEffect(() => {
  if (!loadingSlicers) {
    fetchKPIData()
  }
}, [selectedYear, selectedQuarter, isDateRangeMode, startDate, endDate, loadingSlicers])
```

**Karakteristik:**
- ✅ Auto-load setiap kali filter berubah (year, quarter, date range mode, dates)
- ✅ Toggle antara Monthly Mode (Quarter) dan Daily Mode (Date Range)
- ✅ Quick Date Filter untuk Daily Mode (7 Days, 14 Days, This Month)
- ✅ Data dari `/api/myr-business-performance/data`
- ✅ Complex logic dengan target comparison, active member drill-down, dll

---

### Pattern 7: MANUAL SEARCH ONLY (Member Report Pages)

**Pages yang menggunakan:**
- `/myr/member-report/page.tsx`
- `/sgd/member-report/page.tsx`
- `/usc/member-report/page.tsx`

**Pattern:**
```typescript
useEffect(() => {
  fetchSlicerOptions()
  fetchMemberReportData() // Initial load
}, [])

// Only reload on pagination change, NOT on slicer change
useEffect(() => {
  const isInitialMount = pagination.currentPage === 1 && pagination.totalPages === 1 && pagination.totalRecords === 0
  if (!isInitialMount) {
    fetchMemberReportData()
  }
}, [pagination.currentPage])

// Manual Search trigger
const handleApplyFilters = () => {
  resetPagination()
  fetchMemberReportData()
}
```

**Karakteristik:**
- ✅ Initial load saat mount
- ✅ Manual search button (`handleApplyFilters`) untuk reload dengan filter baru
- ✅ Auto-reload hanya saat pagination berubah
- ✅ Data dari `/api/{market}-member-report/data`
- ✅ Export dari `/api/{market}-member-report/export`

---

### Pattern 8: MANUAL SEARCH ONLY (Brand Performance Trends)

**Pages yang menggunakan:**
- `/myr/brand-performance-trends/page.tsx`
- `/sgd/brand-performance-trends/page.tsx`
- `/usc/brand-performance-trends/page.tsx`

**Pattern:**
```typescript
const handleApplyFilters = async () => {
  if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
    setError('Please select both date ranges')
    return
  }
  // ... fetch data
}
```

**Karakteristik:**
- ✅ Manual search button (`handleApplyFilters`) untuk fetch data
- ✅ Tidak ada auto-load
- ✅ Date range picker untuk Period A dan Period B
- ✅ Data dari `/api/{market}-brand-performance-trends/data`
- ✅ Export dari `/api/{market}-brand-performance-trends/export`
- ✅ Customer detail drill-down modal

---

### Pattern 9: COMING SOON (Placeholder Pages)

**Pages yang menggunakan:**
- `/myr/member-analytic/page.tsx` (MYR - Coming Soon)
- `/sgd/member-analytic/page.tsx` (SGD - Coming Soon)
- `/sgd/business-performance/page.tsx` (SGD - Coming Soon)
- `/usc/member-analytic/page.tsx` (USC - FULLY IMPLEMENTED, bukan Coming Soon)

**Pattern:**
```typescript
export default function SGDMemberAnalyticPage() {
  return (
    <Layout>
      <ComingSoon 
        title="Member Analytic SGD Coming Soon"
        subtitle="Singapore Dollar currency member analytics and reports will be available soon."
      />
    </Layout>
  )
}
```

**Karakteristik:**
- ✅ Hanya menampilkan Coming Soon component
- ✅ Tidak ada data loading atau API calls

---

## 📊 SLICER OPTIONS API PATTERNS

### Pattern A: Standard Overview Slicer (Year, Month, Line)

**API Routes:**
- `/api/myr-overview/slicer-options`
- `/api/sgd-overview/slicer-options`
- `/api/usc-overview/slicer-options`

**Response Structure:**
```typescript
{
  success: true,
  data: {
    currencies: ['MYR'], // Locked
    lines: ['ALL', 'SBMY', 'LVMY', ...], // Filtered by brand access
    years: ['2025', '2024', ...],
    months: [
      { value: 'ALL', label: 'ALL', years: ['2025', '2024', ...] },
      { value: 'January', label: 'January', years: ['2025', '2024', ...] },
      ...
    ],
    defaults: {
      currency: 'MYR',
      line: 'ALL' | 'SBMY', // 'ALL' for Admin, first brand for Squad Lead
      year: '2025',
      month: 'September'
    }
  }
}
```

**Karakteristik:**
- ✅ Currency locked ke market (MYR/SGD/USC)
- ✅ Dynamic month filtering berdasarkan selected year
- ✅ Brand access control (Squad Lead vs Admin)
- ✅ Defaults dari latest record di database

---

### Pattern B: Business Performance Slicer (Year, Quarter, Date Ranges)

**API Route:**
- `/api/myr-business-performance/slicer-options`

**Response Structure:**
```typescript
{
  years: ['2025', '2024', ...],
  quarters: {
    '2025': ['Q1', 'Q2', 'Q3', 'Q4'],
    '2024': ['Q1', 'Q2', 'Q3', 'Q4']
  },
  quarterDateRanges: {
    '2025-Q4': { min: '2025-10-01', max: '2025-10-20' },
    ...
  },
  defaults: {
    year: '2025',
    quarter: 'Q4',
    startDate: '2025-10-14',
    endDate: '2025-10-20'
  }
}
```

**Karakteristik:**
- ✅ Quarter-based dengan date ranges
- ✅ Auto-detect latest quarter dari max date
- ✅ Date ranges untuk Quick Date Filter (7 Days, 14 Days, This Month)

---

### Pattern C: Customer Retention Slicer (Year, Month, Line)

**API Routes:**
- `/api/myr-customer-retention/slicer-options`
- `/api/sgd-customer-retention/slicer-options`
- `/api/usc-customer-retention/slicer-options`

**Response Structure:**
```typescript
{
  success: true,
  data: {
    lines: ['ALL', 'SBMY', ...], // Filtered by brand access
    years: ['2025', '2024', ...],
    months: [
      { value: 'January', label: 'January' },
      ...
    ],
    dateRange: { min: '2021-01-01', max: '2025-12-31' },
    defaults: {
      line: 'ALL' | 'SBMY',
      year: '2025',
      month: 'September'
    }
  }
}
```

**Karakteristik:**
- ✅ Similar ke Overview tapi tanpa currency (locked di page)
- ✅ Defaults dari max date di database
- ✅ Brand access control

---

### Pattern D: Member Report Slicer (Year, Month, Line, Date Range)

**API Routes:**
- `/api/myr-member-report/slicer-options`
- `/api/sgd-member-report/slicer-options`
- `/api/usc-member-report/slicer-options`

**Response Structure:**
```typescript
{
  success: true,
  data: {
    lines: ['ALL', 'SBMY', ...],
    years: ['2025', '2024', ...],
    months: [
      { value: 'ALL', label: 'ALL' },
      { value: 'January', label: 'January' },
      ...
    ],
    dateRange: { min: '2021-01-01', max: '2025-12-31' }
  }
}
```

**Karakteristik:**
- ✅ Support untuk Month filter ATAU Date Range filter
- ✅ Toggle antara month mode dan date range mode
- ✅ Brand access control

---

## 🎯 LOGIC FILES USAGE

### MYR Logic Files

1. **`lib/MYRDailyAverageAndMoM.ts`**
   - **Used by**: `/myr/overview/page.tsx`
   - **Main Function**: `getAllMYRKPIsWithMoM(year: string, month: string, line?: string)`
   - **Returns**: `{ current: MYRKPIData, mom: MYRMoMData, dailyAverage: MYRKPIData }`
   - **Data Source**: `blue_whale_myr_monthly_summary` (Materialized View)
   - **Key Functions**:
     - `getMYRKPIData(year, month, line)` - Get current month data
     - `calculateAllMYRDailyAverages(monthlyData, year, month)` - Calculate daily averages
     - `calculateMYRMoM(current, previous)` - Calculate Month-over-Month
   - **Exports**: `getAllMYRKPIsWithMoM`, `formatMYRMoMValue`, `getMYRComparisonColor`, `formatMYRDailyAverageValue`

2. **`lib/MYRDailyAverageAndMoM_clean.ts`**
   - Backup/alternative version (jangan dihapus)
   - Similar structure

### SGD Logic Files

1. **`lib/SGDDailyAverageAndMoM.ts`**
   - **Used by**: `/sgd/overview/page.tsx`
   - **Main Function**: `getAllSGDKPIsWithMoM(year: string, month: string, line?: string)`
   - **Returns**: `{ current: SGDKPIData, mom: SGDMoMData, dailyAverage: SGDKPIData }`
   - **Data Source**: `blue_whale_sgd_monthly_summary` (Materialized View)
   - **Key Functions**: Same pattern as MYR
   - **Exports**: `getAllSGDKPIsWithMoM`, `formatSGDMoMValue`, `getSGDComparisonColor`, `formatSGDDailyAverageValue`

### USC Logic Files

1. **`lib/USCDailyAverageAndMoM.ts`**
   - **Used by**: `/usc/overview/page.tsx`, `/usc/member-analytic/page.tsx`
   - **Main Function**: `getAllUSCKPIsWithMoM(year: string, month: string, line?: string)`
   - **Returns**: `{ current: USCKPIData, mom: USCMoMData, dailyAverage: USCKPIData }`
   - **Data Source**: `blue_whale_usc_summary` (Materialized View - note: different name!)
   - **Key Functions**: Same pattern as MYR/SGD
   - **Exports**: `getAllUSCKPIsWithMoM`, `formatUSCMoMValue`, `getUSCComparisonColor`, `formatUSCDailyAverageValue`

2. **`lib/USCBusinessPerformanceLogic.ts`**
   - **Used by**: `/usc/business-performance/page.tsx`
   - **Main Function**: `getAllUSCBPKPIsWithMoM(filters: USCBPFilters)`
   - **Returns**: `{ current: USCBPKPIData, mom: USCBPMoMData }`
   - **Data Source**: 
     - `blue_whale_usc` (master table) - untuk Active Member, Pure Member (COUNT DISTINCT)
     - `blue_whale_usc_summary` (MV) - untuk aggregated amounts
     - `new_register` - untuk New Depositor
   - **Key Functions**:
     - `getActiveMember(filters)` - COUNT DISTINCT userkey
     - `getTotalActiveMemberYear(year, line)` - Total active member untuk rate calculation
     - `getNewDepositor(filters)` - From new_register table
     - `getAggregatedAmounts(filters)` - From blue_whale_usc
     - `getChurnMember(filters)` - Cohort comparison logic
   - **Hybrid Approach**: Master table untuk precision, MV untuk performance

3. **`lib/USCLogic.ts`**
   - **Used by**: Various USC pages (member-analytic, etc.)
   - **Core Functions**:
     - `getUSCRawKPIData(filters)` - Parallel fetch dari master + MV
     - `calculateUSCKPIs(rawData)` - Calculate derived KPIs
     - `getAllUSCKPIsWithMoM(year, month, line)` - Complete KPI with MoM
   - **Hybrid Approach**: 
     - Active Member, Pure User → `blue_whale_usc` (master)
     - Aggregated amounts → `blue_whale_usc_summary` (MV)
   - **Cache**: In-memory cache dengan key `usc_raw_kpi_USC_{year}_{month}_{line}`

### Business Performance Logic (MYR)

**`lib/businessPerformanceComparison.ts`**
- **Used by**: `/myr/business-performance/page.tsx`
- **Functions**:
  - `calculatePreviousPeriod(year, quarter, isDateRange, startDate, endDate)` - Calculate previous period
  - `calculateAverageDaily(amount, days)` - Daily average calculation
  - `calculateMoMChange(current, previous)` - MoM percentage

### Chart Helpers (MYR Business Performance)

**`app/api/myr-business-performance/chart-helpers.ts`**
- **Used by**: `/api/myr-business-performance/data/route.ts`
- **Functions**: Chart data generation helpers
  - `generateGGRTrendChart(params)`
  - `generateForecastQ4GGRChart(params)`
  - `generateDaUserVsGgrUserTrendChart(params)`
  - `generateAtvVsPfTrendChart(params)`
  - `generateWinrateVsWithdrawRateChart(params)`
  - `generateBonusUsagePerBrandChart(params)`
  - `generateBrandGGRContributionChart(params)`
  - `generateRetentionVsChurnRateChart(params)`
  - `generateReactivationRateChart(params)`
  - `generateSankeyDiagram(params)`
  - `generateActiveMemberVsPureMemberTrendChart(params)`

---

## 🔌 API ROUTES DETAILED PATTERNS

### Overview API Routes

**Slicer Options**: `/api/{market}-overview/slicer-options`
- **Method**: GET
- **Headers**: `x-user-allowed-brands` (JSON string array)
- **Table**: `blue_whale_{market}_monthly_summary`
- **Response**: `{ success, data: { years, months, lines, currencies, defaults } }`
- **Brand Filtering**: Squad Lead hanya dapat akses brands yang diizinkan
- **Currency Lock**: Locked ke market (MYR/SGD/USC)

**Chart Data**: `/api/{market}-overview/chart-data`
- **Method**: GET
- **Query Params**: `line`, `year`
- **Headers**: `x-user-allowed-brands`
- **Table**: `blue_whale_{market}_monthly_summary`
- **Response**: `{ success, monthlyData: { [monthName]: { ... } } }`
- **Data**: Monthly aggregates untuk entire year

**KPI Data**: Via Logic File (client-side)
- **Function**: `getAll{MARKET}KPIsWithMoM(year, month, line)`
- **Source**: Logic file, bukan API route
- **Returns**: `{ current, mom, dailyAverage }`

### Business Performance API Routes

**MYR Business Performance Data**: `/api/myr-business-performance/data`
- **Method**: GET
- **Query Params**: `year`, `quarter`, `isDateRange`, `startDate`, `endDate`, `line`
- **Tables**: 
  - `bp_daily_summary_myr` (Daily Mode)
  - `bp_quarter_summary_myr` (Quarterly Mode)
  - `blue_whale_myr` (Master - untuk COUNT DISTINCT)
  - `new_register` (New Register/Depositor)
  - `bp_target` (Target values)
- **Response**: `{ success, kpis, charts, dailyAverage, comparison, previousPeriod }`

**USC Business Performance Data**: `/api/usc-business-performance/data`
- **Method**: GET
- **Query Params**: `year`, `month`, `line`
- **Headers**: `x-user-allowed-brands`
- **Logic**: `getAllUSCBPKPIsWithMoM` dari `USCBusinessPerformanceLogic.ts`
- **Tables**: `blue_whale_usc`, `blue_whale_usc_summary`, `new_register`
- **Response**: `{ success, data: { kpis, mom } }`

### Member Report API Routes

**Slicer Options**: `/api/{market}-member-report/slicer-options`
- **Method**: GET
- **Headers**: `x-user-allowed-brands`
- **Table**: `member_report_daily` (master data)
- **Response**: `{ success, data: { lines, years, months, dateRange } }`

**Data**: `/api/{market}-member-report/data`
- **Method**: GET
- **Query Params**: `line`, `year`, `month`, `startDate`, `endDate`, `filterMode`, `page`, `limit`
- **Headers**: `x-user-allowed-brands`
- **Table**: `member_report_daily`
- **Response**: `{ success, data: [...], pagination: { currentPage, totalPages, totalRecords, ... } }`

**Export**: `/api/{market}-member-report/export`
- **Method**: POST
- **Body**: `{ line, year, month, startDate, endDate, filterMode }`
- **Headers**: `x-user-allowed-brands`
- **Response**: CSV file download

### Customer Retention API Routes

**Slicer Options**: `/api/{market}-customer-retention/slicer-options`
- **Method**: GET
- **Headers**: `x-user-allowed-brands`
- **Table**: `blue_whale_{market}` (master table)
- **Response**: `{ success, data: { lines, years, months, dateRange, defaults } }`

**Data**: `/api/{market}-customer-retention/data`
- **Method**: GET
- **Query Params**: `line`, `year`, `month`, `startDate`, `endDate`, `filterMode`, `statusFilter`, `page`, `limit`
- **Headers**: `x-user-allowed-brands`
- **Table**: `blue_whale_{market}` (master table)
- **Logic**: 
  - Determine user status (NEW DEPOSITOR, RETENTION, REACTIVATION) based on `first_deposit_date`
  - Calculate derived metrics (ATV, PF, GGR, Winrate, WD Rate)
- **Response**: `{ success, data: [...], pagination: {...} }`

**Month Max Date**: `/api/{market}-customer-retention/month-max-date`
- **Method**: GET
- **Query Params**: `month`, `year`, `line`
- **Purpose**: Get max date in database for selected month (untuk date range boundaries)

**Export**: `/api/{market}-customer-retention/export`
- **Method**: POST
- **Body**: `{ line, year, month, startDate, endDate, filterMode, statusFilter }`
- **Response**: CSV file download

### Churn Member API Routes

**Slicer Options**: `/api/{market}-churn-member/slicer-options`
- **Method**: GET
- **Headers**: `x-user-allowed-brands`
- **Table**: `blue_whale_{market}` (master table)
- **Response**: `{ success, data: { lines, years, months, defaults } }`

**Data**: `/api/{market}-churn-member/data`
- **Method**: GET
- **Query Params**: `line`, `year`, `month`, `statusFilter`, `page`, `limit`
- **Headers**: `x-user-allowed-brands`
- **Table**: `blue_whale_{market}` (master table)
- **Logic**: Cohort comparison (active last month but not this month)
- **Response**: `{ success, data: [...], pagination: {...} }`

**Export**: `/api/{market}-churn-member/export`
- **Method**: POST
- **Body**: `{ line, year, month, statusFilter }`
- **Response**: CSV file download

### KPI Comparison API Routes

**Slicer Options**: `/api/{market}-kpi-comparison/slicer-options`
- **Method**: GET
- **Response**: `{ success, data: { lines, latestDate } }`

**Data**: `/api/{market}-kpi-comparison/data`
- **Method**: GET
- **Query Params**: `line`, `periodAStart`, `periodAEnd`, `periodBStart`, `periodBEnd`
- **Headers**: `x-user-allowed-brands`
- **Tables**: `blue_whale_{market}` (master table)
- **Logic**: Compare KPIs between two periods
- **Response**: `{ success, comparisonData: [...], periodA, periodB }`

### Brand Performance Trends API Routes

**Slicer Options**: `/api/{market}-brand-performance-trends/slicer-options`
- **Method**: GET
- **Response**: `{ success, data: { lines, latestDate } }`

**Data**: `/api/{market}-brand-performance-trends/data`
- **Method**: GET
- **Query Params**: `periodAStart`, `periodAEnd`, `periodBStart`, `periodBEnd`
- **Headers**: `x-user-allowed-brands`
- **Tables**: `blue_whale_{market}` (master table)
- **Logic**: Fetch all brands dynamically, compare Period A vs Period B
- **Response**: `{ success, data: { rows: [...], summary: {...} } }`

**Customer Details**: `/api/{market}-brand-performance-trends/customer-details`
- **Method**: GET
- **Query Params**: `line`, `periodAStart`, `periodAEnd`, `periodBStart`, `periodBEnd`
- **Purpose**: Drill-down customer details untuk specific brand

**Export**: `/api/{market}-brand-performance-trends/export`
- **Method**: GET
- **Query Params**: `periodAStart`, `periodAEnd`, `periodBStart`, `periodBEnd`
- **Response**: CSV file download

---

## 🔄 SPECIAL CASES & DIFFERENCES

### 1. Business Performance Pages

**MYR Business Performance:**
- ✅ Toggle: Monthly Mode (Quarter) vs Daily Mode (Date Range)
- ✅ Quick Date Filter: 7 Days, 14 Days, This Month
- ✅ Target comparison dengan `bp_target` table
- ✅ Active Member drill-down modal
- ✅ Target achieve modal
- ✅ 6 KPI Cards + 10 Charts

**USC Business Performance:**
- ✅ Similar structure tapi lebih sederhana
- ✅ No toggle (hanya monthly mode)
- ✅ 6 KPI Cards + Charts
- ✅ Menggunakan `USCBusinessPerformanceLogic.ts`

**SGD Business Performance:**
- ❌ Coming Soon (placeholder)

---

### 2. Member Analytic Pages

**USC Member Analytic:**
- ✅ FULLY IMPLEMENTED
- ✅ 6 KPI Cards + Charts
- ✅ Menggunakan `getAllUSCKPIsWithMoM`
- ✅ Chart data dari `/api/usc-member-analytic/chart-data`

**MYR Member Analytic:**
- ❌ Coming Soon

**SGD Member Analytic:**
- ❌ Coming Soon

---

### 3. Auto Approval Pages (MYR Only)

**MYR Auto Approval Monitor:**
- ✅ Complex KPI calculations
- ✅ Toggle: Monthly Mode vs Daily Mode
- ✅ Quick Date Filter
- ✅ Multiple charts (processing time, coverage rate, overdue, etc.)
- ✅ Automation details modal
- ✅ Overdue details modal

**MYR Auto Approval Withdraw:**
- ✅ Similar structure
- ✅ Withdraw-specific metrics

**SGD/USC Auto Approval:**
- ❌ Not implemented yet

---

### 4. Overall Label (MYR Only)

**MYR Overall Label:**
- ✅ Unique page (hanya MYR)
- ✅ Grouping system (A, B, C, D)
- ✅ KPI cards + Bar chart
- ✅ Table dengan custom columns
- ✅ Export functionality

---

### 5. AIA Candy Tracking

**MYR AIA Candy Tracking:**
- ⚠️ **DEMO DATA** (bukan real data)
- ⚠️ Warning banner: "DEMO DATA - This page is currently displaying sample data"
- ✅ Toggle: Daily vs Weekly mode
- ✅ 6 KPI Cards + Charts

**SGD AIA Candy Tracking:**
- Similar structure

---

## ⚠️ CRITICAL NOTES FOR OPTIMIZATION

### 1. Data Loading Patterns
- **JANGAN** mengubah auto-load patterns tanpa memahami dependencies
- **JANGAN** menghapus `initialLoadDone` atau `autoLoaded` flags
- **JANGAN** mengubah useEffect dependencies tanpa test menyeluruh

### 2. API Routes
- **JANGAN** mengubah response structure dari slicer-options API
- **JANGAN** mengubah brand access control logic
- **JANGAN** mengubah currency lock mechanism

### 3. Logic Files
- **JANGAN** mengubah signature dari `getAll*KPIsWithMoM` functions
- **JANGAN** mengubah return structure (`{ current, mom, dailyAverage }`)
- **JANGAN** mengubah data source (MV vs master table)

### 4. Component Usage
- **JANGAN** mengubah StatCard props structure
- **JANGAN** mengubah Chart component props
- **JANGAN** mengubah Slicer component behavior

### 5. Special Cases
- **JANGAN** menghapus Coming Soon pages
- **JANGAN** mengubah demo data warning di AIA Candy Tracking
- **JANGAN** mengubah Overall Label grouping logic

---

## 📝 CHECKLIST UNTUK OPTIMIZATION

Sebelum melakukan optimasi, pastikan:

- [ ] Sudah membaca dan memahami data loading pattern page tersebut
- [ ] Sudah check API routes yang digunakan
- [ ] Sudah check logic files yang digunakan
- [ ] Sudah check component dependencies
- [ ] Sudah check special cases dan differences
- [ ] Sudah test dengan berbagai user roles (Admin vs Squad Lead)
- [ ] Sudah test dengan berbagai filter combinations
- [ ] Sudah verify tidak ada breaking changes di response structures
- [ ] Sudah verify tidak ada breaking changes di component props
- [ ] Sudah verify tidak ada breaking changes di logic file signatures

---

## 🔗 RELATED DOCUMENTATION

- `NEXMAX_STANDARDS_COMPLETE_REFERENCE.md` - Complete standards reference
- `CBO_FRONTEND_FRAMEWORK_STANDARD.md` - Framework standards
- `COMPREHENSIVE_PROJECT_SCAN_REPORT.md` - Previous scan report

---

**Last Updated**: 2025-01-XX
**Scanned By**: AI Assistant
**Status**: ✅ Complete

