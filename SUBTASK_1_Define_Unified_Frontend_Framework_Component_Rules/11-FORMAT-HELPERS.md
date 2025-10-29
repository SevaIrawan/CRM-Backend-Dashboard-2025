# 11. FORMAT HELPERS

[← Back to Index](./00-INDEX.md)

---

## 11.1 Standard Functions

**File:** `lib/formatHelpers.ts`

---

## 11.2 Currency Formatting

```typescript
formatCurrencyKPI(value: number, currency: string): string

// Usage
formatCurrencyKPI(1234567.89, 'MYR')  // "RM 1,234,567.89"
formatCurrencyKPI(1234567.89, 'SGD')  // "SGD 1,234,567.89"
formatCurrencyKPI(1234567.89, 'USC')  // "USD 1,234,567.89"
```

**Format:** `{SYMBOL} {SIGN}{0,000.00}`
- 2 decimal places
- Thousand separators
- Currency symbol prefix
- Negative sign handling

---

## 11.3 Numeric Formatting

```typescript
formatNumericKPI(value: number): string

// Usage
formatNumericKPI(1234.567)  // "1,234.57"
```

**Format:** `0,000.00`
- 2 decimal places
- Thousand separators
- No currency symbol

---

## 11.4 Integer Formatting

```typescript
formatIntegerKPI(value: number): string

// Usage
formatIntegerKPI(12345)  // "12,345"
```

**Format:** `0,000`
- No decimal places
- Thousand separators
- Auto-rounds value

---

## 11.5 Percentage Formatting

```typescript
formatPercentageKPI(value: number): string

// Usage
formatPercentageKPI(12.345)  // "12.35%"
```

**Format:** `0.00%`
- 2 decimal places
- Percentage symbol

---

## 11.6 MoM Change Formatting

```typescript
formatMoMChange(value: number): string

// Usage
formatMoMChange(5.67)   // "+5.67%"
formatMoMChange(-3.21)  // "-3.21%"
formatMoMChange(0)      // "0.00%"
```

**Format:** `+0.00%` or `-0.00%`
- Includes sign (+/-)
- 2 decimal places
- Percentage symbol

---

## 11.7 Usage Guide

| **KPI Type** | **Function** | **Example Input** | **Example Output** |
|--------------|--------------|-------------------|-------------------|
| Currency values | `formatCurrencyKPI()` | 1234567.89, 'MYR' | RM 1,234,567.89 |
| Numeric values | `formatNumericKPI()` | 1234.567 | 1,234.57 |
| Counts/Cases | `formatIntegerKPI()` | 12345 | 12,345 |
| Rates | `formatPercentageKPI()` | 12.345 | 12.35% |
| MoM changes | `formatMoMChange()` | 5.67 | +5.67% |

---

## 📋 Format Helper Examples

### Complete KPI Formatting

```tsx
import {
  formatCurrencyKPI,
  formatIntegerKPI,
  formatPercentageKPI,
  formatMoMChange
} from '@/lib/formatHelpers'

// Currency KPI
<StatCard
  title="DEPOSIT AMOUNT"
  value={formatCurrencyKPI(kpiData.depositAmount, 'MYR')}
  additionalKpi={{
    label: "DAILY AVERAGE",
    value: formatCurrencyKPI(dailyAvg, 'MYR')
  }}
  comparison={{
    percentage: formatMoMChange(mom),
    isPositive: mom > 0
  }}
/>

// Integer KPI
<StatCard
  title="ACTIVE MEMBER"
  value={formatIntegerKPI(kpiData.activeMember)}
  additionalKpi={{
    label: "DAILY AVERAGE",
    value: formatIntegerKPI(dailyAvg)
  }}
/>

// Percentage KPI
<StatCard
  title="CHURN RATE"
  value={formatPercentageKPI(kpiData.churnRate)}
/>
```

### Chart Data Formatting

```tsx
// Format chart tooltip values
const formatTooltipValue = (value: number, type: string) => {
  switch(type) {
    case 'currency':
      return formatCurrencyKPI(value, 'MYR')
    case 'integer':
      return formatIntegerKPI(value)
    case 'percentage':
      return formatPercentageKPI(value)
    default:
      return formatNumericKPI(value)
  }
}
```

---

## 📌 Key Takeaways

1. **Consistent formatting** across all KPIs
2. **Currency-aware** formatting with symbols
3. **Automatic thousand separators**
4. **Proper decimal handling** (2 places for currency, 0 for integers)
5. **MoM formatting** with + / - signs

---

**Previous:** [← 10 - Icon System](./10-ICON-SYSTEM.md)  
**Next:** [12 - Data Flow](./12-DATA-FLOW.md) →

