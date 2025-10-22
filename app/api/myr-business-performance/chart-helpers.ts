// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUSINESS PERFORMANCE - CHART GENERATION HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helper functions to generate chart data for Business Performance Page
// Separated from main API route for better maintainability
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { supabase } from '@/lib/supabase'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface ChartParams {
  currency: string
  year: number
  quarter: string
  mode: 'daily' | 'quarterly'
  startDate?: string
  endDate?: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Get detected brands dynamically
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function getDetectedBrands(params: ChartParams): Promise<string[]> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  let query = supabase
    .from('blue_whale_myr')
    .select('line')
    .eq('currency', currency)
    .gt('deposit_cases', 0)
    .neq('line', 'ALL')
    .not('line', 'is', null)

  if (mode === 'daily' && startDate && endDate) {
    query = query.gte('date', startDate).lte('date', endDate)
  } else {
    const quarterMonths: Record<string, string[]> = {
      'Q1': ['January', 'February', 'March'],
      'Q2': ['April', 'May', 'June'],
      'Q3': ['July', 'August', 'September'],
      'Q4': ['October', 'November', 'December']
    }
    const months = quarterMonths[quarter] || []
    query = query.eq('year', year.toString()).in('month', months)
  }

  const { data } = await query

  const brandsSet = new Set<string>()
  data?.forEach((row: any) => {
    if (row.line && row.line.trim()) {
      brandsSet.add(row.line.trim())
    }
  })

  return Array.from(brandsSet).sort()
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 1: GGR TREND (LINE CHART)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateGGRTrendChart(params: ChartParams): Promise<{
  categories: string[]
  data: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  if (mode === 'daily') {
    // DAILY MODE: Fetch from bp_daily_summary_myr
    const { data: dailyData } = await supabase
      .from('bp_daily_summary_myr')
      .select('date, ggr')
      .eq('currency', currency)
      .gte('date', startDate!)
      .lte('date', endDate!)
      .eq('line', 'ALL')
      .order('date', { ascending: true })

    const categories = dailyData?.map((row: any) => {
      const date = new Date(row.date as string)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }) || []

    const data = dailyData?.map((row: any) => row.ggr || 0) || []

    return { categories, data }
  } else {
    // QUARTERLY MODE: Fetch from bp_quarter_summary_myr for all quarters
    const { data: quarterData } = await supabase
      .from('bp_quarter_summary_myr')
      .select('period, ggr')
      .eq('currency', currency)
      .eq('year', year)
      .eq('period_type', 'QUARTERLY')
      .eq('line', 'ALL')
      .order('period', { ascending: true })

    const categories = quarterData?.map((row: any) => row.period) || []
    const data = quarterData?.map((row: any) => row.ggr || 0) || []

    return { categories, data }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 2: FORECAST Q4 GGR (LINE CHART with 3 lines: Actual, Target, Forecast)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateForecastQ4GGRChart(params: ChartParams): Promise<{
  categories: string[]
  actualData: number[]
  targetData: number[]
  forecastData: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DAILY MODE: Daily breakdown with daily target & forecast
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (mode === 'daily' && startDate && endDate) {
    // Fetch actual GGR per day
    const { data: dailyData } = await supabase
      .from('bp_daily_summary_myr')
      .select('date, ggr')
      .eq('currency', currency)
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('line', 'ALL')
      .order('date', { ascending: true })

    // Get target for current quarter
    const { data: targetData } = await supabase
      .from('bp_target')
      .select('quarter, target_ggr, forecast_ggr')
      .eq('currency', currency)
      .eq('year', year)
      .eq('quarter', quarter)

    const totalTarget = targetData?.reduce((sum, row) => sum + (row.target_ggr || 0), 0) || 0
    const totalForecast = targetData?.reduce((sum, row) => sum + (row.forecast_ggr || 0), 0) || 0

    // Calculate number of days in the selected period
    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Daily target = Total Target / Total Days
    const dailyTarget = totalTarget > 0 ? totalTarget / totalDays : 0
    const dailyForecast = totalForecast > 0 ? totalForecast / totalDays : 0

    const categories = dailyData?.map((row: any) => {
      const date = new Date(row.date as string)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }) || []

    const actualData = dailyData?.map((row: any) => row.ggr || 0) || []
    const targetDataArray = new Array(categories.length).fill(dailyTarget)
    const forecastDataArray = new Array(categories.length).fill(dailyForecast)

    return {
      categories,
      actualData,
      targetData: targetDataArray,
      forecastData: forecastDataArray
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUARTERLY MODE: Show Q1, Q2, Q3, Q4
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Fetch all quarters for the year
  const { data: quarterData } = await supabase
    .from('bp_quarter_summary_myr')
    .select('period, ggr')
    .eq('currency', currency)
    .eq('year', year)
    .eq('period_type', 'QUARTERLY')
    .eq('line', 'ALL')
    .order('period', { ascending: true })

  // Fetch target data
  const { data: targetData } = await supabase
    .from('bp_target')
    .select('quarter, target_ggr, forecast_ggr')
    .eq('currency', currency)
    .eq('year', year)

  // Build data arrays
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  const actualData = quarters.map(q => {
    const found = quarterData?.find(row => row.period === q)
    return found ? found.ggr : 0
  })

  const targetDataArray = quarters.map(q => {
    const found = targetData?.filter(row => row.quarter === q)
    return found && found.length > 0 ? found.reduce((sum, row) => sum + (row.target_ggr || 0), 0) : 0
  })

  const forecastDataArray = quarters.map(q => {
    const found = targetData?.filter(row => row.quarter === q)
    return found && found.length > 0 ? found.reduce((sum, row) => sum + (row.forecast_ggr || 0), 0) : 0
  })

  return {
    categories: quarters,
    actualData,
    targetData: targetDataArray,
    forecastData: forecastDataArray
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 3: DEPOSIT AMOUNT VS CASES (MIXED CHART - Line + Bar)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateDepositVsCasesChart(params: ChartParams): Promise<{
  categories: string[]
  depositAmount: number[]
  depositCases: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  if (mode === 'daily') {
    const { data: dailyData } = await supabase
      .from('bp_daily_summary_myr')
      .select('date, deposit_amount, deposit_cases')
      .eq('currency', currency)
      .gte('date', startDate!)
      .lte('date', endDate!)
      .eq('line', 'ALL')
      .order('date', { ascending: true })

    const categories = dailyData?.map((row: any) => {
      const date = new Date(row.date as string)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }) || []

    const depositAmount = dailyData?.map((row: any) => row.deposit_amount || 0) || []
    const depositCases = dailyData?.map((row: any) => row.deposit_cases || 0) || []

    return { categories, depositAmount, depositCases }
  } else {
    const { data: quarterData } = await supabase
      .from('bp_quarter_summary_myr')
      .select('period, deposit_amount, deposit_cases')
      .eq('currency', currency)
      .eq('year', year)
      .eq('period_type', 'QUARTERLY')
      .eq('line', 'ALL')
      .order('period', { ascending: true })

    const categories = quarterData?.map((row: any) => row.period) || []
    const depositAmount = quarterData?.map((row: any) => row.deposit_amount || 0) || []
    const depositCases = quarterData?.map((row: any) => row.deposit_cases || 0) || []

    return { categories, depositAmount, depositCases }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 4: WITHDRAW AMOUNT VS CASES (MIXED CHART - Line + Bar)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateWithdrawVsCasesChart(params: ChartParams): Promise<{
  categories: string[]
  withdrawAmount: number[]
  withdrawCases: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  if (mode === 'daily') {
    const { data: dailyData } = await supabase
      .from('bp_daily_summary_myr')
      .select('date, withdraw_amount, withdraw_cases')
      .eq('currency', currency)
      .gte('date', startDate!)
      .lte('date', endDate!)
      .eq('line', 'ALL')
      .order('date', { ascending: true })

    const categories = dailyData?.map((row: any) => {
      const date = new Date(row.date as string)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }) || []

    const withdrawAmount = dailyData?.map((row: any) => row.withdraw_amount || 0) || []
    const withdrawCases = dailyData?.map((row: any) => row.withdraw_cases || 0) || []

    return { categories, withdrawAmount, withdrawCases }
  } else {
    const { data: quarterData } = await supabase
      .from('bp_quarter_summary_myr')
      .select('period, withdraw_amount, withdraw_cases')
      .eq('currency', currency)
      .eq('year', year)
      .eq('period_type', 'QUARTERLY')
      .eq('line', 'ALL')
      .order('period', { ascending: true })

    const categories = quarterData?.map((row: any) => row.period) || []
    const withdrawAmount = quarterData?.map((row: any) => row.withdraw_amount || 0) || []
    const withdrawCases = quarterData?.map((row: any) => row.withdraw_cases || 0) || []

    return { categories, withdrawAmount, withdrawCases }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 5: WINRATE VS WITHDRAW RATE (LINE CHART with 2 lines)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateWinrateVsWithdrawRateChart(params: ChartParams): Promise<{
  categories: string[]
  winrateData: number[]
  withdrawalRateData: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  if (mode === 'daily') {
    const { data: dailyData } = await supabase
      .from('bp_daily_summary_myr')
      .select('date, winrate, withdrawal_rate')
      .eq('currency', currency)
      .gte('date', startDate!)
      .lte('date', endDate!)
      .eq('line', 'ALL')
      .order('date', { ascending: true })

    const categories = dailyData?.map((row: any) => {
      const date = new Date(row.date as string)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }) || []

    const winrateData = dailyData?.map((row: any) => row.winrate || 0) || []
    const withdrawalRateData = dailyData?.map((row: any) => row.withdrawal_rate || 0) || []

    return { categories, winrateData, withdrawalRateData }
  } else {
    const { data: quarterData } = await supabase
      .from('bp_quarter_summary_myr')
      .select('period, winrate, withdrawal_rate')
      .eq('currency', currency)
      .eq('year', year)
      .eq('period_type', 'QUARTERLY')
      .eq('line', 'ALL')
      .order('period', { ascending: true })

    const categories = quarterData?.map((row: any) => row.period) || []
    const winrateData = quarterData?.map((row: any) => row.winrate || 0) || []
    const withdrawalRateData = quarterData?.map((row: any) => row.withdrawal_rate || 0) || []

    return { categories, winrateData, withdrawalRateData }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 6: BONUS USAGE RATE PER BRAND (BAR CHART)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateBonusUsagePerBrandChart(params: ChartParams): Promise<{
  categories: string[]
  data: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  // Get detected brands
  const brands = await getDetectedBrands(params)

  // Fetch per-brand financial data from MV
  let mvData: any[] = []

  if (mode === 'daily') {
    const { data } = await supabase
      .from('bp_daily_summary_myr')
      .select('line, bonus, add_bonus, deduct_bonus')
      .eq('currency', currency)
      .gte('date', startDate!)
      .lte('date', endDate!)
      .neq('line', 'ALL')

    mvData = data || []
  } else {
    const { data } = await supabase
      .from('bp_quarter_summary_myr')
      .select('line, bonus, add_bonus, deduct_bonus')
      .eq('currency', currency)
      .eq('year', year)
      .eq('period', quarter)
      .eq('period_type', 'QUARTERLY')
      .neq('line', 'ALL')

    mvData = data || []
  }

  // Aggregate by brand
  const brandAggregates: Record<string, { bonus: number; addBonus: number; deductBonus: number }> = {}
  mvData.forEach(row => {
    if (!brandAggregates[row.line]) {
      brandAggregates[row.line] = { bonus: 0, addBonus: 0, deductBonus: 0 }
    }
    brandAggregates[row.line].bonus += row.bonus || 0
    brandAggregates[row.line].addBonus += row.add_bonus || 0
    brandAggregates[row.line].deductBonus += row.deduct_bonus || 0
  })

  // Calculate active member per brand and bonus usage rate
  const categories = brands
  const data = await Promise.all(categories.map(async (brand) => {
    const agg = brandAggregates[brand]
    if (!agg) return 0

    // Get active member for this brand
    let query = supabase
      .from('blue_whale_myr')
      .select('userkey', { count: 'exact', head: false })
      .eq('currency', currency)
      .eq('line', brand)
      .gt('deposit_cases', 0)

    if (mode === 'daily' && startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    } else {
      const quarterMonths: Record<string, string[]> = {
        'Q1': ['January', 'February', 'March'],
        'Q2': ['April', 'May', 'June'],
        'Q3': ['July', 'August', 'September'],
        'Q4': ['October', 'November', 'December']
      }
      const months = quarterMonths[quarter] || []
      query = query.eq('year', year.toString()).in('month', months)
    }

    const { data: userData } = await query
    const activeMember = new Set(userData?.map((row: any) => row.userkey) || []).size

    // Bonus Usage Rate = (bonus + add_bonus - deduct_bonus) / active_member (NO × 100)
    const netBonus = agg.bonus + agg.addBonus - agg.deductBonus
    return activeMember > 0 ? (netBonus / activeMember) : 0
  }))

  return { categories, data }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 7: BRAND GGR CONTRIBUTION (STACKED BAR CHART)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateBrandGGRContributionChart(params: ChartParams): Promise<{
  categories: string[]
  brands: string[]
  data: Record<string, number[]>
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  // Get detected brands
  const brands = await getDetectedBrands(params)

  if (mode === 'daily') {
    const { data: dailyData } = await supabase
      .from('bp_daily_summary_myr')
      .select('date, line, ggr')
      .eq('currency', currency)
      .gte('date', startDate!)
      .lte('date', endDate!)
      .neq('line', 'ALL')
      .order('date', { ascending: true })

    // Group by date
    const groupedByDate: Record<string, Record<string, number>> = {}
    dailyData?.forEach(row => {
      if (!groupedByDate[row.date]) {
        groupedByDate[row.date] = {}
      }
      groupedByDate[row.date][row.line] = row.ggr || 0
    })

    const categories = Object.keys(groupedByDate).map(date => {
      const d = new Date(date)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })

    const data: Record<string, number[]> = {}
    brands.forEach(brand => {
      data[brand] = Object.values(groupedByDate).map(dateData => dateData[brand] || 0)
    })

    return { categories, brands, data }
  } else {
    const { data: quarterData } = await supabase
      .from('bp_quarter_summary_myr')
      .select('period, line, ggr')
      .eq('currency', currency)
      .eq('year', year)
      .eq('period_type', 'QUARTERLY')
      .neq('line', 'ALL')
      .order('period', { ascending: true })

    // Group by quarter
    const groupedByQuarter: Record<string, Record<string, number>> = {}
    quarterData?.forEach(row => {
      if (!groupedByQuarter[row.period]) {
        groupedByQuarter[row.period] = {}
      }
      groupedByQuarter[row.period][row.line] = row.ggr || 0
    })

    const categories = Object.keys(groupedByQuarter)

    const data: Record<string, number[]> = {}
    brands.forEach(brand => {
      data[brand] = Object.values(groupedByQuarter).map(periodData => periodData[brand] || 0)
    })

    return { categories, brands, data }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 8: RETENTION VS CHURN RATE (DUAL BAR CHART)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateRetentionVsChurnRateChart(params: ChartParams): Promise<{
  categories: string[]
  retentionData: number[]
  churnData: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  // Get detected brands
  const brands = await getDetectedBrands(params)

  // Calculate previous period dates
  let currentStart = ''
  let currentEnd = ''
  let prevStart = ''
  let prevEnd = ''

  if (mode === 'daily') {
    currentStart = startDate!
    currentEnd = endDate!
    const start = new Date(currentStart)
    const end = new Date(currentEnd)
    prevStart = new Date(start.getFullYear(), start.getMonth() - 1, start.getDate()).toISOString().split('T')[0]
    prevEnd = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate()).toISOString().split('T')[0]
  } else {
    const quarterMonths: Record<string, { start: string; end: string }> = {
      'Q1': { start: '01-01', end: '03-31' },
      'Q2': { start: '04-01', end: '06-30' },
      'Q3': { start: '07-01', end: '09-30' },
      'Q4': { start: '10-01', end: '12-31' }
    }
    currentStart = `${year}-${quarterMonths[quarter].start}`
    currentEnd = `${year}-${quarterMonths[quarter].end}`

    const prevQuarterMap: Record<string, { quarter: string; year: number }> = {
      'Q1': { quarter: 'Q4', year: year - 1 },
      'Q2': { quarter: 'Q1', year },
      'Q3': { quarter: 'Q2', year },
      'Q4': { quarter: 'Q3', year }
    }
    const prev = prevQuarterMap[quarter]
    prevStart = `${prev.year}-${quarterMonths[prev.quarter].start}`
    prevEnd = `${prev.year}-${quarterMonths[prev.quarter].end}`
  }

  // Calculate retention and churn for each brand
  const retentionData: number[] = []
  const churnData: number[] = []

  for (const brand of brands) {
    // Get active users in current period for this brand
    const { data: currentUsers } = await supabase
      .from('blue_whale_myr')
      .select('userkey')
      .eq('currency', currency)
      .eq('line', brand)
      .gte('date', currentStart)
      .lte('date', currentEnd)
      .gt('deposit_cases', 0)

    const currentUserKeys = [...new Set(currentUsers?.map(u => u.userkey) || [])]

    // Get active users in previous period for this brand
    const { data: prevUsers } = await supabase
      .from('blue_whale_myr')
      .select('userkey')
      .eq('currency', currency)
      .eq('line', brand)
      .gte('date', prevStart)
      .lte('date', prevEnd)
      .gt('deposit_cases', 0)

    const prevUserKeys = new Set(prevUsers?.map(u => u.userkey) || [])
    const activeMemberPrev = prevUserKeys.size

    // Calculate retention
    const retentionMember = currentUserKeys.filter(key => prevUserKeys.has(key)).length
    const retentionRate = activeMemberPrev > 0 ? (retentionMember / activeMemberPrev) * 100 : 0

    // Calculate churn
    const churnRate = 100 - retentionRate

    retentionData.push(retentionRate)
    churnData.push(churnRate)
  }

  return { categories: brands, retentionData, churnData }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 9: REACTIVATION RATE (PER BRAND) - Same as Activation Rate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateReactivationRateChart(params: ChartParams): Promise<{
  categories: string[]
  reactivationData: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  // Get detected brands
  const brands = await getDetectedBrands(params)

  // Determine date ranges
  let currentStart: string, currentEnd: string, prevStart: string, prevEnd: string

  if (mode === 'daily' && startDate && endDate) {
    currentStart = startDate
    currentEnd = endDate

    // Previous period = same number of days before current period
    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const prevEndDate = new Date(start)
    prevEndDate.setDate(prevEndDate.getDate() - 1)
    const prevStartDate = new Date(prevEndDate)
    prevStartDate.setDate(prevStartDate.getDate() - totalDays + 1)
    prevStart = prevStartDate.toISOString().split('T')[0]
    prevEnd = prevEndDate.toISOString().split('T')[0]
  } else {
    const quarterMonths: Record<string, { start: string; end: string }> = {
      'Q1': { start: '01-01', end: '03-31' },
      'Q2': { start: '04-01', end: '06-30' },
      'Q3': { start: '07-01', end: '09-30' },
      'Q4': { start: '10-01', end: '12-31' }
    }
    currentStart = `${year}-${quarterMonths[quarter].start}`
    currentEnd = `${year}-${quarterMonths[quarter].end}`

    const prevQuarterMap: Record<string, { quarter: string; year: number }> = {
      'Q1': { quarter: 'Q4', year: year - 1 },
      'Q2': { quarter: 'Q1', year },
      'Q3': { quarter: 'Q2', year },
      'Q4': { quarter: 'Q3', year }
    }
    const prev = prevQuarterMap[quarter]
    prevStart = `${prev.year}-${quarterMonths[prev.quarter].start}`
    prevEnd = `${prev.year}-${quarterMonths[prev.quarter].end}`
  }

  // Calculate reactivation rate for each brand
  const reactivationData: number[] = []

  for (const brand of brands) {
    // Get active users in current period with first_deposit_date
    const { data: currentUsers } = await supabase
      .from('blue_whale_myr')
      .select('userkey, first_deposit_date')
      .eq('currency', currency)
      .eq('line', brand)
      .gte('date', currentStart)
      .lte('date', currentEnd)
      .gt('deposit_cases', 0)

    // Get unique current users (with earliest first_deposit_date per userkey)
    const currentUserMap = new Map()
    currentUsers?.forEach((u: any) => {
      if (!currentUserMap.has(u.userkey) || u.first_deposit_date < currentUserMap.get(u.userkey)) {
        currentUserMap.set(u.userkey, u.first_deposit_date)
      }
    })

    const currentUserKeys = [...currentUserMap.keys()]

    // Get active users in previous period
    const { data: prevUsers } = await supabase
      .from('blue_whale_myr')
      .select('userkey')
      .eq('currency', currency)
      .eq('line', brand)
      .gte('date', prevStart)
      .lte('date', prevEnd)
      .gt('deposit_cases', 0)

    const prevUserKeys = new Set(prevUsers?.map(u => u.userkey) || [])

    // Count reactivation: in current, NOT in previous, AND first_deposit_date before current period
    let reactivationMember = 0
    currentUserMap.forEach((firstDepositDate, userkey) => {
      if (!prevUserKeys.has(userkey) && firstDepositDate < currentStart) {
        reactivationMember++
      }
    })

    const activeMemberCurrent = currentUserKeys.length
    const reactivationRate = activeMemberCurrent > 0 ? (reactivationMember / activeMemberCurrent) * 100 : 0

    reactivationData.push(reactivationRate)
  }

  return { categories: brands, reactivationData }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 10: SANKEY DIAGRAM (Pure User GGR Distribution per Brand)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateSankeyDiagram(params: ChartParams & { pureUserGGR: number }): Promise<{
  nodes: Array<{ name: string; value: number }>
  links: Array<{ source: number; target: number; value: number }>
}> {
  const { currency, year, quarter, mode, startDate, endDate, pureUserGGR } = params

  // Get detected brands
  const brands = await getDetectedBrands(params)

  // Calculate Pure User count and GGR per brand
  const brandPureUser: Record<string, number> = {}
  const brandPureUserGGR: Record<string, number> = {}
  
  // GLOBAL unique_code tracker (across all brands) to avoid double-counting
  const globalUniqueCodeGGR: Record<string, number> = {}
  
  // Track which brands each unique_code belongs to (for Single/Multiple Brand calculation)
  const uniqueCodeBrands: Record<string, Set<string>> = {}

  for (const brand of brands) {
    // Query for pure users (unique_code with deposit_cases > 0) and their GGR
    let query = supabase
      .from('blue_whale_myr')
      .select('unique_code, deposit_amount, withdraw_amount')
      .eq('currency', currency)
      .eq('line', brand)
      .gt('deposit_cases', 0)
      .not('unique_code', 'is', null)

    if (mode === 'daily' && startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    } else {
      const quarterMonths: Record<string, string[]> = {
        'Q1': ['January', 'February', 'March'],
        'Q2': ['April', 'May', 'June'],
        'Q3': ['July', 'August', 'September'],
        'Q4': ['October', 'November', 'December']
      }
      const months = quarterMonths[quarter] || []
      query = query.eq('year', year.toString()).in('month', months)
    }

    const { data } = await query

    // Pure User Logic (SIMPLE): COUNT DISTINCT unique_code with deposit_cases > 0
    // Aggregate GGR per unique_code FOR THIS BRAND
    const brandUniqueCodeGGR: Record<string, number> = {}
    data?.forEach((row: any) => {
      const uniqueCode = row.unique_code?.trim()
      if (!uniqueCode) return

      const ggr = (row.deposit_amount || 0) - (row.withdraw_amount || 0)
      
      // Track per brand
      if (!brandUniqueCodeGGR[uniqueCode]) {
        brandUniqueCodeGGR[uniqueCode] = 0
      }
      brandUniqueCodeGGR[uniqueCode] += ggr
      
      // Track globally (across all brands) - no double counting!
      if (!globalUniqueCodeGGR[uniqueCode]) {
        globalUniqueCodeGGR[uniqueCode] = 0
      }
      globalUniqueCodeGGR[uniqueCode] += ggr
      
      // Track which brands this unique_code belongs to
      if (!uniqueCodeBrands[uniqueCode]) {
        uniqueCodeBrands[uniqueCode] = new Set()
      }
      uniqueCodeBrands[uniqueCode].add(brand)
    })

    // Pure User per brand = COUNT DISTINCT unique_code in this brand
    brandPureUser[brand] = Object.keys(brandUniqueCodeGGR).length
    
    // Pure User GGR per brand = SUM of GGR for unique_code in this brand
    brandPureUserGGR[brand] = Object.values(brandUniqueCodeGGR).reduce((sum, ggr) => sum + ggr, 0)
  }

  // Calculate TOTAL Pure User (DISTINCT across all brands - no double counting!)
  const totalPureUser = Object.keys(globalUniqueCodeGGR).length
  
  // Calculate Single Brand vs Multiple Brand users
  let singleBrandUsers = 0
  let multipleBrandUsers = 0
  
  // Track per-brand single/multiple breakdown for links
  const brandSingleUsers: Record<string, number> = {}
  const brandMultipleUsers: Record<string, number> = {}
  
  brands.forEach(brand => {
    brandSingleUsers[brand] = 0
    brandMultipleUsers[brand] = 0
  })
  
  Object.entries(uniqueCodeBrands).forEach(([uniqueCode, brandSet]) => {
    if (brandSet.size === 1) {
      singleBrandUsers++
      // Add to the single brand this user belongs to
      brandSet.forEach(brand => {
        brandSingleUsers[brand]++
      })
    } else if (brandSet.size > 1) {
      multipleBrandUsers++
      // Add to all brands this user belongs to
      brandSet.forEach(brand => {
        brandMultipleUsers[brand]++
      })
    }
  })

  // Build nodes - 3 COLUMN SANKEY
  // COLUMN 1: Pure User (1 node)
  // COLUMN 2: Brands with count + GGR (N nodes)
  // COLUMN 3: Single Brand + Multiple Brand (2 nodes)
  const nodes: Array<{ name: string; value: number }> = []

  // COLUMN 1: Pure User
  nodes.push({ 
    name: `Pure User\n${totalPureUser.toLocaleString()}`, 
    value: totalPureUser 
  })

  // COLUMN 2: Brands (dengan format: "SBMY\n1,092 (RM 414,906)")
  brands.forEach(brand => {
    const count = brandPureUser[brand] || 0
    const ggr = Math.round(brandPureUserGGR[brand] || 0)
    nodes.push({ 
      name: `${brand}\n${count.toLocaleString()} (RM ${ggr.toLocaleString()})`, 
      value: count
    })
  })
  
  // COLUMN 3: Single Brand and Multiple Brand
  const singleBrandIndex = 1 + brands.length
  const multipleBrandIndex = 1 + brands.length + 1
  
  nodes.push({
    name: `Single Brand\n${singleBrandUsers.toLocaleString()}`,
    value: singleBrandUsers
  })
  
  nodes.push({
    name: `Multiple Brand\n${multipleBrandUsers.toLocaleString()}`,
    value: multipleBrandUsers
  })

  // Build links
  const links: Array<{ source: number; target: number; value: number }> = []

  // COLUMN 1 → COLUMN 2: Pure User → Brands
  brands.forEach((brand, index) => {
    const pureUserCount = brandPureUser[brand] || 0
    if (pureUserCount > 0) {
      links.push({
        source: 0, // Pure User node
        target: 1 + index, // Brand node
        value: pureUserCount
      })
    }
  })
  
  // COLUMN 2 → COLUMN 3: Brands → Single Brand
  brands.forEach((brand, index) => {
    const singleCount = brandSingleUsers[brand] || 0
    if (singleCount > 0) {
      links.push({
        source: 1 + index, // Brand node
        target: singleBrandIndex, // Single Brand node
        value: singleCount
      })
    }
  })
  
  // COLUMN 2 → COLUMN 3: Brands → Multiple Brand
  brands.forEach((brand, index) => {
    const multipleCount = brandMultipleUsers[brand] || 0
    if (multipleCount > 0) {
      links.push({
        source: 1 + index, // Brand node
        target: multipleBrandIndex, // Multiple Brand node
        value: multipleCount
      })
    }
  })

  return { nodes, links }
}

