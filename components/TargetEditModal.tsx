/**
 * ============================================================================
 * TARGET EDIT MODAL - MYR BUSINESS PERFORMANCE
 * ============================================================================
 * 
 * Enhanced target input system with:
 * - LINE dropdown (auto-detect from database)
 * - QUARTER dropdown
 * - Table-like input layout
 * - Target List Table with all existing targets
 * - TOTAL row with AUTO SUM
 * - EDIT functionality per row
 * - Role-based access control (Manager MYR/SGD/USC + Admin only)
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
}

interface TargetTotals {
  total_ggr: number
  total_deposit_amount: number
  total_deposit_cases: number
  total_active_member: number
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
  
  // Input form
  const [selectedLine, setSelectedLine] = useState<string>('')
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1')
  const [inputData, setInputData] = useState({
    ggr: 0,
    deposit_amount: 0,
    deposit_cases: 0,
    active_member: 0
  })
  
  // Target list & totals
  const [targetList, setTargetList] = useState<TargetData[]>([])
  const [totals, setTotals] = useState<TargetTotals>({
    total_ggr: 0,
    total_deposit_amount: 0,
    total_deposit_cases: 0,
    total_active_member: 0
  })
  
  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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
        setSelectedLine(data.brands[0]) // Set first brand as default
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
        setTargetList(data.targets)
        calculateTotals(data.targets)
      }
    } catch (err) {
      console.error('Error fetching targets:', err)
    } finally {
      setLoadingData(false)
    }
  }

  // ============================================================================
  // CALCULATE TOTALS (AUTO SUM)
  // ============================================================================
  const calculateTotals = (targets: TargetData[]) => {
    const totals = targets.reduce((acc, target) => ({
      total_ggr: acc.total_ggr + (target.target_ggr || 0),
      total_deposit_amount: acc.total_deposit_amount + (target.target_deposit_amount || 0),
      total_deposit_cases: acc.total_deposit_cases + (target.target_deposit_cases || 0),
      total_active_member: acc.total_active_member + (target.target_active_member || 0)
    }), {
      total_ggr: 0,
      total_deposit_amount: 0,
      total_deposit_cases: 0,
      total_active_member: 0
    })
    
    setTotals(totals)
  }

  // ============================================================================
  // EDIT ROW - LOAD DATA TO INPUT FORM
  // ============================================================================
  const handleEditRow = (target: TargetData) => {
    setEditMode(true)
    setEditingId(target.id || null)
    setSelectedLine(target.line)
    setSelectedQuarter(target.quarter)
    setInputData({
      ggr: target.target_ggr,
      deposit_amount: target.target_deposit_amount,
      deposit_cases: target.target_deposit_cases,
      active_member: target.target_active_member
    })
    
    // Scroll to top
    const modalContent = document.querySelector('.target-modal-content')
    if (modalContent) {
      modalContent.scrollTop = 0
    }
  }

  // ============================================================================
  // RESET FORM
  // ============================================================================
  const resetForm = () => {
    setEditMode(false)
    setEditingId(null)
    setSelectedQuarter('Q1')
    setInputData({
      ggr: 0,
      deposit_amount: 0,
      deposit_cases: 0,
      active_member: 0
    })
    if (brands.length > 0) {
      setSelectedLine(brands[0])
    }
  }

  // ============================================================================
  // SAVE - ROLE-BASED ACCESS ONLY (NO PASSWORD)
  // ============================================================================
  const handleSave = async () => {
    // Validate inputs
    if (!selectedLine || !selectedQuarter) {
      setError('Please select LINE and QUARTER')
      return
    }
    
    if (inputData.ggr <= 0) {
      setError('GGR is required and must be greater than 0')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/myr-business-performance/target/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          reason: editMode ? 'Update existing target' : 'Create new target'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setShowSuccessMessage(true) // Show success message
        await fetchTargets() // Refresh list
        onSaveSuccess() // Refresh dashboard
      } else {
        setError(data.error || 'Failed to save target')
      }
    } catch (err) {
      setError('Network error. Please try again.')
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
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        {/* ================================================================ */}
        {/* HEADER */}
        {/* ================================================================ */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#F9FAFB'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              MYR TARGET
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6B7280',
              margin: '4px 0 0 0'
            }}>
              Set targets for {year}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6B7280',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>

        {/* ================================================================ */}
        {/* INPUT FORM SECTION */}
        {/* ================================================================ */}
        <div style={{ padding: '24px', borderBottom: '2px solid #E5E7EB' }}>
          {/* LINE & QUARTER DROPDOWNS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto auto',
            gap: '16px',
            marginBottom: '20px',
            alignItems: 'end'
          }}>
            {/* LINE DROPDOWN */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                LINE
              </label>
              <select
                value={selectedLine}
                onChange={(e) => setSelectedLine(e.target.value)}
                disabled={loadingData}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  cursor: loadingData ? 'not-allowed' : 'pointer'
                }}
              >
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* QUARTER DROPDOWN */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                QUARTER
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
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  cursor: 'pointer'
                }}
              >
                <option value="Q1">QUARTER 1</option>
                <option value="Q2">QUARTER 2</option>
                <option value="Q3">QUARTER 3</option>
                <option value="Q4">QUARTER 4</option>
              </select>
            </div>

            {/* BUTTONS */}
            <button
              onClick={resetForm}
              disabled={!editMode}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                color: editMode ? '#374151' : '#9CA3AF',
                backgroundColor: editMode ? '#F3F4F6' : '#F9FAFB',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                cursor: editMode ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              {editMode ? 'CANCEL' : 'EDIT'}
            </button>

            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#FFFFFF',
                backgroundColor: loading ? '#9CA3AF' : '#3B82F6',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'SAVING...' : editMode ? 'UPDATE' : 'SAVE'}
            </button>
          </div>

          {/* KPI INPUT TABLE */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px'
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
                value={inputData.ggr}
                onChange={(e) => setInputData({ ...inputData, ggr: Number(e.target.value) })}
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

            {/* DEPOSIT AMOUNT */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '6px'
              }}>
                DEPOSIT AMOUNT
              </label>
              <input
                type="number"
                value={inputData.deposit_amount}
                onChange={(e) => setInputData({ ...inputData, deposit_amount: Number(e.target.value) })}
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

            {/* DEPOSIT CASES */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '6px'
              }}>
                DEPOSIT CASES
              </label>
              <input
                type="number"
                value={inputData.deposit_cases}
                onChange={(e) => setInputData({ ...inputData, deposit_cases: Number(e.target.value) })}
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

            {/* ACTIVE MEMBER */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '6px'
              }}>
                ACTIVE MEMBER
              </label>
              <input
                type="number"
                value={inputData.active_member}
                onChange={(e) => setInputData({ ...inputData, active_member: Number(e.target.value) })}
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
        {/* TARGET LIST TABLE */}
        {/* ================================================================ */}
        <div style={{ padding: '24px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px'
          }}>
            Target List
          </h3>

          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
              Loading targets...
            </div>
          ) : (
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              overflow: 'hidden',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                {/* TABLE HEADER */}
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}>
                  <tr style={{ backgroundColor: '#F3F4F6' }}>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: '#F3F4F6'
                    }}>Line</th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: '#F3F4F6'
                    }}>GGR</th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: '#F3F4F6'
                    }}>DEPOSIT AMOUNT</th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: '#F3F4F6'
                    }}>DEPOSIT CASES</th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: '#F3F4F6'
                    }}>ACTIVE MEMBER</th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: '#F3F4F6'
                    }}>QUARTER</th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: '#F3F4F6'
                    }}>ACTION</th>
                  </tr>
                </thead>

                {/* TABLE BODY */}
                <tbody>
                  {targetList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: '#6B7280',
                        fontSize: '14px'
                      }}>
                        No targets set yet. Add your first target above.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {targetList.map((target, index) => (
                        <tr key={target.id || index} style={{
                          backgroundColor: '#FFFFFF',
                          borderBottom: '1px solid #E5E7EB'
                        }}>
                          <td style={{
                            padding: '12px 16px',
                            fontSize: '14px',
                            color: '#111827',
                            fontWeight: '500'
                          }}>{target.line}</td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontSize: '14px',
                            color: '#111827'
                          }}>{formatNumber(target.target_ggr)}</td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontSize: '14px',
                            color: '#111827'
                          }}>{formatNumber(target.target_deposit_amount)}</td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontSize: '14px',
                            color: '#111827'
                          }}>{formatNumber(target.target_deposit_cases)}</td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontSize: '14px',
                            color: '#111827'
                          }}>{formatNumber(target.target_active_member)}</td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'center',
                            fontSize: '14px',
                            color: '#111827'
                          }}>{target.quarter}</td>
                          <td style={{
                            padding: '12px 16px',
                            textAlign: 'center'
                          }}>
                            <button
                              onClick={() => handleEditRow(target)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: '#3B82F6',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              EDIT
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* TOTAL ROW */}
                      <tr style={{
                        backgroundColor: '#F3F4F6',
                        fontWeight: '600'
                      }}>
                        <td style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: '700'
                        }}>TOTAL</td>
                        <td style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: '700'
                        }}>{formatNumber(totals.total_ggr)}</td>
                        <td style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: '700'
                        }}>{formatNumber(totals.total_deposit_amount)}</td>
                        <td style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: '700'
                        }}>{formatNumber(totals.total_deposit_cases)}</td>
                        <td style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: '700'
                        }}>{formatNumber(totals.total_active_member)}</td>
                        <td style={{
                          padding: '12px 16px',
                          textAlign: 'center',
                          fontSize: '13px',
                          color: '#6B7280'
                        }}>AUTO SUM</td>
                        <td></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
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
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px'
              }}>
                Target Saved Successfully!
              </h3>
              
              <p style={{
                fontSize: '14px',
                color: '#6B7280',
                marginBottom: '24px'
              }}>
                Target telah disimpan dan dashboard akan diperbarui.
              </p>

              <button
                onClick={() => {
                  setShowSuccessMessage(false)
                  resetForm()
                  // DO NOT CLOSE MODAL - User can continue editing other targets
                  // Only × button in header should close the modal
                }}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  backgroundColor: '#10B981',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10B981'
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
