import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * TARGET LIST API - Fetch all targets for a year
 * ============================================================================
 * 
 * GET /api/myr-business-performance/target/list
 * Query params: currency, year
 * Returns: Array of all targets for the specified year
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const currency = searchParams.get('currency') || 'MYR'
    const year = searchParams.get('year') || '2025'

    console.log(`🔍 [Target List API] Fetching targets for ${currency} ${year}`)

    // Fetch all targets for the year
    const { data, error } = await supabase
      .from('bp_target')
      .select('*')
      .eq('currency', currency)
      .eq('year', year)
      .order('quarter', { ascending: true })
      .order('line', { ascending: true })

    if (error) {
      console.error('❌ [Target List API] Supabase error:', error)
      throw error
    }

    console.log(`📊 [Target List API] Found ${data?.length || 0} targets`)

    return NextResponse.json({
      success: true,
      targets: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('❌ [Target List API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch targets',
        details: error instanceof Error ? error.message : 'Unknown error',
        targets: []
      },
      { status: 500 }
    )
  }
}

