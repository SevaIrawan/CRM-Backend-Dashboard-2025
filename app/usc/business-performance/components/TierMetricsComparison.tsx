'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import { TIER_NAME_COLORS } from '../constants'
import { formatCurrencyKPI, formatIntegerKPI, formatPercentageKPI } from '@/lib/formatHelpers'

// CSS override khusus untuk Business Performance USC page - background grey full canvas
// IMPORTANT: Hanya berlaku untuk Business Performance page dengan parent selector bp-subheader-wrapper
// Tidak akan mempengaruhi page lain karena selector sangat spesifik
const businessPerformanceChartStyle = `
  /* Override chart outer container menjadi transparan - HANYA untuk Business Performance */
  .bp-subheader-wrapper .usc-business-performance-chart-wrapper > div[role="img"] {
    background-color: transparent !important;
  }
  .bp-subheader-wrapper .usc-business-performance-chart-wrapper > div:not([class]) {
    background-color: transparent !important;
  }
  /* Override semua background putih dalam chart wrapper menjadi transparan - HANYA untuk Business Performance */
  .bp-subheader-wrapper .usc-business-performance-chart-wrapper div[style*="background-color: rgb(255, 255, 255)"],
  .bp-subheader-wrapper .usc-business-performance-chart-wrapper div[style*="background-color: #ffffff"],
  .bp-subheader-wrapper .usc-business-performance-chart-wrapper div[style*="background-color: #FFFFFF"],
  .bp-subheader-wrapper .usc-business-performance-chart-wrapper > div[role="img"][style*="background-color"] {
    background-color: transparent !important;
  }
  /* Override chart container background - HANYA untuk Business Performance */
  .bp-subheader-wrapper .usc-business-performance-chart-wrapper > div > div[style*="padding: '16px'"] {
    background-color: transparent !important;
  }
  /* Professional Tooltip Styling - HANYA untuk Business Performance */
  .bp-subheader-wrapper canvas ~ div[style*="position: absolute"][style*="background-color"] {
    padding: 14px 16px !important;
  }
  .bp-subheader-wrapper canvas ~ div[style*="position: absolute"] ul {
    margin-top: 8px !important;
    margin-bottom: 0 !important;
  }
  .bp-subheader-wrapper canvas ~ div[style*="position: absolute"] li {
    margin-bottom: 6px !important;
  }
  .bp-subheader-wrapper canvas ~ div[style*="position: absolute"] li:last-child {
    margin-bottom: 0 !important;
  }
`

// Dynamic import Chart.js components (SSR fix)
// ✅ BP STANDARD: Gunakan custom PieChart dengan optimasi khusus untuk BP page
const BusinessPerformancePieChart = dynamic(() => import('./BusinessPerformancePieChart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg animate-pulse">
      <div className="text-sm text-gray-500">Loading Chart...</div>
    </div>
  )
})

const BarChart = dynamic(() => import('@/components/BarChart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg animate-pulse">
      <div className="text-sm text-gray-500">Loading Chart...</div>
    </div>
  )
})

interface TierMetricsComparisonProps {
  periodAStart?: string
  periodAEnd?: string
  periodBStart?: string
  periodBEnd?: string
  brand: string
  squadLead: string
  channel: string
  searchTrigger?: number
}

interface TierMetricsData {
  tierName: string
  customerCount: number
  depositAmount: number
  ggr: number
}

interface PeriodMetrics {
  period: 'A' | 'B'
  startDate: string
  endDate: string
  totalCustomers: number
  totalDepositAmount: number
  totalGGR: number
  winRate: number
  tierMetrics: TierMetricsData[]
}

interface TierMetricsResponse {
  success: boolean
  data?: {
    periodA: PeriodMetrics
    periodB: PeriodMetrics
  }
  error?: string
}

// Tier name to number mapping (untuk sorting) - Lower tier_number = Higher tier
const TIER_NAME_TO_NUMBER: Record<string, number> = {
  'Super VIP': 1,
  'Tier 5': 2,
  'Tier 4': 3,
  'Tier 3': 4,
  'Tier 2': 5,
  'Tier 1': 6,
  'Regular': 7,
  'ND_P': 8,
  'P1': 9,
  'P2': 10
}

function getTierNumber(tierName: string): number {
  return TIER_NAME_TO_NUMBER[tierName] || 99
}

// Warna tier sesuai HTML wireframe
const TIER_COLORS_WIREFRAME: Record<string, string> = {
  'Regular': '#3b82f6',
  'Tier 1': '#8b5cf6',
  'Tier 2': '#ec4899',
  'Tier 3': '#f59e0b',
  'Tier 4': '#10b981',
  'Tier 5': '#06b6d4',
  'Super VIP': '#f97316',
  'ND_P': '#6366f1',
  'P1': '#14b8a6',
  'P2': '#a855f7'
}

export default function TierMetricsComparison({
  periodAStart,
  periodAEnd,
  periodBStart,
  periodBEnd,
  brand,
  squadLead,
  channel,
  searchTrigger = 0
}: TierMetricsComparisonProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TierMetricsResponse['data'] | null>(null)
  
  // State untuk expand/collapse dropdown sections
  const [isComparisonExpanded, setIsComparisonExpanded] = useState(false)
  const [isMovementExpanded, setIsMovementExpanded] = useState(false)
  
  // State untuk track expanded row di Tier Movement & Match Analysis (hanya 1 row boleh expanded)
  const [expandedMovementRow, setExpandedMovementRow] = useState<string | null>(null)
  
  // Function to toggle row expansion (hanya 1 row boleh expanded pada satu waktu)
  const toggleMovementRow = (tierName: string) => {
    setExpandedMovementRow(prev => {
      // Jika row yang sama di-click, close (toggle)
      if (prev === tierName) {
        return null
      }
      // Jika row lain di-click, expand row baru dan close row sebelumnya
      return tierName
    })
  }
  
  // Auto-close semua expanded rows ketika section di-collapse
  useEffect(() => {
    if (!isMovementExpanded) {
      setExpandedMovementRow(null)
    }
  }, [isMovementExpanded])
  
  // Function to generate insight text based on customer change and DA change
  const generateMovementInsight = (
    tierName: string,
    customerChange: number,
    daChange: number,
    matchDelta: number
  ): string => {
    if (matchDelta <= 5) {
      return `Customer growth and DA growth are aligned (within 5% difference). Tier ${tierName} shows balanced movement.`
    }
    
    // Format percentages for display
    const customerChangeFormatted = customerChange >= 0 
      ? `+${customerChange.toFixed(1)}%` 
      : `${customerChange.toFixed(1)}%`
    const daChangeFormatted = daChange >= 0 
      ? `+${daChange.toFixed(1)}%` 
      : `${daChange.toFixed(1)}%`
    
    if (daChange > customerChange) {
      return `DA growth (${daChangeFormatted}) exceeds customer growth (${customerChangeFormatted}). Possible high-value customer acquisition or increased spending.`
    } else {
      return `Customer growth (${customerChangeFormatted}) exceeds DA growth (${daChangeFormatted}). Possible acquisition of lower-value customers or churn risk.`
    }
  }
  
  const lastParamsRef = useRef<string>('')
  const isFetchingRef = useRef(false)
  
  // ✅ Store slicer values in ref to always use latest values in fetchData without triggering auto reload
  const brandRef = useRef(brand)
  const squadLeadRef = useRef(squadLead)
  const channelRef = useRef(channel)
  const periodAStartRef = useRef(periodAStart)
  const periodAEndRef = useRef(periodAEnd)
  const periodBStartRef = useRef(periodBStart)
  const periodBEndRef = useRef(periodBEnd)
  
  // Update refs when props change
  useEffect(() => {
    brandRef.current = brand
    squadLeadRef.current = squadLead
    channelRef.current = channel
    periodAStartRef.current = periodAStart
    periodAEndRef.current = periodAEnd
    periodBStartRef.current = periodBStart
    periodBEndRef.current = periodBEnd
  }, [brand, squadLead, channel, periodAStart, periodAEnd, periodBStart, periodBEnd])

  // Fetch data
  const fetchData = React.useCallback(async () => {
    // ✅ Use ref to get latest periods value without triggering auto reload
    const currentPeriodAStart = periodAStartRef.current
    const currentPeriodAEnd = periodAEndRef.current
    const currentPeriodBStart = periodBStartRef.current
    const currentPeriodBEnd = periodBEndRef.current
    
    if (!currentPeriodAStart || !currentPeriodAEnd || !currentPeriodBStart || !currentPeriodBEnd) {
      return
    }

    const paramsSignature = JSON.stringify({
      periodAStart: currentPeriodAStart,
      periodAEnd: currentPeriodAEnd,
      periodBStart: currentPeriodBStart,
      periodBEnd: currentPeriodBEnd,
      brand: brandRef.current, // ✅ Use ref to always get latest value
      squadLead: squadLeadRef.current, // ✅ Use ref to always get latest value
      channel: channelRef.current, // ✅ Use ref to always get latest value
      searchTrigger
    })

    if (lastParamsRef.current === paramsSignature) {
      return
    }

    if (isFetchingRef.current) {
      return
    }

    isFetchingRef.current = true
    setLoading(true)
    setError(null)
    lastParamsRef.current = paramsSignature

    try {
      const userAllowedBrands = localStorage.getItem('user_allowed_brands')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }

      if (userAllowedBrands) {
        headers['x-user-allowed-brands'] = userAllowedBrands
      }

      const params = new URLSearchParams({
        periodAStart: currentPeriodAStart!,
        periodAEnd: currentPeriodAEnd!,
        periodBStart: currentPeriodBStart!,
        periodBEnd: currentPeriodBEnd!,
        brand: brandRef.current || 'All', // ✅ Use ref to always get latest value
        squadLead: squadLeadRef.current || 'All', // ✅ Use ref to always get latest value
        channel: channelRef.current || 'All' // ✅ Use ref to always get latest value
      })

      const response = await fetch(`/api/usc-business-performance/tier-metrics?${params}`, {
        headers
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result: TierMetricsResponse = await response.json()

      if (result.success && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      console.error('❌ [Tier Metrics] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [searchTrigger]) // ✅ Hanya searchTrigger yang trigger fetchData callback recreation. periods, brand, squadLead, channel tetap digunakan dalam fetchData tapi tidak trigger auto reload

  const lastSearchTriggerRef = useRef(0)
  const isInitialMountRef = useRef(true)
  const fetchDataRef = useRef(fetchData)
  const prevPeriodsRef = useRef<{ aStart: string; aEnd: string; bStart: string; bEnd: string }>({
    aStart: '',
    aEnd: '',
    bStart: '',
    bEnd: ''
  })
  
  // Always keep fetchDataRef updated with latest fetchData function
  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])
  
  // ✅ Initial load
  useEffect(() => {
    if (isInitialMountRef.current && periodAStartRef.current && periodAEndRef.current && periodBStartRef.current && periodBEndRef.current) {
      isInitialMountRef.current = false
      fetchDataRef.current()
    }
  }, [periodAStart, periodAEnd, periodBStart, periodBEnd]) // ✅ Only check periods for initial load, not trigger reload
  
  // ✅ Trigger fetch when search button clicked (only searchTrigger triggers reload for slicers)
  useEffect(() => {
    // Skip initial mount
    if (isInitialMountRef.current) return
    
    if (searchTrigger && searchTrigger > 0 && searchTrigger !== lastSearchTriggerRef.current) {
      lastSearchTriggerRef.current = searchTrigger
      if (periodAStartRef.current && periodAEndRef.current && periodBStartRef.current && periodBEndRef.current) {
        fetchDataRef.current()
      }
    }
  }, [searchTrigger]) // ✅ Only searchTrigger triggers reload, not fetchData callback recreation

  // Fetch again when parent-provided periods change (e.g., after maxDate loaded)
  useEffect(() => {
    if (isInitialMountRef.current) return
    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) return
    const prev = prevPeriodsRef.current
    if (
      prev.aStart !== periodAStart ||
      prev.aEnd !== periodAEnd ||
      prev.bStart !== periodBStart ||
      prev.bEnd !== periodBEnd
    ) {
      prevPeriodsRef.current = {
        aStart: periodAStart,
        aEnd: periodAEnd,
        bStart: periodBStart,
        bEnd: periodBEnd
      }
      fetchDataRef.current()
    }
  }, [periodAStart, periodAEnd, periodBStart, periodBEnd])

  // Inject CSS ke head untuk Business Performance chart styling
  useEffect(() => {
    const styleId = 'usc-business-performance-chart-style'
    let styleElement = document.getElementById(styleId) as HTMLStyleElement
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }
    
    styleElement.textContent = businessPerformanceChartStyle
    
    return () => {
      // Cleanup: hapus style element saat component unmount
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  // Helper functions
  const calculatePercentageChange = (valueA: number, valueB: number): number => {
    if (valueA === 0) return valueB > 0 ? 100 : 0
    return ((valueB - valueA) / valueA) * 100
  }

  const preparePieChartData = (tierMetrics: TierMetricsData[], total: number) => {
    const filteredTiers = tierMetrics
      .filter(tier => tier.customerCount > 0)
      .sort((a, b) => getTierNumber(a.tierName) - getTierNumber(b.tierName))

    return filteredTiers.map(tier => ({
      label: tier.tierName,
      value: tier.customerCount,
      color: TIER_COLORS_WIREFRAME[tier.tierName] || TIER_NAME_COLORS[tier.tierName] || '#6B7280',
      percentage: total > 0 ? parseFloat(((tier.customerCount / total) * 100).toFixed(1)) : 0
    }))
  }

  const prepareDepositBarChartData = (tierMetrics: TierMetricsData[]) => {
    const filteredTiers = tierMetrics
      .filter(tier => tier.depositAmount > 0)
      .sort((a, b) => getTierNumber(a.tierName) - getTierNumber(b.tierName))

    const colors = filteredTiers.map(tier => TIER_COLORS_WIREFRAME[tier.tierName] || TIER_NAME_COLORS[tier.tierName] || '#6B7280')

    return {
      categories: filteredTiers.map(tier => tier.tierName),
      series: [{
        name: 'Deposit Amount',
        data: filteredTiers.map(tier => tier.depositAmount),
        color: colors as any
      }]
    }
  }

  const prepareGGRBarChartData = (tierMetrics: TierMetricsData[]) => {
    const filteredTiers = tierMetrics
      .filter(tier => tier.ggr !== 0)
      .sort((a, b) => getTierNumber(a.tierName) - getTierNumber(b.tierName))

    const ggrValues: number[] = []
    const colors: string[] = []

    filteredTiers.forEach(tier => {
      ggrValues.push(tier.ggr)
      colors.push(tier.ggr >= 0 ? '#10b981' : '#ef4444')
    })

    return {
      categories: filteredTiers.map(tier => tier.tierName),
      series: [{
        name: 'GGR',
        data: ggrValues,
        color: colors
      }]
    }
  }

  // Format date for display
  const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const startStr = startDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
    const endStr = endDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
    return `${startStr} ~ ${endStr}`
  }

  // Prepare chart data
  const periodAPieData = useMemo(() => {
    if (!data?.periodA) return []
    return preparePieChartData(data.periodA.tierMetrics, data.periodA.totalCustomers)
  }, [data?.periodA])

  const periodBPieData = useMemo(() => {
    if (!data?.periodB) return []
    return preparePieChartData(data.periodB.tierMetrics, data.periodB.totalCustomers)
  }, [data?.periodB])

  const periodADepositBarData = useMemo(() => {
    if (!data?.periodA) return { categories: [], series: [] }
    return prepareDepositBarChartData(data.periodA.tierMetrics)
  }, [data?.periodA])

  const periodBDepositBarData = useMemo(() => {
    if (!data?.periodB) return { categories: [], series: [] }
    return prepareDepositBarChartData(data.periodB.tierMetrics)
  }, [data?.periodB])

  const periodAGGRBarData = useMemo(() => {
    if (!data?.periodA) return { categories: [], series: [] }
    return prepareGGRBarChartData(data.periodA.tierMetrics)
  }, [data?.periodA])

  const periodBGGRBarData = useMemo(() => {
    if (!data?.periodB) return { categories: [], series: [] }
    return prepareGGRBarChartData(data.periodB.tierMetrics)
  }, [data?.periodB])

  if (loading) {
    return (
      <div style={{
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <StandardLoadingSpinner message="Loading Tier Metrics Comparison" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ef4444'
      }}>
        Error: {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280'
      }}>
        No data available. Please select date ranges.
      </div>
    )
  }

  const { periodA, periodB } = data
  const customerChange = calculatePercentageChange(periodA.totalCustomers, periodB.totalCustomers)
  const depositChange = calculatePercentageChange(periodA.totalDepositAmount, periodB.totalDepositAmount)
  const ggrChange = calculatePercentageChange(periodA.totalGGR, periodB.totalGGR)

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#1f2937',
          margin: 0,
          marginBottom: '8px'
        }}>
          Tier Metrics Comparison
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0
        }}>
          Distribution and contribution analysis across all tiers
        </p>
      </div>

      {/* Period A Section */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#374151',
          margin: 0,
          marginBottom: '16px'
        }}>
          Period A: {formatDateRange(periodA.startDate, periodA.endDate)}
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px'
        }}>
          {/* Customer Count Distribution Pie Chart */}
          <div style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h4 style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                margin: 0,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                lineHeight: '1.2'
              }}>
                Customer Count
              </h4>
              <div style={{
                fontSize: '22px',
                fontWeight: 600,
                color: '#111827',
                margin: '0 0 4px 0',
                lineHeight: '1.1'
              }}>
                {formatIntegerKPI(periodA.totalCustomers)}
              </div>
            </div>
            <div className="usc-business-performance-chart-wrapper" style={{ width: '100%', height: '500px' }}>
              <BusinessPerformancePieChart
                data={periodAPieData || []}
                showLegend={true}
                showPercentage={true}
              />
            </div>
          </div>

          {/* Deposit Amount by Tier */}
          <div style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h4 style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                margin: 0,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                lineHeight: '1.2'
              }}>
                Deposit Amount
              </h4>
              <div style={{
                fontSize: '22px',
                fontWeight: 600,
                color: '#111827',
                margin: '0 0 4px 0',
                lineHeight: '1.1'
              }}>
                {formatCurrencyKPI(periodA.totalDepositAmount, 'USC')}
              </div>
            </div>
            <div className="usc-business-performance-chart-wrapper" style={{ height: '500px', width: '100%' }}>
              <BarChart
                series={periodADepositBarData?.series || []}
                categories={periodADepositBarData?.categories || []}
                currency="USC"
                horizontal={true}
                showDataLabels={false}
              />
            </div>
          </div>

          {/* GGR by Tier (Profit/Loss) */}
          <div style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h4 style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                margin: 0,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                lineHeight: '1.2'
              }}>
                Gross Gaming Revenue
              </h4>
              <div style={{
                fontSize: '22px',
                fontWeight: 600,
                color: '#111827',
                margin: '0 0 4px 0',
                lineHeight: '1.1'
              }}>
                {formatCurrencyKPI(periodA.totalGGR, 'USC')}
              </div>
            </div>
            <div className="usc-business-performance-chart-wrapper" style={{ height: '500px', width: '100%' }}>
              <BarChart
                series={periodAGGRBarData?.series || []}
                categories={periodAGGRBarData?.categories || []}
                currency="USC"
                horizontal={true}
                showDataLabels={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Period B Section */}
      <div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#374151',
          margin: 0,
          marginBottom: '16px'
        }}>
          Period B: {formatDateRange(periodB.startDate, periodB.endDate)}
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px'
        }}>
          {/* Customer Count Distribution Pie Chart */}
          <div style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h4 style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                margin: 0,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                lineHeight: '1.2'
              }}>
                Customer Count
              </h4>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}>
                <div style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#111827',
                  lineHeight: '1.1'
                }}>
                  {formatIntegerKPI(periodB.totalCustomers)}
                </div>
                {customerChange !== 0 && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: customerChange >= 0 ? '#059669' : '#dc2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    {customerChange >= 0 ? '↑' : '↓'} {Math.abs(customerChange).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="usc-business-performance-chart-wrapper" style={{ width: '100%', height: '500px' }}>
              <BusinessPerformancePieChart
                data={periodBPieData || []}
                showLegend={true}
                showPercentage={true}
              />
            </div>
          </div>

          {/* Deposit Amount by Tier */}
          <div style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h4 style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                margin: 0,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                lineHeight: '1.2'
              }}>
                Deposit Amount
              </h4>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}>
                <div style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#111827',
                  lineHeight: '1.1'
                }}>
                  {formatCurrencyKPI(periodB.totalDepositAmount, 'USC')}
                </div>
                {depositChange !== 0 && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: depositChange >= 0 ? '#059669' : '#dc2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    {depositChange >= 0 ? '↑' : '↓'} {Math.abs(depositChange).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="usc-business-performance-chart-wrapper" style={{ height: '500px', width: '100%' }}>
              <BarChart
                series={periodBDepositBarData?.series || []}
                categories={periodBDepositBarData?.categories || []}
                currency="USC"
                horizontal={true}
                showDataLabels={false}
              />
            </div>
          </div>

          {/* GGR by Tier (Profit/Loss) */}
          <div style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h4 style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                margin: 0,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                lineHeight: '1.2'
              }}>
                Gross Gaming Revenue
              </h4>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}>
                <div style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#111827',
                  lineHeight: '1.1'
                }}>
                  {formatCurrencyKPI(periodB.totalGGR, 'USC')}
                </div>
                {ggrChange !== 0 && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: ggrChange >= 0 ? '#059669' : '#dc2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    {ggrChange >= 0 ? '↑' : '↓'} {Math.abs(ggrChange).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="usc-business-performance-chart-wrapper" style={{ height: '500px', width: '100%' }}>
              <BarChart
                series={periodBGGRBarData?.series || []}
                categories={periodBGGRBarData?.categories || []}
                currency="USC"
                horizontal={true}
                showDataLabels={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Period A vs B Detailed Comparison Section */}
      <div style={{
        marginTop: '32px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: isComparisonExpanded ? '20px' : '0'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1f2937',
              margin: 0,
              marginBottom: '4px',
              textAlign: 'left'
            }}>
              Period A vs B Detailed Comparison
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0,
              textAlign: 'left'
            }}>
              Side-by-side comparison of tier-level metrics between {formatDateRange(periodA.startDate, periodA.endDate)} and {formatDateRange(periodB.startDate, periodB.endDate)}
            </p>
          </div>
          <div style={{ marginLeft: '16px' }}>
            <button
              onClick={() => setIsComparisonExpanded(!isComparisonExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb'
                e.currentTarget.style.borderColor = '#d1d5db'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.borderColor = '#e5e7eb'
              }}
            >
              <span>{isComparisonExpanded ? 'Collapse' : 'Expand'}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transform: isComparisonExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        {isComparisonExpanded && (() => {
          // Prepare comparison data - Get all unique tier_name from both periods
          const allTierNames = new Set<string>()
          periodA.tierMetrics.forEach(tier => {
            if (tier.tierName) allTierNames.add(tier.tierName)
          })
          periodB.tierMetrics.forEach(tier => {
            if (tier.tierName) allTierNames.add(tier.tierName)
          })
          
          // Sort by tier number (lower number = higher tier)
          const sortedTiers = Array.from(allTierNames).sort((a, b) => getTierNumber(a) - getTierNumber(b))
          
          // Helper to get tier data or default
          const getTierData = (tierName: string, metrics: TierMetricsData[]) => {
            const tier = metrics.find(t => t.tierName === tierName)
            return tier || { tierName, customerCount: 0, depositAmount: 0, ggr: 0 }
          }

          return (
            <div style={{
              overflowX: 'auto',
              marginTop: '16px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 2px 4px -2px rgba(255, 255, 255, 0.5), inset 0 -2px 4px -2px rgba(0, 0, 0, 0.1)',
              border: '1px solid #d1d5db',
              transition: 'all 0.3s ease',
              backgroundColor: '#ffffff'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 2px 4px -2px rgba(255, 255, 255, 0.5), inset 0 -2px 4px -2px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.borderColor = '#3b82f6'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 2px 4px -2px rgba(255, 255, 255, 0.5), inset 0 -2px 4px -2px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: '13px',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#1F2937',
                    borderBottom: '2px solid #374151'
                  }}>
                    <th rowSpan={2} style={{
                      padding: '16px 14px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      borderRight: '1px solid #374151',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: '#1F2937',
                      zIndex: 10,
                      boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)',
                      fontSize: '14px',
                      letterSpacing: '-0.01em',
                      minWidth: '120px',
                      width: '120px'
                    }}>Tier</th>
                    <th colSpan={5} style={{
                      padding: '16px 14px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      borderRight: '1px solid #374151',
                      fontSize: '14px',
                      letterSpacing: '-0.01em',
                      backgroundColor: '#1F2937'
                    }}>
                      Period A
                    </th>
                    <th colSpan={5} style={{
                      padding: '16px 14px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontSize: '14px',
                      letterSpacing: '-0.01em',
                      backgroundColor: '#1F2937'
                    }}>
                      Period B
                    </th>
                  </tr>
                  <tr style={{
                    backgroundColor: '#1F2937',
                    borderBottom: '2px solid #374151'
                  }}>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontSize: '13px',
                      borderRight: '1px solid #374151',
                      letterSpacing: '-0.01em',
                      minWidth: '100px',
                      width: '100px'
                    }}>Count</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontSize: '13px',
                      borderRight: '1px solid #374151',
                      letterSpacing: '-0.01em',
                      minWidth: '130px',
                      width: '130px'
                    }}>DA</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontSize: '13px',
                      borderRight: '1px solid #374151',
                      letterSpacing: '-0.01em',
                      minWidth: '120px',
                      width: '120px'
                    }}>DA/User</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontSize: '13px',
                      borderRight: '1px solid #374151',
                      letterSpacing: '-0.01em',
                      minWidth: '130px',
                      width: '130px'
                    }}>GGR</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontSize: '13px',
                      borderRight: '1px solid #374151',
                      letterSpacing: '-0.01em',
                      minWidth: '100px',
                      width: '100px'
                    }}>WR</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontSize: '13px',
                      borderRight: '1px solid #374151',
                      letterSpacing: '-0.01em',
                      minWidth: '100px',
                      width: '100px'
                    }}>Count</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontSize: '13px',
                      borderRight: '1px solid #374151',
                      letterSpacing: '-0.01em',
                      minWidth: '130px',
                      width: '130px'
                    }}>DA</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontSize: '13px',
                      borderRight: '1px solid #374151',
                      letterSpacing: '-0.01em',
                      minWidth: '120px',
                      width: '120px'
                    }}>DA/User</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontSize: '13px',
                      borderRight: '1px solid #374151',
                      letterSpacing: '-0.01em',
                      minWidth: '130px',
                      width: '130px'
                    }}>GGR</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontSize: '13px',
                      letterSpacing: '-0.01em',
                      minWidth: '100px',
                      width: '100px'
                    }}>WR</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTiers.map((tierName, index) => {
                    const tierA = getTierData(tierName, periodA.tierMetrics)
                    const tierB = getTierData(tierName, periodB.tierMetrics)
                    
                    const daPerUserA = tierA.customerCount > 0 ? tierA.depositAmount / tierA.customerCount : 0
                    const daPerUserB = tierB.customerCount > 0 ? tierB.depositAmount / tierB.customerCount : 0
                    const winRateA = tierA.depositAmount > 0 ? (tierA.ggr / tierA.depositAmount) * 100 : 0
                    const winRateB = tierB.depositAmount > 0 ? (tierB.ggr / tierB.depositAmount) * 100 : 0
                    
                    const countChange = calculatePercentageChange(tierA.customerCount, tierB.customerCount)
                    const daChange = calculatePercentageChange(tierA.depositAmount, tierB.depositAmount)
                    const daPerUserChange = calculatePercentageChange(daPerUserA, daPerUserB)
                    const ggrChange = calculatePercentageChange(tierA.ggr, tierB.ggr)
                    const wrChange = calculatePercentageChange(winRateA, winRateB)
                    
                    return (
                      <tr
                        key={tierName}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                          borderBottom: '1px solid #E5E7EB',
                          transition: 'all 0.2s ease',
                          cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                          const row = e.currentTarget
                          row.style.backgroundColor = '#F3F4F6'
                          // Update all cells in the row
                          Array.from(row.children).forEach((cell: any) => {
                            if (cell.tagName === 'TD') {
                              cell.style.backgroundColor = '#F3F4F6'
                            }
                          })
                          // Update sticky tier column
                          const tierCell = row.querySelector('td:first-child') as HTMLElement
                          if (tierCell) {
                            tierCell.style.backgroundColor = '#F3F4F6'
                          }
                        }}
                        onMouseLeave={(e) => {
                          const row = e.currentTarget
                          const baseColor = index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                          row.style.backgroundColor = baseColor
                          // Update all cells in the row
                          Array.from(row.children).forEach((cell: any) => {
                            if (cell.tagName === 'TD') {
                              cell.style.backgroundColor = baseColor
                            }
                          })
                          // Update sticky tier column
                          const tierCell = row.querySelector('td:first-child') as HTMLElement
                          if (tierCell) {
                            tierCell.style.backgroundColor = baseColor
                          }
                        }}
                      >
                        <td style={{
                          padding: '14px 16px',
                          fontWeight: 700,
                          color: '#111827',
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                          zIndex: 5,
                          boxShadow: '2px 0 4px rgba(0, 0, 0, 0.05)',
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          borderLeft: '3px solid ' + (TIER_COLORS_WIREFRAME[tierName] || '#6b7280'),
                          minWidth: '120px',
                          width: '120px',
                          transition: 'background-color 0.2s ease'
                        }}>
                          {tierName}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          color: '#374151',
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          minWidth: '100px',
                          width: '100px',
                          transition: 'background-color 0.2s ease'
                        }}>
                          {formatIntegerKPI(tierA.customerCount)}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          color: '#374151',
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          minWidth: '130px',
                          width: '130px',
                          transition: 'background-color 0.2s ease'
                        }}>
                          {formatCurrencyKPI(tierA.depositAmount, 'USC')}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          color: '#374151',
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          minWidth: '120px',
                          width: '120px',
                          transition: 'background-color 0.2s ease'
                        }}>
                          {formatCurrencyKPI(daPerUserA, 'USC')}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          color: tierA.ggr >= 0 ? '#059669' : '#dc2626',
                          fontWeight: 600,
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          minWidth: '130px',
                          width: '130px',
                          transition: 'background-color 0.2s ease'
                        }}>
                          {formatCurrencyKPI(tierA.ggr, 'USC')}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          color: '#374151',
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          minWidth: '100px',
                          width: '100px',
                          transition: 'background-color 0.2s ease'
                        }}>
                          {formatPercentageKPI(winRateA)}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          color: '#374151',
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          minWidth: '100px',
                          width: '100px',
                          transition: 'background-color 0.2s ease'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span>{formatIntegerKPI(tierB.customerCount)}</span>
                            {countChange !== 0 && (
                              <span style={{
                                fontSize: '11px',
                                color: countChange >= 0 ? '#059669' : '#dc2626',
                                fontWeight: 600,
                                lineHeight: '1.2'
                              }}>
                                {countChange >= 0 ? '↑' : '↓'} {Math.abs(countChange).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          color: '#374151',
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          minWidth: '130px',
                          width: '130px',
                          transition: 'background-color 0.2s ease'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span>{formatCurrencyKPI(tierB.depositAmount, 'USC')}</span>
                            {daChange !== 0 && (
                              <span style={{
                                fontSize: '11px',
                                color: daChange >= 0 ? '#059669' : '#dc2626',
                                fontWeight: 600,
                                lineHeight: '1.2'
                              }}>
                                {daChange >= 0 ? '↑' : '↓'} {Math.abs(daChange).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          color: '#374151',
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          minWidth: '120px',
                          width: '120px',
                          transition: 'background-color 0.2s ease'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span>{formatCurrencyKPI(daPerUserB, 'USC')}</span>
                            {daPerUserChange !== 0 && (
                              <span style={{
                                fontSize: '11px',
                                color: daPerUserChange >= 0 ? '#059669' : '#dc2626',
                                fontWeight: 600,
                                lineHeight: '1.2'
                              }}>
                                {daPerUserChange >= 0 ? '↑' : '↓'} {Math.abs(daPerUserChange).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          minWidth: '130px',
                          width: '130px',
                          transition: 'background-color 0.2s ease'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span style={{
                              color: tierB.ggr >= 0 ? '#059669' : '#dc2626',
                              fontWeight: 600
                            }}>{formatCurrencyKPI(tierB.ggr, 'USC')}</span>
                            {ggrChange !== 0 && (
                              <span style={{
                                fontSize: '11px',
                                color: ggrChange >= 0 ? '#059669' : '#dc2626',
                                fontWeight: 600,
                                lineHeight: '1.2'
                              }}>
                                {ggrChange >= 0 ? '↑' : '↓'} {Math.abs(ggrChange).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          borderBottom: '1px solid #E5E7EB',
                          minWidth: '100px',
                          width: '100px',
                          transition: 'background-color 0.2s ease'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span style={{
                              color: '#374151'
                            }}>{formatPercentageKPI(winRateB)}</span>
                            {wrChange !== 0 && (
                              <span style={{
                                fontSize: '11px',
                                color: wrChange >= 0 ? '#059669' : '#dc2626',
                                fontWeight: 600,
                                lineHeight: '1.2'
                              }}>
                                {wrChange >= 0 ? '↑' : '↓'} {Math.abs(wrChange).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()}
      </div>

      {/* Tier Movement & Match Analysis Section */}
      <div style={{
        marginTop: '24px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: isMovementExpanded ? '20px' : '0'
        }}>
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1f2937',
              margin: 0,
              marginBottom: '4px',
              textAlign: 'left'
            }}>
              Tier Movement & Match Analysis
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0,
              textAlign: 'left'
            }}>
              Comparing customer growth rate vs DA growth rate to identify potential churn or value shifts
            </p>
          </div>
          <button
            onClick={() => setIsMovementExpanded(!isMovementExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.borderColor = '#d1d5db'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff'
              e.currentTarget.style.borderColor = '#e5e7eb'
            }}
          >
            <span>{isMovementExpanded ? 'Collapse' : 'Expand'}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: isMovementExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        {isMovementExpanded && (() => {
          // Prepare movement analysis data
          const allTierNames = new Set<string>()
          periodA.tierMetrics.forEach(tier => {
            if (tier.tierName) allTierNames.add(tier.tierName)
          })
          periodB.tierMetrics.forEach(tier => {
            if (tier.tierName) allTierNames.add(tier.tierName)
          })
          
          const sortedTiers = Array.from(allTierNames).sort((a, b) => getTierNumber(a) - getTierNumber(b))
          
          const getTierData = (tierName: string, metrics: TierMetricsData[]) => {
            const tier = metrics.find(t => t.tierName === tierName)
            return tier || { tierName, customerCount: 0, depositAmount: 0, ggr: 0 }
          }

          return (
            <div style={{
              overflowX: 'auto',
              marginTop: '16px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 2px 4px -2px rgba(255, 255, 255, 0.5), inset 0 -2px 4px -2px rgba(0, 0, 0, 0.1)',
              border: '1px solid #d1d5db',
              transition: 'all 0.3s ease',
              backgroundColor: '#ffffff'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 2px 4px -2px rgba(255, 255, 255, 0.5), inset 0 -2px 4px -2px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.borderColor = '#3b82f6'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 2px 4px -2px rgba(255, 255, 255, 0.5), inset 0 -2px 4px -2px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            >
              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: '13px',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#F9FAFB',
                    borderBottom: '2px solid #E5E7EB'
                  }}>
                    <th style={{
                      padding: '16px 14px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#111827',
                      borderRight: '1px solid #E5E7EB',
                      fontSize: '14px',
                      letterSpacing: '-0.01em'
                    }}>Tier</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#111827',
                      borderRight: '1px solid #E5E7EB',
                      fontSize: '13px',
                      letterSpacing: '-0.01em'
                    }}>Customer Change</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#111827',
                      borderRight: '1px solid #E5E7EB',
                      fontSize: '13px',
                      letterSpacing: '-0.01em'
                    }}>DA Change</th>
                    <th style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#111827',
                      fontSize: '13px',
                      letterSpacing: '-0.01em'
                    }}>Match Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTiers.map((tierName, index) => {
                    const tierA = getTierData(tierName, periodA.tierMetrics)
                    const tierB = getTierData(tierName, periodB.tierMetrics)
                    
                    const customerChange = calculatePercentageChange(tierA.customerCount, tierB.customerCount)
                    const daChange = calculatePercentageChange(tierA.depositAmount, tierB.depositAmount)
                    
                    // Match Status: delta antara Customer Change dan DA Change
                    const matchDelta = Math.abs(customerChange - daChange)
                    const matchStatus = matchDelta <= 5 ? 'Match' : (customerChange > daChange ? 'Churn Risk' : 'Value Up')
                    const matchColor = matchDelta <= 5 ? '#059669' : (customerChange > daChange ? '#dc2626' : '#3b82f6')
                    
                    const isRowExpanded = expandedMovementRow === tierName
                    const insightText = generateMovementInsight(tierName, customerChange, daChange, matchDelta)
                    
                    return (
                      <React.Fragment key={tierName}>
                        <tr
                          style={{
                            backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                            borderBottom: isRowExpanded ? 'none' : '1px solid #E5E7EB',
                            transition: 'background-color 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onClick={() => toggleMovementRow(tierName)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f3f4f6'
                            e.currentTarget.style.boxShadow = 'inset 0 0 8px rgba(59, 130, 246, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                        <td style={{
                          padding: '14px 16px',
                          fontWeight: 700,
                          color: '#111827',
                          borderRight: '1px solid #E5E7EB',
                          borderBottom: '1px solid #E5E7EB',
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          borderLeft: '3px solid ' + (TIER_COLORS_WIREFRAME[tierName] || '#6b7280')
                        }}>
                          {tierName}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          color: customerChange >= 0 ? '#059669' : '#dc2626',
                          borderRight: '1px solid #e5e7eb',
                          fontWeight: 600
                        }}>
                          {customerChange >= 0 ? '+' : ''}{customerChange.toFixed(1)}%
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'right',
                          color: daChange >= 0 ? '#059669' : '#dc2626',
                          borderRight: '1px solid #e5e7eb',
                          fontWeight: 600
                        }}>
                          {daChange >= 0 ? '+' : ''}{daChange.toFixed(1)}%
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                          color: matchColor,
                          fontWeight: 600,
                          position: 'relative'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span>{matchStatus}</span>
                              {matchDelta > 5 && (
                                <>
                                  <span style={{ color: matchColor, fontSize: '14px' }}>⚠</span>
                                  <span style={{ color: matchColor, fontSize: '12px' }}>Δ {matchDelta.toFixed(1)}%</span>
                                </>
                              )}
                            </div>
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{
                                transform: isRowExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                                color: '#6b7280',
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                      {isRowExpanded && (
                        <tr>
                          <td colSpan={4} style={{
                            padding: '16px',
                            backgroundColor: '#FFF7ED',
                            borderBottom: '1px solid #E5E7EB',
                            borderLeft: '3px solid ' + (TIER_COLORS_WIREFRAME[tierName] || '#6b7280')
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '12px',
                              backgroundColor: '#FFEDD5',
                              borderRadius: '6px',
                              border: '1px solid #FED7AA'
                            }}>
                              <span style={{
                                fontSize: '16px',
                                color: '#F97316',
                                fontWeight: 600,
                                flexShrink: 0
                              }}>⚠</span>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: '#F97316',
                                  marginBottom: '4px'
                                }}>
                                  Insight:
                                </div>
                                <div style={{
                                  fontSize: '13px',
                                  color: '#7C2D12',
                                  lineHeight: '1.5'
                                }}>
                                  {insightText}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()}
      </div>
    </div>
  )
}