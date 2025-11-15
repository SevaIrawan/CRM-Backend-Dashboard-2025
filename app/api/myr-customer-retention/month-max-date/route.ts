import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const line = searchParams.get('line')

  // ✅ Get user's allowed brands from request header
  const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
  const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

  try {
    console.log('🔍 Fetching MAX date for month:', { month, year, line, userAllowedBrands })

    // Build query to get MAX(date) for specific month
    let query = supabase
      .from('blue_whale_myr')
      .select('date')
      .not('date', 'is', null)

    // Apply filters
    if (month && month !== 'ALL') {
      query = query.eq('month', month)
    }
    
    if (year && year !== 'ALL') {
      query = query.eq('year', parseInt(year))
    }

    // ✅ Apply brand filter with user permission check
    if (line && line !== 'ALL') {
      if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
      query = query.eq('line', line)
    } else if (line === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      query = query.in('line', userAllowedBrands)
    }

    // Order by date DESC and get first record (MAX date)
    const { data, error } = await query
      .order('date', { ascending: false })
      .limit(1)

    if (error) {
      console.error('❌ Error fetching max date:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while fetching max date',
        message: error.message 
      }, { status: 500 })
    }

    const maxDate = data && data.length > 0 ? data[0].date : null

    console.log('✅ Max date found:', maxDate)

    return NextResponse.json({
      success: true,
      maxDate,
      month,
      year
    })

  } catch (error) {
    console.error('❌ Error fetching max date:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while fetching max date' 
    }, { status: 500 })
  }
}

