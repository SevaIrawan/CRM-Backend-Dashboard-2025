# 📊 BRAND COMPARISON TREND USC PAGE - SCANNING REPORT

## 📁 STRUKTUR FILE

### 1. **Frontend Page Component**
- **File**: `app/usc/brand-performance-trends/page.tsx`
- **Ukuran**: ~1,669 baris
- **Type**: Client Component (`"use client"`)

### 2. **API Routes** (`app/api/usc-brand-performance-trends/`)
   - **`data/route.ts`** (~608 baris) - Main API untuk fetch comparison data
   - **`slicer-options/route.ts`** (~52 baris) - Fetch date range options
   - **`export/route.ts`** (~111 baris) - Export CSV functionality
   - **`customer-details/route.ts`** (~203 baris) - Drill-down customer details

### 3. **Logic & Helpers**
   - **`lib/brandPerformanceTrendsLogic.tsx`** - Formatting functions (`formatKPIValue`)
   - **`components/ComparisonStatCard.tsx`** - StatCard component untuk comparison
   - **`components/CustomerDetailModal.tsx`** - Modal untuk customer drill-down

---

## 🗄️ DATABASE STRUCTURE

### **Source Tables:**
1. **`blue_whale_usc_summary`** - Aggregated data per brand per day
   - Kolom: `line`, `date`, `currency`, `deposit_amount`, `deposit_cases`, `withdraw_amount`, `withdraw_cases`, `active_member`, dll

2. **`blue_whale_usc`** - Raw transaction data
   - Kolom: `userkey`, `unique_code`, `user_name`, `line`, `date`, `currency`, `deposit_amount`, `deposit_cases`, `withdraw_amount`, dll

### **Key Filters:**
- `currency = 'USC'` (locked)
- Date range: `gte('date', startDate)` dan `lte('date', endDate)`
- Active Member: `gt('deposit_cases', 0)`
- Brand filtering: `eq('line', brand)` atau `in('line', allBrands)`

---

## 📐 PAGE STRUCTURE

### **Layout:**
```
Layout (with customSubHeader)
└── Frame (variant="standard")
    └── Content Container
        ├── Loading Spinner
        ├── Error Display
        └── Main Content (when data loaded)
            ├── Row 1: KPI Cards (6 cards horizontal)
            │   ├── Active Member A|B
            │   ├── Deposit Amount A|B
            │   ├── Deposit Cases A|B
            │   ├── Net Profit A|B
            │   ├── DA USER A|B
            │   └── GGR USER A|B
            │
            ├── Row 2: Charts (2 charts)
            │   ├── Active Member Performance Comparison (BarChart)
            │   └── Deposit Cases Performance Comparison (BarChart)
            │
            ├── Row 3: Charts (2 charts)
            │   ├── Deposit Amount Performance Comparison (LineChart)
            │   └── Net Profit Performance Comparison (LineChart)
            │
            ├── Row 4: Charts (2 charts)
            │   ├── GGR User Performance Comparison (BarChart)
            │   └── DA User Performance Comparison (BarChart)
            │
            ├── Row 5: Charts (2 charts)
            │   ├── Average Transaction Value Performance Comparison (LineChart)
            │   └── Purchase Frequency Performance Comparison (LineChart)
            │
            ├── Row 6: Brand Comparison Table
            │   └── Large table dengan 37 kolom:
            │       - Brand/Line (sticky)
            │       - Period A (9 kolom): Count, ATV, PF, DC, DA, GGR, Winrate, GGR User, DA User
            │       - Period B (9 kolom): Count, ATV, PF, DC, DA, GGR, Winrate, GGR User, DA User
            │       - Compare (B-A) (9 kolom): Diff untuk semua metrics
            │       - Compare (%) (9 kolom): % change untuk semua metrics
            │       - TOTAL row di akhir
            │
            └── Data Source Info
```

---

## 🔄 DATA FLOW

### **1. Initial Load (`useEffect`):**
```
1. Fetch slicer options → `/api/usc-brand-performance-trends/slicer-options`
   └── Returns: { dateRange: { min, max }, defaults: { latestDate } }

2. Calculate default periods:
   - Period B: Last 7 days (based on latestDate)
   - Period A: Same 7-day window in previous month

3. Fetch data → `/api/usc-brand-performance-trends/data`
   └── Params: periodAStart, periodAEnd, periodBStart, periodBEnd
   └── Returns: { comparison, charts, rows }
```

### **2. Manual Search (via "Search" button):**
```
User changes Period A/B dates → Clicks "Search" → handleApplyFilters()
└── Fetches data dengan params baru
└── Updates state: data, tableData
```

### **3. Data API Logic (`data/route.ts`):**
```
1. Validate params (periodAStart, periodAEnd, periodBStart, periodBEnd)

2. Get user's allowed brands from header (x-user-allowed-brands)

3. Fetch all brands from blue_whale_usc_summary (filtered by user access)

4. Calculate Overall KPIs untuk Period A & B:
   - Aggregate dari blue_whale_usc_summary (all brands)
   - Count unique userkeys dari blue_whale_usc (activeMember)
   - Calculate: depositAmount, depositCases, netProfit, atv, ggrUser, daUser, purchaseFrequency

5. Check brand data availability (brands with data in Period A OR Period B)

6. Get brand-specific data untuk charts:
   - Untuk setiap brand: fetch summary + members untuk Period A & B
   - Calculate KPIs per brand
   - Filter hanya brands yang available (union of Period A & B brands)

7. Prepare chart data (8 charts):
   - activeMemberComparison
   - depositCasesComparison
   - depositAmountTrend
   - netProfitTrend
   - ggrUserComparison
   - daUserComparison
   - atvTrend
   - purchaseFrequencyTrend

8. Prepare table rows:
   - Calculate difference (B - A) untuk setiap brand
   - Calculate percentage change (%) untuk setiap brand
   - Include TOTAL row

9. Return response dengan structure:
   {
     comparison: { periodA, periodB, difference, percentageChange },
     charts: { ... 8 chart data ... },
     rows: [ ... brand rows + TOTAL row ... ]
   }
```

---

## 📊 KPI CALCULATIONS

### **Overall KPIs (Aggregated across all brands):**

1. **Active Member** = COUNT(DISTINCT userkey) where deposit_cases > 0
2. **Pure User** = COUNT(DISTINCT unique_code) where deposit_cases > 0
3. **Deposit Amount** = SUM(deposit_amount) from summary
4. **Deposit Cases** = SUM(deposit_cases) from summary
5. **Withdraw Amount** = SUM(withdraw_amount) from summary
6. **Withdraw Cases** = SUM(withdraw_cases) from summary
7. **Add Transaction** = SUM(add_transaction) from summary
8. **Deduct Transaction** = SUM(deduct_transaction) from summary
9. **Gross Gaming Revenue (GGR)** = Deposit Amount - Withdraw Amount
10. **Net Profit** = (Deposit Amount + Add Transaction) - (Withdraw Amount + Deduct Transaction)
11. **ATV** = Deposit Amount / Deposit Cases (if depositCases > 0)
12. **GGR User** = Net Profit / Active Member (if activeMember > 0)
13. **DA User** = Deposit Amount / Active Member (if activeMember > 0)
14. **Purchase Frequency** = Deposit Cases / Active Member (if activeMember > 0)

### **Per-Brand KPIs (Same calculation, filtered by brand/line):**
- Semua calculation sama, tapi difilter per `line` (brand)

### **Difference & Percentage Change:**
- **Difference (B-A)** = periodB.KPI - periodA.KPI
- **Percentage Change (%)** = ((periodB.KPI - periodA.KPI) / periodA.KPI) * 100 (if periodA.KPI !== 0)

---

## 🎨 UI COMPONENTS

### **1. Subheader (Custom):**
- **Period A** date picker (custom input dengan popup)
- **Period B** date picker (custom input dengan popup)
- **Search** button (trigger data fetch)

### **2. StatCards (`ComparisonStatCard`):**
- Display: Period A value | Period B value
- Additional KPI: Compare (B-A) difference
- Comparison: Percentage change (B-A) with color coding
- Total: 6 cards in one row

### **3. Charts:**
- **BarChart** (4 charts):
  - Active Member Comparison
  - Deposit Cases Comparison
  - GGR User Comparison
  - DA User Comparison
- **LineChart** (4 charts):
  - Deposit Amount Trend
  - Net Profit Trend
  - ATV Trend
  - Purchase Frequency Trend

### **4. Table:**
- **37 columns** dengan sticky "Brand/Line" column
- **Rows**: One per brand + TOTAL row
- **Clickable cells**: "Count" cells (Period A & B) → Opens customer detail modal
- **Color coding**: Green for positive diff/%, Red for negative diff/%
- **Export button**: CSV export

### **5. Customer Detail Modal:**
- Opens when clicking "Count" cell
- Shows customer list for selected brand & period
- Pagination support
- Uses `/api/usc-brand-performance-trends/customer-details`

---

## 🔍 KEY FEATURES

### **1. Period Selection:**
- Default: Last 7 days (Period B), Previous month same window (Period A)
- Custom: User can select any date range via date pickers
- Auto-calculation: Period A auto-calculated from Period B (previous month, same day range)

### **2. Brand Filtering:**
- Admin: Sees ALL brands from database
- Squad Lead: Sees only their allowed brands (from `x-user-allowed-brands` header)
- Brand availability: Only shows brands with data in Period A OR Period B (union)

### **3. Data Formatting:**
- Uses `formatKPIValue()` from `brandPerformanceTrendsLogic.tsx`
- Currency: `USD` for USC
- Format types: `currency`, `count`, `percentage`, `decimal`
- Abbreviation: K (thousand), M (million) untuk large values

### **4. Export:**
- CSV format
- Includes all table columns
- Filename: `brand_performance_trends_usc_{periodBEnd}.csv`

### **5. Customer Drill-Down:**
- Click "Count" cell → Opens modal with customer list
- Filtered by brand & period
- Sorted by Net Profit (descending)
- Pagination: 50 customers per page

---

## 🐛 POTENTIAL ISSUES / AREAS FOR OPTIMIZATION

### **1. Performance:**
- API calls multiple brands sequentially (could be optimized with parallel batch)
- Chart data preparation loops through all brands
- Table rendering 37 columns could be slow for many brands

### **2. Data Consistency:**
- Uses `blue_whale_usc_summary` for aggregates BUT also queries `blue_whale_usc` for activeMember
- Possible mismatch if summary table not synced

### **3. Error Handling:**
- Basic error display, no retry mechanism
- No loading states for individual components

### **4. UI/UX:**
- Large table might need virtualization for many brands
- Date pickers are custom (not using standard component)
- No export progress indicator

### **5. Code Organization:**
- Large single file (1,669 lines) - could be split into smaller components
- Formatting logic duplicated (local functions + logic file)

---

## 📝 NOTES

- **Currency Lock**: USC (hardcoded in all queries)
- **Period Calculation**: Period A = Previous month, same day range as Period B
- **Brand Availability**: Union of Period A & Period B (brands with data in either period)
- **Active Member**: Defined as users with `deposit_cases > 0`
- **Table GGR**: Uses `grossGamingRevenue` (deposit_amount - withdraw_amount), NOT `netProfit`
- **Win Rate**: Calculated as `((depositAmount - withdrawAmount) / depositAmount) * 100`

---

**Generated**: 2025-01-28
**Page Path**: `/usc/brand-performance-trends`
**API Base**: `/api/usc-brand-performance-trends/`

