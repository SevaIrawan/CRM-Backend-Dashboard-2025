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

  try {
    console.log('📊 Fetching deposit_daily data with filters:', { 
      currency, line, year, month, startDate, endDate, filterMode, page, limit 
    })

    // Build base query for filtering
    let baseQuery = supabase.from('deposit_daily')

    // Add filters based on selections
    if (currency && currency !== 'ALL') {
      baseQuery = baseQuery.eq('currency', currency)
    }

    if (line && line !== 'ALL') {
      baseQuery = baseQuery.eq('line', line)
    }

    if (year && year !== 'ALL') {
      baseQuery = baseQuery.eq('year', parseInt(year))
    }

    // Handle month vs date range filtering
    if (filterMode === 'month' && month && month !== 'ALL') {
      baseQuery = baseQuery.eq('month', parseInt(month))
    } else if (filterMode === 'daterange' && startDate && endDate) {
      baseQuery = baseQuery.gte('date', startDate).lte('date', endDate)
    }

    // Get total count first (separate query)
    const countResult = await baseQuery.select('*', { count: 'exact', head: true })
    const totalRecords = countResult.count || 0

    console.log(`📊 Total records found: ${totalRecords}`)

    // Get data with pagination and sorting
    const offset = (page - 1) * limit
    const result = await baseQuery
      .select('*')
      .order('date', { ascending: false })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .range(offset, offset + limit - 1)

    if (result.error) {
      console.error('❌ Supabase query error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching data',
        message: result.error.message 
      }, { status: 500 })
    }

    const totalPages = Math.ceil(totalRecords / limit)
    console.log(`✅ Found ${result.data?.length || 0} records from deposit_daily (Page ${page} of ${totalPages})`)

    return NextResponse.json({
      success: true,
      data: result.data || [],
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
      }
    })

  } catch (error) {
    console.error('❌ Error fetching deposit_daily data:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Database error while fetching data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
