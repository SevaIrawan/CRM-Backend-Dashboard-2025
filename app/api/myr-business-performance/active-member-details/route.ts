import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Active Member Details API] Starting request')
    
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get('currency') || 'MYR'
    const year = searchParams.get('year')
    const quarter = searchParams.get('quarter')
    const isDateRange = searchParams.get('isDateRange') === 'true'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const statusFilter = searchParams.get('status') || 'ALL'
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')

    const page = Math.max(1, parseInt(pageParam || '1'))
    const limit = Math.max(1, Math.min(1000, parseInt(limitParam || '100')))
    
    console.log('🔍 [DEBUG] Query parameters:', { currency, year, quarter, isDateRange, startDate, endDate, statusFilter, page, limit })
    
    // Determine date range for query
    let queryStartDate: string
    let queryEndDate: string
    
    if (isDateRange && startDate && endDate) {
      queryStartDate = startDate
      queryEndDate = endDate
    } else {
      // Calculate quarter date range
      const quarterStartMonth = quarter === 'Q1' ? '01' : quarter === 'Q2' ? '04' : quarter === 'Q3' ? '07' : '10'
      const quarterEndMonth = quarter === 'Q1' ? '03' : quarter === 'Q2' ? '06' : quarter === 'Q3' ? '09' : '12'
      const quarterEndDay = quarter === 'Q1' ? '31' : quarter === 'Q2' ? '30' : quarter === 'Q3' ? '30' : '31'
      
      queryStartDate = `${year}-${quarterStartMonth}-01`
      queryEndDate = `${year}-${quarterEndMonth}-${quarterEndDay}`
    }
    
    // Calculate previous period dates (for status determination)
    const currentStart = new Date(queryStartDate)
    const currentEnd = new Date(queryEndDate)
    const prevStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, currentStart.getDate())
    const prevEnd = new Date(currentEnd.getFullYear(), currentEnd.getMonth() - 1, currentEnd.getDate())
    const prevStartDate = prevStart.toISOString().split('T')[0]
    const prevEndDate = prevEnd.toISOString().split('T')[0]
    
    console.log('📅 [DEBUG] Date ranges:', {
      current: `${queryStartDate} to ${queryEndDate}`,
      previous: `${prevStartDate} to ${prevEndDate}`
    })
    
    // =====================================================================
    // STEP 1: Get all active members in CURRENT period (userkey level)
    // =====================================================================
    const { data: currentData, error: currentError } = await supabase
      .from('blue_whale_myr')
      .select('*')
      .eq('currency', currency)
      .gte('date', queryStartDate)
      .lte('date', queryEndDate)
      .gt('deposit_cases', 0)
    
    if (currentError) {
      console.error('❌ Database error (current period):', currentError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: currentError.message
      }, { status: 500 })
    }
    
    // =====================================================================
    // STEP 2: Get all active members in PREVIOUS period (for status)
    // =====================================================================
    const { data: prevData } = await supabase
      .from('blue_whale_myr')
      .select('userkey, unique_code')
      .eq('currency', currency)
      .gte('date', prevStartDate)
      .lte('date', prevEndDate)
      .gt('deposit_cases', 0)
    
    const prevUserKeys = new Set(prevData?.map((r: any) => r.userkey) || [])
    
    console.log('📊 [DEBUG] Previous period active members:', prevUserKeys.size)
    
    // =====================================================================
    // STEP 3: Determine LAST MONTH of current period for New Depositor logic
    // Get MAX date from ACTUAL DATA in the period (not the theoretical end date)
    // =====================================================================
    const { data: maxDateData } = await supabase
      .from('blue_whale_myr')
      .select('date')
      .eq('currency', currency)
      .gte('date', queryStartDate)
      .lte('date', queryEndDate)
      .order('date', { ascending: false })
      .limit(1)
    
    const maxDateInPeriod = maxDateData?.[0]?.date || queryEndDate
    
    // Extract year and month from max date (format: YYYY-MM-DD)
    const [lastYear, lastMonthStr] = maxDateInPeriod.split('-')
    const lastMonth = parseInt(lastMonthStr) // 1-12
    
    // Calculate last month start and end dates using string manipulation (no timezone issues)
    const lastMonthStart = `${lastYear}-${String(lastMonth).padStart(2, '0')}-01`
    
    // Calculate last day of month
    const nextMonth = lastMonth === 12 ? 1 : lastMonth + 1
    const nextMonthYear = lastMonth === 12 ? parseInt(lastYear) + 1 : parseInt(lastYear)
    const lastDayOfMonth = new Date(nextMonthYear, nextMonth - 1, 0).getDate()
    const lastMonthEnd = `${lastYear}-${String(lastMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`
    
    console.log('📅 [DEBUG] Last month of period:', {
      maxDateInPeriod,
      lastMonth: `${lastYear}-${String(lastMonth).padStart(2, '0')}`,
      lastMonthStart,
      lastMonthEnd
    })
    
    // =====================================================================
    // STEP 4: Get New Depositor data from blue_whale_myr
    // Users with first_deposit_date in LAST MONTH of period
    // =====================================================================
    const { data: newDepositorData, error: newDepError } = await supabase
      .from('blue_whale_myr')
      .select('userkey, first_deposit_date')
      .eq('currency', currency)
      .gte('first_deposit_date', lastMonthStart)
      .lte('first_deposit_date', lastMonthEnd)
      .not('first_deposit_date', 'is', null) // Exclude NULL first_deposit_date
    
    console.log('🔍 [DEBUG] New Depositor query:', {
      table: 'blue_whale_myr',
      currency,
      dateRange: `${lastMonthStart} to ${lastMonthEnd}`,
      rowsReturned: newDepositorData?.length || 0,
      error: newDepError ? newDepError.message : null,
      sample: newDepositorData?.slice(0, 3) || []
    })
    
    // Get unique userkeys with first_deposit_date in last month
    const newDepositorKeys = new Set(
      newDepositorData
        ?.map((r: any) => r.userkey)
        .filter((key: any) => key) || []
    )
    
    console.log('📊 [DEBUG] New Depositors in last month:', newDepositorKeys.size, `(${lastYear}-${String(lastMonth).padStart(2, '0')})`)
    
    // =====================================================================
    // STEP 5: Aggregate data per userkey
    // =====================================================================
    const userMap: Record<string, any> = {}
    
    currentData?.forEach((row: any) => {
      const userkey = row.userkey
      
      if (!userMap[userkey]) {
        userMap[userkey] = {
          userkey: userkey,
          uniqueCode: row.unique_code || 'N/A',
          userName: row.user_name || 'N/A',
          brand: row.line || 'N/A',
          lastDepositDate: row.date,
          daysActive: 0,
          depositAmount: 0,
          depositCases: 0,
          withdrawAmount: 0,
          withdrawCases: 0,
          addTransaction: 0,
          deductTransaction: 0,
          dates: new Set()
        }
      }
      
      const user = userMap[userkey]
      
      // Track dates for days active calculation
      user.dates.add(row.date)
      
      // Update last deposit date (keep most recent)
      if (row.date > user.lastDepositDate) {
        user.lastDepositDate = row.date
      }
      
      // Aggregate financial data
      user.depositAmount += row.deposit_amount || 0
      user.depositCases += row.deposit_cases || 0
      user.withdrawAmount += row.withdraw_amount || 0
      user.withdrawCases += row.withdraw_cases || 0
      user.addTransaction += row.add_transaction || 0
      user.deductTransaction += row.deduct_transaction || 0
    })
    
    // =====================================================================
    // STEP 6: Calculate metrics and determine status for each user
    // =====================================================================
    const memberDetails: any[] = []
    
    for (const userkey in userMap) {
      const user = userMap[userkey]
      
      // Days Active = number of unique dates user had deposits
      const daysActive = user.dates.size
      
      // Calculate Days Inactive (from last deposit to end of period)
      const lastDeposit = new Date(user.lastDepositDate)
      const periodEnd = new Date(queryEndDate)
      const daysInactive = Math.max(0, Math.floor((periodEnd.getTime() - lastDeposit.getTime()) / (1000 * 60 * 60 * 24)))
      
      // Calculate KPIs
      const atv = user.depositCases > 0 ? user.depositAmount / user.depositCases : 0
      const ggr = user.depositAmount - user.withdrawAmount
      const netProfit = ggr - user.deductTransaction + user.addTransaction
      const winrate = user.depositAmount > 0 ? (ggr / user.depositAmount) * 100 : 0
      const withdrawalRate = user.depositCases > 0 ? (user.withdrawCases / user.depositCases) * 100 : 0
      
      // Determine Status
      // Priority:
      // 1. New Depositor: first_deposit_date exists and is in LAST MONTH of period
      // 2. Reactivation: Active in current period but NOT in previous period
      // 3. Retention: Active in both current AND previous period
      let status = 'Retention' // Default
      
      if (newDepositorKeys.has(userkey)) {
        status = 'New Depositor'
      } else if (!prevUserKeys.has(userkey)) {
        status = 'Reactivation'
      } else {
        status = 'Retention'
      }
      
      memberDetails.push({
        uniqueCode: user.uniqueCode,
        userName: user.userName,
        lastDepositDate: user.lastDepositDate,
        daysInactive: daysInactive,
        daysActive: daysActive,
        atv: atv,
        depositCases: user.depositCases,
        depositAmount: user.depositAmount,
        withdrawCases: user.withdrawCases,
        withdrawAmount: user.withdrawAmount,
        ggr: ggr,
        netProfit: netProfit,
        winrate: winrate,
        withdrawalRate: withdrawalRate,
        status: status,
        brand: user.brand
      })
    }
    
    console.log('📊 [DEBUG] Total members aggregated:', memberDetails.length)
    
    // =====================================================================
    // STEP 7: Filter by status if not ALL
    // =====================================================================
    let filteredMembers = memberDetails
    if (statusFilter !== 'ALL') {
      filteredMembers = memberDetails.filter(m => m.status === statusFilter)
    }
    
    console.log('📊 [DEBUG] Members after status filter:', filteredMembers.length)
    
    // =====================================================================
    // STEP 8: Sort by GGR DESC, Days Active DESC, Brand ASC
    // =====================================================================
    filteredMembers.sort((a, b) => {
      // Primary: GGR DESC (highest first)
      if (b.ggr !== a.ggr) {
        return b.ggr - a.ggr
      }
      // Secondary: Days Active DESC (most active first)
      if (b.daysActive !== a.daysActive) {
        return b.daysActive - a.daysActive
      }
      // Tertiary: Brand ASC (alphabetical)
      return a.brand.localeCompare(b.brand)
    })
    
    // =====================================================================
    // STEP 9: Calculate Mini KPIs (from filtered data)
    // =====================================================================
    const miniKPI = {
      count: filteredMembers.length,
      atv: filteredMembers.length > 0 
        ? filteredMembers.reduce((sum, m) => sum + m.depositAmount, 0) / filteredMembers.reduce((sum, m) => sum + m.depositCases, 0)
        : 0,
      depositCases: filteredMembers.reduce((sum, m) => sum + m.depositCases, 0),
      depositAmount: filteredMembers.reduce((sum, m) => sum + m.depositAmount, 0),
      netProfit: filteredMembers.reduce((sum, m) => sum + m.netProfit, 0)
    }
    
    // =====================================================================
    // STEP 10: Pagination
    // =====================================================================
    const totalRecords = filteredMembers.length
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit))
    const currentPage = Math.min(page, totalPages)
    const from = (currentPage - 1) * limit
    const to = Math.min(from + limit, totalRecords)
    
    const paginatedMembers = filteredMembers.slice(from, to)
    
    console.log('📊 [DEBUG] Pagination:', { totalRecords, totalPages, currentPage, from, to, returned: paginatedMembers.length })
    
    // =====================================================================
    // STEP 11: Return Response
    // =====================================================================
    return NextResponse.json({
      success: true,
      data: {
        members: paginatedMembers,
        miniKPI: miniKPI,
        pagination: {
          page: currentPage,
          limit,
          totalRecords,
          totalPages
        },
        filters: {
          currency,
          year: year || 'All',
          quarter: quarter || 'All',
          startDate: queryStartDate,
          endDate: queryEndDate,
          status: statusFilter
        }
      }
    })
    
  } catch (error) {
    console.error('❌ [Active Member Details API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

