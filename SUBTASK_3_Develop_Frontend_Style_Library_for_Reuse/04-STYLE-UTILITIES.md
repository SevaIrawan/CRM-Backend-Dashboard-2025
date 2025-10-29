04. STYLE UTILITIES STANDARDS

[← Back to Index](./00-INDEX.md)

================================================================================

CSS ARCHITECTURE STANDARDS

Standard CSS File Organization

```
styles/
├── index.css                    # Main entry point
├── base/
│   ├── reset.css                # CSS reset
│   ├── normalize.css            # Normalize styles
│   └── global.css               # Global styles
├── variables/
│   ├── colors.css               # Color tokens
│   ├── spacing.css              # Spacing scale
│   ├── typography.css           # Font tokens
│   ├── breakpoints.css          # Responsive breakpoints
│   └── shadows.css              # Shadow tokens
├── utilities/
│   ├── layout.css               # Layout utilities
│   ├── spacing.css              # Margin/padding utilities
│   ├── typography.css           # Text utilities
│   └── display.css              # Display utilities
├── components/
│   ├── button.css
│   ├── card.css
│   ├── modal.css
│   └── ...
└── themes/
    ├── default.css
    └── dark.css
```

File Organization Standards:
- Separate concerns by file
- Use CSS custom properties (variables)
- Import order: base → variables → utilities → components → themes
- Keep files focused and single-purpose

================================================================================

CSS VARIABLES STANDARDS

Color Variables

```css
/* variables/colors.css */
:root {
  /* Primary Colors */
  --color-primary: #3B82F6;
  --color-primary-hover: #2563EB;
  --color-primary-active: #1D4ED8;
  
  /* Status Colors */
  --color-success: #059669;
  --color-warning: #F59E0B;
  --color-error: #DC2626;
  --color-info: #0EA5E9;
  
  /* Neutral Colors */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;
  
  /* Semantic Colors */
  --color-text-primary: var(--color-gray-900);
  --color-text-secondary: var(--color-gray-600);
  --color-text-tertiary: var(--color-gray-500);
  --color-background: #FFFFFF;
  --color-surface: #FFFFFF;
  --color-border: var(--color-gray-200);
}
```

Spacing Variables

```css
/* variables/spacing.css */
:root {
  /* Base spacing unit: 4px */
  --spacing-0: 0;
  --spacing-1: 0.25rem;   /* 4px */
  --spacing-2: 0.5rem;    /* 8px */
  --spacing-3: 0.75rem;   /* 12px */
  --spacing-4: 1rem;      /* 16px */
  --spacing-5: 1.25rem;   /* 20px */
  --spacing-6: 1.5rem;    /* 24px */
  --spacing-8: 2rem;      /* 32px */
  --spacing-10: 2.5rem;   /* 40px */
  --spacing-12: 3rem;     /* 48px */
  --spacing-16: 4rem;     /* 64px */
  --spacing-20: 5rem;     /* 80px */
  
  /* Component-specific spacing */
  --card-padding: var(--spacing-4);
  --modal-padding: var(--spacing-6);
  --button-padding-x: var(--spacing-4);
  --button-padding-y: var(--spacing-2);
}
```

Typography Variables

```css
/* variables/typography.css */
:root {
  /* Font Families */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                      'Roboto', 'Helvetica Neue', Arial, sans-serif;
  --font-family-mono: 'SF Mono', 'Monaco', 'Inconsolata', 
                      'Courier New', monospace;
  
  /* Font Sizes */
  --font-size-xs: 0.6875rem;   /* 11px */
  --font-size-sm: 0.75rem;     /* 12px */
  --font-size-base: 0.8125rem; /* 13px */
  --font-size-md: 0.875rem;    /* 14px */
  --font-size-lg: 1rem;        /* 16px */
  --font-size-xl: 1.25rem;     /* 20px */
  --font-size-2xl: 1.5rem;     /* 24px */
  --font-size-3xl: 1.75rem;    /* 28px */
  
  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* Line Heights */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
}
```

CSS Variable Standards:
- Use kebab-case naming
- Prefix with type (color-, spacing-, font-)
- Create semantic aliases (text-primary, not gray-900)
- Use relative units (rem, em) for scalability
- Group related variables together

================================================================================

SCSS MIXINS AND FUNCTIONS

Responsive Mixins

```scss
/* mixins/responsive.scss */

// Breakpoints
$breakpoints: (
  'xs': 375px,
  'sm': 640px,
  'md': 768px,
  'lg': 1024px,
  'xl': 1280px,
  '2xl': 1536px
);

// Media query mixin
@mixin respond-to($breakpoint) {
  @if map-has-key($breakpoints, $breakpoint) {
    @media (min-width: map-get($breakpoints, $breakpoint)) {
      @content;
    }
  } @else {
    @warn "Breakpoint #{$breakpoint} not found in $breakpoints map";
  }
}

// Usage
.component {
  width: 100%;
  
  @include respond-to('md') {
    width: 50%;
  }
  
  @include respond-to('lg') {
    width: 33.333%;
  }
}

// Between breakpoints
@mixin respond-between($min, $max) {
  @media (min-width: map-get($breakpoints, $min)) and 
         (max-width: map-get($breakpoints, $max) - 1px) {
    @content;
  }
}
```

Typography Mixins

```scss
/* mixins/typography.scss */

@mixin font-size($size, $line-height: normal) {
  font-size: $size;
  @if $line-height != normal {
    line-height: $line-height;
  }
}

@mixin heading($size: 2xl, $weight: 700) {
  font-size: var(--font-size-#{$size});
  font-weight: $weight;
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
}

@mixin body-text($size: base, $weight: 400) {
  font-size: var(--font-size-#{$size});
  font-weight: $weight;
  line-height: var(--line-height-normal);
  color: var(--color-text-secondary);
}

@mixin truncate($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
```

Spacing Mixins

```scss
/* mixins/spacing.scss */

@mixin padding($size) {
  padding: var(--spacing-#{$size});
}

@mixin padding-x($size) {
  padding-left: var(--spacing-#{$size});
  padding-right: var(--spacing-#{$size});
}

@mixin padding-y($size) {
  padding-top: var(--spacing-#{$size});
  padding-bottom: var(--spacing-#{$size});
}

@mixin margin($size) {
  margin: var(--spacing-#{$size});
}

@mixin margin-x($size) {
  margin-left: var(--spacing-#{$size});
  margin-right: var(--spacing-#{$size});
}

@mixin margin-y($size) {
  margin-top: var(--spacing-#{$size});
  margin-bottom: var(--spacing-#{$size});
}

@mixin stack($gap: 4) {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-#{$gap});
}

@mixin inline($gap: 4) {
  display: flex;
  flex-direction: row;
  gap: var(--spacing-#{$gap});
}
```

Effect Mixins

```scss
/* mixins/effects.scss */

@mixin shadow($level: 1) {
  @if $level == 1 {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  } @else if $level == 2 {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  } @else if $level == 3 {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  } @else if $level == 4 {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }
}

@mixin hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

@mixin focus-ring($color: var(--color-primary)) {
  outline: none;
  box-shadow: 0 0 0 3px rgba($color, 0.1);
}
```

SCSS Standards:
- Prefix mixins with purpose (respond-, font-, padding-)
- Use parameters for flexibility
- Provide default values
- Document complex mixins
- Use functions for calculations

================================================================================

UTILITY CLASSES NAMING

Standard Utility Class Patterns

```css
/* utilities/spacing.css */

/* Margin utilities: m-{side}-{size} */
.m-0 { margin: var(--spacing-0); }
.m-1 { margin: var(--spacing-1); }
.m-2 { margin: var(--spacing-2); }
.m-4 { margin: var(--spacing-4); }

.mt-0 { margin-top: var(--spacing-0); }
.mt-2 { margin-top: var(--spacing-2); }
.mt-4 { margin-top: var(--spacing-4); }

.mr-2 { margin-right: var(--spacing-2); }
.mb-4 { margin-bottom: var(--spacing-4); }
.ml-2 { margin-left: var(--spacing-2); }

.mx-4 { 
  margin-left: var(--spacing-4); 
  margin-right: var(--spacing-4); 
}

.my-2 { 
  margin-top: var(--spacing-2); 
  margin-bottom: var(--spacing-2); 
}

/* Padding utilities: p-{side}-{size} */
.p-0 { padding: var(--spacing-0); }
.p-2 { padding: var(--spacing-2); }
.p-4 { padding: var(--spacing-4); }

.px-4 { 
  padding-left: var(--spacing-4); 
  padding-right: var(--spacing-4); 
}

.py-2 { 
  padding-top: var(--spacing-2); 
  padding-bottom: var(--spacing-2); 
}
```

Layout Utilities

```css
/* utilities/layout.css */

/* Display */
.block { display: block; }
.inline-block { display: inline-block; }
.inline { display: inline; }
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.grid { display: grid; }
.hidden { display: none; }

/* Flexbox */
.flex-row { flex-direction: row; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }

.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }

.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }

.gap-2 { gap: var(--spacing-2); }
.gap-4 { gap: var(--spacing-4); }

/* Grid */
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-6 { grid-template-columns: repeat(6, 1fr); }
```

Typography Utilities

```css
/* utilities/typography.css */

/* Text Size */
.text-xs { font-size: var(--font-size-xs); }
.text-sm { font-size: var(--font-size-sm); }
.text-base { font-size: var(--font-size-base); }
.text-lg { font-size: var(--font-size-lg); }
.text-xl { font-size: var(--font-size-xl); }

/* Font Weight */
.font-normal { font-weight: var(--font-weight-normal); }
.font-medium { font-weight: var(--font-weight-medium); }
.font-semibold { font-weight: var(--font-weight-semibold); }
.font-bold { font-weight: var(--font-weight-bold); }

/* Text Alignment */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }

/* Text Transform */
.uppercase { text-transform: uppercase; }
.lowercase { text-transform: lowercase; }
.capitalize { text-transform: capitalize; }

/* Text Decoration */
.underline { text-decoration: underline; }
.no-underline { text-decoration: none; }

/* Text Overflow */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Utility Class Standards:
- Use kebab-case naming
- Follow consistent patterns (property-value)
- Use abbreviations (m for margin, p for padding)
- Provide common variants only
- Document non-obvious utilities

================================================================================

THEME SYSTEM STANDARDS

Theme Structure

```css
/* themes/default.css */
[data-theme="default"],
:root {
  /* Colors */
  --color-background: #FFFFFF;
  --color-surface: #FFFFFF;
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-border: #E5E7EB;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* themes/dark.css */
[data-theme="dark"] {
  /* Colors */
  --color-background: #111827;
  --color-surface: #1F2937;
  --color-text-primary: #F9FAFB;
  --color-text-secondary: #D1D5DB;
  --color-border: #374151;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}
```

Theme Switching

```typescript
// Theme utility
export function setTheme(theme: 'default' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

export function getTheme(): 'default' | 'dark' {
  const stored = localStorage.getItem('theme')
  if (stored === 'dark') return 'dark'
  return 'default'
}

export function initTheme() {
  const theme = getTheme()
  setTheme(theme)
}
```

Theme Standards:
- Use data attributes for theme switching
- Keep theme tokens consistent
- Override only necessary variables
- Provide system preference detection
- Test all themes for accessibility

================================================================================

COMPONENT-SPECIFIC STYLES

Standard Component CSS Structure

```css
/* components/button.css */

.button {
  /* Layout */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  
  /* Spacing */
  padding: var(--button-padding-y) var(--button-padding-x);
  
  /* Typography */
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  
  /* Visual */
  border: 1px solid transparent;
  border-radius: 8px;
  background-color: var(--color-primary);
  color: white;
  cursor: pointer;
  
  /* Transition */
  transition: all 0.2s ease;
}

/* Variants */
.button--primary {
  background-color: var(--color-primary);
  color: white;
}

.button--secondary {
  background-color: transparent;
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* Sizes */
.button--sm {
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--font-size-sm);
}

.button--lg {
  padding: var(--spacing-3) var(--spacing-6);
  font-size: var(--font-size-lg);
}

/* States */
.button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.button:active {
  transform: translateY(0);
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

Component CSS Standards:
- Use BEM-like naming (.block--modifier)
- Group properties logically
- Use CSS variables for values
- Include all states (hover, active, disabled, focus)
- Comment sections for clarity

================================================================================

KEY TAKEAWAYS

1. Organize styles by purpose (base, variables, utilities, components)
2. Use CSS custom properties for theming
3. Create reusable SCSS mixins for common patterns
4. Follow consistent naming conventions
5. Build utility classes for common needs
6. Support multiple themes
7. Keep component styles modular and scoped
8. Document complex styles and mixins

================================================================================

Previous: [← 03 - TypeScript Standards](./03-TYPESCRIPT-STANDARDS.md)  
Next: [05 - JavaScript Utilities Standards](./05-JAVASCRIPT-UTILITIES.md) →

