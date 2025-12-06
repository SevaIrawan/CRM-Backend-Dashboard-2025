'use client'

import React, { useState, useEffect, useRef } from 'react'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import TierMovementCustomerModal from './TierMovementCustomerModal'
import { getKpiIcon } from '@/lib/CentralIcon'

interface MovementSummary {
  totalUpgrades: number
  totalDowngrades: number
  totalStable: number
  upgradesPercentage: number
  downgradesPercentage: number
  stablePercentage: number
}

interface MatrixCell {
  [toTier: number]: number
}

interface MatrixRow {
  fromTier: number
  fromTierName: string
  totalOut: number
  cells: MatrixCell
}

interface TierMovementData {
  summary: {
    upgradesCard: { count: number; percentage: number; label: string }
    downgradesCard: { count: number; percentage: number; label: string }
    stableCard: { count: number; percentage: number; label: string }
    newMemberCard?: { count: number; percentage: number; label: string }
    reactivationCard?: { count: number; percentage: number; label: string }
    churnedCard?: { count: number; percentage: number; label: string }
  }
  matrix: {
    rows: MatrixRow[]
    totalInRow: { label: string; cells: MatrixCell; total: number }
    tierOrder: Array<{ tier: number; tierName: string }>
    grandTotal: number
  }
  period: {
    current: string
    previous: string
  }
}

interface CustomerTierMovementProps {
  dateRange: string
  brand: string
  squadLead: string
  channel: string
  searchTrigger?: number
  periodAStart?: string
  periodAEnd?: string
  periodBStart?: string
  periodBEnd?: string
}

export default function CustomerTierMovement({
  dateRange,
  brand,
  squadLead,
  channel,
  searchTrigger,
  periodAStart: propPeriodAStart,
  periodAEnd: propPeriodAEnd,
  periodBStart: propPeriodBStart,
  periodBEnd: propPeriodBEnd
}: CustomerTierMovementProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TierMovementData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // ✅ Store slicer values in ref to always use latest values in fetchData without triggering auto reload
  const brandRef = useRef(brand)
  const squadLeadRef = useRef(squadLead)
  const channelRef = useRef(channel)
  const periodAStartRef = useRef(propPeriodAStart)
  const periodAEndRef = useRef(propPeriodAEnd)
  const periodBStartRef = useRef(propPeriodBStart)
  const periodBEndRef = useRef(propPeriodBEnd)
  const dateRangeRef = useRef(dateRange)
  
  // Update refs when props change
  useEffect(() => {
    brandRef.current = brand
    squadLeadRef.current = squadLead
    channelRef.current = channel
    periodAStartRef.current = propPeriodAStart
    periodAEndRef.current = propPeriodAEnd
    periodBStartRef.current = propPeriodBStart
    periodBEndRef.current = propPeriodBEnd
    dateRangeRef.current = dateRange
  }, [brand, squadLead, channel, propPeriodAStart, propPeriodAEnd, propPeriodBStart, propPeriodBEnd, dateRange])
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedFromTier, setSelectedFromTier] = useState<number | null>(null)
  const [selectedToTier, setSelectedToTier] = useState<number | null>(null)
  const [selectedFromTierName, setSelectedFromTierName] = useState<string>('')
  const [selectedToTierName, setSelectedToTierName] = useState<string>('')
  const [periods, setPeriods] = useState<{
    currentMonth: string
    currentYear: string
    previousMonth: string
    previousYear: string
    periodAStart: string | null
    periodAEnd: string | null
    periodBStart: string | null
    periodBEnd: string | null
  } | null>(null)

  // Convert date range to year/month format for API (used by tier_usc_v1 which is monthly aggregation)
  const dateRangeToYearMonth = (startDate: string, endDate: string) => {
    // Use end date to determine year/month (most recent date in the range)
    // This is correct because tier_usc_v1 is monthly aggregation
    const date = new Date(endDate)
    const year = date.getFullYear()
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]
    const month = monthNames[date.getMonth()]
    return { year: year.toString(), month }
  }

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // ✅ Use ref to get latest periods value without triggering auto reload
      const currentPeriodAStart = periodAStartRef.current
      const currentPeriodAEnd = periodAEndRef.current
      const currentPeriodBStart = periodBStartRef.current
      const currentPeriodBEnd = periodBEndRef.current
      
      // ✅ ALWAYS use periods from refs (shared with CustomerTierTrends from parent)
      // No duplicate calculation - single source of truth is in CustomerTierAnalytics
      if (!currentPeriodAStart || !currentPeriodAEnd || !currentPeriodBStart || !currentPeriodBEnd) {
        // If periods not available yet, wait (they will be set by parent)
        setLoading(false)
        return
      }

      // Convert date ranges to year/month for API (tier_usc_v1 uses monthly aggregation)
      const periodB = dateRangeToYearMonth(currentPeriodBStart, currentPeriodBEnd)
      const periodA = dateRangeToYearMonth(currentPeriodAStart, currentPeriodAEnd)
      
      const periods = {
        currentMonth: periodB.month,
        currentYear: periodB.year,
        previousMonth: periodA.month,
        previousYear: periodA.year,
        periodAStart: currentPeriodAStart,
        periodAEnd: currentPeriodAEnd,
        periodBStart: currentPeriodBStart,
        periodBEnd: currentPeriodBEnd
      }
      
      // Store periods in state for modal usage
      setPeriods(periods)
      
      const userAllowedBrands = localStorage.getItem('user_allowed_brands')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }

      if (userAllowedBrands) {
        headers['x-user-allowed-brands'] = userAllowedBrands
      }

      const params = new URLSearchParams({
        line: brandRef.current || 'All', // ✅ Use ref to always get latest value
        squadLead: squadLeadRef.current || 'All', // ✅ Use ref to always get latest value
        channel: channelRef.current || 'All' // ✅ Use ref to always get latest value
      })
      
      // Use date range format (same as Customer Tier Trends) if available
      if (periods.periodAStart && periods.periodAEnd && periods.periodBStart && periods.periodBEnd) {
        params.append('periodAStart', periods.periodAStart)
        params.append('periodAEnd', periods.periodAEnd)
        params.append('periodBStart', periods.periodBStart)
        params.append('periodBEnd', periods.periodBEnd)
      } else {
        // Fallback to year/month format (backward compatibility)
        params.append('currentYear', periods.currentYear)
        params.append('currentMonth', periods.currentMonth)
        params.append('previousYear', periods.previousYear)
        params.append('previousMonth', periods.previousMonth)
      }

      const response = await fetch(`/api/usc-business-performance/tier-movement?${params}`, {
        headers
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        setData(result.data)
        // Store periods for modal
        setPeriods(periods)
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      console.error('❌ [Customer Tier Movement] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, []) // ✅ Tidak ada dependencies - semua values menggunakan ref, hanya searchTrigger yang trigger reload

  const fetchDataRef = useRef(fetchData)
  const lastSearchTriggerRef = useRef(0)
  const isInitialMountRef = useRef(true)
  
  // Always keep fetchDataRef updated with latest fetchData function
  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])

  // ✅ Initial load and when periods from props change
  useEffect(() => {
    // Only fetch if periods are available from refs
    if (periodAStartRef.current && periodAEndRef.current && periodBStartRef.current && periodBEndRef.current) {
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false
        fetchDataRef.current()
      }
    }
  }, [propPeriodAStart, propPeriodAEnd, propPeriodBStart, propPeriodBEnd]) // ✅ Only check periods for initial load, not trigger reload

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

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          minHeight: '600px'
        }}
      >
        <StandardLoadingSpinner message="Loading Customer Tier Movement Analysis" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          width: '100%',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            color: '#EF4444'
          }}
        >
          Error: {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div
        style={{
          width: '100%',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px'
          }}
        >
          No data available
        </div>
      </div>
    )
  }

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US')
  }

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`
  }

  // Render CentralIcon with forced currentColor; override MoM arrows with double chevron SVGs
  const renderIcon = (iconName: string, color: string, size: string = '20px') => {
    try {
      const customMoM: Record<string, string> = {
        arrowUp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path fill="currentColor" d="M342.6 105.4C330.1 92.9 309.8 92.9 297.3 105.4L137.3 265.4C124.8 277.9 124.8 298.2 137.3 310.7C149.8 323.2 170.1 323.2 182.6 310.7L320 173.3L457.4 310.6C469.9 323.1 490.2 323.1 502.7 310.6C515.2 298.1 515.2 277.8 502.7 265.3L342.7 105.3zM502.6 457.4L342.6 297.4C330.1 284.9 309.8 284.9 297.3 297.4L137.3 457.4C124.8 469.9 124.8 490.2 137.3 502.7C149.8 515.2 170.1 515.2 182.6 502.7L320 365.3L457.4 502.6C469.9 515.1 490.2 515.1 502.7 502.6C515.2 490.1 515.2 469.8 502.7 457.3z"/></svg>`,
        arrowDown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path fill="currentColor" d="M342.6 534.6C330.1 547.1 309.8 547.1 297.3 534.6L137.3 374.6C124.8 362.1 124.8 341.8 137.3 329.3C149.8 316.8 170.1 316.8 182.6 329.3L320 466.7L457.4 329.4C469.9 316.9 490.2 316.9 502.7 329.4C515.2 341.9 515.2 362.2 502.7 374.7L342.7 534.7zM502.6 182.6L342.6 342.6C330.1 355.1 309.8 355.1 297.3 342.6L137.3 182.6C124.8 170.1 124.8 149.8 137.3 137.3C149.8 124.8 170.1 124.8 182.6 137.3L320 274.7L457.4 137.4C469.9 124.9 490.2 124.9 502.7 137.4C515.2 149.9 515.2 170.2 502.7 182.7z"/></svg>`,
        activeMember: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM438 209.7C427.3 201.9 412.3 204.3 404.5 215L285.1 379.2L233 327.1C223.6 317.7 208.4 317.7 199.1 327.1C189.8 336.5 189.7 351.7 199.1 361L271.1 433C276.1 438 282.9 440.5 289.9 440C296.9 439.5 303.3 435.9 307.4 430.2L443.3 243.2C451.1 232.5 448.7 217.5 438 209.7z"/></svg>`,
        newCustomers: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M136 192C136 125.7 189.7 72 256 72C322.3 72 376 125.7 376 192C376 258.3 322.3 312 256 312C189.7 312 136 258.3 136 192zM48 546.3C48 447.8 127.8 368 226.3 368L285.7 368C384.2 368 464 447.8 464 546.3C464 562.7 450.7 576 434.3 576L77.7 576C61.3 576 48 562.7 48 546.3zM544 160C557.3 160 568 170.7 568 184L568 232L616 232C629.3 232 640 242.7 640 256C640 269.3 629.3 280 616 280L568 280L568 328C568 341.3 557.3 352 544 352C530.7 352 520 341.3 520 328L520 280L472 280C458.7 280 448 269.3 448 256C448 242.7 458.7 232 472 232L520 232L520 184C520 170.7 530.7 160 544 160z"/></svg>`,
        pureMember: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M286 368C384.5 368 464.3 447.8 464.3 546.3C464.3 562.7 451 576 434.6 576L78 576C61.6 576 48.3 562.7 48.3 546.3C48.3 447.8 128.1 368 226.6 368L286 368zM585.7 169.9C593.5 159.2 608.5 156.8 619.2 164.6C629.9 172.4 632.3 187.4 624.5 198.1L522.1 338.9C517.9 344.6 511.4 348.3 504.4 348.7C497.4 349.1 490.4 346.5 485.5 341.4L439.1 293.4C429.9 283.9 430.1 268.7 439.7 259.5C449.2 250.3 464.4 250.6 473.6 260.1L500.1 287.5L585.7 169.8zM256.3 312C190 312 136.3 258.3 136.3 192C136.3 125.7 190 72 256.3 72C322.6 72 376.3 125.7 376.3 192C376.3 258.3 322.6 312 256.3 312z"/></svg>`,
        churnRate: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M136 192C136 125.7 189.7 72 256 72C322.3 72 376 125.7 376 192C376 258.3 322.3 312 256 312C189.7 312 136 258.3 136 192zM48 546.3C48 447.8 127.8 368 226.3 368L285.7 368C384.2 368 464 447.8 464 546.3C464 562.7 450.7 576 434.3 576L77.7 576C61.3 576 48 562.7 48 546.3zM472 232L616 232C629.3 232 640 242.7 640 256C640 269.3 629.3 280 616 280L472 280C458.7 280 448 269.3 448 256C448 242.7 458.7 232 472 232z"/></svg>`
      }

      const raw = customMoM[iconName] || getKpiIcon(iconName) || ''
      const svg = raw
        .replace(/fill="[^"]*"/g, 'fill="currentColor"')
        .replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
      return (
        <div
          style={{ width: size, height: size, color }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )
    } catch {
      return null
    }
  }

  // ✅ Get cell color based on movement type with enhanced modern styling
  // Tier numbering: Tier 1 = Super VIP (highest), Tier 7 = Regular (lowest)
  // Logic: 
  // - fromTier > toTier = UPGRADE (from tier 7→1, tier number decreases) = Green
  // - fromTier < toTier = DOWNGRADE (from tier 1→7, tier number increases) = Pink
  // - fromTier === toTier = STABLE (same tier) = Blue
  const getCellColor = (fromTier: number, toTier: number, value: number): { bg: string; border: string; text: string } => {
    if (value === 0) return { bg: '#FFFFFF', border: '#F3F4F6', text: '#9CA3AF' }
    
    if (fromTier === toTier) {
      // Blue - Stable (with gradient effect)
      return { 
        bg: '#EFF6FF', 
        border: '#BFDBFE', 
        text: '#1E40AF' 
      }
    }
    
    if (fromTier > toTier) {
      // Green - Upgrade (from higher tier number to lower)
      return { 
        bg: '#ECFDF5', 
        border: '#A7F3D0', 
        text: '#047857' 
      }
    }
    
    // Pink - Downgrade (from lower tier number to higher)
    return { 
      bg: '#FDF2F8', 
      border: '#F9A8D4', 
      text: '#BE185D' 
    }
  }
  
  // ✅ Get movement icon based on movement type
  const getMovementIcon = (fromTier: number, toTier: number): string => {
    if (fromTier === toTier) return '●' // Stable - Circle
    if (fromTier > toTier) return '▲' // Upgrade - Up arrow
    return '▼' // Downgrade - Down arrow
  }

  // Handle cell click to open modal
  const handleCellClick = (fromTier: number, toTier: number, fromTierName: string, toTierName: string, cellValue: number) => {
    try {
      // ✅ Validate cell value first - must be > 0
      if (typeof cellValue !== 'number' || isNaN(cellValue) || !isFinite(cellValue) || cellValue <= 0) {
        console.warn('⚠️ [Customer Tier Movement] Cell has invalid value, cannot open modal:', { 
          fromTier, 
          toTier, 
          fromTierName,
          toTierName,
          value: cellValue,
          type: typeof cellValue,
          isNaN: isNaN(cellValue),
          isFinite: isFinite(cellValue)
        })
        return
      }

      // ✅ Validate tier values - must be valid numbers and names
      if (typeof fromTier !== 'number' || typeof toTier !== 'number' || 
          !fromTierName || !toTierName || 
          isNaN(fromTier) || isNaN(toTier)) {
        console.error('❌ [Customer Tier Movement] Invalid tier values:', { 
          fromTier, 
          toTier, 
          fromTierName, 
          toTierName,
          fromTierType: typeof fromTier,
          toTierType: typeof toTier
        })
        setError('Invalid tier selection. Please try again.')
        return
      }

      // ✅ Use periods from state (already calculated and stored from props in fetchData)
      if (!periods) {
        console.error('❌ [Customer Tier Movement] Periods not available. Please ensure date range is selected and data is loaded.')
        setError('Periods not available. Please refresh the page or select a date range.')
        return
      }

      // ✅ Validate periods have required fields - check both year/month and date range
      const hasYearMonth = periods.currentYear && periods.currentMonth && periods.previousYear && periods.previousMonth
      const hasDateRange = periods.periodAStart && periods.periodAEnd && periods.periodBStart && periods.periodBEnd
      
      if (!hasYearMonth && !hasDateRange) {
        console.error('❌ [Customer Tier Movement] Incomplete period data:', {
          periods,
          hasYearMonth,
          hasDateRange
        })
        setError('Period data is incomplete. Please refresh the page.')
        return
      }

      console.log('✅ [Customer Tier Movement] Opening modal for cell:', {
        fromTier,
        toTier,
        fromTierName,
        toTierName,
        cellValue,
        periods: {
          currentYear: periods.currentYear,
          currentMonth: periods.currentMonth,
          previousYear: periods.previousYear,
          previousMonth: periods.previousMonth,
          periodAStart: periods.periodAStart,
          periodAEnd: periods.periodAEnd,
          periodBStart: periods.periodBStart,
          periodBEnd: periods.periodBEnd
        },
        filters: {
          line: brand || 'All',
          squadLead: squadLead || 'All',
          channel: channel || 'All'
        }
      })

      setSelectedFromTier(fromTier)
      setSelectedToTier(toTier)
      setSelectedFromTierName(fromTierName)
      setSelectedToTierName(toTierName)
      setError(null) // Clear any previous errors
      setModalOpen(true)
    } catch (err) {
      console.error('❌ [Customer Tier Movement] Error opening modal:', err)
      setError(err instanceof Error ? err.message : 'Failed to open customer list')
      setModalOpen(false) // Ensure modal doesn't open if there's an error
    }
  }

  // Close modal
  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedFromTier(null)
    setSelectedToTier(null)
  }

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '100%'
        }}
      >
        {/* Header */}
        <div>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#1f2937',
              margin: 0,
              marginBottom: '4px'
            }}
          >
            Customer Tier Movement Analysis
          </h3>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Track customer tier upgrades and downgrades between periods
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { label: data.summary.upgradesCard.label, count: data.summary.upgradesCard.count, percentage: data.summary.upgradesCard.percentage, icon: 'arrowUp' },
            { label: data.summary.downgradesCard.label, count: data.summary.downgradesCard.count, percentage: data.summary.downgradesCard.percentage, icon: 'arrowDown' },
            { label: data.summary.stableCard.label, count: data.summary.stableCard.count, percentage: data.summary.stableCard.percentage, icon: 'activeMember' },
            data.summary.newMemberCard && { label: 'ND TIER', count: data.summary.newMemberCard.count, percentage: data.summary.newMemberCard.percentage, icon: 'newCustomers' },
            data.summary.reactivationCard && { label: 'REACT TIER', count: data.summary.reactivationCard.count, percentage: data.summary.reactivationCard.percentage, icon: 'pureMember' },
            data.summary.churnedCard && { label: 'CHURNED TIER', count: data.summary.churnedCard.count, percentage: data.summary.churnedCard.percentage, icon: 'churnRate' }
          ].filter(Boolean).map((card, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '16px',
                position: 'relative',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{(card as any).label}</span>
                {renderIcon(
                  (card as any).icon,
                  (card as any).icon === 'arrowUp'
                    ? '#16a34a'
                    : (card as any).icon === 'arrowDown'
                      ? '#dc2626'
                      : (card as any).icon === 'activeMember'
                        ? '#2563eb'
                        : '#111827',
                  '20px'
                )}
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
                {formatNumber((card as any).count)}
              </div>
              <div style={{ fontSize: '12px', color: '#4B5563' }}>
                {formatPercentage((card as any).percentage)} of total
              </div>
            </div>
          ))}
        </div>

        {/* Tier Movement Matrix */}
        <div>
          <h4 style={{ 
            fontSize: '18px', 
            fontWeight: 700, 
            color: '#111827', 
            marginBottom: '6px',
            letterSpacing: '-0.02em'
          }}>
            Tier Movement Matrix
          </h4>
          <p style={{ 
            fontSize: '13px', 
            color: '#6b7280', 
            marginBottom: '16px',
            lineHeight: '1.5'
          }}>
            Rows represent Period A tiers, columns represent Period B tiers. Cell values show customer count moving
            between tiers.
          </p>

          <div 
            style={{ 
              overflowX: 'auto',
              borderRadius: '12px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              e.currentTarget.style.borderColor = '#D1D5DB'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
              e.currentTarget.style.borderColor = '#E5E7EB'
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: '13px'
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '16px 14px',
                      textAlign: 'left',
                      backgroundColor: '#F9FAFB',
                      borderBottom: '2px solid #E5E7EB',
                      borderRight: '1px solid #E5E7EB',
                      fontWeight: 700,
                      color: '#111827',
                      fontSize: '14px',
                      letterSpacing: '-0.01em',
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      boxShadow: '2px 0 4px rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    Period A → Period B
                  </th>
                  {data.matrix.tierOrder.map((tier) => (
                    <th
                      key={tier.tier}
                      style={{
                        padding: '16px 12px',
                        textAlign: 'center',
                        backgroundColor: '#F9FAFB',
                        borderBottom: '2px solid #E5E7EB',
                        borderRight: '1px solid #E5E7EB',
                        fontWeight: 700,
                        color: '#111827',
                        fontSize: '13px',
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        minWidth: '90px'
                      }}
                    >
                      {tier.tierName}
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '16px 14px',
                      textAlign: 'center',
                      backgroundColor: '#F3F4F6',
                      borderBottom: '2px solid #D1D5DB',
                      fontWeight: 700,
                      color: '#111827',
                      fontSize: '13px',
                      letterSpacing: '-0.01em',
                      minWidth: '100px'
                    }}
                  >
                    Total Out
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.matrix.rows.map((row, rowIndex) => (
                  <tr key={row.fromTier} style={{
                    backgroundColor: rowIndex % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    transition: 'background-color 0.2s ease'
                  }}>
                    <td
                      style={{
                        padding: '14px 16px',
                        backgroundColor: '#F9FAFB',
                        borderBottom: '1px solid #E5E7EB',
                        borderRight: '1px solid #E5E7EB',
                        fontWeight: 700,
                        color: '#111827',
                        fontSize: '13px',
                        position: 'sticky',
                        left: 0,
                        zIndex: 5,
                        boxShadow: '2px 0 4px rgba(0, 0, 0, 0.02)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {row.fromTierName}
                    </td>
                    {data.matrix.tierOrder.map((tier) => {
                      const value = row.cells[tier.tier] || 0
                      
                      // ✅ Parse value carefully - handle number, string, and edge cases
                      let numericValue = 0
                      if (typeof value === 'number') {
                        numericValue = value
                      } else if (typeof value === 'string') {
                        const stringValue = value as string // ✅ Explicit type assertion
                        const parsed = parseFloat(stringValue.replace(/[^0-9.-]/g, ''))
                        numericValue = isNaN(parsed) ? 0 : parsed
                      } else if (value !== null && value !== undefined) {
                        // Try to convert other types
                        numericValue = Number(value) || 0
                      }
                      
                      // ✅ Ensure numericValue is valid number
                      if (isNaN(numericValue) || !isFinite(numericValue)) {
                        numericValue = 0
                      }
                      
                      const cellColors = getCellColor(row.fromTier, tier.tier, numericValue)
                      const movementIcon = getMovementIcon(row.fromTier, tier.tier)
                      const isStable = row.fromTier === tier.tier
                      
                      // ✅ Cell is clickable if value is a positive number (> 0)
                      const isClickable = numericValue > 0 && typeof numericValue === 'number' && !isNaN(numericValue) && isFinite(numericValue)
                      
                      return (
                        <td
                          key={tier.tier}
                          onClick={() => {
                            if (isClickable) {
                              console.log('🔍 [Cell Click] Opening modal for:', {
                                fromTier: row.fromTier,
                                toTier: tier.tier,
                                fromTierName: row.fromTierName,
                                toTierName: tier.tierName,
                                cellValue: numericValue,
                                originalValue: value,
                                isClickable
                              })
                              handleCellClick(row.fromTier, tier.tier, row.fromTierName, tier.tierName, numericValue)
                            } else {
                              console.warn('⚠️ [Cell Click] Cell not clickable:', {
                                fromTier: row.fromTier,
                                toTier: tier.tier,
                                cellValue: numericValue,
                                originalValue: value,
                                reason: numericValue <= 0 ? 'value <= 0' : 'invalid number'
                              })
                            }
                          }}
                          style={{
                            padding: '14px 12px',
                            textAlign: 'center',
                            backgroundColor: cellColors.bg,
                            borderBottom: '1px solid #E5E7EB',
                            borderRight: '1px solid #E5E7EB',
                            borderLeft: numericValue > 0 ? `3px solid ${cellColors.border}` : 'none',
                            fontWeight: isStable ? 700 : 600,
                            color: numericValue === 0 ? cellColors.text : cellColors.text,
                            cursor: isClickable ? 'pointer' : 'default',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            userSelect: 'none',
                            fontSize: numericValue > 0 ? '13px' : '12px',
                            verticalAlign: 'middle'
                          }}
                          onMouseEnter={(e) => {
                            if (isClickable) {
                              e.currentTarget.style.transform = 'scale(1.05) translateZ(0)'
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)'
                              e.currentTarget.style.zIndex = '10'
                              e.currentTarget.style.borderLeftWidth = '4px'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isClickable) {
                              e.currentTarget.style.transform = 'scale(1) translateZ(0)'
                              e.currentTarget.style.boxShadow = 'none'
                              e.currentTarget.style.zIndex = '1'
                              e.currentTarget.style.borderLeftWidth = '3px'
                            }
                          }}
                          title={isClickable ? `Click to view ${numericValue} customer${numericValue > 1 ? 's' : ''} (${isStable ? 'Stable' : row.fromTier > tier.tier ? 'Upgrade' : 'Downgrade'})` : ''}
                        >
                          {numericValue === 0 ? (
                            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>—</span>
                          ) : (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              gap: '6px',
                              flexWrap: 'nowrap'
                            }}>
                              <span style={{ 
                                fontSize: '10px', 
                                color: cellColors.text,
                                opacity: 0.8,
                                lineHeight: '1'
                              }}>
                                {movementIcon}
                              </span>
                              <span style={{ fontWeight: 'inherit' }}>
                                {formatNumber(numericValue)}
                              </span>
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td
                      style={{
                        padding: '14px 16px',
                        textAlign: 'center',
                        backgroundColor: '#F3F4F6',
                        borderBottom: '1px solid #D1D5DB',
                        borderLeft: '1px solid #E5E7EB',
                        fontWeight: 700,
                        color: '#111827',
                        fontSize: '13px',
                        minWidth: '100px'
                      }}
                    >
                      {formatNumber(row.totalOut)}
                    </td>
                  </tr>
                ))}
                {/* Total In Row */}
                <tr style={{ backgroundColor: '#F3F4F6' }}>
                  <td
                    style={{
                      padding: '16px 14px',
                      backgroundColor: '#F3F4F6',
                      borderTop: '3px solid #D1D5DB',
                      borderBottom: 'none',
                      borderRight: '1px solid #D1D5DB',
                      fontWeight: 700,
                      color: '#111827',
                      fontSize: '14px',
                      position: 'sticky',
                      left: 0,
                      zIndex: 5,
                      boxShadow: '2px 0 4px rgba(0, 0, 0, 0.02)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Total In
                  </td>
                  {data.matrix.tierOrder.map((tier) => (
                    <td
                      key={tier.tier}
                      style={{
                        padding: '16px 12px',
                        textAlign: 'center',
                        backgroundColor: '#F3F4F6',
                        borderTop: '3px solid #D1D5DB',
                        borderBottom: 'none',
                        borderRight: '1px solid #D1D5DB',
                        fontWeight: 700,
                        color: '#111827',
                        fontSize: '13px',
                        minWidth: '90px'
                      }}
                    >
                      {formatNumber(data.matrix.totalInRow.cells[tier.tier] || 0)}
                    </td>
                  ))}
                  <td
                    style={{
                      padding: '16px 14px',
                      textAlign: 'center',
                      backgroundColor: '#E5E7EB',
                      borderTop: '3px solid #9CA3AF',
                      borderBottom: 'none',
                      fontWeight: 700,
                      color: '#111827',
                      fontSize: '14px',
                      minWidth: '100px'
                    }}
                  >
                    {formatNumber(data.matrix.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
            
            {/* ✅ Modern styling with CSS animations */}
            <style jsx>{`
              @keyframes fadeInCell {
                from {
                  opacity: 0;
                  transform: scale(0.95);
                }
                to {
                  opacity: 1;
                  transform: scale(1);
                }
              }
              
              @keyframes pulseGlow {
                0%, 100% {
                  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
                }
                50% {
                  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0);
                }
              }
              
              /* Smooth transitions for table interactions */
              table tbody tr {
                animation: fadeInCell 0.3s ease-out;
              }
              
              table tbody tr:hover {
                background-color: #F9FAFB !important;
              }
            `}</style>
          </div>
        </div>

        {/* Key Insights */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            borderRadius: '8px',
            padding: '16px',
            borderLeft: '4px solid #3B82F6'
          }}
        >
          <h4 style={{ 
            fontSize: '15px', 
            fontWeight: 700, 
            color: '#1E40AF', 
            marginBottom: '14px',
            letterSpacing: '-0.01em'
          }}>
            Key Insights
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '24px', 
            color: '#1E3A8A', 
            fontSize: '13px', 
            lineHeight: '1.9',
            listStyle: 'disc'
          }}>
            <li style={{ marginBottom: '6px' }}>Higher upgrade rate indicates successful customer engagement and value delivery</li>
            <li style={{ marginBottom: '6px' }}>Monitor downgrade patterns to identify at-risk customer segments</li>
            <li>Stable customers in high-value tiers represent consistent revenue base</li>
          </ul>
        </div>
      </div>

      {/* Customer Modal - Render only when both tiers are selected and periods are available */}
      {modalOpen && selectedFromTier !== null && selectedToTier !== null && periods && (
        <TierMovementCustomerModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          fromTier={selectedFromTier}
          toTier={selectedToTier}
          fromTierName={selectedFromTierName}
          toTierName={selectedToTierName}
          currentYear={periods.currentYear}
          currentMonth={periods.currentMonth}
          previousYear={periods.previousYear}
          previousMonth={periods.previousMonth}
          periodAStart={periods.periodAStart}
          periodAEnd={periods.periodAEnd}
          periodBStart={periods.periodBStart}
          periodBEnd={periods.periodBEnd}
          line={brand || 'All'}
          squadLead={squadLead || 'All'}
          channel={channel || 'All'}
        />
      )}
    </div>
  )
}

