'use client'

import { supabase } from './supabase'

// ===========================================
// TYPES & INTERFACES
// ===========================================

export interface PeriodFilters {
  startDate: string
  endDate: string
}

export interface BrandPerformanceKPIs {
  activeMember: number
  pureUser: number
  depositAmount: number
  depositCases: number
  withdrawCases: number
  withdrawAmount: number
  addTransaction: number
  deductTransaction: number
  grossGamingRevenue: number
  netProfit: number
  atv: number
  ggrUser: number
  daUser: number
  purchaseFrequency: number
}

export interface BrandPerformanceComparison {
  periodA: BrandPerformanceKPIs
  periodB: BrandPerformanceKPIs
  difference: BrandPerformanceKPIs
  percentageChange: BrandPerformanceKPIs
}

// ===========================================
// CORE LOGIC FUNCTIONS
// ===========================================

export async function getBrandPerformanceKPIs(filters: PeriodFilters): Promise<BrandPerformanceKPIs> {
  try {
    // Fetch data from blue_whale_myr_summary table (aggregated data)
    const { data: summaryData, error: summaryError } = await supabase
      .from('blue_whale_myr_summary')
      .select('*')
      .gte('date', filters.startDate)
      .lte('date', filters.endDate)

    if (summaryError) {
      console.error('❌ [BrandPerformanceLogic] Error fetching summary data:', summaryError)
      throw summaryError
    }

    // Fetch active member data from blue_whale_myr table
    const { data: memberData, error: memberError } = await supabase
      .from('blue_whale_myr')
      .select('userkey, unique_code')
      .gte('date', filters.startDate)
      .lte('date', filters.endDate)
      .gt('deposit_cases', 0) // Only users with deposit_cases > 0

    if (memberError) {
      console.error('❌ [BrandPerformanceLogic] Error fetching member data:', memberError)
      throw memberError
    }

    // Calculate KPIs from summary data
    const summaryRawData = summaryData || []
    const memberRawData = memberData || []

    // 1. Active Member = Count unique userkey where deposit_cases > 0
    const uniqueUserKeys = Array.from(new Set(memberRawData.map(item => item.userkey).filter(Boolean)))
    const activeMember = uniqueUserKeys.length

    // 2. Pure User = Count unique unique_code where deposit_cases > 0
    const uniqueCodes = Array.from(new Set(memberRawData.map(item => item.unique_code).filter(Boolean)))
    const pureUser = uniqueCodes.length

    // 3-8. Aggregate values from summary data
    const depositAmount = summaryRawData.reduce((sum, item) => sum + (Number(item.deposit_amount) || 0), 0)
    const depositCases = summaryRawData.reduce((sum, item) => sum + (Number(item.deposit_cases) || 0), 0)
    const withdrawCases = summaryRawData.reduce((sum, item) => sum + (Number(item.withdraw_cases) || 0), 0)
    const withdrawAmount = summaryRawData.reduce((sum, item) => sum + (Number(item.withdraw_amount) || 0), 0)
    const addTransaction = summaryRawData.reduce((sum, item) => sum + (Number(item.add_transaction) || 0), 0)
    const deductTransaction = summaryRawData.reduce((sum, item) => sum + (Number(item.deduct_transaction) || 0), 0)

    // 9. Gross Gaming Revenue = (Deposit Amount - Withdraw Amount)
    const grossGamingRevenue = depositAmount - withdrawAmount

    // 10. Net Profit = ((Deposit Amount + Add Transaction) - (Withdraw Amount + Deduct Transaction))
    const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)

    // 11. ATV = (Deposit Amount / Deposit Cases)
    const atv = depositCases > 0 ? depositAmount / depositCases : 0

    // 12. GGR User = (Net Profit / Active Member)
    const ggrUser = activeMember > 0 ? netProfit / activeMember : 0

    // 13. DA User = (Deposit Amount / Active Member)
    const daUser = activeMember > 0 ? depositAmount / activeMember : 0

    // 14. DC User (Purchase Frequency) = (Deposit Cases / Active Member)
    const purchaseFrequency = activeMember > 0 ? depositCases / activeMember : 0

    const result: BrandPerformanceKPIs = {
      activeMember,
      pureUser,
      depositAmount,
      depositCases,
      withdrawCases,
      withdrawAmount,
      addTransaction,
      deductTransaction,
      grossGamingRevenue,
      netProfit,
      atv,
      ggrUser,
      daUser,
      purchaseFrequency
    }

    return result

  } catch (error) {
    console.error('❌ [BrandPerformanceLogic] Error calculating KPIs:', error)
    
    // Return zero values
    return {
      activeMember: 0,
      pureUser: 0,
      depositAmount: 0,
      depositCases: 0,
      withdrawCases: 0,
      withdrawAmount: 0,
      addTransaction: 0,
      deductTransaction: 0,
      grossGamingRevenue: 0,
      netProfit: 0,
      atv: 0,
      ggrUser: 0,
      daUser: 0,
      purchaseFrequency: 0
    }
  }
}

// ===========================================
// COMPARISON LOGIC
// ===========================================

export async function getBrandPerformanceComparison(
  periodA: PeriodFilters,
  periodB: PeriodFilters
): Promise<BrandPerformanceComparison> {
  try {
    // Get KPIs for both periods
    const [periodAData, periodBData] = await Promise.all([
      getBrandPerformanceKPIs(periodA),
      getBrandPerformanceKPIs(periodB)
    ])

    // Calculate differences (Period B - Period A)
    const difference: BrandPerformanceKPIs = {
      activeMember: periodBData.activeMember - periodAData.activeMember,
      pureUser: periodBData.pureUser - periodAData.pureUser,
      depositAmount: periodBData.depositAmount - periodAData.depositAmount,
      depositCases: periodBData.depositCases - periodAData.depositCases,
      withdrawCases: periodBData.withdrawCases - periodAData.withdrawCases,
      withdrawAmount: periodBData.withdrawAmount - periodAData.withdrawAmount,
      addTransaction: periodBData.addTransaction - periodAData.addTransaction,
      deductTransaction: periodBData.deductTransaction - periodAData.deductTransaction,
      grossGamingRevenue: periodBData.grossGamingRevenue - periodAData.grossGamingRevenue,
      netProfit: periodBData.netProfit - periodAData.netProfit,
      atv: periodBData.atv - periodAData.atv,
      ggrUser: periodBData.ggrUser - periodAData.ggrUser,
      daUser: periodBData.daUser - periodAData.daUser,
      purchaseFrequency: periodBData.purchaseFrequency - periodAData.purchaseFrequency
    }

    // Calculate percentage changes
    const percentageChange: BrandPerformanceKPIs = {
      activeMember: calculatePercentageChange(periodAData.activeMember, periodBData.activeMember),
      pureUser: calculatePercentageChange(periodAData.pureUser, periodBData.pureUser),
      depositAmount: calculatePercentageChange(periodAData.depositAmount, periodBData.depositAmount),
      depositCases: calculatePercentageChange(periodAData.depositCases, periodBData.depositCases),
      withdrawCases: calculatePercentageChange(periodAData.withdrawCases, periodBData.withdrawCases),
      withdrawAmount: calculatePercentageChange(periodAData.withdrawAmount, periodBData.withdrawAmount),
      addTransaction: calculatePercentageChange(periodAData.addTransaction, periodBData.addTransaction),
      deductTransaction: calculatePercentageChange(periodAData.deductTransaction, periodBData.deductTransaction),
      grossGamingRevenue: calculatePercentageChange(periodAData.grossGamingRevenue, periodBData.grossGamingRevenue),
      netProfit: calculatePercentageChange(periodAData.netProfit, periodBData.netProfit),
      atv: calculatePercentageChange(periodAData.atv, periodBData.atv),
      ggrUser: calculatePercentageChange(periodAData.ggrUser, periodBData.ggrUser),
      daUser: calculatePercentageChange(periodAData.daUser, periodBData.daUser),
      purchaseFrequency: calculatePercentageChange(periodAData.purchaseFrequency, periodBData.purchaseFrequency)
    }

    const result: BrandPerformanceComparison = {
      periodA: periodAData,
      periodB: periodBData,
      difference,
      percentageChange
    }

    return result

  } catch (error) {
    console.error('❌ [BrandPerformanceLogic] Error calculating comparison:', error)
    throw error
  }
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function calculatePercentageChange(previous: number, current: number): number {
  if (previous === 0 && current === 0) return 0
  if (previous === 0 && current > 0) return 100
  if (previous === 0 && current < 0) return -100
  
  // Calculate percentage change as (B-A)/A * 100
  const percentageChange = ((current - previous) / previous) * 100
  
  if (!isFinite(percentageChange) || isNaN(percentageChange)) {
    return 0
  }
  
  // Remove the limit to allow showing actual percentage changes
  return percentageChange
}

// ===========================================
// FORMATTING FUNCTIONS
// ===========================================

export function formatKPIValue(value: number, type: 'currency' | 'number' | 'percentage' | 'decimal' | 'count', currencySymbol: string = 'RM'): string {
  // Handle negative values
  const isNegative = value < 0
  const absValue = Math.abs(value)
  
  switch (type) {
    case 'currency':
      // Amount/Currency: Use thousand denomination with currency prefix (1 decimal for K/M)
      let formatted: string
      if (absValue >= 1000000) {
        formatted = `${(absValue / 1000000).toFixed(1)}M`
      } else if (absValue >= 1000) {
        formatted = `${(absValue / 1000).toFixed(1)}K`
      } else {
        formatted = absValue.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })
      }
      return isNegative ? `-${currencySymbol} ${formatted}` : `${currencySymbol} ${formatted}`
    case 'number':
      // Numeric values: Use thousand denomination (1 decimal for K/M)
      let numberFormatted: string
      if (absValue >= 1000000) {
        numberFormatted = `${(absValue / 1000000).toFixed(1)}M`
      } else if (absValue >= 1000) {
        numberFormatted = `${(absValue / 1000).toFixed(1)}K`
      } else {
        numberFormatted = Math.round(absValue).toLocaleString('en-US')
      }
      return isNegative ? `-${numberFormatted}` : numberFormatted
    case 'count':
      // Cases/Count: Show all digits
      return Math.round(value).toLocaleString('en-US')
    case 'percentage':
      return `${value.toFixed(2)}%`
    case 'decimal':
      // Decimal values: Use thousand denomination
      let decimalFormatted: string
      if (absValue >= 1000000) {
        decimalFormatted = `${(absValue / 1000000).toFixed(2)}M`
      } else if (absValue >= 1000) {
        decimalFormatted = `${(absValue / 1000).toFixed(2)}K`
      } else {
        decimalFormatted = absValue.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })
      }
      return isNegative ? `-${decimalFormatted}` : decimalFormatted
    default:
      return value.toString()
  }
}

export function getComparisonColor(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? '#059669' : num < 0 ? '#dc2626' : '#6b7280'
}

export function getComparisonIcon(value: number): string {
  const num = Number(value) || 0
  const color = getComparisonColor(value)
  
  const upIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width: 12px; height: 12px; fill: ${color}; display: inline-block; vertical-align: middle; margin-left: 4px;"><path d="M416 224C398.3 224 384 209.7 384 192C384 174.3 398.3 160 416 160L576 160C593.7 160 608 174.3 608 192L608 352C608 369.7 593.7 384 576 384C558.3 384 544 369.7 544 352L544 269.3L374.6 438.7C362.1 451.2 341.8 451.2 329.3 438.7L224 333.3L86.6 470.6C74.1 483.1 53.8 483.1 41.3 470.6C28.8 458.1 28.8 437.8 41.3 425.3L201.3 265.3C213.8 252.8 234.1 252.8 246.6 265.3L352 370.7L498.7 224L416 224z"/></svg>`
  
  const downIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width: 12px; height: 12px; fill: ${color}; display: inline-block; vertical-align: middle; margin-left: 4px;"><path d="M416 416C398.3 416 384 430.3 384 448C384 465.7 398.3 480 416 480L576 480C593.7 480 608 465.7 608 448L608 288C608 270.3 593.7 256 576 256C558.3 256 544 270.3 544 288L544 370.7L374.6 201.3C362.1 188.8 341.8 188.8 329.3 201.3L224 306.7L86.6 169.4C74.1 156.9 53.8 156.9 41.3 169.4C28.8 181.9 28.8 202.2 41.3 214.7L201.3 374.7C213.8 387.2 234.1 387.2 246.6 374.7L352 269.3L498.7 416L416 416z"/></svg>`
  
  const neutralIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width: 12px; height: 12px; fill: ${color}; display: inline-block; vertical-align: middle; margin-left: 4px;"><path d="M416 224C398.3 224 384 209.7 384 192C384 174.3 398.3 160 416 160L576 160C593.7 160 608 174.3 608 192L608 352C608 369.7 593.7 384 576 384C558.3 384 544 369.7 544 352L544 269.3L374.6 438.7C362.1 451.2 341.8 451.2 329.3 438.7L224 333.3L86.6 470.6C74.1 483.1 53.8 483.1 41.3 470.6C28.8 458.1 28.8 437.8 41.3 425.3L201.3 265.3C213.8 252.8 234.1 252.8 246.6 265.3L352 370.7L498.7 224L416 224z"/></svg>`
  
  return num > 0 ? upIcon : num < 0 ? downIcon : neutralIcon
}
