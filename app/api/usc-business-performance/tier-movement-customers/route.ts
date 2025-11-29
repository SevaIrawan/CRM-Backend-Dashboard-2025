import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { TIER_NAMES } from '@/lib/uscTierClassification'

/**
 * Helper: Aggregate blue_whale_usc data per user within a date range
 * Returns aggregated data with tier determination (highest tier in period)
 */
async function aggregateUserDataByDateRange(
  startDate: string,
  endDate: string,
  userkeys?: string[],
  line?: string,
  squadLead?: string,
  channel?: string
): Promise<Map<string, {
  unique_code: string | null
  user_name: string | null
  line: string | null
  tier: number | null
  depositAmount: number
  withdrawAmount: number
  depositCases: number
  avgTransactionValue: number
}>> {
  let query = supabase
    .from('blue_whale_usc')
    .select('userkey, unique_code, user_name, line, tier_name, tier_group, deposit_amount, withdraw_amount, deposit_cases, date')
    .eq('currency', 'USC')
    .gte('date', startDate)
    .lte('date', endDate)
    .not('tier_name', 'is', null) // Only users with tier

  if (userkeys && userkeys.length > 0) {
    // Use batch processing for large arrays
    const BATCH_SIZE = 500
    const results: any[] = []
    
    for (let i = 0; i < userkeys.length; i += BATCH_SIZE) {
      const batch = userkeys.slice(i, i + BATCH_SIZE)
      const batchQuery = query.in('userkey', batch)
      const { data, error } = await batchQuery
      
      if (error) {
        console.error(`❌ Error fetching batch ${i / BATCH_SIZE + 1}:`, error)
        continue
      }
      
      if (data) {
        results.push(...data)
      }
    }
    
    // Process results
    return aggregateUserData(results, line, squadLead, channel)
  } else {
    // No userkey filter - get all data (with other filters)
    if (line && line !== 'All' && line !== 'ALL') {
      query = query.eq('line', line)
    }
    if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
      query = query.eq('squad_lead', squadLead)
    }
    if (channel && channel !== 'All' && channel !== 'ALL') {
      query = query.eq('traffic', channel)
    }
    
    // Batch fetch for large datasets
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
      
      // Safety limit
      if (allData.length > 100000) {
        console.warn('⚠️ Safety limit reached: 100,000 records')
        break
      }
    }
    
    return aggregateUserData(allData, line, squadLead, channel)
  }
}

/**
 * Helper: Aggregate raw data per user and determine tier
 */
function aggregateUserData(
  rawData: any[],
  line?: string,
  squadLead?: string,
  channel?: string
): Map<string, {
  unique_code: string | null
  user_name: string | null
  line: string | null
  tier: number | null
  depositAmount: number
  withdrawAmount: number
  depositCases: number
  avgTransactionValue: number
}> {
  const userMap = new Map<string, {
    unique_code: string | null
    user_name: string | null
    line: string | null
    tier: number | null
    tierNumbers: Set<number> // Track all tier numbers that appear in period
    depositAmount: number
    withdrawAmount: number
    depositCases: number
    dates: Set<string> // Track dates
  }>()
  
  // First pass: aggregate all metrics and track all tier numbers
  rawData.forEach(row => {
    if (!row.userkey) return
    
    // Apply filters in memory (if not already filtered)
    if (line && line !== 'All' && line !== 'ALL' && row.line !== line) return
    if (squadLead && squadLead !== 'All' && squadLead !== 'ALL' && row.squad_lead !== squadLead) return
    if (channel && channel !== 'All' && channel !== 'ALL' && row.traffic !== channel) return
    
    if (!userMap.has(row.userkey)) {
      userMap.set(row.userkey, {
        unique_code: row.unique_code || null,
        user_name: row.user_name || null,
        line: row.line || null,
        tier: null,
        tierNumbers: new Set(),
        depositAmount: 0,
        withdrawAmount: 0,
        depositCases: 0,
        dates: new Set()
      })
    }
    
    const user = userMap.get(row.userkey)!
    
    // Aggregate metrics
    user.depositAmount += Number(row.deposit_amount) || 0
    user.withdrawAmount += Number(row.withdraw_amount) || 0
    user.depositCases += Number(row.deposit_cases) || 0
    
    // Track tier number for determination (use tier_name to get tier number)
    if (row.tier_name) {
      // Find tier number from tier_name using TIER_NAMES (case-insensitive)
      const tierNameLower = (row.tier_name as string).trim()
      const tierEntry = Object.entries(TIER_NAMES).find(([_, name]) => 
        name.toLowerCase() === tierNameLower.toLowerCase()
      )
      
      if (tierEntry) {
        const tierNum = tierEntry[0]
        const tier = parseInt(tierNum)
        if (!isNaN(tier) && tier >= 1 && tier <= 7) {
          // Track all tier numbers that appear (to determine highest tier)
          user.tierNumbers.add(tier)
        }
      }
    }
    
    // Track dates
    if (row.date) {
      user.dates.add(row.date)
    }
  })
  
  // Second pass: determine tier (highest tier number in period)
  // Tier hierarchy: Tier 1 (highest) > Tier 2 > ... > Tier 7 > Regular (lowest)
  const result = new Map<string, {
    unique_code: string | null
    user_name: string | null
    line: string | null
    tier: number | null
    depositAmount: number
    withdrawAmount: number
    depositCases: number
    avgTransactionValue: number
  }>()
  
  userMap.forEach((user, userkey) => {
    // Determine tier: highest tier number in period
    // Tier 1 = highest, Tier 7 = lower, Regular = lowest (usually tier 0 or high number)
    let highestTier: number | null = null
    
    if (user.tierNumbers.size > 0) {
      // Find highest tier (lowest number = highest tier)
      // Tier 1 < Tier 2 < ... < Tier 7
      highestTier = Math.min(...Array.from(user.tierNumbers))
    }
    
    // Calculate ATV
    const avgTransactionValue = user.depositCases > 0
      ? user.depositAmount / user.depositCases
      : 0
    
    result.set(userkey, {
      unique_code: user.unique_code,
      user_name: user.user_name,
      line: user.line,
      tier: highestTier,  // ✅ Use highestTier (tier tertinggi dalam period)
      depositAmount: user.depositAmount,
      withdrawAmount: user.withdrawAmount,
      depositCases: user.depositCases,
      avgTransactionValue
    })
  })
  
  return result
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fromTier = searchParams.get('fromTier')
    const toTier = searchParams.get('toTier')
    
    console.log('📊 [Tier Movement Customers API] Request received:', {
      fromTier,
      toTier,
      params: Object.fromEntries(searchParams.entries())
    })
    
    // Support both formats: year/month and date range
    const currentYear = searchParams.get('currentYear')
    const currentMonth = searchParams.get('currentMonth')
    const previousYear = searchParams.get('previousYear')
    const previousMonth = searchParams.get('previousMonth')
    
    // Date range format (same as Customer Tier Trends)
    const periodAStart = searchParams.get('periodAStart')
    const periodAEnd = searchParams.get('periodAEnd')
    const periodBStart = searchParams.get('periodBStart')
    const periodBEnd = searchParams.get('periodBEnd')
    
    const line = searchParams.get('line')
    const squadLead = searchParams.get('squadLead')
    const channel = searchParams.get('channel')

    // Helper function to extract year and month from date string
    const extractYearMonth = (dateStr: string): { year: number; month: string } | null => {
      if (!dateStr || typeof dateStr !== 'string') {
        console.warn('⚠️ [Tier Movement Customers API] Invalid date string:', dateStr)
        return null
      }
      
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
          console.warn('⚠️ [Tier Movement Customers API] Invalid date format:', dateStr)
          return null
        }
        
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        
        const year = date.getFullYear()
        const month = monthNames[date.getMonth()]
        
        if (!year || !month) {
          console.warn('⚠️ [Tier Movement Customers API] Could not extract year/month from date:', dateStr)
          return null
        }
        
        return { year, month }
      } catch (err) {
        console.error('❌ [Tier Movement Customers API] Error extracting year/month:', err)
        return null
      }
    }
    
    // ✅ PREFER date range format (new format - required for blue_whale_usc)
    // Support both date range and year/month for backward compatibility
    let useDateRange = false
    let periodAStartDate: string | null = null
    let periodAEndDate: string | null = null
    let periodBStartDate: string | null = null
    let periodBEndDate: string | null = null
    let currentPeriod: { year: number; month: string } | null = null
    let previousPeriod: { year: number; month: string } | null = null
    
    if (periodBStart && periodBEnd && periodAStart && periodAEnd) {
      // ✅ Use date range format (preferred - same as Customer Tier Trends)
      useDateRange = true
      periodAStartDate = periodAStart
      periodAEndDate = periodAEnd
      periodBStartDate = periodBStart
      periodBEndDate = periodBEnd
      
      // Also extract year/month for logging
      const periodB = extractYearMonth(periodBEnd)
      const periodA = extractYearMonth(periodAEnd)
      currentPeriod = periodB
      previousPeriod = periodA
    } else if (currentYear && currentMonth && previousYear && previousMonth) {
      // Use year/month format (old format - for backward compatibility)
      // Convert to date range (use first and last day of month)
      currentPeriod = {
        year: parseInt(currentYear),
        month: currentMonth
      }
      previousPeriod = {
        year: parseInt(previousYear),
        month: previousMonth
      }
      
      // Convert year/month to date range
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December']
      const monthNumbers: Record<string, number> = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
        'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
      }
      
      const getLastDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate()
      }
      
      if (currentPeriod && previousPeriod) {
        const currentMonthNum = monthNumbers[currentPeriod.month]
        const prevMonthNum = monthNumbers[previousPeriod.month]
        
        periodAStartDate = `${previousPeriod.year}-${String(prevMonthNum).padStart(2, '0')}-01`
        periodAEndDate = `${previousPeriod.year}-${String(prevMonthNum).padStart(2, '0')}-${String(getLastDayOfMonth(previousPeriod.year, prevMonthNum)).padStart(2, '0')}`
        
        periodBStartDate = `${currentPeriod.year}-${String(currentMonthNum).padStart(2, '0')}-01`
        periodBEndDate = `${currentPeriod.year}-${String(currentMonthNum).padStart(2, '0')}-${String(getLastDayOfMonth(currentPeriod.year, currentMonthNum)).padStart(2, '0')}`
        
        useDateRange = true
      }
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters: either (fromTier, toTier, currentYear, currentMonth, previousYear, previousMonth) or (fromTier, toTier, periodAStart, periodAEnd, periodBStart, periodBEnd)' },
        { status: 400 }
      )
    }

    // Validation
    if (!fromTier || !toTier) {
      return NextResponse.json(
        { error: 'Missing required parameters: fromTier and toTier' },
        { status: 400 }
      )
    }
    
    if (useDateRange && (!periodAStartDate || !periodAEndDate || !periodBStartDate || !periodBEndDate)) {
      return NextResponse.json(
        { error: 'Invalid date range parameters' },
        { status: 400 }
      )
    }

    const fromTierNum = parseInt(fromTier)
    const toTierNum = parseInt(toTier)

    if (isNaN(fromTierNum) || isNaN(toTierNum)) {
      return NextResponse.json(
        { error: 'Invalid tier parameters' },
        { status: 400 }
      )
    }

    console.log(`📊 [Tier Movement Customers API] Fetching Period A data (${periodAStartDate} to ${periodAEndDate}) for tier ${fromTierNum}`)

    // ✅ Query Period A data from blue_whale_usc with date range
    // Aggregate per user and filter by fromTier
    const periodADataMap = await aggregateUserDataByDateRange(
      periodAStartDate!,
      periodAEndDate!,
      undefined, // Get all users first
      line || undefined,  // Convert null to undefined
      squadLead || undefined,  // Convert null to undefined
      channel || undefined  // Convert null to undefined
    )

    // Filter users with fromTier in Period A
    const periodAUserkeys: string[] = []
    const periodAUserData = new Map<string, typeof periodADataMap extends Map<string, infer V> ? V : never>()
    
    periodADataMap.forEach((userData, userkey) => {
      if (userData.tier === fromTierNum) {
        periodAUserkeys.push(userkey)
        periodAUserData.set(userkey, userData)
      }
    })

    console.log(`📊 [Tier Movement Customers API] Period A: Found ${periodAUserkeys.length} users with tier ${fromTierNum} out of ${periodADataMap.size} total users`)
    
    // ✅ DEBUG: Log tier distribution in Period A
    const tierDistributionA = new Map<number, number>()
    periodADataMap.forEach((userData) => {
      const tier = userData.tier || 0
      tierDistributionA.set(tier, (tierDistributionA.get(tier) || 0) + 1)
    })
    console.log(`🔍 [Tier Movement Customers API] Period A tier distribution:`, Object.fromEntries(tierDistributionA))

    if (periodAUserkeys.length === 0) {
      console.warn(`⚠️ [Tier Movement Customers API] No users found in Period A for tier ${fromTierNum}. This might indicate a data mismatch with the chart.`)
      console.warn(`⚠️ Available tiers in Period A:`, Array.from(tierDistributionA.keys()).sort((a, b) => a - b))
      return NextResponse.json({
        customers: [],
        fromTierName: TIER_NAMES[fromTierNum] || `Tier ${fromTierNum}`,
        toTierName: TIER_NAMES[toTierNum] || `Tier ${toTierNum}`,
        movementType: fromTierNum === toTierNum ? 'STABLE' : (fromTierNum > toTierNum ? 'UPGRADE' : 'DOWNGRADE'),
        count: 0
      })
    }

    console.log(`📊 [Tier Movement Customers API] Fetching Period B data (${periodBStartDate} to ${periodBEndDate}) for ${periodAUserkeys.length} userkeys with tier ${toTierNum}`)

    // ✅ Query Period B data from blue_whale_usc with date range
    // Only query for userkeys from Period A (more efficient)
    const periodBDataMap = await aggregateUserDataByDateRange(
      periodBStartDate!,
      periodBEndDate!,
      periodAUserkeys, // Only query for these userkeys
      line || undefined,  // Convert null to undefined
      squadLead || undefined,  // Convert null to undefined
      channel || undefined  // Convert null to undefined
    )

    // Filter users with toTier in Period B
    const periodBUserData: Array<{
      userkey: string
      unique_code: string | null
      user_name: string | null
      line: string | null
      tier: number | null
      depositAmount: number
      withdrawAmount: number
      depositCases: number
      avgTransactionValue: number
    }> = []
    
    periodBDataMap.forEach((userData, userkey) => {
      if (userData.tier === toTierNum) {
        periodBUserData.push({
          userkey,
          ...userData
        })
      }
    })

    console.log(`📊 [Tier Movement Customers API] Period B: Found ${periodBUserData.length} users with tier ${toTierNum} out of ${periodBDataMap.size} queried users`)
    
    // ✅ DEBUG: Log tier distribution in Period B for the queried users
    const tierDistributionB = new Map<number, number>()
    periodBDataMap.forEach((userData) => {
      const tier = userData.tier || 0
      tierDistributionB.set(tier, (tierDistributionB.get(tier) || 0) + 1)
    })
    console.log(`🔍 [Tier Movement Customers API] Period B tier distribution for ${periodAUserkeys.length} queried users:`, Object.fromEntries(tierDistributionB))

    // ✅ Handle empty result gracefully (this is normal - customers might have moved or churned)
    if (periodBUserData.length === 0) {
      console.warn(`⚠️ [Tier Movement Customers] No customers found for movement ${fromTierNum} → ${toTierNum}.`)
      console.warn(`⚠️ This might indicate:`)
      console.warn(`   - Customers moved to other tiers:`, Array.from(tierDistributionB.keys()).filter(t => t !== toTierNum).sort((a, b) => a - b))
      console.warn(`   - Customers churned (no data in Period B)`)
      console.warn(`   - Data mismatch with chart (chart shows value > 0 but API finds 0 customers)`)
      return NextResponse.json({
        customers: [],
        fromTierName: TIER_NAMES[fromTierNum] || `Tier ${fromTierNum}`,
        toTierName: TIER_NAMES[toTierNum] || `Tier ${toTierNum}`,
        movementType: fromTierNum === toTierNum ? 'STABLE' : (fromTierNum > toTierNum ? 'UPGRADE' : 'DOWNGRADE'),
        count: 0
      })
    }

    // ✅ Sort customers by line/brand (alphabetically)
    const sortedPeriodBData = [...periodBUserData].sort((a, b) => {
      const lineA = (a.line || '').toLowerCase()
      const lineB = (b.line || '').toLowerCase()
      return lineA.localeCompare(lineB)
    })

    // ✅ Format customer data with comparison percentage (Period B vs Period A)
    const customers = sortedPeriodBData.map(customer => {
      // ✅ Period B values (current period) - already aggregated
      const depositAmount = customer.depositAmount
      const withdrawAmount = customer.withdrawAmount
      const ggr = depositAmount - withdrawAmount  // ✅ Period B GGR
      const atv = customer.avgTransactionValue  // ✅ Period B ATV

      // ✅ Get Period A data for comparison
      const prevData = periodAUserData.get(customer.userkey)
      const prevDA = prevData?.depositAmount || 0    // ✅ Period A DA
      const prevWithdraw = prevData?.withdrawAmount || 0
      const prevGGR = prevDA - prevWithdraw  // ✅ Period A GGR
      const prevATV = prevData?.avgTransactionValue || 0  // ✅ Period A ATV

      // ✅ Calculate comparison percentage: ((Period B - Period A) / Period A) * 100
      const daChangePercent = prevDA !== 0 
        ? ((depositAmount - prevDA) / Math.abs(prevDA)) * 100
        : null
      
      const ggrChangePercent = prevGGR !== 0 
        ? ((ggr - prevGGR) / Math.abs(prevGGR)) * 100
        : null
      
      const atvChangePercent = prevATV !== 0 
        ? ((atv - prevATV) / Math.abs(prevATV)) * 100
        : null

      return {
        unique_code: customer.unique_code || null,
        user_name: customer.user_name || null,
        line: customer.line || null,
        handler: null, // Will be null until handler column is added to blue_whale_usc
        daChangePercent: daChangePercent !== null ? Number(daChangePercent.toFixed(2)) : null,
        ggrChangePercent: ggrChangePercent !== null ? Number(ggrChangePercent.toFixed(2)) : null,
        atvChangePercent: atvChangePercent !== null ? Number(atvChangePercent.toFixed(2)) : null,
        assigne: null // For dropdown/assignment (will be populated when handler column is added)
      }
    })

    // Determine movement type
    let movementType = 'STABLE'
    if (fromTierNum > toTierNum) {
      movementType = 'UPGRADE' // Lower tier number = higher tier (e.g., 7->1)
    } else if (fromTierNum < toTierNum) {
      movementType = 'DOWNGRADE' // Higher tier number = lower tier (e.g., 1->7)
    }

    // ✅ DEBUG: Log sebelum return
    console.log('🔍 [Tier Movement Customers API] Returning response:', {
      customersLength: customers.length,
      customersArraySample: customers.slice(0, 3), // Sample first 3
      count: customers.length,
      movementType
    })
    
    return NextResponse.json({
      customers,
      fromTierName: TIER_NAMES[fromTierNum] || `Tier ${fromTierNum}`,
      toTierName: TIER_NAMES[toTierNum] || `Tier ${toTierNum}`,
      movementType,
      count: customers.length
    })

  } catch (error: any) {
    console.error('❌ [Tier Movement Customers API] Unexpected error:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      cause: error?.cause
    })
    
    // ✅ Return proper error response with detailed info for debugging
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error?.message || 'Unknown error occurred',
        type: error?.name || 'Error'
      },
      { status: 500 }
    )
  }
}

