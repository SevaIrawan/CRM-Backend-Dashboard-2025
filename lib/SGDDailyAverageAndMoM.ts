/**
 * SGD Daily Average dan MoM Comparison Logic
 * Menggunakan table blue_whale_sgd_monthly_summary (MV)
 * Mengikuti pattern yang sudah ada di USCDailyAverageAndMoM.ts
 */

import { supabase } from '@/lib/supabase'

// SGD-specific types - SYNC with blue_whale_sgd_monthly_summary MV
export interface SGDKPIData {
  activeMember: number
  depositAmount: number
  withdrawAmount: number
  netProfit: number
  purchaseFrequency: number
  avgTransactionValue: number
  pureMember: number
  newRegister: number
  newDepositor: number
  depositCases: number
  withdrawCases: number
  grossGamingRevenue: number
  winrate: number
  withdrawalRate: number
  depositAmountUser: number
  ggrPerUser: number
  addBonus: number
  deductBonus: number
  addTransaction: number
  deductTransaction: number
  betsAmount: number
  validAmount: number
  casesBets: number
  casesAdjustment: number
  bonus: number
  pureUser: number
  holdPercentage: number
  conversionRate: number
}

export interface SGDMoMData {
  activeMember: number
  depositAmount: number
  withdrawAmount: number
  netProfit: number
  purchaseFrequency: number
  avgTransactionValue: number
  pureMember: number
  newRegister: number
  newDepositor: number
  depositCases: number
  withdrawCases: number
  grossGamingRevenue: number
  winrate: number
  withdrawalRate: number
  depositAmountUser: number
  ggrPerUser: number
  addBonus: number
  deductBonus: number
  addTransaction: number
  deductTransaction: number
  betsAmount: number
  validAmount: number
  casesBets: number
  casesAdjustment: number
  bonus: number
  pureUser: number
  holdPercentage: number
  conversionRate: number
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
 * Get last update date from blue_whale_sgd table for SGD
 */
async function getSGDLastUpdateDate(year: string, month: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('blue_whale_sgd')
      .select('date')
      .eq('year', year)
      .eq('month', month)
      .eq('currency', 'SGD')
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('❌ [SGD Daily Average] Error getting last update date:', error)
      return getDaysInMonth(year, month)
    }
    
    if (data && data.length > 0 && data[0].date) {
      const lastDate = new Date(String(data[0].date))
      const dayOfMonth = lastDate.getDate()
      return dayOfMonth
    }
    
    return getDaysInMonth(year, month)
    
  } catch (error) {
    console.error('❌ [SGD Daily Average] Error getting last update date:', error)
    return getDaysInMonth(year, month)
  }
}

/**
 * Get current month progress (days elapsed so far) for SGD
 */
async function getSGDCurrentMonthProgress(year: string, month: string): Promise<number> {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear().toString()
  const currentMonth = getMonthName(currentDate.getMonth())
  
  // Only use database for CURRENT ongoing month
  if (year === currentYear && month === currentMonth) {
    const lastUpdateDay = await getSGDLastUpdateDate(year, month)
    const currentDay = currentDate.getDate()
    const activeDays = Math.min(lastUpdateDay, currentDay)
    return activeDays
  }
  
  // For ALL past months, use total days
  const totalDays = getDaysInMonth(year, month)
  return totalDays
}

/**
 * Calculate daily average for SGD KPI
 */
async function calculateSGDDailyAverage(monthlyValue: number, year: string, month: string): Promise<number> {
  const activeDays = await getSGDCurrentMonthProgress(year, month)
  
  if (activeDays === 0 || activeDays < 1) {
    console.warn(`⚠️ [SGD Daily Average] Invalid days (${activeDays}) for ${month} ${year}`)
    const fallbackDays = getDaysInMonth(year, month)
    return monthlyValue / fallbackDays
  }
  
  const dailyAverage = monthlyValue / activeDays
  
  return dailyAverage
}

/**
 * Calculate MoM percentage change (same as USCDailyAverageAndMoM.ts)
 */
function calculateSGDMoM(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Get SGD KPI data from MV table
 */
async function getSGDKPIData(year: string, month: string, line?: string): Promise<SGDKPIData> {
  try {
    const monthIndex = getMonthIndex(month)
    const monthNumber = monthIndex === -1 ? 0 : monthIndex + 1 // Handle 'ALL' month as 0
    
    let query = supabase
      .from('blue_whale_sgd_monthly_summary')
      .select('*')
      .eq('currency', 'SGD')
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
      console.error('❌ [SGD KPI] Error fetching KPI data:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️ [SGD KPI] No data found for ${month} ${year}, line: ${line}`)
      return getEmptySGDKPIData()
    }

    const row = data[0]
    
    // Map MV columns to KPI data structure
    const kpiData: SGDKPIData = {
      activeMember: (row.active_member as number) || 0,
      depositAmount: (row.deposit_amount as number) || 0,
      withdrawAmount: (row.withdraw_amount as number) || 0,
      netProfit: (row.net_profit as number) || 0,
      purchaseFrequency: (row.purchase_frequency as number) || 0,
      avgTransactionValue: (row.atv as number) || 0,
      pureMember: (row.pure_member as number) || 0,
      newRegister: (row.new_register as number) || 0,
      newDepositor: (row.new_depositor as number) || 0,
      depositCases: (row.deposit_cases as number) || 0,
      withdrawCases: (row.withdraw_cases as number) || 0,
      grossGamingRevenue: (row.ggr as number) || 0,
      winrate: (row.winrate as number) || 0,
      withdrawalRate: (row.withdrawal_rate as number) || 0,
      depositAmountUser: (row.da_user as number) || 0,
      ggrPerUser: (row.ggr_user as number) || 0,
      addBonus: (row.add_bonus as number) || 0,
      deductBonus: (row.deduct_bonus as number) || 0,
      addTransaction: (row.add_transaction as number) || 0,
      deductTransaction: (row.deduct_transaction as number) || 0,
      betsAmount: (row.bets_amount as number) || 0,
      validAmount: (row.valid_amount as number) || 0,
      casesBets: (row.cases_bets as number) || 0,
      casesAdjustment: (row.cases_adjustment as number) || 0,
      bonus: (row.bonus as number) || 0,
      pureUser: (row.pure_user as number) || 0,
      holdPercentage: (row.hold_percentage as number) || 0,
      conversionRate: (row.conversion_rate as number) || 0
    }

    return kpiData

  } catch (error) {
    console.error('❌ [SGD KPI] Error getting KPI data:', error)
    return getEmptySGDKPIData()
  }
}

/**
 * Get empty SGD KPI data structure
 */
function getEmptySGDKPIData(): SGDKPIData {
  return {
    activeMember: 0,
    depositAmount: 0,
    withdrawAmount: 0,
    netProfit: 0,
    purchaseFrequency: 0,
    avgTransactionValue: 0,
    pureMember: 0,
    newRegister: 0,
    newDepositor: 0,
    depositCases: 0,
    withdrawCases: 0,
    grossGamingRevenue: 0,
    winrate: 0,
    withdrawalRate: 0,
    depositAmountUser: 0,
    ggrPerUser: 0,
    addBonus: 0,
    deductBonus: 0,
    addTransaction: 0,
    deductTransaction: 0,
    betsAmount: 0,
    validAmount: 0,
    casesBets: 0,
    casesAdjustment: 0,
    bonus: 0,
    pureUser: 0,
    holdPercentage: 0,
    conversionRate: 0
  }
}

/**
 * Calculate Daily Average for ALL SGD KPIs
 */
export async function calculateAllSGDDailyAverages(
  monthlyData: SGDKPIData,
  year: string,
  month: string
): Promise<SGDKPIData> {
  try {
    const dailyAverages: SGDKPIData = {
      activeMember: await calculateSGDDailyAverage(monthlyData.activeMember, year, month),
      depositAmount: await calculateSGDDailyAverage(monthlyData.depositAmount, year, month),
      withdrawAmount: await calculateSGDDailyAverage(monthlyData.withdrawAmount, year, month),
      netProfit: await calculateSGDDailyAverage(monthlyData.netProfit, year, month),
      purchaseFrequency: await calculateSGDDailyAverage(monthlyData.purchaseFrequency, year, month),
      avgTransactionValue: await calculateSGDDailyAverage(monthlyData.avgTransactionValue, year, month),
      pureMember: await calculateSGDDailyAverage(monthlyData.pureMember, year, month),
      newRegister: await calculateSGDDailyAverage(monthlyData.newRegister, year, month),
      newDepositor: await calculateSGDDailyAverage(monthlyData.newDepositor, year, month),
      depositCases: await calculateSGDDailyAverage(monthlyData.depositCases, year, month),
      withdrawCases: await calculateSGDDailyAverage(monthlyData.withdrawCases, year, month),
      grossGamingRevenue: await calculateSGDDailyAverage(monthlyData.grossGamingRevenue, year, month),
      winrate: await calculateSGDDailyAverage(monthlyData.winrate, year, month),
      withdrawalRate: await calculateSGDDailyAverage(monthlyData.withdrawalRate, year, month),
      depositAmountUser: await calculateSGDDailyAverage(monthlyData.depositAmountUser, year, month),
      ggrPerUser: await calculateSGDDailyAverage(monthlyData.ggrPerUser, year, month),
      addBonus: await calculateSGDDailyAverage(monthlyData.addBonus, year, month),
      deductBonus: await calculateSGDDailyAverage(monthlyData.deductBonus, year, month),
      addTransaction: await calculateSGDDailyAverage(monthlyData.addTransaction, year, month),
      deductTransaction: await calculateSGDDailyAverage(monthlyData.deductTransaction, year, month),
      betsAmount: await calculateSGDDailyAverage(monthlyData.betsAmount, year, month),
      validAmount: await calculateSGDDailyAverage(monthlyData.validAmount, year, month),
      casesBets: await calculateSGDDailyAverage(monthlyData.casesBets, year, month),
      casesAdjustment: await calculateSGDDailyAverage(monthlyData.casesAdjustment, year, month),
      bonus: await calculateSGDDailyAverage(monthlyData.bonus, year, month),
      pureUser: await calculateSGDDailyAverage(monthlyData.pureUser, year, month),
      holdPercentage: await calculateSGDDailyAverage(monthlyData.holdPercentage, year, month),
      conversionRate: await calculateSGDDailyAverage(monthlyData.conversionRate, year, month)
    }
    
    return dailyAverages
    
  } catch (error) {
    console.error('❌ [SGD Daily Average] Error calculating all SGD KPIs:', error)
    return getEmptySGDKPIData()
  }
}

/**
 * Get ALL SGD KPIs with MoM Comparison (same pattern as USCDailyAverageAndMoM.ts)
 */
export async function getAllSGDKPIsWithMoM(
  year: string,
  month: string,
  line?: string
): Promise<{ current: SGDKPIData, mom: SGDMoMData, dailyAverage: SGDKPIData }> {
  try {
    // Get current month data
    const currentData = await getSGDKPIData(year, month, line)
    
    // Get previous month data
    const { year: prevYear, month: prevMonth } = getPreviousMonth(year, month)
    const previousData = await getSGDKPIData(prevYear, prevMonth, line)
    
    // Calculate MoM using same formula as USCDailyAverageAndMoM.ts
    const mom: SGDMoMData = {
      activeMember: calculateSGDMoM(currentData.activeMember, previousData.activeMember),
      depositAmount: calculateSGDMoM(currentData.depositAmount, previousData.depositAmount),
      withdrawAmount: calculateSGDMoM(currentData.withdrawAmount, previousData.withdrawAmount),
      netProfit: calculateSGDMoM(currentData.netProfit, previousData.netProfit),
      purchaseFrequency: calculateSGDMoM(currentData.purchaseFrequency, previousData.purchaseFrequency),
      avgTransactionValue: calculateSGDMoM(currentData.avgTransactionValue, previousData.avgTransactionValue),
      pureMember: calculateSGDMoM(currentData.pureMember, previousData.pureMember),
      newRegister: calculateSGDMoM(currentData.newRegister, previousData.newRegister),
      newDepositor: calculateSGDMoM(currentData.newDepositor, previousData.newDepositor),
      depositCases: calculateSGDMoM(currentData.depositCases, previousData.depositCases),
      withdrawCases: calculateSGDMoM(currentData.withdrawCases, previousData.withdrawCases),
      grossGamingRevenue: calculateSGDMoM(currentData.grossGamingRevenue, previousData.grossGamingRevenue),
      winrate: calculateSGDMoM(currentData.winrate, previousData.winrate),
      withdrawalRate: calculateSGDMoM(currentData.withdrawalRate, previousData.withdrawalRate),
      depositAmountUser: calculateSGDMoM(currentData.depositAmountUser, previousData.depositAmountUser),
      ggrPerUser: calculateSGDMoM(currentData.ggrPerUser, previousData.ggrPerUser),
      addBonus: calculateSGDMoM(currentData.addBonus, previousData.addBonus),
      deductBonus: calculateSGDMoM(currentData.deductBonus, previousData.deductBonus),
      addTransaction: calculateSGDMoM(currentData.addTransaction, previousData.addTransaction),
      deductTransaction: calculateSGDMoM(currentData.deductTransaction, previousData.deductTransaction),
      betsAmount: calculateSGDMoM(currentData.betsAmount, previousData.betsAmount),
      validAmount: calculateSGDMoM(currentData.validAmount, previousData.validAmount),
      casesBets: calculateSGDMoM(currentData.casesBets, previousData.casesBets),
      casesAdjustment: calculateSGDMoM(currentData.casesAdjustment, previousData.casesAdjustment),
      bonus: calculateSGDMoM(currentData.bonus, previousData.bonus),
      pureUser: calculateSGDMoM(currentData.pureUser, previousData.pureUser),
      holdPercentage: calculateSGDMoM(currentData.holdPercentage, previousData.holdPercentage),
      conversionRate: calculateSGDMoM(currentData.conversionRate, previousData.conversionRate)
    }
    
    // Calculate daily averages
    const dailyAverage = await calculateAllSGDDailyAverages(currentData, year, month)
    
    return { current: currentData, mom, dailyAverage }
    
  } catch (error) {
    console.error('❌ [SGD MoM] Error calculating SGD KPIs with MoM:', error)
    
    return {
      current: getEmptySGDKPIData(),
      mom: getEmptySGDKPIData(),
      dailyAverage: getEmptySGDKPIData()
    }
  }
}

/**
 * Format MoM value (same as USCDailyAverageAndMoM.ts)
 */
export function formatSGDMoMValue(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? `+${num.toFixed(1)}%` : `${num.toFixed(1)}%`
}

/**
 * Get comparison color (same as USCDailyAverageAndMoM.ts)
 */
export function getSGDComparisonColor(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? '#059669' : num < 0 ? '#dc2626' : '#6b7280'
}

/**
 * Format daily average value
 */
export function formatSGDDailyAverageValue(
  value: number,
  type: 'currency' | 'count' | 'percentage' = 'count'
): string {
  try {
    switch (type) {
      case 'currency':
        return `SGD ${new Intl.NumberFormat('en-US', {
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
    console.error('❌ [SGD Daily Average] Error formatting value:', error)
    return '0'
  }
}
