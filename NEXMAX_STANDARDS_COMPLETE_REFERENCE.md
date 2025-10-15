# 📘 NEXMAX DASHBOARD - COMPLETE STANDARDS REFERENCE
## Hasil Scanning Komprehensif dari Overview USC Page

> **Project**: NEXMAX Dashboard - Real-time Business Analytics Platform  
> **Scanning Date**: October 14, 2025  
> **Base Reference**: `app/usc/overview/page.tsx`  
> **Tujuan**: Dokumentasi lengkap semua standards untuk implementasi page baru

---

## 📋 TABLE OF CONTENTS

1. [Slicer API Standard](#1-slicer-api-standard)
2. [Daily Average Logic](#2-daily-average-logic)
3. [Month-over-Month (MoM) Comparison](#3-month-over-month-mom-comparison)
4. [StatCard with 6 KPI Cards](#4-statcard-with-6-kpi-cards)
5. [Line Chart (Single Line)](#5-line-chart-single-line)
6. [Line Chart (Double Line)](#6-line-chart-double-line)
7. [Bar Chart (Single Bar)](#7-bar-chart-single-bar)
8. [Bar Chart (Double Bar)](#8-bar-chart-double-bar)
9. [Format Helpers](#9-format-helpers)
10. [Complete Page Structure](#10-complete-page-structure)

---

## 1. SLICER API STANDARD

### 1.1 Overview
Slicer di NEXMAX menggunakan **API-first architecture** dengan auto-fetch dari database.

### 1.2 API Structure
**Location**: `app/api/{currency}-{page}/slicer-options/route.ts`

**Example**: `app/api/usc-overview/slicer-options/route.ts`

```typescript
export async function GET(request: NextRequest) {
  try {
    // 1. Get DISTINCT lines from database
    const { data: allLines } = await supabase
      .from('blue_whale_usc_summary')
      .select('line')
      .eq('currency', 'USC')
      .not('line', 'is', null)

    // 2. Get years
    const { data: allYears } = await supabase
      .from('blue_whale_usc_summary')
      .select('year')
      .eq('currency', 'USC')
      .not('year', 'is', null)

    // 3. Get months WITH year mapping
    const { data: allMonthsData } = await supabase
      .from('blue_whale_usc_summary')
      .select('month, year')
      .eq('currency', 'USC')
      .not('month', 'is', null)

    // 4. Build month-year mapping for DYNAMIC filtering
    const monthYearMap: Record<string, Set<string>> = {}
    allMonthsData?.forEach(row => {
      const monthKey = String(row.month)
      const yearValue = String(row.year)
      if (!monthYearMap[monthKey]) {
        monthYearMap[monthKey] = new Set()
      }
      monthYearMap[monthKey].add(yearValue)
    })

    // 5. Return slicer options
    return NextResponse.json({
      success: true,
      data: {
        currencies: ['USC'], // Locked for currency-specific pages
        lines: ['ALL', ...cleanLines.sort()],
        years: sortedYears,
        months: monthsWithYearInfo,
        defaults: {
          currency: 'USC',
          line: 'ALL',
          year: defaultYear,
          month: defaultMonth
        }
      }
    })
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
```

### 1.3 Client-Side Implementation

```typescript
// State management
const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null)
const [selectedYear, setSelectedYear] = useState('')
const [selectedMonth, setSelectedMonth] = useState('')
const [selectedLine, setSelectedLine] = useState('')

// Load slicer options on mount
useEffect(() => {
  const loadSlicerOptions = async () => {
    const response = await fetch('/api/usc-overview/slicer-options')
    const result = await response.json()
    
    if (result.success) {
      setSlicerOptions(result.data)
      setSelectedYear(result.data.defaults.year)
      setSelectedMonth(result.data.defaults.month)
      setSelectedLine(result.data.defaults.line)
    }
  }
  loadSlicerOptions()
}, [])
```

### 1.4 SubHeader Slicer UI

```typescript
const customSubHeader = (
  <div className="dashboard-subheader">
    <div className="subheader-controls">
      {/* YEAR SLICER */}
      <div className="slicer-group">
        <label className="slicer-label">YEAR:</label>
        <select
          value={selectedYear} 
          onChange={(e) => setSelectedYear(e.target.value)}
          className="subheader-select"
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            backgroundColor: 'white',
            fontSize: '14px'
          }}
        >
          {slicerOptions?.years?.map((year: string) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      
      {/* MONTH SLICER with DYNAMIC filtering */}
      <div className="slicer-group">
        <label className="slicer-label">MONTH:</label>
        <select
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="subheader-select"
        >
          {slicerOptions?.months
            ?.filter((month: any) => {
              if (month.value === 'ALL') return true
              return month.years && month.years.includes(selectedYear)
            })
            ?.map((month: any) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
        </select>
      </div>

      {/* LINE SLICER */}
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
```

**✅ KEY POINTS:**
- ✅ API auto-fetch dari database (NO hardcoded values)
- ✅ Month slicer dengan DYNAMIC year filtering
- ✅ Currency lock untuk page spesifik (MYR/SGD/USC)
- ✅ Default values dari latest record

---

## 2. DAILY AVERAGE LOGIC

### 2.1 Overview
Daily Average = **Monthly Value ÷ Active Days**

**Logic Source**: `lib/dailyAverageLogic.ts` (MYR/SGD) atau `lib/USCDailyAverageAndMoM.ts` (USC)

### 2.2 Core Logic

```typescript
/**
 * Get current month progress (days elapsed so far)
 */
async function getCurrentMonthProgress(year: string, month: string): Promise<number> {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear().toString()
  const currentMonth = getMonthName(currentDate.getMonth())
  
  // Only use database for CURRENT ongoing month
  if (year === currentYear && month === currentMonth) {
    console.log(`📅 [Daily Average] CURRENT ongoing month detected`)
    const lastUpdateDay = await getLastUpdateDateFromDatabase(year, month)
    const currentDay = currentDate.getDate()
    const activeDays = Math.min(lastUpdateDay, currentDay)
    return activeDays
  }
  
  // For ALL past months, use total days
  const totalDays = getDaysInMonth(year, month)
  return totalDays
}

/**
 * Calculate daily average
 */
async function calculateDailyAverage(
  monthlyValue: number, 
  year: string, 
  month: string
): Promise<number> {
  const activeDays = await getCurrentMonthProgress(year, month)
  
  if (activeDays === 0 || activeDays < 1) {
    const fallbackDays = getDaysInMonth(year, month)
    return monthlyValue / fallbackDays
  }
  
  return monthlyValue / activeDays
}
```

### 2.3 Usage in Page

```typescript
// Load KPI data with Daily Average
useEffect(() => {
  if (!selectedYear || !selectedMonth || !selectedLine) return

  const loadKPIData = async () => {
    // Get ALL KPIs with MoM and Daily Average
    const result = await getAllUSCKPIsWithMoM(
      selectedYear, 
      selectedMonth, 
      selectedLine === 'ALL' ? undefined : selectedLine
    )
    
    setKpiData(result.current)
    setMomData(result.mom)
    setDailyAverages({
      depositAmount: result.dailyAverage.depositAmount,
      withdrawAmount: result.dailyAverage.withdrawAmount,
      grossGamingRevenue: result.dailyAverage.grossGamingRevenue,
      activeMember: result.dailyAverage.activeMember,
      purchaseFrequency: result.dailyAverage.purchaseFrequency,
      customerMaturityIndex: result.dailyAverage.customerMaturityIndex
    })
  }

  loadKPIData()
}, [selectedYear, selectedMonth, selectedLine])
```

**✅ KEY POINTS:**
- ✅ Current month: use database last update date
- ✅ Past months: use total days in month
- ✅ Handles leap years automatically
- ✅ Returns all KPIs daily average

---

## 3. MONTH-OVER-MONTH (MOM) COMPARISON

### 3.1 Overview
MoM = `((Current - Previous) / Previous) × 100%`

**Logic Source**: `lib/momLogic.ts` (MYR/SGD) atau `lib/USCDailyAverageAndMoM.ts` (USC)

### 3.2 Core Logic

```typescript
/**
 * Calculate MoM percentage change
 */
function calculateMoM(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Get ALL KPIs with MoM
 */
export async function getAllUSCKPIsWithMoM(
  year: string,
  month: string,
  line?: string
): Promise<{ current: USCKPIData, mom: USCMoMData, dailyAverage: USCKPIData }> {
  // Get current month data
  const currentData = await getUSCKPIData(year, month, line)
  
  // Get previous month data
  const { year: prevYear, month: prevMonth } = getPreviousMonth(year, month)
  const previousData = await getUSCKPIData(prevYear, prevMonth, line)
  
  // Calculate MoM for ALL KPIs
  const mom = {
    activeMember: calculateMoM(currentData.activeMember, previousData.activeMember),
    depositAmount: calculateMoM(currentData.depositAmount, previousData.depositAmount),
    grossGamingRevenue: calculateMoM(currentData.grossGamingRevenue, previousData.grossGamingRevenue),
    // ... all other KPIs
  }
  
  // Calculate daily averages
  const dailyAverage = await calculateAllUSCDailyAverages(currentData, year, month)
  
  return { current: currentData, mom, dailyAverage }
}
```

### 3.3 Format MoM Display

```typescript
// Format MoM value with sign
export function formatMoMChange(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// Get MoM color
export function getMoMColor(value: number): string {
  return value > 0 ? '#059669' : value < 0 ? '#dc2626' : '#6b7280'
}
```

**✅ KEY POINTS:**
- ✅ Automatic previous month calculation (handles year boundary)
- ✅ Handles division by zero
- ✅ Returns positive/negative with color coding
- ✅ All KPIs MoM in one call

---

## 4. STATCARD WITH 6 KPI CARDS

### 4.1 Overview
StatCard adalah komponen standard untuk menampilkan KPI dengan **Daily Average** dan **MoM comparison**.

**Component**: `components/StatCard.tsx`

### 4.2 StatCard Structure

```typescript
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
```

### 4.3 6 KPI Cards Grid Layout

```typescript
{/* BARIS 1: KPI CARDS (STANDARD ROW) */}
<div className="kpi-row">
  <StatCard title="DEPOSIT AMOUNT" ... />
  <StatCard title="WITHDRAW AMOUNT" ... />
  <StatCard title="GROSS GAMING REVENUE" ... />
  <StatCard title="ACTIVE MEMBER" ... />
  <StatCard title="PURCHASE FREQUENCY" ... />
  <StatCard title="CUSTOMER MATURITY INDEX" ... />
</div>

<style jsx>{`
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 20px;
    margin-bottom: 20px;
  }
`}</style>
```

**✅ KEY POINTS:**
- ✅ 6 cards dalam 1 row (grid 6 kolom)
- ✅ Setiap card punya icon, value, daily average, dan MoM
- ✅ Icon dari CentralIcon system
- ✅ Gap 20px antar cards

---

## 5. LINE CHART (SINGLE LINE)

### 5.1 Overview
Line Chart dengan 1 series data untuk trend visualization.

**Component**: `components/LineChart.tsx`

### 5.2 Usage

```typescript
<LineChart
  series={[{ 
    name: 'Deposit Amount', 
    data: sortedMonths.map(month => monthlyData[month].deposit_amount) 
  }]}
  categories={sortedMonths.map(month => month.substring(0, 3))}
  title="DEPOSIT AMOUNT TREND"
  currency={selectedCurrency}
  hideLegend={true}
  chartIcon={getChartIcon('Deposit Amount')}
/>
```

### 5.3 Chart Configuration

```typescript
// Standard colors
const lineColor = '#3B82F6' // Blue for single line
const bgColor = 'rgba(59, 130, 246, 0.15)' // Semi-transparent blue

// Chart options
{
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      callbacks: {
        label: function(context) {
          const value = context.parsed.y
          return `${context.dataset.label}: ${formatFullValue(value)}`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: false,
      suggestedMax: maxValue * 1.2, // 20% padding
      grid: {
        color: 'rgba(229, 231, 235, 0.3)'
      }
    }
  }
}
```

**✅ KEY POINTS:**
- ✅ Single Y-axis
- ✅ Blue color (#3B82F6)
- ✅ Semi-transparent background
- ✅ Icon + title di header
- ✅ White card background dengan hover effect

---

## 6. LINE CHART (DOUBLE LINE)

### 6.1 Overview
Line Chart dengan 2 series data dan **DUAL Y-AXES**.

**Component**: `components/LineChart.tsx` atau `components/StandardChart2Line.tsx`

### 6.2 Usage

```typescript
<LineChart
  series={[
    { 
      name: 'Active Member', 
      data: sortedMonths.map(month => monthlyData[month].active_member) 
    },
    { 
      name: 'Purchase Frequency', 
      data: sortedMonths.map(month => monthlyData[month].purchase_frequency) 
    }
  ]}
  categories={sortedMonths.map(month => month.substring(0, 3))}
  title="ACTIVE MEMBER & PURCHASE FREQUENCY TREND"
  currency={selectedCurrency}
  chartIcon={getChartIcon('Active Member')}
/>
```

### 6.3 Dual Y-Axis Configuration

```typescript
// Colors for 2 lines
const colors = [
  '#3B82F6', // Blue for first series
  '#F97316'  // Orange for second series
]

// Dual Y-axis setup
scales: {
  y: {
    type: 'linear',
    position: 'left',
    // First series (Blue)
  },
  y1: {
    type: 'linear',
    position: 'right',
    grid: {
      drawOnChartArea: false
    }
    // Second series (Orange)
  }
}

// Legend in header
<div style={{ display: 'flex', gap: '12px' }}>
  {series.map((item, index) => (
    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: '12px',
        height: '3px',
        backgroundColor: colors[index],
        borderRadius: '2px'
      }} />
      <span style={{ fontSize: '11px', fontWeight: 600 }}>
        {item.name}
      </span>
    </div>
  ))}
</div>
```

**✅ KEY POINTS:**
- ✅ Dual Y-axes (left + right)
- ✅ Blue (#3B82F6) + Orange (#F97316)
- ✅ Legend di header (bukan di chart area)
- ✅ Independent scaling untuk setiap series

---

## 7. BAR CHART (SINGLE BAR)

### 7.1 Overview
Bar Chart dengan 1 series data untuk comparison.

**Component**: `components/BarChart.tsx`

### 7.2 Usage

```typescript
<BarChart
  series={[{ 
    name: 'Deposit Cases', 
    data: sortedMonths.map(month => monthlyData[month].deposit_cases) 
  }]}
  categories={sortedMonths.map(month => month.substring(0, 3))}
  title="DEPOSIT CASES TREND"
  currency="CASES"
  chartIcon={getChartIcon('deposits')}
/>
```

### 7.3 Chart Configuration

```typescript
// Standard bar color
const barColor = '#3B82F6' // Blue

// Chart options
{
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    datalabels: {
      display: true,
      anchor: 'end',
      align: 'top',
      offset: -2,
      formatter: (value) => formatIntegerKPI(value) + 'c'
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: maxValue * 1.08, // 8% padding
      ticks: {
        stepSize: Math.ceil(maxValue / 5)
      }
    }
  }
}
```

**✅ KEY POINTS:**
- ✅ Data labels ALWAYS on top
- ✅ Blue bars (#3B82F6)
- ✅ Consistent Y-axis scaling
- ✅ Smart rounding untuk max value

---

## 8. BAR CHART (DOUBLE BAR)

### 8.1 Overview
Bar Chart dengan 2 series data (side-by-side bars).

**Component**: `components/BarChart.tsx`

### 8.2 Usage

```typescript
<BarChart
  series={[
    { 
      name: 'Deposit Cases', 
      data: sortedMonths.map(month => monthlyData[month].deposit_cases),
      color: '#3B82F6'
    },
    { 
      name: 'Withdraw Cases', 
      data: sortedMonths.map(month => monthlyData[month].withdraw_cases),
      color: '#F97316'
    }
  ]}
  categories={sortedMonths.map(month => month.substring(0, 3))}
  title="DEPOSIT & WITHDRAW CASES COMPARISON"
  currency="CASES"
  customLegend={[
    { label: 'Deposit Cases', color: '#3B82F6' },
    { label: 'Withdraw Cases', color: '#F97316' }
  ]}
/>
```

### 8.3 Dual Bar Configuration

```typescript
// Colors
const colors = ['#3B82F6', '#F97316'] // Blue + Orange

// Bar datasets
datasets: series.map((dataset, index) => ({
  label: dataset.name,
  data: dataset.data,
  backgroundColor: dataset.color || colors[index],
  borderRadius: 4
}))

// Legend in header
{customLegend && (
  <div style={{ display: 'flex', gap: '16px' }}>
    {customLegend.map((item, idx) => (
      <div key={idx}>
        <span style={{
          width: '14px',
          height: '4px',
          backgroundColor: item.color
        }} />
        <span>{item.label}</span>
      </div>
    ))}
  </div>
)}
```

**✅ KEY POINTS:**
- ✅ Side-by-side bars
- ✅ Custom colors per series
- ✅ Legend di header
- ✅ Consistent scaling untuk fair comparison

---

## 9. FORMAT HELPERS

### 9.1 Overview
Standard formatting untuk semua KPI values.

**Source**: `lib/formatHelpers.ts`

### 9.2 Format Functions

```typescript
/**
 * Format numeric with 2 decimal places
 * Used for: ATV, CLV, ACL, PF, etc.
 */
export const formatNumericKPI = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format integer with no decimal
 * Used for: Active Member, Cases, Headcount, etc.
 */
export const formatIntegerKPI = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

/**
 * Format currency with symbol
 * Used for: Deposit, Withdraw, GGR, Net Profit, etc.
 */
export const formatCurrencyKPI = (value: number, currency: string): string => {
  const symbol = currency === 'MYR' ? 'RM' : 
                 currency === 'SGD' ? 'SGD' : 
                 currency === 'USC' ? 'USD' : 'RM'
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(value))
  
  const sign = value < 0 ? '-' : ''
  return `${symbol} ${sign}${formatted}`
}

/**
 * Format percentage
 * Used for: Rates, CMI, etc.
 */
export const formatPercentageKPI = (value: number): string => {
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}%`
}

/**
 * Format MoM change with sign
 * Used for: MoM comparison
 */
export const formatMoMChange = (value: number): string => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}%`
}
```

### 9.3 Format Standards

| KPI Type | Format | Example |
|----------|--------|---------|
| **Currency** (Deposit, Withdraw, GGR) | `RM 0,000.00` | RM 1,234,567.89 |
| **Numeric** (ATV, CLV, ACL) | `0,000.00` | 1,234.56 |
| **Integer** (Cases, Member, Headcount) | `0,000` | 1,234 |
| **Percentage** (Rates, CMI) | `0,000.00%` | 12.34% |
| **MoM** (Comparison) | `+0.00%` or `-0.00%` | +5.67% |

**✅ KEY POINTS:**
- ✅ ALWAYS use thousand separators
- ✅ Currency: 2 decimal places
- ✅ Integer: NO decimal places
- ✅ MoM: include sign (+/-)

---

## 10. COMPLETE PAGE STRUCTURE

### 10.1 Standard Page Template

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import { LineSlicer } from '@/components/slicers'
import StatCard from '@/components/StatCard'
import { getChartIcon } from '@/lib/CentralIcon'
import { formatCurrencyKPI, formatIntegerKPI, formatMoMChange, formatNumericKPI, formatPercentageKPI } from '@/lib/formatHelpers'
import { getAllUSCKPIsWithMoM } from '@/lib/USCDailyAverageAndMoM'

// Dynamic imports for charts (SSR fix)
const LineChart = dynamic(() => import('@/components/LineChart'), { ssr: false })
const BarChart = dynamic(() => import('@/components/BarChart'), { ssr: false })

export default function USCOverviewPage() {
  // 1. STATE MANAGEMENT
  const [isMounted, setIsMounted] = useState(false)
  const [kpiData, setKpiData] = useState<USCKPIData | null>(null)
  const [momData, setMomData] = useState<USCKPIData | null>(null)
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null)
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedCurrency] = useState('USC') // Locked
  const [selectedLine, setSelectedLine] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [dailyAverages, setDailyAverages] = useState({ ... })
  const [srChartData, setSrChartData] = useState<any>(null)

  // 2. HYDRATION FIX
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // 3. LOAD SLICER OPTIONS
  useEffect(() => {
    const loadSlicerOptions = async () => {
      const response = await fetch('/api/usc-overview/slicer-options')
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.data)
        setSelectedYear(result.data.defaults.year)
        setSelectedMonth(result.data.defaults.month)
        setSelectedLine(result.data.defaults.line)
      }
    }
    loadSlicerOptions()
  }, [])

  // 4. LOAD KPI DATA (for StatCard)
  useEffect(() => {
    if (!selectedYear || !selectedMonth || !selectedLine) return

    const loadKPIData = async () => {
      const result = await getAllUSCKPIsWithMoM(selectedYear, selectedMonth, selectedLine)
      setKpiData(result.current)
      setMomData(result.mom)
      setDailyAverages({ ... })
    }
    loadKPIData()
  }, [selectedYear, selectedMonth, selectedLine])

  // 5. LOAD CHART DATA (for Charts)
  useEffect(() => {
    if (!selectedYear || !selectedLine) return

    const loadChartData = async () => {
      const response = await fetch(`/api/usc-overview/chart-data?line=${selectedLine}&year=${selectedYear}`)
      const result = await response.json()
      // Process chart data
      setSrChartData(chartData)
    }
    loadChartData()
  }, [selectedYear, selectedLine])

  // 6. CUSTOM SUBHEADER
  const customSubHeader = (
    <div className="dashboard-subheader">
      {/* Slicers here */}
    </div>
  )

  // 7. RENDER
  if (!isMounted) return <LoadingState />
  if (isLoading) return <LoadingState />

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="standard">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          
          {/* ROW 1: KPI CARDS */}
          <div className="kpi-row">
            <StatCard ... />
            <StatCard ... />
            {/* 6 cards total */}
          </div>

          {/* ROW 2: CHARTS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <LineChart ... />
            <LineChart ... />
            <LineChart ... />
          </div>

          {/* ROW 3: MORE CHARTS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <BarChart ... />
            <BarChart ... />
            <LineChart ... />
          </div>

        </div>
      </Frame>
    </Layout>
  )
}
```

### 10.2 Page Structure Standards

**Layout Hierarchy:**
```
Layout (customSubHeader)
└── Frame (variant="standard")
    └── Content Container
        ├── Row 1: KPI Cards (6 cards, grid-cols-6)
        ├── Row 2: Charts (3 charts, grid-cols-3)
        ├── Row 3: Charts (3 charts, grid-cols-3)
        └── ... more rows
```

**Spacing Standards:**
- Container gap: `20px`
- KPI row gap: `20px`
- Chart row gap: `24px` (via `gap-6`)
- Margin top: `20px`
- Chart padding: `24px`

### 10.3 Grid Standards

```css
/* 6 KPI Cards */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

/* 3 Charts per row */
.grid-cols-3 {
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

/* 2 Charts per row (for some pages) */
.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}
```

---

## 📊 SUMMARY CHECKLIST

Ketika membuat page baru, pastikan:

### ✅ SLICER
- [ ] API route untuk slicer options
- [ ] Dynamic month filtering based on year
- [ ] Currency lock (jika currency-specific page)
- [ ] Default values dari latest record
- [ ] SubHeader dengan Year, Month, Line slicers

### ✅ DATA LOADING
- [ ] Slicer options useEffect
- [ ] KPI data useEffect (month-dependent)
- [ ] Chart data useEffect (year-dependent)
- [ ] Hydration fix (isMounted)
- [ ] Loading states

### ✅ KPI CARDS
- [ ] 6 cards dalam 1 row (grid-cols-6)
- [ ] StatCard dengan Daily Average
- [ ] StatCard dengan MoM comparison
- [ ] Icon dari CentralIcon
- [ ] Format menggunakan formatHelpers

### ✅ CHARTS
- [ ] LineChart untuk trends
- [ ] BarChart untuk comparisons
- [ ] Dual Y-axes untuk 2-series charts
- [ ] Chart icons di header
- [ ] Legend di header (bukan di chart area)
- [ ] Dynamic imports (SSR fix)

### ✅ FORMATTING
- [ ] Currency: `RM 0,000.00`
- [ ] Integer: `0,000`
- [ ] Numeric: `0,000.00`
- [ ] Percentage: `0,000.00%`
- [ ] MoM: `+0.00%` atau `-0.00%`

### ✅ STYLING
- [ ] White background untuk cards
- [ ] Hover effects (translateY + shadow)
- [ ] Grid gaps: 20px (KPI), 24px (charts)
- [ ] Chart height: min 350px
- [ ] Consistent border radius: 8px

---

## 🎯 FINAL NOTES

**CRITICAL RULES** [[memory:7712339]]:
1. ❌ **NO DUMMY DATA** - Semua data dari Supabase
2. ✅ **API-FIRST** - Slicers auto-fetch dari database
3. ✅ **REAL-TIME** - Data selalu up-to-date
4. ✅ **CURRENCY LOCK** - MYR/SGD/USC pages lock currency
5. ✅ **STANDARD COMPONENTS** - Gunakan StatCard, LineChart, BarChart
6. ✅ **FORMAT CONSISTENCY** - Gunakan formatHelpers
7. ✅ **DAILY AVERAGE** - Semua KPI cards punya Daily Average
8. ✅ **MOM COMPARISON** - Semua KPI cards punya MoM
9. ✅ **DUAL Y-AXES** - Charts dengan 2 series
10. ✅ **ICON SYSTEM** - Gunakan CentralIcon untuk semua icons

---

**Document Version**: 1.0  
**Last Updated**: October 14, 2025  
**Reference Page**: `app/usc/overview/page.tsx`  
**Maintained By**: NEXMAX Development Team

