import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const selectedCurrency = searchParams.get('selectedCurrency')

  try {
    console.log('🔍 [USC Overview API] Fetching slicer options for USC currency lock')

    // Currency is LOCKED to USC for this page
    const currencies = ['USC']

    console.log('📊 [DEBUG] Querying blue_whale_usc table for lines...')
    
    // Get all available lines from blue_whale_usc_summary (MV) for better performance
    const { data: allLines, error: linesError } = await supabase
      .from('blue_whale_usc_summary')
      .select('line')
      .eq('currency', 'USC')
      .not('line', 'is', null)

    console.log('📊 [DEBUG] Lines query result:', { 
      dataCount: allLines?.length, 
      error: linesError,
      sampleData: allLines?.slice(0, 3)
    })

    if (linesError) {
      console.error('❌ Error fetching lines:', linesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: linesError.message 
      }, { status: 500 })
    }

    const uniqueLines = Array.from(new Set(allLines?.map(row => row.line).filter(Boolean) || []))
    const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
    const linesWithAll = ['ALL', ...cleanLines.sort()]

    // Get all available years from blue_whale_usc_summary (MV) for better performance
    const { data: allYears, error: yearsError } = await supabase
      .from('blue_whale_usc_summary')
      .select('year')
      .eq('currency', 'USC')
      .not('year', 'is', null)

    if (yearsError) {
      console.error('❌ Error fetching years:', yearsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: yearsError.message 
      }, { status: 500 })
    }

    const uniqueYears = Array.from(new Set(allYears?.map(row => row.year?.toString()).filter(Boolean) || []))
    const sortedYears = uniqueYears.sort((a, b) => parseInt(b || '0') - parseInt(a || '0'))

    // Get months for latest year from blue_whale_usc_summary (MV) for better performance
    const latestYear = sortedYears[0] || '2025'
    const { data: allMonths, error: monthsError } = await supabase
      .from('blue_whale_usc_summary')
      .select('month')
      .eq('currency', 'USC')
      .eq('year', parseInt(latestYear))
      .not('month', 'is', null)

    if (monthsError) {
      console.error('❌ Error fetching months:', monthsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: monthsError.message 
      }, { status: 500 })
    }

    const uniqueMonths = Array.from(new Set(allMonths?.map(row => row.month).filter(Boolean) || []))
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const sortedMonths = uniqueMonths.sort((a, b) => monthOrder.indexOf(String(a)) - monthOrder.indexOf(String(b)))
    const monthsWithAll = ['ALL', ...sortedMonths]


    // Get latest record untuk default from blue_whale_usc_summary (MV) for better performance
    const { data: latestRecord } = await supabase
      .from('blue_whale_usc_summary')
      .select('year, month, date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)

    let defaultYear = sortedYears[0] || '2025'
    let defaultMonth = sortedMonths[0] || 'ALL'
    
    if (latestRecord && latestRecord.length > 0) {
      const latest = latestRecord[0]
      defaultYear = latest.year?.toString() || defaultYear
      defaultMonth = String(latest.month) || defaultMonth
    }

    const slicerOptions = {
      currencies, // Locked to USC
      lines: linesWithAll,
      years: sortedYears,
      months: monthsWithAll.map(month => ({
        value: month,
        label: month === 'ALL' ? 'ALL' : month
      })),
      dateRange: {
        min: '2024-01-01',
        max: '2025-12-31'
      },
      defaults: {
        currency: 'USC',
        line: 'ALL',
        year: defaultYear,
        month: defaultMonth
      }
    }

    console.log('✅ [USC Overview API] Slicer options loaded with USC currency lock:', {
      currencies: currencies.length,
      lines: linesWithAll.length,
      years: sortedYears.length,
      months: monthsWithAll.length
    })

    return NextResponse.json({
      success: true,
      data: slicerOptions
    })

  } catch (error) {
    console.error('❌ [USC Overview API] Error getting slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}