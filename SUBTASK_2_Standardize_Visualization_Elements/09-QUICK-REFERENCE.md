09. QUICK REFERENCE

[← Back to Index](./00-INDEX.md)

================================================================================

CHART COLORS QUICK GUIDE

| Chart Type | Color(s) | Hex Code(s) |
|------------|----------|-------------|
| Single Line/Bar | Blue | #3B82F6 |
| Dual Line/Bar | Blue + Orange | #3B82F6 + #F97316 |
| Multi-Series (3-6) | Multi-palette | #3B82F6, #F97316, #10b981, #8b5cf6, #ec4899, #06b6d4 |
| Background Fill | Blue 20% | #3B82F620 |
| Success/Positive | Green | #059669 |
| Danger/Negative | Red | #dc2626 |
| Warning | Amber | #f59e0b |

================================================================================

SPACING QUICK GUIDE

| Element | Value | Usage |
|---------|-------|-------|
| Grid Gap | 18px | All KPI rows and chart rows |
| StatCard Padding | 16px | Internal card padding |
| Chart Padding | 24px | Internal chart container padding |
| Frame Padding | 20px | Standard frame (16px tablet, 12px mobile) |
| StatCard Height | 120px | Fixed height (auto on mobile) |
| Chart Height | 350px | Default (300px compact, 400px expanded) |
| Border Radius | 8px | Cards, charts, buttons (16px for modals) |

================================================================================

TYPOGRAPHY QUICK GUIDE

| Element | Size | Weight | Line Height | Color |
|---------|------|--------|-------------|-------|
| H1 (Page Title) | 28px | 700 | 1.2 | #111827 |
| H2 (Section Title) | 22px | 600 | 1.3 | #111827 |
| H3 (Subsection) | 16px | 600 | 1.4 | #374151 |
| Body Text | 13-14px | 400 | 1.5 | #374151 |
| StatCard Title | 12px | 600 | 1.2 | #6b7280 |
| StatCard Value | 28px | 700 | 1.1 | #111827 |
| Chart Title | 12px | 600 | - | #374151 |
| Data Label | 10px | 600 | - | #1f2937 |
| Caption | 11px | 400 | 1.3 | #6b7280 |

================================================================================

RESPONSIVE BREAKPOINTS QUICK GUIDE

| Screen | Width | KPI Columns | Chart Columns | Sidebar | Frame Padding |
|--------|-------|-------------|---------------|---------|---------------|
| Desktop | 1280px+ | 6 | 3 | 280px | 20px |
| Laptop | 1024px | 6 | 3 | 280px | 20px |
| Tablet | 768px | 3 | 2 | 100px | 16px |
| Mobile | 640px | 2 | 1 | Hidden | 12px |
| Small Mobile | <640px | 1-2 | 1 | Hidden | 12px |

================================================================================

ANIMATION DURATIONS

| Element | Duration | Easing | Usage |
|---------|----------|--------|-------|
| Hover Effects | 150-200ms | ease | StatCard, buttons, links |
| Focus States | 150ms | ease-out | All interactive elements |
| Modal Enter | 200ms | ease-out | Modals, overlays |
| Chart Entry | 500ms | easeOutQuart | Initial chart render |
| Chart Update | 300ms | easeInOutQuart | Data updates |
| Page Transition | 300-500ms | ease-in-out | Page changes |

================================================================================

COMMON PATTERNS

Single-Line Chart:
```typescript
<LineChart
  series={[{ name: 'Metric', data: [...] }]}
  categories={months}
  title="METRIC TREND"
  currency="MYR"
  chartIcon={getChartIcon('metric')}
  hideLegend={true}
  color="#3B82F6"
/>
```

Dual-Line Chart:
```typescript
<LineChart
  series={[
    { name: 'Metric 1', data: [...], color: '#3B82F6' },
    { name: 'Metric 2', data: [...], color: '#F97316' }
  ]}
  categories={months}
  title="COMPARISON"
  chartIcon={getChartIcon('metric')}
/>
```

Bar Chart with Data Labels:
```typescript
<BarChart
  series={[{ name: 'Cases', data: [...] }]}
  categories={months}
  title="CASES TREND"
  currency="CASES"
  showDataLabels={true}
  color="#3B82F6"
/>
```

StatCard with MoM:
```typescript
<StatCard
  title="DEPOSIT AMOUNT"
  value={formatCurrencyKPI(value, 'MYR')}
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
```

================================================================================

ACCESSIBILITY QUICK CHECKLIST

Must-Have:
- [ ] Color contrast minimum 4.5:1 for text
- [ ] All interactive elements keyboard accessible
- [ ] Visible focus indicators
- [ ] Alternative text for charts
- [ ] ARIA labels on custom components
- [ ] Semantic HTML used
- [ ] Does not rely on color alone

Nice-to-Have:
- [ ] Skip navigation links
- [ ] Data table alternatives for charts
- [ ] Live regions for dynamic updates
- [ ] Screen reader testing completed

================================================================================

WCAG CONTRAST RATIOS

| Foreground | Background | Ratio | Pass |
|------------|------------|-------|------|
| #111827 | #ffffff | 16.1:1 | ✓ AAA |
| #374151 | #ffffff | 11.4:1 | ✓ AAA |
| #6b7280 | #ffffff | 5.7:1 | ✓ AA |
| #3B82F6 | #ffffff | 4.7:1 | ✓ AA |
| #059669 | #ffffff | 3.9:1 | ✓ Large Text |
| #dc2626 | #ffffff | 5.9:1 | ✓ AA |

================================================================================

GRID LAYOUT TEMPLATES

6-Column KPI Row:
```css
display: grid;
grid-template-columns: repeat(6, 1fr);
gap: 18px;
margin-bottom: 18px;
```

3-Column Chart Row:
```css
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 18px;
margin-bottom: 18px;
```

2-Column Chart Row:
```css
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 18px;
```

Full-Width Element:
```css
width: 100%;
margin-bottom: 18px;
```

================================================================================

CHART CONFIGURATION SNIPPETS

Tooltip:
```typescript
tooltip: {
  mode: 'index',
  intersect: false,
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  titleColor: '#fff',
  bodyColor: '#fff'
}
```

Dual Y-Axis:
```typescript
y: { position: 'left', grid: { color: 'rgba(229, 231, 235, 0.3)' } },
y1: { position: 'right', grid: { drawOnChartArea: false } }
```

Data Labels (Bar):
```typescript
datalabels: {
  display: true,
  color: '#1f2937',
  font: { weight: 'bold', size: 10 },
  anchor: 'end',
  align: 'top',
  offset: -2
}
```

================================================================================

COLOR VARIABLES

Primary:
```css
--color-primary: #3B82F6;
--color-secondary: #F97316;
```

Status:
```css
--color-success: #059669;
--color-danger: #dc2626;
--color-warning: #f59e0b;
--color-info: #3b82f6;
```

Neutral:
```css
--color-text-primary: #111827;
--color-text-secondary: #374151;
--color-text-tertiary: #6b7280;
--color-border: #e5e7eb;
--color-bg: #ffffff;
```

================================================================================

COMMON ISSUES & SOLUTIONS

Issue: Chart Legend in Chart Area
Solution: Move legend to chart header, set display: false in chart options

Issue: Dual Y-Axis Grid Overlap
Solution: Set drawOnChartArea: false on right Y-axis

Issue: Data Labels Overlap Chart
Solution: Increase Y-axis max (maxValue * 1.08 for bars, * 1.2 for lines)

Issue: Poor Mobile Chart Performance
Solution: Disable animations, reduce data points, or use smaller height

Issue: Low Color Contrast
Solution: Use verified color combinations from color palette section

Issue: Broken Responsive Grid
Solution: Verify grid-template-columns and gap are set correctly

================================================================================

KEY TAKEAWAYS

1. Blue (#3B82F6) for single, Blue+Orange for dual charts
2. 18px gap for all grids, 16px padding for cards, 24px for charts
3. 350px default chart height, 120px StatCard height
4. Minimum 4.5:1 contrast ratio for text
5. 6→3→2 columns for KPI, 3→2→1 for charts (responsive)
6. System font stack, 12px uppercase titles with 0.5px spacing
7. 200ms standard transition, 500ms chart entry animation

================================================================================

Previous: [← 08 - Implementation Checklists](./08-IMPLEMENTATION-CHECKLISTS.md)  
[Back to Index](./00-INDEX.md)

END OF DOCUMENTATION

