# 7. COMPONENT STANDARDS

[← Back to Index](./00-INDEX.md)

---

## 7.1 StatCard Standard

### Basic Usage

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

### Props Interface

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

### Grid Layout

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

---

## 7.2 Chart Standards

### LineChart Usage

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

### Dual-Line Chart

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

### BarChart Usage

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

### Chart Grid Layout

```tsx
{/* 3 Charts per Row */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
  <LineChart {...chart1} />
  <LineChart {...chart2} />
  <BarChart {...chart3} />
</div>
```

---

## 7.3 Chart Configuration Standards

### Colors
- **Single series:** `#3B82F6` (Blue)
- **Dual series:** `#3B82F6` (Blue), `#F97316` (Orange)
- **Positive:** `#059669` (Green)
- **Negative:** `#dc2626` (Red)

### Height
- **Default:** `350px`
- **Compact:** `300px`
- **Expanded:** `400px`

### Tooltip

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

---

## 7.4 Slicer Standards

### Basic Slicer

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

### Component-based Slicer

```tsx
import { YearSlicer, MonthSlicer, LineSlicer } from '@/components/slicers'

<YearSlicer 
  years={years}
  selectedYear={selectedYear}
  onYearChange={setSelectedYear}
/>
```

---

## 📋 Component Usage Examples

### Complete Page Example

```tsx
export default function DashboardPage() {
  const [kpiData, setKpiData] = useState(null)
  const [chartData, setChartData] = useState(null)

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="standard">
        {/* KPI Row */}
        <div className="kpi-row">
          <StatCard
            title="DEPOSIT AMOUNT"
            value={formatCurrencyKPI(kpiData?.depositAmount, 'MYR')}
            icon="Deposit Amount"
            additionalKpi={{
              label: "DAILY AVERAGE",
              value: formatCurrencyKPI(dailyAvg, 'MYR')
            }}
            comparison={{
              percentage: formatMoMChange(mom),
              isPositive: mom > 0
            }}
          />
          {/* More StatCards */}
        </div>

        {/* Chart Row */}
        <div className="grid grid-cols-3 gap-6">
          <LineChart
            series={[{ name: 'Trend', data: chartData }]}
            categories={months}
            title="MONTHLY TREND"
            currency="MYR"
            chartIcon={getChartIcon('trend')}
          />
          {/* More Charts */}
        </div>
      </Frame>
    </Layout>
  )
}
```

---

## 📌 Key Takeaways

1. **StatCard** for KPI display with optional Daily Average & MoM
2. **LineChart** for trends (single or dual-series)
3. **BarChart** for comparisons
4. **Standard colors** for consistency
5. **Grid layouts** for responsive design
6. **Component-based slicers** for reusability

---

**Previous:** [← 06 - Layout System](./06-LAYOUT-SYSTEM.md)  
**Next:** [08 - API Architecture](./08-API-ARCHITECTURE.md) →

