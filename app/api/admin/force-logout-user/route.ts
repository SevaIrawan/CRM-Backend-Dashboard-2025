import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    // Read from system_flags for specific user
    const flagKey = `force_logout_user_${userId}`
    const { data, error } = await supabase
      .from('system_flags')
      .select('value, updated_at')
      .eq('key', flagKey)
      .maybeSingle()

    if (error) {
      console.error('❌ [ForceLogoutUser GET] DB error:', error)
      return NextResponse.json({ success: false, error: 'DB error' }, { status: 500 })
    }

    const forceLogoutAt = data?.value ? Number(data.value) : 0
    return NextResponse.json({ success: true, forceLogoutAt })
  } catch (error: any) {
    console.error('❌ [ForceLogoutUser GET] Exception:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, timestamp, adminId } = body

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
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
    const flagKey = `force_logout_user_${userId}`
    
    // Upsert into system_flags for specific user
    const { error: upsertError } = await supabase
      .from('system_flags')
      .upsert({ key: flagKey, value: String(forceLogoutAt) }, { onConflict: 'key' })

    if (upsertError) {
      console.error('❌ [ForceLogoutUser POST] Upsert error:', upsertError)
      return NextResponse.json({ success: false, error: 'DB upsert error' }, { status: 500 })
    }

    console.log('🔐 Force logout user requested by admin:', adminId, 'for user:', userId, 'at', forceLogoutAt)

    return NextResponse.json({
      success: true,
      message: 'Force logout flag set successfully for user',
      forceLogoutAt,
      userId
    })
  } catch (error) {
    console.error('❌ Error in force-logout-user API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

