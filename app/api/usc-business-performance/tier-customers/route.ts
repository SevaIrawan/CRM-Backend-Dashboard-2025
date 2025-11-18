import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - TIER CUSTOMERS BREAKDOWN API
 * ============================================================================
 * 
 * Purpose: Get customer breakdown for a specific tier
 * Returns: List of customers in the tier with all required metrics
 * 
 * Params:
 * - year: Required (e.g., "2025")
 * - month: Required (e.g., "November")
 * - tier: Required (e.g., "1", "2", etc.)
 * 
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const tier = searchParams.get('tier')
    
    if (!year || !month || !tier) {
      return NextResponse.json({
        success: false,
        error: 'year, month, and tier parameters are required'
      }, { status: 400 })
    }
    
    console.log('📊 [USC BP Tier Customers] Parameters:', { year, month, tier })
    
    // Get user's allowed brands from header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? 
      JSON.parse(userAllowedBrandsHeader) : null
    
    // Query customers in the specified tier
    let query = supabase
      .from('tier_usc_v1')
      .select('userkey, unique_code, user_name, active_days, avg_transaction_value, total_deposit_cases, total_deposit_amount, total_ggr, win_rate, total_withdraw_cases, tier, tier_name, line')
      .eq('year', parseInt(year))
      .eq('month', month)
      .eq('tier', parseInt(tier))
      .not('tier', 'is', null)
    
    // Apply brand filter for Squad Lead
    if (userAllowedBrands && userAllowedBrands.length > 0) {
      query = query.in('line', userAllowedBrands)
    }
    
    const { data, error } = await query.order('total_ggr', { ascending: false })
    
    if (error) {
      console.error('❌ [USC BP Tier Customers] Query error:', error)
      throw error
    }
    
    // Process data and calculate derived metrics
    const customers = (data || []).map((row: any) => {
      const depositCases = parseFloat(row.total_deposit_cases) || 0
      const activeDays = parseFloat(row.active_days) || 0
      const withdrawCases = parseFloat(row.total_withdraw_cases) || 0
      
      // Calculate Purchase Freq = deposit_cases / active_days
      const purchaseFreq = activeDays > 0 ? depositCases / activeDays : 0
      
      // Calculate Withdraw Rate = (withdraw_cases / deposit_cases) * 100
      const withdrawRate = depositCases > 0 ? (withdrawCases / depositCases) * 100 : 0
      
      return {
        userkey: row.userkey || '',
        unique_code: row.unique_code || '-',
        user_name: row.user_name || '-',
        active_days: activeDays,
        atv: parseFloat(row.avg_transaction_value) || 0,
        purchase_freq: purchaseFreq,
        deposit_cases: depositCases,
        deposit_amount: parseFloat(row.total_deposit_amount) || 0,
        ggr: parseFloat(row.total_ggr) || 0,
        winrate: parseFloat(row.win_rate) || 0,
        withdraw_rate: withdrawRate,
        tier: row.tier,
        tier_name: row.tier_name || '-',
        line: row.line || '-'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        customers,
        totalCustomers: customers.length,
        tier: parseInt(tier),
        tierName: customers.length > 0 ? customers[0].tier_name : '-',
        period: `${month} ${year}`
      }
    })
    
  } catch (error) {
    console.error('❌ [USC BP Tier Customers] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

