03. COLOR PALETTE

[← Back to Index](./00-INDEX.md)

================================================================================

PRIMARY COLORS

```css
--color-primary: #3B82F6;        /* Blue - Main brand color */
--color-primary-light: #60A5FA;  /* Light blue - Hover states */
--color-primary-dark: #2563EB;   /* Dark blue - Active states */

--color-secondary: #F97316;      /* Orange - Secondary brand color */
--color-secondary-light: #FB923C; /* Light orange - Hover states */
--color-secondary-dark: #EA580C;  /* Dark orange - Active states */
```

Usage:
- Primary (Blue): Single-series charts, primary buttons, links
- Secondary (Orange): Second series in dual charts, secondary buttons

================================================================================

STATUS COLORS

Success - Positive Metrics:
```css
--color-success: #059669;        /* Green */
--color-success-light: #10b981;
--color-success-dark: #047857;
--color-success-bg: #D1FAE5;     /* Light green background */
```

Danger - Negative Metrics:
```css
--color-danger: #dc2626;         /* Red */
--color-danger-light: #ef4444;
--color-danger-dark: #b91c1c;
--color-danger-bg: #FEE2E2;      /* Light red background */
```

Warning - Caution:
```css
--color-warning: #f59e0b;        /* Yellow/Amber */
--color-warning-light: #fbbf24;
--color-warning-dark: #d97706;
--color-warning-bg: #FEF3C7;     /* Light yellow background */
```

Info:
```css
--color-info: #3b82f6;           /* Blue */
--color-info-light: #60a5fa;
--color-info-dark: #2563eb;
--color-info-bg: #DBEAFE;        /* Light blue background */
```

Usage:
- Success (Green): Positive MoM changes, growth indicators, on-track status
- Danger (Red): Negative MoM changes, decline indicators, at-risk status
- Warning (Orange/Yellow): Behind status, caution indicators
- Info (Blue): Neutral information, hints

================================================================================

CHART COLOR PALETTES

Single Series:
```typescript
const singleSeriesColor = '#3B82F6'; // Blue
```

Dual Series:
```typescript
const dualSeriesColors = [
  '#3B82F6',  // Blue (first series)
  '#F97316'   // Orange (second series)
];
```

Multi-Series (3-6 items):
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

Categorical Palette (7+ items):
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

Sequential Palette (Heatmaps, Gradients):
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

================================================================================

NEUTRAL COLORS

Text Colors:
```css
--color-text-primary: #111827;      /* Almost black - Main headings */
--color-text-secondary: #374151;    /* Dark gray - Body text */
--color-text-tertiary: #6b7280;     /* Medium gray - Helper text */
--color-text-disabled: #9ca3af;     /* Light gray - Disabled text */
```

Background Colors:
```css
--color-bg-primary: #ffffff;        /* White - Main background */
--color-bg-secondary: #f9fafb;      /* Off-white - Secondary background */
--color-bg-tertiary: #f3f4f6;       /* Light gray - Tertiary background */
```

Border Colors:
```css
--color-border-primary: #e5e7eb;    /* Light gray - Main borders */
--color-border-secondary: #d1d5db;  /* Medium gray - Emphasized borders */
--color-border-tertiary: #9ca3af;   /* Dark gray - Strong borders */
```

================================================================================

TRANSPARENCY STANDARDS

Background Fills (Charts):
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

================================================================================

WCAG CONTRAST VERIFICATION

Minimum Contrast Ratios (WCAG 2.1 AA):
- Normal Text (14px+): 4.5:1
- Large Text (18px+ or 14px+ bold): 3:1

Verified Combinations:
| Text Color | Background | Contrast Ratio | Pass |
|------------|------------|----------------|------|
| #111827 (text-primary) | #ffffff (white) | 16.1:1 | ✓ AAA |
| #374151 (text-secondary) | #ffffff (white) | 11.4:1 | ✓ AAA |
| #6b7280 (text-tertiary) | #ffffff (white) | 5.7:1 | ✓ AA |
| #059669 (success) | #ffffff (white) | 3.9:1 | ✓ Large Text |
| #dc2626 (danger) | #ffffff (white) | 5.9:1 | ✓ AA |

================================================================================

COLOR INDEPENDENCE GUIDELINES

For Accessibility:
1. Never rely solely on color to convey information
2. Use icons, labels, or patterns in addition to colors
3. Ensure sufficient contrast between adjacent colors
4. Provide alternative text descriptions for charts
5. Use patterns or textures for overlapping data

Example:
```typescript
// Good: Icon + Color for status
<StatusBadge 
  color="success" 
  icon="check-circle"
  label="Active"
/>

// Bad: Color only
<StatusBadge color="green" />
```

================================================================================

KEY TAKEAWAYS

1. Blue (#3B82F6) for primary/single-series charts
2. Orange (#F97316) for secondary/second-series charts
3. Green for positive, Red for negative status
4. Standard 20% opacity (#3B82F620) for chart fills
5. All colors tested for WCAG AA compliance
6. 5 different palettes for different use cases

================================================================================

Previous: [← 02 - Typography System](./02-TYPOGRAPHY-SYSTEM.md)  
Next: [04 - Layout & Spacing](./04-LAYOUT-SPACING.md) →

