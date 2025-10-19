/**
 * ============================================================================
 * BUSINESS PERFORMANCE PAGE HELPER
 * ============================================================================
 * 
 * STANDARD KHUSUS untuk Business Performance Page (MYR/SGD/USC)
 * Page ini berbeda dengan page lain karena punya:
 * - 6 KPI Cards (4 Standard + 2 Dual KPI Grid)
 * - 10 Charts berbeda (Line, Mixed, Bar, Stacked, Sankey)
 * - Quarter Slicer + Date Range Slicer
 * - Dummy data untuk design preview
 * 
 * ============================================================================
 */

// ============================================================================
// BRAND CONSTANTS
// ============================================================================

/**
 * Brand lists for each currency
 * MYR: SBMY, LVMY, STMY, JMMY
 * SGD: Will be added when SGD page is implemented
 * USC: Will be added when USC page is implemented
 */
export const BRANDS = {
  MYR: ['SBMY', 'LVMY', 'STMY', 'JMMY'],
  SGD: [], // TODO: Add SGD brands
  USC: []  // TODO: Add USC brands
}

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
    nodes: Array<{ name: string }>
    links: Array<{
      source: number
      target: number
      value: number
    }>
  }
}

// ============================================================================
// DUMMY DATA - PHASE 1: WIREFRAME
// ============================================================================

/**
 * Get dummy KPI data for WIREFRAME presentation
 * 
 * PHASE 1: Used for design preview & atasan approval
 * PHASE 2: Will be replaced with fetchRealKPIData()
 * 
 * Brands: Data untuk ALL brands (SBMY, LVMY, STMY, JMMY)
 */
export function getDummyKPIData(): BusinessPerformanceKPI {
  return {
    targetAchieveRate: {
      value: 8500000,
      target: 10000000
      // NO comparison - sudah ada current vs target display
    },
    grossGamingRevenue: {
      value: 'RM 8.5M',
      dailyAvg: 'RM 274K',
      comparison: '+12.5%',
      isPositive: true
    },
    activeMember: {
      value: '1,250',
      dailyAvg: '40',
      comparison: '+8.3%',
      isPositive: true
    },
    pureActive: {
      value: '950',
      dailyAvg: '31',
      comparison: '+6.7%',
      isPositive: true
    },
    transactionMetrics: {
      atv: {
        value: 'RM 285',
        comparison: '+3.2%',
        isPositive: true
      },
      pf: {
        value: '3.8x',
        comparison: '+0.5x',
        isPositive: true
      }
    },
    userValueMetrics: {
      ggrUser: {
        value: 'RM 6,800',
        comparison: '+4.1%',
        isPositive: true
      },
      daUser: {
        value: 'RM 8,500',
        comparison: '+3.8%',
        isPositive: true
      }
    }
  }
}

/**
 * Get dummy chart data for WIREFRAME presentation
 * 
 * PHASE 1: Used for design preview & atasan approval
 * PHASE 2: Will be replaced with fetchRealChartData()
 * 
 * Brands: Data untuk ALL brands aggregated (SBMY, LVMY, STMY, JMMY)
 * Brand-specific breakdown akan diimplementasi di PHASE 2
 */
export function getDummyChartData(): BusinessPerformanceCharts {
  return {
    forecastQ4GGR: {
      // Actual: Real performance (start lower, gradually improving)
      actualGGR: [7500000, 8200000, 8800000, 9500000],
      // Target: Goal to achieve (highest, aspirational)
      targetGGR: [9000000, 9200000, 9500000, 10000000],
      // Forecast: Realistic prediction (between actual and target)
      forecastGGR: [8000000, 8500000, 9000000, 9700000],
      categories: ['Oct', 'Nov', 'Dec', 'Jan']
    },
    ggrTrend: {
      data: [7200000, 7800000, 8100000, 8500000, 8200000, 8800000],
      categories: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
    },
    depositAmountVsCases: [
      { name: 'May', barValue: 5200000, lineValue: 8500 },
      { name: 'Jun', barValue: 5800000, lineValue: 9200 },
      { name: 'Jul', barValue: 6100000, lineValue: 9800 },
      { name: 'Aug', barValue: 6500000, lineValue: 10200 },
      { name: 'Sep', barValue: 6200000, lineValue: 9900 },
      { name: 'Oct', barValue: 6800000, lineValue: 10500 }
    ],
    withdrawAmountVsCases: [
      { name: 'May', barValue: 4500000, lineValue: 7200 },
      { name: 'Jun', barValue: 5100000, lineValue: 7800 },
      { name: 'Jul', barValue: 5400000, lineValue: 8100 },
      { name: 'Aug', barValue: 5800000, lineValue: 8500 },
      { name: 'Sep', barValue: 5500000, lineValue: 8200 },
      { name: 'Oct', barValue: 6000000, lineValue: 8800 }
    ],
    winrateVsWithdrawRate: {
      winrate: [45.5, 48.2, 46.8, 49.1, 47.5, 50.2],
      withdrawRate: [65.2, 68.5, 70.1, 72.8, 71.5, 74.2],
      categories: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
    },
    bonusUsageRate: {
      data: [18.25, 15.80, 22.45, 16.90], // Per brand data
      categories: ['SBMY', 'LVMY', 'JMMY', 'STMY'] // Brand names, not periods
    },
    retentionRate: {
      data: [72.50, 68.30, 75.80, 70.15], // Per brand data
      categories: ['SBMY', 'LVMY', 'JMMY', 'STMY'] // Brand names, not periods
    },
    activationRate: {
      data: [55.80, 48.90, 62.45, 52.30], // Per brand data
      categories: ['SBMY', 'LVMY', 'JMMY', 'STMY'] // Brand names, not periods
    },
    brandGGRContribution: {
      series: [
        { name: 'SBMY', data: [3000000, 3200000, 3500000, 3800000], color: '#3B82F6' },
        { name: 'LVMY', data: [2500000, 2700000, 2800000, 3000000], color: '#F97316' },
        { name: 'STMY', data: [2000000, 2300000, 2200000, 2400000], color: '#10b981' },
        { name: 'JMMY', data: [1500000, 1800000, 2000000, 2200000], color: '#8b5cf6' }
      ],
      categories: ['Jul', 'Aug', 'Sep', 'Oct']
    },
    customerFlow: {
      nodes: [
        { name: 'New Register' },
        { name: 'SBMY' },
        { name: 'LVMY' },
        { name: 'STMY' },
        { name: 'JMMY' },
        { name: 'Retained' },
        { name: 'Churned' }
      ],
      links: [
        // New Register → Brands
        { source: 0, target: 1, value: 400 }, // New Register → SBMY
        { source: 0, target: 2, value: 300 }, // New Register → LVMY
        { source: 0, target: 3, value: 200 }, // New Register → STMY
        { source: 0, target: 4, value: 100 }, // New Register → JMMY
        
        // Brands → Retained
        { source: 1, target: 5, value: 280 }, // SBMY → Retained
        { source: 2, target: 5, value: 210 }, // LVMY → Retained
        { source: 3, target: 5, value: 130 }, // STMY → Retained
        { source: 4, target: 5, value: 50 },  // JMMY → Retained
        
        // Brands → Churned
        { source: 1, target: 6, value: 120 }, // SBMY → Churned
        { source: 2, target: 6, value: 90 },  // LVMY → Churned
        { source: 3, target: 6, value: 70 },  // STMY → Churned
        { source: 4, target: 6, value: 50 }   // JMMY → Churned
      ]
    }
  }
}

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
// SLICER HELPERS
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

/**
 * Format date range for display
 */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${startDate} to ${endDate}`
}

// ============================================================================
// DATA VALIDATION
// ============================================================================

/**
 * Validate if real data is available
 * 
 * PHASE 1 (CURRENT): Always return false - use dummy data for WIREFRAME
 * PHASE 2 (FUTURE): Check if target table exists and has real data
 */
export function isRealDataAvailable(): boolean {
  // TODO PHASE 2: Check if target table exists and has data
  // For PHASE 1 (WIREFRAME), always return false (use dummy data)
  return false
}

/**
 * Get data source label for slicer info
 * 
 * PHASE 1: Show "Dummy Data (for Design Preview)"
 * PHASE 2: Show "Real Data from Supabase"
 */
export function getDataSourceLabel(): string {
  return isRealDataAvailable() ? 'Real Data from Supabase' : 'Dummy Data (for Design Preview)'
}

// ============================================================================
// PHASE 2: REAL DATA INTEGRATION (AFTER WIREFRAME APPROVAL)
// ============================================================================

/**
 * PHASE 2: Fetch real KPI data from Supabase
 * 
 * Prerequisite:
 * - Wireframe approved by atasan ✅
 * - Target Input Table created in Supabase
 * - Blue Whale tables accessible
 * 
 * Data Source:
 * - Target Input Table (for target values)
 * - Blue Whale MYR/SGD/USC (for actual values)
 * - Filter by brand: SBMY, LVMY, STMY, JMMY (MYR)
 * 
 * @param currency - MYR, SGD, or USC
 * @param year - Selected year (e.g., '2025')
 * @param quarter - Selected quarter (e.g., 'Q4') or null if date range mode
 * @param startDate - Start date for date range mode (e.g., '2025-10-01')
 * @param endDate - End date for date range mode (e.g., '2025-10-31')
 * @returns BusinessPerformanceKPI or null if error
 */
export async function fetchRealKPIData(
  currency: string,
  year: string,
  quarter: string,
  startDate: string,
  endDate: string
): Promise<BusinessPerformanceKPI | null> {
  // TODO PHASE 2: Implement real data fetching
  // 1. Query Target Input Table for target values
  // 2. Query Blue Whale tables for actual values
  // 3. Calculate KPIs based on selected filters
  // 4. Return formatted BusinessPerformanceKPI
  return null
}

/**
 * PHASE 2: Fetch real chart data from Supabase
 * 
 * Prerequisite:
 * - Wireframe approved by atasan ✅
 * - Target Input Table created in Supabase
 * - Blue Whale tables accessible
 * 
 * Data Source:
 * - Blue Whale MYR/SGD/USC (for all chart data)
 * - Filter by brand: SBMY, LVMY, STMY, JMMY (MYR)
 * - Aggregate data per brand or ALL brands
 * 
 * @param currency - MYR, SGD, or USC
 * @param year - Selected year (e.g., '2025')
 * @param quarter - Selected quarter (e.g., 'Q4') or null if date range mode
 * @param startDate - Start date for date range mode (e.g., '2025-10-01')
 * @param endDate - End date for date range mode (e.g., '2025-10-31')
 * @returns BusinessPerformanceCharts or null if error
 */
export async function fetchRealChartData(
  currency: string,
  year: string,
  quarter: string,
  startDate: string,
  endDate: string
): Promise<BusinessPerformanceCharts | null> {
  // TODO PHASE 2: Implement real data fetching
  // 1. Query Blue Whale tables for chart data
  // 2. Filter by selected year, quarter/date range
  // 3. Aggregate data per brand or ALL brands
  // 4. Format data for each chart type
  // 5. Return formatted BusinessPerformanceCharts
  return null
}

