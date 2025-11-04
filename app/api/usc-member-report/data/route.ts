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

  // ✅ NEW: Get user's allowed brands from request header
  const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
  const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

  try {
    console.log('📊 Fetching blue_whale_usc data with filters:', { 
      currency, line, year, month, startDate, endDate, filterMode, page, limit,
      user_allowed_brands: userAllowedBrands,
      is_squad_lead: userAllowedBrands !== null && userAllowedBrands.length > 0
    })

    // Build base query for filtering - using blue_whale_usc table
    let baseQuery = supabase.from('blue_whale_usc').select('userkey, user_name, unique_code, date, line, year, month, vip_level, operator, traffic, register_date, first_deposit_date, first_deposit_amount, last_deposit_date, days_inactive, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, add_bonus, deduct_bonus, add_transaction, deduct_transaction, cases_adjustment, cases_bets, bets_amount, valid_amount, ggr, net_profit, last_activity_days')

    // No currency filter needed since table is blue_whale_usc

    // ✅ NEW: Apply brand filter with user permission check
    if (line && line !== 'ALL') {
      // Validate Squad Lead access
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      baseQuery = baseQuery.filter('line', 'eq', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      // Squad Lead selected 'ALL' (though they shouldn't have this option) - filter to their brands
      baseQuery = baseQuery.in('line', userAllowedBrands)
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

    // Get total count first (separate query) - Build count query with same filters
    let countQuery = supabase.from('blue_whale_usc').select('*', { count: 'exact', head: true })
    
    // Apply same filters to count query (no currency filter needed)
    // ✅ NEW: Apply brand filter with user permission check
    if (line && line !== 'ALL') {
      countQuery = countQuery.filter('line', 'eq', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      countQuery = countQuery.in('line', userAllowedBrands)
    }
    if (year && year !== 'ALL') {
      countQuery = countQuery.filter('year', 'eq', parseInt(year))
    }
    if (filterMode === 'month' && month && month !== 'ALL') {
      countQuery = countQuery.filter('month', 'eq', month)
    } else if (filterMode === 'daterange' && startDate && endDate) {
      countQuery = countQuery.filter('date', 'gte', startDate).filter('date', 'lte', endDate)
    }
    
    const countResult = await countQuery
    const totalRecords = countResult.count || 0

    console.log(`📊 Total blue_whale_usc records found: ${totalRecords}`)

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
        error: 'Database error while fetching blue_whale_usc data',
        message: result.error.message 
      }, { status: 500 })
    }

    const totalPages = Math.ceil(totalRecords / limit)
    console.log(`✅ Found ${result.data?.length || 0} blue_whale_usc records (Page ${page} of ${totalPages})`)

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
    console.error('❌ Error fetching blue_whale_usc data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching blue_whale_usc data' 
    }, { status: 500 })
  }
}
