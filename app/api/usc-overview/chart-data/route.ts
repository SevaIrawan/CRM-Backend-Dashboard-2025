import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // USC Overview page - Currency LOCKED to USC
  const currency = 'USC'
  const line = searchParams.get('line')
  const year = searchParams.get('year')

  try {
    console.log('📈 [USC Overview Chart API] Fetching REAL DATA for charts with USC lock:', { 
      currency, line, year 
    })

    // Get all months for the selected year from REAL DATA
    let monthQuery = supabase
      .from('member_report_daily')
      .select('month')
      .eq('currency', 'USC') // Currency LOCKED to USC
      .not('month', 'is', null)
      .order('month')

    // "ALL" means get ALL lines data (no line filter), not literal "ALL" in database
    if (line && line !== 'ALL' && line !== 'all') {
      monthQuery = monthQuery.eq('line', line)
    }

    if (year && year !== 'ALL') {
      monthQuery = monthQuery.eq('year', parseInt(year))
    }

    const { data: monthData, error: monthError } = await monthQuery

    if (monthError) {
      console.error('❌ Error fetching months for charts:', monthError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching chart months',
        message: monthError.message 
      }, { status: 500 })
    }

    const availableMonths = Array.from(new Set(monthData?.map(row => String(row.month)).filter(Boolean) || []))
    
    if (availableMonths.length === 0) {
      console.log('⚠️ No months data found for USC Overview charts')
      return NextResponse.json({
        success: true,
        data: {
          message: 'No chart data available for current filters',
          hasData: false,
          filters: { currency, line, year }
        }
      })
    }

    // Get chart data for each month from REAL DATA ONLY
    const chartDataPromises = availableMonths.map(async (month: string) => {
      let query = supabase
        .from('member_report_daily')
        .select('*')
        .eq('currency', 'USC') // Currency LOCKED to USC
        .eq('month', month)

      // "ALL" means get ALL lines data (no line filter), not literal "ALL" in database
      if (line && line !== 'ALL' && line !== 'all') {
        query = query.eq('line', line)
      }

      if (year && year !== 'ALL') {
        query = query.eq('year', parseInt(year))
      }

      const { data, error } = await query

      if (error) {
        console.error(`❌ Error fetching data for month ${month}:`, error)
        return null
      }

      if (!data || data.length === 0) {
        return {
          month,
          depositAmount: 0,
          withdrawAmount: 0,
          grossGamingRevenue: 0,
          netProfit: 0,
          depositCases: 0,
          withdrawCases: 0,
          activeMember: 0,
          avgTransactionValue: 0,
          purchaseFrequency: 0
        }
      }

      // Calculate metrics from REAL DATA for this month
      return {
        month,
        depositAmount: data.reduce((sum, row) => sum + (Number(row.deposit_amount) || 0), 0),
        withdrawAmount: data.reduce((sum, row) => sum + (Number(row.withdraw_amount) || 0), 0),
        grossGamingRevenue: data.reduce((sum, row) => sum + (Number(row.gross_gaming_revenue) || 0), 0),
        netProfit: data.reduce((sum, row) => sum + (Number(row.net_profit) || 0), 0),
        depositCases: data.reduce((sum, row) => sum + (Number(row.deposit_cases) || 0), 0),
        withdrawCases: data.reduce((sum, row) => sum + (Number(row.withdraw_cases) || 0), 0),
        activeMember: new Set(data.map(row => row.userkey)).size,
        avgTransactionValue: (() => {
          const totalDeposit = data.reduce((sum, row) => sum + (Number(row.deposit_amount) || 0), 0)
          const totalCases = data.reduce((sum, row) => sum + (Number(row.deposit_cases) || 0), 0)
          return totalCases > 0 ? totalDeposit / totalCases : 0
        })(),
        purchaseFrequency: data.length
      }
    })

    const monthlyChartData = await Promise.all(chartDataPromises)
    const validChartData = monthlyChartData.filter(data => data !== null)

    // Format chart data for frontend consumption
    const chartSeries = {
      // Deposit Amount Trend
      depositAmountTrend: {
        series: [
          { 
            name: 'Deposit Amount', 
            data: validChartData.map(d => d.depositAmount) 
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      },

      // Withdraw Amount Trend  
      withdrawAmountTrend: {
        series: [
          { 
            name: 'Withdraw Amount', 
            data: validChartData.map(d => d.withdrawAmount) 
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      },

      // GGR Trend
      ggrTrend: {
        series: [
          { 
            name: 'Gross Gaming Revenue', 
            data: validChartData.map(d => d.grossGamingRevenue) 
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      },

      // Cases Trend
      casesTrend: {
        series: [
          { 
            name: 'Deposit Cases', 
            data: validChartData.map(d => d.depositCases) 
          },
          { 
            name: 'Withdraw Cases', 
            data: validChartData.map(d => d.withdrawCases) 
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      },

      // Average Transaction Value Trend
      avgTransactionValueTrend: {
        series: [
          { 
            name: 'Avg Transaction Value', 
            data: validChartData.map(d => d.avgTransactionValue) 
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      }
    }

    console.log(`✅ [USC Overview Chart API] Generated chart data from ${validChartData.length} months of REAL DATA`)

    return NextResponse.json({
      success: true,
      data: chartSeries,
      meta: {
        monthsCount: validChartData.length,
        dataSource: 'member_report_daily',
        currency: 'USC',
        filters: { line, year },
        isRealData: true
      }
    })

  } catch (error) {
    console.error('❌ [USC Overview Chart API] Error processing REAL DATA for charts:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while processing chart data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
