import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR KPI Comparison API] Fetching slicer options for MYR currency')

    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    // Get DISTINCT lines from MV
    const { data: allLines, error: linesError } = await supabase
      .from('blue_whale_myr_summary')
      .select('line')
      .eq('currency', 'MYR')
      .not('line', 'is', null)

    if (linesError) {
      console.error('❌ [MYR KPI Comparison] Error fetching lines:', linesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: linesError.message 
      }, { status: 500 })
    }

    const uniqueLines = Array.from(new Set(allLines?.map(row => row.line).filter(Boolean) || [])) as string[]
    const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
    
    // ✅ LOGIC: Squad Lead = filtered brands only | Admin = ALL + all brands
    let finalLines: string[]
    if (userAllowedBrands && userAllowedBrands.length > 0) {
      // Squad Lead: Filter to only their brands (NO 'ALL')
      finalLines = cleanLines.filter(brand => userAllowedBrands.includes(brand)).sort()
      console.log('🔐 [MYR KPI Comparison API] Squad Lead - filtered brands:', finalLines)
    } else {
      // Admin/Manager/SQ: Add 'ALL' + all brands
      finalLines = ['ALL', ...cleanLines.sort()]
      console.log('✅ [MYR KPI Comparison API] Admin/Manager - ALL + brands:', finalLines)
    }
    
    const linesWithAll = finalLines

    // Get latest record for date range defaults from master table (real-time data)
    const { data: latestRecord } = await supabase
      .from('blue_whale_myr')
      .select('date')
      .eq('currency', 'MYR')
      .order('date', { ascending: false })
      .limit(1)

    // Get min date from master table
    const { data: minRecord } = await supabase
      .from('blue_whale_myr')
      .select('date')
      .eq('currency', 'MYR')
      .order('date', { ascending: true })
      .limit(1)

    const minDate = minRecord?.[0]?.date || '2021-01-01'
    const maxDate = latestRecord?.[0]?.date || '2025-12-31'

    const slicerOptions = {
      lines: linesWithAll,
      dateRange: {
        min: minDate,
        max: maxDate
      },
      defaults: {
        line: 'ALL',
        latestDate: maxDate
      }
    }

    console.log('✅ [MYR KPI Comparison] Slicer options loaded:', {
      linesCount: linesWithAll.length,
      minDate,
      maxDate
    })

    return NextResponse.json({
      success: true,
      data: slicerOptions
    })

  } catch (error) {
    console.error('❌ [MYR KPI Comparison] Unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

