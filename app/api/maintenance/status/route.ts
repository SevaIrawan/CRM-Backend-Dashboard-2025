import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Maintenance Status] Checking maintenance mode...')
    
    // Fetch maintenance config from database
    const { data, error } = await supabase
      .from('maintenance_config')
      .select('*')
      .single()
    
    if (error) {
      console.error('❌ [Maintenance Status] Error fetching maintenance config:', error)
      
      // If table doesn't exist, return default (maintenance OFF)
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('⚠️ [Maintenance Status] Table not found, returning default (OFF)')
        return NextResponse.json({
          success: true,
          data: {
            is_maintenance_mode: false,
            maintenance_message: 'We are currently performing maintenance. Please check back soon.',
            maintenance_message_id: 'Kami sedang melakukan pemeliharaan. Silakan kembali lagi nanti.',
            countdown_enabled: false,
            countdown_datetime: null,
            background_image_url: null,
            background_color: '#1a1a1a',
            text_color: '#ffffff',
            show_logo: true,
            logo_url: null,
            custom_html: null
          }
        })
      }
      
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    if (!data) {
      console.log('⚠️ [Maintenance Status] No data found, returning default (OFF)')
      return NextResponse.json({
        success: true,
        data: {
          is_maintenance_mode: false,
          maintenance_message: 'We are currently performing maintenance. Please check back soon.',
          maintenance_message_id: 'Kami sedang melakukan pemeliharaan. Silakan kembali lagi nanti.',
          countdown_enabled: false,
          countdown_datetime: null,
          background_image_url: null,
          background_color: '#1a1a1a',
          text_color: '#ffffff',
          show_logo: true,
          logo_url: null,
          custom_html: null
        }
      })
    }
    
    console.log('✅ [Maintenance Status] Maintenance mode:', data.is_maintenance_mode ? 'ON' : 'OFF')
    
    return NextResponse.json({
      success: true,
      data: {
        is_maintenance_mode: data.is_maintenance_mode || false,
        maintenance_message: data.maintenance_message || 'We are currently performing maintenance. Please check back soon.',
        maintenance_message_id: data.maintenance_message_id || 'Kami sedang melakukan pemeliharaan. Silakan kembali lagi nanti.',
        countdown_enabled: data.countdown_enabled || false,
        countdown_datetime: data.countdown_datetime || null,
        background_image_url: data.background_image_url || null,
        background_color: data.background_color || '#1a1a1a',
        text_color: data.text_color || '#ffffff',
        show_logo: data.show_logo !== undefined ? data.show_logo : true,
        logo_url: data.logo_url || null,
        custom_html: data.custom_html || null
      }
    })
  } catch (error) {
    console.error('❌ [Maintenance Status] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

