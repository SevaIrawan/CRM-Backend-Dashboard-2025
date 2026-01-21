import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterBrandsByUser, removeAllOptionForSquadLead, getDefaultBrandForSquadLead } from '@/utils/brandAccessHelper'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MYR Member-Analytic API] Fetching slicer options')

    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    // Get DISTINCT lines from mv_blue_whale_myr_summary - NO LIMIT
    const { data: allLines, error: linesError } = await supabase
      .from('mv_blue_whale_myr_summary')
      .select('line')
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

    const uniqueLines = Array.from(new Set(allLines?.map(row => row.line).filter(Boolean) || [])) as string[]
    const cleanLines = uniqueLines.filter(line => line !== 'ALL' && line !== 'All')
    
    // ✅ Filter brands based on user permission
    const filteredBrands = filterBrandsByUser(cleanLines, userAllowedBrands)
    let linesWithAll = ['ALL', ...filteredBrands.sort()]
    
    // ✅ Remove 'ALL' option for Squad Lead users
    linesWithAll = removeAllOptionForSquadLead(linesWithAll, userAllowedBrands)

    // ✅ Set default line for Squad Lead to first brand, others to 'ALL'
    const defaultLine = userAllowedBrands && userAllowedBrands.length > 0 
      ? getDefaultBrandForSquadLead(userAllowedBrands) || filteredBrands[0] 
      : 'ALL'
    
    const slicerOptions = {
      lines: linesWithAll,
      defaults: {
        line: defaultLine
      }
    }

    console.log('✅ [MYR Member-Analytic API] Slicer options loaded:', {
      lines: linesWithAll.length,
      defaultLine
    })

    return NextResponse.json({
      success: true,
      data: slicerOptions
    })

  } catch (error) {
    console.error('❌ [MYR Member-Analytic API] Error getting slicer options:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
