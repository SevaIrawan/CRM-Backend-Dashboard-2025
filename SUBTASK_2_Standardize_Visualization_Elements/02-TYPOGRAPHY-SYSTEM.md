02. TYPOGRAPHY SYSTEM

[← Back to Index](./00-INDEX.md)

================================================================================

FONT FAMILY

Primary Font:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Helvetica Neue', Arial, sans-serif;
```

Monospace Font (for numbers and data):
```css
font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 
             'Courier New', monospace;
```

================================================================================

TYPE SCALE

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| H1 | 28px | 700 | 1.2 | Page title |
| H2 | 22px | 600 | 1.3 | Section title |
| H3 | 16px | 600 | 1.4 | Subsection title |
| Body Large | 14px | 400 | 1.5 | Main content |
| Body | 13px | 400 | 1.5 | Standard text |
| Body Small | 12px | 400 | 1.4 | Helper text |
| Caption | 11px | 400 | 1.3 | Labels, captions |
| Overline | 11px | 600 | 1.2 | Uppercase labels |

================================================================================

STATCARD TYPOGRAPHY

Card Title:
```css
.stat-card-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.2;
}
```

Main Value:
```css
.stat-card-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}
```

Additional KPI Label:
```css
.additional-kpi-label {
  font-size: 11px;
  font-weight: 400;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
```

Additional KPI Value:
```css
.additional-kpi-value {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}
```

Comparison Text:
```css
.comparison-text {
  font-size: 10px;
  font-weight: 600;
}
```

================================================================================

CHART TYPOGRAPHY

Chart Title:
```css
.chart-title {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

Chart Data Labels:
```css
.chart-data-label {
  font-size: 10px;
  font-weight: 600;
  color: #1f2937;
}
```

Chart Legend:
```css
.chart-legend-item {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}
```

Chart Axis Labels:
```css
.chart-axis-label {
  font-size: 11px;
  font-weight: 400;
  color: #6b7280;
}
```

================================================================================

SLICER TYPOGRAPHY

Slicer Label:
```css
.slicer-label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

Slicer Select:
```css
.subheader-select {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}
```

================================================================================

FONT WEIGHTS

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text, descriptions |
| Medium | 500 | Slicer labels, emphasized text |
| Semibold | 600 | Titles, headers, KPI labels |
| Bold | 700 | Main values, important numbers |

================================================================================

LINE HEIGHTS

| Context | Line Height | Usage |
|---------|-------------|-------|
| Titles | 1.1 - 1.2 | Tight spacing for large text |
| Labels | 1.2 - 1.3 | Compact spacing for UI elements |
| Body | 1.4 - 1.5 | Comfortable reading |
| Dense | 1.3 | Tables, compact lists |

================================================================================

LETTER SPACING

| Element | Spacing | Usage |
|---------|---------|-------|
| Uppercase Labels | 0.5px | StatCard titles, Chart titles, Slicer labels |
| Regular Text | 0px | Body text, values |
| Compact | 0.3px | Small uppercase labels |

================================================================================

KEY TAKEAWAYS

1. System fonts for better performance
2. 8-level type scale for hierarchy
3. Uppercase labels use increased letter-spacing (0.5px)
4. Bold weights (600-700) for emphasis and values
5. Consistent font sizes across similar components

================================================================================

Previous: [← 01 - Chart Standards](./01-CHART-STANDARDS.md)  
Next: [03 - Color Palette](./03-COLOR-PALETTE.md) →

