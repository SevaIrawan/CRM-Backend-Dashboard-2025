/**
 * Daily Average Helper Functions
 * Provides flexible and dynamic daily average calculations for ALL KPIs
 * Including formula logic KPIs that need per-day component calculations first
 */

import { supabase } from './supabase'

// Month name to index mapping
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * KPI Formula Logic Mapping
 * Defines which KPIs need per-day component calculations before applying formula
 */
export const KPI_FORMULA_LOGIC = {
  // Financial KPIs with formula logic
  'Average Transaction Value': {
    formula: 'depositAmount / depositCases',
    components: ['depositAmount', 'depositCases'],
    description: 'Daily ATV = Daily Deposit Amount ÷ Daily Deposit Cases'
  },
  'Customer Lifetime Value': {
    formula: 'avgTransactionValue * purchaseFrequency * avgCustomerLifespan',
    components: ['avgTransactionValue', 'purchaseFrequency', 'avgCustomerLifespan'],
    description: 'Daily CLV = Daily ATV × Daily PF × Daily ACL'
  },
  'GGR Per User': {
    formula: 'netProfit / activeMember',
    components: ['netProfit', 'activeMember'],
    description: 'Daily GGR Per User = Daily Net Profit ÷ Daily Active Member'
  },
  'GGR Per Pure User': {
    formula: 'grossGamingRevenue / pureMember',
    components: ['grossGamingRevenue', 'pureMember'],
    description: 'Daily GGR Per Pure User = Daily GGR ÷ Daily Pure Member'
  },
  
  // Rate KPIs with formula logic
  'Churn Rate': {
    formula: '(churnMember / activeMember) * 100',
    components: ['churnMember', 'activeMember'],
    description: 'Daily Churn Rate = (Daily Churn Member ÷ Daily Active Member) × 100'
  },
  'Retention Rate': {
    formula: '(retentionMember / activeMember) * 100',
    components: ['retentionMember', 'activeMember'],
    description: 'Daily Retention Rate = (Daily Retention Member ÷ Daily Active Member) × 100'
  },
  'Conversion Rate': {
    formula: '(newDepositor / newRegister) * 100',
    components: ['newDepositor', 'newRegister'],
    description: 'Daily Conversion Rate = (Daily New Depositor ÷ Daily New Register) × 100'
  },
  'Winrate': {
    formula: '(winAmount / validBetAmount) * 100',
    components: ['winAmount', 'validBetAmount'],
    description: 'Daily Winrate = (Daily Win Amount ÷ Daily Valid Bet Amount) × 100'
  },
  'Hold Percentage': {
    formula: '(holdAmount / validBetAmount) * 100',
    components: ['holdAmount', 'validBetAmount'],
    description: 'Daily Hold % = (Daily Hold Amount ÷ Daily Valid Bet Amount) × 100'
  },
  
  // Advanced KPIs with formula logic
  'Customer Maturity Index': {
    formula: 'purchaseFrequency * retentionRate',
    components: ['purchaseFrequency', 'retentionRate'],
    description: 'Daily CMI = Daily Purchase Frequency × Daily Retention Rate'
  },
  'Growth Rate': {
    formula: '((currentValue - previousValue) / previousValue) * 100',
    components: ['currentValue', 'previousValue'],
    description: 'Daily Growth Rate = ((Current - Previous) ÷ Previous) × 100'
  }
};

/**
 * Get month index (0-11) from month name
 */
export const getMonthIndex = (monthName: string): number => {
  return MONTH_NAMES.findIndex(name => 
    name.toLowerCase() === monthName.toLowerCase()
  );
};

/**
 * Get month name from month index (0-11)
 */
export const getMonthName = (monthIndex: number): string => {
  return MONTH_NAMES[monthIndex];
};

/**
 * Get total days in a specific month and year
 * Handles leap years automatically
 */
export const getDaysInMonth = (year: string, month: string): number => {
  const monthIndex = getMonthIndex(month);
  if (monthIndex === -1) {
    console.warn(`Invalid month name: ${month}`);
    return 30; // Fallback to 30 days
  }
  
  // Get last day of month (0 = last day of previous month)
  const lastDay = new Date(parseInt(year), monthIndex + 1, 0);
  return lastDay.getDate();
};

/**
 * Check if current month is the selected month
 */
export const isCurrentMonth = (year: string, month: string): boolean => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = getMonthName(currentDate.getMonth());
  
  return year === currentYear && month === currentMonth;
};

/**
 * Get last update date from member_report_daily table
 * This function queries the database to find the latest date available for the selected month
 */
export const getLastUpdateDateFromDatabase = async (year: string, month: string): Promise<number> => {
  try {
    console.log(`🔍 [DailyAverage] Checking last update date for ${month} ${year}...`);
    
    // Query database untuk tanggal terakhir data tersedia
    const { data, error } = await supabase
      .from('member_report_daily')
      .select('date')
      .eq('year', year)
      .eq('month', month)
      .order('date', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('❌ [DailyAverage] Error querying database:', error);
      return getDaysInMonth(year, month); // Fallback to total days
    }
    
    if (data && data.length > 0) {
      // Fix type error: properly type the date field
      const dateValue = data[0]?.date;
      if (dateValue) {
        const lastUpdateDate = new Date(dateValue as string);
        const lastUpdateDay = lastUpdateDate.getDate();
        
        console.log(`✅ [DailyAverage] Last update date found: ${lastUpdateDate.toISOString().split('T')[0]} (day ${lastUpdateDay})`);
        return lastUpdateDay;
      }
    }
    
    console.log(`⚠️ [DailyAverage] No data found for ${month} ${year}, using total days as fallback`);
    return getDaysInMonth(year, month); // Fallback to total days
    
  } catch (error) {
    console.error('❌ [DailyAverage] Error getting last update date:', error);
    return getDaysInMonth(year, month); // Fallback to total days
  }
};

/**
 * Get current month progress (days elapsed so far)
 * For current month: returns last update date from database
 * For past months: returns total days in month
 */
export const getCurrentMonthProgress = async (year: string, month: string): Promise<number> => {
  if (isCurrentMonth(year, month)) {
    console.log(`📅 [DailyAverage] Current month detected: ${month} ${year}, checking database for last update...`);
    // For current month, get last update date from database
    return await getLastUpdateDateFromDatabase(year, month);
  }
  
  // For past months, return total days
  const totalDays = getDaysInMonth(year, month);
  console.log(`📅 [DailyAverage] Past month detected: ${month} ${year}, using total days: ${totalDays}`);
  return totalDays;
};

/**
 * Calculate daily average for KPI with formula logic
 * First calculates per-day components, then applies the formula
 */
export const calculateDailyAverageWithFormula = async (
  kpiName: string,
  monthlyData: any,
  year: string,
  month: string
): Promise<number> => {
  try {
    console.log(`🧮 [DailyAverage] Calculating ${kpiName} with formula logic...`);
    
    // Fix type error: check if kpiName exists in KPI_FORMULA_LOGIC
    if (!(kpiName in KPI_FORMULA_LOGIC)) {
      console.log(`📊 [DailyAverage] ${kpiName} - No formula logic, using direct calculation`);
      return await calculateDailyAverage(monthlyData[kpiName] || 0, year, month);
    }
    
    const formulaLogic = KPI_FORMULA_LOGIC[kpiName as keyof typeof KPI_FORMULA_LOGIC];
    
    // Calculate per-day components first
    const dailyComponents: { [key: string]: number } = {};
    
    for (const component of formulaLogic.components) {
      if (monthlyData[component] !== undefined) {
        dailyComponents[component] = await calculateDailyAverage(monthlyData[component], year, month);
        console.log(`📊 [DailyAverage] ${component}: ${monthlyData[component]} ÷ ${await getCurrentMonthProgress(year, month)} = ${dailyComponents[component]}`);
      } else {
        console.warn(`⚠️ [DailyAverage] Component ${component} not found in monthly data`);
        dailyComponents[component] = 0;
      }
    }
    
    // Apply formula logic
    let result: number;
    
    switch (kpiName) {
      case 'Average Transaction Value':
        result = dailyComponents.depositAmount / dailyComponents.depositCases;
        break;
        
      case 'Customer Lifetime Value':
        result = dailyComponents.avgTransactionValue * dailyComponents.purchaseFrequency * dailyComponents.avgCustomerLifespan;
        break;
        
      case 'GGR Per User':
        result = dailyComponents.netProfit / dailyComponents.activeMember;
        break;
        
      case 'GGR Per Pure User':
        result = dailyComponents.grossGamingRevenue / dailyComponents.pureMember;
        break;
        
      case 'Churn Rate':
        result = (dailyComponents.churnMember / dailyComponents.activeMember) * 100;
        break;
        
      case 'Retention Rate':
        result = (dailyComponents.retentionMember / dailyComponents.activeMember) * 100;
        break;
        
      case 'Conversion Rate':
        result = (dailyComponents.newDepositor / dailyComponents.newRegister) * 100;
        break;
        
      case 'Winrate':
        result = (dailyComponents.winAmount / dailyComponents.validBetAmount) * 100;
        break;
        
      case 'Hold Percentage':
        result = (dailyComponents.holdAmount / dailyComponents.validBetAmount) * 100;
        break;
        
      case 'Customer Maturity Index':
        result = dailyComponents.purchaseFrequency * dailyComponents.retentionRate;
        break;
        
      default:
        console.warn(`⚠️ [DailyAverage] Formula logic not implemented for ${kpiName}`);
        return await calculateDailyAverage(monthlyData[kpiName] || 0, year, month);
    }
    
    console.log(`✅ [DailyAverage] ${kpiName} calculated: ${formulaLogic.description} = ${result.toFixed(2)}`);
    return result;
    
  } catch (error) {
    console.error(`❌ [DailyAverage] Error calculating ${kpiName} with formula:`, error);
    // Fallback to direct calculation
    return await calculateDailyAverage(monthlyData[kpiName] || 0, year, month);
  }
};

/**
 * Calculate daily average with dynamic day detection
 * Automatically handles current month progress vs completed months
 * Now uses async function to get real-time data from database
 */
export const calculateDailyAverage = async (
  monthlyValue: number, 
  year: string, 
  month: string
): Promise<number> => {
  const activeDays = await getCurrentMonthProgress(year, month);
  
  if (activeDays === 0) {
    console.warn(`⚠️ [DailyAverage] No active days found for ${month} ${year}`);
    return monthlyValue; // Return monthly value as fallback
  }
  
  const dailyAverage = monthlyValue / activeDays;
  console.log(`📊 [DailyAverage] Daily Average calculated: ${monthlyValue} ÷ ${activeDays} = ${dailyAverage.toFixed(2)}`);
  
  return dailyAverage;
};

/**
 * Calculate daily average for ALL KPIs
 * Automatically detects if KPI needs formula logic or direct calculation
 */
export const calculateAllKPIsDailyAverage = async (
  monthlyData: any,
  year: string,
  month: string
): Promise<{ [key: string]: number }> => {
  try {
    console.log(`🔄 [DailyAverage] Calculating Daily Average for ALL KPIs...`);
    
    const dailyAverages: { [key: string]: number } = {};
    const kpiNames = Object.keys(monthlyData);
    
    for (const kpiName of kpiNames) {
      try {
        if (kpiName in KPI_FORMULA_LOGIC) {
          // KPI with formula logic
          dailyAverages[kpiName] = await calculateDailyAverageWithFormula(kpiName, monthlyData, year, month);
        } else {
          // Regular KPI - direct calculation
          dailyAverages[kpiName] = await calculateDailyAverage(monthlyData[kpiName], year, month);
        }
      } catch (error) {
        console.error(`❌ [DailyAverage] Error calculating ${kpiName}:`, error);
        dailyAverages[kpiName] = 0; // Set to 0 if error
      }
    }
    
    console.log(`✅ [DailyAverage] All KPIs Daily Average calculated:`, dailyAverages);
    return dailyAverages;
    
  } catch (error) {
    console.error('❌ [DailyAverage] Error calculating all KPIs:', error);
    return {};
  }
};

/**
 * Format daily average with appropriate precision
 * Currency values: 2 decimal places
 * Count values: 0 decimal places  
 * Percentage values: 2 decimal places
 */
export const formatDailyAverage = (
  value: number,
  type: 'currency' | 'count' | 'percentage' = 'currency'
): string => {
  switch (type) {
    case 'currency':
      return value.toFixed(2);
    case 'count':
      return Math.round(value).toString();
    case 'percentage':
      return value.toFixed(2);
    default:
      return value.toFixed(2);
  }
};

/**
 * Get detailed info about month for debugging
 * Now includes async database check for current month
 */
export const getMonthInfo = async (year: string, month: string) => {
  const totalDays = getDaysInMonth(year, month);
  const activeDays = await getCurrentMonthProgress(year, month);
  const isCurrent = isCurrentMonth(year, month);
  
  return {
    year,
    month,
    totalDays,
    activeDays,
    isCurrentMonth: isCurrent,
    isLeapYear: totalDays === 29 && month === 'February',
    dataSource: isCurrent ? 'Database (Last Update)' : 'Calendar (Total Days)'
  };
};

/**
 * Sync function version for backward compatibility
 * Use this when you can't use async/await
 */
export const calculateDailyAverageSync = (
  monthlyValue: number, 
  year: string, 
  month: string,
  fallbackDays?: number
): number => {
  if (isCurrentMonth(year, month)) {
    // For current month, use fallback days if provided, otherwise use total days
    const activeDays = fallbackDays || getDaysInMonth(year, month);
    return monthlyValue / activeDays;
  }
  
  // For past months, use total days
  const totalDays = getDaysInMonth(year, month);
  return monthlyValue / totalDays;
};

/**
 * CENTRAL FUNCTION: Get ALL KPIs with Daily Average
 * Sama seperti getAllKPIsWithMoM di KPILogic.tsx
 * Otomatis handle semua jenis KPI (biasa + formula)
 */
export async function getAllKPIsWithDailyAverage(
  monthlyData: any,
  year: string,
  month: string
): Promise<{
  current: { [key: string]: number },
  dailyAverage: { [key: string]: number }
}> {
  try {
    console.log('🔄 [Central] Calculating Daily Average for ALL KPIs...');
    
    // Calculate daily averages for ALL KPIs
    const allDailyAverages = await calculateAllKPIsDailyAverage(monthlyData, year, month);
    
    console.log('✅ [Central] All KPIs Daily Average calculated:', allDailyAverages);
    
    return {
      current: monthlyData,
      dailyAverage: allDailyAverages
    };
    
  } catch (error) {
    console.error('❌ [Central] Error calculating Daily Average for all KPIs:', error);
    throw error;
  }
}

/**
 * CENTRAL FUNCTION: Get Daily Average for specific KPI
 * Sama seperti formatMoM di KPILogic.tsx
 */
export async function getDailyAverageForKPI(
  kpiName: string,
  monthlyValue: number,
  year: string,
  month: string
): Promise<number> {
  try {
    // Check if KPI has formula logic
    if (kpiName in KPI_FORMULA_LOGIC) {
      return await calculateDailyAverageWithFormula(kpiName, { [kpiName]: monthlyValue }, year, month);
    } else {
      return await calculateDailyAverage(monthlyValue, year, month);
    }
  } catch (error) {
    console.error(`❌ [Central] Error calculating Daily Average for ${kpiName}:`, error);
    return 0;
  }
}

/**
 * CENTRAL FUNCTION: Format Daily Average value
 * Sama seperti formatMoM di KPILogic.tsx
 */
export function formatDailyAverageValue(
  value: number,
  type: 'currency' | 'count' | 'percentage' = 'count'
): string {
  try {
    switch (type) {
      case 'currency':
        return `RM ${new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value)}`;
        
      case 'percentage':
        return `${value.toFixed(2)}%`;
        
      case 'count':
      default:
        return new Intl.NumberFormat('en-US').format(Math.round(value));
    }
  } catch (error) {
    console.error('❌ [Central] Error formatting Daily Average value:', error);
    return '0';
  }
}
