import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const selectedCurrency = searchParams.get('selectedCurrency')

  try {
    console.log('🔍 [USC Member Report API] Fetching slicer options for USC currency lock')

    // Currency is LOCKED to USC for this page
    const currencies = ['USC']
    
    // Get DISTINCT lines from MV - NO LIMIT
    const { data: allLines, error: linesError } = await supabase
      .from('blue_whale_usc_summary')
      .select('line')
      .eq('currency', 'USC')
      .not('line', 'is', null)

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

    // Get latest record first to determine defaults
    const { data: latestRecord } = await supabase
      .from('blue_whale_usc_summary')
      .select('year, month, date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)

    const defaultYear = latestRecord?.[0]?.year?.toString() || sortedYears[0] || '2025'
    const defaultMonth = latestRecord?.[0]?.month ? String(latestRecord[0].month) : 'September'

    // Get months WITH year mapping for dynamic filtering
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

    // Build month-year mapping for dynamic filtering
    const monthYearMap: Record<string, Set<string>> = {}
    allMonthsData?.forEach(row => {
      const monthKey = String(row.month)
      const yearValue = String(row.year)
      if (monthKey && yearValue) {
        if (!monthYearMap[monthKey]) {
          monthYearMap[monthKey] = new Set()
        }
        monthYearMap[monthKey].add(yearValue)
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

    console.log('✅ [USC Member Report API] Slicer options loaded:', {
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
    console.error('❌ [USC Member Report API] Error getting slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

