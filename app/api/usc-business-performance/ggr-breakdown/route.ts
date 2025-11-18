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
        .select('line, deposit_amount, withdraw_amount')
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
      
      // Calculate GGR = deposit_amount - withdraw_amount and aggregate by brand
      const brandMap = new Map<string, number>()
      brandData?.forEach((row: any) => {
        const deposit = parseFloat(row.deposit_amount) || 0
        const withdraw = parseFloat(row.withdraw_amount) || 0
        const ggr = deposit - withdraw
        const current = brandMap.get(row.line) || 0
        brandMap.set(row.line, current + ggr)
      })
      
      // Sort by GGR descending
      const sortedBrands = Array.from(brandMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([line, ggr]) => ({ line, ggr }))
      
      result.byBrand = {
        labels: sortedBrands.map(b => b.line),
        values: sortedBrands.map(b => b.ggr)
      }
    }
    
    // ============================================================================
    // BREAKDOWN BY TIER
    // ============================================================================
    if (type === 'tier' || type === 'full') {
      let tierQuery = supabase
        .from('tier_usc_v1')
        .select('tier, tier_name, total_ggr')
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
      
      // Aggregate by tier
      const tierMap = new Map<number, { name: string; ggr: number }>()
      tierData?.forEach((row: any) => {
        const tier = row.tier
        const current = tierMap.get(tier) || { name: row.tier_name || `Tier ${tier}`, ggr: 0 }
        tierMap.set(tier, {
          name: current.name,
          ggr: current.ggr + (parseFloat(row.total_ggr) || 0)
        })
      })
      
      // Sort by tier (1-7)
      const sortedTiers = Array.from(tierMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([tier, data]) => ({ tier, ...data }))
      
      result.byTier = {
        labels: sortedTiers.map(t => t.name),
        values: sortedTiers.map(t => t.ggr)
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

