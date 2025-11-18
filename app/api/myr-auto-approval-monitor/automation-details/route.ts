import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR Auto Approval Monitor AUTOMATION DETAILS API] Starting request')
    
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
    // Count Query (exact total) - ALL automation transactions (no proc_sec threshold)
    // -------------------------
    let countQuery = supabase
      .from('deposit')
      .select('*', { count: 'exact', head: true })
      .eq('currency', 'MYR')
      .not('proc_sec', 'is', null)
      .in('operator_group', ['Automation', 'BOT'])  // Only automation transactions
    
    // ✅ Line filter with Squad Lead brand access validation
    if (line && line !== 'ALL') {
      // Validate Squad Lead access
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      countQuery = countQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      // Squad Lead selected 'ALL' - filter to their brands
      countQuery = countQuery.in('line', userAllowedBrands)
    }
    
    // Date filtering logic - OPTIMIZED: Use date range for monthly mode instead of year/month columns
    if (isDateRange && startDate && endDate) {
      // Daily Mode: Use date range filter
      countQuery = countQuery
        .gte('date', startDate)
        .lte('date', endDate)
    } else if (year && month) {
      // Monthly Mode: Convert month name to number and use date range (OPTIMIZED)
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December']
      const monthNumber = monthNames.indexOf(month) + 1
      if (monthNumber > 0) {
        const yearNum = parseInt(year)
        const monthStart = `${yearNum}-${String(monthNumber).padStart(2, '0')}-01`
        const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1
        const nextYear = monthNumber === 12 ? yearNum + 1 : yearNum
        const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
        
        countQuery = countQuery.gte('date', monthStart).lt('date', monthEnd)
      }
    }

    const countRes = await countQuery
    const totalRecords = countRes.count || 0
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit))
    const currentPage = Math.min(page, totalPages)
    const offset = (currentPage - 1) * limit
    const from = offset
    const to = offset + limit - 1

    console.log('📊 [DEBUG] Pagination:', { totalRecords, totalPages, currentPage, offset, limit, from, to })

    // -------------------------
    // Data Query (paged) - ALL automation transactions (no proc_sec threshold)
    // OPTIMIZED: Select specific columns instead of * for better performance
    // -------------------------
    let query = supabase
      .from('deposit')
      .select('date, time, type, line, unique_code, userkey, user_name, amount, operator_group, process_time, proc_sec')
      .eq('currency', 'MYR')
      .not('proc_sec', 'is', null)
      .in('operator_group', ['Automation', 'BOT'])  // Only automation transactions
    
    // ✅ Line filter with Squad Lead brand access validation (same as count query)
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
      // Squad Lead selected 'ALL' - filter to their brands
      query = query.in('line', userAllowedBrands)
    }
    
    // Date filtering logic - OPTIMIZED: Use date range for monthly mode instead of year/month columns
    if (isDateRange && startDate && endDate) {
      // Daily Mode: Use date range filter
      query = query
        .gte('date', startDate)
        .lte('date', endDate)
    } else if (year && month) {
      // Monthly Mode: Convert month name to number and use date range (OPTIMIZED)
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December']
      const monthNumber = monthNames.indexOf(month) + 1
      if (monthNumber > 0) {
        const yearNum = parseInt(year)
        const monthStart = `${yearNum}-${String(monthNumber).padStart(2, '0')}-01`
        const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1
        const nextYear = monthNumber === 12 ? yearNum + 1 : yearNum
        const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
        
        query = query.gte('date', monthStart).lt('date', monthEnd)
      }
    }
    
    const { data, error } = await query
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .range(from, to)
    
    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: error.message
      }, { status: 500 })
    }
    
    console.log('📊 [DEBUG] Automation transactions:', {
      totalCount: data?.length || 0,
      sampleData: data?.slice(0, 3)
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
        automationTransactions: formattedData,
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
    console.error('❌ [MYR Auto Approval Monitor AUTOMATION DETAILS API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

