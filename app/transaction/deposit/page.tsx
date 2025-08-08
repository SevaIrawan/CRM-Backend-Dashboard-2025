'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'

interface DepositData {
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

export default function TransactionDeposit() {
  // SLICERS STATE
  const [currency, setCurrency] = useState('ALL')
  const [line, setLine] = useState('ALL')
  const [year, setYear] = useState('ALL')
  const [month, setMonth] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [filterMode, setFilterMode] = useState('month') // 'month' or 'daterange'
  const [useDateRange, setUseDateRange] = useState(false)

  // DATA STATES
  const [depositData, setDepositData] = useState<DepositData[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 1000,
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

  useEffect(() => {
    fetchSlicerOptions()
    fetchDepositData()
  }, [])

  useEffect(() => {
    if (currency !== 'ALL') {
      fetchSlicerOptions()
    }
  }, [currency])

  useEffect(() => {
    // Only fetch data if we're not in initial loading state
    if (pagination.currentPage > 0) {
      fetchDepositData()
    }
  }, [currency, line, year, month, dateRange, filterMode, pagination.currentPage])

  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      const params = new URLSearchParams()
      if (currency && currency !== 'ALL') {
        params.append('selectedCurrency', currency)
      }
      
      const response = await fetch(`/api/deposit/slicer-options?${params}`)
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

  const fetchDepositData = async () => {
    try {
      setLoading(true)
      console.log('🔄 Fetching deposit data...')
      
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
      
      const response = await fetch(`/api/deposit/data?${params}`)
      const result = await response.json()
      
      console.log('📊 API response:', result)
      
      if (result.success) {
        setDepositData(result.data)
        setPagination(result.pagination)
        console.log(`✅ Loaded ${result.data.length} records`)
        setLoading(false) // Set loading to false immediately after setting data
      } else {
        console.error('Error fetching data:', result.error)
        setDepositData([])
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
      console.error('Error fetching deposit data:', error)
      setDepositData([])
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
      const response = await fetch('/api/deposit/export', {
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
          : 'deposit_daily_export.csv'
        
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
        <span className="filter-export-text">Filter & Export ({pagination.totalRecords.toLocaleString()} records)</span>
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
            <option value="ALL">
              {currency === 'ALL' ? 'Select Currency First' : slicerLoading ? 'Loading...' : 'All'}
            </option>
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
            <option value="">Select Month</option>
            {slicerOptions.months.map(mo => (
              <option key={mo.value} value={mo.value}>{mo.label}</option>
            ))}
          </select>
        </div>

        {/* DATE RANGE TOGGLE CHECKBOX */}
        <div className="slicer-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={useDateRange}
              onChange={(e) => handleDateRangeToggle(e.target.checked)}
            />
            Date Range
          </label>
        </div>

        {/* DATE RANGE SLICERS - DISABLED IF MONTH ACTIVE */}
        <div className="slicer-group">
          <label className="slicer-label">START:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => handleDateRangeChange('start', e.target.value)}
            disabled={!useDateRange}
            min={slicerOptions.dateRange.min}
            max={slicerOptions.dateRange.max}
            className={`slicer-input ${!useDateRange ? 'disabled' : ''}`}
          />
        </div>

        <div className="slicer-group">
          <label className="slicer-label">END:</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => handleDateRangeChange('end', e.target.value)}
            disabled={!useDateRange}
            min={slicerOptions.dateRange.min}
            max={slicerOptions.dateRange.max}
            className={`slicer-input ${!useDateRange ? 'disabled' : ''}`}
          />
        </div>

        {/* EXPORT BUTTON */}
        <button 
          onClick={handleExport}
          disabled={exporting || depositData.length === 0}
          className={`export-button ${exporting || depositData.length === 0 ? 'disabled' : ''}`}
        >
          {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
        </button>
      </div>
    </div>
  )

  return (
    <Layout customSubHeader={subHeaderContent}>
      <Frame>
        <div className="deposit-container">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading deposit data...</p>
            </div>
          ) : depositData.length === 0 ? (
            <div className="empty-container">
              <div className="empty-icon">📭</div>
              <div className="empty-text">
                No deposit data found for the selected filters
              </div>
            </div>
          ) : (
            <>
              <div className="data-table-container">
                <div className="table-header">
                  <h2>Deposit Daily Data (Page {pagination.currentPage} of {pagination.totalPages})</h2>
                  <p>Showing {depositData.length} of {pagination.totalRecords.toLocaleString()} records</p>
                </div>
                
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {depositData.length > 0 && Object.keys(depositData[0]).map((column) => (
                          <th key={column}>{column.toUpperCase().replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {depositData.map((row, index) => (
                        <tr key={index}>
                          {Object.keys(row).map((column) => (
                            <td key={column}>
                              {typeof row[column] === 'number'
                                ? row[column].toFixed(2)
                                : row[column] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Section - Outside table container, bottom right */}
              {pagination.totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                    disabled={!pagination.hasPrevPage}
                    className="pagination-btn"
                  >
                    ← Previous
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
            </>
          )}
        </div>
      </Frame>
    </Layout>
  )
} 