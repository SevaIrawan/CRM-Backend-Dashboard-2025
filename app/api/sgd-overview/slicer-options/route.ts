import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const selectedCurrency = searchParams.get('selectedCurrency')

  try {
    console.log('🔍 [SGD Overview API] Fetching slicer options for SGD currency lock')

    // Currency is LOCKED to SGD for this page
    const currencies = ['SGD']

    console.log('📊 [DEBUG] Querying blue_whale_sgd_monthly_summary for lines...')
    
    // Get DISTINCT lines from MV - NO LIMIT
    const { data: allLines, error: linesError } = await supabase
      .from('blue_whale_sgd_monthly_summary')
      .select('line')
      .eq('currency', 'SGD')
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

    // Get years from MV - NO LIMIT
    const { data: allYears, error: yearsError } = await supabase
      .from('blue_whale_sgd_monthly_summary')
      .select('year')
      .eq('currency', 'SGD')
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

    // Get latest record first to determine defaults
    const { data: latestRecord } = await supabase
      .from('blue_whale_sgd_monthly_summary')
      .select('year, month')
      .eq('currency', 'SGD')
      .gt('month', 0)  // Exclude rollup (month=0)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)

    const defaultYear = latestRecord?.[0]?.year?.toString() || sortedYears[0] || '2025'
    
    // Convert month number to month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const defaultMonthNum = (latestRecord?.[0]?.month as number) || 9
    const defaultMonth = monthNames[defaultMonthNum - 1] || 'September'

    // Get months WITH year mapping for dynamic filtering
    const { data: allMonthsData, error: monthsError } = await supabase
      .from('blue_whale_sgd_monthly_summary')
      .select('month, year')
      .eq('currency', 'SGD')
      .gt('month', 0)  // Exclude rollup (month=0)
      .not('month', 'is', null)

    if (monthsError) {
      console.error('❌ Error fetching months:', monthsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: monthsError.message 
      }, { status: 500 })
    }

    console.log('🔍 [SGD Slicer] Raw months data from DB:', {
      totalRows: allMonthsData?.length,
      sampleData: allMonthsData?.slice(0, 20)
    })

    // Build month-year mapping for dynamic filtering
    const monthYearMap: Record<string, Set<string>> = {}
    allMonthsData?.forEach(row => {
      const monthNum = row.month as number
      const monthName = monthNames[monthNum - 1]
      const yearValue = String(row.year)
      if (monthName && yearValue) {
        if (!monthYearMap[monthName]) {
          monthYearMap[monthName] = new Set()
        }
        monthYearMap[monthName].add(yearValue)
      }
    })

    // Get all unique months
    const uniqueMonths = Object.keys(monthYearMap)
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const sortedMonths = uniqueMonths.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b))
    
    // Create months array WITH year info for client-side filtering
    const monthsWithYearInfo = sortedMonths.map(month => ({
      value: month,
      label: month,
      years: Array.from(monthYearMap[month])
    }))
    const monthsWithAll = [
      { value: 'ALL', label: 'ALL', years: sortedYears },
      ...monthsWithYearInfo
    ]

    console.log('🔍 [SGD Slicer] Month-year mapping:', monthYearMap)

    const slicerOptions = {
      currencies, // Locked to SGD
      lines: linesWithAll,
      years: sortedYears,
      months: monthsWithAll,
      dateRange: {
        min: '2021-01-01',
        max: '2025-12-31'
      },
      defaults: {
        currency: 'SGD',
        line: 'ALL',
        year: defaultYear,
        month: defaultMonth
      }
    }

    console.log('✅ [SGD Overview API] Slicer options loaded with SGD currency lock:', {
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
    console.error('❌ [SGD Overview API] Error getting slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
