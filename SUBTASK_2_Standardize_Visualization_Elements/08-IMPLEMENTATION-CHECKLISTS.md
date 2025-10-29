08. IMPLEMENTATION CHECKLISTS

[← Back to Index](./00-INDEX.md)

================================================================================

CHART IMPLEMENTATION CHECKLIST

When implementing a new chart, verify:

Configuration:
- [ ] Chart type selected matches use case (Line, Bar, Donut, etc.)
- [ ] Standard colors applied (Blue for single, Blue+Orange for dual)
- [ ] Chart height set to 350px (default) or appropriate variant
- [ ] Responsive behavior configured (maintainAspectRatio: false)
- [ ] Container has proper styling (white background, 8px border-radius)

Visual Elements:
- [ ] Chart title in UPPERCASE with proper icon
- [ ] Legend shown for dual-series, hidden for single-series
- [ ] Legend positioned in header, not chart area (for dual-series)
- [ ] Tooltip enabled with consistent styling (dark background, white text)
- [ ] Grid lines only from left Y-axis (for dual Y-axis charts)

Data & Labels:
- [ ] Data labels shown on Bar charts (always)
- [ ] Data labels hidden on Line charts (default)
- [ ] Axis labels with proper font size (11px)
- [ ] Y-axis starts at appropriate value (0 for bars, auto for lines)
- [ ] Sufficient padding added for data labels (8% for bars, 20% for lines)

Interactions:
- [ ] Double-click to open ChartZoomModal configured
- [ ] Hover effects enabled on container
- [ ] Chart animations configured (500ms entry, 300ms update)
- [ ] Touch-friendly tooltips on mobile

Accessibility:
- [ ] Alternative text (aria-label) provided
- [ ] Data table alternative available for screen readers
- [ ] Sufficient color contrast verified
- [ ] Does not rely on color alone to convey information

================================================================================

LAYOUT IMPLEMENTATION CHECKLIST

When implementing page layout, verify:

Grid System:
- [ ] KPI row uses 6-column grid (repeat(6, 1fr))
- [ ] Chart row uses 3-column grid (repeat(3, 1fr))
- [ ] Standard gap of 18px applied consistently
- [ ] Responsive breakpoints configured (6→3→2 for KPI, 3→2→1 for charts)

Spacing:
- [ ] Frame padding set to 20px (standard) or 12px (compact)
- [ ] StatCard height set to 120px
- [ ] StatCard padding set to 16px
- [ ] Chart container padding set to 24px
- [ ] Margin-bottom of 18px between rows

Components:
- [ ] Layout component used for page wrapper
- [ ] Frame component used for content wrapper
- [ ] SubHeader configured with custom slicers (if needed)
- [ ] All components follow standard dimensions

Responsive:
- [ ] Mobile layout tested (1-2 columns for KPI, 1 column for charts)
- [ ] Tablet layout tested (3 columns for KPI, 2 columns for charts)
- [ ] Sidebar behavior configured (collapse on tablet, hide on mobile)
- [ ] Touch-friendly spacing on mobile (minimum 44px targets)

================================================================================

TYPOGRAPHY IMPLEMENTATION CHECKLIST

When implementing text elements, verify:

Font Families:
- [ ] System font stack used for all text
- [ ] Monospace font used for numbers/data (optional)

Sizes:
- [ ] Page titles use H1 (28px, weight 700)
- [ ] Section titles use H2 (22px, weight 600)
- [ ] Subsection titles use H3 (16px, weight 600)
- [ ] Body text uses 13-14px (weight 400)
- [ ] Labels use 11-12px (weight 400-600)

StatCard Typography:
- [ ] Card title: 12px, weight 600, uppercase, 0.5px letter-spacing
- [ ] Main value: 28px, weight 700
- [ ] Additional KPI label: 11px, weight 400, uppercase
- [ ] Additional KPI value: 11px, weight 600
- [ ] Comparison text: 10px, weight 600

Chart Typography:
- [ ] Chart title: 12px, weight 600, uppercase, 0.5px letter-spacing
- [ ] Data labels: 10px, weight 600
- [ ] Legend items: 11px, weight 600
- [ ] Axis labels: 11px, weight 400

Accessibility:
- [ ] Minimum font size of 13px for body text
- [ ] Line height of 1.5 for body text
- [ ] Sufficient color contrast (4.5:1 minimum)
- [ ] Text can be resized up to 200%

================================================================================

COLOR IMPLEMENTATION CHECKLIST

When implementing colors, verify:

Chart Colors:
- [ ] Single-series charts use #3B82F6 (Blue)
- [ ] Dual-series charts use #3B82F6 (Blue) + #F97316 (Orange)
- [ ] Multi-series charts use standard multi-series palette
- [ ] Chart background fills use 20% opacity (#3B82F620)

Status Colors:
- [ ] Success/positive indicators use #059669 (Green)
- [ ] Danger/negative indicators use #dc2626 (Red)
- [ ] Warning indicators use #f59e0b (Amber)
- [ ] Info indicators use #3b82f6 (Blue)

Text Colors:
- [ ] Primary text uses #111827 (almost black)
- [ ] Secondary text uses #374151 (dark gray)
- [ ] Tertiary text uses #6b7280 (medium gray)
- [ ] Disabled text uses #9ca3af (light gray)

Borders & Backgrounds:
- [ ] Primary borders use #e5e7eb (light gray)
- [ ] Primary background is #ffffff (white)
- [ ] Secondary background is #f9fafb (off-white)

Accessibility:
- [ ] All text color combinations verified for contrast (4.5:1 minimum)
- [ ] Does not rely on color alone to convey information
- [ ] Patterns or labels used in addition to colors

================================================================================

RESPONSIVE IMPLEMENTATION CHECKLIST

When implementing responsive behavior, verify:

Breakpoints:
- [ ] Desktop behavior tested (1280px+)
- [ ] Laptop behavior tested (1024px)
- [ ] Tablet behavior tested (768px)
- [ ] Mobile behavior tested (640px and below)

Grid Behavior:
- [ ] KPI cards: 6 cols (desktop) → 3 cols (tablet) → 2 cols (mobile)
- [ ] Charts: 3 cols (desktop) → 2 cols (tablet) → 1 col (mobile)
- [ ] Gap remains 18px on all breakpoints (or adjusts appropriately)

Layout:
- [ ] Sidebar: 280px (desktop) → 100px (tablet) → hidden (mobile)
- [ ] Content margin adjusts based on sidebar width
- [ ] Frame padding: 20px (desktop) → 16px (tablet) → 12px (mobile)

Components:
- [ ] StatCard height flexible on mobile (auto instead of 120px)
- [ ] Chart height flexible on mobile (280px minimum)
- [ ] Data labels hidden on mobile (if cluttered)
- [ ] Touch targets minimum 44px on mobile

================================================================================

ACCESSIBILITY IMPLEMENTATION CHECKLIST

When implementing accessibility features, verify:

Keyboard Navigation:
- [ ] All interactive elements accessible via keyboard
- [ ] Logical tab order (top to bottom, left to right)
- [ ] Visible focus indicators on all focusable elements
- [ ] Skip navigation links available
- [ ] No keyboard traps

Screen Reader Support:
- [ ] Semantic HTML used (header, nav, main, etc.)
- [ ] Proper ARIA labels on custom components
- [ ] Alternative text for charts and images
- [ ] Live regions for dynamic content updates
- [ ] Form inputs properly labeled

Visual:
- [ ] Color contrast meets WCAG AA (4.5:1 minimum)
- [ ] Text resizable up to 200% without loss of content
- [ ] Minimum font size of 13px for body text
- [ ] Does not rely on color alone

Testing:
- [ ] Tested with screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Tested with keyboard only (no mouse)
- [ ] Tested with browser zoom at 200%
- [ ] Color contrast verified with contrast checker tool

================================================================================

PERFORMANCE CHECKLIST

When optimizing performance, verify:

Data Loading:
- [ ] Data loaded only when needed (lazy loading)
- [ ] Loading states shown during data fetch
- [ ] Error states handled gracefully
- [ ] Data cached when appropriate

Animations:
- [ ] GPU-accelerated properties used (transform, opacity)
- [ ] Animations disabled for large datasets (500+ points)
- [ ] Animation duration kept under 500ms
- [ ] Will-change used sparingly

Charts:
- [ ] Chart animations disabled for performance when needed
- [ ] Data point limits implemented for very large datasets
- [ ] Chart.js/Recharts optimized configurations used
- [ ] Canvas rendering used for better performance with large datasets

General:
- [ ] Images optimized and lazy loaded
- [ ] Bundle size minimized
- [ ] Code split where appropriate
- [ ] Performance tested on low-end devices

================================================================================

KEY TAKEAWAYS

1. Use checklists for every new chart, layout, or page implementation
2. Verify all visual elements (colors, typography, spacing) follow standards
3. Test responsive behavior on all breakpoints
4. Ensure accessibility compliance (WCAG 2.1 AA)
5. Optimize performance (animations, data loading, rendering)
6. Get peer review before marking as complete

================================================================================

Previous: [← 07 - Animation & Interaction](./07-ANIMATION-INTERACTION.md)  
Next: [09 - Quick Reference](./09-QUICK-REFERENCE.md) →

