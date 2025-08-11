import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { currency, line, year, month, startDate, endDate, filterMode } = await request.json()

    console.log('📥 Exporting new_register data with filters:', { 
      currency, line, year, month, startDate, endDate, filterMode 
    })

    // Build query with same filters as data endpoint
    let query = supabase.from('new_register').select('*')

    if (currency && currency !== 'ALL') {
      query = query.filter('currency', 'eq', currency)
    }

    if (line && line !== 'ALL') {
      query = query.filter('line', 'eq', line)
    }

    if (year && year !== 'ALL') {
      query = query.filter('year', 'eq', parseInt(year))
    }

    if (filterMode === 'month' && month && month !== 'ALL') {
      query = query.filter('month', 'eq', month)
    } else if (filterMode === 'daterange' && startDate && endDate) {
      query = query.filter('date', 'gte', startDate).filter('date', 'lte', endDate)
    }

    const result = await query.order('date', { ascending: false })

    if (result.error) {
      console.error('❌ Export query error:', result.error)
      return NextResponse.json({ 
        error: 'Database error during export',
        message: result.error.message 
      }, { status: 500 })
    }

    const data = result.data || []
    console.log(`📊 Exporting ${data.length} new_register records`)

    if (data.length === 0) {
      return NextResponse.json({ 
        error: 'No data found for the selected filters' 
      }, { status: 404 })
    }

    // Convert to CSV
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10)
    const filterStr = [currency, line, year, month].filter(f => f && f !== 'ALL').join('_') || 'all'
    const filename = `new_register_data_${filterStr}_${timestamp}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('❌ Export error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during export' 
    }, { status: 500 })
  }
}
