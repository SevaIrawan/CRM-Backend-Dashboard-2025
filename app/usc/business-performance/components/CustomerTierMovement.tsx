'use client'

import React, { useState, useEffect } from 'react'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'

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
}

export default function CustomerTierMovement({
  dateRange,
  brand,
  squadLead,
  channel,
  searchTrigger
}: CustomerTierMovementProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TierMovementData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Calculate periods based on dateRange
  const calculatePeriods = () => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() // 0-based

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

    // Current period (last available month)
    const currMonth = monthNames[currentMonth]
    const currYear = currentYear

    // Previous period (month before)
    let prevMonthIndex = currentMonth - 1
    let prevYear = currentYear
    if (prevMonthIndex < 0) {
      prevMonthIndex = 11
      prevYear = currentYear - 1
    }
    const prevMonth = monthNames[prevMonthIndex]

    return {
      currentMonth: currMonth,
      currentYear: currYear.toString(),
      previousMonth: prevMonth,
      previousYear: prevYear.toString()
    }
  }

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const periods = calculatePeriods()
      const userAllowedBrands = localStorage.getItem('user_allowed_brands')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }

      if (userAllowedBrands) {
        headers['x-user-allowed-brands'] = userAllowedBrands
      }

      const params = new URLSearchParams({
        currentYear: periods.currentYear,
        currentMonth: periods.currentMonth,
        previousYear: periods.previousYear,
        previousMonth: periods.previousMonth,
        line: brand || 'All',
        squadLead: squadLead || 'All',
        channel: channel || 'All'
      })

      const response = await fetch(`/api/usc-business-performance/tier-movement?${params}`, {
        headers
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      console.error('❌ [Customer Tier Movement] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [brand, squadLead, channel])

  // Initial load
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Trigger fetch when search button clicked
  useEffect(() => {
    if (searchTrigger && searchTrigger > 0) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTrigger])

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

  // Get cell color based on movement type
  const getCellColor = (fromTier: number, toTier: number, value: number): string => {
    if (value === 0) return 'transparent'
    if (fromTier === toTier) return '#DBEAFE' // Blue - Stable
    if (fromTier > toTier) return '#FEE2E2' // Red - Downgrade
    return '#D1FAE5' // Green - Upgrade
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

          {/* Downgrades Card */}
          <div
            style={{
              backgroundColor: '#FEE2E2',
              borderRadius: '12px',
              padding: '16px',
              position: 'relative',
              border: '1px solid #FECACA',
              boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.08), 0 1px 4px 0 rgba(0, 0, 0, 0.04)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)'
              e.currentTarget.style.borderColor = '#FCA5A5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(0, 0, 0, 0.08), 0 1px 4px 0 rgba(0, 0, 0, 0.04)'
              e.currentTarget.style.borderColor = '#FECACA'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B', marginBottom: '8px' }}>
              Downgrades
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#DC2626' }}>
                {formatNumber(data.summary.downgradesCard.count)}
              </div>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EF4444"
                strokeWidth="2"
                style={{ position: 'absolute', top: '16px', right: '16px' }}
              >
                <path d="M13 17l5-5m0 0l-5-5m5 5H6" transform="rotate(180 12 12)" />
              </svg>
            </div>
            <div style={{ fontSize: '13px', color: '#991B1B', marginTop: '4px' }}>
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
                      const bgColor = getCellColor(row.fromTier, tier.tier, value)
                      return (
                        <td
                          key={tier.tier}
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            backgroundColor: bgColor,
                            borderBottom: '1px solid #E5E7EB',
                            fontWeight: row.fromTier === tier.tier ? 600 : 400,
                            color: value === 0 ? '#9CA3AF' : '#1F2937'
                          }}
                        >
                          {value === 0 ? '-' : formatNumber(value)}
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
    </div>
  )
}

