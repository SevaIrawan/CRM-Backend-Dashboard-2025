/**
 * Standard KPI Format Helpers
 * 
 * Format Standard:
 * - Numeric/Amount/Formula: 0,000.00 (2 decimal places)
 * - Integer/Satuan/Cases: 0,000 (no decimal)
 */

/**
 * Format numeric/amount values with 2 decimal places and thousand separators
 * Used for: Deposit Amount, Withdraw Amount, GGR, Net Profit, Bonus, ATV, etc.
 */
export const formatNumericKPI = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  
  // ✅ IMPROVED: Use thousand denominations for better readability
  const absValue = Math.abs(value);
  const isNegative = value < 0;
  
  let formattedValue: string;
  if (absValue >= 1000000) {
    formattedValue = `${(absValue / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    formattedValue = `${(absValue / 1000).toFixed(2)}K`;
  } else {
    formattedValue = absValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  return `${isNegative ? '-' : ''}${formattedValue}`;
};

/**
 * Format integer values with thousand separators and no decimal
 * Used for: Deposit Cases, Withdraw Cases, Active Member, Headcount, etc.
 */
export const formatIntegerKPI = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(value));
};

/**
 * Format currency values with symbol and 2 decimal places
 * Used for: Deposit Amount, Withdraw Amount, GGR, Net Profit, Bonus, ATV, etc.
 */
export const formatCurrencyKPI = (value: number | null | undefined, currency: string): string => {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  
  let symbol: string;
  
  switch (currency) {
    case 'MYR':
      symbol = 'RM';
      break;
    case 'SGD':
      symbol = 'SGD';
      break;
    case 'USC':
      symbol = 'USD';
      break;
    case 'ALL':
      symbol = 'RM';
      break;
    default:
      symbol = 'RM';
  }
  
  // ✅ IMPROVED: Use thousand denominations for better readability
  const absValue = Math.abs(value);
  const isNegative = value < 0;
  
  let formattedValue: string;
  if (absValue >= 1000000) {
    formattedValue = `${(absValue / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    formattedValue = `${(absValue / 1000).toFixed(2)}K`;
  } else {
    formattedValue = absValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  return `${symbol} ${isNegative ? '-' : ''}${formattedValue}`;
};

/**
 * Format percentage values with 2 decimal places
 * Used for: Conversion Rate, Churn Rate, Retention Rate, etc.
 */
export const formatPercentageKPI = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '0.00%';
  
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}%`;
};

/**
 * Format percentage change values (MoM) with + or - sign
 * Used for: Month-over-Month changes
 */
export const formatMoMChange = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '0.00%';
  
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}%`;
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use formatNumericKPI instead
 */
export const formatNumber = (num: number) => {
  return formatIntegerKPI(num);
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use formatCurrencyKPI instead
 */
export const formatCurrency = (value: number | null | undefined, currency: string): string => {
  return formatCurrencyKPI(value, currency);
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use formatIntegerKPI instead
 */
export const formatInteger = (value: number | null | undefined): string => {
  return formatIntegerKPI(value);
};
