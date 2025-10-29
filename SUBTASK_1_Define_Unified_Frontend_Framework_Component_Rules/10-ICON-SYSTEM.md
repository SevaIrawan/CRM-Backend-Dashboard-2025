# 10. ICON SYSTEM

[← Back to Index](./00-INDEX.md)

---

## 10.1 CentralIcon System

### File: `lib/CentralIcon.tsx`

**Purpose:** Centralized SVG icon management

---

## 10.2 Using Icons

### In StatCard

```tsx
<StatCard
  title="DEPOSIT AMOUNT"
  icon="Deposit Amount"  // Icon name lookup
  // ...
/>
```

### In Chart

```tsx
import { getChartIcon } from '@/lib/CentralIcon'

<LineChart
  title="DEPOSIT AMOUNT TREND"
  chartIcon={getChartIcon('Deposit Amount')}
  // ...
/>
```

---

## 10.3 Icon Naming Convention

### Function: `getKpiIcon(name: string)`

### Mappings

```typescript
'Deposit Amount' → depositAmount icon
'Withdraw Amount' → withdrawAmount icon
'Active Member' → activeMember icon
'Net Profit' → netProfit icon
// etc.
```

---

## 10.4 Adding New Icons

### Step 1: Add SVG to `KPI_ICONS` object

```typescript
export const KPI_ICONS = {
  newKpiName: `<svg>...</svg>`
}
```

### Step 2: Add mapping in `getKpiIcon()`

```typescript
export function getKpiIcon(kpiName: string): string {
  const iconMap = {
    'New KPI Name': KPI_ICONS.newKpiName,
    // ...
  }
  return iconMap[kpiName] || KPI_ICONS.depositAmount
}
```

---

## 10.5 Icon Standards

| **Property** | **Standard** |
|-------------|--------------|
| **Size** | 20x20px standard |
| **Format** | SVG only |
| **Source** | FontAwesome Pro recommended |
| **ViewBox** | `0 0 640 640` for consistency |
| **Color** | `currentColor` for dynamic coloring |

---

## 📋 Icon Usage Examples

### Basic Icon Usage

```tsx
import { getKpiIcon } from '@/lib/CentralIcon'

// In component
const icon = getKpiIcon('Deposit Amount')

<div dangerouslySetInnerHTML={{ __html: icon }} />
```

### Chart Icon Usage

```tsx
import { getChartIcon } from '@/lib/CentralIcon'

<LineChart
  title="TREND ANALYSIS"
  chartIcon={getChartIcon('Active Member')}
  series={chartData}
  categories={months}
/>
```

### Custom Icon Color

```tsx
<div 
  className="icon-wrapper"
  style={{ color: '#3B82F6' }}
  dangerouslySetInnerHTML={{ __html: getKpiIcon('Net Profit') }}
/>
```

---

## 📌 Key Takeaways

1. **Centralized management** in `lib/CentralIcon.tsx`
2. **String-based lookup** for easy usage
3. **SVG format only** for scalability
4. **Consistent sizing** (20x20px)
5. **Dynamic coloring** with `currentColor`

---

**Previous:** [← 09 - Styling System](./09-STYLING-SYSTEM.md)  
**Next:** [11 - Format Helpers](./11-FORMAT-HELPERS.md) →

