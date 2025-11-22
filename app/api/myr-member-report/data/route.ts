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
    console.log('📊 Fetching blue_whale_myr data with filters:', { 
      currency, line, year, month, startDate, endDate, filterMode, page, limit,
      user_allowed_brands: userAllowedBrands,
      is_squad_lead: userAllowedBrands !== null && userAllowedBrands.length > 0
    })

    // ✅ Check if using date range or month mode
    const isDateRangeMode = filterMode === 'daterange' && startDate && endDate
    const isMonthMode = filterMode === 'month' // ✅ MONTH mode (ALL or specific) → ALWAYS AGGREGATED
    
    // ✅ Check if date range is single day (per-daily mode) - ONLY when date range is 1 day
    const isSingleDayMode = isDateRangeMode && startDate === endDate

    // ✅ AGGREGATED MODE: 
    // - Date range multi-day
    // - Month mode (ALL or specific) → ALWAYS aggregate all transactions per userkey
    // ✅ PER-DAILY MODE: ONLY when date range is exactly 1 day
    if (!isSingleDayMode && (isDateRangeMode || isMonthMode)) {
      // ✅ AGGREGATED MODE: GROUP BY user, SUM all metrics
      console.log('📊 [AGGREGATED MODE] Filter mode:', filterMode, isDateRangeMode ? 'date range' : 'monthly')
      
      // Build filter for raw data fetch
      let query = supabase
        .from('blue_whale_myr')
        .select('*')
      
      // ✅ Apply date/month filter based on mode - SAME AS CUSTOMER RETENTION
      if (isDateRangeMode) {
        query = query
          .filter('date', 'gte', startDate)
          .filter('date', 'lte', endDate)
      }
      // ✅ For month mode: only filter if month is specified (not ALL)
      // KALAU MONTH ALL → tidak filter by month (tampilkan semua data)
      if (filterMode === 'month' && month && month !== 'ALL') {
        query = query.filter('month', 'eq', month)
      }
      // ✅ When month=ALL, aggregate ALL data (no month filter)
      
      // ✅ Apply brand filter with user permission check
      // KALAU LINE ALL → tampilkan semua data tanpa filter LINE (kecuali Squad Lead)
      if (line && line !== 'ALL') {
        if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
          return NextResponse.json({
            success: false,
            error: 'Unauthorized',
            message: `You do not have access to brand "${line}"`
          }, { status: 403 })
        }
        query = query.filter('line', 'eq', line)
      } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
        // Squad Lead dengan LINE ALL → filter by allowed_brands
        query = query.in('line', userAllowedBrands)
      }
      // ✅ LINE ALL untuk Admin → tidak ada filter line (tampilkan semua)

      // ✅ KALAU MONTH ALL → tetap filter by YEAR jika year aktif
      // KALAU LINE ALL DAN MONTH ALL → tampilkan semua data berdasarkan YEAR aktif
      if (year && year !== 'ALL') {
        query = query.filter('year', 'eq', parseInt(year))
      }
      
      // Fetch ALL data for aggregation (no limit - get all records)
      console.log('📊 [AGGREGATED MODE] Executing query with filters:', {
        line: line || 'ALL (no filter)',
        year: year || 'ALL (no filter)',
        month: month || 'ALL (no filter)',
        filterMode,
        isDateRangeMode,
        isMonthMode,
        userAllowedBrands: userAllowedBrands ? userAllowedBrands.length + ' brands' : 'Admin (all brands)',
        query_has_filters: !!(line && line !== 'ALL') || !!(year && year !== 'ALL') || !!(month && month !== 'ALL')
      })
      
      // ✅ Fetch ALL data without limit - use batch fetching (same as export route)
      let allData: any[] = []
      let batchOffset = 0
      const batchSize = 5000 // Process 5000 records at a time
      let hasMoreData = true
      
      console.log('📊 [AGGREGATED MODE] Fetching all data in batches (no limit)...')
      
      while (hasMoreData) {
        // Build new query for each batch with same filters
        let batchQuery = supabase
          .from('blue_whale_myr')
          .select('*')
        
        // Re-apply all filters for this batch
        if (isDateRangeMode) {
          batchQuery = batchQuery
            .filter('date', 'gte', startDate)
            .filter('date', 'lte', endDate)
        }
        if (filterMode === 'month' && month && month !== 'ALL') {
          batchQuery = batchQuery.filter('month', 'eq', month)
        }
        if (line && line !== 'ALL') {
          if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
            return NextResponse.json({
              success: false,
              error: 'Unauthorized',
              message: `You do not have access to brand "${line}"`
            }, { status: 403 })
          }
          batchQuery = batchQuery.filter('line', 'eq', line)
        } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
          batchQuery = batchQuery.in('line', userAllowedBrands)
        }
        if (year && year !== 'ALL') {
          batchQuery = batchQuery.filter('year', 'eq', parseInt(year))
        }
        
        // Execute batch query
        const batchResult = await batchQuery
          .order('date', { ascending: false })
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .range(batchOffset, batchOffset + batchSize - 1)
        
        if (batchResult.error) {
          console.error('❌ Supabase batch query error:', batchResult.error)
          return NextResponse.json({ 
            success: false, 
            error: 'Database error while fetching blue_whale_myr data',
            message: batchResult.error.message 
          }, { status: 500 })
        }
        
        const batchData = batchResult.data || []
        allData = [...allData, ...batchData]
        
        const batchNumber = Math.floor(batchOffset / batchSize) + 1
        console.log(`📊 [AGGREGATED MODE] Batch ${batchNumber}: ${batchData.length} records (Total: ${allData.length})`)
        
        // Check if there's more data
        hasMoreData = batchData.length === batchSize
        batchOffset += batchSize
        
        // Log sample data from first batch to verify structure
        if (batchNumber === 1 && batchData.length > 0) {
          console.log(`📊 [AGGREGATED MODE] Sample from first batch:`, {
            userkey: batchData[0]?.userkey,
            date: batchData[0]?.date,
            deposit_cases: batchData[0]?.deposit_cases,
            total_unique_dates_in_batch: new Set(batchData.map((r: any) => r.date)).size
          })
        }
        
        // Safety limit to prevent infinite loops (but allow large datasets)
        if (allData.length > 1000000) {
          console.log('⚠️ [AGGREGATED MODE] Safety limit reached: 1,000,000 records')
          break
        }
      }
      
      console.log(`📊 [AGGREGATED MODE] Total records fetched: ${allData.length}`)
      
      const rawData = allData
      console.log(`📊 Raw blue_whale_myr records found: ${rawData.length}`)
      
      if (rawData.length === 0) {
        console.warn('⚠️ [AGGREGATED MODE] No data found with current filters!')
        console.warn('⚠️ Filters applied:', {
          line: line || 'ALL',
          year: year || 'ALL',
          month: month || 'ALL',
          filterMode
        })
      } else {
        console.log(`📊 Sample raw data (first 3 records):`, rawData.slice(0, 3))
      }
      
      // ✅ GROUP BY userkey and aggregate
      const userMap = new Map<string, any>()
      
      rawData?.forEach((row: any) => {
        const key = row.userkey
        
        if (!userMap.has(key)) {
          // Initialize user record
          // ✅ Set date_range based on mode
          const dateRangeValue = isDateRangeMode 
            ? `${startDate} to ${endDate}`
            : (month && month !== 'ALL')
            ? `Month: ${month} ${year !== 'ALL' ? year : ''}`.trim()
            : (year && year !== 'ALL')
            ? `Year: ${year}`
            : 'All Time'
          
          userMap.set(key, {
            userkey: key,
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
            activeDates: new Set(), // ✅ Track unique dates with deposit_cases > 0
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
        
        // ✅ COUNT Days Active (unique dates where deposit_cases > 0) - SAME AS CUSTOMER RETENTION
        if ((row.deposit_cases || 0) > 0 && row.date) {
          userRecord.activeDates.add(row.date)
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
      
      // Convert Map to Array and calculate days_active from activeDates
      const aggregatedData = Array.from(userMap.values()).map((user: any) => {
        // ✅ Calculate days_active from unique dates (SAME AS CUSTOMER RETENTION)
        const daysActive = user.activeDates ? user.activeDates.size : 0
        return {
          ...user,
          days_active: daysActive,
          activeDates: undefined // Remove from final data
        }
      })
      
      console.log('📊 Aggregated data:', aggregatedData.length, 'unique users')
      
      // ✅ Calculate ATV and PF for each row
      const enrichedData = aggregatedData.map(row => {
        const depositAmount = row.deposit_amount || 0
        const depositCases = row.deposit_cases || 0
        const daysActive = row.days_active || 0
        
        // ATV = Average Transaction Value = deposit_amount / deposit_cases
        const atv = depositCases > 0 ? depositAmount / depositCases : 0
        
        // PF = Purchase Frequency = deposit_cases / days_active
        const pf = daysActive > 0 ? depositCases / daysActive : 0
        
        return {
          ...row,
          atv,
          pf
        }
      })
      
      // ✅ Sort by Line (ascending) and Days Active (descending)
      enrichedData.sort((a, b) => {
        // First sort by line (ascending)
        if (a.line !== b.line) {
          return (a.line || '').localeCompare(b.line || '')
        }
        // Then sort by days_active (descending - more active first)
        return (b.days_active || 0) - (a.days_active || 0)
      })
      
      // ✅ Apply pagination to aggregated data
      const totalRecords = enrichedData.length
      const totalPages = Math.ceil(totalRecords / limit)
      const offset = (page - 1) * limit
      const paginatedData = enrichedData.slice(offset, offset + limit)
      
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

    // ✅ PER-DAILY MODE: ONLY when date range is exactly 1 day
    console.log('📊 [PER-DAILY MODE] Fetching per-daily data (single day date range only)...')
    
    // Build base query for filtering - using blue_whale_myr table
    let baseQuery = supabase.from('blue_whale_myr').select('userkey, user_name, unique_code, date, line, year, month, vip_level, operator, traffic, register_date, first_deposit_date, first_deposit_amount, last_deposit_date, days_inactive, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, add_bonus, deduct_bonus, add_transaction, deduct_transaction, cases_adjustment, cases_bets, bets_amount, valid_amount, ggr, net_profit, last_activity_days')

    // No currency filter needed since table is blue_whale_myr

    // ✅ NEW: Apply brand filter with user permission check
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
    let countQuery = supabase.from('blue_whale_myr').select('*', { count: 'exact', head: true })
    
    // Apply same filters to count query (no currency filter needed)
    // ✅ NEW: Apply brand filter with user permission check
    if (line && line !== 'ALL') {
      // Validate Squad Lead access (same check as baseQuery)
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      countQuery = countQuery.filter('line', 'eq', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      countQuery = countQuery.in('line', userAllowedBrands)
    }
    if (year && year !== 'ALL') {
      countQuery = countQuery.filter('year', 'eq', parseInt(year))
    }
    if (filterMode === 'month' && month && month !== 'ALL') {
      countQuery = countQuery.filter('month', 'eq', month)
    }
    
    const countResult = await countQuery
    const totalRecords = countResult.count || 0

    console.log(`📊 Total blue_whale_myr records found: ${totalRecords}`)

    // Get data with pagination and sorting - SAME AS MYR/SGD
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
        error: 'Database error while fetching blue_whale_myr data',
        message: result.error.message 
      }, { status: 500 })
    }

    const totalPages = Math.ceil(totalRecords / limit)
    console.log(`✅ Found ${result.data?.length || 0} blue_whale_myr records (Page ${page} of ${totalPages})`)

    // ✅ Calculate ATV and PF for each row (per-daily mode)
    const enrichedData = (result.data || []).map((row: any) => {
      const depositAmount = row.deposit_amount || 0
      const depositCases = row.deposit_cases || 0
      // For per-daily mode, days_active = 1 if deposit_cases > 0, else 0
      const daysActive = depositCases > 0 ? 1 : 0
      
      // ATV = Average Transaction Value = deposit_amount / deposit_cases
      const atv = depositCases > 0 ? depositAmount / depositCases : 0
      
      // PF = Purchase Frequency = deposit_cases / days_active
      const pf = daysActive > 0 ? depositCases / daysActive : 0
      
      return {
        ...row,
        days_active: daysActive,
        atv,
        pf
      }
    })
    
    return NextResponse.json({
      success: true,
      data: enrichedData,
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
    console.error('❌ Error fetching blue_whale_myr data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching blue_whale_myr data' 
    }, { status: 500 })
  }
}
