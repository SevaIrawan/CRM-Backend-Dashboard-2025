import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Temporary data API for AIA Candy Tracking reusing deposit source like Deposit Auto-Approval
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const line = searchParams.get('line')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    // Fetch deposit data filtered by slicers (same pattern as auto-approval)
    let query = supabase.from('deposit').select('*').eq('currency', 'MYR')
    if (line && line !== 'ALL') query = query.eq('line', line)
    if (year) query = query.eq('year', parseInt(year))
    if (month) query = query.eq('month', month)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch data', message: error.message }, { status: 500 })
    }

    // Build simple dummy analytics for charts (12 days) from data or fallback
    const labels: string[] = []
    const today = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      labels.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }

    // Simple mocked metrics (can be replaced with real AIA table later)
    const seriesHelper = (base: number, amplitude: number) => labels.map((_, idx) => Math.max(0, Math.round(base + Math.sin(idx / 2) * amplitude + (idx % 4))))

    const response = NextResponse.json({
      success: true,
      data: {
        labels,
        metrics: {
          groupInteractionCoverageRate: seriesHelper(40, 15),
          customerTriggerCount: seriesHelper(50, 20),
          uniqueInteractionUsers: seriesHelper(45, 18),
          customerTriggerRatio: labels.map((_, i) => Number(((30 + (i % 10)) / 100).toFixed(2))),
          groupActivityChange: seriesHelper(10, 8).map(v => v - 12),
          repeatInteractionRate: labels.map((_, i) => Number(((20 + (i % 8)) / 100).toFixed(2)))
        }
      }
    })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}


