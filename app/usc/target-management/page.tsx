'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner'
import { formatCurrencyKPI, formatIntegerKPI } from '@/lib/formatHelpers'
import { supabase } from '@/lib/supabase'

interface TargetData {
  id?: number
  line: string
  quarter: string
  month?: string
  target_ggr: number | null
  target_deposit_amount: number | null
  target_deposit_cases: number | null
  target_active_member: number | null
  forecast_ggr: number | null
  created_at?: string
  updated_at?: string
  updated_by?: string
}

export default function USCTargetManagementPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  
  // User info
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('')
  
  // Slicer states
  const [selectedYear, setSelectedYear] = useState('2025')
  const [selectedQuarter, setSelectedQuarter] = useState('Q1')
  const [selectedLine, setSelectedLine] = useState('ALL')
  const [availableLines, setAvailableLines] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<string[]>([])
  
  // Target data
  const [targets, setTargets] = useState<TargetData[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    target_ggr: '',
    target_deposit_amount: '',
    target_deposit_cases: '',
    target_active_member: '',
    reason: ''
  })
  
  // Edit mode
  const [editingTarget, setEditingTarget] = useState<TargetData | null>(null)
  
  // Quarters
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  
  // Hydration fix
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Check access on mount
  useEffect(() => {
    if (isMounted) {
      checkAccess()
    }
  }, [isMounted])
  
  // Load data when filters change
  useEffect(() => {
    if (hasAccess && selectedYear) {
      loadTargets()
      loadSlicerOptions()
    }
  }, [hasAccess, selectedYear])
  
  // Check role access (Manager USC, Executive, Admin only)
  const checkAccess = () => {
    try {
      const userStr = localStorage.getItem('nexmax_user') || localStorage.getItem('nexmax_session')
      if (!userStr) {
        router.push('/login')
        return
      }
      
      const user = JSON.parse(userStr)
      const role = user.role
      
      // Allowed roles: manager_usc, executive, admin
      const allowedRoles = ['manager_usc', 'executive', 'admin']
      
      if (allowedRoles.includes(role)) {
        setHasAccess(true)
        setUserEmail(user.email || `${user.username}@nexmax.com`)
        setUserRole(role)
      } else {
        setHasAccess(false)
        setError('Unauthorized: Only Manager USC, Executive, and Admin can access this page')
      }
    } catch (error) {
      console.error('❌ [USC Target] Error checking access:', error)
      setError('Failed to verify access')
    } finally {
      setCheckingAccess(false)
    }
  }
  
  // Load slicer options (years and lines)
  const loadSlicerOptions = async () => {
    try {
      // Get years from bp_target table
      const { data: yearsData } = await supabase
        .from('bp_target')
        .select('year')
        .eq('currency', 'USC')
        .not('year', 'is', null)
      
      const uniqueYears = Array.from(new Set(yearsData?.map(r => r.year?.toString()).filter(Boolean) || []))
      const sortedYears = uniqueYears.sort((a, b) => parseInt(b || '0') - parseInt(a || '0'))
      setAvailableYears(sortedYears.length > 0 ? sortedYears : ['2025'])
      
      // Get lines from blue_whale_usc
      const { data: linesData } = await supabase
        .from('blue_whale_usc')
        .select('line')
        .eq('currency', 'USC')
        .not('line', 'is', null)
      
      const uniqueLines = Array.from(new Set(linesData?.map(r => r.line).filter(Boolean) || []))
      const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
      const sortedLines = ['ALL', ...cleanLines.sort()]
      setAvailableLines(sortedLines)
    } catch (error) {
      console.error('❌ [USC Target] Error loading slicer options:', error)
    }
  }
  
  // Load targets for selected year
  const loadTargets = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/usc-target-management/list?year=${selectedYear}`)
      const result = await response.json()
      
      if (result.success) {
        setTargets(result.targets || [])
      } else {
        const errorMsg = result.details 
          ? `${result.error || 'Failed to load targets'}\n\nDetails: ${result.details}`
          : result.error || 'Failed to load targets'
        setError(errorMsg)
        console.error('❌ [USC Target] Load failed:', result)
      }
    } catch (error) {
      console.error('❌ [USC Target] Error loading targets:', error)
      const errorMsg = error instanceof Error 
        ? `Failed to load targets: ${error.message}`
        : 'Failed to load targets'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }
  
  // Handle form input change
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  // Handle save target
  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)
      
      // Validate required fields
      if (!selectedLine || !selectedQuarter) {
        setError('Please select Line and Quarter')
        return
      }
      
      const saveData = {
        line: selectedLine,
        year: parseInt(selectedYear),
        quarter: selectedQuarter,
        target_ggr: formData.target_ggr ? parseFloat(formData.target_ggr) : null,
        target_deposit_amount: formData.target_deposit_amount ? parseFloat(formData.target_deposit_amount) : null,
        target_deposit_cases: formData.target_deposit_cases ? parseInt(formData.target_deposit_cases) : null,
        target_active_member: formData.target_active_member ? parseInt(formData.target_active_member) : null,
        forecast_ggr: null, // Forecast GGR removed from form
        user_email: userEmail,
        user_role: userRole,
        reason: formData.reason || null
      }
      
      const response = await fetch('/api/usc-target-management/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSuccessMessage(result.message || 'Target saved successfully')
        resetForm()
        loadTargets() // Reload targets
        // Clear error message on success
        setTimeout(() => setSuccessMessage(null), 5000)
      } else {
        // Show detailed error message
        const errorMsg = result.details 
          ? `${result.error || 'Failed to save target'}\n\nDetails: ${result.details}`
          : result.error || 'Failed to save target'
        setError(errorMsg)
        console.error('❌ [USC Target] Save failed:', result)
      }
    } catch (error) {
      console.error('❌ [USC Target] Error saving target:', error)
      const errorMsg = error instanceof Error 
        ? `Failed to save target: ${error.message}`
        : 'Failed to save target'
      setError(errorMsg)
    } finally {
      setSaving(false)
    }
  }
  
  // Handle edit target
  const handleEdit = (target: TargetData) => {
    setEditingTarget(target)
    setSelectedLine(target.line)
    setSelectedQuarter(target.quarter)
    setFormData({
      target_ggr: target.target_ggr?.toString() || '',
      target_deposit_amount: target.target_deposit_amount?.toString() || '',
      target_deposit_cases: target.target_deposit_cases?.toString() || '',
      target_active_member: target.target_active_member?.toString() || '',
      reason: ''
    })
  }
  
  // Reset form
  const resetForm = () => {
    setEditingTarget(null)
    setFormData({
      target_ggr: '',
      target_deposit_amount: '',
      target_deposit_cases: '',
      target_active_member: '',
      reason: ''
    })
  }
  
  // Get targets for selected quarter and line (now includes monthly breakdown)
  const getFilteredTargets = () => {
    return targets.filter(t => 
      t.quarter === selectedQuarter && 
      (selectedLine === 'ALL' || t.line === selectedLine)
    ).sort((a, b) => {
      // Sort by month order
      const monthOrder: Record<string, number> = {
        'January': 1, 'February': 2, 'March': 3,
        'April': 4, 'May': 5, 'June': 6,
        'July': 7, 'August': 8, 'September': 9,
        'October': 10, 'November': 11, 'December': 12
      }
      const aMonth = a.month ? (monthOrder[a.month] || 99) : 99
      const bMonth = b.month ? (monthOrder[b.month] || 99) : 99
      return aMonth - bMonth
    })
  }
  
  if (!isMounted || checkingAccess) {
    return <StandardLoadingSpinner message="Checking access..." />
  }
  
  if (!hasAccess) {
    return (
      <Layout>
        <Frame variant="standard">
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
            <h2>Access Denied</h2>
            <p>{error || 'You do not have permission to access this page'}</p>
            <p style={{ marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
              Only Manager USC, Executive, and Admin can access Target Management.
            </p>
          </div>
        </Frame>
      </Layout>
    )
  }
  
  // Custom SubHeader
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        <span className="filter-export-text"> </span>
      </div>
      
      <div className="subheader-controls">
        {/* YEAR SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">YEAR:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="slicer-select"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        {/* QUARTER SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">QUARTER:</label>
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="slicer-select"
          >
            {quarters.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
        
        {/* LINE SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="slicer-select"
          >
            {availableLines.map(line => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
        </div>
        
        {/* SAVE TARGET BUTTON */}
        <button 
          onClick={handleSave}
          disabled={saving}
          className={`export-button ${saving ? 'disabled' : ''}`}
          style={{ backgroundColor: '#10b981' }}
        >
          {saving ? 'Saving...' : editingTarget ? 'Update Target' : 'Save Target'}
        </button>
      </div>
    </div>
  )

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="standard">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          marginTop: '20px',
          height: 'calc(100vh - 200px)',
          overflowY: 'auto',
          paddingRight: '8px'
        }}>
          
          {/* Messages */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              color: '#DC2626',
              whiteSpace: 'pre-line'
            }}>
              <strong>Error:</strong> {error}
              <button
                onClick={() => setError(null)}
                style={{
                  float: 'right',
                  background: 'none',
                  border: 'none',
                  color: '#DC2626',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  padding: '0 8px'
                }}
              >
                ×
              </button>
            </div>
          )}
          
          {successMessage && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#D1FAE5',
              border: '1px solid #A7F3D0',
              borderRadius: '6px',
              color: '#059669'
            }}>
              <strong>Success:</strong> {successMessage}
              <button
                onClick={() => setSuccessMessage(null)}
                style={{
                  float: 'right',
                  background: 'none',
                  border: 'none',
                  color: '#059669',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  padding: '0 8px'
                }}
              >
                ×
              </button>
            </div>
          )}
          
          {/* Form */}
          <div style={{
            padding: '20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E7EB'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
              {editingTarget ? 'Edit Target' : 'Set New Target'}
            </h2>
            
            {/* 4 KPI Inputs in 1 Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                  Target GGR
                </label>
                <input
                  type="number"
                  value={formData.target_ggr}
                  onChange={(e) => handleInputChange('target_ggr', e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                  Target Deposit Amount
                </label>
                <input
                  type="number"
                  value={formData.target_deposit_amount}
                  onChange={(e) => handleInputChange('target_deposit_amount', e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                  Target Deposit Cases
                </label>
                <input
                  type="number"
                  value={formData.target_deposit_cases}
                  onChange={(e) => handleInputChange('target_deposit_cases', e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                  Target Active Member
                </label>
                <input
                  type="number"
                  value={formData.target_active_member}
                  onChange={(e) => handleInputChange('target_active_member', e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            
            {editingTarget && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={resetForm}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6B7280',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          {/* Targets Table */}
          <div style={{
            padding: '20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E7EB'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '16px' }}>
              Saved Targets ({selectedYear} - {selectedQuarter})
            </h2>
            
            {loading ? (
              <StandardLoadingSpinner message="Loading targets..." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#374151' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#FFFFFF', border: '1px solid #4b5563' }}>Quarter</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#FFFFFF', border: '1px solid #4b5563' }}>Month</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', color: '#FFFFFF', border: '1px solid #4b5563' }}>Target GGR</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', color: '#FFFFFF', border: '1px solid #4b5563' }}>Deposit Amount</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', color: '#FFFFFF', border: '1px solid #4b5563' }}>Deposit Cases</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', color: '#FFFFFF', border: '1px solid #4b5563' }}>Active Member</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', color: '#FFFFFF', border: '1px solid #4b5563' }}>Forecast GGR</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', color: '#FFFFFF', border: '1px solid #4b5563' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredTargets().length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
                          No targets found for {selectedQuarter} {selectedYear}
                        </td>
                      </tr>
                    ) : (
                      getFilteredTargets().map((target, index) => (
                        <tr key={target.id || index} style={{
                          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                        }}>
                          <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151' }}>{target.quarter}</td>
                          <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151' }}>{target.month || '-'}</td>
                          <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                            {target.target_ggr ? formatCurrencyKPI(target.target_ggr, 'USC') : '-'}
                          </td>
                          <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                            {target.target_deposit_amount ? formatCurrencyKPI(target.target_deposit_amount, 'USC') : '-'}
                          </td>
                          <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                            {target.target_deposit_cases ? formatIntegerKPI(target.target_deposit_cases) : '-'}
                          </td>
                          <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                            {target.target_active_member ? formatIntegerKPI(target.target_active_member) : '-'}
                          </td>
                          <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0', color: '#374151', textAlign: 'right' }}>
                            {target.forecast_ggr ? formatCurrencyKPI(target.forecast_ggr, 'USC') : '-'}
                          </td>
                          <td style={{ padding: '10px 14px', border: '1px solid #e0e0e0' }}>
                            <button
                              onClick={() => handleEdit(target)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#3B82F6',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Frame>
    </Layout>
  )
}

