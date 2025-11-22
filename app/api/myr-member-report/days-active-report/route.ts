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
      .from('blue_whale_myr')
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

    // Get total count first
    let countQuery = supabase
      .from('blue_whale_myr')
      .select('*', { count: 'exact', head: true })
      .eq('userkey', userkey)
      .gt('deposit_cases', 0)

    // Apply same filters to count query
    if (line && line !== 'ALL') {
      countQuery = countQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      countQuery = countQuery.in('line', userAllowedBrands)
    }
    if (year && year !== 'ALL') {
      countQuery = countQuery.eq('year', parseInt(year))
    }
    if (isDateRangeMode) {
      countQuery = countQuery.gte('date', startDate).lte('date', endDate)
    } else if (isMonthMode) {
      countQuery = countQuery.eq('month', month)
    }

    const countResult = await countQuery
    const totalRecords = countResult.count || 0

    console.log(`📊 Total days active records found: ${totalRecords}`)

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

