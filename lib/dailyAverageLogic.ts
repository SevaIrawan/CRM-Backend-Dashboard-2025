'use client'

import { supabase } from './supabase'
import { KPIData } from './KPILogic'

// ===========================================
// DAILY AVERAGE LOGIC
// ===========================================

// Month name to index mapping
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/**
 * Get month index (0-11) from month name
 */
export function getMonthIndex(monthName: string): number {
  return MONTH_NAMES.findIndex(name => 
    name.toLowerCase() === monthName.toLowerCase()
  )
}

/**
 * Get month name from month index (0-11)
 */
export function getMonthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex]
}

/**
 * Get total days in a specific month and year
 * Handles leap years automatically
 */
export function getDaysInMonth(year: string, month: string): number {
  const monthIndex = getMonthIndex(month)
  if (monthIndex === -1) {
    console.warn(`Invalid month name: ${month}`)
    return 30 // Fallback to 30 days
  }
  
  // Get last day of month (0 = last day of previous month)
  const lastDay = new Date(parseInt(year), monthIndex + 1, 0)
  return lastDay.getDate()
}

/**
 * Check if current month is the selected month
 */
export function isCurrentMonth(year: string, month: string): boolean {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear().toString()
  const currentMonth = getMonthName(currentDate.getMonth())
  
  return year === currentYear && month === currentMonth
}

/**
 * Get last update date from member_report_daily table
 * This function queries the database to find the latest date available for the selected month
 */
export async function getLastUpdateDateFromDatabase(year: string, month: string): Promise<number> {
  try {
    console.log(`🔍 [DailyAverage] Checking last update date for ${month} ${year}...`)
    
    // ✅ IMPROVED: More robust query with validation
    const { data, error } = await supabase
      .from('member_report_daily')
      .select('date')
      .eq('year', year)
      .eq('month', month)
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('❌ [DailyAverage] Error querying database:', error)
      return getDaysInMonth(year, month) // Fallback to total days
    }
    
    if (data && data.length > 0) {
      const dateValue = data[0]?.date
      if (dateValue) {
        // ✅ IMPROVED: Better date parsing with validation
        const lastUpdateDate = new Date(dateValue as string)
        
        // Validate the parsed date
        if (isNaN(lastUpdateDate.getTime())) {
          console.error('❌ [DailyAverage] Invalid date format:', dateValue)
          return getDaysInMonth(year, month)
        }
        
        const lastUpdateDay = lastUpdateDate.getDate()
        const totalDaysInMonth = getDaysInMonth(year, month)
        
        // ✅ VALIDATION: Ensure day is within valid range
        if (lastUpdateDay < 1 || lastUpdateDay > totalDaysInMonth) {
          console.error(`❌ [DailyAverage] Invalid day ${lastUpdateDay} for ${month} ${year} (max: ${totalDaysInMonth})`)
          return totalDaysInMonth
        }
        
        console.log(`✅ [DailyAverage] Last update date found: ${lastUpdateDate.toISOString().split('T')[0]} (day ${lastUpdateDay}/${totalDaysInMonth})`)
        return lastUpdateDay
      }
    }
    
    console.log(`⚠️ [DailyAverage] No data found for ${month} ${year}, using total days as fallback`)
    return getDaysInMonth(year, month) // Fallback to total days
    
  } catch (error) {
    console.error('❌ [DailyAverage] Error getting last update date:', error)
    return getDaysInMonth(year, month) // Fallback to total days
  }
}

/**
 * Get current month progress (days elapsed so far)
 * ✅ FIXED: Always use total days for completed months, only use database for current ongoing month
 */
export async function getCurrentMonthProgress(year: string, month: string): Promise<number> {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear().toString()
  const currentMonth = getMonthName(currentDate.getMonth())
  
  // ✅ FIXED: Only use database for CURRENT ongoing month
  if (year === currentYear && month === currentMonth) {
    console.log(`📅 [DailyAverage] CURRENT ongoing month detected: ${month} ${year}, checking database for last update...`)
    const lastUpdateDay = await getLastUpdateDateFromDatabase(year, month)
    const currentDay = currentDate.getDate()
    
    // Use the smaller value between last update and current day for safety
    const activeDays = Math.min(lastUpdateDay, currentDay)
    console.log(`📅 [DailyAverage] Current month active days: ${activeDays} (lastUpdate: ${lastUpdateDay}, today: ${currentDay})`)
    return activeDays
  }
  
  // ✅ FIXED: For ALL past months (including completed current year months), use total days
  const totalDays = getDaysInMonth(year, month)
  console.log(`📅 [DailyAverage] Past/completed month detected: ${month} ${year}, using total days: ${totalDays}`)
  return totalDays
}

/**
 * Calculate daily average with SIMPLE and UNIVERSAL logic
 * ✅ FIXED: Always use total days for ALL past months, only use database for current ongoing month
 */
export async function calculateDailyAverage(
  monthlyValue: number, 
  year: string, 
  month: string
): Promise<number> {
  // ✅ SIMPLE LOGIC: Get days using improved getCurrentMonthProgress
  const activeDays = await getCurrentMonthProgress(year, month)
  
  if (activeDays === 0 || activeDays < 1) {
    console.warn(`⚠️ [DailyAverage] Invalid days (${activeDays}) for ${month} ${year}, using fallback`)
    const fallbackDays = getDaysInMonth(year, month)
    return monthlyValue / fallbackDays
  }
  
  const dailyAverage = monthlyValue / activeDays
  console.log(`📊 [DailyAverage] ${month} ${year}: ${monthlyValue} ÷ ${activeDays} = ${dailyAverage.toFixed(2)}`)
  
  return dailyAverage
}

/**
 * Calculate Daily Average for ALL KPIs
 */
export async function calculateAllKPIsDailyAverage(
  monthlyData: KPIData,
  year: string,
  month: string
): Promise<KPIData> {
  try {
    console.log('🔄 [DailyAverage] Calculating Daily Average for ALL KPIs...')
    
    const dailyAverages: KPIData = {
      activeMember: await calculateDailyAverage(monthlyData.activeMember, year, month),
      newDepositor: await calculateDailyAverage(monthlyData.newDepositor, year, month),
      depositAmount: await calculateDailyAverage(monthlyData.depositAmount, year, month),
      grossGamingRevenue: await calculateDailyAverage(monthlyData.grossGamingRevenue, year, month),
      netProfit: await calculateDailyAverage(monthlyData.netProfit, year, month),
      withdrawAmount: await calculateDailyAverage(monthlyData.withdrawAmount, year, month),
      addTransaction: await calculateDailyAverage(monthlyData.addTransaction, year, month),
      deductTransaction: await calculateDailyAverage(monthlyData.deductTransaction, year, month),
      validBetAmount: await calculateDailyAverage(monthlyData.validBetAmount, year, month),
      pureMember: await calculateDailyAverage(monthlyData.pureMember, year, month),
      pureUser: await calculateDailyAverage(monthlyData.pureUser, year, month),
      newRegister: await calculateDailyAverage(monthlyData.newRegister, year, month),
      churnMember: await calculateDailyAverage(monthlyData.churnMember, year, month),
      depositCases: await calculateDailyAverage(monthlyData.depositCases, year, month),
      withdrawCases: await calculateDailyAverage(monthlyData.withdrawCases, year, month),
      winrate: await calculateDailyAverage(monthlyData.winrate, year, month),
      churnRate: await calculateDailyAverage(monthlyData.churnRate, year, month),
      retentionRate: await calculateDailyAverage(monthlyData.retentionRate, year, month),
      growthRate: await calculateDailyAverage(monthlyData.growthRate, year, month),
      avgTransactionValue: await calculateDailyAverage(monthlyData.avgTransactionValue, year, month),
      purchaseFrequency: await calculateDailyAverage(monthlyData.purchaseFrequency, year, month),
      customerLifetimeValue: await calculateDailyAverage(monthlyData.customerLifetimeValue, year, month),
      avgCustomerLifespan: await calculateDailyAverage(monthlyData.avgCustomerLifespan, year, month),
      customerMaturityIndex: await calculateDailyAverage(monthlyData.customerMaturityIndex, year, month),
      ggrPerUser: await calculateDailyAverage(monthlyData.ggrPerUser, year, month),
      ggrPerPureUser: await calculateDailyAverage(monthlyData.ggrPerPureUser, year, month),
      addBonus: await calculateDailyAverage(monthlyData.addBonus, year, month),
      deductBonus: await calculateDailyAverage(monthlyData.deductBonus, year, month),
      conversionRate: await calculateDailyAverage(monthlyData.conversionRate, year, month),
      holdPercentage: await calculateDailyAverage(monthlyData.holdPercentage, year, month),
      headcount: await calculateDailyAverage(monthlyData.headcount, year, month),
      depositAmountUser: await calculateDailyAverage(monthlyData.depositAmountUser, year, month)
    }
    
    console.log('✅ [DailyAverage] All KPIs Daily Average calculated')
    return dailyAverages
    
  } catch (error) {
    console.error('❌ [DailyAverage] Error calculating all KPIs:', error)
    return {
      activeMember: 0, newDepositor: 0, depositAmount: 0, grossGamingRevenue: 0, netProfit: 0,
      withdrawAmount: 0, addTransaction: 0, deductTransaction: 0, validBetAmount: 0, pureMember: 0,
      pureUser: 0, newRegister: 0, churnMember: 0, depositCases: 0, withdrawCases: 0, winrate: 0,
      churnRate: 0, retentionRate: 0, growthRate: 0, avgTransactionValue: 0, purchaseFrequency: 0,
      customerLifetimeValue: 0, avgCustomerLifespan: 0, customerMaturityIndex: 0, ggrPerUser: 0,
      ggrPerPureUser: 0, addBonus: 0, deductBonus: 0, conversionRate: 0, holdPercentage: 0,
      headcount: 0, depositAmountUser: 0
    }
  }
}

/**
 * Get ALL KPIs with Daily Average
 */
export async function getAllKPIsWithDailyAverage(
  monthlyData: KPIData,
  year: string,
  month: string
): Promise<{
  current: KPIData,
  dailyAverage: KPIData
}> {
  try {
    console.log('🔄 [DailyAverage] Calculating Daily Average for ALL KPIs...')
    
    // Calculate daily averages for ALL KPIs
    const allDailyAverages = await calculateAllKPIsDailyAverage(monthlyData, year, month)
    
    console.log('✅ [DailyAverage] All KPIs Daily Average calculated')
    
    return {
      current: monthlyData,
      dailyAverage: allDailyAverages
    }
    
  } catch (error) {
    console.error('❌ [DailyAverage] Error calculating Daily Average for all KPIs:', error)
    throw error
  }
}

/**
 * Format daily average with appropriate precision
 * Currency values: 2 decimal places
 * Count values: 0 decimal places  
 * Percentage values: 2 decimal places
 */
export function formatDailyAverageValue(
  value: number,
  type: 'currency' | 'count' | 'percentage' = 'currency'
): string {
  try {
    switch (type) {
      case 'currency':
        return `RM ${new Intl.NumberFormat('en-US', {
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
    console.error('❌ [DailyAverage] Error formatting Daily Average value:', error)
    return '0'
  }
}

/**
 * Get detailed info about month for debugging
 * Now includes async database check for current month
 */
export async function getMonthInfo(year: string, month: string) {
  const totalDays = getDaysInMonth(year, month)
  const activeDays = await getCurrentMonthProgress(year, month)
  const isCurrent = isCurrentMonth(year, month)
  
  return {
    year,
    month,
    totalDays,
    activeDays,
    isCurrentMonth: isCurrent,
    isLeapYear: totalDays === 29 && month === 'February',
    dataSource: isCurrent ? 'Database (Last Update)' : 'Calendar (Total Days)'
  }
}

/**
 * Sync function version for backward compatibility
 * Use this when you can't use async/await
 */
export function calculateDailyAverageSync(
  monthlyValue: number, 
  year: string, 
  month: string,
  fallbackDays?: number
): number {
  if (isCurrentMonth(year, month)) {
    // For current month, use fallback days if provided, otherwise use total days
    const activeDays = fallbackDays || getDaysInMonth(year, month)
    return monthlyValue / activeDays
  }
  
  // For past months, use total days
  const totalDays = getDaysInMonth(year, month)
  return monthlyValue / totalDays
}
