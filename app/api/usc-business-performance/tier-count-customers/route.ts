import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { applySquadLeadFilter, applyChannelFilter } from '@/utils/brandAccessHelper'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - TIER COUNT CUSTOMERS API
 * ============================================================================
 * 
 * Purpose: Get list of customers/users for a specific tier in a specific period
 * Returns: List of users with all required metrics for modal display
 * 
 * IMPORTANT:
 * - This API ONLY READS from blue_whale_usc table
 * - Active = deposit_cases > 0
 * - Tier determination: Highest tier (lowest tier_number) in period
 * 
 * Params:
 * - tierName: Required (e.g., "Tier 1", "Regular", "P1", etc.)
 * - startDate: Required (YYYY-MM-DD)
 * - endDate: Required (YYYY-MM-DD)
 * - brand: Optional (default: "All")
 * - squadLead: Optional (default: "All")
 * - channel: Optional (default: "All")
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: {
 *     customers: Array<{
 *       line: string,
 *       update_unique_code: string,
 *       user_name: string,
 *       last_deposit_date: string,
 *       daysActive: number,
 *       atv: number,
 *       pf: number,
 *       dc: number,
 *       da: number,
 *       wc: number,
 *       wa: number,
 *       ggr: number,
 *       winrate: number,
 *       tier: string
 *     }>,
 *     total: number
 *   }
 * }
 * 
 * ============================================================================
 */

// Tier name to number mapping (same as tier-metrics)
const TIER_NAME_MAP = (() => {
  const map = new Map<string, number>()
  const add = (label: string, num: number) => {
    const norm = label.toLowerCase().trim()
    map.set(norm, num)
    map.set(norm.replace(/\s|_/g, ''), num)
  }

  add('Super VIP', 1)
  add('Tier 5', 2)
  add('Tier 4', 3)
  add('Tier 3', 4)
  add('P2', 5)
  add('P1', 6)
  add('ND_P', 7)
  add('NDP', 7)
  add('Tier 2', 8)
  add('Tier 1', 9)
  add('Regular', 10)

  return map
})()

function getTierNumberFromName(tierName: string): number | null {
  const normalized = tierName.toLowerCase().trim()
  return TIER_NAME_MAP.get(normalized) || TIER_NAME_MAP.get(normalized.replace(/\s|_/g, '')) || null
}

interface UserData {
  userkey: string
  line: string | null
  update_unique_code: string | null
  user_name: string | null
  last_deposit_date: string | null
  tier_name: string | null
  deposit_amount: number
  withdraw_amount: number
  deposit_cases: number
  withdraw_cases: number
  date: string
}

interface AggregatedUser {
  userkey: string
  line: string
  update_unique_code: string
  user_name: string
  last_deposit_date: string | null
  daysActive: number
  depositAmount: number
  withdrawAmount: number
  depositCases: number
  withdrawCases: number
  tier_name: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const tierName = searchParams.get('tierName')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const brand = searchParams.get('brand') || 'All'
    const squadLead = searchParams.get('squadLead') || 'All'
    const channel = searchParams.get('channel') || 'All'

    if (!tierName || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'tierName, startDate, and endDate parameters are required'
      }, { status: 400 })
    }

    // Get user's allowed brands from header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? 
      JSON.parse(userAllowedBrandsHeader) : null

    console.log('📊 [Tier Count Customers] Parameters:', {
      tierName,
      startDate,
      endDate,
      brand,
      squadLead,
      channel
    })

    // Batch fetch all data
    const BATCH_SIZE = 10000
    let allData: UserData[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      let batchQuery = supabase
        .from('blue_whale_usc')
        .select('userkey, line, update_unique_code, user_name, last_deposit_date, tier_name, deposit_amount, withdraw_amount, deposit_cases, withdraw_cases, date')
        .eq('currency', 'USC')
        .gte('date', startDate)
        .lte('date', endDate)
        .not('tier_name', 'is', null)
        .gt('deposit_cases', 0) // Only active users
        .order('userkey', { ascending: true })
        .order('date', { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1)

      if (brand && brand !== 'All' && brand !== 'ALL') {
        batchQuery = batchQuery.eq('line', brand)
      }

      batchQuery = applySquadLeadFilter(batchQuery, squadLead)
      batchQuery = applyChannelFilter(batchQuery, channel)

      if (userAllowedBrands && userAllowedBrands.length > 0) {
        batchQuery = batchQuery.in('line', userAllowedBrands)
      }

      const { data, error } = await batchQuery

      if (error) {
        console.error('❌ [Tier Count Customers] Error fetching batch:', error)
        break
      }

      if (!data || data.length === 0) {
        hasMore = false
      } else {
        // Cast data to UserData[]
        const typedData = data.map((row: any): UserData => ({
          userkey: String(row.userkey || ''),
          line: row.line || null,
          update_unique_code: row.update_unique_code || null,
          user_name: row.user_name || null,
          last_deposit_date: row.last_deposit_date || null,
          tier_name: row.tier_name || null,
          deposit_amount: Number(row.deposit_amount) || 0,
          withdraw_amount: Number(row.withdraw_amount) || 0,
          deposit_cases: Number(row.deposit_cases) || 0,
          withdraw_cases: Number(row.withdraw_cases) || 0,
          date: String(row.date || '')
        }))
        allData.push(...typedData)
        hasMore = data.length === BATCH_SIZE
        offset += BATCH_SIZE
      }
    }

    console.log(`📊 [Tier Count Customers] Total records fetched: ${allData.length}`)

    // Aggregate by userkey - get highest tier (lowest tier_number) per user
    const userMap = new Map<string, AggregatedUser>()
    const userDates = new Map<string, Set<string>>() // Track distinct dates per user

    allData.forEach((row) => {
      const userData = row as UserData
      if (!userData.userkey || !userData.tier_name) return

      const userkey = String(userData.userkey)
      const rowTierName = String(userData.tier_name)
      const rowTierNumber = getTierNumberFromName(rowTierName)

      if (rowTierNumber === null) return

      // Track distinct dates for daysActive calculation
      if (!userDates.has(userkey)) {
        userDates.set(userkey, new Set())
      }
      if (userData.date) {
        userDates.get(userkey)!.add(userData.date)
      }

      if (!userMap.has(userkey)) {
        userMap.set(userkey, {
          userkey,
          line: userData.line || '-',
          update_unique_code: userData.update_unique_code || '-',
          user_name: userData.user_name || '-',
          last_deposit_date: userData.last_deposit_date || null,
          daysActive: 0, // Will be set after aggregation
          depositAmount: Number(userData.deposit_amount) || 0,
          withdrawAmount: Number(userData.withdraw_amount) || 0,
          depositCases: Number(userData.deposit_cases) || 0,
          withdrawCases: Number(userData.withdraw_cases) || 0,
          tier_name: rowTierName
        })
      } else {
        const existing = userMap.get(userkey)!
        const existingTierNumber = getTierNumberFromName(existing.tier_name)

        // Update to highest tier (lowest tier_number)
        if (rowTierNumber < existingTierNumber!) {
          existing.tier_name = rowTierName
        }

        // Aggregate amounts and cases
        existing.depositAmount += Number(userData.deposit_amount) || 0
        existing.withdrawAmount += Number(userData.withdraw_amount) || 0
        existing.depositCases += Number(userData.deposit_cases) || 0
        existing.withdrawCases += Number(userData.withdraw_cases) || 0

        // Update last_deposit_date if this one is more recent
        if (userData.last_deposit_date && (!existing.last_deposit_date || userData.last_deposit_date > existing.last_deposit_date)) {
          existing.last_deposit_date = userData.last_deposit_date
        }
      }
    })

    // Set daysActive for each user
    userMap.forEach((user, userkey) => {
      user.daysActive = userDates.get(userkey)?.size || 0
    })

    // Filter by tier_name (exact match)
    const filteredUsers = Array.from(userMap.values()).filter(user => {
      const userTierNormalized = user.tier_name.toLowerCase().trim()
      const targetTierNormalized = tierName.toLowerCase().trim()
      return userTierNormalized === targetTierNormalized || 
             userTierNormalized.replace(/\s|_/g, '') === targetTierNormalized.replace(/\s|_/g, '')
    })

    console.log(`📊 [Tier Count Customers] Filtered to tier "${tierName}": ${filteredUsers.length} users`)

    // Calculate derived metrics for each user
    const customers = filteredUsers.map(user => {
      const atv = user.depositCases > 0 ? user.depositAmount / user.depositCases : 0
      const pf = user.daysActive > 0 ? user.depositCases / user.daysActive : 0
      const ggr = user.depositAmount - user.withdrawAmount
      const winrate = user.depositAmount > 0 ? (ggr / user.depositAmount) * 100 : 0

      return {
        line: user.line,
        update_unique_code: user.update_unique_code,
        user_name: user.user_name,
        last_deposit_date: user.last_deposit_date,
        daysActive: user.daysActive,
        atv: atv,
        pf: pf,
        dc: user.depositCases,
        da: user.depositAmount,
        wc: user.withdrawCases,
        wa: user.withdrawAmount,
        ggr: ggr,
        winrate: winrate,
        tier: user.tier_name
      }
    })

    // Sort by GGR descending
    customers.sort((a, b) => b.ggr - a.ggr)

    return NextResponse.json({
      success: true,
      data: {
        customers,
        total: customers.length
      }
    })

  } catch (error) {
    console.error('❌ [Tier Count Customers] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

