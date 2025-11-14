'use client'

import { useState, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'

interface ChurnMemberData {
  [key: string]: any
}

interface SlicerOptions {
  lines: string[]
  years: string[]
  months: { value: string; label: string }[]
  defaults?: {
    line: string
    year: string
    month: string
  }
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalRecords: number
  recordsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function MYRChurnMemberPage() {
  const [line, setLine] = useState('ALL') // ✅ Default Line = "ALL"
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // ✅ MODAL STATE for Transaction History Drill-Down
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ userName: string; uniqueCode: string; userkey: string } | null>(null)

  const [churnMemberData, setChurnMemberData] = useState<ChurnMemberData[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 1000,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions>({
    lines: [],
    years: [],
    months: []
  })
  const [loading, setLoading] = useState(true)
  const [slicerLoading, setSlicerLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Custom column order for churn member table
  const columnOrder = [
    'line',
    'user_name',
    'unique_code',
    'traffic',
    'first_deposit_date', // FDD
    'last_deposit_date', // LDD
    'days_inactive',
    'days_active',
    'deposit_cases', // DC
    'deposit_amount', // DA
    'withdraw_cases', // WC
    'withdraw_amount', // WA
    'net_profit',
    'status'
  ]
  
  // Function to get sorted columns according to custom order
  const getSortedColumns = (dataKeys: string[]): string[] => {
    const visibleColumns = dataKeys.filter(Boolean).filter(col => col !== 'userkey') // ✅ Hide userkey column
    const sortedColumns = columnOrder.filter(col => visibleColumns.includes(col))
    const remainingColumns = visibleColumns.filter(col => !columnOrder.includes(col))
    return [...sortedColumns, ...remainingColumns]
  }
  
  // ✅ Function to get short column header names
  const getColumnHeader = (column: string): string => {
    const headerMap: { [key: string]: string } = {
      'deposit_cases': 'DC',
      'deposit_amount': 'DA',
      'withdraw_cases': 'WC',
      'withdraw_amount': 'WA',
      'first_deposit_date': 'FDD',
      'last_deposit_date': 'LDD'
    }
    return headerMap[column] || column.toUpperCase().replace(/_/g, ' ')
  }
  
  // Function to determine text alignment
  const getColumnAlignment = (column: string, value: any): string => {
    if (value === undefined) return 'left'
    
    if (typeof value === 'number') return 'right'
    
    if (typeof value === 'string') {
      const cleanValue = value.replace(/,/g, '')
      if (!isNaN(Number(cleanValue)) && cleanValue !== '' && cleanValue !== '-') return 'right'
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'right'
    }
    
    return 'left'
  }

  // Format table cell function
  const formatTableCell = (value: any) => {
    if (value === null || value === undefined || value === '') {
      return '-'
    }
    
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value.toLocaleString()
      } else {
        return value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      }
    }
    
    return value
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSlicerOptions()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const fetchChurnMemberData = useCallback(async (pageNum: number) => {
    const currentPage = pageNum
    
    // ✅ VALIDATION: Month and Year are REQUIRED for churn calculation
    if (!month || month === 'ALL' || !year || year === 'ALL') {
      setChurnMemberData([])
      setPagination(prev => ({ 
        ...prev, 
        totalRecords: 0, 
        totalPages: 0, 
        hasNextPage: false,
        hasPrevPage: false
      }))
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const params = new URLSearchParams({
        line,
        year,
        month,
        statusFilter,
        page: currentPage.toString(),
        limit: pagination.recordsPerPage.toString()
      })

      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null

      const response = await fetch(`/api/myr-churn-member/data?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
      const result = await response.json()
      
      if (result.success) {
        setChurnMemberData(result.data)
        setPagination(result.pagination)
        setLoading(false)
      } else {
        setChurnMemberData([])
        setPagination(prev => ({ 
          ...prev, 
          totalRecords: 0, 
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }))
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching myr-churn-member data:', error)
      setChurnMemberData([])
      setLoading(false)
    }
  }, [line, year, month, statusFilter, pagination.recordsPerPage])

  // ✅ Auto-load data ONCE when defaults are set from API (initial load only)
  useEffect(() => {
    if (!initialLoadDone && line && year && month && month !== 'ALL' && year !== 'ALL') {
      console.log('✅ [MYR Churn Member] Initial load with defaults:', { line, year, month })
      fetchChurnMemberData(1)
      setInitialLoadDone(true)
    }
  }, [line, year, month, initialLoadDone, fetchChurnMemberData])

  // ✅ Reload on pagination change ONLY (NOT on status filter change - use Search button)
  useEffect(() => {
    const isInitialMount = pagination.currentPage === 1 && pagination.totalPages === 1 && pagination.totalRecords === 0
    if (!isInitialMount && initialLoadDone && line && year && month && month !== 'ALL' && year !== 'ALL') {
      fetchChurnMemberData(pagination.currentPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage])

  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const response = await fetch('/api/myr-churn-member/slicer-options', {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        },
        cache: 'no-store'
      })
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.data)
        
        // ✅ Auto-set to defaults from API (Line = "ALL", Year & Month = latest data)
        if (result.data.defaults) {
          setLine(result.data.defaults.line || 'ALL')
          if (result.data.defaults.year && result.data.defaults.year !== 'ALL') {
            setYear(result.data.defaults.year)
          } else if (result.data.years && result.data.years.length > 0) {
            setYear(result.data.years[0])
          }
          if (result.data.defaults.month && result.data.defaults.month !== 'ALL') {
            setMonth(result.data.defaults.month)
          } else if (result.data.months && result.data.months.length > 0) {
            setMonth(result.data.months[result.data.months.length - 1]?.value)
          }
          console.log('✅ [MYR Churn Member] Auto-set slicers to defaults:', result.data.defaults)
        } else if (result.data.lines.length > 0) {
          const hasAll = result.data.lines.includes('ALL')
          setLine(hasAll ? 'ALL' : result.data.lines[0])
          if (result.data.years && result.data.years.length > 0) {
            setYear(result.data.years[0])
          }
          if (result.data.months && result.data.months.length > 0) {
            setMonth(result.data.months[result.data.months.length - 1]?.value)
          }
          console.log('✅ [MYR Churn Member] Auto-set slicers to fallback defaults')
        }
      }
    } catch (error) {
      console.error('Error fetching myr-churn-member slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }


  const resetPagination = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  // Manual Search trigger
  const handleApplyFilters = () => {
    resetPagination()
    fetchChurnMemberData(1)
  }

  // ✅ Handle status filter change (NO auto-reload, use Search button)
  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus)
    resetPagination()
  }

  const handleDaysActiveClick = (userName: string, uniqueCode: string, userkey: string) => {
    console.log('🔍 [MYR Churn Member] Opening transaction history for user:', userName, uniqueCode, userkey)
    setSelectedUser({ userName, uniqueCode, userkey })
    setShowTransactionModal(true)
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const response = await fetch('/api/myr-churn-member/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        },
        body: JSON.stringify({
          line,
          year,
          month,
          statusFilter
        }),
        signal: AbortSignal.timeout(300000)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        
        const contentDisposition = response.headers.get('content-disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : 'myr_churn_member_export.csv'
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const error = await response.json()
        alert(`Export failed: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const subHeaderContent = (
    <div className="subheader-content">
      <div className="subheader-title">
        <span className="filter-export-text"> </span>
      </div>
      
      <div className="subheader-controls">
        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <select 
            value={line} 
            onChange={(e) => setLine(e.target.value)}
            className={`slicer-select ${slicerLoading ? 'disabled' : ''}`}
            disabled={slicerLoading}
          >
            {slicerOptions.lines.map((lineOption) => (
              <option key={lineOption} value={lineOption}>{lineOption}</option>
            ))}
          </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">YEAR:</label>
          <select 
            value={year} 
            onChange={(e) => setYear(e.target.value)}
            className="slicer-select"
          >
            <option value="ALL">All</option>
            {slicerOptions.years.map((yearOption) => (
              <option key={yearOption} value={yearOption}>{yearOption}</option>
            ))}
          </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">MONTH:</label>
          <select 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="slicer-select"
          >
            <option value="ALL">All</option>
            {slicerOptions.months.map((monthOption) => (
              <option key={monthOption.value} value={monthOption.value}>
                {monthOption.label}
              </option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleApplyFilters}
          disabled={loading}
          className={`export-button ${loading ? 'disabled' : ''}`}
          style={{ backgroundColor: '#10b981' }}
        >
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>
    </div>
  )

  return (
    <Layout customSubHeader={subHeaderContent}>
      <Frame variant="compact">
        <div className="deposit-container">
          {loading ? (
            <StandardLoadingSpinner message="Loading MYR Churned Members" />
          ) : churnMemberData.length === 0 ? (
            <div className="empty-container">
              <div className="empty-icon">📭</div>
              <div className="empty-text">
                {!month || month === 'ALL' || !year || year === 'ALL' 
                  ? 'Please select both Year and Month to view churned members'
                  : statusFilter !== 'ALL'
                    ? `No MYR churn member data found for status: ${statusFilter === 'NEW MEMBER' ? 'New Depositor' : 'Existing Member'}`
                    : 'No MYR churn member data found for the selected filters'}
              </div>
            </div>
          ) : (
            <>
              <div className="simple-table-container">
                {/* ✅ Status Slicer - Inside simple-table-container (like Customer Retention) */}
                <div className="table-header-controls">
                  <div className="status-filter-group" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginRight: '24px'
                  }}>
                    <label style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                      whiteSpace: 'nowrap'
                    }}>STATUS:</label>
                    <select 
                      value={statusFilter} 
                      onChange={(e) => handleStatusFilterChange(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        minWidth: '160px',
                        fontWeight: 500
                      }}
                    >
                      <option value="ALL">All</option>
                      <option value="NEW MEMBER">New Depositor</option>
                      <option value="OLD MEMBER">Existing Member</option>
                    </select>
                  </div>
                </div>

                <div className="simple-table-wrapper">
                  <table className="simple-table" style={{
                    borderCollapse: 'collapse',
                    border: '1px solid #e0e0e0'
                  }}>
                    <thead>
                      <tr>
                        {churnMemberData.length > 0 && getSortedColumns(Object.keys(churnMemberData[0]))
                          .map((column) => (
                            <th key={column} style={{ 
                              textAlign: 'left',
                              border: '1px solid #e0e0e0',
                              borderBottom: '2px solid #d0d0d0',
                              padding: '8px 12px'
                            }}>
                              {getColumnHeader(column)}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {churnMemberData.map((row, index) => (
                        <tr key={index} style={{
                          backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white'
                        }}>
                          {getSortedColumns(Object.keys(row))
                            .map((column) => {
                              const cellValue = row[column]
                              
                              // ✅ Conditional coloring for net_profit column
                              const isNetProfit = column === 'net_profit'
                              const numericValue = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue).replace(/,/g, ''))
                              const isNegative = !isNaN(numericValue) && numericValue < 0
                              const isPositive = !isNaN(numericValue) && numericValue > 0

                              // ✅ Special rendering for days_active column (clickable)
                              const isDaysActive = column === 'days_active'
                              
                              if (isDaysActive) {
                                return (
                                  <td key={column} style={{ 
                                    textAlign: 'center',
                                    border: '1px solid #e0e0e0',
                                    padding: '8px 12px'
                                  }}>
                                    <button
                                      onClick={() => handleDaysActiveClick(row.user_name, row.unique_code, row.userkey)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#2563eb',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        padding: 0
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.color = '#1d4ed8' }}
                                      onMouseLeave={(e) => { e.currentTarget.style.color = '#2563eb' }}
                                      title="Click to view transaction history"
                                    >
                                      {cellValue}
                                    </button>
                                  </td>
                                )
                              }
                              
                              // ✅ Special rendering for status column
                              const isStatus = column === 'status'
                              
                              if (isStatus) {
                                const statusColors = {
                                  'NEW MEMBER': { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'New Depositor' },
                                  'OLD MEMBER': { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', label: 'Existing Member' }
                                }
                                const colorScheme = statusColors[cellValue as keyof typeof statusColors] || { bg: '#f3f4f6', color: '#374151', border: '#d1d5db', label: cellValue || '-' }
                                
                                return (
                                  <td key={column} style={{ 
                                    textAlign: 'center',
                                    border: '1px solid #e0e0e0',
                                    padding: '8px 12px'
                                  }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '4px 12px',
                                      borderRadius: '12px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      backgroundColor: colorScheme.bg,
                                      color: colorScheme.color,
                                      border: `1px solid ${colorScheme.border}`
                                    }}>
                                      {colorScheme.label}
                                    </span>
                                  </td>
                                )
                              }
                              
                              return (
                                <td key={column} style={{ 
                                  textAlign: getColumnAlignment(column, cellValue) as 'left' | 'right' | 'center',
                                  border: '1px solid #e0e0e0',
                                  padding: '8px 12px',
                                  color: isNetProfit ? (isNegative ? '#dc2626' : isPositive ? '#059669' : '#374151') : '#374151',
                                  fontWeight: isNetProfit ? 600 : 'normal'
                                }}>
                                  {formatTableCell(cellValue)}
                                </td>
                              )
                            })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Table Footer - Records Info + Pagination + Export */}
                <div className="table-footer">
                  <div className="records-info">
                    {statusFilter === 'ALL' ? (
                      <>Showing {churnMemberData.length} of {pagination.totalRecords.toLocaleString()} churned members</>
                    ) : (
                      <>Showing {churnMemberData.length} of {pagination.totalRecords.toLocaleString()} churned {statusFilter === 'NEW MEMBER' ? 'new depositors' : 'existing members'}</>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {pagination.totalPages > 1 && (
                      <div className="pagination-controls">
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                          disabled={!pagination.hasPrevPage}
                          className="pagination-btn"
                        >
                          ← Prev
                        </button>
                        
                        <span className="pagination-info">
                          Page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                          disabled={!pagination.hasNextPage}
                          className="pagination-btn"
                        >
                          Next →
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={handleExport}
                      disabled={exporting || churnMemberData.length === 0}
                      className={`export-button ${exporting || churnMemberData.length === 0 ? 'disabled' : ''}`}
                    >
                      {exporting ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Frame>

      {/* ✅ Transaction History Modal */}
      {showTransactionModal && selectedUser && (
        <TransactionHistoryModal
          isOpen={showTransactionModal}
          onClose={() => {
            setShowTransactionModal(false)
            setSelectedUser(null)
          }}
          userName={selectedUser.userName}
          uniqueCode={selectedUser.uniqueCode}
          userkey={selectedUser.userkey}
          line={line}
          year={year}
          month={month}
        />
      )}

      <style jsx>{`
        .slicer-info { display: none !important; }
      `}</style>
    </Layout>
  )
}

// ✅ Transaction History Modal Component
interface TransactionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  uniqueCode: string
  userkey: string
  line: string
  year: string
  month: string
}

function TransactionHistoryModal({
  isOpen,
  onClose,
  userName,
  uniqueCode,
  userkey,
  line,
  year,
  month
}: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 100,
    hasNextPage: false,
    hasPrevPage: false
  })

  const fetchTransactionHistory = useCallback(async () => {
    try {
      setLoading(true)
      
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null

      const params = new URLSearchParams({
        userkey,
        line,
        year,
        month,
        page: pagination.currentPage.toString(),
        limit: pagination.recordsPerPage.toString()
      })

      const response = await fetch(`/api/myr-churn-member/transaction-history?${params}`, {
        headers: allowedBrands ? {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        } : {}
      })

      if (!response.ok) {
        throw new Error('Failed to fetch transaction history')
      }

      const result = await response.json()
      
      if (result.success) {
        setTransactions(result.data)
        setPagination(result.pagination)
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error)
    } finally {
      setLoading(false)
    }
  }, [userkey, line, year, month, pagination.currentPage, pagination.recordsPerPage])

  useEffect(() => {
    if (isOpen) {
      fetchTransactionHistory()
    }
  }, [isOpen, fetchTransactionHistory])

  useEffect(() => {
    if (isOpen) {
      setPagination(prev => ({ ...prev, currentPage: 1 }))
    }
  }, [isOpen])

  const handleExportCSV = () => {
    if (transactions.length === 0) return

    setExporting(true)

    const columns = [
      'transaction_date',
      'brand',
      'unique_code',
      'first_deposit_date',
      'last_deposit_date',
      'deposit_cases',
      'deposit_amount',
      'withdraw_cases',
      'withdraw_amount',
      'ggr',
      'net_profit'
    ]

    const csvHeader = columns.map(col => col.toUpperCase().replace(/_/g, ' ')).join(',')
    
    const csvRows = transactions.map(row => {
      return columns.map(col => {
        let key = col
        if (col === 'transaction_date') key = 'date'
        if (col === 'brand') key = 'line'
        const value = row[key]
        return typeof value === 'number' ? value.toFixed(2) : (value || '')
      }).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `transaction_history_${userkey}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setExporting(false)
  }

  if (!isOpen) return null

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
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '40px 20px 20px 20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '98%',
          maxWidth: '1800px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937', textAlign: 'left' }}>
              Transaction History - {userName}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#6b7280', textAlign: 'left' }}>
              User Code: {uniqueCode}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0 8px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ 
          flex: 1, 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
              <div className="loading-spinner"></div>
              <p style={{ marginLeft: '12px', color: '#6b7280' }}>Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No transactions found
            </div>
          ) : (
            <div style={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
              borderRadius: '6px'
            }}>
              {/* Single Table with Sticky Header */}
              <div style={{ 
                flex: 1,
                overflowY: 'auto',
                overflowX: 'auto',
                maxHeight: '450px'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                  minWidth: '1300px'
                }}>
                  <colgroup>
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '110px' }} />
                    <col style={{ width: '110px' }} />
                  </colgroup>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: '#374151' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap' }}>Transaction Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap' }}>Brand</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap' }}>Unique Code</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap' }}>FDD</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap' }}>LDD</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap' }}>DC</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap' }}>DA</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap' }}>WC</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap' }}>WA</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap' }}>GGR</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: '#374151', whiteSpace: 'nowrap' }}>Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((row, index) => (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>{row.date}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>{row.line}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>{row.unique_code}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>{row.first_deposit_date || '-'}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb' }}>{row.last_deposit_date || '-'}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.deposit_cases?.toLocaleString() || 0}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.deposit_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.withdraw_cases?.toLocaleString() || 0}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.withdraw_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.ggr?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                        <td style={{ 
                          padding: '10px 12px', 
                          border: '1px solid #e5e7eb', 
                          textAlign: 'right',
                          color: row.net_profit < 0 ? '#dc2626' : row.net_profit > 0 ? '#059669' : '#374151',
                          fontWeight: 600
                        }}>
                          {row.net_profit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Showing {transactions.length} of {pagination.totalRecords.toLocaleString()} transactions
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={!pagination.hasPrevPage}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: pagination.hasPrevPage ? 'white' : '#f3f4f6',
                    cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
                    fontSize: '14px'
                  }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={!pagination.hasNextPage}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: pagination.hasNextPage ? 'white' : '#f3f4f6',
                    cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
                    fontSize: '14px'
                  }}
                >
                  Next →
                </button>
              </div>
            )}

            <button
              onClick={handleExportCSV}
              disabled={exporting || transactions.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: transactions.length > 0 ? '#10b981' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: transactions.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              {exporting ? 'Exporting...' : '📥 Export CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
