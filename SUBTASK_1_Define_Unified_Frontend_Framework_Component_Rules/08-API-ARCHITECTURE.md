# 8. API ARCHITECTURE

[← Back to Index](./00-INDEX.md)

---

## 8.1 API Route Pattern

### Standard Structure

```
/api/{category}-{feature}/{endpoint}/route.ts
```

### Examples

```
/api/myr-overview/slicer-options/route.ts
/api/myr-overview/chart-data/route.ts
/api/sgd-business-performance/data/route.ts
/api/usc-member-analytic/kpi-data/route.ts
```

---

## 8.2 Slicer Options API

### Purpose
Provide filter options (years, months, categories, etc.)

### Route
`/api/{category}-{feature}/slicer-options/route.ts`

### Response Format

```typescript
{
  success: true,
  data: {
    categories: ['Category A', 'Category B', 'ALL'],
    years: ['2025', '2024', '2023'],
    months: [
      { value: '1', label: 'January', years: ['2025', '2024'] },
      { value: '2', label: 'February', years: ['2025', '2024'] },
      // ...
    ],
    defaults: {
      category: 'ALL',
      year: '2025',
      month: '10'
    }
  }
}
```

### Implementation Pattern

```typescript
export async function GET(request: NextRequest) {
  try {
    // 1. Fetch distinct values from database
    const { data: categories } = await supabase
      .from('table_name')
      .select('category')
      .distinct()
    
    // 2. Build month-year mapping for dynamic filtering
    const monthYearMap = buildMonthYearMapping(rawData)
    
    // 3. Determine defaults (usually latest data)
    const defaults = {
      category: 'ALL',
      year: getLatestYear(data),
      month: getLatestMonth(data)
    }
    
    // 4. Return structured response
    return NextResponse.json({
      success: true,
      data: { categories, years, months, defaults }
    })
  } catch (error) {
    console.error('Slicer options error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load slicer options' },
      { status: 500 }
    )
  }
}
```

---

## 8.3 Chart Data API

### Purpose
Provide time-series data for charts

### Route
`/api/{category}-{feature}/chart-data/route.ts`

### Query Parameters

```
?year=2025&category=ALL
```

### Response Format

```typescript
{
  success: true,
  data: {
    months: ['Jan', 'Feb', 'Mar', ...],
    series: {
      depositAmount: [100000, 120000, 115000, ...],
      withdrawAmount: [80000, 95000, 90000, ...],
      activeMember: [5000, 5200, 5100, ...]
    }
  }
}
```

---

## 8.4 KPI Data API

### Purpose
Provide KPI values for current period

### Route
`/api/{category}-{feature}/kpi-data/route.ts`

### Query Parameters

```
?year=2025&month=10&category=ALL
```

### Response Format

```typescript
{
  success: true,
  data: {
    current: {
      depositAmount: 1250000,
      withdrawAmount: 980000,
      activeMember: 5200,
      // ... all KPIs
    },
    mom: {
      depositAmount: 5.67,    // +5.67%
      withdrawAmount: -2.34,  // -2.34%
      activeMember: 3.12      // +3.12%
    },
    dailyAverage: {
      depositAmount: 50000,
      withdrawAmount: 39200,
      activeMember: 208
    }
  }
}
```

---

## 8.5 Export API

### Purpose
Generate CSV export

### Route
`/api/{category}-{feature}/export/route.ts`

### Query Parameters

```
?year=2025&month=10&category=ALL
```

### Response

```typescript
// Set CSV headers
const headers = new Headers()
headers.set('Content-Type', 'text/csv')
headers.set('Content-Disposition', 'attachment; filename="export.csv"')

return new Response(csvContent, { headers })
```

---

## 📋 API Implementation Best Practices

### ✅ DO's

```typescript
// ✅ Structured response format
return NextResponse.json({
  success: true,
  data: result
})

// ✅ Proper error handling
try {
  const data = await fetchData()
  return NextResponse.json({ success: true, data })
} catch (error) {
  console.error('API error:', error)
  return NextResponse.json(
    { success: false, error: 'Error message' },
    { status: 500 }
  )
}

// ✅ Query parameter validation
const year = searchParams.get('year')
if (!year || isNaN(parseInt(year))) {
  return NextResponse.json(
    { success: false, error: 'Invalid year parameter' },
    { status: 400 }
  )
}
```

### ❌ DON'T's

```typescript
// ❌ Raw database response
return NextResponse.json(rawData)  // No structure!

// ❌ No error handling
const data = await fetchData()
return NextResponse.json(data)  // What if it fails?

// ❌ No validation
const year = searchParams.get('year')
const data = await getData(year)  // What if year is invalid?
```

---

## 📌 Key Takeaways

1. **Consistent endpoint naming:** `/api/{category}-{feature}/{endpoint}/route.ts`
2. **Structured responses:** `{ success, data, error }`
3. **Proper error handling** with status codes
4. **Query parameter validation**
5. **4 standard API types:** Slicer Options, Chart Data, KPI Data, Export

---

**Previous:** [← 07 - Component Standards](./07-COMPONENT-STANDARDS.md)  
**Next:** [09 - Styling System](./09-STYLING-SYSTEM.md) →

