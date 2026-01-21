'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import { KPI_ICONS } from '@/lib/CentralIcon'

interface PureMemberData {
  [key: string]: any
}

interface SlicerOptions {
  years: string[]
  months: Array<{ value: string; label: string }>
  brands?: string[]
  traffic?: string[]
  defaults?: {
    year: string
    month: string
    metrics: string
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

export default function USCPureMemberAnalysisPage() {
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('ALL')
  const [selectedBrand, setSelectedBrand] = useState('ALL')
  const [selectedTraffic, setSelectedTraffic] = useState('ALL')
  const [metrics, setMetrics] = useState('') // existing_member, pure_existing_member, new_depositor, pure_new_depositor
  const [pureMemberData, setPureMemberData] = useState<PureMemberData[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 1000,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions>({
    years: [],
    months: [],
    brands: [],
    traffic: []
  })
  const [loading, setLoading] = useState(true)
  const [slicerLoading, setSlicerLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [searchUserName, setSearchUserName] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [shouldFetchData, setShouldFetchData] = useState(false)

  // Columns to hide (always hidden from all metrics)
  const alwaysHiddenColumns = [
    'ADD_BONUS', 'DEDUCT_BONUS', 'ADD_TRANSACTION', 'DEDUCT_TRANSACTION', 
    'NET_PROFIT', 'WINRATE', 'USERKEY', 'USER_KEY', 'USER_UNIQUE',
    'LAST_DEPOSIT_DATE', 'LAST_DEPOSIT_DATE_MARKET', 'YEAR'
  ]
  
  const isPure = metrics === 'pure_existing_member' || metrics === 'pure_new_depositor'
  
  // Function to check if column should be hidden based on metrics
  const isColumnHidden = (column: string): boolean => {
    const upperColumn = column.toUpperCase()
    
    // Always hide these columns
    if (alwaysHiddenColumns.includes(upperColumn)) return true
    
    // Metric-specific visibility
    if (isPure) {
      // Pure metrics: HANYA 10 KOLOM yang diminta user
      const pureHidden = ['USER_NAME', 'USER_UNIQUE', 'LINE', 'TRAFFIC', 'FIRST_DEPOSIT_DATE', 'FIRST_DEPOSIT_DATE_MARKET', 'FIRST_DEPOSIT_AMOUNT']
      return pureHidden.includes(upperColumn)
    } else {
      // Non-Pure metrics (Old, ND): hide market/brand aggregation columns
      const nonPureHidden = ['FIRST_DEPOSIT_DATE_MARKET', 'BRAND_COUNT', 'BRAND_NAME']
      return nonPureHidden.includes(upperColumn)
    }
  }

  // Column order for table based on metrics
  const getColumnOrder = (): string[] => {
    if (isPure) {
      // Pure Old & Pure ND: 10 columns
      return [
        'unique_code',
        'brand_count',
        'brand_name',
        'atv',
        'deposit_cases',
        'deposit_amount',
        'withdraw_cases',
        'withdraw_amount',
        'bonus',
        'ggr'
      ]
    } else {
      // Old Member & New Depositor: 15 columns (added days_active after first_deposit_amount)
      return [
        'line',
        'unique_code',
        'user_name',
        'traffic',
        'register_date',
        'first_deposit_date',
        'first_deposit_amount',
        'days_active',
        'atv',
        'deposit_cases',
        'deposit_amount',
        'withdraw_cases',
        'withdraw_amount',
        'bonus',
        'ggr'
      ]
    }
  }
  
  const columnOrder = getColumnOrder()

  // Header mapping
  const formatHeaderTitle = (column: string): string => {
    const headerMap: { [key: string]: string } = {
      'unique_code': 'UNIQUE CODE',
      'brand_count': 'BRAND COUNT',
      'brand_name': 'BRAND NAME',
      'first_deposit_date_market': 'FIRST DEPOSIT MARKET',
      'last_deposit_date_market': 'LAST DEPOSIT MARKET',
      'user_name': 'USER NAME',
      'user_unique': 'USER UNIQUE',
      'line': 'BRAND',
      'traffic': 'TRAFFIC',
      'first_deposit_date': 'FDD',
      'first_deposit_amount': 'FDA',
      'days_active': 'DAYS ACTIVE',
      'last_deposit_date': 'LDD',
      'deposit_cases': 'DC',
      'deposit_amount': 'DA',
      'withdraw_cases': 'WC',
      'withdraw_amount': 'WA',
      'bonus': 'BONUS',
      'add_bonus': 'ADD BONUS',
      'deduct_bonus': 'DEDUCT BONUS',
      'add_transaction': 'ADJUST IN',
      'deduct_transaction': 'ADJUST OUT',
      'userkey': 'USERKEY',
      'user_key': 'USER KEY',
      'ggr': 'GGR (D-W)',
      'net_profit': 'NET PROFIT',
      'average_transaction_value': 'ATV',
      'atv': 'ATV',
      'winrate': 'WINRATE',
      'year': 'YEAR'
    }
    
    return headerMap[column.toLowerCase()] || column.toUpperCase()
  }

  // Get metrics display name
  const getMetricsDisplayName = (value: string): string => {
    const metricsMap: { [key: string]: string } = {
      'existing_member': 'Existing Member',
      'pure_existing_member': 'Pure Existing Member',
      'new_depositor': 'New Depositor',
      'pure_new_depositor': 'Pure New Depositor'
    }
    return metricsMap[value] || value
  }

  // Format table cell
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

  // Get column alignment
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

  // Get sorted columns (exclude hidden columns)
  const getSortedColumns = (dataKeys: string[]): string[] => {
    const visibleColumns = dataKeys.filter(column => !isColumnHidden(column))
    const sortedColumns = columnOrder.filter(col => visibleColumns.includes(col))
    const remainingColumns = visibleColumns.filter(col => !columnOrder.includes(col))
    return [...sortedColumns, ...remainingColumns]
  }

  // Filter data based on search user name
  const getFilteredData = () => {
    if (!searchUserName.trim()) {
      return pureMemberData
    }
    
    return pureMemberData.filter((row: any) => {
      const userName = row.user_name || ''
      return userName.toLowerCase().includes(searchUserName.toLowerCase())
    })
  }

  const filteredData = getFilteredData()

  // Handle search (both user name and slicer filters)
  const handleSearch = () => {
    // Handle user name search if not Pure metrics
    if (!isPure && searchInput.trim()) {
      setIsSearching(true)
      setTimeout(() => {
        setSearchUserName(searchInput)
        setIsSearching(false)
      }, 300)
    }
    
    // Trigger data fetch for slicer filters (brand/traffic)
    setShouldFetchData(true)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput('')
    setSearchUserName('')
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isPure) {
      handleSearch()
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSlicerOptions('ALL')
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!initialLoadDone && year && metrics) {
      console.log('✅ [Pure Member Analysis] Initial load with defaults:', { year, month, metrics, brand: selectedBrand })
      fetchPureMemberData(true) // Force fetch for initial load
      setInitialLoadDone(true)
    } else if (initialLoadDone && year && metrics) {
      // Auto fetch when year, month, or metrics change (not brand/traffic)
      // Brand/traffic changes only fetch when Search button is clicked
      console.log('✅ [Pure Member Analysis] Fetching data:', { year, month, metrics, brand: selectedBrand, traffic: selectedTraffic, triggeredBy: shouldFetchData ? 'search' : 'year/month/metrics' })
      // Clear search and reset traffic/brand when switching to Pure metrics
      if (isPure) {
        if (searchUserName || searchInput) {
          setSearchUserName('')
          setSearchInput('')
        }
        // Reset brand and traffic to ALL for Pure metrics
        setSelectedBrand('ALL')
        setSelectedTraffic('ALL')
      }
      fetchPureMemberData(true)
      if (shouldFetchData) {
        setShouldFetchData(false) // Reset after fetch if triggered by search
      }
    }
  }, [year, month, metrics, shouldFetchData, initialLoadDone])

  useEffect(() => {
    const isInitialMount = pagination.currentPage === 1 && pagination.totalPages === 1 && pagination.totalRecords === 0
    if (!isInitialMount && year && metrics && (shouldFetchData || initialLoadDone)) {
      fetchPureMemberData(true)
    }
  }, [pagination.currentPage])

  const fetchSlicerOptions = async (brandForTraffic: string = 'ALL') => {
    try {
      setSlicerLoading(true)
      
      // Fetch all options (years, months, brands) - no brand filter
      const response = await fetch('/api/usc-pure-member-analysis/slicer-options?brand=ALL', {
        cache: 'no-store'
      })
      const result = await response.json()
      
      if (result.success) {
        // Fetch traffic options will be handled by useEffect when year and metrics are set
        // For initial load, use empty array (will be populated by useEffect)
        let trafficOptions: string[] = ['ALL']
        
        const updatedOptions = {
          ...result.data,
          traffic: trafficOptions
        }
        
        console.log('✅ [Pure Member Analysis] Slicer options received:', {
          years: updatedOptions.years?.length || 0,
          months: updatedOptions.months?.length || 0,
          brands: updatedOptions.brands?.length || 0,
          traffic: updatedOptions.traffic?.length || 0,
          brand_filter: brandForTraffic
        })
        setSlicerOptions(updatedOptions)
        
        if (result.data.defaults) {
          setYear(result.data.defaults.year || '')
          setMonth(result.data.defaults.month || 'ALL')
          setMetrics(result.data.defaults.metrics || 'new_depositor')
          console.log('✅ [Pure Member Analysis] Auto-set to defaults:', result.data.defaults)
        }
      } else {
        console.error('❌ [Pure Member Analysis] Failed to fetch slicer options:', result.error)
      }
    } catch (error) {
      console.error('❌ [Pure Member Analysis] Error fetching slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }
  
  // Fetch traffic options when brand, year, month, or metrics changes (separate from initial load)
  useEffect(() => {
    // Only refetch traffic options if initial load is done and year and metrics are set
    if (initialLoadDone && year && metrics) {
      const brandForTraffic = isPure ? 'ALL' : selectedBrand
      const fetchTrafficOptions = async () => {
        try {
          const params = new URLSearchParams({
            brand: brandForTraffic,
            year: year,
            month: month || 'ALL',
            metrics: metrics
          })
          
          const trafficResponse = await fetch(`/api/usc-pure-member-analysis/slicer-options?${params.toString()}`, {
            cache: 'no-store'
          })
          const trafficResult = await trafficResponse.json()
          
          if (trafficResult.success) {
            setSlicerOptions(prev => ({
              ...prev,
              traffic: trafficResult.data.traffic || []
            }))
            // Reset traffic to ALL when brand/year/month/metrics changes
            setSelectedTraffic('ALL')
          }
        } catch (error) {
          console.error('❌ [Pure Member Analysis] Error fetching traffic options:', error)
        }
      }
      
      fetchTrafficOptions()
    }
  }, [selectedBrand, year, month, metrics, isPure, initialLoadDone])

  const fetchPureMemberData = async (forceFetch: boolean = false) => {
    if (!year || !metrics) {
      console.log('⏳ [Pure Member Analysis] Waiting for slicers to be set...')
      return
    }
    
    // For non-initial loads, only fetch if shouldFetchData is true or forceFetch is true
    if (initialLoadDone && !forceFetch && !shouldFetchData) {
      return
    }
    
    try {
      setLoading(true)
      setShouldFetchData(false) // Reset flag after fetching
      const params = new URLSearchParams({
        year,
        month: month || 'ALL',
        metrics,
        brand: selectedBrand || 'ALL',
        traffic: selectedTraffic || 'ALL',
        page: pagination.currentPage.toString(),
        limit: pagination.recordsPerPage.toString()
      })

      const response = await fetch(`/api/usc-pure-member-analysis/data?${params}`)
      
      if (!response.ok) {
        console.error('❌ API Error:', response.status, response.statusText)
        setPureMemberData([])
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
        setPureMemberData(result.data || [])
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
        setPureMemberData([])
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ Error fetching pure member data:', error)
      setPureMemberData([])
      setLoading(false)
    }
  }

  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
    fetchPureMemberData()
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      
      const response = await fetch('/api/usc-pure-member-analysis/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          year,
          month: month || 'ALL',
          metrics,
          brand: selectedBrand || 'ALL',
          traffic: selectedTraffic || 'ALL'
        }),
        signal: AbortSignal.timeout(300000)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        
        const monthSuffix = month === 'ALL' ? 'yearly' : month.toLowerCase()
        const filename = `usc_pure_member_${metrics}_${year}_${monthSuffix}.csv`
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
        <span className="filter-export-text"></span>
      </div>
      
      <div className="subheader-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div className="slicer-group">
          <label className="slicer-label">YEAR:</label>
          <select 
            value={year} 
            onChange={(e) => {
              setYear(e.target.value)
              setPagination(prev => ({ ...prev, currentPage: 1 }))
            }}
            className={`slicer-select ${slicerLoading ? 'disabled' : ''}`}
            disabled={slicerLoading}
          >
            {slicerOptions.years.map((yearOption) => (
              <option key={yearOption} value={yearOption}>{yearOption}</option>
            ))}
          </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">MONTH:</label>
          <select 
            value={month} 
            onChange={(e) => {
              setMonth(e.target.value)
              setPagination(prev => ({ ...prev, currentPage: 1 }))
            }}
            className={`slicer-select ${slicerLoading || slicerOptions.months.length === 0 ? 'disabled' : ''}`}
            disabled={slicerLoading || slicerOptions.months.length === 0}
          >
            {slicerOptions.months.length > 0 ? (
              slicerOptions.months.map((monthOption) => (
                <option key={monthOption.value} value={monthOption.value}>{monthOption.label}</option>
              ))
            ) : (
              <option value="ALL">Loading months...</option>
            )}
          </select>
        </div>

        {/* Bookmark Buttons - Horizontal (No Gap, Modern with Elevation) */}
        <div style={{ display: 'flex', gap: 0 }}>
        <button
          onClick={() => {
            setMetrics('existing_member')
            setPagination(prev => ({ ...prev, currentPage: 1 }))
          }}
          style={{
            padding: '8px 18px',
            border: '1px solid #e2e8f0',
            borderRight: '0',
            borderRadius: '6px 0 0 6px',
            backgroundColor: metrics === 'existing_member' ? '#3b82f6' : '#ffffff',
            color: metrics === 'existing_member' ? '#ffffff' : '#64748b',
            fontWeight: 600,
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            position: 'relative',
            zIndex: metrics === 'existing_member' ? 10 : 1,
            boxShadow: metrics === 'existing_member' 
              ? '0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.2)' 
              : 'none',
            transform: metrics === 'existing_member' ? 'translateY(-2px)' : 'translateY(0)',
            margin: 0
          }}
          onMouseEnter={(e) => {
            if (metrics !== 'existing_member') {
              e.currentTarget.style.backgroundColor = '#f8fafc'
              e.currentTarget.style.color = '#3b82f6'
            }
          }}
          onMouseLeave={(e) => {
            if (metrics !== 'existing_member') {
              e.currentTarget.style.backgroundColor = '#ffffff'
              e.currentTarget.style.color = '#64748b'
            }
          }}
        >
          <div style={{ width: '14px', height: '14px', display: 'flex' }} dangerouslySetInnerHTML={{ __html: KPI_ICONS.activeMember }} />
          <span>Old</span>
        </button>
        
        <button
          onClick={() => {
            setMetrics('new_depositor')
            setPagination(prev => ({ ...prev, currentPage: 1 }))
          }}
          style={{
            padding: '8px 18px',
            border: '1px solid #e2e8f0',
            borderRight: '0',
            borderRadius: '0',
            backgroundColor: metrics === 'new_depositor' ? '#3b82f6' : '#ffffff',
            color: metrics === 'new_depositor' ? '#ffffff' : '#64748b',
            fontWeight: 600,
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            position: 'relative',
            zIndex: metrics === 'new_depositor' ? 10 : 1,
            boxShadow: metrics === 'new_depositor' 
              ? '0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.2)' 
              : 'none',
            transform: metrics === 'new_depositor' ? 'translateY(-2px)' : 'translateY(0)',
            margin: 0,
            marginLeft: '-1px'
          }}
          onMouseEnter={(e) => {
            if (metrics !== 'new_depositor') {
              e.currentTarget.style.backgroundColor = '#f8fafc'
              e.currentTarget.style.color = '#3b82f6'
            }
          }}
          onMouseLeave={(e) => {
            if (metrics !== 'new_depositor') {
              e.currentTarget.style.backgroundColor = '#ffffff'
              e.currentTarget.style.color = '#64748b'
            }
          }}
        >
          <div style={{ width: '14px', height: '14px', display: 'flex' }} dangerouslySetInnerHTML={{ __html: KPI_ICONS.newDepositor }} />
          <span>ND</span>
        </button>
        
        <button
          onClick={() => {
            if (selectedBrand !== 'ALL') return // Disabled when brand is not ALL
            setMetrics('pure_existing_member')
            setPagination(prev => ({ ...prev, currentPage: 1 }))
          }}
          disabled={selectedBrand !== 'ALL'}
          style={{
            padding: '8px 18px',
            border: '1px solid #e2e8f0',
            borderRight: '0',
            borderRadius: '0',
            backgroundColor: metrics === 'pure_existing_member' ? '#f59e0b' : (selectedBrand !== 'ALL' ? '#f1f5f9' : '#ffffff'),
            color: metrics === 'pure_existing_member' ? '#ffffff' : (selectedBrand !== 'ALL' ? '#94a3b8' : '#64748b'),
            fontWeight: 600,
            fontSize: '11px',
            cursor: selectedBrand !== 'ALL' ? 'not-allowed' : 'pointer',
            opacity: selectedBrand !== 'ALL' ? 0.6 : 1,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            position: 'relative',
            zIndex: metrics === 'pure_existing_member' ? 10 : 1,
            boxShadow: metrics === 'pure_existing_member' 
              ? '0 4px 6px -1px rgba(245, 158, 11, 0.3), 0 2px 4px -1px rgba(245, 158, 11, 0.2)' 
              : 'none',
            transform: metrics === 'pure_existing_member' ? 'translateY(-2px)' : 'translateY(0)',
            margin: 0,
            marginLeft: '-1px'
          }}
          onMouseEnter={(e) => {
            if (metrics !== 'pure_existing_member') {
              e.currentTarget.style.backgroundColor = '#fffbeb'
              e.currentTarget.style.color = '#f59e0b'
            }
          }}
          onMouseLeave={(e) => {
            if (metrics !== 'pure_existing_member') {
              e.currentTarget.style.backgroundColor = '#ffffff'
              e.currentTarget.style.color = '#64748b'
            }
          }}
        >
          <div style={{ width: '14px', height: '14px', display: 'flex' }} dangerouslySetInnerHTML={{ __html: KPI_ICONS.activeMember }} />
          <span>Pure Old</span>
        </button>
        
        <button
          onClick={() => {
            if (selectedBrand !== 'ALL') return // Disabled when brand is not ALL
            setMetrics('pure_new_depositor')
            setPagination(prev => ({ ...prev, currentPage: 1 }))
          }}
          disabled={selectedBrand !== 'ALL'}
          style={{
            padding: '8px 18px',
            border: '1px solid #e2e8f0',
            borderRadius: '0 6px 6px 0',
            backgroundColor: metrics === 'pure_new_depositor' ? '#f59e0b' : (selectedBrand !== 'ALL' ? '#f1f5f9' : '#ffffff'),
            color: metrics === 'pure_new_depositor' ? '#ffffff' : (selectedBrand !== 'ALL' ? '#94a3b8' : '#64748b'),
            fontWeight: 600,
            fontSize: '11px',
            cursor: selectedBrand !== 'ALL' ? 'not-allowed' : 'pointer',
            opacity: selectedBrand !== 'ALL' ? 0.6 : 1,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            position: 'relative',
            zIndex: metrics === 'pure_new_depositor' ? 10 : 1,
            boxShadow: metrics === 'pure_new_depositor' 
              ? '0 4px 6px -1px rgba(245, 158, 11, 0.3), 0 2px 4px -1px rgba(245, 158, 11, 0.2)' 
              : 'none',
            transform: metrics === 'pure_new_depositor' ? 'translateY(-2px)' : 'translateY(0)',
            margin: 0,
            marginLeft: '-1px'
          }}
          onMouseEnter={(e) => {
            if (metrics !== 'pure_new_depositor') {
              e.currentTarget.style.backgroundColor = '#fffbeb'
              e.currentTarget.style.color = '#f59e0b'
            }
          }}
          onMouseLeave={(e) => {
            if (metrics !== 'pure_new_depositor') {
              e.currentTarget.style.backgroundColor = '#ffffff'
              e.currentTarget.style.color = '#64748b'
            }
          }}
        >
          <div style={{ width: '14px', height: '14px', display: 'flex' }} dangerouslySetInnerHTML={{ __html: KPI_ICONS.newDepositor }} />
          <span>Pure ND</span>
        </button>
        </div>
      </div>
    </div>
  )

  return (
    <Layout customSubHeader={subHeaderContent}>
      <Frame variant="compact">
        <div className="deposit-container">
          {loading ? (
            <StandardLoadingSpinner message="Loading Pure Member Analysis USC" />
          ) : (
            <div className="simple-table-container" style={{ marginTop: '0' }}>
                {/* Search User Name - Top Left | Brand Slicer - Top Right */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isPure ? '#94a3b8' : '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}>
                      User Name:
                    </label>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isPure ? 'Not available for Pure metrics' : 'Enter user name...'}
                        disabled={isPure || isSearching}
                        style={{
                          padding: '8px 32px 8px 14px',
                          fontSize: '13px',
                          border: '2px solid #cbd5e1',
                          borderRadius: '6px',
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          width: '300px',
                          backgroundColor: (isPure || isSearching) ? '#f1f5f9' : '#ffffff',
                          color: (isPure || isSearching) ? '#94a3b8' : '#1e293b',
                          cursor: (isPure || isSearching) ? 'not-allowed' : 'text'
                        }}
                        onFocus={(e) => {
                          if (!isPure && !isSearching) {
                            e.target.style.borderColor = '#3b82f6'
                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                          }
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#cbd5e1'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                      {/* Clear Button (X icon inside input) */}
                      {searchInput && !isPure && !isSearching && (
                        <button
                          onClick={handleClearSearch}
                          type="button"
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            fontSize: '16px',
                            lineHeight: '1',
                            transition: 'color 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#dc2626'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#94a3b8'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Brand Slicer - Top Right */}
                  <div className="slicer-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="slicer-label" style={{ 
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isPure ? '#94a3b8' : '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}>BRAND:</label>
                    <select 
                      value={selectedBrand} 
                      onChange={(e) => {
                        // If Pure bookmark active, keep brand at ALL (shouldn't happen as select is disabled)
                        if (isPure) {
                          return
                        }
                        setSelectedBrand(e.target.value)
                        setSelectedTraffic('ALL') // Reset traffic when brand changes
                        // Don't auto fetch, wait for search button
                      }}
                      disabled={isPure || slicerLoading || !slicerOptions.brands || slicerOptions.brands.length === 0}
                      style={{
                        padding: '8px 14px',
                        fontSize: '13px',
                        border: '2px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        backgroundColor: (isPure || slicerLoading || !slicerOptions.brands || slicerOptions.brands.length === 0) ? '#f1f5f9' : '#ffffff',
                        color: (isPure || slicerLoading || !slicerOptions.brands || slicerOptions.brands.length === 0) ? '#94a3b8' : '#1e293b',
                        cursor: (isPure || slicerLoading || !slicerOptions.brands || slicerOptions.brands.length === 0) ? 'not-allowed' : 'pointer',
                        opacity: isPure ? 0.6 : 1,
                        minWidth: '150px'
                      }}
                      onFocus={(e) => {
                        if (!isPure && !slicerLoading && slicerOptions.brands && slicerOptions.brands.length > 0) {
                          e.target.style.borderColor = '#3b82f6'
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#cbd5e1'
                        e.target.style.boxShadow = 'none'
                      }}
                    >
                      {slicerOptions.brands && slicerOptions.brands.length > 0 ? (
                        slicerOptions.brands.map((brand) => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))
                      ) : (
                        <option value="ALL">Loading brands...</option>
                      )}
                    </select>
                  </div>
                  
                  {/* Traffic Slicer - After Brand Slicer */}
                  <div className="slicer-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '24px' }}>
                    <label className="slicer-label" style={{ 
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isPure ? '#94a3b8' : '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}>TRAFFIC:</label>
                    <select 
                      value={selectedTraffic} 
                      onChange={(e) => {
                        // If Pure bookmark active, keep traffic at ALL (shouldn't happen as select is disabled)
                        if (isPure) {
                          return
                        }
                        setSelectedTraffic(e.target.value)
                        // Don't auto fetch, wait for search button
                      }}
                      disabled={isPure || slicerLoading || !slicerOptions.traffic || slicerOptions.traffic.length === 0}
                      style={{
                        padding: '8px 14px',
                        fontSize: '13px',
                        border: '2px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        backgroundColor: (isPure || slicerLoading || !slicerOptions.traffic || slicerOptions.traffic.length === 0) ? '#f1f5f9' : '#ffffff',
                        color: (isPure || slicerLoading || !slicerOptions.traffic || slicerOptions.traffic.length === 0) ? '#94a3b8' : '#1e293b',
                        cursor: (isPure || slicerLoading || !slicerOptions.traffic || slicerOptions.traffic.length === 0) ? 'not-allowed' : 'pointer',
                        opacity: isPure ? 0.6 : 1,
                        minWidth: '150px'
                      }}
                      onFocus={(e) => {
                        if (!slicerLoading && slicerOptions.traffic && slicerOptions.traffic.length > 0) {
                          e.target.style.borderColor = '#3b82f6'
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#cbd5e1'
                        e.target.style.boxShadow = 'none'
                      }}
                    >
                      {slicerOptions.traffic && slicerOptions.traffic.length > 0 ? (
                        slicerOptions.traffic.map((traffic) => (
                          <option key={traffic} value={traffic}>{traffic}</option>
                        ))
                      ) : (
                        <option value="ALL">Loading traffic...</option>
                      )}
                    </select>
                  </div>
                  
                  {/* Search Button for User Name and Brand/Traffic Slicers */}
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#ffffff',
                      backgroundColor: isSearching ? '#cbd5e1' : '#10b981',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isSearching ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      marginLeft: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSearching) {
                        e.currentTarget.style.backgroundColor = '#059669'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSearching) {
                        e.currentTarget.style.backgroundColor = '#10b981'
                      }
                    }}
                    >
                    {isSearching ? 'Loading...' : 'Search'}
                  </button>
                </div>
                
                {/* Add CSS for spinner animation */}
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>

                <div className="simple-table-wrapper" style={{ 
                  overflowX: 'auto', 
                  overflowY: 'visible',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  maxHeight: 'calc(100vh - 450px)',
                  position: 'relative'
                }}>
                  <table className="simple-table" style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    backgroundColor: '#ffffff'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1e293b' }}>
                        {(() => {
                          // Determine columns to show
                          let columns: string[] = []
                          if (filteredData.length > 0) {
                            columns = getSortedColumns(Object.keys(filteredData[0]))
                          } else if (pureMemberData.length > 0) {
                            columns = getSortedColumns(Object.keys(pureMemberData[0]))
                          } else if (year && metrics) {
                            // Default columns when no data
                            columns = ['unique_code', 'user_name', 'line', 'first_deposit_date', 'deposit_cases', 'deposit_amount', 'withdraw_amount', 'net_profit']
                          }
                          
                          return columns.map((column) => (
                            <th key={column} style={{ 
                              textAlign: 'center',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '12px',
                              padding: '10px 12px',
                              borderRight: '1px solid #334155',
                              whiteSpace: 'nowrap',
                              letterSpacing: '0.3px',
                              textTransform: 'uppercase'
                            }}>
                              {formatHeaderTitle(column)}
                            </th>
                          ))
                        })()}
                      </tr>
                    </thead>
                    <tbody>
                      {pureMemberData.length === 0 ? (
                        <tr>
                          <td 
                            colSpan={(() => {
                              if (pureMemberData.length > 0) {
                                return getSortedColumns(Object.keys(pureMemberData[0])).length
                              } else if (year && metrics) {
                                return 8
                              }
                              return 10
                            })()}
                            style={{
                              textAlign: 'center',
                              padding: '60px 20px',
                              backgroundColor: '#fafafa',
                              borderBottom: '1px solid #e2e8f0'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '12px'
                            }}>
                              <div style={{ fontSize: '48px', opacity: 0.3 }}>📭</div>
                              <div style={{
                                fontSize: '15px',
                                color: '#64748b',
                                fontWeight: 500
                              }}>
                                No data found for {getMetricsDisplayName(metrics)} in {year}
                                {selectedBrand && selectedBrand !== 'ALL' && ` (Brand: ${selectedBrand})`}
                                {selectedTraffic && selectedTraffic !== 'ALL' && ` (Traffic: ${selectedTraffic})`}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : filteredData.length === 0 && searchUserName ? (
                        <tr>
                          <td 
                            colSpan={pureMemberData.length > 0 ? getSortedColumns(Object.keys(pureMemberData[0])).length : 10}
                            style={{
                              textAlign: 'center',
                              padding: '60px 20px',
                              backgroundColor: '#fafafa',
                              borderBottom: '1px solid #e2e8f0'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '12px'
                            }}>
                              <div style={{ fontSize: '48px', opacity: 0.3 }}>🔍</div>
                              <div style={{
                                fontSize: '15px',
                                color: '#64748b',
                                fontWeight: 500
                              }}>
                                No results found for "<strong style={{ color: '#1e293b' }}>{searchUserName}</strong>"
                              </div>
                              <button
                                onClick={handleClearSearch}
                                style={{
                                  marginTop: '8px',
                                  padding: '8px 16px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#3b82f6',
                                  backgroundColor: '#eff6ff',
                                  border: '2px solid #3b82f6',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#3b82f6'
                                  e.currentTarget.style.color = '#ffffff'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#eff6ff'
                                  e.currentTarget.style.color = '#3b82f6'
                                }}
                              >
                                Clear Search
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredData.map((row, index) => (
                          <tr 
                            key={index}
                            style={{
                              backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                              transition: 'background-color 0.15s ease',
                              cursor: 'default'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#e0f2fe'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'
                            }}
                          >
                            {getSortedColumns(Object.keys(row))
                              .map((column) => (
                                <td 
                                  key={column} 
                                  style={{ 
                                    textAlign: getColumnAlignment(column, row[column]) as 'left' | 'right' | 'center',
                                    padding: '8px 12px',
                                    borderBottom: '1px solid #e2e8f0',
                                    borderRight: '1px solid #f1f5f9',
                                    fontSize: '13px',
                                    color: '#334155',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {(column === 'ggr' || column === 'net_profit') ? (
                                    <span style={{
                                      color: (row[column] || 0) >= 0 ? '#10b981' : '#ef4444',
                                      fontWeight: 700
                                    }}>
                                      {formatTableCell(row[column])}
                                    </span>
                                  ) : (column === 'brand_name' || column === 'line') ? (
                                    <span style={{ 
                                      fontWeight: 600,
                                      color: '#3b82f6'
                                    }}>
                                      {formatTableCell(row[column])}
                                    </span>
                                  ) : (
                                    formatTableCell(row[column])
                                  )}
                                </td>
                              ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  backgroundColor: '#f8fafc',
                  borderTop: '2px solid #e2e8f0',
                  borderRadius: '0 0 8px 8px',
                  marginTop: '0'
                }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#64748b',
                    fontWeight: 500
                  }}>
                    {searchUserName ? (
                      <>
                        Filtered: <strong style={{ color: '#3b82f6' }}>{filteredData.length}</strong> records
                        {' '}<span style={{ color: '#94a3b8' }}>(of {pureMemberData.length} total)</span>
                      </>
                    ) : (
                      <>
                        Showing <strong style={{ color: '#1e293b' }}>{Math.min(pureMemberData.length, 1000)}</strong> of <strong style={{ color: '#1e293b' }}>{pagination.totalRecords.toLocaleString()}</strong> records
                      </>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {pagination.totalPages > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                          disabled={!pagination.hasPrevPage}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: pagination.hasPrevPage ? '#3b82f6' : '#cbd5e1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                          }}
                        >
                          ← Prev
                        </button>
                        
                        <span style={{
                          fontSize: '13px',
                          color: '#475569',
                          fontWeight: 600,
                          padding: '0 12px'
                        }}>
                          Page {pagination.currentPage} of {pagination.totalPages}
                        </span>
                        
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                          disabled={!pagination.hasNextPage}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: pagination.hasNextPage ? '#3b82f6' : '#cbd5e1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={handleExport}
                      disabled={exporting || pureMemberData.length === 0}
                      style={{
                        padding: '8px 20px',
                        backgroundColor: exporting || pureMemberData.length === 0 ? '#cbd5e1' : '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: exporting || pureMemberData.length === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: exporting || pureMemberData.length === 0 ? 'none' : '0 2px 4px rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      {exporting ? '⏳ Exporting...' : 'Export'}
                    </button>
                  </div>
                </div>
              </div>
          )}
        </div>
      </Frame>
    </Layout>
  )
}

