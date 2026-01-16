'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import ComingSoon from '@/components/ComingSoon'
import { getAllowedBrandsFromStorage } from '@/utils/brandAccessHelper'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { formatCurrencyKPI, formatIntegerKPI, formatPercentageKPI } from '@/lib/formatHelpers'

// Sidebar width constants
const SIDEBAR_EXPANDED_WIDTH = '280px'
const SIDEBAR_COLLAPSED_WIDTH = '80px'

// Hook to detect sidebar state
const useSidebarState = () => {
  const [sidebarWidth, setSidebarWidth] = useState<string>(SIDEBAR_EXPANDED_WIDTH)

  useEffect(() => {
    const checkSidebarState = () => {
      if (typeof document === 'undefined') return
      
      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        const isCollapsed = sidebar.classList.contains('collapsed')
        setSidebarWidth(isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH)
      } else {
        setSidebarWidth(SIDEBAR_EXPANDED_WIDTH)
      }
    }

    checkSidebarState()

    const observer = new MutationObserver(checkSidebarState)
    const sidebar = document.querySelector('.sidebar')
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ['class'],
        subtree: false
      })
    }

    window.addEventListener('resize', checkSidebarState)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', checkSidebarState)
    }
  }, [])

  return sidebarWidth
}

interface CustomerData {
  userkey: string
  user_unique: string
  line: string
  update_unique_code: string
  user_name: string | null // User Name
  traffic: string
  first_deposit_date: string | null // First Deposit Date
  last_deposit_date: string | null
  days_active: number
  deposit_cases: number
  deposit_amount: number
  withdraw_cases: number
  withdraw_amount: number
  ggr: number
  atv: number // ✅ ATV from API (Average Transaction Value)
  pf: number // ✅ PF from API (Purchase Frequency)
  tier_name: string | null
  // SNR columns
  snr_account: string | null
  snr_handler: string | null
  snr_assigned_at: string | null
  snr_assigned_by: string | null
}

interface SNRAccount {
  username: string
  allowed_brands: string[] | null
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalRecords: number
  recordsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface SlicerOptions {
  lines: string[]
  years: string[]
  months: { value: string; label: string }[] // value is month name (January, February, etc)
  tiers: string[]
}

interface AssignmentEdit {
  userkey: string
  user_unique: string
  line: string
  snr_account: string
  snr_handler: string
}

interface HandlerData {
  id?: string
  snr_account: string
  line: string
  handler: string
  assigned_by: string | null
  assigned_time: string | null
  created_at?: string
  updated_at?: string
}

interface HandlerEdit {
  id?: string
  snr_account: string
  line: string
  handler: string
}

export default function USCCustomerAssignmentPage() {
  const { showToast, ToastComponent } = useToast()
  
  const [line, setLine] = useState('ALL')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [tier, setTier] = useState('ALL')
  const [searchInput, setSearchInput] = useState('')
  
  const [customerData, setCustomerData] = useState<CustomerData[]>([])
  const [snrAccounts, setSnrAccounts] = useState<SNRAccount[]>([])
  const [editingAssignments, setEditingAssignments] = useState<Map<string, AssignmentEdit>>(new Map())
  const [savingAssignments, setSavingAssignments] = useState<Set<string>>(new Set())
  const [bulkSaving, setBulkSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 100,
    hasNextPage: false,
    hasPrevPage: false
  })
  
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions>({
    lines: [],
    years: [],
    months: [],
    tiers: []
  })
  
  const [loading, setLoading] = useState(true)
  const [slicerLoading, setSlicerLoading] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [activeBookmark, setActiveBookmark] = useState<'handler-setup' | 'assignment' | 'snr-performance'>('assignment')
  
  // Handler Setup states
  const [handlerData, setHandlerData] = useState<HandlerData[]>([])
  const [editingHandlers, setEditingHandlers] = useState<Map<string, HandlerEdit>>(new Map())
  const [savingHandlers, setSavingHandlers] = useState<Set<string>>(new Set())
  const [handlerLoading, setHandlerLoading] = useState(false)
  const [availableLines, setAvailableLines] = useState<string[]>([]) // Lines from blue_whale_usc

  // ✅ Refs to prevent race conditions on rapid clicks
  const savingHandlersRef = useRef<Set<string>>(new Set())
  const savingAssignmentsRef = useRef<Set<string>>(new Set())

  // ✅ MODAL STATE for Days Active Transaction History Drill-Down
  const [showDaysActiveModal, setShowDaysActiveModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<{ 
    userName: string | null
    uniqueCode: string
    userkey: string
    line: string
  } | null>(null)

  // ✅ Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Fetch SNR accounts (users with role snr_usc)
  const fetchSNRAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, allowed_brands')
        .eq('role', 'snr_usc')
        .order('username', { ascending: true })

      if (error) {
        console.error('❌ Error fetching SNR accounts:', error)
        return
      }

      // ✅ Type assertion untuk memastikan type sesuai dengan SNRAccount[]
      const accounts: SNRAccount[] = (data || []).map((item: any) => ({
        username: String(item.username || ''),
        allowed_brands: item.allowed_brands || null
      }))

      setSnrAccounts(accounts)
      console.log('✅ SNR accounts fetched:', accounts.length)
    } catch (error) {
      console.error('❌ Error fetching SNR accounts:', error)
    }
  }, [])

  // Fetch slicer options from API with localStorage caching
  const fetchSlicerOptions = useCallback(async () => {
    try {
      setSlicerLoading(true)
      
      // Check cache first (5 minutes TTL)
      const cacheKey = 'usc_customer_assignment_slicer_options'
      const cacheTimeKey = 'usc_customer_assignment_slicer_options_time'
      const cachedData = localStorage.getItem(cacheKey)
      const cachedTime = localStorage.getItem(cacheTimeKey)
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000 // 5 minutes in milliseconds
      
      let useCachedData = false
      if (cachedData && cachedTime && (now - parseInt(cachedTime)) < fiveMinutes) {
        try {
          const parsed = JSON.parse(cachedData)
          setSlicerOptions({
            lines: parsed.lines || [],
            years: parsed.years || [],
            months: parsed.months || [],
            tiers: parsed.tiers || []
          })
          
          // Auto-set to defaults from cached data
          if (parsed.defaults) {
            setLine('ALL')
            if (parsed.defaults.year) {
              setYear(parsed.defaults.year)
            }
            if (parsed.defaults.month) {
              setMonth(parsed.defaults.month)
            }
            console.log('✅ [Customer Assignment] Using cached slicer options')
          }
          
          useCachedData = true
          // Still fetch in background to update cache (non-blocking)
          setSlicerLoading(false)
        } catch (e) {
          console.error('❌ Error parsing cached data:', e)
          // Continue to fetch fresh data
        }
      }
      
      const userAllowedBrands = getAllowedBrandsFromStorage()
      
      const response = await fetch('/api/usc-customer-assignment/slicer-options', {
        headers: {
          'x-user-allowed-brands': JSON.stringify(userAllowedBrands)
        },
        cache: 'no-store'
      })
      
      const result = await response.json()
      
      if (result.success) {
        const slicerData = {
          lines: result.data.lines || [],
          years: result.data.years || [],
          months: result.data.months || [],
          tiers: result.data.tiers || [],
          defaults: result.data.defaults || null
        }
        
        // Update cache
        localStorage.setItem(cacheKey, JSON.stringify(slicerData))
        localStorage.setItem(cacheTimeKey, now.toString())
        
        // Only update state if not using cached data (to avoid flicker)
        if (!useCachedData) {
          setSlicerOptions({
            lines: slicerData.lines,
            years: slicerData.years,
            months: slicerData.months,
            tiers: slicerData.tiers
        })
        
        // Auto-set to defaults from API
        if (result.data.defaults) {
          // Always set Line to 'ALL' (default)
          setLine('ALL')
          
          // Always set Year and Month to last data from table
          if (result.data.defaults.year) {
            setYear(result.data.defaults.year)
          }
          if (result.data.defaults.month) {
            setMonth(result.data.defaults.month)
          }
          console.log('✅ [Customer Assignment] Auto-set to defaults:', result.data.defaults)
          }
        } else {
          // Update cache silently in background
          console.log('✅ [Customer Assignment] Cache updated in background')
        }
      }
    } catch (error) {
      console.error('❌ Error fetching slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }, [])

  // Fetch customer data
  const fetchCustomerData = useCallback(async (overrideSearch?: string, resetPage: boolean = false, overridePage?: number) => {
    if (!year || !month) {
      console.log('⏳ Waiting for slicers...')
      return
    }

    try {
      setLoading(true)
      
      // Use overrideSearch if provided, otherwise use searchInput from state
      const searchValue = overrideSearch !== undefined ? overrideSearch : searchInput
      
      // Use overridePage if provided, otherwise determine current page
      let currentPage: number
      if (overridePage !== undefined) {
        currentPage = overridePage
      } else if (resetPage || (overrideSearch === '')) {
        currentPage = 1
      } else {
        // Use current pagination state from closure (pagination.currentPage sudah tidak di dependencies untuk avoid re-create)
        // Semua manual calls sudah pass overridePage, jadi ini hanya fallback untuk edge cases
        currentPage = pagination.currentPage
      }
      
      const params = new URLSearchParams({
        year,
        month,
        line: line === 'ALL' ? '' : line,
        tier: tier === 'ALL' ? '' : tier,
        page: currentPage.toString(),
        limit: pagination.recordsPerPage.toString(),
        search: searchValue,
        searchColumn: 'update_unique_code' // Always search by unique code
      })

      // Get user's allowed brands from localStorage
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null

      const response = await fetch(`/api/usc-customer-assignment/data?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
      
      if (!response.ok) {
        console.error('❌ API Error:', response.status)
        setCustomerData([])
        setLoading(false)
        return
      }
      
      const result = await response.json()
      
      if (result.success) {
        setCustomerData(result.data || [])
        // ✅ Use functional update to avoid stale closure
        if (result.pagination) {
          setPagination(result.pagination)
        }
      } else {
        console.error('❌ API Error:', result.error)
        setCustomerData([])
      }
    } catch (error) {
      console.error('❌ Error fetching customer data:', error)
      setCustomerData([])
    } finally {
      setLoading(false)
    }
  }, [year, month, line, tier, searchInput, pagination.recordsPerPage]) // ✅ Removed pagination.currentPage from dependencies

  // Handle assignment edit
  const handleAssignmentChange = async (userkey: string, field: 'snr_account' | 'snr_handler', value: string) => {
    const customer = customerData.find(c => c.userkey === userkey)
    if (!customer) return

    // ✅ If user cancels selection (selects "Unassigned"/empty), reset to default
    if (field === 'snr_account' && (!value || !value.trim())) {
      // Remove from editing assignments to reset to default
      const newEditing = new Map(editingAssignments)
      newEditing.delete(userkey)
      setEditingAssignments(newEditing)
      return
    }

    const current = editingAssignments.get(userkey) || {
      userkey,
      user_unique: customer.user_unique,
      line: customer.line,
      snr_account: customer.snr_account || '',
      snr_handler: customer.snr_handler || ''
    }
    
    let updated = {
      ...current,
      [field]: value
    }

    // If snr_account is changed, auto-fetch handler from snr_usc_handler table
    if (field === 'snr_account' && value && value.trim()) {
      try {
        const response = await fetch(`/api/usc-customer-assignment/get-handler?snr_account=${encodeURIComponent(value.trim())}`)
        const result = await response.json()
        
        if (result.success && result.handler) {
          updated.snr_handler = result.handler
          console.log(`✅ Auto-fetched handler for ${value}: ${result.handler}`)
        } else {
          // Handler not found in snr_usc_handler table
          updated.snr_handler = ''
          console.log(`⚠️ No handler found for SNR account: ${value}`)
        }
      } catch (error) {
        console.error('❌ Error fetching handler:', error)
        updated.snr_handler = ''
      }
    }
    
    // If snr_account is cleared (empty), also clear snr_handler
    if (field === 'snr_account' && (!value || !value.trim())) {
      updated.snr_handler = ''
    }
    
    setEditingAssignments(new Map(editingAssignments.set(userkey, updated)))
  }

  // Clear assignment - Reset to null in database
  const handleClearAssignment = async (userkey: string) => {
    // ✅ Guard: Prevent multiple simultaneous calls (check both state and ref)
    if (savingAssignments.has(userkey) || savingAssignmentsRef.current.has(userkey)) {
      return
    }
    
    // ✅ Mark as saving immediately (synchronous)
    savingAssignmentsRef.current.add(userkey)

    const customer = customerData.find(c => c.userkey === userkey)
    if (!customer) return

    // If customer already has snr_account in database, clear it via API
    if (customer.snr_account) {
      try {
        setSavingAssignments(prev => new Set(prev).add(userkey))
        const userStr = localStorage.getItem('nexmax_user')
        const currentUser = userStr ? JSON.parse(userStr) : null

        const response = await fetch('/api/usc-customer-assignment/clear-assignment', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user': JSON.stringify(currentUser)
          },
          body: JSON.stringify({
            userkey,
            user_unique: customer.user_unique,
            line: customer.line
          })
        })

        const result = await response.json()

        if (result.success) {
          // Update local data - set both to null
          setCustomerData(prev => prev.map(c => 
            c.userkey === userkey
              ? {
                  ...c,
                  snr_account: null,
                  snr_handler: null,
                  snr_assigned_at: null,
                  snr_assigned_by: null
                }
              : c
          ))
          
          // Remove from editing
          const newEditing = new Map(editingAssignments)
          newEditing.delete(userkey)
          setEditingAssignments(newEditing)
          
          console.log(`✅ Cleared assignment for ${userkey}`)
          showToast('Assignment cleared successfully!', 'error')
        } else {
          showToast(`Error: ${result.error || 'Failed to clear assignment'}`, 'error')
        }
      } catch (error) {
        console.error('❌ Error clearing assignment:', error)
        showToast('Error clearing assignment', 'error')
      } finally {
        // ✅ Clear from both state and ref
        savingAssignmentsRef.current.delete(userkey)
        setSavingAssignments(prev => {
          const newSet = new Set(prev)
          newSet.delete(userkey)
          return newSet
        })
      }
    } else {
      // If no snr_account in database, just remove from editing state
      const newEditing = new Map(editingAssignments)
      newEditing.delete(userkey)
      setEditingAssignments(newEditing)
    }
  }

  // Save single assignment
  const handleSaveAssignment = async (userkey: string) => {
    // ✅ Guard: Prevent multiple simultaneous calls (check both state and ref)
    if (savingAssignments.has(userkey) || savingAssignmentsRef.current.has(userkey)) {
      return
    }
    
    // ✅ Mark as saving immediately (synchronous)
    savingAssignmentsRef.current.add(userkey)

    const assignment = editingAssignments.get(userkey)
    if (!assignment) return

    if (!assignment.snr_account || !assignment.snr_account.trim()) {
      showToast('Please select an SNR Account', 'warning')
      return
    }

    // Handler will be auto-fetched from snr_usc_handler table in API
    // No need to validate handler here

    try {
      setSavingAssignments(prev => new Set(prev).add(userkey))
      
      // Get user from localStorage for assigned_by
      const userStr = localStorage.getItem('nexmax_user')
      const currentUser = userStr ? JSON.parse(userStr) : null

      const customer = customerData.find(c => c.userkey === userkey)
      if (!customer) {
        showToast('Customer not found', 'error')
        return
      }

      const response = await fetch('/api/usc-customer-assignment/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user': JSON.stringify(currentUser)
        },
        body: JSON.stringify({
          userkey,
          user_unique: customer.user_unique,
          line: customer.line,
          snr_account: assignment.snr_account.trim()
          // snr_handler will be auto-fetched from snr_handlers table in API
        })
      })

      const result = await response.json()

      if (result.success) {
        // ✅ Update local state without reload - handler sudah ada di result
        setCustomerData(prev => prev.map(c => 
          c.userkey === userkey
            ? {
                ...c,
                snr_account: assignment.snr_account.trim(),
                snr_handler: result.handler || assignment.snr_handler || c.snr_handler
              }
            : c
        ))
        
        // Remove from editing
        const newEditing = new Map(editingAssignments)
        newEditing.delete(userkey)
        setEditingAssignments(newEditing)
        
        showToast('Assignment saved successfully!', 'success')
      } else {
        showToast(`Error: ${result.error || result.message || 'Failed to save assignment'}`, 'error')
      }
    } catch (error) {
      console.error('❌ Error saving assignment:', error)
      showToast('Error saving assignment', 'error')
    } finally {
      // ✅ Clear from both state and ref
      savingAssignmentsRef.current.delete(userkey)
      setSavingAssignments(prev => {
        const newSet = new Set(prev)
        newSet.delete(userkey)
        return newSet
      })
    }
  }

  // Bulk save all assignments
  const handleBulkSave = async () => {
    if (editingAssignments.size === 0) {
      showToast('No changes to save', 'info')
      return
    }

    const assignments = Array.from(editingAssignments.values())
    
    // Validate all and ensure user_unique and line are included
    for (const assignment of assignments) {
      if (!assignment.snr_account || !assignment.snr_account.trim()) {
        showToast(`Please select SNR Account for ${assignment.userkey}`, 'warning')
        return
      }
      // Handler will be auto-fetched from snr_usc_handler table in API
      // No need to validate handler here
      // Ensure user_unique and line are included
      if (!assignment.user_unique || !assignment.line) {
        const customer = customerData.find(c => c.userkey === assignment.userkey)
        if (customer) {
          assignment.user_unique = customer.user_unique
          assignment.line = customer.line
        } else {
          showToast(`Customer data not found for ${assignment.userkey}`, 'error')
          return
        }
      }
    }

    try {
      setBulkSaving(true)
      
      // Get user from localStorage for assigned_by
      const userStr = localStorage.getItem('nexmax_user')
      const currentUser = userStr ? JSON.parse(userStr) : null

      const response = await fetch('/api/usc-customer-assignment/bulk-save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user': JSON.stringify(currentUser)
        },
        body: JSON.stringify({ assignments })
      })

      const result = await response.json()

      if (result.success) {
        // ✅ Update local state without reload - update all saved assignments
        if (result.results && Array.isArray(result.results)) {
          const savedMap = new Map()
          result.results.forEach((r: any) => {
            if (r.success && r.userkey) {
              savedMap.set(r.userkey, {
                snr_account: r.snr_account,
                snr_handler: r.handler
              })
            }
          })
          
          setCustomerData(prev => prev.map(c => {
            const saved = savedMap.get(c.userkey)
            if (saved) {
              return {
                ...c,
                snr_account: saved.snr_account || c.snr_account,
                snr_handler: saved.snr_handler || c.snr_handler
              }
            }
            return c
          }))
        }
        
        setEditingAssignments(new Map())
        showToast(`Successfully sent ${result.successCount || assignments.length} assignments!`, 'success')
      } else {
        showToast(`Error: ${result.error || result.message || 'Failed to save assignments'}`, 'error')
        if (result.errors && result.errors.length > 0) {
          console.error('❌ Assignment errors:', result.errors)
        }
      }
    } catch (error) {
      console.error('❌ Error bulk saving:', error)
      showToast('Error saving assignments', 'error')
    } finally {
      setBulkSaving(false)
    }
  }

  // Fetch available lines from blue_whale_usc
  const fetchAvailableLines = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('blue_whale_usc')
        .select('line')
        .eq('currency', 'USC')
        .not('line', 'is', null)
      
      if (error) {
        console.error('❌ Error fetching lines:', error)
        return
      }

      // Get unique lines
      const uniqueLines = Array.from(new Set((data || []).map((row: any) => row.line).filter(Boolean)))
      uniqueLines.sort()
      setAvailableLines(uniqueLines)
      console.log('✅ Available lines fetched:', uniqueLines.length)
    } catch (error) {
      console.error('❌ Error fetching lines:', error)
    }
  }, [])

  // Fetch handler setup data
  const fetchHandlerData = useCallback(async () => {
    try {
      setHandlerLoading(true)
      // ✅ Add timestamp to prevent cache issues
      const response = await fetch(`/api/usc-customer-assignment/handler-setup/data?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setHandlerData(result.data || [])
        console.log('✅ Handler data fetched:', result.data?.length || 0, 'records')
      } else {
        console.error('❌ Error fetching handler data:', result.error)
        setHandlerData([])
      }
    } catch (error) {
      console.error('❌ Error fetching handler data:', error)
      setHandlerData([])
    } finally {
      setHandlerLoading(false)
    }
  }, [])

  // Handle handler edit
  const handleHandlerChange = (id: string, field: 'snr_account' | 'line' | 'handler', value: string) => {
    const existing = handlerData.find(h => h.id === id)
    
    // For new rows, initialize with empty values
    const current = editingHandlers.get(id) || (existing ? {
      id,
      snr_account: existing.snr_account,
      line: existing.line,
      handler: existing.handler
    } : {
      snr_account: '',
      line: '',
      handler: ''
    })
    
    const updated = {
      ...current,
      [field]: value
    }
    
    // If line changes, clear snr_account (need to re-select based on new line)
    if (field === 'line' && value !== current.line) {
      updated.snr_account = ''
    }
    
    setEditingHandlers(new Map(editingHandlers.set(id, updated)))
  }

  // Get available SNR accounts for a specific line
  const getAvailableSNRAccounts = (line: string) => {
    if (!line || !line.trim()) return []
    
    return snrAccounts
      .filter(account => {
        if (!account.allowed_brands || !Array.isArray(account.allowed_brands)) {
          return false
        }
        return account.allowed_brands.includes(line.trim())
      })
      .map(account => account.username)
      .sort()
  }

  // Handle new handler (for adding new row)
  const handleAddNewHandler = () => {
    const newId = `new-${Date.now()}`
    const newHandler: HandlerEdit = {
      snr_account: '',
      line: '',
      handler: ''
    }
    setEditingHandlers(new Map(editingHandlers.set(newId, newHandler)))
  }

  // Save handler (update or create)
  const handleSaveHandler = async (id: string) => {
    // ✅ Guard: Prevent multiple simultaneous calls (check both state and ref)
    if (savingHandlers.has(id) || savingHandlersRef.current.has(id)) {
      return
    }
    
    // ✅ Mark as saving immediately (synchronous)
    savingHandlersRef.current.add(id)

    const handler = editingHandlers.get(id)
    if (!handler) return

    if (!handler.snr_account || !handler.snr_account.trim()) {
      showToast('Please enter SNR Account', 'warning')
      return
    }
    if (!handler.line || !handler.line.trim()) {
      showToast('Please enter Line', 'warning')
      return
    }
    if (!handler.handler || !handler.handler.trim()) {
      showToast('Please enter Handler name', 'warning')
      return
    }

    try {
      setSavingHandlers(prev => new Set(prev).add(id))
      
      const userStr = localStorage.getItem('nexmax_user')
      const currentUser = userStr ? JSON.parse(userStr) : null

      const response = await fetch('/api/usc-customer-assignment/handler-setup/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user': JSON.stringify(currentUser)
        },
        body: JSON.stringify({
          id: id.startsWith('new-') ? undefined : id,
          snr_account: handler.snr_account.trim(),
          line: handler.line.trim(),
          handler: handler.handler.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        // ✅ Remove from editing first (optimistic update)
        const newEditing = new Map(editingHandlers)
        newEditing.delete(id)
        setEditingHandlers(newEditing)
        
        // ✅ Reload handler data to ensure sync with database
        // Small delay to ensure database commit is complete
        await new Promise(resolve => setTimeout(resolve, 100))
        await fetchHandlerData()
        
        showToast('Handler saved successfully!', 'success')
      } else {
        showToast(`Error: ${result.error || result.message || 'Failed to save handler'}`, 'error')
      }
    } catch (error) {
      console.error('❌ Error saving handler:', error)
      showToast('Error saving handler', 'error')
    } finally {
      // ✅ Clear from both state and ref
      savingHandlersRef.current.delete(id)
      setSavingHandlers(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  // Clear handler
  const handleClearHandler = async (id: string) => {
    // ✅ Guard: Prevent multiple simultaneous calls (check both state and ref)
    if (savingHandlers.has(id) || savingHandlersRef.current.has(id)) {
      return
    }
    
    // ✅ Mark as saving immediately (synchronous)
    savingHandlersRef.current.add(id)

    if (!id || id.startsWith('new-')) {
      // Just remove from editing if it's a new row
      const newEditing = new Map(editingHandlers)
      newEditing.delete(id)
      setEditingHandlers(newEditing)
      return
    }

    if (!confirm('Are you sure you want to delete this handler?')) {
      return
    }

    try {
      setSavingHandlers(prev => new Set(prev).add(id))
      
      const response = await fetch('/api/usc-customer-assignment/handler-setup/clear', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      })

      const result = await response.json()

      if (result.success) {
        // ✅ Remove from editing first (optimistic update)
        const newEditing = new Map(editingHandlers)
        newEditing.delete(id)
        setEditingHandlers(newEditing)
        
        // ✅ Reload handler data to ensure sync with database
        // Small delay to ensure database commit is complete
        await new Promise(resolve => setTimeout(resolve, 100))
        await fetchHandlerData()
        
        showToast('Handler cleared successfully!', 'success')
      } else {
        showToast(`Error: ${result.error || result.message || 'Failed to clear handler'}`, 'error')
      }
    } catch (error) {
      console.error('❌ Error clearing handler:', error)
      showToast('Error clearing handler', 'error')
    } finally {
      // ✅ Clear from both state and ref
      savingHandlersRef.current.delete(id)
      setSavingHandlers(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  // Get editing state for handler
  const getEditingHandlerState = (id: string) => {
    return editingHandlers.get(id) || {
      snr_account: handlerData.find(h => h.id === id)?.snr_account || '',
      line: handlerData.find(h => h.id === id)?.line || '',
      handler: handlerData.find(h => h.id === id)?.handler || ''
    }
  }

  // ✅ Calculate Status (ND/OLD) based on first_deposit_date
  const getCustomerStatus = useCallback((firstDepositDate: string | null): 'ND' | 'OLD' => {
    if (!firstDepositDate || !year) {
      return 'OLD'
    }

    try {
      const depositDate = new Date(firstDepositDate)
      // ✅ Validate date (Invalid Date will return NaN)
      if (isNaN(depositDate.getTime())) {
        return 'OLD'
      }
      
      const depositYear = depositDate.getFullYear()
      const depositMonth = depositDate.getMonth() + 1 // getMonth() returns 0-11
      
      const selectedYear = parseInt(year)
      // ✅ Validate year parsing
      if (isNaN(selectedYear)) {
        return 'OLD'
      }
      
      // Map month names to month numbers
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December']
      
      // If month is 'ALL', check only year
      if (month === 'ALL' || !month) {
        return depositYear === selectedYear ? 'ND' : 'OLD'
      }
      
      // If month is selected, check both year and month
      const selectedMonthIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase())
      if (selectedMonthIndex === -1) {
        return 'OLD' // Invalid month, default to OLD
      }
      
      const selectedMonth = selectedMonthIndex + 1
      
      return (depositYear === selectedYear && depositMonth === selectedMonth) ? 'ND' : 'OLD'
    } catch (error) {
      console.error('❌ Error parsing first_deposit_date:', error)
      return 'OLD'
    }
  }, [year, month])

  // Initialize
  useEffect(() => {
    const sessionData = localStorage.getItem('nexmax_user')
    if (sessionData) {
      try {
        const userData = JSON.parse(sessionData)
        setUser(userData)
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
    
    fetchSNRAccounts()
    fetchSlicerOptions()
  }, [fetchSNRAccounts, fetchSlicerOptions])

  // Fetch handler data and lines when Handler Setup bookmark is active
  useEffect(() => {
    if (activeBookmark === 'handler-setup') {
      fetchAvailableLines()
      fetchHandlerData()
    }
  }, [activeBookmark, fetchAvailableLines, fetchHandlerData])

  // ✅ Auto-load data ONCE when defaults are set from API (initial load only - tidak reload berulang)
  useEffect(() => {
    if (!initialLoadDone && year && month) {
      console.log('✅ [Customer Assignment] Initial load with defaults:', { line, year, month, tier })
      // ✅ Pass page 1 explicitly untuk konsistensi (initial load selalu page 1)
      fetchCustomerData(undefined, false, 1)
      setInitialLoadDone(true)
    }
  }, [year, month, initialLoadDone, fetchCustomerData]) // ✅ Hanya trigger saat initial load pertama kali

  // ✅ REMOVED: Pagination auto-reload - pagination akan di-handle saat user tekan Search button atau ganti halaman manual

  // Format number
  const formatNumber = useCallback((num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }, [])

  // Format integer
  const formatInteger = useCallback((num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-'
    return new Intl.NumberFormat('en-US').format(num)
  }, [])

  // ✅ Handle column sorting (double click on header)
  const handleColumnSort = useCallback((column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }, [sortColumn])

  // ✅ Render sort indicator (arrow) for header
  const renderSortIndicator = useCallback((column: string) => {
    if (sortColumn !== column) return null
    return (
      <span style={{ marginLeft: '4px', color: '#3b82f6', fontSize: '12px' }}>
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }, [sortColumn, sortDirection])

  // ✅ Sort customer data based on sortColumn and sortDirection
  const sortedCustomerData = useMemo(() => {
    if (!sortColumn) return customerData

    const sorted = [...customerData].sort((a, b) => {
      let aVal: any = (a as any)[sortColumn]
      let bVal: any = (b as any)[sortColumn]

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''

      // Handle numeric columns
      const numericColumns = ['days_active', 'atv', 'pf', 'deposit_cases', 'deposit_amount', 'withdraw_cases', 'withdraw_amount', 'ggr']
      if (numericColumns.includes(sortColumn)) {
        aVal = typeof aVal === 'number' ? aVal : parseFloat(String(aVal)) || 0
        bVal = typeof bVal === 'number' ? bVal : parseFloat(String(bVal)) || 0
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      // Handle date columns
      if (sortColumn === 'first_deposit_date' || sortColumn === 'last_deposit_date') {
        const aDate = aVal ? new Date(aVal).getTime() : 0
        const bDate = bVal ? new Date(bVal).getTime() : 0
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate
      }

      // ✅ Handle Status column (ND/OLD)
      if (sortColumn === 'status') {
        const aStatus = getCustomerStatus(a.first_deposit_date)
        const bStatus = getCustomerStatus(b.first_deposit_date)
        // ND < OLD alphabetically, so ascending will show ND first
        if (sortDirection === 'asc') {
          return aStatus < bStatus ? -1 : aStatus > bStatus ? 1 : 0
        } else {
          return aStatus > bStatus ? -1 : aStatus < bStatus ? 1 : 0
        }
      }

      // Handle string columns (case-insensitive)
      aVal = String(aVal).toLowerCase()
      bVal = String(bVal).toLowerCase()
      
      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

    return sorted
  }, [customerData, sortColumn, sortDirection, getCustomerStatus])

  // Get editing state for a row
  const getEditingState = useCallback((userkey: string) => {
    return editingAssignments.get(userkey) || {
      snr_account: customerData.find(c => c.userkey === userkey)?.snr_account || '',
      snr_handler: customerData.find(c => c.userkey === userkey)?.snr_handler || ''
    }
  }, [editingAssignments, customerData])

  // Check if row has unsaved changes
  const hasUnsavedChanges = (userkey: string): boolean => {
    return editingAssignments.has(userkey)
  }

  // Handle apply filters (Search button)
  const handleApplyFilters = () => {
    if (!year || !month) {
      showToast('Please select Year and Month', 'warning')
      return
    }
    setPagination(prev => ({ ...prev, currentPage: 1 }))
    // ✅ Pass page 1 explicitly untuk avoid stale closure (setPagination async, jadi fetchCustomerData bisa menggunakan stale pagination)
    fetchCustomerData(undefined, false, 1)
  }

  // ✅ Hapus auto-search - hanya search saat user tekan Search button atau Enter

  // Handle search input key down
  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApplyFilters() // Trigger search via button logic
    }
  }

  // Handle clear search - Reset all to default
  const handleClearSearch = () => {
    // Reset search input and pagination to first page
    setSearchInput('')
    setPagination(prev => ({ ...prev, currentPage: 1 }))
    
    // Fetch all data without search filter (reset to default)
    // fetchCustomerData will automatically reset pagination to page 1 when search is cleared
    if (year && month) {
      fetchCustomerData('', true) // Pass empty string to clear search filter, resetPage=true
    }
  }

  // Handle Export to CSV
  const handleExport = async () => {
    if (!year || !month) {
      showToast('Please select Year and Month', 'warning')
      return
    }

    try {
      setExporting(true)
      
      // Fetch ALL data without pagination for export
      const params = new URLSearchParams({
        year,
        month,
        line: line === 'ALL' ? '' : line,
        tier: tier === 'ALL' ? '' : tier,
        page: '1',
        limit: '999999', // Get all records
        search: searchInput,
        searchColumn: 'update_unique_code'
      })

      // Get user's allowed brands from localStorage
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null

      const response = await fetch(`/api/usc-customer-assignment/data?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch data for export')
      }
      
      const result = await response.json()
      
      if (!result.success || !result.data || result.data.length === 0) {
        showToast('No data to export', 'info')
        return
      }

      // Create CSV content
      const headers = [
        'Brand', 
        'User Name', 
        'Unique Code', 
        'Traffic', 
        'FDD', 
        'LDD', 
        'Days Active', 
        'ATV', 
        'PF', 
        'DC', 
        'DA', 
        'WC', 
        'WA', 
        'GGR', 
        'Tier',
        'Status',
        'Assignee', 
        'Handler'
      ]
      
      const csvRows: string[] = []
      csvRows.push(headers.join(','))

      result.data.forEach((customer: CustomerData) => {
        // ✅ Calculate Status for export
        const status = getCustomerStatus(customer.first_deposit_date)
        
        csvRows.push([
          `"${String(customer.line || '').replace(/"/g, '""')}"`, // ✅ Wrap with quotes for proper CSV encoding
          `"${String(customer.user_name || '').replace(/"/g, '""')}"`, // ✅ Wrap with quotes
          `"${String(customer.update_unique_code || '').replace(/"/g, '""')}"`, // ✅ Wrap with quotes
          `"${String(customer.traffic || '').replace(/"/g, '""')}"`, // ✅ Wrap traffic with quotes for Khmer text support
          customer.first_deposit_date ? new Date(customer.first_deposit_date).toISOString().split('T')[0] : '',
          customer.last_deposit_date ? new Date(customer.last_deposit_date).toISOString().split('T')[0] : '',
          String(customer.days_active),
          customer.atv.toFixed(2),
          customer.pf.toFixed(2),
          String(customer.deposit_cases),
          customer.deposit_amount.toFixed(2),
          String(customer.withdraw_cases),
          customer.withdraw_amount.toFixed(2),
          customer.ggr.toFixed(2),
          `"${String(customer.tier_name || '').replace(/"/g, '""')}"`, // ✅ Wrap with quotes
          status, // ✅ Status (ND or OLD)
          `"${String(customer.snr_account || '').replace(/"/g, '""')}"`, // ✅ Wrap with quotes
          `"${String(customer.snr_handler || '').replace(/"/g, '""')}"` // ✅ Wrap with quotes
        ].join(','))
      })

      const csvContent = csvRows.join('\n')
      // ✅ Add BOM (Byte Order Mark) for proper UTF-8 encoding in Excel
      // This ensures Khmer text and other Unicode characters display correctly
      const csvWithBOM = '\ufeff' + csvContent
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const monthName = month || 'unknown'
      const fileName = `customer-assignment-usc-${year}-${monthName}-${new Date().toISOString().split('T')[0]}.csv`
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      showToast(`Exported ${result.data.length} records successfully!`, 'success')
    } catch (error) {
      console.error('❌ Error exporting data:', error)
      showToast('Error exporting data', 'error')
    } finally {
      setExporting(false)
    }
  }

  // Get subtitle and description based on active bookmark
  const getPageInfo = () => {
    switch (activeBookmark) {
      case 'handler-setup':
        return {
          subtitle: 'Handler Setup',
          description: 'Manage and assign handlers for SNR accounts. Set, update, and track handler assignments for each SNR account.'
        }
      case 'snr-performance':
        return {
          subtitle: 'SNR Performance',
          description: 'Overview and analytics of SNR team performance. View comprehensive reports including customer assignment metrics, handler productivity, and performance trends.'
        }
      case 'assignment':
      default:
        return {
          subtitle: 'Manage Assignments',
          description: 'Assign customers to SNR accounts and handlers. Manage customer assignments, track assignments, and update handler information.'
        }
    }
  }

  const pageInfo = getPageInfo()

  // SubHeader dengan Bookmark
  const subHeaderContent = (
    <div className="subheader-content" style={{ paddingLeft: '16px', paddingRight: '24px' }}>
      <div className="subheader-title" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '4px',
        alignItems: 'flex-start',
        flex: '1 1 auto',
        paddingLeft: '0'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#1f2937',
          margin: 0,
          lineHeight: '1.2'
        }}>
          {pageInfo.subtitle}
        </h2>
        <p style={{
          fontSize: '13px',
          fontWeight: 400,
          color: '#6b7280',
          margin: 0,
          lineHeight: '1.4'
        }}>
          {pageInfo.description}
        </p>
      </div>
      <div className="subheader-controls" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginLeft: 'auto',
        flex: '0 0 auto'
      }}>
        {/* Bookmark 1: Handler Setup */}
        <button
          onClick={() => {
            setActiveBookmark('handler-setup')
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            backgroundColor: activeBookmark === 'handler-setup' ? '#3b82f6' : 'transparent',
            color: activeBookmark === 'handler-setup' ? 'white' : '#9ca3af',
            opacity: activeBookmark === 'handler-setup' ? 1 : 0.7
          }}
          onMouseEnter={(e) => {
            if (activeBookmark !== 'handler-setup') {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
              e.currentTarget.style.opacity = '1'
            }
          }}
          onMouseLeave={(e) => {
            if (activeBookmark !== 'handler-setup') {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.opacity = '0.7'
            }
          }}
          title="Handler Setup - Coming Soon"
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Handler Setup</span>
        </button>

        {/* Bookmark 2: Manage Assignments (Active) */}
        <button
          onClick={() => {
            setActiveBookmark('assignment')
            // Already on this page, no navigation needed
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            backgroundColor: activeBookmark === 'assignment' ? '#3b82f6' : 'transparent',
            color: activeBookmark === 'assignment' ? 'white' : '#9ca3af',
            opacity: activeBookmark === 'assignment' ? 1 : 0.7
          }}
          onMouseEnter={(e) => {
            if (activeBookmark !== 'assignment') {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
              e.currentTarget.style.opacity = '1'
            }
          }}
          onMouseLeave={(e) => {
            if (activeBookmark !== 'assignment') {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.opacity = '0.7'
            }
          }}
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={activeBookmark === 'assignment' ? 'white' : 'currentColor'} 
            strokeWidth="2"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <path d="M20 8v6"></path>
            <path d="M23 11h-6"></path>
          </svg>
          <span>Manage Assignments</span>
        </button>

        {/* Bookmark 3: SNR Performance */}
        <button
          onClick={() => {
            setActiveBookmark('snr-performance')
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            backgroundColor: activeBookmark === 'snr-performance' ? '#3b82f6' : 'transparent',
            color: activeBookmark === 'snr-performance' ? 'white' : '#9ca3af',
            opacity: activeBookmark === 'snr-performance' ? 1 : 0.7
          }}
          onMouseEnter={(e) => {
            if (activeBookmark !== 'snr-performance') {
              e.currentTarget.style.backgroundColor = '#f3f4f6'
              e.currentTarget.style.opacity = '1'
            }
          }}
          onMouseLeave={(e) => {
            if (activeBookmark !== 'snr-performance') {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.opacity = '0.7'
            }
          }}
          title="SNR Performance - Coming Soon"
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>SNR Performance</span>
        </button>
      </div>
    </div>
  )

  // Render content based on active bookmark
  const renderPageContent = () => {
    if (activeBookmark === 'handler-setup') {
      return (
        <Frame variant="compact">
          <div className="deposit-container">
            {/* Handler Setup Table */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              {/* Table Header with Add Button */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1f2937',
                  margin: 0
                }}>
                  Handler Setup
                </h3>
                <button
                  onClick={handleAddNewHandler}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#059669'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#10b981'
                  }}
                >
                  + Add New Handler
                </button>
              </div>

              {/* Table Section */}
              {handlerLoading ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  minHeight: '400px',
                  padding: '40px'
                }}>
                  <StandardLoadingSpinner message="Loading Handler Setup" />
                </div>
              ) : (
                <div className="simple-table-wrapper" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="simple-table" style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    tableLayout: 'auto'
                  }}>
                    <thead>
                      <tr>
                        <th style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto'
                        }}>Line</th>
                        <th style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto'
                        }}>SNR Account</th>
                        <th style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto'
                        }}>Handler</th>
                        <th style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto'
                        }}>Assigned By</th>
                        <th style={{ 
                          textAlign: 'left',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto'
                        }}>Assigned Time</th>
                        <th style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto'
                        }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Existing handlers */}
                      {handlerData.map((handler, index) => {
                        const editing = getEditingHandlerState(handler.id!)
                        const hasChanges = editingHandlers.has(handler.id!)
                        const isSaving = savingHandlers.has(handler.id!)
                        
                        return (
                          <tr key={handler.id} style={{
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                          }}>
                            <td style={{ 
                              border: '1px solid #e0e0e0',
                              padding: '10px 16px'
                            }}>
                              {hasChanges ? (
                                <select
                                  value={editing.line}
                                  onChange={(e) => handleHandlerChange(handler.id!, 'line', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    backgroundColor: '#fffef0',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <option value="">Select Line</option>
                                  {availableLines.map(line => (
                                    <option key={line} value={line}>{line}</option>
                                  ))}
                                </select>
                              ) : (
                                <span>{handler.line}</span>
                              )}
                            </td>
                            <td style={{ 
                              border: '1px solid #e0e0e0',
                              padding: '10px 16px'
                            }}>
                              {hasChanges ? (
                                <select
                                  value={editing.snr_account}
                                  onChange={(e) => handleHandlerChange(handler.id!, 'snr_account', e.target.value)}
                                  disabled={!editing.line || !editing.line.trim()}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    backgroundColor: editing.line && editing.line.trim() ? '#fffef0' : '#f3f4f6',
                                    cursor: editing.line && editing.line.trim() ? 'pointer' : 'not-allowed',
                                    opacity: editing.line && editing.line.trim() ? 1 : 0.6
                                  }}
                                >
                                  <option value="">Select SNR Account</option>
                                  {getAvailableSNRAccounts(editing.line).map(account => (
                                    <option key={account} value={account}>{account}</option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ fontWeight: 500 }}>{handler.snr_account}</span>
                              )}
                            </td>
                            <td style={{ 
                              border: '1px solid #e0e0e0',
                              padding: '10px 16px'
                            }}>
                              {hasChanges ? (
                                <input
                                  type="text"
                                  value={editing.handler}
                                  onChange={(e) => handleHandlerChange(handler.id!, 'handler', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    backgroundColor: '#fffef0'
                                  }}
                                />
                              ) : (
                                <span>{handler.handler}</span>
                              )}
                            </td>
                            <td style={{ 
                              border: '1px solid #e0e0e0',
                              padding: '10px 16px',
                              color: '#6b7280'
                            }}>
                              {handler.assigned_by || '-'}
                            </td>
                            <td style={{ 
                              border: '1px solid #e0e0e0',
                              padding: '10px 16px',
                              color: '#6b7280',
                              fontSize: '12px'
                            }}>
                              {handler.assigned_time 
                                ? new Date(handler.assigned_time).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : '-'}
                            </td>
                            <td style={{ 
                              textAlign: 'center',
                              border: '1px solid #e0e0e0',
                              padding: '10px 16px'
                            }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                {hasChanges ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveHandler(handler.id!)}
                                      disabled={isSaving}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#10b981',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: isSaving ? 'not-allowed' : 'pointer',
                                        opacity: isSaving ? 0.6 : 1
                                      }}
                                    >
                                      {isSaving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const newEditing = new Map(editingHandlers)
                                        newEditing.delete(handler.id!)
                                        setEditingHandlers(newEditing)
                                      }}
                                      disabled={isSaving}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#6b7280',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: isSaving ? 'not-allowed' : 'pointer',
                                        opacity: isSaving ? 0.6 : 1
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        const editing = getEditingHandlerState(handler.id!)
                                        setEditingHandlers(new Map(editingHandlers.set(handler.id!, editing)))
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#3b82f6',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleClearHandler(handler.id!)}
                                      disabled={isSaving}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#ef4444',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: isSaving ? 'not-allowed' : 'pointer',
                                        opacity: isSaving ? 0.6 : 1
                                      }}
                                    >
                                      Clear
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      
                      {/* New handler rows (being added) */}
                      {Array.from(editingHandlers.entries())
                        .filter(([id]) => id.startsWith('new-'))
                        .map(([id, editing]) => {
                          const isSaving = savingHandlers.has(id)
                          return (
                            <tr key={id} style={{ backgroundColor: '#fffef0' }}>
                              <td style={{ 
                                border: '1px solid #e0e0e0',
                                padding: '10px 16px'
                              }}>
                                <select
                                  value={editing.line}
                                  onChange={(e) => handleHandlerChange(id, 'line', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <option value="">Select Line</option>
                                  {availableLines.map(line => (
                                    <option key={line} value={line}>{line}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ 
                                border: '1px solid #e0e0e0',
                                padding: '10px 16px'
                              }}>
                                <select
                                  value={editing.snr_account}
                                  onChange={(e) => handleHandlerChange(id, 'snr_account', e.target.value)}
                                  disabled={!editing.line || !editing.line.trim()}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    backgroundColor: editing.line && editing.line.trim() ? '#fffef0' : '#f3f4f6',
                                    cursor: editing.line && editing.line.trim() ? 'pointer' : 'not-allowed',
                                    opacity: editing.line && editing.line.trim() ? 1 : 0.6
                                  }}
                                >
                                  <option value="">Select SNR Account</option>
                                  {getAvailableSNRAccounts(editing.line).map(account => (
                                    <option key={account} value={account}>{account}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ 
                                border: '1px solid #e0e0e0',
                                padding: '10px 16px'
                              }}>
                                <input
                                  type="text"
                                  value={editing.handler}
                                  onChange={(e) => handleHandlerChange(id, 'handler', e.target.value)}
                                  placeholder="Enter Handler Name"
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '13px'
                                  }}
                                />
                              </td>
                              <td style={{ 
                                border: '1px solid #e0e0e0',
                                padding: '10px 16px',
                                color: '#9ca3af',
                                fontStyle: 'italic'
                              }}>-</td>
                              <td style={{ 
                                border: '1px solid #e0e0e0',
                                padding: '10px 16px',
                                color: '#9ca3af',
                                fontStyle: 'italic'
                              }}>-</td>
                              <td style={{ 
                                textAlign: 'center',
                                border: '1px solid #e0e0e0',
                                padding: '10px 16px'
                              }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => handleSaveHandler(id)}
                                    disabled={isSaving}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#10b981',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      cursor: isSaving ? 'not-allowed' : 'pointer',
                                      opacity: isSaving ? 0.6 : 1
                                    }}
                                  >
                                    {isSaving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      const newEditing = new Map(editingHandlers)
                                      newEditing.delete(id)
                                      setEditingHandlers(newEditing)
                                    }}
                                    disabled={isSaving}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#6b7280',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      cursor: isSaving ? 'not-allowed' : 'pointer',
                                      opacity: isSaving ? 0.6 : 1
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Frame>
      )
    }

    if (activeBookmark === 'snr-performance') {
      return (
        <Frame variant="compact">
          <ComingSoon 
            title="SNR Performance"
            subtitle="Overview and analytics of SNR team performance"
            message="This feature will provide comprehensive reports and analytics on SNR team performance, including customer assignment metrics, handler productivity, and performance trends."
          />
        </Frame>
      )
    }

    // Default: Customer Assignment page
    return (
      <Frame variant="compact">
        <div className="deposit-container">
          {/* Unified Canvas: Slicer > Table > Pagination */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Search and Slicers Section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: 'white',
              borderBottom: '1px solid #e5e7eb',
              flexWrap: 'wrap'
            }}>
              {/* Search Input */}
              <div className="slicer-group" style={{ marginRight: 'auto' }}>
                <label className="slicer-label">Search:</label>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleSearchInputKeyDown}
                    placeholder="Enter Unique Code"
                    style={{
                      padding: '4px 32px 4px 8px',
                      minWidth: '200px',
                      maxWidth: '250px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      fontWeight: 500,
                      backgroundColor: 'white',
                      cursor: 'text',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#9ca3af' }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db' }}
                  />
                  {/* Clear Button */}
                  {searchInput && searchInput.trim() && (
                    <button
                      onClick={handleClearSearch}
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        color: '#6b7280',
                        fontSize: '18px',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { 
                        e.currentTarget.style.color = '#ef4444'
                        e.currentTarget.style.backgroundColor = '#fee2e2'
                      }}
                      onMouseLeave={(e) => { 
                        e.currentTarget.style.color = '#6b7280'
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Slicers */}
              <div className="slicer-group">
                <label className="slicer-label">LINE:</label>
                <select 
                  value={line} 
                  onChange={(e) => setLine(e.target.value)}
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
                  value={year} 
                  onChange={(e) => setYear(e.target.value)}
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
                  onChange={(e) => setMonth(e.target.value)}
                  className={`slicer-select ${slicerLoading ? 'disabled' : ''}`}
                  disabled={slicerLoading}
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
                <label className="slicer-label">TIER:</label>
                <select 
                  value={tier} 
                  onChange={(e) => setTier(e.target.value)}
                  className={`slicer-select ${slicerLoading ? 'disabled' : ''}`}
                  disabled={slicerLoading}
                >
                  <option value="ALL">All</option>
                  {slicerOptions.tiers.map((tierOption) => (
                    <option key={tierOption} value={tierOption}>
                      {tierOption}
                    </option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleApplyFilters}
                disabled={loading || !year || !month}
                className={`export-button ${loading || !year || !month ? 'disabled' : ''}`}
                style={{ backgroundColor: '#10b981' }}
              >
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>

            {/* Table Section */}
            {loading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '400px',
                padding: '40px'
              }}>
                <StandardLoadingSpinner message="Loading Customer Assignment" />
              </div>
            ) : customerData.length === 0 ? (
              <div className="empty-container" style={{ padding: '60px 20px' }}>
                <div className="empty-icon">📭</div>
                <div className="empty-text">
                  No customer data found for the selected filters
                </div>
              </div>
            ) : (
              <div className="simple-table-wrapper" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table className="simple-table" style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  tableLayout: 'auto'
                }}>
                  <thead>
                    <tr>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Brand</th>
                      <th 
                        onDoubleClick={() => handleColumnSort('user_name')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        User Name{renderSortIndicator('user_name')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('update_unique_code')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        Unique Code{renderSortIndicator('update_unique_code')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('traffic')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'normal',
                          maxWidth: '300px',
                          wordBreak: 'break-word',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        Traffic{renderSortIndicator('traffic')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('first_deposit_date')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        FDD{renderSortIndicator('first_deposit_date')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('last_deposit_date')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        LDD{renderSortIndicator('last_deposit_date')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('days_active')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        Days Active{renderSortIndicator('days_active')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('atv')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        ATV{renderSortIndicator('atv')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('pf')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        PF{renderSortIndicator('pf')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('deposit_cases')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        DC{renderSortIndicator('deposit_cases')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('deposit_amount')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        DA{renderSortIndicator('deposit_amount')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('withdraw_cases')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        WC{renderSortIndicator('withdraw_cases')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('withdraw_amount')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        WA{renderSortIndicator('withdraw_amount')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('ggr')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        GGR{renderSortIndicator('ggr')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('tier_name')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        Tier{renderSortIndicator('tier_name')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('status')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        title="Double click to sort"
                      >
                        Status{renderSortIndicator('status')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('snr_account')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        Assignee{renderSortIndicator('snr_account')}
                      </th>
                      <th 
                        onDoubleClick={() => handleColumnSort('snr_handler')}
                        style={{ 
                          textAlign: 'center',
                          border: '1px solid #e0e0e0',
                          borderBottom: '2px solid #d0d0d0',
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Double click to sort"
                      >
                        Handler{renderSortIndicator('snr_handler')}
                      </th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCustomerData.map((customer, index) => {
                      const editing = getEditingState(customer.userkey)
                      const hasChanges = hasUnsavedChanges(customer.userkey)
                      const isSaving = savingAssignments.has(customer.userkey)
                      
                      return (
                        <tr key={customer.userkey}>
                          <td style={{ 
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{customer.line}</td>
                          <td style={{ 
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{customer.user_name || '-'}</td>
                          <td style={{ 
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{customer.update_unique_code || '-'}</td>
                          <td style={{ 
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px',
                            whiteSpace: 'normal',
                            maxWidth: '300px',
                            wordBreak: 'break-word'
                          }}>{customer.traffic || '-'}</td>
                          <td style={{ 
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{customer.first_deposit_date ? new Date(customer.first_deposit_date).toISOString().split('T')[0] : '-'}</td>
                          <td style={{ 
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{customer.last_deposit_date ? new Date(customer.last_deposit_date).toISOString().split('T')[0] : '-'}</td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>
                            <button
                              onClick={() => {
                                if (!customer.userkey) {
                                  console.error('❌ Customer userkey is null/empty:', customer)
                                  return
                                }
                                console.log('🔍 Frontend - Customer clicked:', {
                                  userkey: customer.userkey,
                                  user_unique: customer.user_unique,
                                  unique_code: customer.update_unique_code,
                                  line: customer.line,
                                  user_name: customer.user_name
                                })
                                setSelectedCustomer({
                                  userName: customer.user_name,
                                  uniqueCode: customer.update_unique_code,
                                  userkey: customer.userkey, // userkey langsung dari database
                                  line: customer.line
                                })
                                setShowDaysActiveModal(true)
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#2563eb',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '14px',
                                padding: 0
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#1d4ed8' }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#2563eb' }}
                              title="Click to view transaction history"
                            >
                              {formatInteger(customer.days_active)}
                            </button>
                          </td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{formatNumber(customer.atv)}</td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{formatNumber(customer.pf)}</td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{formatInteger(customer.deposit_cases)}</td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{formatNumber(customer.deposit_amount)}</td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{formatInteger(customer.withdraw_cases)}</td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{formatNumber(customer.withdraw_amount)}</td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px',
                            color: customer.ggr < 0 ? '#dc2626' : customer.ggr > 0 ? '#059669' : '#374151',
                            fontWeight: 600
                          }}>{formatNumber(customer.ggr)}</td>
                          <td style={{ 
                            textAlign: 'left',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{customer.tier_name || '-'}</td>
                          <td style={{ 
                            textAlign: 'center',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>
                            {(() => {
                              const status = getCustomerStatus(customer.first_deposit_date)
                              return (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    backgroundColor: status === 'ND' ? '#10b981' : '#f97316',
                                    color: '#ffffff',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {status}
                                </span>
                              )
                            })()}
                          </td>
                          <td style={{ 
                            textAlign: 'center',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px',
                            backgroundColor: 'transparent'
                          }}>
                            {customer.snr_account ? (
                              /* Badge style if assignee already saved */
                              <div
                                style={{
                                  display: 'inline-block',
                                  padding: '6px 12px',
                                  backgroundColor: '#D1FAE5',
                                  border: '1px solid #10B981',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#065F46',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}
                              >
                                {customer.snr_account}
                              </div>
                            ) : (
                              /* Select dropdown if assignee empty */
                            <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: '180px' }}>
                              <select
                                  value={editing.snr_account || ''}
                                onChange={(e) => handleAssignmentChange(customer.userkey, 'snr_account', e.target.value)}
                                style={{
                                  width: '100%',
                                    padding: '6px 30px 6px 10px', // Extra padding right for arrow
                                    border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  fontSize: '13px',
                                    backgroundColor: '#ffffff',
                                  minWidth: '120px',
                                  appearance: 'none',
                                  WebkitAppearance: 'none',
                                    MozAppearance: 'none',
                                    textAlign: 'center',
                                    cursor: 'pointer'
                                }}
                              >
                                  <option value="">Unassigned</option>
                                {snrAccounts
                                  .filter(account => {
                                    // Filter SNR accounts based on customer line
                                    if (!account.allowed_brands || !Array.isArray(account.allowed_brands)) {
                                      return false
                                    }
                                    // Check if allowed_brands contains the customer's line
                                    return account.allowed_brands.includes(customer.line)
                                  })
                                  .map(account => (
                                    <option key={account.username} value={account.username}>
                                      {account.username}
                                    </option>
                                  ))}
                              </select>
                                {/* Chevron dropdown icon - only show when value is empty/Unassigned */}
                                {(!editing.snr_account || !editing.snr_account.trim()) && (
                                  <div style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                    color: '#6b7280',
                                    fontSize: '12px',
                                    lineHeight: '1'
                                  }}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </div>
                              )}
                            </div>
                            )}
                          </td>
                          <td style={{ 
                            textAlign: 'center',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px',
                            backgroundColor: 'transparent'
                          }}>
                            {customer.snr_handler ? (
                              /* Badge style if handler exists */
                              <div
                                style={{
                                  display: 'inline-block',
                                  padding: '6px 12px',
                                  backgroundColor: '#FED7AA',
                                  border: '1px solid #F59E0B',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#92400E',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}
                              >
                                {customer.snr_handler}
                              </div>
                            ) : editing.snr_handler ? (
                              /* Show editing handler in badge if exists */
                              <div
                                style={{
                                  display: 'inline-block',
                                  padding: '6px 12px',
                                  backgroundColor: '#FEF3C7',
                                  border: '1px solid #F59E0B',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#92400E',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}
                              >
                                {editing.snr_handler}
                              </div>
                            ) : (
                              /* Show dash if no handler */
                            <span style={{
                              fontSize: '13px',
                                color: '#9ca3af'
                            }}>
                                -
                            </span>
                            )}
                          </td>
                          <td style={{ 
                            textAlign: 'center',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>
                            {/* Show "Clear" button if assignee already exists and saved (from database) */}
                            {customer.snr_account && !hasChanges ? (
                              <button
                                onClick={() => handleClearAssignment(customer.userkey)}
                                disabled={isSaving}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#ef4444',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: isSaving ? 'not-allowed' : 'pointer',
                                  opacity: isSaving ? 0.6 : 1,
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSaving) {
                                    e.currentTarget.style.backgroundColor = '#dc2626'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSaving) {
                                    e.currentTarget.style.backgroundColor = '#ef4444'
                                  }
                                }}
                              >
                                Clear
                              </button>
                            ) : (
                              /* Show "Send" button standby if assignee is empty or selected (hasChanges) */
                              <button
                                onClick={() => handleSaveAssignment(customer.userkey)}
                                disabled={isSaving || !hasChanges || !(editing.snr_account && editing.snr_account.trim())}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: (hasChanges && editing.snr_account && editing.snr_account.trim()) ? '#3b82f6' : '#9ca3af',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: (isSaving || !hasChanges || !(editing.snr_account && editing.snr_account.trim())) ? 'not-allowed' : 'pointer',
                                  opacity: isSaving ? 0.6 : 1,
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSaving && hasChanges && editing.snr_account && editing.snr_account.trim()) {
                                    e.currentTarget.style.backgroundColor = '#2563eb'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSaving && hasChanges && editing.snr_account && editing.snr_account.trim()) {
                                    e.currentTarget.style.backgroundColor = '#3b82f6'
                                  }
                                }}
                              >
                                Send
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

            )}

            {/* Pagination Section */}
            {!loading && customerData.length > 0 && (
              <div style={{
                padding: '16px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                backgroundColor: 'white'
              }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {pagination.totalPages > 1 ? (
                    <>Showing {((pagination.currentPage - 1) * pagination.recordsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.recordsPerPage, pagination.totalRecords)} of {formatInteger(pagination.totalRecords)} records</>
                  ) : (
                    <>Total: {formatInteger(pagination.totalRecords)} records</>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {pagination.totalPages > 1 && (
                    <>
                      <button
                        onClick={() => {
                          const newPage = pagination.currentPage - 1
                          setPagination(prev => ({ ...prev, currentPage: newPage }))
                          // ✅ Manual reload dengan page yang baru (pass overridePage untuk avoid stale closure)
                          fetchCustomerData(undefined, false, newPage)
                        }}
                        disabled={!pagination.hasPrevPage}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          backgroundColor: pagination.hasPrevPage ? 'white' : '#f3f4f6',
                          color: pagination.hasPrevPage ? '#374151' : '#9ca3af',
                          cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
                          fontSize: '13px'
                        }}
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: '14px', color: '#374151' }}>
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => {
                          const newPage = pagination.currentPage + 1
                          setPagination(prev => ({ ...prev, currentPage: newPage }))
                          // ✅ Manual reload dengan page yang baru (pass overridePage untuk avoid stale closure)
                          fetchCustomerData(undefined, false, newPage)
                        }}
                        disabled={!pagination.hasNextPage}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          backgroundColor: pagination.hasNextPage ? 'white' : '#f3f4f6',
                          color: pagination.hasNextPage ? '#374151' : '#9ca3af',
                          cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
                          fontSize: '13px'
                        }}
                      >
                        Next
                      </button>
                    </>
                  )}
                  
                  {/* Send All Button - After Pagination */}
                  {editingAssignments.size > 0 && (
                    <button
                      onClick={handleBulkSave}
                      disabled={bulkSaving}
                      className="export-button"
                      style={{ 
                        backgroundColor: '#10b981',
                        minWidth: '150px',
                        marginLeft: pagination.totalPages > 1 ? '16px' : '0'
                      }}
                    >
                      Send All ({editingAssignments.size})
                    </button>
                  )}

                  {/* Export Button */}
                  <button
                    onClick={handleExport}
                    disabled={exporting || loading || customerData.length === 0}
                    className="export-button"
                    style={{ 
                      backgroundColor: '#6366f1',
                      minWidth: '120px',
                      marginLeft: editingAssignments.size > 0 || pagination.totalPages > 1 ? '16px' : '0'
                    }}
                  >
                    {exporting ? 'Exporting...' : 'Export'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Frame>
    )
  }

  return (
    <>
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeInContent {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    <Layout customSubHeader={subHeaderContent}>
      {renderPageContent()}
        <ToastComponent />
    </Layout>

      {/* ✅ Days Active Transaction History Modal */}
      {showDaysActiveModal && selectedCustomer && (
        <DaysActiveTransactionModal
          isOpen={showDaysActiveModal}
          onClose={() => {
            setShowDaysActiveModal(false)
            setSelectedCustomer(null)
          }}
          userName={selectedCustomer.userName || ''}
          uniqueCode={selectedCustomer.uniqueCode}
          userkey={selectedCustomer.userkey}
          line={selectedCustomer.line}
          year={year}
          month={month}
        />
      )}
    </>
  )
}

// ✅ Days Active Transaction History Modal Component
interface DaysActiveTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  uniqueCode: string
  userkey: string
  line: string
  year: string
  month: string
}

function DaysActiveTransactionModal({
  isOpen,
  onClose,
  userName,
  uniqueCode,
  userkey,
  line,
  year,
  month
}: DaysActiveTransactionModalProps) {
  const sidebarWidth = useSidebarState()
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // ✅ Standard: Total baris = 11 (1 header + 10 data rows)
  // ✅ CELL_HEIGHT = 42px (JANGAN KURANG!!!)
  const STANDARD_DATA_ROWS = 10 // Data rows (bukan termasuk header)
  const CELL_HEIGHT = 42 // ✅ WAJIB 42px (JANGAN KURANG!!!)
  const MAX_TABLE_HEIGHT = 520 // ✅ 520px agar 10 data rows PENUH tidak terpotong (42px × 11 + buffer untuk border/padding)
  const CELL_PADDING = '8px 12px' // ✅ Padding untuk cell 42px
  const CELL_LINE_HEIGHT = '26px' // ✅ Line height untuk cell 42px
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10) // Default 10 rows per page
  const [totalRecords, setTotalRecords] = useState(0)

  const fetchTransactionHistory = useCallback(async (overridePage?: number) => {
    try {
      setLoading(true)
      
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null

      // Use overridePage if provided, otherwise use current page state
      const currentPage = overridePage !== undefined ? overridePage : page

      console.log('🔍 Frontend - Sending request with:', { userkey, line, year, month, page: currentPage })

      const params = new URLSearchParams({
        userkey,
        line,
        year,
        month,
        page: currentPage.toString(),
        limit: limit.toString()
      })

      console.log('🔍 Frontend - API URL:', `/api/usc-customer-assignment/days-active-details?${params.toString()}`)

      const response = await fetch(`/api/usc-customer-assignment/days-active-details?${params}`, {
        headers: allowedBrands ? {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        } : {}
      })

      if (!response.ok) {
        throw new Error('Failed to fetch transaction history')
      }

      const result = await response.json()
      
      console.log('🔍 Frontend - API Response:', {
        success: result.success,
        dataCount: result.data?.length || 0,
        totalRecords: result.pagination?.totalRecords || 0,
        error: result.error
      })
      
      if (result.success) {
        setTransactions(result.data || [])
        setTotalRecords(result.pagination?.totalRecords || 0)
        setError(null)
      } else {
        console.error('❌ Frontend - API Error:', result.error, result.message)
        setTransactions([])
        setTotalRecords(0)
        setError(result.error || 'Failed to fetch transaction history')
      }
    } catch (err: any) {
      console.error('Error fetching transaction history:', err)
      setTransactions([])
      setTotalRecords(0)
      setError(err.message || 'Failed to fetch transaction history')
    } finally {
      setLoading(false)
    }
  }, [userkey, line, year, month, limit]) // ✅ Removed page from dependencies - use overridePage parameter instead

  // ✅ Fetch data hanya saat modal dibuka pertama kali (1x) - reset page dan fetch dalam 1 useEffect untuk avoid race condition
  useEffect(() => {
    if (isOpen) {
      setPage(1)
      setError(null)
      // ✅ Fetch dengan page 1 secara eksplisit (pass overridePage untuk avoid stale closure)
      fetchTransactionHistory(1)
    }
  }, [isOpen, fetchTransactionHistory]) // ✅ Include fetchTransactionHistory tapi dengan overridePage, jadi tidak akan re-trigger saat page berubah

  // Format date to YYYY/MM/DD
  const formatDateYYYYMMDD = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}` // Format: YYYY/MM/DD
  }

  // Export CSV function
  const handleExport = async () => {
    if (transactions.length === 0) return
    
    try {
      setExporting(true)
      
      // Headers
      const headers = [
        'TRANSACTION DATE',
        'BRAND',
        'UNIQUE CODE',
        'FDD',
        'LDD',
        'DC',
        'DA',
        'WC',
        'WA',
        'GGR',
        'NET PROFIT'
      ]
      
      let csvContent = headers.join(',') + '\n'
      
      // Export all transactions (fetch all pages)
      const batchSize = 1000
      let allTransactions: any[] = []
      let currentPage = 1
      let hasMore = true

      while (hasMore) {
        const params = new URLSearchParams({
          userkey,
          line,
          year,
          month,
          page: currentPage.toString(),
          limit: batchSize.toString()
        })

        const userStr = localStorage.getItem('nexmax_user')
        const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null

        const response = await fetch(`/api/usc-customer-assignment/days-active-details?${params}`, {
          headers: allowedBrands ? {
            'x-user-allowed-brands': JSON.stringify(allowedBrands)
          } : {}
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch transaction data (page ${currentPage})`)
        }

        const result = await response.json()
        
        if (!result.success || !result.data) {
          break
        }

        const batchData = result.data || []
        allTransactions = [...allTransactions, ...batchData]

        hasMore = batchData.length === batchSize && allTransactions.length < totalRecords
        currentPage++

        if (allTransactions.length >= totalRecords || currentPage > 100) {
          hasMore = false
        }
      }
      
      allTransactions.forEach((transaction: any) => {
        csvContent += [
          formatDateYYYYMMDD(transaction.date || transaction.transaction_date),
          transaction.line || transaction.brand || '-',
          transaction.unique_code || '-',
          formatDateYYYYMMDD(transaction.first_deposit_date),
          formatDateYYYYMMDD(transaction.last_deposit_date),
          transaction.deposit_cases || 0,
          (transaction.deposit_amount || 0).toFixed(2),
          transaction.withdraw_cases || 0,
          (transaction.withdraw_amount || 0).toFixed(2),
          (transaction.ggr || 0).toFixed(2),
          (transaction.net_profit || 0).toFixed(2)
        ].join(',') + '\n'
      })
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Generate filename
      const filename = `transaction-history-${uniqueCode}-${new Date().toISOString().split('T')[0]}.csv`
      a.download = filename
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      console.error('❌ Export error:', e)
      alert('Failed to export: ' + (e.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(totalRecords / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedTransactions = transactions

  // ✅ Calculate table height:
  // - Jika limit >= 10: SELALU gunakan 520px (11 rows dengan cell height 42px)
  // - Jika limit < 10: tinggi auto (ikut jumlah row yang ada)
  const actualDataRows = paginatedTransactions.length
  
  // ✅ WAJIB: Jika limit >= 10, SELALU gunakan 520px untuk 11 rows (1 header + 10 data)
  // ✅ WAJIB: Jika limit < 10, tinggi auto = header + (jumlah data rows × 42px)
  const tableHeight = limit >= STANDARD_DATA_ROWS
    ? MAX_TABLE_HEIGHT // 520px WAJIB untuk 11 rows (1 header + 10 data) - SELALU jika limit >= 10
    : CELL_HEIGHT + (actualDataRows * CELL_HEIGHT) // Auto height jika limit < 10 (header 42px + data rows)
  
  // ✅ Scroll logic: scroll muncul jika data > 10 rows
  const shouldShowScroll = actualDataRows > STANDARD_DATA_ROWS

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: '10px', // ✅ Minimal top untuk maksimalkan tinggi modal
        left: sidebarWidth,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '95%',
          maxWidth: '1500px',
          maxHeight: 'calc(100vh - 20px)', // ✅ Maksimalkan tinggi modal agar table 520px + header + footer tidak terpotong
          height: 'auto', // ✅ Auto height untuk accommodate semua konten
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'auto', // ✅ UBAH jadi auto agar konten tidak terpotong dan bisa scroll jika perlu
          border: '2px solid #3b82f6',
          borderTop: '4px solid #3b82f6'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: '#1F2937',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderRadius: '16px 16px 0 0',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative background */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(55, 65, 81, 0.2) 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
            pointerEvents: 'none'
          }} />
          
          {/* Left: Title & Subtitle */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              flexShrink: 0
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"></path>
                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"></path>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  margin: 0,
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Transaction History - {userName || uniqueCode}
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: 0,
                  fontWeight: 400
                }}
              >
                User Code: {uniqueCode} • {totalRecords} transactions
              </p>
            </div>
          </div>
          
          {/* Right: Close button */}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              fontSize: '24px',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'all 0.2s',
              position: 'relative',
              zIndex: 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563'
              e.currentTarget.style.color = '#FFFFFF'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#9CA3AF'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible', // ✅ UBAH jadi visible agar tidak memotong konten
            padding: 0,
            minHeight: 0 // ✅ Allow content to expand
          }}
        >
          {/* Table Container - Always rendered for stable modal size */}
          <div style={{ 
            padding: '20px 24px'
          }}>
            <div style={{
              overflowX: 'auto',
              overflowY: shouldShowScroll ? 'auto' : 'hidden', // ✅ Scroll muncul jika data > 10 rows
              height: limit >= STANDARD_DATA_ROWS ? `${MAX_TABLE_HEIGHT}px` : `${tableHeight}px`, // ✅ PURE TINGGI TABLE = 520px (42px × 11 rows)
              position: 'relative',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
              boxSizing: 'border-box' // ✅ Border sudah termasuk dalam height, jadi 520px = pure tinggi table
            }}>
              {loading ? (
                // ✅ Loading spinner di tengah table area
                <div style={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  zIndex: 10
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #E5E7EB',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ 
                    fontSize: '14px', 
                    fontWeight: 500,
                    color: '#6B7280',
                    margin: 0,
                    textAlign: 'center'
                  }}>
                    Loading transactions...
                  </p>
                </div>
              ) : error ? (
                // ✅ Error message di tengah table area
                <div style={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: '#EF4444',
                  zIndex: 10
                }}>
                  Error: {error}
                </div>
              ) : transactions.length === 0 ? (
                // ✅ No data message di tengah table area
                <div style={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: '#6B7280',
                  zIndex: 10
                }}>
                  No transactions found.
                </div>
              ) : null}

              {/* Table - Always rendered, hidden when loading/error/empty */}
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #e5e7eb',
                fontSize: '13px',
                boxSizing: 'border-box',
                opacity: loading || error || transactions.length === 0 ? 0.3 : 1,
                transition: 'opacity 0.3s ease-in'
              }}>
                <thead>
                      <tr style={{ height: `${CELL_HEIGHT}px` }}>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#374151',
                          borderBottom: '1px solid #4B5563',
                          borderRight: '1px solid #4B5563',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1000,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          height: `${CELL_HEIGHT}px`,
                          minHeight: `${CELL_HEIGHT}px`,
                          maxHeight: `${CELL_HEIGHT}px`,
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box'
                        }}>TRANSACTION DATE</th>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#374151',
                          borderBottom: '1px solid #4B5563',
                          borderRight: '1px solid #4B5563',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1000,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          height: `${CELL_HEIGHT}px`,
                          minHeight: `${CELL_HEIGHT}px`,
                          maxHeight: `${CELL_HEIGHT}px`,
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box'
                        }}>BRAND</th>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#374151',
                          borderBottom: '1px solid #4B5563',
                          borderRight: '1px solid #4B5563',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1000,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          height: `${CELL_HEIGHT}px`,
                          minHeight: `${CELL_HEIGHT}px`,
                          maxHeight: `${CELL_HEIGHT}px`,
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box'
                        }}>UNIQUE CODE</th>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#374151',
                          borderBottom: '1px solid #4B5563',
                          borderRight: '1px solid #4B5563',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1000,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          height: `${CELL_HEIGHT}px`,
                          minHeight: `${CELL_HEIGHT}px`,
                          maxHeight: `${CELL_HEIGHT}px`,
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box'
                        }}>FDD</th>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#374151',
                          borderBottom: '1px solid #4B5563',
                          borderRight: '1px solid #4B5563',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1000,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          height: `${CELL_HEIGHT}px`,
                          minHeight: `${CELL_HEIGHT}px`,
                          maxHeight: `${CELL_HEIGHT}px`,
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box'
                        }}>LDD</th>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#374151',
                          borderBottom: '1px solid #4B5563',
                          borderRight: '1px solid #4B5563',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1000,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          height: `${CELL_HEIGHT}px`,
                          minHeight: `${CELL_HEIGHT}px`,
                          maxHeight: `${CELL_HEIGHT}px`,
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box'
                        }}>DC</th>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#374151',
                          borderBottom: '1px solid #4B5563',
                          borderRight: '1px solid #4B5563',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1000,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          height: `${CELL_HEIGHT}px`,
                          minHeight: `${CELL_HEIGHT}px`,
                          maxHeight: `${CELL_HEIGHT}px`,
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box'
                        }}>DA</th>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#374151',
                          borderBottom: '1px solid #4B5563',
                          borderRight: '1px solid #4B5563',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1000,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          height: `${CELL_HEIGHT}px`,
                          minHeight: `${CELL_HEIGHT}px`,
                          maxHeight: `${CELL_HEIGHT}px`,
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box'
                        }}>WC</th>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#374151',
                          borderBottom: '1px solid #4B5563',
                          borderRight: '1px solid #4B5563',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1000,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          height: `${CELL_HEIGHT}px`,
                          minHeight: `${CELL_HEIGHT}px`,
                          maxHeight: `${CELL_HEIGHT}px`,
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box'
                        }}>WA</th>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#374151',
                          borderBottom: '1px solid #4B5563',
                          borderRight: '1px solid #4B5563',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1000,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          height: `${CELL_HEIGHT}px`,
                          minHeight: `${CELL_HEIGHT}px`,
                          maxHeight: `${CELL_HEIGHT}px`,
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box'
                        }}>GGR</th>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          backgroundColor: '#374151',
                          borderBottom: '1px solid #4B5563',
                          position: 'sticky',
                          top: 0,
                          zIndex: 1000,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          height: `${CELL_HEIGHT}px`,
                          minHeight: `${CELL_HEIGHT}px`,
                          maxHeight: `${CELL_HEIGHT}px`,
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box'
                        }}>NET PROFIT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTransactions.map((row, index) => (
                        <tr
                          key={index}
                          style={{
                            backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                            borderBottom: '1px solid #E5E7EB',
                            transition: 'all 0.2s ease',
                            height: `${CELL_HEIGHT}px`
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F3F4F6'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                          }}
                        >
                          <td
                            style={{
                              padding: CELL_PADDING,
                              color: '#1F2937',
                              borderRight: '1px solid #E5E7EB',
                              height: `${CELL_HEIGHT}px`,
                              minHeight: `${CELL_HEIGHT}px`,
                              maxHeight: `${CELL_HEIGHT}px`,
                              lineHeight: CELL_LINE_HEIGHT,
                              verticalAlign: 'middle',
                              boxSizing: 'border-box'
                            }}
                          >
                            {formatDateYYYYMMDD(row.date || row.transaction_date)}
                          </td>
                          <td
                            style={{
                              padding: CELL_PADDING,
                              color: '#1F2937',
                              borderRight: '1px solid #E5E7EB',
                              height: `${CELL_HEIGHT}px`,
                              lineHeight: CELL_LINE_HEIGHT,
                              verticalAlign: 'middle',
                              boxSizing: 'border-box'
                            }}
                          >
                            {row.line || row.brand || '-'}
                          </td>
                          <td
                            style={{
                              padding: CELL_PADDING,
                              color: '#1F2937',
                              borderRight: '1px solid #E5E7EB',
                              height: `${CELL_HEIGHT}px`,
                              lineHeight: CELL_LINE_HEIGHT,
                              verticalAlign: 'middle',
                              boxSizing: 'border-box'
                            }}
                          >
                            {row.unique_code || '-'}
                          </td>
                          <td
                            style={{
                              padding: CELL_PADDING,
                              color: '#1F2937',
                              borderRight: '1px solid #E5E7EB',
                              height: `${CELL_HEIGHT}px`,
                              lineHeight: CELL_LINE_HEIGHT,
                              verticalAlign: 'middle',
                              boxSizing: 'border-box'
                            }}
                          >
                            {formatDateYYYYMMDD(row.first_deposit_date)}
                          </td>
                          <td
                            style={{
                              padding: CELL_PADDING,
                              color: '#1F2937',
                              borderRight: '1px solid #E5E7EB',
                              height: `${CELL_HEIGHT}px`,
                              lineHeight: CELL_LINE_HEIGHT,
                              verticalAlign: 'middle',
                              boxSizing: 'border-box'
                            }}
                          >
                            {formatDateYYYYMMDD(row.last_deposit_date)}
                          </td>
                          <td
                            style={{
                              padding: CELL_PADDING,
                              textAlign: 'right',
                              color: '#1F2937',
                              borderRight: '1px solid #E5E7EB',
                              height: `${CELL_HEIGHT}px`,
                              lineHeight: CELL_LINE_HEIGHT,
                              verticalAlign: 'middle',
                              boxSizing: 'border-box'
                            }}
                          >
                            {formatIntegerKPI(row.deposit_cases || 0)}
                          </td>
                          <td
                            style={{
                              padding: CELL_PADDING,
                              textAlign: 'right',
                              color: '#1F2937',
                              borderRight: '1px solid #E5E7EB',
                              height: `${CELL_HEIGHT}px`,
                              lineHeight: CELL_LINE_HEIGHT,
                              verticalAlign: 'middle',
                              boxSizing: 'border-box'
                            }}
                          >
                            {formatCurrencyKPI(row.deposit_amount || 0, 'USC')}
                          </td>
                          <td
                            style={{
                              padding: CELL_PADDING,
                              textAlign: 'right',
                              color: '#1F2937',
                              borderRight: '1px solid #E5E7EB',
                              height: `${CELL_HEIGHT}px`,
                              lineHeight: CELL_LINE_HEIGHT,
                              verticalAlign: 'middle',
                              boxSizing: 'border-box'
                            }}
                          >
                            {formatIntegerKPI(row.withdraw_cases || 0)}
                          </td>
                          <td
                            style={{
                              padding: CELL_PADDING,
                              textAlign: 'right',
                              color: '#1F2937',
                              borderRight: '1px solid #E5E7EB',
                              height: `${CELL_HEIGHT}px`,
                              lineHeight: CELL_LINE_HEIGHT,
                              verticalAlign: 'middle',
                              boxSizing: 'border-box'
                            }}
                          >
                            {formatCurrencyKPI(row.withdraw_amount || 0, 'USC')}
                          </td>
                          <td
                            style={{
                              padding: CELL_PADDING,
                              textAlign: 'right',
                              color: (row.ggr || 0) >= 0 ? '#059669' : '#dc2626',
                              fontWeight: 600,
                              borderRight: '1px solid #E5E7EB',
                              height: `${CELL_HEIGHT}px`,
                              lineHeight: CELL_LINE_HEIGHT,
                              verticalAlign: 'middle',
                              boxSizing: 'border-box'
                            }}
                          >
                            {formatCurrencyKPI(row.ggr || 0, 'USC')}
                          </td>
                          <td
                            style={{
                              padding: CELL_PADDING,
                              textAlign: 'right',
                              color: (row.net_profit || 0) < 0 ? '#dc2626' : (row.net_profit || 0) > 0 ? '#059669' : '#374151',
                              fontWeight: 600,
                              height: `${CELL_HEIGHT}px`,
                              lineHeight: CELL_LINE_HEIGHT,
                              verticalAlign: 'middle',
                              boxSizing: 'border-box'
                            }}
                          >
                            {formatCurrencyKPI(row.net_profit || 0, 'USC')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer with Pagination & Export */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0,
                  borderRadius: '0 0 16px 16px' // ✅ Rounded bottom corners
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <select
                    value={limit}
                    onChange={async (e) => {
                      const newLimit = Number(e.target.value)
                      setLimit(newLimit)
                      setPage(1)
                      // ✅ Manual reload dengan limit dan page 1 yang baru (pass overridePage untuk avoid stale closure)
                      // Limit akan digunakan dari state yang sudah di-update karena masih dalam dependencies
                      fetchTransactionHistory(1)
                    }}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '13px',
                      backgroundColor: 'white',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>
                    Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} transactions
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const newPage = Math.max(1, page - 1)
                          setPage(newPage)
                          // ✅ Manual reload dengan page yang baru (pass overridePage untuk avoid stale closure)
                          fetchTransactionHistory(newPage)
                        }}
                        disabled={page === 1}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '13px',
                          backgroundColor: page === 1 ? '#F3F4F6' : 'white',
                          color: page === 1 ? '#9CA3AF' : '#374151',
                          cursor: page === 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Previous
                      </button>
                      <div style={{ fontSize: '13px', color: '#6B7280', padding: '0 8px' }}>
                        Page {page} of {totalPages}
                      </div>
                      <button
                        onClick={() => {
                          const newPage = Math.min(totalPages, page + 1)
                          setPage(newPage)
                          // ✅ Manual reload dengan page yang baru (pass overridePage untuk avoid stale closure)
                          fetchTransactionHistory(newPage)
                        }}
                        disabled={page === totalPages}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '13px',
                          backgroundColor: page === totalPages ? '#F3F4F6' : 'white',
                          color: page === totalPages ? '#9CA3AF' : '#374151',
                          cursor: page === totalPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                  {/* Export Button */}
                  <button
                    onClick={handleExport}
                    disabled={exporting || transactions.length === 0}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: exporting || transactions.length === 0 ? '#F3F4F6' : '#10B981',
                      color: exporting || transactions.length === 0 ? '#9CA3AF' : '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: exporting || transactions.length === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      if (!exporting && transactions.length > 0) {
                        e.currentTarget.style.backgroundColor = '#059669'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!exporting && transactions.length > 0) {
                        e.currentTarget.style.backgroundColor = '#10B981'
                      }
                    }}
                  >
                    {exporting ? (
                      <>
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8 12V4M4 8l4-4 4 4" />
                        </svg>
                        Export
                      </>
                    )}
                  </button>
                </div>
              </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
