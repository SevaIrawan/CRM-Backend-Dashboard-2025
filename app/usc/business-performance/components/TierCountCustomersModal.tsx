'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrencyKPI, formatIntegerKPI, formatPercentageKPI } from '@/lib/formatHelpers'

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
  line: string
  update_unique_code: string
  user_name: string
  last_deposit_date: string | null
  daysActive: number
  atv: number
  pf: number
  dc: number
  da: number
  wc: number
  wa: number
  ggr: number
  winrate: number
  tier: string
}

interface TierCountCustomersModalProps {
  isOpen: boolean
  onClose: () => void
  tierName: string
  period: 'A' | 'B'
  startDate: string
  endDate: string
  brand: string
  squadLead: string
  channel: string
}

export default function TierCountCustomersModal({
  isOpen,
  onClose,
  tierName,
  period,
  startDate,
  endDate,
  brand,
  squadLead,
  channel
}: TierCountCustomersModalProps) {
  const sidebarWidth = useSidebarState()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [exporting, setExporting] = useState(false)

  // ✅ Standard: Total baris = 11 (1 header + 10 data rows)
  // ✅ CELL_HEIGHT = 42px (JANGAN KURANG!!!)
  // ✅ TAMBAH tinggi table container agar 10 rows PENUH tidak terpotong
  const STANDARD_DATA_ROWS = 10 // Data rows (bukan termasuk header)
  const CELL_HEIGHT = 42 // ✅ WAJIB 42px (JANGAN KURANG!!!)
  const MAX_TABLE_HEIGHT = 520 // ✅ TAMBAH jadi 520px agar 10 data rows PENUH tidak terpotong (42px × 11 + buffer untuk border/padding)
  const CELL_PADDING = '8px 12px' // ✅ Padding untuk cell 42px
  const CELL_LINE_HEIGHT = '26px' // ✅ Line height untuk cell 42px

  // Fetch customers
  useEffect(() => {
    if (!isOpen || !tierName || !startDate || !endDate) {
      setCustomers([])
      setTotal(0)
      setError(null)
      return
    }

    const fetchCustomers = async () => {
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
          tierName,
          startDate,
          endDate,
          brand: brand || 'All',
          squadLead: squadLead || 'All',
          channel: channel || 'All'
        })

        const response = await fetch(`/api/usc-business-performance/tier-count-customers?${params}`, {
          headers
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }))
          throw new Error(errorData.error || `Failed to fetch customers (Status: ${response.status})`)
        }

        const result = await response.json()

        if (result.success && result.data) {
          setCustomers(result.data.customers || [])
          setTotal(result.data.total || 0)
        } else {
          throw new Error(result.error || 'Failed to fetch customers')
        }
      } catch (err: any) {
        console.error('❌ [Tier Count Customers Modal] Error:', err)
        setError(err.message || 'Failed to fetch customers')
        setCustomers([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [isOpen, tierName, startDate, endDate, brand, squadLead, channel])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [tierName, startDate, endDate, brand, squadLead, channel])

  // Format date to MM/DD/YY
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
    if (customers.length === 0) return
    
    try {
      setExporting(true)
      
      // Headers
      const headers = [
        'BRAND',
        'UNIQUE CODE',
        'USER NAME',
        'LDD',
        'DAYS ACTIVE',
        'ATV',
        'PF',
        'DC',
        'DA',
        'WC',
        'WA',
        'GGR',
        'WINRATE',
        'Tier'
      ]
      
      let csvContent = headers.join(',') + '\n'
      
      // Export all customers (not just paginated)
      customers.forEach((customer) => {
        csvContent += [
          customer.line || '-',
          customer.update_unique_code || '-',
          customer.user_name || '-',
          customer.last_deposit_date ? formatDateYYYYMMDD(customer.last_deposit_date) : '-',
          customer.daysActive || 0,
          customer.atv.toFixed(2),
          customer.pf.toFixed(2),
          customer.dc || 0,
          customer.da.toFixed(2),
          customer.wc || 0,
          customer.wa.toFixed(2),
          customer.ggr.toFixed(2),
          customer.winrate.toFixed(2),
          customer.tier || '-'
        ].join(',') + '\n'
      })
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Generate filename with tier and period info
      const filename = `tier-count-${tierName.replace(/\s+/g, '-')}-period-${period}-${new Date().toISOString().split('T')[0]}.csv`
      a.download = filename
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      console.error('❌ [Tier Count Customers Modal] Export error:', e)
      alert('Failed to export: ' + (e.message || 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedCustomers = customers.slice(startIndex, endIndex)

  // ✅ Calculate table height:
  // - Jika limit >= 10: SELALU gunakan 462px (11 rows dengan cell height 42px)
  // - Jika limit < 10: tinggi auto (ikut jumlah row yang ada)
  const actualDataRows = paginatedCustomers.length
  
  // ✅ WAJIB: Jika limit >= 10, SELALU gunakan 462px untuk 11 rows (1 header + 10 data)
  // ✅ WAJIB: Jika limit < 10, tinggi auto = header + (jumlah data rows × 42px)
  const tableHeight = limit >= STANDARD_DATA_ROWS
    ? MAX_TABLE_HEIGHT // 462px WAJIB untuk 11 rows (1 header + 10 data) - SELALU jika limit >= 10
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
          maxHeight: 'calc(100vh - 20px)', // ✅ Maksimalkan tinggi modal agar table 462px + header + footer tidak terpotong
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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
                {tierName} - Period {period} Customers
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: 0,
                  fontWeight: 400
                }}
              >
                {formatDateYYYYMMDD(startDate)} to {formatDateYYYYMMDD(endDate)} • {total} customers
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
            overflow: 'visible', // ✅ UBAH jadi visible agar tidak memotong konten (SAMA dengan TierMovementCustomerModal)
            padding: 0,
            minHeight: 0 // ✅ Allow content to expand
          }}
        >
          {loading ? (
            <div style={{ 
              padding: '40px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              gap: '16px'
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
                Loading customers...
              </p>
              <style jsx>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : error ? (
            <div style={{ 
              padding: '40px 24px',
              textAlign: 'center',
              color: '#EF4444'
            }}>
              Error: {error}
            </div>
          ) : customers.length === 0 ? (
            <div style={{ 
              padding: '40px 24px',
              textAlign: 'center',
              color: '#6B7280'
            }}>
              No customers found for this tier in the selected period.
            </div>
          ) : (
            <div
              style={{
                animation: 'fadeInContent 0.3s ease-in',
                opacity: loading ? 0 : 1
              }}
            >
              <style jsx>{`
                @keyframes fadeInContent {
                  from {
                    opacity: 0;
                  }
                  to {
                    opacity: 1;
                  }
                }
              `}</style>
              {/* Table Container */}
              <div style={{ 
                padding: '20px 24px'
              }}>
                <div style={{
                  overflowX: 'auto',
                  overflowY: shouldShowScroll ? 'auto' : 'hidden', // ✅ Scroll muncul jika data > 10 rows
                  height: limit >= STANDARD_DATA_ROWS ? `${MAX_TABLE_HEIGHT}px` : `${tableHeight}px`, // ✅ PURE TINGGI TABLE = 462px (42px × 11 rows)
                  position: 'relative',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
                  boxSizing: 'border-box' // ✅ Border sudah termasuk dalam height, jadi 462px = pure tinggi table
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #e5e7eb',
                    fontSize: '13px',
                    boxSizing: 'border-box'
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
                        }}>USER NAME</th>
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
                        }}>DAYS ACTIVE</th>
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
                        }}>ATV</th>
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
                        }}>PF</th>
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
                        }}>WINRATE</th>
                        <th style={{
                          padding: CELL_PADDING,
                          textAlign: 'left',
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
                        }}>Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCustomers.map((customer, index) => (
                      <tr
                        key={`${customer.update_unique_code}-${index}`}
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
                          {customer.line}
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
                          {customer.update_unique_code}
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
                          {customer.user_name}
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
                          {formatDateYYYYMMDD(customer.last_deposit_date)}
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
                          {formatIntegerKPI(customer.daysActive)}
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
                          {formatCurrencyKPI(customer.atv, 'USC')}
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
                          {formatCurrencyKPI(customer.pf, 'USC')}
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
                          {formatIntegerKPI(customer.dc)}
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
                          {formatCurrencyKPI(customer.da, 'USC')}
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
                          {formatIntegerKPI(customer.wc)}
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
                          {formatCurrencyKPI(customer.wa, 'USC')}
                        </td>
                        <td
                          style={{
                            padding: CELL_PADDING,
                            textAlign: 'right',
                            color: customer.ggr >= 0 ? '#059669' : '#dc2626',
                            fontWeight: 600,
                            borderRight: '1px solid #E5E7EB',
                            height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                            lineHeight: CELL_LINE_HEIGHT,
                            verticalAlign: 'middle',
                            boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                          }}
                        >
                          {formatCurrencyKPI(customer.ggr, 'USC')}
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
                          {formatPercentageKPI(customer.winrate)}
                        </td>
                        <td
                          style={{
                            padding: CELL_PADDING,
                            color: '#1F2937',
                            height: `${CELL_HEIGHT}px`, // ✅ Semua cell = 28px
                            lineHeight: CELL_LINE_HEIGHT,
                            verticalAlign: 'middle',
                            boxSizing: 'border-box' // ✅ Pastikan padding termasuk dalam height
                          }}
                        >
                          {customer.tier}
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
                  borderRadius: '0 0 16px 16px' // ✅ Rounded bottom corners (SAMA dengan TierMovementCustomerModal)
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value))
                      setPage(1)
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
                    Showing {startIndex + 1} to {Math.min(endIndex, total)} of {total} customers
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => setPage(prev => Math.max(1, prev - 1))}
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
                        onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
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
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

