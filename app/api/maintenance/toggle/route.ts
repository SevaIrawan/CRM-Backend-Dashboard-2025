import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

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
    if (existingData && existingData.id) {
      // Update existing config
      const { data, error } = await supabase
        .from('maintenance_config')
        .update(updateData)
        .eq('id', existingData.id as string | number)
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
    
    // ✅ CRITICAL: If turning ON maintenance, force logout ALL users (except admin)
    if (is_maintenance_mode) {
      try {
        console.log('🚪 [Maintenance Toggle] Maintenance ON, forcing logout all users...')
        const logoutTimestamp = Date.now()
        
        const { error: logoutError } = await supabase
          .from('force_logout')
          .upsert({
            id: 'global',
            force_logout_at: logoutTimestamp,
            updated_by: user_id || 'system',
            updated_at: new Date().toISOString()
          })
        
        if (logoutError) {
          console.error('⚠️ [Maintenance Toggle] Failed to set force logout flag:', logoutError)
        } else {
          console.log('✅ [Maintenance Toggle] Force logout flag set successfully')
        }
      } catch (logoutErr) {
        console.error('⚠️ [Maintenance Toggle] Error setting force logout:', logoutErr)
      }
    }
    
    // ✅ CRITICAL: Revalidate all pages untuk force refresh cache
    try {
      revalidatePath('/', 'layout') // Revalidate semua pages
      revalidatePath('/maintenance')
      revalidatePath('/login')
      console.log('✅ [Maintenance Toggle] Cache revalidated for all pages')
    } catch (revalidateError) {
      console.error('⚠️ [Maintenance Toggle] Revalidation error (non-critical):', revalidateError)
    }
    
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

