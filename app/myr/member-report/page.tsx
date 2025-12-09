'use client'

import { useState, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import { getAllowedBrandsFromStorage } from '@/utils/brandAccessHelper'

interface MemberReportData {
  [key: string]: any
}

interface SlicerOptions {
  lines: string[]
  years: string[]
  months: { value: string; label: string }[]
  dateRange: { min: string; max: string }
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalRecords: number
  recordsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function MYRMemberReportPage() {
  const [line, setLine] = useState('') // Will be set to 'ALL' from API defaults
  const [year, setYear] = useState('') // Will be set to max year from API defaults
  const [month, setMonth] = useState('') // Will be set to max month from API defaults
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [filterMode, setFilterMode] = useState('month')
  const [useDateRange, setUseDateRange] = useState(false)

  const [memberReportData, setMemberReportData] = useState<MemberReportData[]>([])
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
    months: [],
    dateRange: { min: '', max: '' }
  })
  const [loading, setLoading] = useState(true)
  const [slicerLoading, setSlicerLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  
  // Days Active Modal State
  const [isDaysActiveModalOpen, setIsDaysActiveModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ userkey: string; userName: string; daysActive: number } | null>(null)

  // Columns to hide
  const hiddenColumns = ['ABSENT', 'YEAR', 'MONTH', 'USERKEY', 'UNIQUEKEY', 'WINRATE', 'CURRENCY', 'DATE', 'VIP_LEVEL', 'OPERATOR', 'REGISTER_DATE', 'LAST_ACTIVITY_DAYS', 'DATE_RANGE', 'USER_UNIQUE']
  
  // Custom column order for better organization - based on actual column names from database
  const columnOrder = [
    'line',
    'user_name',
    'unique_code',
    'traffic',
    'first_deposit_date',
    'first_deposit_amount',
    'last_deposit_date',
    'days_inactive',
    'days_active',
    'atv',
    'pf',
    'deposit_cases',
    'deposit_amount',
    'withdraw_cases',
    'withdraw_amount',
    'bonus',
    'cases_adjustment',
    'add_bonus',
    'deduct_bonus',
    'add_transaction',
    'deduct_transaction',
    'cases_bets',
    'bets_amount',
    'valid_amount',
    'ggr',
    'net_profit'
  ]
  
  // Function to determine if column should be hidden
  const isColumnHidden = (column: string): boolean => {
    const upperColumn = column.toUpperCase()
    return hiddenColumns.includes(upperColumn)
  }
  
  // Function to get sorted columns according to custom order
  const getSortedColumns = (dataKeys: string[]): string[] => {
    // First, get columns that exist in data and are not hidden
    const visibleColumns = dataKeys.filter(column => !isColumnHidden(column))
    
    // Debug: Log actual column names
    console.log('🔍 [Member Report] Available columns:', visibleColumns)
    console.log('🔍 [Member Report] Custom order columns:', columnOrder)
    
    // Then sort them according to custom order
    const sortedColumns = columnOrder.filter(col => visibleColumns.includes(col))
    
    // Add any remaining columns that weren't in the custom order (fallback)
    const remainingColumns = visibleColumns.filter(col => !columnOrder.includes(col))
    
    console.log('🔍 [Member Report] Sorted columns:', sortedColumns)
    console.log('🔍 [Member Report] Remaining columns:', remainingColumns)
    
    return [...sortedColumns, ...remainingColumns]
  }
  
  // Function to determine text alignment
  const getColumnAlignment = (column: string, value: any): string => {
    // Header alignment - all left
    if (value === undefined) return 'left'
    
    // Numeric values - right align
    if (typeof value === 'number') return 'right'
    
    // String values that look like numbers (including formatted numbers with commas) - right align
    if (typeof value === 'string') {
      // Check if it's a formatted number (contains commas or is a pure number)
      const cleanValue = value.replace(/,/g, '')
      if (!isNaN(Number(cleanValue)) && cleanValue !== '' && cleanValue !== '-') return 'right'
      
      // Date values - right align
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'right'
    }
    
    // Text values - left align
    return 'left'
  }

  // Function to format header title
  const formatHeaderTitle = (column: string): string => {
    const headerMap: { [key: string]: string } = {
      'first_deposit_date': 'FDD',
      'first_deposit_amount': 'FDA',
      'last_deposit_date': 'LDD',
      'days_inactive': 'ABSENT',
      'deposit_cases': 'DC',
      'deposit_amount': 'DA',
      'withdraw_cases': 'WC',
      'withdraw_amount': 'WA',
      'add_transaction': 'ADJUST IN',
      'deduct_transaction': 'ADJUST OUT',
      'cases_adjustment': '# ADJUST',
      'cases_bets': '# BETS',
      'atv': 'ATV',
      'pf': 'PF'
    }
    
    if (headerMap[column]) {
      return headerMap[column]
    }
    
    // Default: convert snake_case to UPPERCASE
    return column
      .split('_')
      .map(word => word.toUpperCase())
      .join(' ')
  }

  // Format table cell function
  const formatTableCell = (value: any) => {
    if (value === null || value === undefined || value === '') {
      return '-'
    }
    
    if (typeof value === 'number') {
      // Check if it's an integer (no decimal part)
      if (Number.isInteger(value)) {
        return value.toLocaleString()
      } else {
        // Decimal number - format with 2 decimal places
        return value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      }
    }
    
    return value
  }


  useEffect(() => {
    // Small delay to ensure localStorage is ready after login
    const timer = setTimeout(() => {
      fetchSlicerOptions()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // ✅ Auto-load data ONCE when defaults are set from API (initial load only)
  useEffect(() => {
    if (!initialLoadDone && line) {
      console.log('✅ [Member Report] Initial load with defaults:', { line, year, month })
      fetchMemberReportData()
      setInitialLoadDone(true)
    }
  }, [line, year, month, initialLoadDone])

  // ✅ Reload on pagination change ONLY (no auto-reload on filter changes)
  useEffect(() => {
    // Skip initial render (handled by first useEffect)
    const isInitialMount = pagination.currentPage === 1 && pagination.totalPages === 1 && pagination.totalRecords === 0
    if (!isInitialMount && line) {
      fetchMemberReportData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage])

  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      
      // Get user's allowed brands from localStorage
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const response = await fetch('/api/usc-member-report/slicer-options', {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        },
        cache: 'no-store' // ✅ Prevent caching
      })
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.data)
        
        // ✅ Auto-set to defaults dari API (Max Date Data)
        if (result.data.defaults) {
          setLine(result.data.defaults.line || 'ALL')
          setYear(result.data.defaults.year || 'ALL')
          setMonth(result.data.defaults.month || 'ALL')
          console.log('✅ [Member Report] Auto-set to defaults:', result.data.defaults)
        } else if (result.data.lines.length > 0) {
          // Fallback: Auto-set line to first option from API
          const firstOption = result.data.lines[0]
          setLine(firstOption)
          console.log('✅ [Member Report] Auto-set line to first option:', firstOption)
        }
      }
    } catch (error) {
      console.error('Error fetching usc-member-report slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }

  const fetchMemberReportData = async () => {
    // ✅ VALIDATION: Don't fetch if required slicers not set yet
    if (!line) {
      console.log('⏳ [Member Report] Waiting for slicers to be set...')
      return
    }
    
    try {
      setLoading(true)
      const params = new URLSearchParams({
        line,
        year,
        month,
        startDate: dateRange.start,
        endDate: dateRange.end,
        filterMode,
        page: pagination.currentPage.toString(),
        limit: pagination.recordsPerPage.toString()
      })

      // Get user's allowed brands from localStorage
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null

      const response = await fetch(`/api/myr-member-report/data?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
      
      // ✅ Check response status before parsing JSON
      if (!response.ok) {
        if (response.status === 403) {
          const errorResult = await response.json()
          console.error('❌ Unauthorized Access:', errorResult.message || errorResult.error)
          alert(`Access Denied: ${errorResult.message || 'You do not have access to this brand'}`)
          // Reset to first available brand for Squad Lead
          if (slicerOptions.lines.length > 0) {
            setLine(slicerOptions.lines[0])
          }
        } else {
          console.error('❌ API Error:', response.status, response.statusText)
        }
        setMemberReportData([])
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
      
      const result = await response.json()
      
      if (result.success) {
        setMemberReportData(result.data || [])
        setPagination(result.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0,
          recordsPerPage: 1000,
          hasNextPage: false,
          hasPrevPage: false
        })
        setLoading(false)
      } else {
        console.error('❌ API Error:', result.error || result.message)
        setMemberReportData([])
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
      console.error('❌ Error fetching usc-member-report data:', error)
      setMemberReportData([])
      setPagination(prev => ({ 
        ...prev, 
        totalRecords: 0, 
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }))
      setLoading(false)
    }
  }

  const handleMonthChange = (selectedMonth: string) => {
    setMonth(selectedMonth)
    setFilterMode('month')
    setUseDateRange(false)
    // ✅ Reset pagination when month changes (user must click Search to fetch)
    resetPagination()
  }

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => {
      const updated = { ...prev, [field]: value }
      // ✅ Set filterMode when both dates are set
      if (field === 'start' || (field === 'end' && updated.start)) {
        setFilterMode('daterange')
        setUseDateRange(true)
        setMonth('ALL')
      }
      return updated
    })
    // ✅ Reset pagination when date range changes (user must click Search to fetch)
    resetPagination()
  }

  // HANDLE DATE RANGE TOGGLE
  const handleDateRangeToggle = (checked: boolean) => {
    setUseDateRange(checked)
    if (checked) {
      setFilterMode('daterange')
      setMonth('') // Clear month
    } else {
      setFilterMode('month')
      setDateRange({ start: '', end: '' }) // Clear date range
    }
    // ✅ Reset pagination when toggle changes (user must click Search to fetch)
    resetPagination()
  }

  const resetPagination = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  // Manual Search trigger
  const handleApplyFilters = () => {
    resetPagination()
    fetchMemberReportData()
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }))
  }

  // Handle Days Active click
  const handleDaysActiveClick = (userkey: string, userName: string, daysActive: number) => {
    console.log('🔍 Opening days active details for user:', userName, userkey, daysActive)
    setSelectedUser({ userkey, userName, daysActive })
    setIsDaysActiveModalOpen(true)
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      
      // Show progress message for large exports
      console.log('📤 Starting export for large dataset...')
      
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const response = await fetch('/api/myr-member-report/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        },
        body: JSON.stringify({
          line,
          year,
          month,
          startDate: dateRange.start,
          endDate: dateRange.end,
          filterMode
        }),
        // Increase timeout for large datasets
        signal: AbortSignal.timeout(300000) // 5 minutes timeout
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
          : 'usc_member_report_export.csv'
        
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
            onChange={(e) => {
              setLine(e.target.value)
              resetPagination() // ✅ Reset pagination when line changes (user must click Search to fetch)
            }}
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
            onChange={(e) => {
              setYear(e.target.value)
              resetPagination() // ✅ Reset pagination when year changes (user must click Search to fetch)
            }}
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
            onChange={(e) => handleMonthChange(e.target.value)}
            className={`slicer-select ${useDateRange ? 'disabled' : ''}`}
            disabled={useDateRange}
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
            <StandardLoadingSpinner message="Loading MYR Member Report" />
          ) : memberReportData.length === 0 ? (
            <div className="empty-container">
              <div className="empty-icon">📭</div>
              <div className="empty-text">
                No MYR member report data found for the selected filters
              </div>
            </div>
          ) : (
            <>
              <div className="simple-table-container">
                {/* Date Range Controls Only - No Title */}
                <div className="table-header-controls" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div className="date-range-controls">
                    <div className="date-range-toggle">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={useDateRange}
                          onChange={(e) => handleDateRangeToggle(e.target.checked)}
                        />
                        Date Range
                      </label>
                    </div>
                    
                    <div className="date-range-inputs">
                      <input
                        type="date"
                        placeholder="Start Date"
                        value={dateRange.start}
                        onChange={(e) => handleDateRangeChange('start', e.target.value)}
                        disabled={!useDateRange}
                        min={slicerOptions.dateRange.min}
                        max={slicerOptions.dateRange.max}
                        className={`date-input ${!useDateRange ? 'disabled' : ''}`}
                      />
                      <input
                        type="date"
                        placeholder="End Date"
                        value={dateRange.end}
                        onChange={(e) => handleDateRangeChange('end', e.target.value)}
                        disabled={!useDateRange}
                        min={slicerOptions.dateRange.min}
                        max={slicerOptions.dateRange.max}
                        className={`date-input ${!useDateRange ? 'disabled' : ''}`}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="simple-table-wrapper">
                  <table className="simple-table" style={{
                    borderCollapse: 'collapse',
                    border: '1px solid #e0e0e0'
                  }}>
                    <thead>
                      <tr>
                        {memberReportData.length > 0 && getSortedColumns(Object.keys(memberReportData[0]))
                          .map((column) => (
                            <th key={column} style={{ 
                              textAlign: 'left',
                              border: '1px solid #e0e0e0',
                              borderBottom: '2px solid #d0d0d0',
                              padding: '8px 12px'
                            }}>
                              {formatHeaderTitle(column)}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {memberReportData.map((row, index) => (
                        <tr key={index}>
                          {getSortedColumns(Object.keys(row))
                            .map((column) => (
                              <td 
                                key={column} 
                                style={{ 
                                  textAlign: getColumnAlignment(column, row[column]) as 'left' | 'right' | 'center',
                                  border: '1px solid #e0e0e0',
                                  padding: '8px 12px'
                                }}
                              >
                                {column === 'days_active' && row[column] > 0 ? (
                                  <button
                                    onClick={() => handleDaysActiveClick(row.userkey || '', row.user_name || '', row[column] || 0)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#2563eb',
                                      textDecoration: 'underline',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      fontSize: '14px',
                                      padding: 0,
                                      textAlign: getColumnAlignment(column, row[column]) as 'left' | 'right' | 'center'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#1d4ed8' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#2563eb' }}
                                    title="Click to view days active details"
                                  >
                                    {formatTableCell(row[column])}
                                  </button>
                                ) : (column === 'ggr' || column === 'net_profit') ? (
                                  <span style={{
                                    color: (row[column] || 0) >= 0 ? '#10b981' : '#ef4444',
                                    fontWeight: 600
                                  }}>
                                    {formatTableCell(row[column])}
                                  </span>
                                ) : (
                                  formatTableCell(row[column])
                                )}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer - Records Info + Pagination + Export */}
                <div className="table-footer">
                  <div className="records-info">
                    Showing {Math.min(memberReportData.length, 1000)} of {pagination.totalRecords.toLocaleString()} records
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
                      disabled={exporting || memberReportData.length === 0}
                      className={`export-button ${exporting || memberReportData.length === 0 ? 'disabled' : ''}`}
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
      
      {/* Days Active Details Modal */}
      {isDaysActiveModalOpen && selectedUser && (
        <DaysActiveDetailsModal
          isOpen={isDaysActiveModalOpen}
          onClose={() => {
            setIsDaysActiveModalOpen(false)
            setSelectedUser(null)
          }}
          userkey={selectedUser.userkey}
          userName={selectedUser.userName}
          daysActive={selectedUser.daysActive}
          line={line}
          year={year}
          month={month}
          startDate={dateRange.start}
          endDate={dateRange.end}
          filterMode={filterMode}
        />
      )}
    </Layout>
  )
}

// Days Active Details Modal Component
interface DaysActiveDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  userkey: string
  userName: string
  daysActive: number
  line: string
  year: string
  month: string
  startDate: string
  endDate: string
  filterMode: string
}

function DaysActiveDetailsModal({
  isOpen,
  onClose,
  userkey,
  userName,
  daysActive,
  line,
  year,
  month,
  startDate,
  endDate,
  filterMode
}: DaysActiveDetailsModalProps) {
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

  const fetchDaysActiveDetails = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        userkey,
        line,
        year,
        month,
        startDate,
        endDate,
        filterMode,
        page: pagination.currentPage.toString(),
        limit: pagination.recordsPerPage.toString()
      })

      const allowedBrands = getAllowedBrandsFromStorage()
      const headers: HeadersInit = {}
      if (allowedBrands && allowedBrands.length > 0) {
        headers['x-user-allowed-brands'] = JSON.stringify(allowedBrands)
      }

      const response = await fetch(`/api/usc-member-report/days-active-details?${params}`, { headers })
      
      if (!response.ok) {
        throw new Error('Failed to fetch days active details')
      }

      const result = await response.json()
      
      if (result.success) {
        setTransactions(result.data || [])
        setPagination(result.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0,
          recordsPerPage: 100,
          hasNextPage: false,
          hasPrevPage: false
        })
      }
    } catch (error) {
      console.error('Error fetching days active details:', error)
    } finally {
      setLoading(false)
    }
  }, [userkey, line, year, month, startDate, endDate, filterMode, pagination.currentPage, pagination.recordsPerPage])

  useEffect(() => {
    if (isOpen) {
      fetchDaysActiveDetails()
    }
  }, [isOpen, fetchDaysActiveDetails])

  useEffect(() => {
    if (isOpen) {
      setPagination(prev => ({ ...prev, currentPage: 1 }))
    }
  }, [isOpen])

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      const headers = ['Date Transaction', 'Unique Code', 'DC', 'DA', 'WC', 'WA', 'GGR']
      const allRows: string[] = []
      allRows.push(headers.join(','))

      const exportLimit = 1000
      const pages = Math.max(1, Math.ceil(pagination.totalRecords / exportLimit))
      
      for (let p = 1; p <= pages; p++) {
        const params = new URLSearchParams({
          userkey,
          line,
          year,
          month,
          startDate,
          endDate,
          filterMode,
          page: String(p),
          limit: String(exportLimit)
        })

        const allowedBrands = getAllowedBrandsFromStorage()
        const fetchHeaders: HeadersInit = {}
        if (allowedBrands && allowedBrands.length > 0) {
          fetchHeaders['x-user-allowed-brands'] = JSON.stringify(allowedBrands)
        }

        const res = await fetch(`/api/usc-member-report/days-active-details?${params}`, { headers: fetchHeaders })
        const json = await res.json()
        const rows: any[] = json?.data || []
        
        if (!rows.length) break
        
        rows.forEach(row => {
          allRows.push([
            row.date || '',
            row.unique_code || '',
            String(row.deposit_cases || 0),
            String(row.deposit_amount || 0),
            String(row.withdraw_cases || 0),
            String(row.withdraw_amount || 0),
            String(row.ggr || 0)
          ].join(','))
        })
      }

      const csvContent = allRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `days-active-details-${userName}-${line}-${year}-${month}-${new Date().toISOString().split('T')[0]}.csv`
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
        zIndex: 10000,
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
              Days Active Details - {userName}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#6b7280', textAlign: 'left' }}>
              {pagination.totalRecords > 0 ? pagination.totalRecords : daysActive} days active • {line} • {year} • {month}
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
              <p style={{ marginLeft: '12px', color: '#6b7280' }}>Loading days active details...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No days active details found
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
              {/* Single Table with Sticky Header - untuk alignment yang konsisten */}
              <div style={{ 
                flex: 1,
                overflowY: pagination.totalRecords >= 100 ? 'visible' : 'auto',
                overflowX: 'auto',
                maxHeight: pagination.totalRecords >= 100 ? 'none' : '450px'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                  minWidth: '1000px',
                  tableLayout: 'fixed' // ✅ Fixed layout untuk alignment konsisten
                }}>
                  <colgroup>
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '110px' }} />
                  </colgroup>
                  <thead style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#374151',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <tr>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap', border: '1px solid #4b5563' }}>DATE TRANSACTION</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap', border: '1px solid #4b5563' }}>UNIQUE CODE</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap', border: '1px solid #4b5563' }}>DC</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap', border: '1px solid #4b5563' }}>DA</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap', border: '1px solid #4b5563' }}>WC</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid #4b5563', backgroundColor: '#374151', whiteSpace: 'nowrap', border: '1px solid #4b5563' }}>WA</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: 'white', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: '#374151', whiteSpace: 'nowrap', border: '1px solid #4b5563' }}>GGR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((row, index) => (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>{row.date || '-'}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'left' }}>{row.unique_code || '-'}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.deposit_cases?.toLocaleString() || 0}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.deposit_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.withdraw_cases?.toLocaleString() || 0}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{row.withdraw_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                        <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'right' }}>
                          <span style={{
                            color: (row.ggr || 0) >= 0 ? '#10b981' : '#ef4444',
                            fontWeight: 600
                          }}>
                            {row.ggr?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
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
            {pagination.totalRecords >= 100 && pagination.totalPages > 1 && (
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
