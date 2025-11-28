import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { 
  calculateTierMovement,
  getTierMovementSummary,
  generateTierMovementMatrix,
  TIER_NAMES
} from '@/lib/uscTierClassification'

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
    
    // Determine which format to use
    let currentPeriod: { year: number; month: string } | null = null
    let previousPeriod: { year: number; month: string } | null = null
    
    if (periodBStart && periodBEnd && periodAStart && periodAEnd) {
      // Use date range format (new format - same as Customer Tier Trends)
      const periodB = extractYearMonth(periodBEnd) // Use end date to determine period
      const periodA = extractYearMonth(periodAEnd) // Use end date to determine period
      
      if (!periodB || !periodA) {
        return NextResponse.json({
          success: false,
          error: 'Invalid date format in period date ranges'
        }, { status: 400 })
      }
      
      currentPeriod = periodB
      previousPeriod = periodA
    } else if (currentYear && currentMonth && previousYear && previousMonth) {
      // Use year/month format (old format - for backward compatibility)
      currentPeriod = {
        year: parseInt(currentYear),
        month: currentMonth
      }
      previousPeriod = {
        year: parseInt(previousYear),
        month: previousMonth
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Required: either (currentYear, currentMonth, previousYear, previousMonth) or (periodAStart, periodAEnd, periodBStart, periodBEnd)'
      }, { status: 400 })
    }
    
    // Fetch current period
    let currentQuery = supabase
      .from('tier_usc_v1')
      .select('userkey, unique_code, line, tier, tier_name, score, total_deposit_amount, total_ggr')
      .eq('year', currentPeriod.year)
      .eq('month', currentPeriod.month)
      .not('tier', 'is', null)
    
    // Apply filters (only if not "All")
    if (line && line !== 'All' && line !== 'ALL') {
      currentQuery = currentQuery.eq('line', line)
    }
    
    if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
      currentQuery = currentQuery.eq('squad_lead', squadLead)
    }
    
    // Apply channel filter (tier_usc_v1 has traffic column)
    if (channel && channel !== 'All' && channel !== 'ALL') {
      currentQuery = currentQuery.eq('traffic', channel)
    }
    
    const { data: currentData, error: currentError } = await currentQuery
    if (currentError) throw currentError
    
    // Fetch previous period
    let previousQuery = supabase
      .from('tier_usc_v1')
      .select('userkey, unique_code, line, tier, tier_name, score, total_deposit_amount, total_ggr')
      .eq('year', previousPeriod.year)
      .eq('month', previousPeriod.month)
      .not('tier', 'is', null)
    
    // Apply filters (only if not "All")
    if (line && line !== 'All' && line !== 'ALL') {
      previousQuery = previousQuery.eq('line', line)
    }
    
    if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
      previousQuery = previousQuery.eq('squad_lead', squadLead)
    }
    
    // Apply channel filter (includes NULL when "All" is selected)
    if (channel && channel !== 'All' && channel !== 'ALL') {
      previousQuery = previousQuery.eq('traffic', channel)
    }
    
    const { data: previousData, error: previousError } = await previousQuery
    if (previousError) throw previousError
    
    // Map database fields to function expected format (snake_case → camelCase)
    const currentMapped = (currentData || []).map(d => ({
      userkey: String(d.userkey),
      uniqueCode: String(d.unique_code),
      line: String(d.line),
      tier: Number(d.tier),
      score: Number(d.score)
    }))
    
    const previousMapped = (previousData || []).map(d => ({
      userkey: String(d.userkey),
      uniqueCode: String(d.unique_code),
      line: String(d.line),
      tier: Number(d.tier),
      score: Number(d.score)
    }))
    
    // Calculate movements
    const movements = calculateTierMovement(currentMapped, previousMapped)
    const summary = getTierMovementSummary(movements)
    const matrixData = generateTierMovementMatrix(movements)
    
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
            percentage: summary.upgradesPercentage,
            label: 'Upgrades'
          },
          downgradesCard: {
            count: summary.totalDowngrades,
            percentage: summary.downgradesPercentage,
            label: 'Downgrades'
          },
          stableCard: {
            count: summary.totalStable,
            percentage: summary.stablePercentage,
            label: 'Stable'
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

