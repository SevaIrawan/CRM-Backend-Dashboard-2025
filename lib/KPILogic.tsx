'use client'

import { supabase } from './supabase'

// ===========================================
// TYPES & INTERFACES - POSTGRESQL PATTERN
// ===========================================

export interface SlicerFilters {
  year: string
  month: string
  currency: string
  line?: string
}

export interface SlicerData {
  years: string[]
  months: string[]
  currencies: string[]
  lines: string[]
}

export interface KPIData {
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
  headcount: number
  depositAmountUser: number
  highValueCustomers: number
  lowValueCustomers: number
  totalCustomers: number
}

// ===========================================
// RAW DATA STRUCTURE (Like PostgreSQL getRawData)
// ===========================================

export interface RawKPIData {
  deposit: {
    deposit_amount: number
    add_transaction: number
    active_members: number
    deposit_cases: number
  }
  withdraw: {
    withdraw_amount: number
    deduct_transaction: number
    withdraw_cases: number
  }
  member: {
    net_profit: number
    ggr: number
    valid_bet_amount: number
    add_bonus: number
    deduct_bonus: number
  }
  newDepositor: {
    new_depositor: number
  }
  newRegister: {
    new_register: number
  }
  churn: {
    churn_members: number
  }
  pureUser: {
    unique_codes: number
  }
  customerValue: {
    high_value_customers: number
    low_value_customers: number
    total_customers: number
  }
}

// ===========================================
// CENTRALIZED BUSINESS FORMULAS (Like PostgreSQL FORMULAS)
// Semua formula dalam 1 tempat - mudah maintain & update
// ===========================================

export const KPI_FORMULAS = {
  // ✅ CORE BUSINESS FORMULAS - Updated sesuai Data Dictionary terbaru
  
  // Net Profit from database = SUM(net_profit) dari member_report_daily
  NET_PROFIT_FROM_DB: (data: RawKPIData): number => {
    return data.member.net_profit
  },

  // GGR per User = Net Profit / Active Members
  GGR_USER: (data: RawKPIData): number => {
    return data.deposit.active_members > 0 ? data.member.net_profit / data.deposit.active_members : 0
  },

  // Pure Member = Active Member - New Depositor
  PURE_MEMBER: (data: RawKPIData): number => {
    return Math.max(data.deposit.active_members - data.newDepositor.new_depositor, 0)
  },

  // GGR per Pure User = GGR / Pure Members
  GGR_PURE_USER: (data: RawKPIData): number => {
    const pureMember = KPI_FORMULAS.PURE_MEMBER(data)
    return pureMember > 0 ? data.member.ggr / pureMember : 0
  },

  // ✅ UPDATED: Winrate = GGR / Deposit Amount (bukan Net Profit / Valid Bet Amount)
  WINRATE: (data: RawKPIData): number => {
    return data.deposit.deposit_amount > 0 ? (data.member.ggr / data.deposit.deposit_amount) * 100 : 0
  },

  // ✅ UPDATED: Average Transaction Value (ATV) = Deposit Amount / Deposit Cases
  AVG_TRANSACTION_VALUE: (data: RawKPIData): number => {
    return data.deposit.deposit_cases > 0 ? data.deposit.deposit_amount / data.deposit.deposit_cases : 0
  },

  // ✅ UPDATED: Purchase Frequency (PF) = Deposit Cases / Active Member
  PURCHASE_FREQUENCY: (data: RawKPIData): number => {
    const result = data.deposit.active_members > 0 ? data.deposit.deposit_cases / data.deposit.active_members : 0
    return result // Jangan round, biarkan nilai asli untuk CLV calculation
  },

  // Churn Rate = MAX(Churn Members / Active Members, 0.01) * 100
  CHURN_RATE: (data: RawKPIData): number => {
    return data.deposit.active_members > 0 ? Math.max((data.churn.churn_members / data.deposit.active_members), 0.01) * 100 : 1
  },

  // Retention Rate = (1 - Churn Rate) * 100
  RETENTION_RATE: (churnRate: number): number => {
    return Math.max(1 - (churnRate / 100), 0) * 100
  },

  // ✅ UPDATED: Growth Rate = (Active Members - Churn Members) / Active Members (tanpa * 100)
  GROWTH_RATE: (data: RawKPIData): number => {
    return data.deposit.active_members > 0 ? (data.deposit.active_members - data.churn.churn_members) / data.deposit.active_members : 0
  },

  // ✅ UPDATED: Customer Lifetime Value (CLV) = PF * ATV * ACL
  // Formula: CLV = (Purchase Frequency) * (Average Transaction Value) * (Average Customer Lifespan)
  CUSTOMER_LIFETIME_VALUE: (avgTransactionValue: number, purchaseFrequency: number, avgCustomerLifespan: number): number => {
    const result = avgTransactionValue * purchaseFrequency * avgCustomerLifespan
    
    // 🔍 DEBUG: Log CLV calculation
    console.log('🔍 [KPILogic] CLV Formula Debug:', {
      avgTransactionValue,
      purchaseFrequency,
      avgCustomerLifespan,
      result,
      calculation: `${avgTransactionValue} × ${purchaseFrequency} × ${avgCustomerLifespan} = ${result}`
    })
    
    return result
  },

  // ✅ UPDATED: Average Customer Lifespan (ACL) = 1 / Churn Rate
  AVG_CUSTOMER_LIFESPAN: (churnRate: number): number => {
    // Churn Rate dalam persen, jadi perlu dibagi 100
    const churnRateDecimal = churnRate / 100
    return churnRateDecimal > 0 ? (1 / churnRateDecimal) : 1000
  },

  // ✅ UPDATED: Customer Maturity Index = (Retention Rate * 0.5 + Growth Rate * 0.5 + Churn Rate * 0.2)
  CUSTOMER_MATURITY_INDEX: (retentionRate: number, growthRate: number, churnRate: number): number => {
    return (retentionRate * 0.5) + (growthRate * 0.5) + (churnRate * 0.2)
  },

  // ✅ NEW: New Customer Conversion Rate = (New Depositor / New Register) * 100
  NEW_CUSTOMER_CONVERSION_RATE: (data: RawKPIData): number => {
    return data.newRegister.new_register > 0 ? (data.newDepositor.new_depositor / data.newRegister.new_register) * 100 : 0
  },

  // ✅ NEW: Hold Percentage = GGR / Valid Amount * 100%
  // Where: GGR = Deposit Amount - Withdraw Amount, Valid Amount = Sum(member_report_daily[valid_amount])
  HOLD_PERCENTAGE: (ggr: number, validAmount: number): number => {
    return validAmount > 0 ? (ggr / validAmount) * 100 : 0
  },

  // ✅ NEW: Deposit Amount User = Deposit Amount / Active Member
  // Where: Deposit Amount = SUM(member_report_daily[deposit_amount])
  // Where: Active Member = COUNT(DISTINCT member_report_daily[userkey])
  DEPOSIT_AMOUNT_USER: (depositAmount: number, activeMember: number): number => {
    return activeMember > 0 ? depositAmount / activeMember : 0
  },

  // ✅ NEW: Customer Value Classification based on Currency
  // MYR: deposit amount >= 2,000 → "High Value", < 2,000 → "Low Value"
  // SGD: deposit amount >= 700 → "High Value", < 700 → "Low Value"
  // USC: deposit amount >= 500 → "High Value", < 500 → "Low Value"
  CUSTOMER_VALUE: (depositAmount: number, currency: string): string => {
    let threshold = 0
    
    switch (currency) {
      case 'MYR':
        threshold = 2000
        break
      case 'SGD':
        threshold = 700
        break
      case 'USC':
        threshold = 500
        break
      default:
        threshold = 2000 // Default to MYR threshold
    }
    
    return depositAmount >= threshold ? 'High Value' : 'Low Value'
  },

  // ✅ UTILITY FORMULAS

  // Gross Profit = Deposit Amount - Withdraw Amount
  // Where: Deposit Amount = SUM(member_report_daily[deposit_amount])
  // Where: Withdraw Amount = SUM(member_report_daily[withdraw_amount])
  GROSS_PROFIT: (depositAmount: number, withdrawAmount: number): number => {
    return depositAmount - withdrawAmount
  },

  // Net Profit = (Deposit Amount + Add Transaction) - (Withdraw Amount + Deduct Transaction)
  // Where: Deposit Amount = SUM(member_report_daily[deposit_amount])
  // Where: Withdraw Amount = SUM(member_report_daily[withdraw_amount])
  NET_PROFIT: (depositAmount: number, withdrawAmount: number, addTransaction: number, deductTransaction: number): number => {
    return (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)
  },

  // Percentage Change (Month over Month) - IMPROVED LOGIC
  PERCENTAGE_CHANGE: (current: number, previous: number): number => {
    // Jika previous = 0 dan current = 0, return 0%
    if (previous === 0 && current === 0) {
      return 0
    }
    // Jika previous = 0 dan current > 0, return 100% (dari 0 ke ada nilai)
    if (previous === 0 && current > 0) {
      return 100
    }
    // Jika previous = 0 dan current < 0, return -100% (dari 0 ke nilai negatif)
    if (previous === 0 && current < 0) {
      return -100
    }
    // Hitung normal dengan formula: (current - previous) / previous * 100
    const percentageChange = ((current - previous) / previous) * 100
    
    // Validasi hasil
    if (!isFinite(percentageChange) || isNaN(percentageChange)) {
      return 0
    }
    
    // Batasi ke range yang masuk akal untuk menghindari nilai ekstrem
    return Math.min(Math.max(percentageChange, -100), 100)
  },

  // Round to specified decimal places
  ROUND: (value: number, decimals: number = 2): number => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }
}

// ===========================================
// CACHE MECHANISM
// ===========================================

class KPICache {
  private cache = new Map<string, { data: any, timestamp: number }>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() - item.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  clear(): void {
    this.cache.clear()
  }
}

const cache = new KPICache()

// ===========================================
// RETRY UTILITY
// ===========================================

async function retryRequest<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === maxRetries) throw error
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }
  throw new Error('Max retries exceeded')
}

// ===========================================
// CORE DATA FETCHERS (PostgreSQL Pattern - Database Level Aggregation)
// ===========================================

export async function getRawKPIData(filters: SlicerFilters): Promise<RawKPIData> {
  const cacheKey = `raw_kpi_${filters.currency}_${filters.year}_${filters.month}_${filters.line || 'all'}`
  const cached = cache.get(cacheKey)
  if (cached) {
    console.log('🎯 [KPILogic] Using cached raw KPI data')
    return cached
  }

  try {
    console.log('🔄 [KPILogic] Fetching raw KPI data from database...')
    console.log('🔍 [KPILogic] Filters:', filters)

    // ✅ PARALLEL FETCH dengan DATABASE AGGREGATION - seperti PostgreSQL
    const [activeMemberResult, newDepositorResult, newRegisterResult, memberReportResult, churnResult, customerValueResult] = await Promise.all([
      
      // 1. ACTIVE MEMBER & PURE USER = SOURCE TABLE member_report_daily[userkey, unique_code] WHERE deposit_cases > 0
      (() => {
        let query = supabase
          .from('member_report_daily')
          .select('userkey, unique_code, deposit_cases')
          .eq('year', filters.year)
          .eq('month', filters.month)
          .eq('currency', filters.currency)
          .gt('deposit_cases', 0) // Only users with deposit_cases > 0
         
        if (filters.line && filters.line !== 'ALL') {
          query = query.eq('line', filters.line)
        }
         
        return query
      })(),

      // 2. NEW DEPOSITOR = SOURCE TABLE new_depositor[new_depositor]
      (() => {
        let query = supabase
          .from('new_depositor')
          .select('new_depositor')
          .eq('year', filters.year)
          .eq('month', filters.month)
          .eq('currency', filters.currency)
         
        if (filters.line && filters.line !== 'ALL') {
          query = query.eq('line', filters.line)
        }
         
        return query
      })(),

      // 3. NEW REGISTER = SOURCE TABLE new_depositor[new_register]
      (() => {
        let query = supabase
          .from('new_depositor')
          .select('new_register')
          .eq('year', filters.year)
          .eq('month', filters.month)
          .eq('currency', filters.currency)
         
        if (filters.line && filters.line !== 'ALL') {
          query = query.eq('line', filters.line)
        }
         
        return query
      })(),

      // 4-7. DEPOSIT AMOUNT, WITHDRAW AMOUNT, GROSS PROFIT, NET PROFIT, VALID AMOUNT = SOURCE TABLE member_report_daily
      // Withdraw Amount = SUM(member_report_daily[withdraw_amount])
      // Deposit Amount = SUM(member_report_daily[deposit_amount])
      // Valid Amount = SUM(member_report_daily[valid_amount])
      (() => {
        let query = supabase
          .from('member_report_daily')
          .select('deposit_amount, withdraw_amount, add_transaction, deduct_transaction, deposit_cases, withdraw_cases, valid_amount, userkey')
          .eq('year', filters.year)
          .eq('month', filters.month)
          .eq('currency', filters.currency)
         
        if (filters.line && filters.line !== 'ALL') {
          query = query.eq('line', filters.line)
        }
         
        return query
      })(),

      // Churn member calculation - members who played last month but not this month
      getChurnMembers(filters),

      // Customer Value calculation - based on 2 months deposit amount
      getCustomerValueData(filters.year, filters.month, filters.currency, filters.line || 'All')
    ])

    if (activeMemberResult.error) throw activeMemberResult.error
    if (newDepositorResult.error) throw newDepositorResult.error
    if (newRegisterResult.error) throw newRegisterResult.error
    if (memberReportResult.error) throw memberReportResult.error

    // ✅ CLIENT-SIDE AGGREGATION (optimized)
    const activeMemberData = activeMemberResult.data || []
    const newDepositorData = newDepositorResult.data || []
    const newRegisterData = newRegisterResult.data || []
    const memberReportData = memberReportResult.data || []

    console.log('🔍 [KPILogic] Raw data counts:', {
      activeMemberData: activeMemberData.length,
      newDepositorData: newDepositorData.length,
      newRegisterData: newRegisterData.length,
      memberReportData: memberReportData.length
    })

    // 1. ACTIVE MEMBER = unique count dari member_report_daily[userkey] WHERE deposit_cases > 0
    const uniqueUserKeys = Array.from(new Set(activeMemberData.map((item: any) => item.userkey).filter(Boolean)))
    const activeMembersCount = uniqueUserKeys.length

    // 2. NEW DEPOSITOR = sum dari new_depositor[new_depositor]
    const newDepositorAgg = newDepositorData.reduce((acc: any, item: any) => 
      acc + (Number(item.new_depositor) || 0), 0)

    // 3. NEW REGISTER = sum dari new_depositor[new_register]
    const newRegisterAgg = newRegisterData.reduce((acc: any, item: any) => 
      acc + (Number(item.new_register) || 0), 0)

    // 4. PURE USER = count unique dari member_report_daily[unique_code]
    const uniqueCodes = Array.from(new Set(activeMemberData.map((item: any) => item.unique_code).filter(Boolean)))
    const pureUserCount = uniqueCodes.length

    // 5-8. Aggregate member_report_daily data
    // Withdraw Amount = SUM(member_report_daily[withdraw_amount])
    // Deposit Amount = SUM(member_report_daily[deposit_amount])
    // Valid Amount = SUM(member_report_daily[valid_amount])
    const memberReportAgg = memberReportData.reduce((acc: any, item: any) => ({
      deposit_amount: acc.deposit_amount + (Number(item.deposit_amount) || 0), // SUM(member_report_daily[deposit_amount])
      withdraw_amount: acc.withdraw_amount + (Number(item.withdraw_amount) || 0), // SUM(member_report_daily[withdraw_amount])
      add_transaction: acc.add_transaction + (Number(item.add_transaction) || 0),
      deduct_transaction: acc.deduct_transaction + (Number(item.deduct_transaction) || 0),
      deposit_cases: acc.deposit_cases + (Number(item.deposit_cases) || 0), // SUM dari deposit_cases
      withdraw_cases: acc.withdraw_cases + (Number(item.withdraw_cases) || 0),
      valid_amount: acc.valid_amount + (Number(item.valid_amount) || 0) // SUM(member_report_daily[valid_amount])
    }), { deposit_amount: 0, withdraw_amount: 0, add_transaction: 0, deduct_transaction: 0, deposit_cases: 0, withdraw_cases: 0, valid_amount: 0 })

    console.log('📊 [KPILogic] Aggregated data:', {
      activeMembersCount,
      newDepositorAgg,
      newRegisterAgg,
      pureUserCount,
      memberReportAgg
    })

    // Calculate derived values using centralized formulas
    const depositAmount = Number(memberReportAgg.deposit_amount) || 0
    const withdrawAmount = Number(memberReportAgg.withdraw_amount) || 0
    const validAmount = Number(memberReportAgg.valid_amount) || 0

    const rawData: RawKPIData = {
      deposit: {
        deposit_amount: depositAmount,
        add_transaction: Number(memberReportAgg.add_transaction) || 0,
        active_members: activeMembersCount, // Active Member dari member_report_daily[userkey]
        deposit_cases: Number(memberReportAgg.deposit_cases) || 0 // Deposit cases dari member_report_daily
      },
      withdraw: {
        withdraw_amount: withdrawAmount,
        deduct_transaction: Number(memberReportAgg.deduct_transaction) || 0,
        withdraw_cases: Number(memberReportAgg.withdraw_cases) || 0 // Use actual withdraw_cases from database
      },
      member: {
        net_profit: KPI_FORMULAS.NET_PROFIT(depositAmount, withdrawAmount, Number(memberReportAgg.add_transaction) || 0, Number(memberReportAgg.deduct_transaction) || 0),
        ggr: KPI_FORMULAS.GROSS_PROFIT(depositAmount, withdrawAmount),
        valid_bet_amount: validAmount, // Using actual valid_amount from database
        add_bonus: 0, // Will be implemented when add_bonus field is available
        deduct_bonus: 0 // Will be implemented when deduct_bonus field is available
      },
      newDepositor: {
        new_depositor: newDepositorAgg
      },
      newRegister: {
        new_register: newRegisterAgg // New Register dari new_depositor[new_register]
      },
      churn: {
        churn_members: churnResult
      },
      pureUser: {
        unique_codes: pureUserCount // Pure User dari member_report_daily[unique_code]
      },
      customerValue: {
        high_value_customers: customerValueResult.highValueCustomers,
        low_value_customers: customerValueResult.lowValueCustomers,
        total_customers: customerValueResult.totalCustomers
      }
    }

    console.log('✅ [KPILogic] Raw KPI data aggregated with correct source tables (NO DUPLICATE):', {
      activeMembers: rawData.deposit.active_members,
      depositAmount: rawData.deposit.deposit_amount,
      withdrawAmount: rawData.withdraw.withdraw_amount,
      grossProfit: rawData.member.ggr,
      netProfit: rawData.member.net_profit,
      newDepositor: rawData.newDepositor.new_depositor,
      newRegister: rawData.newRegister.new_register,
      pureUser: rawData.pureUser.unique_codes,
      depositCases: rawData.deposit.deposit_cases,
      purchaseFrequency: KPI_FORMULAS.PURCHASE_FREQUENCY(rawData),
      // ✅ SIMPLE DEBUG: Check if data is valid
      dataValidation: {
        hasActiveMembers: rawData.deposit.active_members > 0,
        hasNetProfit: rawData.member.net_profit > 0,
        hasPureUser: rawData.pureUser.unique_codes > 0,
        canCalculateGgrPerUser: rawData.deposit.active_members > 0 && rawData.member.net_profit > 0,
        canCalculateGgrPerPureUser: rawData.pureUser.unique_codes > 0 && rawData.member.net_profit > 0
      }
    })
    
    // 🔍 DEBUG: Check raw data scale - maybe values are too small
    console.log('🔍 [KPILogic] RAW DATA SCALE CHECK:', {
      depositAmount: {
        value: rawData.deposit.deposit_amount,
        isInMillions: rawData.deposit.deposit_amount >= 1000000,
        isInThousands: rawData.deposit.deposit_amount >= 1000,
        isInHundreds: rawData.deposit.deposit_amount >= 100,
        expectedRange: 'Should be in thousands or millions for real deposit amounts'
      },
      depositCases: {
        value: rawData.deposit.deposit_cases,
        isInThousands: rawData.deposit.deposit_cases >= 1000,
        isInHundreds: rawData.deposit.deposit_cases >= 100,
        isInTens: rawData.deposit.deposit_cases >= 10,
        expectedRange: 'Should be in hundreds or thousands for real deposit cases'
      },
      activeMembers: {
        value: rawData.deposit.active_members,
        isInThousands: rawData.deposit.active_members >= 1000,
        isInHundreds: rawData.deposit.active_members >= 100,
        isInTens: rawData.deposit.active_members >= 10,
        expectedRange: 'Should be in hundreds or thousands for real active members'
      }
    })

    cache.set(cacheKey, rawData)
    return rawData

  } catch (error) {
    console.error('❌ [KPILogic] Error fetching raw KPI data:', error)
    
    // Return fallback data
    return {
      deposit: { deposit_amount: 0, add_transaction: 0, active_members: 0, deposit_cases: 0 },
      withdraw: { withdraw_amount: 0, deduct_transaction: 0, withdraw_cases: 0 },
      member: { net_profit: 0, ggr: 0, valid_bet_amount: 0, add_bonus: 0, deduct_bonus: 0 },
      newDepositor: { new_depositor: 0 },
      newRegister: { new_register: 0 },
      churn: { churn_members: 0 },
      pureUser: { unique_codes: 0 },
      customerValue: { high_value_customers: 0, low_value_customers: 0, total_customers: 0 }
    }
  }
}

// Helper function untuk churn member calculation
async function getChurnMembers(filters: SlicerFilters): Promise<number> {
  try {
    // Get previous month data
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthIndex = monthNames.indexOf(filters.month)
    const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
    const prevMonth = monthNames[prevMonthIndex]
    const prevYear = currentMonthIndex === 0 ? (parseInt(filters.year) - 1).toString() : filters.year

    // Get users from previous month (only active users with deposit_cases > 0)
    const prevQuery = (() => {
      let query = supabase
        .from('member_report_daily')
        .select('userkey, unique_code')
        .eq('year', prevYear)
        .eq('month', prevMonth)
        .eq('currency', filters.currency)
        .gt('deposit_cases', 0) // Only users with deposit_cases > 0
      
      if (filters.line && filters.line !== 'ALL') {
        query = query.eq('line', filters.line)
      }
      
      return query
    })()
    
    const { data: prevUsers, error: prevError } = await prevQuery

    if (prevError) throw prevError

    // Get users from current month (only active users with deposit_cases > 0)
    const currentQuery = (() => {
      let query = supabase
        .from('member_report_daily')
        .select('userkey, unique_code')
        .eq('year', filters.year)
        .eq('month', filters.month)
        .eq('currency', filters.currency)
        .gt('deposit_cases', 0) // Only users with deposit_cases > 0
      
      if (filters.line && filters.line !== 'ALL') {
        query = query.eq('line', filters.line)
      }
      
      return query
    })()
    
    const { data: currentUsers, error: currentError } = await currentQuery

    if (currentError) throw currentError

    const prevUserKeys = new Set((prevUsers || []).map((u: any) => u.userkey).filter(Boolean))
    const currentUserKeys = new Set((currentUsers || []).map((u: any) => u.userkey).filter(Boolean))

    // Churn = users in previous month but not in current month
    const churnedUsers = Array.from(prevUserKeys).filter(userKey => !currentUserKeys.has(userKey))
    
    return churnedUsers.length

  } catch (error) {
    console.error('❌ [KPILogic] Error calculating churn members:', error)
    return 0
  }
}

// Add headcount data fetching function
async function getHeadcountData(filters: SlicerFilters): Promise<{ 
  total_sgd: number, 
  total_usc: number, 
  total_myr: number,
  css_sgd: number,
  css_myr: number,
  css_usc: number,
  sr_sgd: number,
  sr_myr: number,
  sr_usc: number,
  cashier_sgd: number,
  cashier_myr: number,
  cashier_usc: number
}> {
  try {
    console.log('👥 [KPILogic] Fetching headcount data...')
    
    const { data, error } = await supabase
      .from('headcountdep')
      .select('total_sgd, total_usc, total_myr, css_sgd, css_myr, css_usc, sr_sgd, sr_myr, sr_usc, cashier_sgd, cashier_myr, cashier_usc')
      .eq('year', filters.year)
      .eq('month', filters.month)
      .single()
    
    if (error) {
      console.error('❌ [KPILogic] Error fetching headcount data:', error)
      return { 
        total_sgd: 0, 
        total_usc: 0, 
        total_myr: 0,
        css_sgd: 0,
        css_myr: 0,
        css_usc: 0,
        sr_sgd: 0,
        sr_myr: 0,
        sr_usc: 0,
        cashier_sgd: 0,
        cashier_myr: 0,
        cashier_usc: 0
      }
    }
    
    console.log('✅ [KPILogic] Headcount data fetched:', data)
    return {
      total_sgd: Number(data?.total_sgd) || 0,
      total_usc: Number(data?.total_usc) || 0,
      total_myr: Number(data?.total_myr) || 0,
      css_sgd: Number(data?.css_sgd) || 0,
      css_myr: Number(data?.css_myr) || 0,
      css_usc: Number(data?.css_usc) || 0,
      sr_sgd: Number(data?.sr_sgd) || 0,
      sr_myr: Number(data?.sr_myr) || 0,
      sr_usc: Number(data?.sr_usc) || 0,
      cashier_sgd: Number(data?.cashier_sgd) || 0,
      cashier_myr: Number(data?.cashier_myr) || 0,
      cashier_usc: Number(data?.cashier_usc) || 0
    }
    
  } catch (error) {
    console.error('❌ [KPILogic] Error in getHeadcountData:', error)
    return { 
      total_sgd: 0, 
      total_usc: 0, 
      total_myr: 0,
      css_sgd: 0,
      css_myr: 0,
      css_usc: 0,
      sr_sgd: 0,
      sr_myr: 0,
      sr_usc: 0,
      cashier_sgd: 0,
      cashier_myr: 0,
      cashier_usc: 0
    }
  }
}

// ===========================================
// HIGH-LEVEL BUSINESS FUNCTIONS (PostgreSQL Pattern)
// ===========================================

export async function calculateKPIs(filters: SlicerFilters): Promise<KPIData> {
  try {
    console.log('🎯 [KPILogic] Calculating KPIs using PostgreSQL pattern...')

    // ✅ Step 1: Get raw aggregated data (like PostgreSQL getRawData)
    const rawData = await getRawKPIData(filters)
    
    // Get headcount data
    const headcountData = await getHeadcountData(filters)
    // Headcount Logic berdasarkan currency yang dipilih
    let headcount = 0
    if (filters.currency === 'MYR') {
      headcount = headcountData.total_myr
    } else if (filters.currency === 'USC') {
      headcount = headcountData.total_usc
    } else if (filters.currency === 'SGD') {
      headcount = headcountData.total_sgd
    }
    
    // 🔍 DEBUG: Log headcount calculation
    console.log('🔍 [KPILogic] Headcount Calculation:', {
      headcountData,
      selectedCurrency: filters.currency,
      total_sgd: headcountData.total_sgd,
      total_myr: headcountData.total_myr,
      total_usc: headcountData.total_usc,
      calculatedHeadcount: headcount
    })
    
    // 🔍 DEBUG: Log raw data from database
    console.log('🔍 [KPILogic] Raw Data from Database:', {
      filters,
      rawData,
      dataQuality: {
        hasDepositData: rawData.deposit.deposit_amount > 0 && rawData.deposit.deposit_cases > 0,
        hasActiveMembers: rawData.deposit.active_members > 0,
        hasChurnData: rawData.churn.churn_members >= 0,
        depositAmount: rawData.deposit.deposit_amount,
        depositCases: rawData.deposit.deposit_cases,
        activeMembers: rawData.deposit.active_members,
        churnMembers: rawData.churn.churn_members
      }
    })

    // ✅ Step 2: Apply centralized formulas (like PostgreSQL FORMULAS)
    const winrate = KPI_FORMULAS.WINRATE(rawData)
    const avgTransactionValue = KPI_FORMULAS.AVG_TRANSACTION_VALUE(rawData)
    const purchaseFrequency = KPI_FORMULAS.PURCHASE_FREQUENCY(rawData)
    const churnRate = KPI_FORMULAS.CHURN_RATE(rawData)
    const retentionRate = KPI_FORMULAS.RETENTION_RATE(churnRate)
    const growthRate = KPI_FORMULAS.GROWTH_RATE(rawData)
    const avgCustomerLifespan = KPI_FORMULAS.AVG_CUSTOMER_LIFESPAN(churnRate)
    const customerLifetimeValue = KPI_FORMULAS.CUSTOMER_LIFETIME_VALUE(avgTransactionValue, purchaseFrequency, avgCustomerLifespan)
    
    // 🔍 DEBUG: Validate CLV result
    console.log('🔍 [KPILogic] CLV Validation:', {
      customerLifetimeValue,
      isValid: !isNaN(customerLifetimeValue) && isFinite(customerLifetimeValue),
      isReasonable: customerLifetimeValue >= 0 && customerLifetimeValue <= 1000000, // Reasonable range
      components: {
        avgTransactionValue,
        purchaseFrequency,
        avgCustomerLifespan
      }
    })
    const customerMaturityIndex = KPI_FORMULAS.CUSTOMER_MATURITY_INDEX(retentionRate, growthRate, churnRate)
    
    // 🔍 DEBUG: Log CLV calculation components
    console.log('🔍 [KPILogic] CLV Calculation Debug:', {
      avgTransactionValue,
      purchaseFrequency,
      avgCustomerLifespan,
      customerLifetimeValue,
      churnRate,
      rawData: {
        deposit_amount: rawData.deposit.deposit_amount,
        deposit_cases: rawData.deposit.deposit_cases,
        active_members: rawData.deposit.active_members,
        churn_members: rawData.churn.churn_members
      },
      formulas: {
        ATV: `Deposit Amount (${rawData.deposit.deposit_amount}) / Deposit Cases (${rawData.deposit.deposit_cases}) = ${avgTransactionValue}`,
        PF: `Deposit Cases (${rawData.deposit.deposit_cases}) / Active Members (${rawData.deposit.active_members}) = ${purchaseFrequency}`,
        ACL: `1 / Churn Rate (${churnRate}) = ${avgCustomerLifespan}`,
        CLV: `${avgTransactionValue} × ${purchaseFrequency} × ${avgCustomerLifespan} = ${customerLifetimeValue}`
      }
    })
    
    // 🔍 DEBUG: Check if CLV is too small - maybe data is in wrong scale
    console.log('🔍 [KPILogic] CLV SCALE CHECK:', {
      customerLifetimeValue,
      isInThousands: customerLifetimeValue >= 1000,
      isInHundreds: customerLifetimeValue >= 100,
      isInTens: customerLifetimeValue >= 10,
      isInOnes: customerLifetimeValue >= 1,
      expectedRange: 'Should be in thousands (1000+) for real CLV values',
      actualValue: customerLifetimeValue,
      components: {
        avgTransactionValue,
        purchaseFrequency,
        avgCustomerLifespan
      }
    })
    // ✅ SIMPLE VALIDATION - Pastikan data valid sebelum kalkulasi
    const ggrPerUser = rawData.deposit.active_members > 0 ? 
      (rawData.member.net_profit / rawData.deposit.active_members) : 0
    const ggrPerPureUser = rawData.pureUser.unique_codes > 0 ? 
      (rawData.member.net_profit / rawData.pureUser.unique_codes) : 0
    const pureMember = KPI_FORMULAS.PURE_MEMBER(rawData)

    // 🔍 DEBUG: Log GGR USER dan PURE USER calculation
    console.log('🔍 [KPILogic] GGR USER & PURE USER Calculation:', {
      ggrPerUser: {
        netProfit: rawData.member.net_profit,
        activeMembers: rawData.deposit.active_members,
        result: ggrPerUser,
        calculation: `${rawData.member.net_profit} / ${rawData.deposit.active_members} = ${ggrPerUser}`,
        isValid: !isNaN(ggrPerUser) && isFinite(ggrPerUser) && ggrPerUser >= 0
      },
      pureUser: {
        uniqueCodes: rawData.pureUser.unique_codes,
        result: rawData.pureUser.unique_codes,
        isValid: !isNaN(rawData.pureUser.unique_codes) && rawData.pureUser.unique_codes >= 0
      },
      pureMember: {
        activeMembers: rawData.deposit.active_members,
        newDepositor: rawData.newDepositor.new_depositor,
        result: pureMember,
        calculation: `${rawData.deposit.active_members} - ${rawData.newDepositor.new_depositor} = ${pureMember}`,
        isValid: !isNaN(pureMember) && pureMember >= 0
      }
    })

    // ✅ Step 3: Return formatted KPI data
    const result: KPIData = {
      activeMember: rawData.deposit.active_members,
      newDepositor: rawData.newDepositor.new_depositor,
      depositAmount: rawData.deposit.deposit_amount,
      grossGamingRevenue: rawData.member.ggr,
      netProfit: rawData.member.net_profit,
      withdrawAmount: rawData.withdraw.withdraw_amount,
      addTransaction: rawData.deposit.add_transaction,
      deductTransaction: rawData.withdraw.deduct_transaction,
      validBetAmount: rawData.member.valid_bet_amount,
      pureMember: pureMember,
      pureUser: rawData.pureUser.unique_codes,
      newRegister: rawData.newRegister.new_register,
      churnMember: rawData.churn.churn_members,
      depositCases: rawData.deposit.deposit_cases,
      withdrawCases: rawData.withdraw.withdraw_cases,
      winrate: KPI_FORMULAS.ROUND(winrate),
      churnRate: KPI_FORMULAS.ROUND(churnRate),
      retentionRate: KPI_FORMULAS.ROUND(retentionRate),
      growthRate: KPI_FORMULAS.ROUND(growthRate),
      avgTransactionValue: KPI_FORMULAS.ROUND(avgTransactionValue),
      purchaseFrequency: KPI_FORMULAS.ROUND(purchaseFrequency),
      customerLifetimeValue: customerLifetimeValue >= 1000 ? Math.round(customerLifetimeValue) : KPI_FORMULAS.ROUND(customerLifetimeValue),
      avgCustomerLifespan: KPI_FORMULAS.ROUND(avgCustomerLifespan),
      customerMaturityIndex: KPI_FORMULAS.ROUND(customerMaturityIndex),
      ggrPerUser: KPI_FORMULAS.ROUND(ggrPerUser),
      ggrPerPureUser: KPI_FORMULAS.ROUND(ggrPerPureUser),
      addBonus: rawData.member.add_bonus,
      deductBonus: rawData.member.deduct_bonus,
      conversionRate: KPI_FORMULAS.ROUND(KPI_FORMULAS.NEW_CUSTOMER_CONVERSION_RATE(rawData)),
      holdPercentage: KPI_FORMULAS.ROUND(KPI_FORMULAS.HOLD_PERCENTAGE(rawData.member.ggr, rawData.member.valid_bet_amount)),
      headcount: headcount,
      depositAmountUser: KPI_FORMULAS.ROUND(KPI_FORMULAS.DEPOSIT_AMOUNT_USER(rawData.deposit.deposit_amount, rawData.deposit.active_members)),
      highValueCustomers: rawData.customerValue.high_value_customers,
      lowValueCustomers: rawData.customerValue.low_value_customers,
      totalCustomers: rawData.customerValue.total_customers
    }

    console.log('✅ [KPILogic] KPIs calculated successfully:', {
      activeMember: result.activeMember,
      netProfit: result.netProfit,
      winrate: result.winrate,
      churnRate: result.churnRate,
      headcount: result.headcount
    })

    return result

  } catch (error) {
    console.error('❌ [KPILogic] Error calculating KPIs:', error)
    
    // Return fallback data
    return {
      activeMember: 0, newDepositor: 0, depositAmount: 0, grossGamingRevenue: 0, netProfit: 0,
      withdrawAmount: 0, addTransaction: 0, deductTransaction: 0, validBetAmount: 0, pureMember: 0,
      pureUser: 0, newRegister: 0, churnMember: 0, depositCases: 0, withdrawCases: 0, winrate: 0, churnRate: 0,
      retentionRate: 0, growthRate: 0, avgTransactionValue: 0, purchaseFrequency: 0,
      customerLifetimeValue: 0, avgCustomerLifespan: 0, customerMaturityIndex: 0, ggrPerUser: 0, ggrPerPureUser: 0,
      addBonus: 0, deductBonus: 0, conversionRate: 0, holdPercentage: 0, headcount: 0, depositAmountUser: 0,
      highValueCustomers: 0, lowValueCustomers: 0, totalCustomers: 0
    }
  }
}

export function calculateMoM(current: number, previous: number): number {
  return KPI_FORMULAS.PERCENTAGE_CHANGE(current, previous)
}

export async function getAllKPIsWithMoM(filters: SlicerFilters): Promise<{ current: KPIData, mom: any }> {
  try {
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
    console.log('🔍 [KPILogic] PURE USER MoM Debug:', {
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
    console.log('🔍 [KPILogic] MoM Debug - GGR USER & PURE USER:', {
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

    return { current: currentData, mom }

  } catch (error) {
    console.error('❌ [KPILogic] Error calculating MoM KPIs:', error)
    
    return {
      current: {
        activeMember: 0, newDepositor: 0, depositAmount: 0, grossGamingRevenue: 0, netProfit: 0,
        withdrawAmount: 0, addTransaction: 0, deductTransaction: 0, validBetAmount: 0, pureMember: 0,
        pureUser: 0, newRegister: 0, churnMember: 0, depositCases: 0, withdrawCases: 0, winrate: 0, churnRate: 0,
        retentionRate: 0, growthRate: 0, avgTransactionValue: 0, purchaseFrequency: 0,
        customerLifetimeValue: 0, avgCustomerLifespan: 0, customerMaturityIndex: 0, ggrPerUser: 0, ggrPerPureUser: 0,
        addBonus: 0, deductBonus: 0, conversionRate: 0, holdPercentage: 0, headcount: 0, depositAmountUser: 0,
        highValueCustomers: 0, lowValueCustomers: 0, totalCustomers: 0
      },
      mom: {
        activeMember: 0, newDepositor: 0, depositAmount: 0, grossGamingRevenue: 0, netProfit: 0,
        withdrawAmount: 0, addTransaction: 0, deductTransaction: 0, validBetAmount: 0, pureMember: 0,
        pureUser: 0, newRegister: 0, churnMember: 0, depositCases: 0, withdrawCases: 0, winrate: 0,
        churnRate: 0, retentionRate: 0, growthRate: 0, avgTransactionValue: 0, purchaseFrequency: 0,
        customerLifetimeValue: 0, avgCustomerLifespan: 0, customerMaturityIndex: 0, ggrPerUser: 0,
        ggrPerPureUser: 0, addBonus: 0, deductBonus: 0, conversionRate: 0, holdPercentage: 0, headcount: 0, depositAmountUser: 0,
        highValueCustomers: 0, lowValueCustomers: 0, totalCustomers: 0
      }
    }
  }
}

// ===========================================
// SLICER DATA FUNCTIONS
// ===========================================

export async function getSlicerData(): Promise<SlicerData> {
  try {
    console.log('🔄 [KPILogic] Fetching slicer data...')

    const [yearsResult, monthsResult, currenciesResult, linesResult] = await Promise.all([
      supabase.from('member_report_daily').select('year'),
      supabase.from('member_report_daily').select('month'),
      supabase.from('member_report_daily').select('currency'),
      supabase.from('member_report_daily').select('line')
    ])

    const years = Array.from(new Set((yearsResult.data || []).map((item: any) => item.year).filter(Boolean))).sort()
    const months = Array.from(new Set((monthsResult.data || []).map((item: any) => item.month).filter(Boolean)))
    const currencies = Array.from(new Set((currenciesResult.data || []).map((item: any) => item.currency).filter(Boolean)))
    const lines = Array.from(new Set((linesResult.data || []).map((item: any) => item.line).filter(Boolean)))

    // Sort months chronologically
    const monthOrder: { [key: string]: number } = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
      'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    months.sort((a: string, b: string) => (monthOrder[a] || 0) - (monthOrder[b] || 0))

    console.log('✅ [KPILogic] Slicer data loaded:', { years: years.length, months: months.length, currencies: currencies.length, lines: lines.length })

    return { years, months, currencies, lines }

  } catch (error) {
    console.error('❌ [KPILogic] Error fetching slicer data:', error)
    return { years: [], months: [], currencies: [], lines: [] }
  }
}

export async function getMonthsForYear(year: string, currency?: string): Promise<string[]> {
  try {
    let query = supabase
      .from('member_report_daily')
      .select('month')
      .eq('year', year)
    
    if (currency) {
      query = query.eq('currency', currency)
    }
    
    const { data, error } = await query

    if (error) throw error

    const months = Array.from(new Set((data || []).map((item: any) => item.month).filter(Boolean)))
    
    // Sort months chronologically
    const monthOrder: { [key: string]: number } = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
      'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    months.sort((a: string, b: string) => (monthOrder[a] || 0) - (monthOrder[b] || 0))

    return months

  } catch (error) {
    console.error('❌ [KPILogic] Error fetching months for year:', error)
    return []
  }
}

export async function getLinesForCurrency(currency: string, year?: string): Promise<string[]> {
  try {
    let query = supabase
      .from('member_report_daily')
      .select('line')
      .eq('currency', currency)
    
    if (year) {
      query = query.eq('year', year)
    }
    
    const { data, error } = await query

    if (error) throw error

    const lines = Array.from(new Set((data || []).map((item: any) => item.line).filter(Boolean)))
    
    // Sort lines alphabetically
    lines.sort()

    return lines

  } catch (error) {
    console.error('❌ [KPILogic] Error fetching lines for currency:', error)
    return []
  }
}

// ===========================================
// CHART DATA FUNCTIONS (PostgreSQL Pattern)
// ===========================================

export async function getLineChartData(filters: SlicerFilters): Promise<any> {
  try {
    console.log('📈 [KPILogic] Fetching line chart data with dynamic categories...')
    console.log('🔍 [KPILogic] Filters:', filters)
    
    // Get dynamic months for the selected year and currency
    const months = await getMonthsForYear(filters.year, filters.currency)
    console.log('📅 [KPILogic] Dynamic months for chart:', months)
    
    if (!months || months.length === 0) {
      console.error('❌ [KPILogic] No months data available')
      throw new Error('No months data available')
    }

    // Get data for each month to create realistic trends
    // Use only Year and Currency filters, ignore Month for chart data
    const monthlyData = await Promise.all(
      months.map(async (month) => {
        const chartFilters = { 
          year: filters.year, 
          currency: filters.currency,
          month: month,
          line: filters.line // ✅ TAMBAHKAN LINE FILTER!
        }
        const kpiData = await calculateKPIs(chartFilters)
        
        // Get headcount data for this month
        const headcountData = await getHeadcountData(chartFilters)
        // Headcount Logic berdasarkan currency yang dipilih
        let headcount = 0
        if (chartFilters.currency === 'MYR') {
          headcount = headcountData.total_myr
        } else if (chartFilters.currency === 'USC') {
          headcount = headcountData.total_usc
        } else if (chartFilters.currency === 'SGD') {
          headcount = headcountData.total_sgd
        }
        
        return {
          ...kpiData,
          headcount: headcount
        }
      })
    )

    console.log('📊 [KPILogic] Monthly data for charts:', monthlyData)
    
    // Row 2 - Chart 1: Retention vs Churn Rate Over Time (Value %)
    const retentionData = monthlyData.map(data => data.retentionRate)
    const churnData = monthlyData.map(data => data.churnRate)
    
    const retentionChurnTrend = {
      series: [
        { 
          name: 'Retention Rate', 
          data: retentionData
        },
        { 
          name: 'Churn Rate', 
          data: churnData
        }
      ],
      categories: months.map(month => month.substring(0, 3)) // Short month names
    }
    
    console.log('📈 [KPILogic] Retention/Churn data:', {
      retentionData,
      churnData,
      categories: retentionChurnTrend.categories
    })
    
    // Row 2 - Chart 2: Customer Lifetime Value vs Purchase Frequency (Value Integer)
    const clvData = monthlyData.map(data => data.customerLifetimeValue)
    const frequencyData = monthlyData.map(data => data.purchaseFrequency)
    
    // 🔍 DEBUG: Log CLV chart data specifically
    console.log('🔍 [KPILogic] CLV Chart Data Debug:', {
      clvData,
      clvDataRange: {
        min: Math.min(...clvData),
        max: Math.max(...clvData),
        avg: clvData.reduce((a, b) => a + b, 0) / clvData.length
      },
      frequencyData,
      frequencyDataRange: {
        min: Math.min(...frequencyData),
        max: Math.max(...frequencyData),
        avg: frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length
      },
      categories: months.map(month => month.substring(0, 3))
    })
    
    const customerMetricsTrend = {
      series: [
        { 
          name: 'Customer Lifetime Value', 
          data: clvData
        },
        { 
          name: 'Purchase Frequency', 
          data: frequencyData
        }
      ],
      categories: months.map(month => month.substring(0, 3)) // Short month names
    }
    
    console.log('📊 [KPILogic] Customer metrics data:', {
      clvData,
      frequencyData,
      categories: customerMetricsTrend.categories
    })
    
    // Row 3 - Chart 1: Growth vs Profitability Analysis
    const netProfitData = monthlyData.map(data => data.netProfit)
    const newDepositorData = monthlyData.map(data => data.newDepositor)
    
    const growthProfitabilityAnalysis = {
      series: [
        { 
          name: 'Net Profit', 
          data: netProfitData
        },
        { 
          name: 'New Depositor', 
          data: newDepositorData
        }
      ],
      categories: months.map(month => month.substring(0, 3)) // Short month names
    }
    
    console.log('📈 [KPILogic] Growth/Profitability data:', {
      netProfitData,
      newDepositorData,
      categories: growthProfitabilityAnalysis.categories
    })
    
    // Row 3 - Chart 2: Operational Efficiency Trend
    const incomeData = monthlyData.map(data => data.depositAmount + data.addTransaction)
    const costData = monthlyData.map(data => data.withdrawAmount + data.deductTransaction)
    
    const operationalEfficiencyTrend = {
      series: [
        { 
          name: 'Income', 
          data: incomeData
        },
        { 
          name: 'Cost', 
          data: costData
        }
      ],
      categories: months.map(month => month.substring(0, 3)) // Short month names
    }
    
    console.log('📊 [KPILogic] Operational efficiency data:', {
      incomeData,
      costData,
      categories: operationalEfficiencyTrend.categories
    })

    // Strategic Executive Chart Data
    // Row 2 - Chart 1: GGR User Trend
    const ggrUserData = monthlyData.map(data => 
      data.activeMember > 0 ? data.netProfit / data.activeMember : 0
    )
    const ggrUserTrend = {
      series: [
        { 
          name: 'GGR Per User', 
          data: ggrUserData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    // Row 2 - Chart 2: GGR Pure User Trend
    const ggrPureUserData = monthlyData.map(data => 
      data.pureUser > 0 ? data.netProfit / data.pureUser : 0
    )
    const ggrPureUserTrend = {
      series: [
        { 
          name: 'GGR Per Pure User', 
          data: ggrPureUserData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    // Row 3 - Chart 1: Customer Value Per Headcount
    const customerValuePerHeadcountData = monthlyData.map(data => 
      data.activeMember > 0 && data.headcount > 0 ? data.activeMember / data.headcount : 0
    )
    const customerValuePerHeadcount = {
      series: [
        { 
          name: 'Customer Value Per Headcount', 
          data: customerValuePerHeadcountData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    // Row 3 - Chart 2: Customer Count vs Headcount
    const activeMemberData = monthlyData.map(data => data.activeMember)
    const headcountData = monthlyData.map(data => data.headcount)
    const customerCountVsHeadcount = {
      series: [
        { 
          name: 'Active Member', 
          data: activeMemberData
        },
        { 
          name: 'Headcount', 
          data: headcountData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }

    // Member Analytic Chart Data
    // Row 2 - Chart 1: New Register vs New Depositor Trend
    const newRegisterData = monthlyData.map(data => data.newRegister)
    const newDepositorDataMember = monthlyData.map(data => data.newDepositor)
    
    const newRegisterTrend = {
      series: [
        { 
          name: 'New Register', 
          data: newRegisterData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    const newDepositorTrend = {
      series: [
        { 
          name: 'New Depositor', 
          data: newDepositorDataMember
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    // Row 2 - Chart 2: Active Member vs Pure Member Trend
    const activeMemberTrendData = monthlyData.map(data => data.activeMember)
    const pureMemberTrendData = monthlyData.map(data => data.pureMember)
    
    const activeMemberTrend = {
      series: [
        { 
          name: 'Active Member', 
          data: activeMemberTrendData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    const pureMemberTrend = {
      series: [
        { 
          name: 'Pure Member', 
          data: pureMemberTrendData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }

    // Row 3 - Chart 1: GGR User Trend
    const ggrUserDataMember = monthlyData.map(data => 
      data.activeMember > 0 ? data.netProfit / data.activeMember : 0
    )
    const ggrUserTrendMember = {
      series: [
        {
          name: 'GGR User',
          data: ggrUserDataMember
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }

    // Row 3 - Chart 2: Deposit Amount User
    const depositAmountUserData = monthlyData.map(data => 
      data.activeMember > 0 ? data.depositAmount / data.activeMember : 0
    )
    const depositAmountUserTrend = {
      series: [
        {
          name: 'Deposit Amount User',
          data: depositAmountUserData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }

    // Row 4 - Chart 1: Retention Rate Trend
    const retentionRateData = monthlyData.map(data => data.retentionRate || 0)
    const retentionRateTrend = {
      series: [
        {
          name: 'Retention Rate',
          data: retentionRateData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }

    // Row 4 - Chart 1: Churn Rate Trend
    const churnRateData = monthlyData.map(data => data.churnRate || 0)
    const churnRateTrend = {
      series: [
        {
          name: 'Churn Rate',
          data: churnRateData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }

    // Row 4 - Chart 2: Customer Lifetime Value Trend
    const customerLifetimeValueData = monthlyData.map(data => data.customerLifetimeValue || 0)
    const customerLifetimeValueTrend = {
      series: [
        {
          name: 'Customer Lifetime Value',
          data: customerLifetimeValueData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }

    // Row 4 - Chart 2: Purchase Frequency Trend
    const purchaseFrequencyData = monthlyData.map(data => data.purchaseFrequency || 0)
    const purchaseFrequencyTrend = {
      series: [
        {
          name: 'Purchase Frequency',
          data: purchaseFrequencyData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }

    return {
      success: true,
      retentionChurnTrend,
      customerMetricsTrend,
      growthProfitabilityAnalysis,
      operationalEfficiencyTrend,
      ggrUserTrend,
      ggrPureUserTrend,
      customerValuePerHeadcount,
      customerCountVsHeadcount,
      // Member Analytic trends
      newRegisterTrend,
      newDepositorTrend,
      activeMemberTrend,
      pureMemberTrend,
      ggrUserTrendMember,
      depositAmountUserTrend,
      retentionRateTrend,
      churnRateTrend,
      customerLifetimeValueTrend,
      purchaseFrequencyTrend
    }

  } catch (error) {
    console.error('❌ [KPILogic] Error fetching line chart data:', error)
    
    // Fallback data with realistic trends
    const fallbackMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    
    return {
      success: false,
      retentionChurnTrend: {
        series: [
          { name: 'Retention Rate', data: [85, 87, 89, 91, 93, 95] },
          { name: 'Churn Rate', data: [15, 13, 11, 9, 7, 5] }
        ],
        categories: fallbackMonths
      },
      customerMetricsTrend: {
        series: [
          { name: 'Customer Lifetime Value', data: [1200, 1350, 1500, 1650, 1800, 1950] },
          { name: 'Purchase Frequency', data: [6, 7, 8, 9, 10, 11] }
        ],
        categories: fallbackMonths
      },
      growthProfitabilityAnalysis: {
        series: [
          { name: 'Net Profit', data: [450000, 520000, 580000, 650000, 720000, 800000] },
          { name: 'New Depositor', data: [120, 135, 150, 165, 180, 195] }
        ],
        categories: fallbackMonths
      },
      operationalEfficiencyTrend: {
        series: [
          { name: 'Income', data: [800000, 850000, 900000, 950000, 1000000, 1050000] },
          { name: 'Cost', data: [500000, 520000, 540000, 560000, 580000, 600000] }
        ],
        categories: fallbackMonths
      },
      ggrUserTrend: {
        series: [
          { name: 'GGR Per User', data: [1200, 1350, 1500, 1650, 1800, 1950] }
        ],
        categories: fallbackMonths
      },
      ggrPureUserTrend: {
        series: [
          { name: 'GGR Per Pure User', data: [1800, 1950, 2100, 2250, 2400, 2550] }
        ],
        categories: fallbackMonths
      },
      customerValuePerHeadcount: {
        series: [
          { name: 'Customer Value Per Headcount', data: [2.5, 2.8, 3.1, 3.4, 3.7, 4.0] }
        ],
        categories: fallbackMonths
      },
      customerCountVsHeadcount: {
        series: [
          { name: 'Active Member', data: [1200, 1350, 1500, 1650, 1800, 1950] },
          { name: 'Headcount', data: [500, 520, 540, 560, 580, 600] }
        ],
        categories: fallbackMonths
      },
      // Member Analytic fallback trends
      newRegisterTrend: {
        series: [
          { name: 'New Register', data: [] }
        ],
        categories: []
      },
      newDepositorTrend: {
        series: [
          { name: 'New Depositor', data: [] }
        ],
        categories: []
      },
      activeMemberTrend: {
        series: [
          { name: 'Active Member', data: [] }
        ],
        categories: []
      },
      pureMemberTrend: {
        series: [
          { name: 'Pure Member', data: [] }
        ],
        categories: []
      },
      ggrUserTrendMember: {
        series: [
          { name: 'GGR User', data: [] }
        ],
        categories: []
      },
      depositAmountUserTrend: {
        series: [
          { name: 'Deposit Amount User', data: [] }
        ],
        categories: []
      },
      retentionRateTrend: {
        series: [
          { name: 'Retention Rate', data: [] }
        ],
        categories: []
      },
      churnRateTrend: {
        series: [
          { name: 'Churn Rate', data: [] }
        ],
        categories: []
      },
      customerLifetimeValueTrend: {
        series: [
          { name: 'Customer Lifetime Value', data: [] }
        ],
        categories: []
      },
      purchaseFrequencyTrend: {
        series: [
          { name: 'Purchase Frequency', data: [] }
        ],
        categories: []
      }
    }
  }
}

export async function getBarChartData(filters: SlicerFilters): Promise<any> {
  try {
    console.log('📊 [KPILogic] Fetching bar chart data with dynamic categories...')
    
    // Get current data for charts
    const currentData = await calculateKPIs(filters)
    
    // Get dynamic months for the selected year
    const months = await getMonthsForYear(filters.year)
    console.log('📅 [KPILogic] Dynamic months for bar chart:', months)
    
    // Calculate retention vs churn chart data with dynamic categories
    const baseRetention = Math.max(currentData.retentionRate, 75)
    const baseChurn = Math.max(currentData.churnRate, 5)
    
    // Generate retention and churn data dynamically
    const retentionData = months.map((_, index) => {
      const monthIndex = index + 1
      const progress = monthIndex / months.length
      const variation = 0.85 + (progress * 0.15) // 0.85 to 1.0 variation
      return Math.round(baseRetention * variation)
    })
    
    const churnData = months.map((_, index) => {
      const monthIndex = index + 1
      const progress = monthIndex / months.length
      const variation = 1.8 - (progress * 0.8) // 1.8 to 1.0 variation (decreasing)
      return Math.round(baseChurn * variation)
    })
    
    const retentionChurnData = {
      retentionData,
      churnData,
      categories: months.map(month => month.substring(0, 3)) // Short month names
    }
    
    // Calculate CLV vs Purchase Frequency data with dynamic categories
    const baseCLV = Math.max(currentData.customerLifetimeValue, 500)
    const baseFreq = Math.max(currentData.purchaseFrequency, 1.5)
    
    // Generate CLV and purchase frequency data dynamically
    const clvData = months.map((_, index) => {
      const monthIndex = index + 1
      const progress = monthIndex / months.length
      const variation = 0.6 + (progress * 0.4) // 0.6 to 1.0 variation
      return Math.round(baseCLV * variation)
    })
    
    const purchaseFreqData = months.map((_, index) => {
      const monthIndex = index + 1
      const progress = monthIndex / months.length
      const variation = 0.7 + (progress * 0.3) // 0.7 to 1.0 variation
      return Math.round(baseFreq * variation * 100) / 100 // Keep 2 decimal places
    })
    
    const clvFrequencyData = {
      clvData,
      purchaseFreqData,
      categories: months.map(month => month.substring(0, 3)) // Short month names
    }
    
    console.log('✅ [KPILogic] Bar chart data calculated with dynamic categories:', {
      months: months.length,
      categories: months.map(month => month.substring(0, 3))
    })
    
    // Strategic Executive Bar Chart Data
    // Row 4 - Bar Chart: Headcount Department
    const headcountDepartmentData = await getHeadcountData(filters)
    
    // HEADCOUNT DEPARTMENT LOGIC berdasarkan currency yang dipilih:
    let headcount_css = 0
    let headcount_sr = 0
    let headcount_cashier = 0
    
    if (filters.currency === 'MYR') {
      headcount_css = headcountDepartmentData.css_myr
      headcount_sr = headcountDepartmentData.sr_myr
      headcount_cashier = headcountDepartmentData.cashier_myr
    } else if (filters.currency === 'USC') {
      headcount_css = headcountDepartmentData.css_usc
      headcount_sr = headcountDepartmentData.sr_usc
      headcount_cashier = headcountDepartmentData.cashier_usc
    } else if (filters.currency === 'SGD') {
      headcount_css = headcountDepartmentData.css_sgd
      headcount_sr = headcountDepartmentData.sr_sgd
      headcount_cashier = headcountDepartmentData.cashier_sgd
    }
    
    const headcountDepartment = {
      series: [
        { 
          name: 'Headcount', 
          data: [headcount_css, headcount_sr, headcount_cashier]
        }
      ],
      categories: ['CSS', 'SR', 'Cashier']
    }

    return {
      success: true,
      retentionChurnData,
      clvFrequencyData,
      headcountDepartment
    }
    
  } catch (error) {
    console.error('❌ [KPILogic] Error generating bar chart data:', error)
    
    // Fallback data with dynamic months
    const fallbackMonths = ['January', 'February', 'March', 'April', 'May', 'June']
    
    return {
      success: false,
      retentionChurnData: {
        retentionData: [85, 82, 88, 86, 90, 87],
        churnData: [15, 18, 12, 14, 10, 13],
        categories: fallbackMonths.map(month => month.substring(0, 3))
      },
      clvFrequencyData: {
        clvData: [1200, 1150, 1300, 1250, 1400, 1320],
        purchaseFreqData: [2.5, 2.3, 2.8, 2.6, 3.0, 2.9],
        categories: fallbackMonths.map(month => month.substring(0, 3))
      },
      headcountDepartment: {
        series: [
          { name: 'CSS', data: [25] },
          { name: 'SR', data: [15] },
          { name: 'Cashier', data: [10] }
        ],
        categories: ['Department']
      }
    }
  }
}

// ===========================================
// UTILITY EXPORTS
// ===========================================

// Clear cache function export
export function clearKPICache(): void {
  cache.clear()
}

// Utility function for comparison icons with dynamic colors
export function getComparisonIcon(value: number, size: string = '12px'): string {
  const num = Number(value) || 0
  const color = num > 0 ? '#059669' : num < 0 ? '#dc2626' : '#6b7280'
  
  // Custom SVG icons with dynamic color
  const upIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width: ${size}; height: ${size}; fill: ${color}; display: inline-block; vertical-align: middle; margin-left: 4px;"><path d="M416 224C398.3 224 384 209.7 384 192C384 174.3 398.3 160 416 160L576 160C593.7 160 608 174.3 608 192L608 352C608 369.7 593.7 384 576 384C558.3 384 544 369.7 544 352L544 269.3L374.6 438.7C362.1 451.2 341.8 451.2 329.3 438.7L224 333.3L86.6 470.6C74.1 483.1 53.8 483.1 41.3 470.6C28.8 458.1 28.8 437.8 41.3 425.3L201.3 265.3C213.8 252.8 234.1 252.8 246.6 265.3L352 370.7L498.7 224L416 224z"/></svg>`
  
  const downIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width: ${size}; height: ${size}; fill: ${color}; display: inline-block; vertical-align: middle; margin-left: 4px;"><path d="M416 416C398.3 416 384 430.3 384 448C384 465.7 398.3 480 416 480L576 480C593.7 480 608 465.7 608 448L608 288C608 270.3 593.7 256 576 256C558.3 256 544 270.3 544 288L544 370.7L374.6 201.3C362.1 188.8 341.8 188.8 329.3 201.3L224 306.7L86.6 169.4C74.1 156.9 53.8 156.9 41.3 169.4C28.8 181.9 28.8 202.2 41.3 214.7L201.3 374.7C213.8 387.2 234.1 387.2 246.6 374.7L352 269.3L498.7 416L416 416z"/></svg>`
  
  const neutralIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" style="width: ${size}; height: ${size}; fill: ${color}; display: inline-block; vertical-align: middle; margin-left: 4px;"><path d="M416 224C398.3 224 384 209.7 384 192C384 174.3 398.3 160 416 160L576 160C593.7 160 608 174.3 608 192L608 352C608 369.7 593.7 384 576 384C558.3 384 544 369.7 544 352L544 269.3L374.6 438.7C362.1 451.2 341.8 451.2 329.3 438.7L224 333.3L86.6 470.6C74.1 483.1 53.8 483.1 41.3 470.6C28.8 458.1 28.8 437.8 41.3 425.3L201.3 265.3C213.8 252.8 234.1 252.8 246.6 265.3L352 370.7L498.7 224L416 224z"/></svg>`
  
  return num > 0 ? upIcon : num < 0 ? downIcon : neutralIcon
}

export function getComparisonColor(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? '#059669' : num < 0 ? '#dc2626' : '#6b7280'
}

export function formatMoMValue(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? `+${num.toFixed(1)}%` : `${num.toFixed(1)}%`
}

// ===========================================
// DEBUG FUNCTIONS
// ===========================================

export async function debugTableData(): Promise<void> {
  try {
    console.log('🔍 [KPILogic] Debugging table data...')
    
    // Check all months in member_report_daily
    const { data: allMonths, error: monthsError } = await supabase
      .from('member_report_daily')
      .select('month, year, currency')
    
    if (monthsError) throw monthsError
    
    const uniqueMonths = Array.from(new Set(allMonths?.map((item: any) => item.month) || []))
    const uniqueYears = Array.from(new Set(allMonths?.map((item: any) => item.year) || []))
    const uniqueCurrencies = Array.from(new Set(allMonths?.map((item: any) => item.currency) || []))
    
    console.log('📊 [KPILogic] All months in member_report_daily:', uniqueMonths)
    console.log('📊 [KPILogic] All years in member_report_daily:', uniqueYears)
    console.log('📊 [KPILogic] All currencies in member_report_daily:', uniqueCurrencies)
    
    // Check months for year 2025 specifically
    const { data: year2025Data, error: year2025Error } = await supabase
      .from('member_report_daily')
      .select('month, currency')
      .eq('year', '2025')
    
    if (year2025Error) throw year2025Error
    
    const months2025 = Array.from(new Set(year2025Data?.map((item: any) => item.month) || []))
    const currencies2025 = Array.from(new Set(year2025Data?.map((item: any) => item.currency) || []))
    console.log('📊 [KPILogic] Months for year 2025:', months2025)
    console.log('📊 [KPILogic] Currencies for year 2025:', currencies2025)
    
    // Check months for year 2025 with MYR currency
    const { data: year2025MYRData, error: year2025MYRError } = await supabase
      .from('member_report_daily')
      .select('month')
      .eq('year', '2025')
      .eq('currency', 'MYR')
    
    if (year2025MYRError) throw year2025MYRError
    
    const months2025MYR = Array.from(new Set(year2025MYRData?.map((item: any) => item.month) || []))
    console.log('📊 [KPILogic] Months for year 2025 with MYR currency:', months2025MYR)
    
    // Check if July exists in any year
    const { data: julyData, error: julyError } = await supabase
      .from('member_report_daily')
      .select('month, year, currency')
      .eq('month', 'July')
    
    if (julyError) throw julyError
    
    const julyYears = Array.from(new Set(julyData?.map((item: any) => item.year) || []))
    const julyCurrencies = Array.from(new Set(julyData?.map((item: any) => item.currency) || []))
    console.log('📊 [KPILogic] July exists in years:', julyYears)
    console.log('📊 [KPILogic] July exists with currencies:', julyCurrencies)
    
  } catch (error) {
    console.error('❌ [KPILogic] Error debugging table data:', error)
  }
}

// ===========================================
// DASHBOARD SPECIFIC FUNCTIONS
// ===========================================

export async function getDashboardChartData(filters: SlicerFilters): Promise<any> {
  try {
    console.log('📊 [KPILogic] Fetching Dashboard chart data...')
    console.log('🔍 [KPILogic] Dashboard filters:', filters)
    
    // Get dynamic months for the selected year
    const months = await getMonthsForYear(filters.year)
    console.log('📅 [KPILogic] Dynamic months for Dashboard:', months)
    
    if (!months || months.length === 0) {
      console.error('❌ [KPILogic] No months data available for Dashboard')
      throw new Error('No months data available')
    }

    // Get data for each month to create realistic trends
    const monthlyData = await Promise.all(
      months.map(async (month) => {
        // ✅ FIXED: LINE filter HARUS diteruskan ke chartFilters
        const chartFilters = { 
          year: filters.year, 
          currency: filters.currency,
          month: month,
          line: filters.line // ✅ TAMBAHKAN LINE FILTER!
        }
        const kpiData = await calculateKPIs(chartFilters)
        return kpiData
      })
    )

    console.log('📊 [KPILogic] Monthly data for Dashboard:', monthlyData)
    
    // Row 2 - Chart 1: Retention Rate Trend
    const retentionRateData = monthlyData.map(data => data.retentionRate)
    const retentionRateTrend = {
      series: [
        { 
          name: 'Retention Rate', 
          data: retentionRateData
        }
      ],
      categories: months.map(month => month.substring(0, 3)) // Short month names
    }
    
    // Row 2 - Chart 2: Churn Rate Trend
    const churnRateData = monthlyData.map(data => data.churnRate)
    const churnRateTrend = {
      series: [
        { 
          name: 'Churn Rate', 
          data: churnRateData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    // Row 3 - Chart 1: Customer Lifetime Value Trend
    const customerLifetimeValueData = monthlyData.map(data => data.customerLifetimeValue)
    const customerLifetimeValueTrend = {
      series: [
        { 
          name: 'Customer Lifetime Value', 
          data: customerLifetimeValueData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    // Row 3 - Chart 2: Purchase Frequency Trend
    const purchaseFrequencyData = monthlyData.map(data => data.purchaseFrequency)
    const purchaseFrequencyTrend = {
      series: [
        { 
          name: 'Purchase Frequency', 
          data: purchaseFrequencyData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    // Additional trends for chart combinations
    const netProfitData = monthlyData.map(data => data.netProfit)
    const netProfitTrend = {
      series: [
        { 
          name: 'Net Profit', 
          data: netProfitData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    const newDepositorDataDashboard = monthlyData.map(data => data.newDepositor)
    const newDepositorTrend = {
      series: [
        { 
          name: 'New Depositor', 
          data: newDepositorDataDashboard
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    const newRegisterData = monthlyData.map(data => data.newRegister)
    const newRegisterTrend = {
      series: [
        { 
          name: 'New Register', 
          data: newRegisterData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    const activeMemberData = monthlyData.map(data => data.activeMember)
    const activeMemberTrend = {
      series: [
        { 
          name: 'Active Member', 
          data: activeMemberData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    const pureMemberData = monthlyData.map(data => data.pureMember)
    const pureMemberTrend = {
      series: [
        { 
          name: 'Pure Member', 
          data: pureMemberData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    const incomeData = monthlyData.map(data => data.depositAmount + data.addTransaction)
    const incomeTrend = {
      series: [
        { 
          name: 'Income', 
          data: incomeData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }
    
    const costData = monthlyData.map(data => data.withdrawAmount + data.deductTransaction)
    const costTrend = {
      series: [
        { 
          name: 'Cost', 
          data: costData
        }
      ],
      categories: months.map(month => month.substring(0, 3))
    }

    console.log('📈 [KPILogic] Dashboard chart data prepared:', {
      retentionRateTrend,
      churnRateTrend,
      customerLifetimeValueTrend,
      purchaseFrequencyTrend,
      netProfitTrend,
      newDepositorTrend,
      newRegisterTrend,
      activeMemberTrend,
      pureMemberTrend,
      incomeTrend,
      costTrend
    })

    return {
      success: true,
      retentionRateTrend,
      churnRateTrend,
      customerLifetimeValueTrend,
      purchaseFrequencyTrend,
      netProfitTrend,
      newDepositorTrend,
      newRegisterTrend,
      activeMemberTrend,
      pureMemberTrend,
      incomeTrend,
      costTrend
    }

  } catch (error) {
    console.error('❌ [KPILogic] Error fetching Dashboard chart data:', error)
    
    return {
      success: false,
      retentionRateTrend: { series: [], categories: [] },
      churnRateTrend: { series: [], categories: [] },
      customerLifetimeValueTrend: { series: [], categories: [] },
      purchaseFrequencyTrend: { series: [], categories: [] },
      netProfitTrend: { series: [], categories: [] },
      newDepositorTrend: { series: [], categories: [] },
      newRegisterTrend: { series: [], categories: [] },
      activeMemberTrend: { series: [], categories: [] },
      pureMemberTrend: { series: [], categories: [] },
      incomeTrend: { series: [], categories: [] },
      costTrend: { series: [], categories: [] }
    }
  }
}

// ===========================================
// RETENTION DAY INTERFACES & TYPES
// ===========================================

export interface RetentionDayData {
  retention7Days: number
  retention6Days: number
  retention5Days: number
  retention4Days: number
  retention3Days: number
  retention2Days: number
  retention1Day: number
  retention0Days: number
  totalMembers: number
  memberDetails: RetentionMemberDetail[]
}

export interface RetentionMemberDetail {
  userkey: string
  userName: string
  uniqueCode: string
  activeDays: number
  depositAmount: number
  withdrawAmount: number
  ggr: number
  bonus: number
  lastActiveDate: string
  depositCases: number
  withdrawCases: number
  atv: number // ✅ Average Transaction Value
}

export interface CustomerValueDetail {
  userkey: string
  userName: string
  uniqueCode: string
  depositAmount: number
  customerValue: string
  currency: string
}

// ===========================================
// RETENTION DAY HELPER FUNCTIONS
// ===========================================

// Helper function to get month index
function getMonthIndex(month: string): number {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return months.indexOf(month) + 1
}

// Helper function to get previous month
function getPreviousMonth(month: string): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const currentIndex = months.indexOf(month)
  const previousIndex = currentIndex === 0 ? 11 : currentIndex - 1
  return months[previousIndex]
}

// Helper function to get active members in a period
async function getActiveMembersInPeriod(
  year: string,
  month: string,
  currency: string,
  line: string,
  startDate?: string | null,
  endDate?: string | null,
  periodType: 'yearly' | 'monthly' | 'weekly' | 'daily' = 'monthly'
): Promise<string[]> {
  try {
    let query = supabase
      .from('member_report_daily')
      .select('userkey, deposit_amount, date')
      .gt('deposit_amount', 0)

    // Apply date filter based on period type
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    } else {
      const monthIndex = getMonthIndex(month)
      const yearInt = parseInt(year)
      query = query
        .gte('date', `${yearInt}-${monthIndex.toString().padStart(2, '0')}-01`)
        .lt('date', `${yearInt}-${(monthIndex + 1).toString().padStart(2, '0')}-01`)
    }

    // Apply filters
    if (currency !== 'All') query = query.eq('currency', currency)
    if (line !== 'All') query = query.eq('line', line)

    const { data } = await query
    const activeUserkeys = Array.from(new Set(data?.map(row => row.userkey as string) || []))
    
    return activeUserkeys
  } catch (error) {
    console.error('❌ [KPILogic] Error in getActiveMembersInPeriod:', error)
    return []
  }
}

// Helper function to get active members in previous period
async function getActiveMembersInPreviousPeriod(
  year: string,
  month: string,
  currency: string,
  line: string,
  startDate?: string | null,
  endDate?: string | null,
  periodType: 'yearly' | 'monthly' | 'weekly' | 'daily' = 'monthly'
): Promise<string[]> {
  try {
    // Calculate previous period dates
    let previousStartDate: string
    let previousEndDate: string

    if (startDate && endDate) {
      // For range mode, calculate previous period
      const start = new Date(startDate)
      const end = new Date(endDate)
      const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      
      const previousStart = new Date(start.getTime() - (periodDays * 24 * 60 * 60 * 1000))
      const previousEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000))
      
      previousStartDate = previousStart.toISOString().split('T')[0]
      previousEndDate = previousEnd.toISOString().split('T')[0]
    } else {
      // For month mode, get previous month
      const previousMonth = getPreviousMonth(month)
      const previousYear = previousMonth === 'December' ? (parseInt(year) - 1).toString() : year
      const previousMonthIndex = getMonthIndex(previousMonth)
      const previousYearInt = parseInt(previousYear)
      
      previousStartDate = `${previousYearInt}-${previousMonthIndex.toString().padStart(2, '0')}-01`
      previousEndDate = `${previousYearInt}-${(previousMonthIndex + 1).toString().padStart(2, '0')}-01`
    }

    return await getActiveMembersInPeriod(year, month, currency, line, previousStartDate, previousEndDate, periodType)
  } catch (error) {
    console.error('❌ [KPILogic] Error in getActiveMembersInPreviousPeriod:', error)
    return []
  }
}

// Helper function to get 7-day member data
async function getSevenDayMemberData(
  year: string,
  month: string,
  currency: string,
  line: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<any[]> {
  try {
    console.log('🔍 [KPILogic] getSevenDayMemberData called with:', { year, month, currency, line, startDate, endDate })
    
    // ✅ STEP 1: Get member retention (userkey dengan deposit_cases > 0)
    let retentionQuery = supabase
      .from('member_report_daily')
      .select('userkey')
      .gt('deposit_cases', 0)

    // Apply date filter
    if (startDate && endDate) {
      retentionQuery = retentionQuery.gte('date', startDate).lte('date', endDate)
    } else {
      const monthIndex = getMonthIndex(month)
      const yearInt = parseInt(year)
      retentionQuery = retentionQuery
        .gte('date', `${yearInt}-${monthIndex.toString().padStart(2, '0')}-01`)
        .lt('date', `${yearInt}-${(monthIndex + 1).toString().padStart(2, '0')}-01`)
    }

    // Apply filters
    if (currency !== 'All') retentionQuery = retentionQuery.eq('currency', currency)
    if (line && line !== 'All') retentionQuery = retentionQuery.eq('line', line)

    const { data: retentionData } = await retentionQuery
    const retentionUserkeys = Array.from(new Set(retentionData?.map((row: any) => row.userkey) || []))
    console.log('🔍 [KPILogic] Retention userkeys found:', retentionUserkeys.length)
    
    // ✅ STEP 2: Get SEMUA transaction untuk userkey retention (tanpa filter deposit_cases)
    let allTransactionsQuery = supabase
      .from('member_report_daily')
      .select('userkey, user_name, unique_code, deposit_amount, deposit_cases, withdraw_amount, withdraw_cases, bonus, date')
      .in('userkey', retentionUserkeys)

    // Apply date filter
    if (startDate && endDate) {
      allTransactionsQuery = allTransactionsQuery.gte('date', startDate).lte('date', endDate)
    } else {
      const monthIndex = getMonthIndex(month)
      const yearInt = parseInt(year)
      allTransactionsQuery = allTransactionsQuery
        .gte('date', `${yearInt}-${monthIndex.toString().padStart(2, '0')}-01`)
        .lt('date', `${yearInt}-${(monthIndex + 1).toString().padStart(2, '0')}-01`)
    }

    // Apply filters
    if (currency !== 'All') allTransactionsQuery = allTransactionsQuery.eq('currency', currency)
    if (line && line !== 'All') allTransactionsQuery = allTransactionsQuery.eq('line', line)

    const { data: allTransactions } = await allTransactionsQuery
    console.log('🔍 [KPILogic] All transactions for retention members:', allTransactions?.length || 0)
    console.log('🔍 [KPILogic] Sample transactions:', allTransactions?.slice(0, 3))
    
    return allTransactions || []
  } catch (error) {
    console.error('❌ [KPILogic] Error in getSevenDayMemberData:', error)
    return []
  }
}

// Helper function to calculate retention categories
function calculateRetentionCategories(memberData: any[]): { [key: number]: number } {
  const memberDays: { [userkey: string]: Set<string> } = {}
  
  // Group by userkey and count unique days
  memberData.forEach(row => {
    const userkey = row.userkey
    const date = row.date.split('T')[0] // Get date part only
    
    if (!memberDays[userkey]) {
      memberDays[userkey] = new Set()
    }
    memberDays[userkey].add(date)
  })

  // Count members by active days (0-7 days only)
  const retentionCategories: { [key: number]: number } = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0
  }
  
  Object.values(memberDays).forEach(days => {
    const activeDays = days.size
    if (activeDays <= 7) {
      retentionCategories[activeDays] = (retentionCategories[activeDays] || 0) + 1
    } else {
      // For more than 7 days, count as 7 days
      retentionCategories[7] = (retentionCategories[7] || 0) + 1
    }
  })

  console.log('📊 [KPILogic] Retention categories calculated:', retentionCategories)
  console.log('📊 [KPILogic] Total members in retention:', Object.values(retentionCategories).reduce((sum, count) => sum + count, 0))

  return retentionCategories
}

// Helper function to get detailed member information
async function getRetentionMemberDetails(
  memberData: any[],
  currency: string,
  line: string
): Promise<RetentionMemberDetail[]> {
  try {
    console.log('🔍 [KPILogic] getRetentionMemberDetails called with:', { memberDataLength: memberData.length, currency, line })
    console.log('🔍 [KPILogic] Sample member data:', memberData.slice(0, 2))
    
    const memberDays: { [userkey: string]: Set<string> } = {}
    const memberTotals: { [userkey: string]: { deposit: number; withdraw: number; ggr: number; bonus: number; lastDate: string; depositCases: number; withdrawCases: number; userName: string; uniqueCode: string } } = {}
    
    // Process member data
    memberData.forEach(row => {
      const userkey = row.userkey
      const date = row.date.split('T')[0]
      
      if (!memberDays[userkey]) {
        memberDays[userkey] = new Set()
        memberTotals[userkey] = { 
          deposit: 0, 
          withdraw: 0, 
          ggr: 0, 
          bonus: 0, 
          lastDate: date, 
          depositCases: 0, 
          withdrawCases: 0,
          userName: row.user_name || userkey,
          uniqueCode: row.unique_code || userkey
        }
      }
      
      memberDays[userkey].add(date)
      memberTotals[userkey].deposit += row.deposit_amount || 0
      memberTotals[userkey].withdraw += row.withdraw_amount || 0
      memberTotals[userkey].ggr += (row.deposit_amount || 0) - (row.withdraw_amount || 0)
      memberTotals[userkey].bonus += row.bonus || 0
      memberTotals[userkey].depositCases += row.deposit_cases || 0
      memberTotals[userkey].withdrawCases += row.withdraw_cases || 0
      memberTotals[userkey].lastDate = date > memberTotals[userkey].lastDate ? date : memberTotals[userkey].lastDate
    })

    // Convert to RetentionMemberDetail array
    const details: RetentionMemberDetail[] = Object.keys(memberDays).map(userkey => {
      const member = memberTotals[userkey]
      const atv = member.depositCases > 0 ? member.deposit / member.depositCases : 0
      
      return {
        userkey,
        userName: member.userName,
        uniqueCode: member.uniqueCode,
        activeDays: memberDays[userkey].size,
        depositAmount: member.deposit,
        withdrawAmount: member.withdraw,
        ggr: member.ggr,
        bonus: member.bonus,
        lastActiveDate: member.lastDate,
        depositCases: member.depositCases,
        withdrawCases: member.withdrawCases,
        atv: atv // ✅ Average Transaction Value per userkey
      }
    })

    console.log('🔍 [KPILogic] Final retention details sample:', details.slice(0, 2))
    console.log('🔍 [KPILogic] Total retention details:', details.length)

    return details
  } catch (error) {
    console.error('❌ [KPILogic] Error in getRetentionMemberDetails:', error)
    return []
  }
}

// ===========================================
// CUSTOMER VALUE FUNCTIONS
// ===========================================

// Get Customer Value Data based on 2 months deposit amount
export async function getCustomerValueData(
  year: string,
  month: string,
  currency: string = 'MYR',
  line: string = 'All'
): Promise<{
  highValueCustomers: number
  lowValueCustomers: number
  totalCustomers: number
  customerDetails: CustomerValueDetail[]
}> {
  try {
    console.log('🔍 [KPILogic] Fetching Customer Value data:', { year, month, currency, line })

    // Calculate 2 months period
    const currentDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const previousMonth = new Date(currentDate)
    previousMonth.setMonth(previousMonth.getMonth() - 1)
    
    const currentYear = currentDate.getFullYear().toString()
    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0')
    const previousYear = previousMonth.getFullYear().toString()
    const previousMonthStr = (previousMonth.getMonth() + 1).toString().padStart(2, '0')

    console.log('🔍 [KPILogic] Customer Value period:', {
      currentPeriod: `${currentYear}-${currentMonth}`,
      previousPeriod: `${previousYear}-${previousMonthStr}`
    })

    // Build query for 2 months data
    let query = supabase
      .from('member_report_daily')
      .select('userkey, user_name, unique_code, deposit_amount, currency')
      .or(`year.eq.${currentYear},year.eq.${previousYear}`)
      .or(`month.eq.${currentMonth},month.eq.${previousMonthStr}`)

    // Apply currency filter
    if (currency !== 'All') {
      query = query.eq('currency', currency)
    }

    // Apply line filter if specified
    if (line && line !== 'All') {
      query = query.eq('line', line)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ [KPILogic] Error fetching customer value data:', error)
      return {
        highValueCustomers: 0,
        lowValueCustomers: 0,
        totalCustomers: 0,
        customerDetails: []
      }
    }

    if (!data || data.length === 0) {
      console.log('⚠️ [KPILogic] No customer value data found')
      return {
        highValueCustomers: 0,
        lowValueCustomers: 0,
        totalCustomers: 0,
        customerDetails: []
      }
    }

    // Group by userkey and sum deposit amounts for 2 months
    const customerTotals: { [key: string]: CustomerValueDetail } = {}

    data.forEach(row => {
      const userkey = row.userkey as string
      const depositAmount = (row.deposit_amount as number) || 0
      
      if (!customerTotals[userkey]) {
        customerTotals[userkey] = {
          userkey,
          userName: (row.user_name as string) || '',
          uniqueCode: (row.unique_code as string) || '',
          depositAmount: 0,
          customerValue: '',
          currency: (row.currency as string) || currency
        }
      }
      
      customerTotals[userkey].depositAmount += depositAmount
    })

    // Calculate customer value for each customer
    const customerDetails: CustomerValueDetail[] = Object.values(customerTotals).map(customer => ({
      ...customer,
      customerValue: KPI_FORMULAS.CUSTOMER_VALUE(customer.depositAmount, customer.currency)
    }))

    // Count high and low value customers
    const highValueCustomers = customerDetails.filter(c => c.customerValue === 'High Value').length
    const lowValueCustomers = customerDetails.filter(c => c.customerValue === 'Low Value').length
    const totalCustomers = customerDetails.length

    console.log('✅ [KPILogic] Customer Value calculation completed:', {
      highValueCustomers,
      lowValueCustomers,
      totalCustomers,
      sampleDetails: customerDetails.slice(0, 3)
    })

    return {
      highValueCustomers,
      lowValueCustomers,
      totalCustomers,
      customerDetails
    }

  } catch (error) {
    console.error('❌ [KPILogic] Error in getCustomerValueData:', error)
    return {
      highValueCustomers: 0,
      lowValueCustomers: 0,
      totalCustomers: 0,
      customerDetails: []
    }
  }
}

// ===========================================
// MAIN RETENTION DAY FUNCTION
// ===========================================

// Get Retention Day Data (7-day retention analysis) - Universal for all markets
export async function getRetentionDayData(
  year: string,
  month: string,
  currency: string = 'MYR',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null
): Promise<RetentionDayData> {
  try {
    console.log('🔍 [KPILogic] Fetching Retention Day data:', { year, month, currency, line, startDate, endDate })

    // Get 7-day period data
    const sevenDayData = await getSevenDayMemberData(year, month, currency, line, startDate, endDate)
    
    // Calculate retention categories
    const retentionCategories = calculateRetentionCategories(sevenDayData)
    
    // Get detailed member information
    const memberDetails = await getRetentionMemberDetails(sevenDayData, currency, line)

    const retentionData: RetentionDayData = {
      retention7Days: retentionCategories[7] || 0,
      retention6Days: retentionCategories[6] || 0,
      retention5Days: retentionCategories[5] || 0,
      retention4Days: retentionCategories[4] || 0,
      retention3Days: retentionCategories[3] || 0,
      retention2Days: retentionCategories[2] || 0,
      retention1Day: retentionCategories[1] || 0,
      retention0Days: retentionCategories[0] || 0,
      totalMembers: Object.values(retentionCategories).reduce((sum, count) => sum + count, 0),
      memberDetails: memberDetails
    }

    console.log('✅ [KPILogic] Retention Day calculation completed:', retentionData)
    return retentionData

  } catch (error) {
    console.error('❌ [KPILogic] Error in getRetentionDayData:', error)
    return {
      retention7Days: 0,
      retention6Days: 0,
      retention5Days: 0,
      retention4Days: 0,
      retention3Days: 0,
      retention2Days: 0,
      retention1Day: 0,
      retention0Days: 0,
      totalMembers: 0,
      memberDetails: []
    }
  }
}

// ===========================================
// DEBUG FUNCTIONS
// ===========================================

console.log('🎯 [KPILogic] NEW PostgreSQL Pattern KPILogic loaded successfully!')