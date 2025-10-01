/**
 * USC Daily Average dan MoM Comparison Logic
 * Menggunakan table blue_whale_usc dan blue_whale_usc_summary
 * Mengikuti pattern yang sudah ada di dailyAverageHelper.ts dan KPILogic.tsx
 */

import { supabase } from '@/lib/supabase'
import { calculateUSCKPIs, USCKPIData as USCLogicKPIData } from '@/lib/USCLogic'

// USC-specific types - SYNC with USCLogic.ts
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
    console.log(`🔍 [USC Daily Average] Getting last update date for ${month} ${year}...`)
    
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
    
    if (data && data.length > 0) {
      const lastDate = new Date(data[0].date)
      const dayOfMonth = lastDate.getDate()
      console.log(`✅ [USC Daily Average] Last update date: ${dayOfMonth}`)
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
    console.log(`📅 [USC Daily Average] CURRENT ongoing month detected: ${month} ${year}`)
    const lastUpdateDay = await getUSCLastUpdateDate(year, month)
    const currentDay = currentDate.getDate()
    const activeDays = Math.min(lastUpdateDay, currentDay)
    console.log(`📅 [USC Daily Average] Current month active days: ${activeDays}`)
    return activeDays
  }
  
  // For ALL past months, use total days
  const totalDays = getDaysInMonth(year, month)
  console.log(`📅 [USC Daily Average] Past/completed month: ${month} ${year}, total days: ${totalDays}`)
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
  console.log(`📊 [USC Daily Average] ${month} ${year}: ${monthlyValue} ÷ ${activeDays} = ${dailyAverage.toFixed(2)}`)
  
  return dailyAverage
}

/**
 * Calculate MoM percentage change (same as KPILogic.tsx)
 */
function calculateUSCMoM(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Get USC KPI data using USCLogic (hybrid approach)
 */
async function getUSCKPIData(year: string, month: string, line?: string): Promise<USCKPIData> {
  try {
    console.log(`🔍 [USC KPI] Getting KPI data for ${month} ${year} using USCLogic...`)
    
    // Use calculateUSCKPIs from USCLogic.ts (hybrid MV + Master table)
    const kpiData = await calculateUSCKPIs({
      year,
      month,
      line
    })

    console.log(`✅ [USC KPI] KPI data loaded for ${month} ${year}`)
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
    console.log('🔄 [USC Daily Average] Calculating Daily Average for ALL USC KPIs...')
    
    const dailyAverages: USCKPIData = {
      activeMember: await calculateUSCDailyAverage(monthlyData.activeMember, year, month),
      newDepositor: await calculateUSCDailyAverage(monthlyData.newDepositor, year, month),
      depositAmount: await calculateUSCDailyAverage(monthlyData.depositAmount, year, month),
      grossGamingRevenue: await calculateUSCDailyAverage(monthlyData.grossGamingRevenue, year, month),
      netProfit: await calculateUSCDailyAverage(monthlyData.netProfit, year, month),
      withdrawAmount: await calculateUSCDailyAverage(monthlyData.withdrawAmount, year, month),
      addTransaction: await calculateUSCDailyAverage(monthlyData.addTransaction, year, month),
      deductTransaction: await calculateUSCDailyAverage(monthlyData.deductTransaction, year, month),
      validBetAmount: await calculateUSCDailyAverage(monthlyData.validBetAmount, year, month),
      pureMember: await calculateUSCDailyAverage(monthlyData.pureMember, year, month),
      pureUser: await calculateUSCDailyAverage(monthlyData.pureUser, year, month),
      newRegister: await calculateUSCDailyAverage(monthlyData.newRegister, year, month),
      churnMember: await calculateUSCDailyAverage(monthlyData.churnMember, year, month),
      depositCases: await calculateUSCDailyAverage(monthlyData.depositCases, year, month),
      withdrawCases: await calculateUSCDailyAverage(monthlyData.withdrawCases, year, month),
      winrate: await calculateUSCDailyAverage(monthlyData.winrate, year, month),
      churnRate: await calculateUSCDailyAverage(monthlyData.churnRate, year, month),
      retentionRate: await calculateUSCDailyAverage(monthlyData.retentionRate, year, month),
      growthRate: await calculateUSCDailyAverage(monthlyData.growthRate, year, month),
      avgTransactionValue: await calculateUSCDailyAverage(monthlyData.avgTransactionValue, year, month),
      purchaseFrequency: await calculateUSCDailyAverage(monthlyData.purchaseFrequency, year, month),
      customerLifetimeValue: await calculateUSCDailyAverage(monthlyData.customerLifetimeValue, year, month),
      avgCustomerLifespan: await calculateUSCDailyAverage(monthlyData.avgCustomerLifespan, year, month),
      customerMaturityIndex: await calculateUSCDailyAverage(monthlyData.customerMaturityIndex, year, month),
      ggrPerUser: await calculateUSCDailyAverage(monthlyData.ggrPerUser, year, month),
      ggrPerPureUser: await calculateUSCDailyAverage(monthlyData.ggrPerPureUser, year, month),
      addBonus: await calculateUSCDailyAverage(monthlyData.addBonus, year, month),
      deductBonus: await calculateUSCDailyAverage(monthlyData.deductBonus, year, month),
      conversionRate: await calculateUSCDailyAverage(monthlyData.conversionRate, year, month),
      holdPercentage: await calculateUSCDailyAverage(monthlyData.holdPercentage, year, month),
      depositAmountUser: await calculateUSCDailyAverage(monthlyData.depositAmountUser, year, month),
      withdrawRate: await calculateUSCDailyAverage(monthlyData.withdrawRate, year, month),
      highValueCustomers: 0,
      lowValueCustomers: 0,
      totalCustomers: 0
    }
    
    console.log('✅ [USC Daily Average] All USC KPIs Daily Average calculated')
    return dailyAverages
    
  } catch (error) {
    console.error('❌ [USC Daily Average] Error calculating all USC KPIs:', error)
    return getEmptyUSCKPIData()
  }
}

/**
 * Get ALL USC KPIs with MoM Comparison (same pattern as KPILogic.tsx)
 */
export async function getAllUSCKPIsWithMoM(
  year: string,
  month: string,
  line?: string
): Promise<{ current: USCKPIData, mom: USCMoMData, dailyAverage: USCKPIData }> {
  try {
    console.log('🔄 [USC MoM] Calculating MoM for ALL USC KPIs...')
    
    // Get current month data
    const currentData = await getUSCKPIData(year, month, line)
    
    // Get previous month data
    const { year: prevYear, month: prevMonth } = getPreviousMonth(year, month)
    const previousData = await getUSCKPIData(prevYear, prevMonth, line)
    
    // Calculate MoM using same formula as KPILogic.tsx
    const mom: USCMoMData = {
      activeMember: calculateUSCMoM(currentData.activeMember, previousData.activeMember),
      newDepositor: calculateUSCMoM(currentData.newDepositor, previousData.newDepositor),
      depositAmount: calculateUSCMoM(currentData.depositAmount, previousData.depositAmount),
      grossGamingRevenue: calculateUSCMoM(currentData.grossGamingRevenue, previousData.grossGamingRevenue),
      netProfit: calculateUSCMoM(currentData.netProfit, previousData.netProfit),
      withdrawAmount: calculateUSCMoM(currentData.withdrawAmount, previousData.withdrawAmount),
      addTransaction: calculateUSCMoM(currentData.addTransaction, previousData.addTransaction),
      deductTransaction: calculateUSCMoM(currentData.deductTransaction, previousData.deductTransaction),
      validBetAmount: calculateUSCMoM(currentData.validBetAmount, previousData.validBetAmount),
      pureMember: calculateUSCMoM(currentData.pureMember, previousData.pureMember),
      pureUser: calculateUSCMoM(currentData.pureUser, previousData.pureUser),
      newRegister: calculateUSCMoM(currentData.newRegister, previousData.newRegister),
      churnMember: calculateUSCMoM(currentData.churnMember, previousData.churnMember),
      depositCases: calculateUSCMoM(currentData.depositCases, previousData.depositCases),
      withdrawCases: calculateUSCMoM(currentData.withdrawCases, previousData.withdrawCases),
      winrate: calculateUSCMoM(currentData.winrate, previousData.winrate),
      churnRate: calculateUSCMoM(currentData.churnRate, previousData.churnRate),
      retentionRate: calculateUSCMoM(currentData.retentionRate, previousData.retentionRate),
      growthRate: calculateUSCMoM(currentData.growthRate, previousData.growthRate),
      avgTransactionValue: calculateUSCMoM(currentData.avgTransactionValue, previousData.avgTransactionValue),
      purchaseFrequency: calculateUSCMoM(currentData.purchaseFrequency, previousData.purchaseFrequency),
      customerLifetimeValue: calculateUSCMoM(currentData.customerLifetimeValue, previousData.customerLifetimeValue),
      avgCustomerLifespan: calculateUSCMoM(currentData.avgCustomerLifespan, previousData.avgCustomerLifespan),
      customerMaturityIndex: calculateUSCMoM(currentData.customerMaturityIndex, previousData.customerMaturityIndex),
      ggrPerUser: calculateUSCMoM(currentData.ggrPerUser, previousData.ggrPerUser),
      ggrPerPureUser: calculateUSCMoM(currentData.ggrPerPureUser, previousData.ggrPerPureUser),
      addBonus: calculateUSCMoM(currentData.addBonus, previousData.addBonus),
      deductBonus: calculateUSCMoM(currentData.deductBonus, previousData.deductBonus),
      conversionRate: calculateUSCMoM(currentData.conversionRate, previousData.conversionRate),
      holdPercentage: calculateUSCMoM(currentData.holdPercentage, previousData.holdPercentage),
      depositAmountUser: calculateUSCMoM(currentData.depositAmountUser, previousData.depositAmountUser),
      withdrawRate: calculateUSCMoM(currentData.withdrawRate, previousData.withdrawRate)
    }
    
    // Calculate daily averages
    const dailyAverage = await calculateAllUSCDailyAverages(currentData, year, month)
    
    console.log('✅ [USC MoM] All USC KPIs with MoM calculated')
    
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
 * Format MoM value (same as KPILogic.tsx)
 */
export function formatUSCMoMValue(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? `+${num.toFixed(1)}%` : `${num.toFixed(1)}%`
}

/**
 * Get comparison color (same as KPILogic.tsx)
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
        return `USD ${new Intl.NumberFormat('en-US', {
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
