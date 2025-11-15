import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('📝 [Maintenance Update] Updating maintenance config...')
    
    // Get request body
    const body = await request.json()
    const {
      maintenance_message,
      maintenance_message_id,
      countdown_enabled,
      countdown_datetime,
      background_image_url,
      background_color,
      text_color,
      show_logo,
      logo_url,
      custom_html,
      user_id
    } = body
    
    // Check if maintenance config exists
    const { data: existingData, error: fetchError } = await supabase
      .from('maintenance_config')
      .select('id')
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ [Maintenance Update] Error fetching existing config:', fetchError)
      return NextResponse.json({
        success: false,
        error: fetchError.message
      }, { status: 500 })
    }
    
    // Build update data (only include fields that are provided)
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (maintenance_message !== undefined) updateData.maintenance_message = maintenance_message
    if (maintenance_message_id !== undefined) updateData.maintenance_message_id = maintenance_message_id
    if (countdown_enabled !== undefined) updateData.countdown_enabled = countdown_enabled
    if (countdown_datetime !== undefined) updateData.countdown_datetime = countdown_datetime
    if (background_image_url !== undefined) updateData.background_image_url = background_image_url
    if (background_color !== undefined) updateData.background_color = background_color
    if (text_color !== undefined) updateData.text_color = text_color
    if (show_logo !== undefined) updateData.show_logo = show_logo
    if (logo_url !== undefined) updateData.logo_url = logo_url
    if (custom_html !== undefined) updateData.custom_html = custom_html
    if (user_id) updateData.updated_by = user_id
    
    let result
    if (existingData) {
      // Update existing config
      const { data, error } = await supabase
        .from('maintenance_config')
        .update(updateData)
        .eq('id', existingData.id)
        .select()
        .single()
      
      if (error) {
        console.error('❌ [Maintenance Update] Error updating maintenance config:', error)
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 })
      }
      
      result = data
    } else {
      // Insert new config (should not happen, but handle it)
      const { data, error } = await supabase
        .from('maintenance_config')
        .insert({
          ...updateData,
          is_maintenance_mode: false,
          maintenance_message: maintenance_message || 'We are currently performing maintenance. Please check back soon.',
          maintenance_message_id: maintenance_message_id || 'Kami sedang melakukan pemeliharaan. Silakan kembali lagi nanti.',
          countdown_enabled: countdown_enabled || false,
          background_color: background_color || '#1a1a1a',
          text_color: text_color || '#ffffff',
          show_logo: show_logo !== undefined ? show_logo : true
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ [Maintenance Update] Error inserting maintenance config:', error)
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 })
      }
      
      result = data
    }
    
    console.log('✅ [Maintenance Update] Maintenance config updated successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Maintenance config updated successfully',
      data: result
    })
  } catch (error) {
    console.error('❌ [Maintenance Update] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

