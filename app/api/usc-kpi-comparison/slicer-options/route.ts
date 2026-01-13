import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterBrandsByUser, removeAllOptionForSquadLead, getDefaultBrandForSquadLead } from '@/utils/brandAccessHelper'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [USC KPI Comparison API] Fetching slicer options for USC currency')

    // ✅ NEW: Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    // Get DISTINCT lines from MV
    const { data: allLines, error: linesError } = await supabase
      .from('blue_whale_usc_summary')
      .select('line')
      .eq('currency', 'USC')
      .not('line', 'is', null)

    if (linesError) {
      console.error('❌ [USC KPI Comparison] Error fetching lines:', linesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: linesError.message 
      }, { status: 500 })
    }

    const uniqueLines = Array.from(new Set(allLines?.map(row => row.line).filter(Boolean) || [])) as string[]
    const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
    
    // ✅ NEW: Filter brands based on user permission
    const filteredLines = filterBrandsByUser(cleanLines, userAllowedBrands)
    let linesWithAll = ['ALL', ...filteredLines.sort()]
    linesWithAll = removeAllOptionForSquadLead(linesWithAll, userAllowedBrands)
    
    // ✅ Set default line for Squad Lead to first brand (sorted A to Z), others to 'ALL'
    const defaultLine = userAllowedBrands && userAllowedBrands.length > 0 
      ? getDefaultBrandForSquadLead(userAllowedBrands) || filteredLines[0] 
      : 'ALL'

    // Get latest record for date range defaults from master table (real-time data)
    const { data: latestRecord } = await supabase
      .from('blue_whale_usc')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)

    // Get min date from master table
    const { data: minRecord } = await supabase
      .from('blue_whale_usc')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: true })
      .limit(1)

    const minDate = minRecord?.[0]?.date || '2021-01-01'
    // Use latest record date or current date + 1 year as fallback to allow future dates
    const maxDate = latestRecord?.[0]?.date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]

    const slicerOptions = {
      lines: linesWithAll,
      dateRange: {
        min: minDate,
        max: maxDate
      },
      defaults: {
        line: defaultLine,
        latestDate: maxDate
      }
    }

    console.log('✅ [USC KPI Comparison] Slicer options loaded:', {
      linesCount: linesWithAll.length,
      minDate,
      maxDate
    })

    return NextResponse.json({
      success: true,
      data: slicerOptions
    })

  } catch (error) {
    console.error('❌ [USC KPI Comparison] Unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

