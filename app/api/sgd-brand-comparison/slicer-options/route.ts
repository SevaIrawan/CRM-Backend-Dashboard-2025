import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Ambil min dan max date dari master table SGD (real-time data)
    const { data: minRecord } = await supabase
      .from('blue_whale_sgd')
      .select('date')
      .eq('currency', 'SGD')
      .order('date', { ascending: true })
      .limit(1)

    const { data: maxRecord } = await supabase
      .from('blue_whale_sgd')
      .select('date')
      .eq('currency', 'SGD')
      .order('date', { ascending: false })
      .limit(1)

    const minDate = minRecord?.[0]?.date || '2021-01-01'
    const maxDate = maxRecord?.[0]?.date || new Date().toISOString().split('T')[0]

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
