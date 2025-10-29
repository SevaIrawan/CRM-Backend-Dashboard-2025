07. DOCUMENTATION STANDARDS

[← Back to Index](./00-INDEX.md)

================================================================================

README STANDARDS

Package README Structure

```markdown
# @cbo/component-library

Production-ready React component library for business analytics dashboards.

## Features

- 🎨 34 production-tested components
- 📊 Built-in chart components
- 🔒 Role-based access control
- ♿ WCAG 2.1 AA compliant
- 📱 Fully responsive
- ⚡ Performance optimized
- 🎯 Full TypeScript support

## Installation

```bash
npm install @cbo/component-library
```

## Quick Start

```typescript
import { StatCard, LineChart } from '@cbo/component-library'
import '@cbo/component-library/dist/styles.css'

function Dashboard() {
  return (
    <div>
      <StatCard
        title="REVENUE"
        value="RM 1,000,000.00"
        format="currency"
        currency="MYR"
      />
      
      <LineChart
        data={monthlyData}
        categories={months}
        series={[{ name: 'Revenue', dataKey: 'revenue', color: '#3B82F6' }]}
      />
    </div>
  )
}
```

## Documentation

- [API Reference](./docs/api.md)
- [Components](./docs/components/)
- [Examples](./examples/)
- [Migration Guide](./docs/migration.md)

## Components

### Layout
- Layout
- Header
- Sidebar
- Frame
- SubHeader

### Cards
- StatCard
- ComparisonStatCard
- ProgressBarStatCard
- DualKPICard

### Charts
- LineChart
- BarChart
- StackedBarChart
- SankeyChart

[View all components →](./docs/components/)

## Requirements

- React >= 18.0.0
- Next.js >= 14.0.0 (optional)
- Node >= 18.0.0

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT © CBO Team

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md)
```

README Standards:
- Start with clear description
- List key features with emojis
- Provide installation instructions
- Include quick start example
- Link to detailed documentation
- List requirements and browser support
- Include license information

================================================================================

API DOCUMENTATION STANDARDS

Component API Documentation

```markdown
# StatCard

Display a single KPI with value, comparison, and daily average.

## Import

```typescript
import { StatCard } from '@cbo/component-library'
```

## Usage

### Basic Usage

```typescript
<StatCard
  title="GROSS GAMING REVENUE"
  value="RM 1,000,000.00"
  format="currency"
  currency="MYR"
/>
```

### With Comparison

```typescript
<StatCard
  title="ACTIVE MEMBER"
  value="5,234"
  format="number"
  comparison={{ value: 5.2, label: "MoM" }}
/>
```

### With Additional KPI

```typescript
<StatCard
  title="DEPOSIT AMOUNT"
  value="RM 500,000.00"
  format="currency"
  currency="MYR"
  additionalKpi={{
    label: "DAILY AVERAGE",
    value: "RM 16,666.67"
  }}
/>
```

### Clickable Card

```typescript
<StatCard
  title="REVENUE"
  value="RM 1,000,000.00"
  format="currency"
  clickable
  onClick={() => openDetailModal()}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | required | Card title (uppercase recommended) |
| value | string \| number | required | KPI value to display |
| format | 'currency' \| 'number' \| 'percentage' | 'number' | Value format type |
| currency | string | - | Currency code (MYR, SGD, USD) |
| icon | ReactNode | - | Icon element to display |
| additionalKpi | AdditionalKPI | - | Additional KPI info |
| comparison | ComparisonData | - | Comparison data (MoM, YoY) |
| onClick | () => void | - | Click handler |
| clickable | boolean | false | Makes card clickable |
| className | string | - | Additional CSS classes |

### Type Definitions

```typescript
interface AdditionalKPI {
  label: string
  value: string | number
}

interface ComparisonData {
  value: number
  label: string
}
```

## Accessibility

- Supports keyboard navigation when clickable
- Includes proper ARIA labels
- WCAG 2.1 AA compliant

## Examples

[View live examples →](https://storybook.example.com/?path=/story/components-statcard)
```

API Documentation Standards:
- Start with component description
- Show import statement
- Provide multiple usage examples
- Document all props in table format
- Include type definitions
- Document accessibility features
- Link to live examples

================================================================================

CODE COMMENTS STANDARDS

JSDoc Comments

```typescript
/**
 * Format number as currency with proper thousand separators and decimals
 * 
 * @param value - The numeric value to format
 * @param currency - Currency code ('MYR', 'SGD', 'USD')
 * @param options - Optional Intl.NumberFormat options
 * @returns Formatted currency string
 * 
 * @example
 * ```typescript
 * formatCurrency(1234567.89, 'MYR')
 * // Returns: "RM 1,234,567.89"
 * 
 * formatCurrency(1000, 'SGD', { maximumFractionDigits: 0 })
 * // Returns: "SGD 1,000"
 * ```
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat}
 */
export function formatCurrency(
  value: number,
  currency: 'MYR' | 'SGD' | 'USD',
  options: Intl.NumberFormatOptions = {}
): string {
  // Implementation
}
```

Inline Comments

```typescript
// GOOD: Explain WHY, not WHAT
export function calculateMoM(current: number, previous: number): number {
  // Handle division by zero to prevent NaN
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  
  // Calculate percentage change
  return ((current - previous) / previous) * 100
}

// BAD: Obvious comments
export function calculateMoM(current: number, previous: number): number {
  // Check if previous is zero
  if (previous === 0) {
    // Return 100 if current is positive, otherwise 0
    return current > 0 ? 100 : 0
  }
  
  // Subtract previous from current, divide by previous, multiply by 100
  return ((current - previous) / previous) * 100
}
```

Complex Logic Comments

```typescript
export function calculateRetentionRate(data: UserData[]): number {
  // Retention rate calculation:
  // 1. Filter users active in both current and previous period
  // 2. Divide by total users in previous period
  // 3. Multiply by 100 for percentage
  //
  // Formula: (Active in Both / Previous Period) × 100
  //
  // Example:
  // Previous period: 100 users
  // Current period: 80 users
  // Active in both: 60 users
  // Retention rate: (60 / 100) × 100 = 60%
  
  const previousUsers = data.filter(u => u.activePrevious)
  const retainedUsers = data.filter(u => u.activePrevious && u.activeCurrent)
  
  if (previousUsers.length === 0) return 0
  
  return (retainedUsers.length / previousUsers.length) * 100
}
```

Code Comment Standards:
- Use JSDoc for public APIs
- Explain WHY, not WHAT
- Document complex algorithms
- Include examples in JSDoc
- Link to external resources when relevant
- Avoid obvious comments

================================================================================

USAGE EXAMPLES STANDARDS

Example Structure

```typescript
// examples/dashboard/basic-dashboard.tsx

/**
 * Basic Dashboard Example
 * 
 * This example demonstrates:
 * - Layout with header and sidebar
 * - KPI cards in a row
 * - Line chart for trend visualization
 * - Data fetching with loading states
 */

import { useState, useEffect } from 'react'
import { 
  Layout, 
  StatCard, 
  LineChart,
  YearSlicer,
  MonthSlicer 
} from '@cbo/component-library'
import { formatCurrencyKPI, formatIntegerKPI } from '@cbo/utils'

export default function BasicDashboard() {
  const [year, setYear] = useState('2025')
  const [month, setMonth] = useState('10')
  const [kpiData, setKpiData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [year, month])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/kpi?year=${year}&month=${month}`)
      const data = await response.json()
      setKpiData(data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <div className="dashboard-container">
        {/* Filters */}
        <div className="filters">
          <YearSlicer 
            value={year} 
            onChange={setYear}
            years={['2025', '2024', '2023']}
          />
          <MonthSlicer
            value={month}
            onChange={setMonth}
            months={/* month options */}
            year={year}
          />
        </div>

        {/* KPIs */}
        {isLoading ? (
          <SkeletonLoader type="card" count={6} />
        ) : (
          <div className="kpi-row">
            <StatCard
              title="GROSS GAMING REVENUE"
              value={formatCurrencyKPI(kpiData.ggr, 'MYR')}
              format="currency"
              currency="MYR"
              comparison={{ value: kpiData.momGGR, label: "MoM" }}
            />
            
            <StatCard
              title="ACTIVE MEMBER"
              value={formatIntegerKPI(kpiData.activeMember)}
              format="number"
              comparison={{ value: kpiData.momMember, label: "MoM" }}
            />
            
            {/* More cards */}
          </div>
        )}

        {/* Chart */}
        {!isLoading && (
          <div className="chart-section">
            <LineChart
              title="REVENUE TREND"
              data={kpiData.chartData}
              categories={kpiData.months}
              series={[{ 
                name: 'GGR', 
                dataKey: 'ggr', 
                color: '#3B82F6' 
              }]}
              currency="MYR"
              height={350}
            />
          </div>
        )}
      </div>
    </Layout>
  )
}
```

Example Standards:
- Include descriptive header comment
- Show complete, runnable code
- Demonstrate common use cases
- Include error handling
- Show loading states
- Use realistic data
- Add explanatory comments

================================================================================

STORYBOOK STANDARDS

Story Structure

```typescript
// StatCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { StatCard } from './StatCard'

const meta: Meta<typeof StatCard> = {
  title: 'Components/Cards/StatCard',
  component: StatCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Display a single KPI with value, comparison, and daily average.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    format: {
      control: 'select',
      options: ['currency', 'number', 'percentage']
    },
    currency: {
      control: 'select',
      options: ['MYR', 'SGD', 'USD']
    }
  }
}

export default meta
type Story = StoryObj<typeof StatCard>

// Default story
export const Default: Story = {
  args: {
    title: 'REVENUE',
    value: 'RM 1,000,000.00',
    format: 'currency',
    currency: 'MYR'
  }
}

// With comparison
export const WithComparison: Story = {
  args: {
    title: 'ACTIVE MEMBER',
    value: '5,234',
    format: 'number',
    comparison: {
      value: 5.2,
      label: 'MoM'
    }
  }
}

// With additional KPI
export const WithAdditionalKPI: Story = {
  args: {
    title: 'DEPOSIT AMOUNT',
    value: 'RM 500,000.00',
    format: 'currency',
    currency: 'MYR',
    additionalKpi: {
      label: 'DAILY AVERAGE',
      value: 'RM 16,666.67'
    }
  }
}

// Clickable
export const Clickable: Story = {
  args: {
    title: 'REVENUE',
    value: 'RM 1,000,000.00',
    format: 'currency',
    currency: 'MYR',
    clickable: true,
    onClick: () => alert('Card clicked!')
  }
}

// Negative comparison
export const NegativeComparison: Story = {
  args: {
    title: 'CHURN RATE',
    value: '12.5%',
    format: 'percentage',
    comparison: {
      value: -2.1,
      label: 'MoM'
    }
  }
}

// All features
export const AllFeatures: Story = {
  args: {
    title: 'GROSS GAMING REVENUE',
    value: 'RM 1,200,000.00',
    format: 'currency',
    currency: 'MYR',
    icon: <span>💰</span>,
    additionalKpi: {
      label: 'DAILY AVERAGE',
      value: 'RM 40,000.00'
    },
    comparison: {
      value: 8.5,
      label: 'MoM'
    },
    clickable: true,
    onClick: () => alert('Detailed view')
  }
}
```

Storybook Standards:
- One story file per component
- Use TypeScript with proper types
- Provide component description
- Create stories for all variants
- Add interactive controls
- Document props with argTypes
- Include edge cases
- Tag stories for autodocs

================================================================================

CHANGELOG STANDARDS

Changelog Format

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New ChartZoomModal component for full-screen chart view

### Changed
- Improved LineChart performance for large datasets

### Fixed
- Fixed DateRangeSlicer validation issue

## [1.2.0] - 2025-11-15

### Added
- ProgressBarStatCard component
- Export functionality for all modals
- Dark theme support

### Changed
- Updated React peer dependency to ^18.2.0
- Improved TypeScript types for all chart components

### Deprecated
- OldModal component (use NewModal instead)

### Fixed
- Fixed StatCard comparison display for negative values
- Corrected currency formatting for SGD

### Security
- Updated dependencies to fix security vulnerabilities

## [1.1.0] - 2025-10-01

### Added
- ComparisonStatCard component
- DualKPICard component
- Keyboard navigation support for all interactive components

### Changed
- Refactored chart components for better tree-shaking

### Fixed
- Fixed SSR hydration issue in Layout component

## [1.0.0] - 2025-09-01

### Added
- Initial release
- 34 production-ready components
- Complete TypeScript support
- Comprehensive documentation
```

Changelog Standards:
- Follow Keep a Changelog format
- Use Semantic Versioning
- Group changes by type (Added, Changed, Deprecated, Removed, Fixed, Security)
- Include release dates
- Link to releases
- Describe breaking changes clearly

================================================================================

MIGRATION GUIDE STANDARDS

Migration Guide Structure

```markdown
# Migration Guide

## Migrating from v1.x to v2.x

### Breaking Changes

#### 1. StatCard Props Changes

**Before (v1.x):**
```typescript
<StatCard
  label="Revenue"
  val={1000000}
  type="currency"
/>
```

**After (v2.x):**
```typescript
<StatCard
  title="REVENUE"
  value={1000000}
  format="currency"
/>
```

**Migration Steps:**
1. Rename `label` prop to `title`
2. Rename `val` prop to `value`
3. Rename `type` prop to `format`
4. Use UPPERCASE for title values

#### 2. LineChart Color Configuration

**Before (v1.x):**
```typescript
<LineChart
  data={data}
  lineColor="#3B82F6"
/>
```

**After (v2.x):**
```typescript
<LineChart
  data={data}
  series={[{ 
    name: 'Revenue', 
    dataKey: 'revenue', 
    color: '#3B82F6' 
  }]}
/>
```

**Migration Steps:**
1. Replace `lineColor` with `series` array
2. Provide `name`, `dataKey`, and `color` in series object
3. Update data structure if needed

### New Features

#### Dark Theme Support

```typescript
import { setTheme } from '@cbo/component-library/utils'

// Enable dark theme
setTheme('dark')
```

### Deprecations

The following components are deprecated and will be removed in v3.0:

- `OldModal` → Use `Modal` instead
- `LegacyButton` → Use `Button` instead

### Automated Migration

We provide a codemod to automate most changes:

```bash
npx @cbo/component-library-codemod v1-to-v2 src/
```

### Questions?

If you have questions about migration, please:
- Check the [FAQ](./FAQ.md)
- Open an issue on GitHub
- Join our Slack channel #cbo-library
```

Migration Guide Standards:
- Document all breaking changes
- Provide before/after code examples
- Include step-by-step instructions
- List new features
- Document deprecations
- Provide automated migration tools when possible
- Link to support channels

================================================================================

KEY TAKEAWAYS

1. Write comprehensive README with quick start
2. Document all component APIs with examples
3. Use JSDoc for public APIs
4. Explain WHY in code comments, not WHAT
5. Provide complete, runnable examples
6. Use Storybook for interactive documentation
7. Maintain detailed changelog
8. Provide migration guides for breaking changes
9. Keep documentation up to date
10. Link documentation together

================================================================================

Previous: [← 06 - Testing Standards](./06-TESTING-STANDARDS.md)  
Next: [08 - Package Distribution Standards](./08-PACKAGE-DISTRIBUTION.md) →

