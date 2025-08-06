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
import { getChartIcon } from '../lib/centralIcons';

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
}

export default function LineChart({ 
  series, 
  categories, 
  title, 
  currency = 'MYR',
  chartIcon
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
      case 'KHR': return 'USC';
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
    
    if (isPercentageType) {
      // For percentage - show % symbol
      return value.toFixed(1) + '%';
    } else if (isFrequencyType) {
      // For frequency - show as decimal number only (2 decimal places)
      return value.toFixed(2);
    } else if (isCountType) {
      // For count/integer - no currency symbol
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(0) + 'K';
      }
      return value.toLocaleString();
    } else {
      // For CLV and other amounts - show as integer only (no currency)
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
    
    const isCountType = datasetLabel && (
      datasetLabel.toLowerCase().includes('member') ||
      datasetLabel.toLowerCase().includes('user') ||
      datasetLabel.toLowerCase().includes('unique') ||
      datasetLabel.toLowerCase().includes('pure') ||
      datasetLabel.toLowerCase().includes('count') ||
      datasetLabel.toLowerCase().includes('depositor')
    );
    
    if (isPercentageType) {
      // For percentage - show % symbol with full precision
      return value.toFixed(2) + '%';
    } else if (isFrequencyType) {
      // For frequency - show as decimal number only (2 decimal places)
      return value.toFixed(2);
    } else if (isCountType) {
      // For count/integer - no currency symbol, full number
      return value.toLocaleString() + ' persons';
    } else {
      // For CLV and other amounts - show as integer only (no currency)
      return Math.round(value).toLocaleString();
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
        display: false, // Hide default legend since we'll position them on Y-axes
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
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1
        },
        ticks: {
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
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1
        },
        ticks: {
          padding: 20, // Increased padding for legend space
          callback: function(tickValue: string | number) {
            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            // Check series name for percentage
            const firstSeries = series && series[0];
            if (firstSeries && firstSeries.name && firstSeries.name.toLowerCase().includes('rate')) {
              return value + '%';
            }
            
            // For other values - formatted numbers
            return formatValue(value, firstSeries?.name);
          }
        },
        // Add legend title for left Y-axis
        title: {
          display: true,
          text: series[0]?.name || 'Series 1',
          color: '#3B82F6', // Blue
          font: {
            size: 12,
            weight: 'bold' as const
          },
          padding: {
            top: 10,
            bottom: 10
          }
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
          },
          ticks: {
            padding: 20, // Increased padding for legend space
            callback: function(tickValue: string | number) {
              const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
              // Check second series name for percentage
              const secondSeries = series && series[1];
              if (secondSeries && secondSeries.name && secondSeries.name.toLowerCase().includes('rate')) {
                return value + '%';
              }
              
              // For other values - formatted numbers
              return formatValue(value, secondSeries?.name);
            }
          },
          // Add legend title for right Y-axis
          title: {
            display: true,
            text: series[1]?.name || 'Series 2',
            color: '#F97316', // Orange
            font: {
              size: 12,
              weight: 'bold' as const
            },
            padding: {
              top: 10,
              bottom: 10
            }
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
      height: '320px', // Increased height to accommodate title
      width: '100%', 
      padding: '0',
      position: 'relative',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      display: 'flex',
      flexDirection: 'column'
    }}>
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
            fontSize: '15px',
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
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff'
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
                justifyContent: 'center'
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
                        right: 10
                      }
                    },
                    plugins: {
                      ...options.plugins,
                      legend: {
                        display: false, // Hide default legend since we'll position them on Y-axes
                      },
                      tooltip: {
                        ...options.plugins.tooltip,
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3B82F6',
                        borderWidth: 2,
                        cornerRadius: 10,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                          ...options.plugins.tooltip.callbacks,
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
                      ...options.scales,
                      x: {
                        ...options.scales.x,
                        grid: {
                          display: true,
                          color: 'rgba(0, 0, 0, 0.08)',
                          lineWidth: 1
                        },
                        ticks: {
                          padding: 4,
                          font: {
                            size: 9
                          }
                        }
                      },
                      y: {
                        ...options.scales.y,
                        grid: {
                          display: true,
                          color: 'rgba(0, 0, 0, 0.08)',
                          lineWidth: 1
                        },
                        ticks: {
                          padding: 20, // Increased padding for legend space
                          font: {
                            size: 9
                          },
                          callback: function(tickValue: string | number) {
                            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
                            const firstSeries = series && series[0];
                            if (firstSeries && firstSeries.name && firstSeries.name.toLowerCase().includes('rate')) {
                              return value + '%';
                            }
                            
                            return formatValue(value, firstSeries?.name);
                          }
                        },
                        // Add legend title for left Y-axis
                        title: {
                          display: true,
                          text: series[0]?.name || 'Series 1',
                          color: '#3B82F6', // Blue
                          font: {
                            size: 10,
                            weight: 'bold'
                          },
                          padding: {
                            top: 5,
                            bottom: 5
                          }
                        }
                      },
                      // Add second Y-axis if needed
                      ...(needsDualYAxis && {
                        y1: {
                          ...options.scales.y1,
                          grid: {
                            drawOnChartArea: false,
                          },
                          ticks: {
                            padding: 20, // Increased padding for legend space
                            font: {
                              size: 9
                            },
                            callback: function(tickValue: string | number) {
                              const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
                              const secondSeries = series && series[1];
                              if (secondSeries && secondSeries.name && secondSeries.name.toLowerCase().includes('rate')) {
                                return value + '%';
                              }
                              
                              return formatValue(value, secondSeries?.name);
                            }
                          },
                          // Add legend title for right Y-axis
                          title: {
                            display: true,
                            text: series[1]?.name || 'Series 2',
                            color: '#F97316', // Orange
                            font: {
                              size: 10,
                              weight: 'bold'
                            },
                            padding: {
                              top: 5,
                              bottom: 5
                            }
                          }
                        }
                      })
                    }
                  }} 
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