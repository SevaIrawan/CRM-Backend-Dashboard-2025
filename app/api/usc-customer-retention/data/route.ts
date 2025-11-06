import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const currency = searchParams.get('currency')
  const line = searchParams.get('line')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const filterMode = searchParams.get('filterMode')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  // ✅ NEW: Get user's allowed brands from request header
  const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
  const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

  try {
    console.log('📊 Fetching blue_whale_usc data for customer retention with filters:', { 
      currency, line, year, month, startDate, endDate, filterMode, page, limit,
      user_allowed_brands: userAllowedBrands
    })

    // Build base query for filtering - using blue_whale_usc table (include first_deposit_date and line)
    let baseQuery = supabase.from('blue_whale_usc').select('userkey, user_name, unique_code, date, line, year, month, first_deposit_date, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, net_profit')

    // No currency filter needed since table is blue_whale_usc

    // ✅ NEW: Apply brand filter with user permission check
    if (line && line !== 'ALL') {
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      baseQuery = baseQuery.filter('line', 'eq', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      baseQuery = baseQuery.in('line', userAllowedBrands)
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

    // Get all data first (no pagination for aggregation)
    const result = await baseQuery
      .order('date', { ascending: false })
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (result.error) {
      console.error('❌ Supabase query error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching blue_whale_usc data',
        message: result.error.message 
      }, { status: 500 })
    }

    const rawData = result.data || []
    console.log(`📊 Raw blue_whale_usc records found: ${rawData.length}`)
    console.log(`📊 Sample raw data:`, rawData.slice(0, 3))

    // ✅ Fetch previous month data for status classification
    const previousMonthData = await fetchPreviousMonthData(line, year, month, userAllowedBrands)

    // ✅ Fetch MIN dates untuk users dengan first_deposit_date NULL (regardless of filter)
    const userMinDates = await fetchUserMinDates(rawData, line, userAllowedBrands)

    // Process data for customer retention with status classification
    const processedData = processCustomerRetentionData(rawData, previousMonthData, month, year, userMinDates)
    console.log(`📊 Processed customer retention data: ${processedData.length} users`)
    
    // Apply pagination to processed data
    const totalRecords = processedData.length
    const totalPages = Math.ceil(totalRecords / limit)
    const offset = (page - 1) * limit
    const paginatedData = processedData.slice(offset, offset + limit)

    console.log(`✅ Processed ${paginatedData.length} customer retention records (Page ${page} of ${totalPages})`)

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
        currency,
        line,
        year,
        month,
        startDate,
        endDate,
        filterMode
      }
    })

  } catch (error) {
    console.error('❌ Error fetching blue_whale_usc customer retention data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching blue_whale_usc customer retention data' 
    }, { status: 500 })
  }
}

// ✅ Fetch MIN transaction dates untuk users (regardless of month filter)
async function fetchUserMinDates(rawData: any[], line: string | null, userAllowedBrands: string[] | null): Promise<Map<string, string>> {
  try {
    // Find users dengan first_deposit_date NULL
    const usersWithNullFirstDeposit = rawData
      .filter(row => !row.first_deposit_date || row.first_deposit_date === null || row.first_deposit_date === '')
      .map(row => row.userkey)
    
    const uniqueUsers = [...new Set(usersWithNullFirstDeposit)]
    
    if (uniqueUsers.length === 0) {
      console.log('✅ All users have valid first_deposit_date, no MIN date fetch needed')
      return new Map()
    }
    
    console.log(`🔍 Fetching MIN dates for ${uniqueUsers.length} users with NULL first_deposit_date`)
    
    // Fetch MIN date untuk each user dari ALL transactions (no month filter)
    let minDateQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, date')
      .in('userkey', uniqueUsers)
      .gt('deposit_cases', 0)
      .order('date', { ascending: true })
    
    // Apply brand filter
    if (line && line !== 'ALL') {
      minDateQuery = minDateQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      minDateQuery = minDateQuery.in('line', userAllowedBrands)
    }
    
    const { data: minDateData, error: minDateError } = await minDateQuery
    
    if (minDateError) {
      console.error('❌ Error fetching MIN dates:', minDateError)
      return new Map()
    }
    
    // Build Map: userkey -> MIN date
    const userMinDateMap = new Map<string, string>()
    minDateData?.forEach(row => {
      if (!userMinDateMap.has(row.userkey)) {
        userMinDateMap.set(row.userkey, row.date)
      }
    })
    
    console.log(`📊 Fetched MIN dates for ${userMinDateMap.size} users`)
    
    return userMinDateMap
  } catch (error) {
    console.error('❌ Error in fetchUserMinDates:', error)
    return new Map()
  }
}

// ✅ Fetch previous month data for status classification
async function fetchPreviousMonthData(line: string | null, year: string | null, month: string | null, userAllowedBrands: string[] | null): Promise<Set<string>> {
  if (!month || month === 'ALL') return new Set<string>()
  
  try {
    // Calculate previous month
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthIndex = monthNames.indexOf(month)
    
    if (currentMonthIndex === -1) return new Set<string>()
    
    let prevMonthIndex = currentMonthIndex - 1
    let prevYear = year
    
    if (prevMonthIndex < 0) {
      // Previous month is in previous year
      prevMonthIndex = 11 // December
      prevYear = year !== 'ALL' ? (parseInt(year) - 1).toString() : year
    }
    
    const prevMonth = monthNames[prevMonthIndex]
    
    console.log(`🔍 Fetching previous month data: ${prevMonth} ${prevYear}`)
    
    // Fetch previous month data
    let prevQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, deposit_cases')
      .eq('month', prevMonth)
      .gt('deposit_cases', 0)
    
    if (prevYear && prevYear !== 'ALL') {
      prevQuery = prevQuery.eq('year', parseInt(prevYear))
    }
    
    // Apply brand filter
    if (line && line !== 'ALL') {
      prevQuery = prevQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      prevQuery = prevQuery.in('line', userAllowedBrands)
    }
    
    const { data: prevData, error: prevError } = await prevQuery
    
    if (prevError) {
      console.error('❌ Error fetching previous month data:', prevError)
      return new Set<string>()
    }
    
    // Extract unique userkeys yang main bulan lalu
    const prevMonthUsers = new Set<string>(prevData?.map(row => row.userkey) || [])
    console.log(`📊 Previous month (${prevMonth} ${prevYear}) active users:`, prevMonthUsers.size)
    
    return prevMonthUsers
  } catch (error) {
    console.error('❌ Error in fetchPreviousMonthData:', error)
    return new Set<string>()
  }
}

function processCustomerRetentionData(rawData: any[], previousMonthUsers: Set<string>, selectedMonth: string | null, selectedYear: string | null, userMinDates: Map<string, string>) {
  console.log(`🔍 Processing ${rawData.length} raw records for customer retention`)
  
  // Check data structure
  if (rawData.length > 0) {
    console.log(`🔍 Sample record structure:`, Object.keys(rawData[0]))
    console.log(`🔍 Sample deposit_cases value:`, rawData[0].deposit_cases)
  }
  
  // Filter only users with deposit_cases > 0
  const filteredData = rawData.filter(row => row.deposit_cases > 0)
  console.log(`🔍 Filtered ${filteredData.length} records with deposit_cases > 0`)
  
  // Group by userkey (TRUE unique identifier) and aggregate data
  const userGroups = new Map<string, any>()
  
  filteredData.forEach(row => {
    const userKey = row.userkey  // ✅ FIXED: Use userkey instead of unique_code
    
    if (!userGroups.has(userKey)) {
      userGroups.set(userKey, {
        userkey: row.userkey,  // ✅ Store userkey
        line: row.line,  // Will be updated if multiple brands
        user_name: row.user_name,
        unique_code: row.unique_code,
        first_deposit_date: row.first_deposit_date || null,  // Initialize (might be null)
        last_deposit_date: row.date,
        active_days: 0,
        deposit_cases: 0,
        deposit_amount: 0,
        withdraw_cases: 0,
        withdraw_amount: 0,
        bonus: 0,
        net_profit: 0,
        activeDates: new Set(),
        brands: new Set([row.line])  // ✅ Track multiple brands
      })
    }
    
    const userData = userGroups.get(userKey)
    
    // ✅ Track multiple brands for this user
    if (row.line) {
      userData.brands.add(row.line)
    }
    
    // ✅ Update first deposit date (MIN date) - for data consistency
    if (row.first_deposit_date && userData.first_deposit_date) {
      if (new Date(row.first_deposit_date) < new Date(userData.first_deposit_date)) {
        userData.first_deposit_date = row.first_deposit_date
      }
    } else if (row.first_deposit_date && !userData.first_deposit_date) {
      userData.first_deposit_date = row.first_deposit_date
    }
    
    // Update last deposit date (MAX date)
    if (new Date(row.date) > new Date(userData.last_deposit_date)) {
      userData.last_deposit_date = row.date
    }
    
    // Count active days (unique dates with deposit_cases > 0)
    if (row.deposit_cases > 0) {
      userData.activeDates.add(row.date)
    }
    
    // Aggregate all transactions
    userData.deposit_cases += row.deposit_cases || 0
    userData.deposit_amount += row.deposit_amount || 0
    userData.withdraw_cases += row.withdraw_cases || 0
    userData.withdraw_amount += row.withdraw_amount || 0
    userData.bonus += row.bonus || 0
    userData.net_profit += row.net_profit || 0
  })
  
  // ✅ Calculate month-year string for NEW DEPOSITOR check
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December']
  const selectedMonthIndex = selectedMonth ? monthNames.indexOf(selectedMonth) : -1
  
  // ✅ VALIDATION: Only calculate status if specific month is selected
  const canCalculateStatus = selectedMonthIndex !== -1 && selectedYear && selectedYear !== 'ALL'
  
  let selectedYearMonth = ''
  if (canCalculateStatus) {
    const selectedMonthNumber = (selectedMonthIndex + 1).toString().padStart(2, '0')
    selectedYearMonth = `${selectedYear}-${selectedMonthNumber}`
  }
  
  // Convert to array and calculate active_days + status
  const processedData = Array.from(userGroups.values()).map(user => {
    // ✅ FALLBACK: Bila first_deposit_date NULL/kosong, gunakan MIN date dari ALL transactions (regardless of filter)
    if (!user.first_deposit_date || user.first_deposit_date === null || user.first_deposit_date === '') {
      const globalMinDate = userMinDates.get(user.userkey)
      if (globalMinDate) {
        user.first_deposit_date = globalMinDate
        console.log(`🔄 User ${user.userkey}: first_deposit_date NULL → fallback to global MIN date (${globalMinDate})`)
      } else {
        console.warn(`⚠️ User ${user.userkey}: first_deposit_date NULL and no global MIN date found`)
      }
    }
    
    // ✅ Determine status (only if month is specific, not 'ALL')
    let status = 'N/A'
    
    if (canCalculateStatus) {
      // Check if NEW DEPOSITOR (first_deposit_date dalam bulan yang dipilih)
      if (user.first_deposit_date && user.first_deposit_date.startsWith(selectedYearMonth)) {
        status = 'NEW DEPOSITOR'
      }
      // Check if RETENTION (main bulan lalu DAN bulan ini)
      else if (previousMonthUsers.has(user.userkey)) {
        status = 'RETENTION'
      }
      // Otherwise REACTIVATION (tidak main bulan lalu TAPI main bulan ini)
      else {
        status = 'REACTIVATION'
      }
    }
    
    // ✅ Concatenate multiple brands bila user main di banyak brand
    const brandList = Array.from(user.brands).sort().join(', ')
    user.line = brandList
    
    // ✅ Calculate derived metrics
    const active_days = user.activeDates.size
    const atv = user.deposit_cases > 0 ? user.deposit_amount / user.deposit_cases : 0
    const pf = active_days > 0 ? user.deposit_cases / active_days : 0
    const ggr = user.deposit_amount - user.withdraw_amount
    const winrate = user.deposit_amount > 0 ? ggr / user.deposit_amount : 0
    const wd_rate = user.deposit_cases > 0 ? user.withdraw_cases / user.deposit_cases : 0
    
    return {
      ...user,
      active_days,
      atv,  // ✅ NEW: Average Transaction Value
      pf,   // ✅ NEW: Play Frequency
      winrate,  // ✅ NEW: Winrate (GGR / Deposit Amount)
      wd_rate,  // ✅ NEW: Withdrawal Rate
      status,
      activeDates: undefined, // Remove from final data
      brands: undefined // Remove from final data
    }
  })
  
  console.log(`🔍 Processed ${processedData.length} users for customer retention`)
  console.log(`📊 Status distribution:`, {
    retention: processedData.filter(u => u.status === 'RETENTION').length,
    reactivation: processedData.filter(u => u.status === 'REACTIVATION').length,
    new_depositor: processedData.filter(u => u.status === 'NEW DEPOSITOR').length
  })
  
  // Sort by active_days DESC, net_profit DESC
  processedData.sort((a, b) => {
    if (b.active_days !== a.active_days) {
      return b.active_days - a.active_days
    }
    return b.net_profit - a.net_profit
  })
  
  console.log(`🔍 Sample processed data:`, processedData.slice(0, 2))
  
  return processedData
}
