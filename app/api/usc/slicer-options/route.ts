import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [USC Slicer API] Fetching slicer options')

    // Get unique years from member_report_usc table
    const { data: yearData, error: yearError } = await supabase
      .from('member_report_usc')
      .select('date')
      .order('date', { ascending: false })

    if (yearError) {
      console.error('❌ [USC Slicer API] Year data error:', yearError)
      throw yearError
    }

    // Extract unique years
    const uniqueYears = Array.from(new Set(
      yearData?.map(row => new Date(row.date).getFullYear().toString()) || []
    ))
    const years = uniqueYears.sort((a, b) => parseInt(b) - parseInt(a))

    // Get unique months from member_report_usc table
    const { data: monthData, error: monthError } = await supabase
      .from('member_report_usc')
      .select('date')
      .order('date', { ascending: true })

    if (monthError) {
      console.error('❌ [USC Slicer API] Month data error:', monthError)
      throw monthError
    }

    // Extract unique months
    const uniqueMonths = Array.from(new Set(
      monthData?.map(row => {
        const date = new Date(row.date)
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        return monthNames[date.getMonth()]
      }) || []
    ))
    const months = uniqueMonths

    // Get unique currencies from member_report_usc table
    const { data: currencyData, error: currencyError } = await supabase
      .from('member_report_usc')
      .select('currency')
      .not('currency', 'is', null)

    if (currencyError) {
      console.error('❌ [USC Slicer API] Currency data error:', currencyError)
      throw currencyError
    }

    // Extract unique currencies and add "All" option
    const uniqueCurrencies = Array.from(new Set(
      currencyData?.map(row => row.currency).filter(Boolean) || []
    ))
    const currencies = ['All', ...uniqueCurrencies]

    const response = {
      success: true,
      data: {
        years,
        months,
        currencies
      }
    }

    console.log('✅ [USC Slicer API] Slicer options fetched:', {
      yearsCount: years.length,
      monthsCount: months.length,
      currenciesCount: currencies.length
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
