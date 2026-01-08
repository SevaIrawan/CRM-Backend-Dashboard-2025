import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Pure Member Analysis USC] Fetching slicer options...')

    // Get unique years from YEARLY MV table (same as original implementation)
    const { data: yearData, error: yearError } = await supabase
      .from('db_usc_lifetime_customer_yearly_summary')
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

    // Get unique months from MONTHLY MV table
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    
    const { data: monthData, error: monthError } = await supabase
      .from('db_usc_monthly_customer_monthly_summary')
      .select('month')
      .not('month', 'is', null)

    if (monthError) {
      console.error('❌ Error fetching months:', monthError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching months',
        message: monthError.message 
      }, { status: 500 })
    }

    const years = Array.from(new Set(yearData?.map(row => row.year?.toString()).filter(Boolean) || [])) as string[]
    
    // Process months: Convert month number to month name
    const rawMonths = Array.from(new Set(monthData?.map(row => row.month).filter(Boolean) || [])) as number[]
    const validMonths = rawMonths
      .filter((monthNum: number) => monthNum >= 1 && monthNum <= 12)
      .map((monthNum: number) => monthNames[monthNum - 1])
      .filter(Boolean)
    const sortedMonths = validMonths.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b))
    const months = [
      { value: 'ALL', label: 'ALL' },
      ...sortedMonths.map(month => ({ value: month, label: month }))
    ]
    
    // Default to latest year and latest month (or ALL)
    const defaultYear = years.length > 0 ? years[0] : ''
    const defaultMonth = 'ALL' // Default to yearly view
    const defaultMetrics = 'new_depositor'

    console.log('✅ [Pure Member Analysis USC] Slicer options loaded:', {
      years_count: years.length,
      months_count: months.length,
      defaults: { year: defaultYear, month: defaultMonth, metrics: defaultMetrics }
    })

    return NextResponse.json({
      success: true,
      data: {
        years,
        months,
        defaults: {
          year: defaultYear,
          month: defaultMonth,
          metrics: defaultMetrics
        }
      }
    })

  } catch (error) {
    console.error('❌ [Pure Member Analysis USC] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching slicer options' 
    }, { status: 500 })
  }
}

