# 4. NAMING CONVENTIONS

[← Back to Index](./00-INDEX.md)

---

## 4.1 File Naming

### Pages
```
page.tsx          ✅ Next.js convention for pages
layout.tsx        ✅ Next.js convention for layouts
route.ts          ✅ Next.js convention for API routes
```

### Components
```
ComponentName.tsx ✅ PascalCase for React components
StatCard.tsx
LineChart.tsx
YearSlicer.tsx
```

### Helpers & Utils
```
helperName.ts     ✅ camelCase for non-component files
formatHelpers.ts
kpiHelpers.ts
centralLogic.ts
```

### Styles
```
globals.css       ✅ Global styles
component.css     ✅ Component-specific styles
table-styles.css  ✅ kebab-case untuk CSS files
```

---

## 4.2 Folder Naming

### Pages/Routes
```
kebab-case        ✅ Standard for URLs
/business-performance/
/member-report/
/auto-approval-monitor/
```

### Components
```
PascalCase or kebab-case
/components/StatCard.tsx    ✅
/components/slicers/        ✅ lowercase for groups
```

---

## 4.3 Variable Naming

### React State
```typescript
const [isLoading, setIsLoading] = useState(false)     ✅ camelCase with descriptive names
const [kpiData, setKpiData] = useState(null)          ✅
const [selectedYear, setSelectedYear] = useState('')  ✅
```

### Props
```typescript
interface StatCardProps {
  title: string              ✅ camelCase
  value: string | number     ✅
  icon?: string              ✅
  additionalKpi?: object     ✅
}
```

### Functions
```typescript
const loadKPIData = async () => {}        ✅ camelCase, descriptive
const handleMenuClick = (path) => {}      ✅ handle prefix for event handlers
const formatCurrencyKPI = (value) => {}   ✅
```

---

## 4.4 Component Naming Patterns

### Pattern 1: Feature-based
```
CustomerDetailModal.tsx    ✅ {Feature}{Type}
YearSlicer.tsx            ✅ {Feature}{Type}
StatCard.tsx              ✅ {Purpose}{Type}
```

### Pattern 2: Type-based
```
LineChart.tsx             ✅ {Type}Chart
BarChart.tsx              ✅ {Type}Chart
DonutChart.tsx            ✅ {Type}Chart
```

---

## 📋 Quick Reference

| Item | Convention | Example |
|------|------------|---------|
| **React Components** | PascalCase | `StatCard.tsx` |
| **Functions/Helpers** | camelCase | `formatHelpers.ts` |
| **CSS Files** | kebab-case | `table-styles.css` |
| **URL Routes** | kebab-case | `/member-report/` |
| **Variables** | camelCase | `const selectedYear` |
| **Constants** | UPPER_SNAKE_CASE | `const API_BASE_URL` |
| **Interfaces** | PascalCase + Props/Type | `interface StatCardProps` |

---

## ✅ DO's

```typescript
// ✅ Clear, descriptive names
const calculateMonthlyRevenue = () => {}
const isDataLoading = false
const CustomerDetailModal = () => {}

// ✅ Consistent prefixes
const handleClick = () => {}
const onClick = () => {}
const isVisible = true
const hasPermission = false
```

---

## ❌ DON'T's

```typescript
// ❌ Unclear abbreviations
const calcRev = () => {}
const d = false
const CDM = () => {}

// ❌ Inconsistent naming
const click_handler = () => {}
const IsVisible = true  // Should be camelCase
const has_permission = false  // Should be camelCase
```

---

## 📌 Key Takeaways

1. **PascalCase** for components
2. **camelCase** for functions/variables
3. **kebab-case** for URLs and CSS files
4. **Descriptive names** over abbreviations
5. **Consistent prefixes** (handle, is, has, get, set)

---

**Previous:** [← 03 - Component Architecture](./03-COMPONENT-ARCHITECTURE.md)  
**Next:** [05 - File Organization](./05-FILE-ORGANIZATION.md) →

