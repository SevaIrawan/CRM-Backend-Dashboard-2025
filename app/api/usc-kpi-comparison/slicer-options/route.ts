import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [USC KPI Comparison API] Fetching slicer options for USC currency')

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

    const uniqueLines = Array.from(new Set(allLines?.map(row => row.line).filter(Boolean) || []))
    const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
    const linesWithAll = ['ALL', ...cleanLines.sort()]

    // Get latest record for date range defaults
    const { data: latestRecord } = await supabase
      .from('blue_whale_usc_summary')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)

    // Get min date
    const { data: minRecord } = await supabase
      .from('blue_whale_usc_summary')
      .select('date')
      .eq('currency', 'USC')
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

