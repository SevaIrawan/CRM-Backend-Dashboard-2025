import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [SGD Brand Performance Trends] Fetching slicer options...')
    
    // Ambil min dan max date dari table blue_whale_sgd (real-time data)
    // ✅ CRITICAL: Filter out null dates dan pastikan mengambil dari semua data yang ada
    const { data: minRecord, error: minErr } = await supabase
      .from('blue_whale_sgd')
      .select('date')
      .eq('currency', 'SGD')
      .not('date', 'is', null)
      .order('date', { ascending: true })
      .limit(1)
    if (minErr) {
      console.error('❌ [SGD Brand Performance Trends] Error fetching min date:', minErr)
      throw minErr
    }

    const { data: maxRecord, error: maxErr } = await supabase
      .from('blue_whale_sgd')
      .select('date')
      .eq('currency', 'SGD')
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
    if (maxErr) {
      console.error('❌ [SGD Brand Performance Trends] Error fetching max date:', maxErr)
      throw maxErr
    }

    // ✅ DEBUG: Log raw data dari database
    console.log('🔍 [SGD Brand Performance Trends] Raw maxRecord:', maxRecord)
    console.log('🔍 [SGD Brand Performance Trends] Raw minRecord:', minRecord)

    // ✅ Pastikan format date benar (YYYY-MM-DD) - NO HARDCODED FALLBACK
    if (!minRecord?.[0]?.date || !maxRecord?.[0]?.date) {
      throw new Error('No date data found in database')
    }
    
    const minDate = String(minRecord[0].date).split('T')[0]
    const maxDate = String(maxRecord[0].date).split('T')[0]

    // ✅ DEBUG: Log formatted dates
    console.log('✅ [SGD Brand Performance Trends] Slicer options loaded:', { 
      minDate, 
      maxDate,
      rawMinDate: minRecord?.[0]?.date,
      rawMaxDate: maxRecord?.[0]?.date
    })

    return NextResponse.json({
      success: true,
      data: {
        dateRange: { min: minDate, max: maxDate },
        defaults: { latestDate: maxDate }
      }
    })
  } catch (error) {
    console.error('❌ [SGD Brand Performance Trends] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to load slicer options',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

