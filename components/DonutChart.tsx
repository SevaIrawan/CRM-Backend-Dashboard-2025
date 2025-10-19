import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import { formatPercentageKPI } from '../lib/formatHelpers';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface Series {
  name: string;
  data: number[];
}

interface DonutChartProps {
  series: Series[];
  categories?: string[];
  title?: string;
  currency?: string;
  colors?: string[];
  chartIcon?: string;
}

export default function DonutChart({ 
  series, 
  categories, 
  title, 
  currency = 'MYR',
  colors: customColors,
  chartIcon
}: DonutChartProps) {
  const defaultColors = [
    '#667eea',
    '#f093fb', 
    '#4facfe',
    '#43e97b',
    '#fa709a',
    '#fee140',
    '#a8edea',
    '#fed6e3'
  ];
  
  const colors = customColors || defaultColors;

  const data = {
    labels: series.map(s => s.name),
    datasets: [
      {
        data: series.map(s => s.data[0]),
        backgroundColor: colors.slice(0, series.length),
        borderColor: colors.slice(0, series.length).map(color => color + '80'),
        borderWidth: 2,
        cutout: '60%',
        hoverOffset: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle' as const,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        enabled: true,
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
            const label = context.label || '';
            const value = context.parsed;
            return `${label}: ${formatPercentageKPI(value)}`;
          }
        }
      }
    },
    elements: {
      arc: {
        borderWidth: 0
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
              fontWeight: '700',
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
                <Doughnut data={data} options={options} />
              </div>
            )
          } catch (error) {
            console.error('❌ [DonutChart] Chart.js error:', error)
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