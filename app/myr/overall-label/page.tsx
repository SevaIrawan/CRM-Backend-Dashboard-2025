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
  ggrNegative: number
  underReview: number
}

interface FinalLabelCounts {
  [key: string]: number
}

interface BaseLabelCounts {
  [key: string]: number
}

export default function MYROverallLabelPage() {
  const [line, setLine] = useState('SBMY')
  const [grouping, setGrouping] = useState('A')

  const [overallLabelData, setOverallLabelData] = useState<OverallLabelData[]>([])
  const [kpis, setKpis] = useState<KPIs>({
    activeMultipleBrand: 0,
    priorityContinue: 0,
    continueBusiness: 0,
    continue: 0,
    ggrNegative: 0,
    underReview: 0
  })
  const [finalLabelCounts, setFinalLabelCounts] = useState<FinalLabelCounts>({})
  const [baseLabelCounts, setBaseLabelCounts] = useState<BaseLabelCounts>({})
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
    // New: Avg Monthly metrics (after AVG DEPOSIT AMOUNT)
    'avg_monthly_da',
    'avg_monthly_cases',
    'monthly_avg_net_profit',
    'total_net_profit',
    'total_da',
    'total_dc',
    // New: Withdraw metrics (after Total DC)
    'total_withdraw_cases',
    'total_withdraw_amount',
    // New: Percentage metrics (after Total Withdraw Amount)
    'winrate',
    'withdrawal_rate',
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
    // Force right alignment for percentage columns
    if (column === 'winrate' || column === 'withdrawal_rate') return 'right'
    if (value === undefined) return 'left'
    if (typeof value === 'number') return 'right'
    if (typeof value === 'string') {
      const cleanValue = value.replace(/,/g, '')
      if (!isNaN(Number(cleanValue)) && cleanValue !== '' && cleanValue !== '-') return 'right'
      if (value.trim().endsWith('%')) return 'right'
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'right'
    }
    return 'left'
  }

  // Helper to format percentage values with no decimals
  const formatPercent = (raw: any): string => {
    if (raw === null || raw === undefined || raw === '') return '-'
    if (typeof raw === 'string' && raw.trim().endsWith('%')) return raw
    const num = typeof raw === 'string' ? Number(raw.toString().replace(/,/g, '')) : Number(raw)
    if (isNaN(num)) return '-'
    const pct = num <= 1 && num >= 0 ? num * 100 : num
    const formatted = Number(pct).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return `${formatted}%`
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
        ggrNegative: 0,
        underReview: 0
      })
      setFinalLabelCounts({})
      setBaseLabelCounts({})
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
        console.log('✅ Final Label Counts received:', result.finalLabelCounts)
        console.log('✅ Base Label Counts received:', result.baseLabelCounts)
        setKpis(result.kpis)
        setFinalLabelCounts(result.finalLabelCounts || {})
        setBaseLabelCounts(result.baseLabelCounts || {})
      } else {
        console.error('❌ KPI fetch failed:', result.error, result.message)
        setKpis({
          activeMultipleBrand: 0,
          priorityContinue: 0,
          continueBusiness: 0,
          continue: 0,
          ggrNegative: 0,
          underReview: 0
        })
        setFinalLabelCounts({})
        setBaseLabelCounts({})
      }
    } catch (error) {
      console.error('❌ Error fetching KPIs:', error)
      setKpis({
        activeMultipleBrand: 0,
        priorityContinue: 0,
        continueBusiness: 0,
        continue: 0,
        ggrNegative: 0,
        underReview: 0
      })
      setFinalLabelCounts({})
      setBaseLabelCounts({})
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
                  title="GGR NEGATIVE"
                  value={formatIntegerKPI(kpis.ggrNegative)}
                  icon="GGR Negative"
                />
                <StatCard
                  title="UNDER REVIEW"
                  value={formatIntegerKPI(kpis.underReview)}
                  icon="Under Review"
                />
              </div>

              {/* ROW 2: 2 Bar Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Bar Chart 1: Final Label - Display ALL final labels except Remove */}
                <BarChart
                  title="Final Label"
                  chartIcon={getChartIcon('Final Label')}
                  series={[{
                    name: 'Count',
                    data: Object.values(finalLabelCounts),
                    color: '#3b82f6'
                  }]}
                  categories={Object.keys(finalLabelCounts)}
                  currency="MEMBER"
                />
                
                {/* Bar Chart 2: Label (Base Label) - Coming Soon (Premium) */}
                <div style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '40px 24px',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(16, 24, 40, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '280px',
                  position: 'relative'
                }}>
                  {/* Icon Circle */}
                  <div style={{
                    width: '92px',
                    height: '92px',
                    borderRadius: '9999px',
                    background: '#f8fafc',
                    border: '2px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}>
                    {/* Clock Icon */}
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="9" stroke="#94a3b8" strokeWidth="1.5" fill="#fff" />
                      <path d="M12 7v5l3 1.5" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {/* Headline */}
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#1f2937',
                    marginBottom: '6px',
                    letterSpacing: '0.01em'
                  }}>
                    Label (Base) Coming Soon
                  </div>

                  {/* Subheadline */}
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    maxWidth: '640px',
                    lineHeight: 1.6,
                    marginBottom: '16px'
                  }}>
                    Visualisasi distribusi member berdasarkan Base Label sedang dikembangkan agar selaras dengan standar chart NEXMAX dan siap diekspor.
                  </div>

                  {/* Small Note */}
                  <div style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    marginBottom: '18px'
                  }}>
                    We’re working hard to bring this feature. Please check back soon!
                  </div>

                  {/* Status Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    borderRadius: '9999px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.06)'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#ffffff',
                      borderRadius: '9999px'
                    }} />
                    In Development
                  </div>
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
                                  {column === 'winrate' || column === 'withdrawal_rate' 
                                    ? formatPercent(row[column]) 
                                    : formatTableCell(row[column])}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer - Records Info + Pagination + Export */}
                  <div className="table-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
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
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                        disabled={exporting || overallLabelData.length === 0}
                        className={`export-button ${exporting || overallLabelData.length === 0 ? 'disabled' : ''}`}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: exporting || overallLabelData.length === 0 ? '#9ca3af' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: exporting || overallLabelData.length === 0 ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.2s ease',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          if (!exporting && overallLabelData.length > 0) {
                            e.currentTarget.style.backgroundColor = '#059669'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!exporting && overallLabelData.length > 0) {
                            e.currentTarget.style.backgroundColor = '#10b981'
                          }
                        }}
                      >
                        {exporting ? 'Exporting...' : 'Export'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Slicer Info */}
              <div className="slicer-info">
                <p>Showing data for: {line} | {grouping}</p>
              </div>
            </>
          )}
        </div>
      </Frame>

    </Layout>
  )
}

