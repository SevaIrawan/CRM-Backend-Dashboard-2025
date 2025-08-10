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
import { getChartIcon } from '../lib/CentralIcon';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Series {
  name: string;
  data: number[];
}

interface LineChartProps {
  series: Series[];
  categories: string[];
  title?: string;
  currency?: string;
  chartIcon?: string;
  hideLegend?: boolean;
}

export default function LineChart({ 
  series, 
  categories, 
  title, 
  currency = 'MYR',
  chartIcon,
  hideLegend = false
}: LineChartProps) {
  
  console.log('📈 [LineChart] Rendering chart:', {
    title,
    seriesCount: series?.length || 0,
    categoriesCount: categories?.length || 0,
    series: series,
    categories: categories
  })

  // Error handling for empty data
  if (!series || series.length === 0 || !categories || categories.length === 0) {
    console.error('❌ [LineChart] Invalid data:', { series, categories })
    return (
      <div style={{ 
        height: '240px', 
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

  // Validate data structure
  const hasValidData = series.every(s => s.data && Array.isArray(s.data) && s.data.length > 0)
  if (!hasValidData) {
    console.error('❌ [LineChart] Invalid series data structure:', series)
    return (
      <div style={{ 
        height: '240px', 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        border: '1px solid #d1d5db',
        borderRadius: '8px'
      }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Invalid chart data structure</p>
      </div>
    )
  }
  
  const getCurrencySymbol = (curr: string): string => {
    switch (curr) {
      case 'MYR': return 'RM';
      case 'SGD': return 'SGD';
      case 'USC': return 'USD';
      default: return 'RM';
    }
  };

  const formatValue = (value: number, datasetLabel?: string): string => {
    // Check if this is a percentage type (Retention Rate, Churn Rate)
    const isPercentageType = datasetLabel && (
      datasetLabel.toLowerCase().includes('rate') ||
      datasetLabel.toLowerCase().includes('retention') ||
      datasetLabel.toLowerCase().includes('churn')
    );
    
    // Check if this is a frequency/ratio type (Purchase Frequency)
    const isFrequencyType = datasetLabel && (
      datasetLabel.toLowerCase().includes('frequency') ||
      datasetLabel.toLowerCase().includes('ratio')
    );
    
    // Check if this is a count/integer type (Members, Users, Depositor count, etc.)
    const isCountType = datasetLabel && (
      datasetLabel.toLowerCase().includes('member') ||
      datasetLabel.toLowerCase().includes('user') ||
      datasetLabel.toLowerCase().includes('unique') ||
      datasetLabel.toLowerCase().includes('pure') ||
      datasetLabel.toLowerCase().includes('count') ||
      datasetLabel.toLowerCase().includes('depositor')
    );
    
    // Check if this is CLV (Customer Lifetime Value)
    const isCLVType = datasetLabel && (
      datasetLabel.toLowerCase().includes('lifetime') ||
      datasetLabel.toLowerCase().includes('clv') ||
      datasetLabel.toLowerCase().includes('customer lifetime value')
    );
    
    // Check if this is GGR related (GGR User, GGR Pure User, GGR Per User, etc.)
    const isGGRType = datasetLabel && (
      datasetLabel.toLowerCase().includes('ggr') ||
      datasetLabel.toLowerCase().includes('gross gaming revenue') ||
      datasetLabel.toLowerCase().includes('per user') ||
      datasetLabel.toLowerCase().includes('pure user')
    );
    
    // Check if this is Customer Value Per Headcount or Customer Count vs Headcount
    const isCustomerValuePerHeadcount = datasetLabel && (
      datasetLabel.toLowerCase().includes('customer value per headcount') ||
      datasetLabel.toLowerCase().includes('active member') ||
      datasetLabel.toLowerCase().includes('headcount')
    );
    
    if (isPercentageType) {
      // For percentage - show % symbol
      return value.toFixed(1) + '%';
    } else if (isFrequencyType) {
      // For frequency - show as decimal number only (2 decimal places)
      return value.toFixed(2);
         } else if (isGGRType) {
       // For GGR - show with currency symbol and NO decimal places
       const symbol = getCurrencySymbol(currency);
       if (value >= 1000000) {
         return `${symbol} ${Math.round(value / 1000000)}M`;
       } else if (value >= 1000) {
         return `${symbol} ${Math.round(value / 1000)}K`;
       }
       return `${symbol} ${Math.round(value)}`;
    } else if (isCustomerValuePerHeadcount) {
      // For Customer Value Per Headcount and Customer Count vs Headcount - round up to nearest integer
      if (value >= 1000000) {
        return Math.ceil(value / 1000000) + 'M';
      } else if (value >= 1000) {
        return Math.ceil(value / 1000) + 'K';
      }
      return Math.ceil(value).toLocaleString();
    } else if (isCountType) {
      // For count/integer - no currency symbol
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(0) + 'K';
      }
      return value.toLocaleString();
    } else if (isCLVType) {
      // For CLV - show full number without decimals
      if (value >= 1000000) {
        return Math.round(value / 1000000) + 'M';
      } else if (value >= 1000) {
        return Math.round(value).toLocaleString(); // Show full number for thousands, no decimals
      } else {
        return Math.round(value).toString(); // No decimals for CLV
      }
    } else {
      // For other amounts - show as integer only (no currency)
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(0) + 'K';
      }
      return Math.round(value).toLocaleString();
    }
  };

  // Full value formatter for tooltip (no abbreviation)
  const formatFullValue = (value: number, datasetLabel?: string): string => {
    // Check if this is a percentage type (Retention Rate, Churn Rate, Winrate)
    const isPercentageType = datasetLabel && (
      datasetLabel.toLowerCase().includes('rate') ||
      datasetLabel.toLowerCase().includes('retention') ||
      datasetLabel.toLowerCase().includes('churn') ||
      datasetLabel.toLowerCase().includes('winrate')
    );
    
    // Check if this is a frequency/ratio type (Purchase Frequency)
    const isFrequencyType = datasetLabel && (
      datasetLabel.toLowerCase().includes('frequency') ||
      datasetLabel.toLowerCase().includes('ratio')
    );
    
    // Check if this is a count/integer type (New Depositor, Active Member, etc.)
    const isCountType = datasetLabel && (
      datasetLabel.toLowerCase().includes('member') ||
      datasetLabel.toLowerCase().includes('user') ||
      datasetLabel.toLowerCase().includes('unique') ||
      datasetLabel.toLowerCase().includes('pure') ||
      datasetLabel.toLowerCase().includes('count') ||
      datasetLabel.toLowerCase().includes('depositor') ||
      datasetLabel.toLowerCase().includes('headcount')
    );
    
    // Check if this is an amount/currency type (Deposit, Withdraw, Revenue, CLV, etc.)
    const isAmountType = datasetLabel && (
      datasetLabel.toLowerCase().includes('amount') ||
      datasetLabel.toLowerCase().includes('deposit') ||
      datasetLabel.toLowerCase().includes('withdraw') ||
      datasetLabel.toLowerCase().includes('revenue') ||
      datasetLabel.toLowerCase().includes('ggr') ||
      datasetLabel.toLowerCase().includes('gaming') ||
      datasetLabel.toLowerCase().includes('lifetime') ||
      datasetLabel.toLowerCase().includes('clv') ||
      datasetLabel.toLowerCase().includes('value') ||
      datasetLabel.toLowerCase().includes('transaction') ||
      datasetLabel.toLowerCase().includes('income') ||
      datasetLabel.toLowerCase().includes('cost') ||
      datasetLabel.toLowerCase().includes('profit') ||
      datasetLabel.toLowerCase().includes('gross gaming revenue') ||
      datasetLabel.toLowerCase().includes('per user') ||
      datasetLabel.toLowerCase().includes('pure user')
    );
    
    // Check if this is Customer Maturity Index (special case - no currency, no decimal)
    const isMaturityIndex = datasetLabel && (
      datasetLabel.toLowerCase().includes('maturity') ||
      datasetLabel.toLowerCase().includes('index')
    );
    
    if (isPercentageType) {
      // For percentage - show as percentage with 2 decimal places, formatted with commas
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    } else if (isFrequencyType) {
      // For frequency - show as decimal number with 2 decimal places, formatted with commas
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (isCountType) {
      // For count/integer - no currency symbol, formatted number with commas
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' persons';
    } else if (isMaturityIndex) {
      // For maturity index - formatted number without currency, with commas
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else if (isAmountType) {
      // For amount/currency - with currency symbol, formatted number with commas
      const symbol = getCurrencySymbol(currency);
      return `${symbol} ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    } else {
      // Default - formatted number without currency, with commas
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
  };

  // Force dual Y-axes for all charts with 2 series (as requested by user)
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
         display: false, // ALWAYS disable Chart.js legend - only use custom JSX legend
       },
       // Custom plugin untuk background Y1 dan Y2
       customBackgroundPlugin: {
         id: 'customBackground',
         beforeDraw: (chart: any) => {
           const { ctx, chartArea, scales } = chart;
           if (!chartArea) return;
           
           // Background untuk Y1 (Blue muda) - area kanan
           if (scales.y1) {
             ctx.save();
             ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // Blue muda
             ctx.fillRect(
               chartArea.right - 100, // Area untuk Y1
               chartArea.top,
               100,
               chartArea.height
             );
             ctx.restore();
           }
           
           // Background untuk Y (Orange muda) - area kiri
           if (scales.y) {
             ctx.save();
             ctx.fillStyle = 'rgba(249, 115, 22, 0.1)'; // Orange muda
             ctx.fillRect(
               chartArea.left, // Area untuk Y
               100,
               chartArea.height
             );
             ctx.restore();
           }
         }
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
            return `📅 ${context[0].label}`;
          },
          label: function(context: any) {
            const value = context.parsed.y;
            const datasetLabel = context.dataset.label;
            
            if (datasetLabel && datasetLabel.toLowerCase().includes('rate')) {
              return `  ${datasetLabel}: ${value.toFixed(1)}%`;
            }
            
            return `  ${datasetLabel}: ${formatFullValue(value, datasetLabel)}`;
          }
        }
      }
    },
         scales: {
       x: {
         grid: {
           display: true,
           color: '#e5e7eb',
           lineWidth: 1,
           drawBorder: false
         },
                 ticks: {
           padding: 8,
           font: {
             weight: 'bold' as const,
             size: 10
           }
         }
      },
             y: {
         type: 'linear' as const,
         display: true,
         position: 'left' as const,
         beginAtZero: false,
         grid: {
           display: true,
           color: '#e5e7eb',
           lineWidth: 1,
           drawBorder: false
         },
                 ticks: {
           padding: 20, // Increased padding for legend space
           font: {
             weight: 'bold' as const,
             size: 10
           },
                        callback: function(tickValue: string | number) {
               const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
               // Check series name for percentage
               const firstSeries = series && series[0];
               if (firstSeries && firstSeries.name && firstSeries.name.toLowerCase().includes('rate')) {
                 return value + '%';
               }
               
               // Check if this is CLV chart
               const isCLVChart = firstSeries && firstSeries.name && (
                 firstSeries.name.toLowerCase().includes('lifetime') ||
                 firstSeries.name.toLowerCase().includes('clv') ||
                 firstSeries.name.toLowerCase().includes('customer lifetime value')
               );
               
               if (isCLVChart) {
                 // For CLV - use special formatting
                 return formatValue(value, firstSeries?.name);
               }
               
               // For other values - formatted numbers
               return formatValue(value, firstSeries?.name);
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
             display: true,
             color: '#e5e7eb',
             lineWidth: 1
           },
                     ticks: {
             padding: 20, // Increased padding for legend space
             font: {
               weight: 'bold' as const,
               size: 10
             },
             callback: function(tickValue: string | number) {
               const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
               // Check second series name for percentage
               const secondSeries = series && series[1];
               if (secondSeries && secondSeries.name && secondSeries.name.toLowerCase().includes('rate')) {
                 return value + '%';
               }
               
               // Check if this is CLV chart (second series)
               const isCLVChart = secondSeries && secondSeries.name && (
                 secondSeries.name.toLowerCase().includes('lifetime') ||
                 secondSeries.name.toLowerCase().includes('clv') ||
                 secondSeries.name.toLowerCase().includes('customer lifetime value')
               );
               
               if (isCLVChart) {
                 // For CLV - use special formatting
                 return formatValue(value, secondSeries?.name);
               }
               
               // For other values - formatted numbers
               return formatValue(value, secondSeries?.name);
             }
           },
                     // Remove legend title from Y-axis since we have it in header
           title: {
             display: false
           }
        }
      })
    }
  };

  console.log('📊 [LineChart] Chart data prepared:', {
    labels: data.labels,
    datasets: data.datasets.map(d => ({ label: d.label, dataLength: d.data.length })),
    needsDualYAxis
  })

  return (
    <div style={{ 
      height: '100%', // Dynamic height based on container
      minHeight: '350px', // Minimum height
      width: '100%', 
      padding: '0',
      position: 'relative',
      backgroundColor: '#ffffff',
      border: '1px solid #ffffff', // White border
      borderRadius: '8px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease', // Smooth transition for hover effects
      cursor: 'pointer' // Indicate interactivity
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-3px)';
      e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
    }}>
      {/* Chart Title with Icon and Legend */}
      {title && (
        <div style={{
          padding: '16px 20px 12px 20px',
          borderBottom: '1px solid #f3f4f6',
          backgroundColor: '#ffffff',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Title and Icon */}
          <div style={{
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
          
          {/* Legend */}
          {!hideLegend && series.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {series.map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '12px',
                    height: '3px',
                    backgroundColor: index === 0 ? '#3B82F6' : '#F97316',
                    borderRadius: '2px'
                  }} />
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
             {/* Chart Area */}
               <div style={{
          flex: 1,
          minHeight: '250px', // Reduced minimum height untuk responsive
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff', // White background
          border: '1px solid #ffffff' // White border untuk canvas
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
                 backgroundColor: '#ffffff',
                 border: '1px solid #ffffff'
               }}>
                <Line 
                  data={data} 
                   options={options}
                />
              </div>
            )
          } catch (error) {
            console.error('❌ [LineChart] Chart.js error:', error)
            return (
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '8px'
              }}>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Chart rendering error</p>
              </div>
            )
          }
        })()}
      </div>
    </div>
  );
} 