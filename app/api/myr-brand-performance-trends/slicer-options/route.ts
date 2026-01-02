import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [MYR Brand Performance Trends] Fetching slicer options...')
    
    // Ambil min dan max date dari table blue_whale_myr (real-time data)
    const { data: minRecord, error: minErr } = await supabase
      .from('blue_whale_myr')
      .select('date')
      .eq('currency', 'MYR')
      .order('date', { ascending: true })
      .limit(1)
    if (minErr) {
      console.error('❌ [MYR Brand Performance Trends] Error fetching min date:', minErr)
      throw minErr
    }

    const { data: maxRecord, error: maxErr } = await supabase
      .from('blue_whale_myr')
      .select('date')
      .eq('currency', 'MYR')
      .order('date', { ascending: false })
      .limit(1)
    if (maxErr) {
      console.error('❌ [MYR Brand Performance Trends] Error fetching max date:', maxErr)
      throw maxErr
    }

    const minDate = minRecord?.[0]?.date || '2021-01-01'
    // Use latest record date or current date + 1 year as fallback to allow future dates
    const maxDate = maxRecord?.[0]?.date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]

    console.log('✅ [MYR Brand Performance Trends] Slicer options loaded:', { minDate, maxDate })

    return NextResponse.json({
      success: true,
      data: {
        dateRange: { min: minDate, max: maxDate },
        defaults: { latestDate: maxDate }
      }
    })
  } catch (error) {
    console.error('❌ [MYR Brand Performance Trends] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load slicer options',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

