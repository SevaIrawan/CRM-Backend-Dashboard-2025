'use client'

import React, { useState, useEffect } from 'react'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import TierMovementCustomerModal from './TierMovementCustomerModal'

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
      // ✅ ALWAYS use periods from props (shared with CustomerTierTrends from parent)
      // No duplicate calculation - single source of truth is in CustomerTierAnalytics
      if (!propPeriodAStart || !propPeriodAEnd || !propPeriodBStart || !propPeriodBEnd) {
        // If periods not available yet, wait (they will be set by parent)
        setLoading(false)
        return
      }

      // Convert date ranges to year/month for API (tier_usc_v1 uses monthly aggregation)
      const periodB = dateRangeToYearMonth(propPeriodBStart, propPeriodBEnd)
      const periodA = dateRangeToYearMonth(propPeriodAStart, propPeriodAEnd)
      
      const periods = {
        currentMonth: periodB.month,
        currentYear: periodB.year,
        previousMonth: periodA.month,
        previousYear: periodA.year,
        periodAStart: propPeriodAStart,
        periodAEnd: propPeriodAEnd,
        periodBStart: propPeriodBStart,
        periodBEnd: propPeriodBEnd
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
        line: brand || 'All',
        squadLead: squadLead || 'All',
        channel: channel || 'All'
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
  }, [brand, squadLead, channel, dateRange, propPeriodAStart, propPeriodAEnd, propPeriodBStart, propPeriodBEnd])

  // ✅ Initial load and when periods from props change
  useEffect(() => {
    // Only fetch if periods are available from props
    if (propPeriodAStart && propPeriodAEnd && propPeriodBStart && propPeriodBEnd) {
      fetchData()
    }
  }, [propPeriodAStart, propPeriodAEnd, propPeriodBStart, propPeriodBEnd, fetchData])

  // Trigger fetch when search button clicked
  useEffect(() => {
    if (searchTrigger && searchTrigger > 0) {
      fetchData()
    }
  }, [searchTrigger, fetchData])

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

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          {/* Upgrades Card */}
          <div
            style={{
              backgroundColor: '#D1FAE5',
              borderRadius: '12px',
              padding: '16px',
              position: 'relative',
              border: '1px solid #A7F3D0',
              boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.08), 0 1px 4px 0 rgba(0, 0, 0, 0.04)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)'
              e.currentTarget.style.borderColor = '#6EE7B7'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(0, 0, 0, 0.08), 0 1px 4px 0 rgba(0, 0, 0, 0.04)'
              e.currentTarget.style.borderColor = '#A7F3D0'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#065F46', marginBottom: '8px' }}>
              Upgrades
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#047857' }}>
                {formatNumber(data.summary.upgradesCard.count)}
              </div>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                style={{ position: 'absolute', top: '16px', right: '16px' }}
              >
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <div style={{ fontSize: '13px', color: '#065F46', marginTop: '4px' }}>
              {formatPercentage(data.summary.upgradesCard.percentage)} of total
            </div>
          </div>

          {/* Downgrades Card - Pink */}
          <div
            style={{
              backgroundColor: '#FCE7F3', // ✅ Pink background
              borderRadius: '12px',
              padding: '16px',
              position: 'relative',
              border: '1px solid #F9A8D4', // ✅ Pink border
              boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.08), 0 1px 4px 0 rgba(0, 0, 0, 0.04)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)'
              e.currentTarget.style.borderColor = '#F472B6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(0, 0, 0, 0.08), 0 1px 4px 0 rgba(0, 0, 0, 0.04)'
              e.currentTarget.style.borderColor = '#F9A8D4'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#9F1239', marginBottom: '8px' }}>
              Downgrades
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#BE185D' }}>
                {formatNumber(data.summary.downgradesCard.count)}
              </div>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EC4899"
                strokeWidth="2"
                style={{ position: 'absolute', top: '16px', right: '16px' }}
              >
                <path d="M13 17l5-5m0 0l-5-5m5 5H6" transform="rotate(180 12 12)" />
              </svg>
            </div>
            <div style={{ fontSize: '13px', color: '#9F1239', marginTop: '4px' }}>
              {formatPercentage(data.summary.downgradesCard.percentage)} of total
            </div>
          </div>

          {/* Stable Card */}
          <div
            style={{
              backgroundColor: '#DBEAFE',
              borderRadius: '12px',
              padding: '16px',
              position: 'relative',
              border: '1px solid #BFDBFE',
              boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.08), 0 1px 4px 0 rgba(0, 0, 0, 0.04)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)'
              e.currentTarget.style.borderColor = '#93C5FD'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(0, 0, 0, 0.08), 0 1px 4px 0 rgba(0, 0, 0, 0.04)'
              e.currentTarget.style.borderColor = '#BFDBFE'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E40AF', marginBottom: '8px' }}>
              Stable
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#2563EB' }}>
                {formatNumber(data.summary.stableCard.count)}
              </div>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                style={{ position: 'absolute', top: '16px', right: '16px' }}
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div style={{ fontSize: '13px', color: '#1E40AF', marginTop: '4px' }}>
              {formatPercentage(data.summary.stableCard.percentage)} of total
            </div>
          </div>
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

