import { NextRequest, NextResponse } from 'next/server'
import { getAllUSCBPKPIsWithMoM } from '@/lib/USCBusinessPerformanceLogic'

/**
 * ============================================================================
 * USC BUSINESS PERFORMANCE - MAIN DATA API
 * ============================================================================
 * 
 * Purpose: Provide KPI data for USC Business Performance page
 * 
 * Returns:
 * - Main KPIs (GGR, Active Member Rate, Retention Rate)
 * - Dual KPIs (Active Member, Pure Member, ATV, PF, DA, WA)
 * - MoM Comparison for all KPIs
 * 
 * ============================================================================
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const line = searchParams.get('line') || 'ALL'
    
    if (!year || !month) {
      return NextResponse.json({
        success: false,
        error: 'year and month parameters are required'
      }, { status: 400 })
    }
    
    console.log('📊 [USC BP Data] Parameters:', { year, month, line })
    
    // Get user's allowed brands from header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? 
      JSON.parse(userAllowedBrandsHeader) : null
    
    // Brand access control
    if (line && line !== 'ALL') {
      if (userAllowedBrands && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized access to this brand'
        }, { status: 403 })
      }
    }
    
    // Calculate KPIs with MoM
    const result = await getAllUSCBPKPIsWithMoM({
      year,
      month,
      line: line !== 'ALL' ? line : undefined
    })
    
    return NextResponse.json({
      success: true,
      data: {
        kpis: result.current,
        mom: result.mom
      }
    })
    
  } catch (error) {
    console.error('❌ [USC BP Data] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

