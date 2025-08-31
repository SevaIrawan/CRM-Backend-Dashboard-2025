import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // USC Member-Analytic page - Currency LOCKED to USC
  const currency = 'USC'
  const line = searchParams.get('line')
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  try {
    console.log('📊 [USC Member-Analytic KPI API] Fetching REAL DATA KPIs with USC lock:', { 
      currency, line, year, month 
    })

    // Build query for REAL DATA from member_report_daily
    let query = supabase
      .from('member_report_daily')
      .select('*')
      .eq('currency', 'USC') // Currency LOCKED to USC

    // Apply filters based on slicer selections - ALL REAL DATA
    // "ALL" means get ALL lines data (no line filter), not literal "ALL" in database
    if (line && line !== 'ALL' && line !== 'all') {
      query = query.eq('line', line)
    }

    if (year && year !== 'ALL') {
      query = query.eq('year', parseInt(year))
    }

    if (month && month !== 'ALL') {
      query = query.eq('month', month)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching REAL KPI data for USC Member-Analytic:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching real KPI data',
        message: error.message 
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No REAL DATA found for USC Member-Analytic KPI with current filters')
      return NextResponse.json({
        success: true,
        data: {
          message: 'No real data found for current filter selection',
          hasData: false,
          filters: { currency, line, year, month }
        }
      })
    }

    // Calculate Member-Analytic specific KPIs from REAL DATA - NO FALLBACK/DUMMY DATA
    const realKPIs = {
      // Core Member Analytics KPIs from REAL member_report_daily data
      ggrPerUser: (() => {
        const totalGGR = data.reduce((sum, row) => sum + (Number(row.gross_gaming_revenue) || 0), 0)
        const uniqueUsers = new Set(data.map(row => row.userkey)).size
        return uniqueUsers > 0 ? totalGGR / uniqueUsers : 0
      })(),
      
      depositAmountUser: (() => {
        const totalDeposit = data.reduce((sum, row) => sum + (Number(row.deposit_amount) || 0), 0)
        const uniqueUsers = new Set(data.map(row => row.userkey)).size
        return uniqueUsers > 0 ? totalDeposit / uniqueUsers : 0
      })(),
      
      avgTransactionValue: (() => {
        const totalDeposit = data.reduce((sum, row) => sum + (Number(row.deposit_amount) || 0), 0)
        const totalCases = data.reduce((sum, row) => sum + (Number(row.deposit_cases) || 0), 0)
        return totalCases > 0 ? totalDeposit / totalCases : 0
      })(),
      
      activeMember: new Set(data.map(row => row.userkey)).size, // Unique userkeys
      
      conversionRate: (() => {
        const usersWithDeposit = new Set(data.filter(row => (Number(row.deposit_cases) || 0) > 0).map(row => row.userkey)).size
        const totalUsers = new Set(data.map(row => row.userkey)).size
        return totalUsers > 0 ? (usersWithDeposit / totalUsers) * 100 : 0
      })(),
      
      churnRate: (() => {
        // Calculate based on users without recent activity
        const activeUsers = new Set(data.filter(row => (Number(row.deposit_cases) || 0) > 0 || (Number(row.withdraw_cases) || 0) > 0).map(row => row.userkey)).size
        const totalUsers = new Set(data.map(row => row.userkey)).size
        return totalUsers > 0 ? ((totalUsers - activeUsers) / totalUsers) * 100 : 0
      })(),
      
      // Additional analytics metrics
      totalDeposit: data.reduce((sum, row) => sum + (Number(row.deposit_amount) || 0), 0),
      totalWithdraw: data.reduce((sum, row) => sum + (Number(row.withdraw_amount) || 0), 0),
      totalGGR: data.reduce((sum, row) => sum + (Number(row.gross_gaming_revenue) || 0), 0),
      totalDepositCases: data.reduce((sum, row) => sum + (Number(row.deposit_cases) || 0), 0),
      totalWithdrawCases: data.reduce((sum, row) => sum + (Number(row.withdraw_cases) || 0), 0),
      
      // Purchase behavior metrics
      purchaseFrequency: (() => {
        const userTransactions = {}
        data.forEach(row => {
          const userkey = row.userkey
          if (!userTransactions[userkey]) userTransactions[userkey] = 0
          userTransactions[userkey] += (Number(row.deposit_cases) || 0)
        })
        const totalTransactions = Object.values(userTransactions).reduce((sum: number, count: any) => sum + count, 0)
        const uniqueUsers = Object.keys(userTransactions).length
        return uniqueUsers > 0 ? totalTransactions / uniqueUsers : 0
      })(),
      
      customerLifetimeValue: (() => {
        const avgTxnValue = (() => {
          const totalDeposit = data.reduce((sum, row) => sum + (Number(row.deposit_amount) || 0), 0)
          const totalCases = data.reduce((sum, row) => sum + (Number(row.deposit_cases) || 0), 0)
          return totalCases > 0 ? totalDeposit / totalCases : 0
        })()
        const avgFrequency = (() => {
          const userTransactions = {}
          data.forEach(row => {
            const userkey = row.userkey
            if (!userTransactions[userkey]) userTransactions[userkey] = 0
            userTransactions[userkey] += (Number(row.deposit_cases) || 0)
          })
          const totalTransactions = Object.values(userTransactions).reduce((sum: number, count: any) => sum + count, 0)
          const uniqueUsers = Object.keys(userTransactions).length
          return uniqueUsers > 0 ? totalTransactions / uniqueUsers : 0
        })()
        return avgTxnValue * avgFrequency * 2.5 // Estimated lifetime multiplier
      })(),
      
      recordCount: data.length,
      dataSource: 'REAL_DATA_ONLY'
    }

    console.log(`✅ [USC Member-Analytic KPI API] Calculated member analytics KPIs from ${data.length} REAL DATA records`)

    return NextResponse.json({
      success: true,
      data: realKPIs,
      meta: {
        recordCount: data.length,
        uniqueUsers: new Set(data.map(row => row.userkey)).size,
        dataSource: 'member_report_daily',
        currency: 'USC',
        filters: { line, year, month },
        isRealData: true
      }
    })

  } catch (error) {
    console.error('❌ [USC Member-Analytic KPI API] Error processing REAL DATA:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while processing real data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
