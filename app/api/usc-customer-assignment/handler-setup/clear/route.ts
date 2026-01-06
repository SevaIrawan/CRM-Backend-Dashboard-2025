import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: id'
      }, { status: 400 })
    }

    console.log(`📊 Clearing handler setup for id: ${id}`)

    // Delete the handler record
    const { error: deleteError } = await supabase
      .from('snr_usc_handler')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error(`❌ Error deleting handler:`, deleteError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: deleteError.message
      }, { status: 500 })
    }

    console.log(`✅ Successfully deleted handler for id: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Handler cleared successfully'
    })

  } catch (error: any) {
    console.error('❌ Error in clear handler setup:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

