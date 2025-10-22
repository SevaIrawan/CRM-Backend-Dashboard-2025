/**
 * ============================================================================
 * BUSINESS PERFORMANCE PAGE HELPER
 * ============================================================================
 * 
 * STANDARD KHUSUS untuk Business Performance Page (MYR/SGD/USC)
 * Page ini berbeda dengan page lain karena punya:
 * - 6 KPI Cards (4 Standard + 2 Dual KPI Grid)
 * - 10 Charts berbeda (Line, Mixed, Bar, Stacked, Sankey)
 * - Quarter Slicer + Quick Date Filter (7/14 Days, This Month)
 * - ✅ REAL DATA from database (auto-detect brands, no hardcoded values)
 * 
 * ============================================================================
 */

// ============================================================================
// ❌ BRANDS REMOVED - AUTO-DETECTED FROM DATABASE
// ============================================================================
// 
// BRANDS are now dynamically detected from database in API routes:
// - app/api/myr-business-performance/data/route.ts
// - app/api/sgd-business-performance/data/route.ts (future)
// - app/api/usc-business-performance/data/route.ts (future)
// 
// NO HARDCODED BRANDS - All brands auto-detected based on available data
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BusinessPerformanceKPI {
  // Standard KPI Card
  targetAchieveRate: {
    value: number
    target: number
    // NO comparison - sudah ada current vs target display
  }
  grossGamingRevenue: {
    value: string
    dailyAvg: string
    comparison: string
    isPositive: boolean
  }
  activeMember: {
    value: string
    dailyAvg: string
    comparison: string
    isPositive: boolean
  }
  pureActive: {
    value: string
    dailyAvg: string
    comparison: string
    isPositive: boolean
  }
  
  // Dual KPI Grid
  transactionMetrics: {
    atv: {
      value: string
      comparison: string
      isPositive: boolean
    }
    pf: {
      value: string
      comparison: string
      isPositive: boolean
    }
  }
  userValueMetrics: {
    ggrUser: {
      value: string
      comparison: string
      isPositive: boolean
    }
    daUser: {
      value: string
      comparison: string
      isPositive: boolean
    }
  }
}

export interface ChartDataPoint {
  name: string
  value?: number
  barValue?: number
  lineValue?: number
}

export interface BusinessPerformanceCharts {
  forecastQ4GGR: {
    actualGGR: number[]
    targetGGR: number[]
    forecastGGR: number[]
    categories: string[]
  }
  ggrTrend: {
    data: number[]
    categories: string[]
  }
  depositAmountVsCases: ChartDataPoint[]
  withdrawAmountVsCases: ChartDataPoint[]
  winrateVsWithdrawRate: {
    winrate: number[]
    withdrawRate: number[]
    categories: string[]
  }
  bonusUsageRate: {
    data: number[]
    categories: string[]
  }
  retentionRate: {
    data: number[]
    categories: string[]
  }
  activationRate: {
    data: number[]
    categories: string[]
  }
  brandGGRContribution: {
    series: Array<{
      name: string
      data: number[]
      color: string
    }>
    categories: string[]
  }
  customerFlow: {
    nodes: Array<{ name: string; value?: number }>
    links: Array<{
      source: number
      target: number
      value: number
    }>
  }
}

// ============================================================================
// ❌ DUMMY DATA REMOVED - NOW USING REAL DATA FROM DATABASE
// ============================================================================
// 
// All KPI and Chart data now fetched from API routes:
// - GET /api/myr-business-performance/data
// - GET /api/sgd-business-performance/data (future)
// - GET /api/usc-business-performance/data (future)
// 
// Data sources:
// - blue_whale_myr (master table)
// - blue_whale_myr_monthly_summary (MV)
// - new_register (registration table)
// - bp_target (target table)
// 
// NO DUMMY DATA - All data is REAL from Supabase
// ============================================================================

// ============================================================================
// CHART COLORS - STANDARD KHUSUS
// ============================================================================

/**
 * Standard colors untuk Business Performance charts
 * - Line/Bar: BLUE (#3B82F6) dan ORANGE (#F97316)
 * - Stacked Bar: Multi-color
 * - Sankey: Multi-color
 */
export const BP_CHART_COLORS = {
  primary: '#3B82F6',      // Blue - untuk single chart
  secondary: '#F97316',    // Orange - untuk dual chart
  success: '#10b981',      // Green - untuk stacked bar
  purple: '#8b5cf6',       // Purple - reserved
  // Multi-color untuk stacked/sankey
  stacked: ['#3B82F6', '#F97316', '#10b981', '#8b5cf6', '#f59e0b'],
  sankey: ['#3B82F6', '#10b981', '#F97316', '#8b5cf6', '#06b6d4']
}

// ============================================================================
// CHART CONFIGURATION - STANDARD KHUSUS
// ============================================================================

/**
 * Get chart icon name based on chart title
 */
export function getChartIconName(chartType: string): string {
  const iconMap: Record<string, string> = {
    'forecast_ggr': 'Gross Gaming Revenue',
    'ggr_trend': 'Gross Gaming Revenue',
    'deposit_vs_cases': 'Deposit Amount',
    'withdraw_vs_cases': 'Withdraw Amount',
    'winrate': 'Winrate',
    'bonus': 'Bonus',
    'retention': 'Retention Rate',
    'activation': 'Conversion Rate',
    'brand_ggr': 'Gross Gaming Revenue',
    'customer_flow': 'Active Member'
  }
  return iconMap[chartType] || 'Gross Gaming Revenue'
}

/**
 * Get chart configuration
 */
export function getChartConfig(chartType: string) {
  return {
    showDataLabels: true,
    currency: chartType.includes('rate') || chartType.includes('winrate') ? 'PERCENTAGE' : 'MYR'
  }
}

// ============================================================================
// SLICER HELPERS - QUARTER MODE
// ============================================================================

/**
 * Get quarters for Quarter Slicer
 */
export function getQuarters(): string[] {
  return ['Q1', 'Q2', 'Q3', 'Q4']
}

/**
 * Convert month to quarter
 */
export function getQuarterFromMonth(month: number): string {
  if (month >= 1 && month <= 3) return 'Q1'
  if (month >= 4 && month <= 6) return 'Q2'
  if (month >= 7 && month <= 9) return 'Q3'
  return 'Q4'
}

/**
 * Get months in quarter
 */
export function getMonthsInQuarter(quarter: string): number[] {
  const quarterMap: Record<string, number[]> = {
    'Q1': [1, 2, 3],
    'Q2': [4, 5, 6],
    'Q3': [7, 8, 9],
    'Q4': [10, 11, 12]
  }
  return quarterMap[quarter] || []
}

// ============================================================================
// SLICER HELPERS - DAILY MODE (QUICK DATE FILTER)
// ============================================================================

/**
 * Quick Date Filter Types
 * 
 * STANDARD KHUSUS BUSINESS PERFORMANCE PAGE:
 * - Tidak pakai date range picker (terlalu complex)
 * - Pakai 3 button preset yang simple & professional
 * - User tinggal klik button, date range auto-calculated
 * - "Last Month" REMOVED to avoid cross-quarter confusion
 */
export type QuickDateFilterType = '7_DAYS' | '14_DAYS' | 'THIS_MONTH'

/**
 * Quick Date Filter Labels
 */
export const QUICK_DATE_FILTER_LABELS: Record<QuickDateFilterType, string> = {
  '7_DAYS': '7 Days',
  '14_DAYS': '14 Days',
  'THIS_MONTH': 'This Month'
}

/**
 * Calculate date range based on Quick Date Filter selection
 * 
 * Logic:
 * ✅ CRITICAL: referenceDate HARUS last data date dari database (BUKAN today!)
 * 
 * - 7 Days: Last date - 6 days → Last date (total 7 days)
 *   Contoh: Last data = Oct 20 → Oct 14-20
 * 
 * - 14 Days: Last date - 13 days → Last date (total 14 days)
 *   Contoh: Last data = Oct 20 → Oct 7-20
 * 
 * - This Month: Month start → Last date
 *   Contoh: Last data = Oct 20 → Oct 1-20
 * 
 * @param filterType - Quick filter type
 * @param referenceDate - LAST DATA DATE from database (NOT today!)
 * @returns { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
 */
export function calculateQuickDateRange(
  filterType: QuickDateFilterType,
  referenceDate: Date = new Date()
): { startDate: string; endDate: string } {
  const lastDate = new Date(referenceDate)
  lastDate.setHours(0, 0, 0, 0) // Reset time to midnight
  
  let startDate: Date
  let endDate: Date = new Date(lastDate) // End date = last data date
  
  switch (filterType) {
    case '7_DAYS':
      // Last date - 6 days → Last date (total 7 days)
      startDate = new Date(lastDate)
      startDate.setDate(lastDate.getDate() - 6)
      break
      
    case '14_DAYS':
      // Last date - 13 days → Last date (total 14 days)
      startDate = new Date(lastDate)
      startDate.setDate(lastDate.getDate() - 13)
      break
      
    case 'THIS_MONTH':
      // Month start → Last date (e.g., Oct 1 - Oct 20)
      startDate = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1)
      break
      
    default:
      // Fallback: This month
      startDate = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1)
  }
  
  return {
    startDate: formatDateForAPI(startDate),
    endDate: formatDateForAPI(endDate)
  }
}

/**
 * Bound date range to available quarter data
 * 
 * CRITICAL RULE:
 * Ketika user pilih Q4, maka date range picker hanya bisa pilih tanggal dalam Q4
 * Ini untuk avoid user pilih tanggal yang tidak ada data
 * 
 * @param startDate - User-selected start date
 * @param endDate - User-selected end date
 * @param quarterMin - Min date dari quarter yang dipilih (dari API)
 * @param quarterMax - Max date dari quarter yang dipilih (dari API)
 * @returns { startDate: bounded, endDate: bounded }
 */
export function boundDateRangeToQuarter(
  startDate: string,
  endDate: string,
  quarterMin: string,
  quarterMax: string
): { startDate: string; endDate: string } {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const min = new Date(quarterMin)
  const max = new Date(quarterMax)
  
  // Bound start date
  if (start < min) {
    startDate = quarterMin
  }
  
  // Bound end date
  if (end > max) {
    endDate = quarterMax
  }
  
  return { startDate, endDate }
}

/**
 * Format date for API (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format date for display (MMM DD, YYYY)
 */
export function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr)
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }
  return date.toLocaleDateString('en-US', options)
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`
}

// ============================================================================
// ✅ REAL DATA IMPLEMENTATION - COMPLETED
// ============================================================================
// 
// All data fetching now handled by API routes:
// - GET /api/myr-business-performance/data
//   → Returns all KPIs and chart data from database
//   → Brands auto-detected from blue_whale_myr
//   → Targets from bp_target table
//   → No dummy data, no hardcoded brands
// 
// Frontend (page.tsx) calls API and displays real data
// ============================================================================

