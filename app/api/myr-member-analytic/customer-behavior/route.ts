import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const line = searchParams.get('line') || 'ALL'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('📊 [MYR Member-Analytic Customer Behavior] Fetching data:', { line, page, limit })

    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    // ✅ Validate brand access for Squad Lead
    if (line && line !== 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      if (!userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
    }

    // ✅ Query from mv_deposit_myr_summary
    let baseQuery = supabase
      .from('mv_deposit_myr_summary')
      .select(`
        unique_code,
        user_name,
        absent,
        payment_method,
        peak,
        bonus_type,
        provider,
        fba_label,
        line
      `)

    // ✅ Apply line filter only
    if (line && line !== 'ALL') {
      baseQuery = baseQuery.eq('line', line)
    } else if (line === 'ALL') {
      // For ALL, filter by user allowed brands if exists, otherwise show all
      if (userAllowedBrands && userAllowedBrands.length > 0) {
        baseQuery = baseQuery.in('line', userAllowedBrands)
      }
      // If no userAllowedBrands, show all lines (no additional filter)
    }

    // ✅ Get total count first
    const { count, error: countError } = await baseQuery.select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Count error:', countError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: countError.message
      }, { status: 500 })
    }

    // ✅ Fetch paginated data - Sort by absent A to Z (ascending)
    const offset = (page - 1) * limit
    const { data: rawData, error: fetchError } = await baseQuery
      .order('absent', { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1)

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

    console.log(`📊 [MYR Member-Analytic Customer Behavior] Fetched ${rawData.length} records`)

    // ✅ Map data to match requested columns
    const finalData = rawData.map((row: any) => ({
      unique_code: row.unique_code || null,
      user_name: row.user_name || null,
      absent: row.absent ?? null,
      payment_method: row.payment_method || null,
      peak: row.peak || null,
      bonus_type: row.bonus_type || null,
      provider: row.provider || null,
      fba_label: row.fba_label || null
    }))

    const totalRecords = count || 0
    const totalPages = Math.ceil(totalRecords / limit)

    return NextResponse.json({
      success: true,
      data: finalData,
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
    console.error('❌ [MYR Member-Analytic Customer Behavior] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching customer behavior data' 
    }, { status: 500 })
  }
}
