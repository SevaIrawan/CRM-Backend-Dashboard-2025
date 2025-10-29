# 6. LAYOUT SYSTEM

[← Back to Index](./00-INDEX.md)

---

## 6.1 Standard Layout Structure

```tsx
<Layout customSubHeader={customSubHeader}>
  <Frame variant="standard">
    {/* Page Content */}
  </Frame>
</Layout>
```

---

## 6.2 Layout Component Props

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

---

## 6.3 Frame Variants

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

---

## 6.4 Layout Dimensions

| **Element** | **Dimension** | **Behavior** |
|-------------|---------------|--------------|
| **Sidebar** | 280px expanded / 100px collapsed | Fixed position, left |
| **Header** | 70px height | Fixed position, top |
| **SubHeader** | 60px height | Fixed position, below header |
| **Content** | `margin-left: 280px` (auto-adjust) | Scrollable |
| **Frame** | `height: calc(100vh - 130px)` | Vertical scroll only |

---

## 6.5 SubHeader Pattern

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

## 📋 Layout Examples

### Basic Page Layout
```tsx
export default function DashboardPage() {
  return (
    <Layout>
      <Frame variant="standard">
        <div className="kpi-row">
          <StatCard {...kpi1} />
          <StatCard {...kpi2} />
        </div>
        <div className="charts-row">
          <LineChart {...chart1} />
          <BarChart {...chart2} />
        </div>
      </Frame>
    </Layout>
  )
}
```

### Page with SubHeader
```tsx
export default function AnalyticsPage() {
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-controls">
        <YearSlicer {...} />
        <MonthSlicer {...} />
      </div>
    </div>
  )

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="standard">
        {/* Page content */}
      </Frame>
    </Layout>
  )
}
```

### Compact Layout
```tsx
export default function ReportPage() {
  return (
    <Layout>
      <Frame variant="compact">
        {/* Tighter spacing for data-heavy pages */}
        <DataTable {...} />
      </Frame>
    </Layout>
  )
}
```

---

## 📐 Visual Layout Structure

```
┌─────────────────────────────────────────────┐
│ Header (70px)                               │
├─────────────────────────────────────────────┤
│ SubHeader (60px) - Optional                 │
├──────────┬──────────────────────────────────┤
│          │                                   │
│ Sidebar  │  Frame (Content Area)            │
│ (280px)  │  ├─ KPI Row                      │
│          │  ├─ Chart Row 1                  │
│ Fixed    │  ├─ Chart Row 2                  │
│ Position │  └─ Additional Rows              │
│          │                                   │
│          │  (Scrollable)                    │
│          │                                   │
└──────────┴──────────────────────────────────┘
```

---

## 📌 Key Takeaways

1. **Layout** wraps entire page (Sidebar + Header + Content)
2. **Frame** wraps page content with variants
3. **SubHeader** optional for filters/slicers
4. **Fixed dimensions** for consistency
5. **Responsive** to sidebar collapse

---

**Previous:** [← 05 - File Organization](./05-FILE-ORGANIZATION.md)  
**Next:** [07 - Component Standards](./07-COMPONENT-STANDARDS.md) →

