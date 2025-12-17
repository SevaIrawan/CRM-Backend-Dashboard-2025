import { supabase } from './supabase'

// ===========================================
// TYPES & INTERFACES
// ===========================================

export interface USCBPFilters {
  // Support both year/month and date range
  year?: string
  month?: string
  startDate?: string  // Date range format: yyyy-mm-dd
  endDate?: string    // Date range format: yyyy-mm-dd
  line?: string
  squadLead?: string
  channel?: string
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
  daysActive: number
  newDepositor: number
  newRegister: number
  churnMember: number
  lastMonthActiveMember: number
  totalActiveMemberYear: number
  
  // User metrics
  depositAmountPerUser: number  // DA User = Deposit Amount / Active Member
  ggrPerUser: number            // GGR User = GGR / Active Member
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
// HELPER FUNCTIONS
// ===========================================

/**
 * Build base query with filters (supports both date range and year/month)
 */
function buildBaseQuery(table: string, filters: USCBPFilters, selectFields: string = '*') {
  let query = supabase.from(table).select(selectFields).eq('currency', 'USC')
  
  // Support date range (preferred) or year/month
  if (filters.startDate && filters.endDate) {
    query = query.gte('date', filters.startDate).lte('date', filters.endDate)
  } else if (filters.year) {
    query = query.eq('year', filters.year)
    if (filters.month && filters.month !== 'ALL') {
      query = query.eq('month', filters.month)
    }
  }
  
  // Apply filters
  if (filters.line && filters.line !== 'ALL') {
    query = query.eq('line', filters.line)
  }
  if (filters.squadLead && filters.squadLead !== 'All' && filters.squadLead !== 'ALL') {
    query = query.eq('squad_lead', filters.squadLead)
  }
  if (filters.channel && filters.channel !== 'All' && filters.channel !== 'ALL') {
    query = query.eq('traffic', filters.channel)
  }
  
  return query
}

/**
 * Extract year/month from date string for period comparison
 */
function extractYearMonthFromDate(dateStr: string): { year: number; month: number } | null {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    return { year: date.getFullYear(), month: date.getMonth() + 1 }
  } catch {
    return null
  }
}

// ===========================================
// CORE CALCULATION FUNCTIONS
// ===========================================

/**
 * Get Active Member for specific period
 * Active Member = COUNT DISTINCT userkey WHERE deposit_cases > 0
 */
async function getActiveMember(filters: USCBPFilters): Promise<number> {
  let query = buildBaseQuery('blue_whale_usc', filters, 'userkey')
  query = query.gt('deposit_cases', 0)
  
  const { data, error } = await query
  
  if (error) {
    console.error('❌ Error fetching active members:', error)
    return 0
  }
  
  if (!data || !Array.isArray(data)) {
    return 0
  }
  
  const uniqueUserKeys = new Set(data.map((row: any) => row.userkey).filter(Boolean))
  return uniqueUserKeys.size
}

/**
 * Get Total Active Member for entire year
 * Used for Active Member Rate calculation
 * Note: For date range, this uses the year from startDate
 */
async function getTotalActiveMemberYear(filters: USCBPFilters): Promise<number> {
  let query = supabase
    .from('blue_whale_usc')
    .select('userkey')
    .eq('currency', 'USC')
    .gt('deposit_cases', 0)
  
  // Get year from startDate if date range, otherwise use filters.year
  if (filters.startDate) {
    const yearMonth = extractYearMonthFromDate(filters.startDate)
    if (yearMonth) {
      query = query.eq('year', yearMonth.year)
    }
  } else if (filters.year) {
    query = query.eq('year', filters.year)
  }
  
  if (filters.line && filters.line !== 'ALL') {
    query = query.eq('line', filters.line)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('❌ Error fetching total active members year:', error)
    return 0
  }
  
  if (!data || !Array.isArray(data)) {
    return 0
  }
  
  const uniqueUserKeys = new Set(data.map((row: any) => row.userkey).filter(Boolean))
  return uniqueUserKeys.size
}

/**
 * Get First Deposit Date for a userkey
 * First Deposit Date = check first_deposit_date, if null then use min(date) where deposit_cases > 0
 */
async function getFirstDepositDate(userkey: string, filters: USCBPFilters): Promise<string | null> {
  let query = buildBaseQuery('blue_whale_usc', filters, 'first_deposit_date, date, deposit_cases')
  query = query.eq('userkey', userkey).gt('deposit_cases', 0).order('date', { ascending: true }).limit(1)
  
  const { data, error } = await query
  
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return null
  }
  
  const firstRecord = data[0] as any
  // Check first_deposit_date first, if null use min(date)
  return firstRecord?.first_deposit_date || firstRecord?.date || null
}

/**
 * Get New Depositor count
 * New Depositor = check First Deposit Date, if FDD month = slicer date range month then New Depositor
 */
async function getNewDepositor(filters: USCBPFilters): Promise<number> {
  // Get all active members first
  let query = buildBaseQuery('blue_whale_usc', filters, 'userkey, first_deposit_date, date, deposit_cases')
  query = query.gt('deposit_cases', 0)
  
  const { data, error } = await query
  
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return 0
  }
  
  // Get period month from startDate or month filter
  let periodMonth: number | null = null
  let periodYear: number | null = null
  
  if (filters.startDate) {
    const yearMonth = extractYearMonthFromDate(filters.startDate)
    if (yearMonth) {
      periodYear = yearMonth.year
      periodMonth = yearMonth.month
    }
  } else if (filters.year && filters.month && filters.month !== 'ALL') {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    periodMonth = monthNames.indexOf(filters.month) + 1
    periodYear = parseInt(filters.year)
  }
  
  if (!periodMonth || !periodYear) {
    return 0
  }
  
  // Group by userkey and get first deposit date
  const userkeyMap = new Map<string, { first_deposit_date: string | null; minDate: string }>()
  
  data.forEach((row: any) => {
    if (!row.userkey) return
    
    if (!userkeyMap.has(row.userkey)) {
      userkeyMap.set(row.userkey, {
        first_deposit_date: row.first_deposit_date || null,
        minDate: row.date || ''
      })
    } else {
      const existing = userkeyMap.get(row.userkey)!
      // Update minDate if this date is earlier
      if (row.date && (!existing.minDate || row.date < existing.minDate)) {
        existing.minDate = row.date
      }
      // Use first_deposit_date if available
      if (row.first_deposit_date && !existing.first_deposit_date) {
        existing.first_deposit_date = row.first_deposit_date
      }
    }
  })
  
  // Count users where FDD month = period month
  let newDepositorCount = 0
  userkeyMap.forEach((value, userkey) => {
    const fdd = value.first_deposit_date || value.minDate
    if (!fdd) return
    
    const fddDate = new Date(fdd)
    if (isNaN(fddDate.getTime())) return
    
    if (fddDate.getFullYear() === periodYear && (fddDate.getMonth() + 1) === periodMonth) {
      newDepositorCount++
    }
  })
  
  return newDepositorCount
}

/**
 * Get New Register count
 * New Register = check register_date, if register_date month = slicer date range month then New Register
 */
async function getNewRegister(filters: USCBPFilters): Promise<number> {
  let query = buildBaseQuery('blue_whale_usc', filters, 'userkey, register_date')
  query = query.not('register_date', 'is', null)
  
  const { data, error } = await query
  
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return 0
  }
  
  // Get period month from startDate or month filter
  let periodMonth: number | null = null
  let periodYear: number | null = null
  
  if (filters.startDate) {
    const yearMonth = extractYearMonthFromDate(filters.startDate)
    if (yearMonth) {
      periodYear = yearMonth.year
      periodMonth = yearMonth.month
    }
  } else if (filters.year && filters.month && filters.month !== 'ALL') {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    periodMonth = monthNames.indexOf(filters.month) + 1
    periodYear = parseInt(filters.year)
  }
  
  if (!periodMonth || !periodYear) {
    return 0
  }
  
  // Count distinct userkeys where register_date month = period month
  const matchingUserKeys = new Set<string>()
  
  data.forEach((row: any) => {
    if (!row.register_date || !row.userkey) return
    
    const regDate = new Date(row.register_date)
    if (isNaN(regDate.getTime())) return
    
    if (regDate.getFullYear() === periodYear && (regDate.getMonth() + 1) === periodMonth) {
      matchingUserKeys.add(row.userkey)
    }
  })
  
  return matchingUserKeys.size
}

/**
 * Get aggregated amounts from blue_whale_usc
 * ✅ FIX: Use batch fetching to get ALL rows (not just first 1000)
 * For deposit_amount and withdraw_amount: count ALL spending based on tier and period
 */
async function getAggregatedAmounts(filters: USCBPFilters): Promise<{
  depositAmount: number
  withdrawAmount: number
  depositCases: number
  withdrawCases: number
}> {
  // Batch fetch for large datasets (same pattern as tier-metrics API)
  const BATCH_SIZE = 10000
  let allData: any[] = []
  let offset = 0
  let hasMore = true
  
  console.log('📊 [USC BP Logic] Fetching aggregated amounts with batch fetching')
  
  while (hasMore) {
    // Rebuild query for each batch to ensure all filters are preserved
    let batchQuery = buildBaseQuery('blue_whale_usc', filters, 'deposit_amount, withdraw_amount, deposit_cases, withdraw_cases')
    batchQuery = batchQuery.order('date', { ascending: true }).order('userkey', { ascending: true })
    batchQuery = batchQuery.range(offset, offset + BATCH_SIZE - 1)
    
    const { data, error } = await batchQuery
    
    if (error) {
      console.error('❌ [USC BP Logic] Error fetching aggregated amounts batch at offset', offset, ':', error)
      break
    }
    
    if (!data || data.length === 0) {
      hasMore = false
    } else {
      allData.push(...data)
      hasMore = data.length === BATCH_SIZE
      offset += BATCH_SIZE
      
      if (offset === BATCH_SIZE) {
        console.log(`📊 [USC BP Logic] First batch fetched: ${data.length} records`)
      }
    }
    
    // ✅ NO LIMIT - Fetch ALL data
  }
  
  console.log(`📊 [USC BP Logic] Total records fetched for aggregation: ${allData.length}`)
  
  if (allData.length === 0) {
    return { depositAmount: 0, withdrawAmount: 0, depositCases: 0, withdrawCases: 0 }
  }
  
  // ✅ Aggregate ALL rows: SUM all deposit_amount, withdraw_amount, deposit_cases, withdraw_cases
  // No filter needed - count ALL spending based on tier and period
  // ✅ FIX: Ensure proper number conversion for withdraw_amount (same as deposit_amount)
  let depositCount = 0
  let withdrawCount = 0
  let depositNullCount = 0
  let withdrawNullCount = 0
  
  const aggregated = allData.reduce((acc: any, row: any) => {
    // Convert to number, handle null/undefined/empty string
    const depositAmt = row.deposit_amount != null ? Number(row.deposit_amount) : 0
    const withdrawAmt = row.withdraw_amount != null ? Number(row.withdraw_amount) : 0
    const depositCases = row.deposit_cases != null ? Number(row.deposit_cases) : 0
    const withdrawCases = row.withdraw_cases != null ? Number(row.withdraw_cases) : 0
    
    // Debug counters
    if (depositAmt > 0) depositCount++
    if (withdrawAmt > 0) withdrawCount++
    if (row.deposit_amount == null) depositNullCount++
    if (row.withdraw_amount == null) withdrawNullCount++
    
    // Handle NaN cases
    const finalDepositAmt = isNaN(depositAmt) ? 0 : depositAmt
    const finalWithdrawAmt = isNaN(withdrawAmt) ? 0 : withdrawAmt
    const finalDepositCases = isNaN(depositCases) ? 0 : depositCases
    const finalWithdrawCases = isNaN(withdrawCases) ? 0 : withdrawCases
    
    return {
      depositAmount: acc.depositAmount + finalDepositAmt,
      withdrawAmount: acc.withdrawAmount + finalWithdrawAmt,
      depositCases: acc.depositCases + finalDepositCases,
      withdrawCases: acc.withdrawCases + finalWithdrawCases
    }
  }, { depositAmount: 0, withdrawAmount: 0, depositCases: 0, withdrawCases: 0 })
  
  console.log('✅ [USC BP Logic] Aggregated amounts:', {
    depositAmount: aggregated.depositAmount,
    withdrawAmount: aggregated.withdrawAmount,
    depositCases: aggregated.depositCases,
    withdrawCases: aggregated.withdrawCases,
    calculatedGGR: aggregated.depositAmount - aggregated.withdrawAmount,
    debug: {
      totalRows: allData.length,
      rowsWithDeposit: depositCount,
      rowsWithWithdraw: withdrawCount,
      depositNullCount,
      withdrawNullCount
    }
  })
  
  return aggregated
}

/**
 * Get Days Active
 * Days Active = COUNT(DISTINCT date) per userkey where deposit_cases > 0
 * Returns total days active across all users (sum of distinct dates per user)
 */
async function getDaysActive(filters: USCBPFilters): Promise<number> {
  let query = buildBaseQuery('blue_whale_usc', filters, 'userkey, date, deposit_cases')
  query = query.gt('deposit_cases', 0)
  
  const { data, error } = await query
  
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return 0
  }
  
  // Group by userkey and count distinct dates per user
  const userkeyDates = new Map<string, Set<string>>()
  
  data.forEach((row: any) => {
    if (!row.userkey || !row.date) return
    
    if (!userkeyDates.has(row.userkey)) {
      userkeyDates.set(row.userkey, new Set())
    }
    userkeyDates.get(row.userkey)!.add(row.date)
  })
  
  // Sum all distinct dates across all users
  let totalDaysActive = 0
  userkeyDates.forEach((dates) => {
    totalDaysActive += dates.size
  })
  
  return totalDaysActive
}

/**
 * Calculate Churn Members
 * Churn = Users active in previous period but NOT active in current period
 * For date range: calculates churn based on previous period with same duration
 */
async function getChurnMembers(filters: USCBPFilters): Promise<{
  churnMembers: number
  lastMonthActiveMember: number
}> {
  // Calculate previous period dates
  let prevStartDate: string | null = null
  let prevEndDate: string | null = null
  
  if (filters.startDate && filters.endDate) {
    // For date range: calculate previous period with same duration
    const startDate = new Date(filters.startDate)
    const endDate = new Date(filters.endDate)
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Calculate previous period (same duration before startDate)
    const prevEnd = new Date(startDate)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - durationDays)
    
    prevStartDate = prevStart.toISOString().split('T')[0]
    prevEndDate = prevEnd.toISOString().split('T')[0]
  } else if (filters.year && filters.month && filters.month !== 'ALL') {
    // For year/month: calculate previous month
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    
    const currentMonthIndex = monthNames.indexOf(filters.month)
    const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
    const prevMonth = monthNames[prevMonthIndex]
    const prevYear = currentMonthIndex === 0 ? (parseInt(filters.year) - 1).toString() : filters.year
    
    // Build previous period filters
    const prevFilters: USCBPFilters = {
      ...filters,
      year: prevYear,
      month: prevMonth
    }
    
    // Get previous period active users
    const prevActiveMember = await getActiveMember(prevFilters)
    
    // Get current period active users
    const currentActiveMember = await getActiveMember(filters)
    
    // For churn calculation, we need to know who was active in prev but not in current
    // This requires comparing userkeys, which is complex. For now, return simplified calculation
    return {
      churnMembers: Math.max(prevActiveMember - currentActiveMember, 0),
      lastMonthActiveMember: prevActiveMember
    }
  } else {
    // Cannot calculate churn without proper period definition
    return { churnMembers: 0, lastMonthActiveMember: 0 }
  }
  
  // Build previous period filters for date range
  const prevFilters: USCBPFilters = {
    ...filters,
    startDate: prevStartDate!,
    endDate: prevEndDate!,
    year: undefined,
    month: undefined
  }
  
  // Get previous period active users
  const prevUserKeys = await getActiveMember(prevFilters)
  
  // Get current period active users  
  const currentUserKeys = await getActiveMember(filters)
  
  // Simplified churn: difference between prev and current
  // Note: True churn calculation requires userkey comparison which is expensive
  return {
    churnMembers: Math.max(prevUserKeys - currentUserKeys, 0),
    lastMonthActiveMember: prevUserKeys
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
      daysActive,
      newDepositor,
      newRegister,
      churnData
    ] = await Promise.all([
      getActiveMember(filters),
      getTotalActiveMemberYear(filters),
      getAggregatedAmounts(filters),
      getDaysActive(filters),
      getNewDepositor(filters),
      getNewRegister(filters),
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
    
    // ✅ ATV = deposit_amount / deposit_cases (AFTER aggregation)
    const avgTransactionValue = amounts.depositCases > 0
      ? amounts.depositAmount / amounts.depositCases
      : 0
    
    // ✅ PF = deposit_cases / days_active (NOT deposit_cases / active_member)
    const purchaseFrequency = daysActive > 0
      ? amounts.depositCases / daysActive
      : 0
    
    // ✅ DA User = Deposit Amount / Active Member
    const depositAmountPerUser = activeMember > 0
      ? amounts.depositAmount / activeMember
      : 0
    
    // ✅ GGR User = GGR / Active Member
    const ggrPerUser = activeMember > 0
      ? grossGamingRevenue / activeMember
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
      daysActive,
      newDepositor,
      newRegister,
      churnMember: churnData.churnMembers,
      lastMonthActiveMember: churnData.lastMonthActiveMember,
      totalActiveMemberYear,
      depositAmountPerUser,
      ggrPerUser
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

/**
 * Calculate previous period dates based on current period
 */
function calculatePreviousPeriod(filters: USCBPFilters): USCBPFilters {
  if (filters.startDate && filters.endDate) {
    // For date range: calculate previous period with same duration
    const startDate = new Date(filters.startDate)
    const endDate = new Date(filters.endDate)
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Calculate previous period (same duration before startDate)
    const prevEnd = new Date(startDate)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - durationDays)
    
    return {
      ...filters,
      startDate: prevStart.toISOString().split('T')[0],
      endDate: prevEnd.toISOString().split('T')[0],
      year: undefined,
      month: undefined
    }
  } else if (filters.year && filters.month) {
    // For year/month format
    if (filters.month === 'ALL') {
      // Compare with previous year
      return {
        ...filters,
        year: (parseInt(filters.year) - 1).toString(),
        month: 'ALL'
      }
    } else {
      // Compare with previous month
      const { year: prevYear, month: prevMonth } = getPreviousMonth(filters.year, filters.month)
      return {
        ...filters,
        year: prevYear,
        month: prevMonth
      }
    }
  }
  
  // Fallback: return same filters (no comparison possible)
  return filters
}

export async function getAllUSCBPKPIsWithMoM(filters: USCBPFilters): Promise<{
  current: USCBPKPIData
  mom: USCBPMoMData
}> {
  try {
    // Get current period data
    const currentData = await calculateUSCBPKPIs(filters)
    
    // Calculate previous period filters
    const previousFilters = calculatePreviousPeriod(filters)
    
    // Get previous period data
    const previousData = await calculateUSCBPKPIs(previousFilters)
    
    // Calculate MoM (Month-over-Month) or Period-over-Period comparison
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

