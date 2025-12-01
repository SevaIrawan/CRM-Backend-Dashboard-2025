import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { getChartIcon } from '../lib/CentralIcon';
import { formatIntegerKPI, formatPercentageKPI } from '../lib/formatHelpers';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

interface PieDataItem {
  label: string;
  value: number;
  color: string;
  percentage?: number;
}

interface PieChartProps {
  data: PieDataItem[];
  title?: string;
  chartIcon?: string;
  showLegend?: boolean;
  showPercentage?: boolean;
}

export default function PieChart({
  data,
  title,
  chartIcon,
  showLegend = true,
  showPercentage = true
}: PieChartProps) {
  // Error handling for empty data - prevent chartjs-plugin-datalabels error
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
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // We'll use custom legend
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${formatIntegerKPI(value)} (${percentage}%)`;
          }
        }
      },
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#ffffff',
      borderRadius: '8px'
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
        
        {/* Custom Legend - 2 rows, centered below chart */}
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
              gap: '8px',
              flexShrink: 0
            }}>
              {/* Row 1 */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                fontSize: '12px'
              }}>
                {row1.map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      flexShrink: 0,
                      backgroundColor: item.color
                    }} />
                    <span style={{ 
                      fontSize: '12px',
                      color: '#374151',
                      whiteSpace: 'nowrap'
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
                  gap: '16px',
                  fontSize: '12px'
                }}>
                  {row2.map((item, index) => (
                    <div key={itemsPerRow + index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        flexShrink: 0,
                        backgroundColor: item.color
                      }} />
                      <span style={{ 
                        fontSize: '12px',
                        color: '#374151',
                        whiteSpace: 'nowrap'
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
  );
}

