import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const line = searchParams.get('line') || 'ALL'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('📊 [MYR Member-Analytic Tier Data] Fetching data:', { line, page, limit })

    // ✅ Get user's allowed brands from request header (SAME AS CUSTOMER-RETENTION)
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    console.log('🔍 [Tier Data] User allowed brands:', userAllowedBrands, 'Selected line:', line)

    // ✅ Validate brand access for Squad Lead (SAME AS CUSTOMER-RETENTION)
    if (line && line !== 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      if (!userAllowedBrands.includes(line)) {
        console.log('❌ [Tier Data] Unauthorized access attempt:', { line, userAllowedBrands })
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
    }

    // ✅ Build base query with LINE filter (SAME PATTERN AS CUSTOMER-RETENTION)
    let baseQuery = supabase
      .from('mv_blue_whale_myr_summary')
      .select('*')

    // ✅ Apply line filter (SAME AS CUSTOMER-RETENTION)
    if (line && line !== 'ALL') {
      baseQuery = baseQuery.filter('line', 'eq', line)
      console.log('🔍 [Tier Data] Applied line filter:', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      baseQuery = baseQuery.in('line', userAllowedBrands)
      console.log('🔍 [Tier Data] Applied SquadLead filter (ALL):', userAllowedBrands)
    } else {
      console.log('🔍 [Tier Data] No line filter applied (showing all brands)')
    }

    // ✅ Get all data first (no pagination for aggregation) - SAME AS CUSTOMER-RETENTION
    // ✅ CRITICAL: Use deterministic ordering to ensure consistent results
    const result = await baseQuery
      .order('absent', { ascending: true, nullsFirst: false })
      .order('unique_code', { ascending: true, nullsFirst: false }) // ✅ Additional tie-breaker for 100% deterministic ordering

    if (result.error) {
      console.error('❌ Supabase query error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching tier data',
        message: result.error.message 
      }, { status: 500 })
    }

    const rawData = result.data || []
    console.log(`📊 Raw mv_blue_whale_myr_summary records found: ${rawData.length}`)
    console.log(`📊 Sample raw data:`, rawData.slice(0, 3))

    // ✅ Map data to match requested columns - SAME AS CUSTOMER-RETENTION
    const finalData = rawData.map((row: any) => ({
      line: row.line || null,
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
      recent_tier: row.recent_tier || null,
      nd_tier: row.nd_tier || null
    }))

    console.log(`📊 Processed tier data: ${finalData.length} records`)

    // ✅ Apply pagination to data (SAME AS CUSTOMER-RETENTION)
    const totalRecords = finalData.length
    const totalPages = Math.ceil(totalRecords / limit)
    const offset = (page - 1) * limit
    const paginatedData = finalData.slice(offset, offset + limit)

    console.log(`✅ Processed ${paginatedData.length} tier data records (Page ${page} of ${totalPages})`)

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
    console.error('❌ [MYR Member-Analytic Tier Data] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching tier data' 
    }, { status: 500 })
  }
}
