import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { 
  calculateCustomerScore,
  calibrateTierBoundaries,
  assignTierWithBoundaries,
  TIER_NAMES,
  TIER_GROUPS
} from '@/lib/uscTierClassification'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - TIER DATA API
 * ============================================================================
 * 
 * Purpose: Get tier classification data with dynamic aggregation
 * Returns: Tier distribution, customer breakdown by tier
 * 
 * Params:
 * - year: Required (e.g., "2025")
 * - month: Required (e.g., "October" or "ALL")
 * - quarter: Optional (e.g., "Q4")
 * - line: Optional (e.g., "LVMY" or "ALL")
 * - tierGroup: Optional (e.g., "High Value" or "ALL")
 * 
 * Logic:
 * - If month = specific → Direct query monthly data
 * - If month = "ALL" → Aggregate all months in year/quarter
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
      
      if (line && line !== 'ALL') query = query.eq('line', line)
      if (tierGroup && tierGroup !== 'ALL') query = query.eq('tier_group', tierGroup)
      
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
    // CASE 2: MONTH = "ALL" (Dynamic Aggregation)
    // ============================================================================
    
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
    
    if (line && line !== 'ALL') query = query.eq('line', line)
    
    const { data: monthlyRecords, error } = await query
    
    if (error) throw error
    
    // Aggregate by userkey + line
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
          active_months: new Set()
        })
      }
      
      const agg = aggregatedMap.get(key)
      agg.total_deposit_amount += record.total_deposit_amount || 0
      agg.total_ggr += record.total_ggr || 0
      agg.total_deposit_cases += record.total_deposit_cases || 0
      agg.total_withdraw_amount += record.total_withdraw_amount || 0
      agg.total_net_profit += record.total_net_profit || 0
      agg.active_months.add(record.month)
    })
    
    const aggregated = Array.from(aggregatedMap.values())
    
    // Calculate scores and assign tiers for aggregated data
    const withScoresAndTiers = aggregated.map(customer => {
      const atv = customer.total_deposit_cases > 0 
        ? customer.total_deposit_amount / customer.total_deposit_cases 
        : 0
      const pf = customer.total_deposit_cases
      const winRate = customer.total_deposit_amount > 0 
        ? (customer.total_ggr / customer.total_deposit_amount) * 100 
        : 0
      
      const score = calculateCustomerScore({
        depositAmount: customer.total_deposit_amount,
        ggr: customer.total_ggr,
        depositCases: customer.total_deposit_cases,
        purchaseFrequency: pf,
        avgTransactionValue: atv,
        winRate
      })
      
      return { ...customer, score, avg_transaction_value: atv, purchase_frequency: pf, win_rate: winRate }
    })
    
    // Auto-calibrate boundaries
    const scores = withScoresAndTiers.map(c => c.score)
    const boundaries = calibrateTierBoundaries(scores)
    
    // Assign tiers
    const withTiers = withScoresAndTiers.map(customer => {
      const tier = assignTierWithBoundaries(customer.score, boundaries)
      return {
        ...customer,
        tier,
        tier_name: TIER_NAMES[tier],
        tier_group: TIER_GROUPS[tier]
      }
    })
    
    // Filter by tier group if specified
    const filtered = tierGroup && tierGroup !== 'ALL'
      ? withTiers.filter(c => c.tier_group === tierGroup)
      : withTiers
    
    const tierDistribution = calculateDistribution(filtered)
    
    return NextResponse.json({
      success: true,
      data: {
        records: filtered,
        totalRecords: filtered.length,
        tierDistribution,
        aggregationMode: quarter ? 'QUARTERLY' : 'YEARLY',
        period: quarter ? `${quarter} ${year}` : `${year} (All Months)`
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

