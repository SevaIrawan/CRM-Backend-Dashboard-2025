'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import { LineSlicer } from '@/components/slicers'

interface RetentionData {
  unique_code: string
  user_name: string
  last_deposit_date: string
  active_days: number
  inactive_days: number
  deposit_cases: number
  deposit_amount: number
  withdraw_cases: number
  withdraw_amount: number
  net_profit: number
  winrate: number
}

interface SlicerOptions {
  currencies: string[]
  lines: string[]
  years: string[]
  months: { value: string; label: string; years?: string[] }[]
  dateRange: { min: string; max: string }
  defaults: {
    currency: string
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

export default function CustomerRetentionUSC() {
  // SLICERS STATE
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedLine, setSelectedLine] = useState('ALL')
  const [selectedCurrency] = useState('USC') // Locked to USC

  // DATA STATES
  const [retentionData, setRetentionData] = useState<RetentionData[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 1000,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Load slicer options on mount
  useEffect(() => {
    const loadSlicerOptions = async () => {
      try {
        setLoading(true)
        
        const response = await fetch('/api/usc-customer-retention/slicer-options')
        const result = await response.json()

        if (result.success) {
          console.log('🔍 [USC Customer Retention] Slicer data received from API')
          
          setSlicerOptions(result.data)
          setSelectedYear(result.data.defaults.year)
          setSelectedMonth(result.data.defaults.month)
          setSelectedLine(result.data.defaults.line)
          
          console.log('✅ [USC Customer Retention] Slicers set to defaults')
        } else {
          console.error('Failed to load slicer options')
        }
      } catch (error) {
        console.error('Error loading slicer options:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSlicerOptions()
  }, [])

  // Load retention data when filters change
  useEffect(() => {
    if (!selectedYear || !selectedMonth || !selectedLine) {
      console.log('⏸️ [USC Customer Retention] Skipping fetch - filters not ready')
      return
    }

    console.log('🔄 [USC Customer Retention] useEffect triggered - fetching data...')
    fetchRetentionData()
  }, [selectedYear, selectedMonth, selectedLine, pagination.currentPage])

  const fetchRetentionData = async () => {
    try {
      setLoading(true)
      console.log('🔄 [USC Customer Retention] Fetching retention data...')
      
      const params = new URLSearchParams({
        line: selectedLine,
        year: selectedYear,
        month: selectedMonth,
        page: pagination.currentPage.toString(),
        limit: pagination.recordsPerPage.toString()
      })

      const response = await fetch(`/api/usc-customer-retention/data?${params}`)
      const result = await response.json()
      
      console.log('📊 [USC Customer Retention] API response:', result)
      
      if (result.success) {
        setRetentionData(result.data)
        setPagination(result.pagination)
        console.log(`✅ Loaded ${result.data.length} retained members`)
      } else {
        console.error('Error fetching data:', result.error)
        setRetentionData([])
        setPagination(prev => ({ 
          ...prev, 
          totalRecords: 0, 
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }))
      }
    } catch (error) {
      console.error('Error fetching retention data:', error)
      setRetentionData([])
    } finally {
      setLoading(false)
    }
  }

  // Reset pagination when filters change
  const resetPagination = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  // EXPORT FUNCTION
  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/usc-customer-retention/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line: selectedLine,
          year: selectedYear,
          month: selectedMonth
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
          : 'usc_customer_retention_export.csv'
        
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

  // Format functions
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const formatInteger = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  const formatPercentage = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + '%'
  }

  // SubHeader with slicers
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        {/* Title area - left side */}
      </div>
      
      <div className="subheader-controls">
        {/* YEAR SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">YEAR:</label>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value)
              resetPagination()
            }}
            className="subheader-select"
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '100px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            {slicerOptions?.years?.map((year: string) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* MONTH SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">MONTH:</label>
          <select
            value={selectedMonth} 
            onChange={(e) => {
              setSelectedMonth(e.target.value)
              resetPagination()
            }}
            className="subheader-select"
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '120px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            {slicerOptions?.months
              ?.filter((month: any) => {
                if (month.value === 'ALL') return true;
                if (!selectedYear) return true;
                return month.years && month.years.includes(selectedYear);
              })
              ?.map((month: any) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
          </select>
        </div>

        {/* LINE SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <LineSlicer 
            lines={slicerOptions?.lines || []}
            selectedLine={selectedLine}
            onLineChange={(newLine) => {
              setSelectedLine(newLine)
              resetPagination()
            }}
          />
        </div>

        {/* EXPORT BUTTON */}
        <button
          onClick={handleExport}
          disabled={exporting || loading || retentionData.length === 0}
          style={{
            padding: '8px 16px',
            backgroundColor: exporting || loading || retentionData.length === 0 ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: exporting || loading || retentionData.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            marginLeft: '16px'
          }}
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>
    </div>
  )

  // Show loading state if slicers not ready
  if (!slicerOptions) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading slicer options...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="compact">
        <div style={{ padding: '20px' }}>
          {/* Table Container */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Table with frozen header */}
            <div style={{ 
              maxHeight: '600px', 
              overflowY: 'auto',
              overflowX: 'auto',
              position: 'relative'
            }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading retention data...</p>
                </div>
              ) : retentionData.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>No retained members found for selected period.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ 
                    position: 'sticky', 
                    top: 0, 
                    zIndex: 10,
                    backgroundColor: '#1e293b'
                  }}>
                    <tr style={{ backgroundColor: '#1e293b', borderBottom: '2px solid #334155' }}>
                      <th style={{...headerStyle, backgroundColor: '#1e293b', color: '#ffffff'}}>Unique Code</th>
                      <th style={{...headerStyle, backgroundColor: '#1e293b', color: '#ffffff'}}>User Name</th>
                      <th style={{...headerStyleRight, backgroundColor: '#1e293b', color: '#ffffff'}}>Last Deposit Date</th>
                      <th style={{...headerStyleRight, backgroundColor: '#1e293b', color: '#ffffff'}}>Active Days</th>
                      <th style={{...headerStyleRight, backgroundColor: '#1e293b', color: '#ffffff'}}>Inactive Days</th>
                      <th style={{...headerStyleRight, backgroundColor: '#1e293b', color: '#ffffff'}}>Deposit Cases</th>
                      <th style={{...headerStyleRight, backgroundColor: '#1e293b', color: '#ffffff'}}>Deposit Amount</th>
                      <th style={{...headerStyleRight, backgroundColor: '#1e293b', color: '#ffffff'}}>Withdraw Cases</th>
                      <th style={{...headerStyleRight, backgroundColor: '#1e293b', color: '#ffffff'}}>Withdraw Amount</th>
                      <th style={{...headerStyleRight, backgroundColor: '#1e293b', color: '#ffffff'}}>Net Profit</th>
                      <th style={{...headerStyleRight, backgroundColor: '#1e293b', color: '#ffffff'}}>Winrate (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retentionData.map((row, index) => (
                      <tr 
                        key={`${row.unique_code}-${index}`}
                        style={{ 
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#eff6ff'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f9fafb'
                        }}
                      >
                        <td style={cellStyle}>{row.unique_code}</td>
                        <td style={cellStyle}>{row.user_name}</td>
                        <td style={cellStyleRight}>{row.last_deposit_date}</td>
                        <td style={cellStyleRight}>{formatInteger(row.active_days)}</td>
                        <td style={cellStyleRight}>{formatInteger(row.inactive_days)}</td>
                        <td style={cellStyleRight}>{formatInteger(row.deposit_cases)}</td>
                        <td style={cellStyleRight}>USD {formatCurrency(row.deposit_amount)}</td>
                        <td style={cellStyleRight}>{formatInteger(row.withdraw_cases)}</td>
                        <td style={cellStyleRight}>USD {formatCurrency(row.withdraw_amount)}</td>
                        <td style={{
                          ...cellStyleRight,
                          fontWeight: '600',
                          color: row.net_profit >= 0 ? '#059669' : '#dc2626'
                        }}>
                          USD {formatCurrency(row.net_profit)}
                        </td>
                        <td style={cellStyleRight}>{formatPercentage(row.winrate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Section - Pagination LEFT, Caption RIGHT */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              {/* Left side - Pagination Controls */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={!pagination.hasPrevPage || loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: pagination.hasPrevPage && !loading ? '#3b82f6' : '#e5e7eb',
                    color: pagination.hasPrevPage && !loading ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: pagination.hasPrevPage && !loading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Previous
                </button>
                
                <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500', minWidth: '100px', textAlign: 'center' }}>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={!pagination.hasNextPage || loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: pagination.hasNextPage && !loading ? '#3b82f6' : '#e5e7eb',
                    color: pagination.hasNextPage && !loading ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: pagination.hasNextPage && !loading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Next
                </button>
              </div>

              {/* Right side - Showing caption */}
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Showing <span style={{ fontWeight: '600', color: '#374151' }}>
                  {retentionData.length > 0 ? ((pagination.currentPage - 1) * pagination.recordsPerPage + 1) : 0}
                </span> to <span style={{ fontWeight: '600', color: '#374151' }}>
                  {Math.min(pagination.currentPage * pagination.recordsPerPage, pagination.totalRecords)}
                </span> of <span style={{ fontWeight: '600', color: '#374151' }}>
                  {pagination.totalRecords.toLocaleString()}
                </span> records
              </div>
            </div>
          </div>
        </div>
      </Frame>
    </Layout>
  )
}

// Styles
const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '13px',
  fontWeight: '600',
  color: '#ffffff',
  backgroundColor: '#1e293b',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap'
}

const headerStyleRight: React.CSSProperties = {
  ...headerStyle,
  textAlign: 'right'
}

const cellStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  color: '#1f2937',
  whiteSpace: 'nowrap'
}

const cellStyleRight: React.CSSProperties = {
  ...cellStyle,
  textAlign: 'right'
}

