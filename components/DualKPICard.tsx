'use client'

import React from 'react'
import { getKpiIcon, ComparisonIcon } from '@/lib/CentralIcon'

interface KPIData {
  label: string
  value: string | number
  icon?: string
  comparison?: {
    percentage: string
    isPositive: boolean
  }
}

interface DualKPICardProps {
  title: string
  icon?: string
  kpi1: KPIData
  kpi2: KPIData
  className?: string
}

export default function DualKPICard({ 
  title,
  icon,
  kpi1,
  kpi2,
  className = ''
}: DualKPICardProps) {
  const titleIconSvg = icon ? getKpiIcon(icon) : ''
  
  return (
    <div 
      className={`stat-card ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        height: '140px', // Increased height to match StatCard for better visibility
        minHeight: '140px' // Ensure minimum height
      }}
    >
      {/* Card Title with Icon */}
      <div className="stat-card-header" style={{ marginBottom: '8px' }}>
        <h3 className="stat-card-title">{title}</h3>
        {icon && (
          <div className="stat-card-icon">
            <div 
              dangerouslySetInnerHTML={{ __html: titleIconSvg }}
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
      
      {/* Dual KPI Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        flex: 1
      }}>
        {/* KPI 1 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          borderRight: '1px solid #e5e7eb',
          paddingRight: '6px',
          gap: '6px'
        }}>
          {/* KPI 1 Label */}
          <div>
            <span style={{
              fontSize: '11px',
              fontWeight: '500',
              color: '#6b7280',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}>
              {kpi1.label}
            </span>
          </div>
          
          {/* KPI 1 Value */}
          <div style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#1f2937',
            lineHeight: '1.2'
          }}>
            {kpi1.value}
          </div>
          
          {/* KPI 1 Comparison */}
          {kpi1.comparison && (
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: kpi1.comparison.isPositive ? '#059669' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              marginTop: '2px'
            }}>
              <ComparisonIcon 
                isPositive={kpi1.comparison.isPositive}
                size="10px"
              />
              {kpi1.comparison.percentage}
            </div>
          )}
        </div>
        
        {/* KPI 2 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          paddingLeft: '6px',
          gap: '6px'
        }}>
          {/* KPI 2 Label */}
          <div>
            <span style={{
              fontSize: '11px',
              fontWeight: '500',
              color: '#6b7280',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}>
              {kpi2.label}
            </span>
          </div>
          
          {/* KPI 2 Value */}
          <div style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#1f2937',
            lineHeight: '1.2'
          }}>
            {kpi2.value}
          </div>
          
          {/* KPI 2 Comparison */}
          {kpi2.comparison && (
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: kpi2.comparison.isPositive ? '#059669' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              marginTop: '2px'
            }}>
              <ComparisonIcon 
                isPositive={kpi2.comparison.isPositive}
                size="10px"
              />
              {kpi2.comparison.percentage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

