import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { applyBrandFilter } from '@/utils/brandAccessHelper'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const line = searchParams.get('line') || 'ALL'
    const year = searchParams.get('year')

    if (!year) {
      return NextResponse.json({
        success: false,
        error: 'Year parameter is required'
      }, { status: 400 })
    }

    // ✅ NEW: Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null
    
    console.log('🔄 [USC Overview Chart API] Fetching chart data for:', { 
      year, 
      line,
      user_allowed_brands: userAllowedBrands,
      is_squad_lead: userAllowedBrands !== null && userAllowedBrands.length > 0
    })

    // Query monthly data for entire year from MV
    let query = supabase
      .from('blue_whale_usc_monthly_summary')
      .select('month, deposit_amount, withdraw_amount, net_profit, ggr, valid_amount, deposit_cases, withdraw_cases, active_member, pure_member, new_register, new_depositor, atv, purchase_frequency, da_user, ggr_user, winrate, withdrawal_rate, conversion_rate, hold_percentage')
      .eq('currency', 'USC')
      .eq('year', parseInt(year))
      .gt('month', 0)  // Exclude rollup (month=0)

    // ✅ NEW: Apply brand filter with user permission check
    try {
      if (line && line !== 'ALL') {
        query = query.eq('line', line)
        // Validate Squad Lead access
        if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
          return NextResponse.json({
            success: false,
            error: 'Unauthorized',
            message: `You do not have access to brand "${line}"`
          }, { status: 403 })
        }
      } else {
        // If Squad Lead selects 'ALL', filter to their brands only
        if (userAllowedBrands && userAllowedBrands.length > 0) {
          query = query.in('line', userAllowedBrands)
        } else {
          query = query.eq('line', 'ALL')
        }
      }
    } catch (filterError) {
      console.error('❌ Brand filter error:', filterError)
      return NextResponse.json({
        success: false,
        error: 'Brand access validation failed',
        message: filterError instanceof Error ? filterError.message : 'Unknown error'
      }, { status: 403 })
    }

    const { data, error } = await query.order('month', { ascending: true })

    if (error) {
      console.error('❌ [USC Overview Chart API] Error fetching data:', error)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: error.message
      }, { status: 500 })
    }

    console.log('📊 [USC Overview Chart API] Raw data from MV:', {
      rowCount: data?.length,
      sampleRow: data?.[0],
      holdPercentageSample: data?.[0]?.hold_percentage,
      validAmountSample: data?.[0]?.valid_amount,
      netProfitSample: data?.[0]?.net_profit
    })

    // Convert month numbers to month names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']

    // Build monthly data object
    const monthlyData: Record<string, any> = {}
    
    data?.forEach(row => {
      const monthName = monthNames[(row.month as number) - 1]
      if (monthName) {
        monthlyData[monthName] = {
          // Basic amounts
          deposit_amount: (row.deposit_amount as number) || 0,
          withdraw_amount: (row.withdraw_amount as number) || 0,
          net_profit: (row.net_profit as number) || 0,
          ggr: (row.ggr as number) || 0,
          valid_amount: (row.valid_amount as number) || 0,
          
          // Cases
          deposit_cases: (row.deposit_cases as number) || 0,
          withdraw_cases: (row.withdraw_cases as number) || 0,
          
          // Members
          active_member: (row.active_member as number) || 0,
          pure_member: (row.pure_member as number) || 0,
          new_register: (row.new_register as number) || 0,
          new_depositor: (row.new_depositor as number) || 0,
          
          // Ratios/Metrics
          atv: (row.atv as number) || 0,
          purchase_frequency: (row.purchase_frequency as number) || 0,
          da_user: (row.da_user as number) || 0,
          ggr_user: (row.ggr_user as number) || 0,
          winrate: (row.winrate as number) || 0,
          withdrawal_rate: (row.withdrawal_rate as number) || 0,
          conversion_rate: (row.conversion_rate as number) || 0,
          hold_percentage: (row.hold_percentage as number) || 0
        }
      }
    })

    console.log('✅ [USC Overview Chart API] Monthly data prepared:', {
      monthCount: Object.keys(monthlyData).length,
      months: Object.keys(monthlyData)
    })

    return NextResponse.json({
      success: true,
      monthlyData
    })

  } catch (error) {
    console.error('❌ [USC Overview Chart API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

