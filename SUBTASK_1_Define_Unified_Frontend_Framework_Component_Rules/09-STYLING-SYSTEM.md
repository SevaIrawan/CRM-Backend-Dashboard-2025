# 9. STYLING SYSTEM

[← Back to Index](./00-INDEX.md)

---

## 9.1 Global CSS Organization

### File: `app/globals.css`

### Structure

```css
/* 1. Reset & Base Styles */
/* 2. Layout System */
/* 3. Component Base Classes */
/* 4. Utility Classes */
/* 5. Responsive Breakpoints */
```

---

## 9.2 Centralized Spacing

### Standard Gap: `18px` for all elements

```css
.standard-frame,
.kpi-row,
.charts-row,
.chart-grid {
  gap: 18px;
}
```

### Standard Padding

```css
.standard-frame {
  padding: 20px;
}

.stat-card {
  padding: 16px;
}
```

---

## 9.3 Component Base Classes

### StatCard

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

### Chart Container

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

---

## 9.4 Color Palette

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

---

## 9.5 Typography System

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

---

## 9.6 Grid System

### KPI Row (6 columns)

```css
.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}
```

### Chart Row (3 columns)

```css
.charts-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}
```

### Chart Row (2 columns)

```css
.charts-row-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}
```

---

## 📋 Styling Examples

### Complete Page Styling

```tsx
export default function DashboardPage() {
  return (
    <Layout>
      <Frame variant="standard">
        {/* KPI Row - 6 columns */}
        <div className="kpi-row">
          <StatCard {...kpi1} />
          <StatCard {...kpi2} />
          <StatCard {...kpi3} />
          <StatCard {...kpi4} />
          <StatCard {...kpi5} />
          <StatCard {...kpi6} />
        </div>

        {/* Chart Row 1 - 3 columns */}
        <div className="charts-row">
          <LineChart {...chart1} />
          <LineChart {...chart2} />
          <BarChart {...chart3} />
        </div>

        {/* Chart Row 2 - 3 columns */}
        <div className="charts-row">
          <LineChart {...chart4} />
          <LineChart {...chart5} />
          <BarChart {...chart6} />
        </div>
      </Frame>
    </Layout>
  )
}
```

### Custom Card Styling

```css
.custom-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.custom-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.custom-card-title {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}
```

---

## 📌 Key Takeaways

1. **Centralized spacing:** 18px gap standard
2. **CSS variables** for colors (easy theming)
3. **Grid system** for responsive layouts
4. **Consistent typography** across all components
5. **Hover effects** for better UX

---

**Previous:** [← 08 - API Architecture](./08-API-ARCHITECTURE.md)  
**Next:** [10 - Icon System](./10-ICON-SYSTEM.md) →

