import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TARGET ACHIEVE DETAILS API - MYR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PURPOSE: Fetch target achieve breakdown per brand with status indicators
// LOGIC:
//   - Quarterly Mode: Use target dari bp_target_myr sesuai quarter active
//   - Daily Mode: Breakdown target dari quarter proportionally
//   - Status: On Track (>= 90%), Behind (70-89%), Risk (< 70%), N/A (null)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface BrandKPI {
  brand: string
  ggrCurrent: number
  ggrTarget: number | null
  dcCurrent: number
  dcTarget: number | null
  daCurrent: number
  daTarget: number | null
  amCurrent: number
  amTarget: number | null
}

// Helper: Calculate status based on percentage
function calculateStatus(percentage: number | null): 'On Track' | 'Behind' | 'Risk' | 'N/A' {
  if (percentage === null) return 'N/A'
  if (percentage >= 90) return 'On Track'
  if (percentage >= 70) return 'Behind'
  return 'Risk'
}

// Helper: Calculate percentage
function calculatePercentage(current: number, target: number | null): number | null {
  if (target === null || target === 0) return null
  return (current / target) * 100
}

// Helper: Get quarter date range
function getQuarterDateRange(quarter: string, year: number): { startDate: string; endDate: string; daysInQuarter: number } {
  const ranges: Record<string, { start: string; end: string }> = {
    'Q1': { start: `${year}-01-01`, end: `${year}-03-31` },
    'Q2': { start: `${year}-04-01`, end: `${year}-06-30` },
    'Q3': { start: `${year}-07-01`, end: `${year}-09-30` },
    'Q4': { start: `${year}-10-01`, end: `${year}-12-31` }
  }
  
  const range = ranges[quarter]
  const start = new Date(range.start)
  const end = new Date(range.end)
  const daysInQuarter = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  return { startDate: range.start, endDate: range.end, daysInQuarter }
}

// Helper: Calculate days in date range
function calculateDaysInRange(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Extract filters
    const currency = searchParams.get('currency') || 'MYR'
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const quarter = searchParams.get('quarter') || 'Q4'
    const isDateRange = searchParams.get('isDateRange') === 'true'
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    
    console.log('🎯 [Target Achieve API] Filters:', { currency, year, quarter, isDateRange, startDate, endDate })
    
    // Determine query date range
    let queryStartDate: string
    let queryEndDate: string
    let daysInPeriod: number
    
    if (isDateRange) {
      queryStartDate = startDate
      queryEndDate = endDate
      daysInPeriod = calculateDaysInRange(startDate, endDate)
    } else {
      const quarterRange = getQuarterDateRange(quarter, year)
      queryStartDate = quarterRange.startDate
      queryEndDate = quarterRange.endDate
      daysInPeriod = quarterRange.daysInQuarter
    }
    
    console.log('📅 [Target Achieve API] Period:', { queryStartDate, queryEndDate, daysInPeriod })
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: FETCH CURRENT KPI PER BRAND
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const brands = ['SBMY', 'LVMY', 'STMY', 'JMMY', 'FWMY', 'UVMY']
    const brandKPIs: BrandKPI[] = []
    
    for (const brand of brands) {
      // Fetch current GGR, DC, DA
      const { data: financialData } = await supabase
        .from('blue_whale_myr')
        .select('deposit_amount, withdraw_amount, deposit_cases')
        .eq('currency', currency)
        .eq('line', brand)
        .gte('date', queryStartDate)
        .lte('date', queryEndDate)
      
      const ggrCurrent = financialData?.reduce((sum: number, row: any) => {
        const ggr = (row.deposit_amount || 0) - (row.withdraw_amount || 0)
        return sum + ggr
      }, 0) || 0
      const dcCurrent = financialData?.reduce((sum: number, row: any) => sum + (row.deposit_cases || 0), 0) || 0
      const daCurrent = financialData?.reduce((sum: number, row: any) => sum + (row.deposit_amount || 0), 0) || 0
      
      // Fetch current Active Member (COUNT DISTINCT userkey)
      const { data: amData } = await supabase
        .from('blue_whale_myr')
        .select('userkey')
        .eq('currency', currency)
        .eq('line', brand)
        .gte('date', queryStartDate)
        .lte('date', queryEndDate)
        .gt('deposit_cases', 0)
      
      const amCurrent = new Set(amData?.map((row: any) => row.userkey) || []).size
      
      brandKPIs.push({
        brand,
        ggrCurrent,
        ggrTarget: null,
        dcCurrent,
        dcTarget: null,
        daCurrent,
        daTarget: null,
        amCurrent,
        amTarget: null
      })
    }
    
    // Add MYR total row
    const myrTotal: BrandKPI = {
      brand: 'MYR',
      ggrCurrent: brandKPIs.reduce((sum, b) => sum + b.ggrCurrent, 0),
      ggrTarget: null,
      dcCurrent: brandKPIs.reduce((sum, b) => sum + b.dcCurrent, 0),
      dcTarget: null,
      daCurrent: brandKPIs.reduce((sum, b) => sum + b.daCurrent, 0),
      daTarget: null,
      amCurrent: brandKPIs.reduce((sum, b) => sum + b.amCurrent, 0),
      amTarget: null
    }
    
    console.log('✅ [Target Achieve API] Current KPIs calculated')
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: FETCH TARGET FROM bp_target
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const { data: targetData } = await supabase
      .from('bp_target')
      .select('*')
      .eq('currency', currency)
      .eq('year', year)
      .eq('quarter', quarter)
    
    console.log('🎯 [Target Achieve API] Target data fetched:', targetData?.length || 0, 'rows')
    
    // Map targets to brands
    if (targetData && targetData.length > 0) {
      // Determine if we need daily breakdown
      let breakdownRatio = 1
      
      if (isDateRange) {
        // Daily mode: calculate breakdown ratio
        const quarterRange = getQuarterDateRange(quarter, year)
        const daysInQuarter = quarterRange.daysInQuarter
        breakdownRatio = daysInPeriod / daysInQuarter
        console.log('📊 [Target Achieve API] Daily breakdown ratio:', breakdownRatio, `(${daysInPeriod} / ${daysInQuarter})`)
      }
      
      for (const targetRow of targetData) {
        const brand = targetRow.line
        const brandKPI = brandKPIs.find(b => b.brand === brand)
        
        if (brandKPI) {
          // Apply breakdown ratio if in daily mode
          const targetGgr = targetRow.target_ggr as number | null
          const targetDc = targetRow.target_deposit_cases as number | null
          const targetDa = targetRow.target_deposit_amount as number | null
          const targetAm = targetRow.target_active_member as number | null
          
          brandKPI.ggrTarget = targetGgr ? targetGgr * breakdownRatio : null
          brandKPI.dcTarget = targetDc ? targetDc * breakdownRatio : null
          brandKPI.daTarget = targetDa ? targetDa * breakdownRatio : null
          brandKPI.amTarget = targetAm ? targetAm * breakdownRatio : null
        }
      }
      
      // Calculate MYR total target
      myrTotal.ggrTarget = brandKPIs.reduce((sum, b) => sum + (b.ggrTarget || 0), 0)
      myrTotal.dcTarget = brandKPIs.reduce((sum, b) => sum + (b.dcTarget || 0), 0)
      myrTotal.daTarget = brandKPIs.reduce((sum, b) => sum + (b.daTarget || 0), 0)
      myrTotal.amTarget = brandKPIs.reduce((sum, b) => sum + (b.amTarget || 0), 0)
      
      // Set to null if sum is 0 (meaning no targets were set)
      if (myrTotal.ggrTarget === 0) myrTotal.ggrTarget = null
      if (myrTotal.dcTarget === 0) myrTotal.dcTarget = null
      if (myrTotal.daTarget === 0) myrTotal.daTarget = null
      if (myrTotal.amTarget === 0) myrTotal.amTarget = null
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: CALCULATE PERCENTAGE & STATUS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const details = [...brandKPIs, myrTotal].map(brandKPI => ({
      brand: brandKPI.brand,
      // GGR
      ggrCurrent: brandKPI.ggrCurrent,
      ggrTarget: brandKPI.ggrTarget,
      ggrPercentage: calculatePercentage(brandKPI.ggrCurrent, brandKPI.ggrTarget),
      ggrStatus: calculateStatus(calculatePercentage(brandKPI.ggrCurrent, brandKPI.ggrTarget)),
      // DC
      dcCurrent: brandKPI.dcCurrent,
      dcTarget: brandKPI.dcTarget,
      dcPercentage: calculatePercentage(brandKPI.dcCurrent, brandKPI.dcTarget),
      dcStatus: calculateStatus(calculatePercentage(brandKPI.dcCurrent, brandKPI.dcTarget)),
      // DA
      daCurrent: brandKPI.daCurrent,
      daTarget: brandKPI.daTarget,
      daPercentage: calculatePercentage(brandKPI.daCurrent, brandKPI.daTarget),
      daStatus: calculateStatus(calculatePercentage(brandKPI.daCurrent, brandKPI.daTarget)),
      // AM
      amCurrent: brandKPI.amCurrent,
      amTarget: brandKPI.amTarget,
      amPercentage: calculatePercentage(brandKPI.amCurrent, brandKPI.amTarget),
      amStatus: calculateStatus(calculatePercentage(brandKPI.amCurrent, brandKPI.amTarget))
    }))
    
    console.log('✅ [Target Achieve API] Response ready with', details.length, 'rows')
    
    return NextResponse.json({
      success: true,
      details
    })
    
  } catch (error) {
    console.error('❌ [Target Achieve API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch target achieve details' },
      { status: 500 }
    )
  }
}

