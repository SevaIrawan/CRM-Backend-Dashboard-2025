'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'

// Sidebar width constants
const SIDEBAR_EXPANDED_WIDTH = '280px'
const SIDEBAR_COLLAPSED_WIDTH = '80px'

// Hook to detect sidebar state (same as StandardModal)
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

interface Customer {
  unique_code: string | null
  user_name: string | null
  line: string | null // ✅ Add line/brand field
  handler: string | null
  da: number
  ggr: number
  atv: number
  assigne: string | null
}

interface TierMovementCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  fromTier: number
  toTier: number
  fromTierName: string
  toTierName: string
  currentYear: string
  currentMonth: string
  previousYear: string
  previousMonth: string
  periodAStart?: string | null
  periodAEnd?: string | null
  periodBStart?: string | null
  periodBEnd?: string | null
  line: string
  squadLead: string
  channel: string
}

export default function TierMovementCustomerModal({
  isOpen,
  onClose,
  fromTier,
  toTier,
  fromTierName,
  toTierName,
  currentYear,
  currentMonth,
  previousYear,
  previousMonth,
  periodAStart,
  periodAEnd,
  periodBStart,
  periodBEnd,
  line,
  squadLead,
  channel
}: TierMovementCustomerModalProps) {
  // ✅ Get current sidebar width (responsive to collapse/expand)
  const sidebarWidth = useSidebarState()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [totalRecords, setTotalRecords] = useState(0) // ✅ WAJIB: Total count dari API (data.count), bukan customers.length
  const [error, setError] = useState<string | null>(null)
  const [movementType, setMovementType] = useState<'UPGRADE' | 'DOWNGRADE' | 'STABLE'>('STABLE')
  const [assignments, setAssignments] = useState<Record<number, string>>({}) // customer index -> handler
  
  // ✅ Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10) // Default 10 rows per page
  const [exporting, setExporting] = useState(false)

  // Handler options (hardcoded for now, will be dynamic later)
  const handlerOptions = ['Select...', 'Handler 1', 'Handler 2', 'Handler 3', 'Handler 4', 'Handler 5']
  
  // ✅ Pagination options: 10, 20, 50, 100
  const paginationOptions = [10, 20, 50, 100]
  
  // ✅ Standard: Total baris = 11 (1 header + 10 data rows) = 462px WAJIB
  // ✅ Cell height = 28px dengan padding dan line-height yang disesuaikan
  // ✅ Perhitungan: Container 462px dengan border 2px = 460px efektif
  // ✅ Cell height = 28px untuk memastikan semua muat (28px × 11 = 308px < 460px) - LEBIH AMAN
  const STANDARD_DATA_ROWS = 10 // Data rows (bukan termasuk header)
  const CELL_HEIGHT = 28 // ✅ Cell height = 28px untuk header DAN data (SAMA PERSIS)
  const MAX_TABLE_HEIGHT = 462 // ✅ Container tetap 462px total (28px × 11 = 308px PASTI muat)
  const CELL_PADDING = '4px 12px' // ✅ Padding kecil: 4px top/bottom + 12px left/right
  const CELL_LINE_HEIGHT = '20px' // ✅ Line height = 20px agar muat di 28px dengan padding
  
  // ✅ Calculate pagination (limit digunakan untuk pagination calculation)
  // ✅ totalRecords sudah di-set dari API data.count (bukan customers.length)
  const totalPages = Math.ceil(totalRecords / limit)
  const startIndex = (page - 1) * limit
  // ✅ FIX: Gunakan customers.length BUKAN totalRecords untuk slice (karena customers array mungkin tidak berisi semua data)
  // ✅ FIX: Gunakan Math.min dengan customers.length untuk slice (karena customers array adalah data yang tersedia)
  // Tapi untuk display pagination, tetap gunakan totalRecords
  const endIndexForSlice = Math.min(startIndex + limit, customers.length)
  const endIndexForDisplay = Math.min(startIndex + limit, totalRecords)

  // ✅ Get paginated data sesuai limit (untuk pagination calculation)
  // ✅ FIX: Gunakan endIndexForSlice untuk slice customers array (karena customers array adalah data yang tersedia)
  const paginatedCustomers = customers.slice(startIndex, endIndexForSlice)
  
  // ✅ DEBUG: Log pagination calculation
  if (isOpen && customers.length > 0) {
    console.log('🔍 [PAGINATION DEBUG]:', {
      customersTotalLength: customers.length,
      totalRecords,
      limit,
      page,
      startIndex,
      endIndex: endIndexForDisplay,
      calculatedSlice: customers.slice(startIndex, endIndexForSlice),
      paginatedCustomersLength: paginatedCustomers.length,
      paginatedCustomersActual: paginatedCustomers
    })
  }
  
  // ✅ Calculate table height berdasarkan PERMINTAAN USER:
  // - Total baris = 11 (1 header + 10 data rows) = 462px WAJIB
  // - Jika limit >= 10: SELALU gunakan tinggi 462px (11 rows) - TIDAK peduli actualDataRows
  // - Jika limit < 10: tinggi auto (ikut jumlah row yang ada)
  const actualDataRows = paginatedCustomers.length
  
  // ✅ WAJIB: Jika limit >= 10, SELALU gunakan 462px untuk memastikan 10 rows terlihat
  // ✅ WAJIB: Jika limit < 10, tinggi auto = header + (jumlah data rows × 28px)
  const tableHeight = limit >= STANDARD_DATA_ROWS
    ? MAX_TABLE_HEIGHT // 462px WAJIB untuk 11 rows (1 header + 10 data) - SELALU jika limit >= 10
    : CELL_HEIGHT + (actualDataRows * CELL_HEIGHT) // Auto height jika limit < 10 (header 28px + data rows)
  
  // ✅ Scroll logic: scroll muncul jika data > 10 rows
  const shouldShowScroll = actualDataRows > STANDARD_DATA_ROWS
  
  // ✅ DEBUG: Log untuk memastikan data dan tinggi benar - PROMINENT LOG
  useEffect(() => {
    if (isOpen && customers.length > 0) {
      console.log('═══════════════════════════════════════════════════════════')
      console.log('🔍 [TIER MOVEMENT MODAL] DEBUG INFO:')
      console.log('═══════════════════════════════════════════════════════════')
      console.log('📊 Pagination:', { limit, page, totalRecords, startIndex, endIndex: endIndexForDisplay })
      console.log('📦 Data:', { 
        customersLength: customers.length, 
        paginatedCustomersLength: paginatedCustomers.length,
        actualDataRows 
      })
      console.log('📏 Height:', { 
        tableHeight: limit >= STANDARD_DATA_ROWS ? MAX_TABLE_HEIGHT : CELL_HEIGHT + (actualDataRows * CELL_HEIGHT),
        MAX_TABLE_HEIGHT,
        CELL_HEIGHT,
        STANDARD_DATA_ROWS,
        limit,
        shouldShowScroll
      })
      console.log('═══════════════════════════════════════════════════════════')
      
      // ✅ WARNING jika paginatedCustomers.length tidak sesuai limit
      if (limit >= STANDARD_DATA_ROWS && paginatedCustomers.length < STANDARD_DATA_ROWS) {
        console.warn('⚠️ WARNING: paginatedCustomers.length < STANDARD_DATA_ROWS!', {
          expected: STANDARD_DATA_ROWS,
          actual: paginatedCustomers.length,
          customersLength: customers.length,
          startIndex,
          endIndex: endIndexForDisplay
        })
      }
    }
  }, [isOpen, limit, page, totalRecords, customers.length, startIndex, endIndexForSlice, endIndexForDisplay, paginatedCustomers.length, actualDataRows, shouldShowScroll])
  
  // ✅ Reset page when limit changes or customers change
  useEffect(() => {
    setPage(1)
  }, [limit, customers.length])

  // Format number with thousand separator
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)
  }

  // Format number without decimals
  const formatInteger = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  // Fetch customer data
  useEffect(() => {
    if (!isOpen) {
      // ✅ Reset state saat modal ditutup
      setCustomers([])
      setTotalRecords(0)
      setPage(1)
      return
    }

    const fetchCustomers = async () => {
      setLoading(true)
      setError(null)
      setTotalRecords(0) // ✅ Reset totalRecords sebelum fetch

      try {
        // Validate required parameters
        if (!currentYear || !currentMonth || !previousYear || !previousMonth) {
          throw new Error('Period data is missing. Please refresh the page and try again.')
        }

        const params = new URLSearchParams({
          fromTier: fromTier.toString(),
          toTier: toTier.toString(),
          line: line || 'All',
          squadLead: squadLead || 'All',
          channel: channel || 'All'
        })
        
        // Use date range format if available (same as Customer Tier Trends)
        if (periodAStart && periodAEnd && periodBStart && periodBEnd) {
          params.append('periodAStart', periodAStart)
          params.append('periodAEnd', periodAEnd)
          params.append('periodBStart', periodBStart)
          params.append('periodBEnd', periodBEnd)
        } else {
          // Fallback to year/month format (backward compatibility)
          params.append('currentYear', currentYear)
          params.append('currentMonth', currentMonth)
          params.append('previousYear', previousYear)
          params.append('previousMonth', previousMonth)
        }

        console.log('📊 [Tier Movement Customer Modal] Fetching customers with params:', {
          fromTier,
          toTier,
          periodAStart,
          periodAEnd,
          periodBStart,
          periodBEnd,
          currentYear,
          currentMonth,
          previousYear,
          previousMonth,
          line,
          squadLead,
          channel
        })

        const apiUrl = `/api/usc-business-performance/tier-movement-customers?${params}`
        console.log('📡 [Tier Movement Customer Modal] API URL:', apiUrl)

        // ✅ Add timeout and better error handling for fetch
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

        let response: Response
        try {
          response = await fetch(apiUrl, {
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json'
            }
          })
          clearTimeout(timeoutId)
        } catch (fetchError: any) {
          clearTimeout(timeoutId)
          
          // ✅ Handle different types of fetch errors
          if (fetchError.name === 'AbortError') {
            console.error('❌ [Tier Movement Customer Modal] Request timeout (60s exceeded)')
            throw new Error('Request timeout. The server took too long to respond. Please try again.')
          } else if (fetchError.message?.includes('fetch failed') || fetchError.message?.includes('NetworkError')) {
            console.error('❌ [Tier Movement Customer Modal] Network error:', fetchError)
            throw new Error('Network error. Please check your internet connection and try again.')
          } else {
            console.error('❌ [Tier Movement Customer Modal] Fetch error:', fetchError)
            throw new Error(`Failed to connect to server: ${fetchError.message || 'Unknown error'}`)
          }
        }

        if (!response.ok) {
          let errorMessage = 'Failed to fetch customers'
          let errorDetails = ''
          let errorCode = ''
          let errorHint = ''
          
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
            errorDetails = errorData.details || ''
            errorCode = errorData.code || ''
            errorHint = errorData.hint || ''
            
            console.error('❌ [Tier Movement Customer Modal] API Error Response:', {
              status: response.status,
              statusText: response.statusText,
              error: errorMessage,
              details: errorDetails,
              code: errorCode,
              hint: errorHint
            })
          } catch (e) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
            console.error('❌ [Tier Movement Customer Modal] Failed to parse error response:', e)
          }
          
          // Provide more specific error message
          if (errorDetails) {
            const fullError = errorHint 
              ? `${errorMessage}: ${errorDetails} (Hint: ${errorHint})`
              : `${errorMessage}: ${errorDetails}`
            throw new Error(fullError)
          } else {
            throw new Error(errorMessage)
          }
        }

        let data: any
        try {
          data = await response.json()
        } catch (parseError: any) {
          console.error('❌ [Tier Movement Customer Modal] Failed to parse JSON response:', parseError)
          throw new Error('Invalid response from server. Please try again.')
        }

        console.log('✅ [Tier Movement Customer Modal] Received data:', {
          count: data.count || 0,
          movementType: data.movementType,
          customersLength: data.customers?.length || 0
        })
        
        // ✅ Validate response structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format from server')
        }

        // ✅ DEBUG: Log sebelum set state
        console.log('🔍 [Tier Movement Customer Modal] BEFORE SET STATE:', {
          apiCount: data.count,
          apiCustomersLength: data.customers?.length,
          apiCustomersArray: data.customers
        })

        // ✅ WAJIB: Set totalRecords dari API count (bukan dari customers.length)
        setTotalRecords(data.count || 0)
        setCustomers(data.customers || [])
        setMovementType(data.movementType || 'STABLE')
        
        // ✅ DEBUG: Log setelah set state (akan muncul di render berikutnya)
        console.log('🔍 [Tier Movement Customer Modal] STATE SET - will appear in next render')

        // Initialize assignments with existing handler values
        const initialAssignments: Record<number, string> = {}
        data.customers?.forEach((customer: Customer, index: number) => {
          initialAssignments[index] = customer.assigne || 'Select...'
        })
        setAssignments(initialAssignments)
      } catch (err: any) {
        console.error('❌ [Tier Movement Customer Modal] Error fetching customers:', err)
        console.error('Error details:', {
          name: err?.name,
          message: err?.message,
          stack: err?.stack
        })
        
        // ✅ Provide user-friendly error message
        let errorMessage = 'Failed to load customers'
        if (err?.message) {
          errorMessage = err.message
        } else if (err?.name === 'TypeError' && err?.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        }
        
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [isOpen, fromTier, toTier, currentYear, currentMonth, previousYear, previousMonth, periodAStart, periodAEnd, periodBStart, periodBEnd, line, squadLead, channel])

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle assignment change (index is paginated index, need to convert to global)
  const handleAssignmentChange = (paginatedIndex: number, value: string) => {
    const globalIndex = startIndex + paginatedIndex
    setAssignments(prev => ({
      ...prev,
      [globalIndex]: value
    }))
  }

  // Handle send button click
  const handleSend = (index: number) => {
    const handler = assignments[startIndex + index] // Use global index
    if (!handler || handler === 'Select...') {
      alert('Please select a handler first')
      return
    }

    // TODO: Implement API call to save assignment
    const customer = paginatedCustomers[index]
    console.log('Sending assignment:', {
      customer: customer,
      handler
    })

    alert(`Assignment sent: ${customer.unique_code} → ${handler}`)
  }
  
  // ✅ Export CSV function
  const handleExport = async () => {
    if (customers.length === 0) return
    
    try {
      setExporting(true)
      
      // Headers
      const headers = [
        'Line/Brand',
        'Unique Code',
        'User Name',
        'Handler',
        'DA',
        'GGR',
        'ATV',
        'Assigne'
      ]
      
      let csvContent = headers.join(',') + '\n'
      
      // Export all customers (not just paginated)
      customers.forEach((customer, idx) => {
        csvContent += [
          customer.line || '-',
          customer.unique_code || '-',
          customer.user_name || '-',
          customer.handler || '-',
          formatNumber(customer.da),
          formatNumber(customer.ggr),
          formatNumber(customer.atv),
          assignments[idx] || '-'
        ].join(',') + '\n'
      })
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Generate filename with tier movement info
      const filename = `tier-movement-${fromTierName.replace(/\s+/g, '-')}-to-${toTierName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
      a.download = filename
      
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

  // Get movement type color
  const getMovementTypeColor = () => {
    if (movementType === 'UPGRADE') return '#10B981' // Green
    if (movementType === 'DOWNGRADE') return '#EC4899' // Pink
    return '#3B82F6' // Blue
  }

  // Get movement type label
  const getMovementTypeLabel = () => {
    if (movementType === 'UPGRADE') return 'Upgrade'
    if (movementType === 'DOWNGRADE') return 'Downgrade'
    return 'Stable'
  }

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: '150px',
        left: sidebarWidth, // ✅ Dynamic left position based on sidebar state
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001, // ✅ Higher z-index for nested modal
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' // ✅ Smooth transition matching sidebar
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          width: '95%',
          maxWidth: '1200px',
          maxHeight: '90vh', // ✅ Gunakan viewport height langsung tanpa offset
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'visible' // ✅ Ubah dari hidden jadi visible agar tidak memotong konten
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #4B5563',
            backgroundColor: '#374151', // ✅ Dark background seperti standard popup
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          {/* ✅ Left: Title & Subtitle (Gambar 2) */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#FFFFFF', // ✅ White text untuk contrast dengan dark background
                margin: 0,
                marginBottom: '4px'
              }}
            >
              Customer List
            </h2>
            <p
              style={{
                fontSize: '12px',
                color: '#D1D5DB', // ✅ Light gray text untuk subtitle
                margin: 0
              }}
            >
              View detailed customer information for this tier movement
            </p>
          </div>
          
          {/* ✅ Right: Period A → Period B (Gambar 1) - Sejajar dengan Title */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px',
              backgroundColor: '#4B5563', // ✅ Darker background untuk kontras dengan header dark
              borderRadius: '8px',
              border: '1px solid #6B7280',
              alignSelf: 'flex-start' // Align to top to match title
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '100px' }}>
              <span style={{ fontSize: '11px', color: '#D1D5DB', fontWeight: 500 }}>
                Period A
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF' }}>
                {fromTierName}
              </span>
            </div>
            <span style={{ fontSize: '18px', color: '#D1D5DB', fontWeight: 300 }}>→</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '100px' }}>
              <span style={{ fontSize: '11px', color: '#D1D5DB', fontWeight: 500 }}>
                Period B
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF' }}>
                {toTierName}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#374151',
                  backgroundColor: '#FFFFFF',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #E5E7EB'
                }}
              >
                {customers.length} customers
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: getMovementTypeColor(),
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
              >
                {getMovementTypeLabel()}
              </span>
            </div>
          </div>
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
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', padding: '24px' }}>
              <StandardLoadingSpinner message="Loading customer data..." />
            </div>
          ) : error ? (
            <div
              style={{
                padding: '24px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                color: '#991B1B',
                margin: '24px'
              }}
            >
              Error: {error}
            </div>
          ) : customers.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6B7280'
              }}
            >
              No customers found for this tier movement.
            </div>
          ) : (
            <>
              {/* ✅ Table Container - FIX: Hapus flex constraint yang membatasi */}
              <div style={{ 
                padding: '20px 24px'
              }}>
                <div style={{
                  overflowX: 'auto',
                  overflowY: shouldShowScroll ? 'auto' : 'hidden', // ✅ Scroll muncul jika data > 10 rows
                  height: limit >= STANDARD_DATA_ROWS ? `${MAX_TABLE_HEIGHT}px` : `${tableHeight}px`, // ✅ Gunakan tableHeight yang sudah dihitung
                  position: 'relative',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
                  boxSizing: 'border-box'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }}>
                      <thead
                        style={{
                          backgroundColor: '#374151'
                        }}
                      >
                  <tr style={{ height: `${CELL_HEIGHT}px` }}>
                    <th
                      style={{
                        padding: CELL_PADDING,
                        textAlign: 'center', // ✅ Semua header rata tengah
                        backgroundColor: '#374151', // ✅ Dark background
                        borderBottom: '1px solid #4B5563',
                        borderRight: '1px solid #4B5563',
                        fontWeight: 600,
                        color: '#FFFFFF', // ✅ White text
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000, // ✅ Higher z-index untuk freeze
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                        minHeight: `${CELL_HEIGHT}px`, // ✅ Paksa min height
                        maxHeight: `${CELL_HEIGHT}px`, // ✅ Paksa max height
                        lineHeight: CELL_LINE_HEIGHT,
                        verticalAlign: 'middle',
                        boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                      }}
                    >
                      Brand
                    </th>
                    <th
                      style={{
                        padding: CELL_PADDING,
                        textAlign: 'center', // ✅ Semua header rata tengah
                        backgroundColor: '#374151', // ✅ Dark background
                        borderBottom: '1px solid #4B5563',
                        borderRight: '1px solid #4B5563',
                        fontWeight: 600,
                        color: '#FFFFFF', // ✅ White text
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000, // ✅ Higher z-index untuk freeze
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                        minHeight: `${CELL_HEIGHT}px`, // ✅ Paksa min height
                        maxHeight: `${CELL_HEIGHT}px`, // ✅ Paksa max height
                        lineHeight: CELL_LINE_HEIGHT,
                        verticalAlign: 'middle',
                        boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                      }}
                    >
                      Unique Code
                    </th>
                    <th
                      style={{
                        padding: CELL_PADDING,
                        textAlign: 'center', // ✅ Semua header rata tengah
                        backgroundColor: '#374151', // ✅ Dark background
                        borderBottom: '1px solid #4B5563',
                        borderRight: '1px solid #4B5563',
                        fontWeight: 600,
                        color: '#FFFFFF', // ✅ White text
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000, // ✅ Higher z-index untuk freeze
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                        minHeight: `${CELL_HEIGHT}px`, // ✅ Paksa min height
                        maxHeight: `${CELL_HEIGHT}px`, // ✅ Paksa max height
                        lineHeight: CELL_LINE_HEIGHT,
                        verticalAlign: 'middle',
                        boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                      }}
                    >
                      User Name
                    </th>
                    <th
                      style={{
                        padding: CELL_PADDING,
                        textAlign: 'center', // ✅ Semua header rata tengah
                        backgroundColor: '#374151', // ✅ Dark background
                        borderBottom: '1px solid #4B5563',
                        borderRight: '1px solid #4B5563',
                        fontWeight: 600,
                        color: '#FFFFFF', // ✅ White text
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000, // ✅ Higher z-index untuk freeze
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                        minHeight: `${CELL_HEIGHT}px`, // ✅ Paksa min height
                        maxHeight: `${CELL_HEIGHT}px`, // ✅ Paksa max height
                        lineHeight: CELL_LINE_HEIGHT,
                        verticalAlign: 'middle',
                        boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                      }}
                    >
                      Handler
                    </th>
                    <th
                      style={{
                        padding: CELL_PADDING,
                        textAlign: 'center', // ✅ Semua header rata tengah
                        backgroundColor: '#374151', // ✅ Dark background
                        borderBottom: '1px solid #4B5563',
                        borderRight: '1px solid #4B5563',
                        fontWeight: 600,
                        color: '#FFFFFF', // ✅ White text
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000, // ✅ Higher z-index untuk freeze
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                        minHeight: `${CELL_HEIGHT}px`, // ✅ Paksa min height
                        maxHeight: `${CELL_HEIGHT}px`, // ✅ Paksa max height
                        lineHeight: CELL_LINE_HEIGHT,
                        verticalAlign: 'middle',
                        boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                      }}
                    >
                      DA
                    </th>
                    <th
                      style={{
                        padding: CELL_PADDING,
                        textAlign: 'center', // ✅ Semua header rata tengah
                        backgroundColor: '#374151', // ✅ Dark background
                        borderBottom: '1px solid #4B5563',
                        borderRight: '1px solid #4B5563',
                        fontWeight: 600,
                        color: '#FFFFFF', // ✅ White text
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000, // ✅ Higher z-index untuk freeze
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                        minHeight: `${CELL_HEIGHT}px`, // ✅ Paksa min height
                        maxHeight: `${CELL_HEIGHT}px`, // ✅ Paksa max height
                        lineHeight: CELL_LINE_HEIGHT,
                        verticalAlign: 'middle',
                        boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                      }}
                    >
                      GGR
                    </th>
                    <th
                      style={{
                        padding: CELL_PADDING,
                        textAlign: 'center', // ✅ Semua header rata tengah
                        backgroundColor: '#374151', // ✅ Dark background
                        borderBottom: '1px solid #4B5563',
                        borderRight: '1px solid #4B5563',
                        fontWeight: 600,
                        color: '#FFFFFF', // ✅ White text
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000, // ✅ Higher z-index untuk freeze
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                        minHeight: `${CELL_HEIGHT}px`, // ✅ Paksa min height
                        maxHeight: `${CELL_HEIGHT}px`, // ✅ Paksa max height
                        lineHeight: CELL_LINE_HEIGHT,
                        verticalAlign: 'middle',
                        boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                      }}
                    >
                      ATV
                    </th>
                    <th
                      style={{
                        padding: CELL_PADDING,
                        textAlign: 'center', // ✅ Rata tengah untuk header Assigne
                        backgroundColor: '#374151', // ✅ Dark background
                        borderBottom: '1px solid #4B5563',
                        borderRight: '1px solid #4B5563',
                        fontWeight: 600,
                        color: '#FFFFFF', // ✅ White text
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000, // ✅ Higher z-index untuk freeze
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                        minHeight: `${CELL_HEIGHT}px`, // ✅ Paksa min height
                        maxHeight: `${CELL_HEIGHT}px`, // ✅ Paksa max height
                        lineHeight: CELL_LINE_HEIGHT,
                        verticalAlign: 'middle',
                        boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                      }}
                    >
                      Assigne
                    </th>
                    <th
                      style={{
                        padding: CELL_PADDING,
                        textAlign: 'center', // ✅ Rata tengah untuk header Action
                        backgroundColor: '#374151', // ✅ Dark background
                        borderBottom: '1px solid #4B5563',
                        fontWeight: 600,
                        color: '#FFFFFF', // ✅ White text
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000, // ✅ Higher z-index untuk freeze
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                        minHeight: `${CELL_HEIGHT}px`, // ✅ Paksa min height
                        maxHeight: `${CELL_HEIGHT}px`, // ✅ Paksa max height
                        lineHeight: CELL_LINE_HEIGHT,
                        verticalAlign: 'middle',
                        boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                      }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                    <tbody>
                      {paginatedCustomers.map((customer, index) => {
                        // ✅ DEBUG: Log untuk setiap row yang di-render
                        if (index === 0 && isOpen) {
                          console.log(`✅ Rendering ${paginatedCustomers.length} rows in tbody`)
                        }
                        return (
                    <tr
                      key={startIndex + index}
                      style={{
                        height: `${CELL_HEIGHT}px`, // ✅ Pastikan row height sama dengan header
                        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                        borderBottom: '1px solid #E5E7EB',
                        borderLeft: '1px solid #E5E7EB',
                        borderRight: '1px solid #E5E7EB'
                      }}
                    >
                      <td
                        style={{
                          padding: CELL_PADDING,
                          color: '#1F2937',
                          fontWeight: 500,
                          borderRight: '1px solid #E5E7EB',
                          height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                          minHeight: `${CELL_HEIGHT}px`, // ✅ Paksa min height
                          maxHeight: `${CELL_HEIGHT}px`, // ✅ Paksa max height
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                        }}
                      >
                        {customer.line || '-'}
                      </td>
                      <td
                        style={{
                          padding: CELL_PADDING,
                          color: '#1F2937',
                          borderRight: '1px solid #E5E7EB',
                          height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                        }}
                      >
                        {customer.unique_code || '-'}
                      </td>
                      <td
                        style={{
                          padding: CELL_PADDING,
                          color: '#1F2937',
                          borderRight: '1px solid #E5E7EB',
                          height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                        }}
                      >
                        {customer.user_name || '-'}
                      </td>
                      <td
                        style={{
                          padding: CELL_PADDING,
                          color: '#6B7280',
                          borderRight: '1px solid #E5E7EB',
                          height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                        }}
                      >
                        {customer.handler || '-'}
                      </td>
                      <td
                        style={{
                          padding: CELL_PADDING,
                          textAlign: 'right',
                          color: '#1F2937',
                          borderRight: '1px solid #E5E7EB',
                          height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                        }}
                      >
                        {formatNumber(customer.da)}
                      </td>
                      <td
                        style={{
                          padding: CELL_PADDING,
                          textAlign: 'right',
                          color: '#1F2937',
                          borderRight: '1px solid #E5E7EB',
                          height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                        }}
                      >
                        {formatNumber(customer.ggr)}
                      </td>
                      <td
                        style={{
                          padding: CELL_PADDING,
                          textAlign: 'right',
                          color: '#1F2937',
                          borderRight: '1px solid #E5E7EB',
                          height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                        }}
                      >
                        {formatNumber(customer.atv)}
                      </td>
                      <td
                        style={{
                          padding: CELL_PADDING,
                          textAlign: 'center', // ✅ Rata tengah untuk kolom Assigne
                          borderRight: '1px solid #E5E7EB',
                          height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                        }}
                      >
                        <select
                          value={assignments[startIndex + index] || 'Select...'}
                          onChange={(e) => handleAssignmentChange(index, e.target.value)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '13px',
                            backgroundColor: '#FFFFFF',
                            color: '#1F2937',
                            cursor: 'pointer',
                            minWidth: '120px'
                          }}
                        >
                          {handlerOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        style={{
                          padding: CELL_PADDING,
                          textAlign: 'center',
                          height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                          lineHeight: CELL_LINE_HEIGHT,
                          verticalAlign: 'middle',
                          boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                          // No borderRight for last column
                        }}
                      >
                        <button
                          onClick={() => handleSend(index)}
                          disabled={!assignments[startIndex + index] || assignments[startIndex + index] === 'Select...'}
                          style={{
                            padding: '6px 16px',
                            backgroundColor: (!assignments[startIndex + index] || assignments[startIndex + index] === 'Select...') ? '#F3F4F6' : '#3B82F6',
                            color: (!assignments[startIndex + index] || assignments[startIndex + index] === 'Select...') ? '#9CA3AF' : '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: (!assignments[startIndex + index] || assignments[startIndex + index] === 'Select...') ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (assignments[startIndex + index] && assignments[startIndex + index] !== 'Select...') {
                              e.currentTarget.style.backgroundColor = '#2563EB'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (assignments[startIndex + index] && assignments[startIndex + index] !== 'Select...') {
                              e.currentTarget.style.backgroundColor = '#3B82F6'
                            }
                          }}
                        >
                          Send
                        </button>
                      </td>
                    </tr>
                      )
                      })}
                </tbody>
              </table>
                </div>
              </div>
              
              {/* ✅ Footer: Back Button, Pagination & Export */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0
                }}
              >
                {/* Left: Back Button, Showing Info & Limit Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* ✅ Back Button */}
                  <button
                    onClick={onClose}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6B7280',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#4B5563'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#6B7280'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 12L6 8L10 4" />
                    </svg>
                    Back
                  </button>
                  
                  <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
                    Showing {totalRecords > 0 ? startIndex + 1 : 0} - {endIndexForDisplay} of {totalRecords} data
                  </span>
                  {totalRecords > 0 && (
                    <select
                      value={limit}
                      onChange={(e) => {
                        const newLimit = Number(e.target.value)
                        setLimit(newLimit)
                        setPage(1) // Reset to first page
                      }}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: 'white',
                        color: '#374151',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {paginationOptions.map(opt => (
                        <option key={opt} value={opt}>{opt} per page</option>
                      ))}
                    </select>
                  )}
                </div>
                
                {/* Right: Pagination Controls & Export */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '13px',
                          backgroundColor: page === 1 ? '#F9FAFB' : 'white',
                          color: page === 1 ? '#9CA3AF' : '#374151',
                          cursor: page === 1 ? 'not-allowed' : 'pointer',
                          fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (page !== 1) {
                            e.currentTarget.style.borderColor = '#9CA3AF'
                            e.currentTarget.style.backgroundColor = '#F9FAFB'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (page !== 1) {
                            e.currentTarget.style.borderColor = '#D1D5DB'
                            e.currentTarget.style.backgroundColor = 'white'
                          }
                        }}
                      >
                        Previous
                      </button>
                      
                      <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500, minWidth: '60px', textAlign: 'center' }}>
                        Page {page} of {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '13px',
                          backgroundColor: page === totalPages ? '#F9FAFB' : 'white',
                          color: page === totalPages ? '#9CA3AF' : '#374151',
                          cursor: page === totalPages ? 'not-allowed' : 'pointer',
                          fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (page !== totalPages) {
                            e.currentTarget.style.borderColor = '#9CA3AF'
                            e.currentTarget.style.backgroundColor = '#F9FAFB'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (page !== totalPages) {
                            e.currentTarget.style.borderColor = '#D1D5DB'
                            e.currentTarget.style.backgroundColor = 'white'
                          }
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                  
                  {/* Export Button */}
                  <button
                    onClick={handleExport}
                    disabled={exporting || customers.length === 0}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: exporting || customers.length === 0 ? '#F3F4F6' : '#10B981',
                      color: exporting || customers.length === 0 ? '#9CA3AF' : '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: exporting || customers.length === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      if (!exporting && customers.length > 0) {
                        e.currentTarget.style.backgroundColor = '#059669'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!exporting && customers.length > 0) {
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
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

