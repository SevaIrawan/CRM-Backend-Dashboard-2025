'use client'

import React from 'react'
import { getKpiIcon } from '@/lib/CentralIcon'

// Support both onClick and onDoubleClick for drill-out functionality
interface ProgressBarStatCardProps {
  title: string
  value: number // Current value
  target: number // Target value
  icon?: string
  unit?: string // '%', 'RM', etc
  comparison?: {
    percentage: string
    isPositive: boolean
    text?: string
  }
  className?: string
  onEditClick?: () => void // Callback for edit button
  showEditButton?: boolean // Show edit icon
  onClick?: () => void // Callback for card click (single click)
  onDoubleClick?: () => void // Callback for card double click (drill-out)
  clickable?: boolean // Make card clickable
}

export default function ProgressBarStatCard({ 
  title, 
  value,
  target,
  icon,
  unit = '%',
  comparison,
  className = '',
  onEditClick,
  showEditButton = false,
  onClick,
  onDoubleClick,
  clickable = false
}: ProgressBarStatCardProps) {
  const iconSvg = icon ? getKpiIcon(icon) : ''
  
  // Calculate achievement percentage
  const achievementRate = target > 0 ? (value / target) * 100 : 0
  const displayValue = achievementRate.toFixed(1)
  
  // Determine progress bar color based on achievement
  const getProgressColor = () => {
    if (achievementRate > 90) return '#10b981' // 🟢 Green - >90%
    if (achievementRate > 70) return '#F97316' // 🟠 Orange - 70-90%
    return '#ef4444' // 🔴 Red - <70%
  }
  
  // Determine status indicator
  const getStatusIndicator = () => {
    if (achievementRate > 90) {
      return { label: 'On Track', color: '#10b981', bgColor: '#ffffff' }
    }
    if (achievementRate > 70) {
      return { label: 'Behind', color: '#F97316', bgColor: '#ffffff' }
    }
    return { label: 'At Risk', color: '#ef4444', bgColor: '#ffffff' }
  }
  
  const statusIndicator = getStatusIndicator()
  
  return (
    <div 
      className={`stat-card ${className}`}
      onClick={clickable ? onClick : undefined}
      onDoubleClick={clickable ? onDoubleClick : undefined}
      style={{
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (clickable) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)'
        }
      }}
      onMouseLeave={(e) => {
        if (clickable) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = ''
        }
      }}
    >
      <div className="stat-card-header">
        <h3 className="stat-card-title">{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {showEditButton && onEditClick && (
            <button
              onClick={onEditClick}
              style={{
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                fontSize: '11px',
                fontWeight: '500',
                color: '#3B82F6',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#eff6ff'
                e.currentTarget.style.borderColor = '#3B82F6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.borderColor = '#d1d5db'
              }}
              title="Edit Target"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </button>
          )}
          {/* Status Indicator Badge */}
          <div style={{
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: statusIndicator.bgColor,
            border: `1px solid ${statusIndicator.color}`,
            fontSize: '11px',
            fontWeight: '600',
            color: statusIndicator.color,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusIndicator.color,
              display: 'inline-block'
            }}></span>
            {statusIndicator.label}
          </div>
        </div>
      </div>
      
      {/* Achievement Rate Value */}
      <div className="stat-card-value" style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>
        {displayValue}{unit}
      </div>
      
      {/* Progress Bar */}
      <div style={{ 
        width: '100%', 
        marginTop: '6px',
        marginBottom: '0px'
      }}>
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#e5e7eb',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '6px'
        }}>
          <div style={{
            width: `${Math.min(achievementRate, 100)}%`,
            height: '100%',
            backgroundColor: getProgressColor(),
            transition: 'width 0.3s ease, background-color 0.3s ease',
            borderRadius: '3px'
          }} />
        </div>
        
        {/* Target Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: '#6b7280',
          fontWeight: '500'
        }}>
          <span>Current: {value.toLocaleString()}</span>
          <span>Target: {target.toLocaleString()}</span>
        </div>
      </div>
      
      {/* Comparison (MoM) */}
      {comparison && (
        <div className="stat-card-comparison" style={{ marginTop: '4px' }}>
          <span 
            style={{
              fontSize: '12px',
              color: comparison.isPositive ? '#059669' : '#dc2626',
              fontWeight: 600
            }}
          >
            {comparison.isPositive ? '↗' : '↘'} {comparison.percentage} {comparison.text || 'MoM'}
          </span>
        </div>
      )}
    </div>
  )
}

