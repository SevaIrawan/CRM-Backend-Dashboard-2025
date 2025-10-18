import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [SGD AIA Candy Tracking API] Fetching slicer options from aia_brand_kpi_mv')
    
    // Get ALL DISTINCT brands, years, months from aia_brand_kpi_mv
    const { data: allData, error: dataError } = await supabase
      .from('aia_brand_kpi_mv')
      .select('brand, year, month_num, month_name')
      .not('brand', 'is', null)
      .not('year', 'is', null)
      .not('month_name', 'is', null)

    if (dataError) {
      console.error('❌ Error fetching slicer data:', dataError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: dataError.message 
      }, { status: 500 })
    }

    // Extract unique brands (as "lines")
    const uniqueBrands = Array.from(new Set(allData?.map(row => row.brand).filter(Boolean) || []))
    const cleanBrands = uniqueBrands.filter(brand => brand !== 'ALL' && brand !== 'All')
    const linesWithAll = ['ALL', ...cleanBrands.sort()]
    
    console.log('📊 [DEBUG] Brands as Lines:', linesWithAll)

    // Extract unique years
    const uniqueYears = Array.from(new Set(allData?.map(row => row.year?.toString()).filter(Boolean) || [])).sort()

    // Extract unique months (sorted by month order)
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const uniqueMonths = Array.from(new Set(
      allData?.map(row => row.month_name).filter(Boolean) || []
    )).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b))

    // Get latest record for defaults (MAX year + month)
    const sortedData = allData?.sort((a, b) => {
      if (a.year !== b.year) return (b.year || 0) - (a.year || 0)
      return (b.month_num || 0) - (a.month_num || 0)
    })
    const latestRecord = sortedData?.[0]

    console.log('🔍 [FORCE MAX DATE] Latest record:', latestRecord)

    // Force defaults to use MAX DATE data
    const defaultLine = latestRecord?.brand || linesWithAll[0] || 'ALL'
    const defaultYear = latestRecord?.year?.toString() || (uniqueYears.length > 0 ? uniqueYears[uniqueYears.length - 1] : '')
    const defaultMonth = latestRecord?.month_name || (uniqueMonths.length > 0 ? uniqueMonths[uniqueMonths.length - 1] : '')
    
    console.log('✅ [SGD AIA Candy Tracking API] Slicer options:', {
      lines: linesWithAll.length,
      years: uniqueYears.length,
      months: uniqueMonths.length,
      defaults: { defaultLine, defaultYear, defaultMonth }
    })

    const slicerOptions = {
      lines: linesWithAll,
      years: uniqueYears,
      months: uniqueMonths,
      defaults: {
        line: defaultLine,
        year: defaultYear,
        month: defaultMonth
      }
    }

    const response = NextResponse.json({
      success: true,
      data: slicerOptions
    })
    
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('❌ [SGD AIA Candy Tracking API] Error getting slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

