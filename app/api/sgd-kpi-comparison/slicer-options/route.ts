import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [SGD KPI Comparison API] Fetching slicer options for SGD currency')

    // Get DISTINCT lines from MV
    const { data: allLines, error: linesError } = await supabase
      .from('blue_whale_sgd_summary')
      .select('line')
      .eq('currency', 'SGD')
      .not('line', 'is', null)

    if (linesError) {
      console.error('❌ [SGD KPI Comparison] Error fetching lines:', linesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: linesError.message 
      }, { status: 500 })
    }

    const uniqueLines = Array.from(new Set(allLines?.map(row => row.line).filter(Boolean) || []))
    const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
    const linesWithAll = ['ALL', ...cleanLines.sort()]

    // Get latest record for date range defaults from master table (real-time data)
    const { data: latestRecord, error: maxErr } = await supabase
      .from('blue_whale_sgd')
      .select('date')
      .eq('currency', 'SGD')
      .order('date', { ascending: false })
      .limit(1)

    // Get min date from master table
    const { data: minRecord, error: minErr } = await supabase
      .from('blue_whale_sgd')
      .select('date')
      .eq('currency', 'SGD')
      .order('date', { ascending: true })
      .limit(1)

    if (maxErr) {
      console.warn('⚠️ [SGD KPI Comparison] Error fetching max date:', maxErr)
    }
    if (minErr) {
      console.warn('⚠️ [SGD KPI Comparison] Error fetching min date:', minErr)
    }

    const minDate = minRecord?.[0]?.date || '2021-01-01'
    const maxDate = latestRecord?.[0]?.date || new Date().toISOString().split('T')[0]

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

    console.log('✅ [SGD KPI Comparison] Slicer options loaded:', {
      linesCount: linesWithAll.length,
      minDate,
      maxDate
    })

    return NextResponse.json({
      success: true,
      data: slicerOptions
    })

  } catch (error) {
    console.error('❌ [SGD KPI Comparison] Unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

