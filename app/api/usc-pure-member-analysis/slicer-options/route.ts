import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Pure Member Analysis USC] Fetching slicer options...')
    
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get('brand') || 'ALL'
    const year = searchParams.get('year') || null
    const month = searchParams.get('month') || 'ALL'
    const metrics = searchParams.get('metrics') || null

    // Get years and months from MONTHLY MV table - ambil semua data yang ada
    let monthlyQuery = supabase
      .from('db_usc_monthly_customer_monthly_summary')
      .select('year, month, line, traffic, first_deposit_date, first_deposit_date_market')
      .not('year', 'is', null)
      .not('month', 'is', null)
      .gt('deposit_cases', 0)  // Only active members
    
    // Filter by brand if brand is not ALL
    if (brand && brand !== 'ALL') {
      monthlyQuery = monthlyQuery.eq('line', brand)
    }
    
    // Filter by year if year is provided
    if (year) {
      monthlyQuery = monthlyQuery.eq('year', parseInt(year))
    }
    
    // Filter by month if month is not ALL
    if (month && month !== 'ALL') {
      monthlyQuery = monthlyQuery.eq('month', month)
    }
    
    const { data: monthlyData, error: monthlyError } = await monthlyQuery

    if (monthlyError) {
      console.error('❌ [Pure Member Analysis USC] Error fetching monthly data:', monthlyError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching monthly data',
        message: monthlyError.message 
      }, { status: 500 })
    }
    
    // Get distinct brands (line) from MONTHLY MV table - always fetch all brands
    const { data: allBrandData } = await supabase
      .from('db_usc_monthly_customer_monthly_summary')
      .select('line')
      .not('line', 'is', null)
    
    const uniqueBrands = Array.from(new Set(allBrandData?.map(row => row.line).filter(Boolean) || [])) as string[]
    const sortedBrands = uniqueBrands.sort()
    const brands = ['ALL', ...sortedBrands]
    
    // Get distinct traffic based on brand + year + month + metrics filter
    let filteredTrafficData = monthlyData || []
    
    // Apply metrics filter if metrics is provided (for traffic options)
    if (metrics && year) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December']
      
      let periodStart: string
      let periodEnd: string
      
      if (month === 'ALL') {
        periodStart = `${year}-01-01`
        periodEnd = `${year}-12-31`
      } else {
        const monthIndex = monthNames.indexOf(month)
        if (monthIndex !== -1) {
          const monthNumber = (monthIndex + 1).toString().padStart(2, '0')
          periodStart = `${year}-${monthNumber}-01`
          const lastDay = new Date(parseInt(year), monthIndex + 1, 0).getDate()
          periodEnd = `${year}-${monthNumber}-${lastDay.toString().padStart(2, '0')}`
        }
      }
      
      // Filter based on metrics
      if (metrics === 'existing_member') {
        // Old Member: first_deposit_date < periodStart
        filteredTrafficData = filteredTrafficData.filter(row => 
          row.first_deposit_date && row.first_deposit_date < periodStart
        )
      } else if (metrics === 'new_depositor') {
        // New Depositor: first_deposit_date di periode slicer
        filteredTrafficData = filteredTrafficData.filter(row => 
          row.first_deposit_date && 
          row.first_deposit_date >= periodStart && 
          row.first_deposit_date <= periodEnd
        )
      } else if (metrics === 'pure_existing_member') {
        // Pure Old Member: first_deposit_date < periodStart
        filteredTrafficData = filteredTrafficData.filter(row => 
          row.first_deposit_date && row.first_deposit_date < periodStart
        )
      } else if (metrics === 'pure_new_depositor') {
        // Pure ND: first_deposit_date_market di periode slicer
        filteredTrafficData = filteredTrafficData.filter(row => 
          row.first_deposit_date_market && 
          row.first_deposit_date_market >= periodStart && 
          row.first_deposit_date_market <= periodEnd
        )
      }
    }
    
    const uniqueTraffic = Array.from(new Set(filteredTrafficData.map(row => row.traffic).filter(Boolean) || [])) as string[]
    const sortedTraffic = uniqueTraffic.sort()
    const traffic = ['ALL', ...sortedTraffic]

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
      brands_count: brands.length,
      traffic_count: traffic.length,
      filters: { brand, year, month },
      defaults: { year: defaultYear, month: defaultMonth, metrics: defaultMetrics }
    })

    return NextResponse.json({
      success: true,
      data: {
        years: sortedYears,
        months,
        brands,
        traffic,
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

