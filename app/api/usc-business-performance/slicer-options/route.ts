import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterBrandsByUser, removeAllOptionForSquadLead, getDefaultBrandForSquadLead } from '@/utils/brandAccessHelper'
import { ORDERED_TIER_GROUPS } from '@/app/usc/business-performance/constants'

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
    
    let linesWithAll = ['All', ...filteredBrands.sort()]
    
    // Remove 'All' option for Squad Lead users
    linesWithAll = removeAllOptionForSquadLead(linesWithAll, userAllowedBrands)
    
    console.log('✅ [USC BP Slicer] FINAL BRANDS:', {
      total_available: cleanLines.length,
      user_access: filteredBrands.length,
      has_all_option: linesWithAll.includes('All'),
      final_brands: linesWithAll
    })
    
    // Get DISTINCT squad_lead from blue_whale_usc
    const { data: allSquadLeads, error: squadLeadsError } = await supabase
      .from('blue_whale_usc')
      .select('squad_lead')
      .eq('currency', 'USC')
      .not('squad_lead', 'is', null)
    
    if (squadLeadsError) {
      console.error('❌ Error fetching squad_leads:', squadLeadsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: squadLeadsError.message 
      }, { status: 500 })
    }
    
    const uniqueSquadLeads = Array.from(new Set(allSquadLeads?.map(row => row.squad_lead).filter(Boolean) || [])) as string[]
    const sortedSquadLeads = uniqueSquadLeads.sort()
    const squadLeadsWithAll = ['All', ...sortedSquadLeads]
    
    // Get DISTINCT traffic (Channel) from blue_whale_usc
    const { data: allChannels, error: channelsError } = await supabase
      .from('blue_whale_usc')
      .select('traffic')
      .eq('currency', 'USC')
      .not('traffic', 'is', null)
    
    if (channelsError) {
      console.error('❌ Error fetching channels:', channelsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: channelsError.message 
      }, { status: 500 })
    }
    
    const uniqueChannels = Array.from(new Set(allChannels?.map(row => row.traffic).filter(Boolean) || [])) as string[]
    const sortedChannels = uniqueChannels.sort()
    const channelsWithAll = ['All', ...sortedChannels]
    
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
    
    // Use real data from database - no hardcoded fallback
    const defaultYear = latestRecord?.[0]?.year?.toString() || sortedYears[0] || null
    const defaultMonth = latestRecord?.[0]?.month || null
    
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
    
    // Get distinct tier_name + tier_group pairs for filter
    const { data: tierNameRows, error: tierNamesError } = await supabase
      .from('blue_whale_usc')
      .select('tier_name, tier_group')
      .eq('currency', 'USC')
      .not('tier_name', 'is', null)

    if (tierNamesError) {
      console.error('❌ Error fetching tier names for filter:', tierNamesError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: tierNamesError.message
      }, { status: 500 })
    }

    const tierNameMap = new Map<string, string | null>()
    tierNameRows?.forEach(row => {
      const name = row.tier_name as string
      if (!name) return
      const normalized = name.trim()
      if (!normalized) return
      if (!tierNameMap.has(normalized)) {
        tierNameMap.set(normalized, row.tier_group || null)
      }
    })

    const tierNameOptions = Array.from(tierNameMap.entries())
      .map(([name, group]) => ({ name, group }))
      .sort((a, b) => {
        const groupOrder = ORDERED_TIER_GROUPS
        const aIndex = groupOrder.indexOf(a.group || '')
        const bIndex = groupOrder.indexOf(b.group || '')
        if (aIndex !== bIndex) {
          if (aIndex === -1) return 1
          if (bIndex === -1) return -1
          return aIndex - bIndex
        }
        return a.name.localeCompare(b.name)
      })
    
    // Set default line
    const defaultLine = userAllowedBrands && userAllowedBrands.length > 0 
      ? getDefaultBrandForSquadLead(userAllowedBrands) || filteredBrands[0] 
      : 'All'
    
    const slicerOptions = {
      currencies: ['USC'],
      lines: linesWithAll,
      squadLeads: squadLeadsWithAll,
      channels: channelsWithAll,
      years: sortedYears,
      months: monthsWithAll,
      tierNames: tierNameOptions,
      defaults: {
        currency: 'USC',
        line: defaultLine,
        squadLead: 'All',
        channel: 'All',
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
