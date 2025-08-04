'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import config from '@/lib/config'

interface LineSlicerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  selectedCurrency?: string // CONNECT KE SLICER CURRENCY
  selectedYear?: string // CONNECT KE SLICER YEAR
  selectedMonth?: string // CONNECT KE SLICER MONTH
}

export default function LineSlicer({ value, onChange, className = '', selectedCurrency = 'MYR', selectedYear = '2025', selectedMonth = 'January' }: LineSlicerProps) {
  const [availableLines, setAvailableLines] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAvailableLines = async () => {
      try {
        setLoading(true)
        console.log('📊 [LineSlicer] Fetching lines for currency:', selectedCurrency, 'year:', selectedYear, 'month:', selectedMonth)
        
        // Ambil line berdasarkan currency, year, dan month yang dipilih
        const { data, error } = await supabase
          .from('member_report_monthly')
          .select('line')
          .eq('currency', selectedCurrency)
          .eq('year', selectedYear)
          .eq('month', selectedMonth)
          .not('line', 'is', null)
          .limit(100000)
        
        if (error) throw error
        
        const lines = Array.from(new Set(data?.map((item: any) => item.line) || [])).sort() as string[]
        setAvailableLines(lines)
        
        console.log('✅ [LineSlicer] Lines loaded for currency', selectedCurrency, ':', lines)
      } catch (error) {
        console.error('❌ [LineSlicer] Error:', error)
        setAvailableLines([])
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableLines()
  }, [selectedCurrency, selectedYear, selectedMonth]) // DEPEND PADA selectedCurrency, selectedYear, selectedMonth

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
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          borderColor: '#e5e7eb',
          borderStyle: 'solid',
          borderWidth: '1px',
          borderTop: '1px solid #e5e7eb',
          borderRight: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
          borderLeft: '1px solid #e5e7eb'
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
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        borderColor: '#e5e7eb',
        borderStyle: 'solid',
        borderWidth: '1px',
        borderTop: '1px solid #e5e7eb',
        borderRight: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
        borderLeft: '1px solid #e5e7eb'
      }}
    >
      {availableLines.map((line) => (
        <option key={line} value={line}>
          {line}
        </option>
      ))}
    </select>
  )
}