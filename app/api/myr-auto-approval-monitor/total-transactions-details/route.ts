import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR Auto Approval Monitor TOTAL TRANSACTIONS DETAILS API] Starting request')
    
    const { searchParams } = new URL(request.url)
    const line = searchParams.get('line')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const isDateRange = searchParams.get('isDateRange') === 'true'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')

    const page = Math.max(1, parseInt(pageParam || '1'))
    const limit = Math.max(1, Math.min(1000, parseInt(limitParam || '100'))) // default 100, max 1000
    
    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null
    
    console.log('🔍 [DEBUG] Query parameters:', { 
      line, 
      year, 
      month, 
      isDateRange, 
      startDate, 
      endDate, 
      page, 
      limit,
      userAllowedBrands,
      isSquadLead: userAllowedBrands !== null && userAllowedBrands?.length > 0
    })
    
    // -------------------------
    // Count Query (exact total) - ALL transactions (automation + manual)
    // -------------------------
    let countQuery = supabase
      .from('deposit')
      .select('*', { count: 'exact', head: true })
      .eq('currency', 'MYR')
    
    // ✅ Line filter with Squad Lead brand access validation
    if (line && line !== 'ALL') {
      if (userAllowedBrands && userAllowedBrands.length > 0) {
        // Squad Lead: Only allow access to their assigned brands
        if (!userAllowedBrands.includes(line)) {
          return NextResponse.json({
            success: false,
            error: 'Access denied: You do not have permission to view this brand'
          }, { status: 403 })
        }
      }
      countQuery = countQuery.eq('line', line)
    } else if (userAllowedBrands && userAllowedBrands.length > 0) {
      // Squad Lead: Filter by allowed brands only
      countQuery = countQuery.in('line', userAllowedBrands)
    }
    
    // Date filtering logic
    if (isDateRange && startDate && endDate) {
      // Daily Mode: Use date range filter
      countQuery = countQuery
        .gte('date', startDate)
        .lte('date', endDate)
    } else {
      // Monthly Mode: Use year and month filter
      if (year) {
        countQuery = countQuery.eq('year', parseInt(year))
      }
      if (month) {
        // Convert month name to number
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December']
        const monthNumber = monthNames.indexOf(month) + 1
        if (monthNumber > 0) {
          const yearNum = parseInt(year || '2025')
          const monthStart = `${yearNum}-${String(monthNumber).padStart(2, '0')}-01`
          const monthEnd = new Date(yearNum, monthNumber, 0).toISOString().split('T')[0]
          countQuery = countQuery
            .gte('date', monthStart)
            .lte('date', monthEnd)
        }
      }
    }

    const countRes = await countQuery
    const totalRecords = countRes.count || 0
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit))
    const currentPage = Math.min(page, totalPages)
    const from = (currentPage - 1) * limit
    const to = from + limit - 1

    // -------------------------
    // Data Query (paged) - ALL transactions (automation + manual)
    // -------------------------
    let query = supabase
      .from('deposit')
      .select('date, time, type, line, unique_code, userkey, user_name, amount, operator_group, process_time, proc_sec')
      .eq('currency', 'MYR')
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .range(from, to)
    
    // ✅ Line filter with Squad Lead brand access validation
    if (line && line !== 'ALL') {
      if (userAllowedBrands && userAllowedBrands.length > 0) {
        // Squad Lead: Only allow access to their assigned brands
        if (!userAllowedBrands.includes(line)) {
          return NextResponse.json({
            success: false,
            error: 'Access denied: You do not have permission to view this brand'
          }, { status: 403 })
        }
      }
      query = query.eq('line', line)
    } else if (userAllowedBrands && userAllowedBrands.length > 0) {
      // Squad Lead: Filter by allowed brands only
      query = query.in('line', userAllowedBrands)
    }
    
    // Date filtering logic
    if (isDateRange && startDate && endDate) {
      // Daily Mode: Use date range filter
      query = query
        .gte('date', startDate)
        .lte('date', endDate)
    } else {
      // Monthly Mode: Use year and month filter
      if (year) {
        query = query.eq('year', parseInt(year))
      }
      if (month) {
        // Convert month name to number
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December']
        const monthNumber = monthNames.indexOf(month) + 1
        if (monthNumber > 0) {
          const yearNum = parseInt(year || '2025')
          const monthStart = `${yearNum}-${String(monthNumber).padStart(2, '0')}-01`
          const monthEnd = new Date(yearNum, monthNumber, 0).toISOString().split('T')[0]
          query = query
            .gte('date', monthStart)
            .lte('date', monthEnd)
        }
      }
    }

    const { data, error } = await query
    
    if (error) {
      console.error('❌ [MYR Auto Approval Monitor TOTAL TRANSACTIONS DETAILS API] Query error:', error)
      return NextResponse.json({
        success: false,
        error: 'Database query error',
        details: error.message
      }, { status: 500 })
    }
    
    console.log('✅ [MYR Auto Approval Monitor TOTAL TRANSACTIONS DETAILS API] Query successful:', {
      totalRecords,
      currentPage,
      totalPages,
      dataCount: data?.length || 0
    })
    
    // Format data with defensive null checks
    const formattedData = data?.map((t: any) => ({
      date: t.date || '',
      time: t.time || '',
      type: t.type || 'N/A',
      line: t.line || 'N/A',
      uniqueCode: t.unique_code || t.userkey || 'N/A',
      userName: t.user_name || 'N/A',
      amount: t.amount || 0,
      operator: t.operator_group || 'N/A',
      processTime: t.process_time || `${t.proc_sec || 0}s`,
      procSec: t.proc_sec || 0
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        totalTransactions: formattedData,
        totalCount: formattedData.length,
        pagination: {
          page: currentPage,
          limit,
          totalRecords,
          totalPages
        },
        filters: {
          line: line || 'ALL',
          year: year || 'All',
          month: month || 'All'
        }
      }
    })
    
  } catch (error) {
    console.error('❌ [MYR Auto Approval Monitor TOTAL TRANSACTIONS DETAILS API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

