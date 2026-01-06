import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assignments } = body

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid assignments data'
      }, { status: 400 })
    }

    console.log(`📊 Bulk saving ${assignments.length} assignments to blue_whale_usc...`)

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
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each assignment
    for (const assignment of assignments) {
      const { userkey, user_unique, line, snr_account, snr_handler } = assignment

      if (!userkey || !user_unique || !line || !snr_account || !snr_handler) {
        errors.push(`Missing required fields for ${userkey}`)
        errorCount++
        continue
      }

      try {
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
          errors.push(`Failed to update ${userkey}: ${updateError.message}`)
          errorCount++
        } else {
          successCount++
        }
      } catch (error: any) {
        console.error(`❌ Exception updating ${userkey}:`, error)
        errors.push(`Exception updating ${userkey}: ${error.message}`)
        errorCount++
      }
    }

    console.log(`✅ Bulk save completed: ${successCount} success, ${errorCount} errors`)

    if (errorCount > 0) {
      return NextResponse.json({
        success: false,
        error: `${errorCount} assignments failed`,
        errors: errors.slice(0, 10), // Limit error messages
        successCount,
        errorCount
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${successCount} assignments`,
      successCount
    })

  } catch (error: any) {
    console.error('❌ Error in bulk save:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

