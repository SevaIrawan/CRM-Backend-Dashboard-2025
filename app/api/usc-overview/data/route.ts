import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Currency is LOCKED to USC for Overview page
  const currency = 'USC' 
  const line = searchParams.get('line')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const filterMode = searchParams.get('filterMode')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('📊 [USC Overview API] Fetching data with USC currency lock:', { 
      currency, line, year, month, startDate, endDate, filterMode, page, limit 
    })

    // Build base query - USC currency is LOCKED
    let baseQuery = supabase.from('member_report_daily').select('*')
      .eq('currency', 'USC') // Currency LOCKED to USC

    // Add filters based on slicer selections (dependent on USC currency)
    if (line && line !== 'ALL') {
      baseQuery = baseQuery.eq('line', line)
    }

    if (year && year !== 'ALL') {
      baseQuery = baseQuery.eq('year', parseInt(year))
    }

    // Handle month vs date range filtering
    if (filterMode === 'month' && month && month !== 'ALL') {
      baseQuery = baseQuery.eq('month', month)
    } else if (filterMode === 'daterange' && startDate && endDate) {
      baseQuery = baseQuery.gte('date', startDate).lte('date', endDate)
    }

    // Get total count first (separate query with same filters)
    const countQuery = supabase.from('member_report_daily')
      .select('*', { count: 'exact', head: true })
      .eq('currency', 'USC') // Currency LOCKED to USC
    
    // Apply same filters to count query
    if (line && line !== 'ALL') {
      countQuery.eq('line', line)
    }

    if (year && year !== 'ALL') {
      countQuery.eq('year', parseInt(year))
    }

    if (filterMode === 'month' && month && month !== 'ALL') {
      countQuery.eq('month', month)
    } else if (filterMode === 'daterange' && startDate && endDate) {
      countQuery.gte('date', startDate).lte('date', endDate)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('❌ Error getting count for USC Overview:', countError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while counting records',
        message: countError.message 
      }, { status: 500 })
    }

    const totalRecords = count || 0
    const totalPages = Math.ceil(totalRecords / limit)

    // Add pagination to main query
    const offset = (page - 1) * limit
    baseQuery = baseQuery.range(offset, offset + limit - 1)

    // Order by date for consistent results
    baseQuery = baseQuery.order('date', { ascending: false })

    const { data, error } = await baseQuery

    if (error) {
      console.error('❌ Error fetching USC Overview data:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching data',
        message: error.message 
      }, { status: 500 })
    }

    const pagination = {
      currentPage: page,
      totalPages,
      totalRecords,
      recordsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }

    console.log(`✅ [USC Overview API] Loaded ${data?.length || 0} records (Page ${page}/${totalPages}) with USC currency lock`)

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination,
      filters: {
        currency: 'USC', // Always USC for this page
        line,
        year,
        month,
        filterMode
      }
    })

  } catch (error) {
    console.error('❌ [USC Overview API] Error fetching data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
