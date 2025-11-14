import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userkey = searchParams.get('userkey')
  const line = searchParams.get('line')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  
  const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
  let userAllowedBrands: string[] | null = null
  try {
    userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null
  } catch (e) {
    console.warn('⚠️ Failed to parse user allowed brands header:', e)
    userAllowedBrands = null
  }

  try {
    console.log('📊 [USC Churn Member] Fetching transaction history for user:', {
      userkey, line, year, month, page, limit
    })

    if (!userkey) {
      return NextResponse.json({
        success: false,
        error: 'userkey is required'
      }, { status: 400 })
    }

    if (!month || month === 'ALL' || !year || year === 'ALL') {
      return NextResponse.json({
        success: false,
        error: 'Month and Year are required for churn member transaction history'
      }, { status: 400 })
    }

    // ✅ Calculate Previous Month (same logic as data endpoint)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthIndex = monthNames.indexOf(month)
    
    if (currentMonthIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Invalid month',
        message: `Invalid month value: "${month}"`
      }, { status: 400 })
    }
    
    let prevMonthIndex = currentMonthIndex - 1
    let prevYear = year
    const yearInt = parseInt(year)
    
    if (prevMonthIndex < 0) {
      prevMonthIndex = 11 // December
      prevYear = (yearInt - 1).toString()
    }
    
    const prevMonth = monthNames[prevMonthIndex]
    const prevYearInt = parseInt(prevYear)
    
    if (isNaN(prevYearInt)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid previous year',
        message: `Invalid previous year value: ${prevYear}`
      }, { status: 400 })
    }

    console.log('📊 [USC Churn Member] Transaction history for previous month:', { prevYear, prevMonth, prevYearInt })

    // Build query for transaction history (from previous month only)
    let query = supabase
      .from('blue_whale_usc')
      .select('date, line, unique_code, first_deposit_date, last_deposit_date, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, net_profit', { count: 'exact' })
      .eq('userkey', userkey)
      .eq('year', prevYearInt)
      .eq('month', prevMonth)
      .gt('deposit_cases', 0) // Only transactions with deposits

    // Apply brand filter
    if (line && line !== 'ALL') {
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      query = query.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      query = query.in('line', userAllowedBrands)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.order('date', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('❌ [USC Churn Member] Supabase query error:', error)
      return NextResponse.json({
        success: false,
        error: 'Database error while fetching transaction history',
        message: error.message
      }, { status: 500 })
    }

    // ✅ Fetch MIN date untuk user ini (fallback untuk first_deposit_date NULL)
    const userMinDate = await fetchUserMinDate(userkey, line, userAllowedBrands)

    // Calculate GGR for each transaction + apply first_deposit_date fallback
    const processedData = (data || []).map((row: any) => {
      // ✅ FALLBACK: Bila first_deposit_date NULL/kosong, gunakan MIN date
      let firstDepositDate = row.first_deposit_date
      if (!firstDepositDate || firstDepositDate === null || firstDepositDate === '') {
        firstDepositDate = userMinDate || null
        if (userMinDate) {
          console.log(`🔄 [USC Churn Member] Transaction ${row.date}: first_deposit_date NULL → fallback to MIN date (${userMinDate})`)
        }
      }
      
      return {
        ...row,
        first_deposit_date: firstDepositDate,
        ggr: row.deposit_amount - row.withdraw_amount
      }
    })

    console.log(`📊 [USC Churn Member] Transaction history found: ${processedData.length} transactions`)

    return NextResponse.json({
      success: true,
      data: processedData,
      pagination: {
        currentPage: page,
        totalRecords: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        recordsPerPage: limit,
        hasNextPage: (page * limit) < (count || 0),
        hasPrevPage: page > 1
      }
    })

  } catch (error: any) {
    console.error('❌ [USC Churn Member] Error fetching transaction history:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching transaction history',
      message: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}

// ✅ Fetch MIN transaction date untuk specific user (fallback untuk first_deposit_date NULL)
async function fetchUserMinDate(userkey: string, line: string | null, userAllowedBrands: string[] | null): Promise<string | null> {
  try {
    console.log(`🔍 [USC Churn Member] Fetching MIN date for user: ${userkey}`)
    
    // Fetch MIN date untuk user ini dari ALL transactions (no month filter)
    let minDateQuery = supabase
      .from('blue_whale_usc')
      .select('date')
      .eq('userkey', userkey)
      .gt('deposit_cases', 0)
      .order('date', { ascending: true })
      .limit(1)
    
    // Apply brand filter
    if (line && line !== 'ALL') {
      minDateQuery = minDateQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      minDateQuery = minDateQuery.in('line', userAllowedBrands)
    }
    
    const { data: minDateData, error: minDateError } = await minDateQuery
    
    if (minDateError) {
      console.error('❌ [USC Churn Member] Error fetching MIN date:', minDateError)
      return null
    }
    
    if (minDateData && minDateData.length > 0) {
      const minDate = minDateData[0].date as string
      console.log(`📊 [USC Churn Member] MIN date found for user ${userkey}: ${minDate}`)
      return minDate
    }
    
    console.log(`⚠️ [USC Churn Member] No MIN date found for user ${userkey}`)
    return null
  } catch (error) {
    console.error('❌ [USC Churn Member] Error in fetchUserMinDate:', error)
    return null
  }
}

