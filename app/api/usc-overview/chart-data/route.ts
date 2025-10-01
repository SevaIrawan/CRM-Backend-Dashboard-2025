import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateUSCKPIs } from '@/lib/USCLogic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Currency is LOCKED to USC for Overview page
  const currency = 'USC' 
  const line = searchParams.get('line')
  const year = searchParams.get('year')

  try {
    console.log('📊 [USC Chart API] Fetching chart data:', { 
      currency, line, year
    })

    // Get available months for the year
    let monthsQuery = supabase
      .from('blue_whale_usc_summary')
      .select('month')
      .eq('currency', 'USC')
      .eq('year', parseInt(year || '2025'))
    
    if (line && line !== 'ALL') {
      monthsQuery = monthsQuery.eq('line', line)
    }

    const { data: monthsData, error: monthsError } = await monthsQuery

    if (monthsError) throw monthsError

    const uniqueMonths = Array.from(new Set(monthsData?.map((item: any) => item.month).filter(Boolean)))
    
    // Sort months chronologically
    const monthOrder: { [key: string]: number } = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
      'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    uniqueMonths.sort((a: string, b: string) => (monthOrder[a] || 0) - (monthOrder[b] || 0))

    console.log('📅 [USC Chart API] Available months:', uniqueMonths)

    // Calculate KPIs for each month using USCLogic (includes precision KPIs)
    const monthlyKPIPromises = uniqueMonths.map(async (month) => {
      const kpiData = await calculateUSCKPIs({
        year: year || '2025',
        month: month,
        line: line || undefined
      })
      
      return { month, kpiData }
    })

    const monthlyKPIResults = await Promise.all(monthlyKPIPromises)

    // Convert to monthly data object
    const monthlyData: { [key: string]: any } = {}
    
    monthlyKPIResults.forEach(({ month, kpiData }) => {
      monthlyData[month] = {
        deposit_amount: kpiData.depositAmount, // From MV
        withdraw_amount: kpiData.withdrawAmount, // From MV
        ggr: kpiData.grossGamingRevenue, // Calculated
        net_profit: kpiData.netProfit, // Calculated
        deposit_cases: kpiData.depositCases, // From MV
        withdraw_cases: kpiData.withdrawCases, // From MV
        atv: kpiData.avgTransactionValue, // Calculated
        pf: kpiData.purchaseFrequency, // Calculated
        winrate: kpiData.winrate, // Calculated: GGR / Deposit Amount
        acl: kpiData.avgCustomerLifespan, // Calculated from Master table
        clv: kpiData.customerLifetimeValue, // Calculated from Master table
        cmi: kpiData.customerMaturityIndex, // Calculated from Master table
        active_member: kpiData.activeMember, // From Master table
        churn_rate: kpiData.churnRate, // Calculated from Master table
        retention_rate: kpiData.retentionRate, // Calculated from Master table
        growth_rate: kpiData.growthRate // Calculated from Master table
      }
    })

    console.log(`✅ [USC Chart API] Chart data with precision KPIs for ${Object.keys(monthlyData).length} months`)

    return NextResponse.json({
      success: true,
      monthlyData,
      filters: {
        currency: 'USC',
        line,
        year
      },
      dataSource: 'blue_whale_usc_summary + blue_whale_usc (hybrid)'
    })

  } catch (error) {
    console.error('❌ [USC Chart API] Error fetching chart data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


