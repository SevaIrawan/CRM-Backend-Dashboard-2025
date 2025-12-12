import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { line, year, month, startDate, endDate, filterMode } = await request.json()

    // ✅ NEW: Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    console.log('📥 Exporting blue_whale_sgd data with filters:', { 
      line, year, month, startDate, endDate, filterMode,
      user_allowed_brands: userAllowedBrands
    })

    // Mode detection (mirror data endpoint)
    const isDateRangeMode = filterMode === 'daterange' && startDate && endDate
    const isMonthMode = filterMode === 'month'
    const isSingleDayMode = isDateRangeMode && startDate === endDate

    // Helper to apply filters to a query (EXACT SAME as data endpoint)
    const applyFilters = (q: any) => {
      if (isDateRangeMode) {
        q = q.filter('date', 'gte', startDate).filter('date', 'lte', endDate)
      }
      // ✅ EXACT SAME: filterMode === 'month' (not isMonthMode)
      if (filterMode === 'month' && month && month !== 'ALL') {
        q = q.filter('month', 'eq', month)
      }
      if (line && line !== 'ALL') {
        if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
          return { error: `Unauthorized line ${line}` }
        }
        q = q.filter('line', 'eq', line)
      } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
        q = q.in('line', userAllowedBrands)
      }
      if (year && year !== 'ALL') {
        q = q.filter('year', 'eq', parseInt(year))
      }
      return q
    }

    // Batch fetch all data (no limit) - same optimization as data API
    const batchSize = 10000 // ✅ Increased batch size for better performance
    let allData: any[] = []
    let offset = 0
    let hasMore = true

    console.log('📊 Starting batch export (mirror data logic)...')

    try {
      while (hasMore) {
        const base = supabase
          .from('blue_whale_sgd')
          .select('userkey, user_unique, user_name, unique_code, update_unique_code, date, line, year, month, vip_level, operator, traffic, register_date, first_deposit_date, first_deposit_amount, last_deposit_date, days_inactive, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, add_bonus, deduct_bonus, add_transaction, deduct_transaction, cases_adjustment, cases_bets, bets_amount, valid_amount, ggr, net_profit, last_activity_days')
          .eq('currency', 'SGD')
        const filtered = applyFilters(base)
        if ((filtered as any).error) {
          return NextResponse.json({ error: 'Unauthorized', message: (filtered as any).error }, { status: 403 })
        }
        // ✅ CRITICAL: Use deterministic ordering to ensure consistent batch fetching
        // Without this, rows with same date can be fetched in different order, causing inconsistent results
        const batchQuery = (filtered as any)
          .order('date', { ascending: false })
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .order('user_unique', { ascending: true })
          .order('unique_code', { ascending: true })
          .order('userkey', { ascending: true }) // ✅ Additional tie-breaker for 100% deterministic ordering
          .range(offset, offset + batchSize - 1)

        const result = await batchQuery
        if (result.error) {
          console.error('❌ Export batch query error:', result.error)
          return NextResponse.json({ 
            error: 'Database error during export',
            message: result.error.message 
          }, { status: 500 })
        }

        const batchData = result.data || []
        // ✅ Use push with spread for better performance than array spread
        allData.push(...batchData)
        
        console.log(`📊 Batch ${Math.floor(offset / batchSize) + 1}: ${batchData.length} records (Total: ${allData.length})`)
        
        hasMore = batchData.length === batchSize
        offset += batchSize

        if (allData.length > 1500000) {
          console.log('⚠️ Export limit reached: 1,500,000 records')
          break
        }
      }
      
      // ✅ Final sorting in JavaScript (more efficient than multiple DB sorts, match data API)
      console.log('📊 Sorting export data...')
      allData.sort((a, b) => {
        // Primary: date (desc), year (desc), month (desc)
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        if (a.year !== b.year) return (b.year || 0) - (a.year || 0)
        if (a.month !== b.month) return (b.month || 0) - (a.month || 0)
        // Secondary: user_unique (asc), unique_code (asc) for consistency
        if (a.user_unique !== b.user_unique) return (a.user_unique || '').localeCompare(b.user_unique || '')
        return (a.unique_code || '').localeCompare(b.unique_code || '')
      })
    } catch (err: any) {
      if (err.message?.startsWith('Unauthorized line')) {
        return NextResponse.json({ error: 'Unauthorized', message: err.message }, { status: 403 })
      }
      console.error('❌ Export batch error:', err)
      return NextResponse.json({ error: 'Database error during export', message: err.message || 'Unknown error' }, { status: 500 })
    }

    const rawData = allData
    console.log(`📊 Export completed: ${rawData.length} blue_whale_sgd raw records`)

    if (rawData.length === 0) {
      return NextResponse.json({ 
        error: 'No data found for the selected filters' 
      }, { status: 404 })
    }

    // AGGREGATED MODE (same as data) when not single-day
    let aggregatedData: any[] = []
    if (!isSingleDayMode && (isDateRangeMode || isMonthMode)) {
      const userMap = new Map<string, any>()
      
      rawData?.forEach((row: any) => {
        const key = row.userkey // ✅ Use userkey as aggregation key (unique identifier)
        
        if (!userMap.has(key)) {
          // ✅ EXACT SAME as data API
          const dateRangeValue = isDateRangeMode 
            ? `${startDate} to ${endDate}`
            : (month && month !== 'ALL')
            ? `Month: ${month} ${year !== 'ALL' ? year : ''}`.trim()
            : (year && year !== 'ALL')
            ? `Year: ${year}`
            : 'All Time'
          
          userMap.set(key, {
            userkey: key,
            user_unique: row.user_unique || key, // ✅ Include user_unique for sorting consistency
            date_range: dateRangeValue,
            line: row.line,
            user_name: row.user_name,
            unique_code: row.update_unique_code || row.unique_code,  // ✅ Use update_unique_code, fallback to unique_code
            vip_level: row.vip_level,
            operator: row.operator,
            traffic: row.traffic,
            register_date: row.register_date,
            first_deposit_date: row.first_deposit_date,
            first_deposit_amount: row.first_deposit_amount,
            last_deposit_date: row.last_deposit_date,
            days_inactive: row.days_inactive,
            activeDates: new Set(),
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
        
        if ((row.deposit_cases || 0) > 0 && row.date) {
          userRecord.activeDates.add(row.date)
        }
        
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
      
      aggregatedData = Array.from(userMap.values()).map((user: any) => {
        const daysActive = user.activeDates ? user.activeDates.size : 0
        return {
          ...user,
          days_active: daysActive,
          activeDates: undefined
        }
      })
      
      console.log(`📊 Aggregated export data: ${aggregatedData.length} unique users`)
    } else {
      // Single-day mode → no aggregation, keep raw rows but enrich with ATV, PF, days_active
      // ✅ Match data API: calculate days_active, ATV, PF for per-daily mode
      aggregatedData = rawData.map((row: any) => {
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
      console.log(`📊 Single-day export rows: ${aggregatedData.length}`)
    }

    // Convert aggregated data to CSV - use custom column order and exclude hidden columns
    const hiddenColumns = ['ABSENT', 'YEAR', 'MONTH', 'USERKEY', 'UNIQUEKEY', 'WINRATE', 'CURRENCY', 'DATE', 'VIP_LEVEL', 'OPERATOR', 'REGISTER_DATE', 'LAST_ACTIVITY_DAYS', 'DATE_RANGE', 'USER_UNIQUE']
    
    // Custom column order - same as frontend
    const columnOrder = [
      'line', 
      'user_name',
      'unique_code',
      'traffic',
      'first_deposit_date',
      'first_deposit_amount',
      'last_deposit_date',
      'days_inactive',
      'days_active',
      'atv',
      'pf',
      'deposit_cases',
      'deposit_amount',
      'withdraw_cases',
      'withdraw_amount',
      'bonus',
      'cases_adjustment',
      'add_bonus',
      'deduct_bonus',
      'add_transaction',
      'deduct_transaction',
      'cases_bets',
      'bets_amount',
      'valid_amount',
      'ggr',
      'net_profit'
    ]
    
    // Function to format header title for CSV (same mapping as frontend)
    const formatHeaderTitle = (column: string): string => {
      const headerMap: { [key: string]: string } = {
        'first_deposit_date': 'FDD',
        'first_deposit_amount': 'FDA',
        'last_deposit_date': 'LDD',
        'days_inactive': 'ABSENT',
        'deposit_cases': 'DC',
        'deposit_amount': 'DA',
        'withdraw_cases': 'WC',
        'withdraw_amount': 'WA',
        'add_transaction': 'ADJUST IN',
        'deduct_transaction': 'ADJUST OUT',
        'cases_adjustment': '# ADJUST',
        'cases_bets': '# BETS',
        'atv': 'ATV',
        'pf': 'PF'
      }
      
      if (headerMap[column]) {
        return headerMap[column]
      }
      
      // Default: convert snake_case to UPPERCASE
      return column
        .split('_')
        .map(word => word.toUpperCase())
        .join(' ')
    }
    
    // ✅ Calculate ATV and PF for all data (aggregated and single-day)
    // Note: For aggregated mode, days_active already calculated from activeDates
    // For single-day mode, days_active already calculated above (1 if deposit_cases > 0, else 0)
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
    
    // ✅ Sort by Line (ascending), Days Active (descending), then user_unique and unique_code for consistency (match data API)
    // For aggregated mode: sort by line, days_active, user_unique, unique_code
    // For single-day mode: sort by date (desc), year (desc), month (desc), user_unique (asc), unique_code (asc) - match data API per-daily mode
    if (!isSingleDayMode && (isDateRangeMode || isMonthMode)) {
      // Aggregated mode sorting
      enrichedData.sort((a, b) => {
        // First sort by line (ascending)
        if (a.line !== b.line) {
          return (a.line || '').localeCompare(b.line || '')
        }
        // Then sort by days_active (descending - more active first)
        if ((b.days_active || 0) !== (a.days_active || 0)) {
          return (b.days_active || 0) - (a.days_active || 0)
        }
        // ✅ Additional sorting for consistency
        if (a.user_unique !== b.user_unique) {
          return (a.user_unique || '').localeCompare(b.user_unique || '')
        }
        return (a.unique_code || '').localeCompare(b.unique_code || '')
      })
    } else if (isSingleDayMode) {
      // Single-day mode sorting: match data API per-daily mode
      enrichedData.sort((a, b) => {
        // Primary: date (desc), year (desc), month (desc)
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        if (a.year !== b.year) return (b.year || 0) - (a.year || 0)
        if (a.month !== b.month) return (b.month || 0) - (a.month || 0)
        // Secondary: user_unique (asc), unique_code (asc) for consistency
        if (a.user_unique !== b.user_unique) return (a.user_unique || '').localeCompare(b.user_unique || '')
        return (a.unique_code || '').localeCompare(b.unique_code || '')
      })
    }
    
    // Function to get sorted columns according to custom order (same as frontend)
    const getSortedColumns = (dataKeys: string[]): string[] => {
      // First, get columns that exist in data and are not hidden
      const visibleColumns = dataKeys.filter(column => !hiddenColumns.includes(column.toUpperCase()))
      
      // Then sort them according to custom order
      const sortedColumns = columnOrder.filter(col => visibleColumns.includes(col))
      
      // Add any remaining columns that weren't in the custom order (fallback)
      const remainingColumns = visibleColumns.filter(col => !columnOrder.includes(col))
      
      return [...sortedColumns, ...remainingColumns]
    }
    
    const allHeaders = Object.keys(enrichedData[0])
    const headers = getSortedColumns(allHeaders)
    
    const csvContent = [
      headers.map(header => formatHeaderTitle(header)).join(','),
      ...enrichedData.map(row => 
        headers.map(header => {
          const value = (row as Record<string, unknown>)[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'number') {
            // Format numbers with 2 decimal places if not integer
            if (Number.isInteger(value)) {
              return value.toString()
            } else {
              return value.toFixed(2)
            }
          }
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10)
    const filterStr = [line, year, month].filter(f => f && f !== 'ALL').join('_') || 'all'
    const filename = `SGD_member_report_data_${filterStr}_${timestamp}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('❌ Export error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during export' 
    }, { status: 500 })
  }
}
