import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getDefaultBrandForSquadLead } from '@/utils/brandAccessHelper'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching unique values from blue_whale_sgd for churn member slicers...')

    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    // Get unique lines (no currency filter needed since table is blue_whale_sgd)
    const { data: lineData, error: lineError } = await supabase
      .from('blue_whale_sgd')
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

    // Get unique years
    const { data: yearData, error: yearError } = await supabase
      .from('blue_whale_sgd')
      .select('year')
      .not('year', 'is', null)
      .order('year', { ascending: false })

    if (yearError) {
      console.error('❌ Error fetching years:', yearError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching years',
        message: yearError.message 
      }, { status: 500 })
    }

    // Get unique months
    const { data: monthData, error: monthError } = await supabase
      .from('blue_whale_sgd')
      .select('month')
      .not('month', 'is', null)
      .order('month')

    if (monthError) {
      console.error('❌ Error fetching months:', monthError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching months',
        message: monthError.message 
      }, { status: 500 })
    }

    // Get max date for defaults (like Customer Retention)
    const { data: maxDateData, error: maxDateError } = await supabase
      .from('blue_whale_sgd')
      .select('date')
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)

    if (maxDateError) {
      console.error('❌ Error fetching max date:', maxDateError)
    }

    // Process data
    const lines = Array.from(new Set(lineData?.map(row => row.line).filter(Boolean) || [])) as string[]
    
    console.log('🔍 [SGD Churn Member API] RAW brands from database:', lines)
    console.log('🔍 [SGD Churn Member API] User allowed_brands:', userAllowedBrands)
    
    // ✅ LOGIC: Squad Lead = filtered brands only | Admin = ALL + all brands
    let finalLines: string[]
    let filteredBrands: string[] = []
    if (userAllowedBrands && userAllowedBrands.length > 0) {
      // Squad Lead: Filter to only their brands (NO 'ALL')
      filteredBrands = lines.filter(brand => userAllowedBrands.includes(brand)).sort()
      finalLines = filteredBrands
      console.log('🔐 [SGD Churn Member API] Squad Lead - filtered brands:', finalLines)
    } else {
      // Admin/Manager/SQ: Add 'ALL' + all brands
      finalLines = ['ALL', ...lines.sort()]
      console.log('✅ [SGD Churn Member API] Admin/Manager - ALL + brands:', finalLines)
    }
    
    const years = Array.from(new Set(yearData?.map(row => row.year?.toString()).filter(Boolean) || [])) as string[]
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const rawMonths = Array.from(new Set(monthData?.map(row => row.month).filter(Boolean) || [])) as string[]
    const validMonths = rawMonths.filter((month: string) => monthNames.includes(month))
    const sortedMonths = validMonths.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b))
    const months = sortedMonths.map(month => ({ value: month, label: month }))

    // ✅ Set default line for Squad Lead to first brand (sorted A to Z), others to 'ALL'
    const defaultLine = userAllowedBrands && userAllowedBrands.length > 0 
      ? getDefaultBrandForSquadLead(userAllowedBrands) || filteredBrands[0] 
      : 'ALL'
    
    // Get default year and month from MAX date in database
    let defaultYear = years.length > 0 ? years[0] : '' // Latest year (already sorted DESC)
    let defaultMonth = ''
    
    if (maxDateData?.[0]?.date && typeof maxDateData[0].date === 'string' && maxDateData[0].date.length > 0) {
      // Extract year and month from max date
      const maxDateObj = new Date(maxDateData[0].date)
      if (!isNaN(maxDateObj.getTime())) {
        defaultYear = maxDateObj.getFullYear().toString()
        defaultMonth = monthNames[maxDateObj.getMonth()]
      }
    }
    
    // Fallback if maxDate extraction failed
    if (!defaultMonth && months.length > 0) {
      defaultMonth = months[months.length - 1].value // Last month (latest)
    }
    if (!defaultYear && years.length > 0) {
      defaultYear = years[0] // First year (latest, already sorted DESC)
    }

    console.log('✅ Blue_whale_sgd churn member slicer options processed:', {
      lines: finalLines.length,
      years: years.length,
      months: months.length,
      defaults: { line: defaultLine, year: defaultYear, month: defaultMonth }
    })

    return NextResponse.json({
      success: true,
      data: {
        lines: finalLines,
        years,
        months,
        defaults: {
          line: defaultLine,
          year: defaultYear,
          month: defaultMonth
        }
      }
    })

  } catch (error) {
    console.error('❌ Error fetching blue_whale_sgd churn member slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching blue_whale_sgd churn member slicer options' 
    }, { status: 500 })
  }
}
