'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import { getAllowedBrandsFromStorage } from '@/utils/brandAccessHelper'
import { supabase } from '@/lib/supabase'

interface CustomerData {
  userkey: string
  user_unique: string
  user_name: string
  unique_code: string
  line: string
  traffic: string
  first_deposit_date: string
  last_deposit_date: string
  deposit_cases: number
  deposit_amount: number
  withdraw_amount: number
  net_profit: number
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
  months: { value: string; label: string }[]
}

interface AssignmentEdit {
  userkey: string
  snr_account: string
  snr_handler: string
}

export default function USCCustomerAssignmentPage() {
  const [line, setLine] = useState('ALL')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchColumn, setSearchColumn] = useState<'user_name' | 'unique_code' | 'userkey'>('user_name')
  
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
    months: []
  })
  
  const [loading, setLoading] = useState(true)
  const [slicerLoading, setSlicerLoading] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [user, setUser] = useState<any>(null)

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

  // Fetch slicer options
  const fetchSlicerOptions = async () => {
    try {
      setSlicerLoading(true)
      
      const userAllowedBrands = getAllowedBrandsFromStorage()
      
      // Fetch lines
      const { data: linesData } = await supabase
        .from('blue_whale_usc')
        .select('line')
        .eq('currency', 'USC')
        .not('line', 'is', null)
      
      const allLines = Array.from(new Set(linesData?.map((r: any) => String(r.line || '')).filter(Boolean) || [])) as string[]
      const filteredLines = userAllowedBrands && userAllowedBrands.length > 0
        ? allLines.filter((line: string) => userAllowedBrands.includes(line))
        : allLines
      
      // Fetch years
      const { data: yearsData } = await supabase
        .from('blue_whale_usc')
        .select('year')
        .eq('currency', 'USC')
        .not('year', 'is', null)
      
      const allYears = Array.from(new Set(yearsData?.map((r: any) => Number(r.year) || 0).filter((y: number) => y > 0) || []))
        .sort((a: number, b: number) => b - a)
      
      // Fetch months
      const months = [
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' }
      ]
      
      setSlicerOptions({
        lines: ['ALL', ...filteredLines],
        years: allYears.map(String),
        months
      })
      
      // Set defaults
      if (!year && allYears.length > 0) {
        setYear(String(allYears[0]))
      }
      if (!month) {
        const currentMonth = new Date().getMonth() + 1
        setMonth(currentMonth.toString())
      }
      
    } catch (error) {
      console.error('❌ Error fetching slicer options:', error)
    } finally {
      setSlicerLoading(false)
    }
  }

  // Fetch customer data
  const fetchCustomerData = async () => {
    if (!year || !month) {
      console.log('⏳ Waiting for slicers...')
      return
    }

    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        year,
        month,
        line: line === 'ALL' ? '' : line,
        page: pagination.currentPage.toString(),
        limit: pagination.recordsPerPage.toString(),
        search: searchInput,
        searchColumn
      })

      const response = await fetch(`/api/usc-customer-assignment/data?${params}`)
      
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
    const current = editingAssignments.get(userkey) || {
      userkey,
      snr_account: customerData.find(c => c.userkey === userkey)?.snr_account || '',
      snr_handler: customerData.find(c => c.userkey === userkey)?.snr_handler || ''
    }
    
    const updated = {
      ...current,
      [field]: value
    }
    
    setEditingAssignments(new Map(editingAssignments.set(userkey, updated)))
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
      
      const response = await fetch('/api/usc-customer-assignment/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userkey,
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
    
    // Validate all
    for (const assignment of assignments) {
      if (!assignment.snr_account || !assignment.snr_account.trim()) {
        alert(`Please select SNR Account for ${assignment.userkey}`)
        return
      }
      if (!assignment.snr_handler || !assignment.snr_handler.trim()) {
        alert(`Please enter Handler name for ${assignment.userkey}`)
        return
      }
    }

    try {
      setBulkSaving(true)
      
      const response = await fetch('/api/usc-customer-assignment/bulk-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        alert(`Successfully saved ${assignments.length} assignments!`)
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

  // Fetch data when filters change
  useEffect(() => {
    if (initialLoadDone && year && month) {
      setPagination(prev => ({ ...prev, currentPage: 1 }))
      fetchCustomerData()
    }
  }, [line, year, month, searchInput, searchColumn])

  // Set initial load done
  useEffect(() => {
    if (year && month && !initialLoadDone) {
      setInitialLoadDone(true)
      fetchCustomerData()
    }
  }, [year, month])

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

  return (
    <Layout>
      <Frame>
        <div style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              Customer Assignment - USC
            </h1>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280' 
            }}>
              Assign customers to SNR Marketing accounts. Select SNR account and enter handler name for each customer.
            </p>
          </div>

          {/* Filters & Search */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            {/* Line Filter */}
            <div style={{ minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                Brand/Line
              </label>
              <select
                value={line}
                onChange={(e) => setLine(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff'
                }}
              >
                {slicerOptions.lines.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div style={{ minWidth: '120px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={slicerLoading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  cursor: slicerLoading ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="">Select Year</option>
                {slicerOptions.years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div style={{ minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                disabled={slicerLoading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  cursor: slicerLoading ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="">Select Month</option>
                {slicerOptions.months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                Search
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={searchColumn}
                  onChange={(e) => setSearchColumn(e.target.value as any)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="user_name">User Name</option>
                  <option value="unique_code">Unique Code</option>
                  <option value="userkey">User Key</option>
                </select>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Bulk Save Button */}
            {editingAssignments.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={handleBulkSave}
                  disabled={bulkSaving}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: bulkSaving ? 'not-allowed' : 'pointer',
                    opacity: bulkSaving ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {bulkSaving ? 'Saving...' : `Save All (${editingAssignments.size})`}
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <StandardLoadingSpinner message="Loading customer data..." />
          ) : (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px'
                }}>
                  <thead style={{
                    backgroundColor: '#f9fafb',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Line</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>User Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Unique Code</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Deposit Cases</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Deposit Amount</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Net Profit</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>SNR Account</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Handler</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerData.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                          No data available
                        </td>
                      </tr>
                    ) : (
                      customerData.map((customer, index) => {
                        const editing = getEditingState(customer.userkey)
                        const hasChanges = hasUnsavedChanges(customer.userkey)
                        const isSaving = savingAssignments.has(customer.userkey)
                        
                        return (
                          <tr
                            key={customer.userkey}
                            style={{
                              backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                              borderBottom: '1px solid #e5e7eb',
                              ...(hasChanges && { backgroundColor: '#fef3c7' })
                            }}
                          >
                            <td style={{ padding: '12px', borderRight: '1px solid #e5e7eb' }}>{customer.line}</td>
                            <td style={{ padding: '12px', borderRight: '1px solid #e5e7eb' }}>{customer.user_name}</td>
                            <td style={{ padding: '12px', borderRight: '1px solid #e5e7eb' }}>{customer.unique_code}</td>
                            <td style={{ padding: '12px', textAlign: 'right', borderRight: '1px solid #e5e7eb' }}>{formatInteger(customer.deposit_cases)}</td>
                            <td style={{ padding: '12px', textAlign: 'right', borderRight: '1px solid #e5e7eb' }}>{formatNumber(customer.deposit_amount)}</td>
                            <td style={{ padding: '12px', textAlign: 'right', borderRight: '1px solid #e5e7eb' }}>{formatNumber(customer.net_profit)}</td>
                            <td style={{ padding: '12px', borderRight: '1px solid #e5e7eb' }}>
                              <select
                                value={editing.snr_account}
                                onChange={(e) => handleAssignmentChange(customer.userkey, 'snr_account', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  fontSize: '13px',
                                  backgroundColor: '#ffffff',
                                  minWidth: '150px'
                                }}
                              >
                                <option value="">Select SNR Account</option>
                                {snrAccounts.map(account => (
                                  <option key={account.username} value={account.username}>
                                    {account.username}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '12px', borderRight: '1px solid #e5e7eb' }}>
                              <input
                                type="text"
                                value={editing.snr_handler}
                                onChange={(e) => handleAssignmentChange(customer.userkey, 'snr_handler', e.target.value)}
                                placeholder="Enter handler name"
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  fontSize: '13px',
                                  minWidth: '120px'
                                }}
                              />
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
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
                                  {isSaving ? 'Saving...' : 'Save'}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div style={{
                  padding: '16px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Showing {((pagination.currentPage - 1) * pagination.recordsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.recordsPerPage, pagination.totalRecords)} of {formatInteger(pagination.totalRecords)} records
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                      disabled={!pagination.hasPrevPage}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: pagination.hasPrevPage ? '#ffffff' : '#f3f4f6',
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
                        borderRadius: '4px',
                        backgroundColor: pagination.hasNextPage ? '#ffffff' : '#f3f4f6',
                        color: pagination.hasNextPage ? '#374151' : '#9ca3af',
                        cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
                        fontSize: '13px'
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Frame>
    </Layout>
  )
}
