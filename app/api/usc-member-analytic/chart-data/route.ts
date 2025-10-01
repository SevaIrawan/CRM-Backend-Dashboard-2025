import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateUSCKPIs } from '@/lib/USCLogic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // USC Member-Analytic page - Currency LOCKED to USC
  const currency = 'USC'
  const line = searchParams.get('line')
  const year = searchParams.get('year')

  try {
    console.log('📈 [USC Member-Analytic Chart API] Fetching chart data:', { 
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

    console.log('📅 [USC Member-Analytic Chart API] Available months:', uniqueMonths)

    // Calculate KPIs for each month using USCLogic
    const monthlyKPIPromises = uniqueMonths.map(async (month) => {
      const kpiData = await calculateUSCKPIs({
        year: year || '2025',
        month: month,
        line: line || undefined
      })
      
      return { month, kpiData }
    })

    const monthlyKPIResults = await Promise.all(monthlyKPIPromises)

    // Format chart data
    // Debug: Check Pure Member data
    const pureMemberData = monthlyKPIResults.map(r => r.kpiData.pureMember)
    console.log('🔍 [USC Member-Analytic Chart API] Pure Member data:', pureMemberData)
    console.log('🔍 [USC Member-Analytic Chart API] Sample KPI:', monthlyKPIResults[0]?.kpiData)

    const chartSeries = {
      ggrUserTrend: {
        series: [{ 
          name: 'GGR Per User', 
          data: monthlyKPIResults.map(r => r.kpiData.ggrPerUser) 
        }],
        categories: monthlyKPIResults.map(r => r.month.substring(0, 3))
      },
      depositAmountUserTrend: {
        series: [{ 
          name: 'Deposit Amount Per User', 
          data: monthlyKPIResults.map(r => r.kpiData.depositAmountUser) 
        }],
        categories: monthlyKPIResults.map(r => r.month.substring(0, 3))
      },
      newRegisterTrend: {
        series: [
          { name: 'New Register', data: monthlyKPIResults.map(r => r.kpiData.newRegister) },
          { name: 'New Depositor', data: monthlyKPIResults.map(r => r.kpiData.newDepositor) }
        ],
        categories: monthlyKPIResults.map(r => r.month.substring(0, 3))
      },
      activeMemberTrend: {
        series: [
          { name: 'Active Member', data: monthlyKPIResults.map(r => r.kpiData.activeMember) },
          { name: 'Pure Member', data: monthlyKPIResults.map(r => r.kpiData.pureMember) }
        ],
        categories: monthlyKPIResults.map(r => r.month.substring(0, 3))
      },
      retentionChurnTrend: {
        series: [
          { name: 'Retention Rate', data: monthlyKPIResults.map(r => r.kpiData.retentionRate) },
          { name: 'Churn Rate', data: monthlyKPIResults.map(r => r.kpiData.churnRate) }
        ],
        categories: monthlyKPIResults.map(r => r.month.substring(0, 3))
      },
      customerLifetimeValueTrend: {
        series: [{ 
          name: 'Customer Lifetime Value', 
          data: monthlyKPIResults.map(r => r.kpiData.customerLifetimeValue) 
        }],
        categories: monthlyKPIResults.map(r => r.month.substring(0, 3))
      },
      purchaseFrequencyTrend: {
        series: [{ 
          name: 'Purchase Frequency', 
          data: monthlyKPIResults.map(r => r.kpiData.purchaseFrequency) 
        }],
        categories: monthlyKPIResults.map(r => r.month.substring(0, 3))
      }
    }

    console.log(`✅ [USC Member-Analytic Chart API] Chart data with precision KPIs for ${monthlyKPIResults.length} months`)

    return NextResponse.json({
      success: true,
      data: chartSeries,
      meta: {
        monthsCount: monthlyKPIResults.length,
        dataSource: 'blue_whale_usc_summary + blue_whale_usc (hybrid via USCLogic)',
        currency: 'USC',
        filters: { line, year }
      }
    })

  } catch (error) {
    console.error('❌ [USC Member-Analytic Chart API] Error fetching chart data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
