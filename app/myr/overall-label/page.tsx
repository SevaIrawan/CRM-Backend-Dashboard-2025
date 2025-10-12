'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StatCard from '@/components/StatCard'
import BarChart from '@/components/BarChart'
import { formatIntegerKPI } from '@/lib/formatHelpers'
import { getChartIcon } from '@/lib/CentralIcon'

interface SlicerOptions {
  lines: string[]
  groupings: string[]
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalRecords: number
  recordsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface OverallLabelData {
  [key: string]: any
}

interface KPIs {
  activeMultipleBrand: number
  priorityContinue: number
  continueBusiness: number
  continue: number
  priorityReactivate: number
  reactivate: number
}

export default function MYROverallLabelPage() {
  const [line, setLine] = useState('ALL')
  const [grouping, setGrouping] = useState('ALL')

  const [overallLabelData, setOverallLabelData] = useState<OverallLabelData[]>([])
  const [kpis, setKpis] = useState<KPIs>({
    activeMultipleBrand: 0,
    priorityContinue: 0,
    continueBusiness: 0,
    continue: 0,
    priorityReactivate: 0,
    reactivate: 0
  })
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
    groupings: []
  })
  const [recordsPerPage, setRecordsPerPage] = useState(1000)
  const [loading, setLoading] = useState(true)
  const [slicerLoading, setSlicerLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Auto-detect grouping based on line
  const getGroupingFromLine = (selectedLine: string): string => {
    const lineGroupingMap: { [key: string]: string } = {
      'SBMY': 'A',
      'LVMY': 'B',
      'STMY': 'C',
      'FWMY': 'C',
      'JMMY': 'D',
      'UVMY': 'D'
    }
    return lineGroupingMap[selectedLine] || 'ALL'
  }

  // Columns to display - as specified
  const displayColumns = [
    'unique_code',
    'label',
    'brand_count',
    'brand_active',
    'active_period_months',
    'avg_deposit_amount',
    'monthly_avg_net_profit',
    'total_net_profit',
    'total_da',
    'total_dc',
    'first_deposit_date',
    'last_deposit_date',
    'active_group_count',
    'active_top_3_groups',
    'historical_groups_count',
    'historical_top_3_groups',
    'net_profit_all_brand'
  ]
  
  // Function to get sorted columns
  const getSortedColumns = (dataKeys: string[]): string[] => {
    return displayColumns.filter(col => dataKeys.includes(col))
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

  // Get color for profit columns
  const getProfitColor = (column: string, value: any): string => {
    if (column === 'total_net_profit' || column === 'monthly_avg_net_profit') {
      if (typeof value === 'number') {
        if (value > 0) return '#10b981' // Green
        if (value < 0) return '#ef4444' // Red
      }
    }
    return 'inherit' // Default color
  }

  // Handle records per page change
  const handleRecordsPerPageChange = (newLimit: number) => {
    setRecordsPerPage(newLimit)
    setPagination(prev => ({
      ...prev,
      recordsPerPage: newLimit,
      currentPage: 1
    }))
  }

  useEffect(() => {
    fetchSlicerOptions()
    fetchOverallLabelData()
    fetchKPIs() // Separate API call for KPIs
  }, [])
  
  // Auto-detect grouping when line changes
  useEffect(() => {
    if (line !== 'ALL') {
      const detectedGrouping = getGroupingFromLine(line)
      setGrouping(detectedGrouping)
    } else {
      setGrouping('ALL')
    }
  }, [line])

  // Fetch KPIs when slicer changes
  useEffect(() => {
    fetchKPIs()
  }, [line, grouping])

  useEffect(() => {
    if (pagination.currentPage > 0) {
      fetchOverallLabelData()
    }
  }, [pagination.currentPage, recordsPerPage])

  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      
      const response = await fetch('/api/myr-overall-label/slicer-options')
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.data)
      }
    } catch (error) {
      console.error('Error fetching slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }

  const fetchKPIs = async () => {
    // Skip if grouping is ALL
    if (grouping === 'ALL') {
      console.log('⚠️ Grouping is ALL, skipping KPI fetch')
      setKpis({
        activeMultipleBrand: 0,
        priorityContinue: 0,
        continueBusiness: 0,
        continue: 0,
        priorityReactivate: 0,
        reactivate: 0
      })
      return
    }

    try {
      const params = new URLSearchParams({
        line,
        grouping
      })

      console.log('🔍 Fetching KPIs with params:', { line, grouping })

      const response = await fetch(`/api/myr-overall-label/kpis?${params}`)
      const result = await response.json()
      
      console.log('📊 KPI API Response:', result)
      
      if (result.success) {
        console.log('✅ KPIs received:', result.kpis)
        setKpis(result.kpis)
      } else {
        console.error('❌ KPI fetch failed:', result.error, result.message)
        setKpis({
          activeMultipleBrand: 0,
          priorityContinue: 0,
          continueBusiness: 0,
          continue: 0,
          priorityReactivate: 0,
          reactivate: 0
        })
      }
    } catch (error) {
      console.error('❌ Error fetching KPIs:', error)
      setKpis({
        activeMultipleBrand: 0,
        priorityContinue: 0,
        continueBusiness: 0,
        continue: 0,
        priorityReactivate: 0,
        reactivate: 0
      })
    }
  }

  const fetchOverallLabelData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: recordsPerPage.toString()
      })

      const response = await fetch(`/api/myr-overall-label/data?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setOverallLabelData(result.data)
        setPagination(result.pagination)
        setLoading(false)
      } else {
        setOverallLabelData([])
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
      console.error('Error fetching overall label data:', error)
      setOverallLabelData([])
      setLoading(false)
    }
  }

  const resetPagination = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      
      const response = await fetch('/api/myr-overall-label/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(600000) // 10 minutes timeout for large exports
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
          : 'myr_overall_label_export.csv'
        
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
            <option value="ALL">All</option>
            {slicerOptions.lines.map((lineOption) => (
              <option key={lineOption} value={lineOption}>{lineOption}</option>
            ))}
          </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">GROUPING:</label>
          <select 
            value={grouping} 
            onChange={(e) => setGrouping(e.target.value)}
            className="slicer-select"
            disabled={line !== 'ALL'}
          >
            <option value="ALL">All</option>
            {slicerOptions.groupings.map((groupingOption) => (
              <option key={groupingOption} value={groupingOption}>{groupingOption}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleExport}
          disabled={exporting || overallLabelData.length === 0}
          className={`export-button ${exporting || overallLabelData.length === 0 ? 'disabled' : ''}`}
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
              <p>Loading Overall Label data...</p>
            </div>
          ) : (
            <>
              {/* ROW 1: 6 KPI Cards */}
              <div className="kpi-row" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(6, 1fr)', 
                gap: '15px', 
                marginBottom: '20px' 
              }}>
                <StatCard
                  title="ACTIVE MULTIPLE BRAND"
                  value={formatIntegerKPI(kpis.activeMultipleBrand)}
                  icon="Active Multiple Brand"
                />
                <StatCard
                  title="PRIORITY CONTINUE"
                  value={formatIntegerKPI(kpis.priorityContinue)}
                  icon="Priority Continue"
                />
                <StatCard
                  title="CONTINUE BUSINESS"
                  value={formatIntegerKPI(kpis.continueBusiness)}
                  icon="Continue Business"
                />
                <StatCard
                  title="CONTINUE"
                  value={formatIntegerKPI(kpis.continue)}
                  icon="Continue"
                />
                <StatCard
                  title="PRIORITY REACTIVATE"
                  value={formatIntegerKPI(kpis.priorityReactivate)}
                  icon="Priority Reactivate"
                />
                <StatCard
                  title="REACTIVATE"
                  value={formatIntegerKPI(kpis.reactivate)}
                  icon="Reactivate"
                />
              </div>

              {/* ROW 2: 2 Bar Charts (Coming Soon) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div style={{
                  border: '2px dashed #e5e7eb',
                  borderRadius: '8px',
                  padding: '40px',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Final Label</h3>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Chart Coming Soon</p>
                </div>
                <div style={{
                  border: '2px dashed #e5e7eb',
                  borderRadius: '8px',
                  padding: '40px',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Label</h3>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Chart Coming Soon</p>
                </div>
              </div>

              {/* ROW 3: Table */}
              {overallLabelData.length === 0 ? (
                <div className="empty-container">
                  <div className="empty-icon">📭</div>
                  <div className="empty-text">
                    No Overall Label data found for the selected filters
                  </div>
                </div>
              ) : (
                <div className="simple-table-container">
                  <div className="simple-table-wrapper">
                    <table className="simple-table" style={{
                      borderCollapse: 'collapse',
                      border: '1px solid #e0e0e0'
                    }}>
                      <thead>
                        <tr>
                          {overallLabelData.length > 0 && getSortedColumns(Object.keys(overallLabelData[0]))
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
                        {overallLabelData.map((row, index) => (
                          <tr key={index}>
                            {getSortedColumns(Object.keys(row))
                              .map((column) => (
                                <td key={column} style={{ 
                                  textAlign: getColumnAlignment(column, row[column]) as 'left' | 'right' | 'center',
                                  border: '1px solid #e0e0e0',
                                  padding: '8px 12px',
                                  color: getProfitColor(column, row[column]),
                                  fontWeight: (column === 'total_net_profit' || column === 'monthly_avg_net_profit') ? '600' : 'normal'
                                }}>
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
                    <div className="records-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span>
                        Showing {overallLabelData.length} of {pagination.totalRecords.toLocaleString()} records
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '14px', color: '#6b7280' }}>Per Page:</label>
                        <select
                          value={recordsPerPage}
                          onChange={(e) => handleRecordsPerPageChange(Number(e.target.value))}
                          style={{
                            padding: '4px 8px',
                            fontSize: '14px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={1000}>1000</option>
                        </select>
                      </div>
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
              )}
            </>
          )}
        </div>
      </Frame>
    </Layout>
  )
}

