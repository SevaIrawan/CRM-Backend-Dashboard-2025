'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import CustomerTierLineChart from './CustomerTierLineChart'
import { getChartIcon } from '@/lib/CentralIcon'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import { TIER_NAME_DEFINITIONS, TIER_NAME_COLORS } from '../constants'

// CSS untuk override chart border dan background agar semua dalam 1 canvas
// IMPORTANT: Hanya berlaku untuk Business Performance page dengan parent selector bp-subheader-wrapper
// Tidak akan mempengaruhi page lain karena selector sangat spesifik
const chartOverrideStyle = `
  .bp-subheader-wrapper .customer-tier-trends-chart-wrapper > div[role="img"] {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
  }
  .bp-subheader-wrapper .customer-tier-trends-chart-wrapper > div[role="img"] > div {
    background-color: transparent !important;
  }
  /* Background grey full canvas untuk Business Performance USC page - HANYA untuk BP page */
  .bp-subheader-wrapper .usc-business-performance-chart-wrapper > div[role="img"] {
    background-color: transparent !important;
  }
  .bp-subheader-wrapper .usc-business-performance-chart-wrapper > div[role="img"] > div {
    background-color: transparent !important;
  }
  .bp-subheader-wrapper .usc-business-performance-chart-wrapper [style*="background-color: rgb(255, 255, 255)"] {
    background-color: transparent !important;
  }
  .bp-subheader-wrapper .usc-business-performance-chart-wrapper [style*="background-color: #ffffff"] {
    background-color: transparent !important;
  }
  /* Placeholder styling untuk date picker - HANYA untuk Business Performance page */
  .bp-subheader-wrapper input[placeholder="Select Date"]::placeholder {
    color: #9ca3af !important;
    text-align: right !important;
  }
  /* Scrollbar styling untuk tier filter dropdown - HANYA untuk Business Performance page */
  .bp-subheader-wrapper .tier-filter-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .bp-subheader-wrapper .tier-filter-scroll::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  .bp-subheader-wrapper .tier-filter-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  .bp-subheader-wrapper .tier-filter-scroll::-webkit-scrollbar-thumb:hover {
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
  periodAStart?: string
  periodAEnd?: string
  periodBStart?: string
  periodBEnd?: string
  onPeriodAChange?: (start: string, end: string) => void
  onPeriodBChange?: (start: string, end: string) => void
  maxDate?: string // ✅ Max date from database for date range calculation
}

export default function CustomerTierTrends({ 
  dateRange, 
  brand, 
  squadLead, 
  channel, 
  searchTrigger, 
  tierNameOptions,
  periodAStart: propPeriodAStart,
  periodAEnd: propPeriodAEnd,
  periodBStart: propPeriodBStart,
  periodBEnd: propPeriodBEnd,
  onPeriodAChange,
  onPeriodBChange,
  maxDate
}: CustomerTierTrendsProps) {
  // Tier mapping untuk sorting (tier_number: tier_name)
  // Lower tier_number = Higher tier (Tier 1 = Highest, Tier 7 = Lowest)
  const TIER_NAME_TO_NUMBER: Record<string, number> = {
    'Super VIP': 1,
    'Tier 5': 2,
    'Tier 4': 3,
    'Tier 3': 4,
    'Tier 2': 5,
    'Tier 1': 6,
    'Regular': 7,
    'ND_P': 8,  // Potential tiers (lower priority)
    'P1': 9,
    'P2': 10
  }

  // Get tier number from tier name untuk sorting
  const getTierNumber = (tierName: string): number => {
    return TIER_NAME_TO_NUMBER[tierName] || 99 // 99 untuk tier yang tidak dikenal (akan di akhir)
  }

  // Build tier_name options from database for the filter dropdown
  // Sort dari tinggi ke rendah (Z to A): Super VIP → Tier 5 → Tier 4 → Tier 3 → Tier 2 → Tier 1 → Regular
  const TIER_NAME_OPTIONS: TierOption[] = React.useMemo(() => {
    const mapped = tierNameOptions.map((option, index) => ({
      key: option.name,
      label: option.name,
      color: TIER_NAME_COLORS[option.name] || DEFAULT_TIER_COLORS[index % DEFAULT_TIER_COLORS.length]
    }))
    // Sort dari tinggi ke rendah (ascending by tier number)
    return mapped.sort((a, b) => {
      const tierNumA = getTierNumber(a.key)
      const tierNumB = getTierNumber(b.key)
      return tierNumA - tierNumB // Ascending: tier 1 (Super VIP) first, then 2, 3, 4, 5, 6, 7 (Regular)
    })
  }, [tierNameOptions])
  
  // Helper function to format date as YYYY-MM-DD (local, no timezone shift)
  const formatDateLocal = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // Helper function to get anchor date from maxDate
  const getAnchorDate = () => {
    if (!maxDate) return null
    const parts = maxDate.split('-').map(p => parseInt(p, 10))
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [y, m, d] = parts
      return new Date(y, m - 1, d) // local date, no TZ shift
    }
    return null
  }

  // Helper function to calculate date ranges
  // Period B (current): Based on Date Range slicer, anchored to maxDate data
  // Period A (last): Same range di bulan sebelumnya (mengikuti KPI/Brand Comparison pattern)
  const calculateDateRanges = (rangeType: string) => {
    const anchor = getAnchorDate()
    if (!anchor) return null
    anchor.setHours(0, 0, 0, 0)
    
    if (rangeType === 'Last 7 Days') {
      // Period B: Last 7 days ending at anchor date
      const periodBEnd = new Date(anchor)
      const periodBStart = new Date(anchor)
      periodBStart.setDate(anchor.getDate() - 6) // Last 7 days including anchor
      
      // Period A: Range yang sama di bulan sebelumnya
      const periodAEnd = new Date(periodBEnd)
      periodAEnd.setMonth(periodAEnd.getMonth() - 1)
      const periodAStart = new Date(periodBStart)
      periodAStart.setMonth(periodAStart.getMonth() - 1)
      
      return {
        periodA: {
          start: formatDateLocal(periodAStart),
          end: formatDateLocal(periodAEnd)
        },
        periodB: {
          start: formatDateLocal(periodBStart),
          end: formatDateLocal(periodBEnd)
        }
      }
    } else if (rangeType === 'Last 30 Days') {
      // Period B: Last 30 days ending at anchor date
      const periodBEnd = new Date(anchor)
      const periodBStart = new Date(anchor)
      periodBStart.setDate(anchor.getDate() - 29) // Last 30 days including anchor
      
      // Period A: Range yang sama di bulan sebelumnya
      const periodAEnd = new Date(periodBEnd)
      periodAEnd.setMonth(periodAEnd.getMonth() - 1)
      const periodAStart = new Date(periodBStart)
      periodAStart.setMonth(periodAStart.getMonth() - 1)
      
      return {
        periodA: {
          start: formatDateLocal(periodAStart),
          end: formatDateLocal(periodAEnd)
        },
        periodB: {
          start: formatDateLocal(periodBStart),
          end: formatDateLocal(periodBEnd)
        }
      }
    }
    
    return null
  }

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
  
  // ✅ Store slicer values in ref to always use latest values in fetchData without triggering auto reload
  const brandRef = useRef(brand)
  const squadLeadRef = useRef(squadLead)
  const channelRef = useRef(channel)
  const dateRangeRef = useRef(dateRange)
  
  // Date range states for Period A and Period B
  // Use props if provided (from parent), otherwise use local state
  const [localPeriodAStart, setLocalPeriodAStart] = useState<string>('')
  const [localPeriodAEnd, setLocalPeriodAEnd] = useState<string>('')
  const [localPeriodBStart, setLocalPeriodBStart] = useState<string>('')
  const [localPeriodBEnd, setLocalPeriodBEnd] = useState<string>('')
  
  // Use props if provided, otherwise use local state
  const periodAStart = propPeriodAStart !== undefined ? propPeriodAStart : localPeriodAStart
  const periodAEnd = propPeriodAEnd !== undefined ? propPeriodAEnd : localPeriodAEnd
  const periodBStart = propPeriodBStart !== undefined ? propPeriodBStart : localPeriodBStart
  const periodBEnd = propPeriodBEnd !== undefined ? propPeriodBEnd : localPeriodBEnd
  
  // ✅ Store periods in ref to always use latest values in fetchData without triggering auto reload
  const periodAStartRef = useRef(periodAStart)
  const periodAEndRef = useRef(periodAEnd)
  const periodBStartRef = useRef(periodBStart)
  const periodBEndRef = useRef(periodBEnd)
  
  // Update refs when props change
  useEffect(() => {
    brandRef.current = brand
    squadLeadRef.current = squadLead
    channelRef.current = channel
    dateRangeRef.current = dateRange
    periodAStartRef.current = periodAStart
    periodAEndRef.current = periodAEnd
    periodBStartRef.current = periodBStart
    periodBEndRef.current = periodBEnd
  }, [brand, squadLead, channel, dateRange, periodAStart, periodAEnd, periodBStart, periodBEnd])
  
  // Wrapper functions to update period (use callback if provided, otherwise update local state)
  const updatePeriodA = (start: string, end: string) => {
    if (onPeriodAChange) {
      onPeriodAChange(start, end)
    } else {
      setLocalPeriodAStart(start)
      setLocalPeriodAEnd(end)
    }
  }
  const updatePeriodB = (start: string, end: string) => {
    if (onPeriodBChange) {
      onPeriodBChange(start, end)
    } else {
      setLocalPeriodBStart(start)
      setLocalPeriodBEnd(end)
    }
  }
  
  // Keep setPeriodAStart, setPeriodAEnd, etc. for backward compatibility with existing code
  const setPeriodAStart = (start: string) => {
    updatePeriodA(start, periodAEnd)
  }
  const setPeriodAEnd = (end: string) => {
    updatePeriodA(periodAStart, end)
  }
  const setPeriodBStart = (start: string) => {
    updatePeriodB(start, periodBEnd)
  }
  const setPeriodBEnd = (end: string) => {
    updatePeriodB(periodBStart, end)
  }
  
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
  // Determine which tier options to display in the chart
  // If no filter selected, use tier_group
  // If filter selected, use filtered tier_name data from API
  // Sort dari tinggi ke rendah (Z to A): Super VIP → Tier 5 → Tier 4 → Tier 3 → Tier 2 → Tier 1 → Regular
  const displayTierOptions = React.useMemo(() => {
    const options = selectedTiers.length > 0 ? 
      TIER_NAME_OPTIONS.filter(opt => selectedTiers.includes(opt.key)) :
      TIER_GROUP_OPTIONS
    // Sort dari tinggi ke rendah (ascending by tier number)
    return options.sort((a, b) => {
      const tierNumA = getTierNumber(a.key)
      const tierNumB = getTierNumber(b.key)
      return tierNumA - tierNumB // Ascending: tier 1 (Super VIP) first, then 2, 3, 4, 5, 6, 7 (Regular)
    })
  }, [selectedTiers, TIER_NAME_OPTIONS])
    
  // ✅ Build tier color mapping - USE EXACT SAME COLORS AS FILTER DROPDOWN
  // This ensures chart lines use the same colors shown in the tier filter dropdown
  const tierColors: Record<string, string> = React.useMemo(() => {
    const colors: Record<string, string> = {}
    
    // First, add tier_group colors
    TIER_GROUP_OPTIONS.forEach(opt => {
      colors[opt.key] = opt.color
    })
    
    // Most important: Use EXACT same colors from TIER_NAME_OPTIONS (same as filter dropdown)
    // TIER_NAME_OPTIONS already has correct colors from TIER_NAME_COLORS or DEFAULT_TIER_COLORS
    TIER_NAME_OPTIONS.forEach(opt => {
      // ✅ Use color directly from TIER_NAME_OPTIONS (matches filter dropdown exactly)
      // This ensures chart lines have the same colors as shown in the filter dropdown
      colors[opt.key] = opt.color
    })
    
    // Debug: Log color mapping to verify
    if (process.env.NODE_ENV === 'development') {
      console.log('🎨 [Tier Colors] Color mapping:', Object.entries(colors))
    }
    
    return colors
  }, [TIER_NAME_OPTIONS]) // ✅ Dependency ensures colors update when tier options change
  
  const tierLabels: Record<string, string> = React.useMemo(() => {
    const labels: Record<string, string> = {}
    TIER_GROUP_OPTIONS.forEach(opt => labels[opt.key] = opt.label)
    TIER_NAME_OPTIONS.forEach(opt => labels[opt.key] = opt.label)
    return labels
  }, [TIER_NAME_OPTIONS]) // ✅ Add dependency
  
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
  
  // Check if date pickers should be enabled (only for Custom)
  const isDatePickerEnabled = dateRange === 'Custom'
  
  // Initialize date ranges based on dateRange - HARUS di-set sebelum fetchData
  // Only update if using local state (not controlled by parent)
  useEffect(() => {
    if (propPeriodAStart === undefined) { // Only if not controlled by parent
      if (dateRange === 'Custom') {
        // Custom mode: Set to empty (Select Date) - user harus pilih manual
        // Chart tetap tampil data terakhir, tidak fetch baru
        setLocalPeriodAStart('')
        setLocalPeriodAEnd('')
        setLocalPeriodBStart('')
        setLocalPeriodBEnd('')
      } else {
        // Auto mode: Calculate dates for Last 7 Days or Last 30 Days immediately
        const calculatedRanges = calculateDateRanges(dateRange)
        if (calculatedRanges) {
          setLocalPeriodAStart(calculatedRanges.periodA.start)
          setLocalPeriodAEnd(calculatedRanges.periodA.end)
          setLocalPeriodBStart(calculatedRanges.periodB.start)
          setLocalPeriodBEnd(calculatedRanges.periodB.end)
        }
      }
    }
  }, [dateRange, propPeriodAStart])
  
  // ✅ Debounce ref for tier filter changes
  const tierFilterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  
  // ✅ Fetch data function - optimized with proper dependencies
  const fetchData = React.useCallback(async (skipLoadingState = false) => {
    // ✅ Use ref to get latest dateRange value without triggering auto reload
    const currentDateRange = dateRangeRef.current
    
    // ✅ Use ref to get latest periods value without triggering auto reload
    const currentPeriodAStart = periodAStartRef.current
    const currentPeriodAEnd = periodAEndRef.current
    const currentPeriodBStart = periodBStartRef.current
    const currentPeriodBEnd = periodBEndRef.current
    
    // Check jika Custom mode tapi dates belum dipilih - tidak fetch, chart tetap tampil data terakhir
    if (currentDateRange === 'Custom' && (!currentPeriodAStart || !currentPeriodAEnd || !currentPeriodBStart || !currentPeriodBEnd)) {
      // Tidak fetch data baru, chart tetap tampil data terakhir (tidak set loading, tidak error)
      return
    }
    
    if (!skipLoadingState) {
      setLoading(true)
    }
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
        brand: brandRef.current || 'All', // ✅ Use ref to always get latest value
        squadLead: squadLeadRef.current || 'All', // ✅ Use ref to always get latest value
        channel: channelRef.current || 'All' // ✅ Use ref to always get latest value
      })
      
      // Add tierNames filter ONLY if user has selected specific tiers
      // If selectedTiers is empty, API will use tier_group (default mode)
      if (selectedTiers && selectedTiers.length > 0) {
        params.append('tierNames', selectedTiers.join(','))
        console.log('🔍 [Tier Trends] Using tier_name filter:', selectedTiers)
      } else {
        console.log('🔍 [Tier Trends] Using tier_group (default mode)')
      }
      
      // ✅ CRITICAL: Use Period A and B from props/refs (managed by parent CustomerTierAnalytics)
      // DO NOT recalculate here - parent already sets Period A and B based on Date Range slicer
      let datesToUse: { periodA: { start: string; end: string }; periodB: { start: string; end: string } } | null = null
      
      // ✅ Priority 1: Use Period A and B from props/refs if available (from parent CustomerTierAnalytics)
      if (currentPeriodAStart && currentPeriodAEnd && currentPeriodBStart && currentPeriodBEnd) {
        datesToUse = {
          periodA: { start: currentPeriodAStart, end: currentPeriodAEnd },
          periodB: { start: currentPeriodBStart, end: currentPeriodBEnd }
        }
      } else if (currentDateRange === 'Last 7 Days' || currentDateRange === 'Last 30 Days') {
        // ✅ Priority 2: Fallback - calculate dates only if Period A/B not provided from parent
        datesToUse = calculateDateRanges(currentDateRange)
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
      if (!skipLoadingState) {
        setLoading(false)
      }
    }
  }, [selectedTiers]) // ✅ Hanya selectedTiers yang trigger auto reload (tier filter). dateRange, periods, brand, squadLead, channel tetap digunakan dalam fetchData tapi tidak trigger auto reload - hanya searchTrigger yang trigger reload untuk semua slicer
  
  // ✅ CONSOLIDATED useEffect: Handle all fetch triggers
  const isInitialMountRef = useRef(true)
  const lastSearchTriggerRef = useRef(0)
  const fetchDataRef = useRef(fetchData)
  const prevPeriodsRef = useRef<{ aStart: string; aEnd: string; bStart: string; bEnd: string }>({
    aStart: '',
    aEnd: '',
    bStart: '',
    bEnd: ''
  })
  
  // Always keep fetchDataRef updated with latest fetchData function
  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])
  
  useEffect(() => {
    // Initial mount: fetch once
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      fetchDataRef.current()
      return
    }
    
    // Search trigger from parent: fetch immediately when button clicked
    if (searchTrigger && searchTrigger > 0 && searchTrigger !== lastSearchTriggerRef.current) {
      lastSearchTriggerRef.current = searchTrigger
      fetchDataRef.current()
      return
    }
  }, [searchTrigger]) // ✅ Only searchTrigger triggers reload, not fetchData callback recreation
  
  // Fetch again when parent-provided periods change (e.g., after maxDate loaded)
  useEffect(() => {
    if (isInitialMountRef.current) return
    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) return
    const prev = prevPeriodsRef.current
    if (
      prev.aStart !== periodAStart ||
      prev.aEnd !== periodAEnd ||
      prev.bStart !== periodBStart ||
      prev.bEnd !== periodBEnd
    ) {
      prevPeriodsRef.current = {
        aStart: periodAStart,
        aEnd: periodAEnd,
        bStart: periodBStart,
        bEnd: periodBEnd
      }
      fetchDataRef.current()
    }
  }, [periodAStart, periodAEnd, periodBStart, periodBEnd])

  // ✅ Separate effect for date picker changes (custom mode only) - REMOVED: Date picker changes should also require Search button click
  // Date picker changes will be handled by searchTrigger when user clicks Search button
  
  // ✅ Debounced tier filter changes (500ms delay)
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMountRef.current) {
      return
    }
    
    // Clear previous debounce
    if (tierFilterDebounceRef.current) {
      clearTimeout(tierFilterDebounceRef.current)
    }
    
    // Set new debounce
    tierFilterDebounceRef.current = setTimeout(() => {
      fetchDataRef.current(true) // Skip loading state for smoother UX
    }, 500)
    
    // Cleanup
    return () => {
      if (tierFilterDebounceRef.current) {
        clearTimeout(tierFilterDebounceRef.current)
      }
    }
  }, [selectedTiers]) // ✅ Only selectedTiers triggers tier filter reload, not fetchData callback recreation

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

  // ✅ Prepare series for Period A with clear, distinct colors
  // Use all tiers from API response data (tier_group or tier_name based on filter)
  const availableTiersA = Object.keys(data.periodA.data || {})
  const periodASeries = availableTiersA
    .filter(tier => data.periodA.data[tier] && Array.isArray(data.periodA.data[tier]))
    .map(tier => {
      // ✅ Get color from tierColors - this now uses EXACT same colors as filter dropdown
      // tierColors is built from TIER_NAME_OPTIONS which matches the filter dropdown colors
      
      // Try multiple ways to get the color
      let tierColor: string | undefined = tierColors[tier]
      
      // If not found, try to find in TIER_NAME_OPTIONS directly
      if (!tierColor) {
        const tierOption = TIER_NAME_OPTIONS.find(opt => opt.key === tier)
        if (tierOption) {
          tierColor = tierOption.color
        }
      }
      
      // If still not found, try from constants
      if (!tierColor) {
        tierColor = TIER_NAME_COLORS[tier]
      }
      
      // Final fallback - ensure it's always a string
      const finalTierColor = tierColor || '#6B7280' // Gray as last resort
      
      // Debug: Log only if color not found (indicates a problem)
      if (finalTierColor === '#6B7280' && tierColors[tier] === undefined) {
        console.warn(`⚠️ [Period A] Tier "${tier}" not found in color mapping, using gray fallback`)
      }
      
      return {
        name: `${tierLabels[tier] || tier} Customer Count`,
        data: data.periodA.data[tier] || [],
        color: finalTierColor, // ✅ Exact same color as shown in filter dropdown
        tierKey: tier // Store tier key for sorting
      }
    })
    .sort((a, b) => {
      // Sort dari tinggi ke rendah (Z to A): Super VIP → Tier 5 → Tier 4 → Tier 3 → Tier 2 → Tier 1 → Regular
      const tierNumA = getTierNumber(a.tierKey)
      const tierNumB = getTierNumber(b.tierKey)
      return tierNumA - tierNumB // Ascending: tier 1 (Super VIP) first, then 2, 3, 4, 5, 6, 7 (Regular)
    })

  // ✅ Prepare series for Period B with clear, distinct colors
  const availableTiersB = Object.keys(data.periodB.data || {})
  const periodBSeries = availableTiersB
    .filter(tier => data.periodB.data[tier] && Array.isArray(data.periodB.data[tier]))
    .map(tier => {
      // ✅ Get color from tierColors - this now uses EXACT same colors as filter dropdown
      // tierColors is built from TIER_NAME_OPTIONS which matches the filter dropdown colors
      
      // Try multiple ways to get the color (same as Period A)
      let tierColor: string | undefined = tierColors[tier]
      
      // If not found, try to find in TIER_NAME_OPTIONS directly
      if (!tierColor) {
        const tierOption = TIER_NAME_OPTIONS.find(opt => opt.key === tier)
        if (tierOption) {
          tierColor = tierOption.color
        }
      }
      
      // If still not found, try from constants
      if (!tierColor) {
        tierColor = TIER_NAME_COLORS[tier]
      }
      
      // Final fallback - ensure it's always a string
      const finalTierColor = tierColor || '#6B7280' // Gray as last resort
      
      return {
        name: `${tierLabels[tier] || tier} Customer Count`,
        data: data.periodB.data[tier] || [],
        color: finalTierColor, // ✅ Exact same color as shown in filter dropdown
        tierKey: tier // Store tier key for sorting
      }
    })
    .sort((a, b) => {
      // Sort dari tinggi ke rendah (Z to A): Super VIP → Tier 5 → Tier 4 → Tier 3 → Tier 2 → Tier 1 → Regular
      const tierNumA = getTierNumber(a.tierKey)
      const tierNumB = getTierNumber(b.tierKey)
      return tierNumA - tierNumB // Ascending: tier 1 (Super VIP) first, then 2, 3, 4, 5, 6, 7 (Regular)
    })
  
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
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              backgroundColor: '#F9FAFB'
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
                            updatePeriodA(tempAStart, tempAEnd)
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
              className="customer-tier-trends-chart usc-business-performance-chart-wrapper" 
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
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              backgroundColor: '#F9FAFB'
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
                            updatePeriodB(tempBStart, tempBEnd)
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
              className="customer-tier-trends-chart usc-business-performance-chart-wrapper" 
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

