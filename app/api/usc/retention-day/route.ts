import { NextRequest, NextResponse } from 'next/server'
import { getRetentionDayData } from '@/lib/USCLogic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || '2025'
    const month = searchParams.get('month') || 'January'
    const currency = searchParams.get('currency') || 'MYR'
    const line = searchParams.get('line') || 'All'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('🔍 [USC Retention Day API] Fetching data:', { year, month, currency, line, startDate, endDate })

    const retentionData = await getRetentionDayData(year, month, currency, line, startDate, endDate)

    console.log('✅ [USC Retention Day API] Data fetched successfully')
    
    return NextResponse.json({
      status: 200,
      success: true,
      data: retentionData,
      params: { year, month, currency, line, startDate, endDate }
    })

  } catch (error) {
    console.error('❌ [USC Retention Day API] Error:', error)
    return NextResponse.json({
      status: 500,
      success: false,
      error: 'Failed to fetch retention day data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
