import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { line, year, month, startDate, endDate, filterMode } = await request.json()

    console.log('📥 Exporting blue_whale_usc data with filters:', { 
      line, year, month, startDate, endDate, filterMode 
    })

    // Build query with same filters as data endpoint (no currency filter needed)
    let query = supabase.from('blue_whale_usc').select('*')

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

    // For large datasets, we need to fetch in batches
    const batchSize = 5000 // Process 5000 records at a time
    let allData: any[] = []
    let offset = 0
    let hasMore = true

    console.log('📊 Starting batch export for large dataset...')

    while (hasMore) {
      const batchQuery = query.range(offset, offset + batchSize - 1)
      const result = await batchQuery.order('date', { ascending: false })

      if (result.error) {
        console.error('❌ Export batch query error:', result.error)
        return NextResponse.json({ 
          error: 'Database error during export',
          message: result.error.message 
        }, { status: 500 })
      }

      const batchData = result.data || []
      allData = [...allData, ...batchData]
      
      console.log(`📊 Batch ${Math.floor(offset / batchSize) + 1}: ${batchData.length} records (Total: ${allData.length})`)
      
      // If we got less than batchSize, we've reached the end
      hasMore = batchData.length === batchSize
      offset += batchSize

      // Safety limit to prevent infinite loops
      if (allData.length > 100000) {
        console.log('⚠️ Export limit reached: 100,000 records')
        break
      }
    }

    const data = allData
    console.log(`📊 Export completed: ${data.length} blue_whale_usc records`)

    if (data.length === 0) {
      return NextResponse.json({ 
        error: 'No data found for the selected filters' 
      }, { status: 404 })
    }

    // Convert to CSV - exclude hidden columns
    const hiddenColumns = ['ABSENT', 'YEAR', 'MONTH', 'USERKEY', 'UNIQUEKEY', 'WINRATE', 'CURRENCY']
    const allHeaders = Object.keys(data[0])
    const headers = allHeaders.filter(header => !hiddenColumns.includes(header.toUpperCase()))
    
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
    const filterStr = [line, year, month].filter(f => f && f !== 'ALL').join('_') || 'all'
    const filename = `usc_member_report_data_${filterStr}_${timestamp}.csv`

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
