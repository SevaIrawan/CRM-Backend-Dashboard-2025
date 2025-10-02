'use client'

import React from 'react'

interface FrameProps {
  children: React.ReactNode
  className?: string
  variant?: 'standard' | 'compact' | 'full'
}

export default function Frame({ 
  children, 
  className = '', 
  variant = 'standard' 
}: FrameProps) {
  const getFrameStyle = () => {
    switch (variant) {
      case 'compact':
        return 'standard-frame compact'
      case 'full':
        return 'standard-frame full'
      default:
        return 'standard-frame'
    }
  }

  return (
    <div className={`${getFrameStyle()} ${className}`}>
      {children}
    </div>
  )
} 