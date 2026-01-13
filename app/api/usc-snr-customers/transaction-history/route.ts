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
    console.log('📊 [SNR Customers] Fetching transaction history for user:', {
      userkey, line, year, month, startDate, endDate, filterMode, page, limit,
      snr_account: currentUsername
    })

    if (!userkey) {
      return NextResponse.json({
        success: false,
        error: 'userkey is required'
      }, { status: 400 })
    }

    // Build query - ✅ AUTO-FILTER by snr_account
    let query = supabase
      .from('blue_whale_usc')
      .select('date, line, unique_code, first_deposit_date, last_deposit_date, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, net_profit', { count: 'exact' })
      .eq('userkey', userkey)
      .eq('snr_account', currentUsername) // ✅ AUTO-FILTER by snr_account
      .gt('deposit_cases', 0)

    // Apply brand filter
    if (line && line !== 'ALL') {
      query = query.eq('line', line)
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
    const userMinDate = await fetchUserMinDate(userkey, line, currentUsername)

    // Calculate GGR for each transaction + apply first_deposit_date fallback
    const processedData = (data || []).map((row: any) => {
      let firstDepositDate = row.first_deposit_date
      if (!firstDepositDate || firstDepositDate === null || firstDepositDate === '') {
        firstDepositDate = userMinDate || null
      }
      
      return {
        ...row,
        first_deposit_date: firstDepositDate,
        ggr: row.deposit_amount - row.withdraw_amount
      }
    })

    console.log(`📊 [SNR Customers] Transaction history found: ${processedData.length} transactions`)

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
async function fetchUserMinDate(userkey: string, line: string | null, snrAccount: string): Promise<string | null> {
  try {
    let minDateQuery = supabase
      .from('blue_whale_usc')
      .select('date')
      .eq('userkey', userkey)
      .eq('snr_account', snrAccount) // ✅ AUTO-FILTER by snr_account
      .gt('deposit_cases', 0)
      .order('date', { ascending: true })
      .limit(1)
    
    if (line && line !== 'ALL') {
      minDateQuery = minDateQuery.eq('line', line)
    }
    
    const { data: minDateData, error: minDateError } = await minDateQuery
    
    if (minDateError) {
      return null
    }
    
    if (minDateData && minDateData.length > 0) {
      return minDateData[0].date as string
    }
    
    return null
  } catch (error) {
    return null
  }
}
