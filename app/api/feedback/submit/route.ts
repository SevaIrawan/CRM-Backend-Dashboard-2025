import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('📥 [FeedbackSubmit] Received request')
    const body = await request.json()
    console.log('📥 [FeedbackSubmit] Request body:', body)
    
    const {
      category,
      subject,
      message,
      page_url,
      page_title,
      attachments
    } = body

    // Get user session from request headers or body
    const userId = body.user_id
    const username = body.username
    const email = body.email
    const role = body.role

    if (!username || !message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: username, message'
      }, { status: 400 })
    }

    // Handle user_id - if it's not a valid UUID, set to null
    let validUserId = null
    if (userId && typeof userId === 'string' && userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      validUserId = userId
    }

    // Insert feedback
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('user_feedbacks')
      .insert({
        user_id: validUserId,
        username,
        email: email || null,
        role: role || null,
        category: category || 'question',
        subject: subject || null,
        initial_message: message,
        page_url: page_url || null,
        page_title: page_title || null,
        browser: body.browser || null,
        device_type: body.device_type || null,
        os: body.os || null,
        status: 'pending',
        priority: 'normal'
      })
      .select()
      .single()

    if (feedbackError) {
      console.error('Error inserting feedback:', feedbackError)
      return NextResponse.json({
        success: false,
        error: 'Failed to submit feedback'
      }, { status: 500 })
    }

    // Insert first reply
    const { error: replyError } = await supabase
      .from('feedback_replies')
      .insert({
        feedback_id: feedbackData.id,
        sender_type: 'user',
        sender_id: validUserId,
        sender_username: username,
        sender_role: role,
        message: message,
        is_read: true
      })

    if (replyError) {
      console.error('Error inserting reply:', replyError)
      return NextResponse.json({
        success: false,
        error: 'Failed to submit feedback'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: feedbackData
    })

  } catch (error) {
    console.error('Error in feedback submit API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
