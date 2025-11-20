'use client'

import React, { useState, useEffect } from 'react'
import StandardModal, { StandardPagination, StandardExportButton, MODAL_STYLES, getTableMaxHeight, getTableOverflow } from './StandardModal'
import { formatCurrencyKPI, formatIntegerKPI } from '@/lib/formatHelpers'
import { getAllowedBrandsFromStorage } from '@/utils/brandAccessHelper'

interface TotalTransaction {
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

interface TotalTransactionsDetailsModalProps {
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

export default function TotalTransactionsDetailsModal({
  isOpen,
  onClose,
  totalCount,
  line,
  year,
  month,
  isDateRange = false,
  startDate,
  endDate,
  type = 'deposit' // Default to deposit for backward compatibility
}: TotalTransactionsDetailsModalProps) {
  const [transactions, setTransactions] = useState<TotalTransaction[]>([])
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
      fetchTotalTransactionsDetails()
    }
  }, [isOpen, line, year, month, isDateRange, startDate, endDate, page, limit])

  const fetchTotalTransactionsDetails = async () => {
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
        ? '/api/myr-auto-approval-withdraw/total-transactions-details'
        : '/api/myr-auto-approval-monitor/total-transactions-details'
      
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
        setTransactions(data.data.totalTransactions || [])
        setTotalPages(data.data.pagination?.totalPages || 1)
        setTotalRecords(data.data.pagination?.totalRecords || 0)
      } else {
        setError(data.details || data.error || 'Failed to fetch total transactions details')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      setError(errorMessage)
      console.error('❌ Error fetching total transactions details:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const typeLabel = type === 'withdraw' ? 'Approval' : 'Type'
      const headers = ['Date Time', typeLabel, 'Brand', 'Unique Code', 'User Name', 'Amount', 'Operator', 'Process Time', 'Processing Time (s)']
      const allRows: string[] = []
      allRows.push(headers.join(','))

      // Determine API endpoint based on type
      const apiEndpoint = type === 'withdraw' 
        ? '/api/myr-auto-approval-withdraw/total-transactions-details'
        : '/api/myr-auto-approval-monitor/total-transactions-details'

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
        const rows: TotalTransaction[] = json?.data?.totalTransactions || []
        if (!rows.length) break
        rows.forEach(t => {
          const dateTime = t.time ? `${t.date} ${t.time}` : t.date
          const typeOrApproval = type === 'withdraw' ? (t.approval || 'N/A') : (t.type || 'N/A')
          allRows.push([
            dateTime,
            typeOrApproval,
            t.line,
            t.uniqueCode,
            t.userName,
            String(t.amount),
            t.operator,
            t.processTime,
            String(t.procSec)
          ].join(','))
        })
      }

      const csvContent = allRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const transactionType = type === 'withdraw' ? 'withdraw' : 'deposit'
      a.download = `total-${transactionType}-transactions-${line}-${year}-${month}-ALL-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const showPagination = totalRecords >= 100
  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, totalRecords)

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Total Transactions Details"
      subtitle={`${totalCount.toLocaleString()} cases • ${line} • ${year} • ${month}`}
      footer={
        transactions.length > 0 ? (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%'
          }}>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              Showing {startIndex} - {endIndex} of {formatIntegerKPI(totalRecords)} records
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {showPagination && totalPages > 1 && (
                <StandardPagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  limit={limit}
                  onLimitChange={setLimit}
                  totalRecords={totalRecords}
                  showLimitDropdown={true}
                />
              )}
              <StandardExportButton
                onClick={handleExport}
                exporting={exporting}
                disabled={transactions.length === 0}
              />
            </div>
          </div>
        ) : undefined
      }
    >

      {/* Content */}
      <div style={{
        padding: '20px 24px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '16px', color: '#6B7280' }}>Loading total transactions...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: '#EF4444', marginBottom: '8px' }}>❌ Error</div>
            <p style={{ color: '#6B7280', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={fetchTotalTransactionsDetails}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
            <div style={{ marginBottom: '8px' }}>📭 No Data</div>
            <p>No transactions found for the selected filters</p>
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
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #e0e0e0',
                    fontSize: '14px'
                  }}
                >
                  <thead style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#374151',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <tr>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>
                        Date Time
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>
                        {type === 'withdraw' ? 'Approval' : 'Type'}
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>
                        Brand
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>
                        Unique Code
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>
                        User Name
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>
                        Amount
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>
                        Operator
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>
                        Process Time
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', whiteSpace: 'nowrap', borderBottom: '2px solid #4b5563' }}>
                        Threshold
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction, index) => (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {transaction.time ? `${transaction.date} ${transaction.time}` : transaction.date}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {type === 'withdraw' ? transaction.approval : transaction.type}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {transaction.line}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {transaction.uniqueCode}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {transaction.userName}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {formatCurrencyKPI(transaction.amount, 'MYR')}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {transaction.operator}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', whiteSpace: 'nowrap', fontSize: '14px' }}>
                          {transaction.processTime}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', textAlign: 'center', fontSize: '14px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '9999px', fontSize: '12px', backgroundColor: '#D1FAE5', color: '#059669', display: 'inline-block' }}>
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
    </StandardModal>
  )
}

