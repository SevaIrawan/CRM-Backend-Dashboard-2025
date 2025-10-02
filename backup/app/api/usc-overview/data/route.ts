import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUSCPrecisionKPIs } from '@/lib/USCPrecisionKPIs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Currency is LOCKED to USC for Overview page
  const currency = 'USC' 
  const line = searchParams.get('line')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const filterMode = searchParams.get('filterMode')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('📊 [USC Overview API] Fetching data with USC currency lock:', { 
      currency, line, year, month, startDate, endDate, filterMode, page, limit 
    })


    // Use MV for aggregated data and detail table for precision KPIs (hybrid approach)
    const mvFilters = {
      currency: 'USC' as const,
      line,
      year,
      month: month === 'ALL' ? null : month, // Allow ALL months when month=ALL
      startDate,
      endDate,
      filterMode: (filterMode === 'month' || filterMode === 'daterange') ? filterMode : null
    }

    // Get summary data from MV (MV already filtered by currency USC)
    let summaryQuery = supabase
      .from('blue_whale_usc_summary')
      .select('*')

    if (line && line !== 'ALL') {
      summaryQuery = summaryQuery.eq('line', line)
    }
    
    if (year && year !== 'ALL') {
      summaryQuery = summaryQuery.eq('year', parseInt(year))
    }
    
    if (month && month !== 'ALL') {
      summaryQuery = summaryQuery.eq('month', month)
    }

    summaryQuery = summaryQuery.order('date', { ascending: false })

    const { data: summaryData, error: summaryError } = await summaryQuery

    if (summaryError) {
      console.error('❌ [USC Overview API] Error fetching summary data:', summaryError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: summaryError.message 
      }, { status: 500 })
    }

    // Get precision KPIs from detail table
    const precision = await getUSCPrecisionKPIs({
      line,
      year,
      month,
      startDate,
      endDate,
      filterMode: (filterMode === 'month' || filterMode === 'daterange') ? filterMode : null
    })

    console.log(`✅ [USC Overview API] Loaded ${summaryData?.length || 0} summary records + precision KPIs`)

    return NextResponse.json({
      success: true,
      data: summaryData || [],
      precisionKPIs: precision,
      filters: {
        currency: 'USC',
        line,
        year,
        month,
        filterMode
      }
    })

  } catch (error) {
    console.error('❌ [USC Overview API] Error fetching data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
