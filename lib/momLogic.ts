'use client'

import { calculateKPIs, KPIData, SlicerFilters } from './KPILogic'
import { KPI_FORMULAS } from './KPILogic'

// ===========================================
// MONTH-OVER-MONTH (MOM) LOGIC
// ===========================================

/**
 * Calculate Month-over-Month percentage change
 * @param current Current month value
 * @param previous Previous month value
 * @returns Percentage change
 */
export function calculateMoM(current: number, previous: number): number {
  return KPI_FORMULAS.PERCENTAGE_CHANGE(current, previous)
}

/**
 * Get all KPIs with Month-over-Month calculations
 * @param filters Slicer filters for current month
 * @returns Object containing current KPIs and MoM calculations
 */
export async function getAllKPIsWithMoM(filters: SlicerFilters): Promise<{ current: KPIData, mom: any }> {
  try {
    console.log('📊 [MoMLogic] Calculating MoM KPIs...')
    console.log('🔍 [MoMLogic] Filters:', filters)

    // Get current month data
    const currentData = await calculateKPIs(filters)

    // Get previous month data
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthIndex = monthNames.indexOf(filters.month)
    const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
    const prevMonth = monthNames[prevMonthIndex]
    const prevYear = currentMonthIndex === 0 ? (parseInt(filters.year) - 1).toString() : filters.year

    const previousData = await calculateKPIs({
      ...filters,
      year: prevYear,
      month: prevMonth
    })

    console.log('📈 [MoMLogic] Previous month data:', { prevYear, prevMonth })

    // Calculate MoM using centralized formula - COMPLETE KPI LIST
    const mom = {
      activeMember: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.activeMember, previousData.activeMember),
      newDepositor: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.newDepositor, previousData.newDepositor),
      depositAmount: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.depositAmount, previousData.depositAmount),
      grossGamingRevenue: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.grossGamingRevenue, previousData.grossGamingRevenue),
      netProfit: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.netProfit, previousData.netProfit),
      withdrawAmount: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.withdrawAmount, previousData.withdrawAmount),
      addTransaction: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.addTransaction, previousData.addTransaction),
      deductTransaction: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.deductTransaction, previousData.deductTransaction),
      validBetAmount: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.validBetAmount, previousData.validBetAmount),
      pureMember: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.pureMember, previousData.pureMember),
      pureUser: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.pureUser, previousData.pureUser),
      newRegister: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.newRegister, previousData.newRegister),
      churnMember: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.churnMember, previousData.churnMember),
      depositCases: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.depositCases, previousData.depositCases),
      withdrawCases: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.withdrawCases, previousData.withdrawCases),
      winrate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.winrate, previousData.winrate),
      churnRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.churnRate, previousData.churnRate),
      retentionRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.retentionRate, previousData.retentionRate),
      growthRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.growthRate, previousData.growthRate),
      avgTransactionValue: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.avgTransactionValue, previousData.avgTransactionValue),
      purchaseFrequency: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.purchaseFrequency, previousData.purchaseFrequency),
      customerLifetimeValue: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.customerLifetimeValue, previousData.customerLifetimeValue),
      avgCustomerLifespan: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.avgCustomerLifespan, previousData.avgCustomerLifespan),
      customerMaturityIndex: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.customerMaturityIndex, previousData.customerMaturityIndex),
      ggrPerUser: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.ggrPerUser, previousData.ggrPerUser),
      ggrPerPureUser: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.ggrPerPureUser, previousData.ggrPerPureUser),
      addBonus: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.addBonus, previousData.addBonus),
      deductBonus: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.deductBonus, previousData.deductBonus),
      conversionRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.conversionRate, previousData.conversionRate),
      holdPercentage: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.holdPercentage, previousData.holdPercentage),
      headcount: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.headcount, previousData.headcount),
      depositAmountUser: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.depositAmountUser, previousData.depositAmountUser)
    }

    // 🔍 DEBUG: Log raw MoM calculation untuk PURE USER
    console.log('🔍 [MoMLogic] PURE USER MoM Debug:', {
      currentMonth: filters.month,
      previousMonth: prevMonth,
      currentYear: filters.year,
      previousYear: prevYear,
      pureUser: {
        current: currentData.pureUser,
        previous: previousData.pureUser,
        mom: mom.pureUser,
        manualCalculation: ((currentData.pureUser - previousData.pureUser) / previousData.pureUser) * 100,
        expectedResult: 'Should be around 0.99% for your test case'
      }
    })

    // ✅ IMPROVED FIX: Handle invalid MoM values for GGR USER and PURE USER
    if (!isFinite(mom.ggrPerUser) || isNaN(mom.ggrPerUser)) {
      mom.ggrPerUser = 0
    }
    if (!isFinite(mom.pureUser) || isNaN(mom.pureUser)) {
      mom.pureUser = 0
    }

    // 🔍 DEBUG: Log MoM calculation untuk GGR USER dan PURE USER dengan formula yang jelas
    console.log('🔍 [MoMLogic] MoM Debug - GGR USER & PURE USER:', {
      ggrPerUser: {
        current: currentData.ggrPerUser,
        previous: previousData.ggrPerUser,
        mom: mom.ggrPerUser,
        formula: '(current - previous) / previous * 100',
        calculation: `(${currentData.ggrPerUser} - ${previousData.ggrPerUser}) / ${previousData.ggrPerUser} * 100 = ${mom.ggrPerUser}%`,
        rawData: {
          currentNetProfit: currentData.netProfit,
          currentActiveMember: currentData.activeMember,
          previousNetProfit: previousData.netProfit,
          previousActiveMember: previousData.activeMember
        },
        ggrCalculation: {
          current: `${currentData.netProfit} / ${currentData.activeMember} = ${currentData.ggrPerUser}`,
          previous: `${previousData.netProfit} / ${previousData.activeMember} = ${previousData.ggrPerUser}`
        },
        // ✅ IMPROVED VALIDATION
        isValid: !isNaN(currentData.ggrPerUser) && !isNaN(previousData.ggrPerUser) && 
                isFinite(currentData.ggrPerUser) && isFinite(previousData.ggrPerUser) &&
                currentData.activeMember > 0 && previousData.activeMember > 0
      },
      pureUser: {
        current: currentData.pureUser,
        previous: previousData.pureUser,
        mom: mom.pureUser,
        formula: '(current - previous) / previous * 100',
        calculation: `(${currentData.pureUser} - ${previousData.pureUser}) / ${previousData.pureUser} * 100 = ${mom.pureUser}%`,
        // ✅ IMPROVED VALIDATION
        isValid: !isNaN(currentData.pureUser) && !isNaN(previousData.pureUser) && 
                currentData.pureUser >= 0 && previousData.pureUser >= 0
      },
      netProfit: {
        current: currentData.netProfit,
        previous: previousData.netProfit
      },
      activeMember: {
        current: currentData.activeMember,
        previous: previousData.activeMember
      }
    })

    console.log('✅ [MoMLogic] MoM calculations completed successfully')
    return { current: currentData, mom }

  } catch (error) {
    console.error('❌ [MoMLogic] Error calculating MoM KPIs:', error)
    
    return {
      current: {
        activeMember: 0, newDepositor: 0, depositAmount: 0, grossGamingRevenue: 0, netProfit: 0,
        withdrawAmount: 0, addTransaction: 0, deductTransaction: 0, validBetAmount: 0, pureMember: 0,
        pureUser: 0, newRegister: 0, churnMember: 0, depositCases: 0, withdrawCases: 0, winrate: 0, churnRate: 0,
        retentionRate: 0, growthRate: 0, avgTransactionValue: 0, purchaseFrequency: 0,
        customerLifetimeValue: 0, avgCustomerLifespan: 0, customerMaturityIndex: 0, ggrPerUser: 0, ggrPerPureUser: 0,
        addBonus: 0, deductBonus: 0, conversionRate: 0, holdPercentage: 0, headcount: 0, depositAmountUser: 0
      },
      mom: {
        activeMember: 0, newDepositor: 0, depositAmount: 0, grossGamingRevenue: 0, netProfit: 0,
        withdrawAmount: 0, addTransaction: 0, deductTransaction: 0, validBetAmount: 0, pureMember: 0,
        pureUser: 0, newRegister: 0, churnMember: 0, depositCases: 0, withdrawCases: 0, winrate: 0,
        churnRate: 0, retentionRate: 0, growthRate: 0, avgTransactionValue: 0, purchaseFrequency: 0,
        customerLifetimeValue: 0, avgCustomerLifespan: 0, customerMaturityIndex: 0, ggrPerUser: 0,
        ggrPerPureUser: 0, addBonus: 0, deductBonus: 0, conversionRate: 0, holdPercentage: 0, headcount: 0, depositAmountUser: 0
      }
    }
  }
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Format MoM value with proper sign
 * @param value MoM percentage value
 * @returns Formatted string with + or - sign
 */
export function formatMoMValue(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? `+${num.toFixed(1)}%` : `${num.toFixed(1)}%`
}

/**
 * Get comparison color based on MoM value
 * @param value MoM percentage value
 * @returns Color code (green for positive, red for negative, gray for neutral)
 */
export function getMoMColor(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? '#059669' : num < 0 ? '#dc2626' : '#6b7280'
}
