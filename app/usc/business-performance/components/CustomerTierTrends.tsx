'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import CustomerTierLineChart from './CustomerTierLineChart'
import { getChartIcon } from '@/lib/CentralIcon'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import { TIER_NAME_DEFINITIONS, TIER_NAME_COLORS } from '../constants'

// CSS untuk override chart border dan background agar semua dalam 1 canvas
const chartOverrideStyle = `
  .customer-tier-trends-chart-wrapper > div[role="img"] {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
  }
  .customer-tier-trends-chart-wrapper > div[role="img"] > div {
    background-color: transparent !important;
  }
  /* Placeholder styling untuk date picker */
  input[placeholder="Select Date"]::placeholder {
    color: #9ca3af !important;
    text-align: right !important;
  }
  /* Scrollbar styling untuk tier filter dropdown */
  .tier-filter-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .tier-filter-scroll::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  .tier-filter-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  .tier-filter-scroll::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`

interface TierOption {
  key: string
  label: string
  color: string
}

// Default tier colors (will be used if no tier found in TIER_NAME_COLORS)
const DEFAULT_TIER_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280']

interface CustomerTierTrendsData {
  periodA: {
    label: string
    startDate: string
    endDate: string
    dates: string[]
    data: Record<string, number[]>
  }
  periodB: {
    label: string
    startDate: string
    endDate: string
    dates: string[]
    data: Record<string, number[]>
  }
}

interface CustomerTierTrendsProps {
  dateRange: string
  brand: string
  squadLead: string
  channel: string
  onSearch?: () => void // Callback untuk trigger search
  searchTrigger?: number // Counter untuk trigger search dari parent
  tierNameOptions: Array<{ name: string; group: string | null }>
}

export default function CustomerTierTrends({ dateRange, brand, squadLead, channel, searchTrigger, tierNameOptions }: CustomerTierTrendsProps) {
  // Build tier_name options from database for the filter dropdown
  const TIER_NAME_OPTIONS: TierOption[] = React.useMemo(() => {
    return tierNameOptions.map((option, index) => ({
      key: option.name,
      label: option.name,
      color: TIER_NAME_COLORS[option.name] || DEFAULT_TIER_COLORS[index % DEFAULT_TIER_COLORS.length]
    }))
  }, [tierNameOptions])
  
  // Default tier_group options (when no filter selected)
  const TIER_GROUP_OPTIONS: TierOption[] = [
    { key: 'High Value', label: 'High Value', color: '#10B981' },
    { key: 'Medium Value', label: 'Medium Value', color: '#3B82F6' },
    { key: 'Potential', label: 'Potential', color: '#F97316' },
    { key: 'Low Value', label: 'Low Value', color: '#EF4444' }
  ]
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CustomerTierTrendsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]) // Empty = no filter = use tier_group
  const [isTierFilterOpen, setIsTierFilterOpen] = useState<boolean>(false)
  const tierFilterRef = useRef<HTMLDivElement | null>(null)
  
  // Date range states for Period A and Period B
  const [periodAStart, setPeriodAStart] = useState<string>('')
  const [periodAEnd, setPeriodAEnd] = useState<string>('')
  const [periodBStart, setPeriodBStart] = useState<string>('')
  const [periodBEnd, setPeriodBEnd] = useState<string>('')
  
  // UI states for date pickers
  const [showPickerA, setShowPickerA] = useState<boolean>(false)
  const [showPickerB, setShowPickerB] = useState<boolean>(false)
  const [tempAStart, setTempAStart] = useState<string>('')
  const [tempAEnd, setTempAEnd] = useState<string>('')
  const [tempBStart, setTempBStart] = useState<string>('')
  const [tempBEnd, setTempBEnd] = useState<string>('')
  const [errorA, setErrorA] = useState<string>('')
  const [errorB, setErrorB] = useState<string>('')
  
  // Close picker when clicking outside
  useEffect(() => {
    if (!showPickerA && !showPickerB) return
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showPickerA && !target.closest('.date-picker-wrapper-a')) {
        setShowPickerA(false)
        setErrorA('')
        // Reset temp values on cancel
        if (data?.periodA) {
          setTempAStart(periodAStart || data.periodA.startDate || '')
          setTempAEnd(periodAEnd || data.periodA.endDate || '')
        }
      }
      if (showPickerB && !target.closest('.date-picker-wrapper-b')) {
        setShowPickerB(false)
        setErrorB('')
        // Reset temp values on cancel
        if (data?.periodB) {
          setTempBStart(periodBStart || data.periodB.startDate || '')
          setTempBEnd(periodBEnd || data.periodB.endDate || '')
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPickerA, showPickerB, periodAStart, periodAEnd, periodBStart, periodBEnd, data])

  useEffect(() => {
    if (!isTierFilterOpen) return

    const handleClickOutsideFilter = (event: MouseEvent) => {
      if (tierFilterRef.current && !tierFilterRef.current.contains(event.target as Node)) {
        setIsTierFilterOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutsideFilter)
    return () => document.removeEventListener('mousedown', handleClickOutsideFilter)
  }, [isTierFilterOpen])
  
  // Format date for display (DD MMM YYYY format)
  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    const day = String(date.getDate()).padStart(2, '0')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()
    
    return `${day} ${month} ${year}`
  }
  
  // Format date range for display
  const formatDateRange = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 'Select Date'
    return `${formatDisplayDate(startDate)} ~ ${formatDisplayDate(endDate)}`
  }

  const toggleTierSelection = (tierKey: string) => {
    setSelectedTiers(prev => {
      if (prev.includes(tierKey)) {
        return prev.filter(key => key !== tierKey)
      } else {
        return [...prev, tierKey]
      }
    })
  }

  const toggleSelectAll = () => {
    const allKeys = TIER_NAME_OPTIONS.map(opt => opt.key)
    const isAllSelected = allKeys.length === selectedTiers.length && allKeys.every(key => selectedTiers.includes(key))
    
    if (isAllSelected) {
      // Clear all if all are selected
      setSelectedTiers([])
    } else {
      // Select all if not all are selected
      setSelectedTiers(allKeys)
    }
  }

  const selectedTierCount = selectedTiers.length
  const allTierCount = TIER_NAME_OPTIONS.length
  const isAllSelected = allTierCount > 0 && selectedTierCount === allTierCount
  
  // Determine which tier options to display in the chart
  // If no filter selected, use tier_group
  // If filter selected, use filtered tier_name data from API
  const displayTierOptions = selectedTiers.length > 0 ? 
    TIER_NAME_OPTIONS.filter(opt => selectedTiers.includes(opt.key)) :
    TIER_GROUP_OPTIONS
    
  const tierColors: Record<string, string> = React.useMemo(() => {
    const colors: Record<string, string> = {}
    TIER_GROUP_OPTIONS.forEach(opt => colors[opt.key] = opt.color)
    TIER_NAME_OPTIONS.forEach(opt => colors[opt.key] = opt.color)
    return colors
  }, [])
  
  const tierLabels: Record<string, string> = React.useMemo(() => {
    const labels: Record<string, string> = {}
    TIER_GROUP_OPTIONS.forEach(opt => labels[opt.key] = opt.label)
    TIER_NAME_OPTIONS.forEach(opt => labels[opt.key] = opt.label)
    return labels
  }, [])
  
  // Validate date range (start <= end)
  const validateDateRange = (start: string, end: string): { valid: boolean; error?: string } => {
    if (!start || !end) {
      return { valid: false, error: 'Please select both start and end dates' }
    }
    
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { valid: false, error: 'Invalid date format' }
    }
    
    if (startDate > endDate) {
      return { valid: false, error: 'Start date must be before or equal to end date' }
    }
    
    return { valid: true }
  }
  
  // Helper function to calculate date ranges
  const calculateDateRanges = (rangeType: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (rangeType === 'Last 7 Days') {
      // Period B: Last 7 days (current)
      const periodBEnd = new Date(today)
      const periodBStart = new Date(today)
      periodBStart.setDate(today.getDate() - 6) // Last 7 days including today
      
      // Period A: Previous month last 7 days (same day range, previous month)
      const periodAEnd = new Date(periodBEnd)
      periodAEnd.setMonth(periodAEnd.getMonth() - 1)
      const periodAStart = new Date(periodBStart)
      periodAStart.setMonth(periodAStart.getMonth() - 1)
      
      return {
        periodA: {
          start: periodAStart.toISOString().split('T')[0],
          end: periodAEnd.toISOString().split('T')[0]
        },
        periodB: {
          start: periodBStart.toISOString().split('T')[0],
          end: periodBEnd.toISOString().split('T')[0]
        }
      }
    } else if (rangeType === 'Last 30 Days') {
      // Period B: Last 30 days (current)
      const periodBEnd = new Date(today)
      const periodBStart = new Date(today)
      periodBStart.setDate(today.getDate() - 29) // Last 30 days including today
      
      // Period A: Previous month last 30 days (same day range, previous month)
      const periodAEnd = new Date(periodBEnd)
      periodAEnd.setMonth(periodAEnd.getMonth() - 1)
      const periodAStart = new Date(periodBStart)
      periodAStart.setMonth(periodAStart.getMonth() - 1)
      
      return {
        periodA: {
          start: periodAStart.toISOString().split('T')[0],
          end: periodAEnd.toISOString().split('T')[0]
        },
        periodB: {
          start: periodBStart.toISOString().split('T')[0],
          end: periodBEnd.toISOString().split('T')[0]
        }
      }
    }
    
    return null
  }
  
  // Check if date pickers should be enabled (only for Custom)
  const isDatePickerEnabled = dateRange === 'Custom'
  
  // Initialize date ranges based on dateRange - HARUS di-set sebelum fetchData
  useEffect(() => {
    if (dateRange === 'Custom') {
      // Custom mode: Set to empty (Select Date) - user harus pilih manual
      // Chart tetap tampil data terakhir, tidak fetch baru
      setPeriodAStart('')
      setPeriodAEnd('')
      setPeriodBStart('')
      setPeriodBEnd('')
    } else {
      // Auto mode: Calculate dates for Last 7 Days or Last 30 Days immediately
      const calculatedRanges = calculateDateRanges(dateRange)
      if (calculatedRanges) {
        setPeriodAStart(calculatedRanges.periodA.start)
        setPeriodAEnd(calculatedRanges.periodA.end)
        setPeriodBStart(calculatedRanges.periodB.start)
        setPeriodBEnd(calculatedRanges.periodB.end)
      }
    }
  }, [dateRange])
  
  // Fetch data function - hanya dipanggil saat initial load atau saat search
  const fetchData = React.useCallback(async () => {
    // Check jika Custom mode tapi dates belum dipilih - tidak fetch, chart tetap tampil data terakhir
    if (dateRange === 'Custom' && (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd)) {
      // Tidak fetch data baru, chart tetap tampil data terakhir (tidak set loading, tidak error)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const userAllowedBrands = localStorage.getItem('user_allowed_brands')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (userAllowedBrands) {
        headers['x-user-allowed-brands'] = userAllowedBrands
      }
      
      const params = new URLSearchParams({
        brand: brand || 'All',
        squadLead: squadLead || 'All',
        channel: channel || 'All'
      })
      
      // Add tierNames filter ONLY if user has selected specific tiers
      // If selectedTiers is empty, API will use tier_group (default mode)
      if (selectedTiers && selectedTiers.length > 0) {
        params.append('tierNames', selectedTiers.join(','))
        console.log('🔍 [Tier Trends] Using tier_name filter:', selectedTiers)
      } else {
        console.log('🔍 [Tier Trends] Using tier_group (default mode)')
      }
      
      // Calculate dates based on dateRange
      let datesToUse: { periodA: { start: string; end: string }; periodB: { start: string; end: string } } | null = null
      
      if (dateRange === 'Last 7 Days' || dateRange === 'Last 30 Days') {
        // Auto calculate dates for Last 7 Days or Last 30 Days
        datesToUse = calculateDateRanges(dateRange)
      } else if (dateRange === 'Custom') {
        // For Custom mode, use dates from state (sudah di-check di atas)
        datesToUse = {
          periodA: { start: periodAStart, end: periodAEnd },
          periodB: { start: periodBStart, end: periodBEnd }
        }
      }
      
      // Send custom dates to API if available, otherwise use comparePeriod
      if (datesToUse) {
        params.append('periodAStart', datesToUse.periodA.start)
        params.append('periodAEnd', datesToUse.periodA.end)
        params.append('periodBStart', datesToUse.periodB.start)
        params.append('periodBEnd', datesToUse.periodB.end)
      } else {
        // Use default Monthly comparePeriod
        params.append('comparePeriod', 'Monthly')
      }
      
      const response = await fetch(`/api/usc-business-performance/tier-trends?${params}`, {
        headers
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      console.error('❌ [Customer Tier Trends] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [dateRange, brand, squadLead, channel, periodAStart, periodAEnd, periodBStart, periodBEnd, selectedTiers])
  
  // Initial load - hanya sekali saat mount
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency - hanya sekali saat initial load
  
  // Trigger fetch saat search button diklik (dari parent)
  useEffect(() => {
    if (searchTrigger && searchTrigger > 0) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTrigger]) // Hanya trigger saat searchTrigger berubah
  
  // Auto-fetch when tier filter changes (except initial load)
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    // Fetch data when tier selection changes
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTiers])

  if (loading) {
    return (
      <div style={{
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        minHeight: '400px'
      }}>
        <StandardLoadingSpinner message="Loading Customer Tier Analytics" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          color: '#EF4444'
        }}>
          Error: {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px' 
        }}>
          No data available
        </div>
      </div>
    )
  }

  // Prepare series for Period A
  // Use all tiers from API response data (tier_group or tier_name based on filter)
  const availableTiersA = Object.keys(data.periodA.data || {})
  const periodASeries = availableTiersA
    .filter(tier => data.periodA.data[tier] && Array.isArray(data.periodA.data[tier]))
    .map(tier => ({
      name: `${tierLabels[tier] || tier} Customer Count`,
      data: data.periodA.data[tier] || [],
      color: tierColors[tier] || '#6B7280'
    }))

  // Prepare series for Period B
  const availableTiersB = Object.keys(data.periodB.data || {})
  const periodBSeries = availableTiersB
    .filter(tier => data.periodB.data[tier] && Array.isArray(data.periodB.data[tier]))
    .map(tier => ({
      name: `${tierLabels[tier] || tier} Customer Count`,
      data: data.periodB.data[tier] || [],
      color: tierColors[tier] || '#6B7280'
    }))
  
  // Get categories for charts
  const periodACategories = data.periodA.dates && Array.isArray(data.periodA.dates) ? data.periodA.dates : []
  const periodBCategories = data.periodB.dates && Array.isArray(data.periodB.dates) ? data.periodB.dates : []

  return (
    <>
      <style>{chartOverrideStyle}</style>
      <div 
        style={{
          width: '100%',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // ✅ BP Standard: Border timbul PERMANENT (NO hover effect)
        }}
      >
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        width: '100%',
        height: '100%'
      }}>
        {/* Header - Title, Subtitle, and Filter Tiers in same row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          width: '100%',
          marginBottom: '8px'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: 700, 
              color: '#1f2937',
              margin: 0,
              marginBottom: '4px'
            }}>
              Customer Tier Trends
            </h3>
            <p style={{ 
              fontSize: '13px', 
              color: '#6b7280',
              margin: 0
            }}>
              Click on legend to highlight specific tier. Hover over lines to see detailed breakdown.
            </p>
          </div>
          {/* Filter Tiers Dropdown - Aligned Right */}
          <div style={{ 
            position: 'relative', 
            overflow: 'visible', 
            marginLeft: 'auto',
            flexShrink: 0
          }} ref={tierFilterRef}>
            <button
              type="button"
              onClick={() => setIsTierFilterOpen(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                minWidth: '130px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6'
                e.currentTarget.style.backgroundColor = '#f0f9ff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb'
                e.currentTarget.style.backgroundColor = 'white'
              }}
            >
              <span>Filter Tiers</span>
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{
                  transform: isTierFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {isTierFilterOpen && (
              <div style={{
                position: 'absolute',
                top: '44px',
                right: 0,
                minWidth: '280px',
                width: 'max-content',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                boxShadow: '0 15px 45px rgba(15, 23, 42, 0.15)',
                zIndex: 60
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937' }}>Select Tiers (Optional)</span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: isAllSelected ? '#ef4444' : '#3b82f6',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 500
                    }}
                  >
                    {isAllSelected ? 'Clear All' : 'Select All'}
                  </button>
                </div>

                <div className="tier-filter-scroll" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '8px' }}>
                  {TIER_NAME_OPTIONS.map(option => {
                    const isSelected = selectedTiers.includes(option.key)
                    return (
                      <label
                        key={option.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 6px',
                          cursor: 'pointer',
                          color: '#374151',
                          fontSize: '13px',
                          borderRadius: '6px',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTierSelection(option.key)}
                          style={{ 
                            width: '16px', 
                            height: '16px', 
                            cursor: 'pointer',
                            accentColor: option.color,
                            flexShrink: 0
                          }}
                        />
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '999px',
                            backgroundColor: option.color,
                            display: 'inline-block',
                            flexShrink: 0
                          }}
                        />
                        <span style={{ flex: 1, userSelect: 'none' }}>{option.label}</span>
                      </label>
                    )
                  })}
                </div>

                <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
                  {selectedTierCount === 0 ? 
                    'No filter (showing tier groups)' : 
                    `${selectedTierCount} tier${selectedTierCount === 1 ? '' : 's'} selected`
                  }
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Horizontal Separator Line */}
        <div style={{
          width: '100%',
          height: '1px',
          backgroundColor: '#e5e7eb',
          marginBottom: '12px'
        }} />

        {/* Two Charts Side-by-Side */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px',
          width: '100%'
        }}>
          {/* Period A Chart + Legend Container */}
          <div 
            style={{ 
              width: '100%',
              height: '100%',
              border: '1px solid #e5e7eb', // ✅ Border permanent
              borderRadius: '8px',
              padding: '12px',
              backgroundColor: '#ffffff',
              transition: 'box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)' // ✅ Hover shadow cover chart + legend
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* Period A Title and Date Range Slicer - Sejajar */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: 600, 
                color: '#1f2937',
                margin: 0
              }}>
                Period A
              </h4>
              {/* Date Range Slicer for Period A */}
              <div className="date-picker-wrapper-a" style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={periodAStart && periodAEnd ? formatDateRange(periodAStart, periodAEnd) : ''}
                  readOnly
                  disabled={!isDatePickerEnabled}
                  onClick={() => {
                    if (!isDatePickerEnabled) return
                    setTempAStart(periodAStart || '')
                    setTempAEnd(periodAEnd || '')
                    setErrorA('')
                    setShowPickerA(true)
                  }}
                  style={{
                    padding: '8px 12px',
                    border: showPickerA ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    backgroundColor: isDatePickerEnabled ? 'white' : '#f9fafb',
                    fontSize: '13px',
                    color: isDatePickerEnabled ? (periodAStart && periodAEnd ? '#374151' : '#9ca3af') : '#9ca3af',
                    cursor: isDatePickerEnabled ? 'pointer' : 'not-allowed',
                    outline: 'none',
                    minWidth: '220px',
                    textAlign: 'center',
                    transition: 'border-color 0.2s ease',
                    opacity: isDatePickerEnabled ? 1 : 0.7
                  }}
                  placeholder="Select Date"
                  title={!isDatePickerEnabled ? 'Date range is auto-set. Switch to Custom mode to edit.' : 'Click to select date range'}
                />
                {showPickerA && isDatePickerEnabled && (
                  <div style={{
                    position: 'absolute',
                    top: '42px',
                    right: 0,
                    zIndex: 50,
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    minWidth: '320px'
                  }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '6px'
                      }}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={tempAStart}
                        onChange={(e) => {
                          setTempAStart(e.target.value)
                          setErrorA('')
                        }}
                        min={data?.periodA?.startDate ? undefined : '2020-01-01'}
                        max={data?.periodA?.endDate || '2099-12-31'}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: errorA ? '2px solid #ef4444' : '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#374151',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: errorA ? '8px' : '12px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '6px'
                      }}>
                        End Date
                      </label>
                      <input
                        type="date"
                        value={tempAEnd}
                        onChange={(e) => {
                          setTempAEnd(e.target.value)
                          setErrorA('')
                        }}
                        min={tempAStart || data?.periodA?.startDate || '2020-01-01'}
                        max={data?.periodA?.endDate || '2099-12-31'}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: errorA ? '2px solid #ef4444' : '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#374151',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    {errorA && (
                      <div style={{
                        padding: '8px',
                        marginBottom: '12px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#dc2626'
                      }}>
                        {errorA}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button 
                        onClick={() => {
                          setShowPickerA(false)
                          setErrorA('')
                          setTempAStart(periodAStart || data?.periodA?.startDate || '')
                          setTempAEnd(periodAEnd || data?.periodA?.endDate || '')
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          fontSize: '13px',
                          cursor: 'pointer',
                          backgroundColor: 'white',
                          color: '#374151',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const validation = validateDateRange(tempAStart, tempAEnd)
                          if (validation.valid) {
                            setPeriodAStart(tempAStart)
                            setPeriodAEnd(tempAEnd)
                            setErrorA('')
                            setShowPickerA(false)
                            // Trigger data reload - handled by useEffect watching periodAStart/periodAEnd
                          } else {
                            setErrorA(validation.error || 'Invalid date range')
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          background: '#1e293b',
                          color: 'white',
                          border: 'none',
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0f172a'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#1e293b'
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div 
              className="customer-tier-trends-chart" 
              style={{ 
                height: '350px',
                width: '100%'
              }}
            >
              <CustomerTierLineChart
                series={periodASeries}
                categories={periodACategories}
                title=""
                chartIcon={getChartIcon('Customer Count')}
              />
            </div>
          </div>

          {/* Period B Chart + Legend Container */}
          <div 
            style={{ 
              width: '100%',
              height: '100%',
              border: '1px solid #e5e7eb', // ✅ Border permanent
              borderRadius: '8px',
              padding: '12px',
              backgroundColor: '#ffffff',
              transition: 'box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)' // ✅ Hover shadow cover chart + legend
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* Period B Title and Date Range Slicer - Sejajar */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: 600, 
                color: '#1f2937',
                margin: 0
              }}>
                Period B
              </h4>
              {/* Date Range Slicer for Period B */}
              <div className="date-picker-wrapper-b" style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={periodBStart && periodBEnd ? formatDateRange(periodBStart, periodBEnd) : ''}
                  readOnly
                  disabled={!isDatePickerEnabled}
                  onClick={() => {
                    if (!isDatePickerEnabled) return
                    setTempBStart(periodBStart || '')
                    setTempBEnd(periodBEnd || '')
                    setErrorB('')
                    setShowPickerB(true)
                  }}
                  style={{
                    padding: '8px 12px',
                    border: showPickerB ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    backgroundColor: isDatePickerEnabled ? 'white' : '#f9fafb',
                    fontSize: '13px',
                    color: isDatePickerEnabled ? (periodBStart && periodBEnd ? '#374151' : '#9ca3af') : '#9ca3af',
                    cursor: isDatePickerEnabled ? 'pointer' : 'not-allowed',
                    outline: 'none',
                    minWidth: '220px',
                    textAlign: 'center',
                    transition: 'border-color 0.2s ease',
                    opacity: isDatePickerEnabled ? 1 : 0.7
                  }}
                  placeholder="Select Date"
                  title={!isDatePickerEnabled ? 'Date range is auto-set. Switch to Custom mode to edit.' : 'Click to select date range'}
                />
                {showPickerB && isDatePickerEnabled && (
                  <div style={{
                    position: 'absolute',
                    top: '42px',
                    right: 0,
                    zIndex: 50,
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    minWidth: '320px'
                  }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '6px'
                      }}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={tempBStart}
                        onChange={(e) => {
                          setTempBStart(e.target.value)
                          setErrorB('')
                        }}
                        min={data?.periodB?.startDate ? undefined : '2020-01-01'}
                        max={data?.periodB?.endDate || '2099-12-31'}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: errorB ? '2px solid #ef4444' : '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#374151',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: errorB ? '8px' : '12px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '6px'
                      }}>
                        End Date
                      </label>
                      <input
                        type="date"
                        value={tempBEnd}
                        onChange={(e) => {
                          setTempBEnd(e.target.value)
                          setErrorB('')
                        }}
                        min={tempBStart || data?.periodB?.startDate || '2020-01-01'}
                        max={data?.periodB?.endDate || '2099-12-31'}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: errorB ? '2px solid #ef4444' : '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#374151',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    {errorB && (
                      <div style={{
                        padding: '8px',
                        marginBottom: '12px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#dc2626'
                      }}>
                        {errorB}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button 
                        onClick={() => {
                          setShowPickerB(false)
                          setErrorB('')
                          setTempBStart(periodBStart || data?.periodB?.startDate || '')
                          setTempBEnd(periodBEnd || data?.periodB?.endDate || '')
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          fontSize: '13px',
                          cursor: 'pointer',
                          backgroundColor: 'white',
                          color: '#374151',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const validation = validateDateRange(tempBStart, tempBEnd)
                          if (validation.valid) {
                            setPeriodBStart(tempBStart)
                            setPeriodBEnd(tempBEnd)
                            setErrorB('')
                            setShowPickerB(false)
                            // Trigger data reload - handled by useEffect watching periodBStart/periodBEnd
                          } else {
                            setErrorB(validation.error || 'Invalid date range')
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          background: '#1e293b',
                          color: 'white',
                          border: 'none',
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0f172a'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#1e293b'
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div 
              className="customer-tier-trends-chart" 
              style={{ 
                height: '350px',
                width: '100%'
              }}
            >
              <CustomerTierLineChart
                series={periodBSeries}
                categories={periodBCategories}
                title=""
                chartIcon={getChartIcon('Customer Count')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

