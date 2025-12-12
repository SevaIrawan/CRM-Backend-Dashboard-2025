import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { line, year, month, statusFilter } = await request.json()

    // ✅ VALIDATION: Month and Year are REQUIRED
    if (!month || month === 'ALL') {
      return NextResponse.json({
        error: 'Month filter is required for churn member export',
        message: 'Please select a specific month to export churn members'
      }, { status: 400 })
    }

    if (!year || year === 'ALL') {
      return NextResponse.json({
        error: 'Year filter is required for churn member export',
        message: 'Please select a specific year to export churn members'
      }, { status: 400 })
    }

    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    let userAllowedBrands: string[] | null = null
    try {
      userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null
    } catch (e) {
      console.warn('⚠️ Failed to parse user allowed brands header:', e)
      userAllowedBrands = null
    }

    console.log('📥 Exporting USC churn member data with filters:', { 
      line, year, month,
      user_allowed_brands: userAllowedBrands
    })

    // ✅ Calculate Previous Month - FOLLOW CUSTOMER RETENTION PATTERN
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthIndex = monthNames.indexOf(month)
    
    if (currentMonthIndex === -1) {
      return NextResponse.json({
        error: 'Invalid month',
        message: `Invalid month value: ${month}`
      }, { status: 400 })
    }
    
    let prevMonthIndex = currentMonthIndex - 1
    let prevYear = year
    const yearInt = parseInt(year)
    
    if (prevMonthIndex < 0) {
      prevMonthIndex = 11 // December
      prevYear = (yearInt - 1).toString()
    }
    
    const prevMonth = monthNames[prevMonthIndex]
    const prevYearInt = parseInt(prevYear)

    // ✅ STEP 1: Get Previous Month Active Users
    let prevQuery = supabase
      .from('blue_whale_usc')
      .select('userkey')
      .eq('currency', 'USC')
      .eq('year', prevYearInt)
      .eq('month', prevMonth)
      .gt('deposit_cases', 0)

    if (line && line !== 'ALL') {
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      prevQuery = prevQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      prevQuery = prevQuery.in('line', userAllowedBrands)
    }

    const { data: prevData, error: prevError } = await prevQuery

    if (prevError) {
      console.error('❌ Error fetching previous month users:', prevError)
      return NextResponse.json({
        error: 'Database error',
        message: prevError.message
      }, { status: 500 })
    }

    // ✅ STEP 2: Get Current Month Active Users
    let currentQuery = supabase
      .from('blue_whale_usc')
      .select('userkey')
      .eq('currency', 'USC')
      .eq('year', parseInt(year))
      .eq('month', month)
      .gt('deposit_cases', 0)

    // Apply brand filter with user permission check
    if (line && line !== 'ALL') {
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      currentQuery = currentQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      currentQuery = currentQuery.in('line', userAllowedBrands)
    }

    const { data: currentData, error: currentError } = await currentQuery

    if (currentError) {
      console.error('❌ Error fetching current month users:', currentError)
      return NextResponse.json({
        error: 'Database error',
        message: currentError.message
      }, { status: 500 })
    }

    // ✅ STEP 3: Calculate Churned Users
    const prevUserKeys = new Set(prevData?.map(row => row.userkey).filter(Boolean) || [])
    const currentUserKeys = new Set(currentData?.map(row => row.userkey).filter(Boolean) || [])
    const churnedUserKeys = Array.from(prevUserKeys).filter(userkey => !currentUserKeys.has(userkey))

    if (churnedUserKeys.length === 0) {
      return NextResponse.json({
        error: 'No churn members found for the selected filters'
      }, { status: 404 })
    }

    // ✅ STEP 4: Fetch Full Details untuk Churned Users (batch fetch)
    const batchSize = 5000
    let allDetailData: any[] = []
    let offset = 0
    let hasMore = true

    console.log('📊 Starting batch export for churn members...')

    while (hasMore && offset < churnedUserKeys.length) {
      const batchUserKeys = churnedUserKeys.slice(offset, offset + batchSize)
      
      let detailQuery = supabase
        .from('blue_whale_usc')
        .select('*')
        .eq('currency', 'USC')
        .eq('year', prevYearInt)
        .eq('month', prevMonth)
        .gt('deposit_cases', 0)
        .in('userkey', batchUserKeys)

      // Apply brand filter with user permission check
      if (line && line !== 'ALL') {
        if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
          return NextResponse.json({
            error: 'Unauthorized',
            message: `You do not have access to brand "${line}"`
          }, { status: 403 })
        }
        detailQuery = detailQuery.eq('line', line)
      } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
        detailQuery = detailQuery.in('line', userAllowedBrands)
      }

      // ✅ CRITICAL: Use deterministic ordering to ensure consistent batch fetching
      // Without this, rows with same date can be fetched in different order, causing inconsistent results
      const { data: batchData, error: batchError } = await detailQuery
        .order('date', { ascending: false })
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('userkey', { ascending: true }) // ✅ Additional tie-breaker for 100% deterministic ordering

      if (batchError) {
        console.error('❌ Export batch query error:', batchError)
        return NextResponse.json({
          error: 'Database error during export',
          message: batchError.message
        }, { status: 500 })
      }

      if (batchData) {
        allDetailData = [...allDetailData, ...batchData]
      }

      console.log(`📊 Batch ${Math.floor(offset / batchSize) + 1}: ${batchData?.length || 0} records (Total: ${allDetailData.length})`)

      hasMore = offset + batchSize < churnedUserKeys.length
      offset += batchSize
    }

    const detailData = allDetailData
    console.log(`📊 Raw churn member records found: ${detailData?.length || 0}`)

    // ✅ STEP 4.5: Fetch MIN dates untuk users dengan first_deposit_date NULL (like Customer Retention)
    const userMinDates = await fetchUserMinDates(detailData, line, userAllowedBrands)

    // ✅ STEP 5: Aggregate by userkey (same logic as data endpoint)
    const userMap = new Map<string, any>()

    allDetailData.forEach((row: any) => {
      const key = row.userkey

      if (!userMap.has(key)) {
        userMap.set(key, {
          userkey: row.userkey, // ✅ Store userkey for consistency with data route
          line: row.line,
          user_name: row.user_name,
          unique_code: row.update_unique_code || row.unique_code,  // ✅ Use update_unique_code, fallback to unique_code
          traffic: row.traffic,
          first_deposit_date: row.first_deposit_date || null,
          last_deposit_date: row.last_deposit_date,
          days_active: 0,
          deposit_cases: 0,
          deposit_amount: 0,
          withdraw_cases: 0,
          withdraw_amount: 0,
          net_profit: 0
        })
      }

      const userRecord = userMap.get(key)

      if ((row.deposit_cases || 0) > 0) {
        userRecord.days_active += 1
      }

      userRecord.deposit_cases += (row.deposit_cases || 0)
      userRecord.deposit_amount += (row.deposit_amount || 0)
      userRecord.withdraw_cases += (row.withdraw_cases || 0)
      userRecord.withdraw_amount += (row.withdraw_amount || 0)
      userRecord.net_profit += (row.net_profit || 0)

      // Update first_deposit_date to earliest (MIN date)
      if (row.first_deposit_date) {
        if (!userRecord.first_deposit_date) {
          userRecord.first_deposit_date = row.first_deposit_date
        } else if (new Date(row.first_deposit_date) < new Date(userRecord.first_deposit_date)) {
          userRecord.first_deposit_date = row.first_deposit_date
        }
      }

      if (row.last_deposit_date && (!userRecord.last_deposit_date || row.last_deposit_date > userRecord.last_deposit_date)) {
        userRecord.last_deposit_date = row.last_deposit_date
      }
    })

    // ✅ STEP 5.5: Apply fallback MIN date untuk users dengan first_deposit_date NULL (like Customer Retention)
    userMap.forEach((user, userkey) => {
      if (!user.first_deposit_date || user.first_deposit_date === null || user.first_deposit_date === '') {
        const globalMinDate = userMinDates.get(userkey)
        if (globalMinDate) {
          user.first_deposit_date = globalMinDate
          console.log(`🔄 [Export] User ${userkey}: first_deposit_date NULL → fallback to global MIN date (${globalMinDate})`)
        }
      }
    })

    // ✅ STEP 6: Calculate days_inactive and STATUS
    const currentDate = new Date()
    
    // Calculate prev month year-month string for STATUS (e.g., "2025-10" for October 2025)
    // Use prevMonthIndex from line 50 (already calculated)
    const prevMonthNumber = (prevMonthIndex + 1).toString().padStart(2, '0')
    const prevYearMonth = `${prevYearInt}-${prevMonthNumber}`
    
    const aggregatedData = Array.from(userMap.values()).map((user: any) => {
      let daysInactive = 0
      if (user.last_deposit_date) {
        const lastDepositDate = new Date(user.last_deposit_date)
        const diffTime = currentDate.getTime() - lastDepositDate.getTime()
        daysInactive = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      }

      // ✅ Calculate STATUS: NEW MEMBER or OLD MEMBER
      let status = 'OLD MEMBER' // Default
      if (user.first_deposit_date) {
        // Check if first_deposit_date dalam prev month
        if (user.first_deposit_date.startsWith(prevYearMonth)) {
          status = 'NEW MEMBER'
        }
      }

      // ✅ Calculate ATV (Average Transaction Value) = deposit_amount / deposit_cases
      // Churned members PASTI punya deposit_cases > 0 (karena aktif di previous month)
      const atv = user.deposit_cases > 0 ? user.deposit_amount / user.deposit_cases : 0

      // ✅ Calculate PF (Play Frequency) = deposit_cases / days_active
      // Churned members PASTI punya days_active > 0 (karena aktif di previous month)
      const pf = user.days_active > 0 ? user.deposit_cases / user.days_active : 0

      return {
        ...user,
        days_inactive: daysInactive,
        status: status,
        atv: atv,
        pf: pf
      }
    })

    // ✅ STEP 6.5: Apply Status Filter (consistent with data route)
    const finalStatusFilter = statusFilter || 'ALL'
    const filteredData = finalStatusFilter === 'ALL' 
      ? aggregatedData 
      : aggregatedData.filter(user => user.status === finalStatusFilter)
    
    console.log(`📊 Export completed: ${filteredData.length} USC churn member records${finalStatusFilter !== 'ALL' ? ` (filtered by: ${finalStatusFilter})` : ''}`)

    // ✅ STEP 6.6: Sort data for deterministic ordering (match data route pattern)
    // Sort by days_active DESC, net_profit DESC, then userkey ASC for consistency
    filteredData.sort((a, b) => {
      if (b.days_active !== a.days_active) {
        return b.days_active - a.days_active
      }
      if (b.net_profit !== a.net_profit) {
        return b.net_profit - a.net_profit
      }
      // ✅ Additional sorting for consistency (match Member Report pattern)
      return (a.userkey || '').localeCompare(b.userkey || '')
    })

    // ✅ STEP 7: Convert to CSV
    const columnOrder = [
      'line',
      'user_name',
      'unique_code',
      'traffic',
      'first_deposit_date',
      'last_deposit_date',
      'days_inactive',
      'days_active',
      'atv',
      'pf',
      'deposit_cases',
      'deposit_amount',
      'withdraw_cases',
      'withdraw_amount',
      'net_profit',
      'status'
    ]

    // Build CSV header with short names
    const headerMap: { [key: string]: string } = {
      'deposit_cases': 'DC',
      'deposit_amount': 'DA',
      'withdraw_cases': 'WC',
      'withdraw_amount': 'WA',
      'first_deposit_date': 'FDD',
      'last_deposit_date': 'LDD',
      'atv': 'ATV',
      'pf': 'PF'
    }
    const headers = columnOrder.map(col => headerMap[col] || col.toUpperCase().replace(/_/g, ' '))
    const csvRows = [headers.join(',')]

    // Build CSV rows
    filteredData.forEach((row: any) => {
      const values = columnOrder.map(col => {
        const value = row[col]
        if (value === null || value === undefined || value === '') {
          return '-'
        }
        if (typeof value === 'number') {
          // ✅ ATV dan PF: Always 2 decimal format
          if (col === 'atv' || col === 'pf') {
            return value.toFixed(2)
          }
          if (Number.isInteger(value)) {
            return value.toString()
          } else {
            return value.toFixed(2)
          }
        }
        // Escape commas and quotes in strings
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      csvRows.push(values.join(','))
    })

    const csvContent = csvRows.join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="usc_churn_member_${year}_${month}_${line || 'ALL'}_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('❌ Error exporting USC churn member data:', error)
    return NextResponse.json({
      error: 'Internal server error during export'
    }, { status: 500 })
  }
}

// ✅ Fetch MIN transaction dates untuk users dengan first_deposit_date NULL (like Customer Retention)
async function fetchUserMinDates(rawData: any[], line: string | null, userAllowedBrands: string[] | null): Promise<Map<string, string>> {
  try {
    // Find users dengan first_deposit_date NULL
    const usersWithNullFirstDeposit = rawData
      .filter((row: any) => !row.first_deposit_date || row.first_deposit_date === null || row.first_deposit_date === '')
      .map((row: any) => row.userkey)
    
    const uniqueUsers = Array.from(new Set(usersWithNullFirstDeposit))
    
    if (uniqueUsers.length === 0) {
      console.log('✅ [USC Churn Member Export] All users have valid first_deposit_date, no MIN date fetch needed')
      return new Map()
    }
    
    console.log(`🔍 [USC Churn Member Export] Fetching MIN dates for ${uniqueUsers.length} users with NULL first_deposit_date`)
    
    // Fetch MIN date untuk each user dari ALL transactions (no month filter)
    let minDateQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, date')
      .eq('currency', 'USC')
      .in('userkey', uniqueUsers)
      .gt('deposit_cases', 0)
      .order('date', { ascending: true })
    
    // Apply brand filter
    if (line && line !== 'ALL') {
      minDateQuery = minDateQuery.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      minDateQuery = minDateQuery.in('line', userAllowedBrands)
    }
    
    const { data: minDateData, error: minDateError } = await minDateQuery
    
    if (minDateError) {
      console.error('❌ [USC Churn Member Export] Error fetching MIN dates:', minDateError)
      return new Map()
    }
    
    // Build Map: userkey -> MIN date
    const userMinDateMap = new Map<string, string>()
    minDateData?.forEach((row: any) => {
      if (!userMinDateMap.has(row.userkey)) {
        userMinDateMap.set(row.userkey, row.date)
      }
    })
    
    console.log(`📊 [USC Churn Member Export] Fetched MIN dates for ${userMinDateMap.size} users`)
    
    return userMinDateMap
  } catch (error) {
    console.error('❌ [USC Churn Member Export] Error in fetchUserMinDates:', error)
    return new Map()
  }
}
