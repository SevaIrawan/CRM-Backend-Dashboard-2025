import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Filters
    const currency = searchParams.get('currency') || ''
    const line = searchParams.get('line') || ''
    const year = searchParams.get('year') || ''
    const quarter = searchParams.get('quarter') || ''
    const action = searchParams.get('action') || ''
    const changedBy = searchParams.get('changedBy') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const exportCsv = searchParams.get('export') === 'csv'

    console.log('🔍 [Target Audit Log API] Fetching audit logs with filters:', {
      currency,
      line,
      year,
      quarter,
      action,
      changedBy,
      startDate,
      endDate,
      page,
      limit
    })

    // Build query
    let query = supabase
      .from('bp_target_audit_log')
      .select('*', { count: 'exact' })

    // Apply filters
    if (currency) {
      query = query.eq('currency', currency)
    }
    if (line) {
      query = query.ilike('line', `%${line}%`)
    }
    if (year) {
      query = query.eq('year', parseInt(year))
    }
    if (quarter) {
      query = query.eq('quarter', quarter)
    }
    if (action) {
      query = query.eq('action', action)
    }
    if (changedBy) {
      query = query.ilike('changed_by', `%${changedBy}%`)
    }
    if (startDate) {
      query = query.gte('changed_at', startDate)
    }
    if (endDate) {
      query = query.lte('changed_at', `${endDate}T23:59:59`)
    }

    // Order by changed_at DESC
    query = query.order('changed_at', { ascending: false })

    // For CSV export, fetch all data
    if (exportCsv) {
      const { data: allLogs, error } = await query

      if (error) {
        console.error('❌ [Target Audit Log API] Error fetching all logs:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Generate CSV
      const csvHeader = 'ID,Currency,Line,Year,Quarter,Action,Old GGR,New GGR,Old DA,New DA,Old DC,New DC,Old AM,New AM,Changed By,Role,Changed At,IP,Reason\n'
      const csvRows = allLogs?.map((log: any) => {
        return [
          log.id,
          log.currency,
          log.line,
          log.year,
          log.quarter,
          log.action,
          log.old_target_ggr || '',
          log.new_target_ggr || '',
          log.old_target_deposit_amount || '',
          log.new_target_deposit_amount || '',
          log.old_target_deposit_cases || '',
          log.new_target_deposit_cases || '',
          log.old_target_active_member || '',
          log.new_target_active_member || '',
          log.changed_by,
          log.changed_by_role,
          new Date(log.changed_at).toLocaleString(),
          log.ip_address || '',
          log.reason ? `"${log.reason.replace(/"/g, '""')}"` : ''
        ].join(',')
      }).join('\n')

      const csv = csvHeader + csvRows

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="target-audit-log-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // For normal fetch, apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: logs, error, count } = await query

    if (error) {
      console.error('❌ [Target Audit Log API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    console.log('✅ [Target Audit Log API] Logs fetched:', logs?.length, 'records, total:', count)

    return NextResponse.json({
      logs: logs || [],
      totalRecords: count || 0,
      totalPages,
      currentPage: page
    })

  } catch (error: any) {
    console.error('❌ [Target Audit Log API] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch target audit logs',
      details: error.message 
    }, { status: 500 })
  }
}

