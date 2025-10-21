import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * BUSINESS PERFORMANCE SLICER OPTIONS API
 * ============================================================================
 * 
 * Source: blue_whale_myr_summary (MV)
 * Returns: Years, Quarters, Brands, Quarter Date Ranges, Defaults
 * 
 * Brands: Auto-detect unique brands from database for target input
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [BP Slicer API] Fetching options from blue_whale_myr_summary...')

    // Query MV for all available data
    // IMPORTANT: Extract month NUMBER from date since 'month' column is text
    const { data, error } = await supabase
      .from('blue_whale_myr_summary')
      .select('year, date, line')
      .order('year', { ascending: false })
      .order('date', { ascending: false })

    if (error) {
      console.error('❌ [BP Slicer API] Supabase error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ [BP Slicer API] No data found in blue_whale_myr_summary')
      return NextResponse.json({
        years: [],
        quarters: {},
        quarterDateRanges: {},
        defaults: {
          year: '2025',
          quarter: 'Q4',
          startDate: null,
          endDate: null
        }
      })
    }

    console.log(`📊 [BP Slicer API] Found ${data.length} rows in MV`)
    console.log(`🔍 [BP Slicer API] Sample data (first 3 rows):`, data.slice(0, 3))

    // ============================================================================
    // EXTRACT UNIQUE YEARS
    // ============================================================================
    const uniqueYears = Array.from(new Set(data.map((row: any) => row.year)))
      .filter((year): year is number => year !== null && year !== undefined)
      .sort((a, b) => b - a) // Descending

    const years = uniqueYears.map(y => y.toString())
    console.log(`📊 [BP Slicer API] Years:`, years)

    // ============================================================================
    // EXTRACT QUARTERS PER YEAR
    // ============================================================================
    const quartersByYear: Record<string, Set<string>> = {}

    data.forEach((row: any) => {
      if (!row.year || !row.date) return

      const yearStr = row.year.toString()
      if (!quartersByYear[yearStr]) {
        quartersByYear[yearStr] = new Set()
      }

      // Extract month number from date string (YYYY-MM-DD)
      const monthNum = parseInt(row.date.substring(5, 7))

      // Map month to quarter
      const quarter =
        monthNum >= 1 && monthNum <= 3 ? 'Q1' :
        monthNum >= 4 && monthNum <= 6 ? 'Q2' :
        monthNum >= 7 && monthNum <= 9 ? 'Q3' :
        'Q4'

      quartersByYear[yearStr].add(quarter)
    })

    const quarters: Record<string, string[]> = {}
    Object.keys(quartersByYear).forEach(year => {
      quarters[year] = Array.from(quartersByYear[year]).sort()
    })

    console.log(`📊 [BP Slicer API] Quarters:`, quarters)

    // ============================================================================
    // EXTRACT UNIQUE BRANDS (FOR TARGET INPUT)
    // ============================================================================
    const uniqueBrands = Array.from(new Set(
      data
        .map((row: any) => row.line)
        .filter((line: any): line is string => 
          line !== null && 
          line !== undefined && 
          line !== '' && 
          line !== 'ALL'
        )
    )).sort()

    console.log(`📊 [BP Slicer API] Brands:`, uniqueBrands)

    // ============================================================================
    // CALCULATE DATE RANGES PER QUARTER (BOUNDED)
    // ============================================================================
    const quarterDateRanges: Record<string, { min: string | null, max: string | null }> = {}

    Object.keys(quartersByYear).forEach(year => {
      const yearQuarters = Array.from(quartersByYear[year])

      yearQuarters.forEach(quarter => {
        const key = `${year}-${quarter}`

        const quarterMonths =
          quarter === 'Q1' ? [1, 2, 3] :
          quarter === 'Q2' ? [4, 5, 6] :
          quarter === 'Q3' ? [7, 8, 9] :
          [10, 11, 12]

        const quarterDates = data
          .filter((row: any) => {
            if (!row.year || !row.date) return false
            if (row.year?.toString() !== year) return false
            
            // Extract month number from date string (YYYY-MM-DD)
            const monthNum = parseInt(row.date.substring(5, 7))
            return quarterMonths.includes(monthNum)
          })
          .map((row: any) => row.date)
          .filter((date: any): date is string => date !== null && date !== undefined)
          .sort()

        console.log(`🔍 [BP Slicer API] ${key} quarterDates count: ${quarterDates.length}, sample:`, quarterDates.slice(0, 3))

        quarterDateRanges[key] = {
          min: quarterDates.length > 0 ? quarterDates[0] : null,
          max: quarterDates.length > 0 ? quarterDates[quarterDates.length - 1] : null
        }
      })
    })

    console.log(`📅 [BP Slicer API] Quarter date ranges:`, quarterDateRanges)

    // ============================================================================
    // DETERMINE DEFAULTS
    // ============================================================================
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    const defaultYear = years.includes(currentYear.toString())
      ? currentYear.toString()
      : years[0]

    const currentQuarter =
      currentMonth >= 1 && currentMonth <= 3 ? 'Q1' :
      currentMonth >= 4 && currentMonth <= 6 ? 'Q2' :
      currentMonth >= 7 && currentMonth <= 9 ? 'Q3' :
      'Q4'

    const availableQuarters = quarters[defaultYear] || []
    const defaultQuarter = availableQuarters.includes(currentQuarter)
      ? currentQuarter
      : availableQuarters[availableQuarters.length - 1] || 'Q4'

    const defaultQuarterKey = `${defaultYear}-${defaultQuarter}`
    const defaultQuarterRange = quarterDateRanges[defaultQuarterKey] || { min: null, max: null }

    // ============================================================================
    // RESPONSE
    // ============================================================================
    const response = {
      years,
      quarters,
      brands: uniqueBrands,
      quarterDateRanges,
      defaults: {
        year: defaultYear,
        quarter: defaultQuarter,
        startDate: defaultQuarterRange.min,
        endDate: defaultQuarterRange.max
      },
      meta: {
        totalRows: data.length,
        dataSource: 'blue_whale_myr_summary (MV)'
      }
    }

    console.log('✅ [BP Slicer API] Response ready')

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [BP Slicer API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch slicer options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
