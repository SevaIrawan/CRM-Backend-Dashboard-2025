import { NextRequest, NextResponse } from 'next/server'
import { getRetentionDayData } from '@/lib/retentionLogic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const year = searchParams.get('year') || '2025'
    const month = searchParams.get('month') || 'January'
    const line = searchParams.get('line') || 'ALL'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('📊 [USC Member-Analytic Retention API] Fetching retention data with USC lock:', {
      currency: 'USC', year, month, line, startDate, endDate
    })

    // USC pages always locked to USC currency
    const retentionData = await getRetentionDayData(year, month, 'USC', line, startDate, endDate)

    console.log('✅ [USC Member-Analytic Retention API] Retention data loaded:', {
      totalMembers: retentionData.totalMembers,
      premiumMembers: retentionData.premiumMembers,
      retentionCategoriesCount: retentionData.retentionDetails.length
    })

    return NextResponse.json({
      success: true,
      data: retentionData
    })

  } catch (error) {
    console.error('❌ [USC Member-Analytic Retention API] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch retention data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
