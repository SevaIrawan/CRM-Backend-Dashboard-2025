import { NextRequest, NextResponse } from 'next/server'
import { getChurnMemberData } from '@/lib/USCLogic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || '2025'
    const month = searchParams.get('month') || 'January'
    const currency = searchParams.get('currency') || 'MYR'
    const line = searchParams.get('line') || 'All'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const periodType = searchParams.get('periodType') as 'yearly' | 'monthly' | 'weekly' | 'daily' || 'monthly'

    console.log('🔍 [USC Churn Member API] Fetching data:', { year, month, currency, line, startDate, endDate, periodType })

    const churnData = await getChurnMemberData(year, month, currency, line, startDate, endDate, periodType)

    console.log('✅ [USC Churn Member API] Data fetched successfully')
    
    return NextResponse.json({
      status: 200,
      success: true,
      data: churnData,
      params: { year, month, currency, line, startDate, endDate, periodType }
    })

  } catch (error) {
    console.error('❌ [USC Churn Member API] Error:', error)
    return NextResponse.json({
      status: 500,
      success: false,
      error: 'Failed to fetch churn member data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
