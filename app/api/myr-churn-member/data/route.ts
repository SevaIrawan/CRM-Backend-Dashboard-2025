import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const line = searchParams.get('line')
  const year = searchParams.get('year')?.trim() || ''
  const month = searchParams.get('month')?.trim() || ''
  const statusFilter = searchParams.get('statusFilter') || 'ALL'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')
  
  console.log('📊 [MYR Churn Member] Raw params:', { line, year, month, page, limit, yearType: typeof year, monthType: typeof month })

  // ✅ Get user's allowed brands from request header
  const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
  let userAllowedBrands: string[] | null = null
  try {
    userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null
  } catch (e) {
    console.warn('⚠️ Failed to parse user allowed brands header:', e)
    userAllowedBrands = null
  }

  try {
    // ✅ SIMPLE VALIDATION: Only check if year/month are 'ALL' (ambiguous)
    if (!month || month === 'ALL' || !year || year === 'ALL') {
      console.error('❌ [MYR Churn Member] ERROR 400: Year and Month must be specific (not ALL)')
      return NextResponse.json({
        success: false,
        error: 'Year and Month are required',
        message: 'Please select specific Year and Month to calculate churn members. Year and Month cannot be "ALL".'
      }, { status: 400 })
    }

    console.log('📊 [MYR Churn Member] Calculating churn members:', { line, year, month })
    
    const yearInt = parseInt(year)
    
    if (isNaN(yearInt)) {
      console.error('❌ [MYR Churn Member] ERROR 400: Invalid year format')
      return NextResponse.json({
        success: false,
        error: 'Invalid year',
        message: `Invalid year value: ${year}`
      }, { status: 400 })
    }

    // ✅ STEP 1: Calculate Previous Month (handle year rollover) - FOLLOW CUSTOMER RETENTION PATTERN
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthIndex = monthNames.indexOf(month)
    
    if (currentMonthIndex === -1) {
      console.error('❌ [MYR Churn Member] ERROR 400: Invalid month')
      return NextResponse.json({
        success: false,
        error: 'Invalid month',
        message: `Invalid month value: "${month}". Valid months: January, February, March, April, May, June, July, August, September, October, November, December`
      }, { status: 400 })
    }
    
    let prevMonthIndex = currentMonthIndex - 1
    let prevYear = year
    
    if (prevMonthIndex < 0) {
      // Previous month is in previous year
      prevMonthIndex = 11 // December
      prevYear = (yearInt - 1).toString()
    }
    
    const prevMonth = monthNames[prevMonthIndex]
    const prevYearInt = parseInt(prevYear)
    
    if (isNaN(prevYearInt)) {
      console.error('❌ [MYR Churn Member] ERROR 400: Invalid previous year')
      return NextResponse.json({
        success: false,
        error: 'Invalid previous year',
        message: `Invalid previous year value: ${prevYear}`
      }, { status: 400 })
    }
    
    console.log('📊 [MYR Churn Member] Previous month calculated:', { prevYear, prevMonth, prevYearInt })
    console.log('📊 [MYR Churn Member] Filters:', { line, year, month, userAllowedBrands: userAllowedBrands?.length || 0 })

    // ✅ STEP 2: Get Previous Month Active Users (deposit_cases > 0) - SIMPLE LOGIC
    let prevQuery = supabase
      .from('blue_whale_myr')
      .select('userkey')
      .eq('year', prevYearInt)
      .eq('month', prevMonth)
      .gt('deposit_cases', 0)

    // Apply brand filter with user permission check
    if (line && line !== 'ALL') {
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      prevQuery = prevQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      prevQuery = prevQuery.in('line', userAllowedBrands)
    }
    // If line === 'ALL' and no userAllowedBrands (Admin), no line filter = get all data

    const { data: prevData, error: prevError } = await prevQuery.range(0, 999999) // ✅ Fetch all data

    if (prevError) {
      console.error('❌ Error fetching previous month active users:', prevError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: prevError.message
      }, { status: 500 })
    }

    console.log(`📊 [MYR Churn Member] Previous month (${prevMonth} ${prevYearInt}) active users found:`, prevData?.length || 0)

    // ✅ STEP 3: Get Current Month Active Users (deposit_cases > 0) - SIMPLE LOGIC
    let currentQuery = supabase
      .from('blue_whale_myr')
      .select('userkey')
      .eq('year', yearInt)
      .eq('month', month)
      .gt('deposit_cases', 0)

    // Apply brand filter with user permission check
    if (line && line !== 'ALL') {
      currentQuery = currentQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      currentQuery = currentQuery.in('line', userAllowedBrands)
    }
    // If line === 'ALL' and no userAllowedBrands (Admin), no line filter = get all data

    const { data: currentData, error: currentError } = await currentQuery.range(0, 999999) // ✅ Fetch all data

    if (currentError) {
      console.error('❌ Error fetching current month active users:', currentError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: currentError.message
      }, { status: 500 })
    }

    console.log(`📊 [MYR Churn Member] Current month (${month} ${yearInt}) active users found:`, currentData?.length || 0)

    // ✅ STEP 4: Calculate Churned Users
    // Churn = prevActiveUserKeys yang TIDAK ada di currentActiveUserKeys
    const prevUserKeys = new Set(prevData?.map(row => row.userkey).filter(Boolean) || [])
    const currentUserKeys = new Set(currentData?.map(row => row.userkey).filter(Boolean) || [])
    const churnedUserKeys = Array.from(prevUserKeys).filter(userkey => !currentUserKeys.has(userkey))

    console.log('📊 [MYR Churn Member] Churn calculation:', {
      prevMonthActiveUsers: prevUserKeys.size,
      currentMonthActiveUsers: currentUserKeys.size,
      churnedUsers: churnedUserKeys.length
    })

    // ✅ STEP 5: If no churned users, return empty
    if (churnedUserKeys.length === 0) {
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

    // ✅ STEP 6: Fetch Full Details untuk Churned Users dari Previous Month
    // ✅ IKUTI PATTERN CUSTOMER RETENTION: Fetch semua data dari previous month, lalu filter di memory
    // Ini lebih reliable daripada .in('userkey') yang bisa cause "Bad Request" dengan array besar
    let detailQuery = supabase
      .from('blue_whale_myr')
      .select('*')
      .eq('year', prevYearInt)
      .eq('month', prevMonth)
      .gt('deposit_cases', 0) // ✅ Only users yang active (deposit_cases > 0)

    // Apply brand filter
    if (line && line !== 'ALL') {
      detailQuery = detailQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      detailQuery = detailQuery.in('line', userAllowedBrands)
    }
    // If line === 'ALL' and no userAllowedBrands (Admin), no line filter = get all data

    const { data: allPrevMonthData, error: detailError } = await detailQuery.range(0, 999999) // ✅ Fetch all data

    if (detailError) {
      console.error('❌ Error fetching previous month data:', detailError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: detailError.message
      }, { status: 500 })
    }

    // ✅ Filter di memory: hanya ambil data untuk churned users
    const churnedUserKeysSet = new Set(churnedUserKeys)
    const detailData = (allPrevMonthData || []).filter((row: any) => 
      churnedUserKeysSet.has(row.userkey)
    )
    console.log(`📊 Raw churn member records found: ${detailData?.length || 0}`)

    // ✅ STEP 6.5: Fetch MIN dates untuk users dengan first_deposit_date NULL (like Customer Retention)
    const userMinDates = await fetchUserMinDates(detailData, line, userAllowedBrands)

    // ✅ STEP 7: Aggregate by userkey (GROUP BY userkey, SUM metrics)
    const userMap = new Map<string, any>()

    if (!detailData || detailData.length === 0) {
      console.warn('⚠️ No detail data found for churned users')
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

    detailData.forEach((row: any) => {
      if (!row || !row.userkey) return // Skip invalid rows
      
      const key = String(row.userkey)

      if (!userMap.has(key)) {
        // Initialize user record with first occurrence data
        userMap.set(key, {
          userkey: row.userkey, // ✅ Store userkey for modal drill-out
          unique_code: row.unique_code || null,
          user_name: row.user_name || null,
          line: row.line || null,
          traffic: row.traffic || null,
          first_deposit_date: row.first_deposit_date || null,
          last_deposit_date: row.last_deposit_date || null,
          days_active: 0,
          deposit_cases: 0,
          deposit_amount: 0,
          withdraw_cases: 0,
          withdraw_amount: 0,
          net_profit: 0
        })
      }

      const userRecord = userMap.get(key)
      if (!userRecord) return // Safety check

      // ✅ COUNT Days Active (days where deposit_cases > 0)
      if ((row.deposit_cases || 0) > 0) {
        userRecord.days_active += 1
      }

      // ✅ SUM all numeric metrics
      userRecord.deposit_cases += (row.deposit_cases || 0)
      userRecord.deposit_amount += (row.deposit_amount || 0)
      userRecord.withdraw_cases += (row.withdraw_cases || 0)
      userRecord.withdraw_amount += (row.withdraw_amount || 0)
      userRecord.net_profit += (row.net_profit || 0)

      // Update first_deposit_date to earliest (MIN date)
      if (row.first_deposit_date) {
        if (!userRecord.first_deposit_date) {
          userRecord.first_deposit_date = row.first_deposit_date
        } else if (new Date(row.first_deposit_date) < new Date(userRecord.first_deposit_date)) {
          userRecord.first_deposit_date = row.first_deposit_date
        }
      }

      // Update last_deposit_date to latest
      if (row.last_deposit_date && (!userRecord.last_deposit_date || row.last_deposit_date > userRecord.last_deposit_date)) {
        userRecord.last_deposit_date = row.last_deposit_date
      }
    })

    // ✅ STEP 8: Apply fallback MIN date untuk users dengan first_deposit_date NULL (like Customer Retention)
    userMap.forEach((user, userkey) => {
      if (!user.first_deposit_date || user.first_deposit_date === null || user.first_deposit_date === '') {
        const globalMinDate = userMinDates.get(userkey)
        if (globalMinDate) {
          user.first_deposit_date = globalMinDate
          console.log(`🔄 User ${userkey}: first_deposit_date NULL → fallback to global MIN date (${globalMinDate})`)
        }
      }
    })

    // ✅ STEP 9: Calculate days_inactive and STATUS
    const currentDate = new Date()
    
    // Calculate prev month year-month string for STATUS (e.g., "2025-10" for October 2025)
    // Use prevMonthIndex from line 64 (already calculated)
    const prevMonthNumber = (prevMonthIndex + 1).toString().padStart(2, '0')
    const prevYearMonth = `${prevYearInt}-${prevMonthNumber}`
    
    const aggregatedData = Array.from(userMap.values()).map((user: any) => {
      let daysInactive = 0
      try {
        if (user.last_deposit_date) {
          const lastDepositDate = new Date(user.last_deposit_date)
          if (!isNaN(lastDepositDate.getTime())) {
            const diffTime = currentDate.getTime() - lastDepositDate.getTime()
            daysInactive = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          }
        }
      } catch (e) {
        console.warn('⚠️ Error calculating days_inactive for user:', e)
      }

      // ✅ Calculate STATUS: NEW MEMBER or OLD MEMBER
      let status = 'OLD MEMBER' // Default
      if (user.first_deposit_date) {
        // Check if first_deposit_date dalam prev month
        if (user.first_deposit_date.startsWith(prevYearMonth)) {
          status = 'NEW MEMBER'
        }
      }

      // ✅ Calculate ATV (Average Transaction Value) = deposit_amount / deposit_cases
      // Churned members PASTI punya deposit_cases > 0 (karena aktif di previous month)
      const atv = user.deposit_cases > 0 ? user.deposit_amount / user.deposit_cases : 0

      // ✅ Calculate PF (Play Frequency) = deposit_cases / days_active
      // Churned members PASTI punya days_active > 0 (karena aktif di previous month)
      const pf = user.days_active > 0 ? user.deposit_cases / user.days_active : 0

      return {
        ...user,
        days_inactive: daysInactive,
        status: status,
        atv: atv,
        pf: pf
      }
    })

    // ✅ STEP 9.5: Apply Status Filter
    const filteredData = statusFilter === 'ALL' 
      ? aggregatedData 
      : aggregatedData.filter(user => user.status === statusFilter)
    
    console.log(`📊 After status filter (${statusFilter}): ${filteredData.length} users`)

    // ✅ STEP 10: Apply Pagination
    const totalRecords = filteredData.length
    const totalPages = Math.ceil(totalRecords / limit)
    const offset = (page - 1) * limit
    const paginatedData = filteredData.slice(offset, offset + limit)

    console.log(`✅ Processed ${paginatedData.length} churn member records (Page ${page} of ${totalPages})`)

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
      },
      filters: {
        line,
        year,
        month,
        prevYear,
        prevMonth
      }
    })

  } catch (error: any) {
    console.error('❌ Error calculating MYR churn members:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while calculating churn members',
      message: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}

// ✅ Fetch MIN transaction dates untuk users dengan first_deposit_date NULL (like Customer Retention)
async function fetchUserMinDates(rawData: any[], line: string | null, userAllowedBrands: string[] | null): Promise<Map<string, string>> {
  try {
    // Find users dengan first_deposit_date NULL
    const usersWithNullFirstDeposit = rawData
      .filter((row: any) => !row.first_deposit_date || row.first_deposit_date === null || row.first_deposit_date === '')
      .map((row: any) => row.userkey)
    
    const uniqueUsers = Array.from(new Set(usersWithNullFirstDeposit))
    
    if (uniqueUsers.length === 0) {
      console.log('✅ [MYR Churn Member] All users have valid first_deposit_date, no MIN date fetch needed')
      return new Map()
    }
    
    console.log(`🔍 [MYR Churn Member] Fetching MIN dates for ${uniqueUsers.length} users with NULL first_deposit_date`)
    
    // Fetch MIN date untuk each user dari ALL transactions (no month filter)
    let minDateQuery = supabase
      .from('blue_whale_myr')
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
      console.error('❌ [MYR Churn Member] Error fetching MIN dates:', minDateError)
      return new Map()
    }
    
    // Build Map: userkey -> MIN date
    const userMinDateMap = new Map<string, string>()
    minDateData?.forEach((row: any) => {
      if (!userMinDateMap.has(row.userkey)) {
        userMinDateMap.set(row.userkey, row.date)
      }
    })
    
    console.log(`📊 [MYR Churn Member] Fetched MIN dates for ${userMinDateMap.size} users`)
    
    return userMinDateMap
  } catch (error) {
    console.error('❌ [MYR Churn Member] Error in fetchUserMinDates:', error)
    return new Map()
  }
}
