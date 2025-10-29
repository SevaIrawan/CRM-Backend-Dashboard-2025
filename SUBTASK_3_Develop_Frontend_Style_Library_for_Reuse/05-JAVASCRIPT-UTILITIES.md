05. JAVASCRIPT UTILITIES STANDARDS

[← Back to Index](./00-INDEX.md)

================================================================================

UTILITY FUNCTIONS ORGANIZATION

Standard Utils Package Structure

```
utils/
├── formatters/
│   ├── currency.ts              # Currency formatting
│   ├── number.ts                # Number formatting
│   ├── date.ts                  # Date formatting
│   ├── percentage.ts            # Percentage formatting
│   └── index.ts
├── validators/
│   ├── email.ts
│   ├── phone.ts
│   ├── date-range.ts
│   └── index.ts
├── calculations/
│   ├── kpi.ts
│   ├── statistics.ts
│   └── index.ts
├── transformers/
│   ├── array.ts
│   ├── object.ts
│   └── index.ts
└── index.ts
```

Organization Standards:
- Group by function type (formatters, validators, etc)
- One function per file for tree-shaking
- Export from index files
- Include tests alongside utilities

================================================================================

FORMATTING UTILITIES STANDARDS

Currency Formatter

```typescript
// formatters/currency.ts

/**
 * Format number as currency with proper thousand separators and decimals
 * 
 * @param value - The numeric value to format
 * @param currency - Currency code ('MYR', 'SGD', 'USD')
 * @param options - Optional formatting options
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234567.89, 'MYR') // "RM 1,234,567.89"
 * formatCurrency(1000, 'SGD') // "SGD 1,000.00"
 */
export function formatCurrency(
  value: number,
  currency: 'MYR' | 'SGD' | 'USD',
  options: Intl.NumberFormatOptions = {}
): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }
  
  const formatted = new Intl.NumberFormat('en-US', defaultOptions).format(value)
  
  const symbols: Record<string, string> = {
    'MYR': 'RM',
    'SGD': 'SGD',
    'USD': 'USD'
  }
  
  return `${symbols[currency]} ${formatted}`
}

/**
 * Format currency for KPI display (always 2 decimals)
 */
export function formatCurrencyKPI(value: number, currency: string): string {
  return formatCurrency(value, currency as 'MYR' | 'SGD' | 'USD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
```

Number Formatter

```typescript
// formatters/number.ts

/**
 * Format integer with thousand separators, no decimals
 * 
 * @example
 * formatInteger(12345) // "12,345"
 * formatInteger(1000000) // "1,000,000"
 */
export function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value))
}

/**
 * Format number with specific decimal places
 * 
 * @example
 * formatNumber(1234.5678, 2) // "1,234.57"
 * formatNumber(1000, 0) // "1,000"
 */
export function formatNumber(
  value: number,
  decimals: number = 2
): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Format number with compact notation for large values
 * 
 * @example
 * formatCompact(1500) // "1.5K"
 * formatCompact(1000000) // "1M"
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short'
  }).format(value)
}
```

Date Formatter

```typescript
// formatters/date.ts

/**
 * Format date with specific pattern
 * 
 * @param date - Date to format
 * @param format - Format pattern ('DD MMM YYYY', 'YYYY-MM-DD', etc)
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date(), 'DD MMM YYYY') // "29 Oct 2025"
 * formatDate(new Date(), 'YYYY-MM-DD') // "2025-10-29"
 */
export function formatDate(date: Date | string, format: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  const tokens: Record<string, string> = {
    'YYYY': d.getFullYear().toString(),
    'MM': String(d.getMonth() + 1).padStart(2, '0'),
    'DD': String(d.getDate()).padStart(2, '0'),
    'HH': String(d.getHours()).padStart(2, '0'),
    'mm': String(d.getMinutes()).padStart(2, '0'),
    'ss': String(d.getSeconds()).padStart(2, '0'),
    'MMM': d.toLocaleDateString('en-US', { month: 'short' })
  }
  
  let result = format
  Object.entries(tokens).forEach(([token, value]) => {
    result = result.replace(token, value)
  })
  
  return result
}

/**
 * Format date as relative time
 * 
 * @example
 * formatRelativeTime(new Date()) // "just now"
 * formatRelativeTime(yesterdayDate) // "1 day ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
  
  return formatDate(d, 'DD MMM YYYY')
}
```

Formatter Standards:
- Use Intl API for internationalization
- Provide default options
- Document with JSDoc and examples
- Handle edge cases (null, undefined, NaN)
- Return consistent types

================================================================================

VALIDATION UTILITIES STANDARDS

Input Validators

```typescript
// validators/email.ts

/**
 * Validate email address format
 * 
 * @param email - Email address to validate
 * @returns True if valid email format
 * 
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// validators/date-range.ts

/**
 * Validate date range
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Validation result with error message if invalid
 */
export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string
): { valid: boolean; error?: string } {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  if (isNaN(start.getTime())) {
    return { valid: false, error: 'Invalid start date' }
  }
  
  if (isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid end date' }
  }
  
  if (start > end) {
    return { valid: false, error: 'Start date must be before end date' }
  }
  
  const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  if (diffInDays > 365) {
    return { valid: false, error: 'Date range cannot exceed 365 days' }
  }
  
  return { valid: true }
}

// validators/number.ts

/**
 * Validate number is within range
 */
export function isInRange(
  value: number,
  min: number,
  max: number
): boolean {
  return value >= min && value <= max
}

/**
 * Validate percentage (0-100)
 */
export function isValidPercentage(value: number): boolean {
  return isInRange(value, 0, 100)
}
```

Validator Standards:
- Return boolean or validation result object
- Provide clear error messages
- Handle type coercion
- Test edge cases
- Document validation rules

================================================================================

CALCULATION UTILITIES STANDARDS

KPI Calculations

```typescript
// calculations/kpi.ts

/**
 * Calculate Month-over-Month change percentage
 * 
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Percentage change
 * 
 * @example
 * calculateMoM(1200, 1000) // 20 (20% increase)
 * calculateMoM(800, 1000) // -20 (20% decrease)
 */
export function calculateMoM(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Calculate daily average
 * 
 * @param total - Total value for period
 * @param days - Number of days in period
 * @returns Daily average
 */
export function calculateDailyAverage(
  total: number,
  days: number
): number {
  if (days === 0) return 0
  return total / days
}

/**
 * Calculate growth rate
 * 
 * @param current - Current value
 * @param baseline - Baseline value
 * @returns Growth rate percentage
 */
export function calculateGrowthRate(
  current: number,
  baseline: number
): number {
  if (baseline === 0) return 0
  return ((current - baseline) / baseline) * 100
}

/**
 * Calculate target achievement percentage
 */
export function calculateAchievement(
  actual: number,
  target: number
): number {
  if (target === 0) return 0
  return (actual / target) * 100
}
```

Statistical Calculations

```typescript
// calculations/statistics.ts

/**
 * Calculate average of array
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, val) => acc + val, 0)
  return sum / values.length
}

/**
 * Calculate median
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  
  return sorted[mid]
}

/**
 * Calculate sum
 */
export function calculateSum(values: number[]): number {
  return values.reduce((acc, val) => acc + val, 0)
}

/**
 * Calculate percentage distribution
 */
export function calculateDistribution(
  value: number,
  total: number
): number {
  if (total === 0) return 0
  return (value / total) * 100
}
```

Calculation Standards:
- Handle division by zero
- Return 0 for empty arrays
- Use clear, descriptive names
- Document formulas
- Test with edge cases

================================================================================

DATA TRANSFORMATION STANDARDS

Array Transformers

```typescript
// transformers/array.ts

/**
 * Group array by key
 * 
 * @example
 * groupBy(users, user => user.role)
 * // { admin: [...], user: [...] }
 */
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

/**
 * Remove duplicates from array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array))
}

/**
 * Remove duplicates by key
 */
export function uniqueBy<T, K>(
  array: T[],
  keyFn: (item: T) => K
): T[] {
  const seen = new Set<K>()
  return array.filter(item => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Sort array by key
 */
export function sortBy<T>(
  array: T[],
  keyFn: (item: T) => string | number,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aKey = keyFn(a)
    const bKey = keyFn(b)
    
    if (aKey < bKey) return order === 'asc' ? -1 : 1
    if (aKey > bKey) return order === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
```

Object Transformers

```typescript
// transformers/object.ts

/**
 * Pick specific keys from object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}

/**
 * Omit specific keys from object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj }
  keys.forEach(key => {
    delete result[key]
  })
  return result as Omit<T, K>
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends object>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target
  
  const source = sources.shift()
  if (!source) return target
  
  const result = { ...target }
  
  Object.keys(source).forEach(key => {
    const targetValue = result[key as keyof T]
    const sourceValue = source[key as keyof T]
    
    if (isObject(targetValue) && isObject(sourceValue)) {
      result[key as keyof T] = deepMerge(
        targetValue as any,
        sourceValue as any
      )
    } else if (sourceValue !== undefined) {
      result[key as keyof T] = sourceValue as any
    }
  })
  
  return deepMerge(result, ...sources)
}

function isObject(item: unknown): item is object {
  return item !== null && typeof item === 'object' && !Array.isArray(item)
}
```

Transformation Standards:
- Return new objects/arrays (immutable)
- Use TypeScript generics
- Handle edge cases
- Provide type safety
- Document behavior

================================================================================

PURE FUNCTIONS PRINCIPLES

Pure Function Guidelines

```typescript
// GOOD: Pure function
export function calculateTotal(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0)
}

// BAD: Impure - modifies input
export function addItem(items: number[], item: number): void {
  items.push(item)  // Mutates input
}

// GOOD: Pure version
export function addItem(items: number[], item: number): number[] {
  return [...items, item]  // Returns new array
}

// BAD: Impure - relies on external state
let globalCount = 0
export function incrementCount(): number {
  return ++globalCount  // Depends on external state
}

// GOOD: Pure version
export function increment(count: number): number {
  return count + 1  // Pure function
}

// BAD: Impure - has side effects
export function logAndCalculate(value: number): number {
  console.log(value)  // Side effect
  return value * 2
}

// GOOD: Separate concerns
export function calculate(value: number): number {
  return value * 2  // Pure calculation
}

// Log separately if needed
const result = calculate(value)
console.log(result)
```

Pure Function Characteristics:
1. Same input always produces same output
2. No side effects (no mutations, no I/O, no logging)
3. No dependency on external state
4. Deterministic and predictable
5. Easy to test and reason about

Pure Function Standards:
- All utility functions must be pure
- No mutations of input parameters
- No side effects (logging, API calls, etc)
- No dependency on external variables
- Return new objects/arrays for transformations

================================================================================

PERFORMANCE OPTIMIZATION

Memoization

```typescript
// Memoize expensive calculations
export function memoize<Args extends unknown[], Result>(
  fn: (...args: Args) => Result
): (...args: Args) => Result {
  const cache = new Map<string, Result>()
  
  return (...args: Args): Result => {
    const key = JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

// Usage
const expensiveCalculation = memoize((data: number[]) => {
  return data.reduce((sum, val) => sum + Math.sqrt(val), 0)
})
```

Debounce and Throttle

```typescript
// Debounce: Wait for pause in calls
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Args) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Throttle: Limit call frequency
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  limit: number
): (...args: Args) => void {
  let lastCall = 0
  
  return (...args: Args) => {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      fn(...args)
    }
  }
}
```

Performance Standards:
- Memoize expensive calculations
- Debounce user input handlers
- Throttle scroll/resize handlers
- Optimize for common use cases
- Measure before optimizing

================================================================================

KEY TAKEAWAYS

1. Organize utilities by function type
2. Write pure functions (no side effects)
3. Use TypeScript for type safety
4. Document with JSDoc and examples
5. Handle edge cases gracefully
6. Return consistent types
7. Test thoroughly
8. Optimize for performance when needed

================================================================================

Previous: [← 04 - Style Utilities Standards](./04-STYLE-UTILITIES.md)  
Next: [06 - Testing Standards](./06-TESTING-STANDARDS.md) →

