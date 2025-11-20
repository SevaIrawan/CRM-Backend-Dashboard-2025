'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrencyKPI, formatIntegerKPI } from '@/lib/formatHelpers'
import { getAllowedBrandsFromStorage } from '@/utils/brandAccessHelper'

interface UploadTransaction {
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

interface UploadTransactionsDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  uploadCount: number
  line: string
  year: string
  month: string
  isDateRange?: boolean
  startDate?: string
  endDate?: string
}

export default function UploadTransactionsDetailsModal({
  isOpen,
  onClose,
  uploadCount,
  line,
  year,
  month,
  isDateRange = false,
  startDate,
  endDate
}: UploadTransactionsDetailsModalProps) {
  const [transactions, setTransactions] = useState<UploadTransaction[]>([])
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

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUploadTransactionsDetails()
    }
  }, [isOpen, line, year, month, isDateRange, startDate, endDate, page, limit])

  const fetchUploadTransactionsDetails = async () => {
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
      
      // ✅ Get user's allowed brands for Squad Lead filtering
      const allowedBrands = getAllowedBrandsFromStorage()
      const headers: HeadersInit = {}
      if (allowedBrands && allowedBrands.length > 0) {
        headers['x-user-allowed-brands'] = JSON.stringify(allowedBrands)
      }
      
      const response = await fetch(`/api/myr-auto-approval-monitor/upload-transactions-details?${params}`, { headers })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setTransactions(data.data.uploadTransactions || [])
        setTotalPages(data.data.pagination?.totalPages || 1)
        setTotalRecords(data.data.pagination?.totalRecords || 0)
      } else {
        setError(data.details || data.error || 'Failed to fetch upload transactions')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch upload transactions'
      setError(errorMessage)
      console.error('❌ Error fetching upload transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const allowedBrands = getAllowedBrandsFromStorage()
      const headers: HeadersInit = {}
      if (allowedBrands && allowedBrands.length > 0) {
        headers['x-user-allowed-brands'] = JSON.stringify(allowedBrands)
      }

      // Fetch all data in batches (API max limit is 1000)
      const exportLimit = 1000
      const allTransactions: UploadTransaction[] = []
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
        
        if (isDateRange && startDate && endDate) {
          params.append('isDateRange', 'true')
          params.append('startDate', startDate)
          params.append('endDate', endDate)
        }
        
        const response = await fetch(`/api/myr-auto-approval-monitor/upload-transactions-details?${params}`, { headers })
        const data = await response.json()
        
        if (data.success && data.data.uploadTransactions) {
          allTransactions.push(...data.data.uploadTransactions)
          
          // Check if there are more pages
          const totalPages = data.data.pagination?.totalPages || 1
          hasMore = currentPage < totalPages
          currentPage++
        } else {
          hasMore = false
        }
      }
      
      // Create CSV content
      const csvHeaders = ['Date', 'Time', 'Type', 'Line', 'Unique Code', 'User Name', 'Amount', 'Operator', 'Process Time', 'Proc Sec']
      const rows = allTransactions.map((t: UploadTransaction) => [
        t.date,
        t.time || '',
        t.type || 'Upload',
        t.line,
        t.uniqueCode,
        t.userName,
        t.amount.toString(),
        t.operator,
        t.processTime,
        t.procSec.toString()
      ])
      
      const csvContent = [
        csvHeaders.join(','),
        ...rows.map((row: string[]) => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `upload-transactions-${line}-${year}-${month}-ALL-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('❌ Error exporting upload transactions:', err)
      alert('Failed to export upload transactions')
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') return null

  const showPagination = totalRecords >= 100
  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, totalRecords)

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
        top: '150px',
        left: '280px',
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
              Upload Transactions Details
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {uploadCount.toLocaleString()} cases • {line} • {year} • {month}
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
              <span className="ml-2 text-gray-600">Loading upload transactions...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">❌ Error</div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchUploadTransactionsDetails}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">📭 No Data</div>
              <p className="text-gray-600">No upload transactions found for the selected filters</p>
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
                maxHeight: totalRecords >= 100 ? 'none' : '418px',
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
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>Date</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>Time</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>Type</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>Line</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>Unique Code</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>User Name</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>Amount</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>Operator</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>Process Time</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>Proc Sec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction, index) => (
                      <tr
                        key={index}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                        }}
                      >
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', fontSize: '14px' }}>{transaction.date}</td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', fontSize: '14px' }}>{transaction.time || '-'}</td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', fontSize: '14px' }}>{transaction.type || 'Upload'}</td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', fontSize: '14px' }}>{transaction.line}</td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', fontSize: '14px' }}>{transaction.uniqueCode}</td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', fontSize: '14px' }}>{transaction.userName}</td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', fontSize: '14px', textAlign: 'right' }}>
                          {formatCurrencyKPI(transaction.amount, 'MYR')}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', fontSize: '14px' }}>{transaction.operator}</td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', fontSize: '14px' }}>{transaction.processTime}</td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', fontSize: '14px', textAlign: 'right' }}>{transaction.procSec}</td>
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
              Showing {startIndex} to {endIndex} of {formatIntegerKPI(totalRecords)} records
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {showPagination && totalPages > 1 && (
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
