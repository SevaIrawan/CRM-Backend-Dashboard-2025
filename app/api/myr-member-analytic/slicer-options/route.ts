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
    
    // ✅ Get DISTINCT payment_method from mv_deposit_myr_summary
    const { data: allPaymentMethods, error: paymentMethodsError } = await supabase
      .from('mv_deposit_myr_summary')
      .select('payment_method')
      .not('payment_method', 'is', null)

    if (paymentMethodsError) {
      console.error('❌ Error fetching payment_methods:', paymentMethodsError)
    }

    const uniquePaymentMethods = Array.from(new Set(allPaymentMethods?.map(row => row.payment_method).filter(Boolean) || [])) as string[]
    const sortedPaymentMethods = uniquePaymentMethods.sort()
    const paymentMethodsWithAll = ['ALL', ...sortedPaymentMethods]

    // ✅ Get DISTINCT peak (active time) from mv_deposit_myr_summary
    const { data: allPeaks, error: peaksError } = await supabase
      .from('mv_deposit_myr_summary')
      .select('peak')
      .not('peak', 'is', null)

    if (peaksError) {
      console.error('❌ Error fetching peaks:', peaksError)
    }

    const uniquePeaks = Array.from(new Set(allPeaks?.map(row => row.peak).filter(Boolean) || [])) as string[]
    const sortedPeaks = uniquePeaks.sort()
    const peaksWithAll = ['ALL', ...sortedPeaks]

    // ✅ Get DISTINCT fba_label from mv_deposit_myr_summary
    const { data: allFbaLabels, error: fbaLabelsError } = await supabase
      .from('mv_deposit_myr_summary')
      .select('fba_label')
      .not('fba_label', 'is', null)

    if (fbaLabelsError) {
      console.error('❌ Error fetching fba_labels:', fbaLabelsError)
    }

    const uniqueFbaLabels = Array.from(new Set(allFbaLabels?.map(row => row.fba_label).filter(Boolean) || [])) as string[]
    const sortedFbaLabels = uniqueFbaLabels.sort()
    const fbaLabelsWithAll = ['ALL', ...sortedFbaLabels]

    const slicerOptions = {
      lines: linesWithAll,
      paymentMethods: paymentMethodsWithAll,
      activeTimes: peaksWithAll,
      fbaLabels: fbaLabelsWithAll,
      defaults: {
        line: defaultLine
      }
    }

    console.log('✅ [MYR Member-Analytic API] Slicer options loaded:', {
      lines: linesWithAll.length,
      paymentMethods: paymentMethodsWithAll.length,
      activeTimes: peaksWithAll.length,
      fbaLabels: fbaLabelsWithAll.length,
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
