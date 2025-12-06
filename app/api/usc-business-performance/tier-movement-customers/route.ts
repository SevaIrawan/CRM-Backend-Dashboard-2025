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
  userUniques?: string[],
  line?: string,
  squadLead?: string,
  channel?: string
): Promise<Map<string, {
  user_unique: string
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
    .select('user_unique, unique_code, user_name, line, tier_name, tier_group, deposit_amount, withdraw_amount, deposit_cases, date')
    .eq('currency', 'USC')
    .gte('date', startDate)
    .lte('date', endDate)
    .not('tier_name', 'is', null) // Only users with tier

  if (userUniques && userUniques.length > 0) {
    // Use batch processing for large arrays
    const BATCH_SIZE = 500
    const results: any[] = []
    
    for (let i = 0; i < userUniques.length; i += BATCH_SIZE) {
      const batch = userUniques.slice(i, i + BATCH_SIZE)
      const batchQuery = query.in('user_unique', batch)
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
    // No user_unique filter - get all data (with other filters)
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
  user_unique: string
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
    user_unique: string
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
    if (!row.user_unique) return
    
    // Apply filters in memory (if not already filtered)
    if (line && line !== 'All' && line !== 'ALL' && row.line !== line) return
    if (squadLead && squadLead !== 'All' && squadLead !== 'ALL' && row.squad_lead !== squadLead) return
    if (channel && channel !== 'All' && channel !== 'ALL' && row.traffic !== channel) return
    
    if (!userMap.has(row.user_unique)) {
      userMap.set(row.user_unique, {
        user_unique: row.user_unique,
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
    
    const user = userMap.get(row.user_unique)!
    
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
  
  userMap.forEach((user, userUnique) => {
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
    
    result.set(userUnique, {
      user_unique: user.user_unique,
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

    // ------------------------------------------------------------------
    // ALIGN DATASET WITH MATRIX: REBUILD MOVEMENTS USING user_unique
    // ------------------------------------------------------------------
    console.log(`📊 [Tier Movement Customers API] Fetching Period A data (${periodAStartDate} to ${periodAEndDate})`)
    const periodADataMap = await aggregateUserDataByDateRange(
      periodAStartDate!,
      periodAEndDate!,
      undefined,
      line || undefined,
      squadLead || undefined,
      channel || undefined
    )

    console.log(`📊 [Tier Movement Customers API] Fetching Period B data (${periodBStartDate} to ${periodBEndDate})`)
    const periodBDataMap = await aggregateUserDataByDateRange(
      periodBStartDate!,
      periodBEndDate!,
      undefined,
      line || undefined,
      squadLead || undefined,
      channel || undefined
    )

    const currentMapped = Array.from(periodBDataMap.entries()).map(([userUnique, data]) => ({
      user_unique: userUnique,
      uniqueCode: data.unique_code || userUnique,
      line: data.line || 'All',
      tier: data.tier || 7,
      score: 0
    }))

    const previousMapped = Array.from(periodADataMap.entries()).map(([userUnique, data]) => ({
      user_unique: userUnique,
      uniqueCode: data.unique_code || userUnique,
      line: data.line || 'All',
      tier: data.tier || 7,
      score: 0
    }))

    // History before A for NEW vs REACTIVATION
    const historyBeforeAQuery = supabase
      .from('blue_whale_usc')
      .select('user_unique')
      .eq('currency', 'USC')
      .lt('date', periodAStartDate!)
      .not('tier_name', 'is', null)
    if (line && line !== 'All' && line !== 'ALL') historyBeforeAQuery.eq('line', line)
    if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') historyBeforeAQuery.eq('squad_lead', squadLead)
    if (channel && channel !== 'All' && channel !== 'ALL') historyBeforeAQuery.eq('traffic', channel)

    const historyBeforeASet = new Set<string>()
    const BATCH_HISTORY = 5000
    let offsetHist = 0
    let moreHist = true
    while (moreHist) {
      const { data: histData, error: histErr } = await historyBeforeAQuery.range(offsetHist, offsetHist + BATCH_HISTORY - 1)
      if (histErr) break
      if (!histData || histData.length === 0) {
        moreHist = false
      } else {
        histData.forEach(row => {
          if (row.user_unique) historyBeforeASet.add(String(row.user_unique))
        })
        moreHist = histData.length === BATCH_HISTORY
        offsetHist += BATCH_HISTORY
      }
    }

    const prevMap = new Map(previousMapped.map(p => [p.user_unique, p]))
    const movements: Array<{
      user_unique: string
      uniqueCode: string
      line: string
      movementType: 'UPGRADE' | 'DOWNGRADE' | 'STABLE' | 'NEW' | 'CHURNED' | 'REACTIVATION'
      fromTier: number | null
      toTier: number | null
      tierChange: number
    }> = []

    currentMapped.forEach(current => {
      const previous = prevMap.get(current.user_unique)
      if (!previous) {
        const hasHistoryBeforeA = historyBeforeASet.has(current.user_unique)
        const movementType: 'NEW' | 'REACTIVATION' = hasHistoryBeforeA ? 'REACTIVATION' : 'NEW'
        movements.push({
          user_unique: current.user_unique,
          uniqueCode: current.uniqueCode,
          line: current.line,
          movementType,
          fromTier: null,
          toTier: current.tier,
          tierChange: 0
        })
      } else {
        const tierChange = previous.tier - current.tier
        let movementType: 'UPGRADE' | 'DOWNGRADE' | 'STABLE' = 'STABLE'
        if (tierChange > 0) movementType = 'UPGRADE'
        else if (tierChange < 0) movementType = 'DOWNGRADE'

        movements.push({
          user_unique: current.user_unique,
          uniqueCode: current.uniqueCode,
          line: current.line,
          movementType,
          fromTier: previous.tier,
          toTier: current.tier,
          tierChange
        })
        prevMap.delete(current.user_unique)
      }
    })

    prevMap.forEach(previous => {
      movements.push({
        user_unique: previous.user_unique,
        uniqueCode: previous.uniqueCode,
        line: previous.line,
        movementType: 'CHURNED',
        fromTier: previous.tier,
        toTier: null,
        tierChange: 0
      })
    })

    // Filter movements for requested from/to tier
    const filtered = movements.filter(m => m.fromTier === fromTierNum && m.toTier === toTierNum)

    const customers = filtered.map(m => {
      const curr = periodBDataMap.get(m.user_unique)
      const prev = periodADataMap.get(m.user_unique)

      const depositAmount = curr?.depositAmount || 0
      const withdrawAmount = curr?.withdrawAmount || 0
      const ggr = depositAmount - withdrawAmount
      const atv = curr?.avgTransactionValue || 0

      const prevDA = prev?.depositAmount || 0
      const prevWithdraw = prev?.withdrawAmount || 0
      const prevGGR = prevDA - prevWithdraw
      const prevATV = prev?.avgTransactionValue || 0

      const daChangePercent = prevDA !== 0 ? ((depositAmount - prevDA) / Math.abs(prevDA)) * 100 : null
      const ggrChangePercent = prevGGR !== 0 ? ((ggr - prevGGR) / Math.abs(prevGGR)) * 100 : null
      const atvChangePercent = prevATV !== 0 ? ((atv - prevATV) / Math.abs(prevATV)) * 100 : null

      return {
        user_unique: m.user_unique,
        unique_code: curr?.unique_code || m.uniqueCode || null,
        user_name: curr?.user_name || null,
        line: curr?.line || m.line || null,
        handler: null,
        daChangePercent: daChangePercent !== null ? Number(daChangePercent.toFixed(2)) : null,
        ggrChangePercent: ggrChangePercent !== null ? Number(ggrChangePercent.toFixed(2)) : null,
        atvChangePercent: atvChangePercent !== null ? Number(atvChangePercent.toFixed(2)) : null,
        assigne: null
      }
    })

    // Sort by line then unique_code for consistency
    const sortedCustomers = customers.sort((a, b) => {
      const lineA = (a.line || '').toLowerCase()
      const lineB = (b.line || '').toLowerCase()
      if (lineA !== lineB) return lineA.localeCompare(lineB)
      const codeA = (a.unique_code || '').toLowerCase()
      const codeB = (b.unique_code || '').toLowerCase()
      return codeA.localeCompare(codeB)
    })

    const movementType = fromTierNum === toTierNum
      ? 'STABLE'
      : (fromTierNum > toTierNum ? 'UPGRADE' : 'DOWNGRADE')

    return NextResponse.json({
      customers: sortedCustomers,
      fromTierName: TIER_NAMES[fromTierNum] || `Tier ${fromTierNum}`,
      toTierName: TIER_NAMES[toTierNum] || `Tier ${toTierNum}`,
      movementType,
      count: sortedCustomers.length
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

