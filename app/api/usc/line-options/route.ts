import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [USC Line API] Fetching line options')

    // Get unique lines from member_report_daily table (currency locked to USC)
    const { data: lineData, error: lineError } = await supabase
      .from('member_report_daily')
      .select('line')
      .eq('currency', 'USC')
      .not('line', 'is', null)
      .order('line', { ascending: true })

    if (lineError) {
      console.error('❌ [USC Line API] Line data error:', lineError)
      throw lineError
    }

    // Extract unique lines and add "All Lines" option (only one, not double)
    const uniqueLines = Array.from(new Set(
      lineData?.map(row => row.line).filter(Boolean) || []
    ))
    const lines = ['All Lines', ...uniqueLines]

    const response = {
      success: true,
      data: {
        lines
      }
    }

    console.log('✅ [USC Line API] Line options fetched:', {
      linesCount: lines.length,
      currency: 'USC'
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [USC Line API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch USC line options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
