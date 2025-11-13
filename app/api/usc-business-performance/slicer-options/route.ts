import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterBrandsByUser, removeAllOptionForSquadLead, getDefaultBrandForSquadLead } from '@/utils/brandAccessHelper'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - SLICER OPTIONS API
 * ============================================================================
 * Copy pattern from USC Overview (working implementation)
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [USC BP Slicer] Fetching slicer options...')
    
    // Get user's allowed brands from header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null
    
    console.log('🔐 [USC BP Slicer] User brand access:', {
      allowed_brands: userAllowedBrands,
      is_squad_lead: userAllowedBrands !== null && userAllowedBrands.length > 0
    })
    
    // Get DISTINCT lines from MASTER TABLE
    const { data: allLines, error: linesError } = await supabase
      .from('blue_whale_usc')
      .select('line')
      .eq('currency', 'USC')
      .not('line', 'is', null)
    
    if (linesError) {
      console.error('❌ Error fetching lines:', linesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: linesError.message 
      }, { status: 500 })
    }
    
    const uniqueLines = Array.from(new Set(allLines?.map(row => row.line).filter(Boolean) || [])) as string[]
    const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
    
    // Filter brands based on user permission
    const filteredBrands = filterBrandsByUser(cleanLines, userAllowedBrands)
    
    let linesWithAll = ['ALL', ...filteredBrands.sort()]
    
    // Remove 'ALL' option for Squad Lead users
    linesWithAll = removeAllOptionForSquadLead(linesWithAll, userAllowedBrands)
    
    console.log('✅ [USC BP Slicer] FINAL BRANDS:', {
      total_available: cleanLines.length,
      user_access: filteredBrands.length,
      has_all_option: linesWithAll.includes('ALL'),
      final_brands: linesWithAll
    })
    
    // Get years from MASTER TABLE
    const { data: allYears, error: yearsError } = await supabase
      .from('blue_whale_usc')
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
    
    // Get latest record for defaults from MASTER TABLE
    const { data: latestRecord } = await supabase
      .from('blue_whale_usc')
      .select('year, month')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)
    
    const defaultYear = latestRecord?.[0]?.year?.toString() || sortedYears[0] || '2025'
    const defaultMonth = latestRecord?.[0]?.month || 'November'
    
    // Get months WITH year mapping from MASTER TABLE
    const { data: allMonthsData, error: monthsError } = await supabase
      .from('blue_whale_usc')
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
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    
    // Build month-year mapping
    const monthYearMap: Record<string, Set<string>> = {}
    allMonthsData?.forEach(row => {
      const monthName = row.month as string
      const yearValue = String(row.year)
      if (monthName && yearValue) {
        if (!monthYearMap[monthName]) {
          monthYearMap[monthName] = new Set()
        }
        monthYearMap[monthName].add(yearValue)
      }
    })
    
    // Get all unique months
    const uniqueMonths = Object.keys(monthYearMap)
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const sortedMonths = uniqueMonths.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b))
    
    // Create months array WITH year info
    const monthsWithYearInfo = sortedMonths.map(month => ({
      value: month,
      label: month,
      years: Array.from(monthYearMap[month])
    }))
    const monthsWithAll = [
      { value: 'ALL', label: 'ALL', years: sortedYears },
      ...monthsWithYearInfo
    ]
    
    // Set default line
    const defaultLine = userAllowedBrands && userAllowedBrands.length > 0 
      ? getDefaultBrandForSquadLead(userAllowedBrands) || filteredBrands[0] 
      : 'ALL'
    
    const slicerOptions = {
      currencies: ['USC'],
      lines: linesWithAll,
      years: sortedYears,
      months: monthsWithAll,
      defaults: {
        currency: 'USC',
        line: defaultLine,
        year: defaultYear,
        month: defaultMonth
      }
    }
    
    console.log('✅ [USC BP Slicer] Options loaded:', {
      lines: linesWithAll.length,
      years: sortedYears.length,
      months: monthsWithAll.length
    })
    
    return NextResponse.json({
      success: true,
      data: slicerOptions
    })
    
  } catch (error) {
    console.error('❌ [USC BP Slicer] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
