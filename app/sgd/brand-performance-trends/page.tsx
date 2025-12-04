"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import SubheaderNotice from '@/components/SubheaderNotice'
import ComparisonStatCard from '@/components/ComparisonStatCard'
import BarChart from '@/components/BarChart'
import LineChart from '@/components/LineChart'
import CustomerDetailModal from '@/components/CustomerDetailModal'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import { formatKPIValue } from '@/lib/brandPerformanceTrendsLogic'
import { getChartIcon } from '@/lib/CentralIcon'
import ComparisonIcon from '@/components/ComparisonIcon'


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

  // Auto-close date pickers when click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.date-picker-container')) {
        setShowPickerA(false)
        setShowPickerB(false)
      }
    }
    
    if (showPickerA || showPickerB) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPickerA, showPickerB])
  
  // ✅ MODAL STATE for Customer Details Drill-Down
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [modalConfig, setModalConfig] = useState<{
    brand: string
    period: 'A' | 'B'
    dateRange: { start: string; end: string }
  } | null>(null)

  // 🎛️ INTERACTIVE FEATURES STATE
  const [sortColumn, setSortColumn] = useState<string>('brand')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [visibleColumns, setVisibleColumns] = useState({
    count: true,
    atv: true,
    da: true,
    ggr: true,
    winrate: false,
    ggrUser: true,
    daUser: true
  })
  

  // ✅ HANDLE CLICK ON COUNT/ACTIVE MEMBER for drill-down
  const handleCountClick = (brand: string, period: 'A' | 'B') => {
    const dateRange = period === 'A' 
      ? { start: periodAStart, end: periodAEnd }
      : { start: periodBStart, end: periodBEnd }
    
    setModalConfig({ brand, period, dateRange })
    setShowCustomerModal(true)
  }

  // 📥 EXPORT HANDLER
  const handleExportCSV = async () => {
    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) return
    try {
      setExporting(true)
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const params = new URLSearchParams({ periodAStart, periodAEnd, periodBStart, periodBEnd })
      const res = await fetch(`/api/sgd-brand-performance-trends/export?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
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

  // ✅ CUSTOM TOOLTIP CALLBACK for Brand Performance Trends (Period A vs B comparison)
  const brandPerformanceTooltipCallback = (context: any): string[] => {
    // Only add comparison details if there are 2 datasets (Period A vs B)
    if (context.length === 2) {
      const periodA = context[0].parsed.y || context[0].parsed.x || 0
      const periodB = context[1].parsed.y || context[1].parsed.x || 0
      const diff = periodB - periodA
      const percentChange = periodA !== 0 ? ((diff / periodA) * 100) : 0
      
      const diffSymbol = diff > 0 ? '+' : ''
      const indicator = diff > 0 ? '🟢' : diff < 0 ? '🔴' : '⚪'
      
      const formattedDiff = Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      
      return [
        '\n─────────────────────',
        `${indicator} Compare (B-A): ${diffSymbol}${formattedDiff}`,
        `${indicator} Percentage: ${diffSymbol}${percentChange.toFixed(2)}%`
      ]
    }
    return []
  }

  // 📅 HELPER: Format date untuk display (DD MMM YYYY)
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const day = date.getDate().toString().padStart(2, '0')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

  // 🎨 HELPER: Get background color - ONLY 2 COLORS
  const getPerformanceColor = (percent: number): string => {
    if (percent >= 0) return '#d1fae5' // Green: Positive/Up
    return '#fee2e2' // Red: Negative/Down
  }

  // 📊 HELPER: Calculate summary insights from table data (MEMOIZED)
  const calculateInsights = useMemo(() => {
    if (!tableData || tableData.length === 0) return null
    
    const growingBrands = tableData.filter(row => (row.percent?.activeMember || 0) > 0).length
    const decliningBrands = tableData.filter(row => (row.percent?.activeMember || 0) < 0).length
    const avgGrowth = tableData.reduce((sum, row) => sum + (row.percent?.activeMember || 0), 0) / tableData.length
    
    const sortedByGrowth = [...tableData].sort((a, b) => (b.percent?.activeMember || 0) - (a.percent?.activeMember || 0))
    const bestPerformer = sortedByGrowth[0]
    const worstPerformer = sortedByGrowth[sortedByGrowth.length - 1]
    
    return {
      growingBrands,
      decliningBrands,
      avgGrowth,
      bestPerformer,
      worstPerformer,
      totalBrands: tableData.length
    }
  }, [tableData])

  // 🔍 HELPER: Filter and sort table data (MEMOIZED)
  const getProcessedTableData = useMemo(() => {
    let processed = [...tableData]
    
    // Apply search filter
    if (searchQuery.trim()) {
      processed = processed.filter(row => 
        row.brand.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Apply sorting
    processed.sort((a, b) => {
      let aVal, bVal
      
      switch(sortColumn) {
        case 'brand':
          aVal = a.brand
          bVal = b.brand
          break
        case 'countA':
          aVal = a.periodA?.activeMember || 0
          bVal = b.periodA?.activeMember || 0
          break
        case 'countB':
          aVal = a.periodB?.activeMember || 0
          bVal = b.periodB?.activeMember || 0
          break
        case 'countGrowth':
          aVal = a.percent?.activeMember || 0
          bVal = b.percent?.activeMember || 0
          break
        case 'ggrB':
          aVal = a.periodB?.ggr || 0
          bVal = b.periodB?.ggr || 0
          break
        case 'ggrGrowth':
          aVal = a.percent?.ggr || 0
          bVal = b.percent?.ggr || 0
          break
        default:
          aVal = a.brand
          bVal = b.brand
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })
    
    return processed
  }, [tableData, searchQuery, sortColumn, sortDirection])

  // 🔄 HANDLER: Toggle sort (MEMOIZED)
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc') // Default to descending for new column
    }
  }, [sortColumn, sortDirection])

  // 👁️ HANDLER: Toggle column visibility (MEMOIZED)
  const toggleColumn = useCallback((column: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }))
  }, [])


  // 📊 HELPER: Calculate visible columns count
  const visibleColumnsCount = useMemo(() => {
    return Object.values(visibleColumns).filter(Boolean).length
  }, [visibleColumns])

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
        const userStr = localStorage.getItem('nexmax_user')
        const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
        
        const res = await fetch('/api/sgd-brand-performance-trends/slicer-options', {
          headers: {
            'x-user-allowed-brands': JSON.stringify(allowedBrands)
          },
          cache: 'no-store' // ✅ Prevent caching
        })
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
        const dataRes = await fetch(`/api/sgd-brand-performance-trends/data?${params}`, {
          headers: {
            'x-user-allowed-brands': JSON.stringify(allowedBrands)
          }
        })
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
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const params = new URLSearchParams({ periodAStart, periodAEnd, periodBStart, periodBEnd })
      const res = await fetch(`/api/sgd-brand-performance-trends/data?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
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
      <div className="subheader-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {/* Period A */}
        <div className="slicer-group date-picker-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ 
            fontSize: '12px', 
            fontWeight: '500', 
            color: '#374151',
            whiteSpace: 'nowrap'
          }}>Period A</label>
          <div 
            onClick={() => { setTempAStart(periodAStart); setTempAEnd(periodAEnd); setShowPickerA(true) }}
            style={{ 
              minWidth: '220px', 
              cursor: 'pointer',
              padding: '6px 10px',
              border: '2px solid #3b82f6',
              borderRadius: '6px',
              backgroundColor: 'white',
              fontSize: '13px',
              color: '#1f2937',
              fontWeight: '500',
              outline: 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '32px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6'
            }}
          >
            <span>{formatDateDisplay(periodAStart)} ~ {formatDateDisplay(periodAEnd)}</span>
          </div>
          {showPickerA && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                position:'absolute', 
                top:'36px', 
                left:'0',
                zIndex:9999, 
                background:'white', 
                border:'1px solid #e5e7eb', 
                borderRadius:8, 
                padding:16, 
                boxShadow:'0 10px 25px rgba(0,0,0,0.15)',
                minWidth:'280px'
              }}>
              {/* Start Date */}
              <div style={{ marginBottom:'12px' }}>
                <label style={{
                  display:'block',
                  fontSize:'12px',
                  fontWeight:'500',
                  color:'#374151',
                  marginBottom:'6px'
                }}>
                  Start Date
                </label>
                <input 
                  type="date" 
                  value={tempAStart} 
                  min="2021-01-01" 
                  max="2025-12-31" 
                  onChange={e=>setTempAStart(e.target.value)}
                  style={{
                    width:'100%',
                    padding:'8px 12px',
                    border:'1px solid #e5e7eb',
                    borderRadius:'6px',
                    fontSize:'13px',
                    color:'#374151',
                    cursor:'pointer',
                    outline:'none',
                    transition:'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* End Date */}
              <div style={{ marginBottom:'12px' }}>
                <label style={{
                  display:'block',
                  fontSize:'12px',
                  fontWeight:'500',
                  color:'#374151',
                  marginBottom:'6px'
                }}>
                  End Date
                </label>
                <input 
                  type="date" 
                  value={tempAEnd} 
                  min={tempAStart || '2021-01-01'} 
                  max="2025-12-31" 
                  onChange={e=>setTempAEnd(e.target.value)}
                  style={{
                    width:'100%',
                    padding:'8px 12px',
                    border:'1px solid #e5e7eb',
                    borderRadius:'6px',
                    fontSize:'13px',
                    color:'#374151',
                    cursor:'pointer',
                    outline:'none',
                    transition:'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              
              {/* Buttons */}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button 
                  onClick={()=>setShowPickerA(false)} 
                  style={{ 
                    padding:'8px 16px', 
                    border:'1px solid #e5e7eb', 
                    borderRadius:6,
                    background:'white',
                    color:'#374151',
                    fontSize:'13px',
                    fontWeight:'500',
                    cursor:'pointer',
                    transition:'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  Cancel
                </button>
                <button 
                  onClick={()=>{ if (tempAStart && tempAEnd){ setPeriodAStart(tempAStart); setPeriodAEnd(tempAEnd);} setShowPickerA(false) }} 
                  style={{ 
                    padding:'8px 16px', 
                    background:'#667eea', 
                    color:'white', 
                    border:'none',
                    borderRadius:6,
                    fontSize:'13px',
                    fontWeight:'500',
                    cursor:'pointer',
                    transition:'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#5568d3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Period B */}
        <div className="slicer-group date-picker-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ 
            fontSize: '12px', 
            fontWeight: '500', 
            color: '#374151',
            whiteSpace: 'nowrap'
          }}>Period B</label>
          <div 
            onClick={() => { setTempBStart(periodBStart); setTempBEnd(periodBEnd); setShowPickerB(true) }}
            style={{ 
              minWidth: '220px', 
              cursor: 'pointer',
              padding: '6px 10px',
              border: '2px solid #3b82f6',
              borderRadius: '6px',
              backgroundColor: 'white',
              fontSize: '13px',
              color: '#1f2937',
              fontWeight: '500',
              outline: 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '32px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6'
            }}
          >
            <span>{formatDateDisplay(periodBStart)} ~ {formatDateDisplay(periodBEnd)}</span>
          </div>
          {showPickerB && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                position:'absolute', 
                top:'36px', 
                left:'0',
                zIndex:9999, 
                background:'white', 
                border:'1px solid #e5e7eb', 
                borderRadius:8, 
                padding:16, 
                boxShadow:'0 10px 25px rgba(0,0,0,0.15)',
                minWidth:'280px'
              }}>
              {/* Start Date */}
              <div style={{ marginBottom:'12px' }}>
                <label style={{
                  display:'block',
                  fontSize:'12px',
                  fontWeight:'500',
                  color:'#374151',
                  marginBottom:'6px'
                }}>
                  Start Date
                </label>
                <input 
                  type="date" 
                  value={tempBStart} 
                  min="2021-01-01" 
                  max="2025-12-31" 
                  onChange={e=>setTempBStart(e.target.value)}
                  style={{
                    width:'100%',
                    padding:'8px 12px',
                    border:'1px solid #e5e7eb',
                    borderRadius:'6px',
                    fontSize:'13px',
                    color:'#374151',
                    cursor:'pointer',
                    outline:'none',
                    transition:'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              
              {/* End Date */}
              <div style={{ marginBottom:'12px' }}>
                <label style={{
                  display:'block',
                  fontSize:'12px',
                  fontWeight:'500',
                  color:'#374151',
                  marginBottom:'6px'
                }}>
                  End Date
                </label>
                <input 
                  type="date" 
                  value={tempBEnd} 
                  min={tempBStart || '2021-01-01'} 
                  max="2025-12-31" 
                  onChange={e=>setTempBEnd(e.target.value)}
                  style={{
                    width:'100%',
                    padding:'8px 12px',
                    border:'1px solid #e5e7eb',
                    borderRadius:'6px',
                    fontSize:'13px',
                    color:'#374151',
                    cursor:'pointer',
                    outline:'none',
                    transition:'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              
              {/* Buttons */}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button 
                  onClick={()=>setShowPickerB(false)} 
                  style={{ 
                    padding:'8px 16px', 
                    border:'1px solid #e5e7eb', 
                    borderRadius:6,
                    background:'white',
                    color:'#374151',
                    fontSize:'13px',
                    fontWeight:'500',
                    cursor:'pointer',
                    transition:'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  Cancel
                </button>
                <button 
                  onClick={()=>{ if (tempBStart && tempBEnd){ setPeriodBStart(tempBStart); setPeriodBEnd(tempBEnd);} setShowPickerB(false) }} 
                  style={{ 
                    padding:'8px 16px', 
                    background:'#667eea', 
                    color:'white', 
                    border:'none',
                    borderRadius:6,
                    fontSize:'13px',
                    fontWeight:'500',
                    cursor:'pointer',
                    transition:'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#5568d3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Search Button */}
      <button 
        onClick={handleApplyFilters}
        disabled={loading}
        style={{ 
            background: loading ? '#9ca3af' : '#10b981',
            padding: '6px 20px',
          border: 'none',
            borderRadius: '6px',
          color: 'white',
            fontSize: '13px',
            fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            minWidth: '100px',
            height: '32px'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#059669'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#10b981'
            }
        }}
      >
        {loading ? 'Loading...' : 'Search'}
      </button>
      </div>
    </div>
  );

  return (
    <Layout customSubHeader={customSubHeader} pageInsights={calculateInsights}>
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
          {loading && <StandardLoadingSpinner message="Loading Brand Performance Trends SGD" />}

          {error && (
            <div className="error-container">
              <p>Error: {error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* BARIS 1: KPI CARDS (5 CARDS HORIZONTAL ROW) */}
              <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '18px', marginBottom: '24px' }}>
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
                  showDataLabels={false}
                  chartIcon={getChartIcon('Active Member')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                  customTooltipCallback={brandPerformanceTooltipCallback}
                />
                <BarChart
                  title="Deposit Cases Performance Comparison"
                  series={data.charts.depositCasesComparison.series}
                  categories={data.charts.depositCasesComparison.categories.periodA}
                  currency="CASES"
                  showDataLabels={false}
                  chartIcon={getChartIcon('Deposit Amount')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                  customTooltipCallback={brandPerformanceTooltipCallback}
                />
              </div>

              {/* Row 3: Deposit Amount & Net Profit Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <LineChart
                  title="Deposit Amount Performance Comparison"
                  series={data.charts.depositAmountTrend.series}
                  categories={data.charts.depositAmountTrend.categories.periodA}
                  currency="SGD"
                  showDataLabels={false}
                  useDenominationLabels={true}
                  chartIcon={getChartIcon('Deposit Amount')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                  customTooltipCallback={brandPerformanceTooltipCallback}
                />
                <LineChart
                  title="Net Profit Performance Comparison"
                  series={data.charts.netProfitTrend.series}
                  categories={data.charts.netProfitTrend.categories.periodA}
                  currency="SGD"
                  showDataLabels={false}
                  useDenominationLabels={true}
                  chartIcon={getChartIcon('Net Profit')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                  customTooltipCallback={brandPerformanceTooltipCallback}
                />
              </div>

              {/* Row 4: GGR User & DA User Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <BarChart
                  title="GGR User Performance Comparison"
                  series={data.charts.ggrUserComparison.series}
                  categories={data.charts.ggrUserComparison.categories.periodA}
                  currency="SGD"
                  showDataLabels={false}
                  chartIcon={getChartIcon('GGR User')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                  customTooltipCallback={brandPerformanceTooltipCallback}
                />
                <BarChart
                  title="DA User Performance Comparison"
                  series={data.charts.daUserComparison.series}
                  categories={data.charts.daUserComparison.categories.periodA}
                  currency="SGD"
                  showDataLabels={false}
                  chartIcon={getChartIcon('DA User Trend')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                  customTooltipCallback={brandPerformanceTooltipCallback}
                />
              </div>

              {/* Row 5: ATV & Purchase Frequency Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <LineChart
                  title="Average Transaction Value Performance Comparison"
                  series={data.charts.atvTrend.series}
                  categories={data.charts.atvTrend.categories.periodA}
                  currency="SGD"
                  showDataLabels={false}
                  chartIcon={getChartIcon('Average Transaction Value')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                  customTooltipCallback={brandPerformanceTooltipCallback}
                />
                <LineChart
                  title="Purchase Frequency Performance Comparison"
                  series={data.charts.purchaseFrequencyTrend.series}
                  categories={data.charts.purchaseFrequencyTrend.categories.periodA}
                  currency="CASES"
                  showDataLabels={false}
                  chartIcon={getChartIcon('Purchase Frequency')}
                  customLegend={[
                    { label: 'PERIOD A', color: '#3B82F6' },
                    { label: 'PERIOD B', color: '#FF8C00' }
                  ]}
                  customTooltipCallback={brandPerformanceTooltipCallback}
                />
              </div>

              {/* Row 6: Brand Comparison Table */}
              <div className="grid grid-cols-1 gap-6 mb-6">
                <div 
                  style={{
                  background: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
                    e.currentTarget.style.transform = 'translateY(-4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {/* Table Header */}
                  <div style={{
                    backgroundColor: '#F9FAFB',
                    padding: '16px 20px',
                    borderBottom: '2px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#111827', letterSpacing: '-0.01em' }}>
                        <span 
                          style={{
                            width: '20px',
                            height: '20px',
                            display: 'inline-block',
                            flexShrink: 0
                          }}
                          dangerouslySetInnerHTML={{ __html: getChartIcon('Brand Performance') }}
                        />
                        Brand Performance Comparison
                      </h3>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>
                        Period A: {periodAStart} to {periodAEnd} | Period B: {periodBStart} to {periodBEnd}
                      </span>
                    </div>
                    
                  </div>

                  {/* Table Container */}
                  <div className="overflow-x-auto" style={{ padding: '0' }}>
                  <table className="w-full" style={{
                    borderCollapse: 'separate',
                    borderSpacing: 0
                  }}>
                    <thead className="sticky top-0" style={{ zIndex: 10 }}>
                      {/* Row 1: Period Headers */}
                      <tr style={{
                        backgroundColor: '#E5E7EB',
                        borderBottom: '2px solid #D1D5DB'
                      }}>
                        <th rowSpan={2} style={{ 
                          padding: '8px 12px',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#111827',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: '#E5E7EB',
                          zIndex: 20,
                          boxShadow: '2px 0 4px rgba(0, 0, 0, 0.02)',
                          verticalAlign: 'bottom',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em',
                          width: '110px',
                          minWidth: '110px',
                          maxWidth: '110px'
                        }}>Brand</th>
                        <th colSpan={visibleColumnsCount} style={{ 
                          padding: '10px 14px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#111827',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em'
                        }}>Period A</th>
                        <th colSpan={visibleColumnsCount} style={{ 
                          padding: '10px 14px',
                          textAlign: 'left',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#111827',
                          letterSpacing: '-0.01em'
                        }}>Period B (% Change)</th>
                      </tr>
                      
                      {/* Row 2: Column Headers */}
                      <tr style={{
                        backgroundColor: '#E5E7EB',
                        borderBottom: '2px solid #D1D5DB'
                      }}>
                        {/* Period A headers */}
                        {visibleColumns.count && <th style={{ 
                            padding: '8px',
                            textAlign: 'center',
                            fontSize: '12px',
                          fontWeight: 700,
                            color: '#111827',
                            whiteSpace: 'nowrap',
                            borderRight: '1px solid #D1D5DB',
                            letterSpacing: '-0.01em',
                            width: '85px',
                            minWidth: '85px'
                          }}>Count</th>}
                        {visibleColumns.atv && <th style={{ 
                          padding: '8px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em',
                          width: '95px',
                          minWidth: '95px'
                        }}>ATV</th>}
                        {visibleColumns.da && <th style={{ 
                          padding: '8px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em',
                          width: '100px',
                          minWidth: '100px'
                        }}>DA</th>}
                        {visibleColumns.ggr && <th style={{ 
                          padding: '8px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                            color: '#111827',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em',
                          width: '100px',
                          minWidth: '100px'
                        }}>GGR</th>}
                        {visibleColumns.winrate && <th style={{ 
                          padding: '10px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em',
                          width: '100px',
                          minWidth: '100px'
                        }}>Winrate</th>}
                        {visibleColumns.ggrUser && <th style={{ 
                          padding: '8px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em',
                          width: '95px',
                          minWidth: '95px'
                        }}>GGR User</th>}
                        {visibleColumns.daUser && <th style={{ 
                          padding: '8px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em',
                          width: '100px',
                          minWidth: '100px'
                        }}>DA User</th>}
                        {/* Period B headers */}
                        {visibleColumns.count && <th style={{ 
                            padding: '8px',
                            textAlign: 'center',
                            fontSize: '12px',
                          fontWeight: 700,
                            color: '#111827',
                            whiteSpace: 'nowrap',
                            borderRight: '1px solid #D1D5DB',
                            letterSpacing: '-0.01em',
                            width: '85px',
                            minWidth: '85px'
                          }}>Count</th>}
                        {visibleColumns.atv && <th style={{ 
                          padding: '8px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em',
                          width: '95px',
                          minWidth: '95px'
                        }}>ATV</th>}
                        {visibleColumns.da && <th style={{ 
                          padding: '8px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em',
                          width: '100px',
                          minWidth: '100px'
                        }}>DA</th>}
                        {visibleColumns.ggr && <th 
                          onClick={() => handleSort('ggrB')}
                          style={{ 
                            padding: '8px',
                            textAlign: 'center',
                            fontSize: '12px',
                          fontWeight: 700,
                            color: '#111827',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            userSelect: 'none',
                            borderRight: '1px solid #D1D5DB',
                            letterSpacing: '-0.01em',
                            width: '100px',
                            minWidth: '100px',
                            transition: 'background 0.2s ease'
                          }}
                          title="Click to sort by GGR"
                          onMouseEnter={(e) => e.currentTarget.style.background = '#D1D5DB'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          GGR {sortColumn === 'ggrB' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>}
                        {visibleColumns.winrate && <th style={{ 
                          padding: '10px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em',
                          width: '100px',
                          minWidth: '100px'
                        }}>Winrate</th>}
                        {visibleColumns.ggrUser && <th style={{ 
                          padding: '8px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid #D1D5DB',
                          letterSpacing: '-0.01em',
                          width: '95px',
                          minWidth: '95px'
                        }}>GGR User</th>}
                        {visibleColumns.daUser && <th style={{ 
                          padding: '8px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#111827',
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.01em',
                          width: '100px',
                          minWidth: '100px'
                        }}>DA User</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {getProcessedTableData.map((row: any, index: number) => (
                        <tr key={row.brand} style={{ 
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                          borderBottom: '1px solid #f3f4f6',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#eff6ff'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.15)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}>
                          <td 
                            style={{ 
                              padding: '8px 12px',
                              fontSize: '13px',
                              fontWeight: row.brand === 'TOTAL' ? '700' : '500',
                              color: '#1f2937',
                            position: 'sticky',
                            left: 0,
                              background: 'inherit',
                            zIndex: 10,
                              boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
                              borderRight: '1px solid #E5E7EB',
                              borderBottom: '1px solid #E5E7EB',
                              width: '110px',
                              minWidth: '110px',
                              maxWidth: '110px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={row.brand}
                          >{row.brand}</td>
                          {/* Period A data */}
                          {visibleColumns.count && <td 
                            style={{ 
                              padding: '8px 10px', 
                              textAlign: 'right',
                              fontSize: '13px',
                              color: '#2563eb',
                              fontWeight: '500',
                              cursor: 'pointer',
                              borderLeft: '1px solid #E5E7EB',
                              borderRight: '1px solid #E5E7EB',
                              borderBottom: '1px solid #E5E7EB',
                              transition: 'color 0.2s ease'
                            }}
                            onClick={() => handleCountClick(row.brand, 'A')}
                            title="Click to view customer details"
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            {formatInteger(row.periodA?.activeMember || 0)}
                          </td>}
                          {visibleColumns.atv && <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13px', color: '#374151', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                            {formatNumeric(row.periodA?.avgTransactionValue || 0)}
                          </td>}
                          {visibleColumns.da && <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13px', color: '#374151', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                            {formatNumeric(row.periodA?.depositAmount || 0)}
                          </td>}
                          {visibleColumns.ggr && <td style={{ 
                            padding: '8px 10px', 
                            textAlign: 'right', 
                            fontSize: '13px', 
                            color: (row.periodA?.ggr || 0) >= 0 ? '#059669' : '#dc2626',
                            fontWeight: '600',
                            borderRight: '1px solid #E5E7EB', 
                            borderBottom: '1px solid #E5E7EB' 
                          }}>
                            {formatNumeric(row.periodA?.ggr || 0)}
                          </td>}
                          {visibleColumns.winrate && <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13px', color: '#374151', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                            {formatPF(row.periodA?.winrate || 0)}
                          </td>}
                          {visibleColumns.ggrUser && <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13px', color: '#374151', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                            {formatNumeric(row.periodA?.ggrPerUser || 0)}
                          </td>}
                          {visibleColumns.daUser && <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13px', color: '#374151', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                            {formatNumeric(row.periodA?.depositAmountPerUser || 0)}
                          </td>}
                          {/* Period B data with % comparison */}
                          {visibleColumns.count && <td 
                            style={{ 
                              padding: '10px 12px',
                              borderLeft: '2px solid #94a3b8',
                              borderRight: '1px solid #E5E7EB',
                              borderBottom: '1px solid #E5E7EB',
                              backgroundColor: getPerformanceColor(row.percent?.activeMember || 0),
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => handleCountClick(row.brand, 'B')}
                            title="Click to view customer details"
                          >
                            <div style={{ textAlign: 'right', fontSize: '13px', color: '#2563eb', fontWeight: '500', marginBottom: '4px' }}>
                            {formatInteger(row.periodB?.activeMember || 0)}
                            </div>
                            <div style={{ fontSize: '11px', color: (row.percent?.activeMember || 0) >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                              <ComparisonIcon isPositive={(row.percent?.activeMember || 0) >= 0} size="11px" />
                              <span>{((row.percent?.activeMember || 0) >= 0 ? '+' : '') + (row.percent?.activeMember || 0).toFixed(2)}%</span>
                            </div>
                          </td>}
                          {visibleColumns.atv && <td style={{ padding: '10px 12px', backgroundColor: getPerformanceColor(row.percent?.avgTransactionValue || 0), borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                            <div style={{ textAlign: 'right', fontSize: '13px', color: '#374151', fontWeight: '500', marginBottom: '4px' }}>
                            {formatNumeric(row.periodB?.avgTransactionValue || 0)}
                            </div>
                            <div style={{ fontSize: '11px', color: (row.percent?.avgTransactionValue || 0) >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                              <ComparisonIcon isPositive={(row.percent?.avgTransactionValue || 0) >= 0} size="11px" />
                              <span>{((row.percent?.avgTransactionValue || 0) >= 0 ? '+' : '') + (row.percent?.avgTransactionValue || 0).toFixed(2)}%</span>
                            </div>
                          </td>}
                          {visibleColumns.da && <td style={{ padding: '10px 12px', backgroundColor: getPerformanceColor(row.percent?.depositAmount || 0), borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                            <div style={{ textAlign: 'right', fontSize: '13px', color: '#374151', fontWeight: '500', marginBottom: '4px' }}>
                            {formatNumeric(row.periodB?.depositAmount || 0)}
                            </div>
                            <div style={{ fontSize: '11px', color: (row.percent?.depositAmount || 0) >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                              <ComparisonIcon isPositive={(row.percent?.depositAmount || 0) >= 0} size="11px" />
                              <span>{((row.percent?.depositAmount || 0) >= 0 ? '+' : '') + (row.percent?.depositAmount || 0).toFixed(2)}%</span>
                            </div>
                          </td>}
                          {visibleColumns.ggr && <td style={{ padding: '10px 12px', backgroundColor: getPerformanceColor(row.percent?.ggr || 0), borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                            <div style={{ textAlign: 'right', fontSize: '13px', color: (row.periodB?.ggr || 0) >= 0 ? '#059669' : '#dc2626', fontWeight: '600', marginBottom: '4px' }}>
                            {formatNumeric(row.periodB?.ggr || 0)}
                            </div>
                            <div style={{ fontSize: '11px', color: (row.percent?.ggr || 0) >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                              <ComparisonIcon isPositive={(row.percent?.ggr || 0) >= 0} size="11px" />
                              <span>{((row.percent?.ggr || 0) >= 0 ? '+' : '') + (row.percent?.ggr || 0).toFixed(2)}%</span>
                            </div>
                          </td>}
                          {visibleColumns.winrate && <td style={{ padding: '10px 12px', backgroundColor: getPerformanceColor(row.percent?.winrate || 0), borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                            <div style={{ textAlign: 'right', fontSize: '13px', color: '#374151', fontWeight: '500', marginBottom: '4px' }}>
                            {formatPF(row.periodB?.winrate || 0)}
                            </div>
                            <div style={{ fontSize: '11px', color: (row.percent?.winrate || 0) >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                              <ComparisonIcon isPositive={(row.percent?.winrate || 0) >= 0} size="11px" />
                              <span>{((row.percent?.winrate || 0) >= 0 ? '+' : '') + (row.percent?.winrate || 0).toFixed(2)}%</span>
                            </div>
                          </td>}
                          {visibleColumns.ggrUser && <td style={{ padding: '10px 12px', backgroundColor: getPerformanceColor(row.percent?.ggrPerUser || 0), borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                            <div style={{ textAlign: 'right', fontSize: '13px', color: '#374151', fontWeight: '500', marginBottom: '4px' }}>
                            {formatNumeric(row.periodB?.ggrPerUser || 0)}
                            </div>
                            <div style={{ fontSize: '11px', color: (row.percent?.ggrPerUser || 0) >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                              <ComparisonIcon isPositive={(row.percent?.ggrPerUser || 0) >= 0} size="11px" />
                              <span>{((row.percent?.ggrPerUser || 0) >= 0 ? '+' : '') + (row.percent?.ggrPerUser || 0).toFixed(2)}%</span>
                            </div>
                          </td>}
                          {visibleColumns.daUser && <td style={{ padding: '10px 12px', backgroundColor: getPerformanceColor(row.percent?.depositAmountPerUser || 0), borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                            <div style={{ textAlign: 'right', fontSize: '13px', color: '#374151', fontWeight: '500', marginBottom: '4px' }}>
                            {formatNumeric(row.periodB?.depositAmountPerUser || 0)}
                            </div>
                            <div style={{ fontSize: '11px', color: (row.percent?.depositAmountPerUser || 0) >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                              <ComparisonIcon isPositive={(row.percent?.depositAmountPerUser || 0) >= 0} size="11px" />
                              <span>{((row.percent?.depositAmountPerUser || 0) >= 0 ? '+' : '') + (row.percent?.depositAmountPerUser || 0).toFixed(2)}%</span>
                            </div>
                          </td>}
                        </tr>
                      ))}
                      {/* TOTAL Row */}
                      <tr style={{ 
                        backgroundColor: '#F9FAFB',
                        borderTop: '2px solid #94a3b8'
                      }}>
                        <td style={{ 
                          padding: '10px 12px',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#111827',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: '#F9FAFB',
                          zIndex: 10,
                          boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB'
                        }}>TOTAL</td>
                        {/* Period A totals */}
                        {visibleColumns.count && <td 
                          style={{ 
                            padding: '12px', 
                            textAlign: 'right', 
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#2563eb',
                            borderLeft: '1px solid #E5E7EB',
                            borderRight: '1px solid #E5E7EB',
                            borderBottom: '1px solid #E5E7EB'
                          }}
                          onClick={() => handleCountClick('ALL', 'A')}
                          title="Click to view all customer details"
                        >
                          {formatInteger(totalPeriodA.activeMember)}
                        </td>}
                        {visibleColumns.atv && <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#374151', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                          {formatNumeric(totalPeriodA.avgTransactionValue)}
                        </td>}
                        {visibleColumns.da && <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#374151', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                          {formatNumeric(totalPeriodA.depositAmount)}
                        </td>}
                        {visibleColumns.ggr && <td style={{ 
                          padding: '12px', 
                          textAlign: 'right', 
                          fontSize: '13px', 
                          fontWeight: 700, 
                          color: totalPeriodA.ggr >= 0 ? '#059669' : '#dc2626', 
                          borderRight: '1px solid #E5E7EB', 
                          borderBottom: '1px solid #E5E7EB' 
                        }}>
                          {formatNumeric(totalPeriodA.ggr)}
                        </td>}
                        {visibleColumns.winrate && <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#374151', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                          {formatPF(totalPeriodA.winrate)}
                        </td>}
                        {visibleColumns.ggrUser && <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#374151', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                          {formatNumeric(totalPeriodA.ggrPerUser)}
                        </td>}
                        {visibleColumns.daUser && <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#374151', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                          {formatNumeric(totalPeriodA.depositAmountPerUser)}
                        </td>}
                        {/* Period B totals with % comparison */}
                        {visibleColumns.count && <td 
                          style={{ 
                            padding: '12px',
                            borderLeft: '2px solid #94a3b8',
                            borderRight: '1px solid #E5E7EB',
                            borderBottom: '1px solid #E5E7EB',
                            backgroundColor: getPerformanceColor(totalPercent.activeMember),
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => handleCountClick('ALL', 'B')}
                          title="Click to view all customer details"
                        >
                          <div style={{ textAlign: 'right', fontSize: '13px', color: '#2563eb', fontWeight: '600', marginBottom: '4px' }}>
                          {formatInteger(totalPeriodB.activeMember)}
                          </div>
                          <div style={{ fontSize: '11px', color: totalPercent.activeMember >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                            <ComparisonIcon isPositive={totalPercent.activeMember >= 0} size="11px" />
                            <span>{(totalPercent.activeMember >= 0 ? '+' : '') + totalPercent.activeMember.toFixed(2)}%</span>
                          </div>
                        </td>}
                        {visibleColumns.atv && <td style={{ padding: '12px', backgroundColor: getPerformanceColor(totalPercent.avgTransactionValue), borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                          <div style={{ textAlign: 'right', fontSize: '13px', color: '#374151', fontWeight: '600', marginBottom: '4px' }}>
                          {formatNumeric(totalPeriodB.avgTransactionValue)}
                          </div>
                          <div style={{ fontSize: '11px', color: totalPercent.avgTransactionValue >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                            <ComparisonIcon isPositive={totalPercent.avgTransactionValue >= 0} size="11px" />
                            <span>{(totalPercent.avgTransactionValue >= 0 ? '+' : '') + totalPercent.avgTransactionValue.toFixed(2)}%</span>
                          </div>
                        </td>}
                        {visibleColumns.da && <td style={{ padding: '12px', backgroundColor: getPerformanceColor(totalPercent.depositAmount), borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                          <div style={{ textAlign: 'right', fontSize: '13px', color: '#374151', fontWeight: '600', marginBottom: '4px' }}>
                          {formatNumeric(totalPeriodB.depositAmount)}
                          </div>
                          <div style={{ fontSize: '11px', color: totalPercent.depositAmount >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                            <ComparisonIcon isPositive={totalPercent.depositAmount >= 0} size="11px" />
                            <span>{(totalPercent.depositAmount >= 0 ? '+' : '') + totalPercent.depositAmount.toFixed(2)}%</span>
                          </div>
                        </td>}
                        {visibleColumns.ggr && <td style={{ padding: '12px', backgroundColor: getPerformanceColor(totalPercent.ggr), borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                          <div style={{ textAlign: 'right', fontSize: '13px', color: totalPeriodB.ggr >= 0 ? '#059669' : '#dc2626', fontWeight: '700', marginBottom: '4px' }}>
                          {formatNumeric(totalPeriodB.ggr)}
                          </div>
                          <div style={{ fontSize: '11px', color: totalPercent.ggr >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                            <ComparisonIcon isPositive={totalPercent.ggr >= 0} size="11px" />
                            <span>{(totalPercent.ggr >= 0 ? '+' : '') + totalPercent.ggr.toFixed(2)}%</span>
                          </div>
                        </td>}
                        {visibleColumns.winrate && <td style={{ padding: '12px', backgroundColor: getPerformanceColor(totalPercent.winrate), borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                          <div style={{ textAlign: 'right', fontSize: '13px', color: '#374151', fontWeight: '600', marginBottom: '4px' }}>
                          {formatPF(totalPeriodB.winrate)}
                          </div>
                          <div style={{ fontSize: '11px', color: totalPercent.winrate >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                            <ComparisonIcon isPositive={totalPercent.winrate >= 0} size="11px" />
                            <span>{(totalPercent.winrate >= 0 ? '+' : '') + totalPercent.winrate.toFixed(2)}%</span>
                          </div>
                        </td>}
                        {visibleColumns.ggrUser && <td style={{ padding: '12px', backgroundColor: getPerformanceColor(totalPercent.ggrPerUser), borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                          <div style={{ textAlign: 'right', fontSize: '13px', color: '#374151', fontWeight: '600', marginBottom: '4px' }}>
                          {formatNumeric(totalPeriodB.ggrPerUser)}
                          </div>
                          <div style={{ fontSize: '11px', color: totalPercent.ggrPerUser >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                            <ComparisonIcon isPositive={totalPercent.ggrPerUser >= 0} size="11px" />
                            <span>{(totalPercent.ggrPerUser >= 0 ? '+' : '') + totalPercent.ggrPerUser.toFixed(2)}%</span>
                          </div>
                        </td>}
                        {visibleColumns.daUser && <td style={{ padding: '12px', backgroundColor: getPerformanceColor(totalPercent.depositAmountPerUser), borderBottom: '1px solid #E5E7EB', transition: 'all 0.2s ease' }}>
                          <div style={{ textAlign: 'right', fontSize: '13px', color: '#374151', fontWeight: '600', marginBottom: '4px' }}>
                          {formatNumeric(totalPeriodB.depositAmountPerUser)}
                          </div>
                          <div style={{ fontSize: '11px', color: totalPercent.depositAmountPerUser >= 0 ? '#059669' : '#dc2626', fontWeight: '600', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                            <ComparisonIcon isPositive={totalPercent.depositAmountPerUser >= 0} size="11px" />
                            <span>{(totalPercent.depositAmountPerUser >= 0 ? '+' : '') + totalPercent.depositAmountPerUser.toFixed(2)}%</span>
                          </div>
                        </td>}
                      </tr>
                    </tbody>
                  </table>
                  </div>
                  
                  {/* Modern Table Footer */}
                  <div style={{
                    padding: '14px 20px',
                    background: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
                      {getProcessedTableData.length === tableData.length 
                        ? `${tableData.length.toLocaleString()} brands` 
                        : `${getProcessedTableData.length.toLocaleString()} of ${tableData.length.toLocaleString()} brands`}
                    </span>
                    <button 
                      onClick={handleExportCSV} 
                      disabled={exporting || tableData.length === 0}
                      style={{
                        padding: '8px 16px',
                        background: exporting || tableData.length === 0 ? '#9ca3af' : '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: exporting || tableData.length === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        if (!exporting && tableData.length > 0) {
                          e.currentTarget.style.backgroundColor = '#059669'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!exporting && tableData.length > 0) {
                          e.currentTarget.style.backgroundColor = '#10B981'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 12V4M4 8l4-4 4 4" />
                      </svg>
                      <span>{exporting ? 'Exporting...' : 'Export'}</span>
                      </button>
                  </div>
                </div>
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
