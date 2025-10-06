import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR Auto Approval Monitor API] Fetching slicer options for MYR currency')
    
    // Get DISTINCT lines from deposit table for MYR currency
    const { data: allLines, error: linesError } = await supabase
      .from('deposit')
      .select('line')
      .eq('currency', 'MYR')
      .not('line', 'is', null)

    console.log('📊 [DEBUG] Lines query result:', { 
      dataCount: allLines?.length, 
      error: linesError,
      sampleData: allLines?.slice(0, 3)
    })

    if (linesError) {
      console.error('❌ Error fetching lines:', linesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: linesError.message 
      }, { status: 500 })
    }

          const uniqueLines = Array.from(new Set(allLines?.map(row => row.line).filter(Boolean) || []))
          const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
          const linesWithAll = ['ALL', ...cleanLines.sort()]

          // Get DISTINCT years from deposit table for MYR currency
          const { data: yearData, error: yearsError } = await supabase
            .from('deposit')
            .select('year')
            .eq('currency', 'MYR')
            .not('year', 'is', null)

          if (yearsError) {
            console.error('❌ Error fetching years:', yearsError)
            return NextResponse.json({
              success: false,
              error: 'Database error',
              message: yearsError.message
            }, { status: 500 })
          }

          // Get DISTINCT months from deposit table for MYR currency
          const { data: monthData, error: monthsError } = await supabase
            .from('deposit')
            .select('month')
            .eq('currency', 'MYR')
            .not('month', 'is', null)

          if (monthsError) {
            console.error('❌ Error fetching months:', monthsError)
            return NextResponse.json({
              success: false,
              error: 'Database error',
              message: monthsError.message
            }, { status: 500 })
          }

          // Process years data
          const uniqueYears = Array.from(new Set(yearData?.map(row => row.year?.toString()).filter(Boolean) || [])).sort()

          // Process months data (get distinct month names only)
          const uniqueMonths = Array.from(new Set(
            monthData?.map(row => row.month).filter(Boolean) || []
          )).sort()

    // Get latest record for defaults
    const { data: latestRecord } = await supabase
      .from('deposit')
      .select('line, year, month')
      .eq('currency', 'MYR')
      .not('line', 'is', null)
      .not('year', 'is', null)
      .not('month', 'is', null)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)

          const defaultLine = latestRecord?.[0]?.line || linesWithAll[0] || 'ALL'
          const defaultYear = latestRecord?.[0]?.year?.toString() || (uniqueYears.length > 0 ? uniqueYears[uniqueYears.length - 1] : '')
          const defaultMonth = latestRecord?.[0]?.month || (uniqueMonths.length > 0 ? uniqueMonths[uniqueMonths.length - 1] : '')

          const slicerOptions = {
            lines: linesWithAll,
            years: uniqueYears,
            months: uniqueMonths,
            defaults: {
              line: defaultLine,
              year: defaultYear,
              month: defaultMonth
            }
          }

          console.log('✅ [MYR Auto Approval Monitor API] Simple slicer options:', {
            lines: linesWithAll.length,
            years: uniqueYears.length,
            months: uniqueMonths.length,
            availableYears: uniqueYears,
            availableMonths: uniqueMonths.slice(0, 5), // Show first 5 months
            defaults: { defaultLine, defaultYear, defaultMonth }
          })

    return NextResponse.json({
      success: true,
      data: slicerOptions
    })
    
  } catch (error) {
    console.error('❌ [MYR Auto Approval Monitor API] Error getting slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
