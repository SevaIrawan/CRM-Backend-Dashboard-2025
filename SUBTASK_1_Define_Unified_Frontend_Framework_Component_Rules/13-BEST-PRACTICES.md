# 13. BEST PRACTICES

[← Back to Index](./00-INDEX.md)

---

## 13.1 Component Design

### ✅ DO

- Keep components small and focused (single responsibility)
- Use TypeScript for prop interfaces
- Implement proper error boundaries
- Use loading states for async operations
- Memoize expensive calculations with `useMemo`
- Use `useCallback` for event handlers passed to children

### ❌ DON'T

- Mix business logic with UI components
- Use inline styles (use classes)
- Create deeply nested components (max 3-4 levels)
- Ignore accessibility (add ARIA labels)

---

## 13.2 State Management

### ✅ DO

- Use `useState` for component-local state
- Lift state up when shared between siblings
- Use `useEffect` with proper dependencies
- Clean up effects (return cleanup function)

### ❌ DON'T

- Overuse global state (keep it local when possible)
- Mutate state directly (always use setState)
- Create infinite loops (missing dependencies)
- Fetch data in render function

---

## 13.3 API Design

### ✅ DO

- Use consistent endpoint naming
- Return structured JSON responses (`{ success, data, error }`)
- Implement proper error handling
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Add request validation

### ❌ DON'T

- Return raw database rows (process first)
- Expose sensitive data
- Skip error handling
- Use blocking operations

---

## 13.4 Performance

### ✅ DO

- Use dynamic imports for large components
- Implement pagination for large datasets
- Optimize images (use Next.js Image)
- Minimize bundle size
- Use React.memo for expensive renders

### ❌ DON'T

- Load all data at once (use lazy loading)
- Re-render unnecessarily
- Block the main thread
- Ignore bundle analysis

---

## 13.5 Code Quality

### ✅ DO

- Write self-documenting code (clear names)
- Add comments for complex logic
- Use consistent formatting (Prettier)
- Follow ESLint rules
- Write reusable functions

### ❌ DON'T

- Use magic numbers (define constants)
- Write duplicate code (DRY principle)
- Ignore TypeScript errors
- Skip code reviews

---

## 13.6 Security

### ✅ DO

- Validate all user inputs
- Use environment variables for secrets
- Implement role-based access control
- Sanitize data before display
- Use HTTPS only

### ❌ DON'T

- Store secrets in code
- Trust client-side validation only
- Expose API keys
- Skip authentication checks

---

## 13.7 Testing (Future Implementation)

### Recommended Testing Stack

- **Unit Tests:** Jest + React Testing Library
- **E2E Tests:** Playwright
- **Component Tests:** Storybook
- **Target Coverage:** 70%+

### Priority Areas

1. Format helpers (100% coverage)
2. Business logic functions
3. API routes
4. Critical user flows

---

## 📋 Best Practice Examples

### Component Design Example

```tsx
// ✅ GOOD: Small, focused component
interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className="btn-primary"
    >
      {label}
    </button>
  )
}

// ❌ BAD: Component doing too much
export function Button({ label, onClick, apiEndpoint, ...manyProps }) {
  const [data, setData] = useState(null)
  // Fetching data in button? No!
  useEffect(() => { fetch(apiEndpoint) }, [])
  // Business logic in UI component? No!
  const processedData = complexCalculation(data)
  return <button onClick={onClick}>{label}</button>
}
```

### State Management Example

```tsx
// ✅ GOOD: Local state with proper dependencies
export function Dashboard() {
  const [year, setYear] = useState('2025')
  const [data, setData] = useState(null)
  
  useEffect(() => {
    fetch(`/api/data?year=${year}`)
      .then(r => r.json())
      .then(result => setData(result.data))
  }, [year])  // Proper dependency
  
  return <div>{/* Use data */}</div>
}

// ❌ BAD: Missing dependencies, mutation
export function Dashboard() {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    data.newField = 'value'  // Direct mutation!
    setData(data)  // Won't trigger re-render
  })  // Missing dependencies!
}
```

### API Design Example

```typescript
// ✅ GOOD: Structured response with error handling
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData()
    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

// ❌ BAD: No error handling, raw response
export async function GET(request: NextRequest) {
  const data = await fetchData()  // What if this fails?
  return NextResponse.json(data)  // Inconsistent format
}
```

---

## 📌 Key Takeaways

1. **Single responsibility** for components
2. **Proper state management** with hooks
3. **Structured API responses** with error handling
4. **Performance optimization** (lazy loading, memoization)
5. **Code quality** (TypeScript, ESLint, formatting)
6. **Security first** (validation, sanitization, RBAC)

---

**Previous:** [← 12 - Data Flow](./12-DATA-FLOW.md)  
**Next:** [14 - Migration Checklist](./14-MIGRATION-CHECKLIST.md) →

