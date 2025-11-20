'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrencyKPI, formatIntegerKPI } from '@/lib/formatHelpers'
import { getAllowedBrandsFromStorage } from '@/utils/brandAccessHelper'

interface AutomationTransaction {
  date: string
  time?: string
  type?: string
  approval?: string
  line: string
  uniqueCode: string
  userName: string
  amount: number
  operator: string
  processTime: string
  procSec: number
}

interface AutomationTransactionsModalProps {
  isOpen: boolean
  onClose: () => void
  totalCount: number
  line: string
  year: string
  month: string
  isDateRange?: boolean
  startDate?: string
  endDate?: string
  type?: 'deposit' | 'withdraw' // Type to determine which API endpoint to use
}

export default function AutomationTransactionsModal({
  isOpen,
  onClose,
  totalCount,
  line,
  year,
  month,
  isDateRange = false,
  startDate,
  endDate,
  type = 'deposit' // Default to deposit
}: AutomationTransactionsModalProps) {
  const [transactions, setTransactions] = useState<AutomationTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(100)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [exporting, setExporting] = useState(false)

  // Reset page to 1 when limit changes
  useEffect(() => {
    if (isOpen) {
      setPage(1)
    }
  }, [limit, isOpen])

  // Helper function to get processing time color
  const getProcTimeColor = (procSec: number) => {
    if (procSec <= 10) return '#059669' // Green - Fast
    if (procSec <= 30) return '#f59e0b' // Yellow - Normal
    return '#dc2626' // Red - Slow/Overdue
  }

  // Helper function to get processing time badge style
  const getProcTimeBadge = (procSec: number) => {
    if (procSec <= 10) {
      return { bg: '#D1FAE5', text: '#059669', label: 'Fast' }
    }
    if (procSec <= 30) {
      return { bg: '#FEF3C7', text: '#f59e0b', label: 'Normal' }
    }
    return { bg: '#FEE2E2', text: '#dc2626', label: 'Slow' }
  }

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAutomationDetails()
    }
  }, [isOpen, line, year, month, isDateRange, startDate, endDate, page, limit])

  const fetchAutomationDetails = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        line,
        year,
        month,
        page: String(page),
        limit: String(limit)
      })
      
      // Add date range params if in daily mode
      if (isDateRange && startDate && endDate) {
        params.append('isDateRange', 'true')
        params.append('startDate', startDate)
        params.append('endDate', endDate)
      }
      
      // Determine API endpoint based on type
      const apiEndpoint = type === 'withdraw' 
        ? '/api/myr-auto-approval-withdraw/automation-details'
        : '/api/myr-auto-approval-monitor/automation-details'
      
      // ✅ Get user's allowed brands for Squad Lead filtering
      const allowedBrands = getAllowedBrandsFromStorage()
      const headers: HeadersInit = {}
      if (allowedBrands && allowedBrands.length > 0) {
        headers['x-user-allowed-brands'] = JSON.stringify(allowedBrands)
      }
      
      const response = await fetch(`${apiEndpoint}?${params}`, { headers })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setTransactions(data.data.automationTransactions || [])
        setTotalPages(data.data.pagination?.totalPages || 1)
        setTotalRecords(data.data.pagination?.totalRecords || 0)
      } else {
        setError(data.details || data.error || 'Failed to fetch automation transaction details')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      setError(errorMessage)
      console.error('❌ Error fetching automation details:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const typeLabel = type === 'withdraw' ? 'Approval' : 'Type'
      const headers = ['Date Time', typeLabel, 'Brand', 'Unique Code', 'User Name', 'Amount', 'Operator', 'Process Time', 'Processing Time (s)', 'Status']
      const allRows: string[] = []
      allRows.push(headers.join(','))

      // Determine API endpoint based on type
      const apiEndpoint = type === 'withdraw' 
        ? '/api/myr-auto-approval-withdraw/automation-details'
        : '/api/myr-auto-approval-monitor/automation-details'

      // Fetch all pages in batches of 1000 rows
      const exportLimit = 1000
      const pages = Math.max(1, Math.ceil(totalRecords / exportLimit))
      for (let p = 1; p <= pages; p++) {
        const params = new URLSearchParams({
          line,
          year,
          month,
          page: String(p),
          limit: String(exportLimit)
        })
        
        // Add date range params if in daily mode
        if (isDateRange && startDate && endDate) {
          params.append('isDateRange', 'true')
          params.append('startDate', startDate)
          params.append('endDate', endDate)
        }
        
        // ✅ Get user's allowed brands for Squad Lead filtering
        const allowedBrands = getAllowedBrandsFromStorage()
        const headers: HeadersInit = {}
        if (allowedBrands && allowedBrands.length > 0) {
          headers['x-user-allowed-brands'] = JSON.stringify(allowedBrands)
        }
        
        const res = await fetch(`${apiEndpoint}?${params}`, { headers })
        const json = await res.json()
        const rows: AutomationTransaction[] = json?.data?.automationTransactions || []
        if (!rows.length) break
        rows.forEach(t => {
          const dateTime = t.time ? `${t.date} ${t.time}` : t.date
          const typeOrApproval = type === 'withdraw' ? (t.approval || 'N/A') : (t.type || 'N/A')
          const status = t.procSec <= 10 ? 'Fast' : t.procSec <= 30 ? 'Normal' : 'Slow'
          allRows.push([
            dateTime,
            typeOrApproval,
            t.line,
            t.uniqueCode,
            t.userName,
            String(t.amount),
            t.operator,
            t.processTime,
            String(t.procSec),
            status
          ].join(','))
        })
      }

      const csvContent = allRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const transactionType = type === 'withdraw' ? 'withdraw' : 'deposit'
      a.download = `automation-${transactionType}-transactions-${line}-${year}-${month}-ALL-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed bg-black bg-opacity-50 flex items-center justify-center"
      style={{ 
        padding: 0, 
        margin: 0,
        zIndex: 10000,
        top: '150px', // Header (90px) + Subheader (60px)
        left: '280px', // Sidebar width
        right: 0,
        bottom: 0
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          margin: 'auto',
          maxHeight: '75vh',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Automation Transactions Details
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalCount.toLocaleString()} cases • {line} • {year} • {month}
            </p>
          </div>
          <div className="flex gap-2">
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

        {/* Content */}
        <div style={{ 
          padding: '20px 24px', 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          overflow: 'hidden',
          minHeight: 0
        }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading automation transactions...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">❌ Error</div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchAutomationDetails}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">📭 No Data</div>
              <p className="text-gray-600">No automation transactions found for the selected filters</p>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              flex: 1, 
              overflow: 'hidden',
              minHeight: 0
            }}>
              <div style={{
                overflowX: 'auto',
                overflowY: totalRecords >= 100 ? 'visible' : 'auto',
                maxHeight: totalRecords >= 100 ? 'none' : '418px', // 1 header (38px) + 10 rows (10 * 38px) = 418px
                flex: 1,
                minHeight: 0,
                position: 'relative'
              }}>
                <table className="min-w-full" style={{ borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
                  <thead style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#374151',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <tr>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap' }}>
                        Date Time
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap' }}>
                        {type === 'withdraw' ? 'Approval' : 'Type'}
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap' }}>
                        Brand
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap' }}>
                        Unique Code
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap' }}>
                        User Name
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap' }}>
                        Amount
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap' }}>
                        Operator
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap' }}>
                        Process Time
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction, index) => {
                      const badge = getProcTimeBadge(transaction.procSec)
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" style={{ border: '1px solid #e5e7eb' }}>
                            {transaction.time ? `${transaction.date} ${transaction.time}` : transaction.date}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" style={{ border: '1px solid #e5e7eb' }}>
                            {type === 'withdraw' ? transaction.approval : transaction.type}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" style={{ border: '1px solid #e5e7eb' }}>
                            {transaction.line}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" style={{ border: '1px solid #e5e7eb' }}>
                            {transaction.uniqueCode}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" style={{ border: '1px solid #e5e7eb' }}>
                            {transaction.userName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" style={{ border: '1px solid #e5e7eb' }}>
                            {formatCurrencyKPI(transaction.amount, 'MYR')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" style={{ border: '1px solid #e5e7eb' }}>
                            {transaction.operator}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" style={{ border: '1px solid #e5e7eb' }}>
                            {transaction.processTime}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center" style={{ border: '1px solid #e5e7eb' }}>
                            <span 
                              className="px-3 py-1 rounded-full text-xs font-semibold inline-block"
                              style={{ 
                                backgroundColor: badge.bg,
                                color: badge.text
                              }}
                            >
                              {transaction.procSec.toFixed(1)}s • {badge.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination and Export */}
        {transactions.length > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px 24px',
            borderTop: '1px solid #e5e7eb',
            flexShrink: 0
          }}>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: 500 }}>
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {formatIntegerKPI(totalRecords)} automation transactions
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {totalRecords >= 100 && totalPages > 1 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: '#374151',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (page !== 1) {
                        e.currentTarget.style.borderColor = '#9ca3af'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }}
                  >
                    ← Prev
                  </button>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#6b7280', 
                    fontWeight: 500,
                    whiteSpace: 'nowrap'
                  }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: '#374151',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (page !== totalPages) {
                        e.currentTarget.style.borderColor = '#9ca3af'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
              <button
                onClick={handleExport}
                disabled={exporting}
                style={{
                  padding: '6px 12px',
                  backgroundColor: exporting ? '#f3f4f6' : '#10b981',
                  color: exporting ? '#9ca3af' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!exporting) {
                    e.currentTarget.style.backgroundColor = '#059669'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!exporting) {
                    e.currentTarget.style.backgroundColor = '#10b981'
                  }
                }}
              >
                {exporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

