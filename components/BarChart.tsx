import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Line } from 'react-chartjs-2';
import { getChartIcon } from '../lib/CentralIcon';
import { formatNumericKPI, formatIntegerKPI, formatCurrencyKPI, formatPercentageKPI } from '../lib/formatHelpers';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface Series {
  name: string;
  data: number[];
  color?: string;
}

interface BarChartProps {
  series: Series[];
  categories: string[];
  title?: string;
  currency?: string;
  type?: 'bar' | 'line';
  color?: string;
  chartIcon?: string;
  horizontal?: boolean;
  showDataLabels?: boolean; // Show data labels (default: true)
  customLegend?: { label: string; color: string }[]; // Optional custom legend (rendered in header)
  onDoubleClick?: () => void; // For zoom functionality
  clickable?: boolean; // Enable hover effects
}

export default function BarChart({
  series,
  categories,
  title,
  currency = 'MYR',
  type = 'bar',
  color = '#3B82F6',
  chartIcon,
  horizontal = false,
  showDataLabels = true, // ✅ DEFAULT TRUE - SHOW ALL LABELS!
  customLegend,
  onDoubleClick,
  clickable = false
}: BarChartProps) {
  const getCurrencySymbol = (curr: string): string => {
    switch (curr) {
      case 'MYR': return 'RM';
      case 'SGD': return 'SGD';
      case 'USC': return 'USD';
      case 'MEMBER': return '';
      case 'CASES': return '';
      default: return 'RM';
    }
  };

  const formatValue = (value: number, datasetLabel?: string): string => {
    // Check if this is a count/integer type based on currency
    const isCountType = currency === 'MEMBER' || currency === 'CASES' || (
      datasetLabel && (
        datasetLabel.toLowerCase().includes('depositor') || 
        datasetLabel.toLowerCase().includes('member') ||
        datasetLabel.toLowerCase().includes('user') ||
        datasetLabel.toLowerCase().includes('count') ||
        datasetLabel.toLowerCase().includes('register')
      )
    );
    
    // Check if this is a small currency value that needs decimal (Bonus, ATV, per-user metrics)
    const needsDecimal = title && (
      title.toLowerCase().includes('bonus') ||
      title.toLowerCase().includes('atv') ||
      title.toLowerCase().includes('per user') ||
      title.toLowerCase().includes('da user') ||
      title.toLowerCase().includes('ggr user')
    );
    
    if (isCountType) {
      // For count/integer - no currency symbol, show all digits
      return value.toLocaleString();
    } else {
      // For amount/numeric - with currency symbol
      if (value >= 1000000) {
        return getCurrencySymbol(currency) + ' ' + (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return getCurrencySymbol(currency) + ' ' + (value / 1000).toFixed(0) + 'K';
      }
      // For small values - check if needs decimal
      if (needsDecimal) {
        return getCurrencySymbol(currency) + ' ' + value.toFixed(2);
      }
      return getCurrencySymbol(currency) + ' ' + value.toLocaleString();
    }
  };

  // Full value formatter for tooltip using standard KPI format
  const formatFullValue = (value: number, datasetLabel?: string): string => {
    // Check if this is a formula/numeric type (GGR User, DA User, ATV, etc.)
    const isFormulaNumericType = datasetLabel && (
      datasetLabel.toLowerCase().includes('ggr user') ||
      datasetLabel.toLowerCase().includes('da user') ||
      datasetLabel.toLowerCase().includes('atv') ||
      datasetLabel.toLowerCase().includes('average transaction value') ||
      datasetLabel.toLowerCase().includes('net profit') ||
      datasetLabel.toLowerCase().includes('deposit amount')
    );
    
    const isCountType = currency === 'MEMBER' || currency === 'CASES' || (
      datasetLabel && (
        datasetLabel.toLowerCase().includes('depositor') || 
        (datasetLabel.toLowerCase().includes('member') && !datasetLabel.toLowerCase().includes('user')) ||
        datasetLabel.toLowerCase().includes('count') ||
        datasetLabel.toLowerCase().includes('register') ||
        datasetLabel.toLowerCase().includes('cases')
      ) && !isFormulaNumericType // EXCLUDE formula numeric types
    );
    
            // Check if this is an amount/currency type (Deposit, Withdraw, Revenue, CLV, Bonus, etc.)
            const isAmountType = datasetLabel && (
              datasetLabel.toLowerCase().includes('amount') ||
              (datasetLabel.toLowerCase().includes('deposit') && !datasetLabel.toLowerCase().includes('depositor')) ||
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
              datasetLabel.toLowerCase().includes('pure user') ||
              datasetLabel.toLowerCase().includes('user') || // Add user for GGR User, DA User
              datasetLabel.toLowerCase().includes('bonus') || // Add bonus for AVG Bonus Usage
              title?.toLowerCase().includes('bonus') // Also check title for bonus
            );
    
    if (isCountType) {
      // For count/integer - using standard format: 0,000 (no currency symbol)
      if (currency === 'MEMBER') {
        return formatIntegerKPI(value) + ' members';
      } else if (currency === 'CASES') {
        return formatIntegerKPI(value) + ' cases';
      }
      return formatIntegerKPI(value) + ' members';
    } else if (isAmountType || isFormulaNumericType) {
      // For amount/currency/formula - using standard format: RM 0,000.00
      return formatCurrencyKPI(value, currency);
    } else {
      // Default - using standard format: 0,000
      return formatIntegerKPI(value);
    }
  };

  // Convert ApexCharts series format to Chart.js format
  const data = {
    labels: categories,
    datasets: series.map((dataset, index) => ({
      label: dataset.name,
      data: dataset.data,
      backgroundColor: dataset.color || (index === 0 ? color : '#f97316'),
      borderColor: dataset.color || (index === 0 ? color : '#ea580c'),
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false,
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' as const : 'x' as const, // Enable horizontal bar
    plugins: {
      legend: {
        display: false  // HAPUS LEGEND
      },
      datalabels: {
        display: true, // ✅ ALWAYS SHOW LABELS - NO EXCEPTION!
        color: '#1f2937', // ✅ STANDARD: BLACK COLOR FOR ALL LABELS
        font: {
          weight: 'bold' as const,
          size: 10
        },
        anchor: 'end' as const, // Always anchor at end of bar
        align: horizontal ? 'end' as const : 'top' as const, // ✅ ALWAYS TOP - SEMUA LABELS KELUAR!
        offset: -2, // Small negative offset to place ABOVE bar top
        formatter: function(value: number, context: any) {
          const datasetLabel = context.dataset.label;
          
          // For transaction trends and automation, use "c" suffix for labels (to avoid overlap)
          if (datasetLabel && (
            datasetLabel.toLowerCase().includes('overdue') ||
            datasetLabel.toLowerCase().includes('transactions') ||
            datasetLabel.toLowerCase().includes('transaction trend') ||
            datasetLabel.toLowerCase().includes('trans automation') ||
            datasetLabel.toLowerCase().includes('automation')
          )) {
            return formatIntegerKPI(value) + 'c';
          }
          
          // For cases type, use "c" suffix
          if (datasetLabel && datasetLabel.toLowerCase().includes('cases')) {
            return formatIntegerKPI(value) + 'c';
          }
          
          // For purchase frequency, use 2 decimal places without unit
          if (datasetLabel && datasetLabel.toLowerCase().includes('purchase frequency')) {
            return value.toFixed(2);
          }
          
          // For member type, do not use "Member" suffix
          if (datasetLabel && (
            datasetLabel.toLowerCase().includes('active member') ||
            datasetLabel.toLowerCase().includes('member')
          )) {
            return formatIntegerKPI(value);
          }
          
          // ✅ For RATE/PERCENTAGE types, use 2 decimal places with % symbol
          if (datasetLabel && (
            datasetLabel.toLowerCase().includes('rate') ||
            datasetLabel.toLowerCase().includes('percentage') ||
            datasetLabel.toLowerCase().includes('winrate')
          )) {
            return value.toFixed(2) + '%';
          }
          
          // ✅ For BONUS types, ALWAYS use 2 decimal places (RM X.XX)
          if (title && title.toLowerCase().includes('bonus')) {
            return getCurrencySymbol(currency) + ' ' + value.toFixed(2);
          }
          
          // ✅ For currency/amount types, use ABBREVIATED format (K, M) for data labels
          if (datasetLabel && (
            datasetLabel.toLowerCase().includes('amount') ||
            (datasetLabel.toLowerCase().includes('deposit') && !datasetLabel.toLowerCase().includes('depositor')) ||
            datasetLabel.toLowerCase().includes('withdraw') ||
            datasetLabel.toLowerCase().includes('revenue') ||
            datasetLabel.toLowerCase().includes('ggr') ||
            datasetLabel.toLowerCase().includes('profit') ||
            datasetLabel.toLowerCase().includes('user') ||
            datasetLabel.toLowerCase().includes('atv') ||
            datasetLabel.toLowerCase().includes('value')
          )) {
            // ✅ Use abbreviated format for DATA LABELS (not full currency)
            if (value >= 1000000) {
              return getCurrencySymbol(currency) + ' ' + (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return getCurrencySymbol(currency) + ' ' + (value / 1000).toFixed(0) + 'K';
            }
            return formatCurrencyKPI(value, currency);
          }
          
          // Default formatting
          return formatIntegerKPI(value);
        }
      },
      tooltip: {
        enabled: true,
        position: 'nearest' as const,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3B82F6',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const value = horizontal ? context.parsed.x : context.parsed.y;
            const datasetLabel = context.dataset.label;
            
            // For transaction trends and automation, use "cases" suffix
            if (datasetLabel && (
              datasetLabel.toLowerCase().includes('overdue') ||
              datasetLabel.toLowerCase().includes('transactions') ||
              datasetLabel.toLowerCase().includes('transaction trend') ||
              datasetLabel.toLowerCase().includes('trans automation') ||
              datasetLabel.toLowerCase().includes('automation')
            )) {
              return `${datasetLabel}: ${formatIntegerKPI(value)} cases`;
            }
            
            // Check if this is a cases type (Deposit Cases, Withdraw Cases)
            const isCasesType = datasetLabel && (
              datasetLabel.toLowerCase().includes('cases')
            );
            
            // Check if this is a count/integer type (New Depositor, Active Member, etc.)
            const isFormulaNumericType = datasetLabel && (
              datasetLabel.toLowerCase().includes('ggr user') ||
              datasetLabel.toLowerCase().includes('da user') ||
              datasetLabel.toLowerCase().includes('atv') ||
              datasetLabel.toLowerCase().includes('average transaction value') ||
              datasetLabel.toLowerCase().includes('net profit') ||
              datasetLabel.toLowerCase().includes('deposit amount')
            );
            
            const isCountType = datasetLabel && (
              datasetLabel.toLowerCase().includes('depositor') || 
              (datasetLabel.toLowerCase().includes('member') && !datasetLabel.toLowerCase().includes('user')) ||
              datasetLabel.toLowerCase().includes('count') ||
              datasetLabel.toLowerCase().includes('register')
            ) && !isFormulaNumericType;
            
            // Check if this is a rate/percentage type
            const isRateType = datasetLabel && (
              datasetLabel.toLowerCase().includes('rate') ||
              datasetLabel.toLowerCase().includes('winrate') ||
              datasetLabel.toLowerCase().includes('percentage')
            );
            
            if (isCasesType) {
              // For cases - using standard format: 0,000
              return `${datasetLabel}: ${formatIntegerKPI(value)} cases`;
            } else if (isCountType) {
              // For count/integer - using standard format: 0,000
              return `${datasetLabel}: ${formatIntegerKPI(value)} members`;
            } else if (isRateType) {
              // For rate/percentage - using standard format: 00.00%
              return `${datasetLabel}: ${formatPercentageKPI(value)}`;
            } else {
              // For amount/numeric - using standard format: RM 0,000.00
              return `${datasetLabel}: ${formatCurrencyKPI(value, currency)}`;
            }
          }
        }
      }
    },
    scales: horizontal ? {
      // For horizontal bar chart
      x: {
        beginAtZero: true,
        // ✅ CONSISTENT X-AXIS: ALL bars use SAME min/max for proportional display
        min: (() => {
          // Get ALL values from ALL series (all bars in this chart)
          const allValues = series.flatMap(s => s.data);
          const minValue = Math.min(...allValues);
          
          // Always start from 0 for positive data, floor for negative
          return minValue >= 0 ? 0 : Math.floor(minValue * 1.1);
        })(),
        max: (() => {
          // Get MAX from ALL values in ALL series (all bars)
          const allValues = series.flatMap(s => s.data);
          const maxValue = Math.max(...allValues);
          
          // Add small 8% padding - NOT TOO MUCH!
          const targetMax = maxValue * 1.08;
          
          // Smart rounding - find nearest nice number WITHOUT wasting space
          if (targetMax >= 10000000) {
            // For 10M+: round to nearest 1M
            return Math.ceil(targetMax / 1000000) * 1000000;
          } else if (targetMax >= 1000000) {
            // For 1M-10M: round to nearest 250K (more precise!)
            return Math.ceil(targetMax / 250000) * 250000;
          } else if (targetMax >= 100000) {
            // For 100K-1M: round to nearest 25K
            return Math.ceil(targetMax / 25000) * 25000;
          } else if (targetMax >= 10000) {
            // For 10K-100K: round to nearest 2.5K
            return Math.ceil(targetMax / 2500) * 2500;
          } else if (targetMax >= 1000) {
            // For 1K-10K: round to nearest 250
            return Math.ceil(targetMax / 250) * 250;
          } else if (targetMax >= 100) {
            // For 100-1K: round to nearest 25
            return Math.ceil(targetMax / 25) * 25;
          } else if (targetMax >= 10) {
            // For 10-100: round to nearest 5
            return Math.ceil(targetMax / 5) * 5;
          } else {
            return Math.ceil(targetMax);
          }
        })(),
        grid: {
          display: true,
          color: 'rgba(229, 231, 235, 0.5)',
          lineWidth: 1,
          drawBorder: false
        },
        ticks: {
          // ✅ CONSISTENT STEPS: Divide max by 5 for clean intervals
          stepSize: (() => {
            const allValues = series.flatMap(s => s.data);
            const maxValue = Math.max(...allValues);
            const targetMax = maxValue * 1.08;
            
            // Calculate nice round max (SAME logic as max calculation)
            let niceMax;
            if (targetMax >= 10000000) {
              niceMax = Math.ceil(targetMax / 1000000) * 1000000;
            } else if (targetMax >= 1000000) {
              niceMax = Math.ceil(targetMax / 250000) * 250000;
            } else if (targetMax >= 100000) {
              niceMax = Math.ceil(targetMax / 25000) * 25000;
            } else if (targetMax >= 10000) {
              niceMax = Math.ceil(targetMax / 2500) * 2500;
            } else if (targetMax >= 1000) {
              niceMax = Math.ceil(targetMax / 250) * 250;
            } else if (targetMax >= 100) {
              niceMax = Math.ceil(targetMax / 25) * 25;
            } else if (targetMax >= 10) {
              niceMax = Math.ceil(targetMax / 5) * 5;
            } else {
              niceMax = Math.ceil(targetMax);
            }
            
            // Divide by 5 for consistent 5 steps: 0, 20%, 40%, 60%, 80%, 100%
            return niceMax / 5;
          })(),
          callback: function(tickValue: string | number) {
            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            
            // Clean formatting for easy reading
            if (value >= 1000000) {
              const mValue = value / 1000000;
              return mValue % 1 === 0 ? mValue.toFixed(0) + 'M' : mValue.toFixed(1) + 'M';
            } else if (value >= 1000) {
              const kValue = value / 1000;
              return kValue % 1 === 0 ? kValue.toFixed(0) + 'K' : kValue.toFixed(1) + 'K';
            } else {
              return value.toFixed(0);
            }
          },
          font: {
            weight: 'bold' as const,
            size: 10
          },
          color: '#6b7280'
        }
      },
      y: {
        grid: {
          display: true,
          color: 'rgba(229, 231, 235, 0.3)', // ✅ IMPROVED: Even softer grid lines
          lineWidth: 1,
          drawBorder: false
        },
        ticks: {
          font: {
            weight: 'bold' as const,
            size: 10
          },
          color: '#6b7280' // ✅ IMPROVED: Better text color
        }
      }
    } : {
      // For vertical bar chart (default)
      x: {
        grid: {
          display: true,
          color: 'rgba(229, 231, 235, 0.5)', // ✅ IMPROVED: Softer grid lines
          lineWidth: 1,
          drawBorder: false
        },
        ticks: {
          font: {
            weight: 'bold' as const,
            size: 10
          },
          color: '#6b7280' // ✅ IMPROVED: Better text color
        }
      },
      y: {
        beginAtZero: true,
        // ✅ CONSISTENT Y-AXIS: ALL bars use SAME min/max for proportional display
        min: (() => {
          // Get ALL values from ALL series (all bars in this chart)
          const allValues = series.flatMap(s => s.data);
          const minValue = Math.min(...allValues);
          
          // Always start from 0 for positive data, floor for negative
          return minValue >= 0 ? 0 : Math.floor(minValue * 1.1);
        })(),
        max: (() => {
          // Get MAX from ALL values in ALL series (all bars)
          const allValues = series.flatMap(s => s.data);
          const maxValue = Math.max(...allValues);
          
          // Add small 8% padding - NOT TOO MUCH!
          const targetMax = maxValue * 1.08;
          
          // Smart rounding - find nearest nice number WITHOUT wasting space
          if (targetMax >= 10000000) {
            // For 10M+: round to nearest 1M
            return Math.ceil(targetMax / 1000000) * 1000000;
          } else if (targetMax >= 1000000) {
            // For 1M-10M: round to nearest 250K (more precise!)
            return Math.ceil(targetMax / 250000) * 250000;
          } else if (targetMax >= 100000) {
            // For 100K-1M: round to nearest 25K
            return Math.ceil(targetMax / 25000) * 25000;
          } else if (targetMax >= 10000) {
            // For 10K-100K: round to nearest 2.5K
            return Math.ceil(targetMax / 2500) * 2500;
          } else if (targetMax >= 1000) {
            // For 1K-10K: round to nearest 250
            return Math.ceil(targetMax / 250) * 250;
          } else if (targetMax >= 100) {
            // For 100-1K: round to nearest 25
            return Math.ceil(targetMax / 25) * 25;
          } else if (targetMax >= 10) {
            // For 10-100: round to nearest 5
            return Math.ceil(targetMax / 5) * 5;
          } else {
            return Math.ceil(targetMax);
          }
        })(),
        grid: {
          display: true,
          color: 'rgba(229, 231, 235, 0.5)',
          lineWidth: 1,
          drawBorder: false
        },
        ticks: {
          // ✅ CONSISTENT STEPS: Divide max by 5 for clean intervals
          stepSize: (() => {
            const allValues = series.flatMap(s => s.data);
            const maxValue = Math.max(...allValues);
            const targetMax = maxValue * 1.08;
            
            // Calculate nice round max (SAME logic as max calculation)
            let niceMax;
            if (targetMax >= 10000000) {
              niceMax = Math.ceil(targetMax / 1000000) * 1000000;
            } else if (targetMax >= 1000000) {
              niceMax = Math.ceil(targetMax / 250000) * 250000;
            } else if (targetMax >= 100000) {
              niceMax = Math.ceil(targetMax / 25000) * 25000;
            } else if (targetMax >= 10000) {
              niceMax = Math.ceil(targetMax / 2500) * 2500;
            } else if (targetMax >= 1000) {
              niceMax = Math.ceil(targetMax / 250) * 250;
            } else if (targetMax >= 100) {
              niceMax = Math.ceil(targetMax / 25) * 25;
            } else if (targetMax >= 10) {
              niceMax = Math.ceil(targetMax / 5) * 5;
            } else {
              niceMax = Math.ceil(targetMax);
            }
            
            // Divide by 5 for consistent 5 steps: 0, 20%, 40%, 60%, 80%, 100%
            return niceMax / 5;
          })(),
          callback: function(tickValue: string | number) {
            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            
            // Clean formatting for easy reading
            if (value >= 1000000) {
              const mValue = value / 1000000;
              return mValue % 1 === 0 ? mValue.toFixed(0) + 'M' : mValue.toFixed(1) + 'M';
            } else if (value >= 1000) {
              const kValue = value / 1000;
              return kValue % 1 === 0 ? kValue.toFixed(0) + 'K' : kValue.toFixed(1) + 'K';
            } else {
              return value.toFixed(0);
            }
          },
          font: {
            weight: 'bold' as const,
            size: 10
          },
          color: '#6b7280'
        }
      }
    }
  };

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
      transition: clickable ? 'all 0.2s ease' : undefined,
      cursor: clickable ? 'pointer' : 'default'
    }}
    onDoubleClick={clickable ? onDoubleClick : undefined}
    onMouseEnter={(e) => {
      if (clickable) {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }
    }}
    onMouseLeave={(e) => {
      if (clickable) {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
      }
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
          {/* Custom Legend (optional) */}
          {customLegend && customLegend.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {customLegend.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '4px',
                    backgroundColor: item.color,
                    borderRadius: '2px'
                  }} />
                  <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 600 }}>{item.label.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Chart Container */}
      <div style={{ 
        flex: 1, 
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ height: '100%', width: '100%' }}>
          <Bar data={data} options={options} />
        </div>
      </div>
    </div>
  );
} 