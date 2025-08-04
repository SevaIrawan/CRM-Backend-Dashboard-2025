'use client'

import React, { useState, useEffect } from 'react'
import { getMonthsForYear } from '@/lib/KPILogic'

interface MonthSlicerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  selectedYear?: string 
  selectedCurrency?: string
}

export default function MonthSlicer({ value, onChange, className = '', selectedYear = '2025', selectedCurrency = 'MYR' }: MonthSlicerProps) { 
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAvailableMonths = async () => {
      if (!selectedYear) {
        console.log('⏳ [MonthSlicer] Waiting for year selection...')
        return
      }

      try {
        setLoading(true)
        console.log('📅 [MonthSlicer] Fetching months for year using KPILogic PostgreSQL pattern:', selectedYear)
        
        // Use centralized KPILogic function (PostgreSQL pattern)
        const months = await getMonthsForYear(selectedYear, selectedCurrency)
        setAvailableMonths(months)
        
        console.log('✅ [MonthSlicer] Months loaded for year', selectedYear, 'currency', selectedCurrency, ':', months)
        console.log('📊 [MonthSlicer] Using PostgreSQL pattern getMonthsForYear() with currency filter')
        
        // Auto-select first month if current value is not in available months
        if (months.length > 0 && !months.includes(value)) {
          console.log('🔄 [MonthSlicer] Auto-selecting first available month:', months[0])
          onChange(months[0])
        }
      } catch (error) {
        console.error('❌ [MonthSlicer] Error:', error)
        setAvailableMonths([])
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableMonths()
  }, [selectedYear, selectedCurrency])

  if (loading) {
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
        disabled
      >
        <option>Loading...</option>
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