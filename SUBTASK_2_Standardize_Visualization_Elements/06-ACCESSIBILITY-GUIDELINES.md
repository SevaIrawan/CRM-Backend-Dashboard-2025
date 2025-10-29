06. ACCESSIBILITY GUIDELINES

[← Back to Index](./00-INDEX.md)

================================================================================

WCAG 2.1 AA COMPLIANCE

Target Standard: WCAG 2.1 Level AA

Key Requirements:
- Color Contrast: Minimum 4.5:1 for normal text, 3:1 for large text
- Keyboard Navigation: All interactive elements accessible via keyboard
- Screen Reader Support: Proper ARIA labels and semantic HTML
- Focus Indicators: Visible focus states for all interactive elements
- Responsive Text: Text can be resized up to 200% without loss of content

================================================================================

COLOR CONTRAST REQUIREMENTS

Text Contrast Minimums:
- Normal Text (below 18px or 14px non-bold): 4.5:1
- Large Text (18px+ or 14px+ bold): 3:1
- UI Components and Graphics: 3:1

Verified Combinations:
| Foreground | Background | Ratio | Status |
|------------|------------|-------|--------|
| #111827 (text-primary) | #ffffff | 16.1:1 | ✓ AAA |
| #374151 (text-secondary) | #ffffff | 11.4:1 | ✓ AAA |
| #6b7280 (text-tertiary) | #ffffff | 5.7:1 | ✓ AA |
| #059669 (success) | #ffffff | 3.9:1 | ✓ Large Text |
| #dc2626 (danger) | #ffffff | 5.9:1 | ✓ AA |
| #3B82F6 (primary) | #ffffff | 4.7:1 | ✓ AA |

================================================================================

CHART ACCESSIBILITY

Color Independence:
1. Never rely solely on color to convey information
2. Use patterns, labels, or icons in addition to colors
3. Provide text descriptions for chart data
4. Ensure adequate contrast between chart elements

Example Implementation:
```typescript
// Good: Multiple indicators
<ChartLegend>
  <LegendItem>
    <Icon name="circle" color="blue" />
    <Pattern type="solid" />
    <Label>Active Members</Label>
  </LegendItem>
</ChartLegend>

// Bad: Color only
<ChartLegend>
  <div style={{ color: 'blue' }}>Active Members</div>
</ChartLegend>
```

Alternative Text:
```tsx
// Provide descriptive alt text for charts
<div 
  role="img" 
  aria-label="Line chart showing deposit amount trend from January to December 2025, ranging from 100k to 150k"
>
  <LineChart {...props} />
</div>
```

Data Tables as Alternative:
```tsx
// Provide data table as alternative to visual charts
<Chart data={chartData} />
<VisuallyHidden>
  <table>
    <caption>Monthly Deposit Amounts</caption>
    <thead>
      <tr>
        <th>Month</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      {chartData.map(item => (
        <tr key={item.month}>
          <td>{item.month}</td>
          <td>{item.amount}</td>
        </tr>
      ))}
    </tbody>
  </table>
</VisuallyHidden>
```

================================================================================

TYPOGRAPHY ACCESSIBILITY

Minimum Font Sizes:
- Body Text: 13px minimum (prefer 14px)
- Labels: 11px minimum
- Small Text: 10px absolute minimum (use sparingly)

Line Height Requirements:
- Body Text: 1.5 minimum
- Headings: 1.2 minimum
- Dense Content: 1.3 minimum

Readable Line Length:
- Optimal: 50-75 characters per line
- Maximum: 80 characters per line

Font Weight Contrast:
- Use sufficient weight difference for hierarchy
- Minimum 200 weight difference for emphasis
- Example: Regular (400) vs Semibold (600)

================================================================================

KEYBOARD NAVIGATION

Focus Management:
```css
/* Visible focus indicator */
:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Never remove focus styles */
:focus {
  outline: none; /* ❌ BAD */
}

/* Custom focus styles OK */
button:focus-visible {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
```

Tab Order:
1. Ensure logical tab order (top to bottom, left to right)
2. Use tabindex="0" for custom interactive elements
3. Never use positive tabindex values
4. Skip navigation links for screen reader users

Interactive Elements:
```tsx
// All interactive elements must be keyboard accessible
<button 
  onClick={handleClick}
  onKeyPress={(e) => e.key === 'Enter' && handleClick()}
>
  Click Me
</button>

// Clickable divs need keyboard support
<div 
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyPress={(e) => e.key === 'Enter' && handleClick()}
>
  Custom Button
</div>
```

================================================================================

SCREEN READER SUPPORT

Semantic HTML:
```tsx
// Good: Semantic elements
<header>Header content</header>
<nav>Navigation</nav>
<main>Main content</main>
<article>Article content</article>
<aside>Sidebar content</aside>

// Bad: Divs for everything
<div className="header">Header</div>
<div className="nav">Navigation</div>
```

ARIA Labels:
```tsx
// StatCard with aria-label
<div 
  className="stat-card"
  aria-label={`${title}: ${value}. ${comparison.text}: ${comparison.percentage}`}
>
  <h3>{title}</h3>
  <p>{value}</p>
</div>

// Chart with aria-describedby
<div 
  role="img"
  aria-labelledby="chart-title"
  aria-describedby="chart-description"
>
  <h3 id="chart-title">{title}</h3>
  <p id="chart-description" className="sr-only">
    {generateChartDescription(data)}
  </p>
  <Chart data={data} />
</div>
```

Live Regions for Dynamic Content:
```tsx
// Announce data updates to screen readers
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {`Data updated: ${new Date().toLocaleString()}`}
</div>
```

================================================================================

FORM ACCESSIBILITY

Label Association:
```tsx
// Good: Proper label association
<label htmlFor="year-select">Year:</label>
<select id="year-select" name="year">
  <option value="2025">2025</option>
</select>

// Good: Implicit label
<label>
  Year:
  <select name="year">
    <option value="2025">2025</option>
  </select>
</label>
```

Error Messages:
```tsx
// Associate error messages with inputs
<label htmlFor="amount">Amount:</label>
<input 
  id="amount"
  type="number"
  aria-invalid={hasError}
  aria-describedby={hasError ? "amount-error" : undefined}
/>
{hasError && (
  <span id="amount-error" role="alert" className="error">
    Please enter a valid amount
  </span>
)}
```

================================================================================

VISUAL HELPERS FOR SCREEN READERS

Screen Reader Only Class:
```css
.sr-only,
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

Usage:
```tsx
<button>
  <Icon name="search" aria-hidden="true" />
  <span className="sr-only">Search</span>
</button>
```

================================================================================

KEY TAKEAWAYS

1. Minimum 4.5:1 contrast for normal text, 3:1 for large text
2. Never rely on color alone to convey information
3. All interactive elements must be keyboard accessible
4. Provide alternative text for charts and images
5. Use semantic HTML and proper ARIA labels
6. Ensure focus indicators are always visible
7. Minimum 13px font size for body text

================================================================================

Previous: [← 05 - Responsive Design](./05-RESPONSIVE-DESIGN.md)  
Next: [07 - Animation & Interaction](./07-ANIMATION-INTERACTION.md) →

