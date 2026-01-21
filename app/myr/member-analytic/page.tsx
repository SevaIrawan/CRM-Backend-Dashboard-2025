'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import { KPI_ICONS } from '@/lib/CentralIcon'

interface SlicerOptions {
  lines: string[]
  paymentMethods?: string[]
  activeTimes?: string[]
  fbaLabels?: string[]
  defaults?: {
    line: string
  }
}

interface TierDataRow {
  [key: string]: any
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalRecords: number
  recordsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function MYRMemberAnalyticPage() {
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions>({
    lines: [],
    paymentMethods: [],
    activeTimes: [],
    fbaLabels: []
  })
  const [selectedLine, setSelectedLine] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [slicerLoading, setSlicerLoading] = useState(false)
  const [activeBookmark, setActiveBookmark] = useState<'tier-data' | 'customer-behavior'>('tier-data')
  
  // Tier Data state
  const [tierData, setTierData] = useState<TierDataRow[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 1000,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [searchUserName, setSearchUserName] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // Customer Behavior state
  const [customerBehaviorData, setCustomerBehaviorData] = useState<TierDataRow[]>([])
  const [customerBehaviorPagination, setCustomerBehaviorPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 1000,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [customerBehaviorSearchUserName, setCustomerBehaviorSearchUserName] = useState('')
  const [customerBehaviorSearchInput, setCustomerBehaviorSearchInput] = useState('')
  const [customerBehaviorLoading, setCustomerBehaviorLoading] = useState(false)
  
  // Customer Behavior slicer states (selected - for UI)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('ALL')
  const [selectedActiveTime, setSelectedActiveTime] = useState('ALL')
  const [selectedFBA, setSelectedFBA] = useState('ALL')
  
  // Customer Behavior slicer applied states (for filtering - only updated when Search clicked)
  const [appliedPaymentMethod, setAppliedPaymentMethod] = useState('ALL')
  const [appliedActiveTime, setAppliedActiveTime] = useState('ALL')
  const [appliedFBA, setAppliedFBA] = useState('ALL')

  // Column order for Tier_Data bookmark
  const tierDataColumnOrder = [
    'line',
    'unique_code',
    'user_name',
    'absent',
    'fdd',
    'ldd',
    'da',
    'wa',
    'ggr',
    'dc',
    'wc',
    'days_active',
    'time_of_deposit',
    'avg_attendance',
    'avg_da',
    'avg_ggr',
    'pf',
    'atv',
    'winrate',
    'wd_rate',
    'lifetime_tier',
    'recent_tier'
  ]

  // Column order for Customer Behavior bookmark
  const customerBehaviorColumnOrder = [
    'line',
    'unique_code',
    'user_name',
    'absent',
    'payment_method',
    'peak',
    'bonus_type',
    'provider',
    'fba_label'
  ]

  // Header mapping
  const formatHeaderTitle = (column: string): string => {
    const headerMap: { [key: string]: string } = {
      // Tier Data headers
      'line': 'BRAND',
      'unique_code': 'UNIQUE CODE',
      'user_name': 'USER NAME',
      'absent': 'ABSENT',
      'fdd': 'FDD',
      'ldd': 'LDD',
      'da': 'DA',
      'wa': 'WA',
      'ggr': 'GGR',
      'dc': 'DC',
      'wc': 'WC',
      'days_active': 'ATTENDANCE',
      'time_of_deposit': 'TIME OF DEPOSIT',
      'avg_attendance': 'AVG ATTENDANCE',
      'avg_da': 'AVG DA',
      'avg_ggr': 'AVG GGR',
      'pf': 'PF',
      'atv': 'ATV',
      'winrate': 'WINRATE',
      'wd_rate': 'WD RATE',
      'lifetime_tier': 'LIFETIME TIER',
      'recent_tier': 'RECENT TIER',
      // Customer Behavior headers
      'payment_method': 'PAYMENT METHOD',
      'peak': 'ACTIVE TIME',
      'bonus_type': 'BONUS TYPE',
      'provider': 'PROVIDER',
      'fba_label': 'FAVOURITE BET AMOUNT'
    }
    return headerMap[column.toLowerCase()] || column.toUpperCase()
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
    // User name should always be left aligned
    if (column === 'user_name') return 'left'
    
    // Brand (line) should be center aligned
    if (column === 'line') return 'center'
    
    // Customer Behavior columns should be center aligned
    if (column === 'absent' || column === 'payment_method' || column === 'peak' || column === 'bonus_type' || column === 'provider' || column === 'fba_label') {
      return 'center'
    }
    
    if (value === undefined) return 'left'
    if (typeof value === 'number') return 'right'
    if (typeof value === 'string') {
      const cleanValue = value.replace(/,/g, '')
      if (!isNaN(Number(cleanValue)) && cleanValue !== '' && cleanValue !== '-') return 'right'
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'right'
    }
    return 'left'
  }

  // Get badge color for different values
  const getBadgeColor = (column: string, value: string): { bg: string; text: string; border: string } => {
    if (!value || value === '-' || value === '') {
      return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' }
    }

    const normalizedValue = value.toString().toLowerCase().trim()

    // Active Time (peak) colors - setiap time slot warna berbeda
    if (column === 'peak') {
      const timeColors: { [key: string]: { bg: string; text: string; border: string } } = {
        '00:00 - 03:00': { bg: '#ede9fe', text: '#5b21b6', border: '#a78bfa' },
        '03:00 - 06:00': { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8' },
        '06:00 - 09:00': { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' },
        '09:00 - 12:00': { bg: '#e0f2fe', text: '#0c4a6e', border: '#38bdf8' },
        '12:00 - 15:00': { bg: '#f0f9ff', text: '#164e63', border: '#22d3ee' },
        '15:00 - 18:00': { bg: '#ecfeff', text: '#134e4a', border: '#2dd4bf' },
        '18:00 - 21:00': { bg: '#f0fdfa', text: '#14532d', border: '#34d399' },
        '21:00 - 00:00': { bg: '#fef3c7', text: '#78350f', border: '#fbbf24' }
      }
      
      // Check exact match first
      const exactMatch = Object.keys(timeColors).find(key => 
        normalizedValue === key.toLowerCase().replace(/\s/g, '')
      )
      if (exactMatch) {
        return timeColors[exactMatch]
      }
      
      // Check partial match
      for (const [key, colors] of Object.entries(timeColors)) {
        if (normalizedValue.includes(key.toLowerCase().replace(/\s/g, '')) || 
            key.toLowerCase().replace(/\s/g, '').includes(normalizedValue)) {
          return colors
        }
      }
      
      // Fallback based on hash of value
      const hash = normalizedValue.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const fallbackColors = Object.values(timeColors)
      return fallbackColors[hash % fallbackColors.length]
    }

    // Bonus Type colors - setiap bonus type warna berbeda
    if (column === 'bonus_type') {
      const bonusColors: { [key: string]: { bg: string; text: string; border: string } } = {
        'no bonus': { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
        'unlimited bonus': { bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
        'welcome bonus': { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
        'daily bonus': { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' },
        'deposit bonus': { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8' },
        'cashback': { bg: '#d1fae5', text: '#065f46', border: '#34d399' },
        'free spin': { bg: '#fce7f3', text: '#9f1239', border: '#f472b6' },
        'weekly bonus': { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' },
        'monthly bonus': { bg: '#fef3c7', text: '#78350f', border: '#f59e0b' }
      }
      
      // Check exact match
      for (const [key, colors] of Object.entries(bonusColors)) {
        if (normalizedValue === key || normalizedValue.includes(key) || key.includes(normalizedValue)) {
          return colors
        }
      }
      
      // Fallback
      return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
    }

    // Provider colors - setiap provider warna berbeda
    if (column === 'provider') {
      const providerColors: { [key: string]: { bg: string; text: string; border: string } } = {
        'mega888': { bg: '#dcfce7', text: '#166534', border: '#4ade80' },
        'pussy888': { bg: '#fce7f3', text: '#9f1239', border: '#f472b6' },
        'sexy gaming': { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
        '918kiss': { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8' },
        'xe88': { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' },
        'playboy': { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' },
        'live22': { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
        'joker': { bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
        'rollex11': { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
        'lucky palace': { bg: '#f0f9ff', text: '#0c4a6e', border: '#7dd3fc' },
        'lainnya': { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8' },
        'other': { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
      }
      
      // Check exact match
      for (const [key, colors] of Object.entries(providerColors)) {
        if (normalizedValue === key || normalizedValue.includes(key) || key.includes(normalizedValue)) {
          return colors
        }
      }
      
      // Fallback
      return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
    }

    // Favourite Bet Amount (fba_label) colors - setiap range warna berbeda
    if (column === 'fba_label') {
      const betAmountColors: { [key: string]: { bg: string; text: string; border: string } } = {
        '1.00 below': { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8' },
        '1.00 - 2.50': { bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
        '2.50 - 5.00': { bg: '#fed7aa', text: '#9a3412', border: '#fb923c' },
        '5.00 - 10.00': { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
        '10.00 - 25.00': { bg: '#d1fae5', text: '#065f46', border: '#34d399' },
        '25.00 - 50.00': { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' },
        '50.00 - 100.00': { bg: '#e0e7ff', text: '#5b21b6', border: '#a78bfa' },
        '100.00 above': { bg: '#fce7f3', text: '#9f1239', border: '#f472b6' },
        '10.00 above': { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' }
      }
      
      // Normalize value untuk matching
      const cleanValue = normalizedValue.replace(/\s/g, '')
      
      // Check exact match first
      for (const [key, colors] of Object.entries(betAmountColors)) {
        const cleanKey = key.toLowerCase().replace(/\s/g, '')
        if (cleanValue === cleanKey || cleanValue.includes(cleanKey) || cleanKey.includes(cleanValue)) {
          return colors
        }
      }
      
      // Fallback
      return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
    }

    // Payment Method colors - setiap payment method warna berbeda
    if (column === 'payment_method') {
      const paymentColors: { [key: string]: { bg: string; text: string; border: string } } = {
        'vip link': { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8' },
        'group aia': { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' },
        'bank': { bg: '#dcfce7', text: '#166534', border: '#4ade80' },
        'automation': { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
        'ewallet': { bg: '#fce7f3', text: '#9f1239', border: '#f472b6' },
        'credit card': { bg: '#f3e8ff', text: '#6b21a8', border: '#c084fc' },
        'crypto': { bg: '#d1fae5', text: '#065f46', border: '#34d399' },
        'online banking': { bg: '#fed7aa', text: '#9a3412', border: '#fb923c' },
        'manual': { bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
        'instant': { bg: '#f0f9ff', text: '#0c4a6e', border: '#7dd3fc' },
        'other': { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
      }
      
      // Check exact match
      for (const [key, colors] of Object.entries(paymentColors)) {
        if (normalizedValue === key || normalizedValue.includes(key) || key.includes(normalizedValue)) {
          return colors
        }
      }
      
      // Fallback
      return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
    }

    return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
  }

  // Render badge component
  const renderBadge = (column: string, value: any) => {
    const displayValue = formatTableCell(value)
    const colors = getBadgeColor(column, displayValue)
    
  return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        whiteSpace: 'nowrap'
      }}>
        {displayValue}
      </span>
    )
  }

  // Get sorted columns - ensure no duplicates
  const getSortedColumns = (dataKeys: string[], bookmark: 'tier-data' | 'customer-behavior' = 'tier-data'): string[] => {
    // Remove duplicates from dataKeys
    const uniqueKeys = Array.from(new Set(dataKeys))
    const columnOrder = bookmark === 'customer-behavior' ? customerBehaviorColumnOrder : tierDataColumnOrder
    const sortedColumns = columnOrder.filter(col => uniqueKeys.includes(col))
    const remainingColumns = uniqueKeys.filter(col => !columnOrder.includes(col))
    return [...sortedColumns, ...remainingColumns]
  }

  // Filter data based on search user name
  const getFilteredData = () => {
    if (!searchUserName.trim()) {
      return tierData
    }
    
    return tierData.filter((row: TierDataRow) => {
      const userName = row.user_name || ''
      return userName.toLowerCase().includes(searchUserName.toLowerCase())
    })
  }

  const filteredData = getFilteredData()

  // Handle search button click
  const handleSearchUser = () => {
    setIsSearching(true)
    setTimeout(() => {
      setSearchUserName(searchInput)
      setIsSearching(false)
    }, 300)
  }

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput('')
    setSearchUserName('')
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchUser()
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSlicerOptions()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (activeBookmark === 'tier-data' && selectedLine && !slicerLoading) {
      if (!initialLoadDone) {
        console.log('✅ [Tier Data] Initial load:', { selectedLine })
        fetchTierData()
        setInitialLoadDone(true)
      } else {
        console.log('✅ [Tier Data] Line changed, resetting:', { selectedLine })
        setPagination(prev => ({ ...prev, currentPage: 1 }))
        // Clear search when line changes
        if (searchUserName) {
          setSearchUserName('')
          setSearchInput('')
        }
        fetchTierData()
      }
    } else if (activeBookmark === 'customer-behavior' && selectedLine && !slicerLoading) {
      console.log('✅ [Customer Behavior] Fetching data:', { selectedLine })
      // Reset pagination first
      setCustomerBehaviorPagination({
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0,
        recordsPerPage: 1000,
        hasNextPage: false,
        hasPrevPage: false
      })
      if (customerBehaviorSearchUserName) {
        setCustomerBehaviorSearchUserName('')
        setCustomerBehaviorSearchInput('')
      }
      // Reset slicers when line changes (both selected and applied)
      setSelectedPaymentMethod('ALL')
      setSelectedActiveTime('ALL')
      setSelectedFBA('ALL')
      setAppliedPaymentMethod('ALL')
      setAppliedActiveTime('ALL')
      setAppliedFBA('ALL')
      // Fetch data immediately (no setTimeout to prevent flash)
      fetchCustomerBehaviorData()
    } else if (activeBookmark !== 'tier-data' && activeBookmark !== 'customer-behavior') {
      setInitialLoadDone(false)
    }
  }, [activeBookmark, selectedLine, slicerLoading])

  useEffect(() => {
    const isInitialMount = pagination.currentPage === 1 && pagination.totalPages === 1 && pagination.totalRecords === 0
    if (!isInitialMount && initialLoadDone && activeBookmark === 'tier-data' && selectedLine) {
      fetchTierData()
    }
  }, [pagination.currentPage])

  useEffect(() => {
    // Skip initial mount - handled by the main useEffect above
    if (activeBookmark === 'customer-behavior' && selectedLine) {
      const isInitialMount = customerBehaviorPagination.currentPage === 1 && customerBehaviorPagination.totalPages === 1 && customerBehaviorPagination.totalRecords === 0
      // Always fetch when filters change, but skip true initial mount
      if (!isInitialMount) {
        fetchCustomerBehaviorData()
      }
    }
  }, [customerBehaviorPagination.currentPage, appliedPaymentMethod, appliedActiveTime, appliedFBA, customerBehaviorSearchUserName, selectedLine, activeBookmark])

  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      
      // Get user's allowed brands from localStorage
      let allowedBrands: string[] | null = null
      try {
        const userStr = localStorage.getItem('nexmax_user')
        if (userStr) {
          allowedBrands = JSON.parse(userStr).allowed_brands || null
        }
      } catch (parseError) {
        console.warn('⚠️ [Member Analytic] Failed to parse user data from localStorage:', parseError)
        allowedBrands = null
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (allowedBrands) {
        headers['x-user-allowed-brands'] = JSON.stringify(allowedBrands)
      }

      const response = await fetch('/api/myr-member-analytic/slicer-options', {
        headers,
        cache: 'no-store'
      })
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions(result.data)
        
        if (result.data.defaults) {
          const defaultLine = result.data.defaults.line || 'ALL'
          setSelectedLine(defaultLine)
          console.log('✅ [Member Analytic MYR] Auto-set to defaults:', result.data.defaults)
        }
      }
    } catch (error) {
      console.error('Error fetching slicer options:', error)
    } finally {
      setSlicerLoading(false)
      setLoading(false)
    }
  }

  const fetchTierData = async () => {
    if (!selectedLine) {
      console.log('⏳ [Tier Data] Waiting for line to be set...')
      return
    }
    
    try {
      // Only show loading if no data exists (prevent flash on bookmark switch)
      if (tierData.length === 0) {
        setLoading(true)
      }
      // Get user's allowed brands from localStorage
      let allowedBrands: string[] | null = null
      try {
        const userStr = localStorage.getItem('nexmax_user')
        if (userStr) {
          allowedBrands = JSON.parse(userStr).allowed_brands || null
        }
      } catch (parseError) {
        console.warn('⚠️ [Member Analytic] Failed to parse user data from localStorage:', parseError)
        allowedBrands = null
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (allowedBrands) {
        headers['x-user-allowed-brands'] = JSON.stringify(allowedBrands)
      }

      const params = new URLSearchParams({
        line: selectedLine,
        page: pagination.currentPage.toString(),
        limit: pagination.recordsPerPage.toString()
      })

      const response = await fetch(`/api/myr-member-analytic/tier-data?${params}`, {
        headers
      })
      
      if (!response.ok) {
        console.error('❌ API Error:', response.status, response.statusText)
        setTierData([])
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
        setTierData(result.data || [])
        setPagination(result.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0,
          recordsPerPage: 1000,
          hasNextPage: false,
          hasPrevPage: false
        })
      } else {
        console.error('❌ API Error:', result.error || result.message)
        setTierData([])
      }
    } catch (error) {
      console.error('❌ Error fetching tier data:', error)
      setTierData([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerBehaviorData = async () => {
    if (!selectedLine) {
      console.log('⏳ [Customer Behavior] Waiting for line to be set...')
      return
    }
    
    try {
      // Only show loading if no data exists (prevent flash on bookmark switch)
      if (customerBehaviorData.length === 0) {
        setCustomerBehaviorLoading(true)
      }
      // Get user's allowed brands from localStorage
      let allowedBrands: string[] | null = null
      try {
        const userStr = localStorage.getItem('nexmax_user')
        if (userStr) {
          allowedBrands = JSON.parse(userStr).allowed_brands || null
        }
      } catch (parseError) {
        console.warn('⚠️ [Member Analytic] Failed to parse user data from localStorage:', parseError)
        allowedBrands = null
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (allowedBrands) {
        headers['x-user-allowed-brands'] = JSON.stringify(allowedBrands)
      }

      const params = new URLSearchParams({
        line: selectedLine,
        page: customerBehaviorPagination.currentPage.toString(),
        limit: customerBehaviorPagination.recordsPerPage.toString(),
        searchUserName: customerBehaviorSearchUserName || '',
        paymentMethod: appliedPaymentMethod,
        activeTime: appliedActiveTime,
        fba: appliedFBA
      })

      const response = await fetch(`/api/myr-member-analytic/customer-behavior?${params}`, {
        headers
      })
      
      if (!response.ok) {
        console.error('❌ API Error:', response.status, response.statusText)
        setCustomerBehaviorData([])
        setCustomerBehaviorPagination(prev => ({ 
          ...prev, 
          totalRecords: 0, 
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }))
        setCustomerBehaviorLoading(false)
        return
      }
      
      const result = await response.json()
      
      if (result.success) {
        setCustomerBehaviorData(result.data || [])
        setCustomerBehaviorPagination(result.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0,
          recordsPerPage: 1000,
          hasNextPage: false,
          hasPrevPage: false
        })
      } else {
        console.error('❌ API Error:', result.error || result.message)
        setCustomerBehaviorData([])
      }
    } catch (error) {
      console.error('❌ Error fetching customer behavior data:', error)
      setCustomerBehaviorData([])
    } finally {
      setCustomerBehaviorLoading(false)
    }
  }

  // ✅ Data already filtered by server (API), so no need for client-side filtering
  // Filter customer behavior data - NO LONGER NEEDED, data already filtered by API
  const getFilteredCustomerBehaviorData = () => {
    // API sudah filter berdasarkan searchUserName, paymentMethod, activeTime, fba
    // Jadi langsung return customerBehaviorData tanpa filter tambahan
    return customerBehaviorData
  }

  const filteredCustomerBehaviorData = getFilteredCustomerBehaviorData()
  
  // ✅ Use slicer options from API (all available options, not filtered)
  const paymentMethodOptions = slicerOptions.paymentMethods || ['ALL']
  const activeTimeOptions = slicerOptions.activeTimes || ['ALL']
  const fbaOptions = slicerOptions.fbaLabels || ['ALL']

  // Handle customer behavior search
  const handleCustomerBehaviorSearch = () => {
    setCustomerBehaviorSearchUserName(customerBehaviorSearchInput)
    setCustomerBehaviorPagination(prev => ({ ...prev, currentPage: 1 }))
    // Trigger fetch will happen via useEffect when customerBehaviorSearchUserName changes
  }

  // Handle clear customer behavior search
  const handleClearCustomerBehaviorSearch = () => {
    setCustomerBehaviorSearchInput('')
    setCustomerBehaviorSearchUserName('')
  }
  
  // Handle slicer changes - only update selected (not applied) - no auto-reload
  const handlePaymentMethodChange = (value: string) => {
    setSelectedPaymentMethod(value)
  }
  
  const handleActiveTimeChange = (value: string) => {
    setSelectedActiveTime(value)
  }
  
  const handleFBAChange = (value: string) => {
    setSelectedFBA(value)
  }
  
  // Handle Search button click - apply filters and reset pagination
  const handleCustomerBehaviorSlicerSearch = () => {
    setAppliedPaymentMethod(selectedPaymentMethod)
    setAppliedActiveTime(selectedActiveTime)
    setAppliedFBA(selectedFBA)
    setCustomerBehaviorPagination(prev => ({ ...prev, currentPage: 1 }))
    // Trigger fetch will happen via useEffect when applied filters change
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      
      console.log('📤 Starting export for MYR Member-Analytic data...')
      
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      // Determine export type and search filter
      const exportType = activeBookmark === 'tier-data' ? 'tier-data' : 'customer-behavior'
      const searchUserName = activeBookmark === 'tier-data' 
        ? searchInput 
        : customerBehaviorSearchUserName
      
      const exportBody: any = {
        exportType,
        line: selectedLine,
        searchUserName: searchUserName || null
      }
      
      // Add slicer filters for customer-behavior export
      if (activeBookmark === 'customer-behavior') {
        exportBody.paymentMethod = appliedPaymentMethod !== 'ALL' ? appliedPaymentMethod : null
        exportBody.activeTime = appliedActiveTime !== 'ALL' ? appliedActiveTime : null
        exportBody.fba = appliedFBA !== 'ALL' ? appliedFBA : null
        
        console.log('📤 [Export] Customer Behavior filters:', {
          paymentMethod: exportBody.paymentMethod,
          activeTime: exportBody.activeTime,
          fba: exportBody.fba,
          searchUserName: exportBody.searchUserName,
          line: exportBody.line,
          filteredCount: filteredCustomerBehaviorData.length,
          totalCount: customerBehaviorData.length
        })
      }
      
      const response = await fetch('/api/myr-member-analytic/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        },
        body: JSON.stringify(exportBody),
        // Increase timeout for large datasets
        signal: AbortSignal.timeout(300000) // 5 minutes timeout
      })

      if (response.ok) {
        const blob = await response.blob()
        
        // Check if blob is actually a CSV (not an error JSON)
        if (blob.type === 'application/json' || blob.size < 100) {
          const text = await blob.text()
          try {
            const errorData = JSON.parse(text)
            throw new Error(errorData.message || errorData.error || 'Export failed')
          } catch (parseError) {
            throw new Error('Export failed: Invalid response from server')
          }
        }
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        
        const contentDisposition = response.headers.get('content-disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `myr_${exportType}_${selectedLine || 'ALL'}_${new Date().toISOString().split('T')[0]}.csv`
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        console.log('✅ Export successful:', filename)
      } else {
        let errorMessage = 'Unknown error'
        try {
          const error = await response.json()
          errorMessage = error.message || error.error || `HTTP ${response.status}: ${response.statusText}`
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        console.error('❌ Export failed:', errorMessage)
        alert(`Export failed: ${errorMessage}`)
      }
    } catch (error: any) {
      console.error('❌ Export error:', error)
      const errorMessage = error?.message || error?.toString() || 'Export failed. Please try again.'
      alert(`Export failed: ${errorMessage}`)
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

        {/* Bookmark Buttons - Horizontal (No Gap, Modern with Elevation) */}
        <div style={{ display: 'flex', gap: 0 }}>
          <button
            onClick={() => {
              setActiveBookmark('tier-data')
            }}
            style={{
              padding: '8px 18px',
              border: '1px solid #e2e8f0',
              borderRight: '0',
              borderRadius: '6px 0 0 6px',
              backgroundColor: activeBookmark === 'tier-data' ? '#3b82f6' : '#ffffff',
              color: activeBookmark === 'tier-data' ? '#ffffff' : '#64748b',
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
              zIndex: activeBookmark === 'tier-data' ? 10 : 1,
              boxShadow: activeBookmark === 'tier-data' 
                ? '0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.2)' 
                : 'none',
              transform: activeBookmark === 'tier-data' ? 'translateY(-2px)' : 'translateY(0)',
              margin: 0
            }}
            onMouseEnter={(e) => {
              if (activeBookmark !== 'tier-data') {
                e.currentTarget.style.backgroundColor = '#f8fafc'
                e.currentTarget.style.color = '#3b82f6'
              }
            }}
            onMouseLeave={(e) => {
              if (activeBookmark !== 'tier-data') {
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.color = '#64748b'
              }
            }}
          >
            <div style={{ width: '14px', height: '14px', display: 'flex' }} dangerouslySetInnerHTML={{ __html: KPI_ICONS.activeMember }} />
            <span>Tier_Data</span>
          </button>
          
          <button
            onClick={() => {
              setActiveBookmark('customer-behavior')
            }}
            style={{
              padding: '8px 18px',
              border: '1px solid #e2e8f0',
              borderRadius: '0 6px 6px 0',
              backgroundColor: activeBookmark === 'customer-behavior' ? '#3b82f6' : '#ffffff',
              color: activeBookmark === 'customer-behavior' ? '#ffffff' : '#64748b',
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
              zIndex: activeBookmark === 'customer-behavior' ? 10 : 1,
              boxShadow: activeBookmark === 'customer-behavior' 
                ? '0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.2)' 
                : 'none',
              transform: activeBookmark === 'customer-behavior' ? 'translateY(-2px)' : 'translateY(0)',
              margin: 0,
              marginLeft: '-1px'
            }}
            onMouseEnter={(e) => {
              if (activeBookmark !== 'customer-behavior') {
                e.currentTarget.style.backgroundColor = '#f8fafc'
                e.currentTarget.style.color = '#3b82f6'
              }
            }}
            onMouseLeave={(e) => {
              if (activeBookmark !== 'customer-behavior') {
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.color = '#64748b'
              }
            }}
          >
            <div style={{ width: '14px', height: '14px', display: 'flex' }} dangerouslySetInnerHTML={{ __html: KPI_ICONS.pureMember }} />
            <span>Customer Behavior</span>
          </button>
        </div>
      </div>
    </div>
  )

  // Render content based on active bookmark
  const renderPageContent = () => {
    if (loading) {
      return (
        <Frame variant="compact">
          <StandardLoadingSpinner message="Loading Member Analytic MYR" />
        </Frame>
      )
    }

    if (activeBookmark === 'tier-data') {
      return (
        <Frame variant="compact">
          <div className="deposit-container" style={{ opacity: loading && tierData.length === 0 ? 0.5 : 1, transition: 'opacity 0.2s ease-in-out' }}>
            {loading && tierData.length === 0 ? (
              <StandardLoadingSpinner message="Loading Tier Data MYR" />
            ) : tierData.length === 0 ? (
              <div className="empty-container">
                <div className="empty-icon">📭</div>
                <div className="empty-text">
                  No tier data found for line {selectedLine}
                </div>
              </div>
            ) : (
              <>
                <div className="simple-table-container" style={{ marginTop: '0' }}>
                  {/* Search User Name - Top Left */}
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
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}>
                        User Name:
                      </label>
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter user name..."
                        disabled={isSearching}
                        style={{
                          padding: '8px 14px',
                          fontSize: '13px',
                          border: '2px solid #cbd5e1',
                          borderRadius: '6px',
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          width: '300px',
                          backgroundColor: isSearching ? '#f1f5f9' : '#ffffff',
                          color: isSearching ? '#94a3b8' : '#1e293b',
                          cursor: isSearching ? 'not-allowed' : 'text'
                        }}
                        onFocus={(e) => {
                          if (!isSearching) {
                            e.target.style.borderColor = '#3b82f6'
                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                          }
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#cbd5e1'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                      
                      {/* Search Button */}
                      <button
                        onClick={handleSearchUser}
                        disabled={isSearching || !searchInput.trim()}
                        style={{
                          padding: '8px 20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#ffffff',
                          backgroundColor: (isSearching || !searchInput.trim()) ? '#cbd5e1' : '#3b82f6',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: (isSearching || !searchInput.trim()) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSearching && searchInput.trim()) {
                            e.currentTarget.style.backgroundColor = '#2563eb'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSearching && searchInput.trim()) {
                            e.currentTarget.style.backgroundColor = '#3b82f6'
                          }
                        }}
                      >
                        {isSearching ? (
                          <>
                            <span style={{ 
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              border: '2px solid #ffffff',
                              borderTopColor: 'transparent',
                              borderRadius: '50%',
                              animation: 'spin 0.6s linear infinite'
                            }} />
                            Searching...
                          </>
                        ) : (
                          <>
                            🔍 Search
                          </>
                        )}
                      </button>
                      
                      {/* Clear Button */}
                      {searchUserName && (
                        <button
                          onClick={handleClearSearch}
                          style={{
                            padding: '8px 14px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#64748b',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#fee2e2'
                            e.currentTarget.style.color = '#dc2626'
                            e.currentTarget.style.borderColor = '#dc2626'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff'
                            e.currentTarget.style.color = '#64748b'
                            e.currentTarget.style.borderColor = '#cbd5e1'
                          }}
                        >
                          ✕ Clear
                        </button>
                      )}
      </div>
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
                          {filteredData.length > 0 && getSortedColumns(Object.keys(filteredData[0]), 'tier-data')
                            .map((column) => (
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
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.length === 0 && searchUserName ? (
                          <tr>
                            <td 
                              colSpan={tierData.length > 0 ? getSortedColumns(Object.keys(tierData[0]), 'tier-data').length : 21}
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
                          filteredData.map((row, index) => {
                            const rowId = `row-${index}`
                            const rowBgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'
                            
                            return (
                              <tr 
                                key={index}
                                id={rowId}
                                style={{
                                  backgroundColor: rowBgColor,
                                  transition: 'background-color 0.15s ease',
                                  cursor: 'default'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#e0f2fe'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = rowBgColor
                                }}
                              >
                            {getSortedColumns(Object.keys(row), 'tier-data')
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
                                    {(column === 'ggr' || column === 'avg_ggr') ? (
                                      <span style={{
                                        color: (row[column] || 0) >= 0 ? '#10b981' : '#ef4444',
                                        fontWeight: 700
                                      }}>
                                        {formatTableCell(row[column])}
                                      </span>
                                    ) : (column === 'winrate' || column === 'wd_rate') ? (
                                      (() => {
                                        const numericValue = typeof row[column] === 'number' ? row[column] : parseFloat(row[column])
                                        if (isNaN(numericValue) || row[column] === null || row[column] === undefined || row[column] === '') {
                                          return '-'
                                        }
                                        const percentValue = (numericValue * 100).toFixed(2)
                                        return `${percentValue}%`
                                      })()
                                    ) : (column === 'unique_code') ? (
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
                            )
                          })
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
                          {' '}<span style={{ color: '#94a3b8' }}>(of {tierData.length} total)</span>
                        </>
                      ) : (
                        <>
                          Showing <strong style={{ color: '#1e293b' }}>{Math.min(tierData.length, 1000)}</strong> of <strong style={{ color: '#1e293b' }}>{pagination.totalRecords.toLocaleString()}</strong> records
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
                        disabled={exporting || filteredData.length === 0}
                        style={{
                          padding: '8px 20px',
                          backgroundColor: exporting || filteredData.length === 0 ? '#cbd5e1' : '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: exporting || filteredData.length === 0 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: exporting || filteredData.length === 0 ? 'none' : '0 2px 4px rgba(16, 185, 129, 0.2)'
                        }}
                      >
                        {exporting ? '⏳ Exporting...' : 'Export'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Frame>
      )
    }

    if (activeBookmark === 'customer-behavior') {
      return (
        <Frame variant="compact">
          <div className="deposit-container" style={{ opacity: customerBehaviorLoading && customerBehaviorData.length === 0 ? 0.5 : 1, transition: 'opacity 0.2s ease-in-out' }}>
            {customerBehaviorLoading && customerBehaviorData.length === 0 && !customerBehaviorSearchUserName && appliedPaymentMethod === 'ALL' && appliedActiveTime === 'ALL' && appliedFBA === 'ALL' ? (
              <StandardLoadingSpinner message="Loading Customer Behavior MYR" />
            ) : (
              <>
                <div className="simple-table-container" style={{ marginTop: '0' }}>
                  {/* Search User Name - Top Left */}
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
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}>
                        User Name:
                      </label>
                      <input
                        type="text"
                        value={customerBehaviorSearchInput}
                        onChange={(e) => setCustomerBehaviorSearchInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleCustomerBehaviorSearch()
                          }
                        }}
                        placeholder="Enter user name..."
                        style={{
                          padding: '8px 14px',
                          fontSize: '13px',
                          border: '2px solid #cbd5e1',
                          borderRadius: '6px',
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          width: '300px',
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                          cursor: 'text'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3b82f6'
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#cbd5e1'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                      
                      {/* Search Button */}
                      <button
                        onClick={handleCustomerBehaviorSearch}
                        disabled={!customerBehaviorSearchInput.trim()}
                        style={{
                          padding: '8px 20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#ffffff',
                          backgroundColor: !customerBehaviorSearchInput.trim() ? '#cbd5e1' : '#3b82f6',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: !customerBehaviorSearchInput.trim() ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => {
                          if (customerBehaviorSearchInput.trim()) {
                            e.currentTarget.style.backgroundColor = '#2563eb'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (customerBehaviorSearchInput.trim()) {
                            e.currentTarget.style.backgroundColor = '#3b82f6'
                          }
                        }}
                      >
                        🔍 Search
                      </button>
                      
                      {/* Clear Button */}
                      {customerBehaviorSearchUserName && (
                        <button
                          onClick={handleClearCustomerBehaviorSearch}
                          style={{
                            padding: '8px 14px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#64748b',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#fee2e2'
                            e.currentTarget.style.color = '#dc2626'
                            e.currentTarget.style.borderColor = '#dc2626'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff'
                            e.currentTarget.style.color = '#64748b'
                            e.currentTarget.style.borderColor = '#cbd5e1'
                          }}
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>
                    
                    {/* Slicers - Payment Method, Active Time, FBA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Payment Method Slicer */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap'
                        }}>
                          Payment:
                        </label>
                        <select
                          value={selectedPaymentMethod}
                          onChange={(e) => handlePaymentMethodChange(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            border: '2px solid #cbd5e1',
                            borderRadius: '6px',
                            backgroundColor: '#ffffff',
                            color: '#1e293b',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            minWidth: '150px'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#3b82f6'
                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#cbd5e1'
                            e.target.style.boxShadow = 'none'
                          }}
                        >
                          {paymentMethodOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Active Time Slicer */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap'
                        }}>
                          Active Time:
                        </label>
                        <select
                          value={selectedActiveTime}
                          onChange={(e) => handleActiveTimeChange(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            border: '2px solid #cbd5e1',
                            borderRadius: '6px',
                            backgroundColor: '#ffffff',
                            color: '#1e293b',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            minWidth: '150px'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#3b82f6'
                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#cbd5e1'
                            e.target.style.boxShadow = 'none'
                          }}
                        >
                          {activeTimeOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* FBA Slicer */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap'
                        }}>
                          FBA:
                        </label>
                        <select
                          value={selectedFBA}
                          onChange={(e) => handleFBAChange(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            border: '2px solid #cbd5e1',
                            borderRadius: '6px',
                            backgroundColor: '#ffffff',
                            color: '#1e293b',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            minWidth: '150px'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#3b82f6'
                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#cbd5e1'
                            e.target.style.boxShadow = 'none'
                          }}
                        >
                          {fbaOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Search Button */}
                      <button
                        onClick={handleCustomerBehaviorSlicerSearch}
                        disabled={customerBehaviorLoading}
                        style={{
                          backgroundColor: customerBehaviorLoading ? '#9ca3af' : '#10b981',
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: customerBehaviorLoading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => {
                          if (!customerBehaviorLoading) {
                            e.currentTarget.style.backgroundColor = '#059669'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!customerBehaviorLoading) {
                            e.currentTarget.style.backgroundColor = '#10b981'
                          }
                        }}
                      >
                        {customerBehaviorLoading ? 'Loading...' : 'Search'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Add CSS for spinner animation */}
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>

                {/* Table */}
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
                        {filteredCustomerBehaviorData.length > 0 && getSortedColumns(Object.keys(filteredCustomerBehaviorData[0]), 'customer-behavior')
                          .map((column) => (
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
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomerBehaviorData.length === 0 ? (
                        <tr>
                          <td 
                            colSpan={customerBehaviorData.length > 0 ? getSortedColumns(Object.keys(customerBehaviorData[0]), 'customer-behavior').length : customerBehaviorColumnOrder.length}
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
                                {customerBehaviorSearchUserName || appliedPaymentMethod !== 'ALL' || appliedActiveTime !== 'ALL' || appliedFBA !== 'ALL' ? (
                                  <>
                                    No results found for the selected filters
                                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#94a3b8' }}>
                                      Try adjusting your filters or search criteria
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    No customer behavior data found for line {selectedLine}
                                  </>
                                )}
                              </div>
                              {(customerBehaviorSearchUserName || appliedPaymentMethod !== 'ALL' || appliedActiveTime !== 'ALL' || appliedFBA !== 'ALL') && (
                                <button
                                  onClick={() => {
                                    handleClearCustomerBehaviorSearch()
                                    setSelectedPaymentMethod('ALL')
                                    setSelectedActiveTime('ALL')
                                    setSelectedFBA('ALL')
                                    setAppliedPaymentMethod('ALL')
                                    setAppliedActiveTime('ALL')
                                    setAppliedFBA('ALL')
                                    setCustomerBehaviorPagination(prev => ({ ...prev, currentPage: 1 }))
                                  }}
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
                                  Clear All Filters
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredCustomerBehaviorData.map((row, index) => (
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
                            {getSortedColumns(Object.keys(row), 'customer-behavior')
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
                                  {(column === 'unique_code') ? (
                                    <span style={{ 
                                      fontWeight: 600,
                                      color: '#3b82f6'
                                    }}>
                                      {formatTableCell(row[column])}
                                    </span>
                                  ) : (column === 'payment_method' || column === 'peak' || column === 'bonus_type' || column === 'provider' || column === 'fba_label') ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                      {renderBadge(column, row[column])}
                                    </div>
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
                    {(customerBehaviorSearchUserName || appliedPaymentMethod !== 'ALL' || appliedActiveTime !== 'ALL' || appliedFBA !== 'ALL') ? (
                      <>
                        Filtered: <strong style={{ color: '#3b82f6' }}>{filteredCustomerBehaviorData.length}</strong> records
                        {' '}<span style={{ color: '#94a3b8' }}>(of {customerBehaviorData.length} total)</span>
                      </>
                    ) : (
                      <>
                        Showing <strong style={{ color: '#1e293b' }}>{Math.min(customerBehaviorData.length, 1000)}</strong> of <strong style={{ color: '#1e293b' }}>{customerBehaviorPagination.totalRecords.toLocaleString()}</strong> records
                      </>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {customerBehaviorPagination.totalPages > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => setCustomerBehaviorPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                          disabled={!customerBehaviorPagination.hasPrevPage}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: customerBehaviorPagination.hasPrevPage ? '#3b82f6' : '#cbd5e1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: customerBehaviorPagination.hasPrevPage ? 'pointer' : 'not-allowed',
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
                          Page {customerBehaviorPagination.currentPage} of {customerBehaviorPagination.totalPages}
                        </span>
                        
                        <button
                          onClick={() => setCustomerBehaviorPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                          disabled={!customerBehaviorPagination.hasNextPage}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: customerBehaviorPagination.hasNextPage ? '#3b82f6' : '#cbd5e1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: customerBehaviorPagination.hasNextPage ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={handleExport}
                      disabled={exporting || filteredCustomerBehaviorData.length === 0}
                      style={{
                        padding: '8px 20px',
                        backgroundColor: exporting || filteredCustomerBehaviorData.length === 0 ? '#cbd5e1' : '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: exporting || filteredCustomerBehaviorData.length === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: exporting || filteredCustomerBehaviorData.length === 0 ? 'none' : '0 2px 4px rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      {exporting ? '⏳ Exporting...' : 'Export'}
                    </button>
                  </div>
                </div>
                </div>
              </>
            )}
          </div>
        </Frame>
      )
    }

    return null
  }

  return (
    <Layout customSubHeader={subHeaderContent}>
      {renderPageContent()}
    </Layout>
  )
}
