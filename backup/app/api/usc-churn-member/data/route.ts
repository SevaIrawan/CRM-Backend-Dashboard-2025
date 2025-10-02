import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // USC Churn Member page - Currency LOCKED to USC
  const currency = 'USC'
  const line = searchParams.get('line') || 'ALL'
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('🔍 [USC Churn Member API] Fetching churn member data:', { 
      year, 
      month, 
      line, 
      lineType: typeof line,
      lineComparison: line !== 'ALL',
      page, 
      limit 
    })

    if (!year || !month || month === 'ALL') {
      return NextResponse.json({
        success: false,
        error: 'Year and Month are required',
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          recordsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        }
      })
    }

    // Get previous month
    const getPrevMonth = (year: string, month: string) => {
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      const currentIndex = monthOrder.indexOf(month)
      
      if (currentIndex === 0) {
        // January -> December of previous year
        return { year: String(parseInt(year) - 1), month: 'December' }
      } else {
        return { year, month: monthOrder[currentIndex - 1] }
      }
    }

    const { year: prevYear, month: prevMonth } = getPrevMonth(year, month)

    console.log('📊 [USC Churn Member] Previous month:', { prevYear, prevMonth })

    // Step 1: Get members who were active in PREVIOUS month
    let prevMonthQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, unique_code, user_name')
      .eq('currency', 'USC')
      .eq('year', prevYear)
      .eq('month', prevMonth)
      .gt('deposit_cases', 0)

    if (line !== 'ALL') {
      prevMonthQuery = prevMonthQuery.eq('line', line)
    }

    const { data: prevMonthMembers, error: prevError } = await prevMonthQuery

    if (prevError) {
      console.error('❌ Error fetching previous month members:', prevError)
      throw prevError
    }

    console.log('📊 [USC Churn Member] Previous month active members:', prevMonthMembers?.length)

    // Step 2: Get members who are active in CURRENT month
    let currentMonthQuery = supabase
      .from('blue_whale_usc')
      .select('userkey')
      .eq('currency', 'USC')
      .eq('year', year)
      .eq('month', month)
      .gt('deposit_cases', 0)

    if (line !== 'ALL') {
      currentMonthQuery = currentMonthQuery.eq('line', line)
    }

    const { data: currentMonthMembers, error: currentError } = await currentMonthQuery

    if (currentError) {
      console.error('❌ Error fetching current month members:', currentError)
      throw currentError
    }

    console.log('📊 [USC Churn Member] Current month active members:', currentMonthMembers?.length)

    // Step 3: Find churned members (in prev month but NOT in current month)
    const currentUserKeys = new Set(currentMonthMembers?.map(m => m.userkey) || [])
    const churnedMembers = prevMonthMembers?.filter(m => !currentUserKeys.has(m.userkey)) || []

    console.log('📊 [USC Churn Member] Churned members count:', churnedMembers.length)

    if (churnedMembers.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          recordsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        }
      })
    }

    // Step 4: Get detailed data for churned members from PREVIOUS month (last active month)
    const churnedUserKeys = churnedMembers.map(m => m.userkey)
    
    console.log('📊 [USC Churn Member] Fetching details for churned members:', churnedUserKeys.length)
    
    let detailQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, unique_code, user_name, date, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, net_profit, ggr')
      .eq('currency', 'USC')
      .eq('year', prevYear)
      .eq('month', prevMonth)
      .in('userkey', churnedUserKeys)

    if (line !== 'ALL') {
      detailQuery = detailQuery.eq('line', line)
    }

    const { data: churnedDetails, error: detailError } = await detailQuery

    if (detailError) {
      console.error('❌ Error fetching churned member details:', detailError)
      throw detailError
    }
    
    console.log('📊 [USC Churn Member] Detail rows fetched:', churnedDetails?.length)

    // Step 5: Aggregate data per member and calculate metrics
    const memberMap = new Map()

    churnedDetails?.forEach(row => {
      const key = row.userkey
      
      if (!memberMap.has(key)) {
        memberMap.set(key, {
          userkey: row.userkey,
          unique_code: row.unique_code,
          user_name: row.user_name,
          last_deposit_date: row.date,
          deposit_cases: 0,
          deposit_amount: 0,
          withdraw_cases: 0,
          withdraw_amount: 0,
          net_profit: 0,
          ggr: 0
        })
      }

      const member = memberMap.get(key)
      member.deposit_cases += Number(row.deposit_cases) || 0
      member.deposit_amount += Number(row.deposit_amount) || 0
      member.withdraw_cases += Number(row.withdraw_cases) || 0
      member.withdraw_amount += Number(row.withdraw_amount) || 0
      member.net_profit += Number(row.net_profit) || 0
      member.ggr += Number(row.ggr) || 0
      
      // Keep the latest deposit date
      if (row.date && (!member.last_deposit_date || row.date > member.last_deposit_date)) {
        member.last_deposit_date = row.date
      }
    })

    // Step 6: Calculate winrate and days_inactive
    const currentDate = new Date()
    const results = Array.from(memberMap.values()).map(member => {
      // Winrate = GGR / Deposit Amount * 100
      const winrate = member.deposit_amount > 0 
        ? (member.ggr / member.deposit_amount) * 100 
        : 0

      // Days inactive = days between last_deposit_date and current date
      const lastDepositDate = new Date(member.last_deposit_date)
      const daysInactive = Math.floor((currentDate.getTime() - lastDepositDate.getTime()) / (1000 * 60 * 60 * 24))

      return {
        unique_code: member.unique_code,
        user_name: member.user_name,
        last_deposit_date: member.last_deposit_date,
        days_inactive: daysInactive,
        deposit_cases: member.deposit_cases,
        deposit_amount: member.deposit_amount,
        withdraw_cases: member.withdraw_cases,
        withdraw_amount: member.withdraw_amount,
        net_profit: member.net_profit,
        winrate: parseFloat(winrate.toFixed(2))
      }
    })

    // Step 7: Sort by net_profit (descending)
    results.sort((a, b) => b.net_profit - a.net_profit)

    // Step 8: Pagination
    const totalRecords = results.length
    const totalPages = Math.ceil(totalRecords / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = results.slice(startIndex, endIndex)

    console.log('✅ [USC Churn Member API] Data fetched successfully:', {
      totalRecords,
      totalPages,
      currentPage: page,
      returnedRecords: paginatedData.length
    })

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('❌ [USC Churn Member API] Error:', error)
    console.error('❌ [USC Churn Member API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      filters: { year, month, line }
    })
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalRecords: 0,
        recordsPerPage: limit,
        hasNextPage: false,
        hasPrevPage: false
      }
    }, { status: 500 })
  }
}

