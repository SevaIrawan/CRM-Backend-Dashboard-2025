import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - CUSTOMER TRANSACTIONS API
 * ============================================================================
 * 
 * Purpose: Get transaction history by date for a specific customer
 * Returns: List of transactions (one per date) with all required metrics
 * 
 * Params:
 * - userkey: Required (e.g., "USRC428754-2025-November-17WIN168-USC")
 * - year: Required (e.g., "2025")
 * - month: Required (e.g., "November")
 * 
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userkey = searchParams.get('userkey')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    
    if (!userkey || !year || !month) {
      return NextResponse.json({
        success: false,
        error: 'userkey, year, and month parameters are required'
      }, { status: 400 })
    }
    
    console.log('📊 [USC BP Customer Transactions] Parameters:', { userkey, year, month })
    
    // Get user's allowed brands from header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? 
      JSON.parse(userAllowedBrandsHeader) : null
    
    // Convert month name to month number
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    const monthNumber = monthNames.indexOf(month) + 1
    
    if (monthNumber === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid month name'
      }, { status: 400 })
    }
    
    // Query transaction history for the customer
    // CRITICAL: Match Active Days calculation EXACTLY
    // Active Days in tier_usc_v1 = COUNT(DISTINCT date) FROM blue_whale_usc
    // WHERE currency='USC' AND year=X AND month=Y AND userkey=Z
    // GROUP BY userkey, year, month
    // HAVING SUM(deposit_cases) > 0
    // 
    // IMPORTANT: tier_usc_v1 does NOT filter by line/brand when calculating active_days!
    // So we should NOT filter by brand here either to match the calculation.
    // However, we still need to respect user permissions for display.
    let query = supabase
      .from('blue_whale_usc')
      .select('date, line, unique_code, user_name, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount')
      .eq('userkey', userkey)
      .eq('year', parseInt(year))
      .eq('month', monthNumber)
      .eq('currency', 'USC')
      .gt('deposit_cases', 0) // CRITICAL: Only dates with deposit_cases > 0 (matches Active Days)
      .order('date', { ascending: false })
    
    // NOTE: We do NOT filter by brand here to match tier_usc_v1 active_days calculation
    // tier_usc_v1 calculates active_days across ALL brands for the user
    // But we can still filter results for display if needed (after grouping)
    
    console.log('📊 [USC BP Customer Transactions] Executing query:', {
      userkey,
      year: parseInt(year),
      month: monthNumber,
      currency: 'USC',
      userAllowedBrands
    })
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ [USC BP Customer Transactions] Query error:', error)
      throw error
    }
    
    console.log('📊 [USC BP Customer Transactions] Query result (before grouping):', {
      userkey,
      year,
      month,
      monthNumber,
      dataCount: data?.length || 0,
      sampleData: data?.slice(0, 2) || []
    })
    
    // Group by date and aggregate
    // CRITICAL: This must match Active Days calculation exactly
    // Active Days = COUNT(DISTINCT date) WHERE deposit_cases > 0 (from tier_usc_v1)
    // So we group by date and only count dates that have at least one row with deposit_cases > 0
    const dateMap = new Map<string, {
      date: string
      line: string
      unique_code: string
      user_name: string
      deposit_cases: number
      deposit_amount: number
      withdraw_cases: number
      withdraw_amount: number
    }>()
    
    if (data && data.length > 0) {
      data.forEach((row: any) => {
        // Only process rows with deposit_cases > 0 (already filtered in query, but double-check)
        if (parseInt(row.deposit_cases) <= 0) {
          return // Skip rows without deposits
        }
        
        const date = String(row.date)
        const existing = dateMap.get(date)
        
        if (existing) {
          // Aggregate values for same date (multiple rows per date possible)
          existing.deposit_cases += parseInt(row.deposit_cases) || 0
          existing.deposit_amount += parseFloat(row.deposit_amount) || 0
          existing.withdraw_cases += parseInt(row.withdraw_cases) || 0
          existing.withdraw_amount += parseFloat(row.withdraw_amount) || 0
        } else {
          // First occurrence of this date (this date will be counted in Active Days)
          dateMap.set(date, {
            date: date,
            line: row.line || '-',
            unique_code: row.unique_code || '-',
            user_name: row.user_name || '-',
            deposit_cases: parseInt(row.deposit_cases) || 0,
            deposit_amount: parseFloat(row.deposit_amount) || 0,
            withdraw_cases: parseInt(row.withdraw_cases) || 0,
            withdraw_amount: parseFloat(row.withdraw_amount) || 0
          })
        }
      })
    }
    
    const groupedData = Array.from(dateMap.values())
    
    console.log('📊 [USC BP Customer Transactions] After grouping by date:', {
      originalRows: data?.length || 0,
      distinctDates: groupedData.length,
      expectedActiveDays: groupedData.length, // This should match Active Days from tier_usc_v1
      sampleDates: groupedData.slice(0, 5).map(d => d.date)
    })
    
    // If no grouped data found, try alternative query without month filter (in case month format is different)
    if (groupedData.length === 0) {
      console.log('⚠️ [USC BP Customer Transactions] No data found, trying alternative query...')
      
      let altQuery = supabase
        .from('blue_whale_usc')
        .select('date, line, unique_code, user_name, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount')
        .eq('userkey', userkey)
        .eq('year', parseInt(year))
        .eq('currency', 'USC')
        .gt('deposit_cases', 0) // Only transactions with deposits
        .order('date', { ascending: false })
        .limit(100) // Limit to avoid too much data
      
      if (userAllowedBrands && userAllowedBrands.length > 0) {
        altQuery = altQuery.in('line', userAllowedBrands)
      }
      
      const { data: altData, error: altError } = await altQuery
      
      if (!altError && altData && altData.length > 0) {
        console.log('✅ [USC BP Customer Transactions] Alternative query found data:', altData.length)
        // Filter by month name in the result
        const monthFiltered = altData.filter((row: any) => {
          const rowDate = new Date(row.date)
          return rowDate.getMonth() + 1 === monthNumber
        })
        
        if (monthFiltered.length > 0) {
          console.log('✅ [USC BP Customer Transactions] Month-filtered data:', monthFiltered.length)
          
          // Group by date for alternative query too
          const altDateMap = new Map<string, {
            date: string
            line: string
            unique_code: string
            user_name: string
            deposit_cases: number
            deposit_amount: number
            withdraw_cases: number
            withdraw_amount: number
          }>()
          
          monthFiltered.forEach((row: any) => {
            const date = String(row.date)
            const existing = altDateMap.get(date)
            
            if (existing) {
              existing.deposit_cases += parseInt(row.deposit_cases) || 0
              existing.deposit_amount += parseFloat(row.deposit_amount) || 0
              existing.withdraw_cases += parseInt(row.withdraw_cases) || 0
              existing.withdraw_amount += parseFloat(row.withdraw_amount) || 0
            } else {
              altDateMap.set(date, {
                date: date,
                line: row.line || '-',
                unique_code: row.unique_code || '-',
                user_name: row.user_name || '-',
                deposit_cases: parseInt(row.deposit_cases) || 0,
                deposit_amount: parseFloat(row.deposit_amount) || 0,
                withdraw_cases: parseInt(row.withdraw_cases) || 0,
                withdraw_amount: parseFloat(row.withdraw_amount) || 0
              })
            }
          })
          
          const altGroupedData = Array.from(altDateMap.values())
          
          // Use the grouped data
          const transactions = altGroupedData.map((row) => {
            const ggr = row.deposit_amount - row.withdraw_amount
            
            return {
              date: row.date,
              line: row.line,
              unique_code: row.unique_code,
              user_name: row.user_name,
              deposit_cases: row.deposit_cases,
              deposit_amount: row.deposit_amount,
              withdraw_cases: row.withdraw_cases,
              withdraw_amount: row.withdraw_amount,
              ggr: ggr
            }
          })
          
          return NextResponse.json({
            success: true,
            data: {
              transactions,
              totalTransactions: transactions.length,
              customer: transactions.length > 0 ? {
                unique_code: transactions[0].unique_code,
                user_name: transactions[0].user_name
              } : null,
              period: `${month} ${year}`
            }
          })
        }
      }
    }
    
    // Process grouped data and calculate GGR (1 row per date)
    const transactions = groupedData.map((row) => {
      const ggr = row.deposit_amount - row.withdraw_amount
      
      return {
        date: row.date,
        line: row.line,
        unique_code: row.unique_code,
        user_name: row.user_name,
        deposit_cases: row.deposit_cases,
        deposit_amount: row.deposit_amount,
        withdraw_cases: row.withdraw_cases,
        withdraw_amount: row.withdraw_amount,
        ggr: ggr
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        transactions,
        totalTransactions: transactions.length,
        customer: transactions.length > 0 ? {
          unique_code: transactions[0].unique_code,
          user_name: transactions[0].user_name
        } : null,
        period: `${month} ${year}`
      }
    })
    
  } catch (error) {
    console.error('❌ [USC BP Customer Transactions] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

