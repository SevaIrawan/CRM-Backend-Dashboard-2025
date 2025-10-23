import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  generateGGRTrendChart,
  generateForecastQ4GGRChart,
  generateDepositVsCasesChart,
  generateWithdrawVsCasesChart,
  generateWinrateVsWithdrawRateChart,
  generateBonusUsagePerBrandChart,
  generateBrandGGRContributionChart,
  generateRetentionVsChurnRateChart,
  generateReactivationRateChart,
  generateSankeyDiagram,
  type ChartParams
} from '../chart-helpers'
import {
  calculatePreviousPeriod as getPreviousPeriod,
  calculateAverageDaily,
  calculateMoMChange
} from '@/lib/businessPerformanceComparison'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUSINESS PERFORMANCE DATA API - MYR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PURPOSE: Calculate all KPIs for Business Performance Page based on mode
// MODES:
//   - DAILY MODE: Use bp_daily_summary_myr (MV) + blue_whale_myr (for COUNT DISTINCT)
//   - QUARTERLY MODE: Use bp_quarter_summary_myr (MV) + blue_whale_myr (for COUNT DISTINCT)
// 
// DATA SOURCES:
//   - bp_daily_summary_myr (MV): Pre-calculated financial aggregates + 7 SUM-based KPIs for daily mode
//   - bp_quarter_summary_myr (MV): Pre-calculated financial aggregates + 4 SUM-based KPIs for quarterly mode
//   - blue_whale_myr (Master Table): For COUNT DISTINCT (Active Member, Pure User, etc.) + Cohort Logic
//   - new_register (Table): For new register & new depositor counts
//   - bp_target (Table): For target & forecast values
//
// LAST UPDATED: 2025-10-22 - COMPLETE REWRITE based on BP_API_LOGIC_REQUIREMENTS.md
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER 1: CALCULATE ACTIVE MEMBER (COUNT DISTINCT userkey)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function calculateActiveMember(params: {
  currency: string
  startDate?: string
  endDate?: string
  year?: number
  quarter?: string
}): Promise<number> {
  const { currency, startDate, endDate, year, quarter } = params

  let query = supabase
    .from('blue_whale_myr')
    .select('userkey', { count: 'exact', head: false })
    .eq('currency', currency)
    .gt('deposit_cases', 0)

  // Filter by date range (Daily Mode)
  if (startDate && endDate) {
    query = query.gte('date', startDate).lte('date', endDate)
  }

  // Filter by quarter (Quarterly Mode)
  if (year && quarter) {
    const quarterMonths: Record<string, string[]> = {
      'Q1': ['January', 'February', 'March'],
      'Q2': ['April', 'May', 'June'],
      'Q3': ['July', 'August', 'September'],
      'Q4': ['October', 'November', 'December']
    }
    const months = quarterMonths[quarter] || []
    query = query.eq('year', year.toString()).in('month', months)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('[calculateActiveMember] Error:', error)
    return 0
  }

  // Get unique userkeys
  const uniqueUserKeys = new Set(data.map((row: any) => row.userkey))
  return uniqueUserKeys.size
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER 2: CALCULATE PURE USER (COUNT DISTINCT unique_code)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function calculatePureUser(params: {
  currency: string
  startDate?: string
  endDate?: string
  year?: number
  quarter?: string
}): Promise<number> {
  const { currency, startDate, endDate, year, quarter } = params

  let query = supabase
    .from('blue_whale_myr')
    .select('unique_code', { count: 'exact', head: false })
    .eq('currency', currency)
    .gt('deposit_cases', 0)
    .not('unique_code', 'is', null)

  // Filter by date range (Daily Mode)
  if (startDate && endDate) {
    query = query.gte('date', startDate).lte('date', endDate)
  }

  // Filter by quarter (Quarterly Mode)
  if (year && quarter) {
    const quarterMonths: Record<string, string[]> = {
      'Q1': ['January', 'February', 'March'],
      'Q2': ['April', 'May', 'June'],
      'Q3': ['July', 'August', 'September'],
      'Q4': ['October', 'November', 'December']
    }
    const months = quarterMonths[quarter] || []
    query = query.eq('year', year.toString()).in('month', months)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('[calculatePureUser] Error:', error)
    return 0
  }

  // Get unique codes
  const uniqueCodes = new Set(data.map((row: any) => row.unique_code))
  return uniqueCodes.size
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER 3: CALCULATE PURE USER GGR (deposit_amount - withdraw_amount)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function calculatePureUserGGR(params: {
  currency: string
  startDate?: string
  endDate?: string
  year?: number
  quarter?: string
}): Promise<number> {
  const { currency, startDate, endDate, year, quarter } = params

  let query = supabase
    .from('blue_whale_myr')
    .select('deposit_amount, withdraw_amount')
    .eq('currency', currency)

  // Filter by date range (Daily Mode)
  if (startDate && endDate) {
    query = query.gte('date', startDate).lte('date', endDate)
  }

  // Filter by quarter (Quarterly Mode)
  if (year && quarter) {
    const quarterMonths: Record<string, string[]> = {
      'Q1': ['January', 'February', 'March'],
      'Q2': ['April', 'May', 'June'],
      'Q3': ['July', 'August', 'September'],
      'Q4': ['October', 'November', 'December']
    }
    const months = quarterMonths[quarter] || []
    query = query.eq('year', year.toString()).in('month', months)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('[calculatePureUserGGR] Error:', error)
    return 0
  }

  // Sum GGR (deposit_amount - withdraw_amount)
  const pureUserGGR = data.reduce((sum: number, row: any) => {
    const ggr = (row.deposit_amount || 0) - (row.withdraw_amount || 0)
    return sum + ggr
  }, 0)

  return pureUserGGR
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER 4: CALCULATE RETENTION MEMBER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function calculateRetentionMember(params: {
  currency: string
  currentStart: string
  currentEnd: string
  prevStart: string
  prevEnd: string
}): Promise<number> {
  const { currency, currentStart, currentEnd, prevStart, prevEnd } = params

  // Get active users in current period
  const { data: currentUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', currency)
    .gte('date', currentStart)
    .lte('date', currentEnd)
    .gt('deposit_cases', 0)

  const currentUserKeys = Array.from(new Set(currentUsers?.map((u: any) => u.userkey) || []))

  // Get active users in previous period
  const { data: prevUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', currency)
    .gte('date', prevStart)
    .lte('date', prevEnd)
    .gt('deposit_cases', 0)

  const prevUserKeys = new Set(prevUsers?.map((u: any) => u.userkey) || [])

  // Count intersection (users in both periods)
  const retentionMember = currentUserKeys.filter(key => prevUserKeys.has(key)).length

  return retentionMember
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER 5: CALCULATE REACTIVATION MEMBER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function calculateReactivationMember(params: {
  currency: string
  currentStart: string
  currentEnd: string
  prevStart: string
  prevEnd: string
}): Promise<number> {
  const { currency, currentStart, currentEnd, prevStart, prevEnd } = params

  // Get active users in current period with first_deposit_date
  const { data: currentUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey, first_deposit_date')
    .eq('currency', currency)
    .gte('date', currentStart)
    .lte('date', currentEnd)
    .gt('deposit_cases', 0)

  // Get unique current users (with earliest first_deposit_date per userkey)
  const currentUserMap = new Map()
  currentUsers?.forEach((u: any) => {
    if (!currentUserMap.has(u.userkey) || u.first_deposit_date < currentUserMap.get(u.userkey)) {
      currentUserMap.set(u.userkey, u.first_deposit_date)
    }
  })

  // Get active users in previous period
  const { data: prevUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', currency)
    .gte('date', prevStart)
    .lte('date', prevEnd)
    .gt('deposit_cases', 0)

  const prevUserKeys = new Set(prevUsers?.map((u: any) => u.userkey) || [])

  // Count users: in current, NOT in previous, AND first_deposit_date before current period
  let reactivationMember = 0
  currentUserMap.forEach((firstDepositDate, userkey) => {
    if (!prevUserKeys.has(userkey) && firstDepositDate < currentStart) {
      reactivationMember++
    }
  })

  return reactivationMember
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER 6: CALCULATE CHURN MEMBER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function calculateChurnMember(params: {
  currency: string
  currentStart: string
  currentEnd: string
  prevStart: string
  prevEnd: string
}): Promise<number> {
  const { currency, currentStart, currentEnd, prevStart, prevEnd } = params

  // Get active users in previous period
  const { data: prevUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', currency)
    .gte('date', prevStart)
    .lte('date', prevEnd)
    .gt('deposit_cases', 0)

  const prevUserKeys = Array.from(new Set(prevUsers?.map((u: any) => u.userkey) || []))

  // Get active users in current period
  const { data: currentUsers } = await supabase
    .from('blue_whale_myr')
    .select('userkey')
    .eq('currency', currency)
    .gte('date', currentStart)
    .lte('date', currentEnd)
    .gt('deposit_cases', 0)

  const currentUserKeys = new Set(currentUsers?.map((u: any) => u.userkey) || [])

  // Count users: in previous, NOT in current
  const churnMember = prevUserKeys.filter(key => !currentUserKeys.has(key)).length

  return churnMember
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER 7: CALCULATE PREVIOUS PERIOD DATES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function calculatePreviousPeriod(params: {
  currentStart: string
  currentEnd: string
  mode: 'daily' | 'quarterly'
  year?: number
  quarter?: string
}): { prevStart: string; prevEnd: string } {
  const { currentStart, currentEnd, mode, year, quarter } = params

  if (mode === 'daily') {
    // For daily mode: date-to-date comparison (same dates in previous month)
    const start = new Date(currentStart)
    const end = new Date(currentEnd)
    
    // Subtract 1 month from both dates
    const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, start.getDate())
    const prevEnd = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate())
    
    return {
      prevStart: prevStart.toISOString().split('T')[0],
      prevEnd: prevEnd.toISOString().split('T')[0]
    }
  } else {
    // For quarterly mode: previous quarter
    if (!year || !quarter) {
      return { prevStart: '', prevEnd: '' }
    }

    const quarterMap: Record<string, { quarter: string; year: number }> = {
      'Q1': { quarter: 'Q4', year: year - 1 },
      'Q2': { quarter: 'Q1', year },
      'Q3': { quarter: 'Q2', year },
      'Q4': { quarter: 'Q3', year }
    }

    const prev = quarterMap[quarter]
    const prevMonths: Record<string, number[]> = {
      'Q1': [1, 2, 3],
      'Q2': [4, 5, 6],
      'Q3': [7, 8, 9],
      'Q4': [10, 11, 12]
    }

    const months = prevMonths[prev.quarter]
    const prevStart = `${prev.year}-${months[0].toString().padStart(2, '0')}-01`
    const prevEnd = `${prev.year}-${months[2].toString().padStart(2, '0')}-${new Date(prev.year, months[2], 0).getDate()}`

    return { prevStart, prevEnd }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN GET HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: EXTRACT FILTERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const currency = searchParams.get('currency') || 'MYR'
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const quarter = searchParams.get('quarter') || 'Q4'
    const isDateRange = searchParams.get('isDateRange') === 'true'
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    console.log('[BP API] Filters:', { currency, year, quarter, isDateRange, startDate, endDate })

    const mode: 'daily' | 'quarterly' = isDateRange ? 'daily' : 'quarterly'

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: FETCH FINANCIAL AGGREGATES FROM MV
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let mvData: any = {}
    let newDepositor = 0
    let newRegister = 0

    if (mode === 'daily') {
      // DAILY MODE: Fetch from bp_daily_summary_myr
      const { data: dailyData, error } = await supabase
        .from('bp_daily_summary_myr')
        .select('*')
        .eq('currency', currency)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('line', 'ALL')

      if (error) {
        console.error('[BP API] Error fetching bp_daily_summary_myr:', error)
        return NextResponse.json({ error: 'Failed to fetch daily MV data' }, { status: 500 })
      }

      // Aggregate across all rows
      mvData = {
        deposit_amount: dailyData?.reduce((sum: number, row: any) => sum + (row.deposit_amount || 0), 0) || 0,
        deposit_cases: dailyData?.reduce((sum: number, row: any) => sum + (row.deposit_cases || 0), 0) || 0,
        withdraw_amount: dailyData?.reduce((sum: number, row: any) => sum + (row.withdraw_amount || 0), 0) || 0,
        withdraw_cases: dailyData?.reduce((sum: number, row: any) => sum + (row.withdraw_cases || 0), 0) || 0,
        add_transaction: dailyData?.reduce((sum: number, row: any) => sum + (row.add_transaction || 0), 0) || 0,
        deduct_transaction: dailyData?.reduce((sum: number, row: any) => sum + (row.deduct_transaction || 0), 0) || 0,
        bonus: dailyData?.reduce((sum: number, row: any) => sum + (row.bonus || 0), 0) || 0,
        add_bonus: dailyData?.reduce((sum: number, row: any) => sum + (row.add_bonus || 0), 0) || 0,
        deduct_bonus: dailyData?.reduce((sum: number, row: any) => sum + (row.deduct_bonus || 0), 0) || 0,
        valid_amount: dailyData?.reduce((sum: number, row: any) => sum + (row.valid_amount || 0), 0) || 0,
        ggr: dailyData?.reduce((sum: number, row: any) => sum + (row.ggr || 0), 0) || 0,
        net_profit: dailyData?.reduce((sum: number, row: any) => sum + (row.net_profit || 0), 0) || 0,
        // ATV: Need to recalculate from SUM (don't average the ATV values)
        winrate: 0, // Will calculate below
        withdrawal_rate: 0, // Will calculate below
        hold_percentage: 0, // Will calculate below
        conversion_rate: 0 // Will calculate below
      }

      newDepositor = dailyData?.reduce((sum: number, row: any) => sum + (row.new_depositor || 0), 0) || 0
      newRegister = dailyData?.reduce((sum: number, row: any) => sum + (row.new_register || 0), 0) || 0

      // Recalculate rates
      mvData.winrate = mvData.deposit_amount > 0 ? (mvData.ggr / mvData.deposit_amount) * 100 : 0
      mvData.withdrawal_rate = mvData.deposit_cases > 0 ? (mvData.withdraw_cases / mvData.deposit_cases) * 100 : 0
      mvData.hold_percentage = mvData.valid_amount > 0 ? (mvData.net_profit / mvData.valid_amount) * 100 : 0
      mvData.conversion_rate = newRegister > 0 ? (newDepositor / newRegister) * 100 : 0

    } else {
      // QUARTERLY MODE: Fetch from bp_quarter_summary_myr
      const { data: quarterData, error } = await supabase
        .from('bp_quarter_summary_myr')
        .select('*')
        .eq('currency', currency)
        .eq('year', year)
        .eq('period', quarter)
        .eq('period_type', 'QUARTERLY')
        .eq('line', 'ALL')
        .maybeSingle()

      if (error) {
        console.error('[BP API] Error fetching bp_quarter_summary_myr:', error)
        return NextResponse.json({ error: 'Failed to fetch quarterly MV data' }, { status: 500 })
      }

      if (!quarterData) {
        console.warn('[BP API] No quarterly MV data found')
        mvData = {
          deposit_amount: 0,
          deposit_cases: 0,
          withdraw_amount: 0,
          withdraw_cases: 0,
          add_transaction: 0,
          deduct_transaction: 0,
          bonus: 0,
          valid_amount: 0,
          ggr: 0,
          net_profit: 0,
          winrate: 0,
          withdrawal_rate: 0
        }
        newDepositor = 0
        newRegister = 0
      } else {
        mvData = quarterData as any
        newDepositor = (quarterData as any).new_depositor || 0
        newRegister = (quarterData as any).new_register || 0
      }

      // For quarterly, hold_percentage and conversion_rate are not pre-calculated, so calculate here
      mvData.hold_percentage = mvData.valid_amount > 0 ? (mvData.net_profit / mvData.valid_amount) * 100 : 0
      mvData.conversion_rate = newRegister > 0 ? (newDepositor / newRegister) * 100 : 0
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: CALCULATE MEMBER METRICS (COUNT DISTINCT from blue_whale_myr)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const [activeMember, pureUser, pureUserGGR] = await Promise.all([
      calculateActiveMember(
        mode === 'daily'
          ? { currency, startDate, endDate }
          : { currency, year, quarter }
      ),
      calculatePureUser(
        mode === 'daily'
          ? { currency, startDate, endDate }
          : { currency, year, quarter }
      ),
      calculatePureUserGGR(
        mode === 'daily'
          ? { currency, startDate, endDate }
          : { currency, year, quarter }
      )
    ])

    const pureActive = activeMember - newDepositor

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: CALCULATE DERIVED KPIs
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const atv = mvData.deposit_cases > 0 ? mvData.deposit_amount / mvData.deposit_cases : 0
    const pf = activeMember > 0 ? mvData.deposit_cases / activeMember : 0
    const ggrUser = activeMember > 0 ? mvData.net_profit / activeMember : 0
    const daUser = activeMember > 0 ? mvData.deposit_amount / activeMember : 0
    // Bonus Usage Rate = (bonus + add_bonus - deduct_bonus) / active_member (NO × 100)
    const netBonus = (mvData.bonus || 0) + (mvData.add_bonus || 0) - (mvData.deduct_bonus || 0)
    const bonusUsageRate = activeMember > 0 ? (netBonus / activeMember) : 0

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: CALCULATE COHORT METRICS (if needed for KPI cards)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const { prevStart, prevEnd } = calculatePreviousPeriod({
      currentStart: mode === 'daily' ? startDate : `${year}-${quarter === 'Q1' ? '01' : quarter === 'Q2' ? '04' : quarter === 'Q3' ? '07' : '10'}-01`,
      currentEnd: mode === 'daily' ? endDate : `${year}-${quarter === 'Q1' ? '03-31' : quarter === 'Q2' ? '06-30' : quarter === 'Q3' ? '09-30' : '12-31'}`,
      mode,
      year,
      quarter
    })

    let retentionMember = 0
    let reactivationMember = 0
    let churnMember = 0

    if (prevStart && prevEnd) {
      let currentStart = ''
      let currentEnd = ''
      
      if (mode === 'daily') {
        currentStart = startDate
        currentEnd = endDate
      } else {
        // Quarterly mode
        if (quarter === 'Q1') {
          currentStart = `${year}-01-01`
          currentEnd = `${year}-03-31`
        } else if (quarter === 'Q2') {
          currentStart = `${year}-04-01`
          currentEnd = `${year}-06-30`
        } else if (quarter === 'Q3') {
          currentStart = `${year}-07-01`
          currentEnd = `${year}-09-30`
        } else {
          currentStart = `${year}-10-01`
          currentEnd = `${year}-12-31`
        }
      }

      [retentionMember, reactivationMember, churnMember] = await Promise.all([
        calculateRetentionMember({ currency, currentStart, currentEnd, prevStart, prevEnd }),
        calculateReactivationMember({ currency, currentStart, currentEnd, prevStart, prevEnd }),
        calculateChurnMember({ currency, currentStart, currentEnd, prevStart, prevEnd })
      ])
    }

    // Calculate prev active member for rate calculations
    const prevActiveMember = await calculateActiveMember(
      mode === 'daily'
        ? { currency, startDate: prevStart, endDate: prevEnd }
        : { currency, year: prevEnd.includes((year - 1).toString()) ? year - 1 : year, quarter: prevEnd.includes('Q4') ? 'Q4' : prevEnd.includes('Q1') ? 'Q1' : prevEnd.includes('Q2') ? 'Q2' : 'Q3' }
    )

    const retentionRate = prevActiveMember > 0 ? (retentionMember / prevActiveMember) * 100 : 0
    const reactivationRate = activeMember > 0 ? (reactivationMember / activeMember) * 100 : 0
    const churnRate = prevActiveMember > 0 ? (churnMember / prevActiveMember) * 100 : 0

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6: FETCH TARGET DATA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const { data: targetData } = await supabase
      .from('bp_target')
      .select('*')
      .eq('currency', currency)
      .eq('year', year)
      .eq('quarter', quarter)

    let targetGGR = 0
    let targetDepositAmount = 0
    let targetDepositCases = 0
    let targetActiveMember = 0
    let forecastGGR = 0

    if (targetData && targetData.length > 0) {
      // Sum targets from all brands
      targetGGR = targetData.reduce((sum: number, row: any) => sum + (row.target_ggr || 0), 0)
      targetDepositAmount = targetData.reduce((sum: number, row: any) => sum + (row.target_deposit_amount || 0), 0)
      targetDepositCases = targetData.reduce((sum: number, row: any) => sum + (row.target_deposit_cases || 0), 0)
      targetActiveMember = targetData.reduce((sum: number, row: any) => sum + (row.target_active_member || 0), 0)
      forecastGGR = targetData.reduce((sum: number, row: any) => sum + (row.forecast_ggr || 0), 0)
    }

    const targetAchieveRate = targetGGR > 0 ? (mvData.ggr / targetGGR) * 100 : 0

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 7: GENERATE CHART DATA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const chartParams: ChartParams = {
      currency,
      year,
      quarter,
      mode,
      startDate,
      endDate
    }

    console.log('[BP API] Generating chart data...')

    const [
      ggrTrend,
      forecastQ4GGR,
      depositVsCases,
      withdrawVsCases,
      winrateVsWithdrawRate,
      bonusUsagePerBrand,
      brandGGRContribution,
      retentionVsChurnRate,
      reactivationRateChart,
      sankey
    ] = await Promise.all([
      generateGGRTrendChart(chartParams),
      generateForecastQ4GGRChart(chartParams),
      generateDepositVsCasesChart(chartParams),
      generateWithdrawVsCasesChart(chartParams),
      generateWinrateVsWithdrawRateChart(chartParams),
      generateBonusUsagePerBrandChart(chartParams),
      generateBrandGGRContributionChart(chartParams),
      generateRetentionVsChurnRateChart(chartParams),
      generateReactivationRateChart(chartParams),
      generateSankeyDiagram({ ...chartParams, pureUserGGR })
    ])

    console.log('[BP API] Chart data generated successfully')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 7.5: CALCULATE DAILY AVERAGE & MOM COMPARISON
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('[BP API] Calculating Daily Average & MoM Comparison...')
    
    // Get max date from data for comparison logic
    const { data: maxDateResult } = await supabase
      .from('blue_whale_myr')
      .select('date')
      .eq('currency', currency)
      .order('date', { ascending: false })
      .limit(1)
      .single()
    
    const maxDateInData: string = (maxDateResult?.date as string) || endDate || `${year}-12-31`
    
    // Calculate previous period dates
    const previousPeriod = getPreviousPeriod(
      mode === 'daily' ? 'Daily' : 'Quarter',
      quarter || 'Q4',
      year || new Date().getFullYear(),
      startDate || `${year}-01-01`,
      endDate || `${year}-12-31`,
      maxDateInData
    )
    
    console.log('[BP API] Previous Period:', previousPeriod)
    console.log('[BP API] Comparison Mode:', previousPeriod.comparisonMode)
    console.log('[BP API] Previous Period Dates:', {
      prevStartDate: previousPeriod.prevStartDate,
      prevEndDate: previousPeriod.prevEndDate
    })
    
    // Fetch and calculate PREVIOUS PERIOD KPIs FOR MoM COMPARISON
    let prevPeriodActiveMember = 0
    let prevPeriodPureUser = 0
    let prevPeriodPureActive = 0
    let prevPeriodPureUserGGR = 0
    let prevPeriodMvData: any = {
      deposit_amount: 0,
      deposit_cases: 0,
      withdraw_amount: 0,
      withdraw_cases: 0,
      net_profit: 0,
      winrate: 0,
      withdrawal_rate: 0
    }
    let prevPeriodNewDepositor = 0
    let prevPeriodNewRegister = 0
    
    if (mode === 'daily') {
      // DAILY MODE: Fetch from bp_daily_summary_myr
      const { data: prevDailyData } = await supabase
        .from('bp_daily_summary_myr')
        .select('*')
        .eq('currency', currency)
        .gte('date', previousPeriod.prevStartDate)
        .lte('date', previousPeriod.prevEndDate)
        .eq('line', 'ALL')
      
      if (prevDailyData && prevDailyData.length > 0) {
        prevPeriodMvData = {
          deposit_amount: prevDailyData.reduce((sum: number, row: any) => sum + (row.deposit_amount || 0), 0),
          deposit_cases: prevDailyData.reduce((sum: number, row: any) => sum + (row.deposit_cases || 0), 0),
          withdraw_amount: prevDailyData.reduce((sum: number, row: any) => sum + (row.withdraw_amount || 0), 0),
          withdraw_cases: prevDailyData.reduce((sum: number, row: any) => sum + (row.withdraw_cases || 0), 0),
          net_profit: prevDailyData.reduce((sum: number, row: any) => sum + (row.net_profit || 0), 0),
          ggr: prevDailyData.reduce((sum: number, row: any) => sum + (row.ggr || 0), 0),
          valid_amount: prevDailyData.reduce((sum: number, row: any) => sum + (row.valid_amount || 0), 0),
          bonus: prevDailyData.reduce((sum: number, row: any) => sum + (row.bonus || 0), 0)
        }
        prevPeriodNewDepositor = prevDailyData.reduce((sum: number, row: any) => sum + (row.new_depositor || 0), 0)
        prevPeriodNewRegister = prevDailyData.reduce((sum: number, row: any) => sum + (row.new_register || 0), 0)
        
        // Recalculate rates for previous period
        prevPeriodMvData.winrate = prevPeriodMvData.deposit_amount > 0 ? (prevPeriodMvData.ggr / prevPeriodMvData.deposit_amount) * 100 : 0
        prevPeriodMvData.withdrawal_rate = prevPeriodMvData.deposit_cases > 0 ? (prevPeriodMvData.withdraw_cases / prevPeriodMvData.deposit_cases) * 100 : 0
      }
    } else {
      // QUARTERLY MODE
      if (previousPeriod.comparisonMode === 'QUARTER_TO_QUARTER') {
        // QUARTER-TO-QUARTER: Fetch from bp_quarter_summary_myr (previous complete quarter)
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
        const currentIndex = quarters.indexOf(quarter || 'Q4')
        const prevQuarter = currentIndex === 0 ? 'Q4' : quarters[currentIndex - 1]
        const prevYear = currentIndex === 0 ? year - 1 : year
        
        const { data: prevQuarterData } = await supabase
          .from('bp_quarter_summary_myr')
          .select('*')
          .eq('currency', currency)
          .eq('year', prevYear.toString())
          .eq('period', prevQuarter)
          .eq('period_type', 'QUARTERLY')
          .eq('line', 'ALL')
          .maybeSingle()
        
        if (prevQuarterData) {
          prevPeriodMvData = prevQuarterData as any
          prevPeriodNewDepositor = (prevQuarterData as any).new_depositor || 0
          prevPeriodNewRegister = (prevQuarterData as any).new_register || 0
        }
      } else {
        // DATE-TO-DATE: Fetch from bp_daily_summary_myr (same date range, previous month)
        const { data: prevDailyData } = await supabase
          .from('bp_daily_summary_myr')
          .select('*')
          .eq('currency', currency)
          .gte('date', previousPeriod.prevStartDate)
          .lte('date', previousPeriod.prevEndDate)
          .eq('line', 'ALL')
        
        if (prevDailyData && prevDailyData.length > 0) {
          prevPeriodMvData = {
            deposit_amount: prevDailyData.reduce((sum: number, row: any) => sum + (row.deposit_amount || 0), 0),
            deposit_cases: prevDailyData.reduce((sum: number, row: any) => sum + (row.deposit_cases || 0), 0),
            withdraw_amount: prevDailyData.reduce((sum: number, row: any) => sum + (row.withdraw_amount || 0), 0),
            withdraw_cases: prevDailyData.reduce((sum: number, row: any) => sum + (row.withdraw_cases || 0), 0),
            net_profit: prevDailyData.reduce((sum: number, row: any) => sum + (row.net_profit || 0), 0),
            ggr: prevDailyData.reduce((sum: number, row: any) => sum + (row.ggr || 0), 0),
            valid_amount: prevDailyData.reduce((sum: number, row: any) => sum + (row.valid_amount || 0), 0),
            bonus: prevDailyData.reduce((sum: number, row: any) => sum + (row.bonus || 0), 0)
          }
          prevPeriodNewDepositor = prevDailyData.reduce((sum: number, row: any) => sum + (row.new_depositor || 0), 0)
          prevPeriodNewRegister = prevDailyData.reduce((sum: number, row: any) => sum + (row.new_register || 0), 0)
          
          // Recalculate rates for previous period
          prevPeriodMvData.winrate = prevPeriodMvData.deposit_amount > 0 ? (prevPeriodMvData.ggr / prevPeriodMvData.deposit_amount) * 100 : 0
          prevPeriodMvData.withdrawal_rate = prevPeriodMvData.deposit_cases > 0 ? (prevPeriodMvData.withdraw_cases / prevPeriodMvData.deposit_cases) * 100 : 0
        }
      }
    }
    
    // Calculate PREVIOUS PERIOD member metrics from master table
    const [prevPeriodActiveMemberCalc, prevPeriodPureUserCalc, prevPeriodPureUserGGRCalc] = await Promise.all([
      calculateActiveMember({
        currency,
        startDate: previousPeriod.prevStartDate,
        endDate: previousPeriod.prevEndDate
      }),
      calculatePureUser({
        currency,
        startDate: previousPeriod.prevStartDate,
        endDate: previousPeriod.prevEndDate
      }),
      calculatePureUserGGR({
        currency,
        startDate: previousPeriod.prevStartDate,
        endDate: previousPeriod.prevEndDate
      })
    ])
    
    prevPeriodActiveMember = prevPeriodActiveMemberCalc
    prevPeriodPureUser = prevPeriodPureUserCalc
    prevPeriodPureUserGGR = prevPeriodPureUserGGRCalc
    prevPeriodPureActive = prevPeriodActiveMember - prevPeriodNewDepositor
    
    // Calculate DAILY AVERAGE for CURRENT PERIOD
    // Get actual date range based on mode
    let actualStartDate = startDate
    let actualEndDate = endDate
    
    if (mode === 'quarterly') {
      // For quarterly mode, calculate actual quarter date range
      const quarterStartMonth = quarter === 'Q1' ? '01' : quarter === 'Q2' ? '04' : quarter === 'Q3' ? '07' : '10'
      const quarterEndMonth = quarter === 'Q1' ? '03' : quarter === 'Q2' ? '06' : quarter === 'Q3' ? '09' : '12'
      const quarterEndDay = quarter === 'Q1' ? '31' : quarter === 'Q2' ? '30' : quarter === 'Q3' ? '30' : '31'
      
      actualStartDate = `${year}-${quarterStartMonth}-01`
      actualEndDate = `${year}-${quarterEndMonth}-${quarterEndDay}`
      
      // If current quarter and maxDateInData exists, use maxDateInData as end date
      if (maxDateInData && new Date(maxDateInData) < new Date(actualEndDate)) {
        actualEndDate = maxDateInData
      }
    }
    
    console.log('[BP API] Daily Average Period:', { actualStartDate, actualEndDate, mode })
    
    const dailyAverage = {
      grossGamingRevenue: calculateAverageDaily(pureUserGGR, actualStartDate, actualEndDate),
      depositAmount: calculateAverageDaily(mvData.deposit_amount, actualStartDate, actualEndDate),
      depositCases: calculateAverageDaily(mvData.deposit_cases, actualStartDate, actualEndDate),
      withdrawAmount: calculateAverageDaily(mvData.withdraw_amount, actualStartDate, actualEndDate),
      withdrawCases: calculateAverageDaily(mvData.withdraw_cases, actualStartDate, actualEndDate),
      netProfit: calculateAverageDaily(mvData.net_profit, actualStartDate, actualEndDate),
      activeMember: calculateAverageDaily(activeMember, actualStartDate, actualEndDate),
      pureUser: calculateAverageDaily(pureUser, actualStartDate, actualEndDate),
      pureActive: calculateAverageDaily(pureActive, actualStartDate, actualEndDate)
    }
    
    // Calculate MOM COMPARISON (percentage change from previous to current)
    const comparison = {
      grossGamingRevenue: calculateMoMChange(pureUserGGR, prevPeriodPureUserGGR),
      depositAmount: calculateMoMChange(mvData.deposit_amount, prevPeriodMvData.deposit_amount),
      depositCases: calculateMoMChange(mvData.deposit_cases, prevPeriodMvData.deposit_cases),
      withdrawAmount: calculateMoMChange(mvData.withdraw_amount, prevPeriodMvData.withdraw_amount),
      withdrawCases: calculateMoMChange(mvData.withdraw_cases, prevPeriodMvData.withdraw_cases),
      netProfit: calculateMoMChange(mvData.net_profit, prevPeriodMvData.net_profit),
      activeMember: calculateMoMChange(activeMember, prevPeriodActiveMember),
      pureUser: calculateMoMChange(pureUser, prevPeriodPureUser),
      pureActive: calculateMoMChange(pureActive, prevPeriodPureActive),
      atv: calculateMoMChange(atv, prevPeriodMvData.deposit_cases > 0 ? prevPeriodMvData.deposit_amount / prevPeriodMvData.deposit_cases : 0),
      pf: calculateMoMChange(pf, prevPeriodActiveMember > 0 ? prevPeriodMvData.deposit_cases / prevPeriodActiveMember : 0),
      ggrUser: calculateMoMChange(ggrUser, prevPeriodActiveMember > 0 ? prevPeriodPureUserGGR / prevPeriodActiveMember : 0),
      daUser: calculateMoMChange(daUser, prevPeriodActiveMember > 0 ? prevPeriodMvData.deposit_amount / prevPeriodActiveMember : 0),
      bonusUsageRate: calculateMoMChange(bonusUsageRate, prevPeriodMvData.valid_amount > 0 ? (prevPeriodMvData.bonus / prevPeriodMvData.valid_amount) * 100 : 0),
      winrate: calculateMoMChange(mvData.winrate, prevPeriodMvData.winrate),
      withdrawalRate: calculateMoMChange(mvData.withdrawal_rate, prevPeriodMvData.withdrawal_rate)
    }
    
    console.log('[BP API] Daily Average & MoM Comparison calculated successfully')
    console.log('[BP API] Comparison Results:', {
      ggrCurrent: pureUserGGR,
      ggrPrevious: prevPeriodPureUserGGR,
      ggrComparison: comparison.grossGamingRevenue,
      activeMemberCurrent: activeMember,
      activeMemberPrevious: prevPeriodActiveMember,
      activeMemberComparison: comparison.activeMember
    })

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 8: BUILD RESPONSE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    return NextResponse.json({
      success: true,
      mode,
      kpis: {
        // Financial KPIs
        grossGamingRevenue: pureUserGGR, // ✅ WAJIB SAMA! GGR = Pure User GGR (deposit - withdraw)
        depositAmount: mvData.deposit_amount,
        depositCases: mvData.deposit_cases,
        withdrawAmount: mvData.withdraw_amount,
        withdrawCases: mvData.withdraw_cases,
        netProfit: mvData.net_profit, // Net Profit dari MV (terpisah dari GGR)
        
        // Member Metrics (from API calculation)
        activeMember,
        pureUser,
        pureActive,
        pureUserGGR,
        newRegister,
        newDepositor,
        
        // Transaction Metrics
        atv,
        pf,
        
        // User Value Metrics
        ggrUser,
        daUser,
        
        // Rates
        bonusUsageRate,
        winrate: mvData.winrate,
        withdrawalRate: mvData.withdrawal_rate,
        holdPercentage: mvData.hold_percentage,
        conversionRate: mvData.conversion_rate,
        
        // Cohort Metrics
        retentionMember,
        retentionRate,
        reactivationMember,
        reactivationRate,
        churnMember,
        churnRate,
        
        // Target KPIs
        targetGGR,
        targetDepositAmount,
        targetDepositCases,
        targetActiveMember,
        targetAchieveRate,
        forecastGGR
      },
      charts: {
        ggrTrend,
        forecastQ4GGR,
        depositVsCases,
        withdrawVsCases,
        winrateVsWithdrawRate,
        bonusUsagePerBrand,
        brandGGRContribution,
        retentionVsChurnRate,
        reactivationRate: reactivationRateChart,
        sankey
      },
      dailyAverage,
      comparison,
      previousPeriod: {
        startDate: previousPeriod.prevStartDate,
        endDate: previousPeriod.prevEndDate,
        comparisonMode: previousPeriod.comparisonMode
      }
    })

  } catch (error) {
    console.error('[BP API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
