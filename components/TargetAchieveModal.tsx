'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrencyKPI, formatIntegerKPI } from '@/lib/formatHelpers'

interface TargetAchieveDetail {
  brand: string
  // GGR
  ggrCurrent: number
  ggrTarget: number | null
  ggrPercentage: number | null
  ggrStatus: 'On Track' | 'Behind' | 'Risk' | 'N/A'
  // Deposit Cases
  dcCurrent: number
  dcTarget: number | null
  dcPercentage: number | null
  dcStatus: 'On Track' | 'Behind' | 'Risk' | 'N/A'
  // Deposit Amount
  daCurrent: number
  daTarget: number | null
  daPercentage: number | null
  daStatus: 'On Track' | 'Behind' | 'Risk' | 'N/A'
  // Active Member
  amCurrent: number
  amTarget: number | null
  amPercentage: number | null
  amStatus: 'On Track' | 'Behind' | 'Risk' | 'N/A'
}

interface TargetAchieveModalProps {
  isOpen: boolean
  onClose: () => void
  currency: string
  year: string
  quarter: string
  startDate: string
  endDate: string
  isDateRange: boolean
}

export default function TargetAchieveModal({
  isOpen,
  onClose,
  currency,
  year,
  quarter,
  startDate,
  endDate,
  isDateRange
}: TargetAchieveModalProps) {
  const [data, setData] = useState<TargetAchieveDetail[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, year, quarter, startDate, endDate, isDateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        currency,
        year,
        quarter,
        isDateRange: isDateRange.toString(),
        ...(isDateRange && { startDate, endDate })
      })

      const response = await fetch(`/api/myr-business-performance/target-achieve-details?${params}`)
      const result = await response.json()
      
      if (result.details) {
        setData(result.details)
      }
    } catch (error) {
      console.error('Error fetching target achieve details:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'On Track':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#10b981" stroke="#059669" strokeWidth="2"/>
            <path d="M6 10L8.5 12.5L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      case 'Behind':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#f97316" stroke="#ea580c" strokeWidth="2"/>
            <path d="M10 6V11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="10" cy="14" r="0.5" fill="white" stroke="white" strokeWidth="1.5"/>
          </svg>
        )
      case 'Risk':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#ef4444" stroke="#dc2626" strokeWidth="2"/>
            <path d="M7 7L13 13M13 7L7 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )
      default: // N/A
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#9ca3af" stroke="#6b7280" strokeWidth="2"/>
            <path d="M7 10H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )
    }
  }

  const handleExport = () => {
    // Prepare CSV data
    const headers = [
      'Brand',
      'GGR Current', 'GGR Target', 'GGR %', 'GGR Status',
      'DC Current', 'DC Target', 'DC %', 'DC Status',
      'DA Current', 'DA Target', 'DA %', 'DA Status',
      'AM Current', 'AM Target', 'AM %', 'AM Status'
    ]
    
    const rows = data.map(row => [
      row.brand,
      row.ggrCurrent,
      row.ggrTarget ?? 'N/A',
      row.ggrPercentage !== null ? `${row.ggrPercentage.toFixed(2)}%` : 'N/A',
      row.ggrStatus,
      row.dcCurrent,
      row.dcTarget ?? 'N/A',
      row.dcPercentage !== null ? `${row.dcPercentage.toFixed(2)}%` : 'N/A',
      row.dcStatus,
      row.daCurrent,
      row.daTarget ?? 'N/A',
      row.daPercentage !== null ? `${row.daPercentage.toFixed(2)}%` : 'N/A',
      row.daStatus,
      row.amCurrent,
      row.amTarget ?? 'N/A',
      row.amPercentage !== null ? `${row.amPercentage.toFixed(2)}%` : 'N/A',
      row.amStatus
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Target_Achieve_${currency}_${year}_${quarter}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: '150px', // Header (90px) + Subheader (60px)
        left: '280px', // Sidebar width
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        width: '95%',
        maxWidth: '1400px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '2px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '4px'
            }}>
              Target Achieve Details - {currency}
            </h2>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: '#6b7280',
              fontWeight: 500
            }}>
              {isDateRange 
                ? `${startDate} to ${endDate}`
                : `${quarter} ${year}`
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleExport}
              style={{
                padding: '10px 20px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#059669'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#10b981'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              📥 Export CSV
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6B7280',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4B5563'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6B7280'
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Loading...
            </div>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#374151' }}>
                  <th rowSpan={2} style={{
                    padding: '14px 12px',
                    textAlign: 'left',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderRight: '1px solid #4b5563',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#374151',
                    zIndex: 10,
                    whiteSpace: 'nowrap'
                  }}>
                    Brand
                  </th>
                  <th colSpan={4} style={{
                    padding: '14px 12px',
                    textAlign: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderRight: '1px solid #4b5563',
                    borderBottom: '1px solid #4b5563'
                  }}>
                    Gross Gaming Revenue
                  </th>
                  <th colSpan={4} style={{
                    padding: '14px 12px',
                    textAlign: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderRight: '1px solid #4b5563',
                    borderBottom: '1px solid #4b5563'
                  }}>
                    Deposit Cases
                  </th>
                  <th colSpan={4} style={{
                    padding: '14px 12px',
                    textAlign: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderRight: '1px solid #4b5563',
                    borderBottom: '1px solid #4b5563'
                  }}>
                    Deposit Amount
                  </th>
                  <th colSpan={4} style={{
                    padding: '14px 12px',
                    textAlign: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #4b5563'
                  }}>
                    Active Member
                  </th>
                </tr>
                <tr style={{ backgroundColor: '#374151' }}>
                  {[...Array(4)].map((_, groupIdx) => (
                    <>
                      <th style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '11px',
                        borderRight: '1px solid #4b5563',
                        position: 'sticky',
                        top: 0,
                        backgroundColor: '#374151',
                        zIndex: 10,
                        whiteSpace: 'nowrap'
                      }}>Current</th>
                      <th style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '11px',
                        borderRight: '1px solid #4b5563',
                        position: 'sticky',
                        top: 0,
                        backgroundColor: '#374151',
                        zIndex: 10,
                        whiteSpace: 'nowrap'
                      }}>Target</th>
                      <th style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '11px',
                        borderRight: '1px solid #4b5563',
                        position: 'sticky',
                        top: 0,
                        backgroundColor: '#374151',
                        zIndex: 10,
                        whiteSpace: 'nowrap'
                      }}>%</th>
                      <th style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '11px',
                        borderRight: groupIdx < 3 ? '1px solid #4b5563' : 'none',
                        position: 'sticky',
                        top: 0,
                        backgroundColor: '#374151',
                        zIndex: 10,
                        whiteSpace: 'nowrap'
                      }}>Status</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={row.brand} style={{
                    backgroundColor: row.brand === 'MYR' ? '#f3f4f6' : idx % 2 === 0 ? 'white' : '#fafafa',
                    fontWeight: row.brand === 'MYR' ? 700 : 400
                  }}>
                    <td style={{
                      padding: '12px',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      fontWeight: 700,
                      color: '#111827',
                      whiteSpace: 'nowrap'
                    }}>
                      {row.brand}
                    </td>
                    {/* GGR */}
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: '#111827',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatCurrencyKPI(row.ggrCurrent, currency)}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: row.ggrTarget === null ? '#9ca3af' : '#111827',
                      whiteSpace: 'nowrap'
                    }}>
                      {row.ggrTarget !== null ? formatCurrencyKPI(row.ggrTarget, currency) : '-'}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: row.ggrPercentage === null ? '#9ca3af' : '#111827',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      {row.ggrPercentage !== null ? `${row.ggrPercentage.toFixed(2)}%` : '-'}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb'
                    }}>
                      {getStatusIcon(row.ggrStatus)}
                    </td>
                    {/* DC */}
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: '#111827',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatIntegerKPI(row.dcCurrent)}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: row.dcTarget === null ? '#9ca3af' : '#111827',
                      whiteSpace: 'nowrap'
                    }}>
                      {row.dcTarget !== null ? formatIntegerKPI(row.dcTarget) : '-'}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: row.dcPercentage === null ? '#9ca3af' : '#111827',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      {row.dcPercentage !== null ? `${row.dcPercentage.toFixed(2)}%` : '-'}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb'
                    }}>
                      {getStatusIcon(row.dcStatus)}
                    </td>
                    {/* DA */}
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: '#111827',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatCurrencyKPI(row.daCurrent, currency)}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: row.daTarget === null ? '#9ca3af' : '#111827',
                      whiteSpace: 'nowrap'
                    }}>
                      {row.daTarget !== null ? formatCurrencyKPI(row.daTarget, currency) : '-'}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: row.daPercentage === null ? '#9ca3af' : '#111827',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      {row.daPercentage !== null ? `${row.daPercentage.toFixed(2)}%` : '-'}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb'
                    }}>
                      {getStatusIcon(row.daStatus)}
                    </td>
                    {/* AM */}
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: '#111827',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatIntegerKPI(row.amCurrent)}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: row.amTarget === null ? '#9ca3af' : '#111827',
                      whiteSpace: 'nowrap'
                    }}>
                      {row.amTarget !== null ? formatIntegerKPI(row.amTarget) : '-'}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      color: row.amPercentage === null ? '#9ca3af' : '#111827',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      {row.amPercentage !== null ? `${row.amPercentage.toFixed(2)}%` : '-'}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      {getStatusIcon(row.amStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

