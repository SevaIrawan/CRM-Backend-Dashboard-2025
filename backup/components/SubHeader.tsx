'use client'

import React from 'react'

interface SubHeaderProps {
  title?: string
  children?: React.ReactNode
}

export default function SubHeader({ 
  title = " ", 
  children 
}: SubHeaderProps) {
  return (
    <div className="subheader">
      <div className="subheader-content">
        <h2>{title}</h2>
        {children && (
          <div className="subheader-controls">
            {children}
          </div>
        )}
      </div>
    </div>
  )
} 