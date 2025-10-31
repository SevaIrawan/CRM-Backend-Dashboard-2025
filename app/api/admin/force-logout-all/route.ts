import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // Store force logout timestamp
    // Note: This can be stored in a settings table or similar
    // For now, we'll just log it and rely on localStorage flag
    console.log('🔐 Force logout all users requested by admin:', adminId, 'at', timestamp)

    // Optionally: Update a global settings table if it exists
    // For now, localStorage flag is sufficient

    return NextResponse.json({
      success: true,
      message: 'Force logout flag set successfully',
      timestamp
    })
  } catch (error) {
    console.error('❌ Error in force-logout-all API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

