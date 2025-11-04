import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterBrandsByUser, removeAllOptionForSquadLead, getDefaultBrandForSquadLead } from '@/utils/brandAccessHelper'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const selectedCurrency = searchParams.get('selectedCurrency')

  try {
    console.log('🔍 [USC Member-Analytic API] Fetching slicer options for USC currency lock')

    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    // Currency is LOCKED to USC for this page
    const currencies = ['USC']

    console.log('📊 [DEBUG] Querying blue_whale_usc_summary (MV) for lines...')
    
    // Get DISTINCT lines from MV - NO LIMIT
    const { data: allLines, error: linesError } = await supabase
      .from('blue_whale_usc_summary')
      .select('line')
      .eq('currency', 'USC')
      .not('line', 'is', null)

    console.log('📊 [DEBUG] Lines query result:', { 
      dataCount: allLines?.length, 
      error: linesError,
      sampleData: allLines?.slice(0, 3)
    })

    if (linesError) {
      console.error('❌ Error fetching lines:', linesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: linesError.message 
      }, { status: 500 })
    }

    const uniqueLines = Array.from(new Set(allLines?.map(row => row.line).filter(Boolean) || []))
    const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
    
    // ✅ Filter brands based on user permission
    const filteredBrands = filterBrandsByUser(cleanLines, userAllowedBrands)
    let linesWithAll = ['ALL', ...filteredBrands.sort()]
    
    // ✅ Remove 'ALL' option for Squad Lead users
    linesWithAll = removeAllOptionForSquadLead(linesWithAll, userAllowedBrands)

    // Get years from MV - NO LIMIT
    const { data: allYears, error: yearsError } = await supabase
      .from('blue_whale_usc_summary')
      .select('year')
      .eq('currency', 'USC')
      .not('year', 'is', null)

    if (yearsError) {
      console.error('❌ Error fetching years:', yearsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: yearsError.message 
      }, { status: 500 })
    }

    const uniqueYears = Array.from(new Set(allYears?.map(row => row.year?.toString()).filter(Boolean) || []))
    const sortedYears = uniqueYears.sort((a, b) => parseInt(b || '0') - parseInt(a || '0'))

    // Get latest record first to determine defaults
    const { data: latestRecord } = await supabase
      .from('blue_whale_usc_summary')
      .select('year, month, date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)  // Only 1 record needed for default

    const defaultYear = latestRecord?.[0]?.year?.toString() || sortedYears[0] || '2025'
    const defaultMonth = latestRecord?.[0]?.month ? String(latestRecord[0].month) : 'September'

    // Get all months with year from database - client will dedupe
    const { data: allMonthsData, error: monthsError } = await supabase
      .from('blue_whale_usc_summary')
      .select('month, year')
      .eq('currency', 'USC')
      .not('month', 'is', null)

    if (monthsError) {
      console.error('❌ Error fetching months:', monthsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: monthsError.message 
      }, { status: 500 })
    }

    console.log('🔍 [USC Slicer] Raw months data from DB:', {
      totalRows: allMonthsData?.length,
      sampleData: allMonthsData?.slice(0, 20)
    })

    // Build month-year mapping
    const monthYearMap: Record<string, Set<string>> = {}
    allMonthsData?.forEach(row => {
      const monthKey = String(row.month)
      const yearValue = String(row.year)
      if (monthKey && yearValue) {
        if (!monthYearMap[monthKey]) {
          monthYearMap[monthKey] = new Set()
        }
        monthYearMap[monthKey].add(yearValue)
      }
    })

    console.log('🔍 [USC Slicer] Month-year mapping:', monthYearMap)

    // Get all unique months
    const uniqueMonths = Object.keys(monthYearMap)
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const sortedMonths = uniqueMonths.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b))
    
    // Create months array with year info
    const monthsWithYearInfo = sortedMonths.map(month => ({
      value: month,
      label: month,
      years: Array.from(monthYearMap[month])
    }))
    const monthsWithAll = [
      { value: 'ALL', label: 'ALL', years: sortedYears },
      ...monthsWithYearInfo
    ]

    // ✅ Set default line for Squad Lead to first brand, others to 'ALL'
    const defaultLine = userAllowedBrands && userAllowedBrands.length > 0 
      ? getDefaultBrandForSquadLead(userAllowedBrands) || filteredBrands[0] 
      : 'ALL'
    
    const slicerOptions = {
      currencies, // Locked to USC
      lines: linesWithAll,
      years: sortedYears,
      months: monthsWithAll,
      dateRange: {
        min: '2021-01-01',
        max: '2025-12-31'
      },
      defaults: {
        currency: 'USC',
        line: defaultLine, // ✅ Auto-select first brand for Squad Lead
        year: defaultYear,
        month: defaultMonth
      }
    }

    console.log('✅ [USC Member-Analytic API] Slicer options loaded with USC currency lock:', {
      currencies: currencies.length,
      lines: linesWithAll.length,
      years: sortedYears.length,
      months: monthsWithAll.length
    })

    return NextResponse.json({
      success: true,
      data: slicerOptions
    })

  } catch (error) {
    console.error('❌ [USC Member-Analytic API] Error getting slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}