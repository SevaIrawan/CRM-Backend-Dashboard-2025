import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [USC Brand Performance Trends] Fetching slicer options...')
    
    // Ambil min dan max date dari table blue_whale_usc (real-time data)
    const { data: minRecord, error: minErr } = await supabase
      .from('blue_whale_usc')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: true })
      .limit(1)
    if (minErr) {
      console.error('❌ [USC Brand Performance Trends] Error fetching min date:', minErr)
      throw minErr
    }

    const { data: maxRecord, error: maxErr } = await supabase
      .from('blue_whale_usc')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)
    if (maxErr) {
      console.error('❌ [USC Brand Performance Trends] Error fetching max date:', maxErr)
      throw maxErr
    }

    const minDate = minRecord?.[0]?.date || '2021-01-01'
    const maxDate = maxRecord?.[0]?.date || new Date().toISOString().split('T')[0]

    console.log('✅ [USC Brand Performance Trends] Slicer options loaded:', { minDate, maxDate })

    return NextResponse.json({
      success: true,
      data: {
        dateRange: { min: minDate, max: maxDate },
        defaults: { latestDate: maxDate }
      }
    })
  } catch (error) {
    console.error('❌ [USC Brand Performance Trends] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load slicer options',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

