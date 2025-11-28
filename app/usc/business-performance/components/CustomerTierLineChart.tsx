'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

// ✅ BP Standard: NO Filler plugin - chart area harus transparent
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface Series {
  name: string
  data: number[]
  color?: string
}

interface CustomerTierLineChartProps {
  series: Series[]
  categories: string[]
  title?: string
  chartIcon?: string
}

/**
 * Custom Line Chart Component khusus untuk Customer Tier Trends
 * - Setiap line menggunakan color dari series (bukan Blue/Orange standard)
 * - Hanya menggunakan 1 Y-axis (tidak dual axis)
 * - Special case untuk Business Performance USC Page saja
 */
export default function CustomerTierLineChart({
  series,
  categories,
  title = '',
  chartIcon
}: CustomerTierLineChartProps) {
  const chartRef = useRef<any>(null)
  
  // State untuk track line yang sedang di-isolate (null = semua visible, number = hanya line tersebut visible)
  const [isolatedIndex, setIsolatedIndex] = useState<number | null>(null)
  
  // Error handling for empty data
  if (!series || series.length === 0 || !categories || categories.length === 0) {
    return (
      <div style={{ 
        height: '100%', 
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

  // Format integer values
  const formatIntegerKPI = (value: number): string => {
    return Math.round(value).toLocaleString('en-US')
  }

  // Extract tier name from series name (remove " Customer Count" atau "Customer Count")
  const getTierName = (seriesName: string): string => {
    return seriesName.replace(/\s*Customer\s*Count\s*/gi, '').trim()
  }

  // Isolate dataset - hanya tampilkan line yang diklik
  const isolateDataset = (index: number) => {
    const chart = chartRef.current
    if (!chart) return

    // Jika klik legend yang sama, kembali ke semua visible
    if (isolatedIndex === index) {
      setIsolatedIndex(null)
      // Show all datasets
      series.forEach((_, i) => {
        const meta = chart.getDatasetMeta(i)
        if (meta) {
          meta.hidden = false
        }
      })
    } else {
      // Isolate: hanya tampilkan line yang diklik
      setIsolatedIndex(index)
      // Hide all except the clicked one
      series.forEach((_, i) => {
        const meta = chart.getDatasetMeta(i)
        if (meta) {
          meta.hidden = i !== index
        }
      })
    }
    
    chart.update('none') // Update without animation
  }

  const data = {
    labels: categories,
    datasets: series.map((item, index) => {
      // ✅ Use color from series (matches filter dropdown colors)
      const lineColor = item.color || '#3B82F6'
      
      // Debug: Log only if color is missing (indicates a problem)
      if (!item.color) {
        console.warn(`⚠️ [Chart] Series ${index} "${item.name}" has no color, using blue fallback`)
      }
      
      return {
        label: item.name,
        data: item.data,
        borderColor: lineColor, // ✅ Clear, distinct color from tierColors
        backgroundColor: 'transparent', // ✅ BP Standard: No background fill
        borderWidth: 4, // ✅ Increased from 3 to 4 for better visibility
        pointBackgroundColor: lineColor, // ✅ Same color as line
        pointBorderColor: '#ffffff', // ✅ White border for contrast
        pointBorderWidth: 2.5, // ✅ Slightly thicker border
        pointRadius: 7, // ✅ Increased from 6 to 7 for better visibility
        pointHoverRadius: 9, // ✅ Increased hover size
        fill: false, // ✅ BP Standard: No area fill
        tension: 0.4,
        yAxisID: 'y' // Always use single Y-axis
      }
    })
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    layout: {
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
      }
    },
    plugins: {
      legend: {
        display: false // Use custom legend
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: 'transparent',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || ''
            // Remove " Customer Count" atau "Customer Count" dari label
            const tierName = label.replace(/\s*Customer\s*Count\s*/gi, '').trim()
            const value = context.parsed.y
            return `${tierName}: ${formatIntegerKPI(value)}`
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        beginAtZero: false,
        grid: {
          display: true, // ✅ BP Standard: Show horizontal grid
          color: 'rgba(229, 231, 235, 0.5)', // ✅ BP Standard: Slightly darker
          lineWidth: 1
        },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          callback: function(value: any) {
            return formatIntegerKPI(value)
          }
        }
      },
      x: {
        grid: {
          display: true, // ✅ BP Standard: Show vertical grid
          color: 'rgba(229, 231, 235, 0.3)', // ✅ BP Standard: Lighter vertical lines
          lineWidth: 1
        },
        ticks: {
          color: '#6b7280',
          font: { size: 11 }
        }
      }
    }
  }

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chart */}
      <div 
        style={{ 
          flex: 1, 
          width: '100%', 
          minHeight: 0, 
          position: 'relative',
          padding: '8px'
        }}
      >
        <Line ref={chartRef} data={data} options={options} />
      </div>
      
      {/* Custom Legend - Tengah Bawah */}
      {series.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '12px 16px',
          marginTop: '8px'
        }}>
          {series.map((item, index) => {
            const lineColor = item.color || '#3B82F6'
            const tierName = getTierName(item.name)
            const isIsolated = isolatedIndex === index
            const isOtherHidden = isolatedIndex !== null && isolatedIndex !== index
            
            return (
              <div
                key={index}
                onClick={() => isolateDataset(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  opacity: isOtherHidden ? 0.4 : 1,
                  transition: 'opacity 0.2s ease',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: isIsolated ? '#eff6ff' : 'transparent',
                  border: isIsolated ? '1px solid #3b82f6' : '1px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isIsolated) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isIsolated) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <div style={{
                  width: '16px', // ✅ Increased from 12px to 16px for better visibility
                  height: '4px', // ✅ Increased from 3px to 4px for better visibility
                  backgroundColor: lineColor, // ✅ Same color as chart line
                  borderRadius: '2px',
                  opacity: isOtherHidden ? 0.4 : 1
                }} />
                <span style={{
                  fontSize: '11px',
                  fontWeight: isIsolated ? 700 : 600,
                  color: isIsolated ? '#3b82f6' : '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  userSelect: 'none'
                }}>
                  {tierName}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

