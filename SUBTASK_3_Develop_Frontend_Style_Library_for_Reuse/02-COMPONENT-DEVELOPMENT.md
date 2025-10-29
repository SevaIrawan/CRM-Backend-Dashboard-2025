02. COMPONENT DEVELOPMENT STANDARDS

[← Back to Index](./00-INDEX.md)

================================================================================

COMPONENT DESIGN PRINCIPLES

1. Single Responsibility
   - Each component has one clear purpose
   - Avoid components that do multiple things
   - Extract complex logic into hooks or utilities

2. Composition Over Configuration
   - Build complex UIs by composing simple components
   - Prefer children props over render props when possible
   - Use compound components pattern for related components

3. Controlled and Uncontrolled Modes
   - Support both controlled and uncontrolled usage
   - Provide sensible defaults for uncontrolled mode
   - Document both usage patterns

4. Extensibility
   - Accept className for custom styling
   - Forward refs when needed
   - Provide render props or slots for customization

5. Accessibility First
   - Include ARIA attributes
   - Support keyboard navigation
   - Provide screen reader text

================================================================================

COMPONENT FILE STRUCTURE

Standard Component Template

```typescript
// StatCard.tsx
import React, { forwardRef } from 'react'
import type { StatCardProps } from './cards.types'
import './StatCard.css'

/**
 * StatCard component displays a single KPI with title, value, and comparison.
 * 
 * @example
 * ```tsx
 * <StatCard
 *   title="REVENUE"
 *   value="RM 1,000,000.00"
 *   format="currency"
 *   comparison={{ value: 5.2, label: "MoM" }}
 * />
 * ```
 */
export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      title,
      value,
      format = 'number',
      currency,
      icon,
      additionalKpi,
      comparison,
      onClick,
      clickable = false,
      className = '',
      ...restProps
    },
    ref
  ) => {
    // Component logic here
    
    return (
      <div
        ref={ref}
        className={`stat-card ${clickable ? 'clickable' : ''} ${className}`}
        onClick={onClick}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        {...restProps}
      >
        {/* Component JSX here */}
      </div>
    )
  }
)

StatCard.displayName = 'StatCard'
```

Component Structure Standards:
- Use forwardRef for ref forwarding
- Destructure props with defaults
- Include JSDoc comments
- Set displayName for debugging
- Spread restProps for extensibility

================================================================================

PROPS INTERFACE STANDARDS

TypeScript Interface Definition

```typescript
// cards.types.ts

// Base props all components should extend
export interface BaseComponentProps {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  'data-testid'?: string
}

// Specific component props
export interface StatCardProps extends BaseComponentProps {
  // Required props
  title: string
  value: string | number
  
  // Optional props with descriptions
  /** Format type for value display */
  format?: 'currency' | 'number' | 'percentage'
  
  /** Currency code (e.g., 'MYR', 'SGD') */
  currency?: string
  
  /** Icon element to display */
  icon?: React.ReactNode
  
  /** Additional KPI info */
  additionalKpi?: {
    label: string
    value: string | number
  }
  
  /** Comparison data (e.g., MoM) */
  comparison?: {
    value: number
    label: string
  }
  
  /** Click handler */
  onClick?: () => void
  
  /** Whether card is clickable */
  clickable?: boolean
}
```

Props Interface Standards:
- Extend BaseComponentProps
- Required props listed first
- Optional props with default values
- JSDoc comments for complex props
- Use union types for enums
- Export all interfaces

================================================================================

STATE MANAGEMENT STANDARDS

Local State Management

```typescript
import { useState, useCallback } from 'react'

export const Component = ({ defaultValue }) => {
  // State declarations with clear names
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState(defaultValue)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Callbacks with useCallback for optimization
  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])
  
  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])
  
  const handleSelect = useCallback((value: string) => {
    setSelectedValue(value)
    // Notify parent
    onSelect?.(value)
  }, [onSelect])
  
  // Rest of component
}
```

State Standards:
- Use descriptive state names (isLoading, not loading)
- Initialize with proper types
- Use useCallback for event handlers
- Keep state minimal and derived values computed

Controlled vs Uncontrolled Pattern

```typescript
export const Component = ({
  value: controlledValue,
  defaultValue,
  onChange
}) => {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState(defaultValue)
  
  // Use controlled value if provided, otherwise internal
  const value = controlledValue !== undefined ? controlledValue : internalValue
  
  const handleChange = (newValue: string) => {
    // Update internal state if uncontrolled
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    // Always notify parent
    onChange?.(newValue)
  }
  
  // Use value and handleChange in component
}
```

================================================================================

EVENT HANDLER STANDARDS

Event Handler Naming

```typescript
interface ComponentProps {
  // Event handlers: on[Event] format
  onClick?: () => void
  onChange?: (value: string) => void
  onSelect?: (item: Item) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Error) => void
  
  // Async handlers
  onSubmit?: (data: FormData) => Promise<void>
  onLoad?: (data: Data) => Promise<void>
}
```

Event Handler Implementation

```typescript
const Component = ({ onClick, onChange }) => {
  // Internal handlers: handle[Action] format
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Component logic
    performAction()
    
    // Call prop handler
    onClick?.()
  }, [onClick])
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    
    // Validation
    if (!isValid(newValue)) return
    
    // Call prop handler
    onChange?.(newValue)
  }, [onChange])
  
  return (
    <div onClick={handleClick}>
      <input onChange={handleChange} />
    </div>
  )
}
```

Event Handler Standards:
- Props: on[Event] format
- Internal: handle[Action] format
- Use optional chaining for prop handlers
- Prevent default and stop propagation when needed
- Include proper typing

================================================================================

ERROR HANDLING STANDARDS

Error Boundary Integration

```typescript
import { Component as ReactComponent, ErrorInfo } from 'react'

class ComponentErrorBoundary extends ReactComponent<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    
    return this.props.children
  }
}
```

Component Error Handling

```typescript
export const Component = () => {
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const data = await fetchData()
      setData(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  if (error) {
    return <ErrorMessage error={error} onRetry={loadData} />
  }
  
  if (isLoading) {
    return <SkeletonLoader />
  }
  
  return <div>{/* Content */}</div>
}
```

Error Handling Standards:
- Always catch async errors
- Provide error UI
- Log errors for debugging
- Offer retry functionality
- Type errors properly

================================================================================

COMPONENT COMPOSITION PATTERNS

Compound Components Pattern

```typescript
// Parent component
export const Select = ({ children, value, onChange }) => {
  return (
    <SelectContext.Provider value={{ value, onChange }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  )
}

// Child components
Select.Trigger = ({ children }) => {
  const { value } = useSelectContext()
  return <button className="select-trigger">{value || children}</button>
}

Select.Options = ({ children }) => {
  return <div className="select-options">{children}</div>
}

Select.Option = ({ value, children }) => {
  const { onChange } = useSelectContext()
  return (
    <div className="select-option" onClick={() => onChange(value)}>
      {children}
    </div>
  )
}

// Usage
<Select value={value} onChange={setValue}>
  <Select.Trigger>Select option</Select.Trigger>
  <Select.Options>
    <Select.Option value="1">Option 1</Select.Option>
    <Select.Option value="2">Option 2</Select.Option>
  </Select.Options>
</Select>
```

Render Props Pattern

```typescript
export const DataProvider = ({ children, url }) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    fetchData(url).then(setData).catch(setError).finally(() => setIsLoading(false))
  }, [url])
  
  return children({ data, isLoading, error })
}

// Usage
<DataProvider url="/api/data">
  {({ data, isLoading, error }) => (
    isLoading ? <Loader /> : error ? <Error /> : <Display data={data} />
  )}
</DataProvider>
```

Slots Pattern

```typescript
export const Card = ({
  header,
  body,
  footer,
  children
}) => {
  return (
    <div className="card">
      {header && <div className="card-header">{header}</div>}
      {body || children}
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  )
}

// Usage
<Card
  header={<h2>Title</h2>}
  body={<p>Content</p>}
  footer={<Button>Action</Button>}
/>
```

================================================================================

PERFORMANCE OPTIMIZATION STANDARDS

Memoization

```typescript
import { memo, useMemo, useCallback } from 'react'

// Memoize component
export const ExpensiveComponent = memo(({ data, onSelect }) => {
  // Memoize calculated values
  const processedData = useMemo(() => {
    return data.map(item => expensiveTransform(item))
  }, [data])
  
  // Memoize callbacks
  const handleSelect = useCallback((id: string) => {
    onSelect(id)
  }, [onSelect])
  
  return <div>{/* Render with processedData */}</div>
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.data === nextProps.data &&
         prevProps.onSelect === nextProps.onSelect
})
```

Code Splitting

```typescript
import { lazy, Suspense } from 'react'

// Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'))
const ModalContent = lazy(() => import('./ModalContent'))

export const Component = () => {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <HeavyChart data={data} />
    </Suspense>
  )
}
```

Performance Standards:
- Use memo for expensive components
- Use useMemo for expensive calculations
- Use useCallback for callbacks passed to children
- Lazy load large components
- Provide loading fallbacks

================================================================================

ACCESSIBILITY STANDARDS

ARIA Attributes

```typescript
export const Button = ({ children, onClick, disabled, loading }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      aria-label="Submit form"
      aria-busy={loading}
      aria-disabled={disabled}
      role="button"
      tabIndex={0}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}
```

Keyboard Navigation

```typescript
export const Component = () => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        handleClick()
        break
      case 'Escape':
        handleClose()
        break
      case 'ArrowDown':
        handleNext()
        break
      case 'ArrowUp':
        handlePrevious()
        break
    }
  }
  
  return (
    <div
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label="Select option"
    >
      {/* Content */}
    </div>
  )
}
```

Accessibility Standards:
- Include ARIA labels and roles
- Support keyboard navigation
- Manage focus properly
- Provide screen reader text
- Test with screen readers

================================================================================

KEY TAKEAWAYS

1. Follow single responsibility principle
2. Support both controlled and uncontrolled modes
3. Use TypeScript with proper interfaces
4. Handle errors gracefully
5. Implement proper event handlers
6. Use composition patterns for flexibility
7. Optimize performance with memoization
8. Ensure accessibility compliance

================================================================================

Previous: [← 01 - Library Architecture](./01-LIBRARY-ARCHITECTURE.md)  
Next: [03 - TypeScript Standards](./03-TYPESCRIPT-STANDARDS.md) →

