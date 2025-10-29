# 3. COMPONENT ARCHITECTURE

[← Back to Index](./00-INDEX.md)

---

## 3.1 Component Hierarchy

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

---

## 3.2 Component Categories

### 1. Layout Components
- `Layout.tsx` - Main wrapper with sidebar & header
- `Frame.tsx` - Content container with variants
- `Header.tsx` - Top navigation bar
- `Sidebar.tsx` - Side navigation menu
- `SubHeader.tsx` - Filter/slicer bar

### 2. KPI Card Components
- `StatCard.tsx` - Standard single value card
- `ComparisonStatCard.tsx` - Two-period comparison
- `DualKPICard.tsx` - Two metrics in one card
- `ProgressBarStatCard.tsx` - Progress towards target

### 3. Chart Components
- `LineChart.tsx` - Trend visualization
- `BarChart.tsx` - Comparison visualization
- `StackedBarChart.tsx` - Multi-series bars
- `DonutChart.tsx` - Percentage distribution
- `SankeyChart.tsx` - Flow diagram

### 4. Slicer Components (`components/slicers/`)
- `YearSlicer.tsx` - Year selection
- `MonthSlicer.tsx` - Month selection
- `LineSlicer.tsx` - Category/line selection
- `QuarterSlicer.tsx` - Quarter selection
- `DateRangeSlicer.tsx` - Custom date range

### 5. Modal Components
- `CustomerDetailModal.tsx` - Detail drill-down
- `ChartZoomModal.tsx` - Chart enlargement
- `TargetEditModal.tsx` - Target editing

### 6. Utility Components
- `AccessControl.tsx` - Role-based access
- `ActivityTracker.tsx` - User activity logging
- `PageTransition.tsx` - Smooth page transitions
- `SkeletonLoader.tsx` - Loading states

---

## 3.3 Component Organization Pattern

```
components/
├── Layout Components (5)
│   ├── Layout.tsx
│   ├── Frame.tsx
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── SubHeader.tsx
│
├── KPI Components (4)
│   ├── StatCard.tsx
│   ├── ComparisonStatCard.tsx
│   ├── DualKPICard.tsx
│   └── ProgressBarStatCard.tsx
│
├── Chart Components (5)
│   ├── LineChart.tsx
│   ├── BarChart.tsx
│   ├── StackedBarChart.tsx
│   ├── DonutChart.tsx
│   └── SankeyChart.tsx
│
├── Slicer Components (7)
│   └── slicers/
│       ├── YearSlicer.tsx
│       ├── MonthSlicer.tsx
│       ├── LineSlicer.tsx
│       ├── QuarterSlicer.tsx
│       ├── DateRangeSlicer.tsx
│       ├── CurrencySlicer.tsx
│       └── index.ts
│
├── Modal Components (5)
│   ├── CustomerDetailModal.tsx
│   ├── ChartZoomModal.tsx
│   ├── TargetEditModal.tsx
│   ├── ActiveMemberDetailsModal.tsx
│   └── OverdueDetailsModal.tsx
│
└── Utility Components (7)
    ├── AccessControl.tsx
    ├── ActivityTracker.tsx
    ├── PageTransition.tsx
    ├── SkeletonLoader.tsx
    ├── FeedbackWidget.tsx
    ├── NavPrefetch.tsx
    └── RealtimeTimestamp.tsx
```

**Total: 34 Standard Components**

---

## 📌 Key Takeaways

1. **6 categories** of components with clear purposes
2. **34 standard components** documented
3. **Hierarchical structure** from Layout → Content → Components
4. **Separation of concerns** (Layout vs Data vs Interaction)

---

**Previous:** [← 02 - Page Hierarchy](./02-PAGE-HIERARCHY.md)  
**Next:** [04 - Naming Conventions](./04-NAMING-CONVENTIONS.md) →

