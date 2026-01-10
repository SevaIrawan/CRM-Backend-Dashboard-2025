import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userkey, user_unique, line, snr_account } = body

    if (!userkey || !user_unique || !line || !snr_account) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: userkey, user_unique, line, snr_account'
      }, { status: 400 })
    }

    console.log(`📊 Saving assignment for ${userkey} (${user_unique}, ${line})...`)

    // Fetch handler from snr_usc_handler table
    const { data: handlerData, error: handlerError } = await supabase
      .from('snr_usc_handler')
      .select('handler')
      .eq('snr_account', snr_account.trim())
      .single()

    if (handlerError && handlerError.code !== 'PGRST116') {
      console.error(`❌ Error fetching handler for ${snr_account}:`, handlerError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: `Failed to fetch handler: ${handlerError.message}`
      }, { status: 500 })
    }

    // If handler not found, return error (handler must exist in snr_usc_handler table)
    if (!handlerData || !handlerData.handler) {
      return NextResponse.json({
        success: false,
        error: 'Handler not found',
        message: `No handler found for SNR account: ${snr_account}. Please set handler in Handler Setup first.`
      }, { status: 400 })
    }

    const snr_handler = String(handlerData.handler || '').trim()

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
        snr_handler: snr_handler,
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
      message: 'Assignment saved successfully',
      handler: snr_handler // ✅ Return handler so frontend can update without reload
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

