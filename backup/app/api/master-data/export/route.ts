import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { currency, line, year, month, startDate, endDate, filterMode } = body

    console.log('📊 Exporting master_data_circulation with filters:', { 
      currency, line, year, month, startDate, endDate, filterMode 
    })

    // Build query for export
    let exportQuery = supabase.from('master_data_circulation').select('*')

    // Add filters based on selections
    if (currency && currency !== 'ALL') {
      exportQuery = exportQuery.filter('currency', 'eq', currency)
    }

    if (line && line !== 'ALL') {
      exportQuery = exportQuery.filter('line', 'eq', line)
    }

    if (year && year !== 'ALL') {
      exportQuery = exportQuery.filter('year', 'eq', parseInt(year))
    }

    // Handle month vs date range filtering
    if (filterMode === 'month' && month && month !== 'ALL') {
      exportQuery = exportQuery.filter('month', 'eq', month)
    } else if (filterMode === 'daterange' && startDate && endDate) {
      exportQuery = exportQuery.filter('date', 'gte', startDate).filter('date', 'lte', endDate)
    }

    // Get all data for export (no pagination)
    const result = await exportQuery
      .order('date', { ascending: false })
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (result.error) {
      console.error('❌ Supabase query error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while exporting data',
        message: result.error.message 
      }, { status: 500 })
    }

    const data = result.data || []
    console.log(`✅ Exporting ${data.length} records from master_data_circulation`)

    if (data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No data found for export' 
      }, { status: 404 })
    }

    // Convert data to CSV
    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle values that need quotes (contain commas, quotes, or newlines)
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value || ''
      }).join(',')
    )
    
    const csvContent = [csvHeaders, ...csvRows].join('\n')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `master_data_circulation_export_${timestamp}.csv`

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error('❌ Error exporting master_data_circulation:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Database error while exporting data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
