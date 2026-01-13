import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const line = searchParams.get('line')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const tier = searchParams.get('tier')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const filterMode = searchParams.get('filterMode')
  const statusFilter = searchParams.get('statusFilter') || 'ALL'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  // ✅ Get current user from request header for auto-filter by snr_account
  const userHeader = request.headers.get('x-user')
  let currentUsername: string | null = null
  if (userHeader) {
    try {
      const user = JSON.parse(userHeader)
      currentUsername = user.username || null
    } catch (e) {
      console.warn('⚠️ Could not parse user header')
    }
  }

  if (!currentUsername) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized - User not found'
    }, { status: 401 })
  }

  try {
    console.log('📊 [SNR Customers] Fetching data with filters:', { 
      snr_account: currentUsername,
      line, year, month, tier, startDate, endDate, filterMode, statusFilter, page, limit
    })

    // Build base query - ✅ AUTO-FILTER by snr_account
    let baseQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, user_name, unique_code, update_unique_code, date, line, year, month, first_deposit_date, days_inactive, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, add_bonus, deduct_bonus, net_profit, tier_name, snr_handler')
      .eq('snr_account', currentUsername) // ✅ AUTO-FILTER by snr_account

    // Apply brand filter
    if (line && line !== 'ALL') {
      baseQuery = baseQuery.filter('line', 'eq', line)
    }

    if (year && year !== 'ALL') {
      baseQuery = baseQuery.filter('year', 'eq', parseInt(year))
    }

    // Handle month filtering
    if (filterMode === 'month' && month && month !== 'ALL') {
      baseQuery = baseQuery.filter('month', 'eq', month)
    }

    // Handle date range filtering
    if (filterMode === 'daterange' && startDate && endDate) {
      baseQuery = baseQuery
        .filter('date', 'gte', startDate)
        .filter('date', 'lte', endDate)
    }

    // Handle tier filtering
    if (tier && tier.trim() && tier !== 'ALL') {
      baseQuery = baseQuery.filter('tier_name', 'eq', tier)
    }

    // Get all data first (no pagination for aggregation)
    const result = await baseQuery
      .order('date', { ascending: false })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('userkey', { ascending: true })

    if (result.error) {
      console.error('❌ Supabase query error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching data',
        message: result.error.message 
      }, { status: 500 })
    }

    const rawData = result.data || []
    console.log(`📊 [SNR Customers] Raw records found: ${rawData.length}`)

    // ✅ Fetch previous month data for status classification (only for assigned customers)
    const previousMonthData = await fetchPreviousMonthData(line, year, month, currentUsername)

    // ✅ Fetch MIN dates untuk users dengan first_deposit_date NULL
    const userMinDates = await fetchUserMinDates(rawData, line, currentUsername)

    // Process data for customer retention with status classification
    const processedData = processCustomerRetentionData(rawData, previousMonthData, month, year, userMinDates)
    console.log(`📊 [SNR Customers] Processed data: ${processedData.length} users`)
    
    // ✅ Apply status filter if specified
    const filteredData = statusFilter === 'ALL' 
      ? processedData 
      : processedData.filter(user => user.status === statusFilter)
    
    console.log(`📊 [SNR Customers] After status filter (${statusFilter}): ${filteredData.length} users`)
    
    // Apply pagination to filtered data
    const totalRecords = filteredData.length
    const totalPages = Math.ceil(totalRecords / limit)
    const offset = (page - 1) * limit
    const paginatedData = filteredData.slice(offset, offset + limit)

    console.log(`✅ [SNR Customers] Processed ${paginatedData.length} records (Page ${page} of ${totalPages})`)

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        snr_account: currentUsername,
        line,
        year,
        month,
        tier,
        startDate,
        endDate,
        filterMode,
        statusFilter
      }
    })

  } catch (error) {
    console.error('❌ Error fetching SNR customers data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching data' 
    }, { status: 500 })
  }
}

// ✅ Fetch MIN transaction dates untuk users (regardless of month filter)
async function fetchUserMinDates(rawData: any[], line: string | null, snrAccount: string): Promise<Map<string, string>> {
  try {
    const usersWithNullFirstDeposit = rawData
      .filter((row: any) => !row.first_deposit_date || row.first_deposit_date === null || row.first_deposit_date === '')
      .map((row: any) => row.userkey)
    
    const uniqueUsers = Array.from(new Set(usersWithNullFirstDeposit))
    
    if (uniqueUsers.length === 0) {
      return new Map()
    }
    
    let minDateQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, date')
      .eq('snr_account', snrAccount) // ✅ Auto-filter by snr_account
      .in('userkey', uniqueUsers)
      .gt('deposit_cases', 0)
      .order('date', { ascending: true })
    
    // Apply brand filter
    if (line && line !== 'ALL') {
      minDateQuery = minDateQuery.eq('line', line)
    }
    
    const { data: minDateData, error: minDateError } = await minDateQuery
    
    if (minDateError) {
      console.error('❌ Error fetching MIN dates:', minDateError)
      return new Map()
    }
    
    const userMinDateMap = new Map<string, string>()
    minDateData?.forEach((row: any) => {
      if (!userMinDateMap.has(row.userkey)) {
        userMinDateMap.set(row.userkey, row.date)
      }
    })
    
    return userMinDateMap
  } catch (error) {
    console.error('❌ Error in fetchUserMinDates:', error)
    return new Map()
  }
}

// ✅ Fetch previous month data for status classification
async function fetchPreviousMonthData(line: string | null, year: string | null, month: string | null, snrAccount: string): Promise<Set<string>> {
  if (!month || month === 'ALL') return new Set<string>()
  
  try {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthIndex = monthNames.indexOf(month)
    
    if (currentMonthIndex === -1) return new Set<string>()
    
    let prevMonthIndex = currentMonthIndex - 1
    let prevYear = year
    
    if (prevMonthIndex < 0) {
      prevMonthIndex = 11
      prevYear = year && year !== 'ALL' ? (parseInt(year) - 1).toString() : year
    }
    
    const prevMonth = monthNames[prevMonthIndex]
    
    // Fetch previous month data - ✅ AUTO-FILTER by snr_account
    let prevQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, deposit_cases')
      .eq('snr_account', snrAccount) // ✅ Auto-filter by snr_account
      .eq('month', prevMonth)
      .gt('deposit_cases', 0)
    
    if (prevYear && prevYear !== 'ALL') {
      prevQuery = prevQuery.eq('year', parseInt(prevYear))
    }
    
    // Apply brand filter
    if (line && line !== 'ALL') {
      prevQuery = prevQuery.eq('line', line)
    }
    
    const { data: prevData, error: prevError } = await prevQuery
    
    if (prevError) {
      console.error('❌ Error fetching previous month data:', prevError)
      return new Set<string>()
    }
    
    const prevMonthUsers = new Set<string>(prevData?.map((row: any) => row.userkey) || [])
    return prevMonthUsers
  } catch (error) {
    console.error('❌ Error in fetchPreviousMonthData:', error)
    return new Set<string>()
  }
}

function processCustomerRetentionData(rawData: any[], previousMonthUsers: Set<string>, selectedMonth: string | null, selectedYear: string | null, userMinDates: Map<string, string>) {
  const filteredData = rawData.filter(row => row.deposit_cases > 0)
  
  const userGroups = new Map<string, any>()
  
  filteredData.forEach(row => {
    const userKey = row.userkey
    
    if (!userGroups.has(userKey)) {
      userGroups.set(userKey, {
        userkey: row.userkey,
        line: row.line,
        user_name: row.user_name,
        unique_code: row.update_unique_code || row.unique_code,
        first_deposit_date: row.first_deposit_date || null,
        last_deposit_date: row.date,
        days_inactive: row.days_inactive || 0,
        active_days: 0,
        deposit_cases: 0,
        deposit_amount: 0,
        withdraw_cases: 0,
        withdraw_amount: 0,
        bonus: 0,
        net_profit: 0,
        activeDates: new Set(),
        brands: new Set([row.line]),
        tier_name: row.tier_name || '',
        snr_handler: row.snr_handler || null // ✅ Include handler
      })
    }
    
    const userData = userGroups.get(userKey)
    
    if (row.line) {
      userData.brands.add(row.line)
    }
    
    if (row.tier_name) {
      userData.tier_name = row.tier_name
    }
    
    if (row.first_deposit_date && userData.first_deposit_date) {
      if (new Date(row.first_deposit_date) < new Date(userData.first_deposit_date)) {
        userData.first_deposit_date = row.first_deposit_date
      }
    } else if (row.first_deposit_date && !userData.first_deposit_date) {
      userData.first_deposit_date = row.first_deposit_date
    }
    
    if (new Date(row.date) > new Date(userData.last_deposit_date)) {
      userData.last_deposit_date = row.date
      userData.days_inactive = row.days_inactive || 0
    }
    
    if (row.deposit_cases > 0) {
      userData.activeDates.add(row.date)
    }
    
    userData.deposit_cases += Number(row.deposit_cases) || 0
    userData.deposit_amount += Number(row.deposit_amount) || 0
    userData.withdraw_cases += Number(row.withdraw_cases) || 0
    userData.withdraw_amount += Number(row.withdraw_amount) || 0
    const rowBonus = Number(row.bonus) || 0
    const rowAddBonus = Number(row.add_bonus) || 0
    const rowDeductBonus = Number(row.deduct_bonus) || 0
    userData.bonus += rowBonus + rowAddBonus - rowDeductBonus
    userData.net_profit += Number(row.net_profit) || 0
    
    // ✅ Update handler if available
    if (row.snr_handler) {
      userData.snr_handler = row.snr_handler
    }
  })
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December']
  const selectedMonthIndex = selectedMonth ? monthNames.indexOf(selectedMonth) : -1
  const canCalculateStatus = selectedMonthIndex !== -1 && selectedYear && selectedYear !== 'ALL'
  
  let selectedYearMonth = ''
  if (canCalculateStatus) {
    const selectedMonthNumber = (selectedMonthIndex + 1).toString().padStart(2, '0')
    selectedYearMonth = `${selectedYear}-${selectedMonthNumber}`
  }
  
  const processedData = Array.from(userGroups.values()).map(user => {
    if (!user.first_deposit_date || user.first_deposit_date === null || user.first_deposit_date === '') {
      const globalMinDate = userMinDates.get(user.userkey)
      if (globalMinDate) {
        user.first_deposit_date = globalMinDate
      }
    }
    
    let status = 'N/A'
    if (canCalculateStatus) {
      if (user.first_deposit_date && user.first_deposit_date.startsWith(selectedYearMonth)) {
        status = 'NEW DEPOSITOR'
      } else if (previousMonthUsers.has(user.userkey)) {
        status = 'RETENTION'
      } else {
        status = 'REACTIVATION'
      }
    }
    
    const brandList = Array.from(user.brands).sort().join(', ')
    user.line = brandList
    
    const active_days = user.activeDates.size
    const atv = user.deposit_cases > 0 ? user.deposit_amount / user.deposit_cases : 0
    const pf = active_days > 0 ? user.deposit_cases / active_days : 0
    const ggr = user.deposit_amount - user.withdraw_amount
    const winrate = user.deposit_amount > 0 ? ggr / user.deposit_amount : 0
    const wd_rate = user.deposit_cases > 0 ? user.withdraw_cases / user.deposit_cases : 0
    
    return {
      ...user,
      active_days,
      atv,
      pf,
      winrate,
      wd_rate,
      tier_name: user.tier_name || '',
      status,
      snr_handler: user.snr_handler || null, // ✅ Include handler in response
      activeDates: undefined,
      brands: undefined
    }
  })
  
  processedData.sort((a, b) => {
    if (b.active_days !== a.active_days) {
      return b.active_days - a.active_days
    }
    if (b.net_profit !== a.net_profit) {
      return b.net_profit - a.net_profit
    }
    return (a.userkey || '').localeCompare(b.userkey || '')
  })
  
  return processedData
}
