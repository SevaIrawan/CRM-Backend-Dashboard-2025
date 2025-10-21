/**
 * ============================================================================
 * QUICK DATE FILTER COMPONENT
 * ============================================================================
 * 
 * STANDARD KHUSUS BUSINESS PERFORMANCE PAGE
 * - Simple button-based date selection (no manual date picker)
 * - 3 preset options: 7 Days, 14 Days, This Month
 * - "Last Month" REMOVED to avoid cross-quarter confusion
 * - Professional & fast UX (1-click selection)
 * - Auto-calculate date range based on button selection
 * 
 * USAGE:
 * <QuickDateFilter
 *   activeFilter="7_DAYS"
 *   onFilterChange={(filterType) => handleDateFilterChange(filterType)}
 * />
 * 
 * ============================================================================
 */

'use client'

import React from 'react'
import { 
  QuickDateFilterType, 
  QUICK_DATE_FILTER_LABELS 
} from '@/lib/businessPerformanceHelper'

interface QuickDateFilterProps {
  activeFilter: QuickDateFilterType
  onFilterChange: (filterType: QuickDateFilterType) => void
  disabled?: boolean
}

export default function QuickDateFilter({
  activeFilter,
  onFilterChange,
  disabled = false
}: QuickDateFilterProps) {
  const filters: QuickDateFilterType[] = ['7_DAYS', '14_DAYS', 'THIS_MONTH']

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => !disabled && onFilterChange(filter)}
          disabled={disabled}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: activeFilter === filter ? '600' : '500',
            color: disabled 
              ? '#9CA3AF'  // Grey when disabled
              : activeFilter === filter 
                ? '#FFFFFF'  // White when active
                : '#374151', // Dark grey when inactive
            backgroundColor: disabled
              ? '#F3F4F6'  // Light grey when disabled
              : activeFilter === filter 
                ? '#3B82F6'  // Blue when active
                : '#FFFFFF', // White when inactive
            border: disabled
              ? '1px solid #E5E7EB'
              : activeFilter === filter
                ? '1px solid #3B82F6'
                : '1px solid #D1D5DB',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (!disabled && activeFilter !== filter) {
              e.currentTarget.style.backgroundColor = '#F9FAFB'
              e.currentTarget.style.borderColor = '#9CA3AF'
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && activeFilter !== filter) {
              e.currentTarget.style.backgroundColor = '#FFFFFF'
              e.currentTarget.style.borderColor = '#D1D5DB'
            }
          }}
        >
          {QUICK_DATE_FILTER_LABELS[filter]}
        </button>
      ))}
    </div>
  )
}

