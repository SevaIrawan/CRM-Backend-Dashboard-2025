import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { exportType, line, searchUserName, paymentMethod, activeTime, fba } = await request.json()

    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    console.log('📊 [MYR Member-Analytic Export] Exporting data:', { 
      exportType, 
      line, 
      searchUserName, 
      paymentMethod, 
      activeTime, 
      fba, 
      user_allowed_brands: userAllowedBrands,
      filters_applied: {
        line: line && line !== 'ALL',
        searchUserName: !!(searchUserName && searchUserName.trim()),
        paymentMethod: !!(paymentMethod && paymentMethod !== 'ALL' && paymentMethod !== null),
        activeTime: !!(activeTime && activeTime !== 'ALL' && activeTime !== null),
        fba: !!(fba && fba !== 'ALL' && fba !== null)
      }
    })

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

    let csvContent = ''
    let filename = ''

    if (exportType === 'tier-data') {
      // ✅ Export Tier Data from mv_blue_whale_myr_summary
      let baseQuery = supabase
        .from('mv_blue_whale_myr_summary')
        .select('*')

      // ✅ Apply line filter (SAME AS TIER-DATA ROUTE)
      if (line && line !== 'ALL') {
        baseQuery = baseQuery.filter('line', 'eq', line)
      } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
        baseQuery = baseQuery.in('line', userAllowedBrands)
      }

      // ✅ Apply search filter if provided
      if (searchUserName && searchUserName.trim()) {
        baseQuery = baseQuery.ilike('user_name', `%${searchUserName.trim()}%`)
      }

      // ✅ Get all data first (no pagination) - SAME AS TIER-DATA ROUTE
      // ✅ CRITICAL: Use deterministic ordering to ensure consistent results
      const result = await baseQuery
        .order('absent', { ascending: true, nullsFirst: false })
        .order('unique_code', { ascending: true, nullsFirst: false }) // ✅ Additional tie-breaker for 100% deterministic ordering

      if (result.error) {
        console.error('❌ Export query error:', result.error)
        return NextResponse.json({
          success: false,
          error: 'Database error',
          message: result.error.message || 'Failed to fetch data from database'
        }, { status: 500 })
      }

      const rawData = result.data || []

      if (!rawData || rawData.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No data found',
          message: 'No tier data found for the selected filters'
        }, { status: 404 })
      }

      console.log(`📊 [MYR Member-Analytic Export] Fetched ${rawData.length} tier data records`)

      // Map data to match requested columns
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

      // Define columns order for Tier Data
      const tierDataColumns = [
        'line',
        'unique_code',
        'user_name',
        'absent',
        'fdd',
        'ldd',
        'da',
        'wa',
        'ggr',
        'dc',
        'wc',
        'days_active',
        'time_of_deposit',
        'avg_attendance',
        'avg_da',
        'avg_ggr',
        'pf',
        'atv',
        'winrate',
        'wd_rate',
        'lifetime_tier',
        'recent_tier',
        'nd_tier'
      ]

      const tierDataHeaders: { [key: string]: string } = {
        'line': 'BRAND',
        'unique_code': 'UNIQUE CODE',
        'user_name': 'USER NAME',
        'absent': 'ABSENT',
        'fdd': 'FDD',
        'ldd': 'LDD',
        'da': 'DA',
        'wa': 'WA',
        'ggr': 'GGR',
        'dc': 'DC',
        'wc': 'WC',
        'days_active': 'DAYS ACTIVE',
        'time_of_deposit': 'TIME OF DEPOSIT',
        'avg_attendance': 'AVG ATTENDANCE',
        'avg_da': 'AVG DA',
        'avg_ggr': 'AVG GGR',
        'pf': 'PF',
        'atv': 'ATV',
        'winrate': 'WINRATE',
        'wd_rate': 'WD RATE',
        'lifetime_tier': 'LIFETIME TIER',
        'recent_tier': 'RECENT TIER',
        'nd_tier': 'ND TIER'
      }

      // Create CSV header
      const csvHeader = tierDataColumns.map(col => tierDataHeaders[col] || col.toUpperCase()).join(',')

      // Create CSV rows
      const csvRows = finalData.map((row: any) => {
        return tierDataColumns.map((col) => {
          const value = row[col]
          if (value === null || value === undefined || value === '') {
            return '-'
          }
          // Format winrate and wd_rate as percentage with 2 decimals
          if (col === 'winrate' || col === 'wd_rate') {
            const numericValue = typeof value === 'number' ? value : parseFloat(value)
            if (isNaN(numericValue)) {
              return '-'
            }
            return `${(numericValue * 100).toFixed(2)}%`
          }
          if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              return value.toString()
            } else {
              return value.toFixed(2)
            }
          }
          return `"${String(value).replace(/"/g, '""')}"`
        }).join(',')
      })

      csvContent = [csvHeader, ...csvRows].join('\n')
      filename = `myr_tier_data_${line || 'ALL'}_${new Date().toISOString().split('T')[0]}.csv`

    } else if (exportType === 'customer-behavior') {
      // ✅ Export Customer Behavior from mv_deposit_myr_summary
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

      // ✅ Apply line filter
      if (line && line !== 'ALL') {
        baseQuery = baseQuery.eq('line', line)
      } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
        baseQuery = baseQuery.in('line', userAllowedBrands)
      }

      // ✅ Apply search filter if provided
      if (searchUserName && searchUserName.trim()) {
        baseQuery = baseQuery.ilike('user_name', `%${searchUserName.trim()}%`)
      }

      // ✅ Apply slicer filters (only if not null and not 'ALL')
      if (paymentMethod && paymentMethod !== 'ALL' && paymentMethod !== null) {
        baseQuery = baseQuery.eq('payment_method', paymentMethod)
      }
      if (activeTime && activeTime !== 'ALL' && activeTime !== null) {
        baseQuery = baseQuery.eq('peak', activeTime)
      }
      if (fba && fba !== 'ALL' && fba !== null) {
        baseQuery = baseQuery.eq('fba_label', fba)
      }

      // ✅ Fetch ALL data in batches to handle large datasets
      const batchSize = 1000
      let allRawData: any[] = []
      let currentPage = 0
      let hasMore = true

      while (hasMore) {
        const offset = currentPage * batchSize
        // Rebuild query for each batch to avoid query builder mutation issues
        let batchQuery = supabase
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

        // Apply filters
        if (line && line !== 'ALL') {
          batchQuery = batchQuery.eq('line', line)
        } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
          batchQuery = batchQuery.in('line', userAllowedBrands)
        }

        if (searchUserName && searchUserName.trim()) {
          batchQuery = batchQuery.ilike('user_name', `%${searchUserName.trim()}%`)
        }

        // Apply slicer filters (only if not null and not 'ALL')
        if (paymentMethod && paymentMethod !== 'ALL' && paymentMethod !== null) {
          batchQuery = batchQuery.eq('payment_method', paymentMethod)
        }
        if (activeTime && activeTime !== 'ALL' && activeTime !== null) {
          batchQuery = batchQuery.eq('peak', activeTime)
        }
        if (fba && fba !== 'ALL' && fba !== null) {
          batchQuery = batchQuery.eq('fba_label', fba)
        }

        // Apply ordering and pagination
        const queryResult = await batchQuery
          .order('absent', { ascending: true, nullsFirst: false })
          .range(offset, offset + batchSize - 1)
        
        const { data: batchData, error: fetchError } = queryResult
        
        console.log(`📊 [Customer Behavior Export] Batch ${currentPage + 1}: offset=${offset}, fetched=${batchData?.length || 0} records`)

        if (fetchError) {
          console.error('❌ Export query error:', fetchError)
          console.error('❌ Export query error details:', JSON.stringify(fetchError, null, 2))
          console.error('❌ Export query error code:', fetchError.code)
          console.error('❌ Export query error hint:', fetchError.hint)
          return NextResponse.json({
            success: false,
            error: 'Database error',
            message: fetchError.message || fetchError.hint || 'Failed to fetch data from database'
          }, { status: 500 })
        }

        if (!batchData || batchData.length === 0) {
          hasMore = false
        } else {
          allRawData = [...allRawData, ...batchData]
          hasMore = batchData.length === batchSize
          currentPage++
        }

        // Safety limit to prevent infinite loops
        if (currentPage > 10000) {
          console.warn('⚠️ Export: Reached safety limit of 10000 pages')
          break
        }
      }

      const rawData = allRawData

      if (!rawData || rawData.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No data found',
          message: 'No customer behavior data found for the selected filters'
        }, { status: 404 })
      }

      console.log(`📊 [MYR Member-Analytic Export] Fetched ${rawData.length} customer behavior records`)

      // Map data to match requested columns
      const finalData = rawData.map((row: any) => ({
        line: row.line || null,
        unique_code: row.unique_code || null,
        user_name: row.user_name || null,
        absent: row.absent ?? null,
        payment_method: row.payment_method || null,
        peak: row.peak || null,
        bonus_type: row.bonus_type || null,
        provider: row.provider || null,
        fba_label: row.fba_label || null
      }))

      // Define columns order for Customer Behavior
      const customerBehaviorColumns = [
        'line',
        'unique_code',
        'user_name',
        'absent',
        'payment_method',
        'peak',
        'bonus_type',
        'provider',
        'fba_label'
      ]

      const customerBehaviorHeaders: { [key: string]: string } = {
        'line': 'BRAND',
        'unique_code': 'UNIQUE CODE',
        'user_name': 'USER NAME',
        'absent': 'ABSENT',
        'payment_method': 'PAYMENT METHOD',
        'peak': 'ACTIVE TIME',
        'bonus_type': 'BONUS TYPE',
        'provider': 'PROVIDER',
        'fba_label': 'FAVOURITE BET AMOUNT'
      }

      // Create CSV header
      const csvHeader = customerBehaviorColumns.map(col => customerBehaviorHeaders[col] || col.toUpperCase()).join(',')

      // Create CSV rows
      const csvRows = finalData.map((row: any) => {
        return customerBehaviorColumns.map((col) => {
          const value = row[col]
          if (value === null || value === undefined || value === '') {
            return '-'
          }
          if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              return value.toString()
            } else {
              return value.toFixed(2)
            }
          }
          return `"${String(value).replace(/"/g, '""')}"`
        }).join(',')
      })

      csvContent = [csvHeader, ...csvRows].join('\n')
      filename = `myr_customer_behavior_${line || 'ALL'}_${new Date().toISOString().split('T')[0]}.csv`

    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid export type',
        message: 'exportType must be either "tier-data" or "customer-behavior"'
      }, { status: 400 })
    }

    // Add BOM (Byte Order Mark) for proper UTF-8 encoding in Excel
    const csvWithBOM = '\ufeff' + csvContent

    // Return CSV file
    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error: any) {
    console.error('❌ [MYR Member-Analytic Export] Error:', error)
    console.error('❌ [MYR Member-Analytic Export] Error stack:', error?.stack)
    return NextResponse.json({
      success: false,
      error: 'Internal server error during export',
      message: error?.message || 'An unexpected error occurred'
    }, { status: 500 })
  }
}
