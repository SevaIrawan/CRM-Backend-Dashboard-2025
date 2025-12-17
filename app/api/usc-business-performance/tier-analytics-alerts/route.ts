import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { applySquadLeadFilter, applyChannelFilter } from '@/utils/brandAccessHelper'
import { validatePeriodRanges } from '../_utils/dateValidation'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - TIER ANALYTICS ALERTS API
 * ============================================================================
 * 
 * Purpose: Generate alerts for tier upgrades/downgrades and KPI changes
 * Returns: Array of alerts based on:
 * - Tier customer count changes (significant decreases)
 * - Tier movement (upgrades/downgrades)
 * - KPI changes (DA, GGR, etc.)
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

interface Alert {
  id: string
  title: string
  message: string
  type: 'warning' | 'info' | 'error'
  priority: 'high' | 'medium' | 'low'
}

interface AlertsResponse {
  success: boolean
  data?: Alert[]
  error?: string
}

/**
 * Helper: Calculate percentage change
 */
function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) {
    return newValue > 0 ? 100 : 0
  }
  return ((newValue - oldValue) / oldValue) * 100
}

/**
 * Helper: Aggregate tier metrics for a date range
 */
async function aggregateTierMetricsByDateRange(
  startDate: string,
  endDate: string,
  line?: string,
  squadLead?: string,
  channel?: string,
  userAllowedBrands?: string[] | null
): Promise<Map<string, { customerCount: number; depositAmount: number; ggr: number }>> {
  let query = supabase
    .from('blue_whale_usc')
    .select('userkey, tier_name, deposit_amount, withdraw_amount, deposit_cases, date')
    .eq('currency', 'USC')
    .gte('date', startDate)
    .lte('date', endDate)
    .not('tier_name', 'is', null)
    // ✅ FIX: Remove .gt('deposit_cases', 0) filter - we need ALL rows for deposit_amount and withdraw_amount
    // Customer count will be filtered in code (only count where deposit_cases > 0)

  if (line && line !== 'All' && line !== 'ALL') {
    query = query.eq('line', line)
  }
  if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
    query = query.eq('squad_lead', squadLead)
  }
  if (channel && channel !== 'All' && channel !== 'ALL') {
    query = query.eq('traffic', channel)
  }

  // Apply brand filter
  if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes('All')) {
    query = query.in('line', userAllowedBrands)
  }

  // Batch fetch
  const BATCH_SIZE = 5000
  let allData: any[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const batchQuery = query.range(offset, offset + BATCH_SIZE - 1)
    const { data, error } = await batchQuery

    if (error) {
      console.error(`❌ Error fetching batch at offset ${offset}:`, error)
      break
    }

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      allData.push(...data)
      hasMore = data.length === BATCH_SIZE
      offset += BATCH_SIZE
    }

    if (allData.length > 100000) {
      console.warn('⚠️ Safety limit reached: 100,000 records')
      break
    }
  }

  // Aggregate by tier (highest tier per user)
  const userMap = new Map<string, {
    tierName: string
    tierNumber: number
    depositAmount: number
    withdrawAmount: number
    isActive: boolean // deposit_cases > 0
  }>()

  allData.forEach(row => {
    if (!row.userkey || !row.tier_name) return

    const userkey = String(row.userkey)
    const tierName = String(row.tier_name)
    const tierNumber = getTierNumberFromName(tierName)

    if (tierNumber === null) return

    const depositAmount = parseFloat(row.deposit_amount || 0)
    const withdrawAmount = parseFloat(row.withdraw_amount || 0)
    const depositCases = parseFloat(row.deposit_cases || 0)
    const isActive = depositCases > 0

    if (!userMap.has(userkey)) {
      userMap.set(userkey, {
        tierName,
        tierNumber,
        depositAmount: 0,
        withdrawAmount: 0,
        isActive: false
      })
    }

    const userData = userMap.get(userkey)!
    // Keep highest tier (lowest tier number)
    if (tierNumber < userData.tierNumber) {
      userData.tierName = tierName
      userData.tierNumber = tierNumber
    }
    userData.depositAmount += depositAmount
    userData.withdrawAmount += withdrawAmount
    if (isActive) {
      userData.isActive = true
    }
  })

  // Aggregate by tier
  const tierMetrics = new Map<string, {
    customerCount: number
    depositAmount: number
    withdrawAmount: number
    ggr: number
  }>()

  userMap.forEach((userData) => {
    const tierName = userData.tierName

    if (!tierMetrics.has(tierName)) {
      tierMetrics.set(tierName, {
        customerCount: 0,
        depositAmount: 0,
        withdrawAmount: 0,
        ggr: 0
      })
    }

    const tier = tierMetrics.get(tierName)!
    // Customer Count (active only - deposit_cases > 0)
    if (userData.isActive) {
      tier.customerCount += 1
    }
    tier.depositAmount += userData.depositAmount
    tier.withdrawAmount += userData.withdrawAmount
  })

  // ✅ FIX: Calculate GGR per tier AFTER aggregation: GGR = SUM(deposit_amount) - SUM(withdraw_amount) per tier
  tierMetrics.forEach((tier, tierName) => {
    tier.ggr = tier.depositAmount - tier.withdrawAmount
  })

  return tierMetrics
}

/**
 * Helper: Get tier number from tier name
 */
function getTierNumberFromName(tierName: string): number | null {
  const tierMap: Record<string, number> = {
    'Regular': 7,
    'Tier 1': 1,
    'Tier 2': 2,
    'Tier 3': 3,
    'Tier 4': 4,
    'Tier 5': 5,
    'Super VIP': 0,
    'ND_P': 8,
    'P1': 9,
    'P2': 10
  }
  return tierMap[tierName] ?? null
}

/**
 * Helper: Get tier movement summary
 */
async function getTierMovementSummary(
  periodAStart: string,
  periodAEnd: string,
  periodBStart: string,
  periodBEnd: string,
  line?: string,
  squadLead?: string,
  channel?: string,
  userAllowedBrands?: string[] | null
): Promise<{
  upgrades: number
  downgrades: number
  stable: number
  keyFlows: Array<{ from: string; to: string; count: number }>
}> {
  // Get user tiers for Period A
  const periodATiers = await getUserTiersForPeriod(periodAStart, periodAEnd, line, squadLead, channel, userAllowedBrands)
  // Get user tiers for Period B
  const periodBTiers = await getUserTiersForPeriod(periodBStart, periodBEnd, line, squadLead, channel, userAllowedBrands)

  let upgrades = 0
  let downgrades = 0
  let stable = 0
  const keyFlows: Array<{ from: string; to: string; count: number }> = []
  const flowMap = new Map<string, number>()

  // Compare tiers
  periodATiers.forEach((tierA, userkey) => {
    const tierB = periodBTiers.get(userkey)
    if (!tierB) return

    const tierANum = getTierNumberFromName(tierA) ?? 999
    const tierBNum = getTierNumberFromName(tierB) ?? 999

    if (tierBNum < tierANum) {
      upgrades++
      const flowKey = `${tierA}→${tierB}`
      flowMap.set(flowKey, (flowMap.get(flowKey) || 0) + 1)
    } else if (tierBNum > tierANum) {
      downgrades++
      const flowKey = `${tierA}→${tierB}`
      flowMap.set(flowKey, (flowMap.get(flowKey) || 0) + 1)
    } else {
      stable++
    }
  })

  // Get top flows
  Array.from(flowMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([flow, count]) => {
      const [from, to] = flow.split('→')
      keyFlows.push({ from, to, count })
    })

  return { upgrades, downgrades, stable, keyFlows }
}

/**
 * Helper: Get user tiers for a period
 */
async function getUserTiersForPeriod(
  startDate: string,
  endDate: string,
  line?: string,
  squadLead?: string,
  channel?: string,
  userAllowedBrands?: string[] | null
): Promise<Map<string, string>> {
  let query = supabase
    .from('blue_whale_usc')
    .select('userkey, tier_name, date')
    .eq('currency', 'USC')
    .gte('date', startDate)
    .lte('date', endDate)
    .not('tier_name', 'is', null)

  if (line && line !== 'All' && line !== 'ALL') {
    query = query.eq('line', line)
  }
  if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
    query = query.eq('squad_lead', squadLead)
  }
  if (channel && channel !== 'All' && channel !== 'ALL') {
    query = query.eq('traffic', channel)
  }

  if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes('All')) {
    query = query.in('line', userAllowedBrands)
  }

  const { data, error } = await query.limit(100000)

  if (error) {
    console.error('❌ Error fetching user tiers:', error)
    return new Map()
  }

  // Get highest tier per user
  const userMap = new Map<string, { tierName: string; tierNumber: number }>()

  data?.forEach(row => {
    if (!row.userkey || !row.tier_name) return

    const userkey = String(row.userkey)
    const tierName = String(row.tier_name)
    const tierNumber = getTierNumberFromName(tierName)

    if (tierNumber === null) return

    if (!userMap.has(userkey)) {
      userMap.set(userkey, { tierName, tierNumber })
    } else {
      const existing = userMap.get(userkey)!
      if (tierNumber < existing.tierNumber) {
        userMap.set(userkey, { tierName, tierNumber })
      }
    }
  })

  const result = new Map<string, string>()
  userMap.forEach((value, key) => {
    result.set(key, value.tierName)
  })

  return result
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const periodAStart = searchParams.get('periodAStart')
    const periodAEnd = searchParams.get('periodAEnd')
    const periodBStart = searchParams.get('periodBStart')
    const periodBEnd = searchParams.get('periodBEnd')
    const brand = searchParams.get('brand') || 'All'
    const squadLead = searchParams.get('squadLead') || 'All'
    const channel = searchParams.get('channel') || 'All'

    // Validate required parameters
    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: periodAStart, periodAEnd, periodBStart, periodBEnd'
      } as AlertsResponse, { status: 400 })
    }

    // Validate date ranges
    const dateValidation = validatePeriodRanges(periodAStart, periodAEnd, periodBStart, periodBEnd)
    if (!dateValidation.valid) {
      return NextResponse.json({
        success: false,
        error: dateValidation.error || 'Invalid date ranges'
      } as AlertsResponse, { status: 400 })
    }

    // Get user allowed brands
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    let userAllowedBrands: string[] | null = null
    if (userAllowedBrandsHeader) {
      try {
        userAllowedBrands = JSON.parse(userAllowedBrandsHeader)
      } catch (e) {
        console.error('Error parsing user allowed brands:', e)
      }
    }

    // Get tier metrics for both periods
    const periodAMetrics = await aggregateTierMetricsByDateRange(
      periodAStart,
      periodAEnd,
      brand !== 'All' ? brand : undefined,
      squadLead !== 'All' ? squadLead : undefined,
      channel !== 'All' ? channel : undefined,
      userAllowedBrands
    )

    const periodBMetrics = await aggregateTierMetricsByDateRange(
      periodBStart,
      periodBEnd,
      brand !== 'All' ? brand : undefined,
      squadLead !== 'All' ? squadLead : undefined,
      channel !== 'All' ? channel : undefined,
      userAllowedBrands
    )

    // Get tier movement summary
    const movementSummary = await getTierMovementSummary(
      periodAStart,
      periodAEnd,
      periodBStart,
      periodBEnd,
      brand !== 'All' ? brand : undefined,
      squadLead !== 'All' ? squadLead : undefined,
      channel !== 'All' ? channel : undefined,
      userAllowedBrands
    )

    // Generate alerts
    const alerts: Alert[] = []

    // Alert 1: Significant customer count decreases by tier
    const allTierNames = new Set<string>()
    periodAMetrics.forEach((_, tierName) => allTierNames.add(tierName))
    periodBMetrics.forEach((_, tierName) => allTierNames.add(tierName))

    allTierNames.forEach(tierName => {
      const tierA = periodAMetrics.get(tierName) || { customerCount: 0, depositAmount: 0, ggr: 0 }
      const tierB = periodBMetrics.get(tierName) || { customerCount: 0, depositAmount: 0, ggr: 0 }

      const customerChange = calculatePercentageChange(tierA.customerCount, tierB.customerCount)

      // Alert if customer count decreased by more than 5%
      if (customerChange < -5 && tierA.customerCount > 0) {
        const loss = tierA.customerCount - tierB.customerCount
        alerts.push({
          id: `customer-decrease-${tierName}`,
          title: `${tierName} Tier - Customer Count`,
          message: `Decreased by ${Math.abs(customerChange).toFixed(1)}% (from ${tierA.customerCount.toLocaleString()} to ${tierB.customerCount.toLocaleString()}). Total loss of ${loss.toLocaleString()} customers${tierName === 'ND_P' ? ', indicating potential churn or upgrade' : tierName === 'Regular' ? ', indicating potential churn or upgrade' : '.'}`,
          type: customerChange < -10 ? 'error' : 'warning',
          priority: customerChange < -10 ? 'high' : 'medium'
        })
      }
    })

    // Alert 2: Tier movement - downgrades
    if (movementSummary.downgrades > 0) {
      const topFlows = movementSummary.keyFlows
        .filter(flow => {
          const fromNum = getTierNumberFromName(flow.from) ?? 999
          const toNum = getTierNumberFromName(flow.to) ?? 999
          return toNum > fromNum // Downgrade
        })
        .slice(0, 2)

      const flowText = topFlows.length > 0
        ? ` Key flows: ${topFlows.map(f => `${f.from}→${f.to} (${f.count})`).join(', ')}.`
        : ''

      alerts.push({
        id: 'tier-downgrades',
        title: 'Tier Movement - Downgrades',
        message: `Total ${movementSummary.downgrades.toLocaleString()} customers downgraded across all tiers.${flowText}`,
        type: movementSummary.downgrades > 100 ? 'error' : 'warning',
        priority: movementSummary.downgrades > 100 ? 'high' : 'medium'
      })
    }

    // Alert 3: Overall DA/U trend
    let totalDA_A = 0
    let totalCustomers_A = 0
    let totalDA_B = 0
    let totalCustomers_B = 0

    periodAMetrics.forEach(tier => {
      totalDA_A += tier.depositAmount
      totalCustomers_A += tier.customerCount
    })

    periodBMetrics.forEach(tier => {
      totalDA_B += tier.depositAmount
      totalCustomers_B += tier.customerCount
    })

    const daPerUser_A = totalCustomers_A > 0 ? totalDA_A / totalCustomers_A : 0
    const daPerUser_B = totalCustomers_B > 0 ? totalDA_B / totalCustomers_B : 0
    const daPerUserChange = calculatePercentageChange(daPerUser_A, daPerUser_B)

    if (Math.abs(daPerUserChange) > 5) {
      alerts.push({
        id: 'da-per-user-trend',
        title: 'Overall DA/U Trend',
        message: `Deposit Amount per User ${daPerUserChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(daPerUserChange).toFixed(1)}% (from ${daPerUser_A.toFixed(2)} to ${daPerUser_B.toFixed(2)}).${daPerUserChange < 0 ? ' Requires attention to customer value retention.' : ''}`,
        type: Math.abs(daPerUserChange) > 15 ? 'error' : 'warning',
        priority: Math.abs(daPerUserChange) > 15 ? 'high' : 'medium'
      })
    }

    return NextResponse.json({
      success: true,
      data: alerts
    } as AlertsResponse)

  } catch (error) {
    console.error('❌ Error generating alerts:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as AlertsResponse, { status: 500 })
  }
}

