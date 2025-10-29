11. QUICK REFERENCE

[← Back to Index](./00-INDEX.md)

================================================================================

COMPONENT TEMPLATE

Standard Component File

```typescript
// ComponentName.tsx
import { forwardRef } from 'react'
import type { ComponentNameProps } from './component.types'
import './ComponentName.css'

/**
 * ComponentName - Brief description
 * 
 * @example
 * ```tsx
 * <ComponentName
 *   prop1="value"
 *   prop2={value}
 * />
 * ```
 */
export const ComponentName = forwardRef<HTMLDivElement, ComponentNameProps>(
  (
    {
      // Required props
      requiredProp,
      
      // Optional props with defaults
      optionalProp = 'default',
      size = 'md',
      variant = 'primary',
      
      // Event handlers
      onClick,
      onChange,
      
      // Extensibility
      className = '',
      style,
      children,
      
      // Spread rest props
      ...restProps
    },
    ref
  ) => {
    // Component logic here
    
    return (
      <div
        ref={ref}
        className={`component-base component--${variant} component--${size} ${className}`}
        style={style}
        {...restProps}
      >
        {children}
      </div>
    )
  }
)

ComponentName.displayName = 'ComponentName'
```

================================================================================

TYPE DEFINITION TEMPLATE

Component Types File

```typescript
// component.types.ts
import { ReactNode, CSSProperties } from 'react'

/**
 * Base props all components extend
 */
export interface BaseComponentProps {
  className?: string
  style?: CSSProperties
  'data-testid'?: string
}

/**
 * Component-specific props
 */
export interface ComponentNameProps extends BaseComponentProps {
  // Required props
  /** Brief description of prop */
  requiredProp: string
  
  // Optional props
  /** Brief description with default value */
  optionalProp?: string
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'tertiary'
  
  // Event handlers
  /** Click event handler */
  onClick?: () => void
  
  /** Change event handler */
  onChange?: (value: string) => void
  
  // Content
  /** Child elements */
  children?: ReactNode
}

// Supporting types
export interface SupportingType {
  field1: string
  field2: number
}
```

================================================================================

UTILITY FUNCTION TEMPLATE

Pure Function

```typescript
// utils/utility-name.ts

/**
 * Brief description of what the function does
 * 
 * @param param1 - Description of parameter
 * @param param2 - Description of parameter
 * @returns Description of return value
 * 
 * @example
 * ```typescript
 * utilityFunction('input', 123)
 * // Returns: expected output
 * ```
 */
export function utilityFunction(
  param1: string,
  param2: number
): ReturnType {
  // Validate inputs
  if (!param1) {
    throw new Error('param1 is required')
  }
  
  // Function logic
  const result = processData(param1, param2)
  
  return result
}

// Helper function (not exported)
function processData(data: string, value: number): ReturnType {
  // Helper logic
  return transformedData
}
```

================================================================================

TEST TEMPLATE

Component Test File

```typescript
// ComponentName.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentName } from './ComponentName'

describe('ComponentName', () => {
  const defaultProps = {
    requiredProp: 'value'
  }
  
  test('renders with required props', () => {
    render(<ComponentName {...defaultProps} />)
    expect(screen.getByText('value')).toBeInTheDocument()
  })
  
  test('renders with optional props', () => {
    render(
      <ComponentName 
        {...defaultProps} 
        optionalProp="custom"
      />
    )
    expect(screen.getByText('custom')).toBeInTheDocument()
  })
  
  test('calls onClick when clicked', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(
      <ComponentName 
        {...defaultProps} 
        onClick={handleClick}
      />
    )
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  test('applies custom className', () => {
    const { container } = render(
      <ComponentName 
        {...defaultProps} 
        className="custom-class"
      />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
```

================================================================================

STORYBOOK TEMPLATE

Story File

```typescript
// ComponentName.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { ComponentName } from './ComponentName'

const meta: Meta<typeof ComponentName> = {
  title: 'Components/Category/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary']
    }
  }
}

export default meta
type Story = StoryObj<typeof ComponentName>

export const Default: Story = {
  args: {
    requiredProp: 'Default Value'
  }
}

export const Small: Story = {
  args: {
    requiredProp: 'Small Size',
    size: 'sm'
  }
}

export const Secondary: Story = {
  args: {
    requiredProp: 'Secondary',
    variant: 'secondary'
  }
}
```

================================================================================

PACKAGE.JSON TEMPLATE

```json
{
  "name": "@cbo/package-name",
  "version": "1.0.0",
  "description": "Brief description of package",
  "keywords": ["react", "components", "library"],
  "author": "CBO Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/cbo/package-name.git"
  },
  "bugs": {
    "url": "https://github.com/cbo/package-name/issues"
  },
  "homepage": "https://github.com/cbo/package-name#readme",
  
  "main": "./dist/index.js",
  "module": "./dist/index.esm.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "sideEffects": false,
  
  "scripts": {
    "dev": "rollup -c --watch",
    "build": "rollup -c",
    "test": "jest",
    "lint": "eslint src/**/*.{ts,tsx}",
    "type-check": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm test"
  },
  
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0",
    "rollup": "^4.9.0"
  }
}
```

================================================================================

TSCONFIG.JSON TEMPLATE

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
    "declaration": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

================================================================================

COMMON PATTERNS CHEAT SHEET

Event Handlers

```typescript
// Click handler
onClick?: () => void

// Change handler
onChange?: (value: string) => void

// Submit handler
onSubmit?: (data: FormData) => Promise<void>

// Error handler
onError?: (error: Error) => void
```

State Management

```typescript
// Simple state
const [value, setValue] = useState<string>('')

// Object state
const [state, setState] = useState<State>({ ... })

// Update object state
setState(prev => ({ ...prev, field: newValue }))

// Derived state
const derived = useMemo(() => compute(state), [state])
```

Effects

```typescript
// Run on mount
useEffect(() => {
  loadData()
}, [])

// Run on dependency change
useEffect(() => {
  loadData(filters)
}, [filters])

// Cleanup
useEffect(() => {
  const timer = setTimeout(...)
  return () => clearTimeout(timer)
}, [])
```

Refs

```typescript
// Element ref
const divRef = useRef<HTMLDivElement>(null)

// Value ref
const countRef = useRef<number>(0)

// Forwarded ref
forwardRef<HTMLDivElement, Props>((props, ref) => (
  <div ref={ref} />
))
```

Memoization

```typescript
// Memoize calculation
const result = useMemo(() => calculate(data), [data])

// Memoize callback
const handleClick = useCallback(() => {
  doSomething()
}, [])

// Memoize component
const MemoComponent = memo(Component)
```

================================================================================

CSS PATTERNS CHEAT SHEET

Layout

```css
/* Flexbox */
.flex-row {
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.flex-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Grid */
.grid-6 {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 18px;
}

/* Center */
.center {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

Spacing

```css
/* Margin */
.m-0 { margin: 0; }
.m-2 { margin: 8px; }
.m-4 { margin: 16px; }

.mt-4 { margin-top: 16px; }
.mr-4 { margin-right: 16px; }
.mb-4 { margin-bottom: 16px; }
.ml-4 { margin-left: 16px; }

/* Padding */
.p-0 { padding: 0; }
.p-2 { padding: 8px; }
.p-4 { padding: 16px; }
```

Typography

```css
.text-xs { font-size: 11px; }
.text-sm { font-size: 12px; }
.text-base { font-size: 13px; }
.text-lg { font-size: 16px; }

.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

.uppercase { text-transform: uppercase; }
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Effects

```css
/* Shadow */
.shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.shadow-md { box-shadow: 0 4px 6px rgba(0,0,0,0.1); }

/* Hover lift */
.hover-lift {
  transition: transform 0.2s;
}
.hover-lift:hover {
  transform: translateY(-2px);
}

/* Focus ring */
.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
```

================================================================================

TESTING PATTERNS CHEAT SHEET

Rendering

```typescript
// Basic render
render(<Component />)

// With props
render(<Component prop="value" />)

// Get element
screen.getByText('text')
screen.getByRole('button')
screen.getByTestId('test-id')

// Query element
screen.queryByText('text')  // null if not found
```

User Interactions

```typescript
// Setup
const user = userEvent.setup()

// Click
await user.click(element)

// Type
await user.type(input, 'text')

// Clear
await user.clear(input)

// Keyboard
await user.keyboard('{Enter}')
await user.keyboard('{Escape}')
```

Async Testing

```typescript
// Wait for element
await waitFor(() => {
  expect(screen.getByText('text')).toBeInTheDocument()
})

// Find element (async)
const element = await screen.findByText('text')

// Wait for disappearance
await waitFor(() => {
  expect(screen.queryByText('text')).not.toBeInTheDocument()
})
```

Mocking

```typescript
// Mock function
const mockFn = jest.fn()
mockFn.mockReturnValue('value')
mockFn.mockResolvedValue('async value')

// Mock module
jest.mock('./module', () => ({
  function: jest.fn()
}))

// Mock timers
jest.useFakeTimers()
jest.advanceTimersByTime(1000)
jest.useRealTimers()
```

================================================================================

GIT COMMANDS CHEAT SHEET

Common Commands

```bash
# Create branch
git checkout -b feature/name

# Stage changes
git add .
git add file.ts

# Commit
git commit -m "feat: add new feature"

# Push
git push origin branch-name

# Pull latest
git pull origin main

# Merge main into feature
git checkout feature/name
git merge main

# Rebase
git rebase main

# Stash changes
git stash
git stash pop

# View status
git status
git log --oneline
```

Commit Message Format

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Tests
- chore: Maintenance

Examples:
feat(button): add loading state
fix(modal): correct z-index issue
docs(readme): update installation steps
```

================================================================================

NPM COMMANDS CHEAT SHEET

Package Management

```bash
# Install dependencies
npm install
npm ci  # Clean install (CI/CD)

# Add package
npm install package-name
npm install --save-dev package-name

# Update packages
npm update
npm update package-name

# Remove package
npm uninstall package-name

# List packages
npm list
npm list --depth=0

# Check outdated
npm outdated

# Security audit
npm audit
npm audit fix
```

Publishing

```bash
# Build
npm run build

# Test
npm test

# Update version
npm version patch
npm version minor
npm version major

# Publish
npm publish --access public

# View published package
npm view @cbo/package-name
```

================================================================================

KEYBOARD SHORTCUTS CHEAT SHEET

VS Code

```
Ctrl/Cmd + P        - Quick file open
Ctrl/Cmd + Shift + P - Command palette
Ctrl/Cmd + B        - Toggle sidebar
Ctrl/Cmd + `        - Toggle terminal
Ctrl/Cmd + /        - Toggle comment
Ctrl/Cmd + D        - Select next occurrence
Ctrl/Cmd + F        - Find
Ctrl/Cmd + H        - Replace
F2                  - Rename symbol
Shift + Alt + F     - Format document
```

Chrome DevTools

```
Ctrl/Cmd + Shift + C - Inspect element
Ctrl/Cmd + Shift + I - Open DevTools
Ctrl/Cmd + Shift + M - Toggle device mode
Ctrl/Cmd + Shift + P - Command menu
F12                  - Toggle DevTools
```

================================================================================

USEFUL RESOURCES

Documentation

- React Docs: https://react.dev
- TypeScript Docs: https://www.typescriptlang.org/docs
- Testing Library: https://testing-library.com
- Storybook: https://storybook.js.org
- Rollup: https://rollupjs.org

Tools

- Bundlephobia: https://bundlephobia.com (Check package sizes)
- Can I Use: https://caniuse.com (Browser support)
- NPM Trends: https://npmtrends.com (Compare packages)

Standards

- Semantic Versioning: https://semver.org
- Conventional Commits: https://conventionalcommits.org
- Keep a Changelog: https://keepachangelog.com

================================================================================

KEY TAKEAWAYS

1. Use templates for consistency
2. Follow naming conventions
3. Document with examples
4. Test thoroughly
5. Version semantically
6. Keep bundle sizes small
7. Automate with CI/CD
8. Monitor quality metrics
9. Maintain changelog
10. Support community

================================================================================

Previous: [← 10 - API Design Standards](./10-API-DESIGN.md)  
[Back to Index](./00-INDEX.md)

END OF DOCUMENTATION

