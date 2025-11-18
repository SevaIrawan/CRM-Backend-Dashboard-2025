'use client'

import React from 'react'
import { getComparisonColor } from '@/lib/kpiHelpers'
import { getKpiIcon, ComparisonIcon } from '@/lib/CentralIcon'

// Support both onClick and onDoubleClick for drill-out functionality
interface StatCardProps {
  title: string
  value: string | number
  icon?: string // KPI name for icon lookup
  additionalKpi?: {  // New prop for additional KPI (Daily Average)
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
  onClick?: () => void
  onDoubleClick?: () => void
  clickable?: boolean
}

export default function StatCard({ 
  title, 
  value, 
  icon,
  additionalKpi,  // New prop
  comparison, 
  comparisonSize = 12,
  className = '',
  onClick,
  onDoubleClick,
  clickable = false
}: StatCardProps) {
  const iconSvg = icon ? getKpiIcon(icon) : ''
  
  return (
    <div 
      className={`stat-card ${className} ${clickable ? 'clickable' : ''}`}
      onClick={clickable ? onClick : undefined}
      onDoubleClick={clickable ? onDoubleClick : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      } : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `${title}: ${value}. ${comparison ? `${comparison.percentage} ${comparison.text || 'MoM'}` : ''}` : undefined}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
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
      
      <div className="stat-card-value">{value}</div>
      
      {/* New layout: Additional KPI on left, Comparison on right */}
      <div className="stat-card-bottom-row">
        {/* Left side: Additional KPI (Daily Average) */}
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
        
        {/* Right side: Comparison */}
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
      
      <style jsx>{`
        .stat-card.clickable {
          transition: all 0.2s ease;
        }
        
        .stat-card.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .stat-card.clickable:active {
          transform: translateY(0);
        }
        
        /* Accessibility: Focus Indicator */
        .stat-card.clickable:focus {
          outline: 2px solid #3B82F6;
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        
        .stat-card.clickable:focus:not(:focus-visible) {
          outline: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  )
} 