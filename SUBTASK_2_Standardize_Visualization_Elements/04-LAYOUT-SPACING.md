04. LAYOUT & SPACING

[← Back to Index](./00-INDEX.md)

================================================================================

SPACING SCALE

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

Standard Gap: 18px for all grid layouts (KPI rows, chart rows)

================================================================================

GRID SYSTEM

KPI Card Row (6 Columns):
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

Chart Row (3 Columns):
```css
.charts-row {
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

Chart Row (2 Columns):
```css
.charts-row-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}
```

Full-Width Layout:
```css
.full-width {
  width: 100%;
  margin-bottom: 18px;
}
```

================================================================================

COMPONENT SPACING

StatCard Internal Spacing:
```css
.stat-card {
  padding: 16px;                    /* Internal padding */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;                          /* Space between elements */
}

.stat-card-title {
  margin-bottom: 4px;
}

.stat-card-value {
  margin-bottom: 8px;
}
```

Chart Internal Spacing:
```css
.chart-container {
  padding: 24px;                     /* Container padding */
}

.chart-header {
  margin-bottom: 16px;               /* Space below header */
  display: flex;
  align-items: center;
  gap: 8px;                          /* Space between header elements */
}

.chart-icon {
  margin-right: 8px;
}
```

Slicer Spacing:
```css
.dashboard-subheader {
  padding: 12px 20px;
}

.subheader-controls {
  display: flex;
  gap: 16px;                         /* Space between slicer groups */
}

.slicer-group {
  display: flex;
  align-items: center;
  gap: 8px;                          /* Space between label and select */
}
```

================================================================================

BORDER RADIUS TOKENS

```css
--radius-sm: 4px;     /* Small elements (badges, tags) */
--radius-md: 8px;     /* Standard (cards, buttons, inputs) */
--radius-lg: 12px;    /* Large containers */
--radius-xl: 16px;    /* Extra large (modals) */
--radius-full: 9999px; /* Fully rounded (pills, avatars) */
```

Usage:
- StatCard: 8px border-radius
- Chart Container: 8px border-radius
- Buttons: 8px border-radius
- Inputs: 8px border-radius
- Modals: 16px border-radius

================================================================================

FRAME PADDING

Standard Frame:
```css
.standard-frame {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
```

Compact Frame:
```css
.compact-frame {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

Full-Width Frame:
```css
.full-width-frame {
  padding: 0;
  width: 100%;
}
```

================================================================================

PAGE LAYOUT STRUCTURE

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar (280px) │  Header (70px)                        │
│                 ├───────────────────────────────────────┤
│                 │  SubHeader (60px) - Optional          │
│                 ├───────────────────────────────────────┤
│                 │  Frame (padding: 20px)                │
│  Fixed          │  ├─ KPI Row (gap: 18px)               │
│  Position       │  │  └─ 6 StatCards (120px height)    │
│                 │  │                                     │
│  Collapsible    │  ├─ Chart Row 1 (gap: 18px)           │
│  to 100px       │  │  └─ 3 Charts (350px height)       │
│                 │  │                                     │
│                 │  ├─ Chart Row 2 (gap: 18px)           │
│                 │  │  └─ 3 Charts (350px height)       │
│                 │  │                                     │
│                 │  └─ (Scrollable Content)              │
└─────────────────────────────────────────────────────────┘
```

Dimensions:
- Sidebar Width: 280px (expanded), 100px (collapsed)
- Header Height: 70px
- SubHeader Height: 60px
- Frame Padding: 20px
- Standard Gap: 18px everywhere

================================================================================

CONSISTENT SPACING RULES

1. Grid Gap: Always 18px for KPI rows and chart rows
2. Component Padding: 16px for StatCards, 24px for Charts
3. Section Spacing: 18px margin-bottom between rows
4. Header Spacing: 16px margin-bottom after chart headers
5. Internal Gaps: 8px between related elements
6. Slicer Spacing: 16px between slicer groups

================================================================================

KEY TAKEAWAYS

1. Universal 18px gap for all grid layouts
2. 10-level spacing scale (4px - 48px)
3. Consistent padding: 16px (StatCard), 24px (Chart)
4. Standard border-radius: 8px for most components
5. Fixed dimensions for consistency (StatCard 120px, Chart 350px)

================================================================================

Previous: [← 03 - Color Palette](./03-COLOR-PALETTE.md)  
Next: [05 - Responsive Design](./05-RESPONSIVE-DESIGN.md) →

