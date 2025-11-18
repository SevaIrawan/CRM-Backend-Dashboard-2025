import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * ADMIN TIER MANAGEMENT - SLICER OPTIONS API
 * ============================================================================
 * 
 * Purpose: Get filter options (lines, years, months) from tier table
 * Returns: Available lines, years, and months for filtering
 * 
 * Params:
 * - currency: Required (e.g., "USC", "SGD", "MYR")
 * 
 * Logic:
 * - USC → tier_usc_v1
 * - SGD → tier_sgd_v1
 * - MYR → tier_myr_v1
 * 
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get('currency') || 'USC'
    
    console.log('🔍 [Admin Tier Management Slicer] Currency:', currency)
    
    // Determine table name based on currency
    const tableName = `tier_${currency.toLowerCase()}_v1`
    
    // Validate currency
    if (!['USC', 'SGD', 'MYR'].includes(currency)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid currency. Must be USC, SGD, or MYR'
      }, { status: 400 })
    }
    
    // Get unique lines from tier table based on currency
    const { data: lineData, error: lineError } = await supabase
      .from(tableName)
      .select('line')
      .not('line', 'is', null)
      .order('line')
    
    if (lineError) {
      console.error('❌ Error fetching lines:', lineError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching lines',
        message: lineError.message 
      }, { status: 500 })
    }
    
    // Get unique lines and filter out unique_code patterns
    const uniqueLines = Array.from(new Set(lineData?.map((row: any) => row.line as string).filter(Boolean) || [])) as string[]
    
    // Filter out unique_code patterns
    // Unique codes typically:
    // - Start with "USR" followed by letter and numbers (e.g., "USRH470771", "USRJ369536")
    // - Are longer than typical brand names
    // Brand/line names are typically short codes like "UWKH", "SBKH", "CAM68", "HENG68KH", etc.
    const validBrands = uniqueLines.filter((line: string) => {
      const trimmedLine = line.trim()
      
      // Exclude lines that look like unique_code:
      // Pattern: "USR" + 1 letter + 6+ digits (e.g., "USRH470771")
      if (trimmedLine.match(/^USR[A-Z]\d{6,}$/i)) {
        return false
      }
      
      // Also exclude if it's just "USR" followed by many characters (catch-all for other patterns)
      if (trimmedLine.startsWith('USR') && trimmedLine.length >= 10) {
        return false
      }
      
      // Include all other lines (brands)
      return true
    })
    
    const sortedLines = validBrands.sort()
    const linesWithAll = ['ALL', ...sortedLines]
    
    // Get unique years from tier table based on currency
    const { data: yearData, error: yearError } = await supabase
      .from(tableName)
      .select('year')
      .not('year', 'is', null)
      .order('year', { ascending: false })
    
    if (yearError) {
      console.error('❌ Error fetching years:', yearError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching years',
        message: yearError.message 
      }, { status: 500 })
    }
    
    const uniqueYears = Array.from(new Set(yearData?.map((row: any) => row.year?.toString()).filter(Boolean) || [])) as string[]
    const sortedYears = uniqueYears.sort((a, b) => parseInt(b || '0') - parseInt(a || '0'))
    
    // Get unique months from tier table based on currency
    const { data: monthData, error: monthError } = await supabase
      .from(tableName)
      .select('month')
      .not('month', 'is', null)
      .order('month')
    
    if (monthError) {
      console.error('❌ Error fetching months:', monthError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching months',
        message: monthError.message 
      }, { status: 500 })
    }
    
    const uniqueMonths = Array.from(new Set(monthData?.map((row: any) => row.month as string).filter(Boolean) || [])) as string[]
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const sortedMonths = uniqueMonths.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b))
    const monthsWithAll = ['ALL', ...sortedMonths]
    
    // Get latest record for defaults from tier table based on currency
    const { data: latestRecord } = await supabase
      .from(tableName)
      .select('year, month')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
    
    // Use real data from database - no hardcoded fallback
    const defaultYear = latestRecord?.[0]?.year?.toString() || sortedYears[0] || null
    const defaultMonth = latestRecord?.[0]?.month || 'ALL' // 'ALL' is valid default for filter
    
    const slicerOptions = {
      lines: linesWithAll,
      years: sortedYears,
      months: monthsWithAll,
      defaults: {
        line: 'ALL',
        year: defaultYear,
        month: defaultMonth
      }
    }
    
    console.log('✅ [Admin Tier Management Slicer] Options loaded:', {
      lines: linesWithAll.length,
      years: sortedYears.length,
      months: monthsWithAll.length
    })
    
    return NextResponse.json({
      success: true,
      data: slicerOptions
    })
    
  } catch (error) {
    console.error('❌ [Admin Tier Management Slicer] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

