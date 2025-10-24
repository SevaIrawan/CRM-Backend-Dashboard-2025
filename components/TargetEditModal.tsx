/**
 * ============================================================================
 * TARGET EDIT MODAL - BUSINESS PERFORMANCE (REDESIGNED)
 * ============================================================================
 * 
 * Two-Step Input System:
 * 1. Input TOTAL target (Line = MYR)
 * 2. Input per-brand with percentage (auto-calculate from MYR total)
 * 
 * Features:
 * - Quarter + Line + Percentage in one row
 * - Auto-calculate per brand based on percentage
 * - Saved targets table with Edit functionality
 * - Auto-height table for multiple brands/currencies
 * - Role-based access control (Manager + Admin only)
 * 
 * ============================================================================
 */

'use client'

import React, { useState, useEffect } from 'react'

interface TargetEditModalProps {
  isOpen: boolean
  onClose: () => void
  currency: string
  year: string
  userEmail: string
  userRole: string
  onSaveSuccess: () => void
}

interface TargetData {
  id?: string
  line: string
  quarter: string
  target_ggr: number
  target_deposit_amount: number
  target_deposit_cases: number
  target_active_member: number
  percentage?: number
}

export default function TargetEditModal({
  isOpen,
  onClose,
  currency,
  year,
  userEmail,
  userRole,
  onSaveSuccess
}: TargetEditModalProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [error, setError] = useState('')
  
  // Brands from database
  const [brands, setBrands] = useState<string[]>([])
  
  // Form inputs
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1')
  const [selectedLine, setSelectedLine] = useState<string>(currency) // Default to currency (MYR)
  const [percentage, setPercentage] = useState<number>(0)
  const [inputData, setInputData] = useState({
    ggr: 0,
    deposit_amount: 0,
    deposit_cases: 0,
    active_member: 0
  })
  
  // Saved targets list
  const [targetList, setTargetList] = useState<TargetData[]>([])
  
  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Success message (with potential warning about reset brands)
  const [successMessage, setSuccessMessage] = useState<string>('')

  // ============================================================================
  // FETCH BRANDS & TARGETS ON MOUNT
  // ============================================================================
  useEffect(() => {
    if (isOpen) {
      fetchBrands()
      fetchTargets()
      resetForm()
      setError('')
      setShowSuccessMessage(false)
    }
  }, [isOpen, year])

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/myr-business-performance/slicer-options')
      const data = await response.json()
      
      if (data.brands && data.brands.length > 0) {
        setBrands(data.brands)
      }
    } catch (err) {
      console.error('Error fetching brands:', err)
    }
  }

  const fetchTargets = async () => {
    setLoadingData(true)
    try {
      const params = new URLSearchParams({
        currency,
        year
      })
      
      const response = await fetch(`/api/myr-business-performance/target/list?${params}`)
      const data = await response.json()
      
      if (data.targets) {
        // Sort: Brands first (alphabetical), then Currency (MYR/SGD/USC) last
        const sorted = data.targets.sort((a: TargetData, b: TargetData) => {
          const isCurrencyA = a.line === currency || a.line === 'ALL'
          const isCurrencyB = b.line === currency || b.line === 'ALL'
          
          if (isCurrencyA && !isCurrencyB) return 1  // Currency goes last
          if (!isCurrencyA && isCurrencyB) return -1 // Brands go first
          return a.line.localeCompare(b.line)        // Alphabetical within group
        })
        setTargetList(sorted)
      }
    } catch (err) {
      console.error('Error fetching targets:', err)
    } finally {
      setLoadingData(false)
    }
  }

  // ============================================================================
  // RESET FORM
  // ============================================================================
  const resetForm = () => {
    setInputData({
      ggr: 0,
      deposit_amount: 0,
      deposit_cases: 0,
      active_member: 0
    })
    setSelectedQuarter('Q1')
    setSelectedLine(currency) // Reset to currency
    setPercentage(0)
    setEditMode(false)
    setEditingId(null)
    setError('')
    setSuccessMessage('')
  }

  // ============================================================================
  // AUTO-CALCULATE FROM PERCENTAGE
  // ============================================================================
  useEffect(() => {
    // Only auto-calculate if:
    // 1. Line is a brand (not currency)
    // 2. Percentage is set
    // 3. MYR total exists for the selected quarter
    if (selectedLine !== currency && selectedLine !== 'ALL' && percentage > 0) {
      const myrTotal = targetList.find(
        t => t.quarter === selectedQuarter && (t.line === currency || t.line === 'ALL')
      )
      
      if (myrTotal) {
        setInputData({
          ggr: Math.round((myrTotal.target_ggr * percentage) / 100),
          deposit_amount: Math.round((myrTotal.target_deposit_amount * percentage) / 100),
          deposit_cases: Math.round((myrTotal.target_deposit_cases * percentage) / 100),
          active_member: Math.round((myrTotal.target_active_member * percentage) / 100)
        })
      }
    }
  }, [percentage, selectedLine, selectedQuarter, targetList, currency])

  // ============================================================================
  // EDIT HANDLER - Load data to form
  // ============================================================================
  const handleEdit = (target: TargetData) => {
    setEditMode(true)
    setEditingId(target.id || null)
    setSelectedQuarter(target.quarter)
    setSelectedLine(target.line)
    setInputData({
      ggr: target.target_ggr,
      deposit_amount: target.target_deposit_amount,
      deposit_cases: target.target_deposit_cases,
      active_member: target.target_active_member
    })
    
    // Calculate percentage if it's a brand
    if (target.line !== currency && target.line !== 'ALL') {
      const myrTotal = targetList.find(
        t => t.quarter === target.quarter && (t.line === currency || t.line === 'ALL')
      )
      if (myrTotal && myrTotal.target_ggr > 0) {
        setPercentage(Math.round((target.target_ggr / myrTotal.target_ggr) * 100 * 100) / 100)
      }
    } else {
      setPercentage(0)
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ============================================================================
  // SAVE HANDLER
  // ============================================================================
  const handleSave = async () => {
    // Validate inputs
    if (!selectedQuarter || !selectedLine) {
      setError('Please select Quarter and Line')
      return
    }
    
    if (inputData.ggr <= 0) {
      setError('GGR is required and must be greater than 0')
      return
    }

    // If brand, check if percentage is set
    if (selectedLine !== currency && selectedLine !== 'ALL' && percentage <= 0) {
      setError('Percentage is required for brand targets')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/myr-business-performance/target/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          currency,
          line: selectedLine,
          year,
          quarter: selectedQuarter,
          target_ggr: inputData.ggr,
          target_deposit_amount: inputData.deposit_amount,
          target_deposit_cases: inputData.deposit_cases,
          target_active_member: inputData.active_member,
          forecast_ggr: null,
          user_email: userEmail,
          user_role: userRole,
          reason: editMode 
            ? `Updated target for ${selectedLine} ${selectedQuarter} ${year}` 
            : `Created target for ${selectedLine} ${selectedQuarter} ${year}${selectedLine !== currency ? ` (${percentage}% of total)` : ''}`
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Store the success message (may include warning about reset brands)
        setSuccessMessage(data.message || 'Target saved successfully')
        setShowSuccessMessage(true)
        await fetchTargets() // Refresh list
        resetForm()
        onSaveSuccess() // Refresh dashboard
      } else {
        setError(data.error || 'Failed to save target')
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // FORMAT HELPERS
  // ============================================================================
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-MY').format(num)
  }

  if (!isOpen) return null

  // Check if percentage should be disabled
  const isPercentageDisabled = selectedLine === currency || selectedLine === 'ALL'

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="target-modal-content" style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* ================================================================ */}
        {/* MODAL HEADER */}
        {/* ================================================================ */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          position: 'sticky',
          top: 0,
          backgroundColor: '#FFFFFF',
          zIndex: 10
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              {editMode ? 'Edit Target' : 'Set Target'} - {currency} {year}
            </h2>
            <button
              onClick={onClose}
              style={{
                padding: '6px',
                fontSize: '18px',
                color: '#9CA3AF',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* INPUT FORM */}
        {/* ================================================================ */}
        <div style={{ padding: '14px 20px 16px', borderBottom: '1px solid #E5E7EB' }}>
          {/* Row 1: Quarter + Line + Percentage + Buttons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '180px 220px 140px auto',
            gap: '10px',
            marginBottom: '12px',
            alignItems: 'end'
          }}>
            {/* Quarter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '6px'
              }}>
                Quarter <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>

            {/* Line */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '6px'
              }}>
                Line <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={selectedLine}
                onChange={(e) => {
                  setSelectedLine(e.target.value)
                  if (e.target.value === currency || e.target.value === 'ALL') {
                    setPercentage(0) // Reset percentage when selecting currency
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <option value={currency}>{currency} (Total)</option>
                <option disabled>───────────</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Percentage */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '6px'
              }}>
                Percentage (%)
              </label>
              <input
                type="number"
                value={percentage === 0 ? '' : percentage}
                onChange={(e) => setPercentage(e.target.value === '' ? 0 : Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                disabled={isPercentageDisabled}
                placeholder={isPercentageDisabled ? 'N/A' : 'e.g. 30'}
                step="0.01"
                min="0"
                max="100"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: isPercentageDisabled ? '#F3F4F6' : '#FFFFFF',
                  cursor: isPercentageDisabled ? 'not-allowed' : 'text',
                  color: isPercentageDisabled ? '#9CA3AF' : '#111827'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end'
            }}>
              {editMode && (
                <button
                  onClick={resetForm}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#6B7280',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Cancel
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  backgroundColor: loading ? '#9CA3AF' : '#10B981',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {loading ? 'SAVING...' : editMode ? 'UPDATE' : 'SAVE'}
              </button>
            </div>
          </div>

          {/* Row 2: KPI Inputs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px'
          }}>
            {/* GGR */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '6px'
              }}>
                GGR <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="number"
                value={inputData.ggr === 0 ? '' : inputData.ggr}
                onChange={(e) => setInputData({ ...inputData, ggr: e.target.value === '' ? 0 : Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                placeholder="e.g. 10000000"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>

            {/* Deposit Amount */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '6px'
              }}>
                Deposit Amount
              </label>
              <input
                type="number"
                value={inputData.deposit_amount === 0 ? '' : inputData.deposit_amount}
                onChange={(e) => setInputData({ ...inputData, deposit_amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                placeholder="Optional"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>

            {/* Deposit Cases */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '6px'
              }}>
                Deposit Cases
              </label>
              <input
                type="number"
                value={inputData.deposit_cases === 0 ? '' : inputData.deposit_cases}
                onChange={(e) => setInputData({ ...inputData, deposit_cases: e.target.value === '' ? 0 : Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                placeholder="Optional"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>

            {/* Active Member */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '6px'
              }}>
                Active Member
              </label>
              <input
                type="number"
                value={inputData.active_member === 0 ? '' : inputData.active_member}
                onChange={(e) => setInputData({ ...inputData, active_member: e.target.value === '' ? 0 : Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                placeholder="Optional"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              color: '#DC2626',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* SAVED TARGETS TABLE */}
        {/* ================================================================ */}
        <div style={{ padding: '14px 20px 20px' }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 12px 0'
          }}>
            List Target
          </h3>

          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
              Loading targets...
            </div>
          ) : targetList.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6B7280',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px'
            }}>
              No targets found for {currency} {year}
            </div>
          ) : (
            <div style={{
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px'
                }}>
                  <thead style={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#374151',
                    zIndex: 1
                  }}>
                    <tr style={{ borderBottom: '2px solid #1F2937' }}>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        width: '120px'
                      }}>
                        Brand
                      </th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        width: '80px'
                      }}>
                        Quarter
                      </th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#FFFFFF'
                      }}>
                        GGR
                      </th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#FFFFFF'
                      }}>
                        Deposit Amount
                      </th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#FFFFFF'
                      }}>
                        Deposit Cases
                      </th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#FFFFFF'
                      }}>
                        Active Member
                      </th>
                      <th style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        width: '100px'
                      }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetList.map((target, index) => {
                      const isCurrency = target.line === currency || target.line === 'ALL'
                      return (
                        <tr key={target.id || index} style={{
                          backgroundColor: isCurrency 
                            ? '#FEF3C7' 
                            : index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                          borderBottom: index < targetList.length - 1 ? '1px solid #E5E7EB' : 'none'
                        }}>
                          <td style={{
                            padding: '12px 16px',
                            fontSize: '14px',
                            fontWeight: isCurrency ? '700' : '600',
                            color: isCurrency ? '#D97706' : '#111827',
                            textAlign: 'left'
                          }}>
                            {isCurrency ? `${currency} (Total)` : target.line}
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#111827'
                          }}>
                            {target.quarter}
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#374151'
                          }}>
                            {formatNumber(target.target_ggr)}
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontSize: '14px',
                            color: '#6B7280'
                          }}>
                            {formatNumber(target.target_deposit_amount)}
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontSize: '14px',
                            color: '#6B7280'
                          }}>
                            {formatNumber(target.target_deposit_cases)}
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontSize: '14px',
                            color: '#6B7280'
                          }}>
                            {formatNumber(target.target_active_member)}
                          </td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'left'
                          }}>
                            <button
                              onClick={() => handleEdit(target)}
                              style={{
                                padding: '6px 14px',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: '#3B82F6',
                                backgroundColor: 'transparent',
                                border: '1px solid #3B82F6',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#3B82F6'
                                e.currentTarget.style.color = '#FFFFFF'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = '#3B82F6'
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* SUCCESS MESSAGE OVERLAY */}
        {/* ================================================================ */}
        {showSuccessMessage && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px'
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              padding: '32px',
              borderRadius: '8px',
              width: '400px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              textAlign: 'center'
            }}>
              {/* Success Icon */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#D1FAE5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <span style={{ fontSize: '32px' }}>✅</span>
              </div>

              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px'
              }}>
                Target Saved Successfully!
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#6B7280',
                marginBottom: '24px',
                whiteSpace: 'pre-line',
                textAlign: 'left'
              }}>
                {successMessage || 'Target has been saved to database'}
              </p>

              <button
                onClick={() => {
                  setShowSuccessMessage(false)
                  setSuccessMessage('')
                }}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  backgroundColor: '#10B981',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
