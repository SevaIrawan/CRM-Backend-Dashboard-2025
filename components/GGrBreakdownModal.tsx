'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrencyKPI, formatIntegerKPI, formatPercentageKPI } from '@/lib/formatHelpers'

interface GGrBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  year: string
  month: string
  currency: string
}

type TabType = 'brand' | 'tier' | 'customers'

export default function GGrBreakdownModal({
  isOpen,
  onClose,
  year,
  month,
  currency
}: GGrBreakdownModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('brand')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  
  // Pagination state for By Brand tab
  const [brandCurrentPage, setBrandCurrentPage] = useState(1)
  const [brandItemsPerPage] = useState(100) // 100 items per page
  
  // Tier customers breakdown modal
  const [showTierCustomersModal, setShowTierCustomersModal] = useState(false)
  const [selectedTier, setSelectedTier] = useState<number | null>(null)
  const [tierCustomersData, setTierCustomersData] = useState<any>(null)
  const [loadingTierCustomers, setLoadingTierCustomers] = useState(false)
  const [exportingTierCustomers, setExportingTierCustomers] = useState(false)

  // Fetch data when tab changes
  useEffect(() => {
    if (!isOpen) return

    const fetchBreakdown = async () => {
      setLoading(true)
      setError(null)
      try {
        const userStr = localStorage.getItem('nexmax_user')
        const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null

        const params = new URLSearchParams({
          year,
          month,
          type: activeTab
        })

        const response = await fetch(`/api/usc-business-performance/ggr-breakdown?${params}`, {
          headers: {
            'x-user-allowed-brands': JSON.stringify(allowedBrands)
          }
        })

        const result = await response.json()

        if (result.success) {
          setData(result.data)
          // Reset pagination when data changes
          setBrandCurrentPage(1)
        } else {
          setError(result.error || 'Failed to load breakdown data')
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load breakdown data')
      } finally {
        setLoading(false)
      }
    }

    fetchBreakdown()
  }, [isOpen, activeTab, year, month])
  
  // Reset pagination when tab changes
  useEffect(() => {
    setBrandCurrentPage(1)
  }, [activeTab])

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle tier row double click
  const handleTierRowDoubleClick = async (tierNumber: number) => {
    console.log('🔵 [GGrBreakdown] Double click on tier:', tierNumber)
    setSelectedTier(tierNumber)
    setShowTierCustomersModal(true)
    setLoadingTierCustomers(true)
    setTierCustomersData(null)
    
    try {
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const params = new URLSearchParams({
        year,
        month,
        tier: tierNumber.toString()
      })
      
      console.log('🔵 [GGrBreakdown] Fetching tier customers:', params.toString())
      
      const response = await fetch(`/api/usc-business-performance/tier-customers?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
      
      const result = await response.json()
      
      console.log('🔵 [GGrBreakdown] Tier customers response:', result)
      
      if (result.success) {
        setTierCustomersData(result.data)
      } else {
        console.error('❌ [GGrBreakdown] Failed to load tier customers:', result.error)
        alert(`Failed to load tier customers: ${result.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      console.error('❌ [GGrBreakdown] Error loading tier customers:', e)
      alert(`Error loading tier customers: ${e.message || 'Unknown error'}`)
    } finally {
      setLoadingTierCustomers(false)
    }
  }
  
  // Export tier customers CSV
  const handleExportTierCustomers = async () => {
    if (!tierCustomersData || !tierCustomersData.customers) return
    
    try {
      setExportingTierCustomers(true)
      
      // Sort customers by brand for export
      const sortedCustomers = [...tierCustomersData.customers].sort((a, b) => {
        const brandA = (a.line || '').toUpperCase()
        const brandB = (b.line || '').toUpperCase()
        return brandA.localeCompare(brandB)
      })
      
      const headers = [
        'Brand',
        'Unique Code',
        'User Name',
        'Active Days',
        'ATV',
        'Purchase Freq',
        'Deposit Cases',
        'Deposit Amount',
        'GGR',
        'Winrate',
        'Withdraw Rate',
        'Tier'
      ]
      
      let csvContent = headers.join(',') + '\n'
      
      sortedCustomers.forEach((customer: any) => {
        csvContent += [
          customer.line || '-',
          customer.unique_code || '-',
          customer.user_name || '-',
          customer.active_days || 0,
          customer.atv.toFixed(2),
          customer.purchase_freq.toFixed(2),
          customer.deposit_cases || 0,
          customer.deposit_amount.toFixed(2),
          customer.ggr.toFixed(2),
          customer.winrate.toFixed(2),
          customer.withdraw_rate.toFixed(2),
          customer.tier_name || '-'
        ].join(',') + '\n'
      })
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tier-${selectedTier}-customers-${year}-${month}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Failed to export: ' + (e.message || 'Unknown error'))
    } finally {
      setExportingTierCustomers(false)
    }
  }
  
  // Export CSV function
  const handleExport = async () => {
    if (!data) return

    try {
      setExporting(true)
      
      let csvContent = ''
      let filename = ''

      if (activeTab === 'brand' && data.byBrand) {
        const headers = ['Brand', 'Count', 'ATV', 'Deposit Cases', 'Deposit Amount', 'GGR', 'Contribution GGR (%)']
        csvContent = headers.join(',') + '\n'
        
        const totalGGR = data.byBrand.values.reduce((sum: number, val: number) => sum + val, 0)
        data.byBrand.labels.forEach((brand: string, index: number) => {
          const ggr = data.byBrand.values[index]
          const count = data.byBrand.counts?.[index] || 0
          const atv = data.byBrand.atvs?.[index] || 0
          const depositCases = data.byBrand.depositCases?.[index] || 0
          const depositAmount = data.byBrand.depositAmounts?.[index] || 0
          const percentage = totalGGR > 0 ? ((ggr / totalGGR) * 100).toFixed(2) : '0.00'
          csvContent += `${brand},${count},${atv.toFixed(2)},${depositCases},${depositAmount.toFixed(2)},${ggr.toFixed(2)},${percentage}%\n`
        })
        filename = `ggr-breakdown-by-brand-${year}-${month}.csv`
      } else if (activeTab === 'tier' && data.byTier) {
        const headers = ['Tier', 'Tier Name', 'Count', 'ATV', 'Deposit Cases', 'Deposit Amount', 'GGR', 'Contribution GGR (%)']
        csvContent = headers.join(',') + '\n'
        
        const totalGGR = data.byTier.values.reduce((sum: number, val: number) => sum + val, 0)
        data.byTier.labels.forEach((tierName: string, index: number) => {
          const ggr = data.byTier.values[index]
          const count = data.byTier.counts?.[index] || 0
          const atv = data.byTier.atvs?.[index] || 0
          const depositCases = data.byTier.depositCases?.[index] || 0
          const depositAmount = data.byTier.depositAmounts?.[index] || 0
          const percentage = totalGGR > 0 ? ((ggr / totalGGR) * 100).toFixed(2) : '0.00'
          csvContent += `${index + 1},${tierName},${count},${atv.toFixed(2)},${depositCases},${depositAmount.toFixed(2)},${ggr.toFixed(2)},${percentage}%\n`
        })
        filename = `ggr-breakdown-by-tier-${year}-${month}.csv`
      } else if (activeTab === 'customers' && data.top10Customers) {
        const headers = ['Rank', 'User Name', 'Unique Code', 'Brand', 'GGR', 'Percentage']
        csvContent = headers.join(',') + '\n'
        
        data.top10Customers.forEach((customer: any, index: number) => {
          csvContent += `${index + 1},${customer.user_name || '-'},${customer.unique_code || '-'},${customer.line || '-'},${customer.ggr.toFixed(2)},${customer.percentage.toFixed(2)}%\n`
        })
        filename = `ggr-top-10-customers-${year}-${month}.csv`
      }

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
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

  if (!isOpen || typeof document === 'undefined') {
    // Still render nested modals even if main modal is closed
    return (
      <>
        {showTierCustomersModal && (
          <TierCustomersModal
            isOpen={showTierCustomersModal}
            onClose={() => {
              setShowTierCustomersModal(false)
              setSelectedTier(null)
              setTierCustomersData(null)
            }}
            tier={selectedTier}
            tierName={tierCustomersData?.tierName || '-'}
            customers={tierCustomersData?.customers || []}
            loading={loadingTierCustomers}
            currency={currency}
            period={`${month} ${year}`}
            onExport={handleExportTierCustomers}
            exporting={exportingTierCustomers}
          />
        )}
      </>
    )
  }

  return (
    <>
      {createPortal(
        <div
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ggr-breakdown-title"
          style={{
            position: 'fixed',
            top: '150px',
            left: '280px',
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 0,
            margin: 0
          }}
        >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '95vw',
          maxHeight: '75vh',
          margin: 'auto',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h2
              id="ggr-breakdown-title"
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#1F2937',
                margin: 0,
                marginBottom: '4px'
              }}
            >
              GROSS GAMING REVENUE BREAKDOWN
            </h2>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              {year} • {month}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6B7280',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6B7280'
            }}
          >
            Close
          </button>
        </div>

        {/* Tabs Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid #E5E7EB',
            backgroundColor: '#FFFFFF',
            padding: '0 20px'
          }}
        >
          {[
            { id: 'brand' as TabType, label: 'By Brand', icon: '📊' },
            { id: 'tier' as TabType, label: 'By Tier', icon: '🎯' },
            { id: 'customers' as TabType, label: 'Top 10 Customers', icon: '👥' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #3B82F6' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#3B82F6' : '#6B7280',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#1F2937'
                  e.currentTarget.style.backgroundColor = '#F3F4F6'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#6B7280'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div
          style={{
            padding: '20px 24px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF'
          }}
        >
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6B7280' }}>Loading breakdown data...</p>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#EF4444' }}>
              <p>Error: {error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Table Content - By Brand */}
              {activeTab === 'brand' && data.byBrand && (() => {
                const totalGGR = data.byBrand.values.reduce((sum: number, val: number) => sum + val, 0)
                const totalItems = data.byBrand.labels.length
                
                // Logic: 
                // - If data < 100: show all with scroll (max 10 rows visible), NO pagination
                // - If data >= 100: use pagination (100 per page), NO scroll
                let showAllBrands = false
                let displayBrands = data.byBrand.labels
                
                if (totalItems < 100) {
                  showAllBrands = true
                  displayBrands = data.byBrand.labels // Show all, use scroll
                } else {
                  // Use pagination for >= 100 items (100 per page)
                  const totalPages = Math.ceil(totalItems / brandItemsPerPage)
                  const startIndex = (brandCurrentPage - 1) * brandItemsPerPage
                  const endIndex = startIndex + brandItemsPerPage
                  displayBrands = data.byBrand.labels.slice(startIndex, endIndex)
                }
                
                const showingFrom = showAllBrands ? 1 : ((brandCurrentPage - 1) * brandItemsPerPage + 1)
                const showingTo = showAllBrands ? totalItems : Math.min(brandCurrentPage * brandItemsPerPage, totalItems)
                const totalPages = showAllBrands ? 1 : Math.ceil(totalItems / brandItemsPerPage)
                
                return (
                  <>
                    <div style={{ 
                      overflowX: 'auto',
                      overflowY: totalItems >= 100 ? 'visible' : 'auto',
                      maxHeight: totalItems >= 100 ? 'none' : '418px', // 1 header (38px) + 10 rows (10 * 38px) = 418px - exact calculation: padding 10px top + 10px bottom (20px) + border 1px (1px) + content ~17px = ~38px per row
                      position: 'relative'
                    }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          border: '1px solid #e0e0e0',
                          fontSize: '14px'
                        }}
                      >
                        <thead style={{ 
                          position: 'sticky', 
                          top: 0, 
                          zIndex: 10,
                          backgroundColor: '#374151',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          <tr>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>Brand</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>Count</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>ATV</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>Deposit Cases</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>Deposit Amount</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>GGR</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>Contribution GGR (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayBrands.map((brand: string, idx: number) => {
                            const originalIndex = showAllBrands ? idx : ((brandCurrentPage - 1) * brandItemsPerPage + idx)
                            const ggr = data.byBrand.values[originalIndex]
                            const count = data.byBrand.counts?.[originalIndex] || 0
                            const atv = data.byBrand.atvs?.[originalIndex] || 0
                            const depositCases = data.byBrand.depositCases?.[originalIndex] || 0
                            const depositAmount = data.byBrand.depositAmounts?.[originalIndex] || 0
                            const percentage = totalGGR > 0 ? (ggr / totalGGR) * 100 : 0
                            return (
                              <tr
                                key={brand}
                                style={{
                                  backgroundColor: originalIndex % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                                }}
                              >
                                <td style={{ 
                                  padding: '10px 14px', 
                                  border: '1px solid #e0e0e0',
                                  color: '#374151'
                                }}>{brand}</td>
                                <td style={{ 
                                  padding: '10px 14px', 
                                  textAlign: 'right',
                                  border: '1px solid #e0e0e0',
                                  color: '#374151'
                                }}>
                                  {formatIntegerKPI(count)}
                                </td>
                                <td style={{ 
                                  padding: '10px 14px', 
                                  textAlign: 'right',
                                  border: '1px solid #e0e0e0',
                                  color: '#374151'
                                }}>
                                  {formatCurrencyKPI(atv, currency)}
                                </td>
                                <td style={{ 
                                  padding: '10px 14px', 
                                  textAlign: 'right',
                                  border: '1px solid #e0e0e0',
                                  color: '#374151'
                                }}>
                                  {formatIntegerKPI(depositCases)}
                                </td>
                                <td style={{ 
                                  padding: '10px 14px', 
                                  textAlign: 'right',
                                  border: '1px solid #e0e0e0',
                                  color: '#374151'
                                }}>
                                  {formatCurrencyKPI(depositAmount, currency)}
                                </td>
                                <td style={{ 
                                  padding: '10px 14px', 
                                  textAlign: 'right',
                                  border: '1px solid #e0e0e0',
                                  color: ggr >= 0 ? '#10b981' : '#EF4444',
                                  fontWeight: 500
                                }}>
                                  {formatCurrencyKPI(ggr, currency)}
                                </td>
                                <td style={{ 
                                  padding: '10px 14px', 
                                  textAlign: 'right',
                                  border: '1px solid #e0e0e0',
                                  color: '#374151'
                                }}>
                                  {percentage.toFixed(2)}%
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination and Export - Only show if data >= 100 (100 per page) */}
                    {totalItems >= 100 && (
                      <div className="table-footer" style={{ padding: '12px 24px' }}>
                        <div className="records-info">
                          Showing {showingFrom} to {showingTo} of {formatIntegerKPI(totalItems)} entries
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="pagination-controls">
                            <button
                              onClick={() => setBrandCurrentPage(p => Math.max(1, p - 1))}
                              disabled={brandCurrentPage === 1}
                              className="pagination-btn"
                            >
                              ← Prev
                            </button>
                            <span className="pagination-info">
                              Page {brandCurrentPage} of {totalPages}
                            </span>
                            <button
                              onClick={() => setBrandCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={brandCurrentPage === totalPages}
                              className="pagination-btn"
                            >
                              Next →
                            </button>
                          </div>
                          <button
                            onClick={handleExport}
                            disabled={exporting}
                            className={`export-button ${exporting ? 'disabled' : ''}`}
                          >
                            {exporting ? 'Exporting...' : 'Export'}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Export button for < 100 items */}
                    {totalItems < 100 && (
                      <div className="table-footer" style={{ padding: '12px 24px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={handleExport}
                          disabled={exporting}
                          className={`export-button ${exporting ? 'disabled' : ''}`}
                        >
                          {exporting ? 'Exporting...' : 'Export'}
                        </button>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Table Content - By Tier */}
              {activeTab === 'tier' && data.byTier && (
                <>
                  {data.byTier.labels.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px',
                      color: '#6B7280',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB'
                    }}>
                      <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
                        Tidak ada data tier
                      </p>
                      <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
                        Tier belum di-calculate untuk periode {month} {year}. 
                        <br />
                        Silakan jalankan calculate tier terlebih dahulu.
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          border: '1px solid #e0e0e0',
                          fontSize: '14px'
                        }}
                      >
                        <thead style={{ 
                          position: 'sticky', 
                          top: 0, 
                          zIndex: 10,
                          backgroundColor: '#374151',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          <tr>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>Tier Name</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>Count</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>ATV</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>Deposit Cases</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>Deposit Amount</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>GGR</th>
                            <th style={{ 
                              padding: '10px 14px', 
                              textAlign: 'left', 
                              fontWeight: 600,
                              backgroundColor: '#374151',
                              color: 'white',
                              border: '1px solid #4b5563',
                              borderBottom: '2px solid #4b5563'
                            }}>Contribution GGR (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const totalGGR = data.byTier.values.reduce((sum: number, val: number) => sum + val, 0)
                            return data.byTier.labels.map((tierName: string, index: number) => {
                              const ggr = data.byTier.values[index]
                              const count = data.byTier.counts?.[index] || 0
                              const atv = data.byTier.atvs?.[index] || 0
                              const depositCases = data.byTier.depositCases?.[index] || 0
                              const depositAmount = data.byTier.depositAmounts?.[index] || 0
                              const percentage = totalGGR > 0 ? (ggr / totalGGR) * 100 : 0
                            return (
                              <tr
                                key={tierName}
                                style={{
                                  backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                                  cursor: 'pointer'
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation()
                                  console.log('🔵 [GGrBreakdown] Row double clicked, tier:', index + 1)
                                  handleTierRowDoubleClick(index + 1)
                                }}
                                onClick={(e) => {
                                  // Also allow single click as fallback
                                  if (e.detail === 2) {
                                    e.stopPropagation()
                                  }
                                }}
                                title="Double click to view customers in this tier"
                              >
                                <td style={{ 
                                  padding: '10px 14px', 
                                  border: '1px solid #e0e0e0',
                                  color: '#374151'
                                }}>{tierName}</td>
                                <td 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleTierRowDoubleClick(index + 1)
                                  }}
                                  style={{ 
                                    padding: '10px 14px', 
                                    textAlign: 'right',
                                    border: '1px solid #e0e0e0',
                                    color: '#3B82F6',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    textDecoration: 'underline'
                                  }}
                                  title="Click to view customers in this tier"
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#2563EB'
                                    e.currentTarget.style.textDecoration = 'underline'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#3B82F6'
                                    e.currentTarget.style.textDecoration = 'underline'
                                  }}
                                >
                                  <span style={{ color: '#3B82F6', textDecoration: 'underline' }}>
                                    {formatIntegerKPI(count)}
                                  </span>
                                </td>
                                <td style={{ 
                                  padding: '10px 14px', 
                                  textAlign: 'right',
                                  border: '1px solid #e0e0e0',
                                  color: '#374151'
                                }}>
                                  {formatCurrencyKPI(atv, currency)}
                                </td>
                                <td style={{ 
                                  padding: '10px 14px', 
                                  textAlign: 'right',
                                  border: '1px solid #e0e0e0',
                                  color: '#374151'
                                }}>
                                  {formatIntegerKPI(depositCases)}
                                </td>
                                <td style={{ 
                                  padding: '10px 14px', 
                                  textAlign: 'right',
                                  border: '1px solid #e0e0e0',
                                  color: '#374151'
                                }}>
                                  {formatCurrencyKPI(depositAmount, currency)}
                                </td>
                                <td style={{ 
                                  padding: '10px 14px', 
                                  textAlign: 'right',
                                  border: '1px solid #e0e0e0',
                                  color: ggr >= 0 ? '#10b981' : '#EF4444',
                                  fontWeight: 500
                                }}>
                                  {formatCurrencyKPI(ggr, currency)}
                                </td>
                                <td style={{ 
                                  padding: '10px 14px', 
                                  textAlign: 'right',
                                  border: '1px solid #e0e0e0',
                                  color: '#374151'
                                }}>
                                  {percentage.toFixed(2)}%
                                </td>
                              </tr>
                            )
                            })
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                    {/* Export button */}
                    <div className="table-footer" style={{ padding: '12px 24px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleExport}
                        disabled={exporting}
                        className={`export-button ${exporting ? 'disabled' : ''}`}
                      >
                        {exporting ? 'Exporting...' : 'Export'}
                      </button>
                    </div>
                </>
              )}

              {/* Table Content - Top 10 Customers */}
              {activeTab === 'customers' && data.top10Customers && (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: '1px solid #e0e0e0',
                        fontSize: '14px'
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ 
                            padding: '10px 14px', 
                            textAlign: 'left', 
                            fontWeight: 600,
                            backgroundColor: '#374151',
                            color: 'white',
                            border: '1px solid #4b5563',
                            borderBottom: '2px solid #4b5563'
                          }}>Rank</th>
                          <th style={{ 
                            padding: '10px 14px', 
                            textAlign: 'left', 
                            fontWeight: 600,
                            backgroundColor: '#374151',
                            color: 'white',
                            border: '1px solid #4b5563',
                            borderBottom: '2px solid #4b5563'
                          }}>User Name</th>
                          <th style={{ 
                            padding: '10px 14px', 
                            textAlign: 'left', 
                            fontWeight: 600,
                            backgroundColor: '#374151',
                            color: 'white',
                            border: '1px solid #4b5563',
                            borderBottom: '2px solid #4b5563'
                          }}>Unique Code</th>
                          <th style={{ 
                            padding: '10px 14px', 
                            textAlign: 'left', 
                            fontWeight: 600,
                            backgroundColor: '#374151',
                            color: 'white',
                            border: '1px solid #4b5563',
                            borderBottom: '2px solid #4b5563'
                          }}>Brand</th>
                          <th style={{ 
                            padding: '10px 14px', 
                            textAlign: 'left', 
                            fontWeight: 600,
                            backgroundColor: '#374151',
                            color: 'white',
                            border: '1px solid #4b5563',
                            borderBottom: '2px solid #4b5563'
                          }}>GGR</th>
                          <th style={{ 
                            padding: '10px 14px', 
                            textAlign: 'left', 
                            fontWeight: 600,
                            backgroundColor: '#374151',
                            color: 'white',
                            border: '1px solid #4b5563',
                            borderBottom: '2px solid #4b5563'
                          }}>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.top10Customers.map((customer: any, index: number) => (
                          <tr
                            key={index}
                            style={{
                              backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                            }}
                          >
                            <td style={{ 
                              padding: '10px 14px', 
                              border: '1px solid #e0e0e0',
                              color: '#374151'
                            }}>{index + 1}</td>
                            <td style={{ 
                              padding: '10px 14px', 
                              border: '1px solid #e0e0e0',
                              color: '#374151'
                            }}>{customer.user_name || '-'}</td>
                            <td style={{ 
                              padding: '10px 14px', 
                              border: '1px solid #e0e0e0',
                              color: '#374151'
                            }}>{customer.unique_code || '-'}</td>
                            <td style={{ 
                              padding: '10px 14px', 
                              border: '1px solid #e0e0e0',
                              color: '#374151'
                            }}>{customer.line || '-'}</td>
                            <td style={{ 
                              padding: '10px 14px', 
                              textAlign: 'right',
                              border: '1px solid #e0e0e0',
                              color: (customer.ggr || 0) >= 0 ? '#10b981' : '#EF4444',
                              fontWeight: 500
                            }}>
                              {formatCurrencyKPI(customer.ggr || 0, currency)}
                            </td>
                            <td style={{ 
                              padding: '10px 14px', 
                              textAlign: 'right',
                              border: '1px solid #e0e0e0',
                              color: '#374151'
                            }}>
                              {customer.percentage ? `${customer.percentage.toFixed(2)}%` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Export button */}
                  <div className="table-footer" style={{ padding: '12px 24px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleExport}
                      disabled={exporting}
                      className={`export-button ${exporting ? 'disabled' : ''}`}
                    >
                      {exporting ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
      )}
      {showTierCustomersModal && (
        <TierCustomersModal
          isOpen={showTierCustomersModal}
          onClose={() => {
            setShowTierCustomersModal(false)
            setSelectedTier(null)
            setTierCustomersData(null)
          }}
          tier={selectedTier}
          tierName={tierCustomersData?.tierName || '-'}
          customers={tierCustomersData?.customers || []}
          loading={loadingTierCustomers}
          currency={currency}
          period={`${month} ${year}`}
          onExport={handleExportTierCustomers}
          exporting={exportingTierCustomers}
        />
      )}
    </>
  )
}

// Tier Customers Breakdown Modal Component
interface TierCustomersModalProps {
  isOpen: boolean
  onClose: () => void
  tier: number | null
  tierName: string
  customers: any[]
  loading: boolean
  currency: string
  period: string
  onExport: () => void
  exporting: boolean
}

function TierCustomersModal({
  isOpen,
  onClose,
  tier,
  tierName,
  customers,
  loading,
  currency,
  period,
  onExport,
  exporting
}: TierCustomersModalProps) {
  const [page, setPage] = useState(1)
  const [limit] = useState(100) // 100 items per page
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL') // Brand filter
  
  // Transaction history modal state
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [transactionData, setTransactionData] = useState<any>(null)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [exportingTransactions, setExportingTransactions] = useState(false)
  
  // Extract year and month from period
  const periodParts = period.split(' ')
  const transactionYear = periodParts[1] || ''
  const transactionMonth = periodParts[0] || ''
  
  // Sort customers by brand, then reset page when customers change
  useEffect(() => {
    setPage(1)
  }, [customers.length])
  
  // Get unique brands/lines from customers data
  const uniqueBrands = Array.from(new Set(customers.map(c => c.line).filter(Boolean))) as string[]
  const sortedBrands = [...uniqueBrands].sort()
  const brandOptions = ['ALL', ...sortedBrands]
  
  // Filter customers by selected brand
  const filteredCustomers = selectedBrand === 'ALL' 
    ? customers 
    : customers.filter(c => c.line === selectedBrand)
  
  // Sort customers by brand (line)
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const brandA = (a.line || '').toUpperCase()
    const brandB = (b.line || '').toUpperCase()
    return brandA.localeCompare(brandB)
  })
  
  // Reset page when brand filter changes
  useEffect(() => {
    setPage(1)
  }, [selectedBrand])
  
  // Pagination calculation with dynamic logic
  const totalRecords = sortedCustomers.length
  
  // Logic: 
  // - If data < 100: show all with scroll (max 10 rows visible), NO pagination
  // - If data >= 100: use pagination (100 per page), NO scroll
  let displayLimit = 100 // 100 items per page
  let showAll = false
  
  if (totalRecords < 100) {
    showAll = true
    displayLimit = totalRecords // Show all, use scroll
  } else {
    displayLimit = 100 // 100 per page, use pagination
  }
  
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(totalRecords / displayLimit))
  const startIndex = showAll ? 0 : (page - 1) * displayLimit
  const endIndex = showAll ? totalRecords : Math.min(startIndex + displayLimit, totalRecords)
  const paginatedCustomers = sortedCustomers.slice(startIndex, endIndex)
  
  // Cell padding (standard size)
  const cellPadding = '10px 14px'
  const headerPadding = '10px 14px'
  
  // Handle Active Days click
  const handleActiveDaysClick = async (customer: any) => {
    if (!customer.userkey) {
      console.error('❌ [Tier Customers] No userkey found for customer:', customer)
      alert('Error: Customer userkey not found')
      return
    }
    
    console.log('📊 [Tier Customers] Fetching transactions for:', {
      userkey: customer.userkey,
      unique_code: customer.unique_code,
      user_name: customer.user_name,
      year: transactionYear,
      month: transactionMonth
    })
    
    setSelectedCustomer(customer)
    setShowTransactionModal(true)
    setLoadingTransactions(true)
    setTransactionData(null)
    
    try {
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const params = new URLSearchParams({
        userkey: customer.userkey,
        year: transactionYear,
        month: transactionMonth
      })
      
      console.log('📊 [Tier Customers] API Request:', {
        url: `/api/usc-business-performance/customer-transactions?${params}`,
        userkey: customer.userkey,
        year: transactionYear,
        month: transactionMonth
      })
      
      const response = await fetch(`/api/usc-business-performance/customer-transactions?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
      
      const result = await response.json()
      
      console.log('📊 [Tier Customers] API Response:', {
        success: result.success,
        transactionCount: result.data?.transactions?.length || 0,
        error: result.error
      })
      
      if (result.success) {
        setTransactionData(result.data)
      } else {
        console.error('❌ [Tier Customers] Failed to load transactions:', result.error, result.details)
        alert(`Failed to load transactions: ${result.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      console.error('❌ [Tier Customers] Error loading transactions:', e)
      alert(`Error loading transactions: ${e.message || 'Unknown error'}`)
    } finally {
      setLoadingTransactions(false)
    }
  }
  
  // Export transaction history CSV
  const handleExportTransactions = async () => {
    if (!transactionData || !transactionData.transactions) return
    
    try {
      setExportingTransactions(true)
      
      const headers = [
        'Brand',
        'Date Transaction',
        'Unique Code',
        'User Name',
        'Deposit Cases',
        'Deposit Amount',
        'Withdraw Cases',
        'Withdraw Amount',
        'GGR'
      ]
      
      let csvContent = headers.join(',') + '\n'
      
      transactionData.transactions.forEach((tx: any) => {
        csvContent += [
          tx.line || '-',
          tx.date || '-',
          tx.unique_code || '-',
          tx.user_name || '-',
          tx.deposit_cases || 0,
          tx.deposit_amount.toFixed(2),
          tx.withdraw_cases || 0,
          tx.withdraw_amount.toFixed(2),
          tx.ggr.toFixed(2)
        ].join(',') + '\n'
      })
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${selectedCustomer?.unique_code || 'customer'}-${transactionYear}-${transactionMonth}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Failed to export: ' + (e.message || 'Unknown error'))
    } finally {
      setExportingTransactions(false)
    }
  }
  
  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTransactionModal) {
          setShowTransactionModal(false)
          setSelectedCustomer(null)
          setTransactionData(null)
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }

    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose, showTransactionModal])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: '150px',
        left: '280px',
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        padding: 0,
        margin: 0
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '95vw',
          maxHeight: '75vh',
          margin: 'auto',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#1F2937',
                margin: 0,
                marginBottom: '4px'
              }}
            >
              {tierName}
            </h2>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              {period} • {totalRecords} customers
            </p>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px' 
          }}>
            {/* Brand/Line Slicer */}
            {!loading && customers.length > 0 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '8px'
              }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  color: '#374151'
                }}>
                  Brand/Line:
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#374151',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    minWidth: '150px'
                  }}
                >
                  {brandOptions.map(brand => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6B7280',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4B5563'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6B7280'
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '20px 24px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF'
          }}
        >
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6B7280' }}>Loading customers...</p>
            </div>
          )}

          {!loading && customers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
              <p>No customers found in this tier</p>
            </div>
          )}

          {!loading && customers.length > 0 && (
            <>
              {/* Table Container - Only this scrolls */}
              <div style={{ 
                flex: 1,
                overflowX: 'auto',
                overflowY: totalRecords >= 100 ? 'visible' : 'auto',
                maxHeight: totalRecords >= 100 ? 'none' : '418px', // 1 header (38px) + 10 rows (10 * 38px) = 418px - exact calculation: padding 10px top + 10px bottom (20px) + border 1px (1px) + content ~17px = ~38px per row
                position: 'relative',
                minHeight: 0
              }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #e0e0e0',
                    fontSize: '14px'
                  }}
                >
                  <thead style={{ 
                    position: 'sticky', 
                    top: 0, 
                    zIndex: 10,
                    backgroundColor: '#374151',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <tr>
                      {[
                        'Brand',
                        'Unique Code',
                        'User Name',
                        'Active Days',
                        'ATV',
                        'Purchase Freq',
                        'Deposit Cases',
                        'Deposit Amount',
                        'GGR',
                        'Winrate',
                        'Withdraw Rate',
                        'Tier'
                      ].map((header, idx) => (
                        <th
                          key={header}
                          style={{
                            padding: headerPadding,
                            textAlign: 'left',
                            fontWeight: 600,
                            backgroundColor: '#374151',
                            color: 'white',
                            border: '1px solid #4b5563',
                            borderBottom: '2px solid #4b5563',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCustomers.map((customer: any, index: number) => (
                      <tr
                        key={index}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                        }}
                      >
                        <td style={{ padding: cellPadding, border: '1px solid #e0e0e0', color: '#374151' }}>
                          {customer.line}
                        </td>
                        <td style={{ padding: cellPadding, border: '1px solid #e0e0e0', color: '#374151' }}>
                          {customer.unique_code}
                        </td>
                        <td style={{ padding: cellPadding, border: '1px solid #e0e0e0', color: '#374151' }}>
                          {customer.user_name}
                        </td>
                        <td 
                          onClick={() => handleActiveDaysClick(customer)}
                          style={{ 
                            padding: cellPadding, 
                            border: '1px solid #e0e0e0', 
                            color: '#3B82F6', 
                            textAlign: 'right',
                            cursor: 'pointer',
                            fontWeight: 500,
                            textDecoration: 'underline'
                          }}
                          title="Click to view transaction history"
                        >
                          {formatIntegerKPI(customer.active_days)}
                        </td>
                        <td style={{ padding: cellPadding, border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                          {formatCurrencyKPI(customer.atv, currency)}
                        </td>
                        <td style={{ padding: cellPadding, border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                          {customer.purchase_freq.toFixed(2)}
                        </td>
                        <td style={{ padding: cellPadding, border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                          {formatIntegerKPI(customer.deposit_cases)}
                        </td>
                        <td style={{ padding: cellPadding, border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                          {formatCurrencyKPI(customer.deposit_amount, currency)}
                        </td>
                        <td style={{ 
                          padding: cellPadding, 
                          border: '1px solid #e0e0e0', 
                          color: customer.ggr >= 0 ? '#10b981' : '#EF4444', 
                          textAlign: 'right',
                          fontWeight: customer.ggr >= 0 ? 500 : 500
                        }}>
                          {formatCurrencyKPI(customer.ggr, currency)}
                        </td>
                        <td style={{ padding: cellPadding, border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                          {formatPercentageKPI(customer.winrate)}
                        </td>
                        <td style={{ padding: cellPadding, border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                          {formatPercentageKPI(customer.withdraw_rate)}
                        </td>
                        <td style={{ padding: cellPadding, border: '1px solid #e0e0e0', color: '#374151' }}>
                          {customer.tier_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination and Export - Only show if data >= 100 (100 per page) */}
              {totalRecords >= 100 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px 24px',
                  borderTop: '1px solid #e5e7eb',
                  flexShrink: 0,
                  marginTop: '0'
                }}>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: 500 }}>
                    Showing {startIndex + 1} to {endIndex} of {formatIntegerKPI(totalRecords)} customers
                  </p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          backgroundColor: 'transparent',
                          color: '#374151',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: page === 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (page !== 1) {
                            e.currentTarget.style.borderColor = '#9ca3af'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#d1d5db'
                        }}
                      >
                        ← Prev
                      </button>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#6b7280', 
                        fontWeight: 500,
                        whiteSpace: 'nowrap'
                      }}>
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          backgroundColor: 'transparent',
                          color: '#374151',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (page !== totalPages) {
                            e.currentTarget.style.borderColor = '#9ca3af'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#d1d5db'
                        }}
                      >
                        Next →
                      </button>
                    </div>
                    <button
                      onClick={onExport}
                      disabled={exporting}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: exporting ? '#f3f4f6' : '#10b981',
                        color: exporting ? '#9ca3af' : '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: exporting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!exporting) {
                          e.currentTarget.style.backgroundColor = '#059669'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!exporting) {
                          e.currentTarget.style.backgroundColor = '#10b981'
                        }
                      }}
                    >
                      {exporting ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Export button for < 100 items */}
              {totalRecords < 100 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end',
                  padding: '12px 24px',
                  borderTop: '1px solid #e5e7eb',
                  flexShrink: 0,
                  marginTop: '0'
                }}>
                  <button
                    onClick={onExport}
                    disabled={exporting}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: exporting ? '#f3f4f6' : '#10b981',
                      color: exporting ? '#9ca3af' : '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: exporting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!exporting) {
                        e.currentTarget.style.backgroundColor = '#059669'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!exporting) {
                        e.currentTarget.style.backgroundColor = '#10b981'
                      }
                    }}
                  >
                    {exporting ? 'Exporting...' : 'Export'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Transaction History Modal */}
      {showTransactionModal && (
        <TransactionHistoryModal
          isOpen={showTransactionModal}
          onClose={() => {
            setShowTransactionModal(false)
            setSelectedCustomer(null)
            setTransactionData(null)
          }}
          customer={selectedCustomer}
          transactions={transactionData?.transactions || []}
          loading={loadingTransactions}
          currency={currency}
          period={period}
          onExport={handleExportTransactions}
          exporting={exportingTransactions}
        />
      )}
    </div>,
    document.body
  )
}

// Transaction History Modal Component
interface TransactionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  customer: any
  transactions: any[]
  loading: boolean
  currency: string
  period: string
  onExport: () => void
  exporting: boolean
}

function TransactionHistoryModal({
  isOpen,
  onClose,
  customer,
  transactions,
  loading,
  currency,
  period,
  onExport,
  exporting
}: TransactionHistoryModalProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }

    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  // Reset page when modal opens/closes or transactions change
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1)
    }
  }, [isOpen, transactions.length])

  if (!isOpen || typeof document === 'undefined') return null

  // Calculate pagination
  const totalItems = transactions.length
  const showAll = totalItems < 100
  const totalPages = showAll ? 1 : Math.ceil(totalItems / itemsPerPage)
  const startIndex = showAll ? 0 : (currentPage - 1) * itemsPerPage
  const endIndex = showAll ? totalItems : Math.min(startIndex + itemsPerPage, totalItems)
  const displayTransactions = showAll ? transactions : transactions.slice(startIndex, endIndex)

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: '150px',
        left: '280px',
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10002,
        padding: 0,
        margin: 0
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '95vw',
          maxHeight: '75vh',
          margin: 'auto',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#1F2937',
                margin: 0,
                marginBottom: '4px'
              }}
            >
              TRANSACTION HISTORY - {customer?.user_name || '-'}
            </h2>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              {customer?.unique_code || '-'} • {period} • {transactions.length} transactions
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6B7280',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6B7280'
            }}
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '20px 24px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF'
          }}
        >
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6B7280' }}>Loading transactions...</p>
            </div>
          )}

          {!loading && transactions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
              <p>No transactions found</p>
            </div>
          )}

          {!loading && transactions.length > 0 && (
            <>
              {/* Showing Caption - Only show if data >= 100 (100 per page) */}
              {totalItems >= 100 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #E5E7EB',
                  flexShrink: 0
                }}>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                    Showing {startIndex + 1} - {endIndex} of {totalItems} transactions
                  </p>
                </div>
              )}

              {/* Table Container - Only this scrolls */}
              <div style={{ 
                flex: 1,
                overflowX: 'auto',
                overflowY: totalItems >= 100 ? 'visible' : 'auto',
                maxHeight: totalItems >= 100 ? 'none' : '418px', // 1 header (38px) + 10 rows (10 * 38px) = 418px - exact calculation: padding 10px top + 10px bottom (20px) + border 1px (1px) + content ~17px = ~38px per row
                position: 'relative',
                minHeight: 0
              }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #e0e0e0',
                    fontSize: '14px'
                  }}
                >
                  <thead style={{ 
                    position: 'sticky', 
                    top: 0, 
                    zIndex: 10,
                    backgroundColor: '#374151',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <tr>
                      {[
                        'Brand',
                        'Date Transaction',
                        'Unique Code',
                        'User Name',
                        'Deposit Cases',
                        'Deposit Amount',
                        'Withdraw Cases',
                        'Withdraw Amount',
                        'GGR'
                      ].map((header) => (
                        <th
                          key={header}
                          style={{
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontWeight: 600,
                            backgroundColor: '#374151',
                            color: 'white',
                            border: '1px solid #4b5563',
                            borderBottom: '2px solid #4b5563',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayTransactions.map((tx: any, index: number) => {
                      const originalIndex = showAll ? index : (startIndex + index)
                      return (
                      <tr
                        key={originalIndex}
                        style={{
                          backgroundColor: originalIndex % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                        }}
                      >
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151' }}>
                          {tx.line}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151' }}>
                          {tx.date}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151' }}>
                          {tx.unique_code}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151' }}>
                          {tx.user_name}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                          {formatIntegerKPI(tx.deposit_cases)}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                          {formatCurrencyKPI(tx.deposit_amount, currency)}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                          {formatIntegerKPI(tx.withdraw_cases)}
                        </td>
                        <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                          {formatCurrencyKPI(tx.withdraw_amount, currency)}
                        </td>
                        <td style={{ 
                          padding: '10px 14px', 
                          border: '1px solid #e0e0e0', 
                          color: tx.ggr >= 0 ? '#10b981' : '#EF4444', 
                          textAlign: 'right',
                          fontWeight: 500
                        }}>
                          {formatCurrencyKPI(tx.ggr, currency)}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination and Export - Only show if data >= 100 (100 per page) */}
              {totalItems >= 100 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px 24px',
                  borderTop: '1px solid #e5e7eb',
                  flexShrink: 0,
                  marginTop: '0'
                }}>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: 500 }}>
                    Showing {startIndex + 1} to {endIndex} of {formatIntegerKPI(totalItems)} transactions
                  </p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          backgroundColor: 'transparent',
                          color: '#374151',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== 1) {
                            e.currentTarget.style.borderColor = '#9ca3af'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#d1d5db'
                        }}
                      >
                        ← Prev
                      </button>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#6b7280', 
                        fontWeight: 500,
                        whiteSpace: 'nowrap'
                      }}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          backgroundColor: 'transparent',
                          color: '#374151',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== totalPages) {
                            e.currentTarget.style.borderColor = '#9ca3af'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#d1d5db'
                        }}
                      >
                        Next →
                      </button>
                    </div>
                    <button
                      onClick={onExport}
                      disabled={exporting}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: exporting ? '#f3f4f6' : '#10b981',
                        color: exporting ? '#9ca3af' : '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: exporting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!exporting) {
                          e.currentTarget.style.backgroundColor = '#059669'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!exporting) {
                          e.currentTarget.style.backgroundColor = '#10b981'
                        }
                      }}
                    >
                      {exporting ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Export button for < 100 items */}
              {totalItems < 100 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end',
                  padding: '12px 24px',
                  borderTop: '1px solid #e5e7eb',
                  flexShrink: 0,
                  marginTop: '0'
                }}>
                  <button
                    onClick={onExport}
                    disabled={exporting}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: exporting ? '#f3f4f6' : '#10b981',
                      color: exporting ? '#9ca3af' : '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: exporting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!exporting) {
                        e.currentTarget.style.backgroundColor = '#059669'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!exporting) {
                        e.currentTarget.style.backgroundColor = '#10b981'
                      }
                    }}
                  >
                    {exporting ? 'Exporting...' : 'Export'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
