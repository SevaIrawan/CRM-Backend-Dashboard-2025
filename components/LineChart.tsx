import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getChartIcon } from '../lib/CentralIcon';
import { formatNumericKPI, formatIntegerKPI, formatCurrencyKPI, formatPercentageKPI } from '../lib/formatHelpers';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

interface Series {
  name: string;
  data: number[];
  color?: string; // Add color property for individual series
}

interface LineChartProps {
  series: Series[];
  categories: string[];
  title?: string;
  currency?: string;
  chartIcon?: string;
  hideLegend?: boolean;
  color?: string; // Add color prop for customizable line and area color (used for single series)
  showDataLabels?: boolean; // Add prop for showing data labels
  customLegend?: Array<{ label: string; color: string }>; // Add custom legend support
  useDenominationLabels?: boolean; // Use K, M denomination for data labels (for Brand Performance Trends only)
  forceSingleYAxis?: boolean; // Force single Y-axis even with multiple series (for forecast chart)
  peakHourData?: Array<{
    period: string;
    peakHour: string;
    maxTotalTransactions: number;
    automationTransactions: number;
    avgProcessingTimeAutomation: number;
  }>; // Add peak hour data for detailed tooltip
}

export default function LineChart({ 
  series, 
  categories, 
  title, 
  currency = 'MYR',
  chartIcon,
  hideLegend = false,
  color = '#3B82F6', // Default blue color
  showDataLabels = false, // Default false
  customLegend,
  useDenominationLabels = false, // Default false - only true for Brand Performance Trends
  forceSingleYAxis = false, // Default false - set to true for forecast chart
  peakHourData // Peak hour data for detailed tooltip
}: LineChartProps) {
  
  console.log('📈 [LineChart] Rendering chart:', {
    title,
    seriesCount: series?.length || 0,
    categoriesCount: categories?.length || 0,
    series: series,
    categories: categories
  })
  
  // Debug for percentage charts
  if (title && (title.includes('PERCENTAGE') || title.includes('CONVERSION'))) {
    console.log('🔍 [LineChart] Percentage Chart Debug:', {
      title,
      currency,
      seriesData: series?.map(s => ({ name: s.name, data: s.data }))
    })
  }

  // Helper function to format values with denomination (K, M) for Brand Performance Trends
  const formatWithDenomination = (value: number): string => {
    const isNegative = value < 0
    const absValue = Math.abs(value)
    
    let formatted: string
    if (absValue >= 1000000) {
      formatted = `${(absValue / 1000000).toFixed(2)}M`
    } else if (absValue >= 1000) {
      formatted = `${(absValue / 1000).toFixed(2)}K`
    } else {
      formatted = absValue.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })
    }
    return isNegative ? `-${formatted}` : formatted
  }

  // Error handling for empty data
  if (!series || series.length === 0 || !categories || categories.length === 0) {
    console.error('❌ [LineChart] Invalid data:', { series, categories })
    return (
      <div style={{ 
        height: '240px', 
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

  // Validate data structure
  const hasValidData = series.every(s => s.data && Array.isArray(s.data) && s.data.length > 0)
  if (!hasValidData) {
    console.error('❌ [LineChart] Invalid series data structure:', series)
    return (
      <div style={{ 
        height: '240px', 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        border: '1px solid #d1d5db',
        borderRadius: '8px'
      }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Invalid chart data structure</p>
      </div>
    )
  }
  
  const getCurrencySymbol = (curr: string): string => {
    switch (curr) {
      case 'MYR': return 'RM';
      case 'SGD': return 'SGD';
      case 'USC': return 'USD';
      case 'MEMBER': return '';
      case 'CASES': return '';
      default: return 'RM';
    }
  };

  const formatValue = (value: number, datasetLabel?: string): string => {
    // Check if this is a percentage type (Retention Rate, Churn Rate, Hold Percentage, Conversion Rate)
    const isPercentageType = datasetLabel && (
      datasetLabel.toLowerCase().includes('rate') ||
      datasetLabel.toLowerCase().includes('retention') ||
      datasetLabel.toLowerCase().includes('churn') ||
      datasetLabel.toLowerCase().includes('percentage') ||
      datasetLabel.toLowerCase().includes('conversion')
    );
    
    // DEBUG: Log percentage detection
    if (datasetLabel && datasetLabel.toLowerCase().includes('percentage')) {
      console.log('🔍 [LineChart] Percentage detected:', { datasetLabel, value, isPercentageType });
    }
    
    // Check if this is a frequency/ratio type (Purchase Frequency)
    const isFrequencyType = datasetLabel && (
      datasetLabel.toLowerCase().includes('frequency') ||
      datasetLabel.toLowerCase().includes('ratio')
    );
    
         // Check if this is a count/integer type (Members, Depositor count, etc.)
     const isCountType = currency === 'MEMBER' || currency === 'CASES' || (
       datasetLabel && (
         datasetLabel.toLowerCase().includes('member') ||
         datasetLabel.toLowerCase().includes('unique') ||
         datasetLabel.toLowerCase().includes('pure') ||
         datasetLabel.toLowerCase().includes('count') ||
         datasetLabel.toLowerCase().includes('depositor')
       )
     );
    
    // Check if this is CLV (Customer Lifetime Value)
    const isCLVType = datasetLabel && (
      datasetLabel.toLowerCase().includes('lifetime') ||
      datasetLabel.toLowerCase().includes('clv') ||
      datasetLabel.toLowerCase().includes('customer lifetime value')
    );
    
         // Check if this is GGR related (GGR User, GGR Pure User, GGR Per User, etc.)
     const isGGRType = datasetLabel && (
       datasetLabel.toLowerCase().includes('ggr') ||
       datasetLabel.toLowerCase().includes('gross gaming revenue') ||
       datasetLabel.toLowerCase().includes('per user') ||
       datasetLabel.toLowerCase().includes('pure user') ||
       datasetLabel.toLowerCase().includes('da user') // Add DA User for currency format
     );
    
    // Check if this is Customer Value Per Headcount or Customer Count vs Headcount
    const isCustomerValuePerHeadcount = datasetLabel && (
      datasetLabel.toLowerCase().includes('customer value per headcount') ||
      datasetLabel.toLowerCase().includes('active member') ||
      datasetLabel.toLowerCase().includes('headcount')
    );
    
    if (isPercentageType) {
      // For percentage - show % symbol with 2 decimal places
      return value.toFixed(2) + '%';
         } else if (isFrequencyType) {
       // For frequency - show as decimal number only (NO decimal places for Y-axis)
       return Math.round(value).toString();
              } else if (isGGRType) {
        // For GGR - show with currency symbol and NO decimal places (Y-axis)
        const symbol = getCurrencySymbol(currency);
        if (value >= 1000000) {
          return `${symbol} ${Math.round(value / 1000000)}M`;
        } else if (value >= 1000) {
          return `${symbol} ${Math.round(value / 1000)}K`;
        }
        return `${symbol} ${Math.round(value)}`;
    } else if (isCustomerValuePerHeadcount) {
      // For Customer Value Per Headcount and Customer Count vs Headcount - round up to nearest integer
      if (value >= 1000000) {
        return Math.ceil(value / 1000000) + 'M';
      } else if (value >= 1000) {
        return Math.ceil(value / 1000) + 'K';
      }
      return Math.ceil(value).toLocaleString();
    } else if (isCountType) {
      // For count/integer - no currency symbol, show all digits
      return value.toLocaleString();
    } else if (isCLVType) {
      // For CLV - show full number without decimals
      if (value >= 1000000) {
        return Math.round(value / 1000000) + 'M';
      } else if (value >= 1000) {
        return Math.round(value).toLocaleString(); // Show full number for thousands, no decimals
      } else {
        return Math.round(value).toString(); // No decimals for CLV
      }
    } else {
      // For other amounts - show as integer only (no currency)
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(0) + 'K';
      }
      return Math.round(value).toLocaleString();
    }
  };

  // Full value formatter for tooltip using standard KPI format
  const formatFullValue = (value: number, datasetLabel?: string): string => {
    // Check if this is a percentage type (Retention Rate, Churn Rate, Winrate, Hold Percentage, Conversion Rate)
    const isPercentageType = datasetLabel && (
      datasetLabel.toLowerCase().includes('rate') ||
      datasetLabel.toLowerCase().includes('retention') ||
      datasetLabel.toLowerCase().includes('churn') ||
      datasetLabel.toLowerCase().includes('winrate') ||
      datasetLabel.toLowerCase().includes('win rate') ||
      datasetLabel.toLowerCase().includes('percentage') ||
      datasetLabel.toLowerCase().includes('conversion')
    );
    
    // Check if this is a frequency/ratio/average type (Purchase Frequency, ACL)
    const isFrequencyType = datasetLabel && (
      datasetLabel.toLowerCase().includes('frequency') ||
      datasetLabel.toLowerCase().includes('ratio') ||
      datasetLabel.toLowerCase().includes('lifespan') // ACL adalah average
    );
    
    // Check if this is a formula/numeric type (GGR User, DA User, ATV, etc.)
    const isFormulaNumericType = datasetLabel && (
      datasetLabel.toLowerCase().includes('ggr user') ||
      datasetLabel.toLowerCase().includes('da user') ||
      datasetLabel.toLowerCase().includes('atv') ||
      datasetLabel.toLowerCase().includes('average transaction value') ||
      datasetLabel.toLowerCase().includes('net profit') ||
      datasetLabel.toLowerCase().includes('deposit amount')
    );
    
    // Check if this is a count/integer type (New Depositor, Active Member, etc.)
    const isCountType = currency === 'MEMBER' || currency === 'CASES' || (
      datasetLabel && (
        (datasetLabel.toLowerCase().includes('member') && !datasetLabel.toLowerCase().includes('user')) ||
        datasetLabel.toLowerCase().includes('unique') ||
        datasetLabel.toLowerCase().includes('pure') ||
        datasetLabel.toLowerCase().includes('count') ||
        datasetLabel.toLowerCase().includes('depositor') ||
        datasetLabel.toLowerCase().includes('headcount') ||
        datasetLabel.toLowerCase().includes('cases')
      ) && !datasetLabel.toLowerCase().includes('lifespan') && !isFormulaNumericType // EXCLUDE ACL dan formula numeric types
    );
    
    // Check if this is an amount/currency type (Deposit, Withdraw, Revenue, CLV, etc.)
    const isAmountType = datasetLabel && (
      datasetLabel.toLowerCase().includes('amount') ||
      datasetLabel.toLowerCase().includes('deposit') ||
      datasetLabel.toLowerCase().includes('withdraw') ||
      datasetLabel.toLowerCase().includes('revenue') ||
      datasetLabel.toLowerCase().includes('ggr') ||
      datasetLabel.toLowerCase().includes('gaming') ||
      datasetLabel.toLowerCase().includes('lifetime') ||
      datasetLabel.toLowerCase().includes('clv') ||
      datasetLabel.toLowerCase().includes('value') ||
      datasetLabel.toLowerCase().includes('transaction') ||
      datasetLabel.toLowerCase().includes('income') ||
      datasetLabel.toLowerCase().includes('cost') ||
      datasetLabel.toLowerCase().includes('profit') ||
      datasetLabel.toLowerCase().includes('gross gaming revenue') ||
      datasetLabel.toLowerCase().includes('per user') ||
      datasetLabel.toLowerCase().includes('pure user') ||
      datasetLabel.toLowerCase().includes('user') // Add user back for GGR User, DA User
    );
    
    // Check if this is Customer Maturity Index (special case - no currency, no decimal)
    const isMaturityIndex = datasetLabel && (
      datasetLabel.toLowerCase().includes('maturity') ||
      datasetLabel.toLowerCase().includes('index')
    );
    
    if (isPercentageType) {
      // For percentage - using standard format: 0,000.00%
      return formatPercentageKPI(value);
    } else if (isFrequencyType) {
      // For frequency - using standard format: 0,000.00
      return formatNumericKPI(value);
    } else if (isFormulaNumericType) {
      // For formula/numeric types (ATV, GGR User, DA User, etc.) - using standard format: RM 0,000.00
      return formatCurrencyKPI(value, currency);
    } else if (isCountType) {
      // For count/integer - using standard format: 0,000 (no currency symbol)
      if (currency === 'MEMBER') {
        return formatIntegerKPI(value) + ' members';
      } else if (currency === 'CASES') {
        return formatIntegerKPI(value) + ' cases';
      }
      return formatIntegerKPI(value) + ' persons';
    } else if (isMaturityIndex) {
      // For maturity index - using standard format: 0,000.00%
      return formatPercentageKPI(value);
    } else if (isAmountType) {
      // For amount/currency - using standard format: RM 0,000.00
      return formatCurrencyKPI(value, currency);
    } else {
      // Default - using standard format: 0,000
      return formatIntegerKPI(value);
    }
  };

  // Determine if dual Y-axis is needed
  // - If forceSingleYAxis = true, always use single Y-axis (for forecast chart)
  // - Otherwise, use dual Y-axis for charts with 2+ series
  const needsDualYAxis = !forceSingleYAxis && series.length > 1;

  const data = {
    labels: categories,
    datasets: series.map((item, index) => {
      // Use series-specific color if provided, otherwise use default colors
      const lineColor = item.color || (index === 0 ? color : '#F97316'); // Use series color, or fallback to defaults
      
      // ✅ STANDARD: Semi-transparent background with gradient effect for all charts
      const bgColor = `${lineColor}20`; // Add transparency to line color (hex with alpha)
      
      return {
        label: item.name,
        data: item.data,
        borderColor: lineColor,
        backgroundColor: bgColor,
        borderWidth: 3,
        pointBackgroundColor: lineColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.4,
        // For dual Y-axis, assign yAxisID
        yAxisID: needsDualYAxis ? (index === 0 ? 'y' : 'y1') : 'y'
      }
    })
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    layout: {
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
      }
    },
         plugins: {
       legend: {
         display: false, // ALWAYS disable Chart.js legend - only use custom JSX legend
       },
       datalabels: {
         display: showDataLabels,
         color: '#374151',
         font: {
           weight: 'bold' as const,
           size: 10
         },
         anchor: function(context: any) {
           // First dataset: anchor at end (top of line)
           // Second dataset: anchor at start (bottom of line)
           return context.datasetIndex === 0 ? 'end' : 'start';
         },
         align: function(context: any) {
           // First dataset: align top
           // Second dataset: align bottom
           return context.datasetIndex === 0 ? 'top' : 'bottom';
         },
         offset: function(context: any) {
           // Different offset for each dataset to prevent overlapping
           // First dataset (index 0): offset up
           // Second dataset (index 1): offset down
           return context.datasetIndex === 0 ? 8 : -8;
         },
         formatter: function(value: number, context: any) {
           const datasetLabel = context.dataset.label;
           
           // Special case for "Automation Trans" - use "c" suffix for data labels
           if (datasetLabel && datasetLabel.toLowerCase().includes('automation trans')) {
             return formatIntegerKPI(value) + 'c';
           }
           
           // For rate/percentage charts (coverage rate), use % suffix with 2 decimal
           if (datasetLabel && (
             datasetLabel.toLowerCase().includes('rate') ||
             datasetLabel.toLowerCase().includes('coverage') ||
             datasetLabel.toLowerCase().includes('percentage') ||
             datasetLabel.toLowerCase().includes('conversion')
           )) {
             return value.toFixed(2) + '%';
           }
           
           // For time-related charts (processing time), use (s) suffix
           if (datasetLabel && (
             datasetLabel.toLowerCase().includes('processing time') ||
             datasetLabel.toLowerCase().includes('time')
           )) {
             return value.toFixed(1) + 's';
           }
           
          // For overdue transactions, use "c" suffix for labels (to avoid overlap)
          if (datasetLabel && (
            datasetLabel.toLowerCase().includes('overdue') ||
            datasetLabel.toLowerCase().includes('transactions')
          )) {
            return formatIntegerKPI(value) + 'c';
           }
           
          // For cases type, use "c" suffix
          if (datasetLabel && datasetLabel.toLowerCase().includes('cases')) {
            return formatIntegerKPI(value) + 'c';
          }
          
          // For purchase frequency, use 2 decimal places without unit
          if (datasetLabel && datasetLabel.toLowerCase().includes('purchase frequency')) {
            return value.toFixed(2);
          }
          
          // For member type, do not use "Member" suffix
          if (datasetLabel && (
            datasetLabel.toLowerCase().includes('active member') ||
            datasetLabel.toLowerCase().includes('member')
          )) {
            return formatIntegerKPI(value);
          }
          
          // ✅ For currency/amount types, ALWAYS use DENOMINATION (K, M) for data labels
          // Reason: Full currency format too long for labels (e.g., "RM 7,500,000.00")
          if (datasetLabel && (
            datasetLabel.toLowerCase().includes('amount') ||
            datasetLabel.toLowerCase().includes('deposit') ||
            datasetLabel.toLowerCase().includes('withdraw') ||
            datasetLabel.toLowerCase().includes('revenue') ||
            datasetLabel.toLowerCase().includes('ggr') ||
            datasetLabel.toLowerCase().includes('profit') ||
            datasetLabel.toLowerCase().includes('user') ||
            datasetLabel.toLowerCase().includes('atv') ||
            datasetLabel.toLowerCase().includes('value')
          )) {
            // ✅ ALWAYS use denomination format for DATA LABELS (not tooltip)
            return formatWithDenomination(value);
          }
           
           // Default formatting
           return formatIntegerKPI(value);
         }
       },
       // Custom plugin untuk background Y1 dan Y2
       customBackgroundPlugin: {
         id: 'customBackground',
         beforeDraw: (chart: any) => {
           const { ctx, chartArea, scales } = chart;
           if (!chartArea) return;
           
           // Background untuk Y1 (Blue muda) - area kanan
           if (scales.y1) {
             ctx.save();
             ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // Blue muda
             ctx.fillRect(
               chartArea.right - 100, // Area untuk Y1
               chartArea.top,
               100,
               chartArea.height
             );
             ctx.restore();
           }
           
           // Background untuk Y (Orange muda) - area kiri
           if (scales.y) {
             ctx.save();
             ctx.fillStyle = 'rgba(249, 115, 22, 0.1)'; // Orange muda
             ctx.fillRect(
               chartArea.left, // Area untuk Y
               100,
               chartArea.height
             );
             ctx.restore();
           }
         }
       },
       tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3B82F6',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: function(context: any) {
            return `📅 ${context[0].label}`;
          },
          label: function(context: any) {
            const value = context.parsed.y;
            const datasetLabel = context.dataset.label;
            const dataIndex = context.dataIndex;
            
            // Special tooltip for PEAK HOUR chart
            if (title && title.toLowerCase().includes('peak hour') && peakHourData && peakHourData[dataIndex]) {
              const peakData = peakHourData[dataIndex];
              
              // For first series (Automation Trans), show detailed peak hour info
              if (context.datasetIndex === 0) {
                return [
                  `Peak Hour: ${peakData.peakHour}`,
                  `Total Transaction Peak: ${formatIntegerKPI(peakData.maxTotalTransactions)}`,
                  `Automation Handle: ${formatIntegerKPI(value)} cases`
                ];
              }
              // For second series, show ONLY the actual chart value to match visual
              else {
                return `AVG Proc Time Automation: ${value.toFixed(1)}s`;
              }
            }
            
            // If we reach here, it's not a peak hour chart, continue with normal logic
            
            // Special case for "Automation Trans" - use "cases" suffix
            if (datasetLabel && datasetLabel.toLowerCase().includes('automation trans')) {
              return `  ${datasetLabel}: ${formatIntegerKPI(value)} cases`;
            }
            
            // For time-related charts (processing time), use (s) suffix
            if (datasetLabel && (
              datasetLabel.toLowerCase().includes('processing time') ||
              datasetLabel.toLowerCase().includes('time')
            )) {
              return `  ${datasetLabel}: ${value.toFixed(1)}s`;
            }
            
            // For overdue transactions, use "cases" suffix
            if (datasetLabel && (
              datasetLabel.toLowerCase().includes('overdue') ||
              datasetLabel.toLowerCase().includes('transactions')
            )) {
              return `  ${datasetLabel}: ${formatIntegerKPI(value)} cases`;
            }
            
            if (datasetLabel && datasetLabel.toLowerCase().includes('rate')) {
              return `  ${datasetLabel}: ${formatPercentageKPI(value)}`;
            }
            
            return `  ${datasetLabel}: ${formatFullValue(value, datasetLabel)}`;
          }
        }
      }
    },
         scales: {
       x: {
         grid: {
           display: true,
           color: 'rgba(229, 231, 235, 0.5)', // ✅ IMPROVED: Softer grid lines
           lineWidth: 1,
           drawBorder: false
         },
         ticks: {
           padding: 8,
           font: {
             weight: 'bold' as const,
             size: 10
           },
           color: '#6b7280' // ✅ IMPROVED: Better text color
         }
      },
             y: {
         type: 'linear' as const,
         display: true,
         position: 'left' as const,
         beginAtZero: false,
         // ✅ IMPROVED: Dynamic scaling based on data maximum
         suggestedMax: (() => {
           const allValues = series.flatMap(s => s.data);
           const maxValue = Math.max(...allValues);
           // Add 20% padding above maximum value for better visualization
           return maxValue * 1.2;
         })(),
         grid: {
           display: true,
           color: 'rgba(229, 231, 235, 0.3)', // ✅ IMPROVED: Even softer grid lines
           lineWidth: 1,
           drawBorder: false
         },
                ticks: {
          padding: 20,
          maxTicksLimit: 6, // ✅ STANDARD: Maximum 6 ticks to prevent duplicates
          font: {
            weight: 'bold' as const,
            size: 10
          },
                        callback: function(tickValue: string | number) {
               const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
               // Check series name for percentage
               const firstSeries = series && series[0];
               if (firstSeries && firstSeries.name && firstSeries.name.toLowerCase().includes('rate')) {
                 return value + '%';
               }
               
               // Check if this is Customer Maturity Index (special case - show as percentage)
               const isMaturityIndex = firstSeries && firstSeries.name && (
                 firstSeries.name.toLowerCase().includes('maturity') ||
                 firstSeries.name.toLowerCase().includes('index')
               );
               
               if (isMaturityIndex) {
                 // For CMI - show as percentage with 2 decimal places
                 return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
               }
               
               // Check if this is CLV chart
               const isCLVChart = firstSeries && firstSeries.name && (
                 firstSeries.name.toLowerCase().includes('lifetime') ||
                 firstSeries.name.toLowerCase().includes('clv') ||
                 firstSeries.name.toLowerCase().includes('customer lifetime value')
               );
               
               if (isCLVChart) {
                 // For CLV - use special formatting
                 return formatValue(value, firstSeries?.name);
               }
               
               // For other values - formatted numbers
               return formatValue(value, firstSeries?.name);
             }
         },
                 // Remove legend title from Y-axis since we have it in header
         title: {
           display: false
         }
      },
      // Add second Y-axis if needed
      ...(needsDualYAxis && {
                 y1: {
           type: 'linear' as const,
           display: true,
           position: 'right' as const,
           beginAtZero: false,
           // ✅ IMPROVED: Dynamic scaling based on second series data maximum
           suggestedMax: (() => {
             if (series.length > 1) {
               const secondSeriesValues = series[1].data;
               const maxValue = Math.max(...secondSeriesValues);
               // Add 20% padding above maximum value for better visualization
               return maxValue * 1.2;
             }
             return undefined;
           })(),
           grid: {
             drawOnChartArea: false,
             display: true,
             color: '#e5e7eb',
             lineWidth: 1
           },
                    ticks: {
            padding: 20,
            maxTicksLimit: 6, // ✅ STANDARD: Maximum 6 ticks to prevent duplicates
            font: {
              weight: 'bold' as const,
              size: 10
            },
             callback: function(tickValue: string | number) {
               const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
               // Check second series name for percentage
               const secondSeries = series && series[1];
               if (secondSeries && secondSeries.name && secondSeries.name.toLowerCase().includes('rate')) {
                 return value + '%';
               }
               
               // Check if this is Customer Maturity Index (second series - special case - show as percentage)
               const isMaturityIndex = secondSeries && secondSeries.name && (
                 secondSeries.name.toLowerCase().includes('maturity') ||
                 secondSeries.name.toLowerCase().includes('index')
               );
               
               if (isMaturityIndex) {
                 // For CMI - show as percentage with 2 decimal places
                 return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
               }
               
               // Check if this is CLV chart (second series)
               const isCLVChart = secondSeries && secondSeries.name && (
                 secondSeries.name.toLowerCase().includes('lifetime') ||
                 secondSeries.name.toLowerCase().includes('clv') ||
                 secondSeries.name.toLowerCase().includes('customer lifetime value')
               );
               
               if (isCLVChart) {
                 // For CLV - use special formatting
                 return formatValue(value, secondSeries?.name);
               }
               
               // For other values - formatted numbers
               return formatValue(value, secondSeries?.name);
             }
           },
                     // Remove legend title from Y-axis since we have it in header
           title: {
             display: false
           }
        }
      })
    }
  };

  console.log('📊 [LineChart] Chart data prepared:', {
    title,
    labels: data.labels,
    datasets: data.datasets.map(d => ({ 
      label: d.label, 
      dataLength: d.data.length,
      borderColor: d.borderColor,
      backgroundColor: d.backgroundColor
    })),
    needsDualYAxis,
    seriesColors: series.map((item, index) => {
      const lineColor = item.color || (index === 0 ? color : '#F97316');
      return {
        name: item.name,
        index,
        lineColor: lineColor,
        legendColor: lineColor
      };
    })
  })

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
      {/* Chart Title with Icon and Legend */}
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
              fontWeight: 700,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              lineHeight: '1.2'
            }}>
              {title}
            </h3>
          </div>
          
          {/* Legend */}
          {!hideLegend && series.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {(customLegend || series).map((item, index) => {
                const isCustomLegend = !!customLegend;
                const label = isCustomLegend ? (customLegend![index] as any).label : (item as any).name;
                const seriesItem = series[index];
                const legendColor = isCustomLegend 
                  ? (customLegend![index] as any).color 
                  : (seriesItem?.color || (index === 0 ? '#3B82F6' : '#F97316'));
                
                return (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '3px',
                      backgroundColor: legendColor,
                      borderRadius: '2px'
                    }} />
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
             {/* Chart Area */}
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
                <Line 
                  data={data} 
                   options={options}
                />
              </div>
            )
          } catch (error) {
            console.error('❌ [LineChart] Chart.js error:', error)
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