import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * BUSINESS PERFORMANCE TARGET API - GET
 * ============================================================================
 * 
 * Get current target for specific currency/line/year/quarter
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const currency = searchParams.get('currency') || 'MYR'
  const line = searchParams.get('line') || 'ALL'
  const year = parseInt(searchParams.get('year') || '2025')
  const quarter = searchParams.get('quarter') || 'Q4'
  
  console.log(`🎯 [BP Target API] GET request: ${currency} ${line} ${year} ${quarter}`)
  
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
      console.error('❌ [BP Target API] Query error:', error)
      throw error
    }
    
    if (!data) {
      console.log('⚠️ [BP Target API] No target found, returning defaults')
      return NextResponse.json({
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
    
    console.log('✅ [BP Target API] Target found:', data.id)
    
    return NextResponse.json({
      exists: true,
      target: data
    })
    
  } catch (error) {
    console.error('❌ [BP Target API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch target',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

