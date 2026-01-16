import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, snr_account, line, handler } = body

    if (!snr_account || !line || !handler) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: snr_account, line, handler'
      }, { status: 400 })
    }

    console.log(`📊 Saving handler setup: ${snr_account} -> ${handler}`)

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

    const assignedTime = new Date().toISOString()

    // If id exists, update existing record
    if (id) {
      const { data: updatedData, error: updateError } = await supabase
        .from('snr_usc_handler')
        .update({
          line: line.trim(),
          handler: handler.trim(),
          assigned_by: assignedBy,
          assigned_time: assignedTime
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error(`❌ Error updating handler:`, updateError)
        return NextResponse.json({
          success: false,
          error: 'Database error',
          message: updateError.message
        }, { status: 500 })
      }

      console.log(`✅ Successfully updated handler for ${snr_account}`)
      return NextResponse.json({
        success: true,
        message: 'Handler updated successfully',
        data: updatedData // ✅ Return updated data
      })
    } else {
      // Insert new record
      const { data: insertedData, error: insertError } = await supabase
        .from('snr_usc_handler')
        .insert({
          snr_account: snr_account.trim(),
          line: line.trim(),
          handler: handler.trim(),
          assigned_by: assignedBy,
          assigned_time: assignedTime
        })
        .select()
        .single()

      if (insertError) {
        console.error(`❌ Error inserting handler:`, insertError)
        // Check if it's a unique constraint violation
        if (insertError.code === '23505') {
          return NextResponse.json({
            success: false,
            error: 'Duplicate entry',
            message: `Handler for SNR account ${snr_account} already exists. Please update instead.`
          }, { status: 400 })
        }
        return NextResponse.json({
          success: false,
          error: 'Database error',
          message: insertError.message
        }, { status: 500 })
      }

      console.log(`✅ Successfully created handler for ${snr_account}`)
      return NextResponse.json({
        success: true,
        message: 'Handler created successfully',
        data: insertedData // ✅ Return inserted data
      })
    }

  } catch (error: any) {
    console.error('❌ Error in save handler setup:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

