import { NextRequest, NextResponse } from 'next/server'
import { calculateUSCKPIs } from '@/lib/USCLogic.ts'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // USC Member-Analytic page - Currency LOCKED to USC
  const currency = 'USC'
  const line = searchParams.get('line')
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  try {
    console.log('📊 [USC Member-Analytic KPI API] Fetching KPI data:', { 
      currency, line, year, month 
    })

    // Calculate all KPIs using USCLogic (hybrid approach)
    const kpiData = await calculateUSCKPIs({
      year: year || '2025',
      month: month || 'September',
      line: line || undefined
    })

    return NextResponse.json({
      success: true,
      data: kpiData,
      meta: {
        dataSource: 'blue_whale_usc + blue_whale_usc_summary (via USCLogic)',
        currency: 'USC',
        filters: { line, year, month }
      }
    })

  } catch (error) {
    console.error('❌ [USC Member-Analytic KPI API] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

