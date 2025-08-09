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
import { Bar, Line } from 'react-chartjs-2';
import { getChartIcon } from '../lib/CentralIcon';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Series {
  name: string;
  data: number[];
}

interface BarChartProps {
  series: Series[];
  categories: string[];
  title?: string;
  currency?: string;
  type?: 'bar' | 'line';
  color?: string;
  chartIcon?: string;
}

export default function BarChart({ 
  series, 
  categories, 
  title, 
  currency = 'MYR', 
  type = 'bar', 
  color = '#3B82F6',
  chartIcon
}: BarChartProps) {
  const getCurrencySymbol = (curr: string): string => {
    switch (curr) {
      case 'MYR': return 'RM';
      case 'SGD': return 'SGD';
      case 'USC': return 'USD';
      default: return 'RM';
    }
  };

  const formatValue = (value: number, datasetLabel?: string): string => {
    // Check if this is a count/integer type (New Depositor, Active Member, etc.)
    const isCountType = datasetLabel && (
      datasetLabel.toLowerCase().includes('depositor') || 
      datasetLabel.toLowerCase().includes('member') ||
      datasetLabel.toLowerCase().includes('user') ||
      datasetLabel.toLowerCase().includes('count')
    );
    
    if (isCountType) {
      // For count/integer - no currency symbol
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(0) + 'K';
      }
      return value.toLocaleString();
    } else {
      // For amount/numeric - with currency symbol
      if (value >= 1000000) {
        return getCurrencySymbol(currency) + ' ' + (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return getCurrencySymbol(currency) + ' ' + (value / 1000).toFixed(0) + 'K';
      }
      return getCurrencySymbol(currency) + ' ' + value.toLocaleString();
    }
  };

  // Full value formatter for tooltip (no abbreviation)
  const formatFullValue = (value: number, datasetLabel?: string): string => {
    const isCountType = datasetLabel && (
      datasetLabel.toLowerCase().includes('depositor') || 
      datasetLabel.toLowerCase().includes('member') ||
      datasetLabel.toLowerCase().includes('user') ||
      datasetLabel.toLowerCase().includes('count')
    );
    
    if (isCountType) {
      // For count/integer - no currency symbol, full number
      return value.toLocaleString() + ' persons';
    } else {
      // For amount/numeric - with currency symbol, full number
      return getCurrencySymbol(currency) + ' ' + value.toLocaleString();
    }
  };

  // Convert ApexCharts series format to Chart.js format
  const data = {
    labels: categories,
    datasets: series.map((dataset, index) => ({
      label: dataset.name,
      data: dataset.data,
      backgroundColor: index === 0 ? '#3b82f6' : '#10b981',
      borderColor: index === 0 ? '#2563eb' : '#059669',
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false,
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false  // HAPUS LEGEND
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            const datasetLabel = context.dataset.label;
            
            // For all bar charts - show plain numbers without currency
            if (value >= 1000000) {
              return `${datasetLabel}: ${(value / 1000000).toFixed(1)}M`;
            } else if (value >= 1000) {
              return `${datasetLabel}: ${(value / 1000).toFixed(0)}K`;
            }
            return `${datasetLabel}: ${value}`;
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
          font: {
            weight: 'bold' as const,
            size: 10
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: '#e5e7eb',
          lineWidth: 1,
          drawBorder: false
        },
        ticks: {
          callback: function(tickValue: string | number) {
            // For all bar charts - plain numbers without currency
            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'K';
            }
            return value;
          },
          font: {
            weight: 'bold' as const,
            size: 10
          }
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