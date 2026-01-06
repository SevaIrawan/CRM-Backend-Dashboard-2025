import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const snr_account = searchParams.get('snr_account')

    if (!snr_account || !snr_account.trim()) {
      return NextResponse.json({
        success: false,
        error: 'snr_account is required'
      }, { status: 400 })
    }

    console.log(`📊 Fetching handler for SNR account: ${snr_account}`)

    // Fetch handler from snr_usc_handler table
    const { data, error } = await supabase
      .from('snr_usc_handler')
      .select('handler')
      .eq('snr_account', snr_account.trim())
      .single()

    if (error) {
      // If record not found, return null handler (not an error)
      if (error.code === 'PGRST116') {
        console.log(`⚠️ No handler found for SNR account: ${snr_account}`)
        return NextResponse.json({
          success: true,
          handler: null
        })
      }

      console.error(`❌ Error fetching handler for ${snr_account}:`, error)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: error.message
      }, { status: 500 })
    }

    console.log(`✅ Handler found for ${snr_account}: ${data?.handler || 'null'}`)

    return NextResponse.json({
      success: true,
      handler: data?.handler || null
    })

  } catch (error: any) {
    console.error('❌ Error in get handler:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

