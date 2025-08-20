import { NextRequest, NextResponse } from 'next/server'
import { getUSCKPIData, getUSCMoMData, getUSCDailyAverageData, getUSCChartData } from '@/lib/USCLogic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || '2025'
    const month = searchParams.get('month') || 'January'
    const currency = searchParams.get('currency') || 'MYR'
    const line = searchParams.get('line') || 'All'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('🔍 [USC API] Fetching data with params:', { year, month, currency, line, startDate, endDate })

    // Fetch all USC data in parallel
    const [kpiData, momData, dailyAverageData, chartData] = await Promise.all([
      getUSCKPIData(year, month, currency, line, startDate, endDate),
      getUSCMoMData(year, month, currency, line, startDate, endDate),
      getUSCDailyAverageData(year, month, currency, line, startDate, endDate),
      getUSCChartData(year, month, currency, line, startDate, endDate)
    ])

    const response = {
      success: true,
      data: {
        kpi: kpiData,
        mom: momData,
        dailyAverage: dailyAverageData,
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
