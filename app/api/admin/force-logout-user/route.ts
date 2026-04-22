import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Per-user force logout flags were previously stored in public.system_flags.
 * That table is no longer used — GET always returns no server flag; POST does not persist.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    return NextResponse.json({ success: true, forceLogoutAt: 0 })
  } catch (error: unknown) {
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
    console.log(
      '🔐 [ForceLogoutUser POST] Acknowledged (no server persistence):',
      adminId,
      'for user:',
      userId,
      'at',
      forceLogoutAt
    )

    return NextResponse.json({
      success: true,
      message: 'Acknowledged; server-side force logout flags are disabled',
      forceLogoutAt,
      userId,
      persisted: false
    })
  } catch (error) {
    console.error('❌ Error in force-logout-user API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
