import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching slicer options from dbmyr_summary...')

    // Get unique lines
    const { data: lineData, error: lineError } = await supabase
      .from('dbmyr_summary')
      .select('line')
      .not('line', 'is', null)
      .order('line')

    if (lineError) {
      console.error('❌ Error fetching lines:', lineError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching lines',
        message: lineError.message 
      }, { status: 500 })
    }

    // Get unique groupings
    const { data: groupingData, error: groupingError } = await supabase
      .from('dbmyr_summary')
      .select('grouping')
      .not('grouping', 'is', null)
      .order('grouping')

    if (groupingError) {
      console.error('❌ Error fetching groupings:', groupingError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching groupings',
        message: groupingError.message 
      }, { status: 500 })
    }

    // Process data
    const lines = Array.from(new Set(lineData?.map(row => row.line).filter(Boolean) || [])) as string[]
    const groupings = Array.from(new Set(groupingData?.map(row => row.grouping).filter(Boolean) || [])) as string[]

    console.log('✅ Slicer options processed:', {
      lines: lines.length,
      groupings: groupings.length
    })

    return NextResponse.json({
      success: true,
      data: {
        lines,
        groupings
      }
    })

  } catch (error) {
    console.error('❌ Error fetching slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching slicer options'   
    }, { status: 500 })
  }
}

