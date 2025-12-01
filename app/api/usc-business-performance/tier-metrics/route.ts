import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { TIER_NAMES } from '@/lib/uscTierClassification'
import { applySquadLeadFilter, applyChannelFilter } from '@/utils/brandAccessHelper'
import { validatePeriodRanges } from '../_utils/dateValidation'

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
  const tierEntry = Object.entries(TIER_NAMES).find(([_, name]) => 
    name.toLowerCase() === tierName.toLowerCase().trim()
  )
  if (tierEntry) {
    const tierNum = parseInt(tierEntry[0])
    if (!isNaN(tierNum) && tierNum >= 1 && tierNum <= 7) {
      return tierNum
    }
  }
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
  userAllowedBrands?: string[] | null
): Promise<{
  customerCountByTier: Map<string, Set<string>> // tier_name -> Set<userkey>
  depositAmountByTier: Map<string, number> // tier_name -> total deposit_amount
  ggrByTier: Map<string, number> // tier_name -> total ggr
}> {
  console.log(`📊 [Tier Metrics Aggregate] Fetching data for date range: ${startDate} to ${endDate}`)
  
  // Build base query
  let query = supabase
    .from('blue_whale_usc')
    .select('userkey, tier_name, deposit_amount, withdraw_amount, deposit_cases, date')
    .eq('currency', 'USC')
    .gte('date', startDate)
    .lte('date', endDate)
    .not('tier_name', 'is', null) // Only users with tier

  if (line && line !== 'All' && line !== 'ALL') {
    query = query.eq('line', line)
  }

  query = applySquadLeadFilter(query, squadLead || 'All')
  query = applyChannelFilter(query, channel || 'All')

  if (userAllowedBrands && userAllowedBrands.length > 0) {
    query = query.in('line', userAllowedBrands)
  }

  // Batch fetch for large datasets
  const BATCH_SIZE = 10000
  let allData: any[] = []
  let offset = 0
  let hasMore = true
  
  console.log(`📊 [Tier Metrics Aggregate] Query filters - date range: ${startDate} to ${endDate}, line: ${line || 'All'}, squadLead: ${squadLead || 'All'}, channel: ${channel || 'All'}`)

  while (hasMore) {
    // IMPORTANT: Create new query for each batch to ensure filters are preserved
    const batchQuery = query.range(offset, offset + BATCH_SIZE - 1)
    const { data, error } = await batchQuery

    if (error) {
      console.error(`❌ [Tier Metrics Aggregate] Error fetching batch at offset ${offset} for date range ${startDate} to ${endDate}:`, error)
      break
    }

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      allData.push(...data)
      hasMore = data.length === BATCH_SIZE
      offset += BATCH_SIZE
      
      // Log progress for first batch only
      if (offset === BATCH_SIZE) {
        console.log(`📊 [Tier Metrics Aggregate] First batch fetched: ${data.length} records for date range ${startDate} to ${endDate}`)
      }
    }

    // Safety limit
    if (allData.length > 500000) {
      console.warn('⚠️ [Tier Metrics Aggregate] Safety limit reached: 500,000 records')
      break
    }
  }
  
  console.log(`📊 [Tier Metrics Aggregate] Total records fetched: ${allData.length} for date range ${startDate} to ${endDate}`)

  // Tier name to number mapping for sorting (to determine highest tier)
  const TIER_NAME_TO_NUMBER: Record<string, number> = {
    'Super VIP': 1,
    'Tier 5': 2,
    'Tier 4': 3,
    'Tier 3': 4,
    'Tier 2': 5,
    'Tier 1': 6,
    'Regular': 7,
    'ND_P': 8,
    'P1': 9,
    'P2': 10
  }

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
    const periodAMetrics = await aggregateTierMetricsByDateRange(
      periodAStart,
      periodAEnd,
      brand !== 'All' ? brand : undefined,
      squadLead !== 'All' ? squadLead : undefined,
      channel !== 'All' ? channel : undefined,
      userAllowedBrands
    )

    // Fetch Period B metrics
    console.log('📊 [Tier Metrics] Fetching Period B data:', {
      periodBStart,
      periodBEnd,
      brand: brand !== 'All' ? brand : 'All',
      squadLead: squadLead !== 'All' ? squadLead : 'All',
      channel: channel !== 'All' ? channel : 'All'
    })
    const periodBMetrics = await aggregateTierMetricsByDateRange(
      periodBStart!,
      periodBEnd!,
      brand !== 'All' ? brand : undefined,
      squadLead !== 'All' ? squadLead : undefined,
      channel !== 'All' ? channel : undefined,
      userAllowedBrands
    )
    console.log('📊 [Tier Metrics] Period B metrics received:', {
      tiers: Array.from(periodBMetrics.customerCountByTier.keys()),
      totalTiers: periodBMetrics.customerCountByTier.size
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

