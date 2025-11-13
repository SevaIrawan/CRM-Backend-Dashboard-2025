import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { 
  calculateTierMovement,
  getTierMovementSummary
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
    const currentYear = searchParams.get('currentYear')
    const currentMonth = searchParams.get('currentMonth')
    const previousYear = searchParams.get('previousYear')
    const previousMonth = searchParams.get('previousMonth')
    const line = searchParams.get('line')
    
    if (!currentYear || !currentMonth || !previousYear || !previousMonth) {
      return NextResponse.json({
        success: false,
        error: 'Required: currentYear, currentMonth, previousYear, previousMonth'
      }, { status: 400 })
    }
    
    // Fetch current period
    let currentQuery = supabase
      .from('tier_usc_v1')
      .select('userkey, unique_code, line, tier, tier_name, score, total_deposit_amount, total_ggr')
      .eq('year', parseInt(currentYear))
      .eq('month', currentMonth)
      .not('tier', 'is', null)
    
    if (line && line !== 'ALL') currentQuery = currentQuery.eq('line', line)
    
    const { data: currentData, error: currentError } = await currentQuery
    if (currentError) throw currentError
    
    // Fetch previous period
    let previousQuery = supabase
      .from('tier_usc_v1')
      .select('userkey, unique_code, line, tier, tier_name, score, total_deposit_amount, total_ggr')
      .eq('year', parseInt(previousYear))
      .eq('month', previousMonth)
      .not('tier', 'is', null)
    
    if (line && line !== 'ALL') previousQuery = previousQuery.eq('line', line)
    
    const { data: previousData, error: previousError } = await previousQuery
    if (previousError) throw previousError
    
    // Calculate movements
    const movements = calculateTierMovement(currentData || [], previousData || [])
    const summary = getTierMovementSummary(movements)
    
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
        summary,
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

