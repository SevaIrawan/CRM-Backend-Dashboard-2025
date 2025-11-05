import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterBrandsByUser, removeAllOptionForSquadLead } from '@/utils/brandAccessHelper'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR Auto Approval Withdraw API] Fetching slicer options for MYR currency - FORCE MAX DATE')
    
    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null
    
    console.log('👤 [Squad Lead Filter] User allowed brands:', userAllowedBrands)
    
    // Get DISTINCT lines from withdraw table for MYR currency
    const { data: allLines, error: linesError } = await supabase
      .from('withdraw')
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
          
          // ✅ Filter brands based on user's allowed brands (Squad Lead filtering)
          const filteredBrands = filterBrandsByUser(cleanLines, userAllowedBrands)
          console.log('📊 [Squad Lead Filter] Filtered brands:', filteredBrands)
          
          // ✅ Add 'ALL' option but remove it for Squad Lead users
          const linesWithAll = ['ALL', ...filteredBrands.sort()]
          const finalLines = removeAllOptionForSquadLead(linesWithAll, userAllowedBrands)
          console.log('📊 [Squad Lead Filter] Final lines:', finalLines)

          // Get DISTINCT years from withdraw table for MYR currency
          const { data: yearData, error: yearsError } = await supabase
            .from('withdraw')
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

          // Get DISTINCT months from withdraw table for MYR currency
          const { data: monthData, error: monthsError } = await supabase
            .from('withdraw')
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
    
    // Build month date ranges map
    const monthDateRanges: Record<string, { min: string | null, max: string | null }> = {}
    
    for (const year of uniqueYears) {
      for (const month of uniqueMonths) {
        // Skip if year or month is invalid
        if (!year || !month) continue
        
        const { data: monthDates } = await supabase
          .from('withdraw')
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
    // ✅ Filter by allowed brands for Squad Lead
    let latestRecordQuery = supabase
      .from('withdraw')
      .select('line, year, month, date')
      .eq('currency', 'MYR')
      .not('line', 'is', null)
      .not('year', 'is', null)
      .not('month', 'is', null)
      .not('date', 'is', null)
    
    // ✅ Squad Lead: restrict to allowed brands only
    if (userAllowedBrands && userAllowedBrands.length > 0) {
      latestRecordQuery = latestRecordQuery.in('line', userAllowedBrands)
    }
    
    const { data: latestRecord } = await latestRecordQuery
      .order('date', { ascending: false })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)

    console.log('🔍 [FORCE MAX DATE] Latest record:', latestRecord?.[0])

    // Force defaults to use MAX DATE data
    const defaultLine = latestRecord?.[0]?.line || finalLines[0] || 'ALL'
    const defaultYear = latestRecord?.[0]?.year?.toString() || (uniqueYears.length > 0 ? uniqueYears[uniqueYears.length - 1] : '')
    const defaultMonth = latestRecord?.[0]?.month || (uniqueMonths.length > 0 ? uniqueMonths[uniqueMonths.length - 1] : '')
    
    // Get default date range (This Month)
    const defaultMonthKey = `${defaultYear}-${defaultMonth}`
    const defaultMonthRange = monthDateRanges[defaultMonthKey]
    
    console.log('🔍 [FORCE MAX DATE] Forced defaults:', { defaultLine, defaultYear, defaultMonth, defaultMonthRange })

          const slicerOptions = {
            lines: finalLines, // ✅ Use filtered lines (Squad Lead safe)
            years: uniqueYears,
            months: uniqueMonths,
            monthDateRanges,
            defaults: {
              line: defaultLine,
              year: defaultYear,
              month: defaultMonth,
              startDate: defaultMonthRange?.min || undefined,
              endDate: defaultMonthRange?.max || undefined
            }
          }

          console.log('✅ [MYR Auto Approval Withdraw API] Simple slicer options:', {
            lines: finalLines.length, // ✅ Updated
            years: uniqueYears.length,
            months: uniqueMonths.length,
            availableYears: uniqueYears,
            availableMonths: uniqueMonths.slice(0, 5), // Show first 5 months
            defaults: { defaultLine, defaultYear, defaultMonth },
            isSquadLead: userAllowedBrands !== null && userAllowedBrands?.length > 0
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
    console.error('❌ [MYR Auto Approval Withdraw API] Error getting slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
