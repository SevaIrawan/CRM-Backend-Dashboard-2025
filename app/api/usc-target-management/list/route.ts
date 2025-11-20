import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * USC TARGET MANAGEMENT - LIST ALL TARGETS
 * ============================================================================
 * 
 * Get all targets for a year
 * Currency locked to USC
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const currency = 'USD' // USC stored as USD in bp_target table
    const year = searchParams.get('year') || '2025'

    console.log(`🔍 [USC Target List] Fetching targets for ${currency} ${year}`)

    // Fetch all targets for the year (now includes monthly breakdown)
    // Note: month column may be null for old records, handle gracefully
    const { data, error } = await supabase
      .from('bp_target')
      .select('*')
      .eq('currency', currency)
      .eq('year', year)
      .eq('is_active', true)
      .order('quarter', { ascending: true })
      .order('line', { ascending: true })
    
    // Sort by month manually (handle null values)
    if (data && data.length > 0) {
      const monthOrder: Record<string, number> = {
        'January': 1, 'February': 2, 'March': 3,
        'April': 4, 'May': 5, 'June': 6,
        'July': 7, 'August': 8, 'September': 9,
        'October': 10, 'November': 11, 'December': 12
      }
      
      data.sort((a: any, b: any) => {
        // Sort by quarter first
        const quarterOrder = ['Q1', 'Q2', 'Q3', 'Q4']
        const aQuarter = quarterOrder.indexOf(a.quarter) 
        const bQuarter = quarterOrder.indexOf(b.quarter)
        if (aQuarter !== bQuarter) return aQuarter - bQuarter
        
        // Then by month
        const aMonth = a.month ? (monthOrder[a.month] || 99) : 99
        const bMonth = b.month ? (monthOrder[b.month] || 99) : 99
        if (aMonth !== bMonth) return aMonth - bMonth
        
        // Finally by line
        return (a.line || '').localeCompare(b.line || '')
      })
    }

    if (error) {
      console.error('❌ [USC Target List] Supabase error:', error)
      throw error
    }

    console.log(`📊 [USC Target List] Found ${data?.length || 0} targets`)

    return NextResponse.json({
      success: true,
      targets: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('❌ [USC Target List] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch targets',
        details: error instanceof Error ? error.message : 'Unknown error',
        targets: []
      },
      { status: 500 }
    )
  }
}

