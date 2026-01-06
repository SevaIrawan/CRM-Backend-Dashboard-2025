import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Pure Member Analysis MYR] Fetching slicer options...')

    // Get unique years from MV table
    const { data: yearData, error: yearError } = await supabase
      .from('db_myr_lifetime_customer_yearly_summary')
      .select('year')
      .not('year', 'is', null)
      .order('year', { ascending: false })

    if (yearError) {
      console.error('❌ Error fetching years:', yearError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching years',
        message: yearError.message 
      }, { status: 500 })
    }

    const years = Array.from(new Set(yearData?.map(row => row.year?.toString()).filter(Boolean) || [])) as string[]
    
    // Default to latest year
    const defaultYear = years.length > 0 ? years[0] : ''
    const defaultMetrics = 'new_depositor'

    console.log('✅ [Pure Member Analysis MYR] Slicer options loaded:', {
      years_count: years.length,
      defaults: { year: defaultYear, metrics: defaultMetrics }
    })

    return NextResponse.json({
      success: true,
      data: {
        years,
        defaults: {
          year: defaultYear,
          metrics: defaultMetrics
        }
      }
    })

  } catch (error) {
    console.error('❌ [Pure Member Analysis MYR] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching slicer options' 
    }, { status: 500 })
  }
}

