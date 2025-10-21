import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ========================================
// BUSINESS PERFORMANCE DATA API - MYR
// ========================================
// Implements all KPI calculations based on business logic
// Data Sources: blue_whale_myr, new_register, bp_target
// Last Updated: 2025-10-21 09:40:00 - FIXED: Query fetch FULL YEAR for quarterly
// ========================================

// ========================================
// HELPER: Get Quarter Months
// ========================================
function getQuarterMonths(quarter: string): string[] {
  const quarterMap: Record<string, string[]> = {
    'Q1': ['January', 'February', 'March'],
    'Q2': ['April', 'May', 'June'],
    'Q3': ['July', 'August', 'September'],
    'Q4': ['October', 'November', 'December']
  }
  return quarterMap[quarter] || []
}

// ========================================
// HELPER: Get Previous Quarter
// ========================================
function getPreviousQuarter(quarter: string): string {
  const quarterMap: Record<string, string> = {
    'Q1': 'Q4',
    'Q2': 'Q1',
    'Q3': 'Q2',
    'Q4': 'Q3'
  }
  return quarterMap[quarter] || 'Q4'
}

// ========================================
// HELPER: Calculate Brand Member Flows (for Sankey)
// LOGIC: User boleh masuk MULTIPLE brands (tidak pakai primary brand)
// ========================================
async function calculateBrandMemberFlows(filters: {
  year: number
  quarter: string
  isDateRange: boolean
  startDate: string
  endDate: string
  quarterMonths: string[]
}) {
  const { year, quarter, isDateRange, startDate, endDate, quarterMonths } = filters
  
  // Determine previous period
  const prevQuarter = getPreviousQuarter(quarter)
  const prevYear = quarter === 'Q1' ? year - 1 : year
  const prevQuarterMonths = getQuarterMonths(prevQuarter)
  
  // STEP 1: Fetch CURRENT period
  let currentQuery = supabase
    .from('blue_whale_myr')
    .select('userkey, line')
    .eq('year', year)
    .gt('deposit_cases', 0)
  
  if (isDateRange && startDate && endDate) {
    currentQuery = currentQuery.gte('date', startDate).lte('date', endDate)
  } else {
    currentQuery = currentQuery.in('month', quarterMonths)
  }
  
  const { data: currentData } = await currentQuery
  
  // STEP 2: Fetch PREVIOUS period
  let prevQuery = supabase
    .from('blue_whale_myr')
    .select('userkey, line')
    .eq('year', prevYear)
    .gt('deposit_cases', 0)
    .in('month', prevQuarterMonths)
  
  const { data: prevData } = await prevQuery
  
  // STEP 3: AUTO-DETECT UNIQUE BRANDS from both periods
  // Current period brands (for display)
  const currentBrandsSet = new Set<string>()
  currentData?.forEach((row: any) => {
    if (row.line && row.line.trim()) {
      currentBrandsSet.add(row.line.trim())
    }
  })
  
  // Previous period brands (for churned calculation)
  const prevBrandsSet = new Set<string>()
  prevData?.forEach((row: any) => {
    if (row.line && row.line.trim()) {
      prevBrandsSet.add(row.line.trim())
    }
  })
  
  // ALL brands (union of both periods for complete flow calculation)
  const allBrandsSet = new Set<string>()
  Array.from(currentBrandsSet).forEach(brand => allBrandsSet.add(brand))
  Array.from(prevBrandsSet).forEach(brand => allBrandsSet.add(brand))
  const BRANDS = Array.from(allBrandsSet).sort()  // Sort alfabetis untuk konsistensi
  
  console.log(`📊 [Sankey] Brands in current period: ${Array.from(currentBrandsSet).sort().join(', ')}`)
  console.log(`📊 [Sankey] Brands in previous period: ${Array.from(prevBrandsSet).sort().join(', ')}`)
  console.log(`📊 [Sankey] All brands (for calculation): ${BRANDS.join(', ')}`)
  
  // STEP 4: Group users by brand (current period)
  // User boleh ada di multiple brands!
  const currentByBrand: Record<string, Set<string>> = {}
  const prevByBrand: Record<string, Set<string>> = {}
  
  BRANDS.forEach(brand => {
    currentByBrand[brand] = new Set()
    prevByBrand[brand] = new Set()
  })
  
  currentData?.forEach((row: any) => {
    if (row.line && BRANDS.includes(row.line)) {
      currentByBrand[row.line].add(row.userkey)
    }
  })
  
  prevData?.forEach((row: any) => {
    if (row.line && BRANDS.includes(row.line)) {
      prevByBrand[row.line].add(row.userkey)
    }
  })
  
  // STEP 4: Calculate flows per brand
  const brandFlows: Record<string, { active: number; retained: number; churned: number }> = {}
  
  BRANDS.forEach(brand => {
    const currentUsers = currentByBrand[brand]
    const prevUsers = prevByBrand[brand]
    
    // Active: unique user di brand ini di current period
    const active = currentUsers.size
    
    // Retained: user di brand ini di current & previous period
    const retained = Array.from(currentUsers).filter(key => prevUsers.has(key)).length
    
    // Churned: user di brand ini di previous period tapi tidak di current period
    const churned = Array.from(prevUsers).filter(key => !currentUsers.has(key)).length
    
    brandFlows[brand] = { active, retained, churned }
  })
  
  // STEP 5: FILTER - Hanya return brands yang ADA DI CURRENT PERIOD (active > 0)
  // Brands yang hanya ada di previous period (churned only) tidak ditampilkan di Sankey
  const currentPeriodBrandFlows: Record<string, { active: number; retained: number; churned: number }> = {}
  
  Object.keys(brandFlows).forEach(brand => {
    if (brandFlows[brand].active > 0) {
      currentPeriodBrandFlows[brand] = brandFlows[brand]
    } else {
      console.log(`📊 [Sankey] Filtered out brand ${brand} - no active members in current period`)
    }
  })
  
  return currentPeriodBrandFlows
}

// ========================================
// HELPER: Calculate Member Metrics (Churn, Retention, Reactivation)
// ========================================
interface MemberMetricsFilters {
  year: number
  quarter: string
  isDateRange: boolean
  startDate: string
  endDate: string
  line: string
  quarterMonths: string[]
  activeMemberCurrent: number
  newDepositor: number
}

async function calculateMemberMetrics(filters: MemberMetricsFilters) {
  try {
    const { year, quarter, isDateRange, startDate, endDate, line, quarterMonths, activeMemberCurrent, newDepositor } = filters
    
    // ========================================
    // STEP 1: Determine Previous Period
    // ========================================
    let prevStartDate = ''
    let prevEndDate = ''
    let prevMonths: string[] = []
    
    if (isDateRange && startDate && endDate) {
      // Date Range Mode: Previous period = same duration before startDate
      const start = new Date(startDate)
      const end = new Date(endDate)
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - durationDays + 1)
      
      prevStartDate = prevStart.toISOString().split('T')[0]
      prevEndDate = prevEnd.toISOString().split('T')[0]
      
      console.log(`📅 Previous Period (Date Range): ${prevStartDate} to ${prevEndDate}`)
    } else {
      // Quarter Mode: Previous period = previous quarter
      const previousQuarter = getPreviousQuarter(quarter)
      prevMonths = getQuarterMonths(previousQuarter)
      
      console.log(`📅 Previous Period (Quarter): ${previousQuarter} (${prevMonths.join(', ')})`)
    }
    
    // ========================================
    // STEP 2: Fetch Current Period Users
    // ========================================
    let currentQuery = supabase
      .from('blue_whale_myr')
      .select('userkey')
      .eq('year', year)
      .gt('deposit_cases', 0)
    
    if (isDateRange && startDate && endDate) {
      currentQuery = currentQuery.gte('date', startDate).lte('date', endDate)
    } else {
      currentQuery = currentQuery.in('month', quarterMonths)
    }
    
    if (line !== 'ALL') {
      currentQuery = currentQuery.eq('line', line)
    }
    
    const { data: currentUsers } = await currentQuery
    const currentUserKeys = new Set((currentUsers || []).map(u => u.userkey).filter(Boolean))
    
    console.log(`👥 Current Period: ${currentUserKeys.size} unique users`)
    
    // ========================================
    // STEP 3: Fetch Previous Period Users
    // ========================================
    let prevQuery = supabase
      .from('blue_whale_myr')
      .select('userkey')
      .gt('deposit_cases', 0)
    
    if (isDateRange && prevStartDate && prevEndDate) {
      prevQuery = prevQuery.gte('date', prevStartDate).lte('date', prevEndDate)
      // Year might change if we cross year boundary
      prevQuery = prevQuery.gte('year', year - 1).lte('year', year)
    } else {
      prevQuery = prevQuery.eq('year', year).in('month', prevMonths)
    }
    
    if (line !== 'ALL') {
      prevQuery = prevQuery.eq('line', line)
    }
    
    const { data: prevUsers } = await prevQuery
    const prevUserKeys = new Set((prevUsers || []).map(u => u.userkey).filter(Boolean))
    
    console.log(`👥 Previous Period: ${prevUserKeys.size} unique users`)
    
    // ========================================
    // STEP 4: Calculate Member Metrics
    // ========================================
    
    // CHURN MEMBER = Users in previous period BUT NOT in current period
    const churnUserKeys = Array.from(prevUserKeys).filter(key => !currentUserKeys.has(key))
    const churnMember = churnUserKeys.length
    
    // RETENTION MEMBER = Users in previous period AND ALSO in current period
    const retentionUserKeys = Array.from(prevUserKeys).filter(key => currentUserKeys.has(key))
    const retentionMember = retentionUserKeys.length
    
    // REACTIVATION MEMBER = Users in current period BUT NOT in previous period AND NOT new depositor
    const newUserKeys = Array.from(currentUserKeys).filter(key => !prevUserKeys.has(key))
    const reactivationMember = Math.max(newUserKeys.length - newDepositor, 0)
    
    console.log('📊 Member Breakdown:', {
      churnMember,
      retentionMember,
      reactivationMember,
      prevPeriodActive: prevUserKeys.size,
      currentPeriodActive: currentUserKeys.size,
      newDepositor: newDepositor
    })
    
    // ========================================
    // STEP 5: Calculate Rates
    // ========================================
    const prevActiveMember = prevUserKeys.size
    
    const churnRate = prevActiveMember > 0 ? (churnMember / prevActiveMember) * 100 : 0
    const retentionRate = prevActiveMember > 0 ? (retentionMember / prevActiveMember) * 100 : 0
    
    // Reactivation Rate = Reactivation Member / Churned Pool (recent churned members)
    // For simplicity, we use previous period active as base
    const reactivationRate = prevActiveMember > 0 ? (reactivationMember / prevActiveMember) * 100 : 0
    
    return {
      churnMember,
      retentionMember,
      reactivationMember,
      churnRate,
      retentionRate,
      reactivationRate,
      prevActiveMember
    }
    
  } catch (error) {
    console.error('❌ [calculateMemberMetrics] Error:', error)
    return {
      churnMember: 0,
      retentionMember: 0,
      reactivationMember: 0,
      churnRate: 0,
      retentionRate: 0,
      reactivationRate: 0,
      prevActiveMember: 0
    }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  // Extract filters
  const year = searchParams.get('year') || '2025'
  const quarter = searchParams.get('quarter') || 'Q4'
  const isDateRange = searchParams.get('isDateRange') === 'true'
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const line = searchParams.get('line') || 'ALL' // Brand filter

  console.log('🔍 [BP Data API] Request:', { year, quarter, isDateRange, startDate, endDate, line })

  try {
    console.log('✅ [BP Data API] Starting execution...')
    const startTime = Date.now()
    
    // ========================================
    // STEP 1: Build Date Filter
    // ========================================
    let quarterMonths: string[] = []
    
    if (!isDateRange) {
      // Monthly mode: Use quarter
      quarterMonths = getQuarterMonths(quarter)
      console.log('📅 [BP Data API] Mode: Quarter/Monthly', { quarter, months: quarterMonths })
    } else {
      console.log('📅 [BP Data API] Mode: Date Range (Daily)', { startDate, endDate })
    }

    // ========================================
    // STEP 2: Build Base Query Function
    // ========================================
    const buildBlueWhaleQuery = () => {
      let query = supabase.from('blue_whale_myr').select('*')
      
      // Year filter
      query = query.eq('year', parseInt(year))
      
      // Date filter (Quarter or Date Range)
      if (isDateRange && startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate)
      } else {
        // Quarterly mode: Use quarter filter
        query = query.in('month', quarterMonths)
      }
      
      // Brand/Line filter (if not ALL)
      if (line !== 'ALL') {
        query = query.eq('line', line)
      }
      
      return query
    }

    const buildNewRegisterQuery = () => {
      let query = supabase.from('new_register').select('*')
      
      // CURRENCY FILTER - CRITICAL! (MYR only for this API)
      query = query.eq('currency', 'MYR')
      
      // Year filter
      query = query.eq('year', parseInt(year))
      
      // Date filter
      if (isDateRange && startDate && endDate) {
        query = query.gte('registration_date', startDate).lte('registration_date', endDate)
      } else {
        // Quarterly mode: Filter by quarter months
        query = query.in('month', quarterMonths)
      }
      
      // Brand/Line filter
      if (line !== 'ALL') {
        query = query.eq('line', line)
      }
      
      return query
    }

    // ========================================
    // BUILD FULL YEAR QUERIES FOR QUARTERLY CHARTS - USE MV!
    // ========================================
    // For quarterly charts, use MONTHLY SUMMARY MV (pre-aggregated)
    // This prevents timeout when fetching full year data
    const buildMVQueryFullYear = () => {
      let query = supabase
        .from('blue_whale_myr_monthly_summary')
        .select('*')
        .eq('year', parseInt(year))
        .gt('month', 0)  // Exclude rollup (month=0)
      
      if (line !== 'ALL') {
        query = query.eq('line', line)
      } else {
        query = query.eq('line', 'ALL')  // For aggregate charts
      }
      
      return query
    }
    
    // For brand-level charts (GGR Contribution, Retention, etc)
    // Fetch ALL brands (no line filter)
    const buildMVQueryFullYearAllBrands = () => {
      return supabase
        .from('blue_whale_myr_monthly_summary')
        .select('*')
        .eq('year', parseInt(year))
        .gt('month', 0)
        .neq('line', 'ALL')  // Exclude aggregate row, only get individual brands
    }
    
    // ========================================
    // STEP 3: PARALLEL QUERIES
    // ========================================
    console.log('🚀 [BP Data API] Starting parallel queries...')
    
    const [
      blueWhaleResult,
      newRegisterResult,
      mvFullYearResult,
      mvBrandsResult,
      targetResult
    ] = await Promise.all([
      buildBlueWhaleQuery(),
      buildNewRegisterQuery(),
      buildMVQueryFullYear(),  // For aggregate quarterly charts
      buildMVQueryFullYearAllBrands(),  // For brand-level charts
      supabase
        .from('bp_target')
        .select('*')
        .eq('currency', 'MYR')
        .eq('year', parseInt(year))
        .eq('quarter', quarter)
        .eq('is_active', true)
    ])

    const queryTime = Date.now() - startTime
    console.log(`⏱️  [BP Data API] Queries completed in ${queryTime}ms`)

    // Check errors
    if (blueWhaleResult.error) {
      console.error('❌ Blue Whale Error:', blueWhaleResult.error)
      throw blueWhaleResult.error
    }
    if (newRegisterResult.error) {
      console.error('❌ New Register Error:', newRegisterResult.error)
      throw newRegisterResult.error
    }
    if (mvFullYearResult.error) {
      console.error('❌ MV Full Year Error:', mvFullYearResult.error)
      throw mvFullYearResult.error
    }
    if (mvBrandsResult.error) {
      console.error('❌ MV Brands Error:', mvBrandsResult.error)
      throw mvBrandsResult.error
    }

    const blueWhaleData = blueWhaleResult.data || []
    const newRegisterData = newRegisterResult.data || []
    const mvFullYearData = mvFullYearResult.data || []
    const mvBrandsData = mvBrandsResult.data || []
    const targetDataRaw = targetResult.data || []

    console.log(`📊 [BP Data API] Data loaded: ${blueWhaleData.length} transactions (Q4), ${mvFullYearData.length} monthly aggregates, ${mvBrandsData.length} brand aggregates, ${newRegisterData.length} registrations, ${targetDataRaw.length} targets`)

    // ========================================
    // AGGREGATE TARGET DATA (SUM ALL BRANDS)
    // ========================================
    console.log(`🎯 [BP Data API] Target Query Filters: currency=MYR, year=${year}, quarter=${quarter}`)
    console.log(`🎯 [BP Data API] Target Data (Raw):`, targetDataRaw)
    
    const targetData = {
      target_ggr: targetDataRaw.reduce((sum: number, row: any) => sum + (row.target_ggr || 0), 0),
      target_deposit_amount: targetDataRaw.reduce((sum: number, row: any) => sum + (row.target_deposit_amount || 0), 0),
      target_deposit_cases: targetDataRaw.reduce((sum: number, row: any) => sum + (row.target_deposit_cases || 0), 0),
      target_active_member: targetDataRaw.reduce((sum: number, row: any) => sum + (row.target_active_member || 0), 0),
      forecast_ggr: targetDataRaw.reduce((sum: number, row: any) => sum + (row.forecast_ggr || 0), 0)
    }

    console.log(`🎯 [BP Data API] Aggregated Targets (Summed All Brands):`)
    console.log(`   → Target GGR: ${targetData.target_ggr.toLocaleString()}`)
    console.log(`   → Target Deposit Amount: ${targetData.target_deposit_amount.toLocaleString()}`)
    console.log(`   → Target Deposit Cases: ${targetData.target_deposit_cases.toLocaleString()}`)
    console.log(`   → Target Active Member: ${targetData.target_active_member.toLocaleString()}`)
    console.log(`   → Forecast GGR: ${targetData.forecast_ggr.toLocaleString()}`)

    // ========================================
    // STEP 4: CALCULATE KPIs
    // ========================================
    console.log('📊 [BP Data API] Calculating KPIs...')

    // 1. ACTIVE MEMBER = COUNT UNIQUE userkey WHERE deposit_cases > 0
    const activeMemberSet = new Set(
      blueWhaleData
        .filter(row => (row.deposit_cases || 0) > 0)
        .map(row => row.userkey)
        .filter(Boolean)
    )
    const activeMember = activeMemberSet.size

    // 2. FINANCIAL AGGREGATES
    const depositAmount = blueWhaleData.reduce((sum, row) => sum + (parseFloat(row.deposit_amount) || 0), 0)
    const depositCases = blueWhaleData.reduce((sum, row) => sum + (parseInt(row.deposit_cases) || 0), 0)
    const withdrawAmount = blueWhaleData.reduce((sum, row) => sum + (parseFloat(row.withdraw_amount) || 0), 0)
    const withdrawCases = blueWhaleData.reduce((sum, row) => sum + (parseInt(row.withdraw_cases) || 0), 0)
    const addTransaction = blueWhaleData.reduce((sum, row) => sum + (parseFloat(row.add_transaction) || 0), 0)
    const deductTransaction = blueWhaleData.reduce((sum, row) => sum + (parseFloat(row.deduct_transaction) || 0), 0)
    const bonusAmount = blueWhaleData.reduce((sum, row) => sum + (parseFloat(row.bonus) || 0) + (parseFloat(row.add_bonus) || 0), 0)
    
    // CALCULATE GGR & NET PROFIT (sesuai KPI Comparison logic)
    const grossGamingRevenue = depositAmount - withdrawAmount  // GGR = Deposit - Withdraw
    const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)  // Net Profit
    
    // DEBUG: Log calculated values
    console.log('🔍 [BP Data API] Calculated Values:', {
      activeMember,
      grossGamingRevenue,
      depositAmount,
      depositCases,
      netProfit,
      bonusAmount
    })

    // 3. NEW REGISTER & NEW DEPOSITOR
    const newRegister = newRegisterData.reduce((sum, row) => sum + (parseInt(row.new_register) || 0), 0)
    const newDepositor = newRegisterData.reduce((sum, row) => sum + (parseInt(row.new_depositor) || 0), 0)

    // 4. PURE ACTIVE = Active Member - New Depositor
    const pureActive = activeMember - newDepositor

    // 5. DERIVED KPIs
    const atv = depositCases > 0 ? depositAmount / depositCases : 0
    const pf = activeMember > 0 ? depositCases / activeMember : 0
    const ggrUser = activeMember > 0 ? grossGamingRevenue / activeMember : 0  // ✅ FIXED: Use GGR, not netProfit
    const daUser = activeMember > 0 ? depositAmount / activeMember : 0
    const bonusUsageRate = activeMember > 0 ? bonusAmount / activeMember : 0  // ✅ FIXED: Removed * 100
    const winRate = depositAmount > 0 ? grossGamingRevenue / depositAmount : 0  // ✅ FIXED: Removed * 100
    const withdrawalRate = depositCases > 0 ? withdrawCases / depositCases : 0  // ✅ FIXED: Removed * 100

    // 6. TARGET DATA
    const targetGGR = targetData?.target_ggr || 0
    const targetDepositAmount = targetData?.target_deposit_amount || 0
    const targetDepositCases = targetData?.target_deposit_cases || 0
    const targetActiveMember = targetData?.target_active_member || 0
    const forecastGGR = targetData?.forecast_ggr || 0

    // 7. TARGET ACHIEVE RATE
    const targetAchieveRate = targetGGR > 0 ? (grossGamingRevenue / targetGGR) * 100 : 0

    // 8. CHURN, RETENTION, REACTIVATION CALCULATION
    console.log('🔄 [BP Data API] Calculating churn, retention, reactivation...')
    
    const memberMetrics = await calculateMemberMetrics({
      year: parseInt(year),
      quarter,
      isDateRange,
      startDate: startDate || '',
      endDate: endDate || '',
      line,
      quarterMonths,
      activeMemberCurrent: activeMember,
      newDepositor
    })
    
    console.log('🔄 [BP Data API] Member metrics:', memberMetrics)

    // ========================================
    // STEP 5: PREPARE CHART DATA
    // ========================================
    console.log('📊 [BP Data API] Preparing chart data...')
    
    // Convert MV monthly data to month name mapping
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const mvDataByMonth: Record<string, any> = {}
    
    mvFullYearData.forEach((row: any) => {
      const monthNum = row.month as number
      const monthName = monthNames[monthNum - 1]  // Convert 1-12 to month name
      if (monthName) {
        mvDataByMonth[monthName] = row  // Each month has ONE aggregated row from MV
      }
    })
    
    const sortedMonthsFullYear = Object.keys(mvDataByMonth).sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b))
    
    console.log(`📅 [BP Data API] MV full year months available: ${sortedMonthsFullYear.length}, months: ${sortedMonthsFullYear.join(', ')}`)
    
    // Group QUARTER-SPECIFIC data by month for monthly charts (Winrate/Withdraw Rate)
    const dataByMonth: Record<string, any[]> = {}
    blueWhaleData.forEach((row: any) => {
      const month = row.month || 'Unknown'
      if (!dataByMonth[month]) {
        dataByMonth[month] = []
      }
      dataByMonth[month].push(row)
    })
    let sortedMonths = Object.keys(dataByMonth).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b))
    console.log(`📅 [BP Data API] Quarter-specific months: ${sortedMonths.join(', ')}`)
    
    // ========================================
    // AGGREGATE MV DATA BY QUARTER (for 5 charts)
    // ========================================
    const getQuarterFromMonth = (month: string): string => {
      const quarterMap: Record<string, string> = {
        'January': 'Q1', 'February': 'Q1', 'March': 'Q1',
        'April': 'Q2', 'May': 'Q2', 'June': 'Q2',
        'July': 'Q3', 'August': 'Q3', 'September': 'Q3',
        'October': 'Q4', 'November': 'Q4', 'December': 'Q4'
      }
      return quarterMap[month] || 'Q1'
    }
    
    // Group MV monthly data by quarter (sum aggregates)
    const mvDataByQuarter: Record<string, any> = {}
    sortedMonthsFullYear.forEach(month => {
      const quarter = getQuarterFromMonth(month)
      const monthData = mvDataByMonth[month]
      
      if (!mvDataByQuarter[quarter]) {
        mvDataByQuarter[quarter] = {
          deposit_amount: 0,
          withdraw_amount: 0,
          deposit_cases: 0,
          withdraw_cases: 0
        }
      }
      
      // Sum monthly aggregates to get quarterly totals
      mvDataByQuarter[quarter].deposit_amount += parseFloat(monthData.deposit_amount) || 0
      mvDataByQuarter[quarter].withdraw_amount += parseFloat(monthData.withdraw_amount) || 0
      mvDataByQuarter[quarter].deposit_cases += parseInt(monthData.deposit_cases) || 0
      mvDataByQuarter[quarter].withdraw_cases += parseInt(monthData.withdraw_cases) || 0
    })
    
    // ✅ ALWAYS show ALL quarters (Q1, Q2, Q3, Q4) - no filter!
    const sortedQuarters = ['Q1', 'Q2', 'Q3', 'Q4']
    
    // CHART 1: GGR Trend (Quarterly) - FROM MV
    const ggrTrend = sortedQuarters.map(quarter => {
      const quarterData = mvDataByQuarter[quarter]
      const depositAmt = quarterData ? quarterData.deposit_amount : 0
      const withdrawAmt = quarterData ? quarterData.withdraw_amount : 0
      const ggr = depositAmt - withdrawAmt
      return {
        month: quarter,
        ggr
      }
    })
    
    // CHART 2 & 3: Deposit/Withdraw Amount vs Cases (Quarterly) - FROM MV
    const depositAmountVsCases = sortedQuarters.map(quarter => {
      const quarterData = mvDataByQuarter[quarter]
      return {
        month: quarter,
        amount: quarterData ? quarterData.deposit_amount : 0,
        cases: quarterData ? quarterData.deposit_cases : 0
      }
    })
    
    const withdrawAmountVsCases = sortedQuarters.map(quarter => {
      const quarterData = mvDataByQuarter[quarter]
      return {
        month: quarter,
        amount: quarterData ? quarterData.withdraw_amount : 0,
        cases: quarterData ? quarterData.withdraw_cases : 0
      }
    })
    
    // CHART 4: Winrate vs Withdraw Rate (Quarterly) - FROM MV
    const winrateVsWithdrawRate = sortedQuarters.map(quarter => {
      const quarterData = mvDataByQuarter[quarter]
      const depositAmt = quarterData ? quarterData.deposit_amount : 0
      const withdrawAmt = quarterData ? quarterData.withdraw_amount : 0
      const ggr = depositAmt - withdrawAmt
      const withdrawCases = quarterData ? quarterData.withdraw_cases : 0
      const depositCases = quarterData ? quarterData.deposit_cases : 0
      
      const winrate = depositAmt > 0 ? (ggr / depositAmt) * 100 : 0
      const withdrawRate = depositCases > 0 ? (withdrawCases / depositCases) * 100 : 0
      
      return {
        month: quarter,  // Use quarter label (Q1, Q2, Q3, Q4)
        winrate,
        withdrawRate
      }
    })
    
    // CHART 5: Bonus Usage Rate per Brand
    const dataByBrand: Record<string, any[]> = {}
    blueWhaleData.forEach((row: any) => {
      const brand = row.line
      if (brand && brand.trim()) {  // ✅ Filter empty/null brands
        if (!dataByBrand[brand]) {
          dataByBrand[brand] = []
        }
        dataByBrand[brand].push(row)
      }
    })
    
    const detectedBrands = Object.keys(dataByBrand).sort()
    console.log(`📊 [Charts] Auto-detected brands from data: ${detectedBrands.join(', ')}`)
    
    const bonusUsageRateChart = detectedBrands.map(brand => {
      const brandData = dataByBrand[brand] || []  // ✅ Add fallback (defensive)
      
      // Active Member for this brand
      const activeMemberBrand = new Set(
        brandData
          .filter(row => (row.deposit_cases || 0) > 0)
          .map(row => row.userkey)
          .filter(Boolean)
      ).size
      
      // Bonus for this brand
      const bonusBrand = brandData.reduce((sum, row) => sum + (parseFloat(row.bonus) || 0) + (parseFloat(row.add_bonus) || 0), 0)
      
      const rate = activeMemberBrand > 0 ? bonusBrand / activeMemberBrand : 0  // ✅ FIXED: Removed * 100
      
      return {
        brand,
        rate
      }
    })
    
    // CHART 6: Brand GGR Contribution (Stacked Bar - Per Quarter Per Brand) - FROM MV
    const brandGGRContribution = sortedQuarters.map(quarter => {
      const result: any = { month: quarter }
      
      // Get month numbers for this quarter
      const quarterMonthMap: Record<string, number[]> = {
        'Q1': [1, 2, 3],
        'Q2': [4, 5, 6],
        'Q3': [7, 8, 9],
        'Q4': [10, 11, 12]
      }
      const monthsInQuarter = quarterMonthMap[quarter] || []
      
      // Filter MV data for this quarter and group by brand
      const brandTotals: Record<string, { deposit: number; withdraw: number }> = {}
      
      mvBrandsData.forEach((row: any) => {
        const monthNum = row.month as number
        const brand = row.line as string
        
        if (monthsInQuarter.includes(monthNum) && brand) {
          if (!brandTotals[brand]) {
            brandTotals[brand] = { deposit: 0, withdraw: 0 }
          }
          brandTotals[brand].deposit += parseFloat(row.deposit_amount) || 0
          brandTotals[brand].withdraw += parseFloat(row.withdraw_amount) || 0
        }
      })
      
      // Calculate GGR per brand
      Object.keys(brandTotals).forEach(brand => {
        const ggr = brandTotals[brand].deposit - brandTotals[brand].withdraw
        result[brand] = ggr
      })
      
      return result
    })
    
    // CHART 7 & 8: Retention Rate & Activation Rate (Per Brand)
    // Group new_register data by brand
    const newRegisterByBrand: Record<string, any[]> = {}
    newRegisterData.forEach((row: any) => {
      const brand = row.line
      if (brand && brand.trim()) {  // ✅ Filter empty/null brands
        if (!newRegisterByBrand[brand]) {
          newRegisterByBrand[brand] = []
        }
        newRegisterByBrand[brand].push(row)
      }
    })
    
    // CHART 7: Retention vs Churn Rate (Per Brand - Double Bar)
    const retentionVsChurnChart = detectedBrands.map(brand => {
      const brandData = dataByBrand[brand] || []  // ✅ Add fallback
      const newRegBrand = newRegisterByBrand[brand] || []
      
      // Active Member for this brand
      const activeMemberBrand = new Set(
        brandData
          .filter(row => (row.deposit_cases || 0) > 0)
          .map(row => row.userkey)
          .filter(Boolean)
      ).size
      
      // New Depositor for this brand
      const newDepositorBrand = newRegBrand.reduce((sum, row) => sum + (parseInt(row.new_depositor) || 0), 0)
      
      // Retention Rate = (Active Member - New Depositor) / Active Member * 100
      const retentionRate = activeMemberBrand > 0 ? ((activeMemberBrand - newDepositorBrand) / activeMemberBrand) * 100 : 0
      
      // Churn Rate = 100 - Retention Rate
      const churnRate = 100 - retentionRate
      
      return {
        brand,
        retentionRate,
        churnRate
      }
    })
    
    const activationRateChart = detectedBrands.map(brand => {
      const newRegBrand = newRegisterByBrand[brand] || []  // ✅ Add fallback
      const brandData = dataByBrand[brand] || []
      
      // Total new register
      const totalNewReg = newRegBrand.reduce((sum, row) => sum + (parseInt(row.new_register) || 0), 0)
      
      // New depositor (activated)
      const newDepositor = newRegBrand.reduce((sum, row) => sum + (parseInt(row.new_depositor) || 0), 0)
      
      // Activation Rate = New Depositor / Total New Register * 100
      const rate = totalNewReg > 0 ? (newDepositor / totalNewReg) * 100 : 0
      
      return {
        brand,
        rate
      }
    })
    
    // ========================================
    // CHART: FORECAST Q4 GGR (Quarterly)
    // ========================================
    const forecastCategories = sortedQuarters
    const actualGGRData = sortedQuarters.map(quarter => {
      const ggrForQuarter = ggrTrend.find(g => g.month === quarter)
      return ggrForQuarter ? ggrForQuarter.ggr : 0
    })
    
    // USE TARGET FROM DATABASE (bp_target table)
    const targetGGRValue = targetData?.target_ggr || 0
    const targetGGRData = sortedQuarters.map(() => targetGGRValue)
    
    // ✅ DYNAMIC FORECAST CALCULATION USING LINEAR REGRESSION
    // Collect ALL historical quarters with actual data (completed quarters only)
    const historicalData: { x: number; y: number }[] = []
    sortedQuarters.forEach((q, i) => {
      const ggrValue = actualGGRData[i]
      // Only include quarters with substantial data (not partial/incomplete quarters)
      // We consider a quarter complete if it has data
      if (ggrValue > 0) {
        historicalData.push({ x: i + 1, y: ggrValue })  // x = quarter number (1,2,3,4)
      }
    })
    
    console.log('📊 [Forecast] Historical Data Points:', historicalData)
    
    // Calculate forecast for ALL quarters using linear regression
    const forecastGGRData = sortedQuarters.map((quarter, index) => {
      // Need at least 2 historical data points to forecast
      if (historicalData.length < 2) {
        return 0
      }
      
      // LINEAR REGRESSION: y = mx + b
      const n = historicalData.length
      const sumX = historicalData.reduce((sum, d) => sum + d.x, 0)
      const sumY = historicalData.reduce((sum, d) => sum + d.y, 0)
      const sumXY = historicalData.reduce((sum, d) => sum + (d.x * d.y), 0)
      const sumX2 = historicalData.reduce((sum, d) => sum + (d.x * d.x), 0)
      
      // Calculate slope (m) and intercept (b)
      const denominator = (n * sumX2 - sumX * sumX)
      if (denominator === 0) {
        // Avoid division by zero - return average if slope can't be calculated
        const avgY = sumY / n
        return avgY
      }
      
      const m = (n * sumXY - sumX * sumY) / denominator
      const b = (sumY - m * sumX) / n
      
      // Predict for this quarter (index + 1)
      const forecastValue = m * (index + 1) + b
      
      return forecastValue > 0 ? forecastValue : 0
    })
    
    console.log('📊 [Forecast GGR] Actual Data:', actualGGRData)
    console.log('📊 [Forecast GGR] Forecast Data:', forecastGGRData)
    console.log('📊 [Forecast GGR] Target Data:', targetGGRData)
    
    // ✅ SHOW ALL 3 LINES FOR COMPARISON:
    // - Actual GGR (Blue): Real data from database
    // - Target GGR (Green): Target from bp_target table
    // - Forecast GGR (Orange): Predicted using Linear Regression
    const forecastQ4GGR = {
      categories: forecastCategories,
      series: [
        { name: 'Actual GGR', data: actualGGRData, color: '#3B82F6' },
        { name: 'Target GGR', data: targetGGRData, color: '#10b981' },
        { name: 'Forecast GGR', data: forecastGGRData, color: '#F97316' }
      ]
    }
    
    // ========================================
    // CHART: SANKEY DIAGRAM (Active Member → Brands → Retained/Churned)
    // ========================================
    console.log('📊 [BP Data API] Calculating brand member flows for Sankey...')
    const brandFlows = await calculateBrandMemberFlows({
      year: parseInt(year),
      quarter,
      isDateRange,
      startDate: startDate || '',
      endDate: endDate || '',
      quarterMonths
    })
    
    // Calculate totals for validation
    const totalActiveBrands = Object.values(brandFlows).reduce((sum, flow) => sum + flow.active, 0)
    const totalRetained = Object.values(brandFlows).reduce((sum, flow) => sum + flow.retained, 0)
    const totalChurned = Object.values(brandFlows).reduce((sum, flow) => sum + flow.churned, 0)
    
    console.log('📊 [BP Data API] Sankey validation:', {
      activeMemberTotal: activeMember,
      totalActiveBrands,
      totalRetained,
      totalChurned,
      brandFlows
    })
    
    // VALIDATION: If total brands > active members, there's a data issue
    // In this case, we'll normalize or use actual active member as the source
    
    // Extract brands from brandFlows object (sorted for consistency)
    const detectedBrandsForSankey = Object.keys(brandFlows).sort()
    
    // Build nodes DYNAMICALLY based on detected brands
    const sankeyNodes: any[] = [
      { name: 'Active Member', value: activeMember }
    ]
    
    // Add brand nodes dynamically
    detectedBrandsForSankey.forEach(brand => {
      sankeyNodes.push({ 
        name: brand, 
        value: brandFlows[brand]?.active || 0 
      })
    })
    
    // Add final nodes (Retained & Churned)
    const retainedIndex = sankeyNodes.length
    const churnedIndex = sankeyNodes.length + 1
    sankeyNodes.push({ name: 'Retained', value: totalRetained })
    sankeyNodes.push({ name: 'Churned', value: totalChurned })
    
    const sankeyLinks: any[] = []
    
    // Flow: Active Member → Brands
    detectedBrandsForSankey.forEach((brand, index) => {
      const active = brandFlows[brand]?.active || 0
      if (active > 0) {
        sankeyLinks.push({ source: 0, target: index + 1, value: active })
      }
    })
    
    // Flow: Brands → Retained/Churned (use correct indices)
    detectedBrandsForSankey.forEach((brand, index) => {
      const retained = brandFlows[brand]?.retained || 0
      const churned = brandFlows[brand]?.churned || 0
      
      if (retained > 0) {
        sankeyLinks.push({ source: index + 1, target: retainedIndex, value: retained })
      }
      if (churned > 0) {
        sankeyLinks.push({ source: index + 1, target: churnedIndex, value: churned })
      }
    })
    
    const customerFlow = {
      nodes: sankeyNodes,
      links: sankeyLinks
    }
    
    const chartData = {
      ggrTrend,
      depositAmountVsCases,
      withdrawAmountVsCases,
      winrateVsWithdrawRate,
      bonusUsageRate: bonusUsageRateChart,
      brandGGRContribution,
      retentionVsChurn: retentionVsChurnChart,
      activationRate: activationRateChart,
      forecastQ4GGR,
      customerFlow
    }

    // ========================================
    // STEP 6: RETURN RESPONSE
    // ========================================
    const totalTime = Date.now() - startTime
    console.log(`✅ [BP Data API] Success! Total time: ${totalTime}ms`)

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          // ROW 1: Main KPI Cards
          targetAchieveRate,
          currentGGR: grossGamingRevenue,
          targetGGR,
          activeMember,
          pureActive,
          
          // ROW 1: Transaction Metrics (Dual KPI)
          atv,
          purchaseFrequency: pf,
          
          // ROW 1: User Value Metrics (Dual KPI)
          ggrUser,
          daUser,
          
          // Additional Financial KPIs
          netProfit,
          depositCases,
          depositAmount,
          withdrawCases,
          withdrawAmount,
          
          // Rate KPIs
          bonusUsageRate,
          winRate,
          withdrawalRate,
          
          // Member Metrics
          churnMember: memberMetrics.churnMember,
          retentionMember: memberMetrics.retentionMember,
          reactivationMember: memberMetrics.reactivationMember,
          churnRate: memberMetrics.churnRate,
          retentionRate: memberMetrics.retentionRate,
          reactivationRate: memberMetrics.reactivationRate,
          
          // Registration
          newRegister,
          newDepositor,
          
          // Activation Rate (New Depositor / New Register)
          activationRate: newRegister > 0 ? (newDepositor / newRegister) * 100 : 0,
          
          // Target Data
          targetDepositAmount,
          targetDepositCases,
          targetActiveMember,
          forecastGGR
        },
        chartData,
        metadata: {
          year,
          quarter,
          isDateRange,
          startDate: isDateRange ? startDate : null,
          endDate: isDateRange ? endDate : null,
          line,
          queryTimeMs: queryTime,
          totalTimeMs: totalTime,
          dataSource: {
            blueWhaleRows: blueWhaleData.length,
            newRegisterRows: newRegisterData.length,
            hasTargetData: !!targetData
          }
        }
      }
    })

  } catch (error) {
    console.error('❌ [BP Data API] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch business performance data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


