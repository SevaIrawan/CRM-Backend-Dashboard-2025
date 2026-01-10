'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import ComingSoon from '@/components/ComingSoon'
import { getAllowedBrandsFromStorage } from '@/utils/brandAccessHelper'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'

interface CustomerData {
  userkey: string
  user_unique: string
  line: string
  update_unique_code: string
  traffic: string
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
  const fetchCustomerData = useCallback(async (overrideSearch?: string, resetPage: boolean = false) => {
    if (!year || !month) {
      console.log('⏳ Waiting for slicers...')
      return
    }

    try {
      setLoading(true)
      
      // Use overrideSearch if provided, otherwise use searchInput from state
      const searchValue = overrideSearch !== undefined ? overrideSearch : searchInput
      
      // Reset pagination to page 1 if resetPage is true or if search is being cleared
      const currentPage = resetPage || (overrideSearch === '') ? 1 : pagination.currentPage
      
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
        setPagination(result.pagination || pagination)
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
  }, [year, month, line, tier, searchInput, pagination.currentPage, pagination.recordsPerPage])

  // Handle assignment edit
  const handleAssignmentChange = async (userkey: string, field: 'snr_account' | 'snr_handler', value: string) => {
    const customer = customerData.find(c => c.userkey === userkey)
    if (!customer) return

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
    const customer = customerData.find(c => c.userkey === userkey)
    if (!customer) return

    // If customer already has snr_account in database, clear it via API
    if (customer.snr_account) {
      try {
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
      const response = await fetch('/api/usc-customer-assignment/handler-setup/data', {
        cache: 'no-store'
      })
      
      const result = await response.json()
      
      if (result.success) {
        setHandlerData(result.data || [])
        console.log('✅ Handler data fetched:', result.data?.length || 0)
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
        // Reload handler data
        await fetchHandlerData()
        
        // Remove from editing
        const newEditing = new Map(editingHandlers)
        newEditing.delete(id)
        setEditingHandlers(newEditing)
        
        showToast('Handler saved successfully!', 'success')
      } else {
        showToast(`Error: ${result.error || result.message || 'Failed to save handler'}`, 'error')
      }
    } catch (error) {
      console.error('❌ Error saving handler:', error)
      showToast('Error saving handler', 'error')
    } finally {
      setSavingHandlers(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  // Clear handler
  const handleClearHandler = async (id: string) => {
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
        // Reload handler data
        await fetchHandlerData()
        
        // Remove from editing
        const newEditing = new Map(editingHandlers)
        newEditing.delete(id)
        setEditingHandlers(newEditing)
        
        showToast('Handler cleared successfully!', 'success')
      } else {
        showToast(`Error: ${result.error || result.message || 'Failed to clear handler'}`, 'error')
      }
    } catch (error) {
      console.error('❌ Error clearing handler:', error)
      showToast('Error clearing handler', 'error')
    } finally {
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
      fetchCustomerData()
      setInitialLoadDone(true)
    }
  }, [year, month, initialLoadDone, fetchCustomerData]) // ✅ Hapus line dan tier dari dependency - hanya trigger saat year/month set pertama kali

  // ✅ Fetch data when page changes (pagination only)
  useEffect(() => {
    if (initialLoadDone && year && month) {
      fetchCustomerData()
    }
  }, [pagination.currentPage, initialLoadDone, year, month, fetchCustomerData])

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
    fetchCustomerData()
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
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Unique Code</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'normal',
                        maxWidth: '300px',
                        wordBreak: 'break-word'
                      }}>Traffic</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>LDD</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Days Active</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>ATV</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>PF</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>DC</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>DA</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>WC</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>WA</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>GGR</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Tier</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Assignee</th>
                      <th style={{ 
                        textAlign: 'center',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Handler</th>
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
                    {customerData.map((customer, index) => {
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
                          }}>{customer.last_deposit_date ? new Date(customer.last_deposit_date).toISOString().split('T')[0] : '-'}</td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{formatInteger(customer.days_active)}</td>
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
                                    padding: '6px 10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    backgroundColor: '#ffffff',
                                    minWidth: '120px',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none'
                                  }}
                                >
                                  <option value="">Select SNR</option>
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
                              </div>
                            )}
                          </td>
                          <td style={{ 
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
                        onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
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
                        onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
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
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <Layout customSubHeader={subHeaderContent}>
        {renderPageContent()}
        <ToastComponent />
      </Layout>
    </>
  )
}

