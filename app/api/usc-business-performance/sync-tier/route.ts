import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - SYNC TIER TO blue_whale_usc API
 * ============================================================================
 * 
 * Purpose: Sync tier from tier_usc_v1 to blue_whale_usc master table
 * Method: POST
 * 
 * Process:
 * 1. Call SQL function sync_tier_to_blue_whale_usc()
 * 2. Return number of rows updated
 * 
 * Params:
 * - year: Optional (e.g., 2025)
 * - month: Optional (e.g., "November")
 * 
 * ============================================================================
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [USC Sync Tier] Starting...')
    
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    
    console.log('📅 [USC Sync Tier] Params:', { year, month })
    
    // Build SQL function call
    let sqlFunction = 'sync_tier_to_blue_whale_usc'
    let params: any[] = []
    
    if (year && month) {
      sqlFunction = 'sync_tier_to_blue_whale_usc'
      params = [parseInt(year), month]
    } else if (year) {
      sqlFunction = 'sync_tier_to_blue_whale_usc'
      params = [parseInt(year)]
    } else {
      sqlFunction = 'sync_tier_to_blue_whale_usc'
      params = []
    }
    
    // Call SQL function via RPC
    const { data, error } = await supabase.rpc(sqlFunction, {
      p_year: year ? parseInt(year) : null,
      p_month: month || null
    })
    
    if (error) {
      console.error('❌ [USC Sync Tier] Error:', error)
      throw error
    }
    
    const updatedCount = data || 0
    
    console.log(`✅ [USC Sync Tier] Complete! ${updatedCount} rows updated`)
    
    return NextResponse.json({
      success: true,
      message: `Tier synced successfully`,
      data: {
        updatedCount,
        year: year || 'ALL',
        month: month || 'ALL'
      }
    })
    
  } catch (error) {
    console.error('❌ [USC Sync Tier] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

