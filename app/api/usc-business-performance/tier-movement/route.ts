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

const ORDERED_TIERS = TIER_DEFINITIONS.map(t => t.num)

function getTierMovementSummary(movements: Array<{ movementType: string }>) {
  const summary = {
    totalUpgrades: 0,
    totalDowngrades: 0,
    totalStable: 0,
    totalNew: 0,
    totalReactivation: 0,
    totalChurned: 0
  }

  movements.forEach(m => {
    switch (m.movementType) {
      case 'UPGRADE':
        summary.totalUpgrades += 1
        break
      case 'DOWNGRADE':
        summary.totalDowngrades += 1
        break
      case 'STABLE':
        summary.totalStable += 1
        break
      case 'NEW':
        summary.totalNew += 1
        break
      case 'REACTIVATION':
        summary.totalReactivation += 1
        break
      case 'CHURNED':
        summary.totalChurned += 1
        break
      default:
        break
    }
  })

  return summary
}

function generateTierMovementMatrix(movements: Array<{ fromTier: number | null; toTier: number | null }>) {
  const matrix: Record<number, Record<number, number>> = {}
  const totalOut: Record<number, number> = {}
  const totalIn: Record<number, number> = {}
  ORDERED_TIERS.forEach(from => {
    matrix[from] = {}
    ORDERED_TIERS.forEach(to => {
      matrix[from][to] = 0
    })
    totalOut[from] = 0
    totalIn[from] = 0
  })

  let grandTotal = 0

  movements.forEach(m => {
    if (m.fromTier !== null && m.toTier !== null) {
      matrix[m.fromTier][m.toTier] = (matrix[m.fromTier][m.toTier] || 0) + 1
      totalOut[m.fromTier] = (totalOut[m.fromTier] || 0) + 1
      totalIn[m.toTier] = (totalIn[m.toTier] || 0) + 1
      grandTotal += 1
    }
  })

  return {
    matrix,
    totalOut,
    totalIn,
    grandTotal
  }
}

/**
 * Tier name mapping helper
 * Menerima variasi penulisan tier_name dari DB (spasi/underscore/hilang prefix "Tier")
 */
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
    // jika ada prefix "Tier ", tambahkan versi tanpa prefix
    if (name.toLowerCase().startsWith('tier ')) {
      add(name.substring(5), num)
    }
  })

  // alias eksplisit umum
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
 * Helper: Aggregate blue_whale_usc data per userkey within a date range
 * Returns aggregated data with tier determination (highest tier in period)
 * SAME LOGIC as tier-movement-customers API
 * Key: userkey (NOT userkey_line)
 */
async function aggregateUserDataByDateRange(
  startDate: string,
  endDate: string,
  line?: string,
  squadLead?: string,
  channel?: string
): Promise<Map<string, {
  user_unique: string
  unique_code: string | null
  user_name: string | null
  line: string | null
  tier: number | null
  first_deposit_date: string | null // ✅ Include first_deposit_date for ND tier validation
}>> {
  let query = supabase
    .from('blue_whale_usc')
    .select('user_unique, unique_code, user_name, line, tier_name, date, deposit_cases, first_deposit_date')
    .eq('currency', 'USC')
    .gte('date', startDate)
    .lte('date', endDate)
    .not('tier_name', 'is', null) // Only users with tier
    .gt('deposit_cases', 0) // Only active users (follow retention pattern)
    .order('user_unique', { ascending: true })
    .order('date', { ascending: true })

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
        .select('user_unique, unique_code, user_name, line, tier_name, date, deposit_cases, first_deposit_date')
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
      console.error(`❌ [Tier Movement] Error fetching batch at offset ${offset}:`, error)
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
        console.warn(`⚠️ [Tier Movement] Filtered ${data.length - validData.length} records outside date range in batch at offset ${offset}`)
      }
      
      allData.push(...validData)
      hasMore = data.length === BATCH_SIZE
      offset += BATCH_SIZE
      
      // Log progress for first batch
      if (offset === BATCH_SIZE) {
        console.log(`📊 [Tier Movement] First batch: ${validData.length} valid records (date range: ${startDate} to ${endDate})`)
      }
    }

    // Safety limit
    if (allData.length > 200000) {
      console.warn('⚠️ [Tier Movement] Safety limit reached: 200,000 records')
      break
    }
  }
  
  console.log(`📊 [Tier Movement] Total records fetched: ${allData.length} for date range ${startDate} to ${endDate}`)

  const nameToNumber = buildTierNameMap()

  // Aggregate per userkey (NOT userkey_line) and determine tier
  const userMap = new Map<string, {
    user_unique: string
    unique_code: string | null
    user_name: string | null
    line: string | null
    tierNumbers: Set<number>
    first_deposit_date: string | null // ✅ Track first_deposit_date for ND tier validation
  }>()

  // First pass: track all tier numbers for each userkey
  allData.forEach(row => {
    if (!row.user_unique) return

    const userUnique = String(row.user_unique)

    if (!userMap.has(userUnique)) {
      userMap.set(userUnique, {
        user_unique: userUnique,
        unique_code: row.unique_code || null,
        user_name: row.user_name || null,
        line: row.line || null,
        tierNumbers: new Set(),
        first_deposit_date: row.first_deposit_date || null // ✅ Store first_deposit_date
      })
    }

    const user = userMap.get(userUnique)!

    // ✅ Track first_deposit_date (use earliest date if multiple)
    if (row.first_deposit_date) {
      if (!user.first_deposit_date || row.first_deposit_date < user.first_deposit_date) {
        user.first_deposit_date = row.first_deposit_date
      }
    }

    // Track tier number untuk penentuan (pakai tier_name dari DB)
    if (row.tier_name) {
      const norm = String(row.tier_name).trim().toLowerCase()
      const tier = nameToNumber.get(norm) ?? nameToNumber.get(norm.replace(/\s|_/g, ''))
      if (tier !== undefined) {
        user.tierNumbers.add(tier)
      }
    }
  })

  // Second pass: determine tier (highest tier = lowest tier number)
  const result = new Map<string, {
    user_unique: string
    unique_code: string | null
    user_name: string | null
    line: string | null
    tier: number | null
    first_deposit_date: string | null // ✅ Include first_deposit_date in result
  }>()

  userMap.forEach((user, userUnique) => {
    let highestTier: number | null = null
    if (user.tierNumbers.size > 0) {
      // CRITICAL: Tier number mapping: 1=Regular (lowest), 10=Super VIP (highest)
      // Therefore: Higher tier number = Higher tier level
      // Math.max() correctly selects the highest tier number = highest tier level
      const tierNumbersArray = Array.from(user.tierNumbers)
      highestTier = Math.max(...tierNumbersArray)
      
      // Validation: Ensure tier number is valid (1-10)
      if (highestTier < 1 || highestTier > 10) {
        console.warn(`⚠️ [Tier Movement] Invalid tier number ${highestTier} for user ${userUnique}, skipping`)
        return
      }
    }

    result.set(userUnique, {
      user_unique: user.user_unique,
      unique_code: user.unique_code,
      user_name: user.user_name,
      line: user.line,
      tier: highestTier,
      first_deposit_date: user.first_deposit_date // ✅ Include first_deposit_date
    })
  })
  
  console.log(`📊 [Tier Movement] Aggregated ${result.size} unique users from ${allData.length} records`)

  return result
}

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - TIER MOVEMENT API
 * ============================================================================
 * 
 * Purpose: Track tier upgrades/downgrades between periods
 * Returns: Movement summary, upgrade/downgrade breakdown, top movers
 * 
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Support both old format (year/month) and new format (date ranges like Customer Tier Trends)
    const currentYear = searchParams.get('currentYear')
    const currentMonth = searchParams.get('currentMonth')
    const previousYear = searchParams.get('previousYear')
    const previousMonth = searchParams.get('previousMonth')
    
    // New format: date ranges (same as Customer Tier Trends)
    const periodAStart = searchParams.get('periodAStart')
    const periodAEnd = searchParams.get('periodAEnd')
    const periodBStart = searchParams.get('periodBStart')
    const periodBEnd = searchParams.get('periodBEnd')
    
    const line = searchParams.get('line')
    const squadLead = searchParams.get('squadLead')
    const channel = searchParams.get('channel')
    
    // Helper function to extract year and month from date string
    const extractYearMonth = (dateStr: string): { year: number; month: string } | null => {
      if (!dateStr) return null
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return null
      
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
      
      return {
        year: date.getFullYear(),
        month: monthNames[date.getMonth()]
      }
    }
    
    // ✅ PREFER date range format (required for blue_whale_usc)
    // Support both date range and year/month for backward compatibility
    let useDateRange = false
    let periodAStartDate: string | null = null
    let periodAEndDate: string | null = null
    let periodBStartDate: string | null = null
    let periodBEndDate: string | null = null
    let currentPeriod: { year: number; month: string } | null = null
    let previousPeriod: { year: number; month: string } | null = null
    
    if (periodBStart && periodBEnd && periodAStart && periodAEnd) {
      // ✅ Use date range format (preferred - same as Customer Tier Trends and tier-movement-customers)
      useDateRange = true
      periodAStartDate = periodAStart
      periodAEndDate = periodAEnd
      periodBStartDate = periodBStart
      periodBEndDate = periodBEnd
      
      // Also extract year/month for display
      const periodB = extractYearMonth(periodBEnd)
      const periodA = extractYearMonth(periodAEnd)
      currentPeriod = periodB
      previousPeriod = periodA
    } else if (currentYear && currentMonth && previousYear && previousMonth) {
      // Use year/month format (old format - convert to date range)
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
      return NextResponse.json({
        success: false,
        error: 'Required: either (currentYear, currentMonth, previousYear, previousMonth) or (periodAStart, periodAEnd, periodBStart, periodBEnd)'
      }, { status: 400 })
    }
    
    if (!periodAStartDate || !periodAEndDate || !periodBStartDate || !periodBEndDate) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date range parameters'
      }, { status: 400 })
    }

    console.log('📊 [Tier Movement API] Fetching data from blue_whale_usc:', {
      periodA: { start: periodAStartDate, end: periodAEndDate },
      periodB: { start: periodBStartDate, end: periodBEndDate },
      line: line || 'All',
      squadLead: squadLead || 'All',
      channel: channel || 'All'
    })
    
    // ✅ Fetch Period A data from blue_whale_usc (same logic as tier-movement-customers)
    const periodADataMap = await aggregateUserDataByDateRange(
      periodAStartDate,
      periodAEndDate,
      line || undefined,
      squadLead || undefined,
      channel || undefined
    )
    
    // ✅ Fetch Period B data from blue_whale_usc (same logic as tier-movement-customers)
    const periodBDataMap = await aggregateUserDataByDateRange(
      periodBStartDate,
      periodBEndDate,
      line || undefined,
      squadLead || undefined,
      channel || undefined
    )

    // ✅ History sebelum period A untuk deteksi Reactivation
    // ✅ History: gunakan semua aktivitas sebelum Period A (tanpa filter tier_name) tapi hanya user yang benar-benar aktif (deposit_cases > 0)
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
        .lt('date', periodAStartDate)
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
        console.error(`❌ [Tier Movement] History batch error at offset ${offsetHist}:`, histErr)
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
        console.warn('⚠️ [Tier Movement] History safety limit reached: 500,000 users')
        break
      }
    }
    
    console.log(`📊 [Tier Movement] History before Period A: ${historyBeforeASet.size} unique users`)

    console.log(`📊 [Tier Movement API] Period A: ${periodADataMap.size} users, Period B: ${periodBDataMap.size} users`)

    // Map to format expected by calculateTierMovement
    // Key is userkey (NOT userkey_line)
    // calculateTierMovement uses userkey_line internally, but since we aggregate by userkey only,
    // we'll use the same userkey for both userkey and line to match correctly
    const currentMapped = Array.from(periodBDataMap.entries()).flatMap(([userUnique, data]) => {
      if (data.tier === null) return []
      return [{
        userkey: userUnique,
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
        userkey: userUnique,
        uniqueCode: data.unique_code || userUnique,
        line: data.line || 'All',
        tier: data.tier,
        score: 0
      }]
    })

    console.log(`📊 [Tier Movement API] Mapped data: Period A ${previousMapped.length} users, Period B ${currentMapped.length} users`)

    // Urutan tampilan: terendah -> tertinggi sesuai wireframe
    const orderedTiers = Object.keys(TIER_NAMES).map(n => parseInt(n, 10)).sort((a, b) => a - b)
    const orderIndex = new Map<number, number>()
    orderedTiers.forEach((tierNum, idx) => orderIndex.set(tierNum, idx))

    // ✅ Calculate movements using userkey only (NOT userkey_line)
    // Create a simplified movement calculation that uses userkey as key
    const movements: Array<{
      userkey: string
      uniqueCode: string
      line: string
      movementType: 'UPGRADE' | 'DOWNGRADE' | 'STABLE' | 'NEW' | 'CHURNED' | 'REACTIVATION'
      fromTier: number | null
      toTier: number | null
      tierChange: number
      scoreChange: number
    }> = []
    
    const prevMap = new Map(previousMapped.map(p => [p.userkey, p]))
    
    currentMapped.forEach(current => {
      const previous = prevMap.get(current.userkey)
      
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
            if (fddStr >= periodBStartDate && fddStr <= periodBEndDate) {
              // ✅ first_deposit_date dalam Period B = NEW (ND Tier)
              movementType = 'NEW'
            } else {
              // first_deposit_date SEBELUM atau SETELAH Period B = REACTIVATION
              movementType = 'REACTIVATION'
            }
          } else {
            // Invalid date format: use history check as fallback
            const hasHistoryBeforeA = historyBeforeASet.has(current.userkey)
            movementType = hasHistoryBeforeA ? 'REACTIVATION' : 'NEW'
          }
        } else {
          // No first_deposit_date: use history check as fallback
          const hasHistoryBeforeA = historyBeforeASet.has(current.userkey)
          movementType = hasHistoryBeforeA ? 'REACTIVATION' : 'NEW'
        }
        
        movements.push({
          userkey: current.userkey,
          uniqueCode: current.uniqueCode,
          line: current.line,
          movementType,
          fromTier: null,
          toTier: current.tier,
          tierChange: 0,
          scoreChange: 0
        })
      } else {
        // Gunakan index urutan A-Z untuk arah: toIdx - fromIdx
        const fromIdx = orderIndex.get(previous.tier) ?? 0
        const toIdx = orderIndex.get(current.tier) ?? 0
        const tierChange = toIdx - fromIdx
        const scoreChange = current.score - previous.score
        
        let movementType: 'UPGRADE' | 'DOWNGRADE' | 'STABLE' | 'NEW' | 'CHURNED' | 'REACTIVATION' = 'STABLE'
        
        if (tierChange > 0) {
          movementType = 'UPGRADE'
        } else if (tierChange < 0) {
          movementType = 'DOWNGRADE'
        }
        
        movements.push({
          userkey: current.userkey,
          uniqueCode: current.uniqueCode,
          line: current.line,
          movementType,
          fromTier: previous.tier,
          toTier: current.tier,
          tierChange,
          scoreChange
        })
        
        // Remove from prevMap
        prevMap.delete(current.userkey)
      }
    })
    
    // Remaining in prevMap = CHURNED (not in current period)
    prevMap.forEach(previous => {
      movements.push({
        userkey: previous.userkey,
        uniqueCode: previous.uniqueCode,
        line: previous.line,
        movementType: 'CHURNED',
        fromTier: previous.tier,
        toTier: null,
        tierChange: 0,
        scoreChange: 0
      })
    })
    const summary = getTierMovementSummary(movements)
    const matrixData = generateTierMovementMatrix(movements)
    const newCount = movements.filter(m => m.movementType === 'NEW').length
    const reactivationCount = movements.filter(m => m.movementType === 'REACTIVATION').length
    const churnedCount = movements.filter(m => m.movementType === 'CHURNED').length
    const totalAllMovements = movements.length
    
    // Siapkan matriks upgrade/downgrade/stable per sel
    const upMatrix: Record<number, Record<number, number>> = {}
    const downMatrix: Record<number, Record<number, number>> = {}
    const stableMatrix: Record<number, Record<number, number>> = {}
    orderedTiers.forEach(from => {
      upMatrix[from] = {}
      downMatrix[from] = {}
      stableMatrix[from] = {}
      orderedTiers.forEach(to => {
        upMatrix[from][to] = 0
        downMatrix[from][to] = 0
        stableMatrix[from][to] = 0
      })
    })

    movements.forEach(m => {
      if (m.fromTier !== null && m.toTier !== null) {
        const fromIdx = orderIndex.get(m.fromTier) ?? 0
        const toIdx = orderIndex.get(m.toTier) ?? 0
        if (toIdx > fromIdx) {
          upMatrix[m.fromTier][m.toTier] += 1
        } else if (toIdx < fromIdx) {
          downMatrix[m.fromTier][m.toTier] += 1
        } else {
          stableMatrix[m.fromTier][m.toTier] += 1
        }
      }
    })

    // Format matrix untuk frontend
    const formattedMatrix = orderedTiers.map(fromTier => {
      const row: Record<string, any> = {
        fromTier,
        fromTierName: TIER_NAMES[fromTier] || `Tier ${fromTier}`,
        totalOut: matrixData.totalOut[fromTier] || 0,
        cells: {} as Record<number, number>,
        cellsDetail: {} as Record<number, { up: number; down: number; stable: number; total: number }>
      }
      
      // Kolom mengikuti orderedTiers
      orderedTiers.forEach(toTier => {
        const total = matrixData.matrix[fromTier]?.[toTier] || 0
        const up = upMatrix[fromTier][toTier] || 0
        const down = downMatrix[fromTier][toTier] || 0
        const stable = stableMatrix[fromTier][toTier] || 0
        row.cells[toTier] = total
        row.cellsDetail[toTier] = { up, down, stable, total }
      })
      
      return row
    })
    
    // Total In row
    const totalInRow = {
      label: 'Total In',
      cells: {} as Record<number, number>,
      total: matrixData.grandTotal
    }
    
    orderedTiers.forEach(toTier => {
      totalInRow.cells[toTier] = matrixData.totalIn[toTier] || 0
    })
    
    // Top movers
    const topUpgrades = movements
      .filter(m => m.movementType === 'UPGRADE')
      .sort((a, b) => b.tierChange - a.tierChange)
      .slice(0, 20)
    
    const topDowngrades = movements
      .filter(m => m.movementType === 'DOWNGRADE')
      .sort((a, b) => a.tierChange - b.tierChange)
      .slice(0, 20)
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          ...summary,
          // Format for summary cards
          upgradesCard: {
            count: summary.totalUpgrades,
            percentage: totalAllMovements > 0 ? (summary.totalUpgrades / totalAllMovements) * 100 : 0,
            label: 'Upgrades'
          },
          downgradesCard: {
            count: summary.totalDowngrades,
            percentage: totalAllMovements > 0 ? (summary.totalDowngrades / totalAllMovements) * 100 : 0,
            label: 'Downgrades'
          },
          stableCard: {
            count: summary.totalStable,
            percentage: totalAllMovements > 0 ? (summary.totalStable / totalAllMovements) * 100 : 0,
            label: 'Stable'
          },
          newMemberCard: {
            count: newCount,
            percentage: totalAllMovements > 0 ? (newCount / totalAllMovements) * 100 : 0,
            label: 'New Member'
          },
          reactivationCard: {
            count: reactivationCount,
            percentage: totalAllMovements > 0 ? (reactivationCount / totalAllMovements) * 100 : 0,
            label: 'Reactivation'
          },
          churnedCard: {
            count: churnedCount,
            percentage: totalAllMovements > 0 ? (churnedCount / totalAllMovements) * 100 : 0,
            label: 'Churned'
          }
        },
        matrix: {
          rows: formattedMatrix,
          totalInRow,
          tierOrder: orderedTiers.map(tier => ({
            tier,
            tierName: TIER_NAMES[tier] || `Tier ${tier}`
          })),
          grandTotal: matrixData.grandTotal
        },
        topUpgrades,
        topDowngrades,
        period: {
          current: `${currentMonth} ${currentYear}`,
          previous: `${previousMonth} ${previousYear}`
        }
      }
    })
    
  } catch (error) {
    console.error('❌ [USC BP Tier Movement] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

