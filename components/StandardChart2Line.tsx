// components/StandardChart2Line.tsx
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

interface Series {
  name: string;
  data: number[];
}

interface StandardChart2LineProps {
  series: Series[];
  categories: string[];
  title: string;
  currency?: string;
  chartIcon?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
}

export default function StandardChart2Line({ 
  series, 
  categories, 
  title, 
  currency = 'MYR',
  chartIcon,
  loading = false,
  error = null
}: StandardChart2LineProps) {
  
  console.log('📈 [StandardChart2Line] Rendering chart:', {
    title,
    seriesCount: series?.length || 0,
    categoriesCount: categories?.length || 0,
    series: series,
    categories: categories
  });

  // Loading state
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#ffffff', // Changed to white background
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          height: '20px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          marginBottom: '16px',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}></div>
        <div style={{
          height: '300px',
          backgroundColor: '#e5e7eb',
          borderRadius: '8px',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          flex: 1
        }}></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        backgroundColor: '#ffffff', // Changed to white background
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          height: '100%',
          minHeight: '350px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '1px solid #fecaca',
          borderRadius: '8px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>⚠️</div>
            <p style={{ color: '#dc2626', fontSize: '12px', margin: 0 }}>Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error handling for empty data
  if (!series || series.length === 0 || !categories || categories.length === 0) {
    console.error('❌ [StandardChart2Line] Invalid data:', { series, categories });
    return (
      <div style={{
        backgroundColor: '#ffffff', // Changed to white background
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          height: '100%',
          minHeight: '350px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '8px'
        }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>No chart data available</p>
        </div>
      </div>
    );
  }

  // Validate data structure
  const hasValidData = series.every(s => s.data && Array.isArray(s.data) && s.data.length > 0);
  if (!hasValidData) {
    console.error('❌ [StandardChart2Line] Invalid series data structure:', series);
    return (
      <div style={{
        backgroundColor: '#ffffff', // Changed to white background
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          height: '100%',
          minHeight: '350px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '8px'
        }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Invalid chart data structure</p>
        </div>
      </div>
    );
  }

  const getCurrencySymbol = (curr: string): string => {
    switch (curr) {
      case 'MYR': return 'RM';
      case 'SGD': return 'SGD';
      case 'KHR': return 'USC';
      default: return 'RM';
    }
  };

  const formatValue = (value: number, seriesName?: string): string => {
    // Check if this is a percentage type
    const isPercentageType = seriesName && (
      seriesName.toLowerCase().includes('rate') ||
      seriesName.toLowerCase().includes('percentage') ||
      seriesName.toLowerCase().includes('churn') ||
      seriesName.toLowerCase().includes('retention')
    );
    
    // Check if this is a frequency type (number only, no currency)
    const isFrequencyType = seriesName && (
      seriesName.toLowerCase().includes('frequency') ||
      seriesName.toLowerCase().includes('purchase frequency')
    );
    
    // Check if this is a count type
    const isCountType = seriesName && (
      seriesName.toLowerCase().includes('count') ||
      seriesName.toLowerCase().includes('new') ||
      seriesName.toLowerCase().includes('depositor') ||
      seriesName.toLowerCase().includes('register')
    );
    
    // Check if this is CLV type
    const isCLVType = seriesName && (
      seriesName.toLowerCase().includes('lifetime') ||
      seriesName.toLowerCase().includes('clv') ||
      seriesName.toLowerCase().includes('customer lifetime value')
    );
    
    // Check if this is a currency type (ATV, DA User, GGR User)
    const isCurrencyType = seriesName && (
      seriesName.toLowerCase().includes('atv') ||
      seriesName.toLowerCase().includes('da user') ||
      seriesName.toLowerCase().includes('ggr user') ||
      seriesName.toLowerCase().includes('average transaction value')
    );
    
    if (isPercentageType) {
      // For percentage - show % symbol with 2 decimal places
      return value.toFixed(2) + '%';
    } else if (isFrequencyType) {
      // For frequency - show as decimal number only (2 decimal places, no currency)
      return value.toFixed(2);
    } else if (isCountType) {
      // For count/integer - no currency symbol, full number
      return value.toLocaleString();
    } else if (isCLVType) {
      // For CLV - show full number for thousands, up to 2 decimals
      if (value >= 1000) {
        return Math.round(value).toLocaleString();
      } else {
        return value.toFixed(4);
      }
    } else if (isCurrencyType) {
      // For currency types (ATV, DA User, GGR User) - show RM with 2 decimal places
      return 'RM ' + value.toFixed(2);
    } else {
      // For other amounts - show with 2 decimal places
      return value.toFixed(2);
    }
  };

  // Force dual Y-axes for all charts with 2 series
  const needsDualYAxis = series.length > 1;

  const data = {
    labels: categories,
    datasets: series.map((item, index) => ({
      label: item.name,
      data: item.data,
      borderColor: index === 0 ? '#3B82F6' : '#F97316', // Blue and Orange
      backgroundColor: index === 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(249, 115, 22, 0.1)', // Blue and Orange with transparency
      borderWidth: 3,
      pointBackgroundColor: index === 0 ? '#3B82F6' : '#F97316', // Blue and Orange
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      fill: true,
      tension: 0.4,
      // For dual Y-axis, assign yAxisID
      yAxisID: needsDualYAxis ? (index === 0 ? 'y' : 'y1') : 'y'
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend since we have it in header
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        position: 'nearest' as const,
        xAlign: 'center' as const,
        yAlign: 'top' as const,
        callbacks: {
          title: function(context: any) {
            return context[0].label;
          },
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${formatValue(value, label)}`;
          }
        }
      },
      datalabels: {
        display: true,
        align: 'top' as const,
        anchor: 'end' as const,
        offset: 4,
        color: '#1f2937', // ✅ STANDARD: BLACK COLOR FOR ALL LABELS
        font: {
          weight: 'bold' as const,
          size: 11
        },
        formatter: function(value: number, context: any) {
          const seriesName = context.dataset.label;
          return formatValue(value, seriesName);
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    scales: {
               x: {
           display: true,
           grid: {
             display: true,
             color: '#f3f4f6', // Lighter grid color
             lineWidth: 0.5 // Thinner lines
           },
        ticks: {
          font: {
            weight: 'bold' as const,
            size: 12
          },
          color: '#6b7280',
          padding: 8
        }
      },
             y: {
         type: 'linear' as const,
         display: true,
         position: 'left' as const,
         beginAtZero: false,
         grid: {
           display: true,
           color: '#f3f4f6', // Lighter grid color
           lineWidth: 0.5 // Thinner lines
         },
        ticks: {
          padding: 20,
          font: {
            weight: 'bold' as const,
            size: 10
          },
          callback: function(tickValue: string | number) {
            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            const firstSeries = series && series[0];
            
            // Check if this is a currency type (ATV, DA User, GGR User) for left Y-axis
            const isCurrencyType = firstSeries && firstSeries.name && (
              firstSeries.name.toLowerCase().includes('atv') ||
              firstSeries.name.toLowerCase().includes('da user') ||
              firstSeries.name.toLowerCase().includes('ggr user') ||
              firstSeries.name.toLowerCase().includes('average transaction value')
            );
            
            // Check first series name for percentage
            if (firstSeries && firstSeries.name && firstSeries.name.toLowerCase().includes('rate')) {
              return value.toFixed(0) + '%';
            }
            
            // Check if this is CLV chart (first series)
            const isCLVChart = firstSeries && firstSeries.name && (
              firstSeries.name.toLowerCase().includes('lifetime') ||
              firstSeries.name.toLowerCase().includes('clv') ||
              firstSeries.name.toLowerCase().includes('customer lifetime value')
            );
            
            if (isCLVChart) {
              return formatValue(value, firstSeries?.name);
            }
            
            // For currency types on Y-axis - show with RM and 0 decimal
            if (isCurrencyType) {
              return 'RM ' + Math.round(value).toLocaleString();
            }
            
            // For other values - show with 0 decimal
            return Math.round(value).toLocaleString();
          }
        },
        // Remove legend title from Y-axis since we have it in header
        title: {
          display: false
        }
      },
      // Add second Y-axis if needed
      ...(needsDualYAxis && {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          beginAtZero: false,
          grid: {
            drawOnChartArea: false,
            display: false,
            color: 'transparent',
            lineWidth: 0
          },
                     ticks: {
             padding: 35, // Increased padding to prevent overlap
             font: {
               weight: 'bold' as const,
               size: 10
             },
            callback: function(tickValue: string | number) {
              const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
              const secondSeries = series && series[1];
              
              // Check if this is a currency type (GGR User) for right Y-axis
              const isCurrencyType = secondSeries && secondSeries.name && (
                secondSeries.name.toLowerCase().includes('ggr user')
              );
              
              // Check if this is a frequency type (Purchase Frequency)
              const isFrequencyType = secondSeries && secondSeries.name && (
                secondSeries.name.toLowerCase().includes('frequency') ||
                secondSeries.name.toLowerCase().includes('purchase frequency')
              );
              
              // Check second series name for percentage
              if (secondSeries && secondSeries.name && secondSeries.name.toLowerCase().includes('rate')) {
                return value.toFixed(0) + '%';
              }
              
              // Check if this is CLV chart (second series)
              const isCLVChart = secondSeries && secondSeries.name && (
                secondSeries.name.toLowerCase().includes('lifetime') ||
                secondSeries.name.toLowerCase().includes('clv') ||
                secondSeries.name.toLowerCase().includes('customer lifetime value')
              );
              
              if (isCLVChart) {
                return formatValue(value, secondSeries?.name);
              }
              
              // For currency types on right Y-axis - show with RM and 0 decimal
              if (isCurrencyType) {
                return 'RM ' + Math.round(value).toLocaleString();
              }
              
              // For frequency types - show with 1 decimal
              if (isFrequencyType) {
                return value.toFixed(1);
              }
              
              // For other values - show with 0 decimal
              return Math.round(value).toLocaleString();
            }
          },
          // Add title for count type (persons) on right Y-axis
          title: {
            display: (() => {
              const secondSeries = series && series[1];
              const isCountType = secondSeries && secondSeries.name && (
                secondSeries.name.toLowerCase().includes('count') ||
                secondSeries.name.toLowerCase().includes('new') ||
                secondSeries.name.toLowerCase().includes('depositor') ||
                secondSeries.name.toLowerCase().includes('register')
              );
              return isCountType || false;
            })(),
            text: 'persons',
            font: {
              size: 10,
              weight: 'bold' as const
            },
            color: '#6b7280'
          }
        }
      })
    }
  };

  console.log('📊 [StandardChart2Line] Chart data prepared:', {
    labels: data.labels,
    datasets: data.datasets.map(d => ({ label: d.label, dataLength: d.data.length })),
    needsDualYAxis
  });

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #ffffff', // Changed to white border
      minHeight: '400px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Chart Title with Icon and Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
                     {chartIcon && (
             <span 
               style={{
                 fontSize: '14px',
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
            textTransform: 'uppercase' as const,
            letterSpacing: '0.6px',
            lineHeight: '1.2'
          }}>
            {title}
          </h3>
        </div>
        
        {/* Legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {series.map((item, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: index === 0 ? '#3B82F6' : '#F97316',
                borderRadius: '2px'
              }}></div>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#4b5563'
              }}>
                {item.name.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
      
             {/* Chart Container */}
       <div style={{
         flex: 1,
         minHeight: '300px',
         height: '300px', // Fixed height to prevent overlapping
         padding: '0',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         backgroundColor: '#ffffff' // Keep white for chart area
       }}>
        {(() => {
          try {
            return (
              <div style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden' // Prevent overflow
              }}>
                <Line 
                  data={data} 
                  options={{
                    ...options,
                    responsive: true,
                    maintainAspectRatio: false,
                                         layout: {
                       padding: {
                         top: 10,
                         bottom: 10,
                         left: 10,
                         right: 40 // Increased right padding for Y-axis labels
                       }
                     }
                  }}
                />
              </div>
            );
          } catch (error) {
            console.error('❌ [StandardChart2Line] Chart rendering error:', error);
            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                Chart rendering error
              </div>
            );
          }
        })()}
      </div>
    </div>
  );
}
