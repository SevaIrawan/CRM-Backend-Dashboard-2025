# CBO DEPARTMENT - FRONTEND FRAMEWORK STANDARD v1.0.0

> **Based on:** NEXMAX Dashboard Best Practices  
> **Purpose:** Universal standard untuk semua dashboard projects di CBO Department  
> **Last Updated:** October 25, 2025  
> **Status:** Draft for Review

---

## 📑 TABLE OF CONTENTS

1. [Project Structure](#1-project-structure)
2. [Page Hierarchy](#2-page-hierarchy)
3. [Component Architecture](#3-component-architecture)
4. [Naming Conventions](#4-naming-conventions)
5. [File Organization](#5-file-organization)
6. [Layout System](#6-layout-system)
7. [Component Standards](#7-component-standards)
8. [API Architecture](#8-api-architecture)
9. [Styling System](#9-styling-system)
10. [Icon System](#10-icon-system)
11. [Format Helpers](#11-format-helpers)
12. [Data Flow](#12-data-flow)
13. [Best Practices](#13-best-practices)

---

## 1. PROJECT STRUCTURE

### 1.1 Standard Next.js App Router Structure

```
project-root/
├── app/                      # Next.js App Router (pages & API routes)
│   ├── api/                  # API routes
│   ├── [category]/           # Category-based pages (multi-level)
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   └── globals.css           # Global styles
├── components/               # Reusable UI components
│   ├── Layout.tsx
│   ├── Frame.tsx
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── SubHeader.tsx
│   ├── StatCard.tsx
│   ├── LineChart.tsx
│   ├── BarChart.tsx
│   └── slicers/              # Slicer components
├── lib/                      # Business logic & helpers
│   ├── CentralIcon.tsx
│   ├── formatHelpers.ts
│   ├── kpiHelpers.ts
│   └── [category]Logic.ts
├── utils/                    # Generic utilities
│   ├── centralLogic.ts
│   ├── rolePermissions.ts
│   └── sessionCleanup.ts
├── styles/                   # Additional stylesheets
├── public/                   # Static assets
├── docs/                     # Documentation
└── package.json
```

### 1.2 Key Principles

✅ **Separation of Concerns:**
- `app/` - Pages & routing
- `components/` - UI components only
- `lib/` - Business logic & calculations
- `utils/` - Generic helper functions

✅ **Colocation:**
- API routes colocated with pages (`app/api/`)
- Component-specific styles inline or in component file
- Page-specific layouts in page folder

---

## 2. PAGE HIERARCHY

### 2.1 Standard Page Structure

```
Category Level (Optional)
└── Feature Pages
    ├── Overview
    ├── Reports
    ├── Analytics
    └── Monitoring
```

### 2.2 Multi-Category Architecture

**Example: Financial Dashboard**
```
app/
├── myr/                      # Malaysian Ringgit category
│   ├── overview/
│   ├── business-performance/
│   └── member-report/
├── sgd/                      # Singapore Dollar category
│   ├── overview/
│   └── business-performance/
└── usc/                      # US Cent category
    ├── overview/
    └── member-analytic/
```

**Generalized Pattern:**
```
app/
├── [category-a]/             # Category A
│   ├── [feature-1]/
│   ├── [feature-2]/
│   └── page.tsx              # Category landing page
├── [category-b]/             # Category B
│   ├── [feature-1]/
│   └── [feature-3]/
└── dashboard/                # Main dashboard
    └── page.tsx
```

### 2.3 Page Types

| **Type** | **Purpose** | **Typical Components** |
|----------|-------------|------------------------|
| **Overview** | High-level summary | 6 KPI cards + 6 charts |
| **Report** | Detailed data tables | 3-4 KPI cards + table + export |
| **Analytics** | Deep-dive analysis | 2 KPI cards + multiple charts |
| **Monitor** | Real-time tracking | 6 KPI cards + status tables |
| **Comparison** | Side-by-side analysis | Comparison cards + charts |

---

## 3. COMPONENT ARCHITECTURE

### 3.1 Component Hierarchy

```
Layout (Root)
└── AccessControl (Auth wrapper)
    └── ActivityTracker (User tracking)
        ├── Sidebar (Navigation)
        ├── Header (Top bar)
        ├── SubHeader (Filters/Slicers) - Optional
        └── Main Content
            └── Frame (Content wrapper)
                └── Page Content
                    ├── KPI Row (StatCards)
                    ├── Chart Row 1
                    ├── Chart Row 2
                    └── Additional Rows
```

### 3.2 Component Categories

**1. Layout Components**
- `Layout.tsx` - Main wrapper with sidebar & header
- `Frame.tsx` - Content container with variants
- `Header.tsx` - Top navigation bar
- `Sidebar.tsx` - Side navigation menu
- `SubHeader.tsx` - Filter/slicer bar

**2. KPI Card Components**
- `StatCard.tsx` - Standard single value card
- `ComparisonStatCard.tsx` - Two-period comparison
- `DualKPICard.tsx` - Two metrics in one card
- `ProgressBarStatCard.tsx` - Progress towards target

**3. Chart Components**
- `LineChart.tsx` - Trend visualization
- `BarChart.tsx` - Comparison visualization
- `StackedBarChart.tsx` - Multi-series bars
- `DonutChart.tsx` - Percentage distribution
- `SankeyChart.tsx` - Flow diagram

**4. Slicer Components** (`components/slicers/`)
- `YearSlicer.tsx` - Year selection
- `MonthSlicer.tsx` - Month selection
- `LineSlicer.tsx` - Category/line selection
- `QuarterSlicer.tsx` - Quarter selection
- `DateRangeSlicer.tsx` - Custom date range

**5. Modal Components**
- `CustomerDetailModal.tsx` - Detail drill-down
- `ChartZoomModal.tsx` - Chart enlargement
- `TargetEditModal.tsx` - Target editing

**6. Utility Components**
- `AccessControl.tsx` - Role-based access
- `ActivityTracker.tsx` - User activity logging
- `PageTransition.tsx` - Smooth page transitions
- `SkeletonLoader.tsx` - Loading states

---

## 4. NAMING CONVENTIONS

### 4.1 File Naming

**Pages:**
```
page.tsx          ✅ Next.js convention for pages
layout.tsx        ✅ Next.js convention for layouts
route.ts          ✅ Next.js convention for API routes
```

**Components:**
```
ComponentName.tsx ✅ PascalCase for React components
StatCard.tsx
LineChart.tsx
YearSlicer.tsx
```

**Helpers & Utils:**
```
helperName.ts     ✅ camelCase for non-component files
formatHelpers.ts
kpiHelpers.ts
centralLogic.ts
```

**Styles:**
```
globals.css       ✅ Global styles
component.css     ✅ Component-specific styles
table-styles.css  ✅ kebab-case untuk CSS files
```

### 4.2 Folder Naming

**Pages/Routes:**
```
kebab-case        ✅ Standard for URLs
/business-performance/
/member-report/
/auto-approval-monitor/
```

**Components:**
```
PascalCase or kebab-case
/components/StatCard.tsx    ✅
/components/slicers/        ✅ lowercase for groups
```

### 4.3 Variable Naming

**React State:**
```typescript
const [isLoading, setIsLoading] = useState(false)     ✅ camelCase with descriptive names
const [kpiData, setKpiData] = useState(null)          ✅
const [selectedYear, setSelectedYear] = useState('')  ✅
```

**Props:**
```typescript
interface StatCardProps {
  title: string              ✅ camelCase
  value: string | number     ✅
  icon?: string              ✅
  additionalKpi?: object     ✅
}
```

**Functions:**
```typescript
const loadKPIData = async () => {}        ✅ camelCase, descriptive
const handleMenuClick = (path) => {}      ✅ handle prefix for event handlers
const formatCurrencyKPI = (value) => {}   ✅
```

### 4.4 Component Naming Patterns

**Pattern 1: Feature-based**
```
CustomerDetailModal.tsx    ✅ {Feature}{Type}
YearSlicer.tsx            ✅ {Feature}{Type}
StatCard.tsx              ✅ {Purpose}{Type}
```

**Pattern 2: Type-based**
```
LineChart.tsx             ✅ {Type}Chart
BarChart.tsx              ✅ {Type}Chart
DonutChart.tsx            ✅ {Type}Chart
```

---

## 5. FILE ORGANIZATION

### 5.1 Components Directory

```
components/
├── Layout.tsx                # Main layout wrapper
├── Frame.tsx                 # Content frame
├── Header.tsx                # Top header
├── Sidebar.tsx               # Side navigation
├── SubHeader.tsx             # Filter bar
├── StatCard.tsx              # Standard KPI card
├── ComparisonStatCard.tsx    # Comparison card
├── DualKPICard.tsx           # Dual metric card
├── ProgressBarStatCard.tsx   # Progress card
├── LineChart.tsx             # Line chart
├── BarChart.tsx              # Bar chart
├── StackedBarChart.tsx       # Stacked bar
├── SankeyChart.tsx           # Sankey diagram
├── slicers/                  # Slicer components group
│   ├── index.ts              # Export all slicers
│   ├── YearSlicer.tsx
│   ├── MonthSlicer.tsx
│   ├── LineSlicer.tsx
│   ├── QuarterSlicer.tsx
│   └── DateRangeSlicer.tsx
├── CustomerDetailModal.tsx
├── ChartZoomModal.tsx
├── AccessControl.tsx
├── ActivityTracker.tsx
└── Icons.tsx                 # Legacy (use CentralIcon instead)
```

**Rules:**
- ✅ One component per file
- ✅ Component name = File name
- ✅ Group related components in subfolders
- ✅ Use `index.ts` for clean exports

### 5.2 Lib Directory (Business Logic)

```
lib/
├── CentralIcon.tsx           # Icon system
├── formatHelpers.ts          # Number formatting
├── kpiHelpers.ts             # KPI calculations
├── supabase.ts               # Database client
├── [Category]Logic.ts        # Category-specific logic
├── [Category]DailyAverageAndMoM.ts  # Daily avg & MoM logic
└── [Feature]Helper.ts        # Feature-specific helpers
```

**Rules:**
- ✅ Business logic ONLY (no UI)
- ✅ Reusable functions
- ✅ Category-specific logic in separate files
- ✅ Export individual functions (not default export)

### 5.3 Utils Directory (Generic Utilities)

```
utils/
├── centralLogic.ts           # Central utility functions
├── rolePermissions.ts        # RBAC utilities
├── sessionCleanup.ts         # Session management
└── pageVisibilityHelper.ts   # Page visibility utils
```

**Rules:**
- ✅ Generic, framework-agnostic functions
- ✅ No business logic
- ✅ Reusable across projects

### 5.4 App Directory (Pages & API)

```
app/
├── api/                                    # API routes
│   ├── [category]-[feature]/              # Feature APIs
│   │   ├── slicer-options/
│   │   │   └── route.ts                   # GET slicer data
│   │   ├── chart-data/
│   │   │   └── route.ts                   # GET chart data
│   │   ├── data/
│   │   │   └── route.ts                   # GET table data
│   │   └── export/
│   │       └── route.ts                   # GET export CSV
│   └── feedback/
│       └── submit/
│           └── route.ts
├── [category]/                            # Category pages
│   ├── [feature]/
│   │   ├── page.tsx                       # Feature page
│   │   └── layout.tsx                     # Feature layout (optional)
│   └── page.tsx                           # Category landing
├── dashboard/
│   └── page.tsx                           # Main dashboard
├── layout.tsx                             # Root layout
├── page.tsx                               # Home page
└── globals.css                            # Global styles
```

**API Route Pattern:**
```
/api/{category}-{feature}/{endpoint}/route.ts
```

**Examples:**
```
/api/myr-overview/slicer-options/route.ts
/api/sgd-business-performance/data/route.ts
/api/usc-member-analytic/chart-data/route.ts
```

---

## 6. LAYOUT SYSTEM

### 6.1 Standard Layout Structure

```tsx
<Layout customSubHeader={customSubHeader}>
  <Frame variant="standard">
    {/* Page Content */}
  </Frame>
</Layout>
```

### 6.2 Layout Component Props

```typescript
interface LayoutProps {
  children: React.ReactNode
  pageTitle?: string              // Dynamic page title
  subHeaderTitle?: string         // SubHeader title
  customSubHeader?: React.ReactNode  // Custom slicer bar
  darkMode?: boolean              // Dark mode toggle
  onToggleDarkMode?: () => void
  onLogout?: () => void
  sidebarExpanded?: boolean       // Sidebar state
}
```

### 6.3 Frame Variants

```typescript
// Standard frame (default)
<Frame variant="standard">
  {/* 3-row minimum layout */}
</Frame>

// Compact frame (less padding)
<Frame variant="compact">
  {/* Tighter spacing */}
</Frame>

// Full-width frame
<Frame variant="full">
  {/* No margin */}
</Frame>
```

### 6.4 Layout Dimensions

| **Element** | **Dimension** | **Behavior** |
|-------------|---------------|--------------|
| **Sidebar** | 280px expanded / 100px collapsed | Fixed position, left |
| **Header** | 70px height | Fixed position, top |
| **SubHeader** | 60px height | Fixed position, below header |
| **Content** | `margin-left: 280px` (auto-adjust) | Scrollable |
| **Frame** | `height: calc(100vh - 130px)` | Vertical scroll only |

### 6.5 SubHeader Pattern

```tsx
const customSubHeader = (
  <div className="dashboard-subheader">
    <div className="subheader-controls">
      {/* Slicer Group 1 */}
      <div className="slicer-group">
        <label className="slicer-label">YEAR:</label>
        <YearSlicer 
          years={slicerOptions?.years || []}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      </div>
      
      {/* Slicer Group 2 */}
      <div className="slicer-group">
        <label className="slicer-label">MONTH:</label>
        <MonthSlicer 
          months={slicerOptions?.months || []}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      </div>
    </div>
  </div>
)
```

---

## 7. COMPONENT STANDARDS

### 7.1 StatCard Standard

**Basic Usage:**
```tsx
<StatCard
  title="DEPOSIT AMOUNT"
  value={formatCurrencyKPI(kpiData?.depositAmount || 0, 'MYR')}
  icon="Deposit Amount"
  additionalKpi={{
    label: "DAILY AVERAGE",
    value: formatCurrencyKPI(dailyAverages.depositAmount, 'MYR')
  }}
  comparison={{
    percentage: formatMoMChange(momData?.depositAmount || 0),
    isPositive: Boolean(momData?.depositAmount && momData.depositAmount > 0)
  }}
/>
```

**Props Interface:**
```typescript
interface StatCardProps {
  title: string                    // UPPERCASE recommended
  value: string | number           // Main value (formatted)
  icon?: string                    // Icon name from CentralIcon
  additionalKpi?: {                // Daily Average / Secondary metric
    label: string
    value: string | number
    isPositive?: boolean
  }
  comparison?: {                   // MoM comparison
    percentage: string             // "+5.67%" or "-3.21%"
    isPositive: boolean
    text?: string                  // Default: "MoM"
  }
  onClick?: () => void            // Drill-down handler
  clickable?: boolean             // Enable click behavior
}
```

**Grid Layout:**
```tsx
{/* 6 KPI Cards in 1 Row */}
<div className="kpi-row" style={{ 
  gridTemplateColumns: 'repeat(6, 1fr)' 
}}>
  <StatCard {...kpi1} />
  <StatCard {...kpi2} />
  <StatCard {...kpi3} />
  <StatCard {...kpi4} />
  <StatCard {...kpi5} />
  <StatCard {...kpi6} />
</div>
```

### 7.2 Chart Standards

**LineChart Usage:**
```tsx
<LineChart
  series={[{ 
    name: 'Deposit Amount', 
    data: monthlyData.map(m => m.depositAmount) 
  }]}
  categories={months.map(m => m.substring(0, 3))}
  title="DEPOSIT AMOUNT TREND"
  currency="MYR"
  chartIcon={getChartIcon('Deposit Amount')}
  hideLegend={true}  // For single-line charts
/>
```

**Dual-Line Chart:**
```tsx
<LineChart
  series={[
    { name: 'Active Member', data: [...] },
    { name: 'Purchase Frequency', data: [...] }
  ]}
  categories={months}
  title="ACTIVE MEMBER & PURCHASE FREQUENCY"
  chartIcon={getChartIcon('Active Member')}
  // Legend automatically shown for multi-series
/>
```

**BarChart Usage:**
```tsx
<BarChart
  series={[{ 
    name: 'Deposit Cases', 
    data: monthlyData.map(m => m.depositCases) 
  }]}
  categories={months}
  title="DEPOSIT CASES TREND"
  currency="CASES"
  chartIcon={getChartIcon('deposits')}
/>
```

**Chart Grid Layout:**
```tsx
{/* 3 Charts per Row */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
  <LineChart {...chart1} />
  <LineChart {...chart2} />
  <BarChart {...chart3} />
</div>
```

### 7.3 Chart Configuration Standards

**Colors:**
- Single series: `#3B82F6` (Blue)
- Dual series: `#3B82F6` (Blue), `#F97316` (Orange)
- Positive: `#059669` (Green)
- Negative: `#dc2626` (Red)

**Height:**
- Default: `350px`
- Compact: `300px`
- Expanded: `400px`

**Tooltip:**
```typescript
tooltip: {
  mode: 'index',
  intersect: false,
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  borderColor: 'transparent',
  titleColor: '#fff',
  bodyColor: '#fff'
}
```

### 7.4 Slicer Standards

**Basic Slicer:**
```tsx
<div className="slicer-group">
  <label className="slicer-label">YEAR:</label>
  <select
    value={selectedYear}
    onChange={(e) => setSelectedYear(e.target.value)}
    className="subheader-select"
  >
    {years.map(year => (
      <option key={year} value={year}>{year}</option>
    ))}
  </select>
</div>
```

**Component-based Slicer:**
```tsx
import { YearSlicer, MonthSlicer, LineSlicer } from '@/components/slicers'

<YearSlicer 
  years={years}
  selectedYear={selectedYear}
  onYearChange={setSelectedYear}
/>
```

---

## 8. API ARCHITECTURE

### 8.1 API Route Pattern

**Standard Structure:**
```
/api/{category}-{feature}/{endpoint}/route.ts
```

**Example:**
```
/api/myr-overview/slicer-options/route.ts
/api/myr-overview/chart-data/route.ts
/api/sgd-business-performance/data/route.ts
/api/usc-member-analytic/kpi-data/route.ts
```

### 8.2 Slicer Options API

**Purpose:** Provide filter options (years, months, categories, etc.)

**Route:** `/api/{category}-{feature}/slicer-options/route.ts`

**Response Format:**
```typescript
{
  success: true,
  data: {
    categories: ['Category A', 'Category B', 'ALL'],
    years: ['2025', '2024', '2023'],
    months: [
      { value: '1', label: 'January', years: ['2025', '2024'] },
      { value: '2', label: 'February', years: ['2025', '2024'] },
      // ...
    ],
    defaults: {
      category: 'ALL',
      year: '2025',
      month: '10'
    }
  }
}
```

**Implementation Pattern:**
```typescript
export async function GET(request: NextRequest) {
  try {
    // 1. Fetch distinct values from database
    const { data: categories } = await supabase
      .from('table_name')
      .select('category')
      .distinct()
    
    // 2. Build month-year mapping for dynamic filtering
    const monthYearMap = buildMonthYearMapping(rawData)
    
    // 3. Determine defaults (usually latest data)
    const defaults = {
      category: 'ALL',
      year: getLatestYear(data),
      month: getLatestMonth(data)
    }
    
    // 4. Return structured response
    return NextResponse.json({
      success: true,
      data: { categories, years, months, defaults }
    })
  } catch (error) {
    console.error('Slicer options error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load slicer options' },
      { status: 500 }
    )
  }
}
```

### 8.3 Chart Data API

**Purpose:** Provide time-series data for charts

**Route:** `/api/{category}-{feature}/chart-data/route.ts`

**Query Parameters:**
```
?year=2025&category=ALL
```

**Response Format:**
```typescript
{
  success: true,
  data: {
    months: ['Jan', 'Feb', 'Mar', ...],
    series: {
      depositAmount: [100000, 120000, 115000, ...],
      withdrawAmount: [80000, 95000, 90000, ...],
      activeMember: [5000, 5200, 5100, ...]
    }
  }
}
```

### 8.4 KPI Data API

**Purpose:** Provide KPI values for current period

**Route:** `/api/{category}-{feature}/kpi-data/route.ts`

**Query Parameters:**
```
?year=2025&month=10&category=ALL
```

**Response Format:**
```typescript
{
  success: true,
  data: {
    current: {
      depositAmount: 1250000,
      withdrawAmount: 980000,
      activeMember: 5200,
      // ... all KPIs
    },
    mom: {
      depositAmount: 5.67,    // +5.67%
      withdrawAmount: -2.34,  // -2.34%
      activeMember: 3.12      // +3.12%
    },
    dailyAverage: {
      depositAmount: 50000,
      withdrawAmount: 39200,
      activeMember: 208
    }
  }
}
```

### 8.5 Export API

**Purpose:** Generate CSV export

**Route:** `/api/{category}-{feature}/export/route.ts`

**Query Parameters:**
```
?year=2025&month=10&category=ALL
```

**Response:**
```typescript
// Set CSV headers
const headers = new Headers()
headers.set('Content-Type', 'text/csv')
headers.set('Content-Disposition', 'attachment; filename="export.csv"')

return new Response(csvContent, { headers })
```

---

## 9. STYLING SYSTEM

### 9.1 Global CSS Organization

**File:** `app/globals.css`

**Structure:**
```css
/* 1. Reset & Base Styles */
/* 2. Layout System */
/* 3. Component Base Classes */
/* 4. Utility Classes */
/* 5. Responsive Breakpoints */
```

### 9.2 Centralized Spacing

**Standard Gap:** `18px` for all elements

```css
.standard-frame,
.kpi-row,
.charts-row,
.chart-grid {
  gap: 18px;
}
```

**Standard Padding:**
```css
.standard-frame {
  padding: 20px;
}

.stat-card {
  padding: 16px;
}
```

### 9.3 Component Base Classes

**StatCard:**
```css
.stat-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 16px;
  height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

**Chart Container:**
```css
.chart-container {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 24px;
  min-height: 350px;
  transition: all 0.2s ease;
}

.chart-container:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
```

### 9.4 Color Palette

```css
/* Primary Colors */
--color-primary: #3B82F6;        /* Blue */
--color-secondary: #F97316;      /* Orange */

/* Status Colors */
--color-success: #059669;        /* Green */
--color-danger: #dc2626;         /* Red */
--color-warning: #f59e0b;        /* Yellow */
--color-info: #3b82f6;           /* Blue */

/* Neutral Colors */
--color-text-primary: #374151;   /* Dark gray */
--color-text-secondary: #6b7280; /* Medium gray */
--color-border: #e5e7eb;         /* Light gray */
--color-background: #f8f9fa;     /* Off-white */
```

### 9.5 Typography System

```css
/* Heading Sizes */
h1 { font-size: 28px; font-weight: 700; }
h2 { font-size: 22px; font-weight: 600; }
h3 { font-size: 16px; font-weight: 600; }

/* StatCard Typography */
.stat-card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; }
.stat-card-value { font-size: 28px; font-weight: 700; }
.additional-kpi-label { font-size: 11px; }
.additional-kpi-value { font-size: 11px; font-weight: 600; }

/* Slicer Typography */
.slicer-label { font-size: 12px; font-weight: 500; text-transform: uppercase; }
.subheader-select { font-size: 14px; }
```

### 9.6 Grid System

**KPI Row (6 columns):**
```css
.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}
```

**Chart Row (3 columns):**
```css
.charts-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}
```

**Chart Row (2 columns):**
```css
.charts-row-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}
```

---

## 10. ICON SYSTEM

### 10.1 CentralIcon System

**File:** `lib/CentralIcon.tsx`

**Purpose:** Centralized SVG icon management

### 10.2 Using Icons

**In StatCard:**
```tsx
<StatCard
  title="DEPOSIT AMOUNT"
  icon="Deposit Amount"  // Icon name lookup
  // ...
/>
```

**In Chart:**
```tsx
import { getChartIcon } from '@/lib/CentralIcon'

<LineChart
  title="DEPOSIT AMOUNT TREND"
  chartIcon={getChartIcon('Deposit Amount')}
  // ...
/>
```

### 10.3 Icon Naming Convention

**Function:** `getKpiIcon(name: string)`

**Mappings:**
```typescript
'Deposit Amount' → depositAmount icon
'Withdraw Amount' → withdrawAmount icon
'Active Member' → activeMember icon
'Net Profit' → netProfit icon
// etc.
```

### 10.4 Adding New Icons

**Step 1:** Add SVG to `KPI_ICONS` object
```typescript
export const KPI_ICONS = {
  newKpiName: `<svg>...</svg>`
}
```

**Step 2:** Add mapping in `getKpiIcon()`
```typescript
export function getKpiIcon(kpiName: string): string {
  const iconMap = {
    'New KPI Name': KPI_ICONS.newKpiName,
    // ...
  }
  return iconMap[kpiName] || KPI_ICONS.depositAmount
}
```

### 10.5 Icon Standards

- **Size:** 20x20px standard
- **Format:** SVG only
- **Source:** FontAwesome Pro recommended
- **ViewBox:** `0 0 640 640` for consistency
- **Color:** `currentColor` for dynamic coloring

---

## 11. FORMAT HELPERS

### 11.1 Standard Functions

**File:** `lib/formatHelpers.ts`

### 11.2 Currency Formatting

```typescript
formatCurrencyKPI(value: number, currency: string): string

// Usage
formatCurrencyKPI(1234567.89, 'MYR')  // "RM 1,234,567.89"
formatCurrencyKPI(1234567.89, 'SGD')  // "SGD 1,234,567.89"
formatCurrencyKPI(1234567.89, 'USC')  // "USD 1,234,567.89"
```

**Format:** `{SYMBOL} {SIGN}{0,000.00}`
- 2 decimal places
- Thousand separators
- Currency symbol prefix
- Negative sign handling

### 11.3 Numeric Formatting

```typescript
formatNumericKPI(value: number): string

// Usage
formatNumericKPI(1234.567)  // "1,234.57"
```

**Format:** `0,000.00`
- 2 decimal places
- Thousand separators
- No currency symbol

### 11.4 Integer Formatting

```typescript
formatIntegerKPI(value: number): string

// Usage
formatIntegerKPI(12345)  // "12,345"
```

**Format:** `0,000`
- No decimal places
- Thousand separators
- Auto-rounds value

### 11.5 Percentage Formatting

```typescript
formatPercentageKPI(value: number): string

// Usage
formatPercentageKPI(12.345)  // "12.35%"
```

**Format:** `0.00%`
- 2 decimal places
- Percentage symbol

### 11.6 MoM Change Formatting

```typescript
formatMoMChange(value: number): string

// Usage
formatMoMChange(5.67)   // "+5.67%"
formatMoMChange(-3.21)  // "-3.21%"
formatMoMChange(0)      // "0.00%"
```

**Format:** `+0.00%` or `-0.00%`
- Includes sign (+/-)
- 2 decimal places
- Percentage symbol

### 11.7 Usage Guide

| **KPI Type** | **Function** | **Example Input** | **Example Output** |
|--------------|--------------|-------------------|-------------------|
| Currency values | `formatCurrencyKPI()` | 1234567.89, 'MYR' | RM 1,234,567.89 |
| Numeric values | `formatNumericKPI()` | 1234.567 | 1,234.57 |
| Counts/Cases | `formatIntegerKPI()` | 12345 | 12,345 |
| Rates | `formatPercentageKPI()` | 12.345 | 12.35% |
| MoM changes | `formatMoMChange()` | 5.67 | +5.67% |

---

## 12. DATA FLOW

### 12.1 Standard Data Flow Pattern

```
User Interaction
    ↓
State Update (useState)
    ↓
useEffect Triggered
    ↓
API Call (fetch)
    ↓
Response Processing
    ↓
State Update
    ↓
UI Re-render
```

### 12.2 Page Data Loading Pattern

```typescript
'use client'

export default function FeaturePage() {
  // 1. STATE MANAGEMENT
  const [slicerOptions, setSlicerOptions] = useState(null)
  const [kpiData, setKpiData] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  // 2. HYDRATION FIX
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // 3. LOAD SLICER OPTIONS (on mount)
  useEffect(() => {
    const loadSlicerOptions = async () => {
      const response = await fetch('/api/category-feature/slicer-options')
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.data)
        setSelectedYear(result.data.defaults.year)
        setSelectedMonth(result.data.defaults.month)
      }
    }
    loadSlicerOptions()
  }, [])
  
  // 4. LOAD KPI DATA (when filters change)
  useEffect(() => {
    if (!selectedYear || !selectedMonth) return
    
    const loadKPIData = async () => {
      setIsLoading(true)
      const response = await fetch(
        `/api/category-feature/kpi-data?year=${selectedYear}&month=${selectedMonth}`
      )
      const result = await response.json()
      
      if (result.success) {
        setKpiData(result.data.current)
        setMomData(result.data.mom)
        setDailyAverages(result.data.dailyAverage)
      }
      setIsLoading(false)
    }
    
    loadKPIData()
  }, [selectedYear, selectedMonth])
  
  // 5. LOAD CHART DATA (when year changes)
  useEffect(() => {
    if (!selectedYear) return
    
    const loadChartData = async () => {
      const response = await fetch(
        `/api/category-feature/chart-data?year=${selectedYear}`
      )
      const result = await response.json()
      
      if (result.success) {
        setChartData(result.data)
      }
    }
    
    loadChartData()
  }, [selectedYear])
  
  // 6. LOADING STATE
  if (!isMounted || isLoading) {
    return <SkeletonLoader />
  }
  
  // 7. RENDER
  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="standard">
        {/* KPI Cards */}
        {/* Charts */}
      </Frame>
    </Layout>
  )
}
```

### 12.3 API Data Flow

```
Client Request
    ↓
Next.js API Route (/api/*/route.ts)
    ↓
Supabase Query
    ↓
Data Processing (calculations, formatting)
    ↓
JSON Response
    ↓
Client Receives Data
    ↓
State Update
    ↓
UI Render
```

---

## 13. BEST PRACTICES

### 13.1 Component Design

✅ **DO:**
- Keep components small and focused (single responsibility)
- Use TypeScript for prop interfaces
- Implement proper error boundaries
- Use loading states for async operations
- Memoize expensive calculations with `useMemo`
- Use `useCallback` for event handlers passed to children

❌ **DON'T:**
- Mix business logic with UI components
- Use inline styles (use classes)
- Create deeply nested components (max 3-4 levels)
- Ignore accessibility (add ARIA labels)

### 13.2 State Management

✅ **DO:**
- Use `useState` for component-local state
- Lift state up when shared between siblings
- Use `useEffect` with proper dependencies
- Clean up effects (return cleanup function)

❌ **DON'T:**
- Overuse global state (keep it local when possible)
- Mutate state directly (always use setState)
- Create infinite loops (missing dependencies)
- Fetch data in render function

### 13.3 API Design

✅ **DO:**
- Use consistent endpoint naming
- Return structured JSON responses (`{ success, data, error }`)
- Implement proper error handling
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Add request validation

❌ **DON'T:**
- Return raw database rows (process first)
- Expose sensitive data
- Skip error handling
- Use blocking operations

### 13.4 Performance

✅ **DO:**
- Use dynamic imports for large components
- Implement pagination for large datasets
- Optimize images (use Next.js Image)
- Minimize bundle size
- Use React.memo for expensive renders

❌ **DON'T:**
- Load all data at once (use lazy loading)
- Re-render unnecessarily
- Block the main thread
- Ignore bundle analysis

### 13.5 Code Quality

✅ **DO:**
- Write self-documenting code (clear names)
- Add comments for complex logic
- Use consistent formatting (Prettier)
- Follow ESLint rules
- Write reusable functions

❌ **DON'T:**
- Use magic numbers (define constants)
- Write duplicate code (DRY principle)
- Ignore TypeScript errors
- Skip code reviews

### 13.6 Security

✅ **DO:**
- Validate all user inputs
- Use environment variables for secrets
- Implement role-based access control
- Sanitize data before display
- Use HTTPS only

❌ **DON'T:**
- Store secrets in code
- Trust client-side validation only
- Expose API keys
- Skip authentication checks

### 13.7 Testing (Future Implementation)

**Recommended Testing Stack:**
- Unit Tests: Jest + React Testing Library
- E2E Tests: Playwright
- Component Tests: Storybook
- Target Coverage: 70%+

**Priority Areas:**
1. Format helpers (100% coverage)
2. Business logic functions
3. API routes
4. Critical user flows

---

## 14. MIGRATION CHECKLIST

### 14.1 New Dashboard Project Setup

**Step 1: Initialize Project**
```bash
npx create-next-app@latest project-name --typescript --tailwind --app
cd project-name
```

**Step 2: Install Dependencies**
```bash
npm install chart.js react-chartjs-2 recharts
npm install @supabase/supabase-js
npm install date-fns
```

**Step 3: Copy Standard Files**
```
Copy from reference project:
- app/globals.css
- lib/CentralIcon.tsx
- lib/formatHelpers.ts
- lib/kpiHelpers.ts
- components/Layout.tsx
- components/Frame.tsx
- components/Header.tsx
- components/Sidebar.tsx
- components/StatCard.tsx
- components/LineChart.tsx
- components/BarChart.tsx
```

**Step 4: Setup Database Connection**
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Step 5: Create First Page**
- Follow page structure standard
- Use standard components
- Implement API routes
- Test data flow

### 14.2 Component Adoption Checklist

For each new page:
- [ ] Use Layout component
- [ ] Use Frame component
- [ ] Implement SubHeader with slicers
- [ ] Use StatCard for KPIs
- [ ] Use standard Chart components
- [ ] Follow naming conventions
- [ ] Implement API routes
- [ ] Use format helpers
- [ ] Add loading states
- [ ] Test responsive behavior

---

## 15. GLOSSARY

| **Term** | **Definition** |
|----------|----------------|
| **KPI** | Key Performance Indicator - Metric untuk measure performance |
| **MoM** | Month-over-Month - Perbandingan dengan bulan sebelumnya |
| **YoY** | Year-over-Year - Perbandingan dengan tahun sebelumnya |
| **Slicer** | Filter component untuk data exploration |
| **Frame** | Content wrapper component dengan variants |
| **StatCard** | KPI card component untuk display metrics |
| **Daily Average** | Monthly value dibagi active days |
| **Hydration** | Process React attaching to server-rendered HTML |
| **SSR** | Server-Side Rendering |
| **CSR** | Client-Side Rendering |

---

## 16. REFERENCES

### 16.1 Internal Documentation
- NEXMAX Standards Complete Reference
- Dashboard Frontend Framework
- Business Performance Standard
- Auto-Approval Monitor KPI Documentation

### 16.2 External Resources
- Next.js Documentation: https://nextjs.org/docs
- React Documentation: https://react.dev
- Chart.js Documentation: https://www.chartjs.org
- Recharts Documentation: https://recharts.org
- Tailwind CSS: https://tailwindcss.com

### 16.3 Design Systems
- Material Design: https://material.io
- Carbon Design System: https://carbondesignsystem.com
- Ant Design: https://ant.design

---

## 17. CHANGELOG

| **Version** | **Date** | **Changes** | **Author** |
|-------------|----------|-------------|------------|
| 1.0.0 | 2025-10-25 | Initial draft from NEXMAX analysis | AI Assistant |

---

## 18. APPROVAL & SIGN-OFF

**Document Status:** 📝 **DRAFT - PENDING REVIEW**

**Required Approvals:**
- [ ] Tech Lead
- [ ] Senior Developer 1
- [ ] Senior Developer 2
- [ ] CBO Department Manager
- [ ] XOO Department Representative (for integration standards)

**Review Deadline:** [TO BE DETERMINED]

**Next Steps:**
1. Circulate for team review
2. Incorporate feedback
3. Finalize Sub-Task 2-4 documentation
4. Conduct training session
5. Mark Epic as COMPLETE

---

**END OF DOCUMENT**

---

*This document is a living standard and will be updated as the framework evolves. All CBO Department developers must adhere to these standards when building dashboard applications.*

