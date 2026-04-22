import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Global force logout was previously stored in public.system_flags.
 * That table is no longer used — GET always returns no server flag; POST does not persist.
 */
export async function GET() {
  try {
    return NextResponse.json({ success: true, forceLogoutAt: 0 })
  } catch (error: unknown) {
    console.error('❌ [ForceLogout GET] Exception:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
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
      '🔐 [ForceLogout POST] Acknowledged (no server persistence):',
      adminId,
      'at',
      forceLogoutAt
    )

    return NextResponse.json({
      success: true,
      message: 'Acknowledged; server-side force logout flags are disabled',
      forceLogoutAt,
      persisted: false
    })
  } catch (error) {
    console.error('❌ Error in force-logout-all API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
