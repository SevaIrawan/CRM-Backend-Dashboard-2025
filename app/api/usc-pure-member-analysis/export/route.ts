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
    
    // ✅ SELALU pakai MV MONTHLY saja (1 table)
    // Month = ALL → query semua bulan dalam tahun, lalu aggregate di application level
    // Month = specific → query bulan tersebut saja
    const isYearlyView = month === 'ALL'
    
    let baseQuery = supabase
      .from('db_usc_monthly_customer_monthly_summary')
      .select('*')
      .eq('year', parseInt(year))
      .gt('deposit_cases', 0)  // ✅ WAJIB: active main (deposit_cases > 0)
    
    // ✅ Filter by month (only if specific month selected) - month adalah TEXT (month name)
    if (!isYearlyView) {
      baseQuery = baseQuery.eq('month', month) // Month adalah TEXT (month name seperti "January")
    }
    // If Month = ALL, tidak filter month (ambil semua bulan dalam tahun)
    
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
    
    console.log(`📊 [Pure Member Analysis Export] Querying MONTHLY MV (${isYearlyView ? 'ALL months' : month}) for metrics: ${metrics}, year: ${year}`)
    
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
      // Pure metrics: AGGREGATE by unique_code (deduplicate across brands AND months if Yearly)
      const dataMap = new Map<string, any>()
      
      rawData.forEach((row: any) => {
        // ✅ Skip rows dengan unique_code null/undefined untuk Pure metrics
        if (!row.unique_code) {
          return
        }
        
        const key = row.unique_code
        
        if (!dataMap.has(key)) {
          dataMap.set(key, {
            unique_code: row.unique_code,
            brand_count: 0, // Will calculate UNIQUE brands across ALL months
            brand_names: new Set<string>(), // Track UNIQUE brands across ALL months
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
        
        // ✅ SUM financial metrics (across all months if Yearly, or per month if Monthly)
        // Note: GGR will be recalculated after aggregation, don't SUM row.ggr
        record.deposit_cases += (row.deposit_cases || 0)
        record.deposit_amount += (row.deposit_amount || 0)
        record.withdraw_cases += (row.withdraw_cases || 0)
        record.withdraw_amount += (row.withdraw_amount || 0)
        record.bonus += (row.bonus || 0)
        
        // ✅ Track UNIQUE brands across ALL months (not per month brand_count from MV)
        // This ensures brand_count is correct for Yearly view
        if (row.line) {
          record.brand_names.add(row.line)
        }
      })
      
      filteredData = Array.from(dataMap.values()).map((record: any) => {
        // ✅ Calculate brand_count and brand_name from UNIQUE brands across ALL months
        const uniqueBrands = Array.from(record.brand_names).sort()
        const ggr = record.deposit_amount - record.withdraw_amount
        const atv = record.deposit_cases > 0 ? record.deposit_amount / record.deposit_cases : 0
        
        return {
          unique_code: record.unique_code,
          brand_count: uniqueBrands.length,
          brand_name: uniqueBrands.join(' | '),
          deposit_cases: record.deposit_cases,
          deposit_amount: record.deposit_amount,
          withdraw_cases: record.withdraw_cases,
          withdraw_amount: record.withdraw_amount,
          bonus: record.bonus,
          ggr: ggr,
          atv: atv
        }
      })
      
      console.log(`📊 [Pure Member Analysis Export] Deduplicated to ${filteredData.length} unique customers (${isYearlyView ? 'yearly aggregated' : 'monthly'})`)
    } else {
      // Non-Pure metrics (Old, ND)
      if (isYearlyView) {
        // ✅ Yearly view (Month=ALL): AGGREGATE by (user_unique, line) across all months
        const dataMap = new Map<string, any>()
        
        rawData.forEach((row: any) => {
          // Key = user_unique + line (aggregate across all months)
          const key = `${row.user_unique || ''}_${row.line || ''}`
          
          if (!dataMap.has(key)) {
            dataMap.set(key, {
              user_unique: row.user_unique,
              unique_code: row.unique_code,
              line: row.line,
              user_name: row.user_name || null,
              traffic: row.traffic || null,
              register_date: row.register_date || null,
              first_deposit_date: row.first_deposit_date,
              first_deposit_amount: 0, // Will SUM
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
          
          // ✅ SUM financial metrics across all months
          record.first_deposit_amount += (row.first_deposit_amount || 0)
          record.deposit_cases += (row.deposit_cases || 0)
          record.deposit_amount += (row.deposit_amount || 0)
          record.withdraw_cases += (row.withdraw_cases || 0)
          record.withdraw_amount += (row.withdraw_amount || 0)
          record.bonus += (row.bonus || 0)
          
          // ✅ Take MAX for user_name, traffic (or first non-null)
          if (!record.user_name && row.user_name) {
            record.user_name = row.user_name
          }
          if (!record.traffic && row.traffic) {
            record.traffic = row.traffic
          }
        })
        
        filteredData = Array.from(dataMap.values()).map((record: any) => {
          // ✅ Recalculate GGR and ATV after aggregation
          const ggr = record.deposit_amount - record.withdraw_amount
          const atv = record.deposit_cases > 0 ? record.deposit_amount / record.deposit_cases : 0
          
          return {
            line: record.line,
            unique_code: record.unique_code,
            user_name: record.user_name,
            traffic: record.traffic,
            register_date: record.register_date,
            first_deposit_date: record.first_deposit_date,
            first_deposit_amount: record.first_deposit_amount,
            atv: atv,
            deposit_cases: record.deposit_cases,
            deposit_amount: record.deposit_amount,
            withdraw_cases: record.withdraw_cases,
            withdraw_amount: record.withdraw_amount,
            bonus: record.bonus,
            ggr: ggr
          }
        })
        
        console.log(`📊 [Pure Member Analysis Export] Yearly aggregated (from monthly MV): ${filteredData.length} records`)
      } else {
        // ✅ Monthly view: DIRECT data (no aggregation, FDA is real value)
        filteredData = rawData.map((row: any) => ({
          line: row.line,
          unique_code: row.unique_code,
          user_name: row.user_name,
          traffic: row.traffic,
          register_date: row.register_date || null,
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
      // Old Member & New Depositor: 14 columns (added REGISTER DATE after TRAFFIC)
      headers = [
        'BRAND', 'UNIQUE CODE', 'USER NAME', 'TRAFFIC', 'REGISTER DATE', 'FDD', 'FDA', 'ATV',
        'DC', 'DA', 'WC', 'WA', 'BONUS', 'GGR (D-W)'
      ]
      getRowValues = (row: any) => [
        row.line || '',
        row.unique_code || '',
        `"${String(row.user_name || '').replace(/"/g, '""')}"`,
        `"${String(row.traffic || '').replace(/"/g, '""')}"`, // ✅ Wrap traffic in quotes and escape quotes for proper CSV encoding
        row.register_date ? new Date(row.register_date).toISOString().split('T')[0] : '',
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
    // ✅ Add BOM (Byte Order Mark) for proper UTF-8 encoding in Excel
    // This ensures Khmer text and other Unicode characters display correctly
    const csvWithBOM = '\ufeff' + csv
    
    const metricsName = metrics.replace(/_/g, '_')
    const monthSuffix = month === 'ALL' ? 'yearly' : month.toLowerCase()
    const filename = `usc_pure_member_${metricsName}_${year}_${monthSuffix}.csv`

    return new Response(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8', // ✅ Add charset=utf-8 for proper encoding
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('❌ [Pure Member Analysis Export] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error while exporting data' 
    }, { status: 500 })
  }
}

