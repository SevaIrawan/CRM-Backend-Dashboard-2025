// components/StandardKPIGrid.tsx
import StandardStatCard from './StandardStatCard';

interface KPIStat {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: string;
  isAmount?: boolean;
  currencyLogo?: string;
}

interface StandardKPIGridProps {
  data: KPIStat[];
  loading?: boolean;
  columns?: number;
}

export default function StandardKPIGrid({ 
  data, 
  loading = false,
  columns = 6 
}: StandardKPIGridProps) {
  
  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '20px',
        padding: '24px'
      }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}></div>
            <div style={{ flex: 1 }}>
              <div style={{
                height: '16px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                marginBottom: '8px',
                width: '60%',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}></div>
              <div style={{
                height: '24px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                marginBottom: '4px',
                width: '80%',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}></div>
              <div style={{
                height: '12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                width: '40%',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cardCount = data.length;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '20px',
      padding: '24px'
    }}>
      {data.map((stat, i) => (
        <StandardStatCard
          key={i}
          title={stat.title}
          value={stat.value}
          subtitle={stat.subtitle}
          color={stat.color}
          icon={stat.icon}
          isAmount={stat.isAmount}
          currencyLogo={stat.currencyLogo}
        />
      ))}
    </div>
  );
} 