'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'

interface NewRegisterData {
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

export default function NewRegisterPage() {
  const [currency, setCurrency] = useState('ALL')
  const [line, setLine] = useState('ALL')
  const [year, setYear] = useState('ALL')
  const [month, setMonth] = useState('ALL')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [filterMode, setFilterMode] = useState('month')
  const [useDateRange, setUseDateRange] = useState(false)

  const [newRegisterData, setNewRegisterData] = useState<NewRegisterData[]>([])
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
    fetchNewRegisterData()
  }, [])

  useEffect(() => {
    if (currency !== 'ALL') {
      fetchSlicerOptions()
    }
  }, [currency])

  useEffect(() => {
    if (pagination.currentPage > 0) {
      fetchNewRegisterData()
    }
  }, [currency, line, year, month, dateRange, filterMode, pagination.currentPage])

  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      const params = new URLSearchParams()
      if (currency !== 'ALL') {
        params.append('selectedCurrency', currency)
      }
      
      const response = await fetch(`/api/new-register/slicer-options?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.data)
      }
    } catch (error) {
      console.error('Error fetching new-register slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }

  const fetchNewRegisterData = async () => {
    try {
      setLoading(true)
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

      const response = await fetch(`/api/new-register/data?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setNewRegisterData(result.data)
        setPagination(result.pagination)
        setLoading(false)
      } else {
        setNewRegisterData([])
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
      console.error('Error fetching new-register data:', error)
      setNewRegisterData([])
      setLoading(false)
    }
  }

  const handleMonthChange = (selectedMonth: string) => {
    setMonth(selectedMonth)
    setFilterMode('month')
    setUseDateRange(false)
    resetPagination()
  }

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
    if (field === 'start' || (field === 'end' && dateRange.start)) {
      setFilterMode('daterange')
      setUseDateRange(true)
      setMonth('ALL')
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

  const resetPagination = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }))
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/new-register/export', {
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
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        
        const contentDisposition = response.headers.get('content-disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : 'new_register_export.csv'
        
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
          <label className="slicer-label">CURRENCY:</label>
          <select 
            value={currency} 
            onChange={(e) => {
              setCurrency(e.target.value)
              resetPagination()
            }}
            className={`slicer-select ${slicerLoading ? 'disabled' : ''}`}
            disabled={slicerLoading}
          >
            <option value="ALL">All</option>
            {slicerOptions.currencies.map((curr) => (
              <option key={curr} value={curr}>{curr}</option>
            ))}
          </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <select 
            value={line} 
            onChange={(e) => {
              setLine(e.target.value)
              resetPagination()
            }}
            className={`slicer-select ${slicerLoading ? 'disabled' : ''}`}
            disabled={slicerLoading}
          >
            <option value="ALL">All</option>
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
              resetPagination()
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
          onClick={handleExport}
          disabled={exporting || newRegisterData.length === 0}
          className={`export-button ${exporting || newRegisterData.length === 0 ? 'disabled' : ''}`}
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
              <p>Loading new register data...</p>
            </div>
          ) : newRegisterData.length === 0 ? (
            <div className="empty-container">
              <div className="empty-icon">📭</div>
              <div className="empty-text">
                No new register data found for the selected filters
              </div>
            </div>
          ) : (
            <>
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
                
                <div className="simple-table-wrapper">
                  <table className="simple-table">
                    <thead>
                      <tr>
                        {newRegisterData.length > 0 && Object.keys(newRegisterData[0]).map((column) => (
                          <th key={column} style={{ textAlign: 'center' }}>{column.toUpperCase().replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {newRegisterData.map((row, index) => (
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
                    Showing {Math.min(newRegisterData.length, 1000)} of {pagination.totalRecords.toLocaleString()} records
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
