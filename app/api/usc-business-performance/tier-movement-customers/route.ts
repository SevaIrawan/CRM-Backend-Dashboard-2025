import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
// Mapping tier lokal (tidak bergantung ke file KMeans)
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

// Tier name mapping helper
function buildTierNameMap() {
  const map = new Map<string, number>()
  const add = (label: string, num: number) => {
    const norm = label.toLowerCase()
    map.set(norm, num)
    map.set(norm.replace(/\s|_/g, ''), num)
  }

  Object.entries(TIER_NAMES).forEach(([numStr, name]) => {
    const num = parseInt(numStr, 10)
    add(name, num)
    if (name.toLowerCase().startsWith('tier ')) {
      add(name.substring(5), num)
    }
  })

  add('p1', 4) // Tier P1
  add('p2', 5) // Tier P2
  add('nd_p', 6) // Tier ND_P
  add('ndp', 6)
  add('nd p', 6)
  add('supervip', 10)
  add('regular', 1)

  return map
}

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
  tier_name: string | null
  line: string | null
  tier: number | null
  depositAmount: number
  withdrawAmount: number
  depositCases: number
  avgTransactionValue: number
  first_deposit_date: string | null // ✅ Include first_deposit_date for ND tier validation
}>> {
  let query = supabase
    .from('blue_whale_usc')
    .select('user_unique, unique_code, user_name, line, tier_name, tier_group, deposit_amount, withdraw_amount, deposit_cases, date, first_deposit_date')
    .eq('currency', 'USC')
    .gte('date', startDate)
    .lte('date', endDate)
    .not('tier_name', 'is', null) // Only users with tier
    .gt('deposit_cases', 0) // Only active users (follow retention pattern)
    .order('user_unique', { ascending: true })
    .order('date', { ascending: true })

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
    // CRITICAL: Increase batch size and ensure consistent ordering for data consistency
    const BATCH_SIZE = 10000
    let allData: any[] = []
    let offset = 0
    let hasMore = true
    
    while (hasMore) {
      // CRITICAL: Rebuild query for each batch to ensure ordering is preserved
      // This prevents data inconsistency across batches
      let batchQuery = supabase
        .from('blue_whale_usc')
        .select('user_unique, unique_code, user_name, line, tier_name, tier_group, deposit_amount, withdraw_amount, deposit_cases, date, first_deposit_date')
        .eq('currency', 'USC')
        .gte('date', startDate)
        .lte('date', endDate)
        .not('tier_name', 'is', null)
        .gt('deposit_cases', 0)
        .order('user_unique', { ascending: true })
        .order('date', { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1)

      // Re-apply filters for each batch
      if (line && line !== 'All' && line !== 'ALL') {
        batchQuery = batchQuery.eq('line', line)
      }
      if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
        batchQuery = batchQuery.eq('squad_lead', squadLead)
      }
      if (channel && channel !== 'All' && channel !== 'ALL') {
        batchQuery = batchQuery.eq('traffic', channel)
      }
      
      const { data, error } = await batchQuery
      
      if (error) {
        console.error(`❌ [Tier Movement Customers] Error fetching batch at offset ${offset}:`, error)
        break
      }
      
      if (!data || data.length === 0) {
        hasMore = false
      } else {
        // CRITICAL: Validate data is within date range before adding
        const validData = data.filter((row: any) => {
          const rowDate = row.date
          return rowDate && rowDate >= startDate && rowDate <= endDate
        })
        
        if (validData.length !== data.length) {
          console.warn(`⚠️ [Tier Movement Customers] Filtered ${data.length - validData.length} records outside date range in batch at offset ${offset}`)
        }
        
        allData.push(...validData)
        hasMore = data.length === BATCH_SIZE
        offset += BATCH_SIZE
        
        // Log progress for first batch
        if (offset === BATCH_SIZE) {
          console.log(`📊 [Tier Movement Customers] First batch: ${validData.length} valid records (date range: ${startDate} to ${endDate})`)
        }
      }
      
      // Safety limit
      if (allData.length > 200000) {
        console.warn('⚠️ [Tier Movement Customers] Safety limit reached: 200,000 records')
        break
      }
    }
    
    console.log(`📊 [Tier Movement Customers] Total records fetched: ${allData.length} for date range ${startDate} to ${endDate}`)
    
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
  tier_name: string | null
  line: string | null
  tier: number | null
  depositAmount: number
  withdrawAmount: number
  depositCases: number
  avgTransactionValue: number
  first_deposit_date: string | null // ✅ Include first_deposit_date for ND tier validation
}> {
  const nameToNumber = new Map<string, number>()
  Object.entries(TIER_NAMES).forEach(([num, name]) => {
    const n = parseInt(num, 10)
    const norm = name.toLowerCase()
    nameToNumber.set(norm, n)
    nameToNumber.set(norm.replace(/\s|_/g, ''), n)
  })

  const nameToTierNumber = buildTierNameMap()

  const userMap = new Map<string, {
    user_unique: string
    unique_code: string | null
    user_name: string | null
    tier_name: string | null
    line: string | null
    tier: number | null
    tierNumbers: Set<number> // Track all tier numbers that appear in period
    depositAmount: number
    withdrawAmount: number
    depositCases: number
    dates: Set<string> // Track dates
    first_deposit_date: string | null // ✅ Track first_deposit_date for ND tier validation
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
      tier_name: typeof row.tier_name === 'string' && row.tier_name.trim().length > 0
        ? row.tier_name.trim()
        : null,
      tier: null,
        tierNumbers: new Set(),
        depositAmount: 0,
        withdrawAmount: 0,
        depositCases: 0,
        dates: new Set(),
        first_deposit_date: row.first_deposit_date || null // ✅ Store first_deposit_date
      })
    }
    
    const user = userMap.get(row.user_unique)!
    
    // ✅ Track first_deposit_date (use earliest date if multiple)
    if (row.first_deposit_date) {
      if (!user.first_deposit_date || row.first_deposit_date < user.first_deposit_date) {
        user.first_deposit_date = row.first_deposit_date
      }
    }
    
    // Aggregate metrics
    user.depositAmount += Number(row.deposit_amount) || 0
    user.withdrawAmount += Number(row.withdraw_amount) || 0
    user.depositCases += Number(row.deposit_cases) || 0
    
    // Track tier number for determination (use tier_name to get tier number)
      let parsedTier: number | null = null
    
    if (row.tier_name) {
      const norm = String(row.tier_name).trim().toLowerCase()
      const tierNum = nameToTierNumber.get(norm) ?? nameToTierNumber.get(norm.replace(/\s|_/g, ''))
      if (tierNum !== undefined) {
        parsedTier = tierNum
      }
    }

    if (parsedTier !== null && !isNaN(parsedTier) && nameToTierNumber.size > 0) {
      user.tierNumbers.add(parsedTier)
    }
    
    // Track dates
    if (row.date) {
      user.dates.add(row.date)
    }
  })
  
  // Second pass: determine tier (highest tier number in period)
  // Tier hierarchy: Tier 1 (highest) > Tier 2 > ... > Tier 7 > Regular (lowest)
  const result = new Map<string, {
    user_unique: string
    unique_code: string | null
    user_name: string | null
    tier_name: string | null
    line: string | null
    tier: number | null
    depositAmount: number
    withdrawAmount: number
    depositCases: number
    avgTransactionValue: number
    first_deposit_date: string | null // ✅ Include first_deposit_date for ND tier validation
  }>()
  
  userMap.forEach((user, userUnique) => {
    // CRITICAL: Determine tier: highest tier number in period
    // Tier hierarchy: 1=Regular (lowest), 10=Super VIP (highest)
    // Therefore: Higher tier number = Higher tier level
    let highestTier: number | null = null
    
    if (user.tierNumbers.size > 0) {
      const tierNumbersArray = Array.from(user.tierNumbers)
      highestTier = Math.max(...tierNumbersArray)
      
      // Validation: Ensure tier number is valid (1-10)
      if (highestTier < 1 || highestTier > 10) {
        console.warn(`⚠️ [Tier Movement Customers] Invalid tier number ${highestTier} for user ${userUnique}, skipping`)
        return
      }
    }
    
    // Calculate ATV
    const avgTransactionValue = user.depositCases > 0
      ? user.depositAmount / user.depositCases
      : 0
    
    // CRITICAL: Determine tier_name from highest tier number
    // If user has multiple tier_names in period, use the one corresponding to highest tier
    let finalTierName: string | null = user.tier_name || null
    if (highestTier && TIER_NAMES[highestTier]) {
      finalTierName = TIER_NAMES[highestTier]
    }
    
    result.set(userUnique, {
      user_unique: user.user_unique,
      unique_code: user.unique_code,
      user_name: user.user_name,
      tier_name: finalTierName,  // ✅ Use tier_name from highest tier
      line: user.line,
      tier: highestTier,  // ✅ Use highestTier (tier tertinggi dalam period)
      depositAmount: user.depositAmount,
      withdrawAmount: user.withdrawAmount,
      depositCases: user.depositCases,
      avgTransactionValue,
      first_deposit_date: user.first_deposit_date // ✅ Include first_deposit_date
    })
  })
  
  console.log(`📊 [Tier Movement Customers] Aggregated ${result.size} unique users from ${rawData.length} records`)
  
  return result
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fromTier = searchParams.get('fromTier')
    const toTier = searchParams.get('toTier')
    const movementTypeParam = searchParams.get('movementType') // NEW | REACTIVATION | CHURNED | UPGRADE | DOWNGRADE | STABLE
    
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
    const specialMovement = movementTypeParam === 'NEW' || movementTypeParam === 'REACTIVATION' || movementTypeParam === 'CHURNED'

    if (!specialMovement) {
    if (!fromTier || !toTier) {
      return NextResponse.json(
        { error: 'Missing required parameters: fromTier and toTier' },
        { status: 400 }
      )
      }
    }
    
    if (useDateRange && (!periodAStartDate || !periodAEndDate || !periodBStartDate || !periodBEndDate)) {
      return NextResponse.json(
        { error: 'Invalid date range parameters' },
        { status: 400 }
      )
    }

    const fromTierNum = specialMovement ? null : parseInt(fromTier || '')
    const toTierNum = specialMovement ? null : parseInt(toTier || '')

    if (!specialMovement && (isNaN(fromTierNum!) || isNaN(toTierNum!))) {
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

    const orderedTiers = Object.keys(TIER_NAMES).map(n => parseInt(n, 10)).sort((a, b) => a - b)
    const orderIndex = new Map<number, number>()
    orderedTiers.forEach((tierNum, idx) => orderIndex.set(tierNum, idx))

    const currentMapped = Array.from(periodBDataMap.entries()).flatMap(([userUnique, data]) => {
      if (data.tier === null) return []
      return [{
        user_unique: userUnique,
        uniqueCode: data.unique_code || userUnique,
        line: data.line || 'All',
        tier: data.tier,
        score: 0,
        first_deposit_date: data.first_deposit_date || null // ✅ Include first_deposit_date for ND tier validation
      }]
    })

    const previousMapped = Array.from(periodADataMap.entries()).flatMap(([userUnique, data]) => {
      if (data.tier === null) return []
      return [{
        user_unique: userUnique,
        uniqueCode: data.unique_code || userUnique,
        line: data.line || 'All',
        tier: data.tier,
        score: 0
      }]
    })

    // History before A for NEW vs REACTIVATION
    // ✅ History: gunakan semua aktivitas sebelum Period A (tanpa filter tier_name) tapi hanya user aktif (deposit_cases > 0)
    const historyBeforeAQuery = supabase
      .from('blue_whale_usc')
      .select('user_unique')
      .eq('currency', 'USC')
      .lt('date', periodAStartDate!)
      .gt('deposit_cases', 0)
    if (line && line !== 'All' && line !== 'ALL') historyBeforeAQuery.eq('line', line)
    if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') historyBeforeAQuery.eq('squad_lead', squadLead)
    if (channel && channel !== 'All' && channel !== 'ALL') historyBeforeAQuery.eq('traffic', channel)

    // CRITICAL: History query with consistent ordering and batch processing
    const historyBeforeASet = new Set<string>()
    const BATCH_HISTORY = 10000
    let offsetHist = 0
    let moreHist = true
    
    while (moreHist) {
      // CRITICAL: Rebuild query for each batch to ensure consistency
      let historyBatchQuery = supabase
        .from('blue_whale_usc')
        .select('user_unique')
        .eq('currency', 'USC')
        .lt('date', periodAStartDate!)
        .gt('deposit_cases', 0)
        .order('user_unique', { ascending: true })
        .order('date', { ascending: true })
        .range(offsetHist, offsetHist + BATCH_HISTORY - 1)
      
      // Re-apply filters
      if (line && line !== 'All' && line !== 'ALL') {
        historyBatchQuery = historyBatchQuery.eq('line', line)
      }
      if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
        historyBatchQuery = historyBatchQuery.eq('squad_lead', squadLead)
      }
      if (channel && channel !== 'All' && channel !== 'ALL') {
        historyBatchQuery = historyBatchQuery.eq('traffic', channel)
      }
      
      const { data: histData, error: histErr } = await historyBatchQuery
      
      if (histErr) {
        console.error(`❌ [Tier Movement Customers] History batch error at offset ${offsetHist}:`, histErr)
        break
      }
      
      if (!histData || histData.length === 0) {
        moreHist = false
      } else {
        histData.forEach(row => {
          if (row.user_unique) historyBeforeASet.add(String(row.user_unique))
        })
        moreHist = histData.length === BATCH_HISTORY
        offsetHist += BATCH_HISTORY
      }
      
      // Safety limit
      if (historyBeforeASet.size > 500000) {
        console.warn('⚠️ [Tier Movement Customers] History safety limit reached: 500,000 users')
        break
      }
    }
    
    console.log(`📊 [Tier Movement Customers] History before Period A: ${historyBeforeASet.size} unique users`)

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
        // ✅ CRITICAL: Determine NEW vs REACTIVATION using first_deposit_date
        // NEW (ND Tier) = first_deposit_date dalam Period B
        // REACTIVATION = first_deposit_date SEBELUM Period B (atau tidak ada first_deposit_date tapi ada history sebelum Period A)
        let movementType: 'NEW' | 'REACTIVATION' = 'REACTIVATION' // Default to REACTIVATION
        
        if (current.first_deposit_date) {
          // ✅ CRITICAL: Use string comparison to avoid timezone issues
          // Date format from DB is YYYY-MM-DD, compare as strings for accuracy
          const fddStr = String(current.first_deposit_date).trim()
          
          // Validate date format (YYYY-MM-DD)
          if (fddStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // String comparison: YYYY-MM-DD format allows direct string comparison
            if (fddStr >= periodBStartDate! && fddStr <= periodBEndDate!) {
              // ✅ first_deposit_date dalam Period B = NEW (ND Tier)
              movementType = 'NEW'
            } else {
              // first_deposit_date SEBELUM atau SETELAH Period B = REACTIVATION
              movementType = 'REACTIVATION'
            }
          } else {
            // Invalid date format: use history check as fallback
            const hasHistoryBeforeA = historyBeforeASet.has(current.user_unique)
            movementType = hasHistoryBeforeA ? 'REACTIVATION' : 'NEW'
          }
        } else {
          // No first_deposit_date: use history check as fallback
          const hasHistoryBeforeA = historyBeforeASet.has(current.user_unique)
          movementType = hasHistoryBeforeA ? 'REACTIVATION' : 'NEW'
        }
        
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
        // Arah pakai index urutan A-Z: toIdx - fromIdx
        const fromIdx = orderIndex.get(previous.tier) ?? 0
        const toIdx = orderIndex.get(current.tier) ?? 0
        const tierChange = toIdx - fromIdx // positif = upgrade
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
    const filtered = specialMovement
      ? movements.filter(m => m.movementType === (movementTypeParam as any))
      : movements.filter(m => m.fromTier === fromTierNum && m.toTier === toTierNum)

    const customers = filtered.map(m => {
      const curr = periodBDataMap.get(m.user_unique)
      const prev = periodADataMap.get(m.user_unique)

      // Spending source: for NEW/REACTIVATION use Period B only; for CHURNED use Period A only; others compare both
      const useCurrentOnly = m.movementType === 'NEW' || m.movementType === 'REACTIVATION'
      const usePreviousOnly = m.movementType === 'CHURNED'

      const depositAmount = usePreviousOnly ? (prev?.depositAmount || 0) : (curr?.depositAmount || 0)
      const withdrawAmount = usePreviousOnly ? (prev?.withdrawAmount || 0) : (curr?.withdrawAmount || 0)
      const depositCases = usePreviousOnly ? (prev?.depositCases || 0) : (curr?.depositCases || 0)
      const ggr = depositAmount - withdrawAmount
      const atv = depositCases > 0 ? depositAmount / depositCases : 0

      // ✅ CRITICAL: Comparison logic for Period B to A
      // For NEW/REACTIVATION: No Period A data, so comparison = null
      // For CHURNED: No Period B data, so comparison = null
      // For UPGRADE/DOWNGRADE/STABLE: Compare Period B (current) vs Period A (previous)
      const prevDA = (useCurrentOnly || usePreviousOnly) ? 0 : (prev?.depositAmount || 0)
      const prevWithdraw = (useCurrentOnly || usePreviousOnly) ? 0 : (prev?.withdrawAmount || 0)
      const prevGGR = prevDA - prevWithdraw
      const prevATV = (useCurrentOnly || usePreviousOnly) ? 0 : (prev?.avgTransactionValue || 0)

      // ✅ Calculate comparison: ((Period B - Period A) / |Period A|) * 100
      // Only calculate if both periods have data (not NEW/REACTIVATION/CHURNED)
      const canCompare = !useCurrentOnly && !usePreviousOnly
      const daChangePercent = (canCompare && prevDA !== 0) ? ((depositAmount - prevDA) / Math.abs(prevDA)) * 100 : null
      const ggrChangePercent = (canCompare && prevGGR !== 0) ? ((ggr - prevGGR) / Math.abs(prevGGR)) * 100 : null
      const atvChangePercent = (canCompare && prevATV !== 0) ? ((atv - prevATV) / Math.abs(prevATV)) * 100 : null

      return {
        user_unique: m.user_unique,
        unique_code: curr?.unique_code || prev?.unique_code || m.uniqueCode || null,
        user_name: curr?.user_name || prev?.user_name || null,
        tier: curr?.tier ?? prev?.tier ?? null,
        tier_name: curr?.tier_name || prev?.tier_name || null,
        line: curr?.line || prev?.line || m.line || null,
        handler: null,
        depositAmount,
        withdrawAmount,
        depositCases,
        avgTransactionValue: atv,
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

    const movementType = specialMovement
      ? (movementTypeParam as any)
      : (() => {
        const fromIdx = orderIndex.get(fromTierNum!) ?? 0
        const toIdx = orderIndex.get(toTierNum!) ?? 0
        if (fromIdx === toIdx) return 'STABLE'
        return toIdx > fromIdx ? 'UPGRADE' : 'DOWNGRADE'
      })()
    
    return NextResponse.json({
      customers: sortedCustomers,
      fromTierName: specialMovement ? movementType : (TIER_NAMES[fromTierNum!] || `Tier ${fromTierNum}`),
      toTierName: specialMovement ? movementType : (TIER_NAMES[toTierNum!] || `Tier ${toTierNum}`),
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

