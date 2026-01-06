'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import ComingSoon from '@/components/ComingSoon'
import { getAllowedBrandsFromStorage } from '@/utils/brandAccessHelper'
import { supabase } from '@/lib/supabase'

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

export default function USCCustomerAssignmentPage() {
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

  // Fetch SNR accounts (users with role snr_usc)
  const fetchSNRAccounts = async () => {
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
  }

  // Fetch slicer options from API
  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      
      const userAllowedBrands = getAllowedBrandsFromStorage()
      
      const response = await fetch('/api/usc-customer-assignment/slicer-options', {
        headers: {
          'x-user-allowed-brands': JSON.stringify(userAllowedBrands)
        },
        cache: 'no-store'
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSlicerOptions({
          lines: result.data.lines || [],
          years: result.data.years || [],
          months: result.data.months || [],
          tiers: result.data.tiers || []
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
      }
    } catch (error) {
      console.error('❌ Error fetching slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }

  // Fetch customer data
  const fetchCustomerData = async (overrideSearch?: string) => {
    if (!year || !month) {
      console.log('⏳ Waiting for slicers...')
      return
    }

    try {
      setLoading(true)
      
      // Use overrideSearch if provided, otherwise use searchInput from state
      const searchValue = overrideSearch !== undefined ? overrideSearch : searchInput
      
      const params = new URLSearchParams({
        year,
        month,
        line: line === 'ALL' ? '' : line,
        tier: tier === 'ALL' ? '' : tier,
        page: pagination.currentPage.toString(),
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
  }

  // Handle assignment edit
  const handleAssignmentChange = (userkey: string, field: 'snr_account' | 'snr_handler', value: string) => {
    const customer = customerData.find(c => c.userkey === userkey)
    if (!customer) return

    const current = editingAssignments.get(userkey) || {
      userkey,
      user_unique: customer.user_unique,
      line: customer.line,
      snr_account: customer.snr_account || '',
      snr_handler: customer.snr_handler || ''
    }
    
    const updated = {
      ...current,
      [field]: value
    }
    
    setEditingAssignments(new Map(editingAssignments.set(userkey, updated)))
  }

  // Clear assignment - Reset all changes to default
  const handleClearAssignment = (userkey: string) => {
    const newEditing = new Map(editingAssignments)
    newEditing.delete(userkey)
    setEditingAssignments(newEditing)
  }

  // Save single assignment
  const handleSaveAssignment = async (userkey: string) => {
    const assignment = editingAssignments.get(userkey)
    if (!assignment) return

    if (!assignment.snr_account || !assignment.snr_account.trim()) {
      alert('Please select an SNR Account')
      return
    }

    if (!assignment.snr_handler || !assignment.snr_handler.trim()) {
      alert('Please enter Handler name')
      return
    }

    try {
      setSavingAssignments(prev => new Set(prev).add(userkey))
      
      // Get user from localStorage for assigned_by
      const userStr = localStorage.getItem('nexmax_user')
      const currentUser = userStr ? JSON.parse(userStr) : null

      const customer = customerData.find(c => c.userkey === userkey)
      if (!customer) {
        alert('Customer not found')
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
          snr_account: assignment.snr_account.trim(),
          snr_handler: assignment.snr_handler.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        // Update local data
        setCustomerData(prev => prev.map(c => 
          c.userkey === userkey
            ? {
                ...c,
                snr_account: assignment.snr_account,
                snr_handler: assignment.snr_handler,
                snr_assigned_at: new Date().toISOString(),
                snr_assigned_by: user?.username || null
              }
            : c
        ))
        
        // Remove from editing
        const newEditing = new Map(editingAssignments)
        newEditing.delete(userkey)
        setEditingAssignments(newEditing)
        
        alert('Assignment saved successfully!')
      } else {
        alert(`Error: ${result.error || 'Failed to save assignment'}`)
      }
    } catch (error) {
      console.error('❌ Error saving assignment:', error)
      alert('Error saving assignment')
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
      alert('No changes to save')
      return
    }

    const assignments = Array.from(editingAssignments.values())
    
    // Validate all and ensure user_unique and line are included
    for (const assignment of assignments) {
      if (!assignment.snr_account || !assignment.snr_account.trim()) {
        alert(`Please select SNR Account for ${assignment.userkey}`)
        return
      }
      if (!assignment.snr_handler || !assignment.snr_handler.trim()) {
        alert(`Please enter Handler name for ${assignment.userkey}`)
        return
      }
      // Ensure user_unique and line are included
      if (!assignment.user_unique || !assignment.line) {
        const customer = customerData.find(c => c.userkey === assignment.userkey)
        if (customer) {
          assignment.user_unique = customer.user_unique
          assignment.line = customer.line
        } else {
          alert(`Customer data not found for ${assignment.userkey}`)
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
        // Update local data
        const updatedData = customerData.map(c => {
          const assignment = assignments.find(a => a.userkey === c.userkey)
          if (assignment) {
            return {
              ...c,
              snr_account: assignment.snr_account,
              snr_handler: assignment.snr_handler,
              snr_assigned_at: new Date().toISOString(),
              snr_assigned_by: user?.username || null
            }
          }
          return c
        })
        
        setCustomerData(updatedData)
        setEditingAssignments(new Map())
        alert(`Successfully sent ${assignments.length} assignments!`)
      } else {
        alert(`Error: ${result.error || 'Failed to save assignments'}`)
      }
    } catch (error) {
      console.error('❌ Error bulk saving:', error)
      alert('Error saving assignments')
    } finally {
      setBulkSaving(false)
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
  }, [])

  // Auto-load data ONCE when defaults are set from API (initial load only)
  useEffect(() => {
    if (!initialLoadDone && year && month) {
      console.log('✅ [Customer Assignment] Initial load with defaults:', { line, year, month, tier })
      fetchCustomerData()
      setInitialLoadDone(true)
    }
  }, [line, year, month, tier, initialLoadDone])

  // Auto-fetch data when slicers change (after initial load) - same as other slicers (line, year, month, tier)
  useEffect(() => {
    if (initialLoadDone && year && month) {
      console.log('🔄 [Customer Assignment] Slicers changed, auto-fetching data:', { line, year, month, tier })
      setPagination(prev => ({ ...prev, currentPage: 1 }))
      fetchCustomerData()
    }
  }, [line, year, month, tier])

  // Fetch data when page changes
  useEffect(() => {
    if (initialLoadDone) {
      fetchCustomerData()
    }
  }, [pagination.currentPage])

  // Format number
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }

  // Format integer
  const formatInteger = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-'
    return new Intl.NumberFormat('en-US').format(num)
  }

  // Get editing state for a row
  const getEditingState = (userkey: string) => {
    return editingAssignments.get(userkey) || {
      snr_account: customerData.find(c => c.userkey === userkey)?.snr_account || '',
      snr_handler: customerData.find(c => c.userkey === userkey)?.snr_handler || ''
    }
  }

  // Check if row has unsaved changes
  const hasUnsavedChanges = (userkey: string): boolean => {
    return editingAssignments.has(userkey)
  }

  // Handle apply filters (Search button)
  const handleApplyFilters = () => {
    if (!year || !month) {
      alert('Please select Year and Month')
      return
    }
    setPagination(prev => ({ ...prev, currentPage: 1 }))
    fetchCustomerData()
  }

  // Handle search input key down
  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApplyFilters()
    }
  }

  // Handle clear search - Reset all to default
  const handleClearSearch = () => {
    setSearchInput('')
    // Reset pagination to first page
    setPagination(prev => ({ ...prev, currentPage: 1 }))
    // Fetch all data without search filter immediately (pass empty string)
    if (year && month) {
      fetchCustomerData('')
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
          subtitle: 'Customer Assignment',
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

        {/* Bookmark 2: Customer Assignment (Active) */}
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
          <span>Customer Assignment</span>
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
          <ComingSoon 
            title="Handler Setup"
            subtitle="Manage and assign handlers for SNR accounts"
            message="This feature will allow you to set and manage handlers for each SNR account. You'll be able to assign, update, and track handler assignments easily."
          />
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
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Brand</th>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Unique Code</th>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'normal',
                        maxWidth: '300px',
                        wordBreak: 'break-word'
                      }}>Traffic</th>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>LDD</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Days Active</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>ATV</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>PF</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>DC</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>DA</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>WC</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>WA</th>
                      <th style={{ 
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>GGR</th>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Tier</th>
                      <th style={{ 
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        width: 'auto'
                      }}>Assignee</th>
                      <th style={{ 
                        textAlign: 'left',
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
                          }}>{customer.last_deposit_date ? new Date(customer.last_deposit_date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}</td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{formatInteger(customer.days_active)}</td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{customer.deposit_cases > 0 ? formatNumber(customer.deposit_amount / customer.deposit_cases) : '0.00'}</td>
                          <td style={{ 
                            textAlign: 'right',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>{customer.days_active > 0 ? formatNumber(customer.deposit_cases / customer.days_active) : '0.00'}</td>
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
                            backgroundColor: hasChanges ? '#fef3c7' : 'transparent'
                          }}>
                            <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: '180px' }}>
                              <select
                                value={editing.snr_account || customer.snr_account || ''}
                                onChange={(e) => handleAssignmentChange(customer.userkey, 'snr_account', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 32px 6px 10px',
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
                              {/* Clear Button X - Inside select wrapper */}
                              {(editing.snr_account || customer.snr_account) && (
                                <button
                                  onClick={() => handleClearAssignment(customer.userkey)}
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
                                    transition: 'all 0.2s ease',
                                    zIndex: 10
                                  }}
                                  onMouseEnter={(e) => { 
                                    e.currentTarget.style.color = '#ef4444'
                                    e.currentTarget.style.backgroundColor = '#fee2e2'
                                  }}
                                  onMouseLeave={(e) => { 
                                    e.currentTarget.style.color = '#6b7280'
                                    e.currentTarget.style.backgroundColor = 'transparent'
                                  }}
                                  title="Clear assignment"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </td>
                          <td style={{ 
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px',
                            backgroundColor: hasChanges ? '#fef3c7' : 'transparent'
                          }}>
                            <span style={{
                              fontSize: '13px',
                              color: customer.snr_handler ? '#374151' : '#9ca3af',
                              fontStyle: customer.snr_handler ? 'normal' : 'italic'
                            }}>
                              {customer.snr_handler || '-'}
                            </span>
                          </td>
                          <td style={{ 
                            textAlign: 'center',
                            border: '1px solid #e0e0e0',
                            padding: '8px 12px'
                          }}>
                            {hasChanges && (
                              <button
                                onClick={() => handleSaveAssignment(customer.userkey)}
                                disabled={isSaving}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#3b82f6',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: isSaving ? 'not-allowed' : 'pointer',
                                  opacity: isSaving ? 0.6 : 1
                                }}
                              >
                                {isSaving ? 'Sending...' : 'Send'}
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
                      {bulkSaving ? 'Sending...' : `Send All (${editingAssignments.size})`}
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
    <Layout customSubHeader={subHeaderContent}>
      {renderPageContent()}
    </Layout>
  )
}

