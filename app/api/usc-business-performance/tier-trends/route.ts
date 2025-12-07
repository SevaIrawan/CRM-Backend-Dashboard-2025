import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { applySquadLeadFilter, applyChannelFilter } from '@/utils/brandAccessHelper'
import { validatePeriodRanges, validateDateFormat } from '../_utils/dateValidation'

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
 * Format date to DD MMM format (e.g., "01 Jan", "15 Dec")
 */
function formatDateLabel(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  
  const day = String(date.getDate()).padStart(2, '0')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = monthNames[date.getMonth()]
  
  return `${day} ${month}`
}

function addDays(base: string, delta: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function diffDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
}

/**
 * Get max available date (active rows only) respecting filters
 */
async function getMaxAvailableDate(
  brand: string,
  squadLead: string,
  channel: string,
  userAllowedBrands: string[] | null
): Promise<string | null> {
  let q = supabase
    .from('blue_whale_usc')
    .select('date')
    .eq('currency', 'USC')
    .gt('deposit_cases', 0)
    .order('date', { ascending: false })
    .limit(1)
  
  if (brand && brand !== 'All' && brand !== 'ALL') {
    q = q.eq('line', brand)
  }
  q = applySquadLeadFilter(q, squadLead || 'All')
  q = applyChannelFilter(q, channel || 'All')
  if (userAllowedBrands && userAllowedBrands.length > 0) {
    q = q.in('line', userAllowedBrands)
  }

  const { data, error } = await q
  if (error) {
    console.error('❌ [Tier Trends] Error fetching max available date:', error)
    return null
  }
  if (data && data.length > 0) {
    const first = data[0] as { date?: string | null }
    return first?.date ?? null
  }
  return null
}

/**
 * Generate all dates in a range (YYYY-MM-DD format)
 * CRITICAL: This ensures chart shows ALL dates in period, even if no data exists
 */
function generateAllDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('❌ [Tier Trends] Invalid date range:', { startDate, endDate })
    return []
  }
  
  // Reset time to midnight for consistent comparison
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  
  const currentDate = new Date(start)
  
  while (currentDate <= end) {
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    dates.push(`${year}-${month}-${day}`)
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return dates
}

/**
 * Get daily active count by tier_group for a period (DEFAULT MODE)
 * Count = COUNT(DISTINCT userkey) per tier_group per day
 * Active = deposit_cases > 0
 * Returns both data and dates (eliminates redundant query)
 */
async function getDailyActiveCountByTierGroup(
  period: PeriodInfo,
  brand: string,
  squadLead: string,
  channel: string,
  userAllowedBrands: string[] | null
): Promise<{ data: Record<string, number[]>, dates: string[] }> {
  // ✅ BATCH FETCHING for large datasets
  // CRITICAL: Store period dates in constants to ensure they're used correctly
  const queryStartDate = period.startDate
  const queryEndDate = period.endDate
  
  const batchSize = 10000
  let allData: any[] = []
  let offset = 0
  let hasMore = true
  
  while (hasMore) {
    // CRITICAL: Rebuild query for each batch to ensure all filters are preserved
    // This prevents filter loss when reusing query builder
    let batchQuery = supabase
      .from('blue_whale_usc')
      .select('date, userkey, tier_group')
      .eq('currency', 'USC')
      .gte('date', queryStartDate) // CRITICAL: Use constant, not period.startDate
      .lte('date', queryEndDate)   // CRITICAL: Use constant, not period.endDate
      .gt('deposit_cases', 0)
      .not('tier_group', 'is', null)
    
    if (brand && brand !== 'All' && brand !== 'ALL') {
      batchQuery = batchQuery.eq('line', brand)
    }
    
    batchQuery = applySquadLeadFilter(batchQuery, squadLead || 'All')
    batchQuery = applyChannelFilter(batchQuery, channel || 'All')
    
    if (userAllowedBrands && userAllowedBrands.length > 0) {
      batchQuery = batchQuery.in('line', userAllowedBrands)
    }
    
    // Apply pagination
    batchQuery = batchQuery.range(offset, offset + batchSize - 1)
    const batchResult = await batchQuery.order('date', { ascending: true })
    
    if (batchResult.error) {
      console.error('❌ [Tier Trends] Error fetching batch data:', batchResult.error)
      throw batchResult.error
    }
    
    const batchData = batchResult.data || []
    allData = [...allData, ...batchData]
    
    hasMore = batchData.length === batchSize
    offset += batchSize
    
    // Safety limit
    if (allData.length > 500000) {
      console.log('⚠️ [Tier Trends] Safety limit reached: 500,000 records')
      break
    }
  }
  
  const dateTierMap = new Map<string, Map<string, Set<string>>>()
  
  allData.forEach(record => {
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
  
  // ✅ CRITICAL: Generate ALL dates in period range (not just dates with data)
  // This ensures chart shows complete date range even if some days have no data
  const allDatesInRange = generateAllDatesInRange(period.startDate, period.endDate)
  
  // ✅ Format dates to DD MMM format
  const formattedDates = allDatesInRange.map(formatDateLabel)
  
  const tierGroups = ['High Value', 'Medium Value', 'Low Value', 'Potential']
  const result: Record<string, number[]> = {}
  
  tierGroups.forEach(tierGroup => {
    result[tierGroup] = allDatesInRange.map(date => {
      const tierMap = dateTierMap.get(date)
      if (!tierMap) return 0
      const userSet = tierMap.get(tierGroup)
      return userSet ? userSet.size : 0
    })
  })
  
  return { data: result, dates: formattedDates }
}

/**
 * Get daily active count by tier_name for a period (FILTERED MODE)
 * Count = COUNT(DISTINCT userkey) per tier_name per day
 * Active = deposit_cases > 0
 * Returns both data and dates (eliminates redundant query)
 */
async function getDailyActiveCountByTierName(
  period: PeriodInfo,
  brand: string,
  squadLead: string,
  channel: string,
  userAllowedBrands: string[] | null,
  tierNameFilter: string[] = []
): Promise<{ data: Record<string, number[]>, dates: string[] }> {
  // ✅ BATCH FETCHING for large datasets
  // CRITICAL: Store period dates in constants to ensure they're used correctly
  const queryStartDate = period.startDate
  const queryEndDate = period.endDate
  
  const batchSize = 10000
  let allData: any[] = []
  let offset = 0
  let hasMore = true
  
  while (hasMore) {
    // CRITICAL: Rebuild query for each batch to ensure all filters are preserved
    // This prevents filter loss when reusing query builder
    let batchQuery = supabase
      .from('blue_whale_usc')
      .select('date, userkey, tier_name')
      .eq('currency', 'USC')
      .gte('date', queryStartDate) // CRITICAL: Use constant, not period.startDate
      .lte('date', queryEndDate)   // CRITICAL: Use constant, not period.endDate
      .gt('deposit_cases', 0)
      .not('tier_name', 'is', null)
    
    if (brand && brand !== 'All' && brand !== 'ALL') {
      batchQuery = batchQuery.eq('line', brand)
    }
    
    batchQuery = applySquadLeadFilter(batchQuery, squadLead || 'All')
    batchQuery = applyChannelFilter(batchQuery, channel || 'All')
    
    if (userAllowedBrands && userAllowedBrands.length > 0) {
      batchQuery = batchQuery.in('line', userAllowedBrands)
    }
    
    // Apply tier_name filter
    if (tierNameFilter && tierNameFilter.length > 0) {
      batchQuery = batchQuery.in('tier_name', tierNameFilter)
    }
    
    // Apply pagination
    batchQuery = batchQuery.range(offset, offset + batchSize - 1)
    const batchResult = await batchQuery.order('date', { ascending: true })
    
    if (batchResult.error) {
      console.error('❌ [Tier Trends] Error fetching batch data:', batchResult.error)
      throw batchResult.error
    }
    
    const batchData = batchResult.data || []
    allData = [...allData, ...batchData]
    
    hasMore = batchData.length === batchSize
    offset += batchSize
    
    // Safety limit
    if (allData.length > 500000) {
      console.log('⚠️ [Tier Trends] Safety limit reached: 500,000 records')
      break
    }
  }
  
  const dateTierMap = new Map<string, Map<string, Set<string>>>()
  
  allData.forEach(record => {
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
  
  // ✅ CRITICAL: Generate ALL dates in period range (not just dates with data)
  // This ensures chart shows complete date range even if some days have no data
  const allDatesInRange = generateAllDatesInRange(period.startDate, period.endDate)
  
  // ✅ Format dates to DD MMM format
  const formattedDates = allDatesInRange.map(formatDateLabel)
  
  const allTierNames = new Set<string>()
  dateTierMap.forEach(tierMap => {
    tierMap.forEach((_, tierName) => allTierNames.add(tierName))
  })
  
  const result: Record<string, number[]> = {}
  
  allTierNames.forEach(tierName => {
    result[tierName] = allDatesInRange.map(date => {
      const tierMap = dateTierMap.get(date)
      if (!tierMap) return 0
      const userSet = tierMap.get(tierName)
      return userSet ? userSet.size : 0
    })
  })
  
  return { data: result, dates: formattedDates }
}

// ✅ Simple in-memory cache (TTL: 5 minutes)
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Generate cache key from request parameters
 */
function generateCacheKey(
  comparePeriod: string | null,
  periodAStart: string | null,
  periodAEnd: string | null,
  periodBStart: string | null,
  periodBEnd: string | null,
  brand: string,
  squadLead: string,
  channel: string,
  tierNameFilter: string[]
): string {
  const keyParts = [
    comparePeriod || 'custom',
    periodAStart || '',
    periodAEnd || '',
    periodBStart || '',
    periodBEnd || '',
    brand,
    squadLead,
    channel,
    tierNameFilter.sort().join(',')
  ]
  return `tier-trends:${keyParts.join('|')}`
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
    
    // ✅ Validate custom date ranges if provided
    if (useCustomDates) {
      const dateValidation = validatePeriodRanges(periodAStart, periodAEnd, periodBStart, periodBEnd)
      if (!dateValidation.valid) {
        return NextResponse.json({
          success: false,
          error: dateValidation.error
        }, { status: 400 })
      }
    }
    
    // ✅ Check cache first
    const cacheKey = generateCacheKey(
      comparePeriod,
      periodAStart,
      periodAEnd,
      periodBStart,
      periodBEnd,
      brand,
      squadLead,
      channel,
      tierNameFilter
    )
    
    const cachedResult = cache.get(cacheKey)
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      console.log('✅ [Tier Trends] Using cached result')
      return NextResponse.json(cachedResult.data)
    }
    
    // Get user's allowed brands from header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? 
      JSON.parse(userAllowedBrandsHeader) : null
    
    let periodA: PeriodInfo
    let periodB: PeriodInfo
    
    // Get max available data date with filters (active rows)
    const maxDataDate = await getMaxAvailableDate(brand, squadLead, channel, userAllowedBrands)

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

    // ✅ Cap periods to max available data date to avoid showing future dates with zero data
    if (maxDataDate) {
      const durationB = diffDays(periodB.startDate, periodB.endDate)
      if (periodB.endDate > maxDataDate) {
        const newEndB = maxDataDate
        const newStartB = addDays(newEndB, -(durationB - 1))
        const newEndA = addDays(newStartB, -1)
        const newStartA = addDays(newEndA, -(durationB - 1))

        periodB = {
          ...periodB,
          startDate: newStartB,
          endDate: newEndB,
          label: `${newStartB} ~ ${newEndB}`
        }
        periodA = {
          ...periodA,
          startDate: newStartA,
          endDate: newEndA,
          label: `${newStartA} ~ ${newEndA}`
        }

        console.log('📊 [Tier Trends] Capped to max data date:', {
          maxDataDate,
          durationDays: durationB,
          periodA: periodA.label,
          periodB: periodB.label
        })
      }
    }
    
    // Determine which function to use based on tierNameFilter
    // If tierNameFilter is empty or not provided, use tier_group (DEFAULT)
    // If tierNameFilter has values, use tier_name (FILTERED)
    const useTierNameMode = tierNameFilter && tierNameFilter.length > 0
    
    console.log('📊 [Tier Trends] Mode:', useTierNameMode ? 'tier_name (filtered)' : 'tier_group (default)')
    
    let periodAResult: { data: Record<string, number[]>, dates: string[] }
    let periodBResult: { data: Record<string, number[]>, dates: string[] }
    
    if (useTierNameMode) {
      // FILTERED MODE: Use tier_name
      [periodAResult, periodBResult] = await Promise.all([
        getDailyActiveCountByTierName(periodA, brand, squadLead, channel, userAllowedBrands, tierNameFilter),
        getDailyActiveCountByTierName(periodB, brand, squadLead, channel, userAllowedBrands, tierNameFilter)
      ])
    } else {
      // DEFAULT MODE: Use tier_group
      [periodAResult, periodBResult] = await Promise.all([
        getDailyActiveCountByTierGroup(periodA, brand, squadLead, channel, userAllowedBrands),
        getDailyActiveCountByTierGroup(periodB, brand, squadLead, channel, userAllowedBrands)
      ])
    }
    
    // ✅ Dates already included in result (no need for separate query)
    const responseData = {
      success: true,
      data: {
        comparePeriod,
        periodA: {
          label: periodA.label,
          months: periodA.months,
          startDate: periodA.startDate,
          endDate: periodA.endDate,
          dates: periodAResult.dates, // ✅ Already formatted as DD MMM
          data: periodAResult.data
        },
        periodB: {
          label: periodB.label,
          months: periodB.months,
          startDate: periodB.startDate,
          endDate: periodB.endDate,
          dates: periodBResult.dates, // ✅ Already formatted as DD MMM
          data: periodBResult.data
        }
      }
    }
    
    // ✅ Cache the result
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    })
    
    // ✅ Clean up old cache entries (every 10 requests)
    if (cache.size > 100) {
      const now = Date.now()
      // Use Array.from() for compatibility with lower TypeScript targets
      Array.from(cache.entries()).forEach(([key, value]) => {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key)
        }
      })
    }
    
    return NextResponse.json(responseData)
    
  } catch (error) {
    console.error('❌ [Tier Trends] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


