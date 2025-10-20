'use client'

import React, { useState, useEffect } from 'react'

interface TargetEditModalProps {
  isOpen: boolean
  onClose: () => void
  currency: string
  line: string
  year: string
  quarter: string
  currentActualGGR: number
  userEmail: string
  userRole: string
  onSaveSuccess: () => void
}

interface TargetData {
  target_ggr: number | null
  target_deposit_amount: number | null
  target_deposit_cases: number | null
  target_active_member: number | null
  forecast_ggr: number | null
}

export default function TargetEditModal({
  isOpen,
  onClose,
  currency,
  line,
  year,
  quarter,
  currentActualGGR,
  userEmail,
  userRole,
  onSaveSuccess
}: TargetEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  const [targetData, setTargetData] = useState<TargetData>({
    target_ggr: null,
    target_deposit_amount: null,
    target_deposit_cases: null,
    target_active_member: null,
    forecast_ggr: null
  })
  
  const [tempData, setTempData] = useState<TargetData>({
    target_ggr: null,
    target_deposit_amount: null,
    target_deposit_cases: null,
    target_active_member: null,
    forecast_ggr: null
  })

  // Fetch existing target when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchExistingTarget()
      setError('')
      setPassword('')
      setShowPasswordPrompt(false)
    }
  }, [isOpen, currency, line, year, quarter])

  const fetchExistingTarget = async () => {
    setLoadingExisting(true)
    try {
      const params = new URLSearchParams({
        currency,
        line,
        year,
        quarter
      })
      
      const response = await fetch(`/api/myr-business-performance/target?${params}`)
      const data = await response.json()
      
      if (data.exists && data.target) {
        setTargetData({
          target_ggr: data.target.target_ggr,
          target_deposit_amount: data.target.target_deposit_amount,
          target_deposit_cases: data.target.target_deposit_cases,
          target_active_member: data.target.target_active_member,
          forecast_ggr: data.target.forecast_ggr
        })
        setTempData({
          target_ggr: data.target.target_ggr,
          target_deposit_amount: data.target.target_deposit_amount,
          target_deposit_cases: data.target.target_deposit_cases,
          target_active_member: data.target.target_active_member,
          forecast_ggr: data.target.forecast_ggr
        })
      }
    } catch (err) {
      console.error('Error fetching existing target:', err)
    } finally {
      setLoadingExisting(false)
    }
  }

  const handleSaveClick = () => {
    setTempData({ ...targetData })
    setShowPasswordPrompt(true)
    setError('')
  }

  const handleConfirmSave = async () => {
    if (!password) {
      setError('Password is required')
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
          line,
          year: parseInt(year),
          quarter,
          ...tempData,
          user_email: userEmail,
          user_role: userRole,
          manager_password: password,
          reason: 'Updated via Business Performance Dashboard'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update target')
      }

      console.log('✅ Target updated successfully')
      setPassword('')
      setShowPasswordPrompt(false)
      onSaveSuccess()
      onClose()

    } catch (err) {
      console.error('Error updating target:', err)
      setError(err instanceof Error ? err.message : 'Failed to update target')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'MYR' ? 'MYR' : currency === 'SGD' ? 'SGD' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('en-US').format(value)
  }

  if (!isOpen) return null

  // Password confirmation modal
  if (showPasswordPrompt) {
    return (
      <>
        {/* Overlay */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {
            if (!loading) {
              setShowPasswordPrompt(false)
              setPassword('')
              setError('')
            }
          }}
        >
          {/* Password Modal */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Confirm Changes
            </h3>

            <p style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              Please enter your manager password to confirm target changes:
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleConfirmSave()
                  }
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                marginBottom: '16px'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#991b1b'
                }}>
                  {error}
                </p>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  if (!loading) {
                    setShowPasswordPrompt(false)
                    setPassword('')
                    setError('')
                  }
                }}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'background-color 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={loading || !password}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: loading || !password ? '#9ca3af' : '#3B82F6',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  cursor: loading || !password ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {loading ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Main edit modal
  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Edit Target - {quarter} {year}
            </h2>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {currency} • {line === 'ALL' ? 'All Brands' : line}
            </p>
          </div>

          {loadingExisting ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              Loading existing targets...
            </div>
          ) : (
            <>
              {/* Current Actual */}
              <div style={{
                padding: '16px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '500'
                }}>
                  Current Actual GGR
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {formatCurrency(currentActualGGR)}
                </div>
              </div>

              {/* Target Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Target GGR */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Target GGR <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={targetData.target_ggr || ''}
                    onChange={(e) => setTargetData({ ...targetData, target_ggr: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="e.g., 10000000"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Target Deposit Amount */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Target Deposit Amount
                  </label>
                  <input
                    type="number"
                    value={targetData.target_deposit_amount || ''}
                    onChange={(e) => setTargetData({ ...targetData, target_deposit_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="e.g., 50000000"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Target Deposit Cases */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Target Deposit Cases
                  </label>
                  <input
                    type="number"
                    value={targetData.target_deposit_cases || ''}
                    onChange={(e) => setTargetData({ ...targetData, target_deposit_cases: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="e.g., 100000"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Target Active Member */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Target Active Member
                  </label>
                  <input
                    type="number"
                    value={targetData.target_active_member || ''}
                    onChange={(e) => setTargetData({ ...targetData, target_active_member: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="e.g., 5000"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Forecast GGR */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Forecast GGR <span style={{ fontSize: '12px', color: '#6b7280' }}>(Optional)</span>
                  </label>
                  <input
                    type="number"
                    value={targetData.forecast_ggr || ''}
                    onChange={(e) => setTargetData({ ...targetData, forecast_ggr: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="e.g., 9500000"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Info */}
              <div style={{
                marginTop: '20px',
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '8px'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#92400e'
                }}>
                  ⚠️ You will be asked to confirm with your manager password before saving.
                </p>
              </div>

              {/* Actions */}
              <div style={{
                marginTop: '24px',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 24px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveClick}
                  disabled={!targetData.target_ggr}
                  style={{
                    padding: '10px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: !targetData.target_ggr ? '#9ca3af' : '#3B82F6',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    cursor: !targetData.target_ggr ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

