import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { 
  TIER_NAMES,
  TIER_GROUPS
} from '@/lib/uscTierClassification'
import { applySquadLeadFilter, applyChannelFilter } from '@/utils/brandAccessHelper'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - TIER DATA API
 * ============================================================================
 * 
 * Purpose: Get tier classification data from tier_usc_v1 (READ ONLY)
 * Returns: Tier distribution, customer breakdown by tier
 * 
 * IMPORTANT: This API ONLY READS from tier_usc_v1 table.
 * NO TIER CALCULATION - Tiers must be calculated via Admin Tier Management first.
 * 
 * Params:
 * - year: Required (e.g., "2025")
 * - month: Required (e.g., "October" or "ALL")
 * - quarter: Optional (e.g., "Q4")
 * - line: Optional (e.g., "LVMY" or "ALL")
 * - tierGroup: Optional (e.g., "High Value" or "ALL")
 * 
 * Logic:
 * - If month = specific → Direct query monthly data from tier_usc_v1
 * - If month = "ALL" → Aggregate metrics but USE EXISTING TIERS from database
 * - NO on-the-fly tier calculation to prevent lag
 * 
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const quarter = searchParams.get('quarter')
    const line = searchParams.get('line')
    const squadLead = searchParams.get('squadLead')
    const channel = searchParams.get('channel')
    const tierGroup = searchParams.get('tierGroup')
    
    if (!year || !month) {
      return NextResponse.json({
        success: false,
        error: 'year and month parameters are required'
      }, { status: 400 })
    }
    
    console.log('📅 [USC BP Tier Data] Parameters:', { year, month, quarter, line, tierGroup })
    
    // ============================================================================
    // CASE 1: MONTH SPECIFIC (Direct Query)
    // ============================================================================
    
    if (month !== 'ALL') {
      let query = supabase
        .from('tier_usc_v1')
        .select('*')
        .eq('year', parseInt(year))
        .eq('month', month)
        .not('tier', 'is', null)
      
      // Apply filters (only if not "All")
      if (line && line !== 'All' && line !== 'ALL') {
        query = query.eq('line', line)
      }
      
      // Apply squad_lead filter (includes NULL when "All" is selected)
      query = applySquadLeadFilter(query, squadLead || 'All')
      
      // Apply channel filter (includes NULL when "All" is selected)
      query = applyChannelFilter(query, channel || 'All')
      
      if (tierGroup && tierGroup !== 'ALL') {
        query = query.eq('tier_group', tierGroup)
      }
      
      const { data, error } = await query.order('score', { ascending: false })
      
      if (error) throw error
      
      const tierDistribution = calculateDistribution(data || [])
      
      return NextResponse.json({
        success: true,
        data: {
          records: data,
          totalRecords: data?.length || 0,
          tierDistribution,
          aggregationMode: 'MONTHLY',
          period: `${month} ${year}`
        }
      })
    }
    
    // ============================================================================
    // CASE 2: MONTH = "ALL" (Aggregate metrics, USE EXISTING TIERS from DB)
    // ============================================================================
    // IMPORTANT: We aggregate metrics but use existing tier from database.
    // NO on-the-fly tier calculation to prevent lag.
    // If tiers are NULL, they will remain NULL (user must calculate via Admin first).
    
    let query = supabase
      .from('tier_usc_v1')
      .select('*')
      .eq('year', parseInt(year))
    
    // Filter by quarter if provided
    if (quarter && quarter !== 'ALL') {
      const quarterMonths: Record<string, string[]> = {
        'Q1': ['January', 'February', 'March'],
        'Q2': ['April', 'May', 'June'],
        'Q3': ['July', 'August', 'September'],
        'Q4': ['October', 'November', 'December']
      }
      const months = quarterMonths[quarter] || []
      query = query.in('month', months)
    }
    
    // Apply filters (only if not "All")
    if (line && line !== 'All' && line !== 'ALL') {
      query = query.eq('line', line)
    }
    
    // Apply squad_lead filter (includes NULL when "All" is selected)
    query = applySquadLeadFilter(query, squadLead || 'All')
    
    // Apply channel filter (includes NULL when "All" is selected)
    query = applyChannelFilter(query, channel || 'All')
    
    const { data: monthlyRecords, error } = await query
    
    if (error) throw error
    
    // Aggregate by userkey + line
    // Use existing tier from database (most recent month's tier, or majority tier)
    const aggregatedMap = new Map()
    
    monthlyRecords?.forEach(record => {
      const key = `${record.userkey}_${record.line}`
      
      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, {
          userkey: record.userkey,
          unique_code: record.unique_code,
          line: record.line,
          year: record.year,
          user_name: record.user_name,
          total_deposit_amount: 0,
          total_ggr: 0,
          total_deposit_cases: 0,
          total_withdraw_amount: 0,
          total_net_profit: 0,
          avg_transaction_value: 0,
          purchase_frequency: 0,
          win_rate: 0,
          active_days: 0,
          // Tier fields - use from most recent month with tier
          tier: record.tier,
          tier_name: record.tier_name,
          tier_group: record.tier_group,
          score: record.score,
          latest_month: record.month
        })
      }
      
      const agg = aggregatedMap.get(key)
      agg.total_deposit_amount += record.total_deposit_amount || 0
      agg.total_ggr += record.total_ggr || 0
      agg.total_deposit_cases += record.total_deposit_cases || 0
      agg.total_withdraw_amount += record.total_withdraw_amount || 0
      agg.total_net_profit += record.total_net_profit || 0
      
      // Use tier from most recent month (if current record has tier and is more recent)
      if (record.tier !== null && record.tier !== undefined) {
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December']
        const recordMonth = record.month as string
        const latestMonth = agg.latest_month as string
        const currentMonthIndex = monthOrder.indexOf(recordMonth)
        const latestMonthIndex = monthOrder.indexOf(latestMonth)
        
        if (currentMonthIndex > latestMonthIndex || agg.tier === null) {
          agg.tier = record.tier
          agg.tier_name = record.tier_name
          agg.tier_group = record.tier_group
          agg.score = record.score
          agg.latest_month = record.month
        }
      }
    })
    
    const aggregated = Array.from(aggregatedMap.values())
    
    // Calculate derived metrics (ATV, PF, WinRate) from aggregated data
    const withDerivedMetrics = aggregated.map(customer => {
      const atv = customer.total_deposit_cases > 0 
        ? customer.total_deposit_amount / customer.total_deposit_cases 
        : 0
      const pf = customer.total_deposit_cases
      const winRate = customer.total_deposit_amount > 0 
        ? (customer.total_ggr / customer.total_deposit_amount) * 100 
        : 0
      
      return {
        ...customer,
        avg_transaction_value: atv,
        purchase_frequency: pf,
        win_rate: winRate
      }
    })
    
    // Filter by tier group if specified
    const filtered = tierGroup && tierGroup !== 'ALL'
      ? withDerivedMetrics.filter(c => c.tier_group === tierGroup)
      : withDerivedMetrics
    
    const tierDistribution = calculateDistribution(filtered)
    
    return NextResponse.json({
      success: true,
      data: {
        records: filtered,
        totalRecords: filtered.length,
        tierDistribution,
        aggregationMode: quarter ? 'QUARTERLY' : 'YEARLY',
        period: quarter ? `${quarter} ${year}` : `${year} (All Months)`,
        note: 'Tiers are from database (calculated via Admin Tier Management). No on-the-fly calculation.'
      }
    })
    
  } catch (error) {
    console.error('❌ [USC BP Tier Data] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function calculateDistribution(records: any[]) {
  const distribution: Record<number, any> = {}
  
  for (let tier = 1; tier <= 7; tier++) {
    const tierRecords = records.filter(r => r.tier === tier)
    const count = tierRecords.length
    const percentage = records.length > 0 ? (count / records.length) * 100 : 0
    
    distribution[tier] = {
      tier,
      tierName: TIER_NAMES[tier],
      tierGroup: TIER_GROUPS[tier],
      count,
      percentage: Math.round(percentage * 100) / 100,
      avgDA: count > 0 ? tierRecords.reduce((sum, r) => sum + (r.total_deposit_amount || 0), 0) / count : 0,
      avgGGR: count > 0 ? tierRecords.reduce((sum, r) => sum + (r.total_ggr || 0), 0) / count : 0
    }
  }
  
  return distribution
}

