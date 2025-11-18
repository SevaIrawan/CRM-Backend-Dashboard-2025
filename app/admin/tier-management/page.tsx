'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import { formatIntegerKPI, formatCurrencyKPI, formatPercentageKPI } from '@/lib/formatHelpers'
import { createPortal } from 'react-dom'

interface TierData {
  userkey: string
  unique_code: string
  user_name: string
  line: string
  year: number
  month: string
  tier: number | null
  tier_name: string | null
  tier_group: string | null
  score: number | null
  total_ggr: number
  total_deposit_amount: number
  active_days: number
  purchase_frequency: number
  avg_transaction_value: number
  win_rate: number
}

type CurrencyTab = 'USC' | 'SGD' | 'MYR'

export default function TierManagementPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [activeTab, setActiveTab] = useState<CurrencyTab>('USC')
  
  // Tier data states
  const [tierData, setTierData] = useState<TierData[]>([])
  const [allTierData, setAllTierData] = useState<TierData[]>([]) // Store all data for pagination
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [selectedLine, setSelectedLine] = useState('ALL')
  const [selectedYear, setSelectedYear] = useState('2025')
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [slicerOptions, setSlicerOptions] = useState<{
    lines: string[]
    years: string[]
    months: string[]
    defaults: {
      line: string
      year: string
      month: string
    }
  } | null>(null)
  const [slicerLoading, setSlicerLoading] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(1000)
  const [totalRecords, setTotalRecords] = useState(0)
  
  // Calculate/Update states
  const [calculating, setCalculating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  
  // Export state
  const [exporting, setExporting] = useState(false)
  
  // Notification states
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    setIsMounted(true)
    
    // Check if user is admin
    const checkAdminAccess = () => {
      try {
        const userStr = localStorage.getItem('nexmax_user') || localStorage.getItem('nexmax_session')
        if (!userStr) {
          router.push('/login')
          return
        }
        
        const user = JSON.parse(userStr)
        const userRole = user.role
        
        if (userRole === 'admin') {
          setIsAdmin(true)
          loadTierData()
        } else {
          setIsAdmin(false)
        }
      } catch (e) {
        console.error('Error checking admin access:', e)
        router.push('/login')
      } finally {
        setCheckingAccess(false)
      }
    }
    
    checkAdminAccess()
  }, [router])

  useEffect(() => {
    // Support all currencies: USC, SGD, MYR
    if (isAdmin && ['USC', 'SGD', 'MYR'].includes(activeTab)) {
      // Reset data when switching tabs
      setAllTierData([])
      setTierData([])
      setTotalRecords(0)
      setCurrentPage(1)
      fetchSlicerOptions()
    }
  }, [activeTab, isAdmin])

  useEffect(() => {
    // Only load data on initial load when slicer options are ready
    // Support all currencies: USC, SGD, MYR
    if (isAdmin && ['USC', 'SGD', 'MYR'].includes(activeTab) && slicerOptions && allTierData.length === 0) {
      loadTierData()
    }
  }, [slicerOptions, activeTab, isAdmin])

  // Pagination helper function
  const applyPagination = (data: TierData[], page: number, perPage: number) => {
    const startIndex = (page - 1) * perPage
    const endIndex = startIndex + perPage
    const paginatedData = data.slice(startIndex, endIndex)
    setTierData(paginatedData)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      
      const headers = [
        'Brand',
        'Unique Code',
        'User Name',
        'Year',
        'Month',
        'Tier',
        'Tier Name',
        'Tier Group',
        'Score',
        'GGR',
        'Deposit Amount',
        'Active Days',
        'Purchase Freq',
        'ATV',
        'Win Rate'
      ]
      
      let csvContent = headers.join(',') + '\n'
      
      allTierData.forEach((row) => {
        csvContent += [
          row.line || '-',
          row.unique_code || '-',
          row.user_name || '-',
          row.year || '-',
          row.month || '-',
          row.tier || '-',
          row.tier_name || '-',
          row.tier_group || '-',
          row.score ? row.score.toFixed(4) : '-',
          row.total_ggr || 0,
          row.total_deposit_amount || 0,
          row.active_days || 0,
          row.purchase_frequency || 0,
          row.avg_transaction_value || 0,
          row.win_rate || 0
        ].join(',') + '\n'
      })
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tier-management-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Failed to export: ' + (e.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  const fetchSlicerOptions = async () => {
    // Support all currencies: USC, SGD, MYR
    if (!['USC', 'SGD', 'MYR'].includes(activeTab)) return
    
    try {
      setSlicerLoading(true)
      const response = await fetch(`/api/admin/tier-management/slicer-options?currency=${activeTab}`)
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.data)
        // Set defaults
        if (result.data.defaults) {
          setSelectedLine(result.data.defaults.line || 'ALL')
          setSelectedYear(result.data.defaults.year || '2025')
          setSelectedMonth(result.data.defaults.month || 'ALL')
        }
      }
    } catch (e) {
      console.error('Error fetching slicer options:', e)
    } finally {
      setSlicerLoading(false)
    }
  }

  const loadTierData = async () => {
    // Support all currencies: USC, SGD, MYR
    if (!['USC', 'SGD', 'MYR'].includes(activeTab)) {
      setTierData([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Build query params with filters
      const params = new URLSearchParams({
        currency: activeTab,
        line: selectedLine || 'ALL',
        year: selectedYear || 'ALL',
        month: selectedMonth || 'ALL'
      })
      
      // Fetch tier data directly from database (NO CALCULATION)
      const response = await fetch(`/api/admin/tier-management/data?${params}`)
      const result = await response.json()
      
      if (result.success && result.data?.records) {
        const records = result.data.records || []
        setAllTierData(records)
        setTotalRecords(records.length)
        // Apply pagination
        applyPagination(records, currentPage, recordsPerPage)
      } else {
        setError(result.error || 'Failed to load tier data')
        setAllTierData([])
        setTierData([])
        setTotalRecords(0)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load tier data')
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateTier = async () => {
    // Support all currencies: USC, SGD, MYR
    if (!['USC', 'SGD', 'MYR'].includes(activeTab)) {
      setNotificationMessage('Invalid currency')
      setNotificationType('error')
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
      return
    }

    // Create abort controller for cancellation
    const controller = new AbortController()
    setAbortController(controller)

    setCalculating(true)
    setShowProgressModal(true)
    setProgressMessage('Initializing tier calculation...')
    setProgressPercent(0)
    
    try {
      // Step 1: Fetch data
      setProgressPercent(10)
      setProgressMessage(`Fetching data from tier_${activeTab.toLowerCase()}_v1...`)
      
      const response = await fetch(`/api/${activeTab.toLowerCase()}-business-performance/calculate-tiers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })
      
      // Check if response is OK
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      setProgressPercent(30)
      setProgressMessage('Processing response...')
      
      const result = await response.json()
      
      // Check if API returned success
      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to calculate tiers')
      }
      
      // Check if no records to process
      if (result.data?.totalProcessed === 0) {
        setProgressPercent(100)
        setProgressMessage('No records found to calculate')
        
        setTimeout(() => {
          setShowProgressModal(false)
          setCalculating(false)
          setProgressPercent(0)
          setNotificationMessage('No records found to calculate')
          setNotificationType('error')
          setShowNotification(true)
          setTimeout(() => setShowNotification(false), 3000)
        }, 1000)
        return
      }
      
      setProgressPercent(60)
      setProgressMessage(`Processing ${result.data?.totalProcessed || 0} records...`)
      
      // Simulate progress during calculation (API is doing the work)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setProgressPercent(80)
      setProgressMessage(`Updating ${result.data?.totalUpdated || 0} records in database...`)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setProgressPercent(100)
      setProgressMessage(`Tier calculation completed! ${result.data?.totalUpdated || 0} records updated`)
      
      setTimeout(async () => {
        setShowProgressModal(false)
        setCalculating(false)
        setProgressPercent(0)
        
        // Reload data from database to show updated tiers
        await loadTierData()
        
        setNotificationMessage(`Calculate success: ${result.data?.totalUpdated || 0} tiers updated`)
        setNotificationType('success')
        setShowNotification(true)
        setCurrentPage(1) // Reset to first page
        
        setTimeout(() => {
          setShowNotification(false)
        }, 5000) // Show longer for success message
      }, 1500)
    } catch (e: any) {
      // Check if error is due to abort
      if (e.name === 'AbortError' || controller.signal.aborted) {
        console.log('⚠️ [Calculate Tier] Cancelled by user')
        setShowProgressModal(false)
        setCalculating(false)
        setProgressPercent(0)
        setAbortController(null)
        setNotificationMessage('Calculation cancelled')
        setNotificationType('error')
        setShowNotification(true)
        setTimeout(() => setShowNotification(false), 3000)
        return
      }
      
      console.error('❌ [Calculate Tier Error]:', e)
      setShowProgressModal(false)
      setCalculating(false)
      setProgressPercent(0)
      setAbortController(null)
      
      // Better error message handling
      let errorMessage = 'Failed to calculate tiers'
      if (e.message) {
        errorMessage = e.message
      } else if (e instanceof TypeError && e.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to server'
      } else if (e instanceof Error) {
        errorMessage = e.message
      }
      
      setNotificationMessage(errorMessage)
      setNotificationType('error')
      setShowNotification(true)
      
      setTimeout(() => {
        setShowNotification(false)
      }, 5000) // Show longer for error message
    }
  }

  const handleCancelProgress = () => {
    // Abort ongoing fetch request
    if (abortController) {
      abortController.abort()
    }
    
    // Reset all states
    setShowProgressModal(false)
    setCalculating(false)
    setUpdating(false)
    setProgressPercent(0)
    setProgressMessage('')
    setAbortController(null)
    
    setNotificationMessage('Operation cancelled')
    setNotificationType('error')
    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 3000)
  }

  const handleUpdateTier = async () => {
    // Support all currencies: USC, SGD, MYR
    if (!['USC', 'SGD', 'MYR'].includes(activeTab)) {
      setNotificationMessage('Invalid currency')
      setNotificationType('error')
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
      return
    }

    // Create abort controller for cancellation
    const controller = new AbortController()
    setAbortController(controller)

    setUpdating(true)
    setShowProgressModal(true)
    setProgressMessage('Initializing tier sync...')
    setProgressPercent(0)
    
    try {
      setProgressPercent(20)
      setProgressMessage(`Syncing tier from tier_${activeTab.toLowerCase()}_v1 to blue_whale_${activeTab.toLowerCase()}...`)
      
      const response = await fetch(`/api/${activeTab.toLowerCase()}-business-performance/sync-tier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })
      
      // Check if response is OK
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      setProgressPercent(60)
      setProgressMessage('Processing sync...')
      
      const result = await response.json()
      
      // Check if API returned success
      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to update tier')
      }
      
      setProgressPercent(80)
      setProgressMessage(`Updating ${result.data?.updatedCount || 0} rows in master table...`)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setProgressPercent(100)
      setProgressMessage(`Tier sync completed! ${result.data?.updatedCount || 0} rows updated`)
      
      setTimeout(async () => {
        setShowProgressModal(false)
        setUpdating(false)
        setProgressPercent(0)
        
        // Reload data from database to show latest state
        await loadTierData()
        
        setNotificationMessage(`Tier Updated: ${result.data?.updatedCount || 0} rows synced`)
        setNotificationType('success')
        setShowNotification(true)
        
        setTimeout(() => {
          setShowNotification(false)
        }, 5000) // Show longer for success message
      }, 1500)
    } catch (e: any) {
      // Check if error is due to abort
      if (e.name === 'AbortError' || controller.signal.aborted) {
        console.log('⚠️ [Update Tier] Cancelled by user')
        setShowProgressModal(false)
        setUpdating(false)
        setProgressPercent(0)
        setAbortController(null)
        setNotificationMessage('Update cancelled')
        setNotificationType('error')
        setShowNotification(true)
        setTimeout(() => setShowNotification(false), 3000)
        return
      }
      
      console.error('❌ [Update Tier Error]:', e)
      setShowProgressModal(false)
      setUpdating(false)
      setProgressPercent(0)
      setAbortController(null)
      
      // Better error message handling
      let errorMessage = 'Failed to update tier'
      if (e.message) {
        errorMessage = e.message
      } else if (e instanceof TypeError && e.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to server'
      } else if (e instanceof Error) {
        errorMessage = e.message
      }
      
      setNotificationMessage(errorMessage)
      setNotificationType('error')
      setShowNotification(true)
      
      setTimeout(() => {
        setShowNotification(false)
      }, 5000) // Show longer for error message
    }
  }

  if (!isMounted || checkingAccess) {
    return (
      <Layout>
        <Frame variant="standard">
          <StandardLoadingSpinner message="Checking access..." />
        </Frame>
      </Layout>
    )
  }

  if (!isAdmin) {
    return (
      <Layout>
        <Frame variant="standard">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#EF4444', marginBottom: '16px' }}>Access Denied</h2>
            <p style={{ color: '#6B7280', fontSize: '16px' }}>
              This page is only accessible to Administrators.
            </p>
            <button
              onClick={() => router.push('/admin')}
              style={{
                marginTop: '24px',
                padding: '10px 20px',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Go to Admin
            </button>
          </div>
        </Frame>
      </Layout>
    )
  }

  const handleApplyFilters = () => {
    setCurrentPage(1) // Reset to first page
    loadTierData()
  }

  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        <span className="filter-export-text">Tier Management</span>
      </div>
      
      <div className="subheader-controls">
        {/* Currency Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginRight: '12px' }}>
          {(['USC', 'SGD', 'MYR'] as CurrencyTab[]).map((currency) => (
            <button
              key={currency}
              onClick={() => {
                setActiveTab(currency)
                setCurrentPage(1) // Reset pagination when switching tabs
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: activeTab === currency ? '#3B82F6' : '#E5E7EB',
                color: activeTab === currency ? '#FFFFFF' : '#6B7280',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== currency) {
                  e.currentTarget.style.backgroundColor = '#D1D5DB'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== currency) {
                  e.currentTarget.style.backgroundColor = '#E5E7EB'
                }
              }}
            >
              {currency}
            </button>
          ))}
        </div>

        {/* Filters - Show for all currencies */}
        {['USC', 'SGD', 'MYR'].includes(activeTab) && slicerOptions && (
          <>
            <div className="slicer-group">
              <label className="slicer-label">LINE:</label>
              <select 
                value={selectedLine} 
                onChange={(e) => setSelectedLine(e.target.value)}
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
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="slicer-select"
              >
                {slicerOptions.years.map((yearOption) => (
                  <option key={yearOption} value={yearOption}>{yearOption}</option>
                ))}
              </select>
            </div>

            <div className="slicer-group">
              <label className="slicer-label">MONTH:</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="slicer-select"
              >
                {slicerOptions.months.map((monthOption) => (
                  <option key={monthOption} value={monthOption}>{monthOption}</option>
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
          </>
        )}
      </div>
    </div>
  )

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="compact">
        <div className="deposit-container">
          {loading ? (
            <StandardLoadingSpinner message="Loading tier data..." />
          ) : error ? (
            <div className="empty-container">
              <div className="empty-icon">⚠️</div>
              <div className="empty-text">{error}</div>
            </div>
          ) : (
            <div className="simple-table-container">
              {/* Action Buttons - Above Table (like Date Range in Member Report) */}
              <div className="table-header-controls" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={handleCalculateTier}
                    disabled={calculating || updating}
                    className={`export-button ${calculating || updating ? 'disabled' : ''}`}
                    style={{ backgroundColor: calculating ? '#9CA3AF' : '#3B82F6' }}
                  >
                    {calculating ? 'Calculating...' : 'Calculate Tier'}
                  </button>
                  <button
                    onClick={handleUpdateTier}
                    disabled={calculating || updating}
                    className={`export-button ${calculating || updating ? 'disabled' : ''}`}
                    style={{ backgroundColor: updating ? '#9CA3AF' : '#10B981' }}
                  >
                    {updating ? 'Updating...' : 'Update Tier'}
                  </button>
                </div>
              </div>
              
              <div className="simple-table-wrapper">
                <table className="simple-table" style={{
                  borderCollapse: 'collapse',
                  border: '1px solid #e0e0e0'
                }}>
                  <thead>
                    <tr>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Brand</th>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Unique Code</th>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>User Name</th>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Year</th>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Month</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Tier</th>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Tier Name</th>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Tier Group</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Score</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>GGR</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Deposit Amount</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Active Days</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Purchase Freq</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>ATV</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px'
                      }}>Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tierData.map((row) => (
                      <tr key={`${row.userkey}-${row.year}-${row.month}`}>
                        <td style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{row.line || '-'}</td>
                        <td style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{row.unique_code || '-'}</td>
                        <td style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{row.user_name || '-'}</td>
                        <td style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{row.year}</td>
                        <td style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{row.month}</td>
                        <td style={{ 
                          textAlign: 'right',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{row.tier ? formatIntegerKPI(row.tier) : '-'}</td>
                        <td style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{row.tier_name || '-'}</td>
                        <td style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{row.tier_group || '-'}</td>
                        <td style={{ 
                          textAlign: 'right',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{row.score ? row.score.toFixed(4) : '-'}</td>
                        <td style={{ 
                          textAlign: 'right',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px',
                          color: row.total_ggr >= 0 ? '#10b981' : '#EF4444', 
                          fontWeight: 500 
                        }}>
                          {formatCurrencyKPI(row.total_ggr, activeTab)}
                        </td>
                        <td style={{ 
                          textAlign: 'right',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{formatCurrencyKPI(row.total_deposit_amount, activeTab)}</td>
                        <td style={{ 
                          textAlign: 'right',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{formatIntegerKPI(row.active_days)}</td>
                        <td style={{ 
                          textAlign: 'right',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{formatIntegerKPI(row.purchase_frequency)}</td>
                        <td style={{ 
                          textAlign: 'right',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{formatCurrencyKPI(row.avg_transaction_value, activeTab)}</td>
                        <td style={{ 
                          textAlign: 'right',
                          border: '1px solid #e0e0e0',
                          padding: '8px 12px'
                        }}>{formatPercentageKPI(row.win_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Table Footer - Records Info + Pagination + Export */}
              <div className="table-footer">
                <div className="records-info">
                  Showing {Math.min(tierData.length, recordsPerPage)} of {totalRecords.toLocaleString()} records
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {Math.ceil(totalRecords / recordsPerPage) > 1 && (
                    <div className="pagination-controls">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="pagination-btn"
                      >
                        ← Prev
                      </button>
                      
                      <span className="pagination-info">
                        Page {currentPage} of {Math.ceil(totalRecords / recordsPerPage)}
                      </span>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= Math.ceil(totalRecords / recordsPerPage)}
                        className="pagination-btn"
                      >
                        Next →
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={handleExport}
                    disabled={exporting || allTierData.length === 0}
                    className={`export-button ${exporting || allTierData.length === 0 ? 'disabled' : ''}`}
                  >
                    {exporting ? 'Exporting...' : 'Export'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Frame>
      
      {/* Progress Modal */}
      {showProgressModal && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '32px',
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600, color: '#1F2937' }}>
              Processing...
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: '#3B82F6',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
              {progressMessage}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={handleCancelProgress}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Notification */}
      {showNotification && createPortal(
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: notificationType === 'success' ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 10000,
            animation: 'slideIn 0.3s ease'
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
            {notificationMessage}
          </p>
        </div>,
        document.body
      )}
    </Layout>
  )
}

