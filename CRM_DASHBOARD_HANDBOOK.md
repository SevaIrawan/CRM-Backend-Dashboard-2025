# 📘 CRM DASHBOARD HANDBOOK

> **Official Handbook for NEXMAX Dashboard**  
> **Version**: 2.0  
> **Last Updated**: November 7, 2025  
> **Status**: Production Ready

---

# TABLE OF CONTENTS

1. [Introduction](#1-introduction)
2. [Quick Start Guide](#2-quick-start-guide)
3. [Project Architecture](#3-project-architecture)
4. [Database Schema](#4-database-schema)
5. [KPI Reference Guide](#5-kpi-reference-guide)
6. [Component Library](#6-component-library)
7. [Page Development Guide](#7-page-development-guide)
8. [API Development Guide](#8-api-development-guide)
9. [Styling Guide](#9-styling-guide)
10. [Best Practices](#10-best-practices)

---

# 1. INTRODUCTION

## 1.1 About NEXMAX Dashboard

**NEXMAX Dashboard** adalah platform Business Analytics real-time untuk CBO Department yang menyediakan comprehensive insights untuk multi-currency (MYR, SGD, USC) dan multi-brand operations.

**Key Features**:
- ✅ 42 Production Pages (15 MYR, 11 SGD, 9 USC, 4 Admin, 3 Others)
- ✅ 94 API Routes (REST architecture)
- ✅ 55+ KPIs dengan automatic calculations
- ✅ Real-time data dari Supabase PostgreSQL
- ✅ Role-based access control (Admin, Manager, Squad Lead)
- ✅ Activity logging & audit trails
- ✅ Export functionality (CSV)
- ✅ Mobile responsive design

## 1.2 Tech Stack

**Frontend**:
- React 18.x + Next.js 14.x (App Router)
- TypeScript 5.x
- Tailwind CSS 3.x
- Chart.js 4.5 + React-ChartJS-2

**Backend**:
- Next.js API Routes
- Supabase Client 2.38.x
- PostgreSQL (via Supabase)

**Deployment**:
- Platform: Vercel
- Repository: https://github.com/SevaIrawan/CRM-Backend-Dashboard-2025.git

## 1.3 Critical Rules

**🚨 ABSOLUTE REQUIREMENTS**:

1. ❌ **NO DUMMY DATA** - 100% real data dari Supabase
2. ❌ **NO FALLBACK DATA** - Only real data allowed
3. ❌ **NO MOCK DATA** - No test data
4. ❌ **NO HARDCODED VALUES** - Everything from database
5. ✅ **API-FIRST** - Slicers auto-fetch dari database
6. ✅ **CURRENCY LOCK** - MYR/SGD/USC pages lock currency
7. ✅ **UNLIMITED DATA** - No arbitrary limits on data fetch

---

# 2. QUICK START GUIDE

## 2.1 Installation

```bash
# Clone repository
git clone https://github.com/SevaIrawan/CRM-Backend-Dashboard-2025.git
cd nexmax-dashboard

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local dengan Supabase credentials

# Run development server
npm run dev

# Open browser
http://localhost:3000
```

## 2.2 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## 2.3 Project Structure Overview

```
nexmax-dashboard/
├── app/                    # Pages & API Routes
│   ├── myr/               # MYR currency pages (15)
│   ├── sgd/               # SGD currency pages (11)
│   ├── usc/               # USC currency pages (9)
│   ├── admin/             # Admin pages (4)
│   └── api/               # API routes (94)
├── components/            # UI Components (34)
├── lib/                   # Business Logic (16)
├── utils/                 # Utilities (6)
├── styles/                # CSS files
├── docs/                  # Documentation (21)
└── scripts/               # SQL scripts (27)
```

## 2.4 First Page Development

**Step 1**: Copy template dari existing page
**Step 2**: Update imports dan naming
**Step 3**: Create API routes (slicer-options, data)
**Step 4**: Test dengan real data
**Step 5**: Deploy

---

# 3. PROJECT ARCHITECTURE

## 3.1 Folder Structure

```
app/
├── api/                                # API Routes (94 routes)
│   ├── {currency}-{feature}/          # Feature-specific APIs
│   │   ├── slicer-options/route.ts   # GET slicer options
│   │   ├── chart-data/route.ts       # GET chart data
│   │   ├── kpi-data/route.ts         # GET KPI values
│   │   ├── data/route.ts             # GET table data
│   │   └── export/route.ts           # POST export CSV
│   ├── feedback/                      # Feedback system
│   ├── activity-logs/                 # Activity tracking
│   └── admin/                         # Admin functions
├── {currency}/                        # Currency-specific pages
│   ├── overview/page.tsx
│   ├── business-performance/page.tsx
│   ├── member-report/page.tsx
│   └── ...
├── admin/                             # Admin pages
├── dashboard/                         # Main dashboard
├── login/                             # Login page
├── layout.tsx                         # Root layout
├── page.tsx                           # Home page
└── globals.css                        # Global styles (2016 lines)

components/
├── Layout.tsx                         # Main wrapper
├── Frame.tsx                          # Content frame
├── Header.tsx, Sidebar.tsx, SubHeader.tsx
├── StatCard.tsx                       # KPI cards
├── LineChart.tsx, BarChart.tsx       # Charts
├── slicers/                           # 7 slicer components
└── [modals]/                          # 5 modal components

lib/
├── CentralIcon.tsx                    # Icon system (50+ icons)
├── formatHelpers.ts                   # Number formatting
├── kpiHelpers.ts                      # KPI calculations
├── supabase.ts                        # DB client
├── USCLogic.ts                        # USC KPI logic (916 lines)
├── MYRDailyAverageAndMoM.ts          # MYR logic
├── SGDDailyAverageAndMoM.ts          # SGD logic
└── [feature]Logic.ts                  # Feature-specific logic

utils/
├── centralLogic.ts                    # Generic utilities
├── rolePermissions.ts                 # RBAC
├── brandAccessHelper.ts               # Brand filtering
└── sessionCleanup.ts                  # Session management
```

## 3.2 Component Hierarchy

```
Layout (Root wrapper)
└── AccessControl (RBAC)
    └── ActivityTracker (User tracking)
        ├── Sidebar (280px, collapsible to 100px)
        ├── Header (70px fixed height)
        ├── SubHeader (60px, optional)
        └── Main Content
            └── Frame (variant: standard/compact/full)
                └── Page Content
                    ├── KPI Row (6 StatCards, grid-cols-6)
                    ├── Chart Row 1 (3 charts, grid-cols-3)
                    └── Chart Row 2 (3 charts, grid-cols-3)
```

## 3.3 Data Architecture

**Master Tables** (High Precision):
- `blue_whale_myr` - MYR transactions (daily granularity)
- `blue_whale_sgd` - SGD transactions (daily granularity)
- `blue_whale_usc` - USC transactions (daily granularity)

**Materialized Views** (Performance):
- `blue_whale_myr_monthly_summary` - MYR monthly aggregates
- `blue_whale_sgd_monthly_summary` - SGD monthly aggregates
- `blue_whale_usc_summary` - USC monthly aggregates
- `bp_daily_summary_myr` - Business Performance daily
- `bp_quarter_summary_myr` - Business Performance quarterly

**Hybrid Approach**:
- Active Member, Pure User, Churn → Calculate from **Master** (precision)
- Amounts, Cases, Bonuses → Fetch from **MVs** (performance)

---

# 4. DATABASE SCHEMA

## 4.1 Master Tables

### blue_whale_{currency} Structure

**Common Columns** (MYR/SGD/USC sama):
```sql
userkey               VARCHAR      -- Primary identifier (user + line)
unique_code           VARCHAR      -- User unique code
user_name             VARCHAR      -- User display name
line                  VARCHAR      -- Brand name
date                  DATE         -- Transaction date
year                  INTEGER      -- Year
month                 VARCHAR      -- Month name (January, February, ...)
currency              VARCHAR      -- Currency lock (MYR/SGD/USC)
first_deposit_date    DATE         -- First deposit date
deposit_cases         INTEGER      -- Number of deposits
deposit_amount        NUMERIC      -- Total deposit amount
withdraw_cases        INTEGER      -- Number of withdrawals
withdraw_amount       NUMERIC      -- Total withdrawal amount
add_transaction       NUMERIC      -- Additional transactions
deduct_transaction    NUMERIC      -- Deduction transactions
bonus                 NUMERIC      -- Total bonus
add_bonus             NUMERIC      -- Bonus added
deduct_bonus          NUMERIC      -- Bonus deducted
valid_amount          NUMERIC      -- Valid bet amount
bets_amount           NUMERIC      -- Total bets
cases_bets            INTEGER      -- Number of bets
cases_adjustment      INTEGER      -- Adjustment cases
net_profit            NUMERIC      -- Calculated: (deposit_amount + add_transaction) - (withdraw_amount + deduct_transaction)
ggr                   NUMERIC      -- Calculated: deposit_amount - withdraw_amount
```

**Indexes**:
- PRIMARY KEY: (userkey, date, line, currency)
- INDEX: (year, month, currency)
- INDEX: (line, currency)
- INDEX: (date)

## 4.2 Materialized Views

### blue_whale_{currency}_monthly_summary

**Aggregation**: Per line + year + month + currency

**Columns**:
```sql
line                  VARCHAR
year                  INTEGER
month                 INTEGER      -- 1-12 (INTEGER, bukan VARCHAR!)
currency              VARCHAR
active_member         INTEGER      -- COUNT DISTINCT userkey
pure_user             INTEGER      -- COUNT DISTINCT unique_code
pure_member           INTEGER      -- active_member - new_depositor
deposit_amount        NUMERIC      -- SUM
withdraw_amount       NUMERIC      -- SUM
net_profit            NUMERIC      -- SUM
ggr                   NUMERIC      -- SUM
deposit_cases         INTEGER      -- SUM
withdraw_cases        INTEGER      -- SUM
new_depositor         INTEGER      -- COUNT new depositors
new_register          INTEGER      -- COUNT new registers
atv                   NUMERIC      -- deposit_amount / deposit_cases
purchase_frequency    NUMERIC      -- deposit_cases / active_member
winrate               NUMERIC      -- (ggr / deposit_amount) * 100
withdrawal_rate       NUMERIC      -- (withdraw_cases / deposit_cases) * 100
da_user               NUMERIC      -- deposit_amount / active_member
ggr_user              NUMERIC      -- net_profit / active_member
hold_percentage       NUMERIC      -- (net_profit / valid_amount) * 100
conversion_rate       NUMERIC      -- (new_depositor / new_register) * 100
add_bonus             NUMERIC      -- SUM
deduct_bonus          NUMERIC      -- SUM
bonus                 NUMERIC      -- SUM
add_transaction       NUMERIC      -- SUM
deduct_transaction    NUMERIC      -- SUM
valid_amount          NUMERIC      -- SUM
bets_amount           NUMERIC      -- SUM
cases_bets            INTEGER      -- SUM
cases_adjustment      INTEGER      -- SUM
```

**Refresh**: Manual atau scheduled

## 4.3 Supporting Tables

### bp_target (Business Performance Targets)
```sql
id                    SERIAL PRIMARY KEY
quarter               VARCHAR      -- Q1/Q2/Q3/Q4
year                  INTEGER
currency              VARCHAR
line                  VARCHAR
target_ggr            NUMERIC
target_deposit_amount NUMERIC
target_deposit_cases  INTEGER
target_active_member  INTEGER
percentage            NUMERIC      -- Brand contribution %
created_at            TIMESTAMP
updated_at            TIMESTAMP
updated_by            VARCHAR
```

### activity_logs (User Activity Tracking)
```sql
id                    SERIAL PRIMARY KEY
user_email            VARCHAR
page_name             VARCHAR
action                VARCHAR
ip_address            VARCHAR
user_agent            TEXT
created_at            TIMESTAMP
```

### feedback (User Feedback System)
```sql
id                    SERIAL PRIMARY KEY
page_name             VARCHAR
category              VARCHAR
message               TEXT
rating                INTEGER
user_email            VARCHAR
status                VARCHAR      -- pending/reviewed/resolved
reply                 TEXT
replied_by            VARCHAR
replied_at            TIMESTAMP
created_at            TIMESTAMP
```

---

# 5. KPI REFERENCE GUIDE

## 5.1 Financial KPIs (Currency Format: RM 0,000.00)

| KPI | Formula | Source |
|-----|---------|--------|
| **Deposit Amount** | SUM(deposit_amount) | MV |
| **Withdraw Amount** | SUM(withdraw_amount) | MV |
| **Gross Gaming Revenue (GGR)** | Deposit Amount - Withdraw Amount | Calculated |
| **Net Profit** | (Deposit + Add Transaction) - (Withdraw + Deduct Transaction) | Calculated |
| **Add Transaction** | SUM(add_transaction) | MV |
| **Deduct Transaction** | SUM(deduct_transaction) | MV |
| **Add Bonus** | SUM(add_bonus) | MV |
| **Deduct Bonus** | SUM(deduct_bonus) | MV |
| **Valid Bet Amount** | SUM(valid_amount) | MV |

## 5.2 Count KPIs (Integer Format: 0,000)

| KPI | Formula | Source |
|-----|---------|--------|
| **Active Member** | COUNT DISTINCT(userkey) WHERE deposit_cases > 0 | Master |
| **Pure User** | COUNT DISTINCT(unique_code) WHERE deposit_cases > 0 | Master |
| **Pure Member** | Active Member - New Depositor | Calculated |
| **New Depositor** | COUNT new depositors in period | MV |
| **New Register** | COUNT new registrations in period | MV/Join |
| **Churn Member** | Users in prev month NOT in current | Master |
| **Deposit Cases** | SUM(deposit_cases) | MV |
| **Withdraw Cases** | SUM(withdraw_cases) | MV |

## 5.3 Calculated KPIs (Numeric Format: 0,000.00)

| KPI | Formula |
|-----|---------|
| **ATV** (Average Transaction Value) | Deposit Amount / Deposit Cases |
| **PF** (Purchase Frequency) | Deposit Cases / Active Member |
| **ACL** (Avg Customer Lifespan) | 1 / (Churn Rate / 100) |
| **CLV** (Customer Lifetime Value) | ATV × PF × ACL |
| **CMI** (Customer Maturity Index) | (Retention Rate × 0.5) + (Growth Rate × 0.5) + (Churn Rate × 0.2) |
| **GGR User** | Net Profit / Active Member |
| **GGR Pure User** | GGR / Pure Member |
| **DA User** | Deposit Amount / Active Member |

## 5.4 Rate KPIs (Percentage Format: 0.00%)

| KPI | Formula |
|-----|---------|
| **Winrate** | (GGR / Deposit Amount) × 100 |
| **Churn Rate** | (Churn Member / Last Month Active Member) × 100 |
| **Retention Rate** | (1 - Churn Rate/100) × 100 |
| **Growth Rate** | ((Active Member - Churn Member) / Active Member) × 100 |
| **Withdrawal Rate** | (Withdraw Cases / Deposit Cases) × 100 |
| **Conversion Rate** | (New Depositor / New Register) × 100 |
| **Hold Percentage** | (Net Profit / Valid Amount) × 100 |

## 5.5 Daily Average Calculation

**Formula**:
```
Daily Average = Monthly Value / Active Days
```

**Active Days Logic**:
- **Current Month**: MIN(Last DB Update Date, Today's Date)
- **Past Month**: Total days in month

**Example**:
```
October 2025 (ongoing, last update = Oct 15):
Active Days = 15
Daily Average Deposit = 750,000 / 15 = 50,000

September 2025 (past month):
Active Days = 30
Daily Average Deposit = 900,000 / 30 = 30,000
```

## 5.6 Month-over-Month (MoM) Calculation

**Formula**:
```
MoM % = ((Current - Previous) / Previous) × 100
```

**Special Cases**:
- Previous = 0, Current > 0 → MoM = +100%
- Previous = 0, Current = 0 → MoM = 0%
- Previous = 0, Current < 0 → MoM = -100%

**Format**: `+5.67%` atau `-3.21%` (dengan sign)

---

# 6. COMPONENT LIBRARY

## 6.1 StatCard Component

**File**: `components/StatCard.tsx`

**Usage**:
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

**Props**:
```typescript
interface StatCardProps {
  title: string                    // KPI name (UPPERCASE)
  value: string | number           // Main value (formatted)
  icon?: string                    // Icon name dari CentralIcon
  additionalKpi?: {                // Daily Average / Secondary
    label: string
    value: string | number
    isPositive?: boolean
  }
  comparison?: {                   // MoM comparison
    percentage: string             // "+5.67%" or "-3.21%"
    isPositive: boolean
    text?: string                  // Default: "MoM"
  }
  onClick?: () => void
  clickable?: boolean
}
```

**Dimensions**:
- Height: 120px (fixed)
- Padding: 16px
- Gap between cards: 18px

**Grid Layout** (6 cards per row):
```tsx
<div className="kpi-row" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
  <StatCard {...card1} />
  <StatCard {...card2} />
  <StatCard {...card3} />
  <StatCard {...card4} />
  <StatCard {...card5} />
  <StatCard {...card6} />
</div>
```

## 6.2 LineChart Component

**File**: `components/LineChart.tsx` (957 lines)

**Single Line Usage**:
```tsx
<LineChart
  series={[{ 
    name: 'Deposit Amount', 
    data: monthlyData.map(m => m.depositAmount) 
  }]}
  categories={months.map(m => m.substring(0, 3))} // ["Jan", "Feb", ...]
  title="DEPOSIT AMOUNT TREND"
  currency="MYR"
  chartIcon={getChartIcon('Deposit Amount')}
  hideLegend={true}  // For single series
/>
```

**Dual Line Usage** (with Dual Y-Axes):
```tsx
<LineChart
  series={[
    { 
      name: 'Active Member', 
      data: monthlyData.map(m => m.activeMember),
      color: '#3B82F6'  // Blue (optional, will use default)
    },
    { 
      name: 'Purchase Frequency', 
      data: monthlyData.map(m => m.purchaseFrequency),
      color: '#F97316'  // Orange (optional, will use default)
    }
  ]}
  categories={months}
  title="ACTIVE MEMBER & PURCHASE FREQUENCY"
  chartIcon={getChartIcon('Active Member')}
  // Legend auto-shown untuk dual series
/>
```

**Props**:
```typescript
interface LineChartProps {
  series: Series[]                 // Array of data series
  categories: string[]             // X-axis labels
  title?: string                   // Chart title
  currency?: string                // Currency for formatting
  chartIcon?: string               // Icon SVG
  hideLegend?: boolean             // Hide legend (default: false)
  color?: string                   // Line color (default: #3B82F6)
  showDataLabels?: boolean         // Show data labels (default: false)
  customLegend?: { label, color }[]
  forceSingleYAxis?: boolean       // Force 1 Y-axis (for forecast)
  onDoubleClick?: () => void       // Zoom handler
  clickable?: boolean              // Enable hover
}
```

**Visual Standards**:
- **Single Line**: Blue (#3B82F6)
- **Dual Lines**: Blue (#3B82F6) + Orange (#F97316)
- **Background Fill**: Semi-transparent (20% opacity)
- **Line Width**: 3px
- **Point Radius**: 6px (8px on hover)
- **Tension**: 0.4 (smooth curves)
- **Min Height**: 350px
- **Border Radius**: 8px

**Dual Y-Axis Configuration**:
- Left axis (Y): First series (Blue)
- Right axis (Y1): Second series (Orange)
- Grid lines only from left axis
- Independent scaling per series

## 6.3 BarChart Component

**File**: `components/BarChart.tsx` (699 lines)

**Single Bar Usage**:
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
  showDataLabels={true}  // DEFAULT TRUE
/>
```

**Dual Bar Usage**:
```tsx
<BarChart
  series={[
    { name: 'Deposit Cases', data: [...], color: '#3B82F6' },
    { name: 'Withdraw Cases', data: [...], color: '#F97316' }
  ]}
  categories={months}
  title="DEPOSIT & WITHDRAW CASES"
  currency="CASES"
  customLegend={[
    { label: 'Deposit Cases', color: '#3B82F6' },
    { label: 'Withdraw Cases', color: '#F97316' }
  ]}
/>
```

**Visual Standards**:
- **Bar Color**: Blue (#3B82F6) untuk single
- **Dual Bars**: Blue + Orange
- **Data Labels**: ALWAYS shown di top of bars
- **Label Position**: anchor: 'end', align: 'top', offset: -2
- **Y-Axis Padding**: 8% above max value
- **Bar Radius**: 4px

## 6.4 Layout Components

### Layout.tsx
```tsx
<Layout customSubHeader={customSubHeader}>
  {children}
</Layout>
```

### Frame.tsx
```tsx
<Frame variant="standard">  {/* or 'compact' or 'full' */}
  {children}
</Frame>
```

**Variants**:
- **standard**: Default padding (20px), gap 18px
- **compact**: Tighter spacing, height adjusted
- **full**: Full width, no margin

## 6.5 Slicer Components

**Year Slicer**:
```tsx
import { YearSlicer } from '@/components/slicers'

<YearSlicer
  years={slicerOptions?.years || []}
  selectedYear={selectedYear}
  onYearChange={setSelectedYear}
/>
```

**Month Slicer** (with Dynamic Year Filtering):
```tsx
<MonthSlicer
  months={slicerOptions?.months?.filter(m => 
    m.value === 'ALL' || m.years.includes(selectedYear)
  ) || []}
  selectedMonth={selectedMonth}
  onMonthChange={setSelectedMonth}
/>
```

**Line Slicer**:
```tsx
<LineSlicer
  lines={slicerOptions?.lines || []}
  selectedLine={selectedLine}
  onLineChange={setSelectedLine}
/>
```

## 6.6 Modal Components

**ActiveMemberDetailsModal** (17 columns):
```tsx
<ActiveMemberDetailsModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  totalCount={kpiData?.activeMember || 0}
  currency={selectedCurrency}
  year={selectedYear}
  quarter={selectedQuarter}
  startDate={dateRange.start}
  endDate={dateRange.end}
  isDateRange={useDateRange}
/>
```

**Features**:
- Pagination: 20/50/100/500/1000 rows
- Status filter: ALL/Retention/Reactivation/New Depositor
- Export CSV (all data)
- Mini KPI cards (4 KPIs)
- Sticky header

---

# 7. PAGE DEVELOPMENT GUIDE

## 7.1 Standard Page Template

```tsx
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import { LineSlicer } from '@/components/slicers'
import StatCard from '@/components/StatCard'
import { getChartIcon } from '@/lib/CentralIcon'
import { 
  formatCurrencyKPI, 
  formatIntegerKPI, 
  formatMoMChange, 
  formatNumericKPI 
} from '@/lib/formatHelpers'

// Dynamic chart imports (SSR fix)
const LineChart = dynamic(() => import('@/components/LineChart'), { 
  ssr: false 
})
const BarChart = dynamic(() => import('@/components/BarChart'), { 
  ssr: false 
})

export default function FeaturePage() {
  // 1. HYDRATION FIX
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // 2. STATE MANAGEMENT
  const [slicerOptions, setSlicerOptions] = useState(null)
  const [kpiData, setKpiData] = useState(null)
  const [momData, setMomData] = useState(null)
  const [dailyAverages, setDailyAverages] = useState({})
  const [chartData, setChartData] = useState(null)
  
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedLine, setSelectedLine] = useState('')
  const [selectedCurrency] = useState('MYR') // LOCKED
  
  const [isLoading, setIsLoading] = useState(true)
  
  // 3. LOAD SLICER OPTIONS (on mount)
  useEffect(() => {
    const loadSlicerOptions = async () => {
      try {
        const userStr = localStorage.getItem('nexmax_user')
        const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
        
        const response = await fetch('/api/myr-feature/slicer-options', {
          headers: {
            'x-user-allowed-brands': JSON.stringify(allowedBrands)
          },
          cache: 'no-store'
        })
        const result = await response.json()
        
        if (result.success) {
          setSlicerOptions(result.data)
          setSelectedYear(result.data.defaults.year)
          setSelectedMonth(result.data.defaults.month)
          setSelectedLine(result.data.defaults.line)
        }
      } catch (error) {
        console.error('Error loading slicer options:', error)
      }
    }
    
    loadSlicerOptions()
  }, [])
  
  // 4. LOAD KPI DATA (when month changes)
  useEffect(() => {
    if (!selectedYear || !selectedMonth || !selectedLine) return
    
    const loadKPIData = async () => {
      try {
        setIsLoading(true)
        
        // Use standard logic file
        const result = await getAllMYRKPIsWithMoM(
          selectedYear, 
          selectedMonth, 
          selectedLine === 'ALL' ? undefined : selectedLine
        )
        
        setKpiData(result.current)
        setMomData(result.mom)
        setDailyAverages(result.dailyAverage)
        
      } catch (error) {
        console.error('Error loading KPI data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadKPIData()
  }, [selectedYear, selectedMonth, selectedLine])
  
  // 5. LOAD CHART DATA (when year changes)
  useEffect(() => {
    if (!selectedYear || !selectedLine) return
    
    const loadChartData = async () => {
      try {
        const response = await fetch(
          `/api/myr-feature/chart-data?year=${selectedYear}&line=${selectedLine}`
        )
        const result = await response.json()
        
        if (result.success) {
          setChartData(result.data)
        }
      } catch (error) {
        console.error('Error loading chart data:', error)
      }
    }
    
    loadChartData()
  }, [selectedYear, selectedLine])
  
  // 6. CUSTOM SUBHEADER
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-controls">
        <div className="slicer-group">
          <label className="slicer-label">YEAR:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="subheader-select"
          >
            {slicerOptions?.years?.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label className="slicer-label">MONTH:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="subheader-select"
          >
            {slicerOptions?.months
              ?.filter(m => m.value === 'ALL' || m.years.includes(selectedYear))
              ?.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <LineSlicer
            lines={slicerOptions?.lines || []}
            selectedLine={selectedLine}
            onLineChange={setSelectedLine}
          />
        </div>
      </div>
    </div>
  )
  
  // 7. LOADING STATE
  if (!isMounted || isLoading) {
    return (
      <Layout customSubHeader={customSubHeader}>
        <Frame variant="standard">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        </Frame>
      </Layout>
    )
  }
  
  // 8. RENDER
  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="standard">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          
          {/* ROW 1: KPI CARDS (6 cards) */}
          <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            <StatCard
              title="DEPOSIT AMOUNT"
              value={formatCurrencyKPI(kpiData?.depositAmount || 0, selectedCurrency)}
              icon="Deposit Amount"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrencyKPI(dailyAverages.depositAmount, selectedCurrency)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.depositAmount || 0),
                isPositive: Boolean(momData?.depositAmount && momData.depositAmount > 0)
              }}
            />
            {/* 5 more cards... */}
          </div>
          
          {/* ROW 2: CHARTS (3 charts) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <LineChart
              series={[{ name: 'Deposit Amount', data: chartData?.depositAmount || [] }]}
              categories={chartData?.months || []}
              title="DEPOSIT AMOUNT TREND"
              currency={selectedCurrency}
              chartIcon={getChartIcon('Deposit Amount')}
              hideLegend={true}
            />
            {/* 2 more charts... */}
          </div>
          
        </div>
      </Frame>
    </Layout>
  )
}
```

## 7.2 Page Types & Standards

**Overview Page**:
- 6 KPI cards + 6 charts (2 rows)
- Slicers: Year, Month, Line
- Currency: LOCKED
- Grid: 6-col KPI, 3-col charts

**Business Performance Page**:
- 6 KPI cards + 3 charts
- Target comparison
- Mode toggle (Daily/Quarter)
- Drill-down modals

**Member Report Page**:
- 3-4 KPI cards
- Large table (1000 rows/page)
- Export CSV
- Pagination

**Customer Retention Page**:
- No KPI cards
- Large table with filters
- Transaction history drill-down
- Export CSV

## 7.3 Checklist for New Page

- [ ] Copy template dari existing page
- [ ] Update page name & imports
- [ ] Create API route: slicer-options
- [ ] Create API route: chart-data or kpi-data
- [ ] Create API route: data (if table needed)
- [ ] Create API route: export (if export needed)
- [ ] Update sidebar menu
- [ ] Test dengan real data
- [ ] Verify responsive design
- [ ] Check accessibility
- [ ] Review code quality
- [ ] Deploy

---

# 8. API DEVELOPMENT GUIDE

## 8.1 API Route Pattern

**Standard**: `/api/{currency}-{feature}/{endpoint}/route.ts`

**Examples**:
- `/api/myr-overview/slicer-options/route.ts`
- `/api/sgd-business-performance/data/route.ts`
- `/api/usc-member-analytic/chart-data/route.ts`

## 8.2 Slicer Options API Template

**File**: `/api/{currency}-{feature}/slicer-options/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get user's allowed brands
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? 
      JSON.parse(userAllowedBrandsHeader) : null
    
    // 1. Fetch DISTINCT lines
    const { data: allLines } = await supabase
      .from('blue_whale_myr_monthly_summary')
      .select('line')
      .eq('currency', 'MYR')
      .not('line', 'is', null)
    
    const uniqueLines = Array.from(new Set(allLines?.map(r => r.line)))
    const cleanLines = uniqueLines.filter(line => line !== 'ALL')
    
    // 2. Apply brand filtering
    const filteredBrands = userAllowedBrands && userAllowedBrands.length > 0
      ? cleanLines.filter(brand => userAllowedBrands.includes(brand))
      : cleanLines
    
    const finalLines = userAllowedBrands && userAllowedBrands.length > 0
      ? filteredBrands.sort()  // Squad Lead: no ALL
      : ['ALL', ...cleanLines.sort()]  // Admin: ALL + brands
    
    // 3. Fetch years
    const { data: allYears } = await supabase
      .from('blue_whale_myr_monthly_summary')
      .select('year')
      .eq('currency', 'MYR')
      .not('year', 'is', null)
    
    const uniqueYears = Array.from(new Set(allYears?.map(r => r.year?.toString())))
    const sortedYears = uniqueYears.sort((a, b) => parseInt(b) - parseInt(a))
    
    // 4. Fetch months WITH year mapping
    const { data: allMonthsData } = await supabase
      .from('blue_whale_myr_monthly_summary')
      .select('month, year')
      .eq('currency', 'MYR')
      .gt('month', 0)
      .not('month', 'is', null)
    
    // 5. Build month-year mapping
    const monthYearMap = {}
    allMonthsData?.forEach(row => {
      const monthNum = row.month
      const yearValue = row.year?.toString()
      if (!monthYearMap[monthNum]) {
        monthYearMap[monthNum] = new Set()
      }
      monthYearMap[monthNum].add(yearValue)
    })
    
    // 6. Convert to month objects
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    
    const months = Object.keys(monthYearMap)
      .map(monthNum => ({
        value: monthNames[parseInt(monthNum) - 1],
        label: monthNames[parseInt(monthNum) - 1],
        years: Array.from(monthYearMap[monthNum])
      }))
      .sort((a, b) => monthNames.indexOf(a.value) - monthNames.indexOf(b.value))
    
    months.unshift({ value: 'ALL', label: 'All', years: sortedYears })
    
    // 7. Get defaults from latest record
    const { data: latestRecord } = await supabase
      .from('blue_whale_myr_monthly_summary')
      .select('year, month')
      .eq('currency', 'MYR')
      .gt('month', 0)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
    
    const defaultYear = latestRecord?.[0]?.year?.toString() || sortedYears[0]
    const defaultMonthNum = latestRecord?.[0]?.month || 9
    const defaultMonth = monthNames[defaultMonthNum - 1]
    
    // 8. Return structured response
    return NextResponse.json({
      success: true,
      data: {
        currencies: ['MYR'],  // Locked
        lines: finalLines,
        years: sortedYears,
        months: months,
        defaults: {
          currency: 'MYR',
          line: userAllowedBrands && userAllowedBrands.length > 0
            ? userAllowedBrands[0]  // Squad Lead: first brand
            : 'ALL',  // Admin: ALL
          year: defaultYear,
          month: defaultMonth
        }
      }
    })
    
  } catch (error) {
    console.error('Error fetching slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load slicer options' 
    }, { status: 500 })
  }
}
```

## 8.3 Standard API Response Format

**Success**:
```typescript
{
  success: true,
  data: {
    // Actual data
  },
  pagination?: {
    currentPage: 1,
    totalPages: 10,
    totalRecords: 9523,
    recordsPerPage: 1000,
    hasNextPage: true,
    hasPrevPage: false
  }
}
```

**Error**:
```typescript
{
  success: false,
  error: 'Error message',
  message?: 'Detailed description'
}
```

## 8.4 Brand Access Control Pattern

```typescript
// In API route
const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
const userAllowedBrands = userAllowedBrandsHeader ? 
  JSON.parse(userAllowedBrandsHeader) : null

// Apply brand filter
if (line && line !== 'ALL') {
  // Check permission
  if (userAllowedBrands && !userAllowedBrands.includes(line)) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized',
      message: `You do not have access to brand "${line}"`
    }, { status: 403 })
  }
  query = query.eq('line', line)
} else if (line === 'ALL' && userAllowedBrands) {
  // Squad Lead: filter to allowed brands only
  query = query.in('line', userAllowedBrands)
}
```

---

# 9. STYLING GUIDE

## 9.1 Color System

**Primary**:
```css
Blue: #3B82F6        /* Single series, primary buttons */
Orange: #F97316      /* Second series, secondary buttons */
```

**Status**:
```css
Green: #059669       /* Positive, success, on-track */
Red: #dc2626         /* Negative, danger, risk */
Yellow: #f59e0b      /* Warning, behind */
```

**Neutrals**:
```css
Text Primary: #111827
Text Secondary: #374151
Text Tertiary: #6b7280
Background: #ffffff
Border: #e5e7eb
```

## 9.2 Spacing System

**CENTRALIZED**: 18px gap untuk ALL elements

```css
.standard-frame { gap: 18px; padding: 20px; }
.kpi-row { gap: 18px; }
.chart-row { gap: 18px; }
```

**Component Padding**:
- StatCard: 16px
- Chart: 24px
- Frame: 20px

## 9.3 Typography Scale

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page Title | 28px | 700 | #111827 |
| Section Title | 22px | 600 | #374151 |
| StatCard Title | 12px | 600 | #6b7280 |
| StatCard Value | 28px | 700 | #111827 |
| Chart Title | 12px | 700 | #374151 |
| Body Text | 13px | 400 | #374151 |
| Caption | 11px | 400 | #6b7280 |

## 9.4 Grid System

**KPI Row (6 columns)**:
```css
.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 18px;
}
```

**Chart Row (3 columns)**:
```css
.chart-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
```

**Responsive Breakpoints**:
```css
Desktop (>1280px): 6 KPI cols, 3 chart cols
Tablet (768-1280px): 3 KPI cols, 2 chart cols
Mobile (<768px): 2 KPI cols, 1 chart col
```

## 9.5 Hover Effects

**StatCard**:
```css
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
transition: all 200ms ease;
```

**Chart**:
```css
transform: translateY(-3px);
box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
transition: all 200ms ease;
```

---

# 10. BEST PRACTICES

## 10.1 Code Organization

✅ **DO**:
- Separate UI (components) from logic (lib)
- Use TypeScript interfaces for all props
- Follow naming conventions (camelCase, PascalCase, kebab-case)
- Implement error boundaries
- Add loading states
- Use format helpers untuk consistency

❌ **DON'T**:
- Mix business logic dalam UI components
- Hardcode values or use dummy data
- Ignore TypeScript errors
- Skip error handling
- Create deeply nested components

## 10.2 Performance

✅ **DO**:
- Use dynamic imports untuk charts (SSR fix)
- Implement caching (5 min TTL)
- Use React.memo untuk expensive components
- Optimize dengan useMemo dan useCallback
- Lazy load modals

❌ **DON'T**:
- Load all data at once without pagination
- Re-render unnecessarily
- Block main thread
- Ignore bundle size

## 10.3 Security

✅ **DO**:
- Validate all user inputs
- Check brand permissions in API
- Log user activities
- Use environment variables for secrets
- Implement RBAC everywhere

❌ **DON'T**:
- Trust client-side validation only
- Expose API keys in code
- Skip authentication checks
- Ignore audit trails

## 10.4 Data Integrity

✅ **DO**:
- Always fetch from database
- Use Master tables for precision (Active Member, Pure User, Churn)
- Use MVs for performance (Amounts, Cases)
- Validate data before display
- Handle null/undefined values

❌ **DON'T**:
- Use dummy/fallback/mock data
- Hardcode options or values
- Skip data validation
- Ignore edge cases (division by zero)

---

# APPENDIX A: FORMAT REFERENCE

## Currency Format
```typescript
formatCurrencyKPI(1234567.89, 'MYR')  → "RM 1,234,567.89"
formatCurrencyKPI(1234567.89, 'SGD')  → "SGD 1,234,567.89"
formatCurrencyKPI(1234567.89, 'USC')  → "USD 1,234,567.89"
```

## Integer Format
```typescript
formatIntegerKPI(12345)  → "12,345"
```

## Numeric Format
```typescript
formatNumericKPI(1234.567)  → "1,234.57"
```

## Percentage Format
```typescript
formatPercentageKPI(12.345)  → "12.35%"
```

## MoM Format
```typescript
formatMoMChange(5.67)   → "+5.67%"
formatMoMChange(-3.21)  → "-3.21%"
formatMoMChange(0)      → "0.00%"
```

---

# APPENDIX B: ICON REFERENCE

**Icon Usage**:
```tsx
// In StatCard
<StatCard icon="Deposit Amount" />

// In Chart
<LineChart chartIcon={getChartIcon('Deposit Amount')} />
```

**Available Icons** (50+ total):
- Financial: depositAmount, withdrawAmount, netProfit, grossProfit
- Member: activeMember, pureMember, pureUser, newDepositor
- Business: conversionRate, churnRate, holdPercentage
- Comparison: arrowUp, arrowDown, minus

**Add New Icon**:
1. Add SVG to `KPI_ICONS` object in `lib/CentralIcon.tsx`
2. Add mapping in `getKpiIcon()` function
3. Add mapping in `getChartIcon()` if needed

---

# APPENDIX C: COMPONENT IMPORT CHEATSHEET

```typescript
// Layout
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'

// Cards
import StatCard from '@/components/StatCard'
import ComparisonStatCard from '@/components/ComparisonStatCard'

// Charts (MUST use dynamic import)
const LineChart = dynamic(() => import('@/components/LineChart'), { ssr: false })
const BarChart = dynamic(() => import('@/components/BarChart'), { ssr: false })

// Slicers
import { YearSlicer, MonthSlicer, LineSlicer } from '@/components/slicers'

// Modals
import ActiveMemberDetailsModal from '@/components/ActiveMemberDetailsModal'

// Helpers
import { 
  formatCurrencyKPI, 
  formatIntegerKPI, 
  formatNumericKPI, 
  formatPercentageKPI,
  formatMoMChange 
} from '@/lib/formatHelpers'

// Icons
import { getChartIcon, getKpiIcon } from '@/lib/CentralIcon'

// Logic
import { getAllMYRKPIsWithMoM } from '@/lib/MYRDailyAverageAndMoM'
import { getAllUSCKPIsWithMoM } from '@/lib/USCDailyAverageAndMoM'
```

---

# APPENDIX D: TROUBLESHOOTING

## Common Issues

**Issue 1**: Chart not rendering
- **Cause**: Missing dynamic import
- **Fix**: Use `dynamic(() => import(...), { ssr: false })`

**Issue 2**: Hydration mismatch
- **Cause**: Server/client mismatch
- **Fix**: Add isMounted check

**Issue 3**: Slicer options empty
- **Cause**: Brand filtering issue
- **Fix**: Check `x-user-allowed-brands` header

**Issue 4**: Wrong currency symbol
- **Cause**: Currency parameter mismatch
- **Fix**: Verify currency lock in API

**Issue 5**: MoM calculation wrong
- **Cause**: Previous month boundary (Dec → Jan)
- **Fix**: Use standard MoM helper function

---

**END OF HANDBOOK**

---

**Document Prepared By**: NEXMAX Development Team  
**Contact**: Admin Dashboard Team  
**Repository**: https://github.com/SevaIrawan/CRM-Backend-Dashboard-2025.git  
**Deployment**: https://nexmax-dashboard.vercel.app

