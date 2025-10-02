import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Ambil min dan max date dari MV USC
    const { data: minRecord, error: minErr } = await supabase
      .from('blue_whale_usc_summary')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: true })
      .limit(1)
    if (minErr) throw minErr

    const { data: maxRecord, error: maxErr } = await supabase
      .from('blue_whale_usc_summary')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)
    if (maxErr) throw maxErr

    const minDate = minRecord?.[0]?.date || '2021-01-01'
    const maxDate = maxRecord?.[0]?.date || '2025-12-31'

    return NextResponse.json({
      success: true,
      data: {
        dateRange: { min: minDate, max: maxDate },
        defaults: { latestDate: maxDate }
      }
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to load slicer options' }, { status: 500 })
  }
}
