import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - CHART DATA API
 * ============================================================================
 * 
 * Purpose: Provide monthly trend data for charts from blue_whale_usc_monthly_summary (MV)
 * Returns: Monthly data for entire year
 * 
 * Data Source: blue_whale_usc_monthly_summary (Materialized View)
 * 
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    
    if (!year || !month) {
      return NextResponse.json({
        success: false,
        error: 'year and month parameters are required'
      }, { status: 400 })
    }
    
    console.log('📊 [USC BP Chart Data] Parameters:', { year, month })
    
    // Get user's allowed brands from header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? 
      JSON.parse(userAllowedBrandsHeader) : null
    
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
    
    // Query data for specific month, grouped by brand (line)
    let query = supabase
      .from('blue_whale_usc_monthly_summary')
      .select('line, active_member, pure_member, winrate, withdrawal_rate, atv, purchase_frequency')
      .eq('currency', 'USC')
      .eq('year', parseInt(year))
      .eq('month', monthNumber)
      .neq('line', 'ALL')  // Exclude ALL line
    
    // Apply brand filter with user permission check
    try {
      // If Squad Lead, filter to their brands only
      if (userAllowedBrands && userAllowedBrands.length > 0) {
        query = query.in('line', userAllowedBrands)
      }
    } catch (filterError) {
      console.error('❌ Brand filter error:', filterError)
      return NextResponse.json({
        success: false,
        error: 'Brand access validation failed',
        message: filterError instanceof Error ? filterError.message : 'Unknown error'
      }, { status: 403 })
    }
    
    const { data, error } = await query.order('line', { ascending: true })
    
    if (error) {
      console.error('❌ [USC BP Chart Data] Error fetching data:', error)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: error.message
      }, { status: 500 })
    }
    
    // Build brand data object
    const brandData: Record<string, any> = {}
    
    data?.forEach(row => {
      const brand = row.line as string
      if (brand) {
        brandData[brand] = {
          active_member: (row.active_member as number) || 0,
          pure_member: (row.pure_member as number) || 0,
          winrate: (row.winrate as number) || 0,
          withdrawal_rate: (row.withdrawal_rate as number) || 0,
          atv: (row.atv as number) || 0,
          purchase_frequency: (row.purchase_frequency as number) || 0
        }
      }
    })
    
    console.log('✅ [USC BP Chart Data] Brand data prepared from MV:', {
      brandCount: Object.keys(brandData).length,
      brands: Object.keys(brandData)
    })
    
    return NextResponse.json({
      success: true,
      brandData
    })
    
  } catch (error) {
    console.error('❌ [USC BP Chart Data] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

