01. LIBRARY ARCHITECTURE

[← Back to Index](./00-INDEX.md)

================================================================================

PACKAGE STRUCTURE STANDARDS

Standard Monorepo Structure

```
@cbo/frontend-library/
├── packages/
│   ├── components/              # React component library
│   │   ├── src/
│   │   │   ├── index.ts         # Main entry point
│   │   │   ├── layout/          # Layout components
│   │   │   ├── cards/           # KPI card components
│   │   │   ├── charts/          # Chart components
│   │   │   ├── slicers/         # Filter components
│   │   │   ├── modals/          # Modal components
│   │   │   └── utilities/       # Utility components
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── styles/                  # Style utilities
│   │   ├── src/
│   │   │   ├── index.css        # Main styles
│   │   │   ├── variables.css    # CSS variables
│   │   │   ├── mixins.scss      # SCSS mixins
│   │   │   ├── utilities.css    # Utility classes
│   │   │   └── theme.css        # Theme system
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── utils/                   # JavaScript utilities
│       ├── src/
│       │   ├── index.ts
│       │   ├── formatters/      # Formatting functions
│       │   ├── validators/      # Validation functions
│       │   ├── calculations/    # Calculation helpers
│       │   └── transformers/    # Data transformers
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── docs/                        # Documentation
├── examples/                    # Usage examples
├── tests/                       # Integration tests
├── package.json                 # Root package.json
├── tsconfig.json                # Root TypeScript config
├── lerna.json or nx.json        # Monorepo config
└── README.md                    # Main documentation
```

================================================================================

COMPONENT PACKAGE ORGANIZATION

Standard Component Module Structure

```
src/
├── index.ts                     # Exports all components
├── layout/
│   ├── Layout.tsx
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── Frame.tsx
│   ├── SubHeader.tsx
│   ├── Layout.test.tsx          # Tests alongside components
│   ├── Layout.types.ts          # Type definitions
│   └── index.ts                 # Module exports
│
├── cards/
│   ├── StatCard.tsx
│   ├── ComparisonStatCard.tsx
│   ├── ProgressBarStatCard.tsx
│   ├── DualKPICard.tsx
│   ├── StatCard.test.tsx
│   ├── cards.types.ts
│   └── index.ts
│
├── charts/
│   ├── LineChart.tsx
│   ├── BarChart.tsx
│   ├── StackedBarChart.tsx
│   ├── charts.types.ts
│   └── index.ts
│
├── slicers/
│   ├── YearSlicer.tsx
│   ├── QuarterSlicer.tsx
│   ├── MonthSlicer.tsx
│   ├── slicers.types.ts
│   └── index.ts
│
├── modals/
│   ├── BaseModal.tsx
│   ├── DetailModal.tsx
│   ├── modals.types.ts
│   └── index.ts
│
├── utilities/
│   ├── CentralIcon.tsx
│   ├── AccessControl.tsx
│   ├── SkeletonLoader.tsx
│   ├── utilities.types.ts
│   └── index.ts
│
├── hooks/                       # Custom React hooks
│   ├── useSlicers.ts
│   ├── useKPIData.ts
│   └── index.ts
│
├── types/                       # Shared types
│   ├── common.ts
│   ├── data.ts
│   └── index.ts
│
└── constants/                   # Shared constants
    ├── colors.ts
    ├── icons.ts
    └── index.ts
```

Module Naming Standards:
- Folder names: lowercase, plural (e.g., cards, charts)
- Component files: PascalCase (e.g., StatCard.tsx)
- Type files: camelCase with .types.ts suffix
- Test files: same name as component with .test.tsx suffix
- Index files: lowercase index.ts for exports

================================================================================

STYLE UTILITIES PACKAGE ORGANIZATION

Standard Style Package Structure

```
src/
├── index.css                    # Main entry point
├── variables.css                # CSS custom properties
│   ├── colors.css
│   ├── spacing.css
│   ├── typography.css
│   └── breakpoints.css
│
├── base/                        # Base styles
│   ├── reset.css
│   ├── normalize.css
│   └── global.css
│
├── utilities/                   # Utility classes
│   ├── layout.css
│   ├── spacing.css
│   ├── typography.css
│   └── display.css
│
├── mixins/                      # SCSS mixins
│   ├── responsive.scss
│   ├── typography.scss
│   ├── spacing.scss
│   └── effects.scss
│
├── theme/                       # Theme system
│   ├── default.css
│   ├── dark.css
│   └── theme-variables.css
│
└── components/                  # Component-specific styles
    ├── cards.css
    ├── charts.css
    ├── modals.css
    └── slicers.css
```

File Naming Standards:
- All CSS files: lowercase, kebab-case
- SCSS files: lowercase, kebab-case with .scss extension
- Partial files: prefix with underscore (e.g., _mixins.scss)

================================================================================

JAVASCRIPT UTILITIES PACKAGE ORGANIZATION

Standard Utils Package Structure

```
src/
├── index.ts                     # Main entry point
│
├── formatters/                  # Formatting functions
│   ├── currency.ts
│   ├── number.ts
│   ├── date.ts
│   ├── percentage.ts
│   ├── formatters.test.ts
│   └── index.ts
│
├── validators/                  # Validation functions
│   ├── email.ts
│   ├── phone.ts
│   ├── date-range.ts
│   ├── validators.test.ts
│   └── index.ts
│
├── calculations/                # Calculation helpers
│   ├── kpi.ts
│   ├── statistics.ts
│   ├── aggregations.ts
│   ├── calculations.test.ts
│   └── index.ts
│
├── transformers/                # Data transformation
│   ├── array.ts
│   ├── object.ts
│   ├── chart-data.ts
│   ├── transformers.test.ts
│   └── index.ts
│
├── types/                       # Shared types
│   ├── common.ts
│   ├── data.ts
│   └── index.ts
│
└── constants/                   # Constants
    ├── formats.ts
    ├── patterns.ts
    └── index.ts
```

Function Naming Standards:
- All functions: camelCase
- Pure functions only
- One function per file for tree-shaking
- Test file per module

================================================================================

DEPENDENCY MANAGEMENT STANDARDS

Package Dependencies Classification

1. Dependencies (Runtime Required)
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "recharts": "^2.10.0",
    "date-fns": "^2.30.0"
  }
}
```

Use for:
- Libraries required at runtime
- Must be installed in consuming project

2. Peer Dependencies (Consumer Provided)
```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "next": "^14.0.0"
  }
}
```

Use for:
- React and React DOM (avoid version conflicts)
- Framework dependencies (Next.js, etc)
- Large libraries consumed

r should provide

3. Dev Dependencies (Development Only)
```json
{
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0",
    "rollup": "^4.9.0"
  }
}
```

Use for:
- TypeScript and type definitions
- Build tools
- Testing libraries
- Linters and formatters

Dependency Version Standards:
- Use caret (^) for minor updates: "^18.0.0"
- Use tilde (~) for patch updates: "~18.0.0"  
- Use exact version for critical deps: "18.0.0"
- Regular dependency updates (monthly review)

================================================================================

EXPORT STRATEGIES

Main Entry Point (index.ts)

```typescript
// Named exports for tree-shaking
export { Layout } from './layout/Layout'
export { Header } from './layout/Header'
export { Sidebar } from './layout/Sidebar'
export { Frame } from './layout/Frame'

export { StatCard } from './cards/StatCard'
export { ComparisonStatCard } from './cards/ComparisonStatCard'

export { LineChart } from './charts/LineChart'
export { BarChart } from './charts/BarChart'

// Export types
export type { LayoutProps } from './layout/Layout.types'
export type { StatCardProps } from './cards/cards.types'

// Export hooks
export { useSlicers } from './hooks/useSlicers'

// Export utilities
export { formatCurrencyKPI } from '../utils/formatters/currency'
```

Module Exports (cards/index.ts)

```typescript
export { StatCard } from './StatCard'
export { ComparisonStatCard } from './ComparisonStatCard'
export { ProgressBarStatCard } from './ProgressBarStatCard'
export { DualKPICard } from './DualKPICard'

export type { StatCardProps } from './cards.types'
export type { ComparisonStatCardProps } from './cards.types'
export type { ProgressBarStatCardProps } from './cards.types'
export type { DualKPICardProps } from './cards.types'
```

Export Standards:
- Use named exports (not default exports)
- Export types separately
- Group related exports
- Re-export from index files
- Enable tree-shaking

================================================================================

BUILD OUTPUT STANDARDS

Standard Build Output Structure

```
dist/
├── index.js                     # CommonJS bundle
├── index.esm.js                 # ES Module bundle
├── index.d.ts                   # TypeScript declarations
├── index.d.ts.map               # Declaration map
├── styles.css                   # Bundled styles
├── layout/                      # Modular builds
│   ├── Layout.js
│   ├── Layout.d.ts
│   └── ...
├── cards/
│   ├── StatCard.js
│   ├── StatCard.d.ts
│   └── ...
└── ...
```

Build Configuration Standards:
- Generate both CommonJS and ES Module builds
- Include TypeScript declarations
- Include source maps
- Minify production builds
- Support tree-shaking
- Bundle CSS separately

Package.json Build Fields

```json
{
  "main": "./dist/index.js",
  "module": "./dist/index.esm.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "sideEffects": false
}
```

================================================================================

WORKSPACE CONFIGURATION

Monorepo Tools Options

Option 1: Lerna Configuration (lerna.json)
```json
{
  "version": "independent",
  "npmClient": "npm",
  "packages": [
    "packages/*"
  ],
  "command": {
    "publish": {
      "conventionalCommits": true,
      "message": "chore(release): publish"
    }
  }
}
```

Option 2: NPM Workspaces (package.json)
```json
{
  "name": "@cbo/frontend-library",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

Option 3: Nx Configuration (nx.json)
```json
{
  "npmScope": "cbo",
  "affected": {
    "defaultBase": "main"
  },
  "tasksRunnerOptions": {
    "default": {
      "runner": "@nrwl/workspace/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint"]
      }
    }
  }
}
```

Choose Based On:
- Small library (1-3 packages): NPM Workspaces
- Medium library (4-10 packages): Lerna
- Large library (10+ packages): Nx

================================================================================

KEY TAKEAWAYS

1. Use monorepo structure for multiple related packages
2. Organize by feature/component type, not by file type
3. Co-locate tests with components
4. Use named exports for tree-shaking
5. Separate dependencies by usage (runtime, peer, dev)
6. Build both CommonJS and ES Module formats
7. Include TypeScript declarations
8. Use workspace tools for efficiency

================================================================================

Previous: [← Index](./00-INDEX.md)  
Next: [02 - Component Development Standards](./02-COMPONENT-DEVELOPMENT.md) →

