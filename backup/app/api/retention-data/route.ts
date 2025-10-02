import { NextRequest, NextResponse } from 'next/server'
import { getRetentionDayData } from '@/lib/retentionLogic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const year = searchParams.get('year') || '2025'
    const month = searchParams.get('month') || 'January'
    const currency = searchParams.get('currency') || 'USC'
    const line = searchParams.get('line') || 'ALL'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('📊 [Generic Retention API] Fetching retention data:', {
      currency, year, month, line, startDate, endDate
    })

    // Validate currency
    const validCurrencies = ['USC', 'MYR', 'SGD']
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}`
      }, { status: 400 })
    }

    const retentionData = await getRetentionDayData(year, month, currency, line, startDate, endDate)

    console.log(`✅ [Generic Retention API] ${currency} retention data loaded:`, {
      totalMembers: retentionData.totalMembers,
      premiumMembers: retentionData.premiumMembers,
      retentionCategoriesCount: retentionData.retentionDetails.length
    })

    return NextResponse.json({
      success: true,
      data: retentionData,
      metadata: {
        currency,
        year,
        month,
        line,
        dateRange: startDate && endDate ? { startDate, endDate } : null
      }
    })

  } catch (error) {
    console.error('❌ [Generic Retention API] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch retention data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
