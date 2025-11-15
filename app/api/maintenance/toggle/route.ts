import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [Maintenance Toggle] Toggling maintenance mode...')
    
    // Get request body
    const body = await request.json()
    const { is_maintenance_mode, user_id } = body
    
    if (typeof is_maintenance_mode !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'is_maintenance_mode must be a boolean'
      }, { status: 400 })
    }
    
    // Check if maintenance config exists
    const { data: existingData, error: fetchError } = await supabase
      .from('maintenance_config')
      .select('id')
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ [Maintenance Toggle] Error fetching existing config:', fetchError)
      return NextResponse.json({
        success: false,
        error: fetchError.message
      }, { status: 500 })
    }
    
    // Update or insert maintenance config
    let updateData: any = {
      is_maintenance_mode: is_maintenance_mode,
      updated_at: new Date().toISOString()
    }
    
    // Add updated_by if user_id is provided
    if (user_id) {
      updateData.updated_by = user_id
    }
    
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
        console.error('❌ [Maintenance Toggle] Error updating maintenance config:', error)
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
          maintenance_message: 'We are currently performing maintenance. Please check back soon.',
          maintenance_message_id: 'Kami sedang melakukan pemeliharaan. Silakan kembali lagi nanti.',
          countdown_enabled: false,
          background_color: '#1a1a1a',
          text_color: '#ffffff',
          show_logo: true
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ [Maintenance Toggle] Error inserting maintenance config:', error)
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 })
      }
      
      result = data
    }
    
    console.log('✅ [Maintenance Toggle] Maintenance mode toggled:', is_maintenance_mode ? 'ON' : 'OFF')
    
    return NextResponse.json({
      success: true,
      message: `Maintenance mode ${is_maintenance_mode ? 'enabled' : 'disabled'} successfully`,
      data: result
    })
  } catch (error) {
    console.error('❌ [Maintenance Toggle] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

