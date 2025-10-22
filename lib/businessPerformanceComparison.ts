/**
 * BUSINESS PERFORMANCE COMPARISON HELPER
 * 
 * Handles 3 comparison modes:
 * 1. DATE_TO_DATE: Partial/incomplete periods (Oct 1-20 vs Sept 1-20)
 * 2. MONTH_TO_MONTH: Complete months (Sept 1-30 vs Aug 1-31)
 * 3. QUARTER_TO_QUARTER: Complete quarters (Q3 vs Q2)
 * 
 * Used by: Business Performance Page (MYR/SGD/USC)
 */

export type ComparisonMode = 'DATE_TO_DATE' | 'MONTH_TO_MONTH' | 'QUARTER_TO_QUARTER'

export interface PreviousPeriod {
  prevStartDate: string
  prevEndDate: string
  comparisonMode: ComparisonMode
}

/**
 * Check if a month is complete
 * 
 * A month is complete if:
 * - endDate is the last day of the month
 * - The month is in the past (not current month)
 */
export function isCompleteMonth(
  startDate: string,
  endDate: string,
  maxDateInData: string
): boolean {
  const end = new Date(endDate)
  const maxData = new Date(maxDateInData)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Check if endDate is last day of month
  const lastDayOfMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0)
  const isLastDay = end.getDate() === lastDayOfMonth.getDate()
  
  // Check if it's a past month (not current month)
  const isPastMonth = end.getMonth() < today.getMonth() || end.getFullYear() < today.getFullYear()
  
  // Check if startDate is first day of month
  const isFirstDay = new Date(startDate).getDate() === 1
  
  return isLastDay && isPastMonth && isFirstDay
}

/**
 * Check if a quarter is complete
 * 
 * A quarter is complete if:
 * - All 3 months of the quarter have data
 * - The quarter is in the past
 */
export function isQuarterComplete(
  quarter: string,
  year: number,
  maxDateInData: string
): boolean {
  const maxData = new Date(maxDateInData)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Get last day of quarter
  const quarterEndDates: Record<string, { month: number; day: number }> = {
    'Q1': { month: 2, day: 31 }, // March 31
    'Q2': { month: 5, day: 30 }, // June 30
    'Q3': { month: 8, day: 30 }, // September 30
    'Q4': { month: 11, day: 31 } // December 31
  }
  
  const endInfo = quarterEndDates[quarter]
  if (!endInfo) return false
  
  const quarterEndDate = new Date(year, endInfo.month, endInfo.day)
  
  // Quarter is complete if:
  // 1. Quarter end date is in the past
  // 2. maxDateInData is at least at quarter end date
  return quarterEndDate < today && maxData >= quarterEndDate
}

/**
 * Get previous quarter
 */
export function getPreviousQuarter(quarter: string, year: number): { quarter: string; year: number } {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  const currentIndex = quarters.indexOf(quarter)
  
  if (currentIndex === 0) {
    // Q1 → Q4 previous year
    return { quarter: 'Q4', year: year - 1 }
  } else {
    return { quarter: quarters[currentIndex - 1], year }
  }
}

/**
 * Get date range for a quarter
 */
export function getQuarterDateRange(quarter: string, year: number): { startDate: string; endDate: string } {
  const quarterRanges: Record<string, { startMonth: number; endMonth: number; endDay: number }> = {
    'Q1': { startMonth: 0, endMonth: 2, endDay: 31 }, // Jan-Mar
    'Q2': { startMonth: 3, endMonth: 5, endDay: 30 }, // Apr-Jun
    'Q3': { startMonth: 6, endMonth: 8, endDay: 30 }, // Jul-Sep
    'Q4': { startMonth: 9, endMonth: 11, endDay: 31 } // Oct-Dec
  }
  
  const range = quarterRanges[quarter]
  const startDate = new Date(year, range.startMonth, 1)
  const endDate = new Date(year, range.endMonth, range.endDay)
  
  return {
    startDate: formatDateForAPI(startDate),
    endDate: formatDateForAPI(endDate)
  }
}

/**
 * Subtract one month from a date
 */
function subtractOneMonth(dateStr: string): string {
  const date = new Date(dateStr)
  date.setMonth(date.getMonth() - 1)
  return formatDateForAPI(date)
}

/**
 * Get first day of previous month
 */
function getFirstDayOfPreviousMonth(dateStr: string): string {
  const date = new Date(dateStr)
  const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return formatDateForAPI(prevMonth)
}

/**
 * Get last day of previous month
 */
function getLastDayOfPreviousMonth(dateStr: string): string {
  const date = new Date(dateStr)
  const lastDay = new Date(date.getFullYear(), date.getMonth(), 0)
  return formatDateForAPI(lastDay)
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDateForAPI(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Detect comparison mode and calculate previous period
 * 
 * @param mode - 'Quarter' or 'Daily'
 * @param quarter - Quarter string (Q1, Q2, Q3, Q4)
 * @param year - Year number
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param maxDateInData - Last available date in database
 * @returns Previous period dates and comparison mode
 */
export function calculatePreviousPeriod(
  mode: 'Quarter' | 'Daily',
  quarter: string,
  year: number,
  startDate: string,
  endDate: string,
  maxDateInData: string
): PreviousPeriod {
  
  // ========================================
  // QUARTERLY MODE
  // ========================================
  if (mode === 'Quarter') {
    // Check if quarter is complete
    if (isQuarterComplete(quarter, year, maxDateInData)) {
      // QUARTER-TO-QUARTER: Q3 complete → Q2 full quarter
      const prevQuarter = getPreviousQuarter(quarter, year)
      const prevRange = getQuarterDateRange(prevQuarter.quarter, prevQuarter.year)
      
      console.log('📊 [Comparison] QUARTER-TO-QUARTER:', {
        current: `${quarter} ${year}`,
        previous: `${prevQuarter.quarter} ${prevQuarter.year}`,
        currentRange: `${startDate} to ${endDate}`,
        previousRange: `${prevRange.startDate} to ${prevRange.endDate}`
      })
      
      return {
        prevStartDate: prevRange.startDate,
        prevEndDate: prevRange.endDate,
        comparisonMode: 'QUARTER_TO_QUARTER'
      }
    } else {
      // DATE-TO-DATE: Q4 Oct 1-20 → Sept 1-20
      console.log('📊 [Comparison] DATE-TO-DATE (Partial Quarter):', {
        current: `${quarter} ${year} (${startDate} to ${endDate})`,
        previous: `${subtractOneMonth(startDate)} to ${subtractOneMonth(endDate)}`
      })
      
      return {
        prevStartDate: subtractOneMonth(startDate),
        prevEndDate: subtractOneMonth(endDate),
        comparisonMode: 'DATE_TO_DATE'
      }
    }
  }
  
  // ========================================
  // DAILY MODE (Monthly/Custom)
  // ========================================
  else {
    // Check if full month
    if (isCompleteMonth(startDate, endDate, maxDateInData)) {
      // MONTH-TO-MONTH: Sept 1-30 → Aug 1-31
      const prevStartDate = getFirstDayOfPreviousMonth(startDate)
      const prevEndDate = getLastDayOfPreviousMonth(endDate)
      
      console.log('📊 [Comparison] MONTH-TO-MONTH:', {
        current: `${startDate} to ${endDate}`,
        previous: `${prevStartDate} to ${prevEndDate}`
      })
      
      return {
        prevStartDate,
        prevEndDate,
        comparisonMode: 'MONTH_TO_MONTH'
      }
    } else {
      // DATE-TO-DATE: Oct 1-20 → Sept 1-20
      console.log('📊 [Comparison] DATE-TO-DATE (Partial Month/Custom):', {
        current: `${startDate} to ${endDate}`,
        previous: `${subtractOneMonth(startDate)} to ${subtractOneMonth(endDate)}`
      })
      
      return {
        prevStartDate: subtractOneMonth(startDate),
        prevEndDate: subtractOneMonth(endDate),
        comparisonMode: 'DATE_TO_DATE'
      }
    }
  }
}

/**
 * Calculate average daily based on actual data availability
 * 
 * @param totalValue - Total value for the period
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Average daily value
 */
export function calculateAverageDaily(
  totalValue: number,
  startDate: string,
  endDate: string
): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Calculate total days (inclusive)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  
  if (totalDays <= 0) return 0
  
  const averageDaily = totalValue / totalDays
  
  console.log('📊 [Average Daily]:', {
    totalValue,
    startDate,
    endDate,
    totalDays,
    averageDaily: averageDaily.toFixed(2)
  })
  
  return averageDaily
}

/**
 * Calculate MoM percentage change
 * 
 * @param currentValue - Current period value
 * @param previousValue - Previous period value
 * @returns Percentage change (e.g., 15.5 for +15.5%)
 */
export function calculateMoMChange(
  currentValue: number,
  previousValue: number
): number {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0
  }
  
  const change = ((currentValue - previousValue) / previousValue) * 100
  return change
}

/**
 * Format comparison label for display
 * 
 * @param comparisonMode - Comparison mode
 * @param quarter - Current quarter
 * @param year - Current year
 * @returns Formatted label (e.g., "vs Q2 2025", "vs Last Month", "vs Same Period Last Month")
 */
export function formatComparisonLabel(
  comparisonMode: ComparisonMode,
  quarter?: string,
  year?: number
): string {
  switch (comparisonMode) {
    case 'QUARTER_TO_QUARTER':
      if (quarter && year) {
        const prev = getPreviousQuarter(quarter, year)
        return `vs ${prev.quarter} ${prev.year}`
      }
      return 'vs Last Quarter'
    
    case 'MONTH_TO_MONTH':
      return 'vs Last Month'
    
    case 'DATE_TO_DATE':
      return 'vs Same Period Last Month'
    
    default:
      return 'vs Last Period'
  }
}

