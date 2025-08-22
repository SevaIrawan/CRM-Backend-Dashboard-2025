import { NextRequest, NextResponse } from 'next/server'
import { getRetentionDayData } from '@/lib/KPILogic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const year = searchParams.get('year') || '2025'
    const month = searchParams.get('month') || 'January'
    const currency = searchParams.get('currency') || 'MYR'
    const line = searchParams.get('line') || 'All'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('🔍 [Retention Day API] Fetching data with params:', {
      year, month, currency, line, startDate, endDate
    })

    const retentionData = await getRetentionDayData(year, month, currency, line, startDate, endDate)

    console.log('✅ [Retention Day API] Data fetched successfully:', {
      totalMembers: retentionData.totalMembers,
      memberDetailsCount: retentionData.memberDetails.length
    })

    return NextResponse.json(retentionData)

  } catch (error) {
    console.error('❌ [Retention Day API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch retention day data' },
      { status: 500 }
    )
  }
}
