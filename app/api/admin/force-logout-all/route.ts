import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// In-memory force logout flag (per server instance)
let FORCE_LOGOUT_AT = 0

export async function GET() {
  try {
    return NextResponse.json({ success: true, forceLogoutAt: FORCE_LOGOUT_AT })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
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

    // Set in-memory flag for all clients to read via GET
    FORCE_LOGOUT_AT = Number(timestamp) || Date.now()
    console.log('🔐 Force logout all users requested by admin:', adminId, 'at', FORCE_LOGOUT_AT)

    return NextResponse.json({
      success: true,
      message: 'Force logout flag set successfully',
      forceLogoutAt: FORCE_LOGOUT_AT
    })
  } catch (error) {
    console.error('❌ Error in force-logout-all API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

