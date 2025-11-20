import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * USC TARGET MANAGEMENT - GET TARGET DATA
 * ============================================================================
 * 
 * Get target for specific currency/line/year/quarter
 * Currency locked to USC
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const currency = 'USD' // USC stored as USD in bp_target table
  const line = searchParams.get('line') || 'ALL'
  const year = parseInt(searchParams.get('year') || '2025')
  const quarter = searchParams.get('quarter') || 'Q1'
  
  console.log(`🎯 [USC Target] GET request: ${currency} ${line} ${year} ${quarter}`)
  
  try {
    const { data, error } = await supabase
      .from('bp_target')
      .select('*')
      .eq('currency', currency)
      .eq('line', line)
      .eq('year', year)
      .eq('quarter', quarter)
      .eq('is_active', true)
      .maybeSingle()
    
    if (error) {
      console.error('❌ [USC Target] Query error:', error)
      throw error
    }
    
    if (!data) {
      console.log('⚠️ [USC Target] No target found, returning defaults')
      return NextResponse.json({
        success: true,
        exists: false,
        target: {
          currency,
          line,
          year,
          quarter,
          target_ggr: null,
          target_deposit_amount: null,
          target_deposit_cases: null,
          target_active_member: null,
          forecast_ggr: null
        }
      })
    }
    
    console.log('✅ [USC Target] Target found:', data.id)
    
    return NextResponse.json({
      success: true,
      exists: true,
      target: data
    })
    
  } catch (error) {
    console.error('❌ [USC Target] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch target',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

