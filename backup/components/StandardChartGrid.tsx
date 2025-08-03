// components/StandardChartGrid.tsx
import StandardChart from './StandardChart';

interface Series {
  name: string;
  data: number[];
}

interface Chart {
  type: 'bar' | 'line' | 'donut';
  series: Series[];
  categories: string[];
  title: string;
  currency?: string;
  loading?: boolean;
  placeholder?: React.ReactNode;
}

interface StandardChartGridProps {
  charts: Chart[];
  loading?: boolean;
  layout?: '2x2' | '1x2' | '2x1' | '1x1' | '3x1' | 'complex';
}

export default function StandardChartGrid({ 
  charts, 
  loading = false,
  layout = '2x2' // '2x2', '1x2', '2x1', '1x1', '3x1'
}: StandardChartGridProps) {
  
  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
        padding: '24px'
      }}>
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
      </div>
    );
  }

  const chartCount = charts.length;

  const renderCharts = () => {
    switch (layout) {
      case '2x2':
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
            padding: '24px'
          }}>
            {charts.map((chart, i) => (
              <StandardChart
                key={i}
                type={chart.type}
                series={chart.series}
                categories={chart.categories}
                title={chart.title}
                currency={chart.currency}
                loading={chart.loading}
                placeholder={chart.placeholder}
              />
            ))}
          </div>
        );
      
      case '1x2':
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px',
            padding: '24px'
          }}>
            {charts.map((chart, i) => (
              <StandardChart
                key={i}
                type={chart.type}
                series={chart.series}
                categories={chart.categories}
                title={chart.title}
                currency={chart.currency}
                loading={chart.loading}
                placeholder={chart.placeholder}
              />
            ))}
          </div>
        );
      
      case '2x1':
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px',
            padding: '24px'
          }}>
            {charts.map((chart, i) => (
              <StandardChart
                key={i}
                type={chart.type}
                series={chart.series}
                categories={chart.categories}
                title={chart.title}
                currency={chart.currency}
                loading={chart.loading}
                placeholder={chart.placeholder}
              />
            ))}
          </div>
        );
      
      case '1x1':
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '24px',
            padding: '24px',
            width: '100%'
          }}>
            {charts.map((chart, i) => (
              <StandardChart
                key={i}
                type={chart.type}
                series={chart.series}
                categories={chart.categories}
                title={chart.title}
                currency={chart.currency}
                loading={chart.loading}
                placeholder={chart.placeholder}
              />
            ))}
          </div>
        );
      
      case '3x1':
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
            padding: '24px'
          }}>
            {charts.map((chart, i) => (
              <StandardChart
                key={i}
                type={chart.type}
                series={chart.series}
                categories={chart.categories}
                title={chart.title}
                currency={chart.currency}
                loading={chart.loading}
                placeholder={chart.placeholder}
              />
            ))}
          </div>
        );

      case 'complex':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            padding: '24px'
          }}>
            {/* Row 1: 3 Bar Charts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px'
            }}>
              {charts.slice(0, 3).map((chart, i) => (
                <StandardChart
                  key={i}
                  type={chart.type}
                  series={chart.series}
                  categories={chart.categories}
                  title={chart.title}
                  currency={chart.currency}
                  loading={chart.loading}
                  placeholder={chart.placeholder}
                />
              ))}
            </div>
            
            {/* Row 2: 2 Line Charts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '24px'
            }}>
              {charts.slice(3, 5).map((chart, i) => (
                <StandardChart
                  key={i + 3}
                  type={chart.type}
                  series={chart.series}
                  categories={chart.categories}
                  title={chart.title}
                  currency={chart.currency}
                  loading={chart.loading}
                  placeholder={chart.placeholder}
                />
              ))}
            </div>
            
            {/* Row 3: 1 Bar Chart + 1 Line Chart */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '24px'
            }}>
              {charts.slice(5, 7).map((chart, i) => (
                <StandardChart
                  key={i + 5}
                  type={chart.type}
                  series={chart.series}
                  categories={chart.categories}
                  title={chart.title}
                  currency={chart.currency}
                  loading={chart.loading}
                  placeholder={chart.placeholder}
                />
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
            padding: '24px'
          }}>
            {charts.map((chart, i) => (
              <StandardChart
                key={i}
                type={chart.type}
                series={chart.series}
                categories={chart.categories}
                title={chart.title}
                currency={chart.currency}
                loading={chart.loading}
                placeholder={chart.placeholder}
              />
            ))}
          </div>
        );
    }
  };

  return renderCharts();
} 