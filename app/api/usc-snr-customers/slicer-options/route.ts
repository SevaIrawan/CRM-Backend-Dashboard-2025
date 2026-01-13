import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [SNR Customers] Fetching slicer options...')

    // ✅ Get current user from request header for auto-filter by snr_account
    const userHeader = request.headers.get('x-user')
    let currentUsername: string | null = null
    if (userHeader) {
      try {
        const user = JSON.parse(userHeader)
        currentUsername = user.username || null
      } catch (e) {
        console.warn('⚠️ Could not parse user header')
      }
    }

    if (!currentUsername) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - User not found'
      }, { status: 401 })
    }

    console.log('✅ [SNR Customers] Auto-filtering by snr_account:', currentUsername)

    // ✅ Get unique lines - ONLY from customers assigned to this SNR account
    const { data: lineData, error: lineError } = await supabase
      .from('blue_whale_usc')
      .select('line')
      .eq('snr_account', currentUsername)
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

    // Get unique years - ONLY from customers assigned to this SNR account
    const { data: yearData, error: yearError } = await supabase
      .from('blue_whale_usc')
      .select('year')
      .eq('snr_account', currentUsername)
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

    // Get unique months - ONLY from customers assigned to this SNR account
    const { data: monthData, error: monthError } = await supabase
      .from('blue_whale_usc')
      .select('month')
      .eq('snr_account', currentUsername)
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

    // Get unique tiers - ONLY from customers assigned to this SNR account
    const { data: tierData, error: tierError } = await supabase
      .from('blue_whale_usc')
      .select('tier_name')
      .eq('snr_account', currentUsername)
      .not('tier_name', 'is', null)
      .order('tier_name')

    if (tierError) {
      console.error('❌ Error fetching tiers:', tierError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching tiers',
        message: tierError.message 
      }, { status: 500 })
    }

    // Get date range - ONLY from customers assigned to this SNR account
    const { data: dateRangeData, error: dateRangeError } = await supabase
      .from('blue_whale_usc')
      .select('date')
      .eq('snr_account', currentUsername)
      .not('date', 'is', null)
      .order('date', { ascending: true })
      .limit(1)

    const { data: maxDateData, error: maxDateError } = await supabase
      .from('blue_whale_usc')
      .select('date')
      .eq('snr_account', currentUsername)
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)

    if (dateRangeError || maxDateError) {
      console.error('❌ Error fetching date range:', dateRangeError || maxDateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching date range',
        message: (dateRangeError || maxDateError)?.message 
      }, { status: 500 })
    }

    // Process data
    const lines = Array.from(new Set(lineData?.map(row => row.line).filter(Boolean) || [])) as string[]
    const sortedLines = lines.sort()
    
    // ✅ For SNR, always include 'ALL' option (they can see all brands they're assigned to)
    const finalLines = ['ALL', ...sortedLines]
    
    const years = Array.from(new Set(yearData?.map(row => row.year?.toString()).filter(Boolean) || [])) as string[]
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const rawMonths = Array.from(new Set(monthData?.map(row => row.month).filter(Boolean) || [])) as string[]
    const validMonths = rawMonths.filter((month: string) => monthNames.includes(month))
    const sortedMonths = validMonths.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b))
    const months = sortedMonths.map(month => ({ value: month, label: month }))

    // Process tiers - distinct tier_name values, sorted
    const tiers = Array.from(new Set(tierData?.map(row => row.tier_name).filter(Boolean) || [])) as string[]
    const sortedTiers = tiers.sort()

    const minDate = dateRangeData?.[0]?.date || ''
    const maxDate = maxDateData?.[0]?.date || ''

    // Get default year and month from MAX date
    let defaultYear = years.length > 0 ? years[0] : ''
    let defaultMonth = ''
    
    if (maxDate && typeof maxDate === 'string' && maxDate.length > 0) {
      const maxDateObj = new Date(maxDate)
      if (!isNaN(maxDateObj.getTime())) {
        defaultYear = maxDateObj.getFullYear().toString()
        defaultMonth = monthNames[maxDateObj.getMonth()]
      }
    }

    console.log('✅ [SNR Customers] Slicer options processed:', {
      snr_account: currentUsername,
      lines_count: finalLines.length,
      years: years.length,
      months: months.length,
      tiers: sortedTiers.length,
      dateRange: { min: minDate, max: maxDate },
      defaults: { year: defaultYear, month: defaultMonth }
    })

    return NextResponse.json({
      success: true,
      data: {
        lines: finalLines,
        years,
        months,
        tiers: sortedTiers,
        dateRange: {
          min: minDate,
          max: maxDate
        },
        defaults: {
          line: 'ALL',
          year: defaultYear,
          month: defaultMonth
        }
      }
    })

  } catch (error) {
    console.error('❌ Error fetching SNR customers slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching slicer options' 
    }, { status: 500 })
  }
}
