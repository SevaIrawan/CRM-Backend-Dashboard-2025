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
    console.log('📊 Fetching blue_whale_sgd data with filters:', { 
      currency, line, year, month, startDate, endDate, filterMode, page, limit,
      user_allowed_brands: userAllowedBrands,
      is_squad_lead: userAllowedBrands !== null && userAllowedBrands.length > 0
    })

    // ✅ ALWAYS AGGREGATE MODE: GROUP BY user, SUM all metrics (for both month and date range)
    console.log('📊 [AGGREGATED MODE] Grouping by user...')
    
    // ✅ Check if using date range or month mode
    const isDateRangeMode = filterMode === 'daterange' && startDate && endDate
    const isMonthMode = filterMode === 'month' && month && month !== 'ALL'

    if (isDateRangeMode || isMonthMode) {
      // ✅ AGGREGATED MODE: GROUP BY user, SUM all metrics
      console.log('📊 [AGGREGATED MODE] Filter mode:', filterMode, isDateRangeMode ? 'date range' : 'monthly')
      
      // Build filter for raw data fetch
      let query = supabase
        .from('blue_whale_sgd')
        .select('*')
      
      // ✅ Apply date/month filter based on mode
      if (isDateRangeMode) {
        query = query.gte('date', startDate).lte('date', endDate)
      } else if (isMonthMode) {
        query = query.eq('month', month)
      }
      
      // ✅ Apply brand filter with user permission check
      if (line && line !== 'ALL') {
        // Validate Squad Lead access
        if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
          return NextResponse.json({
            success: false,
            error: 'Unauthorized',
            message: `You do not have access to brand "${line}"`
          }, { status: 403 })
        }
        query = query.eq('line', line)
      } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
        // Squad Lead selected 'ALL' (though they shouldn't have this option) - filter to their brands
        query = query.in('line', userAllowedBrands)
      }
      if (year && year !== 'ALL') {
        query = query.eq('year', parseInt(year))
      }
      
      // Fetch ALL data for aggregation
      const { data: rawData, error: rawError } = await query
      
      if (rawError) {
        console.error('❌ Error fetching raw data:', rawError)
        return NextResponse.json({ 
          success: false, 
          error: 'Database error',
          message: rawError.message 
        }, { status: 500 })
      }
      
      console.log('📊 Raw data fetched:', rawData?.length, 'records')
      
      // ✅ GROUP BY userkey and aggregate
      const userMap = new Map<string, any>()
      
      rawData?.forEach((row: any) => {
        const key = row.userkey
        
        if (!userMap.has(key)) {
          // Initialize user record
          // ✅ Set date_range based on mode
          const dateRangeValue = isDateRangeMode 
            ? `${startDate} to ${endDate}`
            : `Month: ${month} ${year !== 'ALL' ? year : ''}`.trim()
          
          userMap.set(key, {
            date_range: dateRangeValue,
            line: row.line,
            user_name: row.user_name,
            unique_code: row.unique_code,
            vip_level: row.vip_level,
            operator: row.operator,
            traffic: row.traffic,
            register_date: row.register_date,
            first_deposit_date: row.first_deposit_date,
            first_deposit_amount: row.first_deposit_amount,
            last_deposit_date: row.last_deposit_date,
            days_inactive: row.days_inactive,
            days_active: 0,
            deposit_cases: 0,
            deposit_amount: 0,
            withdraw_cases: 0,
            withdraw_amount: 0,
            bonus: 0,
            add_bonus: 0,
            deduct_bonus: 0,
            add_transaction: 0,
            deduct_transaction: 0,
            cases_adjustment: 0,
            cases_bets: 0,
            bets_amount: 0,
            valid_amount: 0,
            ggr: 0,
            net_profit: 0,
            last_activity_days: row.last_activity_days
          })
        }
        
        const userRecord = userMap.get(key)
        
        // ✅ COUNT Days Active (days where deposit_cases > 0)
        if ((row.deposit_cases || 0) > 0) {
          userRecord.days_active += 1
        }
        
        // ✅ SUM all numeric metrics
        userRecord.deposit_cases += (row.deposit_cases || 0)
        userRecord.deposit_amount += (row.deposit_amount || 0)
        userRecord.withdraw_cases += (row.withdraw_cases || 0)
        userRecord.withdraw_amount += (row.withdraw_amount || 0)
        userRecord.bonus += (row.bonus || 0)
        userRecord.add_bonus += (row.add_bonus || 0)
        userRecord.deduct_bonus += (row.deduct_bonus || 0)
        userRecord.add_transaction += (row.add_transaction || 0)
        userRecord.deduct_transaction += (row.deduct_transaction || 0)
        userRecord.cases_adjustment += (row.cases_adjustment || 0)
        userRecord.cases_bets += (row.cases_bets || 0)
        userRecord.bets_amount += (row.bets_amount || 0)
        userRecord.valid_amount += (row.valid_amount || 0)
        userRecord.ggr += (row.ggr || 0)
        userRecord.net_profit += (row.net_profit || 0)
      })
      
      // Convert Map to Array
      const aggregatedData = Array.from(userMap.values())
      
      console.log('📊 Aggregated data:', aggregatedData.length, 'unique users')
      
      // ✅ Apply pagination to aggregated data
      const totalRecords = aggregatedData.length
      const totalPages = Math.ceil(totalRecords / limit)
      const offset = (page - 1) * limit
      const paginatedData = aggregatedData.slice(offset, offset + limit)
      
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
          currency,
          line,
          year,
          month,
          startDate,
          endDate,
          filterMode
        },
        aggregated: true
      })
    }

    // ✅ ORIGINAL MODE: Per-daily data (for monthly mode)
    console.log('📊 [PER-DAILY MODE] Fetching per-daily data...')
    
    // Build base query for filtering - using blue_whale_sgd table
    let baseQuery = supabase.from('blue_whale_sgd').select('userkey, user_name, unique_code, date, line, year, month, vip_level, operator, traffic, register_date, first_deposit_date, first_deposit_amount, last_deposit_date, days_inactive, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, add_bonus, deduct_bonus, add_transaction, deduct_transaction, cases_adjustment, cases_bets, bets_amount, valid_amount, ggr, net_profit, last_activity_days')

    // No currency filter needed since table is blue_whale_sgd

    // ✅ Apply brand filter with user permission check
    if (line && line !== 'ALL') {
      // Validate Squad Lead access
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      baseQuery = baseQuery.filter('line', 'eq', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      // Squad Lead selected 'ALL' (though they shouldn't have this option) - filter to their brands
      baseQuery = baseQuery.in('line', userAllowedBrands)
    }

    if (year && year !== 'ALL') {
      baseQuery = baseQuery.filter('year', 'eq', parseInt(year))
    }

    // Handle month filtering (date range already handled above in aggregated mode)
    if (filterMode === 'month' && month && month !== 'ALL') {
      baseQuery = baseQuery.filter('month', 'eq', month)
    }

    // Get total count first (separate query) - Build count query with same filters
    let countQuery = supabase.from('blue_whale_sgd').select('*', { count: 'exact', head: true })
    
    // Apply same filters to count query (no currency filter needed)
    if (line && line !== 'ALL') {
      countQuery = countQuery.filter('line', 'eq', line)
    }
    if (year && year !== 'ALL') {
      countQuery = countQuery.filter('year', 'eq', parseInt(year))
    }
    if (filterMode === 'month' && month && month !== 'ALL') {
      countQuery = countQuery.filter('month', 'eq', month)
    }
    
    const countResult = await countQuery
    const totalRecords = countResult.count || 0

    console.log(`📊 Total blue_whale_sgd records found: ${totalRecords}`)

    // Get data with pagination and sorting
    const offset = (page - 1) * limit
    const result = await baseQuery
      .order('date', { ascending: false })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .range(offset, offset + limit - 1)

    if (result.error) {
      console.error('❌ Supabase query error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching blue_whale_sgd data',
        message: result.error.message 
      }, { status: 500 })
    }

    const totalPages = Math.ceil(totalRecords / limit)
    console.log(`✅ Found ${result.data?.length || 0} blue_whale_sgd records (Page ${page} of ${totalPages})`)

    return NextResponse.json({
      success: true,
      data: result.data || [],
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
      },
      aggregated: false
    })

  } catch (error) {
    console.error('❌ Error fetching blue_whale_sgd data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching blue_whale_sgd data' 
    }, { status: 500 })
  }
}