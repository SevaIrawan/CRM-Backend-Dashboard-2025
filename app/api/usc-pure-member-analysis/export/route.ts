import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { year, month = 'ALL', metrics } = await request.json()

    console.log('📥 [Pure Member Analysis USC] Exporting data:', { year, month, metrics })

    if (!year || !metrics) {
      return NextResponse.json({
        error: 'Missing required parameters: year, metrics'
      }, { status: 400 })
    }

    // ✅ Calculate date ranges based on month
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    
    let periodStart: string
    let periodEnd: string
    
    if (month === 'ALL') {
      periodStart = `${year}-01-01`
      periodEnd = `${year}-12-31`
    } else {
      const monthIndex = monthNames.indexOf(month)
      if (monthIndex === -1) {
        return NextResponse.json({
          error: 'Invalid month parameter'
        }, { status: 400 })
      }
      const monthNumber = (monthIndex + 1).toString().padStart(2, '0')
      periodStart = `${year}-${monthNumber}-01`
      const lastDay = new Date(parseInt(year), monthIndex + 1, 0).getDate()
      periodEnd = `${year}-${monthNumber}-${lastDay.toString().padStart(2, '0')}`
    }
    
    // ✅ Switch MV table berdasarkan month parameter
    // Month = ALL → pakai YEARLY MV (pre-aggregated, SUPER FAST!)
    // Month = specific → pakai MONTHLY MV (per month data)
    const isYearlyView = month === 'ALL'
    const mvTable = isYearlyView 
      ? 'db_usc_lifetime_customer_yearly_summary'  // Yearly MV (pre-aggregated)
      : 'db_usc_monthly_customer_monthly_summary'   // Monthly MV (per month)
    
    let baseQuery = supabase
      .from(mvTable)
      .select('*')
      .eq('year', parseInt(year))
      .gt('deposit_cases', 0)  // ✅ WAJIB: active main (deposit_cases > 0)
    
    // ✅ Filter by month (only for monthly MV)
    if (!isYearlyView) {
      const monthIndex = monthNames.indexOf(month)
      if (monthIndex !== -1) {
        baseQuery = baseQuery.eq('month', monthIndex + 1)
      }
    }
    
    // ✅ FILTER di DATABASE berdasarkan metrics
    if (metrics === 'existing_member') {
      baseQuery = baseQuery.lt('first_deposit_date', periodStart)
    } else if (metrics === 'new_depositor') {
      baseQuery = baseQuery.gte('first_deposit_date', periodStart).lte('first_deposit_date', periodEnd)
    } else if (metrics === 'pure_existing_member') {
      baseQuery = baseQuery.lt('first_deposit_date', periodStart)
    } else if (metrics === 'pure_new_depositor') {
      baseQuery = baseQuery.gte('first_deposit_date_market', periodStart).lte('first_deposit_date_market', periodEnd)
    }
    
    console.log(`📊 [Pure Member Analysis Export] Querying ${isYearlyView ? 'YEARLY' : 'MONTHLY'} MV for metrics: ${metrics}, year: ${year}, month: ${month}`)
    
    // ✅ Sort berdasarkan metrics: Brand untuk Non-Pure, Unique Code untuk Pure
    const isPureMetric = metrics === 'pure_existing_member' || metrics === 'pure_new_depositor'
    const { data: rawData, error: fetchError } = await baseQuery
      .order(isPureMetric ? 'unique_code' : 'line', { ascending: true })
    
    if (fetchError) {
      console.error('❌ Query error:', fetchError)
      return NextResponse.json({
        error: 'Database error',
        message: fetchError.message
      }, { status: 500 })
    }

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({
        error: 'No data found for the selected year'
      }, { status: 404 })
    }

    console.log(`📊 [Pure Member Analysis Export] Fetched ${rawData.length} records from MV`)

    // ✅ Process data berdasarkan metrics
    const isPure = metrics === 'pure_existing_member' || metrics === 'pure_new_depositor'
    let filteredData = rawData
    
    if (isPure) {
      // Pure metrics: AGGREGATE by unique_code (deduplicate across brands)
      const dataMap = new Map<string, any>()
      
      rawData.forEach((row: any) => {
        const key = row.unique_code
        
        if (!dataMap.has(key)) {
          dataMap.set(key, {
            unique_code: row.unique_code,
            brand_count: 0, // Will calculate UNIQUE brands
            brand_names: new Set<string>(), // Track UNIQUE brands
            deposit_cases: 0,
            deposit_amount: 0,
            withdraw_cases: 0,
            withdraw_amount: 0,
            bonus: 0,
            ggr: 0,
            atv: 0
          })
        }
        
        const record = dataMap.get(key)
        
        // ✅ SUM financial metrics
        record.deposit_cases += (row.deposit_cases || 0)
        record.deposit_amount += (row.deposit_amount || 0)
        record.withdraw_cases += (row.withdraw_cases || 0)
        record.withdraw_amount += (row.withdraw_amount || 0)
        record.bonus += (row.bonus || 0)
        record.ggr += (row.ggr || 0)
        
        // ✅ Track UNIQUE brands (not SUM brand_count)
        if (row.line) {
          record.brand_names.add(row.line)
        }
      })
      
      filteredData = Array.from(dataMap.values()).map((record: any) => {
        // ✅ Calculate brand_count and brand_name from UNIQUE brands
        const uniqueBrands = Array.from(record.brand_names).sort()
        return {
          unique_code: record.unique_code,
          brand_count: uniqueBrands.length,
          brand_name: uniqueBrands.join(' | '),
          deposit_cases: record.deposit_cases,
          deposit_amount: record.deposit_amount,
          withdraw_cases: record.withdraw_cases,
          withdraw_amount: record.withdraw_amount,
          bonus: record.bonus,
          ggr: record.ggr,
          atv: record.deposit_cases > 0 ? record.deposit_amount / record.deposit_cases : 0
        }
      })
      
      console.log(`📊 [Pure Member Analysis Export] Deduplicated to ${filteredData.length} unique customers`)
    } else {
      // Non-Pure metrics
      if (isYearlyView) {
        // ✅ Yearly view (Month=ALL): Data sudah pre-aggregated dari yearly MV, DIRECT data
        filteredData = rawData.map((row: any) => ({
          line: row.line,
          unique_code: row.unique_code,
          user_name: row.user_name,
          traffic: row.traffic,
          first_deposit_date: row.first_deposit_date,
          first_deposit_amount: row.first_deposit_amount || 0,
          atv: row.atv || 0,
          deposit_cases: row.deposit_cases || 0,
          deposit_amount: row.deposit_amount || 0,
          withdraw_cases: row.withdraw_cases || 0,
          withdraw_amount: row.withdraw_amount || 0,
          bonus: row.bonus || 0,
          ggr: row.ggr || 0
        }))
        
        console.log(`📊 [Pure Member Analysis Export] Yearly MV direct data: ${filteredData.length} records`)
      } else {
        // ✅ Monthly view: DIRECT data (no aggregation, FDA is real value)
        filteredData = rawData.map((row: any) => ({
          line: row.line,
          unique_code: row.unique_code,
          user_name: row.user_name,
          traffic: row.traffic,
          first_deposit_date: row.first_deposit_date,
          first_deposit_amount: row.first_deposit_amount || 0,
          atv: row.atv || 0,
          deposit_cases: row.deposit_cases || 0,
          deposit_amount: row.deposit_amount || 0,
          withdraw_cases: row.withdraw_cases || 0,
          withdraw_amount: row.withdraw_amount || 0,
          bonus: row.bonus || 0,
          ggr: row.ggr || 0
        }))
        
        console.log(`📊 [Pure Member Analysis Export] Monthly direct data: ${filteredData.length} records`)
      }
    }

    // ✅ Generate CSV dengan dynamic columns berdasarkan metrics
    let headers: string[]
    let getRowValues: (row: any) => (string | number)[]
    
    if (isPure) {
      // Pure Old & Pure ND: 10 columns
      headers = [
        'UNIQUE CODE', 'BRAND COUNT', 'BRAND NAME', 'ATV',
        'DC', 'DA', 'WC', 'WA', 'BONUS', 'GGR (D-W)'
      ]
      getRowValues = (row: any) => [
        row.unique_code || '',
        row.brand_count || 0,
        `"${row.brand_name || ''}"`,
        row.atv || 0,
        row.deposit_cases || 0,
        row.deposit_amount || 0,
        row.withdraw_cases || 0,
        row.withdraw_amount || 0,
        row.bonus || 0,
        row.ggr || 0
      ]
    } else {
      // Old Member & New Depositor: 13 columns
      headers = [
        'BRAND', 'UNIQUE CODE', 'USER NAME', 'TRAFFIC', 'FDD', 'FDA', 'ATV',
        'DC', 'DA', 'WC', 'WA', 'BONUS', 'GGR (D-W)'
      ]
      getRowValues = (row: any) => [
        row.line || '',
        row.unique_code || '',
        `"${row.user_name || ''}"`,
        row.traffic || '',
        row.first_deposit_date || '',
        row.first_deposit_amount || 0,
        row.atv || 0,
        row.deposit_cases || 0,
        row.deposit_amount || 0,
        row.withdraw_cases || 0,
        row.withdraw_amount || 0,
        row.bonus || 0,
        row.ggr || 0
      ]
    }

    const csvRows = [headers.join(',')]
    filteredData.forEach(row => {
      csvRows.push(getRowValues(row).join(','))
    })

    const csv = csvRows.join('\n')
    const metricsName = metrics.replace(/_/g, '_')
    const monthSuffix = month === 'ALL' ? 'yearly' : month.toLowerCase()
    const filename = `usc_pure_member_${metricsName}_${year}_${monthSuffix}.csv`

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('❌ [Pure Member Analysis Export] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error while exporting data' 
    }, { status: 500 })
  }
}

