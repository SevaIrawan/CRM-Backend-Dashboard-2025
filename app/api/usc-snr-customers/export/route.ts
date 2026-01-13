import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { line, year, month, tier, startDate, endDate, filterMode, statusFilter } = await request.json()

    // ✅ Get current user from request header for auto-filter by snr_account
    const userHeader = request.headers.get('x-user')
    let currentUsername: string | null = null
    if (userHeader) {
      try {
        const user = JSON.parse(userHeader)
        currentUsername = user.username || null
      } catch (e) {
        console.warn('⚠️ Could not parse user header')
      }
    }

    if (!currentUsername) {
      return NextResponse.json({
        error: 'Unauthorized - User not found'
      }, { status: 401 })
    }

    const finalStatusFilter = statusFilter || 'ALL'

    console.log('📥 [SNR Customers] Exporting data with filters:', {
      snr_account: currentUsername,
      line, year, month, tier, startDate, endDate, filterMode, statusFilter: finalStatusFilter
    })

    // Build query - ✅ AUTO-FILTER by snr_account
    let query = supabase
      .from('blue_whale_usc')
      .select('userkey, user_name, unique_code, update_unique_code, date, line, year, month, first_deposit_date, days_inactive, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, add_bonus, deduct_bonus, net_profit, tier_name, snr_handler')
      .eq('snr_account', currentUsername) // ✅ AUTO-FILTER by snr_account

    // Apply brand filter
    if (line && line !== 'ALL') {
      query = query.filter('line', 'eq', line)
    }

    if (year && year !== 'ALL') {
      query = query.filter('year', 'eq', parseInt(year))
    }

    if (filterMode === 'month' && month && month !== 'ALL') {
      query = query.filter('month', 'eq', month)
    }

    if (filterMode === 'daterange' && startDate && endDate) {
      query = query
        .filter('date', 'gte', startDate)
        .filter('date', 'lte', endDate)
    }

    if (tier && tier.trim() && tier !== 'ALL') {
      query = query.filter('tier_name', 'eq', tier)
    }

    const result = await query
      .order('date', { ascending: false })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('userkey', { ascending: true })

    if (result.error) {
      console.error('❌ Export query error:', result.error)
      return NextResponse.json({ 
        error: 'Database error during export',
        message: result.error.message 
      }, { status: 500 })
    }

    const rawData = result.data || []
    console.log(`📊 [SNR Customers Export] Raw data: ${rawData.length} records`)

    // ✅ Fetch previous month data and MIN dates
    const previousMonthData = await fetchPreviousMonthData(line, year, month, currentUsername)
    const userMinDates = await fetchUserMinDates(rawData, line, currentUsername)

    // Process data
    const processedData = processCustomerRetentionData(rawData, previousMonthData, month, year, userMinDates)
    console.log(`📊 [SNR Customers Export] Processed data: ${processedData.length} users`)

    // ✅ Apply status filter
    const filteredData = finalStatusFilter === 'ALL' 
      ? processedData 
      : processedData.filter(user => user.status === finalStatusFilter)
    
    console.log(`📊 [SNR Customers Export] After status filter (${finalStatusFilter}): ${filteredData.length} users`)

    if (filteredData.length === 0) {
      return NextResponse.json({ 
        error: 'No data found for the selected filters' 
      }, { status: 404 })
    }

    // Convert to CSV
    const retentionColumns = [
      'line', 'user_name', 'unique_code', 'first_deposit_date', 'last_deposit_date',
      'days_inactive', 'active_days', 'atv', 'pf', 'deposit_cases', 'deposit_amount',
      'withdraw_cases', 'withdraw_amount', 'bonus', 'net_profit', 'winrate', 'wd_rate',
      'tier_name', 'status', 'snr_handler'
    ]

    const csvHeader = retentionColumns.map(col => col.toUpperCase().replace(/_/g, ' ')).join(',')
    
    const csvRows = filteredData.map(row => {
      return retentionColumns.map(col => {
        const value = row[col]
        if (value === null || value === undefined || value === '') {
          return '-'
        }
        if (typeof value === 'number') {
          if (Number.isInteger(value)) {
            return value.toString()
          }
          return value.toFixed(2)
        }
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')
    const csvWithBOM = '\ufeff' + csvContent

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `usc_snr_customers_export_${timestamp}.csv`

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('❌ Error exporting SNR customers data:', error)
    return NextResponse.json({ 
      error: 'Internal server error during export' 
    }, { status: 500 })
  }
}

// Helper functions (same as data route)
async function fetchUserMinDates(rawData: any[], line: string | null, snrAccount: string): Promise<Map<string, string>> {
  try {
    const usersWithNullFirstDeposit = rawData
      .filter((row: any) => !row.first_deposit_date || row.first_deposit_date === null || row.first_deposit_date === '')
      .map((row: any) => row.userkey)
    
    const uniqueUsers = Array.from(new Set(usersWithNullFirstDeposit))
    
    if (uniqueUsers.length === 0) {
      return new Map()
    }
    
    let minDateQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, date')
      .eq('snr_account', snrAccount)
      .in('userkey', uniqueUsers)
      .gt('deposit_cases', 0)
      .order('date', { ascending: true })
    
    if (line && line !== 'ALL') {
      minDateQuery = minDateQuery.eq('line', line)
    }
    
    const { data: minDateData, error: minDateError } = await minDateQuery
    
    if (minDateError) {
      return new Map()
    }
    
    const userMinDateMap = new Map<string, string>()
    minDateData?.forEach((row: any) => {
      if (!userMinDateMap.has(row.userkey)) {
        userMinDateMap.set(row.userkey, row.date)
      }
    })
    
    return userMinDateMap
  } catch (error) {
    return new Map()
  }
}

async function fetchPreviousMonthData(line: string | null, year: string | null, month: string | null, snrAccount: string): Promise<Set<string>> {
  if (!month || month === 'ALL') return new Set<string>()
  
  try {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthIndex = monthNames.indexOf(month)
    
    if (currentMonthIndex === -1) return new Set<string>()
    
    let prevMonthIndex = currentMonthIndex - 1
    let prevYear = year
    
    if (prevMonthIndex < 0) {
      prevMonthIndex = 11
      prevYear = year && year !== 'ALL' ? (parseInt(year) - 1).toString() : year
    }
    
    const prevMonth = monthNames[prevMonthIndex]
    
    let prevQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, deposit_cases')
      .eq('snr_account', snrAccount)
      .eq('month', prevMonth)
      .gt('deposit_cases', 0)
    
    if (prevYear && prevYear !== 'ALL') {
      prevQuery = prevQuery.eq('year', parseInt(prevYear))
    }
    
    if (line && line !== 'ALL') {
      prevQuery = prevQuery.eq('line', line)
    }
    
    const { data: prevData, error: prevError } = await prevQuery
    
    if (prevError) {
      return new Set<string>()
    }
    
    return new Set<string>(prevData?.map((row: any) => row.userkey) || [])
  } catch (error) {
    return new Set<string>()
  }
}

function processCustomerRetentionData(rawData: any[], previousMonthUsers: Set<string>, selectedMonth: string | null, selectedYear: string | null, userMinDates: Map<string, string>) {
  const filteredData = rawData.filter(row => row.deposit_cases > 0)
  const userGroups = new Map<string, any>()
  
  filteredData.forEach(row => {
    const userKey = row.userkey
    
    if (!userGroups.has(userKey)) {
      userGroups.set(userKey, {
        userkey: row.userkey,
        line: row.line,
        user_name: row.user_name,
        unique_code: row.update_unique_code || row.unique_code,
        first_deposit_date: row.first_deposit_date || null,
        last_deposit_date: row.date,
        days_inactive: row.days_inactive || 0,
        active_days: 0,
        deposit_cases: 0,
        deposit_amount: 0,
        withdraw_cases: 0,
        withdraw_amount: 0,
        bonus: 0,
        net_profit: 0,
        activeDates: new Set(),
        brands: new Set([row.line]),
        tier_name: row.tier_name || '',
        snr_handler: row.snr_handler || null
      })
    }
    
    const userData = userGroups.get(userKey)
    
    if (row.line) {
      userData.brands.add(row.line)
    }
    
    if (row.tier_name) {
      userData.tier_name = row.tier_name
    }
    
    if (row.first_deposit_date && userData.first_deposit_date) {
      if (new Date(row.first_deposit_date) < new Date(userData.first_deposit_date)) {
        userData.first_deposit_date = row.first_deposit_date
      }
    } else if (row.first_deposit_date && !userData.first_deposit_date) {
      userData.first_deposit_date = row.first_deposit_date
    }
    
    if (new Date(row.date) > new Date(userData.last_deposit_date)) {
      userData.last_deposit_date = row.date
      userData.days_inactive = row.days_inactive || 0
    }
    
    if (row.deposit_cases > 0) {
      userData.activeDates.add(row.date)
    }
    
    userData.deposit_cases += Number(row.deposit_cases) || 0
    userData.deposit_amount += Number(row.deposit_amount) || 0
    userData.withdraw_cases += Number(row.withdraw_cases) || 0
    userData.withdraw_amount += Number(row.withdraw_amount) || 0
    const rowBonus = Number(row.bonus) || 0
    const rowAddBonus = Number(row.add_bonus) || 0
    const rowDeductBonus = Number(row.deduct_bonus) || 0
    userData.bonus += rowBonus + rowAddBonus - rowDeductBonus
    userData.net_profit += Number(row.net_profit) || 0
    
    if (row.snr_handler) {
      userData.snr_handler = row.snr_handler
    }
  })
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December']
  const selectedMonthIndex = selectedMonth ? monthNames.indexOf(selectedMonth) : -1
  const canCalculateStatus = selectedMonthIndex !== -1 && selectedYear && selectedYear !== 'ALL'
  
  let selectedYearMonth = ''
  if (canCalculateStatus) {
    const selectedMonthNumber = (selectedMonthIndex + 1).toString().padStart(2, '0')
    selectedYearMonth = `${selectedYear}-${selectedMonthNumber}`
  }
  
  const processedData = Array.from(userGroups.values()).map(user => {
    if (!user.first_deposit_date || user.first_deposit_date === null || user.first_deposit_date === '') {
      const globalMinDate = userMinDates.get(user.userkey)
      if (globalMinDate) {
        user.first_deposit_date = globalMinDate
      }
    }
    
    let status = 'N/A'
    if (canCalculateStatus) {
      if (user.first_deposit_date && user.first_deposit_date.startsWith(selectedYearMonth)) {
        status = 'NEW DEPOSITOR'
      } else if (previousMonthUsers.has(user.userkey)) {
        status = 'RETENTION'
      } else {
        status = 'REACTIVATION'
      }
    }
    
    const brandList = Array.from(user.brands).sort().join(', ')
    user.line = brandList
    
    const active_days = user.activeDates.size
    const atv = user.deposit_cases > 0 ? user.deposit_amount / user.deposit_cases : 0
    const pf = active_days > 0 ? user.deposit_cases / active_days : 0
    const ggr = user.deposit_amount - user.withdraw_amount
    const winrate = user.deposit_amount > 0 ? ggr / user.deposit_amount : 0
    const wd_rate = user.deposit_cases > 0 ? user.withdraw_cases / user.deposit_cases : 0
    
    return {
      ...user,
      active_days,
      atv,
      pf,
      winrate,
      wd_rate,
      tier_name: user.tier_name || '',
      status,
      snr_handler: user.snr_handler || null,
      activeDates: undefined,
      brands: undefined
    }
  })
  
  processedData.sort((a, b) => {
    if (b.active_days !== a.active_days) {
      return b.active_days - a.active_days
    }
    if (b.net_profit !== a.net_profit) {
      return b.net_profit - a.net_profit
    }
    return (a.userkey || '').localeCompare(b.userkey || '')
  })
  
  return processedData
}
