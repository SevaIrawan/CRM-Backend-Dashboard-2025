import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * ADMIN TIER MANAGEMENT - SYNC TIER TO MASTER TABLE API
 * ============================================================================
 * 
 * Purpose: Sync tier from tier table to master table (blue_whale_usc, etc.)
 * Method: POST
 * 
 * Process:
 * 1. Call SQL function sync_tier_to_blue_whale_usc() (or SGD/MYR equivalent)
 * 2. Return number of rows updated
 * 
 * Params:
 * - currency: Required (e.g., "USC", "SGD", "MYR")
 * - year: Optional (e.g., 2025)
 * - month: Optional (e.g., "November")
 * 
 * ============================================================================
 */

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get('currency') || 'USC'
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    
    console.log('🔄 [Admin Sync Tier] Starting...', { currency, year, month })
    
    // Validate currency
    if (!['USC', 'SGD', 'MYR'].includes(currency)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid currency. Must be USC, SGD, or MYR'
      }, { status: 400 })
    }
    
    // For now, only USC is implemented
    if (currency !== 'USC') {
      return NextResponse.json({
        success: false,
        error: `${currency} tier sync is not yet implemented. Please use USC for now.`,
        message: 'Coming soon'
      }, { status: 501 })
    }
    
    // Determine SQL function name based on currency
    const sqlFunction = `sync_tier_to_blue_whale_${currency.toLowerCase()}`
    
    console.log('📞 [Admin Sync Tier] Calling SQL function:', sqlFunction, { p_year: year ? parseInt(year) : null, p_month: month || null })
    
    // Call SQL function via RPC
    // Note: Supabase RPC requires parameters to match function signature exactly
    const rpcParams: any = {}
    if (year) {
      rpcParams.p_year = parseInt(year)
    }
    if (month) {
      rpcParams.p_month = month
    }
    
    const { data, error } = await supabase.rpc(sqlFunction, rpcParams)
    
    if (error) {
      console.error('❌ [Admin Sync Tier] RPC Error:', error)
      console.error('❌ [Admin Sync Tier] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      // Return more detailed error message
      return NextResponse.json({
        success: false,
        error: 'Failed to sync tier',
        details: error.message || 'Database error',
        hint: error.hint || 'Please check if SQL function exists and parameters are correct'
      }, { status: 500 })
    }
    
    const updatedCount = data || 0
    
    console.log(`✅ [Admin Sync Tier] Complete! ${updatedCount} rows updated`)
    
    return NextResponse.json({
      success: true,
      message: `Tier synced successfully`,
      data: {
        updatedCount,
        currency,
        year: year || 'ALL',
        month: month || 'ALL'
      }
    })
    
  } catch (error) {
    console.error('❌ [Admin Sync Tier] Catch Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

