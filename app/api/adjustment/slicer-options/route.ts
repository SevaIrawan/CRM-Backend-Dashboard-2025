import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const selectedCurrency = searchParams.get('selectedCurrency')

  try {
    console.log('🔍 Fetching unique values from adjustment for slicers...', { selectedCurrency })

    // Get unique currencies
    const { data: currencyData, error: currencyError } = await supabase
      .from('adjusment_daily')
      .select('currency')
      .not('currency', 'is', null)
      .order('currency')

    if (currencyError) {
      console.error('❌ Error fetching currencies:', currencyError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching currencies',
        message: currencyError.message 
      }, { status: 500 })
    }

    // Get unique lines - dependent on selected currency
    let lineQuery = supabase
      .from('adjusment_daily')
      .select('line')
      .not('line', 'is', null)
      .order('line')
    
    if (selectedCurrency && selectedCurrency !== 'ALL') {
      lineQuery = lineQuery.filter('currency', 'eq', selectedCurrency)
    }

    const { data: lineData, error: lineError } = await lineQuery

    if (lineError) {
      console.error('❌ Error fetching lines:', lineError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching lines',
        message: lineError.message 
      }, { status: 500 })
    }

    // Get unique years
    const { data: yearData, error: yearError } = await supabase
      .from('adjusment_daily')
      .select('year')
      .not('year', 'is', null)
      .order('year', { ascending: false })

    if (yearError) {
      console.error('❌ Error fetching years:', yearError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching years',
        message: yearError.message 
      }, { status: 500 })
    }

    // Get unique months
    const { data: monthData, error: monthError } = await supabase
      .from('adjusment_daily')
      .select('month')
      .not('month', 'is', null)
      .order('month')

    if (monthError) {
      console.error('❌ Error fetching months:', monthError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching months',
        message: monthError.message 
      }, { status: 500 })
    }

    // Get date range (min and max dates)
    const { data: dateRangeData, error: dateRangeError } = await supabase
      .from('adjusment_daily')
      .select('date')
      .not('date', 'is', null)
      .order('date', { ascending: true })
      .limit(1)

    const { data: maxDateData, error: maxDateError } = await supabase
      .from('adjusment_daily')
      .select('date')
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)

    if (dateRangeError || maxDateError) {
      console.error('❌ Error fetching date range:', dateRangeError || maxDateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching date range',
        message: (dateRangeError || maxDateError)?.message 
      }, { status: 500 })
    }

    // Process data
    const currencies = Array.from(new Set(currencyData?.map(row => row.currency).filter(Boolean) || [])) as string[]
    const lines = Array.from(new Set(lineData?.map(row => row.line).filter(Boolean) || [])) as string[]
    const years = Array.from(new Set(yearData?.map(row => row.year?.toString()).filter(Boolean) || [])) as string[]
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const rawMonths = Array.from(new Set(monthData?.map(row => row.month).filter(Boolean) || [])) as string[]
    const validMonths = rawMonths.filter((month: string) => monthNames.includes(month))
    const sortedMonths = validMonths.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b))
    const months = sortedMonths.map(month => ({ value: month, label: month }))

    const minDate = dateRangeData?.[0]?.date || ''
    const maxDate = maxDateData?.[0]?.date || ''

    console.log('✅ Adjusment_daily slicer options processed:', {
      currencies: currencies.length,
      lines: lines.length,
      years: years.length,
      months: months.length,
      dateRange: { min: minDate, max: maxDate }
    })

    return NextResponse.json({
      success: true,
      data: {
        currencies,
        lines,
        years,
        months,
        dateRange: {
          min: minDate,
          max: maxDate
        }
      }
    })

  } catch (error) {
    console.error('❌ Error fetching adjustment slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching adjusment_daily slicer options' 
    }, { status: 500 })
  }
}
