# 5. FILE ORGANIZATION

[← Back to Index](./00-INDEX.md)

---

## 5.1 Components Directory

```
components/
├── Layout.tsx                # Main layout wrapper
├── Frame.tsx                 # Content frame
├── Header.tsx                # Top header
├── Sidebar.tsx               # Side navigation
├── SubHeader.tsx             # Filter bar
├── StatCard.tsx              # Standard KPI card
├── ComparisonStatCard.tsx    # Comparison card
├── DualKPICard.tsx           # Dual metric card
├── ProgressBarStatCard.tsx   # Progress card
├── LineChart.tsx             # Line chart
├── BarChart.tsx              # Bar chart
├── StackedBarChart.tsx       # Stacked bar
├── SankeyChart.tsx           # Sankey diagram
├── slicers/                  # Slicer components group
│   ├── index.ts              # Export all slicers
│   ├── YearSlicer.tsx
│   ├── MonthSlicer.tsx
│   ├── LineSlicer.tsx
│   ├── QuarterSlicer.tsx
│   └── DateRangeSlicer.tsx
├── CustomerDetailModal.tsx
├── ChartZoomModal.tsx
├── AccessControl.tsx
├── ActivityTracker.tsx
└── Icons.tsx                 # Legacy (use CentralIcon instead)
```

### Rules
- ✅ One component per file
- ✅ Component name = File name
- ✅ Group related components in subfolders
- ✅ Use `index.ts` for clean exports

---

## 5.2 Lib Directory (Business Logic)

```
lib/
├── CentralIcon.tsx           # Icon system
├── formatHelpers.ts          # Number formatting
├── kpiHelpers.ts             # KPI calculations
├── supabase.ts               # Database client
├── [Category]Logic.ts        # Category-specific logic
├── [Category]DailyAverageAndMoM.ts  # Daily avg & MoM logic
└── [Feature]Helper.ts        # Feature-specific helpers
```

### Rules
- ✅ Business logic ONLY (no UI)
- ✅ Reusable functions
- ✅ Category-specific logic in separate files
- ✅ Export individual functions (not default export)

### Example
```typescript
// ✅ lib/formatHelpers.ts
export function formatCurrencyKPI(value: number, currency: string): string {
  // Implementation
}

export function formatPercentageKPI(value: number): string {
  // Implementation
}
```

---

## 5.3 Utils Directory (Generic Utilities)

```
utils/
├── centralLogic.ts           # Central utility functions
├── rolePermissions.ts        # RBAC utilities
├── sessionCleanup.ts         # Session management
└── pageVisibilityHelper.ts   # Page visibility utils
```

### Rules
- ✅ Generic, framework-agnostic functions
- ✅ No business logic
- ✅ Reusable across projects

### Example
```typescript
// ✅ utils/rolePermissions.ts
export function hasPermission(role: string, action: string): boolean {
  // Generic permission check
}
```

---

## 5.4 App Directory (Pages & API)

```
app/
├── api/                                    # API routes
│   ├── [category]-[feature]/              # Feature APIs
│   │   ├── slicer-options/
│   │   │   └── route.ts                   # GET slicer data
│   │   ├── chart-data/
│   │   │   └── route.ts                   # GET chart data
│   │   ├── data/
│   │   │   └── route.ts                   # GET table data
│   │   └── export/
│   │       └── route.ts                   # GET export CSV
│   └── feedback/
│       └── submit/
│           └── route.ts
├── [category]/                            # Category pages
│   ├── [feature]/
│   │   ├── page.tsx                       # Feature page
│   │   └── layout.tsx                     # Feature layout (optional)
│   └── page.tsx                           # Category landing
├── dashboard/
│   └── page.tsx                           # Main dashboard
├── layout.tsx                             # Root layout
├── page.tsx                               # Home page
└── globals.css                            # Global styles
```

### API Route Pattern
```
/api/{category}-{feature}/{endpoint}/route.ts
```

### Examples
```
/api/myr-overview/slicer-options/route.ts
/api/sgd-business-performance/data/route.ts
/api/usc-member-analytic/chart-data/route.ts
```

---

## 📋 Organization Best Practices

### ✅ DO's

```
✅ Group by feature/domain
components/
  slicers/
    YearSlicer.tsx
    MonthSlicer.tsx
    index.ts

✅ Separate concerns
lib/formatHelpers.ts     # Pure logic
components/StatCard.tsx  # Pure UI

✅ Use index files for clean imports
// components/slicers/index.ts
export { YearSlicer } from './YearSlicer'
export { MonthSlicer } from './MonthSlicer'

// Usage
import { YearSlicer, MonthSlicer } from '@/components/slicers'
```

### ❌ DON'T's

```
❌ Mix concerns
components/StatCard.tsx
  // Contains business logic ❌

❌ Deep nesting (max 3 levels)
components/
  dashboard/
    cards/
      kpi/
        stats/
          StatCard.tsx  ❌ Too deep!

❌ Unclear grouping
components/
  Component1.tsx
  Component2.tsx
  utils.tsx  ❌ What utils?
```

---

## 📌 Key Takeaways

1. **Clear separation**: `components/` (UI), `lib/` (business logic), `utils/` (utilities)
2. **Feature-based grouping** in subfolders
3. **One component per file** with matching names
4. **Index files** for clean imports
5. **Max 3 levels** of nesting

---

**Previous:** [← 04 - Naming Conventions](./04-NAMING-CONVENTIONS.md)  
**Next:** [06 - Layout System](./06-LAYOUT-SYSTEM.md) →

