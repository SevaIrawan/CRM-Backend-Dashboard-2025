import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [USC Slicer API] Fetching slicer options')

    // Get unique years from member_report_daily table (currency locked to USC)
    const { data: yearData, error: yearError } = await supabase
      .from('member_report_daily')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })

    if (yearError) {
      console.error('❌ [USC Slicer API] Year data error:', yearError)
      throw yearError
    }

    // Extract unique years
    const uniqueYears = Array.from(new Set(
      yearData?.map(row => new Date(row.date as string).getFullYear().toString()) || []
    ))
    const years = uniqueYears.sort((a, b) => parseInt(b) - parseInt(a))

    // Get unique months from member_report_daily table (currency locked to USC)
    const { data: monthData, error: monthError } = await supabase
      .from('member_report_daily')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: true })

    if (monthError) {
      console.error('❌ [USC Slicer API] Month data error:', monthError)
      throw monthError
    }

    // Extract unique months
    const uniqueMonths = Array.from(new Set(
      monthData?.map(row => {
        const date = new Date(row.date as string)
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        return monthNames[date.getMonth()]
      }) || []
    ))
    const months = uniqueMonths

    // Get unique lines from member_report_daily table (currency locked to USC)
    const { data: lineData, error: lineError } = await supabase
      .from('member_report_daily')
      .select('line')
      .eq('currency', 'USC')
      .not('line', 'is', null)
      .order('line')

    if (lineError) {
      console.error('❌ [USC Slicer API] Line data error:', lineError)
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

    console.log('✅ [USC Slicer API] Slicer options fetched:', {
      yearsCount: years.length,
      monthsCount: months.length,
      linesCount: lines.length,
      currency: 'USC'
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [USC Slicer API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch USC slicer options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
