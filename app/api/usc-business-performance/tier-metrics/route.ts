import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { applySquadLeadFilter, applyChannelFilter } from '@/utils/brandAccessHelper'
import { validatePeriodRanges } from '../_utils/dateValidation'

// Mapping tier lokal (urut A→Z terendah→tertinggi, sama seperti Tier Movement)
const TIER_DEFINITIONS = [
  { num: 1, name: 'Regular' },
  { num: 2, name: 'Tier 1' },
  { num: 3, name: 'Tier 2' },
  { num: 4, name: 'Tier P1' },
  { num: 5, name: 'Tier P2' },
  { num: 6, name: 'Tier ND_P' },
  { num: 7, name: 'Tier 3' },
  { num: 8, name: 'Tier 4' },
  { num: 9, name: 'Tier 5' },
  { num: 10, name: 'Super VIP' }
]

const TIER_NAMES: Record<number, string> = TIER_DEFINITIONS.reduce((acc, cur) => {
  acc[cur.num] = cur.name
  return acc
}, {} as Record<number, string>)

const TIER_NAME_MAP = (() => {
  const map = new Map<string, number>()
  const add = (label: string, num: number) => {
    const norm = label.toLowerCase()
    map.set(norm, num)
    map.set(norm.replace(/\s|_/g, ''), num)
  }
  TIER_DEFINITIONS.forEach(({ num, name }) => {
    add(name, num)
    if (name.toLowerCase().startsWith('tier ')) {
      add(name.substring(5), num)
    }
  })
  // alias eksplisit
  add('nd_p', 8)
  add('ndp', 8)
  add('p1', 9)
  add('p2', 10)
  return map
})()

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - TIER METRICS COMPARISON API
 * ============================================================================
 * 
 * Purpose: Get tier metrics comparison data for Period A vs Period B
 * Returns: 
 * - Customer Count Distribution by tier (pie chart data)
 * - Deposit Amount (DA) by Tier (bar chart data)
 * - GGR by Tier (Profit/Loss) (bar chart data)
 * 
 * IMPORTANT:
 * - This API ONLY READS from blue_whale_usc table
 * - Tier determination: Highest tier (lowest tier_number) in period
 * - Active = deposit_cases > 0
 * - GGR = deposit_amount - withdraw_amount
 * 
 * Params:
 * - periodAStart: Required (YYYY-MM-DD)
 * - periodAEnd: Required (YYYY-MM-DD)
 * - periodBStart: Required (YYYY-MM-DD)
 * - periodBEnd: Required (YYYY-MM-DD)
 * - brand: Optional (default: "All")
 * - squadLead: Optional (default: "All")
 * - channel: Optional (default: "All")
 * 
 * ============================================================================
 */

interface TierMetricsData {
  tierName: string
  customerCount: number
  depositAmount: number
  ggr: number
}

interface PeriodMetrics {
  period: 'A' | 'B'
  startDate: string
  endDate: string
  totalCustomers: number
  totalDepositAmount: number
  totalGGR: number
  winRate: number // GGR / Deposit Amount * 100
  tierMetrics: TierMetricsData[]
}

interface TierMetricsResponse {
  success: boolean
  data?: {
    periodA: PeriodMetrics
    periodB: PeriodMetrics
  }
  error?: string
}

/**
 * Helper: Get tier number from tier name
 */
function getTierNumberFromName(tierName: string): number | null {
  if (!tierName) return null
  const norm = tierName.toLowerCase().trim()
  const num = TIER_NAME_MAP.get(norm) ?? TIER_NAME_MAP.get(norm.replace(/\s|_/g, ''))
  if (num && !isNaN(num)) return num
  return null
}

/**
 * Helper: Get tier name from tier number
 */
function getTierNameFromNumber(tierNumber: number): string {
  return TIER_NAMES[tierNumber] || 'Unknown'
}

/**
 * Helper: Aggregate tier metrics for a date range
 * Returns aggregated data with tier determination (highest tier in period)
 */
async function aggregateTierMetricsByDateRange(
  startDate: string,
  endDate: string,
  line?: string,
  squadLead?: string,
  channel?: string,
  userAllowedBrands?: string[] | null,
  periodLabel?: string // Optional label for logging (e.g., "Period A" or "Period B")
): Promise<{
  customerCountByTier: Map<string, Set<string>> // tier_name -> Set<userkey>
  depositAmountByTier: Map<string, number> // tier_name -> total deposit_amount
  ggrByTier: Map<string, number> // tier_name -> total ggr
}> {
  const periodPrefix = periodLabel ? `[${periodLabel}]` : ''
  console.log(`📊 ${periodPrefix} [Tier Metrics Aggregate] Fetching data for date range: ${startDate} to ${endDate}`)
  
  // Validate dates
  if (!startDate || !endDate) {
    console.error(`❌ ${periodPrefix} [Tier Metrics Aggregate] ERROR: Missing date range - startDate: ${startDate}, endDate: ${endDate}`)
    throw new Error('Start date and end date are required')
  }
  
  if (startDate > endDate) {
    console.error(`❌ ${periodPrefix} [Tier Metrics Aggregate] ERROR: Invalid date range - startDate (${startDate}) > endDate (${endDate})`)
    throw new Error(`Invalid date range: start date ${startDate} is after end date ${endDate}`)
  }
  
  // Batch fetch for large datasets
  const BATCH_SIZE = 10000
  let allData: any[] = []
  let offset = 0
  let hasMore = true
  
  console.log(`📊 ${periodPrefix} [Tier Metrics Aggregate] Query filters - date range: ${startDate} to ${endDate}, line: ${line || 'All'}, squadLead: ${squadLead || 'All'}, channel: ${channel || 'All'}`)

  // CRITICAL: Store date range in local constants to ensure they are not accidentally modified
  const queryStartDate = startDate
  const queryEndDate = endDate

  while (hasMore) {
    // IMPORTANT: Rebuild query for each batch to ensure all filters are preserved
    // CRITICAL: Use queryStartDate and queryEndDate constants - these are the date range for THIS period
    // CRITICAL: Add ordering for data consistency across batches
    let batchQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, tier_name, deposit_amount, withdraw_amount, deposit_cases, date')
      .eq('currency', 'USC')
      .gte('date', queryStartDate) // CRITICAL: Use queryStartDate constant
      .lte('date', queryEndDate)   // CRITICAL: Use queryEndDate constant
      .not('tier_name', 'is', null)
      .gt('deposit_cases', 0) // Only active users (consistency with movement logic)
      .order('userkey', { ascending: true }) // CRITICAL: Ordering for consistency
      .order('date', { ascending: true })     // CRITICAL: Ordering for consistency
      .range(offset, offset + BATCH_SIZE - 1)
    
    if (line && line !== 'All' && line !== 'ALL') {
      batchQuery = batchQuery.eq('line', line)
    }
    
    batchQuery = applySquadLeadFilter(batchQuery, squadLead || 'All')
    batchQuery = applyChannelFilter(batchQuery, channel || 'All')
    
    if (userAllowedBrands && userAllowedBrands.length > 0) {
      batchQuery = batchQuery.in('line', userAllowedBrands)
    }
    
    const { data, error } = await batchQuery

    if (error) {
      console.error(`❌ ${periodPrefix} [Tier Metrics Aggregate] Error fetching batch at offset ${offset} for date range ${startDate} to ${endDate}:`, error)
      break
    }
    
    // CRITICAL: Log actual date range used in query for debugging
    if (offset === 0) {
      console.log(`📊 ${periodPrefix} [Tier Metrics Aggregate] Query executed with date range: .gte('date', '${startDate}') .lte('date', '${endDate}')`)
    }

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      // Verify that fetched data is within date range
      const invalidDates = data.filter((row: any) => {
        const rowDate = row.date
        return !rowDate || rowDate < queryStartDate || rowDate > queryEndDate
      })
      
      if (invalidDates.length > 0) {
        console.warn(`⚠️ ${periodPrefix} [Tier Metrics Aggregate] Found ${invalidDates.length} records outside date range ${queryStartDate} to ${queryEndDate}`)
      }
      
      // CRITICAL: Filter out invalid dates before adding to allData
      const validData = data.filter((row: any) => {
        const rowDate = row.date
        return rowDate && rowDate >= queryStartDate && rowDate <= queryEndDate
      })
      
      if (validData.length !== data.length) {
        console.warn(`⚠️ ${periodPrefix} [Tier Metrics Aggregate] Filtered ${data.length - validData.length} invalid records in batch at offset ${offset}`)
      }
      
      allData.push(...validData)
      hasMore = data.length === BATCH_SIZE
      offset += BATCH_SIZE
      
      // Log progress for first batch only
      if (offset === BATCH_SIZE) {
        console.log(`📊 ${periodPrefix} [Tier Metrics Aggregate] First batch fetched: ${data.length} records for date range ${startDate} to ${endDate}`)
        if (data.length > 0) {
          const sampleDates = data.slice(0, 10).map((r: any) => r.date).sort()
          const minDate = sampleDates[0]
          const maxDate = sampleDates[sampleDates.length - 1]
          console.log(`📊 ${periodPrefix} [Tier Metrics Aggregate] Sample dates in first batch (min: ${minDate}, max: ${maxDate}):`, sampleDates.join(', '))
          
          // Verify dates are within range
          if (minDate < startDate || maxDate > endDate) {
            console.error(`❌ ${periodPrefix} [Tier Metrics Aggregate] ERROR: Dates outside range! Expected: ${startDate} to ${endDate}, Got: ${minDate} to ${maxDate}`)
          }
        }
      }
    }

    // Safety limit
    if (allData.length > 500000) {
      console.warn('⚠️ [Tier Metrics Aggregate] Safety limit reached: 500,000 records')
      break
    }
  }
  
  console.log(`📊 ${periodPrefix} [Tier Metrics Aggregate] Total records fetched: ${allData.length} for date range ${startDate} to ${endDate}`)
  
  // Final validation: Ensure all data is within date range
  if (allData.length > 0) {
    const allDates = allData.map((r: any) => r.date).filter((d: string) => d).sort()
    const minFetchedDate = allDates[0]
    const maxFetchedDate = allDates[allDates.length - 1]
    console.log(`📊 ${periodPrefix} [Tier Metrics Aggregate] Date range validation - Expected: ${startDate} to ${endDate}, Actual fetched: ${minFetchedDate} to ${maxFetchedDate}`)
    
    const dateRangeValidation = allData.filter((row: any) => {
      const rowDate = row.date
      return !rowDate || rowDate < startDate || rowDate > endDate
    })
    
    if (dateRangeValidation.length > 0) {
      console.error(`❌ ${periodPrefix} [Tier Metrics Aggregate] ERROR: ${dateRangeValidation.length} records outside date range ${startDate} to ${endDate}`)
      console.error(`❌ ${periodPrefix} [Tier Metrics Aggregate] Invalid dates sample:`, dateRangeValidation.slice(0, 10).map((r: any) => ({ date: r.date, userkey: r.userkey })))
    } else {
      console.log(`✅ ${periodPrefix} [Tier Metrics Aggregate] All ${allData.length} records are within date range ${startDate} to ${endDate}`)
    }
  }

  // Tier name to number mapping for sorting (to determine highest tier)
  const TIER_NAME_TO_NUMBER: Record<string, number> = {}
  TIER_DEFINITIONS.forEach(({ num, name }) => {
    TIER_NAME_TO_NUMBER[name] = num
    const withoutPrefix = name.toLowerCase().startsWith('tier ') ? name.substring(5) : name
    TIER_NAME_TO_NUMBER[withoutPrefix] = num
    TIER_NAME_TO_NUMBER[name.replace(/\s|_/g, '')] = num
    TIER_NAME_TO_NUMBER[withoutPrefix.replace(/\s|_/g, '')] = num
  })

  function getTierSortNumber(tierName: string): number {
    return TIER_NAME_TO_NUMBER[tierName] || 99
  }

  // Step 1: Determine tier for each userkey (highest tier = lowest tier_number)
  const userMap = new Map<string, {
    userkey: string
    tierNames: Set<string> // Track all tier_names for this user
    depositAmount: number
    withdrawAmount: number
    isActive: boolean // deposit_cases > 0
  }>()

  allData.forEach(row => {
    if (!row.userkey) return

    const userkey = String(row.userkey)
    const depositAmount = parseFloat(row.deposit_amount) || 0
    const withdrawAmount = parseFloat(row.withdraw_amount) || 0
    const depositCases = parseFloat(row.deposit_cases) || 0
    const isActive = depositCases > 0

    if (!userMap.has(userkey)) {
      userMap.set(userkey, {
        userkey: userkey,
        tierNames: new Set(),
        depositAmount: 0,
        withdrawAmount: 0,
        isActive: false
      })
    }

    const user = userMap.get(userkey)!

    // Track tier_name directly from database
    if (row.tier_name) {
      user.tierNames.add(String(row.tier_name).trim())
    }

    // Accumulate deposit and withdraw amounts
    user.depositAmount += depositAmount
    user.withdrawAmount += withdrawAmount
    if (isActive) {
      user.isActive = true
    }
  })

  // Step 2: Determine final tier for each user (highest tier = lowest tier_number)
  const userTierMap = new Map<string, {
    tier: number | null
    tierName: string
    depositAmount: number
    withdrawAmount: number
    isActive: boolean
  }>()

  userMap.forEach((user, userkey) => {
    let highestTierName: string | null = null
    let highestTierSort: number = 99

    // Find highest tier (lowest sort number = highest tier)
    if (user.tierNames.size > 0) {
      user.tierNames.forEach(tierName => {
        const sortNum = getTierSortNumber(tierName)
        if (sortNum < highestTierSort) {
          highestTierSort = sortNum
          highestTierName = tierName
        }
      })
    }

    userTierMap.set(userkey, {
      tier: highestTierName ? getTierNumberFromName(highestTierName) : null,
      tierName: highestTierName || 'Unknown',
      depositAmount: user.depositAmount,
      withdrawAmount: user.withdrawAmount,
      isActive: user.isActive
    })
  })

  // Step 3: Aggregate by tier
  const customerCountByTier = new Map<string, Set<string>>() // tier_name -> Set<userkey> (active only)
  const depositAmountByTier = new Map<string, number>() // tier_name -> total deposit_amount
  const ggrByTier = new Map<string, number>() // tier_name -> total ggr

  userTierMap.forEach((userData, userkey) => {
    const { tierName, depositAmount, withdrawAmount, isActive } = userData

    // Customer Count (active only)
    if (isActive) {
      if (!customerCountByTier.has(tierName)) {
        customerCountByTier.set(tierName, new Set())
      }
      customerCountByTier.get(tierName)!.add(userkey)
    }

    // Deposit Amount
    if (!depositAmountByTier.has(tierName)) {
      depositAmountByTier.set(tierName, 0)
    }
    depositAmountByTier.set(tierName, depositAmountByTier.get(tierName)! + depositAmount)

    // GGR (deposit_amount - withdraw_amount)
    const ggr = depositAmount - withdrawAmount
    if (!ggrByTier.has(tierName)) {
      ggrByTier.set(tierName, 0)
    }
    ggrByTier.set(tierName, ggrByTier.get(tierName)! + ggr)
  })

  return {
    customerCountByTier,
    depositAmountByTier,
    ggrByTier
  }
}

/**
 * Main GET handler
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Date range parameters (required)
    const periodAStart = searchParams.get('periodAStart')
    const periodAEnd = searchParams.get('periodAEnd')
    const periodBStart = searchParams.get('periodBStart')
    const periodBEnd = searchParams.get('periodBEnd')

    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      return NextResponse.json({
        success: false,
        error: 'All date range parameters (periodAStart, periodAEnd, periodBStart, periodBEnd) are required'
      }, { status: 400 })
    }

    // Validate date ranges
    const dateValidation = validatePeriodRanges(periodAStart, periodAEnd, periodBStart, periodBEnd)
    if (!dateValidation.valid) {
      return NextResponse.json({
        success: false,
        error: dateValidation.error
      }, { status: 400 })
    }

    // Filter parameters (optional)
    const brand = searchParams.get('brand') || 'All'
    const squadLead = searchParams.get('squadLead') || 'All'
    const channel = searchParams.get('channel') || 'All'

    // Get user's allowed brands from header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? 
      JSON.parse(userAllowedBrandsHeader) : null

    console.log('📊 [Tier Metrics] Parameters:', {
      periodAStart,
      periodAEnd,
      periodBStart,
      periodBEnd,
      brand,
      squadLead,
      channel
    })

    // Fetch Period A metrics
    console.log('📊 [Tier Metrics] ========== FETCHING PERIOD A ==========')
    console.log('📊 [Tier Metrics] Period A date range:', { periodAStart, periodAEnd })
    const periodAMetrics = await aggregateTierMetricsByDateRange(
      periodAStart,
      periodAEnd,
      brand !== 'All' ? brand : undefined,
      squadLead !== 'All' ? squadLead : undefined,
      channel !== 'All' ? channel : undefined,
      userAllowedBrands,
      'PERIOD A' // Label for logging
    )

    // Fetch Period B metrics
    console.log('📊 [Tier Metrics] ========== FETCHING PERIOD B ==========')
    console.log('📊 [Tier Metrics] Period B date range:', { periodBStart, periodBEnd })
    console.log('📊 [Tier Metrics] Fetching Period B data with filters:', {
      periodBStart,
      periodBEnd,
      brand: brand !== 'All' ? brand : 'All',
      squadLead: squadLead !== 'All' ? squadLead : 'All',
      channel: channel !== 'All' ? channel : 'All'
    })
    
    // CRITICAL: Verify periodBStart and periodBEnd are not null/undefined
    if (!periodBStart || !periodBEnd) {
      console.error('❌ [Tier Metrics] ERROR: Period B dates are missing!', { periodBStart, periodBEnd })
      return NextResponse.json({
        success: false,
        error: `Period B dates are missing: periodBStart=${periodBStart}, periodBEnd=${periodBEnd}`
      }, { status: 400 })
    }
    
    const periodBMetrics = await aggregateTierMetricsByDateRange(
      periodBStart, // CRITICAL: Use periodBStart directly
      periodBEnd,   // CRITICAL: Use periodBEnd directly
      brand !== 'All' ? brand : undefined,
      squadLead !== 'All' ? squadLead : undefined,
      channel !== 'All' ? channel : undefined,
      userAllowedBrands,
      'PERIOD B' // Label for logging
    )
    console.log('📊 [Tier Metrics] Period B metrics received:', {
      periodBStart,
      periodBEnd,
      tiers: Array.from(periodBMetrics.customerCountByTier.keys()),
      totalTiers: periodBMetrics.customerCountByTier.size,
      totalCustomers: Array.from(periodBMetrics.customerCountByTier.values()).reduce((sum, set) => sum + set.size, 0),
      totalDeposit: Array.from(periodBMetrics.depositAmountByTier.values()).reduce((sum, amt) => sum + amt, 0)
    })

    // Build tier metrics arrays
    const allTierNames = new Set<string>()
    periodAMetrics.customerCountByTier.forEach((_, tierName) => allTierNames.add(tierName))
    periodBMetrics.customerCountByTier.forEach((_, tierName) => allTierNames.add(tierName))

    // Convert to arrays and sort by tier (highest to lowest)
    const tierMetricsA: TierMetricsData[] = Array.from(allTierNames).map(tierName => {
      const customerCount = periodAMetrics.customerCountByTier.get(tierName)?.size || 0
      const depositAmount = periodAMetrics.depositAmountByTier.get(tierName) || 0
      const ggr = periodAMetrics.ggrByTier.get(tierName) || 0

      return {
        tierName,
        customerCount,
        depositAmount,
        ggr
      }
    }).sort((a, b) => {
      // Sort by tier number (ascending = highest tier first)
      const tierNumA = getTierNumberFromName(a.tierName) || 99
      const tierNumB = getTierNumberFromName(b.tierName) || 99
      return tierNumA - tierNumB
    })

    const tierMetricsB: TierMetricsData[] = Array.from(allTierNames).map(tierName => {
      const customerCount = periodBMetrics.customerCountByTier.get(tierName)?.size || 0
      const depositAmount = periodBMetrics.depositAmountByTier.get(tierName) || 0
      const ggr = periodBMetrics.ggrByTier.get(tierName) || 0

      return {
        tierName,
        customerCount,
        depositAmount,
        ggr
      }
    }).sort((a, b) => {
      // Sort by tier number (ascending = highest tier first)
      const tierNumA = getTierNumberFromName(a.tierName) || 99
      const tierNumB = getTierNumberFromName(b.tierName) || 99
      return tierNumA - tierNumB
    })

    // Calculate totals and win rate
    const totalCustomersA = tierMetricsA.reduce((sum, tier) => sum + tier.customerCount, 0)
    const totalDepositAmountA = tierMetricsA.reduce((sum, tier) => sum + tier.depositAmount, 0)
    const totalGGRA = tierMetricsA.reduce((sum, tier) => sum + tier.ggr, 0)
    const winRateA = totalDepositAmountA > 0 ? (totalGGRA / totalDepositAmountA) * 100 : 0

    const totalCustomersB = tierMetricsB.reduce((sum, tier) => sum + tier.customerCount, 0)
    const totalDepositAmountB = tierMetricsB.reduce((sum, tier) => sum + tier.depositAmount, 0)
    const totalGGRB = tierMetricsB.reduce((sum, tier) => sum + tier.ggr, 0)
    const winRateB = totalDepositAmountB > 0 ? (totalGGRB / totalDepositAmountB) * 100 : 0

    const response: TierMetricsResponse = {
      success: true,
      data: {
        periodA: {
          period: 'A',
          startDate: periodAStart,
          endDate: periodAEnd,
          totalCustomers: totalCustomersA,
          totalDepositAmount: totalDepositAmountA,
          totalGGR: totalGGRA,
          winRate: winRateA,
          tierMetrics: tierMetricsA
        },
        periodB: {
          period: 'B',
          startDate: periodBStart,
          endDate: periodBEnd,
          totalCustomers: totalCustomersB,
          totalDepositAmount: totalDepositAmountB,
          totalGGR: totalGGRB,
          winRate: winRateB,
          tierMetrics: tierMetricsB
        }
      }
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ [Tier Metrics] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch tier metrics'
    }, { status: 500 })
  }
}

