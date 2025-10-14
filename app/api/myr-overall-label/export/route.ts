import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Exporting overall_label_myr_mv data (NO SLICER FILTERS - ALL DATA)')

    // Build query - NO SLICER FILTERS - Fetch ALL data without limit
    // Note: Supabase default limit is 1000, we need to override it
    let query = supabase
      .from('overall_label_myr_mv')
      .select('*')
      .range(0, 999999) // Fetch up to 1 million records (all data)

    // Get all data for export
    const result = await query

    if (result.error) {
      console.error('❌ Export query error:', result.error)
      return NextResponse.json({ 
        error: 'Database error during export',
        message: result.error.message 
      }, { status: 500 })
    }

    // Sort by positive labels first
    const sortedData = sortByPositiveLabels(result.data || [])
    console.log(`📊 Export completed: ${sortedData.length} records`)
    
    const data = sortedData

    if (data.length === 0) {
      return NextResponse.json({ 
        error: 'No data found' 
      }, { status: 404 })
    }

    // Define columns to export (in order) - SYNC with displayColumns in page.tsx
    const exportColumns = [
      'unique_code',
      'label',
      'brand_count',
      'brand_active',
      'active_period_months',
      'avg_deposit_amount',
      // Avg Monthly metrics (after AVG DEPOSIT AMOUNT)
      'avg_monthly_da',
      'avg_monthly_cases',
      'monthly_avg_net_profit',
      'total_net_profit',
      'total_da',
      'total_dc',
      // Withdraw metrics (after Total DC)
      'total_withdraw_cases',
      'total_withdraw_amount',
      // Percentage metrics (after Total Withdraw Amount)
      'winrate',
      'withdrawal_rate',
      'first_deposit_date',
      'last_deposit_date',
      'active_group_count',
      'active_top_3_groups',
      'historical_groups_count',
      'historical_top_3_groups',
      'net_profit_all_brand'
    ]

    // Create CSV header
    const csvHeader = exportColumns.map(col => col.toUpperCase().replace(/_/g, ' ')).join(',')
    
    // Create CSV rows
    const csvRows = data.map(row => {
      return exportColumns.map(col => {
        const value = (row as any)[col]
        // Format numbers and handle null values
        if (value === null || value === undefined || value === '') {
          return '-'
        }
        if (typeof value === 'number') {
          // Special formatting for percentage columns
          if (col === 'winrate' || col === 'withdrawal_rate') {
            // Convert to percentage with 2 decimal places
            const pct = value <= 1 && value >= 0 ? value * 100 : value
            return `${pct.toFixed(2)}%`
          }
          // For integers, return as-is (no decimal)
          if (Number.isInteger(value)) {
            return value.toString()
          }
          // For decimals, return with 2 decimal places (no comma separator)
          return value.toFixed(2)
        }
        // Escape commas and quotes in string values
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    })

    // Combine header and rows
    const csvContent = [csvHeader, ...csvRows].join('\n')
    
    // Add BOM (Byte Order Mark) for proper UTF-8 encoding in Excel
    const csvWithBOM = '\ufeff' + csvContent

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `myr_overall_label_export_${timestamp}.csv`

    // Return CSV file
    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('❌ Error exporting overall label data:', error)
    return NextResponse.json({ 
      error: 'Internal server error during export' 
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

