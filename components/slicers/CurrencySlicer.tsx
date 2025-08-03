// CENTRALIZED CURRENCY SLICER - KONSISTEN UNTUK SEMUA PAGE
import React from 'react';

interface CurrencySlicerProps {
  value: string;
  onChange: (value: string) => void;
}

const CurrencySlicer: React.FC<CurrencySlicerProps> = ({ value, onChange }) => {
  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'MYR', name: 'Malaysian Ringgit' }
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="subheader-select"
      style={{
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        backgroundColor: 'white',
        fontSize: '14px',
        color: '#374151',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 0.2s ease',
        minWidth: '120px'
      }}
    >
      {currencies.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {currency.code} - {currency.name}
        </option>
      ))}
    </select>
  );
};

export default CurrencySlicer; 