# CBO DEPARTMENT - VISUALIZATION STANDARDS v1.0.0

> **Purpose:** Standardized visualization elements untuk consistency across all CBO dashboards  
> **Based on:** Production dashboard best practices & industry standards  
> **Last Updated:** October 27, 2025  
> **Status:** Ready for Implementation

---

## 📑 TABLE OF CONTENTS

1. [Chart Standards](#1-chart-standards)
2. [Typography System](#2-typography-system)
3. [Color Palette](#3-color-palette)
4. [Layout & Spacing](#4-layout--spacing)
5. [Responsive Design](#5-responsive-design)
6. [Accessibility Guidelines](#6-accessibility-guidelines)
7. [Animation & Interaction](#7-animation--interaction)

---

## 1. CHART STANDARDS

### 1.1 Supported Chart Types

| Chart Type | Use Case | Component | Priority |
|------------|----------|-----------|----------|
| **Line Chart** | Trend analysis, time-series data | `LineChart.tsx` | HIGH |
| **Bar Chart** | Comparisons, categorical data | `BarChart.tsx` | HIGH |
| **Stacked Bar Chart** | Part-to-whole comparisons | `StackedBarChart.tsx` | MEDIUM |
| **Donut Chart** | Percentage distribution | `DonutChart.tsx` | MEDIUM |
| **Sankey Chart** | Flow visualization | `SankeyChart.tsx` | LOW |
| **Mixed Chart** | Multiple metrics, different scales | `LineChart.tsx` (dual-axis) | MEDIUM |

---

### 1.2 Line Chart Standards

#### **Single-Line Chart**

**Use Case:** Trend visualization for single metric over time

**Standard Configuration:**
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
  color="#3B82F6"  // Single series = Blue
/>
```

**Visual Standards:**
- **Line Color:** `#3B82F6` (Blue)
- **Background Fill:** `#3B82F620` (Blue with 20% opacity)
- **Line Width:** `3px`
- **Point Radius:** `6px` (normal), `8px` (hover)
- **Point Border:** White `2px`
- **Tension:** `0.4` (smooth curves)
- **Legend:** Hidden for single series

**Chart Options:**
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
      suggestedMax: maxValue * 1.2,  // 20% padding
      grid: {
        color: 'rgba(229, 231, 235, 0.3)'
      },
      ticks: {
        color: '#6b7280',
        font: { size: 11 }
      }
    },
    x: {
      grid: { display: false },
      ticks: {
        color: '#6b7280',
        font: { size: 11 }
      }
    }
  }
}
```

---

#### **Dual-Line Chart**

**Use Case:** Compare 2 related metrics with different scales

**Standard Configuration:**
```typescript
<LineChart
  series={[
    { name: 'Active Member', data: [...], color: '#3B82F6' },
    { name: 'Purchase Frequency', data: [...], color: '#F97316' }
  ]}
  categories={months}
  title="ACTIVE MEMBER & PURCHASE FREQUENCY"
  chartIcon={getChartIcon('Active Member')}
  // hideLegend omitted = legend automatically shown
/>
```

**Visual Standards:**
- **First Series Color:** `#3B82F6` (Blue)
- **Second Series Color:** `#F97316` (Orange)
- **Y-Axes:** Dual (left for first series, right for second series)
- **Legend:** Shown in chart header (NOT in chart area)
- **Grid Lines:** Only from left Y-axis (right Y-axis has `drawOnChartArea: false`)

**Dual Y-Axis Configuration:**
```typescript
scales: {
  y: {
    type: 'linear',
    position: 'left',
    // First series scaling
    ticks: { color: '#6b7280' },
    grid: { color: 'rgba(229, 231, 235, 0.3)' }
  },
  y1: {
    type: 'linear',
    position: 'right',
    // Second series scaling
    ticks: { color: '#6b7280' },
    grid: {
      drawOnChartArea: false  // ✅ CRITICAL: No grid overlap
    }
  }
}
```

**Legend in Header:**
```tsx
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

---

### 1.3 Bar Chart Standards

#### **Single-Bar Chart**

**Use Case:** Category comparisons, monthly totals

**Standard Configuration:**
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
  showDataLabels={true}  // ✅ DEFAULT TRUE
  color="#3B82F6"
/>
```

**Visual Standards:**
- **Bar Color:** `#3B82F6` (Blue)
- **Bar Width:** Auto (responsive)
- **Data Labels:** ALWAYS shown on top of bars
- **Label Color:** `#1f2937` (Dark gray/black)
- **Label Font:** Bold, 10px
- **Label Position:** `anchor: 'end', align: 'top', offset: -2`

**Chart Options:**
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
      max: maxValue * 1.08,  // 8% padding for labels
      ticks: {
        stepSize: Math.ceil(maxValue / 5),
        color: '#6b7280'
      },
      grid: { color: 'rgba(229, 231, 235, 0.3)' }
    }
  }
}
```

---

#### **Dual-Bar Chart**

**Use Case:** Side-by-side comparison of 2 categories

**Standard Configuration:**
```typescript
<BarChart
  series={[
    { name: 'Deposit Amount', data: [...] },
    { name: 'Withdraw Amount', data: [...] }
  ]}
  categories={months}
  title="DEPOSIT VS WITHDRAW"
  currency="MYR"
/>
```

**Visual Standards:**
- **First Series Color:** `#3B82F6` (Blue)
- **Second Series Color:** `#F97316` (Orange)
- **Bar Grouping:** Side-by-side (grouped)
- **Legend:** Shown in chart header
- **Data Labels:** Optional (often omitted for dual bars to avoid clutter)

---

#### **Stacked Bar Chart**

**Use Case:** Part-to-whole relationships over time

**Visual Standards:**
- **Colors:** Use sequential palette from `colors` array
- **Stacking:** Full 100% or value-based
- **Legend:** Shown in chart header
- **Tooltip:** Show individual values + total

---

### 1.4 Donut Chart Standards

**Use Case:** Percentage distribution, composition breakdown

**Standard Configuration:**
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

**Visual Standards:**
- **Cutout:** `70%` (donut hole size)
- **Colors:** Use categorical palette (see Section 3.3)
- **Labels:** Show percentage + value
- **Legend:** Show on right side
- **Center Text:** Total value or title

---

### 1.5 Sankey Chart Standards

**Use Case:** Flow visualization (e.g., customer journey, conversion funnel)

**Visual Standards:**
- **Node Color:** Based on category
- **Link Color:** Semi-transparent (`opacity: 0.4`)
- **Node Width:** `15px`
- **Link Curvature:** `0.5`

---

### 1.6 Universal Chart Standards

**All charts must follow these standards:**

#### **Container**
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

#### **Header**
```tsx
<div className="chart-header">
  <div className="chart-icon">{chartIcon}</div>
  <h3 className="chart-title">{title}</h3>
  {legend && <div className="chart-legend">{legend}</div>}
</div>
```

```css
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chart-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  color: #6b7280;
}
```

#### **Dimensions**
- **Default Height:** `350px`
- **Compact Height:** `300px`
- **Expanded Height:** `400px`
- **Responsive:** `maintainAspectRatio: false`

#### **Interaction**
- **Double-Click:** Open `ChartZoomModal` for full-screen view
- **Tooltip:** Always enabled with consistent styling
- **Hover:** Subtle elevation effect on container

---

## 2. TYPOGRAPHY SYSTEM

### 2.1 Font Family

**Primary Font:**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Helvetica Neue', Arial, sans-serif;
```

**Monospace Font (for numbers/data):**
```css
font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 
             'Courier New', monospace;
```

---

### 2.2 Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| **H1** | 28px | 700 | 1.2 | Page title |
| **H2** | 22px | 600 | 1.3 | Section title |
| **H3** | 16px | 600 | 1.4 | Subsection title |
| **Body Large** | 14px | 400 | 1.5 | Main content |
| **Body** | 13px | 400 | 1.5 | Standard text |
| **Body Small** | 12px | 400 | 1.4 | Helper text |
| **Caption** | 11px | 400 | 1.3 | Labels, captions |
| **Overline** | 11px | 600 | 1.2 | Uppercase labels |

---

### 2.3 StatCard Typography

```css
/* Card Title */
.stat-card-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.2;
}

/* Main Value */
.stat-card-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}

/* Additional KPI Label */
.additional-kpi-label {
  font-size: 11px;
  font-weight: 400;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Additional KPI Value */
.additional-kpi-value {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

/* Comparison Text */
.comparison-text {
  font-size: 10px;
  font-weight: 600;
}
```

---

### 2.4 Chart Typography

```css
/* Chart Title */
.chart-title {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Chart Data Labels */
.chart-data-label {
  font-size: 10px;
  font-weight: 600;
  color: #1f2937;
}

/* Chart Legend */
.chart-legend-item {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

/* Chart Axis Labels */
.chart-axis-label {
  font-size: 11px;
  font-weight: 400;
  color: #6b7280;
}
```

---

### 2.5 Slicer Typography

```css
/* Slicer Label */
.slicer-label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Slicer Select */
.subheader-select {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}
```

---

## 3. COLOR PALETTE

### 3.1 Primary Colors

```css
--color-primary: #3B82F6;        /* Blue - Main brand color */
--color-primary-light: #60A5FA;  /* Light blue - Hover states */
--color-primary-dark: #2563EB;   /* Dark blue - Active states */

--color-secondary: #F97316;      /* Orange - Secondary brand color */
--color-secondary-light: #FB923C; /* Light orange - Hover states */
--color-secondary-dark: #EA580C;  /* Dark orange - Active states */
```

**Usage:**
- **Primary (Blue):** Single-series charts, primary buttons, links
- **Secondary (Orange):** Second series in dual charts, secondary buttons

---

### 3.2 Status Colors

```css
/* Success - Positive metrics */
--color-success: #059669;        /* Green */
--color-success-light: #10b981;
--color-success-dark: #047857;
--color-success-bg: #D1FAE5;     /* Light green background */

/* Danger - Negative metrics */
--color-danger: #dc2626;         /* Red */
--color-danger-light: #ef4444;
--color-danger-dark: #b91c1c;
--color-danger-bg: #FEE2E2;      /* Light red background */

/* Warning - Caution */
--color-warning: #f59e0b;        /* Yellow/Amber */
--color-warning-light: #fbbf24;
--color-warning-dark: #d97706;
--color-warning-bg: #FEF3C7;     /* Light yellow background */

/* Info */
--color-info: #3b82f6;           /* Blue */
--color-info-light: #60a5fa;
--color-info-dark: #2563eb;
--color-info-bg: #DBEAFE;        /* Light blue background */
```

**Usage:**
- **Success (Green):** Positive MoM changes, growth indicators, on-track status
- **Danger (Red):** Negative MoM changes, decline indicators, at-risk status
- **Warning (Orange/Yellow):** Behind status, caution indicators
- **Info (Blue):** Neutral information, hints

---

### 3.3 Chart Color Palettes

#### **Single Series**
```typescript
const singleSeriesColor = '#3B82F6'; // Blue
```

#### **Dual Series**
```typescript
const dualSeriesColors = [
  '#3B82F6',  // Blue (first series)
  '#F97316'   // Orange (second series)
];
```

#### **Multi-Series (3-6 items)**
```typescript
const multiSeriesColors = [
  '#3B82F6',  // Blue
  '#F97316',  // Orange
  '#10b981',  // Green
  '#8b5cf6',  // Purple
  '#ec4899',  // Pink
  '#06b6d4'   // Cyan
];
```

#### **Categorical Palette (7+ items)**
```typescript
const categoricalColors = [
  '#3B82F6',  // Blue
  '#F97316',  // Orange
  '#10b981',  // Green
  '#8b5cf6',  // Purple
  '#ec4899',  // Pink
  '#06b6d4',  // Cyan
  '#f59e0b',  // Amber
  '#ef4444',  // Red
  '#6366f1',  // Indigo
  '#14b8a6'   // Teal
];
```

#### **Sequential Palette (Heatmaps, Gradients)**
```typescript
const sequentialBlue = [
  '#eff6ff',  // Lightest
  '#dbeafe',
  '#bfdbfe',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6',  // Base
  '#2563eb',
  '#1d4ed8',
  '#1e40af',
  '#1e3a8a'   // Darkest
];
```

---

### 3.4 Neutral Colors

```css
/* Text Colors */
--color-text-primary: #111827;      /* Almost black - Main headings */
--color-text-secondary: #374151;    /* Dark gray - Body text */
--color-text-tertiary: #6b7280;     /* Medium gray - Helper text */
--color-text-disabled: #9ca3af;     /* Light gray - Disabled text */

/* Background Colors */
--color-bg-primary: #ffffff;        /* White - Main background */
--color-bg-secondary: #f9fafb;      /* Off-white - Secondary background */
--color-bg-tertiary: #f3f4f6;       /* Light gray - Tertiary background */

/* Border Colors */
--color-border-primary: #e5e7eb;    /* Light gray - Main borders */
--color-border-secondary: #d1d5db;  /* Medium gray - Emphasized borders */
--color-border-tertiary: #9ca3af;   /* Dark gray - Strong borders */
```

---

### 3.5 Transparency Standards

**Background Fills (Charts):**
```typescript
const transparencyLevels = {
  subtle: '10',    // 10% opacity - Very subtle fill
  light: '20',     // 20% opacity - Standard chart background fill
  medium: '40',    // 40% opacity - Sankey links
  strong: '60',    // 60% opacity - Highlighted areas
  opaque: 'FF'     // 100% opacity - Solid color
};

// Usage in hex colors
const blueFill = '#3B82F620';  // Blue with 20% opacity
```

---

## 4. LAYOUT & SPACING

### 4.1 Spacing Scale

```css
/* Spacing Tokens */
--spacing-1: 4px;    /* xs - Tight spacing */
--spacing-2: 8px;    /* sm - Small spacing */
--spacing-3: 12px;   /* md - Compact spacing */
--spacing-4: 16px;   /* lg - Standard spacing */
--spacing-5: 20px;   /* xl - Comfortable spacing */
--spacing-6: 24px;   /* 2xl - Spacious */
--spacing-8: 32px;   /* 3xl - Large gaps */
--spacing-10: 40px;  /* 4xl - Section spacing */
--spacing-12: 48px;  /* 5xl - Major sections */
```

**Standard Gap:** `18px` for all grid layouts (KPI rows, chart rows)

---

### 4.2 Grid System

#### **KPI Card Row (6 Columns)**
```css
.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}

/* StatCard Dimensions */
.stat-card {
  height: 120px;
  padding: 16px;
}
```

#### **Chart Row (3 Columns)**
```css
.chart-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}

/* Chart Container */
.chart-container {
  min-height: 350px;
  padding: 24px;
}
```

#### **Chart Row (2 Columns)**
```css
.chart-row-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}
```

#### **Full Width**
```css
.chart-row-full {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  margin-bottom: 18px;
}
```

---

### 4.3 Component Spacing

#### **StatCard Internal Spacing**
```css
.stat-card {
  padding: 16px;
  gap: 8px;  /* Between elements */
}

.stat-card-header {
  margin-bottom: 8px;
}

.stat-card-value {
  margin-bottom: 4px;
}

.additional-kpi {
  margin-top: 8px;
  gap: 4px;
}
```

#### **Chart Internal Spacing**
```css
.chart-container {
  padding: 24px;
}

.chart-header {
  margin-bottom: 16px;
  gap: 8px;
}

.chart-legend {
  gap: 12px;
}
```

---

### 4.4 Border Radius

```css
/* Border Radius Tokens */
--radius-sm: 4px;   /* Small elements */
--radius-md: 8px;   /* Standard cards, buttons */
--radius-lg: 12px;  /* Large cards */
--radius-xl: 16px;  /* Modals */
--radius-full: 9999px;  /* Pills, badges */
```

**Usage:**
- **Cards (StatCard, Chart Container):** `8px`
- **Buttons:** `6px`
- **Inputs:** `6px`
- **Modals:** `12px`
- **Badges:** `9999px` (fully rounded)

---

## 5. RESPONSIVE DESIGN

### 5.1 Breakpoints

```css
/* Standard Breakpoints */
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet portrait */
--breakpoint-lg: 1024px;  /* Tablet landscape / Small desktop */
--breakpoint-xl: 1280px;  /* Desktop */
--breakpoint-2xl: 1536px; /* Large desktop */
```

---

### 5.2 Responsive Grid Behavior

#### **KPI Row**
```css
.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);  /* Desktop: 6 columns */
  gap: 18px;
}

@media (max-width: 1280px) {
  .kpi-row {
    grid-template-columns: repeat(3, 1fr);  /* Tablet: 3 columns */
  }
}

@media (max-width: 768px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);  /* Mobile: 2 columns */
  }
}

@media (max-width: 640px) {
  .kpi-row {
    grid-template-columns: 1fr;  /* Small mobile: 1 column */
  }
}
```

#### **Chart Row**
```css
.chart-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);  /* Desktop: 3 columns */
  gap: 18px;
}

@media (max-width: 1024px) {
  .chart-row {
    grid-template-columns: repeat(2, 1fr);  /* Tablet: 2 columns */
  }
}

@media (max-width: 768px) {
  .chart-row {
    grid-template-columns: 1fr;  /* Mobile: 1 column */
  }
}
```

---

### 5.3 Layout Dimensions

#### **Sidebar**
- Desktop: `280px` (expanded), `100px` (collapsed)
- Tablet: `280px` (overlay)
- Mobile: `280px` (overlay)

#### **Header**
- All devices: `70px` height (fixed)

#### **SubHeader**
- All devices: `60px` height (fixed)

#### **Content Area**
```css
.content-area {
  margin-left: 280px;  /* Desktop with expanded sidebar */
  padding: 20px;
  height: calc(100vh - 130px);  /* 100vh - (Header + SubHeader) */
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .content-area {
    margin-left: 0;  /* Tablet/Mobile: Full width */
  }
}
```

---

## 6. ACCESSIBILITY GUIDELINES

### 6.1 Color Contrast

**WCAG 2.1 AA Standards:**
- **Normal Text (< 18px):** Minimum contrast ratio `4.5:1`
- **Large Text (≥ 18px or ≥ 14px bold):** Minimum contrast ratio `3:1`
- **UI Components:** Minimum contrast ratio `3:1`

**Verified Combinations:**
```css
/* ✅ PASS - Text on White Background */
#111827 on #ffffff  /* 16.2:1 - Excellent */
#374151 on #ffffff  /* 12.6:1 - Excellent */
#6b7280 on #ffffff  /* 4.6:1 - Good (AA) */

/* ✅ PASS - White Text on Colored Background */
#ffffff on #3B82F6  /* 4.6:1 - Good (AA) */
#ffffff on #059669  /* 4.5:1 - Good (AA) */
#ffffff on #dc2626  /* 5.9:1 - Excellent */
```

---

### 6.2 Chart Accessibility

**Color Independence:**
- DO NOT rely on color alone to convey information
- Use patterns, labels, or icons in addition to color
- Ensure chart data labels are always shown when critical

**Alternative Text:**
- All charts must have descriptive titles
- Provide `aria-label` for interactive elements
- Consider providing data table alternative

**Keyboard Navigation:**
- All interactive charts must be keyboard accessible
- Focus indicators must be visible
- Tab order must be logical

---

### 6.3 Typography Accessibility

**Minimum Sizes:**
- Body text: `13px` minimum
- Labels/captions: `11px` minimum
- Data values: `14px` minimum for critical information

**Line Height:**
- Body text: `1.5` minimum
- Headings: `1.2` minimum

**Font Weight:**
- Avoid font weights below `400` (regular)
- Use `600` (semibold) or `700` (bold) for emphasis

---

## 7. ANIMATION & INTERACTION

### 7.1 Transition Standards

```css
/* Standard Transitions */
--transition-fast: 150ms ease;      /* Quick feedback */
--transition-base: 200ms ease;      /* Standard transitions */
--transition-slow: 300ms ease;      /* Smooth, noticeable */
--transition-slower: 500ms ease;    /* Deliberate, attention-grabbing */
```

**Usage:**
```css
/* Hover Effects */
.stat-card {
  transition: all 200ms ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Chart Container */
.chart-container {
  transition: all 200ms ease;
}

.chart-container:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

/* Buttons */
.button {
  transition: all 150ms ease;
}

.button:hover {
  background-color: var(--color-primary-light);
}
```

---

### 7.2 Chart Animations

**Entry Animation:**
```typescript
animation: {
  duration: 750,  // 750ms
  easing: 'easeInOutQuart'
}
```

**Update Animation:**
```typescript
animation: {
  duration: 400,  // 400ms
  easing: 'easeInOutCubic'
}
```

**Disable Animation (Performance):**
```typescript
// For large datasets (>100 data points)
animation: false
```

---

### 7.3 Interaction States

#### **Hover States**
```css
/* StatCard Hover */
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;  /* If clickable */
}

/* Chart Hover */
.chart-container:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

/* Button Hover */
.button:hover {
  background-color: var(--color-primary-light);
  transform: translateY(-1px);
}
```

#### **Active States**
```css
/* Button Active */
.button:active {
  transform: translateY(0);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

#### **Focus States**
```css
/* Keyboard Focus */
.button:focus,
.slicer-select:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Chart Interactive Element Focus */
.chart-element:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
```

---

## 8. IMPLEMENTATION CHECKLIST

### 8.1 Chart Implementation

For every new chart, ensure:
- [ ] Correct chart type selected based on data
- [ ] Standard colors applied (single: blue, dual: blue+orange)
- [ ] Container has white background + border + padding
- [ ] Chart title in header (uppercase, 12px, semibold)
- [ ] Icon included in header (20x20px)
- [ ] Tooltip enabled with standard styling
- [ ] Data labels shown (if applicable)
- [ ] Legend positioned correctly (header for dual, hidden for single)
- [ ] Responsive behavior configured
- [ ] Double-click to zoom enabled
- [ ] Accessibility attributes added

---

### 8.2 Layout Implementation

For every new page, ensure:
- [ ] KPI row with 6 cards (18px gap)
- [ ] Chart rows with 3 columns (18px gap)
- [ ] Standard spacing between rows (18px)
- [ ] Responsive breakpoints configured
- [ ] Content area scrollable (vertical only)
- [ ] Sidebar and headers fixed position
- [ ] Loading states implemented

---

### 8.3 Typography Implementation

For all text elements, ensure:
- [ ] Correct font size from type scale
- [ ] Appropriate font weight
- [ ] Correct line height
- [ ] Text color has sufficient contrast
- [ ] Uppercase for labels/overlines
- [ ] Consistent letter-spacing

---

## 9. QUICK REFERENCE

### Chart Colors Quick Guide

| Scenario | Color(s) | Hex Code(s) |
|----------|----------|-------------|
| Single line/bar | Blue | `#3B82F6` |
| First series (dual) | Blue | `#3B82F6` |
| Second series (dual) | Orange | `#F97316` |
| Positive indicator | Green | `#059669` |
| Negative indicator | Red | `#dc2626` |
| Warning indicator | Yellow | `#f59e0b` |

### Spacing Quick Guide

| Element | Spacing |
|---------|---------|
| Grid gap (KPI/Chart rows) | `18px` |
| StatCard padding | `16px` |
| Chart container padding | `24px` |
| Chart header margin-bottom | `16px` |
| Between KPI elements | `8px` |

### Typography Quick Guide

| Element | Size | Weight |
|---------|------|--------|
| Page title | 28px | 700 |
| Section title | 22px | 600 |
| StatCard title | 12px | 600 |
| StatCard value | 28px | 700 |
| Chart title | 12px | 600 |
| Chart data label | 10px | 600 |
| Body text | 13px | 400 |

---

**END OF DOCUMENT**

---

*This document is a living standard. Updates should be versioned and communicated to all CBO developers. For questions or clarifications, contact the Tech Lead.*

