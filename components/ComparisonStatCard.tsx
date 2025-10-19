'use client'

import React from 'react'
import { getComparisonColor } from '@/lib/kpiHelpers'
import { getKpiIcon, ComparisonIcon } from '@/lib/CentralIcon'

interface ComparisonStatCardProps {
  title: string
  valueA: string | number  // Period A value
  valueB: string | number  // Period B value
  icon?: string
  additionalKpi?: {
    label: string
    value: string | number
    isPositive?: boolean
  }
  comparison?: {
    percentage: string
    isPositive: boolean
    text?: string
  }
  comparisonSize?: number
  className?: string
}

export default function ComparisonStatCard({ 
  title, 
  valueA,
  valueB,
  icon,
  additionalKpi,
  comparison, 
  comparisonSize = 12,
  className = ''
}: ComparisonStatCardProps) {
  const iconSvg = icon ? getKpiIcon(icon) : ''
  
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-card-header">
        <h3 className="stat-card-title">{title}</h3>
        {icon && (
          <div className="stat-card-icon">
            <div 
              dangerouslySetInnerHTML={{ __html: iconSvg }}
              style={{ 
                width: '20px', 
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
          </div>
        )}
      </div>
      
      {/* VALUE GRID: Period A and B with vertical divider */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '6px',
        marginTop: '4px',
        marginBottom: '2px'
      }}>
        {/* Period A Value */}
        <div style={{
          textAlign: 'left',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1f2937',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {valueA}
        </div>
        
        {/* Vertical Divider */}
        <div style={{
          width: '1px',
          height: '28px',
          backgroundColor: '#d1d5db'
        }} />
        
        {/* Period B Value */}
        <div style={{
          textAlign: 'left',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1f2937',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {valueB}
        </div>
      </div>
      
      {/* Bottom Row: Additional KPI on left, Comparison on right */}
      <div className="stat-card-bottom-row">
        {/* Left side: Additional KPI (Daily Average / Compare B-A) */}
        {additionalKpi && (
          <div className="stat-card-additional-kpi">
            <span className="additional-kpi-label">{additionalKpi.label}</span>
            <span 
              className="additional-kpi-value"
              style={{ 
                color: additionalKpi.isPositive !== undefined 
                  ? (additionalKpi.isPositive ? '#059669' : '#dc2626')
                  : 'inherit'
              }}
            >
              {additionalKpi.value}
            </span>
          </div>
        )}
        
        {/* Right side: Comparison MoM % */}
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
    </div>
  )
}

