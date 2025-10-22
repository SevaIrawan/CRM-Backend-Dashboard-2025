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
// HELPER 3: CALCULATE PURE USER NET PROFIT (SUM of net profit for unique_code)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function calculatePureUserNetProfit(params: {
  currency: string
  startDate?: string
  endDate?: string
  year?: number
  quarter?: string
}): Promise<number> {
  const { currency, startDate, endDate, year, quarter } = params

  let query = supabase
    .from('blue_whale_myr')
    .select('deposit_amount, withdraw_amount, add_transaction, deduct_transaction')
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
    console.error('[calculatePureUserNetProfit] Error:', error)
    return 0
  }

  // Sum net profit
  let pureUserNetProfit = 0
  data.forEach((row: any) => {
    const netProfit = (row.deposit_amount + row.add_transaction) - (row.withdraw_amount + row.deduct_transaction)
    pureUserNetProfit += netProfit
  })

  return pureUserNetProfit
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
        mvData = quarterData
        newDepositor = quarterData.new_depositor || 0
        newRegister = quarterData.new_register || 0
      }

      // For quarterly, hold_percentage and conversion_rate are not pre-calculated, so calculate here
      mvData.hold_percentage = mvData.valid_amount > 0 ? (mvData.net_profit / mvData.valid_amount) * 100 : 0
      mvData.conversion_rate = newRegister > 0 ? (newDepositor / newRegister) * 100 : 0
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: CALCULATE MEMBER METRICS (COUNT DISTINCT from blue_whale_myr)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const [activeMember, pureUser, pureUserNetProfit] = await Promise.all([
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
      calculatePureUserNetProfit(
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
      generateSankeyDiagram({ ...chartParams, pureUserNetProfit })
    ])

    console.log('[BP API] Chart data generated successfully')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 8: BUILD RESPONSE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    return NextResponse.json({
      success: true,
      mode,
      kpis: {
        // Financial KPIs (from MV)
        grossGamingRevenue: mvData.ggr,
        depositAmount: mvData.deposit_amount,
        depositCases: mvData.deposit_cases,
        withdrawAmount: mvData.withdraw_amount,
        withdrawCases: mvData.withdraw_cases,
        netProfit: pureUserNetProfit, // ✅ WAJIB SAMA! Semua profit berasal dari Pure User
        
        // Member Metrics (from API calculation)
        activeMember,
        pureUser,
        pureActive,
        pureUserNetProfit,
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
