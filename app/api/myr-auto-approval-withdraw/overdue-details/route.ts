import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR Auto Approval Withdraw OVERDUE DETAILS API] Starting request')
    
    const { searchParams } = new URL(request.url)
    const line = searchParams.get('line')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')
    const threshold = 30

    const page = Math.max(1, parseInt(pageParam || '1'))
    const limit = Math.max(1, Math.min(1000, parseInt(limitParam || '100'))) // default 100, max 1000
    
    console.log('🔍 [DEBUG] Query parameters:', { line, year, month, page, limit })
    
    // -------------------------
    // Count Query (exact total) - Only automation transactions that are overdue
    // -------------------------
    let countQuery = supabase
      .from('withdraw')
      .select('*', { count: 'exact', head: true })
      .eq('currency', 'MYR')
      .not('proc_sec', 'is', null)
      .gt('proc_sec', threshold)
      .eq('chanel', 'Automation')  // Only automation transactions for withdraw
    
    if (line && line !== 'ALL') {
      countQuery = countQuery.eq('line', line)
    }
    if (year) {
      countQuery = countQuery.eq('year', parseInt(year))
    }
    if (month) {
      countQuery = countQuery.eq('month', month)
    }

    const countRes = await countQuery
    const totalRecords = countRes.count || 0
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit))
    const currentPage = Math.min(page, totalPages)
    const from = (currentPage - 1) * limit
    const to = from + limit - 1

    console.log('🔍 [DEBUG] Pagination:', { totalRecords, totalPages, currentPage, from, to })

    // -------------------------
    // Data Query (paged) - Only automation transactions that are overdue
    // -------------------------
    let query = supabase
      .from('withdraw')
      .select('id, userkey, date, time, year, month, line, currency, amount, operator_group, chanel, proc_sec, status')
      .eq('currency', 'MYR')
      .not('proc_sec', 'is', null)
      .gt('proc_sec', threshold)
      .eq('chanel', 'Automation')  // Only automation transactions for withdraw
    
    if (line && line !== 'ALL') {
      query = query.eq('line', line)
    }
    
    if (year) {
      query = query.eq('year', parseInt(year))
    }
    
    if (month) {
      query = query.eq('month', month)
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
    
    console.log('📊 [DEBUG] Overdue automation transactions:', {
      totalCount: data?.length || 0,
      sampleData: data?.slice(0, 3)
    })
    
    // Format data for withdraw (same structure as deposit for consistency)
    const formattedData = data?.map((t: any) => ({
      date: t.date,
      time: t.time,
      uniqueCode: t.unique_code,
      userName: t.user_name,
      amount: t.amount,
      operator: t.chanel,  // Using chanel field for withdraw
      processTime: t.process_time,
      procSec: t.proc_sec
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        overdueTransactions: formattedData,
        totalCount: formattedData.length,
        pagination: {
          page: currentPage,
          limit,
          totalRecords,
          totalPages
        },
        thresholdSec: threshold,
        filters: {
          line: line || 'ALL',
          year: year || 'All',
          month: month || 'All'
        }
      }
    })
    
  } catch (error) {
    console.error('❌ [MYR Auto Approval Withdraw OVERDUE DETAILS API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

