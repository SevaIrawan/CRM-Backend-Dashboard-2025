'use client'

import React from 'react'
import { getComparisonColor } from '@/lib/KPILogic'
import { getKpiIcon, ComparisonIcon } from '@/lib/centralIcons'

interface StatCardProps {
  title: string
  value: string | number
  icon?: string // KPI name for icon lookup
  comparison?: {
    percentage: string
    isPositive: boolean
    text?: string
  }
  comparisonSize?: number
  className?: string
}

export default function StatCard({ 
  title, 
  value, 
  icon,
  comparison, 
  comparisonSize = 12,
  className = '' 
}: StatCardProps) {
  const iconSvg = icon ? getKpiIcon(icon) : ''
  
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-card-header">
        {icon && (
          <div className="stat-card-icon">
            <div 
              dangerouslySetInnerHTML={{ __html: iconSvg }}
              style={{ 
                width: '24px', 
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
          </div>
        )}
        <h3 className="stat-card-title">{title}</h3>
      </div>
      
      <div className="stat-card-value">{value}</div>
      
      {comparison && (
        <div className="stat-card-comparison">
          <span 
            className="comparison-label"
            style={{
              fontSize: `${comparisonSize}px`,
              color: getComparisonColor(comparison.isPositive ? 1 : -1),
              fontWeight: 600
            }}
          >
            <ComparisonIcon 
              isPositive={comparison.isPositive}
              size={`${comparisonSize}px`}
            />
            {comparison.percentage} {comparison.text || 'MoM'}
          </span>
        </div>
      )}
    </div>
  )
} 