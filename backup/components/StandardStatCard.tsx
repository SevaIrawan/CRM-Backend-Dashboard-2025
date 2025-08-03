// components/StandardStatCard.tsx

interface StandardStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: string;
  isAmount?: boolean;
  currencyLogo?: string | null;
}

export default function StandardStatCard({ 
  title, 
  value, 
  subtitle, 
  color, 
  icon,
  isAmount = false,
  currencyLogo = null
}: StandardStatCardProps) {
  
  // Parse change value to determine if positive or negative
  const parseChange = (changeText?: string) => {
    if (!changeText) return { value: 0, isPositive: true };
    const match = changeText.match(/([+-]?\d+\.?\d*)%/);
    if (match) {
      const value = parseFloat(match[1]);
      return { value, isPositive: value >= 0 };
    }
    return { value: 0, isPositive: true };
  };

  const changeInfo = parseChange(subtitle);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }}>
      {icon && (
        <div style={{
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          borderRadius: '8px',
          backgroundColor: color ? `${color}20` : '#f3f4f6',
          color: color || '#6b7280'
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '500',
          color: color || '#6b7280',
          margin: '0 0 8px 0',
          lineHeight: '1.2'
        }}>
          {title}
        </h3>
        <div style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {isAmount && currencyLogo && (
            <span style={{ fontSize: '0.8em' }}>{currencyLogo}</span>
          )}
          {value}
        </div>
        <div style={{
          fontSize: '12px',
          fontWeight: '500',
          color: changeInfo.isPositive ? '#10b981' : '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {changeInfo.isPositive ? '↗' : '↘'} {subtitle}
        </div>
      </div>
    </div>
  );
} 