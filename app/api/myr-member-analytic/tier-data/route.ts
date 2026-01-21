import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const line = searchParams.get('line') || 'ALL'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('📊 [MYR Member-Analytic Tier Data] Fetching data:', { line, page, limit })

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

    // ✅ Query from mv_blue_whale_myr_summary
    let baseQuery = supabase
      .from('mv_blue_whale_myr_summary')
      .select('*')

    // ✅ Apply line filter
    if (line && line !== 'ALL') {
      baseQuery = baseQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      baseQuery = baseQuery.in('line', userAllowedBrands)
    }

    // ✅ Get total count first (separate query for count)
    let countQuery = supabase
      .from('mv_blue_whale_myr_summary')
      .select('*', { count: 'exact', head: true })
    
    if (line && line !== 'ALL') {
      countQuery = countQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      countQuery = countQuery.in('line', userAllowedBrands)
    }
    
    const { count, error: countError } = await countQuery

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

    console.log(`📊 [MYR Member-Analytic Tier Data] Fetched ${rawData.length} records`)

    // ✅ Map data to match requested columns - only return exact fields needed
    const finalData = rawData.map((row: any) => ({
      unique_code: row.unique_code || null,
      user_name: row.user_name || null,
      absent: row.absent ?? null,
      fdd: row.fdd || row.first_deposit_date || null,
      ldd: row.ldd || row.last_deposit_date || null,
      da: row.da || row.deposit_amount || 0,
      wa: row.wa || row.withdraw_amount || 0,
      ggr: row.ggr || (row.deposit_amount - row.withdraw_amount) || 0,
      dc: row.dc || row.deposit_cases || 0,
      wc: row.wc || row.withdraw_cases || 0,
      days_active: row.days_active || row.attendance || null,
      time_of_deposit: row.time_of_deposit || null,
      avg_attendance: row.avg_attendance || null,
      avg_da: row.avg_da || null,
      avg_ggr: row.avg_ggr || null,
      pf: row.pf || row.purchase_frequency || null,
      atv: row.atv || row.avg_transaction_value || (row.deposit_cases > 0 ? row.deposit_amount / row.deposit_cases : 0),
      winrate: row.winrate || null,
      wd_rate: row.wd_rate || row.withdrawal_rate || null,
      lifetime_tier: row.lifetime_tier || null,
      recent_tier: row.recent_tier || null
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
    console.error('❌ [MYR Member-Analytic Tier Data] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching tier data' 
    }, { status: 500 })
  }
}
