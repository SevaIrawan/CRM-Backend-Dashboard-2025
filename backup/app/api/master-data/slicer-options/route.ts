import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const selectedCurrency = searchParams.get('selectedCurrency')

  try {
    console.log('🔍 Fetching unique values from master_data_circulation for slicers...', { selectedCurrency })

    // Get unique currencies
    const { data: currencyData, error: currencyError } = await supabase
      .from('master_data_circulation')
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
      .from('master_data_circulation')
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
      .from('master_data_circulation')
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

    // Get unique months - month is stored as text in database
    const { data: monthData, error: monthError } = await supabase
      .from('master_data_circulation')
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
      .from('master_data_circulation')
      .select('date')
      .not('date', 'is', null)
      .order('date', { ascending: true })
      .limit(1)

    const { data: maxDateData, error: maxDateError } = await supabase
      .from('master_data_circulation')
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
    
    const rawMonths = Array.from(new Set(monthData?.map(row => row.month?.toString()).filter(Boolean) || [])) as string[]
    const validMonths = rawMonths.filter((month: string) => monthNames.includes(month)) // Only valid month names
    const sortedMonths = validMonths.sort((a: string, b: string) => monthNames.indexOf(a) - monthNames.indexOf(b)) // Sort by month order
    const months = sortedMonths.map(month => ({
      value: month,
      label: month
    })) as Array<{value: string, label: string}>

    const dateRange = {
      min: dateRangeData?.[0]?.date || '',
      max: maxDateData?.[0]?.date || ''
    }

    console.log('✅ Slicer options loaded:', {
      currencies: currencies.length,
      lines: lines.length,
      years: years.length,
      months: months.length,
      monthDetails: months,
      dateRange,
      selectedCurrency
    })

    return NextResponse.json({
      success: true,
      options: {
        currencies,
        lines,
        years,
        months,
        dateRange
      }
    })

  } catch (error) {
    console.error('❌ Error fetching slicer options:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Database error while fetching slicer options',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
