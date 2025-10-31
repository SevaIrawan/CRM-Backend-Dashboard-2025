import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Read from system_flags
    const { data, error } = await supabase
      .from('system_flags')
      .select('value, updated_at')
      .eq('key', 'force_logout_at')
      .maybeSingle()

    if (error) {
      console.error('❌ [ForceLogout GET] DB error:', error)
      console.error('❌ [ForceLogout GET] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ success: false, error: 'DB error', details: error.message }, { status: 500 })
    }

    const forceLogoutAt = data?.value ? Number(data.value) : 0
    console.log('✅ [ForceLogout GET] Retrieved flag:', { 
      value: data?.value, 
      forceLogoutAt,
      updated_at: data?.updated_at 
    })
    return NextResponse.json({ success: true, forceLogoutAt })
  } catch (error: any) {
    console.error('❌ [ForceLogout GET] Exception:', error)
    return NextResponse.json({ success: false, error: 'Internal server error', message: error?.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { timestamp, adminId } = body

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID is required' },
        { status: 400 }
      )
    }

    // Verify admin user
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single()

    if (adminError || !adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only admin can perform this action' },
        { status: 403 }
      )
    }

    const forceLogoutAt = Number(timestamp) || Date.now()
    // Upsert into system_flags
    const { error: upsertError } = await supabase
      .from('system_flags')
      .upsert({ key: 'force_logout_at', value: String(forceLogoutAt) }, { onConflict: 'key' })

    if (upsertError) {
      console.error('❌ [ForceLogout POST] Upsert error:', upsertError)
      return NextResponse.json({ success: false, error: 'DB upsert error' }, { status: 500 })
    }

    console.log('🔐 Force logout all users requested by admin:', adminId, 'at', forceLogoutAt)

    return NextResponse.json({
      success: true,
      message: 'Force logout flag set successfully',
      forceLogoutAt
    })
  } catch (error) {
    console.error('❌ Error in force-logout-all API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

