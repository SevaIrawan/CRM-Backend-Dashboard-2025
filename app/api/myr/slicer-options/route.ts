import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR Slicer API] Fetching slicer options for MYR currency only')

    // LOCK CURRENCY TO MYR - only show MYR data options
    const currency = 'MYR'

    // Get unique years from member_report_monthly table (filtered by MYR currency)
    const { data: yearData, error: yearError } = await supabase
      .from('member_report_monthly')
      .select('year')
      .eq('currency', currency)
      .order('year', { ascending: false })

    if (yearError) {
      console.error('❌ [MYR Slicer API] Year data error:', yearError)
      throw yearError
    }

    // Extract unique years
    const uniqueYears = Array.from(new Set(
      yearData?.map(row => row.year?.toString()) || []
    )).filter(Boolean) as string[]
    const years = uniqueYears.sort((a, b) => parseInt(b) - parseInt(a))

    // Get unique months from member_report_monthly table (filtered by MYR currency)
    const { data: monthData, error: monthError } = await supabase
      .from('member_report_monthly')
      .select('month')
      .eq('currency', currency)
      .order('month', { ascending: true })

    if (monthError) {
      console.error('❌ [MYR Slicer API] Month data error:', monthError)
      throw monthError
    }

    // Extract unique months
    const uniqueMonths = Array.from(new Set(
      monthData?.map(row => row.month) || []
    )).filter(Boolean)
    const months = uniqueMonths

    // Get unique lines from member_report_monthly table (filtered by MYR currency)
    const { data: lineData, error: lineError } = await supabase
      .from('member_report_monthly')
      .select('line')
      .eq('currency', currency)
      .not('line', 'is', null)
      .order('line')

    if (lineError) {
      console.error('❌ [MYR Slicer API] Line data error:', lineError)
      throw lineError
    }

    // Extract unique lines and add "All" option
    const uniqueLines = Array.from(new Set(
      lineData?.map(row => row.line as string).filter(Boolean) || []
    ))
    const lines = ['All', ...uniqueLines]

    const response = {
      success: true,
      data: {
        years,
        months,
        lines
      }
    }

    console.log('✅ [MYR Slicer API] Slicer options fetched for MYR currency:', {
      yearsCount: years.length,
      monthsCount: months.length,
      linesCount: lines.length
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [MYR Slicer API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch MYR slicer options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
