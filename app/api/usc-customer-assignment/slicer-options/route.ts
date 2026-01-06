import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterBrandsByUser, removeAllOptionForSquadLead } from '@/utils/brandAccessHelper'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching unique values from blue_whale_usc for customer assignment slicers...')

    // Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    // Get unique lines
    const { data: lineData, error: lineError } = await supabase
      .from('blue_whale_usc')
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
      .from('blue_whale_usc')
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
      .from('blue_whale_usc')
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

    // Get max date for defaults
    const { data: maxDateData, error: maxDateError } = await supabase
      .from('blue_whale_usc')
      .select('date')
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)

    if (maxDateError) {
      console.error('❌ Error fetching max date:', maxDateError)
    }

    // Process data
    const lines = Array.from(new Set(lineData?.map(row => row.line).filter(Boolean) || [])) as string[]
    
    console.log('🔍 [Customer Assignment API] RAW brands from database:', lines)
    console.log('🔍 [Customer Assignment API] User allowed_brands:', userAllowedBrands)
    
    // Logic: Squad Lead = filtered brands only | Admin = ALL + all brands
    let finalLines: string[]
    if (userAllowedBrands && userAllowedBrands.length > 0) {
      // Squad Lead: Filter to only their brands (NO 'ALL')
      finalLines = lines.filter(brand => userAllowedBrands.includes(brand)).sort()
      console.log('🔐 [Customer Assignment API] Squad Lead - filtered brands:', finalLines)
    } else {
      // Admin/Manager: Add 'ALL' + all brands
      finalLines = ['ALL', ...lines.sort()]
      console.log('✅ [Customer Assignment API] Admin/Manager - ALL + brands:', finalLines)
    }
    
    const years = Array.from(new Set(yearData?.map(row => row.year?.toString()).filter(Boolean) || [])) as string[]
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const rawMonths = Array.from(new Set(monthData?.map(row => row.month).filter(Boolean) || [])) as string[]
    const validMonths = rawMonths.filter((month: string) => monthNames.includes(month))
    const sortedMonths = validMonths.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b))
    const months = sortedMonths.map(month => ({ value: month, label: month })) // ✅ Return month as string (January, February, etc)

    // Get default year and month from MAX date in database
    let defaultYear = years.length > 0 ? years[0] : '' // Latest year (already sorted DESC)
    let defaultMonth = ''
    
    if (maxDateData?.[0]?.date && typeof maxDateData[0].date === 'string' && maxDateData[0].date.length > 0) {
      // Extract year and month from max date
      const maxDateObj = new Date(maxDateData[0].date)
      if (!isNaN(maxDateObj.getTime())) {
        defaultYear = maxDateObj.getFullYear().toString()
        defaultMonth = monthNames[maxDateObj.getMonth()] // ✅ Return month name (string)
      }
    }
    
    // Fallback if maxDate extraction failed
    if (!defaultMonth && months.length > 0) {
      defaultMonth = months[months.length - 1].value // Last month (latest) - already string
    }
    if (!defaultYear && years.length > 0) {
      defaultYear = years[0] // First year (latest, already sorted DESC)
    }

    console.log('✅ Blue_whale_usc customer assignment slicer options processed:', {
      lines: finalLines.length,
      years: years.length,
      months: months.length,
      defaults: { line: 'ALL', year: defaultYear, month: defaultMonth }
    })

    return NextResponse.json({
      success: true,
      data: {
        lines: finalLines,
        years,
        months,
        defaults: {
          line: 'ALL',
          year: defaultYear,
          month: defaultMonth
        }
      }
    })

  } catch (error) {
    console.error('❌ Error fetching blue_whale_usc customer assignment slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching blue_whale_usc customer assignment slicer options' 
    }, { status: 500 })
  }
}

