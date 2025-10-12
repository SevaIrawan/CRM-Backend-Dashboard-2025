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

  try {
    console.log('📊 Fetching blue_whale_myr data for customer retention with filters:', { 
      currency, line, year, month, startDate, endDate, filterMode, page, limit 
    })

    // Build base query for filtering - using blue_whale_myr table
    let baseQuery = supabase.from('blue_whale_myr').select('*')

    // No currency filter needed since table is blue_whale_myr

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

    // Get all data first (no pagination for aggregation)
    const result = await baseQuery
      .order('date', { ascending: false })
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (result.error) {
      console.error('❌ Supabase query error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching blue_whale_myr data',
        message: result.error.message 
      }, { status: 500 })
    }

    const rawData = result.data || []
    console.log(`📊 Raw blue_whale_myr records found: ${rawData.length}`)
    console.log(`📊 Sample raw data:`, rawData.slice(0, 3))

    // Process data for customer retention (aggregate per user)
    const processedData = processCustomerRetentionData(rawData)
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
    console.error('❌ Error fetching blue_whale_myr customer retention data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching blue_whale_myr customer retention data' 
    }, { status: 500 })
  }
}

function processCustomerRetentionData(rawData: any[]) {
  // Filter only users with deposit_cases > 0
  const filteredData = rawData.filter(row => row.deposit_cases > 0)
  
  // Group by userkey (unique_code) and aggregate data
  const userGroups = new Map<string, any>()
  
  filteredData.forEach(row => {
    const userKey = row.unique_code
    
    if (!userGroups.has(userKey)) {
      userGroups.set(userKey, {
        user_name: row.user_name,
        unique_code: row.unique_code,
        last_deposit_date: row.date,
        activeDates: new Set(),
        deposit_cases: 0,
        deposit_amount: 0,
        withdraw_cases: 0,
        withdraw_amount: 0,
        bonus: 0,
        net_profit: 0
      })
    }
    
    const userData = userGroups.get(userKey)
    
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
  
  // Convert to array and calculate active_days - only include retention columns
  const processedData = Array.from(userGroups.values()).map(user => ({
    user_name: user.user_name,
    unique_code: user.unique_code,
    last_deposit_date: user.last_deposit_date,
    active_days: user.activeDates.size,
    deposit_cases: user.deposit_cases,
    deposit_amount: user.deposit_amount,
    withdraw_cases: user.withdraw_cases,
    withdraw_amount: user.withdraw_amount,
    bonus: user.bonus,
    net_profit: user.net_profit
  }))
  
  // Sort by active_days DESC, net_profit DESC
  processedData.sort((a, b) => {
    if (b.active_days !== a.active_days) {
      return b.active_days - a.active_days
    }
    return b.net_profit - a.net_profit
  })
  
  return processedData
}
