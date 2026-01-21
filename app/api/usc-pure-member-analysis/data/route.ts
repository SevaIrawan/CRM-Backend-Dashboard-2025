import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const year = searchParams.get('year')
  const month = searchParams.get('month') || 'ALL'
  const metrics = searchParams.get('metrics')
  const brand = searchParams.get('brand') || 'ALL'
  const traffic = searchParams.get('traffic') || 'ALL'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('📊 [Pure Member Analysis USC] Fetching data:', { year, month, metrics, brand, page, limit })

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
    
    // ✅ STEP 2: SELALU pakai MV MONTHLY saja (1 table)
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
    const isPureMetric = metrics === 'pure_existing_member' || metrics === 'pure_new_depositor'
    
    // ✅ Apply brand filter ONLY for Non-Pure metrics (Pure metrics aggregate by unique_code, no brand filter)
    if (!isPureMetric && brand && brand !== 'ALL') {
      baseQuery = baseQuery.eq('line', brand)
    }
    // If Pure metric, tidak filter brand (aggregate by unique_code across all brands)
    
    // ✅ Apply traffic filter
    if (traffic && traffic !== 'ALL') {
      baseQuery = baseQuery.eq('traffic', traffic)
    }
    
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
    
    console.log(`📊 [Pure Member Analysis] Querying MONTHLY MV (${isYearlyView ? 'ALL months' : month}) for metrics: ${metrics}, year: ${year}`)
    
    // ✅ STEP 3: Fetch data dengan sort berdasarkan metrics
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
    
    // ✅ STEP 4: Calculate days_active from blue_whale_usc for Non-Pure metrics
    const isPure = metrics === 'pure_existing_member' || metrics === 'pure_new_depositor'
    let daysActiveMap = new Map<string, number>()
    
    if (!isPure) {
      // Fetch days_active from blue_whale_usc for Non-Pure metrics
      let daysActiveQuery = supabase
        .from('blue_whale_usc')
        .select('user_unique, line, date')
        .eq('currency', 'USC')
        .eq('year', parseInt(year))
        .gt('deposit_cases', 0)
      
      // Apply month filter if not yearly view
      if (!isYearlyView) {
        daysActiveQuery = daysActiveQuery.eq('month', month)
      }
      
      // Apply brand filter if brand is not ALL
      if (brand && brand !== 'ALL') {
        daysActiveQuery = daysActiveQuery.eq('line', brand)
      }
      
      // Apply traffic filter if traffic is not ALL
      if (traffic && traffic !== 'ALL') {
        daysActiveQuery = daysActiveQuery.eq('traffic', traffic)
      }
      
      // Apply metrics filter for date range
      if (metrics === 'existing_member') {
        daysActiveQuery = daysActiveQuery.lt('first_deposit_date', periodStart)
      } else if (metrics === 'new_depositor') {
        daysActiveQuery = daysActiveQuery.gte('first_deposit_date', periodStart).lte('first_deposit_date', periodEnd)
      }
      
      const { data: daysActiveData, error: daysActiveError } = await daysActiveQuery
      
      if (!daysActiveError && daysActiveData) {
        // Count distinct dates per (user_unique, line)
        const userDateMap = new Map<string, Set<string>>()
        
        daysActiveData.forEach((row: any) => {
          const key = `${row.user_unique || ''}_${row.line || ''}`
          if (!userDateMap.has(key)) {
            userDateMap.set(key, new Set())
          }
          if (row.date) {
            userDateMap.get(key)!.add(row.date)
          }
        })
        
        // Convert to count
        userDateMap.forEach((dates, key) => {
          daysActiveMap.set(key, dates.size)
        })
        
        console.log(`📊 [Pure Member Analysis] Calculated days_active for ${daysActiveMap.size} users from blue_whale_usc`)
      }
    }
    
    // ✅ STEP 5: Process data berdasarkan metrics
    let finalData = rawData
    
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
      
      finalData = Array.from(dataMap.values()).map((record: any) => {
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
      
      console.log(`📊 [Pure Member Analysis] Deduplicated to ${finalData.length} unique customers (${isYearlyView ? 'yearly aggregated' : 'monthly'})`)
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
              days_active: 0, // Will SUM
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
          // days_active will be set from daysActiveMap after aggregation
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
        
        finalData = Array.from(dataMap.values()).map((record: any) => {
          // ✅ Recalculate GGR and ATV after aggregation
          const ggr = record.deposit_amount - record.withdraw_amount
          const atv = record.deposit_cases > 0 ? record.deposit_amount / record.deposit_cases : 0
          
          // ✅ Get days_active from daysActiveMap
          const daysActiveKey = `${record.user_unique || ''}_${record.line || ''}`
          const daysActive = daysActiveMap.get(daysActiveKey) || 0
          
          return {
            line: record.line,
            unique_code: record.unique_code,
            user_name: record.user_name,
            traffic: record.traffic,
            register_date: record.register_date,
            first_deposit_date: record.first_deposit_date,
            first_deposit_amount: record.first_deposit_amount,
            days_active: daysActive,
            atv: atv,
            deposit_cases: record.deposit_cases,
            deposit_amount: record.deposit_amount,
            withdraw_cases: record.withdraw_cases,
            withdraw_amount: record.withdraw_amount,
            bonus: record.bonus,
            ggr: ggr
          }
        })
        
        console.log(`📊 [Pure Member Analysis] Yearly aggregated (from monthly MV): ${finalData.length} records`)
      } else {
        // ✅ Monthly view: DIRECT data (no aggregation, FDA is real value)
        finalData = rawData.map((row: any) => {
          // ✅ Get days_active from daysActiveMap
          const daysActiveKey = `${row.user_unique || ''}_${row.line || ''}`
          const daysActive = daysActiveMap.get(daysActiveKey) || 0
          
          return {
            line: row.line,
            unique_code: row.unique_code,
            user_name: row.user_name,
            traffic: row.traffic,
            register_date: row.register_date || null,
            first_deposit_date: row.first_deposit_date,
            first_deposit_amount: row.first_deposit_amount || 0,
            days_active: daysActive,
            atv: row.atv || 0,
            deposit_cases: row.deposit_cases || 0,
            deposit_amount: row.deposit_amount || 0,
            withdraw_cases: row.withdraw_cases || 0,
            withdraw_amount: row.withdraw_amount || 0,
            bonus: row.bonus || 0,
            ggr: row.ggr || 0
          }
        })
        
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

