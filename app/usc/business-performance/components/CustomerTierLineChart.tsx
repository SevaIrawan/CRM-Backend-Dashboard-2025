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

// Tier mapping untuk sorting (tier_number: tier_name)
// Lower tier_number = Higher tier (Tier 1 = Highest, Tier 7 = Lowest)
const TIER_NAME_TO_NUMBER: Record<string, number> = {
  'Super VIP': 1,
  'Tier 5': 2,
  'Tier 4': 3,
  'Tier 3': 4,
  'Tier 2': 5,
  'Tier 1': 6,
  'Regular': 7,
  'ND_P': 8,  // Potential tiers (lower priority)
  'P1': 9,
  'P2': 10
}

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
  
  // ✅ CSS untuk tooltip scroll - modern dan fleksibel - HANYA untuk Business Performance page
  useEffect(() => {
    const styleId = 'customer-tier-tooltip-scroll-bp'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        /* Tooltip container dengan scroll - HANYA untuk Business Performance page */
        .bp-subheader-wrapper canvas ~ div[style*="position: absolute"] {
          max-height: 400px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        .bp-subheader-wrapper canvas ~ div[style*="position: absolute"] ul {
          max-height: 350px !important;
          overflow-y: auto !important;
        }
        /* Scrollbar styling - HANYA untuk Business Performance page */
        .bp-subheader-wrapper canvas ~ div[style*="position: absolute"]::-webkit-scrollbar {
          width: 6px !important;
        }
        .bp-subheader-wrapper canvas ~ div[style*="position: absolute"]::-webkit-scrollbar-track {
          background: #f1f5f9 !important;
          border-radius: 3px !important;
        }
        .bp-subheader-wrapper canvas ~ div[style*="position: absolute"]::-webkit-scrollbar-thumb {
          background: #cbd5e1 !important;
          border-radius: 3px !important;
        }
        .bp-subheader-wrapper canvas ~ div[style*="position: absolute"]::-webkit-scrollbar-thumb:hover {
          background: #94a3b8 !important;
        }
      `
      document.head.appendChild(style)
    }
    
    return () => {
      // Cleanup: hapus style element saat component unmount
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])
  
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

  // Get tier number from tier name untuk sorting
  const getTierNumber = (tierName: string): number => {
    return TIER_NAME_TO_NUMBER[tierName] || 99 // 99 untuk tier yang tidak dikenal (akan di akhir)
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
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.95)', // ✅ Professional: Slightly darker for better contrast
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3B82F6',
        borderWidth: 1,
        cornerRadius: 8,
        padding: {
          top: 14,
          right: 16,
          bottom: 14,
          left: 16
        },
        titleSpacing: 8, // ✅ Professional: Proper spacing between title and body
        bodySpacing: 6, // ✅ Professional: Proper spacing between label items
        titleMarginBottom: 10, // ✅ Professional: Spacing after title
        displayColors: true,
        boxWidth: 12,
        boxHeight: 12,
        boxPadding: 6, // ✅ Professional: Spacing between color box and text
        callbacks: {
          title: function(context: any) {
            return `📅 ${context[0].label}`
          },
          label: function(context: any) {
            // Get all dataPoints untuk calculate total
            const tooltipModel = context.chart.tooltip
            const allDataPoints = tooltipModel?.dataPoints || []
            const total = allDataPoints.reduce((sum: number, item: any) => {
              return sum + (item.parsed?.y || 0)
            }, 0)
            
            const label = context.dataset.label || ''
            const tierName = label.replace(/\s*Customer\s*Count\s*/gi, '').trim()
            const value = context.parsed.y || 0
            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
            
            // ✅ Professional: Proper spacing between label, value, and percentage
            return `${tierName}:  ${formatIntegerKPI(value)}  (${percent}%)`
          },
          afterBody: function(context: any) {
            if (context.length > 1) {
              const total = context.reduce((sum: number, item: any) => {
                return sum + (item.parsed.y || 0)
              }, 0)
              
              if (total > 0) {
                return ['', `Total:  ${formatIntegerKPI(total)}`] // ✅ Professional: Spacing before total
              }
            }
            return []
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
    <div 
      style={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: 'none', // ✅ HANYA 1 HOVER SHADOW - No initial shadow
        transition: 'all 0.2s ease',
        cursor: 'default'
      }}
      onMouseEnter={(e) => {
        // ✅ HANYA 1 HOVER SHADOW - Di dalam canvas, include canvas dan chart
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)'
      }}
      onMouseLeave={(e) => {
        // ✅ Reset - No shadow
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
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
          {[...series].sort((a, b) => {
            // Sort legend dari tinggi ke rendah (Z to A): Super VIP → Tier 5 → Tier 4 → Tier 3 → Tier 2 → Tier 1 → Regular
            const tierNameA = getTierName(a.name)
            const tierNameB = getTierName(b.name)
            const tierNumA = getTierNumber(tierNameA)
            const tierNumB = getTierNumber(tierNameB)
            return tierNumA - tierNumB // Ascending: tier 1 (Super VIP) first, then 2, 3, 4, 5, 6, 7 (Regular)
          }).map((item, index) => {
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

