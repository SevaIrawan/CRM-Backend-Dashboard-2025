import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const line = searchParams.get('line')
  const grouping = searchParams.get('grouping')

  try {
    console.log('📊 Fetching KPI data with filters:', { line, grouping })

    // Build query with filters
    let query = supabase.from('overall_label_myr_mv').select('label')

    if (line && line !== 'ALL') {
      query = query.filter('line', 'eq', line)
    }

    if (grouping && grouping !== 'ALL') {
      query = query.filter('grouping', 'eq', grouping)
    }

    const result = await query

    if (result.error) {
      console.error('❌ Supabase query error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching KPI data',
        message: result.error.message 
      }, { status: 500 })
    }

    // Calculate KPIs from data
    const kpis = calculateKPIs(result.data || [])

    console.log('✅ KPIs calculated:', kpis)

    return NextResponse.json({
      success: true,
      kpis
    })

  } catch (error) {
    console.error('❌ Error fetching KPI data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching KPI data' 
    }, { status: 500 })
  }
}

function calculateKPIs(data: any[]) {
  const kpis = {
    activeMultipleBrand: 0,
    priorityContinue: 0,
    continueBusiness: 0,
    continue: 0,
    priorityReactivate: 0,
    reactivate: 0
  }

  data.forEach(row => {
    const label = row.label || ''
    
    if (label === 'Active Multiple Brand') {
      kpis.activeMultipleBrand++
    } else if (label === 'Priority Continue') {
      kpis.priorityContinue++
    } else if (label === 'Continue Business') {
      kpis.continueBusiness++
    } else if (label === 'Continue') {
      kpis.continue++
    } else if (label === 'Priority Reactivate') {
      kpis.priorityReactivate++
    } else if (label === 'Reactivate') {
      kpis.reactivate++
    }
  })

  return kpis
}

