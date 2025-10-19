'use client'

import React from 'react'
import { getKpiIcon } from '@/lib/CentralIcon'

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
}

export default function ProgressBarStatCard({ 
  title, 
  value,
  target,
  icon,
  unit = '%',
  comparison,
  className = ''
}: ProgressBarStatCardProps) {
  const iconSvg = icon ? getKpiIcon(icon) : ''
  
  // Calculate achievement percentage
  const achievementRate = target > 0 ? (value / target) * 100 : 0
  const displayValue = achievementRate.toFixed(1)
  
  // Determine progress bar color based on achievement
  const getProgressColor = () => {
    if (achievementRate >= 100) return '#10b981' // Green - Target achieved
    if (achievementRate >= 80) return '#3B82F6' // Blue - On track
    if (achievementRate >= 60) return '#F97316' // Orange - Warning
    return '#ef4444' // Red - Critical
  }
  
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

