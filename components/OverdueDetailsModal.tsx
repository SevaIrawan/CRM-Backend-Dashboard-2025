'use client'

import React, { useState, useEffect } from 'react'
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
  const [sliceVisible, setSliceVisible] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [thresholdSec, setThresholdSec] = useState<number>(30)
  const [exporting, setExporting] = useState(false)

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
      const headers = ['Date Time', typeLabel, 'Brand', 'Unique Code', 'User Name', 'Amount', 'Operator', 'Process Time', 'Processing Time (s)']
      const allRows: string[] = []
      allRows.push(headers.join(','))

      // Determine API endpoint based on type
      const apiEndpoint = type === 'withdraw' 
        ? '/api/myr-auto-approval-withdraw/overdue-details'
        : '/api/myr-auto-approval-monitor/overdue-details'

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
        const rows: OverdueTransaction[] = json?.data?.overdueTransactions || []
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
      a.download = `overdue-${transactionType}-transactions-${line}-${year}-${month}-ALL-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
      style={{ padding: 0, margin: 0 }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ margin: 'auto' }}
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
              onClick={handleExport}
              disabled={exporting}
              className={`px-4 py-2 text-white rounded-md transition-colors ${exporting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {exporting ? 'Exporting…' : 'Export CSV (All)'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
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
            <div className="overflow-x-auto">
              <div className="max-h-[400px] overflow-y-auto" style={{ maxHeight: '400px' }}>
              <table className="min-w-full" style={{ borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
                <thead className="sticky top-0" style={{ zIndex: 10 }}>
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
                   {transactions.slice(0, sliceVisible).map((transaction, index) => (
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

        {/* Footer */}
        {transactions.length > 0 && (
          <div className="border-t px-6 py-3 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {transactions.length} of {totalRecords} overdue transactions
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={sliceVisible}
                onChange={(e) => {
                  const v = parseInt(e.target.value || '20')
                  setSliceVisible(Math.min(100, Math.max(1, v)))
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span className="text-sm text-gray-700">
                Page {page} / {totalPages}
              </span>
              <button
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
