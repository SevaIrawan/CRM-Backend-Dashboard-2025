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
    console.log('📊 Fetching new_depositor_daily data with filters:', { 
      currency, line, year, month, startDate, endDate, filterMode, page, limit 
    })

    // Build base query for filtering
    let baseQuery = supabase.from('new_depositor_daily').select('*')

    // Add filters based on selections
    if (currency && currency !== 'ALL') {
      baseQuery = baseQuery.filter('currency', 'eq', currency)
    }

    if (line && line !== 'ALL') {
      baseQuery = baseQuery.filter('line', 'eq', line)
    }

    if (year && year !== 'ALL') {
      baseQuery = baseQuery.filter('year', 'eq', parseInt(year))
    }

    // Handle month vs date range filtering
    if (filterMode === 'month' && month && month !== 'ALL') {
      baseQuery = baseQuery.filter('month', 'eq', month)
    } else if (filterMode === 'daterange' && startDate && endDate) {
      baseQuery = baseQuery.filter('date', 'gte', startDate).filter('date', 'lte', endDate)
    }

    // Get total count first (separate query)
    const countQuery = supabase.from('new_depositor_daily').select('*', { count: 'exact', head: true })
    
    // Apply same filters to count query
    if (currency && currency !== 'ALL') {
      countQuery.filter('currency', 'eq', currency)
    }
    if (line && line !== 'ALL') {
      countQuery.filter('line', 'eq', line)
    }
    if (year && year !== 'ALL') {
      countQuery.filter('year', 'eq', parseInt(year))
    }
    if (filterMode === 'month' && month && month !== 'ALL') {
      countQuery.filter('month', 'eq', month)
    } else if (filterMode === 'daterange' && startDate && endDate) {
      countQuery.filter('date', 'gte', startDate).filter('date', 'lte', endDate)
    }
    
    const countResult = await countQuery
    const totalRecords = countResult.count || 0

    console.log(`📊 Total new_depositor_daily records found: ${totalRecords}`)

    // Get data with pagination and sorting
    const offset = (page - 1) * limit
    const result = await baseQuery
      .order('date', { ascending: false })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .range(offset, offset + limit - 1)

    if (result.error) {
      console.error('❌ Supabase query error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching new_depositor_daily data',
        message: result.error.message 
      }, { status: 500 })
    }

    const totalPages = Math.ceil(totalRecords / limit)
    console.log(`✅ Found ${result.data?.length || 0} new_depositor_daily records (Page ${page} of ${totalPages})`)

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
    console.error('❌ Error fetching new_depositor_daily data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching new_depositor_daily data' 
    }, { status: 500 })
  }
}
