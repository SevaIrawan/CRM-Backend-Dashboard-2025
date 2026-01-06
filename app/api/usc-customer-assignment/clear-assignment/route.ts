import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userkey, user_unique, line } = body

    if (!userkey || !user_unique || !line) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userkey, user_unique, line'
      }, { status: 400 })
    }

    console.log(`📊 Clearing assignment for ${userkey} (${user_unique}, ${line})...`)

    // Clear snr_account and snr_handler (set to null) for all rows matching user_unique and line
    // Important: If snr_account is null, snr_handler must also be null
    const { error: updateError } = await supabase
      .from('blue_whale_usc')
      .update({
        snr_account: null,
        snr_handler: null,
        snr_assigned_at: null,
        snr_assigned_by: null
      })
      .eq('user_unique', user_unique)
      .eq('line', line)
      .eq('currency', 'USC')

    if (updateError) {
      console.error(`❌ Error clearing assignment for ${userkey}:`, updateError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: updateError.message
      }, { status: 500 })
    }

    console.log(`✅ Successfully cleared assignment for ${userkey}`)

    return NextResponse.json({
      success: true,
      message: 'Assignment cleared successfully'
    })

  } catch (error: any) {
    console.error('❌ Error in clear assignment:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

