01. CHART STANDARDS

[← Back to Index](./00-INDEX.md)

================================================================================

SUPPORTED CHART TYPES

| Chart Type | Use Case | Component | Priority |
|------------|----------|-----------|----------|
| Line Chart | Trend analysis, time-series data | LineChart.tsx | HIGH |
| Bar Chart | Comparisons, categorical data | BarChart.tsx | HIGH |
| Stacked Bar Chart | Part-to-whole comparisons | StackedBarChart.tsx | MEDIUM |
| Donut Chart | Percentage distribution | DonutChart.tsx | MEDIUM |
| Sankey Chart | Flow visualization | SankeyChart.tsx | LOW |
| Mixed Chart | Multiple metrics, different scales | LineChart.tsx (dual-axis) | MEDIUM |

================================================================================

LINE CHART STANDARDS

Single-Line Chart

Use Case: Trend visualization for single metric over time

Standard Configuration:
```typescript
<LineChart
  series={[{ 
    name: 'Deposit Amount', 
    data: monthlyData.map(m => m.depositAmount) 
  }]}
  categories={months.map(m => m.substring(0, 3))}
  title="DEPOSIT AMOUNT TREND"
  currency="MYR"
  chartIcon={getChartIcon('Deposit Amount')}
  hideLegend={true}
  color="#3B82F6"
/>
```

Visual Standards:
- Line Color: #3B82F6 (Blue)
- Background Fill: #3B82F620 (Blue with 20% opacity)
- Line Width: 3px
- Point Radius: 6px (normal), 8px (hover)
- Point Border: White 2px
- Tension: 0.4 (smooth curves)
- Legend: Hidden for single series

Chart Options:
```typescript
{
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: 'transparent',
      titleColor: '#fff',
      bodyColor: '#fff'
    }
  },
  scales: {
    y: {
      beginAtZero: false,
      suggestedMax: maxValue * 1.2,
      grid: { color: 'rgba(229, 231, 235, 0.3)' },
      ticks: { color: '#6b7280', font: { size: 11 } }
    },
    x: {
      grid: { display: false },
      ticks: { color: '#6b7280', font: { size: 11 } }
    }
  }
}
```

--------------------------------------------------------------------------------

Dual-Line Chart

Use Case: Compare 2 related metrics with different scales

Standard Configuration:
```typescript
<LineChart
  series={[
    { name: 'Active Member', data: [...], color: '#3B82F6' },
    { name: 'Purchase Frequency', data: [...], color: '#F97316' }
  ]}
  categories={months}
  title="ACTIVE MEMBER & PURCHASE FREQUENCY"
  chartIcon={getChartIcon('Active Member')}
/>
```

Visual Standards:
- First Series Color: #3B82F6 (Blue)
- Second Series Color: #F97316 (Orange)
- Y-Axes: Dual (left for first series, right for second series)
- Legend: Shown in chart header (NOT in chart area)
- Grid Lines: Only from left Y-axis

Dual Y-Axis Configuration:
```typescript
scales: {
  y: {
    type: 'linear',
    position: 'left',
    ticks: { color: '#6b7280' },
    grid: { color: 'rgba(229, 231, 235, 0.3)' }
  },
  y1: {
    type: 'linear',
    position: 'right',
    ticks: { color: '#6b7280' },
    grid: { drawOnChartArea: false }
  }
}
```

================================================================================

BAR CHART STANDARDS

Single-Bar Chart

Use Case: Category comparisons, monthly totals

Standard Configuration:
```typescript
<BarChart
  series={[{ 
    name: 'Deposit Cases', 
    data: monthlyData.map(m => m.depositCases) 
  }]}
  categories={months}
  title="DEPOSIT CASES TREND"
  currency="CASES"
  chartIcon={getChartIcon('deposits')}
  showDataLabels={true}
  color="#3B82F6"
/>
```

Visual Standards:
- Bar Color: #3B82F6 (Blue)
- Bar Width: Auto (responsive)
- Data Labels: ALWAYS shown on top of bars
- Label Color: #1f2937 (Dark gray/black)
- Label Font: Bold, 10px
- Label Position: anchor 'end', align 'top', offset -2

Chart Options:
```typescript
{
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    datalabels: {
      display: true,
      color: '#1f2937',
      font: { weight: 'bold', size: 10 },
      anchor: 'end',
      align: 'top',
      offset: -2,
      formatter: (value) => {
        if (currency === 'CASES') return formatIntegerKPI(value) + 'c';
        if (currency === 'MYR') return formatCurrencyKPI(value, 'MYR');
        return formatIntegerKPI(value);
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: maxValue * 1.08,
      ticks: {
        stepSize: Math.ceil(maxValue / 5),
        color: '#6b7280'
      },
      grid: { color: 'rgba(229, 231, 235, 0.3)' }
    }
  }
}
```

--------------------------------------------------------------------------------

Dual-Bar Chart

Use Case: Side-by-side comparison of 2 categories

Visual Standards:
- First Series Color: #3B82F6 (Blue)
- Second Series Color: #F97316 (Orange)
- Bar Grouping: Side-by-side (grouped)
- Legend: Shown in chart header
- Data Labels: Optional (often omitted for dual bars to avoid clutter)

================================================================================

STACKED BAR CHART STANDARDS

Use Case: Part-to-whole relationships over time

Visual Standards:
- Colors: Use sequential palette from colors array
- Stacking: Full 100% or value-based
- Legend: Shown in chart header
- Tooltip: Show individual values plus total

================================================================================

DONUT CHART STANDARDS

Use Case: Percentage distribution, composition breakdown

Standard Configuration:
```typescript
<DonutChart
  data={[
    { label: 'Category A', value: 45, color: '#3B82F6' },
    { label: 'Category B', value: 30, color: '#F97316' },
    { label: 'Category C', value: 25, color: '#10b981' }
  ]}
  title="DISTRIBUTION BY CATEGORY"
/>
```

Visual Standards:
- Cutout: 70% (donut hole size)
- Colors: Use categorical palette (see Color Palette section)
- Labels: Show percentage plus value
- Legend: Show on right side
- Center Text: Total value or title

================================================================================

SANKEY CHART STANDARDS

Use Case: Flow visualization (customer journey, conversion funnel)

Visual Standards:
- Node Color: Based on category
- Link Color: Semi-transparent (opacity 0.4)
- Node Width: 15px
- Link Curvature: 0.5

================================================================================

UNIVERSAL CHART STANDARDS

All charts must follow these standards:

Container:
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

Header:
```tsx
<div className="chart-header">
  <div className="chart-icon">{chartIcon}</div>
  <h3 className="chart-title">{title}</h3>
  {legend && <div className="chart-legend">{legend}</div>}
</div>
```

Dimensions:
- Default Height: 350px
- Compact Height: 300px
- Expanded Height: 400px
- Responsive: maintainAspectRatio false

Interaction:
- Double-Click: Open ChartZoomModal for full-screen view
- Tooltip: Always enabled with consistent styling
- Hover: Subtle elevation effect on container

================================================================================

Previous: [← 00 - Index](./00-INDEX.md)  
Next: [02 - Typography System](./02-TYPOGRAPHY-SYSTEM.md) →

