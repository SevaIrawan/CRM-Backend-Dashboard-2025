import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const line = searchParams.get('line')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('📊 Fetching overall_label_myr_mv data (NO SLICER FILTERS - ALL DATA):', { 
      page, limit 
    })

    // Build base query - NO SLICER FILTERS - Fetch ALL data
    let baseQuery = supabase.from('overall_label_myr_mv').select('*')

    // Get total count first (separate query) - NO FILTERS
    let countQuery = supabase.from('overall_label_myr_mv').select('*', { count: 'exact', head: true })
    
    const countResult = await countQuery
    const totalRecords = countResult.count || 0

    console.log(`📊 Total records found: ${totalRecords}`)

    // Get all data first for custom sorting
    const allDataResult = await baseQuery

    if (allDataResult.error) {
      console.error('❌ Supabase query error:', allDataResult.error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching overall label data',
        message: allDataResult.error.message 
      }, { status: 500 })
    }

    // Custom sort: Positive labels first, then by label name
    const sortedData = sortByPositiveLabels(allDataResult.data || [])
    
    // Apply pagination to sorted data
    const offset = (page - 1) * limit
    const paginatedData = sortedData.slice(offset, offset + limit)
    
    const totalPages = Math.ceil(totalRecords / limit)
    console.log(`✅ Found ${paginatedData.length} records (Page ${page} of ${totalPages})`)

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('❌ Error fetching overall label data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching overall label data' 
    }, { status: 500 })
  }
}

function sortByPositiveLabels(data: any[]) {
  // Function to get label category priority
  const getLabelPriority = (label: string): number => {
    if (label === 'Positive') return 1
    if (label === 'GGR Negative') return 2
    if (label === 'Under Review') return 3
    if (label === 'Remove') return 4
    return 999 // Unknown labels last
  }

  return data.sort((a, b) => {
    const priorityA = getLabelPriority(a.label)
    const priorityB = getLabelPriority(b.label)
    
    // 1. Sort by label category (Positive → GGR Negative → Under Review → Remove)
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }
    
    // 2. Within same category, sort by monthly_avg_net_profit (highest first)
    const netProfitA = a.monthly_avg_net_profit || 0
    const netProfitB = b.monthly_avg_net_profit || 0
    return netProfitB - netProfitA // Descending order (highest first)
  })
}
