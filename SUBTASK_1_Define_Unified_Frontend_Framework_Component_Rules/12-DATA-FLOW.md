# 12. DATA FLOW

[← Back to Index](./00-INDEX.md)

---

## 12.1 Standard Data Flow Pattern

```
User Interaction
    ↓
State Update (useState)
    ↓
useEffect Triggered
    ↓
API Call (fetch)
    ↓
Response Processing
    ↓
State Update
    ↓
UI Re-render
```

---

## 12.2 Page Data Loading Pattern

```typescript
'use client'

export default function FeaturePage() {
  // 1. STATE MANAGEMENT
  const [slicerOptions, setSlicerOptions] = useState(null)
  const [kpiData, setKpiData] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  // 2. HYDRATION FIX
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // 3. LOAD SLICER OPTIONS (on mount)
  useEffect(() => {
    const loadSlicerOptions = async () => {
      const response = await fetch('/api/category-feature/slicer-options')
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.data)
        setSelectedYear(result.data.defaults.year)
        setSelectedMonth(result.data.defaults.month)
      }
    }
    loadSlicerOptions()
  }, [])
  
  // 4. LOAD KPI DATA (when filters change)
  useEffect(() => {
    if (!selectedYear || !selectedMonth) return
    
    const loadKPIData = async () => {
      setIsLoading(true)
      const response = await fetch(
        `/api/category-feature/kpi-data?year=${selectedYear}&month=${selectedMonth}`
      )
      const result = await response.json()
      
      if (result.success) {
        setKpiData(result.data.current)
        setMomData(result.data.mom)
        setDailyAverages(result.data.dailyAverage)
      }
      setIsLoading(false)
    }
    
    loadKPIData()
  }, [selectedYear, selectedMonth])
  
  // 5. LOAD CHART DATA (when year changes)
  useEffect(() => {
    if (!selectedYear) return
    
    const loadChartData = async () => {
      const response = await fetch(
        `/api/category-feature/chart-data?year=${selectedYear}`
      )
      const result = await response.json()
      
      if (result.success) {
        setChartData(result.data)
      }
    }
    
    loadChartData()
  }, [selectedYear])
  
  // 6. LOADING STATE
  if (!isMounted || isLoading) {
    return <SkeletonLoader />
  }
  
  // 7. RENDER
  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="standard">
        {/* KPI Cards */}
        {/* Charts */}
      </Frame>
    </Layout>
  )
}
```

---

## 12.3 API Data Flow

```
Client Request
    ↓
Next.js API Route (/api/*/route.ts)
    ↓
Supabase Query
    ↓
Data Processing (calculations, formatting)
    ↓
JSON Response
    ↓
Client Receives Data
    ↓
State Update
    ↓
UI Render
```

---

## 📋 Data Flow Examples

### Simple Fetch Pattern

```typescript
const [data, setData] = useState(null)
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/data')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  fetchData()
}, [])
```

### Dependent Data Loading

```typescript
// Load slicer options first
useEffect(() => {
  loadSlicerOptions()
}, [])

// Load data when filters change
useEffect(() => {
  if (!selectedYear || !selectedMonth) return  // Wait for filters
  
  loadKPIData()
}, [selectedYear, selectedMonth])
```

### Parallel Data Loading

```typescript
useEffect(() => {
  const loadAllData = async () => {
    const [kpiResult, chartResult, tableResult] = await Promise.all([
      fetch('/api/kpi-data').then(r => r.json()),
      fetch('/api/chart-data').then(r => r.json()),
      fetch('/api/table-data').then(r => r.json())
    ])
    
    setKpiData(kpiResult.data)
    setChartData(chartResult.data)
    setTableData(tableResult.data)
  }
  
  loadAllData()
}, [selectedYear, selectedMonth])
```

---

## 📌 Key Takeaways

1. **useState** for all data state
2. **useEffect** for data loading (with dependencies)
3. **Hydration fix** with `isMounted` state
4. **Loading states** for better UX
5. **Error handling** in try-catch blocks
6. **Dependent loading** (wait for prerequisites)

---

**Previous:** [← 11 - Format Helpers](./11-FORMAT-HELPERS.md)  
**Next:** [13 - Best Practices](./13-BEST-PRACTICES.md) →

