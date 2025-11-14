'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'

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
  const [line, setLine] = useState('')
  const [year, setYear] = useState('ALL')
  const [month, setMonth] = useState('ALL')
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

  // Columns to hide
  const hiddenColumns = ['ABSENT', 'YEAR', 'MONTH', 'USERKEY', 'UNIQUEKEY', 'WINRATE', 'CURRENCY']
  
  // Custom column order for better organization - based on actual column names from database
  const columnOrder = [
    'date',
    'date_range',
    'days_active',
    'line', 
    'user_name',
    'unique_code',
    'vip_level',
    'operator',
    'traffic',
    'register_date',
    'first_deposit_date',
    'first_deposit_amount',
    'last_deposit_date',
    'days_inactive',
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
    'net_profit',
    'last_activity_days'
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
    fetchSlicerOptions()
    fetchMemberReportData()
  }, [])

  // Only reload on pagination change, NOT on slicer change
  useEffect(() => {
    // Skip initial render (handled by first useEffect)
    const isInitialMount = pagination.currentPage === 1 && pagination.totalPages === 1 && pagination.totalRecords === 0
    if (!isInitialMount) {
      fetchMemberReportData()
    }
  }, [pagination.currentPage])

  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      
      // Get user's allowed brands from localStorage
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const response = await fetch('/api/myr-member-report/slicer-options', {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        },
        cache: 'no-store'
      })
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.data)
        
        // ✅ Auto-set line to first option from API (ALL for Admin, first brand for Squad Lead)
        if (result.data.lines.length > 0) {
          const firstOption = result.data.lines[0]
          setLine(firstOption)
          console.log('✅ [MYR Member Report] Auto-set line to first option:', firstOption)
        }
      }
    } catch (error) {
      console.error('Error fetching myr-member-report slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }

  const fetchMemberReportData = async () => {
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
      const result = await response.json()
      
      if (result.success) {
        setMemberReportData(result.data)
        setPagination(result.pagination)
        setLoading(false)
      } else {
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
      console.error('Error fetching myr-member-report data:', error)
      setMemberReportData([])
      setLoading(false)
    }
  }

  const handleMonthChange = (selectedMonth: string) => {
    setMonth(selectedMonth)
    setFilterMode('month')
    setUseDateRange(false)
  }

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
    if (field === 'start' || (field === 'end' && dateRange.start)) {
      setFilterMode('daterange')
      setUseDateRange(true)
      setMonth('ALL')
    }
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

  const handleExport = async () => {
    try {
      setExporting(true)
      
      // Show progress message for large exports
      console.log('📤 Starting export for large dataset...')
      
      // Get user's allowed brands from localStorage
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
          : 'myr_member_report_export.csv'
        
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
                              {column.toUpperCase().replace(/_/g, ' ')}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {memberReportData.map((row, index) => (
                        <tr key={index}>
                          {getSortedColumns(Object.keys(row))
                            .map((column) => (
                              <td key={column} style={{ 
                                textAlign: getColumnAlignment(column, row[column]) as 'left' | 'right' | 'center',
                                border: '1px solid #e0e0e0',
                                padding: '8px 12px'
                              }}>
                                {formatTableCell(row[column])}
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
    </Layout>
  )
}
