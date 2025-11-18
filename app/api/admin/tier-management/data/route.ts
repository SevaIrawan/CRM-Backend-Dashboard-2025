import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * ADMIN TIER MANAGEMENT - TIER DATA API
 * ============================================================================
 * 
 * Purpose: Get tier data directly from tier table (NO CALCULATION)
 * Returns: Raw tier data from database
 * 
 * Params:
 * - year: Optional (e.g., "2025")
 * - month: Optional (e.g., "November" or "ALL")
 * - line: Optional (e.g., "LVMY" or "ALL")
 * - currency: Required (e.g., "USC", "SGD", "MYR")
 * 
 * Logic:
 * - USC → tier_usc_v1
 * - SGD → tier_sgd_v1
 * - MYR → tier_myr_v1
 * - Direct query from tier table (NO aggregation, NO calculation, NO tier assignment)
 * - Just return what's in the database
 * 
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const line = searchParams.get('line')
    const currency = searchParams.get('currency') || 'USC'
    
    console.log('📊 [Admin Tier Management] Parameters:', { year, month, line, currency })
    
    // Determine table name based on currency
    const tableName = `tier_${currency.toLowerCase()}_v1`
    
    // Validate currency
    if (!['USC', 'SGD', 'MYR'].includes(currency)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid currency. Must be USC, SGD, or MYR'
      }, { status: 400 })
    }
    
    // Direct query from tier table based on currency - NO CACHE, always fresh data
    let query = supabase
      .from(tableName)
      .select('*')
      .order('line', { ascending: true })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    
    // Filter by line if provided and not "ALL"
    if (line && line !== 'ALL') {
      query = query.eq('line', line)
    }
    
    // Filter by year if provided
    if (year && year !== 'ALL') {
      query = query.eq('year', parseInt(year))
    }
    
    // Filter by month if provided and not "ALL"
    if (month && month !== 'ALL') {
      query = query.eq('month', month)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ [Admin Tier Management] Query error:', error)
      throw error
    }
    
    console.log(`✅ [Admin Tier Management] Found ${data?.length || 0} records`)
    
    return NextResponse.json({
      success: true,
      data: {
        records: data || [],
        totalRecords: data?.length || 0
      }
    })
    
  } catch (error) {
    console.error('❌ [Admin Tier Management] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

