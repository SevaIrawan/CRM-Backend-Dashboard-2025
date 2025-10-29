10. API DESIGN STANDARDS

[← Back to Index](./00-INDEX.md)

================================================================================

PROPS NAMING CONVENTIONS

Standard Prop Names

```typescript
// Component props naming patterns

// Boolean props: is/has/should/can prefix
interface ComponentProps {
  isOpen: boolean
  isLoading: boolean
  isDisabled: boolean
  hasError: boolean
  hasIcon: boolean
  shouldAutoFocus: boolean
  canEdit: boolean
}

// Event handlers: on[Event] format
interface EventProps {
  onClick: () => void
  onChange: (value: string) => void
  onSelect: (item: Item) => void
  onOpen: () => void
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  onError: (error: Error) => void
}

// Size/variant props: specific values
interface StyleProps {
  size: 'sm' | 'md' | 'lg'
  variant: 'primary' | 'secondary' | 'tertiary'
  color: 'blue' | 'green' | 'red'
}

// Content props: clear, specific names
interface ContentProps {
  title: string
  description: string
  placeholder: string
  label: string
  icon: ReactNode
  children: ReactNode
}
```

Naming Standards:
- Use descriptive, clear names
- Boolean props start with is/has/should/can
- Event handlers start with on
- Use full words, avoid abbreviations
- Be consistent across components

================================================================================

EVENT HANDLER NAMING

Event Handler Patterns

```typescript
// GOOD: Clear, consistent naming
interface ButtonProps {
  onClick?: () => void
  onDoubleClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onFocus?: () => void
  onBlur?: () => void
}

// GOOD: Event with data
interface SelectProps {
  onChange?: (value: string) => void
  onSelect?: (option: Option) => void
}

// GOOD: Async handlers
interface FormProps {
  onSubmit?: (data: FormData) => Promise<void>
  onValidate?: (data: FormData) => Promise<ValidationResult>
}

// GOOD: Event with event object
interface InputProps {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

// BAD: Inconsistent naming
interface BadProps {
  handleClick?: () => void      // ✗ Don't use "handle" prefix
  clickHandler?: () => void     // ✗ Don't use "Handler" suffix
  clicked?: () => void          // ✗ Use "onClick"
  whenClicked?: () => void      // ✗ Use "onClick"
}
```

Event Handler Standards:
- Always use on[Event] format
- Include event object when needed
- Type async handlers properly
- Pass relevant data to handler
- Make all handlers optional

================================================================================

CALLBACK PATTERNS

Callback with Data

```typescript
// Pattern 1: Single value
interface SlicerProps {
  value: string
  onChange: (newValue: string) => void
}

<YearSlicer 
  value={year} 
  onChange={(newYear) => setYear(newYear)} 
/>

// Pattern 2: Multiple values
interface FilterProps {
  filters: Filters
  onFiltersChange: (newFilters: Partial<Filters>) => void
}

<FilterPanel
  filters={filters}
  onFiltersChange={(updates) => setFilters({ ...filters, ...updates })}
/>

// Pattern 3: Event object
interface InputProps {
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

<Input
  value={text}
  onChange={(e) => setText(e.target.value)}
/>

// Pattern 4: Async callback
interface DataProviderProps {
  onLoad: (data: Data) => Promise<void>
  onError: (error: Error) => Promise<void>
}

<DataProvider
  onLoad={async (data) => {
    await processData(data)
  }}
  onError={async (error) => {
    await logError(error)
  }}
/>
```

Callback Standards:
- Prefer single value over event object when possible
- Use partial updates for complex state
- Type async callbacks properly
- Provide meaningful parameter names
- Document callback behavior

================================================================================

REF FORWARDING STANDARDS

Ref Forwarding Pattern

```typescript
// Standard ref forwarding
import { forwardRef } from 'react'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, onClick }, ref) => {
    return (
      <button ref={ref} onClick={onClick}>
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Usage
const buttonRef = useRef<HTMLButtonElement>(null)

<Button ref={buttonRef} onClick={handleClick}>
  Click Me
</Button>
```

Multiple Refs Pattern

```typescript
// Combine external ref with internal ref
import { forwardRef, useRef, useImperativeHandle } from 'react'

interface InputProps {
  value: string
  onChange: (value: string) => void
}

interface InputHandle {
  focus: () => void
  blur: () => void
  select: () => void
}

export const Input = forwardRef<InputHandle, InputProps>(
  ({ value, onChange }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null)
    
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      select: () => inputRef.current?.select()
    }))
    
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
)

Input.displayName = 'Input'

// Usage
const inputRef = useRef<InputHandle>(null)

<Input ref={inputRef} value={value} onChange={setValue} />

// Imperative handle
inputRef.current?.focus()
```

Ref Standards:
- Forward refs for all interactive components
- Set displayName for debugging
- Use useImperativeHandle for custom handles
- Type refs properly
- Document imperative methods

================================================================================

EXTENSIBILITY PATTERNS

ClassName and Style Props

```typescript
// Always accept className and style
interface ComponentProps {
  className?: string
  style?: React.CSSProperties
  // ... other props
}

export const Component = ({ className = '', style, ...props }) => {
  return (
    <div 
      className={`component-base ${className}`}
      style={style}
    >
      {/* Content */}
    </div>
  )
}
```

Render Props Pattern

```typescript
// Allow custom rendering
interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  renderEmpty?: () => React.ReactNode
  renderLoading?: () => React.ReactNode
}

export function List<T>({ 
  items, 
  renderItem, 
  renderEmpty = () => <div>No items</div>,
  renderLoading = () => <div>Loading...</div>,
  isLoading = false
}: ListProps<T>) {
  if (isLoading) return renderLoading()
  if (items.length === 0) return renderEmpty()
  
  return (
    <div className="list">
      {items.map((item, index) => (
        <div key={index} className="list-item">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}
```

Slot Props Pattern

```typescript
// Provide slots for customization
interface CardProps {
  header?: React.ReactNode
  body?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
}

export const Card = ({ header, body, footer, children }: CardProps) => {
  return (
    <div className="card">
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{body || children}</div>
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

Composition Pattern

```typescript
// Compound components
const Select = ({ children, value, onChange }) => {
  return (
    <SelectContext.Provider value={{ value, onChange }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  )
}

Select.Trigger = ({ children }) => {
  const { value } = useSelectContext()
  return <button>{value || children}</button>
}

Select.Options = ({ children }) => {
  return <div className="options">{children}</div>
}

Select.Option = ({ value, children }) => {
  const { onChange } = useSelectContext()
  return <div onClick={() => onChange(value)}>{children}</div>
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

Extensibility Standards:
- Always accept className and style
- Provide render props for custom content
- Use slots for flexible layouts
- Support compound components
- Allow composition over configuration

================================================================================

DEFAULT PROPS AND OPTIONAL PROPS

Default Props Pattern

```typescript
// Modern approach: Default parameters
interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false
}: ButtonProps) => {
  return (
    <button 
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

// Legacy approach: defaultProps (avoid)
Button.defaultProps = {
  variant: 'primary',
  size: 'md',
  disabled: false
}
```

Required vs Optional Props

```typescript
// Clear distinction
interface FormProps {
  // Required props (no ?)
  onSubmit: (data: FormData) => Promise<void>
  
  // Optional props (with ?)
  initialValues?: FormData
  validationSchema?: ValidationSchema
  
  // Optional with defaults
  validateOnChange?: boolean    // default: false
  validateOnBlur?: boolean      // default: true
}

export const Form = ({
  onSubmit,
  initialValues = {},
  validationSchema,
  validateOnChange = false,
  validateOnBlur = true
}: FormProps) => {
  // Implementation
}
```

Default Props Standards:
- Use default parameters, not defaultProps
- Make props optional when sensible defaults exist
- Document default values in JSDoc
- Keep defaults simple (primitives, not objects)
- Don't use defaults for required behavior

================================================================================

CONTROLLED VS UNCONTROLLED COMPONENTS

Controlled Component Pattern

```typescript
// Fully controlled
interface ControlledInputProps {
  value: string
  onChange: (value: string) => void
}

export const ControlledInput = ({ value, onChange }: ControlledInputProps) => {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// Usage
const [text, setText] = useState('')
<ControlledInput value={text} onChange={setText} />
```

Uncontrolled Component Pattern

```typescript
// Fully uncontrolled
interface UncontrolledInputProps {
  defaultValue?: string
  onChange?: (value: string) => void
}

export const UncontrolledInput = ({ 
  defaultValue = '', 
  onChange 
}: UncontrolledInputProps) => {
  const [value, setValue] = useState(defaultValue)
  
  const handleChange = (newValue: string) => {
    setValue(newValue)
    onChange?.(newValue)
  }
  
  return (
    <input
      value={value}
      onChange={(e) => handleChange(e.target.value)}
    />
  )
}

// Usage
<UncontrolledInput defaultValue="initial" onChange={handleChange} />
```

Hybrid Component Pattern (Recommended)

```typescript
// Support both modes
interface HybridInputProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
}

export const HybridInput = ({
  value: controlledValue,
  defaultValue = '',
  onChange
}: HybridInputProps) => {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState(defaultValue)
  
  // Use controlled value if provided
  const value = controlledValue !== undefined ? controlledValue : internalValue
  
  const handleChange = (newValue: string) => {
    // Update internal state if uncontrolled
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    // Always notify parent
    onChange?.(newValue)
  }
  
  return (
    <input
      value={value}
      onChange={(e) => handleChange(e.target.value)}
    />
  )
}

// Usage - Controlled
<HybridInput value={text} onChange={setText} />

// Usage - Uncontrolled
<HybridInput defaultValue="initial" onChange={handleChange} />
```

Controlled/Uncontrolled Standards:
- Support both modes when possible
- Use value for controlled mode
- Use defaultValue for uncontrolled mode
- Always call onChange callback
- Document which mode is recommended

================================================================================

PROP VALIDATION AND TYPES

Runtime Validation

```typescript
// Validate props at runtime
interface SlicerProps {
  value: string
  options: string[]
  onChange: (value: string) => void
}

export const Slicer = ({ value, options, onChange }: SlicerProps) => {
  // Validate value is in options
  useEffect(() => {
    if (!options.includes(value)) {
      console.warn(
        `Slicer: value "${value}" is not in options. ` +
        `Available options: ${options.join(', ')}`
      )
    }
  }, [value, options])
  
  // Validate options is not empty
  if (options.length === 0) {
    console.error('Slicer: options array is empty')
    return null
  }
  
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  )
}
```

Type Guards

```typescript
// Type guard for union types
type Status = 'idle' | 'loading' | 'success' | 'error'

function isValidStatus(value: unknown): value is Status {
  return ['idle', 'loading', 'success', 'error'].includes(value as string)
}

// Use in component
interface StatusProps {
  status: Status
}

export const StatusIndicator = ({ status }: StatusProps) => {
  if (!isValidStatus(status)) {
    console.error(`Invalid status: ${status}`)
    return null
  }
  
  return <div className={`status status--${status}`} />
}
```

Prop Validation Standards:
- Use TypeScript for compile-time validation
- Add runtime validation for critical props
- Provide helpful error messages
- Validate in development only
- Use type guards for union types

================================================================================

KEY TAKEAWAYS

1. Use consistent naming conventions (is/has/should for booleans, on for events)
2. Always forward refs for interactive components
3. Accept className and style for extensibility
4. Provide render props for custom rendering
5. Support both controlled and uncontrolled modes
6. Use default parameters for optional props
7. Type all props with TypeScript
8. Validate critical props at runtime
9. Document API with JSDoc
10. Design for composition and flexibility

================================================================================

Previous: [← 09 - Build and Tooling Standards](./09-BUILD-TOOLING.md)  
Next: [11 - Quick Reference](./11-QUICK-REFERENCE.md) →

