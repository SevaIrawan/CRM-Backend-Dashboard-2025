"use client"

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import SubheaderNotice from '@/components/SubheaderNotice'
import ComparisonStatCard from '@/components/ComparisonStatCard'
import BarChart from '@/components/BarChart'
import LineChart from '@/components/LineChart'
import CustomerDetailModal from '@/components/CustomerDetailModal'
import { formatKPIValue } from '@/lib/brandPerformanceTrendsLogic'
import { getChartIcon } from '@/lib/CentralIcon'


interface SlicerOptions {
  dateRange: { min: string; max: string }
  defaults: { latestDate: string }
}

interface BrandPerformanceData {
  comparison: {
    periodA: any
    periodB: any
    difference: any
    percentageChange: any
  }
  charts: {
    activeMemberComparison: any
    depositCasesComparison: any
    depositAmountTrend: any
    netProfitTrend: any
    ggrUserComparison: any
    daUserComparison: any
    atvTrend: any
    purchaseFrequencyTrend: any
  }
}

export default function BrandPerformanceTrendsPage() {
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null)
  const [periodAStart, setPeriodAStart] = useState<string>('')
  const [periodAEnd, setPeriodAEnd] = useState<string>('')
  const [periodBStart, setPeriodBStart] = useState<string>('')
  const [periodBEnd, setPeriodBEnd] = useState<string>('')
  const [showPickerA, setShowPickerA] = useState(false)
  const [showPickerB, setShowPickerB] = useState(false)
  const [tempAStart, setTempAStart] = useState('')
  const [tempAEnd, setTempAEnd] = useState('')
  const [tempBStart, setTempBStart] = useState('')
  const [tempBEnd, setTempBEnd] = useState('')
  const [data, setData] = useState<BrandPerformanceData | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // ✅ MODAL STATE for Customer Details Drill-Down
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [modalConfig, setModalConfig] = useState<{
    brand: string
    period: 'A' | 'B'
    dateRange: { start: string; end: string }
  } | null>(null)

  // ✅ HANDLE CLICK ON COUNT/ACTIVE MEMBER for drill-down
  const handleCountClick = (brand: string, period: 'A' | 'B') => {
    const dateRange = period === 'A' 
      ? { start: periodAStart, end: periodAEnd }
      : { start: periodBStart, end: periodBEnd }
    
    setModalConfig({ brand, period, dateRange })
    setShowCustomerModal(true)
  }

  // ✅ FORMATTING HELPERS
  // Integer/Count format: 0,000 (no decimal)
  const formatInteger = (value: number): string => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  // Numeric/Amount format: 0,000.00 (with comma and 2 decimals)
  const formatNumeric = (value: number): string => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // PF format: 0.00 (2 decimals, NO comma)
  const formatPF = (value: number): string => {
    return value.toFixed(2)
  }

  // For DIFF columns (with +/- sign)
  const formatIntegerDiff = (value: number): string => {
    const sign = value >= 0 ? '+' : ''
    return sign + formatInteger(value)
  }

  const formatNumericDiff = (value: number): string => {
    const sign = value >= 0 ? '+' : ''
    return sign + formatNumeric(value)
  }

  const formatPFDiff = (value: number): string => {
    const sign = value >= 0 ? '+' : ''
    return sign + formatPF(value)
  }

  // ✅ USE API OVERALL DATA FOR TABLE TOTAL (100% MATCH WITH STATCARD)
  const totalPeriodA = data && data.comparison ? {
    activeMember: data.comparison.periodA.activeMember,
    depositCases: data.comparison.periodA.depositCases,
    depositAmount: data.comparison.periodA.depositAmount,
    withdrawAmount: data.comparison.periodA.withdrawAmount,
    ggr: data.comparison.periodA.netProfit, // ✅ Table GGR column = Net Profit (same as Net Profit StatCard)
    avgTransactionValue: data.comparison.periodA.atv,
    purchaseFrequency: data.comparison.periodA.purchaseFrequency,
    winrate: data.comparison.periodA.depositAmount > 0 ? ((data.comparison.periodA.depositAmount - data.comparison.periodA.withdrawAmount) / data.comparison.periodA.depositAmount) * 100 : 0,
    ggrPerUser: data.comparison.periodA.ggrUser,
    depositAmountPerUser: data.comparison.periodA.daUser
  } : {
    activeMember: 0,
    depositCases: 0,
    depositAmount: 0,
    withdrawAmount: 0,
    ggr: 0,
    avgTransactionValue: 0,
    purchaseFrequency: 0,
    winrate: 0,
    ggrPerUser: 0,
    depositAmountPerUser: 0
  }

  const totalPeriodB = data && data.comparison ? {
    activeMember: data.comparison.periodB.activeMember,
    depositCases: data.comparison.periodB.depositCases,
    depositAmount: data.comparison.periodB.depositAmount,
    withdrawAmount: data.comparison.periodB.withdrawAmount,
    ggr: data.comparison.periodB.netProfit, // ✅ Table GGR column = Net Profit (same as Net Profit StatCard)
    avgTransactionValue: data.comparison.periodB.atv,
    purchaseFrequency: data.comparison.periodB.purchaseFrequency,
    winrate: data.comparison.periodB.depositAmount > 0 ? ((data.comparison.periodB.depositAmount - data.comparison.periodB.withdrawAmount) / data.comparison.periodB.depositAmount) * 100 : 0,
    ggrPerUser: data.comparison.periodB.ggrUser,
    depositAmountPerUser: data.comparison.periodB.daUser
  } : {
    activeMember: 0,
    depositCases: 0,
    depositAmount: 0,
    withdrawAmount: 0,
    ggr: 0,
    avgTransactionValue: 0,
    purchaseFrequency: 0,
    winrate: 0,
    ggrPerUser: 0,
    depositAmountPerUser: 0
  }

  // ✅ USE API DIFFERENCE & PERCENTAGE DATA (100% MATCH WITH STATCARD)
  const totalDiff = data && data.comparison ? {
    activeMember: data.comparison.difference.activeMember,
    avgTransactionValue: data.comparison.difference.atv,
    purchaseFrequency: data.comparison.difference.purchaseFrequency,
    depositCases: data.comparison.difference.depositCases,
    depositAmount: data.comparison.difference.depositAmount,
    ggr: data.comparison.difference.netProfit, // ✅ Table GGR column = Net Profit difference (same as Net Profit StatCard)
    winrate: (totalPeriodB.winrate - totalPeriodA.winrate), // Calculate from winrate
    ggrPerUser: data.comparison.difference.ggrUser,
    depositAmountPerUser: data.comparison.difference.daUser
  } : {
    activeMember: 0,
    avgTransactionValue: 0,
    purchaseFrequency: 0,
    depositCases: 0,
    depositAmount: 0,
    ggr: 0,
    winrate: 0,
    ggrPerUser: 0,
    depositAmountPerUser: 0
  }

  const totalPercent = data && data.comparison ? {
    activeMember: data.comparison.percentageChange.activeMember,
    avgTransactionValue: data.comparison.percentageChange.atv,
    purchaseFrequency: data.comparison.percentageChange.purchaseFrequency,
    depositCases: data.comparison.percentageChange.depositCases,
    depositAmount: data.comparison.percentageChange.depositAmount,
    ggr: data.comparison.percentageChange.netProfit, // ✅ Table GGR column = Net Profit % (same as Net Profit StatCard)
    winrate: totalPeriodA.winrate !== 0 ? ((totalPeriodB.winrate - totalPeriodA.winrate) / totalPeriodA.winrate) * 100 : 0, // Calculate from winrate
    ggrPerUser: data.comparison.percentageChange.ggrUser,
    depositAmountPerUser: data.comparison.percentageChange.daUser
  } : {
    activeMember: 0,
    avgTransactionValue: 0,
    purchaseFrequency: 0,
    depositCases: 0,
    depositAmount: 0,
    ggr: 0,
    winrate: 0,
    ggrPerUser: 0,
    depositAmountPerUser: 0
  }

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/sgd-brand-performance-trends/slicer-options')
        const json = await res.json()
        if (!json.success) throw new Error('Failed to load slicers')
        const opt: SlicerOptions = json.data
        setSlicerOptions(opt)

        const latest = new Date(opt.defaults.latestDate)
        // Default 7 days based on max date (latestDate)
        const bEnd = new Date(latest)
        const bStart = new Date(latest); bStart.setDate(bStart.getDate() - 6)
        // Period A: same 7-day window on previous month
        const aEnd = new Date(bEnd); aEnd.setMonth(aEnd.getMonth() - 1)
        const aStart = new Date(bStart); aStart.setMonth(aStart.getMonth() - 1)

        const bEndStr = bEnd.toISOString().split('T')[0]
        const bStartStr = bStart.toISOString().split('T')[0]
        const aEndStr = aEnd.toISOString().split('T')[0]
        const aStartStr = aStart.toISOString().split('T')[0]

        setPeriodBEnd(bEndStr)
        setPeriodBStart(bStartStr)
        setPeriodAEnd(aEndStr)
        setPeriodAStart(aStartStr)

        // Initial load once with defaults (no auto-reload on subsequent changes)
        const params = new URLSearchParams({
          periodAStart: aStartStr,
          periodAEnd: aEndStr,
          periodBStart: bStartStr,
          periodBEnd: bEndStr,
        })
        const dataRes = await fetch(`/api/sgd-brand-performance-trends/data?${params}`)
        const dataJson = await dataRes.json()
        if (!dataJson.success) throw new Error('Failed to load data')
        setData(dataJson.data)
        setTableData(dataJson.data?.rows || [])
      } catch (e: any) {
        setError(e.message || 'Failed to init')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Manual fetch via Search button (no auto-reload on date changes)
  const handleApplyFilters = async () => {
    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ periodAStart, periodAEnd, periodBStart, periodBEnd })
      const res = await fetch(`/api/sgd-brand-performance-trends/data?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error('Failed to load data')
      setData(json.data)
      setTableData(json.data?.rows || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        <SubheaderNotice
          show={false}
          label="NOTICE"
          message="Verification in progress — Please allow until 14:00 GMT+7 for adjustment validation to ensure 100% accurate data."
        />
      </div>
      <div className="subheader-controls" style={{ gap: '16px', marginRight: '40px' }}>
        {/* Period A */}
        <div className="slicer-group" style={{ position: 'relative' }}>
          <label className="slicer-label">PERIOD A:</label>
          <input type="text" value={`${periodAStart} to ${periodAEnd}`} readOnly
            onClick={() => { setTempAStart(periodAStart); setTempAEnd(periodAEnd); setShowPickerA(true) }}
            className="subheader-select" style={{ minWidth: '220px', cursor: 'pointer' }} />
          {showPickerA && (
            <div style={{ position:'absolute', top:'42px', left:0, zIndex:9999, background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:12, pointerEvents:'auto' }}>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="date" value={tempAStart} min="2021-01-01" max="2025-12-31" onChange={e=>setTempAStart(e.target.value)} />
                <span style={{ color:'#6b7280' }}>to</span>
                <input type="date" value={tempAEnd} min="2021-01-01" max="2025-12-31" onChange={e=>setTempAEnd(e.target.value)} />
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:10 }}>
                <button onClick={()=>setShowPickerA(false)} style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:6 }}>Cancel</button>
                <button onClick={()=>{ if (tempAStart && tempAEnd){ setPeriodAStart(tempAStart); setPeriodAEnd(tempAEnd);} setShowPickerA(false) }} style={{ padding:'6px 10px', background:'#1e293b', color:'white', borderRadius:6 }}>Apply</button>
              </div>
            </div>
          )}
        </div>
        {/* Period B */}
        <div className="slicer-group" style={{ position: 'relative' }}>
          <label className="slicer-label">PERIOD B:</label>
          <input type="text" value={`${periodBStart} to ${periodBEnd}`} readOnly
            onClick={() => { setTempBStart(periodBStart); setTempBEnd(periodBEnd); setShowPickerB(true) }}
            className="subheader-select" style={{ minWidth: '220px', cursor: 'pointer' }} />
          {showPickerB && (
            <div style={{ position:'absolute', top:'42px', left:0, zIndex:9999, background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:12, pointerEvents:'auto' }}>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="date" value={tempBStart} min="2021-01-01" max="2025-12-31" onChange={e=>setTempBStart(e.target.value)} />
                <span style={{ color:'#6b7280' }}>to</span>
                <input type="date" value={tempBEnd} min="2021-01-01" max="2025-12-31" onChange={e=>setTempBEnd(e.target.value)} />
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:10 }}>
                <button onClick={()=>setShowPickerB(false)} style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:6 }}>Cancel</button>
                <button onClick={()=>{ if (tempBStart && tempBEnd){ setPeriodBStart(tempBStart); setPeriodBEnd(tempBEnd);} setShowPickerB(false) }} style={{ padding:'6px 10px', background:'#1e293b', color:'white', borderRadius:6 }}>Apply</button>
              </div>
            </div>
          )}
        </div>
      <button onClick={handleApplyFilters} className="export-button">
        Search
      </button>
      </div>
    </div>
  )

  const handleExportCSV = async () => {
    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) return
    try {
      setExporting(true)
      const params = new URLSearchParams({ periodAStart, periodAEnd, periodBStart, periodBEnd })
      const res = await fetch(`/api/sgd-brand-performance-trends/export?${params}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `brand_performance_trends_sgd_${periodBEnd}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export error:', e)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="standard">
        {/* Content Container with proper spacing and scroll */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          marginTop: '20px',
          height: 'calc(100vh - 200px)',
          overflowY: 'auto',
          paddingRight: '8px'
        }}>
          {loading && (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-800">Loading Brand Performance Trends</p>
                  <p className="text-sm text-gray-500">Fetching real-time data from database...</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-container">
              <p>Error: {error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* BARIS 1: KPI CARDS (6 CARDS HORIZONTAL ROW) */}
              <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '18px', marginBottom: '24px' }}>
                <ComparisonStatCard
                  title="Active Member A|B"
                  valueA={formatKPIValue(data.comparison.periodA.activeMember, 'count')}
                  valueB={formatKPIValue(data.comparison.periodB.activeMember, 'count')}
                  additionalKpi={{
                    label: "Compare (B-A)",
                    value: formatKPIValue(data.comparison.difference.activeMember, 'count'),
                    isPositive: data.comparison.difference.activeMember > 0
                  }}
                  comparison={{
                    percentage: formatKPIValue(data.comparison.percentageChange.activeMember, 'percentage'),
                    isPositive: data.comparison.percentageChange.activeMember > 0,
                    text: "(B-A)"
                  }}
                  icon="Active Member"
                />
                <ComparisonStatCard
                  title="Deposit Amount A|B"
                  valueA={formatKPIValue(data.comparison.periodA.depositAmount, 'currency', 'SGD')}
                  valueB={formatKPIValue(data.comparison.periodB.depositAmount, 'currency', 'SGD')}
                  additionalKpi={{
                    label: "Compare (B-A)",
                    value: formatKPIValue(data.comparison.difference.depositAmount, 'currency', 'SGD'),
                    isPositive: data.comparison.difference.depositAmount > 0
                  }}
                  comparison={{
                    percentage: formatKPIValue(data.comparison.percentageChange.depositAmount, 'percentage'),
                    isPositive: data.comparison.percentageChange.depositAmount > 0,
                    text: "(B-A)"
                  }}
                  icon="Deposit Amount"
                />
                <ComparisonStatCard
                  title="Deposit Cases A|B"
                  valueA={formatKPIValue(data.comparison.periodA.depositCases, 'count')}
                  valueB={formatKPIValue(data.comparison.periodB.depositCases, 'count')}
                  additionalKpi={{
                    label: "Compare (B-A)",
                    value: formatKPIValue(data.comparison.difference.depositCases, 'count'),
                    isPositive: data.comparison.difference.depositCases > 0
                  }}
                  comparison={{
                    percentage: formatKPIValue(data.comparison.percentageChange.depositCases, 'percentage'),
                    isPositive: data.comparison.percentageChange.depositCases > 0,
                    text: "(B-A)"
                  }}
                  icon="Deposit Cases"
                />
                <ComparisonStatCard
                  title="Net Profit A|B"
                  valueA={formatKPIValue(data.comparison.periodA.netProfit, 'currency', 'SGD')}
                  valueB={formatKPIValue(data.comparison.periodB.netProfit, 'currency', 'SGD')}
                  additionalKpi={{
                    label: "Compare (B-A)",
                    value: formatKPIValue(data.comparison.difference.netProfit, 'currency', 'SGD'),
                    isPositive: data.comparison.difference.netProfit > 0
                  }}
                  comparison={{
                    percentage: formatKPIValue(data.comparison.percentageChange.netProfit, 'percentage'),
                    isPositive: data.comparison.percentageChange.netProfit > 0,
                    text: "(B-A)"
                  }}
                  icon="Net Profit"
                />
                <ComparisonStatCard
                  title="DA USER A|B"
                  valueA={formatKPIValue(data.comparison.periodA.daUser, 'currency', 'SGD')}
                  valueB={formatKPIValue(data.comparison.periodB.daUser, 'currency', 'SGD')}
                  additionalKpi={{
                    label: "Compare (B-A)",
                    value: formatKPIValue(data.comparison.difference.daUser, 'currency', 'SGD'),
                    isPositive: data.comparison.difference.daUser > 0
                  }}
                  comparison={{
                    percentage: formatKPIValue(data.comparison.percentageChange.daUser, 'percentage'),
                    isPositive: data.comparison.percentageChange.daUser > 0,
                    text: "(B-A)"
                  }}
                  icon="DA User"
                />
                <ComparisonStatCard
                  title="GGR USER A|B"
                  valueA={formatKPIValue(data.comparison.periodA.ggrUser, 'currency', 'SGD')}
                  valueB={formatKPIValue(data.comparison.periodB.ggrUser, 'currency', 'SGD')}
                  additionalKpi={{
                    label: "Compare (B-A)",
                    value: formatKPIValue(data.comparison.difference.ggrUser, 'currency', 'SGD'),
                    isPositive: data.comparison.difference.ggrUser > 0
                  }}
                  comparison={{
                    percentage: formatKPIValue(data.comparison.percentageChange.ggrUser, 'percentage'),
                    isPositive: data.comparison.percentageChange.ggrUser > 0,
                    text: "(B-A)"
                  }}
                  icon="GGR User"
                />
              </div>

              

              {/* Row 2: Active Member & Deposit Cases Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <BarChart
                  title="Active Member Performance Comparison"
                  series={data.charts.activeMemberComparison.series}
                  categories={data.charts.activeMemberComparison.categories.periodA}
                  currency="MEMBER"
                  showDataLabels={true}
                  chartIcon={getChartIcon('Active Member')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                />
                <BarChart
                  title="Deposit Cases Performance Comparison"
                  series={data.charts.depositCasesComparison.series}
                  categories={data.charts.depositCasesComparison.categories.periodA}
                  currency="CASES"
                  showDataLabels={true}
                  chartIcon={getChartIcon('Deposit Amount')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                />
              </div>

              {/* Row 3: Deposit Amount & Net Profit Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <LineChart
                  title="Deposit Amount Performance Comparison"
                  series={data.charts.depositAmountTrend.series}
                  categories={data.charts.depositAmountTrend.categories.periodA}
                  currency="SGD"
                  showDataLabels={true}
                  useDenominationLabels={true}
                  chartIcon={getChartIcon('Deposit Amount')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                />
                <LineChart
                  title="Net Profit Performance Comparison"
                  series={data.charts.netProfitTrend.series}
                  categories={data.charts.netProfitTrend.categories.periodA}
                  currency="SGD"
                  showDataLabels={true}
                  useDenominationLabels={true}
                  chartIcon={getChartIcon('Net Profit')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                />
              </div>

              {/* Row 4: GGR User & DA User Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <BarChart
                  title="GGR User Performance Comparison"
                  series={data.charts.ggrUserComparison.series}
                  categories={data.charts.ggrUserComparison.categories.periodA}
                  currency="SGD"
                  showDataLabels={true}
                  chartIcon={getChartIcon('GGR User')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                />
                <BarChart
                  title="DA User Performance Comparison"
                  series={data.charts.daUserComparison.series}
                  categories={data.charts.daUserComparison.categories.periodA}
                  currency="SGD"
                  showDataLabels={true}
                  chartIcon={getChartIcon('DA User Trend')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                />
              </div>

              {/* Row 5: ATV & Purchase Frequency Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <LineChart
                  title="Average Transaction Value Performance Comparison"
                  series={data.charts.atvTrend.series}
                  categories={data.charts.atvTrend.categories.periodA}
                  currency="SGD"
                  showDataLabels={true}
                  chartIcon={getChartIcon('Average Transaction Value')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                />
                <LineChart
                  title="Purchase Frequency Performance Comparison"
                  series={data.charts.purchaseFrequencyTrend.series}
                  categories={data.charts.purchaseFrequencyTrend.categories.periodA}
                  currency="CASES"
                  showDataLabels={true}
                  chartIcon={getChartIcon('Purchase Frequency')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                />
              </div>

              {/* Row 6: Brand Comparison Table */}
              <div className="grid grid-cols-1 gap-6 mb-6">
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  padding: '16px'
                }}>
                  <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                  <table className="w-full" style={{
                    borderCollapse: 'collapse',
                    border: '1px solid #e0e0e0'
                  }}>
                    <thead className="sticky top-0" style={{ zIndex: 10 }}>
                      <tr>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          position: 'sticky',
                          left: 0,
                          zIndex: 20,
                          boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
                        }}>Brand/Line</th>
                        <th colSpan={9} style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white'
                        }}>Period A</th>
                        <th colSpan={9} style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white'
                        }}>Period B</th>
                        <th colSpan={9} style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white'
                        }}>Compare (B-A)</th>
                        <th colSpan={9} style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white'
                        }}>Compare (%)</th>
                      </tr>
                      <tr>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          position: 'sticky',
                          left: 0,
                          zIndex: 20,
                          boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
                        }}></th>
                        {/* Period A headers */}
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>Count</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>ATV</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>PF</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DC</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DA</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>GGR</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>Winrate</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>GGR User</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DA User</th>
                        {/* Period B headers */}
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>Count</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>ATV</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>PF</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DC</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DA</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>GGR</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>Winrate</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>GGR User</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DA User</th>
                        {/* Compare Diff headers */}
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>Count</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>ATV</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>PF</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DC</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DA</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>GGR</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>Winrate</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>GGR User</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DA User</th>
                        {/* Compare % headers */}
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>Count</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>ATV</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>PF</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DC</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DA</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>GGR</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>Winrate</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>GGR User</th>
                        <th style={{ 
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: '600',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          backgroundColor: '#374151',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>DA User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row: any, index: number) => (
                        <tr key={row.brand} style={{ 
                          backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white' 
                        }}>
                          <td style={{ 
                            padding: '8px 12px',
                            border: '1px solid #e0e0e0',
                            fontWeight: row.brand === 'TOTAL' ? 'bold' : 'normal',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white',
                            zIndex: 10,
                            boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
                          }}>{row.brand}</td>
                          {/* Period A data */}
                          <td 
                            style={{ 
                              padding: '8px 12px', 
                              border: '1px solid #e0e0e0', 
                              textAlign: 'right',
                              cursor: 'pointer',
                              color: '#2563eb',
                              fontWeight: '500'
                            }}
                            onClick={() => handleCountClick(row.brand, 'A')}
                            title="Click to view customer details"
                          >
                            {formatInteger(row.periodA?.activeMember || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatNumeric(row.periodA?.avgTransactionValue || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatPF(row.periodA?.purchaseFrequency || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatInteger(row.periodA?.depositCases || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatNumeric(row.periodA?.depositAmount || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatNumeric(row.periodA?.ggr || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatPF(row.periodA?.winrate || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatNumeric(row.periodA?.ggrPerUser || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatNumeric(row.periodA?.depositAmountPerUser || 0)}
                          </td>
                          {/* Period B data */}
                          <td 
                            style={{ 
                              padding: '8px 12px', 
                              border: '1px solid #e0e0e0', 
                              textAlign: 'right',
                              cursor: 'pointer',
                              color: '#2563eb',
                              fontWeight: '500'
                            }}
                            onClick={() => handleCountClick(row.brand, 'B')}
                            title="Click to view customer details"
                          >
                            {formatInteger(row.periodB?.activeMember || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatNumeric(row.periodB?.avgTransactionValue || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatPF(row.periodB?.purchaseFrequency || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatInteger(row.periodB?.depositCases || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatNumeric(row.periodB?.depositAmount || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatNumeric(row.periodB?.ggr || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatPF(row.periodB?.winrate || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatNumeric(row.periodB?.ggrPerUser || 0)}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right' }}>
                            {formatNumeric(row.periodB?.depositAmountPerUser || 0)}
                          </td>
                          {/* Compare Diff data */}
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.diff?.activeMember || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {formatIntegerDiff(row.diff?.activeMember || 0)}
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.diff?.avgTransactionValue || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {formatNumericDiff(row.diff?.avgTransactionValue || 0)}
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.diff?.purchaseFrequency || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {formatPFDiff(row.diff?.purchaseFrequency || 0)}
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.diff?.depositCases || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {formatIntegerDiff(row.diff?.depositCases || 0)}
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.diff?.depositAmount || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {formatNumericDiff(row.diff?.depositAmount || 0)}
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.diff?.ggr || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {formatNumericDiff(row.diff?.ggr || 0)}
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.diff?.winrate || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {formatPFDiff(row.diff?.winrate || 0)}
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.diff?.ggrPerUser || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {formatNumericDiff(row.diff?.ggrPerUser || 0)}
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.diff?.depositAmountPerUser || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {formatNumericDiff(row.diff?.depositAmountPerUser || 0)}
                          </td>
                          {/* Compare % data */}
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.percent?.activeMember || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {((row.percent?.activeMember || 0) >= 0 ? '+' : '') + (row.percent?.activeMember || 0).toFixed(2)}%
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.percent?.avgTransactionValue || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {((row.percent?.avgTransactionValue || 0) >= 0 ? '+' : '') + (row.percent?.avgTransactionValue || 0).toFixed(2)}%
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.percent?.purchaseFrequency || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {((row.percent?.purchaseFrequency || 0) >= 0 ? '+' : '') + (row.percent?.purchaseFrequency || 0).toFixed(2)}%
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.percent?.depositCases || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {((row.percent?.depositCases || 0) >= 0 ? '+' : '') + (row.percent?.depositCases || 0).toFixed(2)}%
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.percent?.depositAmount || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {((row.percent?.depositAmount || 0) >= 0 ? '+' : '') + (row.percent?.depositAmount || 0).toFixed(2)}%
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.percent?.ggr || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {((row.percent?.ggr || 0) >= 0 ? '+' : '') + (row.percent?.ggr || 0).toFixed(2)}%
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.percent?.winrate || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {((row.percent?.winrate || 0) >= 0 ? '+' : '') + (row.percent?.winrate || 0).toFixed(2)}%
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.percent?.ggrPerUser || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {((row.percent?.ggrPerUser || 0) >= 0 ? '+' : '') + (row.percent?.ggrPerUser || 0).toFixed(2)}%
                          </td>
                          <td style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0',
                            textAlign: 'right',
                            color: (row.percent?.depositAmountPerUser || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {((row.percent?.depositAmountPerUser || 0) >= 0 ? '+' : '') + (row.percent?.depositAmountPerUser || 0).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                      {/* TOTAL Row */}
                      <tr style={{ 
                        backgroundColor: '#f3f4f6',
                        borderTop: '2px solid #374151'
                      }}>
                        <td style={{ 
                          padding: '8px 12px',
                          border: '1px solid #e0e0e0',
                          fontWeight: 'bold',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: '#f3f4f6',
                          zIndex: 10,
                          boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
                        }}>TOTAL</td>
                        {/* Period A totals */}
                        <td 
                          style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0', 
                            textAlign: 'right', 
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            color: '#2563eb'
                          }}
                          onClick={() => handleCountClick('ALL', 'A')}
                          title="Click to view all customer details"
                        >
                          {formatInteger(totalPeriodA.activeMember)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatNumeric(totalPeriodA.avgTransactionValue)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatPF(totalPeriodA.purchaseFrequency)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatInteger(totalPeriodA.depositCases)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatNumeric(totalPeriodA.depositAmount)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatNumeric(totalPeriodA.ggr)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatPF(totalPeriodA.winrate)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatNumeric(totalPeriodA.ggrPerUser)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatNumeric(totalPeriodA.depositAmountPerUser)}
                        </td>
                        {/* Period B totals */}
                        <td 
                          style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #e0e0e0', 
                            textAlign: 'right', 
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            color: '#2563eb'
                          }}
                          onClick={() => handleCountClick('ALL', 'B')}
                          title="Click to view all customer details"
                        >
                          {formatInteger(totalPeriodB.activeMember)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatNumeric(totalPeriodB.avgTransactionValue)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatPF(totalPeriodB.purchaseFrequency)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatInteger(totalPeriodB.depositCases)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatNumeric(totalPeriodB.depositAmount)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatNumeric(totalPeriodB.ggr)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatPF(totalPeriodB.winrate)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatNumeric(totalPeriodB.ggrPerUser)}
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                          {formatNumeric(totalPeriodB.depositAmountPerUser)}
                        </td>
                        {/* Compare Diff totals */}
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalDiff.activeMember >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {formatIntegerDiff(totalDiff.activeMember)}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalDiff.avgTransactionValue >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {formatNumericDiff(totalDiff.avgTransactionValue)}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalDiff.purchaseFrequency >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {formatPFDiff(totalDiff.purchaseFrequency)}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalDiff.depositCases >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {formatIntegerDiff(totalDiff.depositCases)}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalDiff.depositAmount >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {formatNumericDiff(totalDiff.depositAmount)}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalDiff.ggr >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {formatNumericDiff(totalDiff.ggr)}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalDiff.winrate >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {formatPFDiff(totalDiff.winrate)}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalDiff.ggrPerUser >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {formatNumericDiff(totalDiff.ggrPerUser)}
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalDiff.depositAmountPerUser >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {formatNumericDiff(totalDiff.depositAmountPerUser)}
                        </td>
                        {/* Compare % totals */}
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalPercent.activeMember >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {(totalPercent.activeMember >= 0 ? '+' : '') + totalPercent.activeMember.toFixed(2)}%
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalPercent.avgTransactionValue >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {(totalPercent.avgTransactionValue >= 0 ? '+' : '') + totalPercent.avgTransactionValue.toFixed(2)}%
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalPercent.purchaseFrequency >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {(totalPercent.purchaseFrequency >= 0 ? '+' : '') + totalPercent.purchaseFrequency.toFixed(2)}%
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalPercent.depositCases >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {(totalPercent.depositCases >= 0 ? '+' : '') + totalPercent.depositCases.toFixed(2)}%
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalPercent.depositAmount >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {(totalPercent.depositAmount >= 0 ? '+' : '') + totalPercent.depositAmount.toFixed(2)}%
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalPercent.ggr >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {(totalPercent.ggr >= 0 ? '+' : '') + totalPercent.ggr.toFixed(2)}%
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalPercent.winrate >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {(totalPercent.winrate >= 0 ? '+' : '') + totalPercent.winrate.toFixed(2)}%
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalPercent.ggrPerUser >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {(totalPercent.ggrPerUser >= 0 ? '+' : '') + totalPercent.ggrPerUser.toFixed(2)}%
                        </td>
                        <td style={{ 
                          padding: '8px 12px', 
                          border: '1px solid #e0e0e0',
                          textAlign: 'right',
                          color: totalPercent.depositAmountPerUser >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {(totalPercent.depositAmountPerUser >= 0 ? '+' : '') + totalPercent.depositAmountPerUser.toFixed(2)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                  <div className="table-footer" style={{ background: '#ffffff', borderTop: '1px solid #e5e7eb', marginTop: '8px', borderRadius: '0 0 8px 8px' }}>
                    <div className="records-info">{tableData.length.toLocaleString()} brands</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <button onClick={handleExportCSV} disabled={exporting || tableData.length === 0} className={`export-button ${exporting || tableData.length === 0 ? 'disabled' : ''}`}>
                        {exporting ? 'Exporting...' : 'Export CSV'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Source Info */}
              <div className="slicer-info">
                <p>Showing data for: MYR | Period A: {periodAStart} to {periodAEnd} | Period B: {periodBStart} to {periodBEnd}</p>
              </div>
            </>
          )}
        </div>
      </Frame>

      <style jsx>{`
      `}</style>

      {/* Customer Detail Modal for Drill-Down */}
      {modalConfig && (
        <CustomerDetailModal
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          brand={modalConfig.brand}
          period={modalConfig.period}
          dateRange={modalConfig.dateRange}
          apiEndpoint="/api/sgd-brand-performance-trends/customer-details"
        />
      )}
    </Layout>
  )
}
