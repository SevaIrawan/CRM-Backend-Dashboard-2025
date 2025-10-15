/**
 * MYR Daily Average dan MoM Comparison Logic
 * Menggunakan table blue_whale_myr_monthly_summary (MV)
 * Mengikuti pattern yang sudah ada di USCDailyAverageAndMoM.ts
 */

import { supabase } from '@/lib/supabase'

// MYR-specific types - SYNC with blue_whale_myr_monthly_summary MV
export interface MYRKPIData {
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
  daUser: number
  ggrUser: number
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

export interface MYRMoMData {
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
  daUser: number
  ggrUser: number
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
 * Get last update date from blue_whale_myr table for MYR
 */
async function getMYRLastUpdateDate(year: string, month: string): Promise<number> {
  try {
    console.log(`🔍 [MYR Daily Average] Getting last update date for ${month} ${year}...`)
    
    const { data, error } = await supabase
      .from('blue_whale_myr')
      .select('date')
      .eq('year', year)
      .eq('month', month)
      .eq('currency', 'MYR')
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('❌ [MYR Daily Average] Error getting last update date:', error)
      return getDaysInMonth(year, month)
    }
    
    if (data && data.length > 0 && data[0].date) {
      const lastDate = new Date(String(data[0].date))
      const dayOfMonth = lastDate.getDate()
      console.log(`✅ [MYR Daily Average] Last update date: ${dayOfMonth}`)
      return dayOfMonth
    }
    
    return getDaysInMonth(year, month)
    
  } catch (error) {
    console.error('❌ [MYR Daily Average] Error getting last update date:', error)
    return getDaysInMonth(year, month)
  }
}

/**
 * Get current month progress (days elapsed so far) for MYR
 */
async function getMYRCurrentMonthProgress(year: string, month: string): Promise<number> {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear().toString()
  const currentMonth = getMonthName(currentDate.getMonth())
  
  // Only use database for CURRENT ongoing month
  if (year === currentYear && month === currentMonth) {
    console.log(`📅 [MYR Daily Average] CURRENT ongoing month detected: ${month} ${year}`)
    const lastUpdateDay = await getMYRLastUpdateDate(year, month)
    const currentDay = currentDate.getDate()
    const activeDays = Math.min(lastUpdateDay, currentDay)
    console.log(`📅 [MYR Daily Average] Current month active days: ${activeDays}`)
    return activeDays
  }
  
  // For ALL past months, use total days
  const totalDays = getDaysInMonth(year, month)
  console.log(`📅 [MYR Daily Average] Past/completed month: ${month} ${year}, total days: ${totalDays}`)
  return totalDays
}

/**
 * Calculate daily average for MYR KPI
 */
async function calculateMYRDailyAverage(monthlyValue: number, year: string, month: string): Promise<number> {
  const activeDays = await getMYRCurrentMonthProgress(year, month)
  
  if (activeDays === 0 || activeDays < 1) {
    console.warn(`⚠️ [MYR Daily Average] Invalid days (${activeDays}) for ${month} ${year}`)
    const fallbackDays = getDaysInMonth(year, month)
    return monthlyValue / fallbackDays
  }
  
  const dailyAverage = monthlyValue / activeDays
  console.log(`📊 [MYR Daily Average] ${month} ${year}: ${monthlyValue} ÷ ${activeDays} = ${dailyAverage.toFixed(2)}`)
  
  return dailyAverage
}

/**
 * Calculate MoM percentage change (same as USCDailyAverageAndMoM.ts)
 */
function calculateMYRMoM(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Get MYR KPI data from MV table
 */
async function getMYRKPIData(year: string, month: string, line?: string): Promise<MYRKPIData> {
  try {
    console.log(`🔍 [MYR KPI] Getting KPI data for ${month} ${year} from MV...`)
    
    const monthIndex = getMonthIndex(month)
    const monthNumber = monthIndex === -1 ? 0 : monthIndex + 1 // Handle 'ALL' month as 0
    
    let query = supabase
      .from('blue_whale_myr_monthly_summary')
      .select('*')
      .eq('currency', 'MYR')
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
      console.error('❌ [MYR KPI] Error fetching KPI data:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️ [MYR KPI] No data found for ${month} ${year}, line: ${line}`)
      return getEmptyMYRKPIData()
    }

    const row = data[0]
    
    // Map MV columns to KPI data structure
    const kpiData: MYRKPIData = {
      activeMember: row.active_member || 0,
      depositAmount: row.deposit_amount || 0,
      withdrawAmount: row.withdraw_amount || 0,
      netProfit: row.net_profit || 0,
      purchaseFrequency: row.purchase_frequency || 0,
      avgTransactionValue: row.atv || 0,
      pureMember: row.pure_member || 0,
      newRegister: row.new_register || 0,
      newDepositor: row.new_depositor || 0,
      depositCases: row.deposit_cases || 0,
      withdrawCases: row.withdraw_cases || 0,
      grossGamingRevenue: row.ggr || 0,
      winrate: row.winrate || 0,
      withdrawalRate: row.withdrawal_rate || 0,
      daUser: row.da_user || 0,
      ggrUser: row.ggr_user || 0,
      addBonus: row.add_bonus || 0,
      deductBonus: row.deduct_bonus || 0,
      addTransaction: row.add_transaction || 0,
      deductTransaction: row.deduct_transaction || 0,
      betsAmount: row.bets_amount || 0,
      validAmount: row.valid_amount || 0,
      casesBets: row.cases_bets || 0,
      casesAdjustment: row.cases_adjustment || 0,
      bonus: row.bonus || 0,
      pureUser: row.pure_user || 0,
      holdPercentage: row.hold_percentage || 0,
      conversionRate: row.conversion_rate || 0
    }

    console.log(`✅ [MYR KPI] KPI data loaded for ${month} ${year}`)
    return kpiData

  } catch (error) {
    console.error('❌ [MYR KPI] Error getting KPI data:', error)
    return getEmptyMYRKPIData()
  }
}

/**
 * Get empty MYR KPI data structure
 */
function getEmptyMYRKPIData(): MYRKPIData {
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
    daUser: 0,
    ggrUser: 0,
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
 * Calculate Daily Average for ALL MYR KPIs
 */
export async function calculateAllMYRDailyAverages(
  monthlyData: MYRKPIData,
  year: string,
  month: string
): Promise<MYRKPIData> {
  try {
    console.log('🔄 [MYR Daily Average] Calculating Daily Average for ALL MYR KPIs...')
    
    const dailyAverages: MYRKPIData = {
      activeMember: await calculateMYRDailyAverage(monthlyData.activeMember, year, month),
      depositAmount: await calculateMYRDailyAverage(monthlyData.depositAmount, year, month),
      withdrawAmount: await calculateMYRDailyAverage(monthlyData.withdrawAmount, year, month),
      netProfit: await calculateMYRDailyAverage(monthlyData.netProfit, year, month),
      purchaseFrequency: await calculateMYRDailyAverage(monthlyData.purchaseFrequency, year, month),
      avgTransactionValue: await calculateMYRDailyAverage(monthlyData.avgTransactionValue, year, month),
      pureMember: await calculateMYRDailyAverage(monthlyData.pureMember, year, month),
      newRegister: await calculateMYRDailyAverage(monthlyData.newRegister, year, month),
      newDepositor: await calculateMYRDailyAverage(monthlyData.newDepositor, year, month),
      depositCases: await calculateMYRDailyAverage(monthlyData.depositCases, year, month),
      withdrawCases: await calculateMYRDailyAverage(monthlyData.withdrawCases, year, month),
      grossGamingRevenue: await calculateMYRDailyAverage(monthlyData.grossGamingRevenue, year, month),
      winrate: await calculateMYRDailyAverage(monthlyData.winrate, year, month),
      withdrawalRate: await calculateMYRDailyAverage(monthlyData.withdrawalRate, year, month),
      daUser: await calculateMYRDailyAverage(monthlyData.daUser, year, month),
      ggrUser: await calculateMYRDailyAverage(monthlyData.ggrUser, year, month),
      addBonus: await calculateMYRDailyAverage(monthlyData.addBonus, year, month),
      deductBonus: await calculateMYRDailyAverage(monthlyData.deductBonus, year, month),
      addTransaction: await calculateMYRDailyAverage(monthlyData.addTransaction, year, month),
      deductTransaction: await calculateMYRDailyAverage(monthlyData.deductTransaction, year, month),
      betsAmount: await calculateMYRDailyAverage(monthlyData.betsAmount, year, month),
      validAmount: await calculateMYRDailyAverage(monthlyData.validAmount, year, month),
      casesBets: await calculateMYRDailyAverage(monthlyData.casesBets, year, month),
      casesAdjustment: await calculateMYRDailyAverage(monthlyData.casesAdjustment, year, month),
      bonus: await calculateMYRDailyAverage(monthlyData.bonus, year, month),
      pureUser: await calculateMYRDailyAverage(monthlyData.pureUser, year, month),
      holdPercentage: await calculateMYRDailyAverage(monthlyData.holdPercentage, year, month),
      conversionRate: await calculateMYRDailyAverage(monthlyData.conversionRate, year, month)
    }
    
    console.log('✅ [MYR Daily Average] All MYR KPIs Daily Average calculated')
    return dailyAverages
    
  } catch (error) {
    console.error('❌ [MYR Daily Average] Error calculating all MYR KPIs:', error)
    return getEmptyMYRKPIData()
  }
}

/**
 * Get ALL MYR KPIs with MoM Comparison (same pattern as USCDailyAverageAndMoM.ts)
 */
export async function getAllMYRKPIsWithMoM(
  year: string,
  month: string,
  line?: string
): Promise<{ current: MYRKPIData, mom: MYRMoMData, dailyAverage: MYRKPIData }> {
  try {
    console.log('🔄 [MYR MoM] Calculating MoM for ALL MYR KPIs...')
    
    // Get current month data
    const currentData = await getMYRKPIData(year, month, line)
    
    // Get previous month data
    const { year: prevYear, month: prevMonth } = getPreviousMonth(year, month)
    const previousData = await getMYRKPIData(prevYear, prevMonth, line)
    
    // Calculate MoM using same formula as USCDailyAverageAndMoM.ts
    const mom: MYRMoMData = {
      activeMember: calculateMYRMoM(currentData.activeMember, previousData.activeMember),
      depositAmount: calculateMYRMoM(currentData.depositAmount, previousData.depositAmount),
      withdrawAmount: calculateMYRMoM(currentData.withdrawAmount, previousData.withdrawAmount),
      netProfit: calculateMYRMoM(currentData.netProfit, previousData.netProfit),
      purchaseFrequency: calculateMYRMoM(currentData.purchaseFrequency, previousData.purchaseFrequency),
      avgTransactionValue: calculateMYRMoM(currentData.avgTransactionValue, previousData.avgTransactionValue),
      pureMember: calculateMYRMoM(currentData.pureMember, previousData.pureMember),
      newRegister: calculateMYRMoM(currentData.newRegister, previousData.newRegister),
      newDepositor: calculateMYRMoM(currentData.newDepositor, previousData.newDepositor),
      depositCases: calculateMYRMoM(currentData.depositCases, previousData.depositCases),
      withdrawCases: calculateMYRMoM(currentData.withdrawCases, previousData.withdrawCases),
      grossGamingRevenue: calculateMYRMoM(currentData.grossGamingRevenue, previousData.grossGamingRevenue),
      winrate: calculateMYRMoM(currentData.winrate, previousData.winrate),
      withdrawalRate: calculateMYRMoM(currentData.withdrawalRate, previousData.withdrawalRate),
      daUser: calculateMYRMoM(currentData.daUser, previousData.daUser),
      ggrUser: calculateMYRMoM(currentData.ggrUser, previousData.ggrUser),
      addBonus: calculateMYRMoM(currentData.addBonus, previousData.addBonus),
      deductBonus: calculateMYRMoM(currentData.deductBonus, previousData.deductBonus),
      addTransaction: calculateMYRMoM(currentData.addTransaction, previousData.addTransaction),
      deductTransaction: calculateMYRMoM(currentData.deductTransaction, previousData.deductTransaction),
      betsAmount: calculateMYRMoM(currentData.betsAmount, previousData.betsAmount),
      validAmount: calculateMYRMoM(currentData.validAmount, previousData.validAmount),
      casesBets: calculateMYRMoM(currentData.casesBets, previousData.casesBets),
      casesAdjustment: calculateMYRMoM(currentData.casesAdjustment, previousData.casesAdjustment),
      bonus: calculateMYRMoM(currentData.bonus, previousData.bonus),
      pureUser: calculateMYRMoM(currentData.pureUser, previousData.pureUser),
      holdPercentage: calculateMYRMoM(currentData.holdPercentage, previousData.holdPercentage),
      conversionRate: calculateMYRMoM(currentData.conversionRate, previousData.conversionRate)
    }
    
    // Calculate daily averages
    const dailyAverage = await calculateAllMYRDailyAverages(currentData, year, month)
    
    console.log('✅ [MYR MoM] All MYR KPIs with MoM calculated')
    
    return { current: currentData, mom, dailyAverage }
    
  } catch (error) {
    console.error('❌ [MYR MoM] Error calculating MYR KPIs with MoM:', error)
    
    return {
      current: getEmptyMYRKPIData(),
      mom: getEmptyMYRKPIData(),
      dailyAverage: getEmptyMYRKPIData()
    }
  }
}

/**
 * Format MoM value (same as USCDailyAverageAndMoM.ts)
 */
export function formatMYRMoMValue(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? `+${num.toFixed(1)}%` : `${num.toFixed(1)}%`
}

/**
 * Get comparison color (same as USCDailyAverageAndMoM.ts)
 */
export function getMYRComparisonColor(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? '#059669' : num < 0 ? '#dc2626' : '#6b7280'
}

/**
 * Format daily average value
 */
export function formatMYRDailyAverageValue(
  value: number,
  type: 'currency' | 'count' | 'percentage' = 'count'
): string {
  try {
    switch (type) {
      case 'currency':
        return `MYR ${new Intl.NumberFormat('en-US', {
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
    console.error('❌ [MYR Daily Average] Error formatting value:', error)
    return '0'
  }
}
