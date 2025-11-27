import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { line, year, month, startDate, endDate, filterMode } = await request.json()

    // ✅ NEW: Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    console.log('📥 Exporting blue_whale_myr data with filters:', { 
      line, year, month, startDate, endDate, filterMode,
      user_allowed_brands: userAllowedBrands
    })

    // Build query with same filters as data endpoint (no currency filter needed)
    let query = supabase.from('blue_whale_myr').select('userkey, user_name, unique_code, date, line, year, month, vip_level, operator, traffic, register_date, first_deposit_date, first_deposit_amount, last_deposit_date, days_inactive, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, add_bonus, deduct_bonus, add_transaction, deduct_transaction, cases_adjustment, cases_bets, bets_amount, valid_amount, ggr, net_profit, last_activity_days')

    // ✅ NEW: Apply brand filter with user permission check
    if (line && line !== 'ALL') {
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      query = query.filter('line', 'eq', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      query = query.in('line', userAllowedBrands)
    }

    if (year && year !== 'ALL') {
      query = query.filter('year', 'eq', parseInt(year))
    }

    if (filterMode === 'month' && month && month !== 'ALL') {
      query = query.filter('month', 'eq', month)
    } else if (filterMode === 'daterange' && startDate && endDate) {
      query = query.filter('date', 'gte', startDate).filter('date', 'lte', endDate)
    }

    // For large datasets, we need to fetch in batches
    const batchSize = 5000 // Process 5000 records at a time
    let allData: any[] = []
    let offset = 0
    let hasMore = true

    console.log('📊 Starting batch export for large dataset...')

    while (hasMore) {
      const batchQuery = query.range(offset, offset + batchSize - 1)
      const result = await batchQuery.order('date', { ascending: false })

      if (result.error) {
        console.error('❌ Export batch query error:', result.error)
        return NextResponse.json({ 
          error: 'Database error during export',
          message: result.error.message 
        }, { status: 500 })
      }

      const batchData = result.data || []
      allData = [...allData, ...batchData]
      
      console.log(`📊 Batch ${Math.floor(offset / batchSize) + 1}: ${batchData.length} records (Total: ${allData.length})`)
      
      // If we got less than batchSize, we've reached the end
      hasMore = batchData.length === batchSize
      offset += batchSize

      // Safety limit to prevent infinite loops
      if (allData.length > 100000) {
        console.log('⚠️ Export limit reached: 100,000 records')
        break
      }
    }

    const rawData = allData
    console.log(`📊 Export completed: ${rawData.length} blue_whale_myr raw records`)

    if (rawData.length === 0) {
      return NextResponse.json({ 
        error: 'No data found for the selected filters' 
      }, { status: 404 })
    }

    // ✅ AGGREGATE BY USERKEY (same as data endpoint)
    const userMap = new Map<string, any>()
    
    rawData?.forEach((row: any) => {
      const key = row.userkey
      
      if (!userMap.has(key)) {
        // Initialize user record
        const dateRangeValue = filterMode === 'daterange' && startDate && endDate
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
      
      // COUNT Days Active (unique dates where deposit_cases > 0)
      if ((row.deposit_cases || 0) > 0 && row.date) {
        userRecord.activeDates.add(row.date)
      }
      
      // SUM all numeric metrics
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
      const daysActive = user.activeDates ? user.activeDates.size : 0
      return {
        ...user,
        days_active: daysActive,
        activeDates: undefined // Remove from final data
      }
    })
    
    console.log(`📊 Aggregated export data: ${aggregatedData.length} unique users`)

    // Convert aggregated data to CSV - use custom column order and exclude hidden columns
    const hiddenColumns = ['ABSENT', 'YEAR', 'MONTH', 'USERKEY', 'UNIQUEKEY', 'WINRATE', 'CURRENCY', 'DATE', 'VIP_LEVEL', 'OPERATOR', 'REGISTER_DATE', 'LAST_ACTIVITY_DAYS', 'DATE_RANGE']
    
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
    
    // Calculate ATV and PF for aggregated data
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
    const filename = `myr_member_report_data_${filterStr}_${timestamp}.csv`

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
