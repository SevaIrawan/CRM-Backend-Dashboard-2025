import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // USC Member-Analytic page - Currency LOCKED to USC
  const currency = 'USC'
  const line = searchParams.get('line')
  const year = searchParams.get('year')

  try {
    console.log('📈 [USC Member-Analytic Chart API] Fetching REAL DATA for member analytic charts with USC lock:', { 
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
      console.error('❌ Error fetching months for member analytic charts:', monthError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching chart months',
        message: monthError.message 
      }, { status: 500 })
    }

    const availableMonths = Array.from(new Set(monthData?.map(row => row.month).filter(Boolean) || []))
    
    if (availableMonths.length === 0) {
      console.log('⚠️ No months data found for USC Member-Analytic charts')
      return NextResponse.json({
        success: true,
        data: {
          message: 'No chart data available for current filters',
          hasData: false,
          filters: { currency, line, year }
        }
      })
    }

    // Get member analytic chart data for each month from REAL DATA ONLY
    const chartDataPromises = availableMonths.map(async (month) => {
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
          ggrPerUser: 0,
          depositAmountUser: 0,
          avgTransactionValue: 0,
          activeMember: 0,
          conversionRate: 0,
          churnRate: 0,
          newRegister: 0,
          newDepositor: 0,
          retentionRate: 0
        }
      }

      // Calculate member analytics metrics from REAL DATA for this month
      const uniqueUsers = new Set(data.map(row => row.userkey)).size
      const totalGGR = data.reduce((sum, row) => sum + (Number(row.gross_gaming_revenue) || 0), 0)
      const totalDeposit = data.reduce((sum, row) => sum + (Number(row.deposit_amount) || 0), 0)
      const totalDepositCases = data.reduce((sum, row) => sum + (Number(row.deposit_cases) || 0), 0)
      const usersWithDeposit = new Set(data.filter(row => (Number(row.deposit_cases) || 0) > 0).map(row => row.userkey)).size
      const activeUsers = new Set(data.filter(row => (Number(row.deposit_cases) || 0) > 0 || (Number(row.withdraw_cases) || 0) > 0).map(row => row.userkey)).size

      return {
        month,
        ggrPerUser: uniqueUsers > 0 ? totalGGR / uniqueUsers : 0,
        depositAmountUser: uniqueUsers > 0 ? totalDeposit / uniqueUsers : 0,
        avgTransactionValue: totalDepositCases > 0 ? totalDeposit / totalDepositCases : 0,
        activeMember: uniqueUsers,
        conversionRate: uniqueUsers > 0 ? (usersWithDeposit / uniqueUsers) * 100 : 0,
        churnRate: uniqueUsers > 0 ? ((uniqueUsers - activeUsers) / uniqueUsers) * 100 : 0,
        newRegister: uniqueUsers, // Based on unique users in month
        newDepositor: usersWithDeposit,
        retentionRate: uniqueUsers > 0 ? (activeUsers / uniqueUsers) * 100 : 0
      }
    })

    const monthlyChartData = await Promise.all(chartDataPromises)
    const validChartData = monthlyChartData.filter(data => data !== null)

    // Format member analytic chart data for frontend consumption
    const chartSeries = {
      // GGR Per User Trend
      ggrUserTrend: {
        series: [
          { 
            name: 'GGR Per User', 
            data: validChartData.map(d => d.ggrPerUser) 
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      },

      // Deposit Amount Per User Trend
      depositAmountUserTrend: {
        series: [
          { 
            name: 'Deposit Amount Per User', 
            data: validChartData.map(d => d.depositAmountUser) 
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      },

      // New Register vs New Depositor
      newRegisterTrend: {
        series: [
          { 
            name: 'New Register', 
            data: validChartData.map(d => d.newRegister) 
          },
          { 
            name: 'New Depositor', 
            data: validChartData.map(d => d.newDepositor) 
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      },

      // Active Member Trend
      activeMemberTrend: {
        series: [
          { 
            name: 'Active Member', 
            data: validChartData.map(d => d.activeMember) 
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      },

      // Retention vs Churn Rate
      retentionChurnTrend: {
        series: [
          { 
            name: 'Retention Rate', 
            data: validChartData.map(d => d.retentionRate) 
          },
          { 
            name: 'Churn Rate', 
            data: validChartData.map(d => d.churnRate) 
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      },

      // Customer Lifetime Value Trend
      customerLifetimeValueTrend: {
        series: [
          { 
            name: 'Customer Lifetime Value', 
            data: validChartData.map(d => d.depositAmountUser * 2.5) // Estimated CLV
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      },

      // Purchase Frequency Trend  
      purchaseFrequencyTrend: {
        series: [
          { 
            name: 'Purchase Frequency', 
            data: validChartData.map(d => d.avgTransactionValue > 0 ? d.depositAmountUser / d.avgTransactionValue : 0) 
          }
        ],
        categories: validChartData.map(d => d.month.substring(0, 3))
      }
    }

    console.log(`✅ [USC Member-Analytic Chart API] Generated member analytic chart data from ${validChartData.length} months of REAL DATA`)

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
    console.error('❌ [USC Member-Analytic Chart API] Error processing REAL DATA for charts:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while processing chart data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
