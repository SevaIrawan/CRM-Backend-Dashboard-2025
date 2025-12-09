import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const userkey = searchParams.get('userkey')
  const line = searchParams.get('line')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const filterMode = searchParams.get('filterMode')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')

  // ✅ Get user's allowed brands from request header
  const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
  const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

  if (!userkey) {
    return NextResponse.json({
      success: false,
      error: 'userkey is required'
    }, { status: 400 })
  }

  try {
    console.log('📊 Fetching days active details for userkey:', userkey, { line, year, month, startDate, endDate, filterMode })

    // Build query - only get rows where deposit_cases > 0 (active days)
    let query = supabase
      .from('blue_whale_sgd')
      .select('date, unique_code, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, ggr')
      .eq('userkey', userkey)
      .gt('deposit_cases', 0) // Only days with deposit activity

    // Apply filters
    if (line && line !== 'ALL') {
      // Validate Squad Lead access
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
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

    // Apply date/month filter based on mode
    const isDateRangeMode = filterMode === 'daterange' && startDate && endDate
    const isMonthMode = filterMode === 'month' && month && month !== 'ALL'

    if (isDateRangeMode) {
      query = query.gte('date', startDate).lte('date', endDate)
    } else if (isMonthMode) {
      query = query.eq('month', month)
    }

    // ✅ CRITICAL: Calculate unique dates (not total rows) to match days_active calculation in data route
    // days_active = unique date userkey where deposit_cases > 0
    // This means: count distinct dates per userkey where deposit_cases > 0
    // Build separate query to fetch all dates for unique date calculation
    let uniqueDateQuery = supabase
      .from('blue_whale_sgd')
      .select('date')
      .eq('userkey', userkey) // ✅ Filter by userkey
      .gt('deposit_cases', 0) // ✅ Only rows where deposit_cases > 0

    // Apply same filters to unique date query
    if (line && line !== 'ALL') {
      uniqueDateQuery = uniqueDateQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      uniqueDateQuery = uniqueDateQuery.in('line', userAllowedBrands)
    }
    if (year && year !== 'ALL') {
      uniqueDateQuery = uniqueDateQuery.eq('year', parseInt(year))
    }
    if (isDateRangeMode) {
      uniqueDateQuery = uniqueDateQuery.gte('date', startDate).lte('date', endDate)
    } else if (isMonthMode) {
      uniqueDateQuery = uniqueDateQuery.eq('month', month)
    }

    // Fetch all matching rows to count unique dates
    const allRowsResult = await uniqueDateQuery.range(0, 999999)
    const uniqueDates = new Set<string>()
    allRowsResult.data?.forEach((row: any) => {
      if (row.date) {
        uniqueDates.add(row.date)
      }
    })
    const totalRecords = uniqueDates.size

    console.log(`📊 Total unique days active found: ${totalRecords} (from ${allRowsResult.data?.length || 0} total rows)`)

    // Get data with pagination and sorting
    const offset = (page - 1) * limit
    const result = await query
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (result.error) {
      console.error('❌ Supabase query error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching days active details',
        message: result.error.message 
      }, { status: 500 })
    }

    const totalPages = Math.ceil(totalRecords / limit)
    console.log(`✅ Found ${result.data?.length || 0} days active records (Page ${page} of ${totalPages})`)

    return NextResponse.json({
      success: true,
      data: result.data || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('❌ Error fetching days active details:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching days active details' 
    }, { status: 500 })
  }
}

