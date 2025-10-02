'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'

interface AdjustmentData {
  [key: string]: any
}

interface SlicerOptions {
  currencies: string[]
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

export default function TransactionAdjustment() {
  // SLICERS STATE
  const [currency, setCurrency] = useState('ALL')
  const [line, setLine] = useState('ALL')
  const [year, setYear] = useState('ALL')
  const [month, setMonth] = useState('ALL')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [filterMode, setFilterMode] = useState('month') // 'month' or 'daterange'
  const [useDateRange, setUseDateRange] = useState(false)

  // DATA STATES
  const [adjustmentData, setAdjustmentData] = useState<AdjustmentData[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 1000, // 1000 records per page, displayed 15 at a time with scroll
    hasNextPage: false,
    hasPrevPage: false
  })
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions>({
    currencies: [],
    lines: [],
    years: [],
    months: [],
    dateRange: { min: '', max: '' }
  })
  const [loading, setLoading] = useState(true)
  const [slicerLoading, setSlicerLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

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
    fetchAdjustmentData()
  }, [])

  useEffect(() => {
    if (currency !== 'ALL') {
      fetchSlicerOptions()
    }
  }, [currency])

  useEffect(() => {
    // Only fetch data if we're not in initial loading state
    if (pagination.currentPage > 0) {
      fetchAdjustmentData()
    }
  }, [currency, line, year, month, dateRange, filterMode, pagination.currentPage])

  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      const params = new URLSearchParams()
      if (currency && currency !== 'ALL') {
        params.append('selectedCurrency', currency)
      }
      
      const response = await fetch(`/api/adjustment/slicer-options?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.options)
        
        // Reset line selection if current line is not available in new options
        if (line !== 'ALL' && !result.options.lines.includes(line)) {
          setLine('ALL')
        }
      } else {
        console.error('Error fetching slicer options:', result.error)
      }
    } catch (error) {
      console.error('Error fetching slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }

  const fetchAdjustmentData = async () => {
    try {
      setLoading(true)
      console.log('🔄 Fetching adjustment data...')
      
      const params = new URLSearchParams({
        currency,
        line,
        year,
        month,
        startDate: dateRange.start,
        endDate: dateRange.end,
        filterMode,
        page: pagination.currentPage.toString(),
        limit: pagination.recordsPerPage.toString()
      })

      console.log('📊 API params:', Object.fromEntries(params))
      
      const response = await fetch(`/api/adjustment/data?${params}`)
      const result = await response.json()
      
      console.log('📊 API response:', result)
      
      if (result.success) {
        setAdjustmentData(result.data)
        setPagination(result.pagination)
        console.log(`✅ Loaded ${result.data.length} records`)
        setLoading(false) // Set loading to false immediately after setting data
      } else {
        console.error('Error fetching data:', result.error)
        setAdjustmentData([])
        setPagination(prev => ({ 
          ...prev, 
          totalRecords: 0, 
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }))
        setLoading(false) // Set loading to false even on error
      }
    } catch (error) {
      console.error('Error fetching adjustment data:', error)
      setAdjustmentData([])
      setPagination(prev => ({ 
        ...prev, 
        totalRecords: 0, 
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }))
      setLoading(false) // Set loading to false even on error
    }
  }

  // Reset pagination when filters change
  const resetPagination = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  // HANDLE MONTH SELECTION
  const handleMonthChange = (selectedMonth: string) => {
    setMonth(selectedMonth)
    setFilterMode('month')
    setDateRange({ start: '', end: '' }) // Clear date range
    setUseDateRange(false) // Uncheck date range
    resetPagination()
  }

  // HANDLE DATE RANGE SELECTION
  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
    if (value) {
      setFilterMode('daterange')
      setMonth('') // Clear month
      resetPagination()
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
    resetPagination()
  }

  // EXPORT FUNCTION
  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/adjustment/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currency,
          line,
          year,
          month,
          startDate: dateRange.start,
          endDate: dateRange.end,
          filterMode
        }),
      })

      if (response.ok) {
        // Create download link
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        
        // Get filename from response headers
        const contentDisposition = response.headers.get('content-disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : 'adjustment_daily_export.csv'
        
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

  // SubHeader content
  const subHeaderContent = (
    <div className="dashboard-subheader">
      <div className="subheader-left">
        <span className="filter-export-text"> </span>
      </div>
      <div className="subheader-controls">
        {/* CURRENCY SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">CURRENCY:</label>
          <select 
            value={currency} 
            onChange={(e) => {
              setCurrency(e.target.value)
              resetPagination()
            }}
            className="slicer-select"
          >
            <option value="ALL">All</option>
            {slicerOptions.currencies.map(curr => (
              <option key={curr} value={curr}>{curr}</option>
            ))}
          </select>
        </div>

        {/* LINE SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <select 
            value={line} 
            onChange={(e) => {
              setLine(e.target.value)
              resetPagination()
            }}
            disabled={currency === 'ALL' || slicerLoading}
            className={`slicer-select ${currency === 'ALL' || slicerLoading ? 'disabled' : ''}`}
          >
            <option value="ALL">All</option>
            {slicerOptions.lines.map(ln => (
              <option key={ln} value={ln}>{ln}</option>
            ))}
          </select>
        </div>

        {/* YEAR SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">YEAR:</label>
          <select 
            value={year} 
            onChange={(e) => {
              setYear(e.target.value)
              resetPagination()
            }}
            className="slicer-select"
          >
            <option value="ALL">All</option>
            {slicerOptions.years.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>

        {/* MONTH SLICER - DISABLED IF DATE RANGE ACTIVE */}
        <div className="slicer-group">
          <label className="slicer-label">MONTH:</label>
          <select 
            value={month} 
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={useDateRange}
            className={`slicer-select ${useDateRange ? 'disabled' : ''}`}
          >
            <option value="ALL">All</option>
            {slicerOptions.months.map(mo => (
              <option key={mo.value} value={mo.value}>{mo.label}</option>
            ))}
          </select>
        </div>



        {/* EXPORT BUTTON */}
        <button 
          onClick={handleExport}
          disabled={exporting || adjustmentData.length === 0}
          className={`export-button ${exporting || adjustmentData.length === 0 ? 'disabled' : ''}`}
        >
          {exporting ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
  )

  return (
    <Layout customSubHeader={subHeaderContent}>
      <Frame variant="compact">
        <div className="deposit-container">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading adjustment data...</p>
            </div>
          ) : adjustmentData.length === 0 ? (
            <div className="empty-container">
              <div className="empty-icon">📭</div>
              <div className="empty-text">
                No adjustment data found for the selected filters
              </div>
            </div>
          ) : (
            <>
              {/* SIMPLE TABLE - REBUILT FROM SCRATCH */}
              <div className="simple-table-container">
                
                {/* Date Range Controls Only - No Title */}
                <div className="table-header-controls">
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
                
                {/* Simple Table */}
                <div className="simple-table-wrapper">
                  <table className="simple-table">
                    <thead>
                      <tr>
                        {adjustmentData.length > 0 && Object.keys(adjustmentData[0]).map((column) => (
                          <th key={column} style={{ textAlign: 'center' }}>{column.toUpperCase().replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adjustmentData.map((row, index) => (
                        <tr key={index}>
                          {Object.keys(row).map((column) => (
                            <td key={column} style={{ textAlign: 'center' }}>
                              {formatTableCell(row[column])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer - Records Info + Pagination */}
                <div className="table-footer">
                  <div className="records-info">
                    Showing {Math.min(adjustmentData.length, 1000)} of {pagination.totalRecords.toLocaleString()} records
                  </div>
                  
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
                </div>
              </div>
            </>
          )}
        </div>
      </Frame>
    </Layout>
  )
} 