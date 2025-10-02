// components/StandardChart.tsx
import BarChart from './BarChart';
import LineChart from './LineChart';
import DonutChart from './DonutChart';

interface Series {
  name: string;
  data: number[];
}

interface StandardChartProps {
  type?: 'bar' | 'line' | 'donut';
  series: Series[];
  categories: string[];
  title?: string;
  currency?: string;
  loading?: boolean;
  placeholder?: React.ReactNode;
}

export default function StandardChart({ 
  type = 'bar',
  series, 
  categories, 
  title, 
  currency = 'MYR',
  loading = false,
  placeholder = null
}: StandardChartProps) {
  
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          height: '20px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          marginBottom: '16px',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}></div>
        <div style={{
          height: '300px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}></div>
      </div>
    );
  }

  if (placeholder) {
    return (
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          margin: '0 0 16px 0'
        }}>{title}</h3>
        <div style={{
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          {placeholder}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#1f2937',
        margin: '0 0 16px 0'
      }}>{title}</h3>
      {type === 'line' ? (
        <LineChart 
          series={series} 
          categories={categories} 
          title={title} 
          currency={currency}
        />
      ) : type === 'donut' ? (
        <DonutChart 
          series={series} 
          categories={categories} 
          title={title} 
          currency={currency}
        />
      ) : (
        <BarChart 
          series={series} 
          categories={categories} 
          title={title} 
          currency={currency}
          type={type}
        />
      )}
    </div>
  );
} 