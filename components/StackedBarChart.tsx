import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getChartIcon } from '../lib/CentralIcon';
import { formatIntegerKPI, formatCurrencyKPI } from '../lib/formatHelpers';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
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

interface StackedBarChartProps {
  series: Series[];
  categories: string[];
  title?: string;
  currency?: string;
  chartIcon?: string;
  horizontal?: boolean;
  showDataLabels?: boolean;
  customLegend?: { label: string; color: string }[];
}

export default function StackedBarChart({
  series,
  categories,
  title,
  currency = 'MYR',
  chartIcon,
  horizontal = false,
  showDataLabels = true,
  customLegend
}: StackedBarChartProps) {
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

  const formatValue = (value: number): string => {
    const isCountType = currency === 'MEMBER' || currency === 'CASES';
    
    if (isCountType) {
      return value.toLocaleString();
    } else {
      if (value >= 1000000) {
        return getCurrencySymbol(currency) + ' ' + (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return getCurrencySymbol(currency) + ' ' + (value / 1000).toFixed(0) + 'K';
      }
      return getCurrencySymbol(currency) + ' ' + value.toLocaleString();
    }
  };

  // Default colors for stacked series
  const defaultColors = ['#3B82F6', '#F97316', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

  const data = {
    labels: categories,
    datasets: series.map((dataset, index) => ({
      label: dataset.name,
      data: dataset.data,
      backgroundColor: dataset.color || defaultColors[index % defaultColors.length],
      borderColor: dataset.color || defaultColors[index % defaultColors.length],
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false,
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    plugins: {
      legend: {
        display: false  // Use custom legend in header
      },
      datalabels: {
        display: showDataLabels,
        color: '#374151',
        font: {
          weight: 'bold' as const,
          size: 10
        },
        anchor: 'center' as const,
        align: 'center' as const,
        formatter: function(value: number) {
          if (value === 0) return ''; // Hide label for 0 values
          
          // ✅ For amount/currency types, use abbreviated format
          const isCountType = currency === 'MEMBER' || currency === 'CASES';
          
          if (!isCountType && value >= 100000) {
            // For large amounts, use K/M format
            if (value >= 1000000) {
              return getCurrencySymbol(currency) + ' ' + (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return getCurrencySymbol(currency) + ' ' + (value / 1000).toFixed(0) + 'K';
            }
          }
          
          return formatIntegerKPI(value);
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
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
            
            if (currency === 'MEMBER') {
              return `${datasetLabel}: ${formatIntegerKPI(value)} members`;
            } else if (currency === 'CASES') {
              return `${datasetLabel}: ${formatIntegerKPI(value)} cases`;
            } else {
              return `${datasetLabel}: ${formatCurrencyKPI(value, currency)}`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true, // Enable stacking
        grid: {
          display: true,
          color: 'rgba(229, 231, 235, 0.5)',
          lineWidth: 1,
          drawBorder: false
        },
        ticks: {
          font: {
            weight: 'bold' as const,
            size: 10
          },
          color: '#6b7280'
        }
      },
      y: {
        stacked: true, // Enable stacking
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(229, 231, 235, 0.5)',
          lineWidth: 1,
          drawBorder: false
        },
        ticks: {
          font: {
            weight: 'bold' as const,
            size: 10
          },
          color: '#6b7280',
          callback: function(tickValue: string | number) {
            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            
            if (value >= 1000000) {
              const mValue = value / 1000000;
              return mValue % 1 === 0 ? mValue.toFixed(0) + 'M' : mValue.toFixed(1) + 'M';
            } else if (value >= 1000) {
              const kValue = value / 1000;
              return kValue % 1 === 0 ? kValue.toFixed(0) + 'K' : kValue.toFixed(1) + 'K';
            } else {
              return value.toFixed(0);
            }
          }
        }
      }
    }
  };

  return (
    <div style={{ 
      height: '100%',
      minHeight: '350px',
      width: '100%', 
      padding: '0',
      position: 'relative',
      backgroundColor: '#ffffff',
      border: '1px solid #ffffff',
      borderRadius: '8px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
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
          
          {/* Custom Legend */}
          {(customLegend || series.length > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {(customLegend || series).map((item, idx) => {
                const isCustom = !!customLegend;
                const label = isCustom ? (customLegend![idx] as any).label : (item as any).name;
                const color = isCustom ? (customLegend![idx] as any).color : ((item as any).color || defaultColors[idx % defaultColors.length]);
                
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '14px',
                      height: '14px',
                      backgroundColor: color,
                      borderRadius: '2px'
                    }} />
                    <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 600, textTransform: 'uppercase' }}>
                      {label}
                    </span>
                  </div>
                );
              })}
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

