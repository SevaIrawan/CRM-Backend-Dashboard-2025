import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Pure Member Analysis USC] Fetching slicer options...')

    // Get years and months from MONTHLY MV table - ambil semua data yang ada
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('db_usc_monthly_customer_monthly_summary')
      .select('year, month')
      .not('year', 'is', null)
      .not('month', 'is', null)

    if (monthlyError) {
      console.error('❌ [Pure Member Analysis USC] Error fetching monthly data:', monthlyError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching monthly data',
        message: monthlyError.message 
      }, { status: 500 })
    }

    console.log('🔍 [Pure Member Analysis USC] Raw monthlyData from DB:', {
      totalRows: monthlyData?.length || 0,
      sampleData: monthlyData?.slice(0, 10) || []
    })

    // Process years - langsung dari kolom [year]
    const years = Array.from(new Set(monthlyData?.map(row => row.year?.toString()).filter(Boolean) || [])) as string[]
    const sortedYears = years.sort((a, b) => parseInt(b || '0') - parseInt(a || '0'))

    // Process months - langsung dari kolom [month] yang sudah TEXT (month name)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    
    // Ambil unique month names langsung dari kolom month (sudah text, bukan number)
    const rawMonths = Array.from(new Set(monthlyData?.map(row => String(row.month)).filter(Boolean) || [])) as string[]
    
    // Filter hanya month names yang valid
    const validMonths = rawMonths.filter(month => monthNames.includes(month))
    
    // Sort sesuai urutan
    const sortedMonths = validMonths.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b))
    
    // Create months array
    const months = [
      { value: 'ALL', label: 'ALL' },
      ...sortedMonths.map(month => ({ value: month, label: month }))
    ]
    
    console.log('🔍 [Pure Member Analysis USC] Raw months from DB:', rawMonths)
    console.log('🔍 [Pure Member Analysis USC] Valid months:', validMonths)
    console.log('🔍 [Pure Member Analysis USC] Sorted months:', sortedMonths)
    
    console.log('🔍 [Pure Member Analysis USC] Processed years:', sortedYears)
    console.log('🔍 [Pure Member Analysis USC] Processed months (final):', months)
    console.log('🔍 [Pure Member Analysis USC] Months count:', months.length)
    
    // Default to latest year and latest month (or ALL)
    const defaultYear = sortedYears.length > 0 ? sortedYears[0] : ''
    const defaultMonth = 'ALL' // Default to yearly view
    const defaultMetrics = 'new_depositor'

    console.log('✅ [Pure Member Analysis USC] Slicer options loaded:', {
      years_count: sortedYears.length,
      months_count: months.length,
      defaults: { year: defaultYear, month: defaultMonth, metrics: defaultMetrics }
    })

    return NextResponse.json({
      success: true,
      data: {
        years: sortedYears,
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

