06. TESTING STANDARDS

[← Back to Index](./00-INDEX.md)

================================================================================

TESTING FRAMEWORK SETUP

Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
}
```

Jest Setup File

```typescript
// jest.setup.ts
import '@testing-library/jest-dom'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return [] }
  unobserve() {}
} as any
```

Testing Framework Standards:
- Use Jest for unit testing
- Use React Testing Library for component testing
- Configure coverage thresholds (minimum 70%)
- Setup test environment properly
- Mock browser APIs

================================================================================

UNIT TESTING STANDARDS

Utility Function Testing

```typescript
// formatters/currency.test.ts
import { formatCurrency, formatCurrencyKPI } from './currency'

describe('formatCurrency', () => {
  test('formats MYR currency correctly', () => {
    expect(formatCurrency(1234567.89, 'MYR')).toBe('RM 1,234,567.89')
  })
  
  test('formats SGD currency correctly', () => {
    expect(formatCurrency(1000, 'SGD')).toBe('SGD 1,000.00')
  })
  
  test('handles zero value', () => {
    expect(formatCurrency(0, 'MYR')).toBe('RM 0.00')
  })
  
  test('handles negative values', () => {
    expect(formatCurrency(-500, 'USD')).toBe('USD -500.00')
  })
  
  test('respects custom decimal places', () => {
    expect(formatCurrency(1234.5, 'MYR', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })).toBe('RM 1,235')
  })
})

describe('formatCurrencyKPI', () => {
  test('always uses 2 decimal places', () => {
    expect(formatCurrencyKPI(1000, 'MYR')).toBe('RM 1,000.00')
    expect(formatCurrencyKPI(1000.5, 'MYR')).toBe('RM 1,000.50')
  })
})
```

Calculation Testing

```typescript
// calculations/kpi.test.ts
import { calculateMoM, calculateDailyAverage } from './kpi'

describe('calculateMoM', () => {
  test('calculates positive growth', () => {
    expect(calculateMoM(1200, 1000)).toBe(20)
  })
  
  test('calculates negative growth', () => {
    expect(calculateMoM(800, 1000)).toBe(-20)
  })
  
  test('handles zero previous value', () => {
    expect(calculateMoM(1000, 0)).toBe(100)
  })
  
  test('handles zero current value', () => {
    expect(calculateMoM(0, 1000)).toBe(-100)
  })
  
  test('handles both zero', () => {
    expect(calculateMoM(0, 0)).toBe(0)
  })
})

describe('calculateDailyAverage', () => {
  test('calculates average correctly', () => {
    expect(calculateDailyAverage(3000, 30)).toBe(100)
  })
  
  test('handles zero days', () => {
    expect(calculateDailyAverage(1000, 0)).toBe(0)
  })
})
```

Unit Test Standards:
- Test one function per describe block
- Test happy path and edge cases
- Use descriptive test names
- Test error conditions
- Aim for 100% coverage of utilities

================================================================================

COMPONENT TESTING STANDARDS

Basic Component Testing

```typescript
// StatCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  const defaultProps = {
    title: 'REVENUE',
    value: 'RM 1,000,000.00',
    format: 'currency' as const
  }
  
  test('renders title and value', () => {
    render(<StatCard {...defaultProps} />)
    
    expect(screen.getByText('REVENUE')).toBeInTheDocument()
    expect(screen.getByText('RM 1,000,000.00')).toBeInTheDocument()
  })
  
  test('displays icon when provided', () => {
    render(
      <StatCard 
        {...defaultProps} 
        icon={<svg data-testid="test-icon" />} 
      />
    )
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })
  
  test('displays additional KPI when provided', () => {
    render(
      <StatCard
        {...defaultProps}
        additionalKpi={{
          label: 'DAILY AVERAGE',
          value: 'RM 33,333.33'
        }}
      />
    )
    
    expect(screen.getByText('DAILY AVERAGE')).toBeInTheDocument()
    expect(screen.getByText('RM 33,333.33')).toBeInTheDocument()
  })
  
  test('displays comparison when provided', () => {
    render(
      <StatCard
        {...defaultProps}
        comparison={{ value: 5.2, label: 'MoM' }}
      />
    )
    
    expect(screen.getByText(/5.2/)).toBeInTheDocument()
    expect(screen.getByText('MoM')).toBeInTheDocument()
  })
  
  test('calls onClick when clickable', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(
      <StatCard
        {...defaultProps}
        clickable
        onClick={handleClick}
      />
    )
    
    const card = screen.getByRole('button')
    await user.click(card)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  test('does not call onClick when not clickable', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(
      <StatCard
        {...defaultProps}
        onClick={handleClick}
      />
    )
    
    const card = screen.getByText('REVENUE').closest('div')
    if (card) await user.click(card)
    
    expect(handleClick).not.toHaveBeenCalled()
  })
  
  test('applies custom className', () => {
    const { container } = render(
      <StatCard {...defaultProps} className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
```

Testing Interactive Components

```typescript
// Select.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'

describe('Select', () => {
  const options = [
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' }
  ]
  
  test('displays selected value', () => {
    render(
      <Select 
        value="2025" 
        onChange={() => {}} 
        options={options}
      />
    )
    
    expect(screen.getByText('2025')).toBeInTheDocument()
  })
  
  test('opens dropdown on click', async () => {
    const user = userEvent.setup()
    
    render(
      <Select 
        value="2025" 
        onChange={() => {}} 
        options={options}
      />
    )
    
    const trigger = screen.getByRole('button')
    await user.click(trigger)
    
    await waitFor(() => {
      expect(screen.getByText('2024')).toBeInTheDocument()
      expect(screen.getByText('2023')).toBeInTheDocument()
    })
  })
  
  test('calls onChange with selected value', async () => {
    const handleChange = jest.fn()
    const user = userEvent.setup()
    
    render(
      <Select 
        value="2025" 
        onChange={handleChange} 
        options={options}
      />
    )
    
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('2024'))
    
    expect(handleChange).toHaveBeenCalledWith('2024')
  })
  
  test('closes dropdown after selection', async () => {
    const user = userEvent.setup()
    
    render(
      <Select 
        value="2025" 
        onChange={() => {}} 
        options={options}
      />
    )
    
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('2024'))
    
    await waitFor(() => {
      expect(screen.queryByText('2023')).not.toBeInTheDocument()
    })
  })
  
  test('closes dropdown on Escape key', async () => {
    const user = userEvent.setup()
    
    render(
      <Select 
        value="2025" 
        onChange={() => {}} 
        options={options}
      />
    )
    
    await user.click(screen.getByRole('button'))
    await user.keyboard('{Escape}')
    
    await waitFor(() => {
      expect(screen.queryByText('2024')).not.toBeInTheDocument()
    })
  })
})
```

Component Test Standards:
- Test component rendering
- Test user interactions
- Test prop changes
- Test accessibility
- Use userEvent for interactions
- Use waitFor for async operations

================================================================================

TESTING HOOKS

Custom Hook Testing

```typescript
// useSlicers.test.ts
import { renderHook, act } from '@testing-library/react'
import { useSlicers } from './useSlicers'

describe('useSlicers', () => {
  test('initializes with default values', () => {
    const { result } = renderHook(() => useSlicers())
    
    expect(result.current.filters).toEqual({
      year: '2025',
      quarter: 'Q4',
      month: '10',
      line: 'All'
    })
  })
  
  test('updates single filter', () => {
    const { result } = renderHook(() => useSlicers())
    
    act(() => {
      result.current.updateFilter('year', '2024')
    })
    
    expect(result.current.filters.year).toBe('2024')
  })
  
  test('updates multiple filters', () => {
    const { result } = renderHook(() => useSlicers())
    
    act(() => {
      result.current.updateFilters({
        year: '2024',
        month: '09'
      })
    })
    
    expect(result.current.filters.year).toBe('2024')
    expect(result.current.filters.month).toBe('09')
  })
  
  test('resets filters', () => {
    const { result } = renderHook(() => useSlicers())
    
    act(() => {
      result.current.updateFilter('year', '2024')
      result.current.reset()
    })
    
    expect(result.current.filters.year).toBe('2025')
  })
})
```

Hook Test Standards:
- Use renderHook from Testing Library
- Wrap updates in act()
- Test initial state
- Test state updates
- Test cleanup if applicable

================================================================================

SNAPSHOT TESTING

Component Snapshot Testing

```typescript
// Button.test.tsx
import { render } from '@testing-library/react'
import { Button } from './Button'

describe('Button snapshots', () => {
  test('renders primary button correctly', () => {
    const { container } = render(
      <Button variant="primary">Click Me</Button>
    )
    expect(container.firstChild).toMatchSnapshot()
  })
  
  test('renders secondary button correctly', () => {
    const { container } = render(
      <Button variant="secondary">Click Me</Button>
    )
    expect(container.firstChild).toMatchSnapshot()
  })
  
  test('renders disabled button correctly', () => {
    const { container } = render(
      <Button disabled>Click Me</Button>
    )
    expect(container.firstChild).toMatchSnapshot()
  })
  
  test('renders button with icon', () => {
    const { container } = render(
      <Button icon={<span>📌</span>}>Click Me</Button>
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})
```

Snapshot Standards:
- Use snapshots for UI regression testing
- Keep snapshots small and focused
- Review snapshot changes carefully
- Update snapshots intentionally
- Combine with behavior tests

================================================================================

ASYNC TESTING

Testing Async Operations

```typescript
// DataProvider.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { DataProvider } from './DataProvider'

describe('DataProvider', () => {
  test('shows loading state initially', () => {
    render(
      <DataProvider url="/api/data">
        {({ isLoading }) => (
          isLoading ? <div>Loading...</div> : <div>Data</div>
        )}
      </DataProvider>
    )
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
  
  test('shows data after loading', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'Test Data' })
    })
    
    render(
      <DataProvider url="/api/data">
        {({ data, isLoading }) => (
          isLoading ? <div>Loading...</div> : <div>{data?.name}</div>
        )}
      </DataProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Test Data')).toBeInTheDocument()
    })
  })
  
  test('shows error on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'))
    
    render(
      <DataProvider url="/api/data">
        {({ error, isLoading }) => (
          isLoading ? <div>Loading...</div> : 
          error ? <div>Error: {error.message}</div> : 
          <div>Data</div>
        )}
      </DataProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch')).toBeInTheDocument()
    })
  })
})
```

Async Test Standards:
- Mock fetch/API calls
- Use waitFor for async assertions
- Test loading states
- Test success states
- Test error states

================================================================================

MOCKING STRATEGIES

Module Mocking

```typescript
// Component.test.tsx

// Mock entire module
jest.mock('./utils/api', () => ({
  fetchData: jest.fn()
}))

import { fetchData } from './utils/api'
import { Component } from './Component'

describe('Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  test('calls API on mount', () => {
    (fetchData as jest.Mock).mockResolvedValue({ data: [] })
    
    render(<Component />)
    
    expect(fetchData).toHaveBeenCalledTimes(1)
  })
})
```

Partial Mocking

```typescript
// Mock specific functions
jest.mock('./utils/formatters', () => ({
  ...jest.requireActual('./utils/formatters'),
  formatCurrency: jest.fn()
}))
```

Timer Mocking

```typescript
describe('Component with timers', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  
  afterEach(() => {
    jest.useRealTimers()
  })
  
  test('updates after delay', () => {
    render(<Component />)
    
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    
    expect(screen.getByText('Updated')).toBeInTheDocument()
  })
})
```

Mocking Standards:
- Mock external dependencies
- Clear mocks between tests
- Mock at appropriate level
- Use fake timers for time-dependent code
- Document complex mocks

================================================================================

TEST COVERAGE REQUIREMENTS

Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  },
  './src/utils/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90
  }
}
```

Coverage Standards:
- Minimum 70% overall coverage
- 90% coverage for utility functions
- 100% coverage for critical paths
- Exclude test files from coverage
- Review coverage reports regularly

================================================================================

TEST NAMING CONVENTIONS

Naming Standards

```typescript
// GOOD: Descriptive test names
describe('StatCard', () => {
  test('renders title and value', () => {})
  test('displays icon when provided', () => {})
  test('calls onClick when clicked', () => {})
  test('does not call onClick when disabled', () => {})
})

// BAD: Vague test names
describe('StatCard', () => {
  test('works', () => {})
  test('test1', () => {})
  test('check props', () => {})
})
```

Naming Convention Standards:
- Use describe for component/function name
- Use test/it for test cases
- Write descriptive test names
- Follow "should" or action format
- Make tests self-documenting

================================================================================

KEY TAKEAWAYS

1. Configure Jest with TypeScript support
2. Aim for minimum 70% code coverage
3. Test components with React Testing Library
4. Test utility functions thoroughly
5. Mock external dependencies properly
6. Use userEvent for interactions
7. Test async operations with waitFor
8. Write descriptive test names
9. Review and update snapshots carefully
10. Test accessibility

================================================================================

Previous: [← 05 - JavaScript Utilities Standards](./05-JAVASCRIPT-UTILITIES.md)  
Next: [07 - Documentation Standards](./07-DOCUMENTATION-STANDARDS.md) →

