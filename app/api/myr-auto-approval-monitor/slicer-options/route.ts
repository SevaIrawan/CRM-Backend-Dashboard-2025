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

          // Auto-detect available months from actual data
          const { data: monthData, error: monthsError } = await supabase
            .from('deposit')
            .select('date')
            .eq('currency', 'MYR')
            .not('date', 'is', null)
            .order('date', { ascending: true })

          if (monthsError) {
            console.error('❌ Error fetching months:', monthsError)
            return NextResponse.json({
              success: false,
              error: 'Database error',
              message: monthsError.message
            }, { status: 500 })
          }

          // Auto-generate years and months based on actual data range
          const uniqueYears: string[] = []
          const uniqueMonths: string[] = []
          
          if (monthData && monthData.length > 0) {
            const startDate = new Date(monthData[0].date as string)
            const endDate = new Date(monthData[monthData.length - 1].date as string)
            
            // Generate all years between start and end date
            const currentYear = new Date(startDate.getFullYear(), 0, 1)
            const endYear = new Date(endDate.getFullYear(), 0, 1)
            
            while (currentYear <= endYear) {
              uniqueYears.push(currentYear.getFullYear().toString())
              currentYear.setFullYear(currentYear.getFullYear() + 1)
            }
            
            // Generate all months between start and end date
            const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
            const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
            
            while (current <= end) {
              const monthStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
              uniqueMonths.push(monthStr)
              current.setMonth(current.getMonth() + 1)
            }
          }

    // Get latest record for defaults
    const { data: latestRecord } = await supabase
      .from('deposit')
      .select('line')
      .eq('currency', 'MYR')
      .not('line', 'is', null)
      .order('date', { ascending: false })
      .limit(1)

          const defaultLine = latestRecord?.[0]?.line || linesWithAll[0] || 'ALL'
          const defaultYear = uniqueYears.length > 0 ? uniqueYears[uniqueYears.length - 1] : ''
          const defaultMonth = uniqueMonths.length > 0 ? uniqueMonths[uniqueMonths.length - 1] : ''

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
