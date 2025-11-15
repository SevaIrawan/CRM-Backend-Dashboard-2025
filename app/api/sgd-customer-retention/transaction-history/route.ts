import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userkey = searchParams.get('userkey')
  const line = searchParams.get('line')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const filterMode = searchParams.get('filterMode') || 'month'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  
  const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
  const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

  try {
    console.log('📊 Fetching transaction history for user:', {
      userkey, line, year, month, startDate, endDate, filterMode, page, limit
    })

    if (!userkey) {
      return NextResponse.json({
        success: false,
        error: 'userkey is required'
      }, { status: 400 })
    }

    // Build query for transaction history
    let query = supabase
      .from('blue_whale_sgd')
      .select('date, line, unique_code, first_deposit_date, last_deposit_date, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, net_profit', { count: 'exact' })
      .eq('userkey', userkey)
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

    // Apply filters
    if (year && year !== 'ALL') {
      query = query.eq('year', parseInt(year))
    }

    if (filterMode === 'month' && month && month !== 'ALL') {
      query = query.eq('month', month)
    }

    if (filterMode === 'daterange' && startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.order('date', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('❌ Supabase query error:', error)
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
          console.log(`🔄 Transaction ${row.date}: first_deposit_date NULL → fallback to MIN date (${userMinDate})`)
        }
      }
      
      return {
        ...row,
        first_deposit_date: firstDepositDate,
        ggr: row.deposit_amount - row.withdraw_amount
      }
    })

    console.log(`📊 Transaction history found: ${processedData.length} transactions`)

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

  } catch (error) {
    console.error('❌ Error fetching transaction history:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching transaction history'
    }, { status: 500 })
  }
}

// ✅ Fetch MIN transaction date untuk specific user (fallback untuk first_deposit_date NULL)
async function fetchUserMinDate(userkey: string, line: string | null, userAllowedBrands: string[] | null): Promise<string | null> {
  try {
    console.log(`🔍 Fetching MIN date for user: ${userkey}`)
    
    // Fetch MIN date untuk user ini dari ALL transactions (no month filter)
    let minDateQuery = supabase
      .from('blue_whale_sgd')
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
      console.error('❌ Error fetching MIN date:', minDateError)
      return null
    }
    
    if (minDateData && minDateData.length > 0) {
      const minDate = minDateData[0].date as string
      console.log(`📊 MIN date found for user ${userkey}: ${minDate}`)
      return minDate
    }
    
    console.log(`⚠️ No MIN date found for user ${userkey}`)
    return null
  } catch (error) {
    console.error('❌ Error in fetchUserMinDate:', error)
    return null
  }
}
