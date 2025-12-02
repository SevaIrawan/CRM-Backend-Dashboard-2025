'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'

interface CustomerDetailData {
  unique_code: string | null
  user_name: string | null
  periodA: {
    da: number
    ggr: number
    atv: number
    pf: number
    wr: number
  }
  periodB: {
    da: number
    ggr: number
    atv: number
    pf: number
    wr: number
    daChangePercent: number | null
    ggrChangePercent: number | null
    atvChangePercent: number | null
    pfChangePercent: number | null
    wrChangePercent: number | null
  }
}

interface CustomerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  uniqueCode: string | null
  userName: string | null
  periodAStart: string | null
  periodAEnd: string | null
  periodBStart: string | null
  periodBEnd: string | null
  line: string
  squadLead: string
  channel: string
  skipFetch?: boolean // ✅ Skip fetch if data already loaded in parent
  preloadedData?: CustomerDetailData | null // ✅ Pre-loaded data from parent
}

export default function CustomerDetailModal({
  isOpen,
  onClose,
  uniqueCode,
  userName,
  periodAStart,
  periodAEnd,
  periodBStart,
  periodBEnd,
  line,
  squadLead,
  channel,
  skipFetch = false, // ✅ Default: fetch data
  preloadedData = null // ✅ Pre-loaded data from parent
}: CustomerDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CustomerDetailData | null>(preloadedData || null) // ✅ Use preloaded data if available
  const [error, setError] = useState<string | null>(null)

  // Format number with thousand separator and 2 decimal places (for DA, GGR, ATV)
  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }

  // Format number with thousand separator and 2 decimal places (for PF)
  const formatDecimal = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }

  // Format date to MM/DD/YY
  const formatDateMMDDYY = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${month}/${day}/${year}`
  }

  // Format percentage: green for positive (+), red for negative (-), 2 decimal places
  const formatComparisonPercent = (percent: number | null): { text: string; color: string } => {
    if (percent === null || percent === undefined || isNaN(percent)) {
      return { text: '-', color: '#6B7280' }
    }
    
    const formattedValue = Math.abs(percent).toFixed(2)
    const sign = percent >= 0 ? '+' : '-'
    const color = percent >= 0 ? '#10B981' : '#EF4444'
    
    return {
      text: `${sign}${formattedValue}%`,
      color
    }
  }

  // ✅ Update data when preloadedData changes (if skipFetch is true)
  useEffect(() => {
    if (skipFetch && preloadedData) {
      setData(preloadedData)
      setLoading(false)
      setError(null)
    }
  }, [preloadedData, skipFetch])

  // Fetch customer detail data
  useEffect(() => {
    if (!isOpen || !uniqueCode) {
      setData(null)
      setError(null)
      return
    }

    // ✅ Skip fetch if data already loaded in parent
    if (skipFetch) {
      // Data will be set by preloadedData useEffect above
      return
    }

    const fetchDetail = async () => {
      setLoading(true)
      setError(null)

      try {
        if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
          throw new Error('Period data is missing')
        }

        const params = new URLSearchParams({
          uniqueCode: uniqueCode,
          periodAStart: periodAStart,
          periodAEnd: periodAEnd,
          periodBStart: periodBStart,
          periodBEnd: periodBEnd,
          line: line || 'All',
          squadLead: squadLead || 'All',
          channel: channel || 'All'
        })

        const response = await fetch(`/api/usc-business-performance/customer-detail?${params}`)

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          // If not JSON, likely an HTML error page
          const text = await response.text()
          console.error('❌ [Customer Detail Modal] Non-JSON response:', text.substring(0, 200))
          throw new Error(`Server returned non-JSON response (${response.status}). Please check the API endpoint.`)
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }))
          throw new Error(errorData.error || `Failed to fetch customer detail (Status: ${response.status})`)
        }

        const result = await response.json()
        setData(result)
      } catch (err: any) {
        console.error('❌ [Customer Detail Modal] Error:', err)
        setError(err.message || 'Failed to fetch customer detail')
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [isOpen, uniqueCode, periodAStart, periodAEnd, periodBStart, periodBEnd, line, squadLead, channel, skipFetch])

  if (!isOpen) return null

  const metrics = [
    {
      label: 'DA (USD)',
      periodAValue: data?.periodA.da || 0,
      periodBValue: data?.periodB.da || 0,
      changePercent: data?.periodB.daChangePercent || null,
      formatter: formatCurrency
    },
    {
      label: 'GGR (USD)',
      periodAValue: data?.periodA.ggr || 0,
      periodBValue: data?.periodB.ggr || 0,
      changePercent: data?.periodB.ggrChangePercent || null,
      formatter: formatCurrency
    },
    {
      label: 'ATV (USD)',
      periodAValue: data?.periodA.atv || 0,
      periodBValue: data?.periodB.atv || 0,
      changePercent: data?.periodB.atvChangePercent || null,
      formatter: formatCurrency
    },
    {
      label: 'PF',
      periodAValue: data?.periodA.pf || 0,
      periodBValue: data?.periodB.pf || 0,
      changePercent: data?.periodB.pfChangePercent || null,
      formatter: formatDecimal
    },
    {
      label: 'WR (%)',
      periodAValue: data?.periodA.wr || 0,
      periodBValue: data?.periodB.wr || 0,
      changePercent: data?.periodB.wrChangePercent || null,
      formatter: (num: number) => `${formatDecimal(num)}%`
    }
  ]

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={(e) => {
        // ✅ Only close if clicking directly on overlay (not on child elements)
        if (e.target === e.currentTarget) {
          e.stopPropagation() // ✅ Prevent event bubbling to parent modal
          e.preventDefault() // ✅ Prevent default behavior
          onClose()
        }
      }}
      onMouseDown={(e) => {
        // ✅ Prevent mousedown event from bubbling
        if (e.target === e.currentTarget) {
          e.stopPropagation()
        }
      }}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: '150px', // ✅ STANDARD: Header (90px) + Subheader (60px)
        left: '280px', // ✅ STANDARD: Sidebar width (fixed)
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10002, // ✅ Nested modal level 2 (parent modal 10001)
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#374151',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header - Title left, Period info right, Close button */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
              {userName || uniqueCode || 'Customer'}
            </h2>
            <div style={{ color: '#D1D5DB', fontSize: '14px' }}>
              Complete Metrics
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Period Info - Top Right aligned with title */}
            {periodAStart && periodAEnd && periodBStart && periodBEnd && (
              <div style={{ color: '#D1D5DB', fontSize: '14px', textAlign: 'right' }}>
                <div>Period A: {formatDateMMDDYY(periodAStart)} to {formatDateMMDDYY(periodAEnd)}</div>
                <div>Period B: {formatDateMMDDYY(periodBStart)} to {formatDateMMDDYY(periodBEnd)}</div>
              </div>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                fontSize: '24px',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4B5563'
                e.currentTarget.style.color = '#FFFFFF'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#9CA3AF'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <StandardLoadingSpinner message="Loading customer details..." />
          </div>
        )}

        {error && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>
            Error: {error}
          </div>
        )}

        {!loading && !error && data && (
          <div>
            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#1F2937', borderBottom: '2px solid #374151' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#FFFFFF', fontWeight: 600, fontSize: '14px' }}>
                    Metrics
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#FFFFFF', fontWeight: 600, fontSize: '14px' }}>
                    Period A
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#FFFFFF', fontWeight: 600, fontSize: '14px' }}>
                    Period B
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, index) => {
                  const change = formatComparisonPercent(metric.changePercent)
                  return (
                    <tr
                      key={metric.label}
                      style={{
                        backgroundColor: index % 2 === 0 ? '#4B5563' : '#374151',
                        borderBottom: '1px solid #6B7280'
                      }}
                    >
                      <td style={{ padding: '12px', color: '#FFFFFF', fontSize: '14px' }}>
                        {metric.label}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#D1D5DB', fontSize: '14px' }}>
                        {metric.formatter(metric.periodAValue)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <span style={{ color: '#D1D5DB' }}>
                            {metric.formatter(metric.periodBValue)}
                          </span>
                          {metric.changePercent !== null && (
                            <span style={{ color: change.color, fontWeight: 500, fontSize: '13px' }}>
                              ({change.text})
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
        )}
      </div>
    </div>,
    document.body
  )
}

