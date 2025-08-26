'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface YearSlicerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  years?: string[]
  selectedCurrency?: string
}

export default function YearSlicer({ value, onChange, className = '', years: propYears, selectedCurrency = 'USC' }: YearSlicerProps) {
  const [years, setYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (propYears) {
      setYears(propYears)
      setLoading(false)
    } else {
      const fetchYears = async () => {
        try {
          setLoading(true)
          
          const { data: yearData } = await supabase
            .from('member_report_daily')
            .select('year')
            .eq('currency', selectedCurrency)
            .order('year', { ascending: false })
          
          const availableYears = Array.from(new Set(yearData?.map((row: any) => row.year?.toString()).filter(Boolean) || [])) as string[]
          setYears(availableYears)
          
        } catch (error) {
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