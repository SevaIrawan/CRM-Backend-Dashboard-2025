'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './CustomerDetailModal.css'

interface CustomerDetail {
  userName: string
  uniqueCode: string
  lastDepositDate: string
  daysActive: number
  atv: number
  depositCases: number
  depositAmount: number
  withdrawCases: number
  withdrawAmount: number
  bonus: number
  netProfit: number
}

interface CustomerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  brand: string
  period: 'A' | 'B'
  dateRange: {
    start: string
    end: string
  }
  apiEndpoint: string
}

export default function CustomerDetailModal({ 
  isOpen, 
  onClose, 
  brand, 
  period, 
  dateRange,
  apiEndpoint
}: CustomerDetailModalProps) {
  const [customers, setCustomers] = useState<CustomerDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const fetchCustomerDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          brand,
          startDate: dateRange.start,
          endDate: dateRange.end,
          page: String(page),
          limit: String(rowsPerPage)
        })
        
        const res = await fetch(`${apiEndpoint}?${params}`)
        const json = await res.json()
        
        if (!json.success) {
          throw new Error(json.error || 'Failed to load customer details')
        }
        
        setCustomers(json.data || [])
        setTotalRecords(json.pagination?.totalRecords || 0)
        setTotalPages(json.pagination?.totalPages || 1)
      } catch (e: any) {
        setError(e.message || 'Failed to load customer details')
      } finally {
        setLoading(false)
      }
    }

    fetchCustomerDetails()
  }, [isOpen, brand, dateRange.start, dateRange.end, page, rowsPerPage])

  if (!isOpen) return null

  // Format helpers
  const formatInteger = (value: number): string => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const formatNumeric = (value: number): string => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // ✅ EXPORT ALL DATA function
  const handleExport = async () => {
    try {
      setExporting(true)
      
      // Fetch ALL data without pagination
      const params = new URLSearchParams({
        brand,
        startDate: dateRange.start,
        endDate: dateRange.end,
        page: '1',
        limit: '999999' // Get all records
      })
      
      const res = await fetch(`${apiEndpoint}?${params}`)
      const json = await res.json()
      
      if (!json.success) {
        throw new Error(json.error || 'Failed to export data')
      }

      const allCustomers = json.data || []

      // Create CSV content
      const headers = ['User Name', 'Unique Code', 'Last Deposit Date', 'Days Active', 'ATV', 'DC', 'DA', 'WC', 'WA', 'Bonus', 'Net Profit']
      const csvRows: string[] = []
      csvRows.push(headers.join(','))

      allCustomers.forEach((customer: CustomerDetail) => {
        csvRows.push([
          customer.userName || '',
          customer.uniqueCode,
          customer.lastDepositDate || '',
          String(customer.daysActive),
          customer.atv.toFixed(2),
          String(customer.depositCases),
          customer.depositAmount.toFixed(2),
          String(customer.withdrawCases),
          customer.withdrawAmount.toFixed(2),
          customer.bonus.toFixed(2),
          customer.netProfit.toFixed(2)
        ].join(','))
      })

      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customer-details-${brand}-Period${period}-${dateRange.start}-to-${dateRange.end}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Failed to export: ' + (e.message || 'Unknown error'))
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
      className="modal-overlay"
      style={{ 
        position: 'fixed',
        top: '150px', // Header (90px) + Subheader (60px)
        left: '280px', // Sidebar width
        right: 0,
        bottom: 0,
        zIndex: 10000
      }}
    >
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Customer Details - {brand === 'ALL' ? 'All Brands' : brand}</h2>
            <p className="modal-subtitle">
              Period {period}: {dateRange.start} to {dateRange.end}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={handleExport}
              disabled={exporting}
              style={{
                padding: '8px 16px',
                backgroundColor: exporting ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: exporting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (!exporting) e.currentTarget.style.backgroundColor = '#1d4ed8'
              }}
              onMouseOut={(e) => {
                if (!exporting) e.currentTarget.style.backgroundColor = '#2563eb'
              }}
            >
              {exporting ? 'Exporting...' : 'Export All CSV'}
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

        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">Loading customer details...</div>
          ) : error ? (
            <div className="modal-error">{error}</div>
          ) : customers.length === 0 ? (
            <div className="modal-empty">No customer data found</div>
          ) : (
            <div className="modal-table-container">
              <table className="customer-detail-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>User Name</th>
                    <th style={{ textAlign: 'left' }}>Unique Code</th>
                    <th style={{ textAlign: 'left' }}>Last Deposit Date</th>
                    <th style={{ textAlign: 'left' }}>Days Active</th>
                    <th style={{ textAlign: 'left' }}>ATV</th>
                    <th style={{ textAlign: 'left' }}>DC</th>
                    <th style={{ textAlign: 'left' }}>DA</th>
                    <th style={{ textAlign: 'left' }}>WC</th>
                    <th style={{ textAlign: 'left' }}>WA</th>
                    <th style={{ textAlign: 'left' }}>Bonus</th>
                    <th style={{ textAlign: 'left' }}>Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, index) => (
                    <tr key={customer.uniqueCode} style={{ backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white' }}>
                      <td style={{ textAlign: 'left' }}>{customer.userName || '-'}</td>
                      <td style={{ textAlign: 'left' }}>{customer.uniqueCode}</td>
                      <td style={{ textAlign: 'left' }}>{customer.lastDepositDate || '-'}</td>
                      <td style={{ textAlign: 'right' }}>{formatInteger(customer.daysActive)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumeric(customer.atv)}</td>
                      <td style={{ textAlign: 'right' }}>{formatInteger(customer.depositCases)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumeric(customer.depositAmount)}</td>
                      <td style={{ textAlign: 'right' }}>{formatInteger(customer.withdrawCases)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumeric(customer.withdrawAmount)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumeric(customer.bonus)}</td>
                      <td style={{ 
                        textAlign: 'right',
                        color: customer.netProfit < 0 ? '#dc2626' : '#059669',
                        fontWeight: '500'
                      }}>
                        {formatNumeric(customer.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-summary">
            Showing {customers.length} of <strong>{totalRecords}</strong> customers
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '14px', color: '#6b7280' }}>Rows per page:</label>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value))
                setPage(1) // Reset to first page
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={1000}>1000</option>
            </select>
            
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: page <= 1 ? '#f3f4f6' : 'white',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Prev
            </button>
            
            <span style={{ fontSize: '14px', color: '#374151' }}>
              Page {page} / {totalPages}
            </span>
            
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: page >= totalPages ? '#f3f4f6' : 'white',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Next
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
      </div>
    </div>,
    document.body
  )
}

