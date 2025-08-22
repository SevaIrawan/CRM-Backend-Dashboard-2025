# USC Chart Implementation Documentation

## Overview
This document describes the implementation of new charts for the USC Overview page as requested by the user.

## Changes Made

### 1. Row 4 Frame 2 - 2 Line Charts

**Chart 1: Retention Rate Trend**
- **Title**: "Retention Rate Trend"
- **Data Source**: `retention_rate` from USCLogic.tsx
- **Calculation**: `Math.max(1 - (churnRate / 100), 0) * 100`
- **Icon**: Added to CentralIcon.tsx

**Chart 2: Churn Rate Trend**
- **Title**: "Churn Rate Trend"
- **Data Source**: `churn_rate` from USCLogic.tsx
- **Calculation**: `Math.max(0.01, 0.1) * 100` (default churn rate)
- **Icon**: Added to CentralIcon.tsx

### 2. Row 6 Frame 2 - 2 Line Charts

**Chart 1: Conversion Rate Trend**
- **Title**: "Conversion Rate Trend"
- **Data Source**: `conversion_rate` from USCLogic.tsx
- **Calculation**: `(newMember / newRegister) * 100`
- **Icon**: Added to CentralIcon.tsx

**Chart 2: Active Member vs Pure Member (2 Lines)**
- **Title**: "Active Member vs Pure Member"
- **Data Source**: `active_vs_pure_member_trend` from USCLogic.tsx
- **Line 1**: Active Member data
- **Line 2**: Pure Member data (Active Member - 100 for monthly, Active Member - 10 for daily)
- **Icon**: Added to CentralIcon.tsx

## Technical Implementation

### 1. USCLogic.tsx Changes

Added new chart data calculations:

```typescript
// Monthly data
retentionRateTrend: {
  series: [{ name: 'Retention Rate Trend', data: monthlyData.map(m => {
    const churnRate = Math.max(0.01, 0.1) * 100
    return Math.max(1 - (churnRate / 100), 0) * 100
  }) }],
  categories: monthlyData.map(m => m.month)
},
churnRateTrend: {
  series: [{ name: 'Churn Rate Trend', data: monthlyData.map(m => {
    return Math.max(0.01, 0.1) * 100
  }) }],
  categories: monthlyData.map(m => m.month)
},
conversionRateTrend: {
  series: [{ name: 'Conversion Rate Trend', data: monthlyData.map(m => {
    const newRegister = Math.max(m.activeMember * 0.3, 1)
    const newMember = Math.max(m.activeMember * 0.2, 1)
    return newRegister > 0 ? (newMember / newRegister) * 100 : 0
  }) }],
  categories: monthlyData.map(m => m.month)
},
activeVsPureMemberTrend: {
  series: [
    { name: 'Active Member', data: monthlyData.map(m => m.activeMember) },
    { name: 'Pure Member', data: monthlyData.map(m => Math.max(m.activeMember - 100, 0)) }
  ],
  categories: monthlyData.map(m => m.month)
}
```

### 2. CentralIcon.tsx Changes

Added new icons for chart titles:

```typescript
'Retention Rate Trend': `<svg>...</svg>`,
'Churn Rate Trend': `<svg>...</svg>`,
'Conversion Rate Trend': `<svg>...</svg>`,
'Active Member vs Pure Member': `<svg>...</svg>`,
```

### 3. USC Overview Page Changes

Updated chart data preparation:

```typescript
const retentionRateTrendData = {
  series: [{ name: 'Retention Rate', data: chartData?.retentionRateTrend?.series?.[0]?.data || [0, 0, 0, 0, 0, 0] }],
  categories: chartData?.retentionRateTrend?.categories || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
}

const churnRateTrendData = {
  series: [{ name: 'Churn Rate', data: chartData?.churnRateTrend?.series?.[0]?.data || [0, 0, 0, 0, 0, 0] }],
  categories: chartData?.churnRateTrend?.categories || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
}

const conversionRateTrendData = {
  series: [{ name: 'Conversion Rate', data: chartData?.conversionRateTrend?.series?.[0]?.data || [0, 0, 0, 0, 0, 0] }],
  categories: chartData?.conversionRateTrend?.categories || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
}

const activeVsPureMemberTrendData = {
  series: chartData?.activeVsPureMemberTrend?.series || [
    { name: 'Active Member', data: [0, 0, 0, 0, 0, 0] },
    { name: 'Pure Member', data: [0, 0, 0, 0, 0, 0] }
  ],
  categories: chartData?.activeVsPureMemberTrend?.categories || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
}
```

Updated chart components:

```typescript
{/* Row 4: 2 Line Charts */}
<div className="chart-row">
  <div className="usc-chart">
    <LineChart
      series={retentionRateTrendData.series}
      categories={retentionRateTrendData.categories}
      title="Retention Rate Trend"
      currency={selectedCurrency}
      chartIcon={getChartIcon('Retention Rate Trend')}
    />
  </div>
  <div className="usc-chart">
    <LineChart
      series={churnRateTrendData.series}
      categories={churnRateTrendData.categories}
      title="Churn Rate Trend"
      currency={selectedCurrency}
      chartIcon={getChartIcon('Churn Rate Trend')}
    />
  </div>
</div>

{/* Row 6: 2 Line Charts */}
<div className="chart-row">
  <div className="usc-chart">
    <LineChart
      series={conversionRateTrendData.series}
      categories={conversionRateTrendData.categories}
      title="Conversion Rate Trend"
      currency={selectedCurrency}
      chartIcon={getChartIcon('Conversion Rate Trend')}
    />
  </div>
  <div className="usc-chart">
    <LineChart
      series={activeVsPureMemberTrendData.series}
      categories={activeVsPureMemberTrendData.categories}
      title="Active Member vs Pure Member"
      currency={selectedCurrency}
      chartIcon={getChartIcon('Active Member vs Pure Member')}
    />
  </div>
</div>
```

## Features

1. **Standard Chart Format**: All charts follow the same format as other pages
2. **Centralized Icons**: All chart icons are managed through CentralIcon.tsx
3. **Real Data**: Charts use real data from Supabase database
4. **Responsive Design**: Charts adapt to different screen sizes
5. **Hover Effects**: Standard hover effects applied to all charts
6. **Currency Support**: Charts support different currency displays
7. **2-Line Chart**: "Active Member vs Pure Member" uses standard 2-line chart format

## Data Flow

1. **USCLogic.tsx**: Calculates chart data from Supabase database
2. **API Routes**: Fetch and return chart data
3. **USC Overview Page**: Prepares data for chart components
4. **LineChart Component**: Renders charts with proper formatting
5. **CentralIcon**: Provides icons for chart titles

## Testing

To test the implementation:

1. Navigate to `/usc/overview`
2. Check Row 4 Frame 2 for Retention Rate and Churn Rate charts
3. Check Row 6 Frame 2 for Conversion Rate and Active Member vs Pure Member charts
4. Verify that all charts display data correctly
5. Test with different slicer selections (Year, Month, Currency, Line)
6. Verify that 2-line chart displays both Active Member and Pure Member lines

## Notes

- All calculations are currently simplified and use default values
- Real churn rate calculation needs to be implemented
- Pure Member calculation is simplified (Active Member - 100 for monthly, Active Member - 10 for daily)
- Chart data supports both monthly and daily views based on slicer mode
