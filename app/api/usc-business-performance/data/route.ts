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
    
    // Support both date range and year/month formats
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const line = searchParams.get('line') || 'ALL'
    const squadLead = searchParams.get('squadLead')
    const channel = searchParams.get('channel')
    
    // Validate: must have either date range or year/month
    if (!startDate && !endDate && (!year || !month)) {
      return NextResponse.json({
        success: false,
        error: 'Either (startDate, endDate) or (year, month) parameters are required'
      }, { status: 400 })
    }
    
    console.log('📊 [USC BP Data] Parameters:', { startDate, endDate, year, month, line, squadLead, channel })
    
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
    
    // Build filters object
    const filters: any = {
      line: line !== 'ALL' ? line : undefined,
      squadLead: squadLead && squadLead !== 'All' && squadLead !== 'ALL' ? squadLead : undefined,
      channel: channel && channel !== 'All' && channel !== 'ALL' ? channel : undefined
    }
    
    // Use date range if provided, otherwise use year/month
    if (startDate && endDate) {
      filters.startDate = startDate
      filters.endDate = endDate
    } else {
      filters.year = year
      filters.month = month
    }
    
    // Calculate KPIs with MoM
    const result = await getAllUSCBPKPIsWithMoM(filters)
    
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

