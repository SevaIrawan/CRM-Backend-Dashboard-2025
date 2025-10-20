'use client'

import React, { useState, useMemo } from 'react'

interface DateRangeSlicerProps {
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
  className?: string
  disabled?: boolean
  minDate?: string | null // BOUNDED by quarter (Lock 1)
  maxDate?: string | null // BOUNDED by quarter (Lock 1)
}

export default function DateRangeSlicer({ 
  startDate, 
  endDate, 
  onDateChange, 
  className = '', 
  disabled = false,
  minDate = null,
  maxDate = null
}: DateRangeSlicerProps) {
  const [showPopup, setShowPopup] = useState(false)
  const [tempStartDate, setTempStartDate] = useState(startDate)
  const [tempEndDate, setTempEndDate] = useState(endDate)
  
  // 🔒 LOCK 2: Calculate days difference and validate (Max 31 days)
  const getDaysDifference = (start: string, end: string): number => {
    if (!start || !end) return 0
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // Include both start and end day
    return diffDays
  }
  
  // Validation: Check if date range exceeds 31 days
  const daysDiff = useMemo(() => getDaysDifference(tempStartDate, tempEndDate), [tempStartDate, tempEndDate])
  const isExceeded = daysDiff > 31
  const isValidRange = tempStartDate && tempEndDate && new Date(tempStartDate) <= new Date(tempEndDate)
  const canApply = isValidRange && !isExceeded
  
  const formatDisplayDate = (date: string) => {
    if (!date) return 'Select Date'
    const d = new Date(date)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  
  const handleApply = () => {
    if (!canApply) return // Prevent apply if validation fails
    onDateChange(tempStartDate, tempEndDate)
    setShowPopup(false)
  }
  
  const handleCancel = () => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
    setShowPopup(false)
  }
  
  return (
    <div className={className} style={{ position: 'relative' }}>
      {/* Date Range Button */}
      <button
        onClick={() => !disabled && setShowPopup(!showPopup)}
        disabled={disabled}
        style={{ 
          padding: '8px 12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: disabled ? '#f3f4f6' : 'white',
          fontSize: '14px',
          color: disabled ? '#9ca3af' : '#374151',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease',
          minWidth: '200px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        <span>
          📅 {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
        </span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>▼</span>
      </button>
      
      {/* Popup Date Picker */}
      {showPopup && (
        <>
          {/* Overlay */}
          <div 
            onClick={handleCancel}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 998
            }}
          />
          
          {/* Popup Card */}
          <div 
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              padding: '16px',
              zIndex: 999,
              minWidth: '300px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Select Date Range
            </h4>
            
            {/* Start Date */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '4px'
              }}>
                Start Date
              </label>
              <input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                min={minDate || undefined}
                max={maxDate || undefined}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            {/* End Date */}
            <div style={{ marginBottom: isExceeded ? '12px' : '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '4px'
              }}>
                End Date
              </label>
              <input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                min={minDate || undefined}
                max={maxDate || undefined}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            {/* 🔒 LOCK 2: Validation Error Message */}
            {isExceeded && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '16px', lineHeight: '1' }}>❌</span>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#dc2626',
                      marginBottom: '4px'
                    }}>
                      Date range exceeds 31 days limit
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: '#991b1b'
                    }}>
                      ({daysDiff} days selected)
                    </p>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid #fecaca'
                }}>
                  <span style={{ fontSize: '16px', lineHeight: '1' }}>💡</span>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: '#991b1b',
                    lineHeight: '1.4'
                  }}>
                    <strong>Suggestion:</strong> For longer periods, please use Monthly/Quarter mode instead to maintain chart proportions.
                  </p>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!canApply}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: canApply ? '#3B82F6' : '#d1d5db',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  cursor: canApply ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s ease',
                  opacity: canApply ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  if (canApply) e.currentTarget.style.backgroundColor = '#2563eb'
                }}
                onMouseLeave={(e) => {
                  if (canApply) e.currentTarget.style.backgroundColor = '#3B82F6'
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

