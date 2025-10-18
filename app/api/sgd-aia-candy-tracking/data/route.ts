import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// AIA Candy Tracking SGD - Run EXACT SQL queries from user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const line = searchParams.get('line') // LINE = BRAND
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    console.log('🔍 [SGD AIA Candy Data API] Filters:', { line, year, month })

    if (!year || !month) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: year and month' 
      }, { status: 400 })
    }

    // Convert month name to month number
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const monthNum = monthOrder.indexOf(month) + 1

    if (monthNum === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid month name' 
      }, { status: 400 })
    }

    // Calculate start and end dates for the selected month
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate()
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // Brand filter condition
    const brandFilter = line && line !== 'ALL' ? `AND ctcr.brand = '${line}'` : ''

    console.log('📅 Date range:', { startDate, endDate, brandFilter })

    // ✅ STEP 1: Get BRAND KPIs from aia_brand_kpi_mv filtered by brand + year + month
    let brandKPIQuery = supabase
      .from('aia_brand_kpi_mv')
      .select('*')
      .eq('year', parseInt(year))
      .eq('month_num', monthNum)
    
    if (line && line !== 'ALL') {
      brandKPIQuery = brandKPIQuery.eq('brand', line)
    }

    const { data: brandKPIData, error: brandKPIError } = await brandKPIQuery

    if (brandKPIError) {
      console.error('❌ Error fetching brand KPI data:', brandKPIError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch brand KPI data',
        message: brandKPIError.message
      }, { status: 500 })
    }

    console.log('📊 [SGD AIA Candy KPI] Brand KPI MV data:', brandKPIData)

    // ✅ STEP 2: Calculate all KPIs from aia_brand_kpi_mv
    let monthlyKPIs = {
      groupInteractionCoverageRate: 0,
      customerTriggerCount: 0,
      uniqueInteractionUsers: 0,
      customerTriggerRatio: 0,
      groupActivityChange: 0,
      repeatInteractionRate: 0
    }

    // ALL KPIs from aia_brand_kpi_mv (except KPI 6 which is month-specific)
    if (brandKPIData && brandKPIData.length > 0) {
      if (line && line !== 'ALL') {
        // Single brand
        const brandKPI = brandKPIData[0]
        
        // KPI 1: Coverage Rate (already calculated in MV)
        monthlyKPIs.groupInteractionCoverageRate = parseFloat(brandKPI.group_interaction_coverage_rate_percent || 0)
        
        // KPI 2: Customer Trigger Count
        monthlyKPIs.customerTriggerCount = parseInt(brandKPI.total_customer_triggers || 0)
        
        // KPI 3: Unique Interaction Users
        monthlyKPIs.uniqueInteractionUsers = parseInt(brandKPI.unique_interaction_users || 0)
        
        // KPI 4: Customer Trigger Ratio (already calculated in MV)
        monthlyKPIs.customerTriggerRatio = parseFloat(brandKPI.customer_trigger_ratio_percent || 0)
        
        // KPI 5: Group Activity Change (message volume change)
        monthlyKPIs.groupActivityChange = parseFloat(brandKPI.message_volume_change_percent || 0)
        
        // KPI 6: Repeat Interaction Rate (already calculated in MV)
        monthlyKPIs.repeatInteractionRate = parseFloat(brandKPI.repeat_interaction_rate_percent || 0)
      } else {
        // ALL brands - aggregate
        const totalEnabledGroups = brandKPIData.reduce((sum, row) => sum + (parseInt(row.total_enabled_groups) || 0), 0)
        const totalGroupsWithInteraction = brandKPIData.reduce((sum, row) => sum + (parseInt(row.groups_with_interaction) || 0), 0)
        
        // KPI 1: Coverage Rate
        monthlyKPIs.groupInteractionCoverageRate = totalEnabledGroups > 0
          ? parseFloat(((totalGroupsWithInteraction / totalEnabledGroups) * 100).toFixed(2))
          : 0
        
        // KPI 2: Customer Trigger Count
        monthlyKPIs.customerTriggerCount = brandKPIData.reduce((sum, row) => sum + (parseInt(row.total_customer_triggers) || 0), 0)
        
        // KPI 3: Unique Interaction Users
        monthlyKPIs.uniqueInteractionUsers = brandKPIData.reduce((sum, row) => sum + (parseInt(row.unique_interaction_users) || 0), 0)
        
        // KPI 4: Customer Trigger Ratio (weighted average)
        const totalCustomerTriggers = brandKPIData.reduce((sum, row) => sum + (parseInt(row.customer_trigger_count) || 0), 0)
        const totalTriggers = brandKPIData.reduce((sum, row) => sum + (parseInt(row.total_trigger_count) || 0), 0)
        monthlyKPIs.customerTriggerRatio = totalTriggers > 0
          ? parseFloat(((totalCustomerTriggers / totalTriggers) * 100).toFixed(2))
          : 0
        
        // KPI 5: Activity Change (weighted average based on before_candy_messages)
        const totalBeforeMessages = brandKPIData.reduce((sum, row) => sum + (parseFloat(row.before_candy_messages) || 0), 0)
        const totalAfterMessages = brandKPIData.reduce((sum, row) => sum + (parseFloat(row.after_candy_messages) || 0), 0)
        monthlyKPIs.groupActivityChange = totalBeforeMessages > 0
          ? parseFloat((((totalAfterMessages - totalBeforeMessages) / totalBeforeMessages) * 100).toFixed(2))
          : 0
        
        // KPI 6: Repeat Interaction Rate (weighted average)
        const totalInteractingUsers = brandKPIData.reduce((sum, row) => sum + (parseInt(row.total_interacting_users) || 0), 0)
        const totalUsersWithRepeat = brandKPIData.reduce((sum, row) => sum + (parseInt(row.users_with_2_or_more_triggers) || 0), 0)
        monthlyKPIs.repeatInteractionRate = totalInteractingUsers > 0
          ? parseFloat(((totalUsersWithRepeat / totalInteractingUsers) * 100).toFixed(2))
          : 0
      }
    }

    console.log('📊 [SGD AIA Candy KPI] Final KPIs:', monthlyKPIs)

    // ✅ STEP 2: Charts - Coming Soon (empty data for now)
    const labels: string[] = []
    const dailyCoverage: number[] = []
    const dailyTriggers: number[] = []
    const dailyUsers: number[] = []
    const dailyRatio: number[] = []
    const dailyChange: number[] = []
    const dailyRepeat: number[] = []

    console.log('✅ [SGD AIA Candy Data API] KPI data ready, charts = Coming Soon')

    const response = NextResponse.json({
      success: true,
      data: {
        labels,
        // Monthly aggregated KPI values from aia_brand_kpi_mv (for KPI cards)
        monthlyKPIs: monthlyKPIs,
        // Daily metrics (for charts) - Coming Soon
        metrics: {
          groupInteractionCoverageRate: dailyCoverage,
          customerTriggerCount: dailyTriggers,
          uniqueInteractionUsers: dailyUsers,
          customerTriggerRatio: dailyRatio,
          groupActivityChange: dailyChange,
          repeatInteractionRate: dailyRepeat
        }
      }
    })
    
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('❌ [SGD AIA Candy Data API] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

