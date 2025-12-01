'use client'

import React from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { formatIntegerKPI, formatPercentageKPI } from '@/lib/formatHelpers'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
)

interface PieDataItem {
  label: string
  value: number
  color: string
  percentage?: number
}

interface BusinessPerformancePieChartProps {
  data: PieDataItem[]
  title?: string
  chartIcon?: string
  showLegend?: boolean
  showPercentage?: boolean
}

export default function BusinessPerformancePieChart({
  data,
  title,
  chartIcon,
  showLegend = true,
  showPercentage = true
}: BusinessPerformancePieChartProps) {
  // Error handling for empty data
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        height: '280px', 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        border: '1px solid #d1d5db',
        borderRadius: '8px'
      }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No chart data available</p>
      </div>
    )
  }

  const chartData = {
    labels: data.map(item => item.label),
    datasets: [{
      data: data.map(item => item.value),
      backgroundColor: data.map(item => item.color),
      borderColor: '#ffffff',
      borderWidth: 1,
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        display: false // We'll use custom legend
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3B82F6',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: function(context: any) {
            // ✅ BP STANDARD: Sama dengan BarChart - untuk PieChart, gunakan label dari context
            if (context && context.length > 0 && context[0].label) {
              return `📅 ${context[0].label}`
            }
            return ''
          },
          label: function(context: any) {
            // ✅ BP STANDARD: Format label untuk PieChart - sama dengan BarChart format
            const label = context.label || ''
            const value = context.parsed || 0
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
            return `${label}: ${formatIntegerKPI(value)} (${percentage}%)`
          }
        }
      },
    }
  }

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'transparent', // ✅ BP STANDARD: Transparent background
        borderRadius: '8px',
        boxShadow: 'none', // ✅ BP STANDARD: No initial shadow
        transition: 'all 0.2s ease', // ✅ BP STANDARD: Hover effect transition
        cursor: 'default'
      }}
      onMouseEnter={(e) => {
        // ✅ BP STANDARD: Hover shadow yang include canvas - sama seperti BarChart
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)'
      }}
      onMouseLeave={(e) => {
        // ✅ BP STANDARD: Reset hover shadow
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Chart Title with Icon */}
      {title && (
        <div style={{
          padding: '16px 20px 12px 20px',
          borderBottom: '1px solid #f3f4f6',
          backgroundColor: '#ffffff',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {chartIcon && (
            <span 
              style={{
                fontSize: '14px',
                color: '#3b82f6',
                width: '20px',
                height: '20px',
                display: 'inline-block',
                flexShrink: 0
              }}
              dangerouslySetInnerHTML={{ __html: chartIcon }}
            />
          )}
          <h3 style={{
            margin: 0,
            fontSize: '12px',
            fontWeight: 700,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            lineHeight: '1.2'
          }}>
            {title}
          </h3>
        </div>
      )}
      
      {/* Chart Area */}
      <div style={{ 
        flex: 1, 
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '250px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <div style={{ width: '100%', height: '100%', maxHeight: '280px', maxWidth: '280px', position: 'relative' }}>
            <Pie 
              data={chartData} 
              options={options}
              plugins={[]}
            />
          </div>
        </div>
        
        {/* Custom Legend - 2 rows, centered below chart - BP STANDARD: Font lebih kecil */}
        {showLegend && data.length > 0 && (() => {
          // Split data into 2 rows
          const itemsPerRow = Math.ceil(data.length / 2)
          const row1 = data.slice(0, itemsPerRow)
          const row2 = data.slice(itemsPerRow)
          
          return (
            <div style={{
              marginTop: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              gap: '6px', // ✅ BP STANDARD: Kurangi gap dari 8px jadi 6px
              flexShrink: 0
            }}>
              {/* Row 1 */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px', // ✅ BP STANDARD: Kurangi gap dari 16px jadi 12px
                fontSize: '10px' // ✅ BP STANDARD: Font lebih kecil dari 12px jadi 10px
              }}>
                {row1.map((item, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <div style={{
                      width: '10px', // ✅ BP STANDARD: Kurangi dari 12px jadi 10px
                      height: '10px', // ✅ BP STANDARD: Kurangi dari 12px jadi 10px
                      borderRadius: '2px',
                      flexShrink: 0,
                      backgroundColor: item.color
                    }} />
                    <span style={{ 
                      fontSize: '10px', // ✅ BP STANDARD: Font lebih kecil dari 12px jadi 10px
                      color: '#374151',
                      whiteSpace: 'nowrap',
                      fontWeight: 500
                    }}>
                      {item.label}: {showPercentage && item.percentage !== undefined ? `${item.percentage}%` : formatIntegerKPI(item.value)}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Row 2 */}
              {row2.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px', // ✅ BP STANDARD: Kurangi gap dari 16px jadi 12px
                  fontSize: '10px' // ✅ BP STANDARD: Font lebih kecil dari 12px jadi 10px
                }}>
                  {row2.map((item, index) => (
                    <div 
                      key={itemsPerRow + index} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <div style={{
                        width: '10px', // ✅ BP STANDARD: Kurangi dari 12px jadi 10px
                        height: '10px', // ✅ BP STANDARD: Kurangi dari 12px jadi 10px
                        borderRadius: '2px',
                        flexShrink: 0,
                        backgroundColor: item.color
                      }} />
                      <span style={{ 
                        fontSize: '10px', // ✅ BP STANDARD: Font lebih kecil dari 12px jadi 10px
                        color: '#374151',
                        whiteSpace: 'nowrap',
                        fontWeight: 500
                      }}>
                        {item.label}: {showPercentage && item.percentage !== undefined ? `${item.percentage}%` : formatIntegerKPI(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

