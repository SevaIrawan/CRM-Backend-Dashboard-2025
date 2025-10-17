'use client'

import React, { useState, useEffect } from 'react'

interface MonthSlicerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  selectedYear?: string 
  selectedCurrency?: string
  disabled?: boolean
  months?: string[]
}

export default function MonthSlicer({ value, onChange, className = '', selectedYear = '2025', selectedCurrency = 'MYR', disabled = false, months: propMonths }: MonthSlicerProps) { 
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (propMonths) {
      setAvailableMonths(propMonths)
      setLoading(false)
      return
    }

    const fetchAvailableMonths = async () => {
      if (!selectedYear) {
        console.log('⏳ [MonthSlicer] Waiting for year selection...')
        return
      }

      try {
        setLoading(true)
        console.log('📅 [MonthSlicer] Fetching months from API for year:', selectedYear, 'currency:', selectedCurrency)
        
        // Determine API endpoint based on currency
        let apiEndpoint = '/api/usc-overview/slicer-options' // default
        if (selectedCurrency === 'MYR') {
          apiEndpoint = '/api/myr-overview/slicer-options'
        } else if (selectedCurrency === 'SGD') {
          apiEndpoint = '/api/sgd-overview/slicer-options'
        }
        
        const response = await fetch(apiEndpoint)
        const result = await response.json()
        
        if (result.success && result.data.months) {
          const months = result.data.months
          setAvailableMonths(months)
          
          console.log('✅ [MonthSlicer] Months loaded from API:', months)
          
          // Auto-select first month if current value is not in available months
          if (months.length > 0 && !months.includes(value)) {
            console.log('🔄 [MonthSlicer] Auto-selecting first available month:', months[0])
            onChange(months[0])
          }
        } else {
          setAvailableMonths([])
        }
      } catch (error) {
        console.error('❌ [MonthSlicer] Error:', error)
        setAvailableMonths([])
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableMonths()
  }, [selectedYear, selectedCurrency, propMonths, value, onChange])

  if (loading || disabled) {
    return (
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className={`subheader-select ${className}`}
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
          minWidth: '120px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
        }}
        disabled={disabled || loading}
      >
        <option>{disabled ? 'Select Currency First' : 'Loading...'}</option>
      </select>
    )
  }

  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className={`subheader-select ${className}`}
      style={{ 
        padding: '8px 12px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: 'white',
        fontSize: '14px',
        color: '#374151',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 0.2s ease',
        minWidth: '120px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
      }}
    >
      {availableMonths.map((month) => ( 
        <option key={month} value={month}>
          {month}
        </option>
      ))}
    </select>
  )
}

