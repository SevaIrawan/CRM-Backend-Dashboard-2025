import { supabase } from '@/lib/supabase'

export interface USCPrecisionFilters {
  line?: string | null
  year?: string | null
  month?: string | null
  startDate?: string | null
  endDate?: string | null
  filterMode?: 'month' | 'daterange' | null
}

export interface USCPrecisionKPIResult {
  activeMember: number
  depositCases: number
  depositAmount: number
  withdrawAmount: number
  addTransaction: number
  deductTransaction: number
  validAmount: number
  churnMember: number
  lastMonthActiveMember: number
  churnRate: number
  retentionRate: number
  growthRate: number
  avgTransactionValue: number
  purchaseFrequency: number
  avgCustomerLifespan: number
  customerLifetimeValue: number
  customerMaturityIndex: number
}

function getPrevYearMonth(yearStr: string, monthName: string): { year: string, month: string } {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const idx = months.indexOf(monthName)
  const prevIdx = idx === 0 ? 11 : idx - 1
  const prevMonth = months[prevIdx]
  const prevYear = idx === 0 ? (parseInt(yearStr) - 1).toString() : yearStr
  return { year: prevYear, month: prevMonth }
}

function kpiRound(value: number, decimals: number = 2): number {
  return Math.round((Number(value) || 0) * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

export async function getUSCPrecisionKPIs(filters: USCPrecisionFilters): Promise<USCPrecisionKPIResult> {
  // Currency locked to USC (by design of this helper)
  const year = filters.year || ''
  const month = filters.month || ''
  const { startDate, endDate, filterMode } = filters

  // Build base query for current period
  let baseQuery = supabase
    .from('blue_whale_usc')
    .select('userkey, deposit_cases, deposit_amount, withdraw_amount, add_transaction, deduct_transaction, valid_amount, date, year, month, line, currency')
    .eq('currency', 'USC')

  if (filters.line && filters.line !== 'ALL' && filters.line !== 'all') {
    baseQuery = baseQuery.eq('line', filters.line)
  }

  if (filterMode === 'daterange' && startDate && endDate) {
    baseQuery = baseQuery.gte('date', startDate).lte('date', endDate)
  } else {
    if (year) baseQuery = baseQuery.eq('year', parseInt(year))
    if (month && month !== 'ALL') baseQuery = baseQuery.eq('month', month)
  }

  const { data: currentRows, error: currentErr } = await baseQuery
  if (currentErr) throw currentErr

  const activeMember = new Set((currentRows || []).filter(r => (Number(r.deposit_cases) || 0) > 0).map(r => String(r.userkey))).size
  const depositCases = (currentRows || []).reduce((a, r) => a + (Number(r.deposit_cases) || 0), 0)
  const depositAmount = (currentRows || []).reduce((a, r) => a + (Number(r.deposit_amount) || 0), 0)
  const withdrawAmount = (currentRows || []).reduce((a, r) => a + (Number(r.withdraw_amount) || 0), 0)
  const addTransaction = (currentRows || []).reduce((a, r) => a + (Number(r.add_transaction) || 0), 0)
  const deductTransaction = (currentRows || []).reduce((a, r) => a + (Number(r.deduct_transaction) || 0), 0)
  const validAmount = (currentRows || []).reduce((a, r) => a + (Number(r.valid_amount) || 0), 0)

  // Previous period for churn
  let prevQuery = supabase
    .from('blue_whale_usc')
    .select('userkey, deposit_cases, date, year, month, line, currency')
    .eq('currency', 'USC')

  if (filters.line && filters.line !== 'ALL' && filters.line !== 'all') {
    prevQuery = prevQuery.eq('line', filters.line)
  }

  if (filterMode === 'daterange' && startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const periodDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    const prevStart = new Date(start.getTime() - periodDays * 24 * 60 * 60 * 1000)
    const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000)
    const prevStartStr = prevStart.toISOString().split('T')[0]
    const prevEndStr = prevEnd.toISOString().split('T')[0]
    prevQuery = prevQuery.gte('date', prevStartStr).lte('date', prevEndStr)
  } else {
    if (year && month) {
      const { year: py, month: pm } = getPrevYearMonth(year, month)
      prevQuery = prevQuery.eq('year', parseInt(py)).eq('month', pm)
    }
  }

  const { data: prevRows, error: prevErr } = await prevQuery
  if (prevErr) throw prevErr

  const prevActiveSet = new Set((prevRows || []).filter(r => (Number(r.deposit_cases) || 0) > 0).map(r => String(r.userkey)))
  const currActiveSet = new Set((currentRows || []).filter(r => (Number(r.deposit_cases) || 0) > 0).map(r => String(r.userkey)))

  const churnMember = Array.from(prevActiveSet).filter(u => !currActiveSet.has(u)).length
  const lastMonthActiveMember = prevActiveSet.size

  // Formulas (mirror KPI_FORMULAS in KPILogic)
  const winrate = depositAmount > 0 ? (depositAmount - withdrawAmount) / depositAmount * 100 : 0
  const avgTransactionValue = depositCases > 0 ? depositAmount / depositCases : 0
  const purchaseFrequency = activeMember > 0 ? depositCases / activeMember : 0
  const churnRate = lastMonthActiveMember > 0 ? Math.max(churnMember / lastMonthActiveMember, 0.01) * 100 : 1
  const retentionRate = Math.max(1 - (churnRate / 100), 0) * 100
  const growthRate = activeMember > 0 ? (activeMember - churnMember) / activeMember : 0
  const avgCustomerLifespan = (churnRate / 100) > 0 ? 1 / (churnRate / 100) : 1000
  const customerLifetimeValue = avgTransactionValue * purchaseFrequency * avgCustomerLifespan
  const customerMaturityIndex = (retentionRate * 0.5) + (growthRate * 0.5) + (churnRate * 0.2)

  return {
    activeMember,
    depositCases,
    depositAmount,
    withdrawAmount,
    addTransaction,
    deductTransaction,
    validAmount,
    churnMember,
    lastMonthActiveMember,
    churnRate: kpiRound(churnRate),
    retentionRate: kpiRound(retentionRate),
    growthRate: kpiRound(growthRate),
    avgTransactionValue: kpiRound(avgTransactionValue),
    purchaseFrequency: kpiRound(purchaseFrequency),
    avgCustomerLifespan: kpiRound(avgCustomerLifespan),
    customerLifetimeValue: customerLifetimeValue >= 1000 ? Math.round(customerLifetimeValue) : kpiRound(customerLifetimeValue),
    customerMaturityIndex: kpiRound(customerMaturityIndex)
  }
}


