'use client'

import React from 'react'
import { ComparisonIcon as CentralComparisonIcon } from '@/lib/CentralIcon'

interface ComparisonIconProps {
  isPositive: boolean
  size?: string
  className?: string
}

export default function ComparisonIcon({ 
  isPositive, 
  size = '12px', 
  className = ''
}: ComparisonIconProps) {
  return (
    <CentralComparisonIcon 
      isPositive={isPositive}
      size={size}
      className={className}
    />
  )
} 