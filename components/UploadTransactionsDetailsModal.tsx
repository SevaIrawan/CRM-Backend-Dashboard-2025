'use client'

import React, { useState, useEffect } from 'react'
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
  const [sliceVisible, setSliceVisible] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [exporting, setExporting] = useState(false)

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
      // Fetch all data for export (no pagination)
      const params = new URLSearchParams({
        line,
        year,
        month,
        page: '1',
        limit: '10000' // Large limit to get all data
      })
      
      if (isDateRange && startDate && endDate) {
        params.append('isDateRange', 'true')
        params.append('startDate', startDate)
        params.append('endDate', endDate)
      }
      
      const allowedBrands = getAllowedBrandsFromStorage()
      const headers: HeadersInit = {}
      if (allowedBrands && allowedBrands.length > 0) {
        headers['x-user-allowed-brands'] = JSON.stringify(allowedBrands)
      }
      
      const response = await fetch(`/api/myr-auto-approval-monitor/upload-transactions-details?${params}`, { headers })
      const data = await response.json()
      
      if (data.success) {
        const allTransactions = data.data.uploadTransactions
        
        // Create CSV content
        const headers = ['Date', 'Time', 'Type', 'Line', 'Unique Code', 'User Name', 'Amount', 'Operator', 'Process Time', 'Proc Sec']
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
          headers.join(','),
          ...rows.map((row: string[]) => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `upload-transactions-${line}-${year}-${month}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('❌ Error exporting upload transactions:', err)
      alert('Failed to export upload transactions')
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen) return null

  const displayedTransactions = transactions.slice(0, sliceVisible)
  const showingFrom = (page - 1) * limit + 1
  const showingTo = Math.min(page * limit, totalRecords)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 0,
        margin: 0
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1400px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          margin: 'auto'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '2px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1F2937' }}>
            Upload Transactions Details
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '16px', color: '#6B7280' }}>Loading upload transactions...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#EF4444' }}>
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
              No upload transactions found
            </div>
          ) : (
            <>
              {/* Table */}
              <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}
                >
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #374151' }}>Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #374151' }}>Time</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #374151' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #374151' }}>Line</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #374151' }}>Unique Code</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #374151' }}>User Name</th>
                      <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #374151' }}>Amount</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #374151' }}>Operator</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #374151' }}>Process Time</th>
                      <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #374151' }}>Proc Sec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedTransactions.map((transaction, index) => (
                      <tr
                        key={index}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                          borderBottom: '1px solid #E5E7EB'
                        }}
                      >
                        <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{transaction.date}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{transaction.time || '-'}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{transaction.type || 'Upload'}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{transaction.line}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{transaction.uniqueCode}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{transaction.userName}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB', textAlign: 'right' }}>
                          {formatCurrencyKPI(transaction.amount, 'MYR')}
                        </td>
                        <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{transaction.operator}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB' }}>{transaction.processTime}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #E5E7EB', textAlign: 'right' }}>{transaction.procSec}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>
                  Showing {showingFrom} to {showingTo} of {formatIntegerKPI(totalRecords)} upload transactions
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: page === 1 ? '#E5E7EB' : '#3B82F6',
                      color: page === 1 ? '#9CA3AF' : '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: page === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '8px 16px', fontSize: '14px', color: '#1F2937' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: page === totalPages ? '#E5E7EB' : '#3B82F6',
                      color: page === totalPages ? '#9CA3AF' : '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '2px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
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
              cursor: 'pointer'
            }}
          >
            Back
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || transactions.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: exporting ? '#9CA3AF' : '#10b981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: exporting || transactions.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>
    </div>
  )
}

