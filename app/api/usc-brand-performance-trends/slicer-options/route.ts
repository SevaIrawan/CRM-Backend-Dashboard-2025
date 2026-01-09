import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ✅ Force dynamic route - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [USC Brand Performance Trends] Fetching slicer options...')
    
    // Get latest record for date range defaults from master table (real-time data)
    // ✅ SAME LOGIC AS KPI COMPARISON - Query langsung tanpa filter null yang ketat
    const { data: latestRecord, error: maxErr } = await supabase
      .from('blue_whale_usc')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: false })
      .limit(1)

    // Get min date from master table
    const { data: minRecord, error: minErr } = await supabase
      .from('blue_whale_usc')
      .select('date')
      .eq('currency', 'USC')
      .order('date', { ascending: true })
      .limit(1)

    if (maxErr) {
      console.warn('⚠️ [USC Brand Performance Trends] Error fetching max date:', maxErr)
    }
    if (minErr) {
      console.warn('⚠️ [USC Brand Performance Trends] Error fetching min date:', minErr)
    }

    // ✅ Format date consistently (YYYY-MM-DD) - always fresh from database
    const minDate = minRecord?.[0]?.date ? String(minRecord[0].date).split('T')[0] : '2021-01-01'
    // Use latest record date or current date + 1 year as fallback to allow future dates
    const maxDate = latestRecord?.[0]?.date ? String(latestRecord[0].date).split('T')[0] : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]

    console.log('✅ [USC Brand Performance Trends] Slicer options loaded:', {
      minDate,
      maxDate
    })

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

