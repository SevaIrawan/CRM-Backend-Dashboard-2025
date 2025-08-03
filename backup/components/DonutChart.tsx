import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';

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
}

export default function DonutChart({ 
  series, 
  categories, 
  title, 
  currency = 'MYR' 
}: DonutChartProps) {
  const colors = [
    '#667eea',
    '#f093fb', 
    '#4facfe',
    '#43e97b',
    '#fa709a',
    '#fee140',
    '#a8edea',
    '#fed6e3'
  ];

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
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            return `${label}: ${value}%`;
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
    <div style={{ height: '300px', position: 'relative' }}>
      <Doughnut data={data} options={options} />
    </div>
  );
} 