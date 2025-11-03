import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR Auto Approval Monitor API] Fetching slicer options for MYR currency - FORCE MAX DATE')
    
    // Get ALL DISTINCT lines from deposit table for MYR currency
    // Use .range() with very large number to get UNLIMITED data (bypass default 1000 limit)
    const { data: allLines, error: linesError, count } = await supabase
      .from('deposit')
      .select('line', { count: 'exact' })
      .eq('currency', 'MYR')
      .not('line', 'is', null)
      .range(0, 999999) // Unlimited range

    console.log('📊 [DEBUG] Lines query result:', { 
      totalCount: count,
      dataCount: allLines?.length, 
      error: linesError,
      sampleData: allLines?.slice(0, 10),
      allUniqueLines: allLines ? Array.from(new Set(allLines.map(row => row.line))) : []
    })

    if (linesError) {
      console.error('❌ Error fetching lines:', linesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        message: linesError.message 
      }, { status: 500 })
    }

          // Extract unique lines from all records
          const uniqueLines = Array.from(new Set(allLines?.map(row => row.line).filter(Boolean) || []))
          console.log('📊 [DEBUG] Unique lines extracted:', uniqueLines)
          
          const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
          console.log('📊 [DEBUG] Clean lines (without ALL):', cleanLines)
          
          const linesWithAll = ['ALL', ...cleanLines.sort()]
          console.log('📊 [DEBUG] Final lines with ALL:', linesWithAll)

          // Get DISTINCT years from deposit table for MYR currency (UNLIMITED)
          const { data: yearData, error: yearsError } = await supabase
            .from('deposit')
            .select('year')
            .eq('currency', 'MYR')
            .not('year', 'is', null)
            .range(0, 999999) // Unlimited range

          if (yearsError) {
            console.error('❌ Error fetching years:', yearsError)
            return NextResponse.json({
              success: false,
              error: 'Database error',
              message: yearsError.message
            }, { status: 500 })
          }

          // Get DISTINCT months from deposit table for MYR currency (UNLIMITED)
          const { data: monthData, error: monthsError } = await supabase
            .from('deposit')
            .select('month')
            .eq('currency', 'MYR')
            .not('month', 'is', null)
            .range(0, 999999) // Unlimited range

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
          ))
          
          console.log('🔍 [DEBUG MONTHS] Raw month data count:', monthData?.length)
          console.log('🔍 [DEBUG MONTHS] Unique months BEFORE sort:', uniqueMonths)
          console.log('🔍 [DEBUG MONTHS] Has November?:', uniqueMonths.includes('November'))
          
          // Sort chronologically
          const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                             'July', 'August', 'September', 'October', 'November', 'December']
          const sortedMonths = uniqueMonths.sort((a: string, b: string) => monthOrder.indexOf(a) - monthOrder.indexOf(b))
          
          console.log('🔍 [DEBUG MONTHS] Sorted months:', sortedMonths)
          
          // Get month date ranges (min/max dates per year-month)
          const monthDateRanges: Record<string, { min: string | null, max: string | null }> = {}
          
          for (const year of uniqueYears) {
            for (const month of uniqueMonths) {
              // Skip if year or month is invalid
              if (!year || !month) continue
              
              const { data: monthDates } = await supabase
                .from('deposit')
                .select('date')
                .eq('currency', 'MYR')
                .eq('year', parseInt(year))
                .eq('month', month)
                .not('date', 'is', null)
                .order('date', { ascending: true })
                
              if (monthDates && monthDates.length > 0) {
                const dates = monthDates
                  .map(d => d.date)
                  .filter((date): date is string => typeof date === 'string' && date.length > 0)
                const monthKey = `${year}-${month}`
                monthDateRanges[monthKey] = {
                  min: dates.length > 0 ? dates[0] : null,
                  max: dates.length > 0 ? dates[dates.length - 1] : null
                }
              }
            }
          }

    // Get latest record for defaults - FORCE MAX DATE DATA
    const { data: latestRecord } = await supabase
      .from('deposit')
      .select('line, year, month, date')
      .eq('currency', 'MYR')
      .not('line', 'is', null)
      .not('year', 'is', null)
      .not('month', 'is', null)
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1) // Only need 1 latest record for defaults

    console.log('🔍 [FORCE MAX DATE] Latest record:', latestRecord?.[0])

    // Force defaults to use MAX DATE data
    const defaultLine = latestRecord?.[0]?.line || linesWithAll[0] || 'ALL'
    const defaultYear = latestRecord?.[0]?.year?.toString() || (uniqueYears.length > 0 ? uniqueYears[uniqueYears.length - 1] : '')
    const defaultMonth = latestRecord?.[0]?.month || (uniqueMonths.length > 0 ? uniqueMonths[uniqueMonths.length - 1] : '')
    
    // Get default month date range for startDate/endDate
    const defaultMonthKey = `${defaultYear}-${defaultMonth}`
    const defaultStartDate = monthDateRanges[defaultMonthKey]?.min || null
    const defaultEndDate = monthDateRanges[defaultMonthKey]?.max || null
    
    console.log('🔍 [FORCE MAX DATE] Forced defaults:', { defaultLine, defaultYear, defaultMonth, defaultStartDate, defaultEndDate })

          const slicerOptions = {
            lines: linesWithAll,
            years: uniqueYears,
            months: sortedMonths,
            monthDateRanges,
            defaults: {
              line: defaultLine,
              year: defaultYear,
              month: defaultMonth,
              startDate: defaultStartDate,
              endDate: defaultEndDate
            }
          }

          console.log('✅ [MYR Auto Approval Monitor API] Simple slicer options:', {
            lines: linesWithAll.length,
            years: uniqueYears.length,
            months: sortedMonths.length,
            availableYears: uniqueYears,
            availableMonths: sortedMonths, // Show ALL months
            defaults: { defaultLine, defaultYear, defaultMonth }
          })

    const response = NextResponse.json({
      success: true,
      data: slicerOptions
    })
    
    // Add cache busting headers to force fresh data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('❌ [MYR Auto Approval Monitor API] Error getting slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
