import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { line, year, month, startDate, endDate, filterMode } = await request.json()

    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    console.log('📥 Exporting blue_whale_myr data with filters:', { 
      line, year, month, startDate, endDate, filterMode,
      user_allowed_brands: userAllowedBrands
    })

    // ✅ Check if date range mode (need aggregation)
    const isDateRangeMode = filterMode === 'daterange' && startDate && endDate
    
    let data: any[] = []

    if (isDateRangeMode) {
      // ✅ AGGREGATED EXPORT: Same logic as data API
      console.log('📊 [AGGREGATED EXPORT] Date range mode - aggregating by user...')
      
      let query = supabase
        .from('blue_whale_myr')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
      
      // ✅ Apply brand filter with user permission check
      if (line && line !== 'ALL') {
        if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
          return NextResponse.json({
            error: 'Unauthorized',
            message: `You do not have access to brand "${line}"`
          }, { status: 403 })
        }
        query = query.eq('line', line)
      } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
        query = query.in('line', userAllowedBrands)
      }
      if (year && year !== 'ALL') {
        query = query.eq('year', parseInt(year))
      }
      
      // Fetch ALL data for aggregation
      const { data: rawData, error: rawError } = await query
      
      if (rawError) {
        return NextResponse.json({ 
          error: 'Database error',
          message: rawError.message 
        }, { status: 500 })
      }
      
      // ✅ GROUP BY userkey and aggregate
      const userMap = new Map<string, any>()
      
      rawData?.forEach((row: any) => {
        const key = row.userkey
        
        if (!userMap.has(key)) {
          userMap.set(key, {
            date_range: `${startDate} to ${endDate}`,
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
        
        // COUNT Days Active
        if ((row.deposit_cases || 0) > 0) {
          userRecord.days_active += 1
        }
        
        // SUM all metrics
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
      
      data = Array.from(userMap.values())
      console.log(`📊 Aggregated export: ${data.length} unique users`)
      
    } else {
      // ✅ PER-DAILY EXPORT: Original logic for monthly mode
      console.log('📊 [PER-DAILY EXPORT] Monthly mode - fetching per-daily data...')
      
      let query = supabase.from('blue_whale_myr').select('userkey, user_name, unique_code, date, line, year, month, vip_level, operator, traffic, register_date, first_deposit_date, first_deposit_amount, last_deposit_date, days_inactive, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, add_bonus, deduct_bonus, add_transaction, deduct_transaction, cases_adjustment, cases_bets, bets_amount, valid_amount, ggr, net_profit, last_activity_days')

      // ✅ Apply brand filter with user permission check
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
      }

      // For large datasets, fetch in batches
      const batchSize = 5000
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
        
        hasMore = batchData.length === batchSize
        offset += batchSize

        if (allData.length > 100000) {
          console.log('⚠️ Export limit reached: 100,000 records')
          break
        }
      }

      data = allData
      console.log(`📊 Export completed: ${data.length} blue_whale_myr records`)
    }

    if (data.length === 0) {
      return NextResponse.json({ 
        error: 'No data found for the selected filters' 
      }, { status: 404 })
    }

    // Convert to CSV - use custom column order and exclude hidden columns
    const hiddenColumns = ['ABSENT', 'YEAR', 'MONTH', 'USERKEY', 'UNIQUEKEY', 'WINRATE', 'CURRENCY']
    
    // Custom column order - same as frontend (with date_range and days_active for aggregated mode)
    const columnOrder = [
      'date',
      'date_range',
      'days_active',
      'line', 
      'user_name',
      'unique_code',
      'vip_level',
      'operator',
      'traffic',
      'register_date',
      'first_deposit_date',
      'first_deposit_amount',
      'last_deposit_date',
      'days_inactive',
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
      'net_profit',
      'last_activity_days'
    ]
    
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
    
    const allHeaders = Object.keys(data[0])
    const headers = getSortedColumns(allHeaders)
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = (row as Record<string, unknown>)[header]
          if (value === null || value === undefined) return ''
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
