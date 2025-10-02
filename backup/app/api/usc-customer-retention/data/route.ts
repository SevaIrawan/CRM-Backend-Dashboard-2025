import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // USC Customer Retention page - Currency LOCKED to USC
  const currency = 'USC'
  const line = searchParams.get('line') || 'ALL'
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('🔍 [USC Customer Retention API] Fetching retention data:', { 
      year, 
      month, 
      line, 
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
        return { year: String(parseInt(year) - 1), month: 'December' }
      } else {
        return { year, month: monthOrder[currentIndex - 1] }
      }
    }

    const { year: prevYear, month: prevMonth } = getPrevMonth(year, month)

    console.log('📊 [USC Customer Retention] Previous month:', { prevYear, prevMonth })

    // Step 1: Get members active in PREVIOUS month
    let prevMonthQuery = supabase
      .from('blue_whale_usc')
      .select('userkey')
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

    console.log('📊 [USC Customer Retention] Previous month active members:', prevMonthMembers?.length)

    // Step 2: Get members active in CURRENT month (slicer month)
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

    console.log('📊 [USC Customer Retention] Current month active members:', currentMonthMembers?.length)

    // Step 3: Find RETAINED members (in BOTH prev month AND current month)
    const prevUserKeys = new Set(prevMonthMembers?.map(m => m.userkey) || [])
    const currentUserKeys = new Set(currentMonthMembers?.map(m => m.userkey) || [])
    const retainedUserKeys = Array.from(prevUserKeys).filter(key => currentUserKeys.has(key))

    console.log('📊 [USC Customer Retention] Retained members count:', retainedUserKeys.length)

    if (retainedUserKeys.length === 0) {
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

    // Step 4: Get detailed data for retained members from CURRENT month (slicer month)
    let detailQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, unique_code, user_name, date, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, net_profit, ggr')
      .eq('currency', 'USC')
      .eq('year', year)
      .eq('month', month)
      .in('userkey', retainedUserKeys)

    if (line !== 'ALL') {
      detailQuery = detailQuery.eq('line', line)
    }

    const { data: retentionDetails, error: detailError } = await detailQuery

    if (detailError) {
      console.error('❌ Error fetching retention details:', detailError)
      throw detailError
    }

    console.log('📊 [USC Customer Retention] Detail rows fetched:', retentionDetails?.length)

    // Step 5: Get PURE last deposit date (MAX date from ALL data) for each member
    const pureLastDepositQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, date')
      .eq('currency', 'USC')
      .in('userkey', retainedUserKeys)
      .order('date', { ascending: false })

    const { data: allDates, error: dateError } = await pureLastDepositQuery

    if (dateError) {
      console.error('❌ Error fetching pure last deposit dates:', dateError)
      throw dateError
    }

    // Build map of userkey -> pure last deposit date (max date)
    const pureLastDepositMap = new Map()
    allDates?.forEach(row => {
      const current = pureLastDepositMap.get(row.userkey)
      const rowDate = String(row.date)
      if (!current || rowDate > current) {
        pureLastDepositMap.set(row.userkey, rowDate)
      }
    })

    console.log('📊 [USC Customer Retention] Pure last deposit dates fetched for members:', pureLastDepositMap.size)

    // Step 6: Aggregate data per member and calculate metrics
    const memberMap = new Map()
    const currentDate = new Date()

    retentionDetails?.forEach(row => {
      const key = row.userkey
      
      if (!memberMap.has(key)) {
        memberMap.set(key, {
          userkey: row.userkey,
          unique_code: row.unique_code,
          user_name: row.user_name,
          last_deposit_date: row.date,
          active_dates: new Set(),
          deposit_cases: 0,
          deposit_amount: 0,
          withdraw_cases: 0,
          withdraw_amount: 0,
          net_profit: 0,
          ggr: 0
        })
      }

      const member = memberMap.get(key)
      
      // Track active dates (distinct dates with deposit_cases > 0)
      if (row.date && (Number(row.deposit_cases) || 0) > 0) {
        member.active_dates.add(row.date)
      }
      
      // Aggregate metrics
      member.deposit_cases += Number(row.deposit_cases) || 0
      member.deposit_amount += Number(row.deposit_amount) || 0
      member.withdraw_cases += Number(row.withdraw_cases) || 0
      member.withdraw_amount += Number(row.withdraw_amount) || 0
      member.net_profit += Number(row.net_profit) || 0
      member.ggr += Number(row.ggr) || 0
      
      // Keep the latest deposit date IN SLICER MONTH
      if (row.date && (!member.last_deposit_date || row.date > member.last_deposit_date)) {
        member.last_deposit_date = row.date
      }
    })

    // Step 7: Calculate metrics and prepare results
    const results = Array.from(memberMap.values()).map(member => {
      // Winrate = GGR / Deposit Amount * 100
      const winrate = member.deposit_amount > 0 
        ? (member.ggr / member.deposit_amount) * 100 
        : 0

      // Active days = count of distinct dates with deposit in slicer month
      const activeDays = member.active_dates.size

      // Inactive days (PURE) = TODAY - MAX(date) from ALL data
      const pureLastDepositDate = pureLastDepositMap.get(member.userkey)
      const inactiveDays = pureLastDepositDate 
        ? Math.floor((currentDate.getTime() - new Date(pureLastDepositDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      return {
        unique_code: member.unique_code,
        user_name: member.user_name,
        last_deposit_date: member.last_deposit_date,
        active_days: activeDays,
        inactive_days: inactiveDays,
        deposit_cases: member.deposit_cases,
        deposit_amount: member.deposit_amount,
        withdraw_cases: member.withdraw_cases,
        withdraw_amount: member.withdraw_amount,
        net_profit: member.net_profit,
        winrate: parseFloat(winrate.toFixed(2))
      }
    })

    // Step 8: Sort by active_days DESC, then net_profit DESC
    results.sort((a, b) => {
      if (b.active_days !== a.active_days) {
        return b.active_days - a.active_days
      }
      return b.net_profit - a.net_profit
    })

    // Step 9: Pagination
    const totalRecords = results.length
    const totalPages = Math.ceil(totalRecords / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = results.slice(startIndex, endIndex)

    console.log('✅ [USC Customer Retention API] Data fetched successfully:', {
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
    console.error('❌ [USC Customer Retention API] Error:', error)
    console.error('❌ [USC Customer Retention API] Error details:', {
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

