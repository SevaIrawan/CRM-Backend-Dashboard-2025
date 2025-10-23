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
// FORMULA: Forecast GGR = Current Realized GGR + (Avg Daily GGR × Remaining Days)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateForecastQ4GGRChart(params: ChartParams): Promise<{
  categories: string[]
  actualData: number[]
  targetData: number[]
  forecastData: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DAILY MODE: Cumulative forecast with projection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (mode === 'daily' && startDate && endDate) {
    // Fetch actual GGR per day for entire period (including future dates if available)
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
      .select('quarter, target_ggr')
      .eq('currency', currency)
      .eq('year', year)
      .eq('quarter', quarter)

    const totalTarget = targetData?.reduce((sum: number, row: any) => sum + (row.target_ggr || 0), 0) || 0

    // Get max date in database (last data date)
    const maxDataDateStr = dailyData && dailyData.length > 0 
      ? dailyData[dailyData.length - 1].date as string
      : startDate

    // Calculate avg daily GGR from actual data
    const currentRealizedGGR = dailyData?.reduce((sum: number, row: any) => sum + (row.ggr || 0), 0) || 0
    const daysElapsed = dailyData?.length || 1
    const avgDailyGGR = currentRealizedGGR / daysElapsed

    console.log('[Forecast Calculation - Daily]', {
      startDate,
      endDate,
      maxDataDateStr,
      currentRealizedGGR,
      daysElapsed,
      avgDailyGGR
    })

    // Generate all dates in the period
    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDaysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    // ✅ Calculate TOTAL DAYS IN QUARTER (proper dynamic calculation)
    // Target daily MUST be based on full quarter, not selected period!
    
    // Extract quarter number (Q1 -> 1, Q2 -> 2, etc.)
    const quarterNum = parseInt(quarter.replace('Q', ''))
    
    // Calculate quarter start month (Q1=1, Q2=4, Q3=7, Q4=10)
    const qStartMonth = (quarterNum - 1) * 3 + 1
    
    // Quarter start date (always 1st day of start month)
    const quarterStartDate = `${year}-${String(qStartMonth).padStart(2, '0')}-01`
    
    // Quarter end date (last day of end month)
    // Calculate end month
    const qEndMonth = quarterNum * 3
    
    // Calculate last day of end month dynamically
    const tempEndDate = new Date(year, qEndMonth, 0) // Day 0 = last day of previous month
    const qEndDay = tempEndDate.getDate()
    
    const quarterEndDate = `${year}-${String(qEndMonth).padStart(2, '0')}-${String(qEndDay).padStart(2, '0')}`
    
    // Calculate total days in quarter
    const qStart = new Date(quarterStartDate)
    const qEnd = new Date(quarterEndDate)
    const totalDaysInQuarter = Math.ceil((qEnd.getTime() - qStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    console.log('[Target Daily Calculation]', {
      quarter,
      quarterStartDate,
      quarterEndDate,
      totalDaysInQuarter,
      totalTarget,
      dailyTargetValue: totalTarget / totalDaysInQuarter
    })
    
    const categories: string[] = []
    const actualData: number[] = []
    const forecastDataArray: number[] = []
    const targetDataArray: number[] = []
    
    // Daily target = Total Quarter Target / Total Days in Quarter
    const dailyTargetValue = totalTarget > 0 ? totalTarget / totalDaysInQuarter : 0
    
    // Build cumulative forecast
    let cumulativeActual = 0
    const actualDataMap = new Map<string, number>()
    
    // Map actual data by date
    dailyData?.forEach((row: any) => {
      actualDataMap.set(row.date as string, row.ggr || 0)
    })

    // Generate data for each day
    for (let i = 0; i < totalDaysInPeriod; i++) {
      const currentDate = new Date(start)
      currentDate.setDate(start.getDate() + i)
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Category label
      categories.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      
      // Target (flat line)
      targetDataArray.push(dailyTargetValue)
      
      // Check if we have actual data for this date
      if (actualDataMap.has(dateStr)) {
        // Past: Has actual data
        const dailyGGR = actualDataMap.get(dateStr) || 0
        cumulativeActual += dailyGGR
        actualData.push(dailyGGR)
        forecastDataArray.push(cumulativeActual) // Forecast = cumulative actual
      } else if (dateStr > maxDataDateStr) {
        // Future: No data yet, project based on avg daily pace
        actualData.push(0) // No actual data
        
        // Calculate days since last data
        const maxDate = new Date(maxDataDateStr)
        const daysSinceLastData = Math.ceil((currentDate.getTime() - maxDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // Forecast = Total actual + (Avg daily × Days since last data)
        const projectedValue = currentRealizedGGR + (avgDailyGGR * daysSinceLastData)
        forecastDataArray.push(projectedValue)
      } else {
        // Past date but no data (gap in data)
        actualData.push(0)
        forecastDataArray.push(cumulativeActual)
      }
    }

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
    .select('quarter, target_ggr')
    .eq('currency', currency)
    .eq('year', year)

  // Get max date in database to determine which quarter is ongoing
  const { data: maxDateData } = await supabase
    .from('bp_daily_summary_myr')
    .select('date')
    .eq('currency', currency)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const maxDataDate = maxDateData?.date as string || `${year}-12-31`
  const maxMonth = parseInt(maxDataDate.split('-')[1])
  const currentQuarter = maxMonth <= 3 ? 'Q1' : maxMonth <= 6 ? 'Q2' : maxMonth <= 9 ? 'Q3' : 'Q4'

  console.log('[Forecast Calculation - Quarterly]', { maxDataDate, maxMonth, currentQuarter })

  // Build data arrays
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  const actualData: number[] = []
  const targetDataArray: number[] = []
  const forecastDataArray: number[] = []

  for (const q of quarters) {
    // Actual GGR
    const found = quarterData?.find((row: any) => row.period === q)
    const actualGGR = found ? (found.ggr as number) : 0
    actualData.push(actualGGR)

    // Target GGR
    const targetRows = targetData?.filter((row: any) => row.quarter === q)
    const targetGGR = targetRows && targetRows.length > 0 ? targetRows.reduce((sum: number, row: any) => sum + (row.target_ggr || 0), 0) : 0
    targetDataArray.push(targetGGR)

    // Forecast GGR (only for current quarter if ongoing)
    if (q === currentQuarter && actualGGR > 0) {
      // Calculate forecast for current quarter (dynamic calculation)
      
      // Extract quarter number (Q1 -> 1, Q2 -> 2, etc.)
      const quarterNum = parseInt(q.replace('Q', ''))
      
      // Calculate quarter start month (Q1=1, Q2=4, Q3=7, Q4=10)
      const qStartMonth = (quarterNum - 1) * 3 + 1
      
      // Quarter start date (always 1st day of start month)
      const quarterStartDate = `${year}-${String(qStartMonth).padStart(2, '0')}-01`
      
      // Quarter end date (last day of end month)
      const qEndMonth = quarterNum * 3
      
      // Calculate last day of end month dynamically
      const tempEndDate = new Date(year, qEndMonth, 0) // Day 0 = last day of previous month
      const qEndDay = tempEndDate.getDate()
      
      const quarterEndDate = `${year}-${String(qEndMonth).padStart(2, '0')}-${String(qEndDay).padStart(2, '0')}`

      // Calculate days elapsed (from start of quarter to max data date)
      const qStart = new Date(quarterStartDate)
      const maxDate = new Date(maxDataDate)
      const daysElapsed = Math.ceil((maxDate.getTime() - qStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

      // Calculate remaining days (from max data date to end of quarter)
      const qEnd = new Date(quarterEndDate)
      const remainingDays = Math.max(0, Math.ceil((qEnd.getTime() - maxDate.getTime()) / (1000 * 60 * 60 * 24)))

      // Avg Daily GGR
      const avgDailyGGR = actualGGR / daysElapsed

      // Forecast = Current Realized + (Avg Daily × Remaining Days)
      const forecastGGR = actualGGR + (avgDailyGGR * remainingDays)

      console.log(`[Forecast ${q}]`, {
        quarterStartDate,
        quarterEndDate,
        actualGGR,
        daysElapsed,
        avgDailyGGR,
        remainingDays,
        forecastGGR
      })

      forecastDataArray.push(forecastGGR)
    } else {
      // Historical quarters or future quarters: forecast = actual
      forecastDataArray.push(actualGGR)
    }
  }

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
// CHART 4: DA USER VS GGR USER TREND (DUAL LINE CHART)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateDaUserVsGgrUserTrendChart(params: ChartParams): Promise<{
  categories: string[]
  daUserData: number[]
  ggrUserData: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  if (mode === 'daily') {
    // DAILY MODE: Use bp_daily_summary_myr (Pre-calculated columns)
    const { data: mvData } = await supabase
      .from('bp_daily_summary_myr')
      .select('date, da_user, ggr_user')
      .eq('currency', currency)
      .eq('line', 'ALL')
      .gte('date', startDate!)
      .lte('date', endDate!)
      .order('date', { ascending: true })

    if (!mvData || mvData.length === 0) {
      return { categories: [], daUserData: [], ggrUserData: [] }
    }

    const categories: string[] = []
    const daUserData: number[] = []
    const ggrUserData: number[] = []

    mvData.forEach((row: any) => {
      const dateObj = new Date(row.date as string)
      categories.push(dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      
      // ✅ Use pre-calculated columns from MV
      daUserData.push(row.da_user || 0)
      ggrUserData.push(row.ggr_user || 0)
    })

    return { categories, daUserData, ggrUserData }

  } else {
    // QUARTERLY MODE: Use bp_quarter_summary_myr (Pre-calculated columns)
    const { data: quarterData } = await supabase
      .from('bp_quarter_summary_myr')
      .select('period, da_user, ggr_user')
      .eq('currency', currency)
      .eq('year', year)
      .eq('period_type', 'QUARTERLY')
      .eq('line', 'ALL')
      .order('period', { ascending: true })

    if (!quarterData || quarterData.length === 0) {
      return { categories: [], daUserData: [], ggrUserData: [] }
    }

    const categories: string[] = []
    const daUserData: number[] = []
    const ggrUserData: number[] = []

    const allQuarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const dataMap = new Map(quarterData.map((row: any) => [row.period, row]))

    allQuarters.forEach((q: string) => {
      const data = dataMap.get(q)
      categories.push(q)
      
      if (data) {
        // ✅ Use pre-calculated columns from MV
        daUserData.push(data.da_user || 0)
        ggrUserData.push(data.ggr_user || 0)
      } else {
        daUserData.push(0)
        ggrUserData.push(0)
      }
    })

    return { categories, daUserData, ggrUserData }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 5: ATV VS PURCHASE FREQUENCY TREND (DUAL LINE CHART)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateAtvVsPfTrendChart(params: ChartParams): Promise<{
  categories: string[]
  atvData: number[]
  pfData: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  if (mode === 'daily') {
    // DAILY MODE: Use bp_daily_summary_myr (Pre-calculated columns)
    const { data: mvData } = await supabase
      .from('bp_daily_summary_myr')
      .select('date, atv, pf')
      .eq('currency', currency)
      .eq('line', 'ALL')
      .gte('date', startDate!)
      .lte('date', endDate!)
      .order('date', { ascending: true })

    if (!mvData || mvData.length === 0) {
      return { categories: [], atvData: [], pfData: [] }
    }

    const categories: string[] = []
    const atvData: number[] = []
    const pfData: number[] = []

    mvData.forEach((row: any) => {
      const dateObj = new Date(row.date as string)
      categories.push(dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      
      // ✅ Use pre-calculated columns from MV
      atvData.push(row.atv || 0)
      pfData.push(row.pf || 0)
    })

    return { categories, atvData, pfData }

  } else {
    // QUARTERLY MODE: Use bp_quarter_summary_myr (Pre-calculated columns)
    const { data: quarterData } = await supabase
      .from('bp_quarter_summary_myr')
      .select('period, atv, pf')
      .eq('currency', currency)
      .eq('year', year)
      .eq('period_type', 'QUARTERLY')
      .eq('line', 'ALL')
      .order('period', { ascending: true })

    if (!quarterData || quarterData.length === 0) {
      return { categories: [], atvData: [], pfData: [] }
    }

    const categories: string[] = []
    const atvData: number[] = []
    const pfData: number[] = []

    const allQuarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const dataMap = new Map(quarterData.map((row: any) => [row.period, row]))

    allQuarters.forEach((q: string) => {
      const data = dataMap.get(q)
      categories.push(q)
      
      if (data) {
        // ✅ Use pre-calculated columns from MV
        atvData.push(data.atv || 0)
        pfData.push(data.pf || 0)
      } else {
        atvData.push(0)
        pfData.push(0)
      }
    })

    return { categories, atvData, pfData }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 6: AVG BONUS USAGE PER BRAND (BAR CHART)
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
  mvData.forEach((row: any) => {
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

    // AVG Bonus Usage = (bonus + add_bonus - deduct_bonus) / active_member (NO × 100, Currency Format)
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
    dailyData?.forEach((row: any) => {
      if (!groupedByDate[row.date]) {
        groupedByDate[row.date] = {}
      }
      groupedByDate[row.date][row.line] = row.ggr || 0
    })

    const categories = Object.keys(groupedByDate).map(date => {
      const d = new Date(date as string)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })

    const data: Record<string, number[]> = {}
    brands.forEach(brand => {
      data[brand] = Object.values(groupedByDate).map((dateData: any) => dateData[brand] || 0)
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
    quarterData?.forEach((row: any) => {
      if (!groupedByQuarter[row.period]) {
        groupedByQuarter[row.period] = {}
      }
      groupedByQuarter[row.period][row.line] = row.ggr || 0
    })

    const categories = Object.keys(groupedByQuarter)

    const data: Record<string, number[]> = {}
    brands.forEach(brand => {
      data[brand] = Object.values(groupedByQuarter).map((periodData: any) => periodData[brand] || 0)
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

    const currentUserKeys = Array.from(new Set(currentUsers?.map((u: any) => u.userkey) || []))

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

    const currentUserKeys = Array.from(currentUserMap.keys())

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
  const globalPureUserSet: Set<string> = new Set()  // ✅ Track PURE USER globally!
  
  // Track which brands each unique_code belongs to (for Single/Multiple Brand calculation)
  const uniqueCodeBrands: Record<string, Set<string>> = {}

  for (const brand of brands) {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Get Pure User List (filter deposit_cases > 0) - FOR COUNT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let pureUserQuery = supabase
      .from('blue_whale_myr')
      .select('unique_code')
      .eq('currency', currency)
      .eq('line', brand)
      .gt('deposit_cases', 0)           // ✅ Filter: Only users with deposits
      .not('unique_code', 'is', null)

    if (mode === 'daily' && startDate && endDate) {
      pureUserQuery = pureUserQuery.gte('date', startDate).lte('date', endDate)
    } else {
      const quarterMonths: Record<string, string[]> = {
        'Q1': ['January', 'February', 'March'],
        'Q2': ['April', 'May', 'June'],
        'Q3': ['July', 'August', 'September'],
        'Q4': ['October', 'November', 'December']
      }
      const months = quarterMonths[quarter] || []
      pureUserQuery = pureUserQuery.eq('year', year.toString()).in('month', months)
    }

    const { data: pureUserData } = await pureUserQuery
    const pureUserList = Array.from(new Set(pureUserData?.map((row: any) => row.unique_code?.trim()).filter(Boolean) || []))

    // ✅ Add Pure User dari brand ini ke global set (untuk total count)
    pureUserList.forEach((uniqueCode: string) => globalPureUserSet.add(uniqueCode))

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Get ALL transactions per brand (GGR = SEMUA TRANSAKSI!)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let transactionQuery = supabase
      .from('blue_whale_myr')
      .select('unique_code, deposit_amount, withdraw_amount')
      .eq('currency', currency)
      .eq('line', brand)
      // ✅ TIDAK filter Pure User - ambil SEMUA transaksi brand!

    if (mode === 'daily' && startDate && endDate) {
      transactionQuery = transactionQuery.gte('date', startDate).lte('date', endDate)
    } else {
      const quarterMonths: Record<string, string[]> = {
        'Q1': ['January', 'February', 'March'],
        'Q2': ['April', 'May', 'June'],
        'Q3': ['July', 'August', 'September'],
        'Q4': ['October', 'November', 'December']
      }
      const months = quarterMonths[quarter] || []
      transactionQuery = transactionQuery.eq('year', year.toString()).in('month', months)
    }

    const { data: transactionData } = await transactionQuery

    // ✅ Pure User COUNT = dari pureUserList (deposit_cases > 0)
    brandPureUser[brand] = pureUserList.length

    // ✅ Pure User GGR = SUM(deposit - withdraw) SEMUA TRANSAKSI BRAND INI!
    let brandGGR = 0
    const brandUniqueCodeGGR: Record<string, number> = {}
    
    transactionData?.forEach((row: any) => {
      const uniqueCode = row.unique_code?.trim()
      if (!uniqueCode) return

      const ggr = (row.deposit_amount || 0) - (row.withdraw_amount || 0)
      brandGGR += ggr
      
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

    // Pure User GGR per brand = SUM GGR SEMUA transaksi brand ini
    brandPureUserGGR[brand] = brandGGR
  }

  // ✅ Calculate TOTAL Pure User (DISTINCT across all brands - from globalPureUserSet!)
  const totalPureUser = globalPureUserSet.size
  
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
  
  Object.entries(uniqueCodeBrands).forEach(([uniqueCode, brandSet]: [string, Set<string>]) => {
    if (brandSet.size === 1) {
      singleBrandUsers++
      // Add to the single brand this user belongs to
      Array.from(brandSet).forEach((brand: string) => {
        brandSingleUsers[brand]++
      })
    } else if (brandSet.size > 1) {
      multipleBrandUsers++
      // Add to all brands this user belongs to
      Array.from(brandSet).forEach((brand: string) => {
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHART 11: ACTIVE MEMBER VS PURE MEMBER TREND (DOUBLE BAR CHART)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Show Active Member (blue) vs Pure Member (orange) per period
// Pure Member = Pure Active = Active Member - New Depositor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateActiveMemberVsPureMemberTrendChart(params: ChartParams): Promise<{
  categories: string[]
  activeMemberData: number[]
  pureMemberData: number[]
}> {
  const { currency, year, quarter, mode, startDate, endDate } = params

  if (mode === 'daily') {
    // DAILY MODE: Use MV (bp_daily_summary_myr) - Fast pre-calculated data
    const { data: mvData } = await supabase
      .from('bp_daily_summary_myr')
      .select('date, active_member, pure_member')
      .eq('currency', currency)
      .eq('line', 'ALL')
      .gte('date', startDate!)
      .lte('date', endDate!)
      .order('date', { ascending: true })

    if (!mvData || mvData.length === 0) {
      return { categories: [], activeMemberData: [], pureMemberData: [] }
    }

    // Build arrays from MV
    const categories: string[] = []
    const activeMemberData: number[] = []
    const pureMemberData: number[] = []

    mvData.forEach((row: any) => {
      const dateObj = new Date(row.date)
      categories.push(dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      activeMemberData.push(row.active_member || 0)
      pureMemberData.push(row.pure_member || 0)
    })

    return { categories, activeMemberData, pureMemberData }

  } else {
    // QUARTERLY MODE: Use MV (bp_quarter_summary_myr) - Fast pre-calculated data
    const { data: quarterData } = await supabase
      .from('bp_quarter_summary_myr')
      .select('period, active_member, pure_member')
      .eq('currency', currency)
      .eq('year', year)
      .eq('period_type', 'QUARTERLY')
      .eq('line', 'ALL')
      .order('period', { ascending: true })

    if (!quarterData || quarterData.length === 0) {
      return { categories: [], activeMemberData: [], pureMemberData: [] }
    }

    // Build arrays from MV (pre-calculated!)
    const categories: string[] = []
    const activeMemberData: number[] = []
    const pureMemberData: number[] = []

    // Ensure all quarters exist (Q1, Q2, Q3, Q4)
    const allQuarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const dataMap = new Map(quarterData.map((row: any) => [row.period, row]))

    allQuarters.forEach((q: string) => {
      const data = dataMap.get(q)
      categories.push(q)
      activeMemberData.push(data?.active_member || 0)
      pureMemberData.push(data?.pure_member || 0)
    })

    return { categories, activeMemberData, pureMemberData }
  }
}

