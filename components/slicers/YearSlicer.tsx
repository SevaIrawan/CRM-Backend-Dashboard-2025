'use client'

import React, { useState, useEffect } from 'react'

interface YearSlicerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  years?: string[]
  selectedCurrency?: string
}

export default function YearSlicer({ value, onChange, className = '', years: propYears, selectedCurrency = 'MYR' }: YearSlicerProps) {
  const [years, setYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (propYears && propYears.length > 0) {
      console.log('✅ [YearSlicer] Using prop years:', propYears)
      setYears(propYears)
      setLoading(false)
    } else if (propYears !== undefined) {
      // propYears passed but empty - still use it, don't fetch
      console.log('⚠️ [YearSlicer] Prop years empty, using it anyway')
      setYears([])
      setLoading(false)
    } else {
      const fetchYears = async () => {
        try {
          setLoading(true)
          
          // Determine API endpoint based on currency
          let apiEndpoint = '/api/usc-overview/slicer-options' // default
          if (selectedCurrency === 'MYR') {
            apiEndpoint = '/api/myr-overview/slicer-options'
          } else if (selectedCurrency === 'SGD') {
            apiEndpoint = '/api/sgd-overview/slicer-options'
          }
          
          const response = await fetch(apiEndpoint)
          const result = await response.json()
          
          if (result.success && result.data.years) {
            setYears(result.data.years)
          } else {
            setYears([])
          }
          
        } catch (error) {
          console.error('❌ [YearSlicer] Error fetching years:', error)
          setYears([])
        } finally {
          setLoading(false)
        }
      }

      fetchYears()
    }
  }, [propYears, selectedCurrency])

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
          minWidth: '100px',
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
        minWidth: '100px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
      }}
    >
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  )
}

