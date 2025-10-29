07. ANIMATION & INTERACTION

[← Back to Index](./00-INDEX.md)

================================================================================

TRANSITION STANDARDS

Duration Guidelines:
```css
/* Fast transitions - UI feedback */
--duration-fast: 150ms;

/* Standard transitions - Most UI elements */
--duration-standard: 200ms;

/* Moderate transitions - Larger elements */
--duration-moderate: 300ms;

/* Slow transitions - Page transitions */
--duration-slow: 500ms;
```

Easing Functions:
```css
/* Default easing */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);

/* Ease-out - Elements entering */
--ease-out: cubic-bezier(0.0, 0, 0.2, 1);

/* Ease-in - Elements exiting */
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* Ease-in-out - Elements moving */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

================================================================================

HOVER STATES

StatCard Hover:
```css
.stat-card {
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

Chart Container Hover:
```css
.chart-container {
  transition: all 0.2s ease;
}

.chart-container:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
```

Button Hover:
```css
.button {
  transition: all 0.15s ease;
}

.button:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}
```

Link Hover:
```css
.link {
  transition: color 0.15s ease;
}

.link:hover {
  color: #2563eb;
  text-decoration: underline;
}
```

================================================================================

ACTIVE STATES

Button Active:
```css
.button:active {
  transform: translateY(0);
  box-shadow: none;
}
```

Card Active:
```css
.stat-card:active {
  transform: scale(0.98);
}
```

Input Active:
```css
.input:active,
.input:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

================================================================================

FOCUS STATES

Default Focus:
```css
:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
  border-radius: 4px;
}
```

Custom Focus Rings:
```css
.button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.input:focus-visible {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

================================================================================

CHART ANIMATION CONFIGURATIONS

Entry Animation:
```typescript
const chartOptions = {
  animation: {
    duration: 500,
    easing: 'easeOutQuart',
    onComplete: () => {
      // Animation complete callback
    }
  }
};
```

Update Animation:
```typescript
const chartOptions = {
  animation: {
    duration: 300,
    easing: 'easeInOutQuart'
  }
};
```

Disable Animation (Performance):
```typescript
// Disable for large datasets or better performance
const chartOptions = {
  animation: false
};
```

Point Hover Animation:
```typescript
const chartOptions = {
  elements: {
    point: {
      radius: 6,
      hoverRadius: 8,
      hitRadius: 10,
      hoverBorderWidth: 2
    }
  }
};
```

================================================================================

INTERACTION STATES

Clickable Elements:
```css
.clickable {
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
}

.clickable:hover {
  opacity: 0.8;
}

.clickable:active {
  opacity: 0.6;
}
```

Disabled States:
```css
.disabled,
:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

Loading States:
```css
.loading {
  position: relative;
  pointer-events: none;
}

.loading::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

================================================================================

MODAL & OVERLAY ANIMATIONS

Modal Enter:
```css
@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal {
  animation: modalEnter 0.2s ease-out;
}
```

Overlay Fade:
```css
@keyframes overlayFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.overlay {
  animation: overlayFade 0.15s ease-out;
}
```

================================================================================

TOOLTIP BEHAVIOR

Position Strategy:
```typescript
const tooltipConfig = {
  mode: 'index',           // Show all items at X position
  intersect: false,        // Don't require exact hover
  position: 'nearest',     // Position near cursor
  animation: {
    duration: 150
  },
  callbacks: {
    title: (context) => formatTitle(context),
    label: (context) => formatLabel(context)
  }
};
```

Mobile Tooltip:
```typescript
// Touch-friendly tooltip on mobile
const isMobile = window.innerWidth < 768;

const tooltipConfig = {
  mode: isMobile ? 'point' : 'index',
  intersect: isMobile,
  touchThreshold: 20,
};
```

================================================================================

CHART INTERACTION EVENTS

Double-Click for Zoom:
```typescript
<div 
  onDoubleClick={() => openChartZoomModal(chartData)}
  style={{ cursor: 'pointer' }}
>
  <Chart data={chartData} />
</div>
```

Point Click Event:
```typescript
const chartOptions = {
  onClick: (event, elements) => {
    if (elements.length > 0) {
      const dataIndex = elements[0].index;
      handlePointClick(chartData[dataIndex]);
    }
  }
};
```

================================================================================

LOADING ANIMATIONS

Skeleton Loader:
```css
@keyframes skeleton-loading {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 0px,
    #f8f8f8 40px,
    #f0f0f0 80px
  );
  background-size: 200px 100%;
  animation: skeleton-loading 1.4s ease-in-out infinite;
}
```

Spinner:
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  border: 2px solid #e5e7eb;
  border-top-color: #3B82F6;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 0.6s linear infinite;
}
```

================================================================================

PERFORMANCE CONSIDERATIONS

Best Practices:
1. Use CSS transforms (translate, scale, rotate) instead of position/margin
2. Avoid animating expensive properties (width, height, top, left)
3. Use `will-change` for complex animations
4. Disable animations for large datasets
5. Use `requestAnimationFrame` for JavaScript animations

Example:
```css
/* Good: GPU-accelerated */
.element {
  transform: translateY(-2px);
  will-change: transform;
}

/* Bad: Forces layout recalculation */
.element {
  margin-top: -2px;
}
```

================================================================================

KEY TAKEAWAYS

1. Standard transition duration: 200ms for most UI elements
2. Use ease-out for entering elements, ease-in for exiting
3. Hover states: subtle elevation and transform
4. Focus states: visible outline or custom shadow
5. Chart animations: 500ms entry, 300ms update
6. Disable animations for performance with large datasets
7. Use GPU-accelerated properties (transform, opacity)

================================================================================

Previous: [← 06 - Accessibility Guidelines](./06-ACCESSIBILITY-GUIDELINES.md)  
Next: [08 - Implementation Checklists](./08-IMPLEMENTATION-CHECKLISTS.md) →

