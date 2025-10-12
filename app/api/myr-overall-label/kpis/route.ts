import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const line = searchParams.get('line')
  const grouping = searchParams.get('grouping')

  try {
    console.log('📊 Fetching KPI data with filters:', { line, grouping })

    // Validate grouping (mandatory for this function)
    if (!grouping || grouping === 'ALL') {
      console.log('⚠️ Grouping is ALL, returning zero KPIs')
      return NextResponse.json({
        success: true,
        kpis: {
          activeMultipleBrand: 0,
          priorityContinue: 0,
          continueBusiness: 0,
          continue: 0,
          priorityReactivate: 0,
          reactivate: 0
        },
        message: 'Please select a specific grouping (A, B, C, or D)'
      })
    }

    // Call Supabase RPC function overall_label_myr_kpi(p_group, p_line)
    const rpcParams = {
      p_group: grouping,
      p_line: (line && line !== 'ALL') ? line : null
    }

    console.log('🔧 Calling Supabase RPC overall_label_myr_kpi with params:', rpcParams)

    const { data, error } = await supabase.rpc('overall_label_myr_kpi', rpcParams)

    if (error) {
      console.error('❌ Supabase RPC error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while calling overall_label_myr_kpi',
        message: error.message,
        details: error
      }, { status: 500 })
    }

    const records = (data || []) as any[]
    console.log(`✅ RPC function returned ${records.length} records`)
    
    // Log first 5 records for debugging
    if (records.length > 0) {
      console.log('📊 Sample records from RPC (first 5):')
      records.slice(0, 5).forEach((r: any) => {
        console.log(`  ${r.unique_code}: ${r.base_label} → ${r.final_label}`)
      })
    }

    // Calculate KPIs from final_label (for 6 KPI cards)
    const kpis = calculateKPIs(records)

    // Calculate ALL final labels count for chart (exclude Remove)
    const finalLabelCounts = calculateAllFinalLabels(records)

    console.log('✅ KPIs calculated:', kpis)
    console.log('✅ Final label counts for chart:', finalLabelCounts)

    return NextResponse.json({
      success: true,
      kpis,
      finalLabelCounts, // For chart display
      filters: {
        line: line === 'ALL' ? null : line,
        grouping
      },
      totalRecords: records.length
    })

  } catch (error) {
    console.error('❌ Error fetching KPI data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching KPI data',
      details: error instanceof Error ? error.message : String(error)
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
    const finalLabel = row.final_label || ''
    
    if (finalLabel === 'Active Multiple Brands') {
      kpis.activeMultipleBrand++
    } else if (finalLabel === 'Priority Continue') {
      kpis.priorityContinue++
    } else if (finalLabel === 'Continue Business') {
      kpis.continueBusiness++
    } else if (finalLabel === 'Continue') {
      kpis.continue++
    } else if (finalLabel === 'Priority Reactivate') {
      kpis.priorityReactivate++
    } else if (finalLabel === 'Reactivate') {
      kpis.reactivate++
    }
  })

  return kpis
}

function calculateAllFinalLabels(data: any[]) {
  const labelCounts: { [key: string]: number } = {}

  data.forEach(row => {
    const finalLabel = row.final_label || ''
    
    // Exclude "Remove" from chart
    if (finalLabel && finalLabel !== 'Remove') {
      if (!labelCounts[finalLabel]) {
        labelCounts[finalLabel] = 0
      }
      labelCounts[finalLabel]++
    }
  })

  // Sort by count (descending) for better chart display
  const sortedLabels = Object.entries(labelCounts)
    .sort((a, b) => b[1] - a[1])
    .reduce((acc, [label, count]) => {
      acc[label] = count
      return acc
    }, {} as { [key: string]: number })

  return sortedLabels
}

