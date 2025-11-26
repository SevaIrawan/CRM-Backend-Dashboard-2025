import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { applySquadLeadFilter, applyChannelFilter } from '@/utils/brandAccessHelper'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - TIER TRENDS COMPARISON API
 * ============================================================================
 * 
 * Purpose: Get tier trends comparison data for Period A (last) vs Period B (current)
 * Returns: Daily active count by tier_name for both periods
 * 
 * IMPORTANT:
 * - This API ONLY READS from blue_whale_usc table
 * - tier_name column already synced from tier_usc_v1 via trigger/function
 * - Tier calculation/update is handled in Admin > Tier Management (separate)
 * - Business Performance USC Page has NO connection to tier calculation
 * 
 * Params:
 * - comparePeriod: Required ("Monthly", "3 Month", "6 Month")
 * - brand: Optional (default: "All")
 * - squadLead: Optional (default: "All")
 * - channel: Optional (default: "All")
 * - tierNames: Optional (comma-separated tier names to filter)
 * 
 * Logic:
 * - Period B (current) = Latest period based on comparePeriod
 * - Period A (last) = Previous period with same duration
 * - Count = COUNT(DISTINCT userkey) per tier_name per day
 * - Active = deposit_cases > 0
 * 
 * ============================================================================
 */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']

const MONTH_ORDER: Record<string, number> = {
  'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
  'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
}

interface PeriodInfo {
  months: string[]
  years: number[]
  label: string
  startDate: string
  endDate: string
}

/**
 * Calculate Period B (current) and Period A (last) based on comparePeriod
 */
function calculatePeriods(comparePeriod: string, latestYear: number, latestMonth: string): {
  periodA: PeriodInfo
  periodB: PeriodInfo
} {
  const latestMonthIndex = MONTH_ORDER[latestMonth] - 1 // 0-based
  
  if (comparePeriod === 'Monthly') {
    // Period B: Latest month
    const periodB: PeriodInfo = {
      months: [latestMonth],
      years: [latestYear],
      label: `${latestMonth} ${latestYear}`,
      startDate: `${latestYear}-${String(MONTH_ORDER[latestMonth]).padStart(2, '0')}-01`,
      endDate: `${latestYear}-${String(MONTH_ORDER[latestMonth]).padStart(2, '0')}-${getLastDayOfMonth(latestYear, MONTH_ORDER[latestMonth])}`
    }
    
    // Period A: Previous month
    let prevMonthIndex = latestMonthIndex - 1
    let prevYear = latestYear
    if (prevMonthIndex < 0) {
      prevMonthIndex = 11
      prevYear = latestYear - 1
    }
    const prevMonth = MONTH_NAMES[prevMonthIndex]
    
    const periodA: PeriodInfo = {
      months: [prevMonth],
      years: [prevYear],
      label: `${prevMonth} ${prevYear}`,
      startDate: `${prevYear}-${String(MONTH_ORDER[prevMonth]).padStart(2, '0')}-01`,
      endDate: `${prevYear}-${String(MONTH_ORDER[prevMonth]).padStart(2, '0')}-${getLastDayOfMonth(prevYear, MONTH_ORDER[prevMonth])}`
    }
    
    return { periodA, periodB }
  }
  
  if (comparePeriod === '3 Month') {
    // Period B: Last 3 months (including latest)
    const periodBMonths: string[] = []
    const periodBYears: number[] = []
    let currentMonthIndex = latestMonthIndex
    let currentYear = latestYear
    
    for (let i = 0; i < 3; i++) {
      periodBMonths.unshift(MONTH_NAMES[currentMonthIndex])
      if (!periodBYears.includes(currentYear)) {
        periodBYears.push(currentYear)
      }
      
      currentMonthIndex--
      if (currentMonthIndex < 0) {
        currentMonthIndex = 11
        currentYear--
      }
    }
    
    const periodBStartMonth = periodBMonths[0]
    const periodBEndMonth = periodBMonths[periodBMonths.length - 1]
    const periodBStartYear = periodBYears[0]
    const periodBEndYear = periodBYears[periodBYears.length - 1]
    
    const periodB: PeriodInfo = {
      months: periodBMonths,
      years: periodBYears,
      label: `${periodBStartMonth} ${periodBStartYear} - ${periodBEndMonth} ${periodBEndYear}`,
      startDate: `${periodBStartYear}-${String(MONTH_ORDER[periodBStartMonth]).padStart(2, '0')}-01`,
      endDate: `${periodBEndYear}-${String(MONTH_ORDER[periodBEndMonth]).padStart(2, '0')}-${getLastDayOfMonth(periodBEndYear, MONTH_ORDER[periodBEndMonth])}`
    }
    
    // Period A: Previous 3 months (before Period B)
    const periodAMonths: string[] = []
    const periodAYears: number[] = []
    // Start from 3 months before the start of Period B
    currentMonthIndex = latestMonthIndex - 3
    currentYear = latestYear
    
    if (currentMonthIndex < 0) {
      currentYear--
      currentMonthIndex += 12
    }
    
    for (let i = 0; i < 3; i++) {
      periodAMonths.push(MONTH_NAMES[currentMonthIndex])
      if (!periodAYears.includes(currentYear)) {
        periodAYears.push(currentYear)
      }
      
      currentMonthIndex++
      if (currentMonthIndex > 11) {
        currentMonthIndex = 0
        currentYear++
      }
    }
    
    const periodAStartMonth = periodAMonths[0]
    const periodAEndMonth = periodAMonths[periodAMonths.length - 1]
    const periodAStartYear = periodAYears[0]
    const periodAEndYear = periodAYears[periodAYears.length - 1]
    
    const periodA: PeriodInfo = {
      months: periodAMonths,
      years: periodAYears,
      label: `${periodAStartMonth} ${periodAStartYear} - ${periodAEndMonth} ${periodAEndYear}`,
      startDate: `${periodAStartYear}-${String(MONTH_ORDER[periodAStartMonth]).padStart(2, '0')}-01`,
      endDate: `${periodAEndYear}-${String(MONTH_ORDER[periodAEndMonth]).padStart(2, '0')}-${getLastDayOfMonth(periodAEndYear, MONTH_ORDER[periodAEndMonth])}`
    }
    
    return { periodA, periodB }
  }
  
  if (comparePeriod === '6 Month') {
    // Period B: Last 6 months (including latest)
    const periodBMonths: string[] = []
    const periodBYears: number[] = []
    let currentMonthIndex = latestMonthIndex
    let currentYear = latestYear
    
    for (let i = 0; i < 6; i++) {
      periodBMonths.unshift(MONTH_NAMES[currentMonthIndex])
      if (!periodBYears.includes(currentYear)) {
        periodBYears.push(currentYear)
      }
      
      currentMonthIndex--
      if (currentMonthIndex < 0) {
        currentMonthIndex = 11
        currentYear--
      }
    }
    
    const periodBStartMonth = periodBMonths[0]
    const periodBEndMonth = periodBMonths[periodBMonths.length - 1]
    const periodBStartYear = periodBYears[0]
    const periodBEndYear = periodBYears[periodBYears.length - 1]
    
    const periodB: PeriodInfo = {
      months: periodBMonths,
      years: periodBYears,
      label: `${periodBStartMonth} ${periodBStartYear} - ${periodBEndMonth} ${periodBEndYear}`,
      startDate: `${periodBStartYear}-${String(MONTH_ORDER[periodBStartMonth]).padStart(2, '0')}-01`,
      endDate: `${periodBEndYear}-${String(MONTH_ORDER[periodBEndMonth]).padStart(2, '0')}-${getLastDayOfMonth(periodBEndYear, MONTH_ORDER[periodBEndMonth])}`
    }
    
    // Period A: Previous 6 months (before Period B)
    const periodAMonths: string[] = []
    const periodAYears: number[] = []
    // Start from 6 months before the start of Period B
    currentMonthIndex = latestMonthIndex - 6
    currentYear = latestYear
    
    if (currentMonthIndex < 0) {
      currentYear--
      currentMonthIndex += 12
    }
    
    for (let i = 0; i < 6; i++) {
      periodAMonths.push(MONTH_NAMES[currentMonthIndex])
      if (!periodAYears.includes(currentYear)) {
        periodAYears.push(currentYear)
      }
      
      currentMonthIndex++
      if (currentMonthIndex > 11) {
        currentMonthIndex = 0
        currentYear++
      }
    }
    
    const periodAStartMonth = periodAMonths[0]
    const periodAEndMonth = periodAMonths[periodAMonths.length - 1]
    const periodAStartYear = periodAYears[0]
    const periodAEndYear = periodAYears[periodAYears.length - 1]
    
    const periodA: PeriodInfo = {
      months: periodAMonths,
      years: periodAYears,
      label: `${periodAStartMonth} ${periodAStartYear} - ${periodAEndMonth} ${periodAEndYear}`,
      startDate: `${periodAStartYear}-${String(MONTH_ORDER[periodAStartMonth]).padStart(2, '0')}-01`,
      endDate: `${periodAEndYear}-${String(MONTH_ORDER[periodAEndMonth]).padStart(2, '0')}-${getLastDayOfMonth(periodAEndYear, MONTH_ORDER[periodAEndMonth])}`
    }
    
    return { periodA, periodB }
  }
  
  // Default fallback (should not reach here)
  throw new Error(`Invalid comparePeriod: ${comparePeriod}`)
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Get daily active count by tier_group for a period (DEFAULT MODE)
 * Count = COUNT(DISTINCT userkey) per tier_group per day
 * Active = deposit_cases > 0
 */
async function getDailyActiveCountByTierGroup(
  period: PeriodInfo,
  brand: string,
  squadLead: string,
  channel: string,
  userAllowedBrands: string[] | null
): Promise<Record<string, number[]>> {
  let dailyQuery = supabase
    .from('blue_whale_usc')
    .select('date, userkey, tier_group')
    .eq('currency', 'USC')
    .gte('date', period.startDate)
    .lte('date', period.endDate)
    .gt('deposit_cases', 0)
    .not('tier_group', 'is', null)
  
  if (brand && brand !== 'All' && brand !== 'ALL') {
    dailyQuery = dailyQuery.eq('line', brand)
  }
  
  dailyQuery = applySquadLeadFilter(dailyQuery, squadLead || 'All')
  dailyQuery = applyChannelFilter(dailyQuery, channel || 'All')
  
  if (userAllowedBrands && userAllowedBrands.length > 0) {
    dailyQuery = dailyQuery.in('line', userAllowedBrands)
  }
  
  const { data: dailyData, error: dailyError } = await dailyQuery
  
  if (dailyError) {
    console.error('❌ [Tier Trends] Error fetching daily data:', dailyError)
    throw dailyError
  }
  
  const dateTierMap = new Map<string, Map<string, Set<string>>>()
  
  dailyData?.forEach(record => {
    const date = record.date as string
    const userkey = record.userkey as string
    const tierGroup = record.tier_group as string
    
    if (!tierGroup) return
    
    if (!dateTierMap.has(date)) {
      dateTierMap.set(date, new Map())
    }
    
    const tierMap = dateTierMap.get(date)!
    if (!tierMap.has(tierGroup)) {
      tierMap.set(tierGroup, new Set())
    }
    
    tierMap.get(tierGroup)!.add(userkey)
  })
  
  const allDates = Array.from(dateTierMap.keys()).sort()
  
  const tierGroups = ['High Value', 'Medium Value', 'Low Value', 'Potential']
  const result: Record<string, number[]> = {}
  
  tierGroups.forEach(tierGroup => {
    result[tierGroup] = allDates.map(date => {
      const tierMap = dateTierMap.get(date)
      if (!tierMap) return 0
      const userSet = tierMap.get(tierGroup)
      return userSet ? userSet.size : 0
    })
  })
  
  return result
}

/**
 * Get daily active count by tier_name for a period (FILTERED MODE)
 * Count = COUNT(DISTINCT userkey) per tier_name per day
 * Active = deposit_cases > 0
 */
async function getDailyActiveCountByTierName(
  period: PeriodInfo,
  brand: string,
  squadLead: string,
  channel: string,
  userAllowedBrands: string[] | null,
  tierNameFilter: string[] = []
): Promise<Record<string, number[]>> {
  let dailyQuery = supabase
    .from('blue_whale_usc')
    .select('date, userkey, tier_name')
    .eq('currency', 'USC')
    .gte('date', period.startDate)
    .lte('date', period.endDate)
    .gt('deposit_cases', 0)
    .not('tier_name', 'is', null)
  
  if (brand && brand !== 'All' && brand !== 'ALL') {
    dailyQuery = dailyQuery.eq('line', brand)
  }
  
  dailyQuery = applySquadLeadFilter(dailyQuery, squadLead || 'All')
  dailyQuery = applyChannelFilter(dailyQuery, channel || 'All')
  
  if (userAllowedBrands && userAllowedBrands.length > 0) {
    dailyQuery = dailyQuery.in('line', userAllowedBrands)
  }
  
  // Apply tier_name filter
  if (tierNameFilter && tierNameFilter.length > 0) {
    dailyQuery = dailyQuery.in('tier_name', tierNameFilter)
  }
  
  const { data: dailyData, error: dailyError } = await dailyQuery
  
  if (dailyError) {
    console.error('❌ [Tier Trends] Error fetching daily data:', dailyError)
    throw dailyError
  }
  
  const dateTierMap = new Map<string, Map<string, Set<string>>>()
  
  dailyData?.forEach(record => {
    const date = record.date as string
    const userkey = record.userkey as string
    const tierName = record.tier_name as string
    
    if (!tierName) return
    
    if (!dateTierMap.has(date)) {
      dateTierMap.set(date, new Map())
    }
    
    const tierMap = dateTierMap.get(date)!
    if (!tierMap.has(tierName)) {
      tierMap.set(tierName, new Set())
    }
    
    tierMap.get(tierName)!.add(userkey)
  })
  
  const allDates = Array.from(dateTierMap.keys()).sort()
  
  const allTierNames = new Set<string>()
  dateTierMap.forEach(tierMap => {
    tierMap.forEach((_, tierName) => allTierNames.add(tierName))
  })
  
  const result: Record<string, number[]> = {}
  
  allTierNames.forEach(tierName => {
    result[tierName] = allDates.map(date => {
      const tierMap = dateTierMap.get(date)
      if (!tierMap) return 0
      const userSet = tierMap.get(tierName)
      return userSet ? userSet.size : 0
    })
  })
  
  return result
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const comparePeriod = searchParams.get('comparePeriod')
    const brand = searchParams.get('brand') || 'All'
    const squadLead = searchParams.get('squadLead') || 'All'
    const channel = searchParams.get('channel') || 'All'
    const tierNamesParam = searchParams.get('tierNames')
    const tierNameFilter = tierNamesParam
      ? tierNamesParam.split(',').map(name => name.trim()).filter(Boolean)
      : []
    
    // Custom date range parameters (optional)
    const periodAStart = searchParams.get('periodAStart')
    const periodAEnd = searchParams.get('periodAEnd')
    const periodBStart = searchParams.get('periodBStart')
    const periodBEnd = searchParams.get('periodBEnd')
    
    // Check if custom dates are provided
    const useCustomDates = periodAStart && periodAEnd && periodBStart && periodBEnd
    
    if (!useCustomDates && !comparePeriod) {
      return NextResponse.json({
        success: false,
        error: 'Either comparePeriod or custom dates (periodAStart, periodAEnd, periodBStart, periodBEnd) are required'
      }, { status: 400 })
    }
    
    if (!useCustomDates && !['Monthly', '3 Month', '6 Month'].includes(comparePeriod || '')) {
      return NextResponse.json({
        success: false,
        error: 'comparePeriod must be "Monthly", "3 Month", or "6 Month"'
      }, { status: 400 })
    }
    
    // Get user's allowed brands from header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? 
      JSON.parse(userAllowedBrandsHeader) : null
    
    let periodA: PeriodInfo
    let periodB: PeriodInfo
    
    if (useCustomDates) {
      // Use custom dates provided
      periodA = {
        months: [],
        years: [],
        label: `${periodAStart} ~ ${periodAEnd}`,
        startDate: periodAStart,
        endDate: periodAEnd
      }
      periodB = {
        months: [],
        years: [],
        label: `${periodBStart} ~ ${periodBEnd}`,
        startDate: periodBStart,
        endDate: periodBEnd
      }
      
      console.log('📊 [Tier Trends] Using custom dates:', {
        periodA: periodA.label,
        periodB: periodB.label
      })
    } else {
      // Get latest month/year from blue_whale_usc
      const { data: latestRecord, error: latestError } = await supabase
        .from('blue_whale_usc')
        .select('year, month')
        .eq('currency', 'USC')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
      
      if (latestError) {
        console.error('❌ [Tier Trends] Error fetching latest record:', latestError)
        throw latestError
      }
      
      if (!latestRecord || latestRecord.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No tier data available'
        }, { status: 404 })
      }
      
      const latestYear = latestRecord[0].year as number
      const latestMonth = latestRecord[0].month as string
      
      // Calculate periods using comparePeriod
      const calculated = calculatePeriods(comparePeriod!, latestYear, latestMonth)
      periodA = calculated.periodA
      periodB = calculated.periodB
      
      console.log('📊 [Tier Trends] Periods calculated:', {
        comparePeriod,
        periodA: periodA.label,
        periodB: periodB.label
      })
    }
    
    // Determine which function to use based on tierNameFilter
    // If tierNameFilter is empty or not provided, use tier_group (DEFAULT)
    // If tierNameFilter has values, use tier_name (FILTERED)
    const useTierNameMode = tierNameFilter && tierNameFilter.length > 0
    
    console.log('📊 [Tier Trends] Mode:', useTierNameMode ? 'tier_name (filtered)' : 'tier_group (default)')
    
    let periodAData: Record<string, number[]>
    let periodBData: Record<string, number[]>
    
    if (useTierNameMode) {
      // FILTERED MODE: Use tier_name
      [periodAData, periodBData] = await Promise.all([
        getDailyActiveCountByTierName(periodA, brand, squadLead, channel, userAllowedBrands, tierNameFilter),
        getDailyActiveCountByTierName(periodB, brand, squadLead, channel, userAllowedBrands, tierNameFilter)
      ])
    } else {
      // DEFAULT MODE: Use tier_group
      [periodAData, periodBData] = await Promise.all([
        getDailyActiveCountByTierGroup(periodA, brand, squadLead, channel, userAllowedBrands),
        getDailyActiveCountByTierGroup(periodB, brand, squadLead, channel, userAllowedBrands)
      ])
    }
    
    // Get date labels for both periods
    const periodADates = await getDateLabels(periodA)
    const periodBDates = await getDateLabels(periodB)
    
    return NextResponse.json({
      success: true,
      data: {
        comparePeriod,
        periodA: {
          label: periodA.label,
          months: periodA.months,
          startDate: periodA.startDate,
          endDate: periodA.endDate,
          dates: periodADates,
          data: periodAData
        },
        periodB: {
          label: periodB.label,
          months: periodB.months,
          startDate: periodB.startDate,
          endDate: periodB.endDate,
          dates: periodBDates,
          data: periodBData
        }
      }
    })
    
  } catch (error) {
    console.error('❌ [Tier Trends] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Get date labels for a period (Day 1, Day 2, etc.)
 * Returns array of day labels matching the data array length
 */
async function getDateLabels(period: PeriodInfo): Promise<string[]> {
  // Get all unique dates from blue_whale_usc for this period
  const { data, error } = await supabase
    .from('blue_whale_usc')
    .select('date')
    .eq('currency', 'USC')
    .gte('date', period.startDate)
    .lte('date', period.endDate)
    .gt('deposit_cases', 0)
  
  if (error || !data) {
    return []
  }
  
  const uniqueDates = Array.from(new Set(data.map(r => r.date as string))).sort()
  
  // Return as "Day 1", "Day 2", etc.
  return uniqueDates.map((_, index) => `Day ${index + 1}`)
}

