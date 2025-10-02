import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { currency, line, year, month, startDate, endDate, filterMode } = await request.json()

    console.log('📊 Exporting deposit_daily data to CSV with filters:', { 
      currency, line, year, month, startDate, endDate, filterMode 
    })

    // Build query - same as data.js
    let query = supabase.from('deposit_daily').select('*')

    // Add filters based on selections
    if (currency && currency !== 'ALL') {
      query = query.filter('currency', 'eq', currency)
    }

    if (line && line !== 'ALL') {
      query = query.filter('line', 'eq', line)
    }

    if (year && year !== 'ALL') {
      query = query.filter('year', 'eq', parseInt(year))
    }

    // Handle month vs date range filtering
    if (filterMode === 'month' && month && month !== 'ALL') {
      query = query.filter('month', 'eq', parseInt(month))
    } else if (filterMode === 'daterange' && startDate && endDate) {
      query = query.filter('date', 'gte', startDate).filter('date', 'lte', endDate)
    }

    // Order by date descending with improved sorting
    query = query.order('date', { ascending: false })
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    console.log('🔍 Executing export query...')
    const result = await query

    if (result.error) {
      console.error('❌ Supabase query error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while exporting data',
        message: result.error.message 
      }, { status: 500 })
    }

    if (!result.data || result.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data found for the selected filters'
      }, { status: 400 })
    }

    // Create CSV content
    const headers = Object.keys(result.data[0])
    const csvContent = [
      headers.join(','),
      ...result.data.map(row => 
        headers.map(header => {
          const value = row[header]
          // Handle commas in string values
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`
          }
          return value || ''
        }).join(',')
      )
    ].join('\n')

    // Create filename with timestamp and filters
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '')
    const filterSuffix = [
      currency && currency !== 'ALL' ? currency : '',
      line && line !== 'ALL' ? line : '',
      year && year !== 'ALL' ? year : '',
      filterMode === 'month' && month && month !== 'ALL' ? `Month${month}` : '',
      filterMode === 'daterange' && startDate && endDate ? `${startDate}_${endDate}` : ''
    ].filter(Boolean).join('_')
    
    const filename = `Deposit_Daily_${timestamp}${filterSuffix ? '_' + filterSuffix : ''}.csv`

    console.log(`✅ CSV file generated: ${filename} with ${result.data.length} records`)

    // Create and return CSV file
    const csvBuffer = Buffer.from(csvContent, 'utf-8')
    
    return new NextResponse(csvBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': csvBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('❌ Error exporting deposit_daily data:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Database error while exporting data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
