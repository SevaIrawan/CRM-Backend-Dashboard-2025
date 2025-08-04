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
}

export default function LineChart({ 
  series, 
  categories, 
  title, 
  currency = 'MYR' 
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
      // For frequency - show as decimal number only
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
      // For frequency - show as decimal number only
      return value.toFixed(4);
    } else if (isCountType) {
      // For count/integer - no currency symbol, full number
      return value.toLocaleString() + ' persons';
    } else {
      // For CLV and other amounts - show as integer only (no currency)
      return Math.round(value).toLocaleString();
    }
  };

  const data = {
    labels: categories,
    datasets: series.map((item, index) => ({
      label: item.name,
      data: item.data,
      borderColor: index === 0 ? '#3B82F6' : '#10B981',
      backgroundColor: index === 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
      borderWidth: 3,
      pointBackgroundColor: index === 0 ? '#3B82F6' : '#10B981',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      fill: true,
      tension: 0.4
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
        top: 5,
        bottom: 5,
        left: 5,
        right: 5
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        align: 'center' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
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
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1
        },
        ticks: {
          padding: 8
        }
      },
      y: {
        beginAtZero: false,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1
        },
        ticks: {
          padding: 8,
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
        }
      }
    }
  };

  console.log('📊 [LineChart] Chart data prepared:', {
    labels: data.labels,
    datasets: data.datasets.map(d => ({ label: d.label, dataLength: d.data.length }))
  })

  return (
    <div style={{ 
      height: '280px', 
      width: '100%', 
      padding: '0',
      position: 'relative',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
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
                      top: 5,
                      bottom: 5,
                      left: 5,
                      right: 5
                    }
                  },
                  plugins: {
                    ...options.plugins,
                    legend: {
                      ...options.plugins.legend,
                      position: 'bottom' as const,
                      align: 'center' as const,
                      labels: {
                        ...options.plugins.legend.labels,
                        padding: 8,
                        usePointStyle: true,
                        font: {
                          size: 10
                        }
                      }
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
                        padding: 4,
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
                      }
                    }
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
  );
} 