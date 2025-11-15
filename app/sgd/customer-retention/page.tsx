'use client'

import { useState, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'

interface CustomerRetentionData {
  [key: string]: any
}

interface SlicerOptions {
  lines: string[]
  years: string[]
  months: { value: string; label: string }[]
  dateRange: { min: string; max: string }
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

export default function SGDCustomerRetentionPage() {
  const [line, setLine] = useState('') // Will be set to 'ALL' from API defaults
  const [year, setYear] = useState('') // Will be set to max year from API defaults
  const [month, setMonth] = useState('') // Will be set to max month from API defaults
  const [statusFilter, setStatusFilter] = useState('ALL') // ✅ NEW: Status filter
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [filterMode, setFilterMode] = useState('month')
  const [useDateRange, setUseDateRange] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // ✅ MODAL STATE for Transaction History Drill-Down
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ userName: string; uniqueCode: string; userkey: string } | null>(null)

  const [customerRetentionData, setCustomerRetentionData] = useState<CustomerRetentionData[]>([])
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

  // Columns to display for customer retention - updated with new columns
  const retentionColumns = [
    'line',  // ✅ NEW: Brand column (first column)
    'user_name',
    'unique_code',
    'first_deposit_date',
    'last_deposit_date',
    'active_days',
    'atv',  // ✅ NEW: After active_days
    'pf',   // ✅ NEW: After atv
    'deposit_cases',
    'deposit_amount',
    'withdraw_cases',
    'withdraw_amount',
    'bonus',
    'net_profit',
    'winrate',  // ✅ NEW: After net_profit
    'wd_rate',  // ✅ NEW: After winrate
    'status'
  ]
  
  // Function to get sorted columns for customer retention
  const getSortedColumns = (dataKeys: string[]): string[] => {
    // Only return the retention columns that exist in data
    return retentionColumns.filter(col => dataKeys.includes(col))
  }

  // ✅ Function to get short column header names
  const getColumnHeader = (column: string): string => {
    const headerMap: { [key: string]: string } = {
      'line': 'BRAND',
      'first_deposit_date': 'FDD',
      'last_deposit_date': 'LDD',
      'deposit_cases': 'DC',
      'deposit_amount': 'DA',
      'withdraw_cases': 'WC',
      'withdraw_amount': 'WA'
    }
    return headerMap[column] || column.toUpperCase().replace(/_/g, ' ')
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
    // Small delay to ensure localStorage is ready after login
    const timer = setTimeout(() => {
      fetchSlicerOptions()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // ✅ Auto-load data ONCE when defaults are set from API (initial load only)
  useEffect(() => {
    if (!initialLoadDone && line && year && month) {
      console.log('✅ [Customer Retention] Initial load with defaults:', { line, year, month })
      fetchCustomerRetentionData()
      setInitialLoadDone(true)
    }
  }, [line, year, month, initialLoadDone])

  // ✅ Reload on pagination OR status filter change
  useEffect(() => {
    // Skip initial render (handled by first useEffect)
    const isInitialMount = pagination.currentPage === 1 && pagination.totalPages === 1 && pagination.totalRecords === 0
    if (!isInitialMount && line && year && month) {
      fetchCustomerRetentionData()
    }
  }, [pagination.currentPage, statusFilter])

  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      console.log('🔍 [Customer Retention CLIENT] Fetching slicer with brands:', allowedBrands)
      
      const response = await fetch('/api/sgd-customer-retention/slicer-options', {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        },
        cache: 'no-store' // ✅ Prevent caching
      })
      const result = await response.json()
      
      console.log('📊 [Customer Retention CLIENT] Slicer API response:', {
        success: result.success,
        lines_count: result.data?.lines?.length,
        lines: result.data?.lines
      })
      
      if (result.success) {
        setSlicerOptions(result.data)
        
        console.log('🔍 [Customer Retention CLIENT] Is Squad Lead?', allowedBrands && allowedBrands.length > 0)
        console.log('🔍 [Customer Retention CLIENT] Lines from API:', result.data.lines)
        console.log('🔍 [Customer Retention CLIENT] Defaults from API:', result.data.defaults)
        
        // ✅ Auto-set to defaults dari API (Max Date Data)
        if (result.data.defaults) {
          setLine(result.data.defaults.line || 'ALL')
          setYear(result.data.defaults.year || 'ALL')
          setMonth(result.data.defaults.month || 'ALL')
          console.log('✅ [Customer Retention] Auto-set to defaults:', result.data.defaults)
        } else if (result.data.lines.length > 0) {
          // Fallback: Auto-set line to first option from API
          const firstOption = result.data.lines[0]
          setLine(firstOption)
          console.log('✅ [Customer Retention] Auto-set line to first option:', firstOption)
        }
      }
    } catch (error) {
      console.error('Error fetching sgd-customer-retention slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }

  const fetchCustomerRetentionData = async () => {
    // ✅ VALIDATION: Don't fetch if required slicers not set yet
    if (!line || !year || !month) {
      console.log('⏳ [Customer Retention] Waiting for slicers to be set...')
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
        statusFilter,
        page: pagination.currentPage.toString(),
        limit: pagination.recordsPerPage.toString()
      })

      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null

      const response = await fetch(`/api/sgd-customer-retention/data?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
      const result = await response.json()
      
      if (result.success) {
        setCustomerRetentionData(result.data)
        setPagination(result.pagination)
        setLoading(false)
      } else {
        setCustomerRetentionData([])
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
      console.error('Error fetching sgd-customer-retention data:', error)
      setCustomerRetentionData([])
      setLoading(false)
    }
  }

  const handleMonthChange = (selectedMonth: string) => {
    // ✅ PROTECTION: Prevent month change bila date range active
    if (useDateRange) {
      alert('Please disable Date Range first before changing month')
      return
    }
    
    setMonth(selectedMonth)
    setFilterMode('month')
    // ✅ Clear date range ketika month berubah
    setUseDateRange(false)
    setDateRange({ start: '', end: '' })
  }

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
    // ✅ Keep month locked, don't change to 'ALL'
    if (field === 'start' || (field === 'end' && dateRange.start)) {
      setFilterMode('daterange')
      setUseDateRange(true)
      // Month remains locked to selected month
    }
  }

  // HANDLE DATE RANGE TOGGLE
  const handleDateRangeToggle = (checked: boolean) => {
    // ✅ VALIDATION: Month WAJIB dipilih dulu sebelum enable date range
    if (checked && (!month || month === 'ALL')) {
      alert('Please select a specific month first before enabling Date Range')
      return
    }
    
    setUseDateRange(checked)
    if (checked) {
      setFilterMode('daterange')
      // ✅ Auto-set date range based on selected month
      setDateRangeFromMonth(month, year)
    } else {
      setFilterMode('month')
      setDateRange({ start: '', end: '' }) // Clear date range
    }
  }
  
  // ✅ NEW: Calculate and set date range based on selected month
  const setDateRangeFromMonth = async (selectedMonth: string, selectedYear: string) => {
    if (!selectedMonth || selectedMonth === 'ALL') return
    
    try {
      // Calculate month number (1-12)
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December']
      const monthIndex = monthNames.indexOf(selectedMonth)
      
      if (monthIndex === -1) return
      
      const monthNumber = (monthIndex + 1).toString().padStart(2, '0')
      const yearValue = selectedYear !== 'ALL' ? selectedYear : new Date().getFullYear().toString()
      
      // Calculate first day of month
      const firstDay = `${yearValue}-${monthNumber}-01`
      
      // Calculate last day of month (or max date from database)
      const lastDayOfMonth = new Date(parseInt(yearValue), monthIndex + 1, 0).getDate()
      const lastDay = `${yearValue}-${monthNumber}-${lastDayOfMonth.toString().padStart(2, '0')}`
      
      // ✅ Fetch max date from database for this specific month
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const response = await fetch(`/api/sgd-customer-retention/month-max-date?month=${selectedMonth}&year=${yearValue}&line=${line}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
      
      let maxDateInDB = lastDay
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.maxDate) {
          maxDateInDB = result.maxDate
        }
      }
      
      // ✅ Set date range with calculated boundaries
      setDateRange({
        start: firstDay,
        end: maxDateInDB
      })
      
      // Update slicer options dateRange for min/max validation
      setSlicerOptions(prev => ({
        ...prev,
        dateRange: {
          min: firstDay,
          max: maxDateInDB
        }
      }))
      
      console.log('✅ [Date Range Auto-Set]:', {
        month: selectedMonth,
        year: yearValue,
        range: `${firstDay} to ${maxDateInDB}`
      })
      
    } catch (error) {
      console.error('Error setting date range from month:', error)
    }
  }

  const resetPagination = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  // Manual Search trigger
  const handleApplyFilters = () => {
    resetPagination()
    fetchCustomerRetentionData()
  }
  
  // ✅ Handle status filter change
  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus)
    resetPagination() // Reset to page 1 when filter changes
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }))
  }

  // ✅ Handle Active Days click to show transaction history
  const handleActiveDaysClick = (userName: string, uniqueCode: string, userkey: string) => {
    console.log('🔍 Opening transaction history for user:', userName, uniqueCode, userkey)
    setSelectedUser({ userName, uniqueCode, userkey })
    setShowTransactionModal(true)
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      
      // Show progress message for large exports
      console.log('📤 Starting export for customer retention data...')
      
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const response = await fetch('/api/sgd-customer-retention/export', {
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
          filterMode,
          statusFilter
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
          : 'sgd_customer_retention_export.csv'
        
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
            <StandardLoadingSpinner message="Loading SGD Customer Retention" />
          ) : customerRetentionData.length === 0 ? (
            <div className="empty-container">
              <div className="empty-icon">📭</div>
              <div className="empty-text">
                No SGD customer retention data found for the selected filters
              </div>
            </div>
          ) : (
            <>
              <div className="simple-table-container">
                {/* Status Slicer and Date Range Controls */}
                <div className="table-header-controls">
                  {/* ✅ NEW: Status Slicer */}
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
                      <option value="RETENTION">Retention</option>
                      <option value="REACTIVATION">Reactivation</option>
                      <option value="NEW DEPOSITOR">New Depositor</option>
                    </select>
                  </div>

                  <div className="date-range-controls">
                    <div className="date-range-toggle">
                      <label className="toggle-label" title={(!month || month === 'ALL') ? 'Select a specific month first' : 'Filter by custom date range within selected month'}>
                        <input
                          type="checkbox"
                          checked={useDateRange}
                          onChange={(e) => handleDateRangeToggle(e.target.checked)}
                          disabled={!month || month === 'ALL'}
                          style={{
                            cursor: (!month || month === 'ALL') ? 'not-allowed' : 'pointer',
                            opacity: (!month || month === 'ALL') ? 0.5 : 1
                          }}
                        />
                        <span style={{
                          opacity: (!month || month === 'ALL') ? 0.5 : 1,
                          color: (!month || month === 'ALL') ? '#9ca3af' : '#374151'
                        }}>
                          Date Range {(!month || month === 'ALL') && '(Select month first)'}
                        </span>
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
                        title={useDateRange ? `Range: ${slicerOptions.dateRange.min} to ${slicerOptions.dateRange.max}` : 'Enable Date Range first'}
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
                        title={useDateRange ? `Range: ${slicerOptions.dateRange.min} to ${slicerOptions.dateRange.max}` : 'Enable Date Range first'}
                      />
                    </div>
                  </div>
                </div>
                
                {(() => {
                  // ✅ Data already filtered by server, no need for client-side filter
                  if (customerRetentionData.length === 0) {
                    return (
                      <div className="empty-container" style={{ marginTop: '40px' }}>
                        <div className="empty-icon">🔍</div>
                        <div className="empty-text">
                          No data found for status: {statusFilter}
                        </div>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="simple-table-wrapper">
                      <table className="simple-table" style={{
                        borderCollapse: 'collapse',
                        border: '1px solid #e0e0e0'
                      }}>
                        <thead>
                          <tr>
                            {customerRetentionData.length > 0 && getSortedColumns(Object.keys(customerRetentionData[0]))
                              .map((column) => (
                            <th key={column} style={{ 
                              textAlign: 'left',
                              border: '1px solid #e0e0e0',
                              borderBottom: '2px solid #d0d0d0',
                              padding: '8px 12px',
                              whiteSpace: 'nowrap'
                            }}>
                              {getColumnHeader(column)}
                            </th>
                          ))}
                              </tr>
                          </thead>
                          <tbody>
                            {customerRetentionData.map((row, index) => (
                              <tr key={index}>
                                {getSortedColumns(Object.keys(row))
                            .map((column) => {
                              const cellValue = row[column]
                              // ✅ Conditional coloring for net_profit column
                              const isNetProfit = column === 'net_profit'
                              const numericValue = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue).replace(/,/g, ''))
                              const isNegative = !isNaN(numericValue) && numericValue < 0
                              const isPositive = !isNaN(numericValue) && numericValue > 0
                              
                              // ✅ Special rendering for active_days column (clickable)
                              const isActiveDays = column === 'active_days'
                              
                              // ✅ Special rendering for percentage columns (Winrate, WD Rate)
                              const isPercentage = column === 'winrate' || column === 'wd_rate'
                              
                              // ✅ Special rendering for decimal columns (ATV, PF)
                              const isDecimal = column === 'atv' || column === 'pf'
                              
                              // ✅ Special rendering for status column
                              const isStatus = column === 'status'
                              
                              // ✅ Clickable Active Days
                              if (isActiveDays) {
                                return (
                                  <td key={column} style={{ 
                                    textAlign: 'center',
                                    border: '1px solid #e0e0e0',
                                    padding: '8px 12px'
                                  }}>
                                    <button
                                      onClick={() => handleActiveDaysClick(row.user_name, row.unique_code, row.userkey)}
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
                              
                              if (isStatus) {
                                // Render colored label for status
                                const statusColors = {
                                  'RETENTION': { bg: '#dcfce7', color: '#166534', border: '#86efac' },
                                  'REACTIVATION': { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
                                  'NEW DEPOSITOR': { bg: '#fed7aa', color: '#9a3412', border: '#fdba74' },
                                  'N/A': { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' }
                                }
                                const colorScheme = statusColors[cellValue as keyof typeof statusColors] || { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }
                                
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
                                      {cellValue || '-'}
                                    </span>
                                  </td>
                                )
                              }
                              
                              // ✅ Special rendering for percentage columns
                              if (isPercentage) {
                                const percentValue = !isNaN(numericValue) ? (numericValue * 100).toFixed(2) : '0.00'
                                return (
                                  <td key={column} style={{ 
                                    textAlign: 'right',
                                    border: '1px solid #e0e0e0',
                                    padding: '8px 12px',
                                    color: '#374151'
                                  }}>
                                    {percentValue}%
                                  </td>
                                )
                              }
                              
                              // ✅ Special rendering for decimal columns
                              if (isDecimal) {
                                const decimalValue = !isNaN(numericValue) ? numericValue.toFixed(2) : '0.00'
                                return (
                                  <td key={column} style={{ 
                                    textAlign: 'right',
                                    border: '1px solid #e0e0e0',
                                    padding: '8px 12px',
                                    color: '#374151'
                                  }}>
                                    {decimalValue}
                                  </td>
                                )
                              }
                              
                              return (
                                <td key={column} style={{ 
                                  textAlign: getColumnAlignment(column, cellValue) as 'left' | 'right' | 'center',
                                  border: '1px solid #e0e0e0',
                                  padding: '8px 12px',
                                  // ✅ Apply color for net_profit: negative = red, positive = green
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
                    )
                })()}

                {/* Table Footer - Records Info + Pagination + Export */}
                <div className="table-footer">
                  <div className="records-info">
                    {statusFilter === 'ALL' ? (
                      <>Showing {customerRetentionData.length} of {pagination.totalRecords.toLocaleString()} records</>
                    ) : (
                      <>Showing {customerRetentionData.length} of {pagination.totalRecords.toLocaleString()} {statusFilter} records</>
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
                      disabled={exporting || customerRetentionData.length === 0}
                      className={`export-button ${exporting || customerRetentionData.length === 0 ? 'disabled' : ''}`}
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
          startDate={dateRange.start}
          endDate={dateRange.end}
          filterMode={filterMode}
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
  startDate: string
  endDate: string
  filterMode: string
}

function TransactionHistoryModal({
  isOpen,
  onClose,
  userName,
  uniqueCode,
  userkey,
  line,
  year,
  month,
  startDate,
  endDate,
  filterMode
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
        filterMode,
        page: pagination.currentPage.toString(),
        limit: pagination.recordsPerPage.toString()
      })

      if (filterMode === 'daterange' && startDate && endDate) {
        params.append('startDate', startDate)
        params.append('endDate', endDate)
      }

      const response = await fetch(`/api/sgd-customer-retention/transaction-history?${params}`, {
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
  }, [userkey, line, year, month, startDate, endDate, filterMode, pagination.currentPage, pagination.recordsPerPage])

  useEffect(() => {
    if (isOpen) {
      fetchTransactionHistory()
    }
  }, [isOpen, fetchTransactionHistory])

  // Reset pagination when modal opens
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
          minHeight: 0, // Important for flex child scrolling
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
              {/* Table Header - Fixed/Frozen */}
              <div style={{ 
                backgroundColor: '#374151',
                overflowX: 'auto',
                flexShrink: 0
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
                  <thead>
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
              </table>
            </div>

            {/* Table Body - Scrollable (Max 10 rows visible) */}
            <div style={{ 
              flex: 1,
              overflowY: 'auto',
              overflowX: 'auto',
              maxHeight: '450px' // ~10 rows max (45px per row)
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