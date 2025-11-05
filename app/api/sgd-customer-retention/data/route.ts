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

  // ✅ Get user's allowed brands from request header
  const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
  const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

  try {
    console.log('📊 Fetching blue_whale_sgd data for customer retention with filters:', { 
      currency, line, year, month, startDate, endDate, filterMode, page, limit,
      user_allowed_brands: userAllowedBrands
    })

    // Build base query for filtering - using blue_whale_sgd table
    let baseQuery = supabase.from('blue_whale_sgd').select('userkey, user_name, unique_code, date, line, year, month, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, net_profit')

    // No currency filter needed since table is blue_whale_sgd

    // ✅ Apply brand filter with user permission check
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
        error: 'Database error while fetching blue_whale_sgd data',
        message: result.error.message 
      }, { status: 500 })
    }

    const rawData = result.data || []
    console.log(`📊 Raw blue_whale_sgd records found: ${rawData.length}`)
    console.log(`📊 Sample raw data:`, rawData.slice(0, 3))

    // Process data for customer retention
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
    console.error('❌ Error fetching blue_whale_sgd customer retention data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching blue_whale_sgd customer retention data' 
    }, { status: 500 })
  }
}

function processCustomerRetentionData(rawData: any[]) {
  console.log(`🔍 Processing ${rawData.length} raw records for customer retention`)
  
  // Check data structure
  if (rawData.length > 0) {
    console.log(`🔍 Sample record structure:`, Object.keys(rawData[0]))
    console.log(`🔍 Sample deposit_cases value:`, rawData[0].deposit_cases)
  }
  
  // Filter only users with deposit_cases > 0
  const filteredData = rawData.filter(row => row.deposit_cases > 0)
  console.log(`🔍 Filtered ${filteredData.length} records with deposit_cases > 0`)
  
  // Group by userkey (unique_code) and aggregate data
  const userGroups = new Map<string, any>()
  
  filteredData.forEach(row => {
    const userKey = row.unique_code
    
    if (!userGroups.has(userKey)) {
      userGroups.set(userKey, {
        user_name: row.user_name,
        unique_code: row.unique_code,
        last_deposit_date: row.date,
        active_days: 0,
        deposit_cases: 0,
        deposit_amount: 0,
        withdraw_cases: 0,
        withdraw_amount: 0,
        bonus: 0,
        net_profit: 0,
        activeDates: new Set()
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
  
  // Convert to array and calculate active_days
  const processedData = Array.from(userGroups.values()).map(user => ({
    ...user,
    active_days: user.activeDates.size,
    activeDates: undefined // Remove from final data
  }))
  
  console.log(`🔍 Processed ${processedData.length} users for customer retention`)
  
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
