import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching unique values from blue_whale_usc for slicers...')

    // Get unique lines (no currency filter needed since table is blue_whale_usc)
    const { data: lineData, error: lineError } = await supabase
      .from('blue_whale_usc')
      .select('line')
      .not('line', 'is', null)
      .order('line')

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
      .from('blue_whale_usc')
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
      .from('blue_whale_usc')
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
      .from('blue_whale_usc')
      .select('date')
      .not('date', 'is', null)
      .order('date', { ascending: true })
      .limit(1)

    const { data: maxDateData, error: maxDateError } = await supabase
      .from('blue_whale_usc')
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

    console.log('✅ Blue_whale_usc slicer options processed:', {
      lines: lines.length,
      years: years.length,
      months: months.length,
      dateRange: { min: minDate, max: maxDate }
    })

    return NextResponse.json({
      success: true,
      data: {
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
    console.error('❌ Error fetching blue_whale_usc slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching blue_whale_usc slicer options' 
    }, { status: 500 })
  }
}
