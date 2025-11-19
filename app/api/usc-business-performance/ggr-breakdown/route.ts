import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - GGR BREAKDOWN API
 * ============================================================================
 * 
 * Purpose: Provide GGR breakdown by Brand, Tier, and Top 10 Customers
 * Returns: Breakdown data for modal display
 * 
 * Params:
 * - year: Required (e.g., "2025")
 * - month: Required (e.g., "November")
 * - type: Optional (e.g., "brand", "tier", "customers", "full")
 * 
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const type = searchParams.get('type') || 'full'
    
    if (!year || !month) {
      return NextResponse.json({
        success: false,
        error: 'year and month parameters are required'
      }, { status: 400 })
    }
    
    console.log('📊 [USC BP GGR Breakdown] Parameters:', { year, month, type })
    
    // Convert month name to month number
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    const monthNumber = monthNames.indexOf(month) + 1
    
    if (monthNumber === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid month name'
      }, { status: 400 })
    }
    
    // Get user's allowed brands from header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? 
      JSON.parse(userAllowedBrandsHeader) : null
    
    const result: any = {}
    
    // ============================================================================
    // BREAKDOWN BY BRAND
    // ============================================================================
    if (type === 'brand' || type === 'full') {
      // GGR = deposit_amount - withdraw_amount (calculated field in MV)
      let brandQuery = supabase
        .from('blue_whale_usc_monthly_summary')
        .select('line, deposit_amount, withdraw_amount, deposit_cases, active_member')
        .eq('year', parseInt(year))
        .eq('month', monthNumber) // Use month number, not month name
        .eq('currency', 'USC')
        .neq('line', 'ALL') // Exclude ALL line
        .not('deposit_amount', 'is', null)
      
      // Apply brand filter for Squad Lead
      if (userAllowedBrands && userAllowedBrands.length > 0) {
        brandQuery = brandQuery.in('line', userAllowedBrands)
      }
      
      const { data: brandData, error: brandError } = await brandQuery
      
      if (brandError) {
        console.error('❌ [USC BP GGR Breakdown] Brand query error:', brandError)
        throw brandError
      }
      
      // Aggregate by brand with all metrics
      const brandMap = new Map<string, {
        ggr: number
        count: number
        depositCases: number
        depositAmount: number
        atv: number
      }>()
      
      brandData?.forEach((row: any) => {
        const deposit = parseFloat(row.deposit_amount) || 0
        const withdraw = parseFloat(row.withdraw_amount) || 0
        const ggr = deposit - withdraw
        const count = parseFloat(row.active_member) || 0
        const depositCases = parseFloat(row.deposit_cases) || 0
        const depositAmount = deposit
        
        const current = brandMap.get(row.line) || {
          ggr: 0,
          count: 0,
          depositCases: 0,
          depositAmount: 0,
          atv: 0
        }
        
        brandMap.set(row.line, {
          ggr: current.ggr + ggr,
          count: current.count + count,
          depositCases: current.depositCases + depositCases,
          depositAmount: current.depositAmount + depositAmount,
          atv: 0 // Will calculate after aggregation
        })
      })
      
      // Calculate ATV and sort by GGR descending
      const sortedBrands = Array.from(brandMap.entries())
        .map(([line, data]) => ({
          line,
          ggr: data.ggr,
          count: data.count,
          depositCases: data.depositCases,
          depositAmount: data.depositAmount,
          atv: data.depositCases > 0 ? data.depositAmount / data.depositCases : 0
        }))
        .sort((a, b) => b.ggr - a.ggr)
      
      result.byBrand = {
        labels: sortedBrands.map(b => b.line),
        values: sortedBrands.map(b => b.ggr),
        counts: sortedBrands.map(b => b.count),
        atvs: sortedBrands.map(b => b.atv),
        depositCases: sortedBrands.map(b => b.depositCases),
        depositAmounts: sortedBrands.map(b => b.depositAmount)
      }
    }
    
    // ============================================================================
    // BREAKDOWN BY TIER
    // ============================================================================
    if (type === 'tier' || type === 'full') {
      let tierQuery = supabase
        .from('tier_usc_v1')
        .select('tier, tier_name, total_ggr, total_deposit_amount, total_deposit_cases, avg_transaction_value, userkey')
        .eq('year', parseInt(year))
        .eq('month', month) // tier_usc_v1 uses month name (VARCHAR)
        .not('tier', 'is', null)
        .not('total_ggr', 'is', null)
      
      // Apply brand filter if needed (via line filter)
      if (userAllowedBrands && userAllowedBrands.length > 0) {
        tierQuery = tierQuery.in('line', userAllowedBrands)
      }
      
      const { data: tierData, error: tierError } = await tierQuery
      
      if (tierError) {
        console.error('❌ [USC BP GGR Breakdown] Tier query error:', tierError)
        throw tierError
      }
      
      // Aggregate by tier with all metrics
      const tierMap = new Map<number, {
        name: string
        ggr: number
        count: number
        depositCases: number
        depositAmount: number
        atv: number
        userkeys: Set<string>
      }>()
      
      tierData?.forEach((row: any) => {
        const tier = row.tier
        const current = tierMap.get(tier) || {
          name: row.tier_name || `Tier ${tier}`,
          ggr: 0,
          count: 0,
          depositCases: 0,
          depositAmount: 0,
          atv: 0,
          userkeys: new Set<string>()
        }
        
        // Add userkey for count
        if (row.userkey) {
          current.userkeys.add(row.userkey)
        }
        
        tierMap.set(tier, {
          name: current.name,
          ggr: current.ggr + (parseFloat(row.total_ggr) || 0),
          count: current.userkeys.size, // Will update after all rows processed
          depositCases: current.depositCases + (parseFloat(row.total_deposit_cases) || 0),
          depositAmount: current.depositAmount + (parseFloat(row.total_deposit_amount) || 0),
          atv: 0, // Will calculate after aggregation
          userkeys: current.userkeys
        })
      })
      
      // Calculate final count and ATV, then sort by tier (1-7)
      const sortedTiers = Array.from(tierMap.entries())
        .map(([tier, data]) => ({
          tier,
          name: data.name,
          ggr: data.ggr,
          count: data.userkeys.size,
          depositCases: data.depositCases,
          depositAmount: data.depositAmount,
          atv: data.depositCases > 0 ? data.depositAmount / data.depositCases : 0
        }))
        .sort((a, b) => a.tier - b.tier)
      
      result.byTier = {
        labels: sortedTiers.map(t => t.name),
        values: sortedTiers.map(t => t.ggr),
        counts: sortedTiers.map(t => t.count),
        atvs: sortedTiers.map(t => t.atv),
        depositCases: sortedTiers.map(t => t.depositCases),
        depositAmounts: sortedTiers.map(t => t.depositAmount)
      }
    }
    
    // ============================================================================
    // TOP 10 CUSTOMERS
    // ============================================================================
    if (type === 'customers' || type === 'full') {
      let customerQuery = supabase
        .from('tier_usc_v1')
        .select('userkey, unique_code, user_name, line, total_ggr')
        .eq('year', parseInt(year))
        .eq('month', month) // tier_usc_v1 uses month name (VARCHAR)
        .not('total_ggr', 'is', null)
        .order('total_ggr', { ascending: false })
        .limit(10)
      
      // Apply brand filter
      if (userAllowedBrands && userAllowedBrands.length > 0) {
        customerQuery = customerQuery.in('line', userAllowedBrands)
      }
      
      const { data: customerData, error: customerError } = await customerQuery
      
      if (customerError) throw customerError
      
      // Calculate total GGR for percentage
      const totalGGR = customerData?.reduce((sum: number, row: any) => 
        sum + (parseFloat(row.total_ggr) || 0), 0) || 0
      
      result.top10Customers = customerData?.map((row: any) => ({
        userkey: row.userkey,
        unique_code: row.unique_code,
        user_name: row.user_name,
        line: row.line,
        ggr: parseFloat(row.total_ggr) || 0,
        percentage: totalGGR > 0 ? ((parseFloat(row.total_ggr) || 0) / totalGGR) * 100 : 0
      })) || []
    }
    
    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('❌ [USC BP GGR Breakdown] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

