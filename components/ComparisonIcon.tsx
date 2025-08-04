'use client'

import React from 'react'
import { getComparisonIcon, getComparisonColor } from '@/lib/KPILogic'

interface ComparisonIconProps {
  value: number
  size?: string
  showText?: boolean
  text?: string
  className?: string
}

export default function ComparisonIcon({ 
  value, 
  size = '12px', 
  showText = false, 
  text = 'vs Last Month',
  className = ''
}: ComparisonIconProps) {
  const icon = getComparisonIcon(value, size)
  const color = getComparisonColor(value)
  
  if (showText) {
    return (
      <span 
        className={`comparison-icon ${className}`}
        style={{ color }}
        dangerouslySetInnerHTML={{
          __html: `${text} ${icon}`
        }}
      />
    )
  }
  
  return (
    <span 
      className={`comparison-icon ${className}`}
      dangerouslySetInnerHTML={{
        __html: icon
      }}
    />
  )
} 