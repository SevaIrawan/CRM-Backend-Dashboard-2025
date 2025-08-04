'use client'

import React, { useState, useEffect } from 'react'
import { getSlicerData } from '@/lib/KPILogic'

interface YearSlicerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function YearSlicer({ value, onChange, className = '' }: YearSlicerProps) {
  const [years, setYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchYears = async () => {
      try {
        setLoading(true)
        console.log('📅 [YearSlicer] Fetching years from Supabase...')
        
        const slicerData = await getSlicerData()
        setYears(slicerData.years)
        
        console.log('✅ [YearSlicer] Years loaded:', slicerData.years)
      } catch (error) {
        console.error('❌ [YearSlicer] Error:', error)
        setYears([])
      } finally {
        setLoading(false)
      }
    }

    fetchYears()
  }, [])

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