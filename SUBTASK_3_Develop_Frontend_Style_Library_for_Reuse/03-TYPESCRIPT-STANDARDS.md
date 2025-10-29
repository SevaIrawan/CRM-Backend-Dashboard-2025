03. TYPESCRIPT STANDARDS

[← Back to Index](./00-INDEX.md)

================================================================================

TYPESCRIPT CONFIGURATION

Standard tsconfig.json for Component Library

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx"]
}
```

Key Configuration Standards:
- Enable strict mode always
- Generate declaration files
- Include source maps
- Use ES2020 target minimum
- Enable all strict type checking options

================================================================================

TYPE DEFINITION STANDARDS

Component Props Interface

```typescript
// GOOD: Clear, documented interface
export interface StatCardProps {
  // Required props
  title: string
  value: string | number
  
  // Optional props with JSDoc
  /** Format type for displaying the value */
  format?: 'currency' | 'number' | 'percentage'
  
  /** Currency code (e.g., 'MYR', 'SGD', 'USD') */
  currency?: string
  
  /** Custom icon element */
  icon?: React.ReactNode
  
  /** Additional KPI display */
  additionalKpi?: AdditionalKPI
  
  /** Comparison data for trend indication */
  comparison?: ComparisonData
  
  /** Click event handler */
  onClick?: () => void
  
  /** Makes the card clickable */
  clickable?: boolean
  
  /** Additional CSS class names */
  className?: string
}

// Supporting interfaces
export interface AdditionalKPI {
  label: string
  value: string | number
}

export interface ComparisonData {
  value: number
  label: string
}

// BAD: Unclear, no documentation
export interface Props {
  title: string
  val: any
  format?: string
  extra?: any
}
```

Interface Standards:
- Use descriptive names
- Required props first
- Optional props with JSDoc
- No use of any type
- Extract nested types

================================================================================

GENERIC TYPES USAGE

Generic Component Props

```typescript
// Generic data list component
export interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T) => string | number
  emptyMessage?: string
  loading?: boolean
}

export function List<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = 'No items',
  loading = false
}: ListProps<T>) {
  if (loading) return <Loader />
  if (items.length === 0) return <Empty message={emptyMessage} />
  
  return (
    <div className="list">
      {items.map((item, index) => (
        <div key={keyExtractor(item)}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}

// Usage with type inference
<List
  items={users}  // T inferred as User
  renderItem={(user) => <UserCard user={user} />}
  keyExtractor={(user) => user.id}
/>
```

Generic Utility Function

```typescript
// Generic array transformation
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item)
    if (!result[key]) {
      result[key] = []
    }
    result[key].push(item)
    return result
  }, {} as Record<K, T[]>)
}

// Usage
const usersByRole = groupBy(users, user => user.role)
```

Generic Standards:
- Use generics for reusable components
- Provide type constraints when needed
- Use descriptive generic names (T for type, K for key, V for value)
- Allow type inference when possible

================================================================================

UNION AND LITERAL TYPES

Union Types for Props

```typescript
// Union for size variants
export type Size = 'sm' | 'md' | 'lg'

// Union for status
export type Status = 'idle' | 'loading' | 'success' | 'error'

// Union for button variants
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger'

// Use in component
export interface ButtonProps {
  variant?: ButtonVariant
  size?: Size
  status?: Status
}

// GOOD: Strict type checking
const button: ButtonProps = {
  variant: 'primary',  // ✓ Valid
  size: 'md',          // ✓ Valid
  // variant: 'invalid' // ✗ Type error
}
```

Discriminated Unions

```typescript
// State with discriminated union
export type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

// Type-safe handling
function handleState<T>(state: LoadingState<T>) {
  switch (state.status) {
    case 'idle':
      return <Idle />
    case 'loading':
      return <Loader />
    case 'success':
      return <Display data={state.data} />  // data is available
    case 'error':
      return <Error error={state.error} />   // error is available
  }
}
```

Union Type Standards:
- Use literal types for variants
- Use discriminated unions for complex states
- Avoid string types, use unions instead
- Enable exhaustive checks with never type

================================================================================

TYPE EXPORT STANDARDS

Module Exports Structure

```typescript
// cards.types.ts

// Base interfaces
export interface BaseCardProps {
  className?: string
  style?: React.CSSProperties
}

// Component-specific interfaces
export interface StatCardProps extends BaseCardProps {
  title: string
  value: string | number
  format?: 'currency' | 'number' | 'percentage'
  // ... other props
}

export interface ComparisonStatCardProps extends BaseCardProps {
  title: string
  currentValue: number
  targetValue: number
  // ... other props
}

// Supporting types
export interface ComparisonData {
  value: number
  label: string
}

export interface AdditionalKPI {
  label: string
  value: string | number
}

// Type aliases
export type KPIFormat = 'currency' | 'number' | 'percentage'
export type ComparisonType = 'MoM' | 'YoY' | 'QoQ'
```

Index File Type Exports

```typescript
// index.ts
export { StatCard } from './StatCard'
export { ComparisonStatCard } from './ComparisonStatCard'

// Export all types
export type {
  StatCardProps,
  ComparisonStatCardProps,
  ComparisonData,
  AdditionalKPI,
  KPIFormat,
  ComparisonType
} from './cards.types'
```

Export Standards:
- Group related types in .types.ts files
- Export types using type keyword
- Re-export from index files
- Export base interfaces for extension

================================================================================

UTILITY TYPES USAGE

Built-in Utility Types

```typescript
// Partial: Make all properties optional
export interface FilterOptions {
  year: string
  month: string
  quarter: string
  line: string
}

export type PartialFilters = Partial<FilterOptions>
// { year?: string, month?: string, ... }

// Required: Make all properties required
export type RequiredFilters = Required<PartialFilters>

// Pick: Select specific properties
export type YearMonth = Pick<FilterOptions, 'year' | 'month'>
// { year: string, month: string }

// Omit: Exclude specific properties
export type WithoutLine = Omit<FilterOptions, 'line'>
// { year: string, month: string, quarter: string }

// Record: Create object type with specific keys
export type KPIValues = Record<string, number>
// { [key: string]: number }

// Readonly: Make all properties readonly
export type ReadonlyFilters = Readonly<FilterOptions>
```

Custom Utility Types

```typescript
// Make specific props optional
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Usage
export type OptionalIcon = Optional<StatCardProps, 'icon' | 'className'>

// Extract function type from object
export type EventHandlers<T> = {
  [K in keyof T]: T[K] extends Function ? T[K] : never
}

// Deep partial
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
```

Utility Type Standards:
- Use built-in utility types when possible
- Create custom utilities for common patterns
- Document custom utility types
- Keep utilities generic and reusable

================================================================================

TYPE GUARDS AND ASSERTIONS

Type Guard Functions

```typescript
// Type guard for checking object shape
export function isError(value: unknown): value is Error {
  return value instanceof Error
}

// Type guard for union types
export type APIResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string }

export function isSuccessResponse<T>(
  response: APIResponse<T>
): response is { success: true; data: T } {
  return response.success === true
}

// Usage
const response = await fetchData()
if (isSuccessResponse(response)) {
  console.log(response.data)  // TypeScript knows data exists
} else {
  console.error(response.error)  // TypeScript knows error exists
}
```

Type Assertions (Use Sparingly)

```typescript
// GOOD: Use when you know more than TypeScript
const canvas = document.querySelector('canvas') as HTMLCanvasElement

// GOOD: Use with type guards
function processValue(value: unknown) {
  if (typeof value === 'string') {
    return value.toUpperCase()
  }
  if (typeof value === 'number') {
    return value.toFixed(2)
  }
  throw new Error('Invalid value type')
}

// BAD: Avoid when possible
const data = response as any  // ✗ Loses type safety
const user = userData as User  // ✗ No runtime check
```

Type Guard Standards:
- Create type guards for complex checks
- Use user-defined type predicates
- Avoid type assertions (as) when possible
- Perform runtime validation with type guards

================================================================================

ASYNC TYPE PATTERNS

Promise Types

```typescript
// Function returning promise
export async function fetchKPIData(
  filters: FilterOptions
): Promise<KPIData> {
  const response = await fetch('/api/kpi', {
    method: 'POST',
    body: JSON.stringify(filters)
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch KPI data')
  }
  
  return response.json()
}

// Type for async state
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

// Hook with async type
export function useAsyncData<T>(
  fetcher: () => Promise<T>
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null
  })
  
  useEffect(() => {
    fetcher()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState({ data: null, loading: false, error }))
  }, [fetcher])
  
  return state
}
```

Callback Types

```typescript
// Async event handlers
export interface FormProps {
  onSubmit?: (data: FormData) => Promise<void>
  onValidate?: (data: FormData) => Promise<ValidationResult>
}

// Async callbacks with error handling
export type AsyncCallback<T, R = void> = (value: T) => Promise<R>

// Usage
export interface DataProviderProps<T> {
  fetchData: AsyncCallback<FilterOptions, T>
  onError?: AsyncCallback<Error>
}
```

Async Type Standards:
- Always type Promise return values
- Use AsyncState pattern for async operations
- Type async callbacks properly
- Handle errors in types

================================================================================

REACT SPECIFIC TYPES

Component Types

```typescript
// Functional component
export const Component: React.FC<ComponentProps> = ({ children }) => {
  return <div>{children}</div>
}

// With generic
export const GenericComponent = <T,>({ data }: { data: T }) => {
  return <div>{JSON.stringify(data)}</div>
}

// ForwardRef component
export const RefComponent = forwardRef<HTMLDivElement, ComponentProps>(
  (props, ref) => {
    return <div ref={ref}>{props.children}</div>
  }
)
```

Event Types

```typescript
// Event handler types
type ClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => void
type ChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => void
type SubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void
type KeyHandler = (event: React.KeyboardEvent<HTMLDivElement>) => void

// Usage in props
export interface ButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  onDoubleClick?: React.MouseEventHandler<HTMLButtonElement>
}

export interface InputProps {
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}
```

Ref Types

```typescript
// Element refs
const divRef = useRef<HTMLDivElement>(null)
const buttonRef = useRef<HTMLButtonElement>(null)
const inputRef = useRef<HTMLInputElement>(null)

// Value refs
const counterRef = useRef<number>(0)
const timerRef = useRef<NodeJS.Timeout | null>(null)

// Ref in props
export interface ComponentProps {
  inputRef?: React.Ref<HTMLInputElement>
}

// ForwardRef typing
export const Component = forwardRef<HTMLDivElement, ComponentProps>(
  (props, ref) => <div ref={ref} />
)
```

React Type Standards:
- Use React.FC sparingly (prefer explicit typing)
- Type event handlers properly
- Type refs with correct element types
- Use forwardRef for ref forwarding

================================================================================

KEY TAKEAWAYS

1. Enable strict TypeScript configuration
2. Document interfaces with JSDoc comments
3. Use generics for reusable components
4. Prefer union types over string types
5. Export all types from library
6. Create type guards for runtime checks
7. Type async operations properly
8. Use React-specific types correctly

================================================================================

Previous: [← 02 - Component Development Standards](./02-COMPONENT-DEVELOPMENT.md)  
Next: [04 - Style Utilities Standards](./04-STYLE-UTILITIES.md) →

