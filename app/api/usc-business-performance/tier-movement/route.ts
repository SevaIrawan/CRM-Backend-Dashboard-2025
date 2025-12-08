import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { 
  getTierMovementSummary,
  generateTierMovementMatrix,
  TIER_NAMES
} from '@/lib/uscTierClassification'

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
}>> {
  let query = supabase
    .from('blue_whale_usc')
    .select('user_unique, unique_code, user_name, line, tier_name, date, deposit_cases')
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

  // Aggregate per userkey (NOT userkey_line) and determine tier
  const userMap = new Map<string, {
    user_unique: string
    unique_code: string | null
    user_name: string | null
    line: string | null
    tierNumbers: Set<number>
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
        tierNumbers: new Set()
      })
    }

    const user = userMap.get(userUnique)!

    // Track tier number for determination
    if (row.tier_name) {
      const tierNameLower = (row.tier_name as string).trim()
      const tierEntry = Object.entries(TIER_NAMES).find(([_, name]) => 
        name.toLowerCase() === tierNameLower.toLowerCase()
      )

      if (tierEntry) {
        const tierNum = tierEntry[0]
        const tier = parseInt(tierNum)
        if (!isNaN(tier) && tier >= 1 && tier <= 7) {
          user.tierNumbers.add(tier)
        }
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
  }>()

  userMap.forEach((user, userUnique) => {
    let highestTier: number | null = null

    if (user.tierNumbers.size > 0) {
      // Find highest tier (lowest number = highest tier)
      highestTier = Math.min(...Array.from(user.tierNumbers))
    }

    result.set(userUnique, {
      user_unique: user.user_unique,
      unique_code: user.unique_code,
      user_name: user.user_name,
      line: user.line,
      tier: highestTier
    })
  })

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
    const historyBeforeAQuery = supabase
      .from('blue_whale_usc')
      .select('user_unique')
      .eq('currency', 'USC')
      .lt('date', periodAStartDate)
      .gt('deposit_cases', 0)
    if (line && line !== 'All' && line !== 'ALL') historyBeforeAQuery.eq('line', line)
    if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') historyBeforeAQuery.eq('squad_lead', squadLead)
    if (channel && channel !== 'All' && channel !== 'ALL') historyBeforeAQuery.eq('traffic', channel)

    const historyBeforeASet = new Set<string>()
    const BATCH_HISTORY = 5000
    let offsetHist = 0
    let moreHist = true
    while (moreHist) {
      const { data: histData, error: histErr } = await historyBeforeAQuery.range(offsetHist, offsetHist + BATCH_HISTORY - 1)
      if (histErr) {
        console.error('❌ History fetch error:', histErr)
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
    }

    console.log(`📊 [Tier Movement API] Period A: ${periodADataMap.size} users, Period B: ${periodBDataMap.size} users`)

    // Map to format expected by calculateTierMovement
    // Key is userkey (NOT userkey_line)
    // calculateTierMovement uses userkey_line internally, but since we aggregate by userkey only,
    // we'll use the same userkey for both userkey and line to match correctly
    const currentMapped = Array.from(periodBDataMap.entries()).map(([userUnique, data]) => ({
      userkey: userUnique,
      uniqueCode: data.unique_code || userUnique,
      line: data.line || 'All',
      tier: data.tier || 7, // Default to Regular if no tier
      score: 0 // Score not used for movement calculation, only tier
    }))
    
    const previousMapped = Array.from(periodADataMap.entries()).map(([userUnique, data]) => ({
      userkey: userUnique,
      uniqueCode: data.unique_code || userUnique,
      line: data.line || 'All',
      tier: data.tier || 7, // Default to Regular if no tier
      score: 0 // Score not used for movement calculation, only tier
    }))

    console.log(`📊 [Tier Movement API] Mapped data: Period A ${previousMapped.length} users, Period B ${currentMapped.length} users`)

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
        // NEW atau REACTIVATION
        const hasHistoryBeforeA = historyBeforeASet.has(current.userkey)
        const movementType: 'NEW' | 'REACTIVATION' = hasHistoryBeforeA ? 'REACTIVATION' : 'NEW'
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
        const tierChange = previous.tier - current.tier // Positive = upgrade (tier decreased)
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
    
    // ✅ Reverse tierOrder: Display from lowest (Regular/Tier 7) to highest (Super VIP/Tier 1)
    // tierOrder from generateTierMovementMatrix is [1,2,3,4,5,6,7] (low to high numbers)
    // We need to reverse to [7,6,5,4,3,2,1] (lowest tier to highest tier visually)
    const reversedTierOrder = [...matrixData.tierOrder].reverse()
    
    // Format matrix for frontend (with tier names) - using reversed order
    const formattedMatrix = reversedTierOrder.map(fromTier => {
      const row: Record<string, any> = {
        fromTier,
        fromTierName: TIER_NAMES[fromTier] || `Tier ${fromTier}`,
        totalOut: matrixData.totalOut[fromTier] || 0,
        cells: {} as Record<number, number>
      }
      
      // Use reversed order for columns too
      reversedTierOrder.forEach(toTier => {
        row.cells[toTier] = matrixData.matrix[fromTier]?.[toTier] || 0
      })
      
      return row
    })
    
    // Format Total In row - using reversed order
    const totalInRow = {
      label: 'Total In',
      cells: {} as Record<number, number>,
      total: matrixData.grandTotal
    }
    
    reversedTierOrder.forEach(toTier => {
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
          tierOrder: reversedTierOrder.map(tier => ({
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

