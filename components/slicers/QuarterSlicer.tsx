'use client'

import React from 'react'

interface QuarterSlicerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  quarters?: string[] // Optional: filter available quarters
}

// Quarter mapping
const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Jan-Mar)', months: ['January', 'February', 'March'] },
  { value: 'Q2', label: 'Q2 (Apr-Jun)', months: ['April', 'May', 'June'] },
  { value: 'Q3', label: 'Q3 (Jul-Sep)', months: ['July', 'August', 'September'] },
  { value: 'Q4', label: 'Q4 (Oct-Dec)', months: ['October', 'November', 'December'] }
]

export default function QuarterSlicer({ 
  value, 
  onChange, 
  className = '', 
  disabled = false,
  quarters 
}: QuarterSlicerProps) {
  
  // Filter quarters if provided, otherwise show all
  const availableQuarters = quarters 
    ? QUARTERS.filter(q => quarters.includes(q.value))
    : QUARTERS
  
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className={`subheader-select ${className}`}
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
        minWidth: '150px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
      }}
    >
      {availableQuarters.map((quarter) => (
        <option key={quarter.value} value={quarter.value}>
          {quarter.label}
        </option>
      ))}
    </select>
  )
}

// Helper function to convert month to quarter
export function monthToQuarter(month: string): string {
  const quarter = QUARTERS.find(q => q.months.includes(month))
  return quarter ? quarter.value : 'Q1'
}

// Helper function to get months in a quarter
export function getQuarterMonths(quarter: string): string[] {
  const q = QUARTERS.find(q => q.value === quarter)
  return q ? q.months : []
}

