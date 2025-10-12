import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { line, year, month, startDate, endDate, filterMode } = await request.json()

    console.log('📥 Exporting blue_whale_myr customer retention data with filters:', {
      line, year, month, startDate, endDate, filterMode
    })

    // Build query with same filters as data endpoint (no currency filter needed)
    let query = supabase.from('blue_whale_myr').select('*')

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

    // Get all data for processing
    const result = await query.order('date', { ascending: false })

    if (result.error) {
      console.error('❌ Export query error:', result.error)
      return NextResponse.json({ 
        error: 'Database error during export',
        message: result.error.message 
      }, { status: 500 })
    }

    const rawData = result.data || []
    console.log(`📊 Raw data for export: ${rawData.length} records`)

    // Process data for customer retention (aggregate per user)
    const processedData = processCustomerRetentionData(rawData)
    console.log(`📊 Processed customer retention data: ${processedData.length} users`)

    if (processedData.length === 0) {
      return NextResponse.json({ 
        error: 'No customer retention data found for the selected filters' 
      }, { status: 404 })
    }

    // Convert to CSV - only show customer retention columns
    const retentionColumns = [
      'user_name',
      'unique_code',
      'last_deposit_date',
      'active_days',
      'deposit_cases',
      'deposit_amount',
      'withdraw_cases',
      'withdraw_amount',
      'bonus',
      'net_profit'
    ]

    // Create CSV header
    const csvHeader = retentionColumns.map(col => col.toUpperCase().replace(/_/g, ' ')).join(',')
    
    // Create CSV rows
    const csvRows = processedData.map(row => {
      return retentionColumns.map(col => {
        const value = (row as any)[col]
        // Format numbers and handle null values
        if (value === null || value === undefined || value === '') {
          return '-'
        }
        if (typeof value === 'number') {
          // For integers, return as-is (no decimal)
          if (Number.isInteger(value)) {
            return value.toString()
          }
          // For decimals, return with 2 decimal places (no comma separator)
          return value.toFixed(2)
        }
        // Escape commas and quotes in string values
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    })

    // Combine header and rows
    const csvContent = [csvHeader, ...csvRows].join('\n')
    
    // Add BOM (Byte Order Mark) for proper UTF-8 encoding in Excel
    const csvWithBOM = '\ufeff' + csvContent

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `myr_customer_retention_export_${timestamp}.csv`

    // Return CSV file
    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('❌ Error exporting customer retention data:', error)
    return NextResponse.json({ 
      error: 'Internal server error during export' 
    }, { status: 500 })
  }
}

function processCustomerRetentionData(rawData: any[]) {
  // Filter only users with deposit_cases > 0
  const filteredData = rawData.filter(row => row.deposit_cases > 0)
  
  // Group by userkey (unique_code) and aggregate data
  const userGroups = new Map<string, any>()
  
  filteredData.forEach(row => {
    const userKey = row.unique_code
    
    if (!userGroups.has(userKey)) {
      userGroups.set(userKey, {
        user_name: row.user_name,
        unique_code: row.unique_code,
        last_deposit_date: row.date,
        activeDates: new Set(),
        deposit_cases: 0,
        deposit_amount: 0,
        withdraw_cases: 0,
        withdraw_amount: 0,
        bonus: 0,
        net_profit: 0
      })
    }
    
    const userData = userGroups.get(userKey)
    
    // Update last deposit date (MAX date)
    if (new Date(row.date) > new Date(userData.last_deposit_date)) {
      userData.last_deposit_date = row.date
    }
    
    // Count active days (unique dates with deposit_cases > 0)
    if (row.deposit_cases > 0) {
      userData.activeDates.add(row.date)
    }
    
    // Aggregate all transactions
    userData.deposit_cases += row.deposit_cases || 0
    userData.deposit_amount += row.deposit_amount || 0
    userData.withdraw_cases += row.withdraw_cases || 0
    userData.withdraw_amount += row.withdraw_amount || 0
    userData.bonus += row.bonus || 0
    userData.net_profit += row.net_profit || 0
  })
  
  // Convert to array and calculate active_days - only include retention columns
  const processedData = Array.from(userGroups.values()).map(user => ({
    user_name: user.user_name,
    unique_code: user.unique_code,
    last_deposit_date: user.last_deposit_date,
    active_days: user.activeDates.size,
    deposit_cases: user.deposit_cases,
    deposit_amount: user.deposit_amount,
    withdraw_cases: user.withdraw_cases,
    withdraw_amount: user.withdraw_amount,
    bonus: user.bonus,
    net_profit: user.net_profit
  }))
  
  // Sort by active_days DESC, net_profit DESC
  processedData.sort((a, b) => {
    if (b.active_days !== a.active_days) {
      return b.active_days - a.active_days
    }
    return b.net_profit - a.net_profit
  })
  
  return processedData
}
