import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userkey, user_unique, line, snr_account, snr_handler } = body

    if (!userkey || !user_unique || !line || !snr_account || !snr_handler) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userkey, user_unique, line, snr_account, snr_handler'
      }, { status: 400 })
    }

    console.log(`📊 Saving assignment for ${userkey} (${user_unique}, ${line})...`)

    // Get current user from request (if available)
    const userHeader = request.headers.get('x-user')
    let assignedBy = null
    if (userHeader) {
      try {
        const user = JSON.parse(userHeader)
        assignedBy = user.username || null
      } catch (e) {
        console.warn('⚠️ Could not parse user header')
      }
    }

    const assignedAt = new Date().toISOString()

    // Update all rows for this user_unique and line in blue_whale_usc
    const { error: updateError } = await supabase
      .from('blue_whale_usc')
      .update({
        snr_account: snr_account.trim(),
        snr_handler: snr_handler.trim(),
        snr_assigned_at: assignedAt,
        snr_assigned_by: assignedBy
      })
      .eq('user_unique', user_unique)
      .eq('line', line)
      .eq('currency', 'USC')

    if (updateError) {
      console.error(`❌ Error updating ${userkey}:`, updateError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: updateError.message
      }, { status: 500 })
    }

    console.log(`✅ Successfully updated assignment for ${userkey}`)

    return NextResponse.json({
      success: true,
      message: 'Assignment saved successfully'
    })

  } catch (error: any) {
    console.error('❌ Error in save assignment:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

