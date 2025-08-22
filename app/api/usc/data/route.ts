import { NextRequest, NextResponse } from 'next/server'
import { getUSCKPIData, getUSCChartData } from '@/lib/USCLogic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || '2025'
    const month = searchParams.get('month') || 'January'
    // LOCK CURRENCY TO USC for USC pages
    const currency = 'USC'
    const line = searchParams.get('line') || 'All'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('🔍 [USC API] Fetching data with params:', { year, month, currency, line, startDate, endDate })

    console.log('🔍 [USC API] About to call getUSCKPIData...')
    // Fetch only KPI and Chart data from API
    // MoM and Daily Average will be calculated separately in the frontend
    const [kpiData, chartData] = await Promise.all([
      getUSCKPIData(year, month, currency, line, startDate, endDate),
      getUSCChartData(year, month, currency, line, startDate, endDate)
    ])
    console.log('🔍 [USC API] KPI and Chart data fetched, kpiData:', kpiData)

    const response = {
      success: true,
      data: {
        kpi: kpiData,
        chart: chartData
      },
      params: { year, month, currency }
    }

    console.log('✅ [USC API] Data fetched successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [USC API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch USC data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
