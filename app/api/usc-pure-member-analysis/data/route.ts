import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const year = searchParams.get('year')
  const month = searchParams.get('month') || 'ALL'
  const metrics = searchParams.get('metrics')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('📊 [Pure Member Analysis USC] Fetching data:', { year, month, metrics, page, limit })

    if (!year || !metrics) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: year, metrics'
      }, { status: 400 })
    }

    // ✅ STEP 1: Calculate date ranges based on month
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    
    let periodStart: string
    let periodEnd: string
    
    if (month === 'ALL') {
      // Yearly: Use full year range
      periodStart = `${year}-01-01`
      periodEnd = `${year}-12-31`
    } else {
      // Monthly: Use specific month range
      const monthIndex = monthNames.indexOf(month)
      if (monthIndex === -1) {
        return NextResponse.json({
          success: false,
          error: 'Invalid month parameter'
        }, { status: 400 })
      }
      const monthNumber = (monthIndex + 1).toString().padStart(2, '0')
      periodStart = `${year}-${monthNumber}-01`
      // Get last day of month
      const lastDay = new Date(parseInt(year), monthIndex + 1, 0).getDate()
      periodEnd = `${year}-${monthNumber}-${lastDay.toString().padStart(2, '0')}`
    }
    
    // ✅ STEP 2: Switch MV table berdasarkan month parameter
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
    
    // ✅ Filter by month (only for monthly MV) - month adalah TEXT (month name)
    if (!isYearlyView) {
      baseQuery = baseQuery.eq('month', month) // Month adalah TEXT (month name seperti "January")
    }
    
    // ✅ FILTER di DATABASE berdasarkan metrics
    if (metrics === 'existing_member') {
      // Old Member: first_deposit_date < periodStart AND deposit_cases > 0
      baseQuery = baseQuery.lt('first_deposit_date', periodStart)
    } else if (metrics === 'new_depositor') {
      // New Depositor (ND): first_deposit_date di periode slicer AND deposit_cases > 0
      baseQuery = baseQuery.gte('first_deposit_date', periodStart).lte('first_deposit_date', periodEnd)
    } else if (metrics === 'pure_existing_member') {
      // Pure Old Member: first_deposit_date < periodStart AND deposit_cases > 0 (filter by unique_code)
      baseQuery = baseQuery.lt('first_deposit_date', periodStart)
    } else if (metrics === 'pure_new_depositor') {
      // Pure ND: first_deposit_date_market di periode slicer AND deposit_cases > 0 (filter by unique_code)
      baseQuery = baseQuery.gte('first_deposit_date_market', periodStart).lte('first_deposit_date_market', periodEnd)
    }
    
    console.log(`📊 [Pure Member Analysis] Querying ${isYearlyView ? 'YEARLY' : 'MONTHLY'} MV for metrics: ${metrics}, year: ${year}, month: ${month}`)
    
    // ✅ STEP 3: Fetch data dengan sort berdasarkan metrics
    const isPureMetric = metrics === 'pure_existing_member' || metrics === 'pure_new_depositor'
    const { data: rawData, error: fetchError } = await baseQuery
      .order(isPureMetric ? 'unique_code' : 'line', { ascending: true })
    
    if (fetchError) {
      console.error('❌ Query error:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: fetchError.message
      }, { status: 500 })
    }

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          recordsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        }
      })
    }

    console.log(`📊 [Pure Member Analysis] Fetched ${rawData.length} records from MV`)
    
    // ✅ STEP 4: Process data berdasarkan metrics
    const isPure = metrics === 'pure_existing_member' || metrics === 'pure_new_depositor'
    let finalData = rawData
    
    if (isPure) {
      // Pure metrics: AGGREGATE by unique_code (deduplicate across brands)
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
      
      finalData = Array.from(dataMap.values()).map((record: any) => {
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
      
      console.log(`📊 [Pure Member Analysis] Deduplicated to ${finalData.length} unique customers`)
    } else {
      // Non-Pure metrics
      if (isYearlyView) {
        // ✅ Yearly view (Month=ALL): Data sudah pre-aggregated dari yearly MV, DIRECT data
        finalData = rawData.map((row: any) => ({
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
        
        console.log(`📊 [Pure Member Analysis] Yearly MV direct data: ${finalData.length} records`)
      } else {
        // ✅ Monthly view: DIRECT data (no aggregation, FDA is real value)
        finalData = rawData.map((row: any) => ({
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
        
        console.log(`📊 [Pure Member Analysis] Monthly direct data: ${finalData.length} records`)
      }
    }

    console.log(`📊 [Pure Member Analysis] Final data count: ${finalData.length} records for metrics: ${metrics}`)

    // ✅ STEP 4: Apply pagination
    const totalRecords = finalData.length
    const totalPages = Math.ceil(totalRecords / limit)
    const offset = (page - 1) * limit
    const paginatedData = finalData.slice(offset, offset + limit)

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
      }
    })

  } catch (error) {
    console.error('❌ [Pure Member Analysis USC] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching pure member data' 
    }, { status: 500 })
  }
}

