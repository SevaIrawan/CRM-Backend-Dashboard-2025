import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching handler setup data from snr_usc_handler...')

    // Fetch all handlers from snr_usc_handler table
    const { data, error } = await supabase
      .from('snr_usc_handler')
      .select('id, snr_account, line, handler, assigned_by, assigned_time, created_at, updated_at')
      .order('line', { ascending: true })
      .order('snr_account', { ascending: true })

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: error.message
      }, { status: 500 })
    }

    console.log(`✅ Fetched ${data?.length || 0} handler records`)

    // ✅ Add cache control headers to prevent caching
    return NextResponse.json({
      success: true,
      data: data || []
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error: any) {
    console.error('❌ Error fetching handler setup data:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

