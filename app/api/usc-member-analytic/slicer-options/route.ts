import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [USC Member-Analytic API] Fetching slicer options with USC currency lock')

    // Currency is LOCKED to USC for Member-Analytic page
    const currencies = ['USC']

    // Get unique lines - filtered by USC currency (active currency lock)
    const { data: lineData, error: lineError } = await supabase
      .from('member_report_daily')
      .select('line')
      .eq('currency', 'USC') // Currency lock USC
      .not('line', 'is', null)
      .order('line')

    if (lineError) {
      console.error('❌ Error fetching lines for USC Member-Analytic:', lineError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching lines',
        message: lineError.message 
      }, { status: 500 })
    }

    // Get unique years - filtered by USC currency (active currency lock)
    const { data: yearData, error: yearError } = await supabase
      .from('member_report_daily')
      .select('year')
      .eq('currency', 'USC') // Currency lock USC
      .not('year', 'is', null)
      .order('year', { ascending: false })

    if (yearError) {
      console.error('❌ Error fetching years for USC Member-Analytic:', yearError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching years',
        message: yearError.message 
      }, { status: 500 })
    }

    // Get unique months - filtered by USC currency (active currency lock)
    const latestYear = yearData?.[0]?.year || 2025
    const { data: monthData, error: monthError } = await supabase
      .from('member_report_daily')
      .select('month')
      .eq('currency', 'USC') // Currency lock USC
      .eq('year', latestYear)
      .not('month', 'is', null)
      .order('month')

    if (monthError) {
      console.error('❌ Error fetching months for USC Member-Analytic:', monthError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching months',
        message: monthError.message 
      }, { status: 500 })
    }

    // Process unique values with ALL option
    const uniqueLines = Array.from(new Set(lineData?.map(row => row.line).filter(Boolean) || []))
    const linesWithAll = ['ALL', ...uniqueLines]
    
    const uniqueYears = Array.from(new Set(yearData?.map(row => row.year?.toString()).filter(Boolean) || []))
    
    const uniqueMonths = Array.from(new Set(monthData?.map(row => row.month).filter(Boolean) || []))
    const monthsWithAll = ['ALL', ...uniqueMonths]

    // Get date range for USC currency
    const { data: minDateData } = await supabase
      .from('member_report_daily')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: true })
      .limit(1)

    const { data: maxDateData } = await supabase
      .from('member_report_daily')
      .select('date')
      .eq('currency', 'USC')
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
      .from('member_report_daily')
      .select('year, month, date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)

    let defaultYear = uniqueYears[0] || '2025'
    let defaultMonth = 'ALL'
    
    if (latestRecord && latestRecord.length > 0) {
      const latest = latestRecord[0]
      defaultYear = latest.year?.toString() || defaultYear
      defaultMonth = latest.month || defaultMonth
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
