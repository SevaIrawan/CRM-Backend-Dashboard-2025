import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      feedback_id,
      message,
      sender_type,
      sender_id,
      sender_username,
      sender_role
    } = body

    if (!feedback_id || !message || !sender_type || !sender_username) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: feedback_id, message, sender_type, sender_username'
      }, { status: 400 })
    }

    // Insert reply
    const { data: replyData, error: replyError } = await supabase
      .from('feedback_replies')
      .insert({
        feedback_id,
        sender_type,
        sender_id: sender_id || null,
        sender_username,
        sender_role: sender_role || null,
        message,
        is_read: true
      })
      .select()
      .single()

    if (replyError) {
      console.error('Error inserting reply:', replyError)
      return NextResponse.json({
        success: false,
        error: 'Failed to send reply'
      }, { status: 500 })
    }

    // Update feedback status if admin replied
    if (sender_type === 'admin') {
      await supabase
        .from('user_feedbacks')
        .update({ status: 'replied' })
        .eq('id', feedback_id)
        .eq('status', 'pending')
    }

    return NextResponse.json({
      success: true,
      data: replyData
    })

  } catch (error) {
    console.error('Error in feedback reply API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
