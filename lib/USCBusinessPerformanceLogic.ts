import { supabase } from './supabase'

// ===========================================
// TYPES & INTERFACES
// ===========================================

export interface USCBPFilters {
  year: string
  month: string
  line?: string
}

export interface USCBPKPIData {
  // Main KPIs
  grossGamingRevenue: number
  activeMemberRate: number
  retentionRate: number
  
  // Dual KPI 1: User Engagement
  activeMember: number
  pureMember: number
  
  // Dual KPI 2: Transaction Metrics
  avgTransactionValue: number
  purchaseFrequency: number
  
  // Dual KPI 3: Transaction Amount
  depositAmount: number
  withdrawAmount: number
  
  // Supporting metrics
  depositCases: number
  withdrawCases: number
  newDepositor: number
  churnMember: number
  lastMonthActiveMember: number
  totalActiveMemberYear: number
}

export interface USCBPMoMData {
  grossGamingRevenue: number
  activeMemberRate: number
  retentionRate: number
  activeMember: number
  pureMember: number
  avgTransactionValue: number
  purchaseFrequency: number
  depositAmount: number
  withdrawAmount: number
}

// ===========================================
// CORE CALCULATION FUNCTIONS
// ===========================================

/**
 * Get Active Member for specific period
 * Active Member = COUNT DISTINCT userkey WHERE deposit_cases > 0
 */
async function getActiveMember(filters: USCBPFilters): Promise<number> {
  let query = supabase
    .from('blue_whale_usc')
    .select('userkey')
    .eq('year', filters.year)
    .eq('month', filters.month)
    .eq('currency', 'USC')
    .gt('deposit_cases', 0)
  
  if (filters.line && filters.line !== 'ALL') {
    query = query.eq('line', filters.line)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('❌ Error fetching active members:', error)
    return 0
  }
  
  const uniqueUserKeys = new Set(data.map(row => row.userkey))
  return uniqueUserKeys.size
}

/**
 * Get Total Active Member for entire year
 * Used for Active Member Rate calculation
 */
async function getTotalActiveMemberYear(year: string, line?: string): Promise<number> {
  let query = supabase
    .from('blue_whale_usc')
    .select('userkey')
    .eq('year', year)
    .eq('currency', 'USC')
    .gt('deposit_cases', 0)
  
  if (line && line !== 'ALL') {
    query = query.eq('line', line)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('❌ Error fetching total active members year:', error)
    return 0
  }
  
  const uniqueUserKeys = new Set(data.map(row => row.userkey))
  return uniqueUserKeys.size
}

/**
 * Get New Depositor from new_register table
 */
async function getNewDepositor(filters: USCBPFilters): Promise<number> {
  let query = supabase
    .from('new_register')
    .select('new_depositor')
    .eq('year', filters.year)
    .eq('month', filters.month)
    .eq('currency', 'USC')
  
  if (filters.line && filters.line !== 'ALL') {
    query = query.eq('line', filters.line)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('❌ Error fetching new depositor:', error)
    return 0
  }
  
  const total = data.reduce((sum, row) => sum + (Number(row.new_depositor) || 0), 0)
  return total
}

/**
 * Get aggregated amounts from blue_whale_usc
 */
async function getAggregatedAmounts(filters: USCBPFilters): Promise<{
  depositAmount: number
  withdrawAmount: number
  depositCases: number
  withdrawCases: number
}> {
  let query = supabase
    .from('blue_whale_usc')
    .select('deposit_amount, withdraw_amount, deposit_cases, withdraw_cases')
    .eq('year', filters.year)
    .eq('month', filters.month)
    .eq('currency', 'USC')
  
  if (filters.line && filters.line !== 'ALL') {
    query = query.eq('line', filters.line)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('❌ Error fetching aggregated amounts:', error)
    return { depositAmount: 0, withdrawAmount: 0, depositCases: 0, withdrawCases: 0 }
  }
  
  const aggregated = data.reduce((acc, row) => ({
    depositAmount: acc.depositAmount + (Number(row.deposit_amount) || 0),
    withdrawAmount: acc.withdrawAmount + (Number(row.withdraw_amount) || 0),
    depositCases: acc.depositCases + (Number(row.deposit_cases) || 0),
    withdrawCases: acc.withdrawCases + (Number(row.withdraw_cases) || 0)
  }), { depositAmount: 0, withdrawAmount: 0, depositCases: 0, withdrawCases: 0 })
  
  return aggregated
}

/**
 * Calculate Churn Members
 * Churn = Users active in previous month but NOT active in current month
 */
async function getChurnMembers(filters: USCBPFilters): Promise<{
  churnMembers: number
  lastMonthActiveMember: number
}> {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  
  const currentMonthIndex = monthNames.indexOf(filters.month)
  const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
  const prevMonth = monthNames[prevMonthIndex]
  const prevYear = currentMonthIndex === 0 ? (parseInt(filters.year) - 1).toString() : filters.year
  
  // Get previous month active users
  let prevQuery = supabase
    .from('blue_whale_usc')
    .select('userkey')
    .eq('year', prevYear)
    .eq('month', prevMonth)
    .eq('currency', 'USC')
    .gt('deposit_cases', 0)
  
  if (filters.line && filters.line !== 'ALL') {
    prevQuery = prevQuery.eq('line', filters.line)
  }
  
  const { data: prevData, error: prevError } = await prevQuery
  
  if (prevError) {
    console.error('❌ Error fetching previous month users:', prevError)
    return { churnMembers: 0, lastMonthActiveMember: 0 }
  }
  
  // Get current month active users
  let currentQuery = supabase
    .from('blue_whale_usc')
    .select('userkey')
    .eq('year', filters.year)
    .eq('month', filters.month)
    .eq('currency', 'USC')
    .gt('deposit_cases', 0)
  
  if (filters.line && filters.line !== 'ALL') {
    currentQuery = currentQuery.eq('line', filters.line)
  }
  
  const { data: currentData, error: currentError } = await currentQuery
  
  if (currentError) {
    console.error('❌ Error fetching current month users:', currentError)
    return { churnMembers: 0, lastMonthActiveMember: 0 }
  }
  
  const prevUserKeys = new Set(prevData.map(row => row.userkey))
  const currentUserKeys = new Set(currentData.map(row => row.userkey))
  
  const churnedUsers = Array.from(prevUserKeys).filter(userkey => !currentUserKeys.has(userkey))
  
  return {
    churnMembers: churnedUsers.length,
    lastMonthActiveMember: prevUserKeys.size
  }
}

// ===========================================
// HIGH-LEVEL KPI CALCULATION
// ===========================================

export async function calculateUSCBPKPIs(filters: USCBPFilters): Promise<USCBPKPIData> {
  try {
    console.log('📊 [USC BP Logic] Calculating KPIs for:', filters)
    
    // Parallel fetch for performance
    const [
      activeMember,
      totalActiveMemberYear,
      amounts,
      newDepositor,
      churnData
    ] = await Promise.all([
      getActiveMember(filters),
      getTotalActiveMemberYear(filters.year, filters.line),
      getAggregatedAmounts(filters),
      getNewDepositor(filters),
      getChurnMembers(filters)
    ])
    
    // Calculate derived KPIs
    const grossGamingRevenue = amounts.depositAmount - amounts.withdrawAmount
    
    const activeMemberRate = totalActiveMemberYear > 0 
      ? (activeMember / totalActiveMemberYear) * 100 
      : 0
    
    const retentionRate = churnData.lastMonthActiveMember > 0
      ? ((churnData.lastMonthActiveMember - churnData.churnMembers) / churnData.lastMonthActiveMember) * 100
      : 0
    
    const pureMember = Math.max(activeMember - newDepositor, 0)
    
    const avgTransactionValue = amounts.depositCases > 0
      ? amounts.depositAmount / amounts.depositCases
      : 0
    
    const purchaseFrequency = activeMember > 0
      ? amounts.depositCases / activeMember
      : 0
    
    const result: USCBPKPIData = {
      grossGamingRevenue,
      activeMemberRate,
      retentionRate,
      activeMember,
      pureMember,
      avgTransactionValue,
      purchaseFrequency,
      depositAmount: amounts.depositAmount,
      withdrawAmount: amounts.withdrawAmount,
      depositCases: amounts.depositCases,
      withdrawCases: amounts.withdrawCases,
      newDepositor,
      churnMember: churnData.churnMembers,
      lastMonthActiveMember: churnData.lastMonthActiveMember,
      totalActiveMemberYear
    }
    
    console.log('✅ [USC BP Logic] KPIs calculated:', result)
    return result
    
  } catch (error) {
    console.error('❌ [USC BP Logic] Error:', error)
    throw error
  }
}

// ===========================================
// MoM COMPARISON
// ===========================================

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0
  if (previous === 0 && current > 0) return 100
  if (previous === 0 && current < 0) return -100
  
  const change = ((current - previous) / previous) * 100
  
  if (!isFinite(change) || isNaN(change)) return 0
  
  return Math.min(Math.max(change, -100), 100)
}

function getPreviousMonth(year: string, month: string): { year: string, month: string } {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  
  const currentMonthIndex = monthNames.indexOf(month)
  const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
  const prevMonth = monthNames[prevMonthIndex]
  const prevYear = currentMonthIndex === 0 ? (parseInt(year) - 1).toString() : year
  
  return { year: prevYear, month: prevMonth }
}

export async function getAllUSCBPKPIsWithMoM(filters: USCBPFilters): Promise<{
  current: USCBPKPIData
  mom: USCBPMoMData
}> {
  try {
    // Get current month data
    const currentData = await calculateUSCBPKPIs(filters)
    
    // Get previous month data
    const { year: prevYear, month: prevMonth } = getPreviousMonth(filters.year, filters.month)
    const previousData = await calculateUSCBPKPIs({
      ...filters,
      year: prevYear,
      month: prevMonth
    })
    
    // Calculate MoM
    const mom: USCBPMoMData = {
      grossGamingRevenue: calculatePercentageChange(currentData.grossGamingRevenue, previousData.grossGamingRevenue),
      activeMemberRate: calculatePercentageChange(currentData.activeMemberRate, previousData.activeMemberRate),
      retentionRate: calculatePercentageChange(currentData.retentionRate, previousData.retentionRate),
      activeMember: calculatePercentageChange(currentData.activeMember, previousData.activeMember),
      pureMember: calculatePercentageChange(currentData.pureMember, previousData.pureMember),
      avgTransactionValue: calculatePercentageChange(currentData.avgTransactionValue, previousData.avgTransactionValue),
      purchaseFrequency: calculatePercentageChange(currentData.purchaseFrequency, previousData.purchaseFrequency),
      depositAmount: calculatePercentageChange(currentData.depositAmount, previousData.depositAmount),
      withdrawAmount: calculatePercentageChange(currentData.withdrawAmount, previousData.withdrawAmount)
    }
    
    return { current: currentData, mom }
    
  } catch (error) {
    console.error('❌ [USC BP Logic] Error in getAllUSCBPKPIsWithMoM:', error)
    throw error
  }
}

