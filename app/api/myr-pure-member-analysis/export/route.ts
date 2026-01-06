import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { year, metrics } = await request.json()

    console.log('📥 [Pure Member Analysis MYR] Exporting data:', { year, metrics })

    if (!year || !metrics) {
      return NextResponse.json({
        error: 'Missing required parameters: year, metrics'
      }, { status: 400 })
    }

    // ✅ Query dari MATERIALIZED VIEW (SUPER FAST!)
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`
    
    let baseQuery = supabase
      .from('db_myr_lifetime_customer_yearly_summary')
      .select('*')
      .eq('year', parseInt(year))
      .gt('deposit_cases', 0)  // ✅ WAJIB: active main (deposit_cases > 0)
    
    // ✅ FILTER di DATABASE berdasarkan metrics
    if (metrics === 'existing_member') {
      // Old Member: first_deposit_date < year-01-01 AND deposit_cases > 0
      baseQuery = baseQuery.lt('first_deposit_date', yearStart)
    } else if (metrics === 'new_depositor') {
      // New Depositor (ND): first_deposit_date di tahun slicer AND deposit_cases > 0
      baseQuery = baseQuery.gte('first_deposit_date', yearStart).lte('first_deposit_date', yearEnd)
    } else if (metrics === 'pure_existing_member') {
      // Pure Old Member: first_deposit_date < year-01-01 AND deposit_cases > 0 (filter by unique_code)
      baseQuery = baseQuery.lt('first_deposit_date', yearStart)
    } else if (metrics === 'pure_new_depositor') {
      // Pure ND: first_deposit_date_market di tahun slicer AND deposit_cases > 0 (filter by unique_code)
      baseQuery = baseQuery.gte('first_deposit_date_market', yearStart).lte('first_deposit_date_market', yearEnd)
    }
    
    console.log(`📊 [Pure Member Analysis Export] Querying MV for metrics: ${metrics}, year: ${year}`)
    
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
            brand_count: row.brand_count,
            brand_name: row.brand_name,
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
        record.deposit_cases += (row.deposit_cases || 0)
        record.deposit_amount += (row.deposit_amount || 0)
        record.withdraw_cases += (row.withdraw_cases || 0)
        record.withdraw_amount += (row.withdraw_amount || 0)
        record.bonus += (row.bonus || 0)
        record.ggr += (row.ggr || 0)
      })
      
      filteredData = Array.from(dataMap.values()).map((record: any) => ({
        ...record,
        atv: record.deposit_cases > 0 ? record.deposit_amount / record.deposit_cases : 0
      }))
      
      console.log(`📊 [Pure Member Analysis Export] Deduplicated to ${filteredData.length} unique customers`)
    } else {
      // Non-Pure metrics: DIRECT data (no aggregation, FDA is real value)
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
      
      console.log(`📊 [Pure Member Analysis Export] Direct data: ${filteredData.length} records`)
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
    const filename = `myr_pure_member_${metricsName}_${year}.csv`

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

