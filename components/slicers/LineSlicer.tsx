'use client'

import React from 'react'

interface LineSlicerProps {
  lines: string[]
  selectedLine: string
  onLineChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export default function LineSlicer({ lines, selectedLine, onLineChange, disabled = false, className = '' }: LineSlicerProps) {

  return (
    <select 
      value={selectedLine} 
      onChange={(e) => onLineChange(e.target.value)}
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
      <option value="ALL">All</option>
      {lines.map((line) => (
        <option key={line} value={line}>
          {line}
        </option>
      ))}
    </select>
  )
}