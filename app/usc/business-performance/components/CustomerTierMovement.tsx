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

  // ✅ Get cell color based on movement type
  // Tier numbering: Tier 1 = Super VIP (highest), Tier 7 = Regular (lowest)
  // Logic: 
  // - fromTier > toTier = UPGRADE (from tier 7→1, tier number decreases) = Green
  // - fromTier < toTier = DOWNGRADE (from tier 1→7, tier number increases) = Pink
  // - fromTier === toTier = STABLE (same tier) = Blue
  const getCellColor = (fromTier: number, toTier: number, value: number): string => {
    if (value === 0) return 'transparent'
    if (fromTier === toTier) return '#DBEAFE' // Blue - Stable
    if (fromTier > toTier) return '#D1FAE5' // Green - Upgrade (from higher tier number to lower)
    return '#FCE7F3' // Pink - Downgrade (from lower tier number to higher) - Light pink with better visibility
  }

  // Handle cell click to open modal
  const handleCellClick = (fromTier: number, toTier: number, fromTierName: string, toTierName: string, cellValue: number) => {
    try {
      // ✅ Validate cell value first
      if (!cellValue || cellValue <= 0) {
        console.warn('⚠️ [Customer Tier Movement] Cell has no value, cannot open modal:', { fromTier, toTier, value: cellValue })
        return
      }

      // ✅ Validate tier values
      if (!fromTier || !toTier || !fromTierName || !toTierName) {
        console.error('❌ [Customer Tier Movement] Invalid tier values:', { fromTier, toTier, fromTierName, toTierName })
        setError('Invalid tier selection. Please try again.')
        return
      }

      // ✅ Use periods from state (already calculated and stored from props in fetchData)
      if (!periods) {
        console.error('❌ [Customer Tier Movement] Periods not available. Please ensure date range is selected and data is loaded.')
        setError('Periods not available. Please refresh the page or select a date range.')
        return
      }

      // ✅ Validate periods have required fields
      if (!periods.currentYear || !periods.currentMonth || !periods.previousYear || !periods.previousMonth) {
        console.error('❌ [Customer Tier Movement] Incomplete period data:', periods)
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
          previousMonth: periods.previousMonth
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
          <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '8px' }}>
            Tier Movement Matrix
          </h4>
          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            Rows represent Period A tiers, columns represent Period B tiers. Cell values show customer count moving
            between tiers.
          </p>

          <div 
            style={{ 
              overflowX: 'auto',
              borderRadius: '8px',
              transition: 'box-shadow 0.3s ease',
              border: '1px solid #e5e7eb'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      backgroundColor: '#F9FAFB',
                      borderBottom: '2px solid #E5E7EB',
                      fontWeight: 600,
                      color: '#374151'
                    }}
                  >
                    Period A → Period B
                  </th>
                  {data.matrix.tierOrder.map((tier) => (
                    <th
                      key={tier.tier}
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        backgroundColor: '#F9FAFB',
                        borderBottom: '2px solid #E5E7EB',
                        fontWeight: 600,
                        color: '#374151'
                      }}
                    >
                      {tier.tierName}
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      backgroundColor: '#F9FAFB',
                      borderBottom: '2px solid #E5E7EB',
                      fontWeight: 600,
                      color: '#374151'
                    }}
                  >
                    Total Out
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.matrix.rows.map((row) => (
                  <tr key={row.fromTier}>
                    <td
                      style={{
                        padding: '12px',
                        backgroundColor: '#F9FAFB',
                        borderBottom: '1px solid #E5E7EB',
                        fontWeight: 600,
                        color: '#374151'
                      }}
                    >
                      {row.fromTierName}
                    </td>
                    {data.matrix.tierOrder.map((tier) => {
                      const value = row.cells[tier.tier] || 0
                      const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0
                      const bgColor = getCellColor(row.fromTier, tier.tier, numericValue)
                      // ✅ Cell is clickable if value is a positive number
                      const isClickable = numericValue > 0 && !isNaN(numericValue) && isFinite(numericValue)
                      return (
                        <td
                          key={tier.tier}
                          onClick={() => {
                            if (isClickable) {
                              handleCellClick(row.fromTier, tier.tier, row.fromTierName, tier.tierName, numericValue)
                            }
                          }}
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            backgroundColor: bgColor,
                            borderBottom: '1px solid #E5E7EB',
                            fontWeight: row.fromTier === tier.tier ? 600 : 400,
                            color: numericValue === 0 ? '#9CA3AF' : '#1F2937',
                            cursor: isClickable ? 'pointer' : 'default',
                            transition: isClickable ? 'all 0.2s ease' : 'none',
                            position: 'relative',
                            userSelect: 'none' // Prevent text selection on click
                          }}
                          onMouseEnter={(e) => {
                            if (isClickable) {
                              e.currentTarget.style.opacity = '0.85'
                              e.currentTarget.style.transform = 'scale(1.03)'
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)'
                              e.currentTarget.style.zIndex = '10'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isClickable) {
                              e.currentTarget.style.opacity = '1'
                              e.currentTarget.style.transform = 'scale(1)'
                              e.currentTarget.style.boxShadow = 'none'
                              e.currentTarget.style.zIndex = '1'
                            }
                          }}
                          title={isClickable ? `Click to view ${numericValue} customer${numericValue > 1 ? 's' : ''}` : ''}
                        >
                          {numericValue === 0 ? '-' : formatNumber(numericValue)}
                        </td>
                      )
                    })}
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        backgroundColor: '#F9FAFB',
                        borderBottom: '1px solid #E5E7EB',
                        fontWeight: 600,
                        color: '#374151'
                      }}
                    >
                      {formatNumber(row.totalOut)}
                    </td>
                  </tr>
                ))}
                {/* Total In Row */}
                <tr>
                  <td
                    style={{
                      padding: '12px',
                      backgroundColor: '#F9FAFB',
                      borderTop: '2px solid #E5E7EB',
                      fontWeight: 600,
                      color: '#374151'
                    }}
                  >
                    Total In
                  </td>
                  {data.matrix.tierOrder.map((tier) => (
                    <td
                      key={tier.tier}
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        backgroundColor: '#F9FAFB',
                        borderTop: '2px solid #E5E7EB',
                        fontWeight: 600,
                        color: '#374151'
                      }}
                    >
                      {formatNumber(data.matrix.totalInRow.cells[tier.tier] || 0)}
                    </td>
                  ))}
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      backgroundColor: '#F9FAFB',
                      borderTop: '2px solid #E5E7EB',
                      fontWeight: 600,
                      color: '#374151'
                    }}
                  >
                    {formatNumber(data.matrix.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
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
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E40AF', marginBottom: '12px' }}>
            Key Insights
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#1E40AF', fontSize: '13px', lineHeight: '1.8' }}>
            <li>Higher upgrade rate indicates successful customer engagement and value delivery</li>
            <li>Monitor downgrade patterns to identify at-risk customer segments</li>
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

