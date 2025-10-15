import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    console.log('🔄 [MYR Overview Chart API] Fetching chart data for:', { year, line })

    // Query monthly data for entire year from MV
    let query = supabase
      .from('blue_whale_myr_monthly_summary')
      .select('*')
      .eq('currency', 'MYR')
      .eq('year', parseInt(year))
      .gt('month', 0)  // Exclude rollup (month=0)

    if (line && line !== 'ALL') {
      query = query.eq('line', line)
    } else {
      query = query.eq('line', 'ALL')
    }

    const { data, error } = await query.order('month', { ascending: true })

    if (error) {
      console.error('❌ [MYR Overview Chart API] Error fetching data:', error)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: error.message
      }, { status: 500 })
    }

    console.log('📊 [MYR Overview Chart API] Raw data from MV:', {
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
      const monthName = monthNames[row.month - 1]
      if (monthName) {
        monthlyData[monthName] = {
          // Basic amounts
          deposit_amount: row.deposit_amount || 0,
          withdraw_amount: row.withdraw_amount || 0,
          net_profit: row.net_profit || 0,
          ggr: row.ggr || 0,
          valid_amount: row.valid_amount || 0,
          
          // Cases
          deposit_cases: row.deposit_cases || 0,
          withdraw_cases: row.withdraw_cases || 0,
          
          // Members
          active_member: row.active_member || 0,
          pure_member: row.pure_member || 0,
          new_register: row.new_register || 0,
          new_depositor: row.new_depositor || 0,
          
          // Ratios/Metrics
          atv: row.atv || 0,
          purchase_frequency: row.purchase_frequency || 0,
          da_user: row.da_user || 0,
          ggr_user: row.ggr_user || 0,
          winrate: row.winrate || 0,
          withdrawal_rate: row.withdrawal_rate || 0,
          conversion_rate: row.conversion_rate || 0,
          hold_percentage: row.hold_percentage || 0
        }
      }
    })

    console.log('✅ [MYR Overview Chart API] Monthly data prepared:', {
      monthCount: Object.keys(monthlyData).length,
      months: Object.keys(monthlyData)
    })

    return NextResponse.json({
      success: true,
      monthlyData
    })

  } catch (error) {
    console.error('❌ [MYR Overview Chart API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

