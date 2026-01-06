import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const year = searchParams.get('year')
  const metrics = searchParams.get('metrics')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('📊 [Pure Member Analysis MYR] Fetching data:', { year, metrics, page, limit })

    if (!year || !metrics) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: year, metrics'
      }, { status: 400 })
    }

    // ✅ STEP 1: Query dari MATERIALIZED VIEW (SUPER FAST!)
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
    
    console.log(`📊 [Pure Member Analysis] Querying MV for metrics: ${metrics}, year: ${year}`)
    
    // ✅ STEP 2: Fetch data dengan sort berdasarkan metrics
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
    
    // ✅ STEP 3: Process data berdasarkan metrics
    const isPure = metrics === 'pure_existing_member' || metrics === 'pure_new_depositor'
    let finalData = rawData
    
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
      
      finalData = Array.from(dataMap.values()).map((record: any) => ({
        ...record,
        atv: record.deposit_cases > 0 ? record.deposit_amount / record.deposit_cases : 0
      }))
      
      console.log(`📊 [Pure Member Analysis] Deduplicated to ${finalData.length} unique customers`)
    } else {
      // Non-Pure metrics: DIRECT data (no aggregation, FDA is real value)
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
      
      console.log(`📊 [Pure Member Analysis] Direct data: ${finalData.length} records`)
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
    console.error('❌ [Pure Member Analysis MYR] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching pure member data' 
    }, { status: 500 })
  }
}

