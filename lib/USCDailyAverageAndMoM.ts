/**
 * USC Daily Average dan MoM Comparison Logic
 * Menggunakan table blue_whale_usc_monthly_summary (MV)
 * Mengikuti pattern yang sudah ada di USCDailyAverageAndMoM.ts
 */

import { supabase } from '@/lib/supabase'

// USC-specific types - SYNC with blue_whale_usc_monthly_summary MV
export interface USCKPIData {
  activeMember: number
  newDepositor: number
  depositAmount: number
  grossGamingRevenue: number
  netProfit: number
  withdrawAmount: number
  addTransaction: number
  deductTransaction: number
  validBetAmount: number
  pureMember: number
  pureUser: number
  newRegister: number
  churnMember: number
  depositCases: number
  withdrawCases: number
  winrate: number
  churnRate: number
  retentionRate: number
  growthRate: number
  avgTransactionValue: number
  purchaseFrequency: number
  customerLifetimeValue: number
  avgCustomerLifespan: number
  customerMaturityIndex: number
  ggrPerUser: number
  ggrPerPureUser: number
  addBonus: number
  deductBonus: number
  conversionRate: number
  holdPercentage: number
  depositAmountUser: number
  withdrawRate: number
  highValueCustomers: number
  lowValueCustomers: number
  totalCustomers: number
}

export interface USCMoMData {
  activeMember: number
  newDepositor: number
  depositAmount: number
  grossGamingRevenue: number
  netProfit: number
  withdrawAmount: number
  addTransaction: number
  deductTransaction: number
  validBetAmount: number
  pureMember: number
  pureUser: number
  newRegister: number
  churnMember: number
  depositCases: number
  withdrawCases: number
  winrate: number
  churnRate: number
  retentionRate: number
  growthRate: number
  avgTransactionValue: number
  purchaseFrequency: number
  customerLifetimeValue: number
  avgCustomerLifespan: number
  customerMaturityIndex: number
  ggrPerUser: number
  ggrPerPureUser: number
  addBonus: number
  deductBonus: number
  conversionRate: number
  holdPercentage: number
  depositAmountUser: number
  withdrawRate: number
}

// Month name to index mapping
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/**
 * Get month index (0-11) from month name
 */
function getMonthIndex(monthName: string): number {
  return MONTH_NAMES.findIndex(name => 
    name.toLowerCase() === monthName.toLowerCase()
  )
}

/**
 * Get month name from month index (0-11)
 */
function getMonthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex]
}

/**
 * Get previous month and year
 */
function getPreviousMonth(year: string, month: string): { year: string, month: string } {
  const monthIndex = getMonthIndex(month)
  const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1
  const prevMonth = getMonthName(prevMonthIndex)
  const prevYear = monthIndex === 0 ? (parseInt(year) - 1).toString() : year
  return { year: prevYear, month: prevMonth }
}

/**
 * Get total days in a specific month and year
 */
function getDaysInMonth(year: string, month: string): number {
  const monthIndex = getMonthIndex(month)
  if (monthIndex === -1) return 30
  
  const lastDay = new Date(parseInt(year), monthIndex + 1, 0)
  return lastDay.getDate()
}

/**
 * Check if current month is the selected month
 */
function isCurrentMonth(year: string, month: string): boolean {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear().toString()
  const currentMonth = getMonthName(currentDate.getMonth())
  
  return year === currentYear && month === currentMonth
}

/**
 * Get last update date from blue_whale_usc table for USC
 */
async function getUSCLastUpdateDate(year: string, month: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('blue_whale_usc')
      .select('date')
      .eq('year', year)
      .eq('month', month)
      .eq('currency', 'USC')
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('❌ [USC Daily Average] Error getting last update date:', error)
      return getDaysInMonth(year, month)
    }
    
    if (data && data.length > 0 && data[0].date) {
      const lastDate = new Date(String(data[0].date))
      const dayOfMonth = lastDate.getDate()
      return dayOfMonth
    }
    
    return getDaysInMonth(year, month)
    
  } catch (error) {
    console.error('❌ [USC Daily Average] Error getting last update date:', error)
    return getDaysInMonth(year, month)
  }
}

/**
 * Get current month progress (days elapsed so far) for USC
 */
async function getUSCCurrentMonthProgress(year: string, month: string): Promise<number> {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear().toString()
  const currentMonth = getMonthName(currentDate.getMonth())
  
  // Only use database for CURRENT ongoing month
  if (year === currentYear && month === currentMonth) {
    const lastUpdateDay = await getUSCLastUpdateDate(year, month)
    const currentDay = currentDate.getDate()
    const activeDays = Math.min(lastUpdateDay, currentDay)
    return activeDays
  }
  
  // For ALL past months, use total days
  const totalDays = getDaysInMonth(year, month)
  return totalDays
}

/**
 * Calculate daily average for USC KPI
 */
async function calculateUSCDailyAverage(monthlyValue: number, year: string, month: string): Promise<number> {
  const activeDays = await getUSCCurrentMonthProgress(year, month)
  
  if (activeDays === 0 || activeDays < 1) {
    console.warn(`⚠️ [USC Daily Average] Invalid days (${activeDays}) for ${month} ${year}`)
    const fallbackDays = getDaysInMonth(year, month)
    return monthlyValue / fallbackDays
  }
  
  const dailyAverage = monthlyValue / activeDays
  
  return dailyAverage
}

/**
 * Calculate MoM percentage change (same as USCDailyAverageAndMoM.ts)
 */
function calculateUSCMoM(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Get USC KPI data from MV table
 */
async function getUSCKPIData(year: string, month: string, line?: string): Promise<USCKPIData> {
  try {
    const monthIndex = getMonthIndex(month)
    const monthNumber = monthIndex === -1 ? 0 : monthIndex + 1 // Handle 'ALL' month as 0
    
    let query = supabase
      .from('blue_whale_usc_monthly_summary')
      .select('*')
      .eq('currency', 'USC')
      .eq('year', parseInt(year))
      .eq('month', monthNumber)
      .limit(1)

    if (line && line !== 'ALL') {
      query = query.eq('line', line)
    } else {
      query = query.eq('line', 'ALL')
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ [USC KPI] Error fetching KPI data:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️ [USC KPI] No data found for ${month} ${year}, line: ${line}`)
      return getEmptyUSCKPIData()
    }

    const row = data[0]
    
    // Map MV columns to KPI data structure
    const kpiData: USCKPIData = {
      activeMember: (row.active_member as number) || 0,
      newDepositor: (row.new_depositor as number) || 0,
      depositAmount: (row.deposit_amount as number) || 0,
      grossGamingRevenue: (row.ggr as number) || 0,
      netProfit: (row.net_profit as number) || 0,
      withdrawAmount: (row.withdraw_amount as number) || 0,
      addTransaction: (row.add_transaction as number) || 0,
      deductTransaction: (row.deduct_transaction as number) || 0,
      validBetAmount: (row.valid_amount as number) || 0,
      pureMember: (row.pure_member as number) || 0,
      pureUser: (row.pure_user as number) || 0,
      newRegister: (row.new_register as number) || 0,
      churnMember: 0, // Not available in MV
      depositCases: (row.deposit_cases as number) || 0,
      withdrawCases: (row.withdraw_cases as number) || 0,
      winrate: (row.winrate as number) || 0,
      churnRate: 0, // Not available in MV
      retentionRate: 0, // Not available in MV
      growthRate: 0, // Not available in MV
      avgTransactionValue: (row.atv as number) || 0,
      purchaseFrequency: (row.purchase_frequency as number) || 0,
      customerLifetimeValue: 0, // Not available in MV
      avgCustomerLifespan: 0, // Not available in MV
      customerMaturityIndex: 0, // Not available in MV
      ggrPerUser: (row.ggr_user as number) || 0,
      ggrPerPureUser: 0, // Not available in MV
      addBonus: (row.add_bonus as number) || 0,
      deductBonus: (row.deduct_bonus as number) || 0,
      conversionRate: (row.conversion_rate as number) || 0,
      holdPercentage: (row.hold_percentage as number) || 0,
      depositAmountUser: (row.da_user as number) || 0,
      withdrawRate: (row.withdrawal_rate as number) || 0,
      highValueCustomers: 0, // Not available in MV
      lowValueCustomers: 0, // Not available in MV
      totalCustomers: 0 // Not available in MV
    }

    return kpiData

  } catch (error) {
    console.error('❌ [USC KPI] Error getting KPI data:', error)
    return getEmptyUSCKPIData()
  }
}

/**
 * Get empty USC KPI data structure
 */
function getEmptyUSCKPIData(): USCKPIData {
  return {
    activeMember: 0,
    newDepositor: 0,
    depositAmount: 0,
    grossGamingRevenue: 0,
    netProfit: 0,
    withdrawAmount: 0,
    addTransaction: 0,
    deductTransaction: 0,
    validBetAmount: 0,
    pureMember: 0,
    pureUser: 0,
    newRegister: 0,
    churnMember: 0,
    depositCases: 0,
    withdrawCases: 0,
    winrate: 0,
    churnRate: 0,
    retentionRate: 0,
    growthRate: 0,
    avgTransactionValue: 0,
    purchaseFrequency: 0,
    customerLifetimeValue: 0,
    avgCustomerLifespan: 0,
    customerMaturityIndex: 0,
    ggrPerUser: 0,
    ggrPerPureUser: 0,
    addBonus: 0,
    deductBonus: 0,
    conversionRate: 0,
    holdPercentage: 0,
    depositAmountUser: 0,
    withdrawRate: 0,
    highValueCustomers: 0,
    lowValueCustomers: 0,
    totalCustomers: 0
  }
}

/**
 * Calculate Daily Average for ALL USC KPIs
 */
export async function calculateAllUSCDailyAverages(
  monthlyData: USCKPIData,
  year: string,
  month: string
): Promise<USCKPIData> {
  try {
    const dailyAverages: USCKPIData = {
      activeMember: await calculateUSCDailyAverage(monthlyData.activeMember, year, month),
      depositAmount: await calculateUSCDailyAverage(monthlyData.depositAmount, year, month),
      withdrawAmount: await calculateUSCDailyAverage(monthlyData.withdrawAmount, year, month),
      netProfit: await calculateUSCDailyAverage(monthlyData.netProfit, year, month),
      purchaseFrequency: await calculateUSCDailyAverage(monthlyData.purchaseFrequency, year, month),
      avgTransactionValue: await calculateUSCDailyAverage(monthlyData.avgTransactionValue, year, month),
      pureMember: await calculateUSCDailyAverage(monthlyData.pureMember, year, month),
      newRegister: await calculateUSCDailyAverage(monthlyData.newRegister, year, month),
      newDepositor: await calculateUSCDailyAverage(monthlyData.newDepositor, year, month),
      depositCases: await calculateUSCDailyAverage(monthlyData.depositCases, year, month),
      withdrawCases: await calculateUSCDailyAverage(monthlyData.withdrawCases, year, month),
      grossGamingRevenue: await calculateUSCDailyAverage(monthlyData.grossGamingRevenue, year, month),
      winrate: await calculateUSCDailyAverage(monthlyData.winrate, year, month),
      withdrawRate: await calculateUSCDailyAverage(monthlyData.withdrawRate, year, month),
      depositAmountUser: await calculateUSCDailyAverage(monthlyData.depositAmountUser, year, month),
      ggrPerUser: await calculateUSCDailyAverage(monthlyData.ggrPerUser, year, month),
      addBonus: await calculateUSCDailyAverage(monthlyData.addBonus, year, month),
      deductBonus: await calculateUSCDailyAverage(monthlyData.deductBonus, year, month),
      addTransaction: await calculateUSCDailyAverage(monthlyData.addTransaction, year, month),
      deductTransaction: await calculateUSCDailyAverage(monthlyData.deductTransaction, year, month),
      validBetAmount: await calculateUSCDailyAverage(monthlyData.validBetAmount, year, month),
      churnMember: await calculateUSCDailyAverage(monthlyData.churnMember, year, month),
      churnRate: await calculateUSCDailyAverage(monthlyData.churnRate, year, month),
      retentionRate: await calculateUSCDailyAverage(monthlyData.retentionRate, year, month),
      growthRate: await calculateUSCDailyAverage(monthlyData.growthRate, year, month),
      pureUser: await calculateUSCDailyAverage(monthlyData.pureUser, year, month),
      holdPercentage: await calculateUSCDailyAverage(monthlyData.holdPercentage, year, month),
      conversionRate: await calculateUSCDailyAverage(monthlyData.conversionRate, year, month),
      customerLifetimeValue: await calculateUSCDailyAverage(monthlyData.customerLifetimeValue, year, month),
      avgCustomerLifespan: await calculateUSCDailyAverage(monthlyData.avgCustomerLifespan, year, month),
      customerMaturityIndex: await calculateUSCDailyAverage(monthlyData.customerMaturityIndex, year, month),
      ggrPerPureUser: await calculateUSCDailyAverage(monthlyData.ggrPerPureUser, year, month),
      highValueCustomers: 0,
      lowValueCustomers: 0,
      totalCustomers: 0
    }
    
    return dailyAverages
    
  } catch (error) {
    console.error('❌ [USC Daily Average] Error calculating all USC KPIs:', error)
    return getEmptyUSCKPIData()
  }
}

/**
 * Get ALL USC KPIs with MoM Comparison (same pattern as USCDailyAverageAndMoM.ts)
 */
export async function getAllUSCKPIsWithMoM(
  year: string,
  month: string,
  line?: string
): Promise<{ current: USCKPIData, mom: USCMoMData, dailyAverage: USCKPIData }> {
  try {
    // Get current month data
    const currentData = await getUSCKPIData(year, month, line)
    
    // Get previous month data
    const { year: prevYear, month: prevMonth } = getPreviousMonth(year, month)
    const previousData = await getUSCKPIData(prevYear, prevMonth, line)
    
    // Calculate MoM using same formula as USCDailyAverageAndMoM.ts
    const mom: USCMoMData = {
      activeMember: calculateUSCMoM(currentData.activeMember, previousData.activeMember),
      depositAmount: calculateUSCMoM(currentData.depositAmount, previousData.depositAmount),
      withdrawAmount: calculateUSCMoM(currentData.withdrawAmount, previousData.withdrawAmount),
      netProfit: calculateUSCMoM(currentData.netProfit, previousData.netProfit),
      purchaseFrequency: calculateUSCMoM(currentData.purchaseFrequency, previousData.purchaseFrequency),
      avgTransactionValue: calculateUSCMoM(currentData.avgTransactionValue, previousData.avgTransactionValue),
      pureMember: calculateUSCMoM(currentData.pureMember, previousData.pureMember),
      newRegister: calculateUSCMoM(currentData.newRegister, previousData.newRegister),
      newDepositor: calculateUSCMoM(currentData.newDepositor, previousData.newDepositor),
      depositCases: calculateUSCMoM(currentData.depositCases, previousData.depositCases),
      withdrawCases: calculateUSCMoM(currentData.withdrawCases, previousData.withdrawCases),
      grossGamingRevenue: calculateUSCMoM(currentData.grossGamingRevenue, previousData.grossGamingRevenue),
      winrate: calculateUSCMoM(currentData.winrate, previousData.winrate),
      withdrawRate: calculateUSCMoM(currentData.withdrawRate, previousData.withdrawRate),
      depositAmountUser: calculateUSCMoM(currentData.depositAmountUser, previousData.depositAmountUser),
      ggrPerUser: calculateUSCMoM(currentData.ggrPerUser, previousData.ggrPerUser),
      addBonus: calculateUSCMoM(currentData.addBonus, previousData.addBonus),
      deductBonus: calculateUSCMoM(currentData.deductBonus, previousData.deductBonus),
      addTransaction: calculateUSCMoM(currentData.addTransaction, previousData.addTransaction),
      deductTransaction: calculateUSCMoM(currentData.deductTransaction, previousData.deductTransaction),
      validBetAmount: calculateUSCMoM(currentData.validBetAmount, previousData.validBetAmount),
      churnMember: calculateUSCMoM(currentData.churnMember, previousData.churnMember),
      churnRate: calculateUSCMoM(currentData.churnRate, previousData.churnRate),
      retentionRate: calculateUSCMoM(currentData.retentionRate, previousData.retentionRate),
      growthRate: calculateUSCMoM(currentData.growthRate, previousData.growthRate),
      pureUser: calculateUSCMoM(currentData.pureUser, previousData.pureUser),
      holdPercentage: calculateUSCMoM(currentData.holdPercentage, previousData.holdPercentage),
      conversionRate: calculateUSCMoM(currentData.conversionRate, previousData.conversionRate),
      customerLifetimeValue: calculateUSCMoM(currentData.customerLifetimeValue, previousData.customerLifetimeValue),
      avgCustomerLifespan: calculateUSCMoM(currentData.avgCustomerLifespan, previousData.avgCustomerLifespan),
      customerMaturityIndex: calculateUSCMoM(currentData.customerMaturityIndex, previousData.customerMaturityIndex),
      ggrPerPureUser: calculateUSCMoM(currentData.ggrPerPureUser, previousData.ggrPerPureUser)
    }
    
    // Calculate daily averages
    const dailyAverage = await calculateAllUSCDailyAverages(currentData, year, month)
    
    return { current: currentData, mom, dailyAverage }
    
  } catch (error) {
    console.error('❌ [USC MoM] Error calculating USC KPIs with MoM:', error)
    
    return {
      current: getEmptyUSCKPIData(),
      mom: getEmptyUSCKPIData(),
      dailyAverage: getEmptyUSCKPIData()
    }
  }
}

/**
 * Format MoM value (same as USCDailyAverageAndMoM.ts)
 */
export function formatUSCMoMValue(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? `+${num.toFixed(1)}%` : `${num.toFixed(1)}%`
}

/**
 * Get comparison color (same as USCDailyAverageAndMoM.ts)
 */
export function getUSCComparisonColor(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? '#059669' : num < 0 ? '#dc2626' : '#6b7280'
}

/**
 * Format daily average value
 */
export function formatUSCDailyAverageValue(
  value: number,
  type: 'currency' | 'count' | 'percentage' = 'count'
): string {
  try {
    switch (type) {
      case 'currency':
        return `USC ${new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value)}`
        
      case 'percentage':
        return `${value.toFixed(2)}%`
        
      case 'count':
      default:
        return new Intl.NumberFormat('en-US').format(Math.round(value))
    }
  } catch (error) {
    console.error('❌ [USC Daily Average] Error formatting value:', error)
    return '0'
  }
}
