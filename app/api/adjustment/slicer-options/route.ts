import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || '2025'
    const month = searchParams.get('month') || 'January'
    const currency = searchParams.get('currency') || 'All'

    console.log('🔍 [Adjustment API] Fetching slicer options:', { year, month, currency })

    // Fetch years
    const { data: yearsData } = await supabase
      .from('member_report_daily')
      .select('year')
      .order('year', { ascending: false })

    // Fetch months
    const { data: monthsData } = await supabase
      .from('member_report_daily')
      .select('month')
      .eq('year', year)
      .order('month')

    // Fetch currencies
    const { data: currenciesData } = await supabase
      .from('member_report_daily')
      .select('currency')
      .eq('year', year)
      .eq('month', month)

    // Fetch lines
    const { data: linesData } = await supabase
      .from('member_report_daily')
      .select('line')
      .eq('year', year)
      .eq('month', month)
      .eq('currency', currency)

    const years = Array.from(new Set((yearsData || []).map(item => item.year).filter(Boolean))).sort()
    const months = Array.from(new Set((monthsData || []).map(item => item.month).filter(Boolean))) as string[]
    const currencies = Array.from(new Set((currenciesData || []).map(item => item.currency).filter(Boolean))) as string[]
    const lines = Array.from(new Set((linesData || []).map(item => item.line).filter(Boolean))) as string[]

    // Sort months chronologically
    const monthOrder: { [key: string]: number } = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
      'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    months.sort((a: string, b: string) => (monthOrder[a] || 0) - (monthOrder[b] || 0))

    const response = {
      success: true,
      data: {
        years,
        months,
        currencies,
        lines
      }
    }

    console.log('✅ [Adjustment API] Slicer options fetched successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [Adjustment API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch adjustment slicer options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
