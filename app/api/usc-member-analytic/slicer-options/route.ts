import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const selectedCurrency = searchParams.get('selectedCurrency')

  try {
    console.log('🔍 [USC Member-Analytic API] Fetching slicer options for USC currency lock')

    // Currency is LOCKED to USC for this page
    const currencies = ['USC']

    console.log('📊 [DEBUG] Querying blue_whale_usc_summary (MV) for lines...')
    
    // Get DISTINCT lines from MV with limit for performance
    const { data: allLines, error: linesError } = await supabase
      .from('blue_whale_usc_summary')
      .select('line')
      .eq('currency', 'USC')
      .not('line', 'is', null)
      .limit(1000)

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

    // Get years from MV with limit for performance
    const { data: allYears, error: yearsError } = await supabase
      .from('blue_whale_usc_summary')
      .select('year')
      .eq('currency', 'USC')
      .not('year', 'is', null)
      .limit(100)

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

    // Get latest record first to determine defaults
    const { data: latestRecord } = await supabase
      .from('blue_whale_usc_summary')
      .select('year, month, date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)

    const defaultYear = latestRecord?.[0]?.year?.toString() || sortedYears[0] || '2025'
    const defaultMonth = latestRecord?.[0]?.month ? String(latestRecord[0].month) : 'September'

    // Get all months with year from database - client will dedupe
    const { data: allMonthsData, error: monthsError } = await supabase
      .from('blue_whale_usc_summary')
      .select('month, year')
      .eq('currency', 'USC')
      .not('month', 'is', null)

    if (monthsError) {
      console.error('❌ Error fetching months:', monthsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: monthsError.message 
      }, { status: 500 })
    }

    console.log('🔍 [USC Slicer] Raw months data from DB:', {
      totalRows: allMonthsData?.length,
      sampleData: allMonthsData?.slice(0, 20)
    })

    // Build month-year mapping
    const monthYearMap: Record<string, Set<string>> = {}
    allMonthsData?.forEach(row => {
      if (row.month && row.year) {
        if (!monthYearMap[row.month]) {
          monthYearMap[row.month] = new Set()
        }
        monthYearMap[row.month].add(String(row.year))
      }
    })

    console.log('🔍 [USC Slicer] Month-year mapping:', monthYearMap)

    // Get all unique months
    const uniqueMonths = Object.keys(monthYearMap)
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const sortedMonths = uniqueMonths.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b))
    
    // Create months array with year info
    const monthsWithYearInfo = sortedMonths.map(month => ({
      value: month,
      label: month,
      years: Array.from(monthYearMap[month])
    }))
    const monthsWithAll = [
      { value: 'ALL', label: 'ALL', years: sortedYears },
      ...monthsWithYearInfo
    ]

    const slicerOptions = {
      currencies, // Locked to USC
      lines: linesWithAll,
      years: sortedYears,
      months: monthsWithAll,
      dateRange: {
        min: '2021-01-01',
        max: '2025-12-31'
      },
      defaults: {
        currency: 'USC',
        line: 'ALL',
        year: defaultYear,
        month: defaultMonth
      }
    }

    console.log('✅ [USC Member-Analytic API] Slicer options loaded with USC currency lock:', {
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
    console.error('❌ [USC Member-Analytic API] Error getting slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}