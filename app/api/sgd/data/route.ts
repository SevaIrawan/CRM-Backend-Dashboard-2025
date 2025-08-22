import { NextRequest, NextResponse } from 'next/server'
import { getRawKPIData, getLineChartData, getBarChartData } from '@/lib/KPILogic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || '2025'
    const month = searchParams.get('month') || 'January'
    const line = searchParams.get('line') || 'All'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // LOCK CURRENCY TO SGD for SGD pages
    const currency = 'SGD'

    console.log('🔍 [SGD API] Fetching data with params:', { year, month, currency, line, startDate, endDate })

    // Use KPILogic functions with member_report_monthly table
    const filters = { year, month, currency, line, startDate, endDate }
    
    const [kpiData, lineChartData, barChartData] = await Promise.all([
      getRawKPIData(filters),
      getLineChartData(filters),
      getBarChartData(filters)
    ])

    console.log('🔍 [SGD API] KPI and Chart data fetched, kpiData:', kpiData)

    const response = {
      success: true,
      data: {
        kpi: kpiData,
        chart: {
          lineChart: lineChartData,
          barChart: barChartData
        }
      },
      params: { year, month, currency }
    }

    console.log('✅ [SGD API] Data fetched successfully')
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [SGD API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch SGD data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
