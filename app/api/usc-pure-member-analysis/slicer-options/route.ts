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

    // Process years - langsung dari kolom [year] - IKUT DATA DATABASE
    const years = Array.from(new Set(monthlyData?.map(row => row.year?.toString()).filter(Boolean) || [])) as string[]
    const sortedYears = years.sort((a, b) => parseInt(b || '0') - parseInt(a || '0'))

    // Process months - langsung dari kolom [month] - IKUT DATA DATABASE (NO HARDCODED FILTER)
    // Ambil unique month values langsung dari database tanpa filter hardcoded
    const rawMonths = Array.from(new Set(monthlyData?.map(row => String(row.month)).filter(Boolean) || [])) as string[]
    
    // Sort secara chronological order (January, February, March, ..., December)
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
    
    const sortedMonths = rawMonths.sort((a, b) => {
      const indexA = monthOrder.findIndex(m => m.toLowerCase() === a.toLowerCase())
      const indexB = monthOrder.findIndex(m => m.toLowerCase() === b.toLowerCase())
      // Jika bulan tidak ditemukan di monthOrder, taruh di akhir
      if (indexA === -1 && indexB === -1) return a.localeCompare(b)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
    
    // Create months array - semua bulan dari database
    const months = [
      { value: 'ALL', label: 'ALL' },
      ...sortedMonths.map(month => ({ value: month, label: month }))
    ]
    
    console.log('🔍 [Pure Member Analysis USC] Raw months from DB:', rawMonths)
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

