'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'

interface WithdrawData {
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

export default function WithdrawPage() {
  const [currency, setCurrency] = useState('ALL')
  const [line, setLine] = useState('ALL')
  const [year, setYear] = useState('ALL')
  const [month, setMonth] = useState('ALL')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [filterMode, setFilterMode] = useState('month')
  const [useDateRange, setUseDateRange] = useState(false)

  const [withdrawData, setWithdrawData] = useState<WithdrawData[]>([])
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
    fetchWithdrawData()
  }, [])

  useEffect(() => {
    if (currency !== 'ALL') {
      fetchSlicerOptions()
    }
  }, [currency])

  useEffect(() => {
    if (pagination.currentPage > 0) {
      fetchWithdrawData()
    }
  }, [currency, line, year, month, dateRange, filterMode, pagination.currentPage])

  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      const params = new URLSearchParams()
      if (currency !== 'ALL') {
        params.append('selectedCurrency', currency)
      }
      
      const response = await fetch(`/api/withdraw/slicer-options?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.data)
      }
    } catch (error) {
      console.error('Error fetching withdraw slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }

  const fetchWithdrawData = async () => {
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

      const response = await fetch(`/api/withdraw/data?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setWithdrawData(result.data)
        setPagination(result.pagination)
        setLoading(false)
      } else {
        setWithdrawData([])
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
      console.error('Error fetching withdraw data:', error)
      setWithdrawData([])
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

  const resetPagination = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }))
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/withdraw/export', {
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
          : 'withdraw_export.csv'
        
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
        Filter & Export ({pagination.totalRecords.toLocaleString()} records)
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

        <div className="slicer-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={useDateRange}
              onChange={(e) => {
                setUseDateRange(e.target.checked)
                if (!e.target.checked) {
                  setDateRange({ start: '', end: '' })
                  setFilterMode('month')
                }
                resetPagination()
              }}
            />
            DATE RANGE
          </label>
        </div>

        <div className="slicer-group">
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

        <button 
          onClick={handleExport}
          disabled={exporting || withdrawData.length === 0}
          className={`export-button ${exporting || withdrawData.length === 0 ? 'disabled' : ''}`}
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
              <p>Loading withdraw data...</p>
            </div>
          ) : withdrawData.length === 0 ? (
            <div className="empty-container">
              <div className="empty-icon">📭</div>
              <div className="empty-text">
                No withdraw data found for the selected filters
              </div>
            </div>
          ) : (
            <>
              <div className="simple-table-container">
                <div className="simple-title">
                  <h2>Withdraw Daily Data (Page {pagination.currentPage} of {pagination.totalPages})</h2>
                  <p>Showing {Math.min(withdrawData.length, 1000)} of {pagination.totalRecords.toLocaleString()} records</p>
                </div>
                
                <div className="simple-table-wrapper">
                  <table className="simple-table">
                    <thead>
                      <tr>
                        {withdrawData.length > 0 && Object.keys(withdrawData[0]).map((column) => (
                          <th key={column}>{column.toUpperCase().replace(/_/g, ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawData.map((row, index) => (
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

                {pagination.totalPages > 1 && (
                  <div className="pagination-controls">
                    <button 
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                      className={`pagination-btn ${!pagination.hasPrevPage ? 'disabled' : ''}`}
                    >
                      ← Prev
                    </button>
                    
                    <span className="pagination-info">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    
                    <button 
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                      className={`pagination-btn ${!pagination.hasNextPage ? 'disabled' : ''}`}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Frame>
    </Layout>
  )
}
