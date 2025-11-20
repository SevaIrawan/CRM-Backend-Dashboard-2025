'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrencyKPI, formatIntegerKPI } from '@/lib/formatHelpers'
import { getAllowedBrandsFromStorage } from '@/utils/brandAccessHelper'

interface OverdueTransaction {
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

interface OverdueDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  overdueCount: number
  line: string
  year: string
  month: string
  isDateRange?: boolean
  startDate?: string
  endDate?: string
  type?: 'deposit' | 'withdraw' // Type to determine which API endpoint to use
  timeRange?: '30s+' | '2m-5m' | '5m-30m' // Time range for overdue filter
}

export default function OverdueDetailsModal({
  isOpen,
  onClose,
  overdueCount,
  line,
  year,
  month,
  isDateRange = false,
  startDate,
  endDate,
  type = 'deposit', // Default to deposit for backward compatibility
  timeRange = '30s+' // Default to 30s+ for backward compatibility
}: OverdueDetailsModalProps) {
  const [transactions, setTransactions] = useState<OverdueTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(100)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [thresholdSec, setThresholdSec] = useState<number>(30)
  const [exporting, setExporting] = useState(false)

  // Reset page to 1 when limit changes
  useEffect(() => {
    if (isOpen) {
      setPage(1)
    }
  }, [limit, isOpen])

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchOverdueDetails()
    }
  }, [isOpen, line, year, month, isDateRange, startDate, endDate, page, limit, timeRange])

  const fetchOverdueDetails = async () => {
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
      
      // Add timeRange param
      params.append('timeRange', timeRange)
      
      // Determine API endpoint based on type
      const apiEndpoint = type === 'withdraw' 
        ? '/api/myr-auto-approval-withdraw/overdue-details'
        : '/api/myr-auto-approval-monitor/overdue-details'
      
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
        setTransactions(data.data.overdueTransactions || [])
        setTotalPages(data.data.pagination?.totalPages || 1)
        setTotalRecords(data.data.pagination?.totalRecords || 0)
        if (typeof data.data.thresholdSec === 'number') setThresholdSec(data.data.thresholdSec)
      } else {
        setError(data.details || data.error || 'Failed to fetch overdue details')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      setError(errorMessage)
      console.error('❌ Error fetching overdue details:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const typeLabel = type === 'withdraw' ? 'Approval' : 'Type'
      const csvHeaders = ['Date Time', typeLabel, 'Brand', 'Unique Code', 'User Name', 'Amount', 'Operator', 'Process Time', 'Processing Time (s)']
      
      // Determine API endpoint based on type
      const apiEndpoint = type === 'withdraw' 
        ? '/api/myr-auto-approval-withdraw/overdue-details'
        : '/api/myr-auto-approval-monitor/overdue-details'

      // ✅ Get user's allowed brands for Squad Lead filtering
      const allowedBrands = getAllowedBrandsFromStorage()
      const headers: HeadersInit = {}
      if (allowedBrands && allowedBrands.length > 0) {
        headers['x-user-allowed-brands'] = JSON.stringify(allowedBrands)
      }

      // Fetch all data in batches (API max limit is 1000)
      const exportLimit = 1000
      const allTransactions: OverdueTransaction[] = []
      let currentPage = 1
      let hasMore = true

      while (hasMore) {
        const params = new URLSearchParams({
          line,
          year,
          month,
          page: String(currentPage),
          limit: String(exportLimit)
        })
        
        // Add date range params if in daily mode
        if (isDateRange && startDate && endDate) {
          params.append('isDateRange', 'true')
          params.append('startDate', startDate)
          params.append('endDate', endDate)
        }
        
        // Add timeRange param
        params.append('timeRange', timeRange)
        
        const response = await fetch(`${apiEndpoint}?${params}`, { headers })
        const data = await response.json()
        
        if (data.success && data.data.overdueTransactions) {
          allTransactions.push(...data.data.overdueTransactions)
          
          // Check if there are more pages
          const totalPages = data.data.pagination?.totalPages || 1
          hasMore = currentPage < totalPages
          currentPage++
        } else {
          hasMore = false
        }
      }

      // Create CSV content
      const rows = allTransactions.map((t: OverdueTransaction) => {
        const dateTime = t.time ? `${t.date} ${t.time}` : t.date
        const typeOrApproval = type === 'withdraw' ? (t.approval || 'N/A') : (t.type || 'N/A')
        return [
          dateTime,
          typeOrApproval,
          t.line,
          t.uniqueCode,
          t.userName,
          String(t.amount),
          t.operator,
          t.processTime,
          String(t.procSec)
        ].map(cell => `"${cell}"`).join(',')
      })
      
      const csvContent = [
        csvHeaders.map(h => `"${h}"`).join(','),
        ...rows
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      const transactionType = type === 'withdraw' ? 'withdraw' : 'deposit'
      link.setAttribute('download', `overdue-${transactionType}-transactions-${line}-${year}-${month}-ALL-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('❌ Error exporting overdue transactions:', err)
      alert('Failed to export overdue transactions')
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
        className="bg-white rounded-lg shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          width: '100%',
          maxWidth: '95vw',
          maxHeight: '75vh',
          margin: 'auto',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Overdue Transactions Details
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {overdueCount} cases • {line} • {year} • {month}
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
              <span className="ml-2 text-gray-600">Loading overdue transactions...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">❌ Error</div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchOverdueDetails}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">📭 No Data</div>
              <p className="text-gray-600">No overdue transactions found for the selected filters</p>
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
                overflowY: 'auto',
                maxHeight: '510px', // Max 10 rows visible dengan scroll
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
                        {`Threshold >${thresholdSec}s`}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction, index) => (
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
                          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 inline-block">
                            {transaction.procSec}s
                          </span>
                        </td>
                      </tr>
                    ))}
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
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {formatIntegerKPI(totalRecords)} overdue transactions
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
