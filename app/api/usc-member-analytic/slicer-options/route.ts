import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [USC Member-Analytic API] Fetching slicer options with USC currency lock')

    // Currency is LOCKED to USC for Member-Analytic page
    const currencies = ['USC']

    // Get unique lines from MV table (faster)
    const { data: lineData, error: lineError } = await supabase
      .from('blue_whale_usc_summary')
      .select('line')
      .eq('currency', 'USC')
      .not('line', 'is', null)
      .order('line')

    if (lineError) {
      console.error('❌ Error fetching lines:', lineError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: lineError.message 
      }, { status: 500 })
    }

    // Get unique years from MV table (faster)
    const { data: yearData, error: yearError } = await supabase
      .from('blue_whale_usc_summary')
      .select('year')
      .eq('currency', 'USC')
      .not('year', 'is', null)
      .order('year', { ascending: false })

    if (yearError) {
      console.error('❌ Error fetching years:', yearError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: yearError.message 
      }, { status: 500 })
    }

    // Get unique months from MV table (faster)
    const latestYear = yearData?.[0]?.year || 2025
    const { data: monthData, error: monthError } = await supabase
      .from('blue_whale_usc_summary')
      .select('month')
      .eq('currency', 'USC')
      .eq('year', latestYear)
      .not('month', 'is', null)
      .order('month')

    if (monthError) {
      console.error('❌ Error fetching months:', monthError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: monthError.message 
      }, { status: 500 })
    }

    // Process unique values with proper ALL option (no duplication)
    const uniqueLines = Array.from(new Set(lineData?.map(row => String(row.line)).filter(Boolean) || []))
    // Remove any existing 'ALL' or 'All' from database to avoid duplicates
    const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
    const linesWithAll = ['ALL', ...cleanLines.sort()]
    
    const uniqueYears = Array.from(new Set(yearData?.map(row => row.year?.toString()).filter(Boolean) || []))
    
    // Sort months in proper chronological order
    const uniqueMonths = Array.from(new Set(monthData?.map(row => String(row.month)).filter(Boolean) || []))
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const sortedMonths = uniqueMonths.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b))
    const monthsWithAll = ['ALL', ...sortedMonths]

    // Get date range for USC currency from blue_whale_usc_summary
    const { data: minDateData } = await supabase
      .from('blue_whale_usc_summary')
      .select('date')
      .order('date', { ascending: true })
      .limit(1)

    const { data: maxDateData } = await supabase
      .from('blue_whale_usc_summary')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)

    const dateRange = {
      min: minDateData?.[0]?.date || '2024-01-01',
      max: maxDateData?.[0]?.date || '2025-12-31'
    }

    const slicerOptions = {
      currencies, // Locked to USC
      lines: linesWithAll,
      years: uniqueYears,
      months: monthsWithAll.map(month => ({
        value: month,
        label: month === 'ALL' ? 'ALL' : month
      })),
      dateRange
    }

    console.log('✅ [USC Member-Analytic API] Slicer options loaded with USC currency lock:', {
      currencies: currencies.length,
      lines: linesWithAll.length,
      years: uniqueYears.length,
      months: monthsWithAll.length
    })

    // Get latest record to auto-set default year and month to most recent data
    const { data: latestRecord } = await supabase
      .from('blue_whale_usc_summary')
      .select('year, month, date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)

    let defaultYear = uniqueYears[0] || '2025'
    let defaultMonth = 'ALL'
    
    if (latestRecord && latestRecord.length > 0) {
      const latest = latestRecord[0]
      defaultYear = latest.year?.toString() || defaultYear
      defaultMonth = String(latest.month) || defaultMonth
    }

    // Add defaults for auto-setting slicers to latest data
    const slicerOptionsWithDefaults = {
      ...slicerOptions,
      defaults: {
        currency: 'USC',
        line: 'ALL',
        year: defaultYear,
        month: defaultMonth
      }
    }

    return NextResponse.json({
      success: true,
      data: slicerOptionsWithDefaults
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
