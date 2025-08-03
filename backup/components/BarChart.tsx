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
}

export default function BarChart({ 
  series, 
  categories, 
  title, 
  currency = 'MYR', 
  type = 'bar', 
  color = '#3B82F6' 
}: BarChartProps) {
  const getCurrencySymbol = (curr: string): string => {
    switch (curr) {
      case 'MYR': return 'RM';
      case 'SGD': return 'SGD';
      case 'KHR': return 'USC';
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
      y: {
        beginAtZero: true,
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
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '340px' }}>
      <Bar data={data} options={options} />
    </div>
  );
} 