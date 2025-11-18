import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR Auto Approval Monitor UPLOAD TRANSACTIONS DETAILS API] Starting request')
    
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
    // Count Query (exact total) - Filter by type = 'Upload' OR 'API Upload'
    // -------------------------
    let countQuery = supabase
      .from('deposit')
      .select('*', { count: 'exact', head: true })
      .eq('currency', 'MYR')
      .in('type', ['Upload', 'API Upload'])
    
    // ✅ Line filter with Squad Lead brand access validation
    if (line && line !== 'ALL') {
      if (userAllowedBrands && userAllowedBrands.length > 0) {
        // Squad Lead: Only allow access to their assigned brands
        if (!userAllowedBrands.includes(line)) {
          return NextResponse.json({
            success: false,
            error: 'Unauthorized',
            message: `You do not have access to brand "${line}"`
          }, { status: 403 })
        }
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
    
    const { count, error: countError } = await countQuery
    
    if (countError) {
      console.error('❌ [UPLOAD TRANSACTIONS DETAILS] Count error:', countError)
      return NextResponse.json({
        success: false,
        error: 'Failed to count upload transactions',
        details: countError.message
      }, { status: 500 })
    }
    
    const totalRecords = count || 0
    const totalPages = Math.ceil(totalRecords / limit)
    const offset = (page - 1) * limit
    
    console.log('📊 [UPLOAD TRANSACTIONS DETAILS] Pagination:', {
      totalRecords,
      totalPages,
      page,
      limit,
      offset
    })
    
    // -------------------------
    // Data Query - Filter by type = 'Upload' OR 'API Upload'
    // -------------------------
    let dataQuery = supabase
      .from('deposit')
      .select('date, time, type, line, unique_code, userkey, user_name, amount, operator_group, process_time, proc_sec')
      .eq('currency', 'MYR')
      .in('type', ['Upload', 'API Upload'])
    
    // Apply same filters as count query
    if (line && line !== 'ALL') {
      dataQuery = dataQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      dataQuery = dataQuery.in('line', userAllowedBrands)
    }
    
    // Date filtering logic - OPTIMIZED: Use date range for monthly mode instead of year/month columns
    if (isDateRange && startDate && endDate) {
      // Daily Mode: Use date range filter
      dataQuery = dataQuery
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
        
        dataQuery = dataQuery.gte('date', monthStart).lt('date', monthEnd)
      }
    }
    
    // Apply ordering and pagination
    dataQuery = dataQuery
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data: uploadData, error: dataError } = await dataQuery
    
    if (dataError) {
      console.error('❌ [UPLOAD TRANSACTIONS DETAILS] Data error:', dataError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch upload transactions',
        details: dataError.message
      }, { status: 500 })
    }
    
    // Transform data to match frontend interface
    const uploadTransactions = (uploadData || []).map((d: any) => ({
      date: d.date,
      time: d.time || '',
      type: d.type || 'Upload',
      approval: d.operator_group || '',
      line: d.line || '',
      uniqueCode: d.unique_code || '',
      userName: d.user_name || '',
      amount: d.amount || 0,
      operator: d.operator_group || '',
      processTime: d.process_time || '',
      procSec: d.proc_sec || 0
    }))
    
    console.log('✅ [UPLOAD TRANSACTIONS DETAILS] Success:', {
      totalRecords,
      returnedRecords: uploadTransactions.length,
      page,
      totalPages
    })
    
    return NextResponse.json({
      success: true,
      data: {
        uploadTransactions,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages
        }
      }
    })
    
  } catch (error) {
    console.error('❌ [UPLOAD TRANSACTIONS DETAILS] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

