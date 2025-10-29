05. RESPONSIVE DESIGN

[← Back to Index](./00-INDEX.md)

================================================================================

BREAKPOINTS

```css
/* Mobile */
--breakpoint-sm: 640px;    /* Small devices (phones) */

/* Tablet */
--breakpoint-md: 768px;    /* Medium devices (tablets) */

/* Desktop */
--breakpoint-lg: 1024px;   /* Large devices (laptops) */
--breakpoint-xl: 1280px;   /* Extra large (desktops) */
--breakpoint-2xl: 1536px;  /* 2X large (large desktops) */
```

================================================================================

RESPONSIVE GRID BEHAVIOR

KPI Card Row:
```css
/* Desktop (default): 6 columns */
.kpi-row {
  grid-template-columns: repeat(6, 1fr);
}

/* Tablet: 3 columns */
@media (max-width: 1024px) {
  .kpi-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Mobile: 2 columns */
@media (max-width: 640px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

Chart Row:
```css
/* Desktop (default): 3 columns */
.charts-row {
  grid-template-columns: repeat(3, 1fr);
}

/* Tablet: 2 columns */
@media (max-width: 1024px) {
  .charts-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile: 1 column */
@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}
```

================================================================================

LAYOUT DIMENSIONS

Sidebar Responsive Behavior:
```css
/* Desktop: Full sidebar */
.sidebar {
  width: 280px;
}

/* Tablet: Collapsed sidebar */
@media (max-width: 1024px) {
  .sidebar {
    width: 100px;
  }
}

/* Mobile: Hidden sidebar (drawer menu) */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
}
```

Content Area Margins:
```css
/* Desktop: Offset by sidebar */
.main-content {
  margin-left: 280px;
}

/* Tablet: Offset by collapsed sidebar */
@media (max-width: 1024px) {
  .main-content {
    margin-left: 100px;
  }
}

/* Mobile: Full width */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }
}
```

Frame Padding:
```css
/* Desktop: Standard padding */
.standard-frame {
  padding: 20px;
}

/* Tablet: Reduced padding */
@media (max-width: 768px) {
  .standard-frame {
    padding: 16px;
  }
}

/* Mobile: Minimal padding */
@media (max-width: 640px) {
  .standard-frame {
    padding: 12px;
  }
}
```

================================================================================

COMPONENT RESPONSIVE BEHAVIOR

StatCard:
```css
/* Desktop: Standard height */
.stat-card {
  height: 120px;
}

/* Mobile: Auto height (flexible) */
@media (max-width: 640px) {
  .stat-card {
    height: auto;
    min-height: 100px;
  }
}
```

Chart Container:
```css
/* Desktop: Standard height */
.chart-container {
  min-height: 350px;
}

/* Tablet: Slightly reduced */
@media (max-width: 1024px) {
  .chart-container {
    min-height: 320px;
  }
}

/* Mobile: Flexible height */
@media (max-width: 768px) {
  .chart-container {
    min-height: 280px;
  }
}
```

================================================================================

RESPONSIVE TYPOGRAPHY

Heading Sizes:
```css
/* Desktop */
h1 { font-size: 28px; }
h2 { font-size: 22px; }
h3 { font-size: 16px; }

/* Mobile: Slightly reduced */
@media (max-width: 640px) {
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
  h3 { font-size: 15px; }
}
```

StatCard Value:
```css
/* Desktop */
.stat-card-value {
  font-size: 28px;
}

/* Mobile: Slightly reduced */
@media (max-width: 640px) {
  .stat-card-value {
    font-size: 24px;
  }
}
```

================================================================================

MOBILE-SPECIFIC BEHAVIORS

Chart Data Labels:
```typescript
// Hide data labels on mobile to reduce clutter
const dataLabelsConfig = {
  display: window.innerWidth > 768,
  // ... other config
};
```

Tooltip Behavior:
```typescript
// Use touch-friendly tooltips on mobile
const tooltipConfig = {
  mode: window.innerWidth > 768 ? 'index' : 'point',
  intersect: window.innerWidth <= 768,
};
```

Legend Position:
```typescript
// Move legend to bottom on mobile
const legendConfig = {
  position: window.innerWidth > 768 ? 'right' : 'bottom',
};
```

================================================================================

RESPONSIVE GRID SUMMARY

| Screen Size | KPI Columns | Chart Columns | Sidebar | Frame Padding |
|-------------|-------------|---------------|---------|---------------|
| Desktop (1280px+) | 6 | 3 | 280px | 20px |
| Laptop (1024px) | 6 | 3 | 280px | 20px |
| Tablet (768px) | 3 | 2 | 100px | 16px |
| Mobile (640px) | 2 | 1 | Hidden | 12px |
| Small Mobile (<640px) | 1-2 | 1 | Hidden | 12px |

================================================================================

TOUCH-FRIENDLY DESIGN

Minimum Touch Targets:
- Buttons: 44px x 44px (minimum)
- Interactive Cards: 48px minimum height
- Slicer Dropdowns: 44px height
- Chart Points: 10px radius on mobile

Spacing for Touch:
```css
@media (max-width: 768px) {
  .interactive-element {
    min-height: 44px;
    padding: 12px;
  }
  
  .clickable-card:not(:last-child) {
    margin-bottom: 16px;
  }
}
```

================================================================================

KEY TAKEAWAYS

1. 5 breakpoints (640px, 768px, 1024px, 1280px, 1536px)
2. Mobile-first approach with progressive enhancement
3. Grid columns reduce as screen size decreases (6 → 3 → 2 → 1)
4. Sidebar collapses to 100px on tablet, hidden on mobile
5. Minimum 44px touch targets for mobile
6. Flexible chart heights on smaller screens

================================================================================

Previous: [← 04 - Layout & Spacing](./04-LAYOUT-SPACING.md)  
Next: [06 - Accessibility Guidelines](./06-ACCESSIBILITY-GUIDELINES.md) →

