import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const line = searchParams.get('line')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const search = searchParams.get('search') || ''
  const searchColumn = searchParams.get('searchColumn') || 'update_unique_code'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')

  // Get user's allowed brands from request header
  const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
  const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

  try {
    console.log('📊 Fetching customer assignment data:', { 
      line, year, month, search, searchColumn, page, limit,
      user_allowed_brands: userAllowedBrands
    })

    if (!year || !month) {
      return NextResponse.json({
        success: false,
        error: 'Year and Month are required'
      }, { status: 400 })
    }

    // Month is already string (January, February, etc) from slicer
    const monthName = month

    console.log('📊 [Customer Assignment API] Using month:', { month, monthName })

    // Build base query
    let query = supabase
      .from('blue_whale_usc')
      .select('user_unique, line, update_unique_code, traffic, last_deposit_date, date, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, snr_account, snr_handler, tier_name')
      .eq('currency', 'USC')
      .eq('year', parseInt(year))
      .eq('month', monthName) // ✅ Use month name (string) directly from slicer

    // Apply line filter
    if (line && line !== 'ALL') {
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      query = query.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      query = query.in('line', userAllowedBrands)
    }

    // Note: Search will be applied after aggregation

    // Fetch all data (no limit for aggregation)
    const { data: rawData, error } = await query

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: error.message
      }, { status: 500 })
    }

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0,
          recordsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        }
      })
    }

    // Group by user_unique and aggregate
    const userMap = new Map<string, any>()

    rawData.forEach((row: any) => {
      const key = row.user_unique

      if (!userMap.has(key)) {
        // Initialize user record
        userMap.set(key, {
          userkey: `${row.user_unique}_${row.line}`, // For reference
          user_unique: key,
          line: row.line,
          update_unique_code: row.update_unique_code || '',
          traffic: row.traffic || '',
          last_deposit_date: row.last_deposit_date || null,
          activeDates: new Set<string>(), // For Days Active calculation
          deposit_cases: 0,
          deposit_amount: 0,
          withdraw_cases: 0,
          withdraw_amount: 0,
          snr_account: row.snr_account || null,
          snr_handler: row.snr_handler || null,
          tier_name: row.tier_name || null
        })
      }

      const userRecord = userMap.get(key)!

      // Count Days Active: unique date user_unique where deposit_cases > 0
      if ((row.deposit_cases || 0) > 0 && row.date) {
        userRecord.activeDates.add(row.date)
      }

      // Sum metrics
      userRecord.deposit_cases += (row.deposit_cases || 0)
      userRecord.deposit_amount += (row.deposit_amount || 0)
      userRecord.withdraw_cases += (row.withdraw_cases || 0)
      userRecord.withdraw_amount += (row.withdraw_amount || 0)

      // Keep latest SNR assignment (if multiple rows)
      if (row.snr_account) {
        userRecord.snr_account = row.snr_account
      }
      if (row.snr_handler) {
        userRecord.snr_handler = row.snr_handler
      }
    })

    // Convert Map to Array and calculate days_active
    let aggregatedData = Array.from(userMap.values()).map((user: any) => {
      const daysActive = user.activeDates ? user.activeDates.size : 0
      const ggr = user.deposit_amount - user.withdraw_amount
      
      return {
        userkey: user.userkey,
        user_unique: user.user_unique,
        line: user.line,
        update_unique_code: user.update_unique_code,
        traffic: user.traffic,
        last_deposit_date: user.last_deposit_date,
        days_active: daysActive,
        deposit_cases: user.deposit_cases,
        deposit_amount: user.deposit_amount,
        withdraw_cases: user.withdraw_cases,
        withdraw_amount: user.withdraw_amount,
        ggr: ggr,
        snr_account: user.snr_account,
        snr_handler: user.snr_handler,
        tier_name: user.tier_name
      }
    })

    // Apply search filter on aggregated data
    if (search && search.trim()) {
      if (searchColumn === 'update_unique_code') {
        aggregatedData = aggregatedData.filter((row: any) => 
          row.update_unique_code?.toLowerCase().includes(search.toLowerCase())
        )
      } else if (searchColumn === 'userkey') {
        // userkey is combination of user_unique + line
        aggregatedData = aggregatedData.filter((row: any) => 
          row.userkey?.toLowerCase().includes(search.toLowerCase()) ||
          row.user_unique?.toLowerCase().includes(search.toLowerCase())
        )
      }
    }

    // Sort by line, then by update_unique_code
    aggregatedData.sort((a: any, b: any) => {
      if (a.line !== b.line) {
        return (a.line || '').localeCompare(b.line || '')
      }
      return (a.update_unique_code || '').localeCompare(b.update_unique_code || '')
    })

    // Pagination
    const totalRecords = aggregatedData.length
    const totalPages = Math.ceil(totalRecords / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = aggregatedData.slice(startIndex, endIndex)

    console.log(`📊 Customer assignment data: ${totalRecords} total, ${paginatedData.length} in page ${page}`)

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error: any) {
    console.error('❌ Error fetching customer assignment data:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

