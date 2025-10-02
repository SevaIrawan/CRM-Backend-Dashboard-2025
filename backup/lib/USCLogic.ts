import { supabase } from './supabase'

// ===========================================
// TYPES & INTERFACES - USC PATTERN
// ===========================================

export interface USCSlicerFilters {
  year: string
  month: string
  line?: string
}

export interface USCSlicerData {
  years: string[]
  months: string[]
  lines: string[]
}

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

// ===========================================
// RAW DATA STRUCTURE
// ===========================================

export interface USCRawKPIData {
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
    last_month_active_members: number
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
// CENTRALIZED BUSINESS FORMULAS - USC
// ===========================================

export const USC_KPI_FORMULAS = {
  // Net Profit from database
  NET_PROFIT_FROM_DB: (data: USCRawKPIData): number => {
    return data.member.net_profit
  },

  // GGR per User = Net Profit / Active Members
  GGR_USER: (data: USCRawKPIData): number => {
    return data.deposit.active_members > 0 ? data.member.net_profit / data.deposit.active_members : 0
  },

  // Pure Member = Active Member - New Depositor
  PURE_MEMBER: (data: USCRawKPIData): number => {
    return Math.max(data.deposit.active_members - data.newDepositor.new_depositor, 0)
  },

  // GGR per Pure User = GGR / Pure Members
  GGR_PURE_USER: (data: USCRawKPIData): number => {
    const pureMember = USC_KPI_FORMULAS.PURE_MEMBER(data)
    return pureMember > 0 ? data.member.ggr / pureMember : 0
  },

  // Winrate = GGR / Deposit Amount
  WINRATE: (data: USCRawKPIData): number => {
    return data.deposit.deposit_amount > 0 ? (data.member.ggr / data.deposit.deposit_amount) * 100 : 0
  },

  // Average Transaction Value (ATV) = Deposit Amount / Deposit Cases
  AVG_TRANSACTION_VALUE: (data: USCRawKPIData): number => {
    return data.deposit.deposit_cases > 0 ? data.deposit.deposit_amount / data.deposit.deposit_cases : 0
  },

  // Purchase Frequency (PF) = Deposit Cases / Active Member
  PURCHASE_FREQUENCY: (data: USCRawKPIData): number => {
    const result = data.deposit.active_members > 0 ? data.deposit.deposit_cases / data.deposit.active_members : 0
    return result
  },

  // Churn Rate = MAX(Churn Members / Last Month Active Members, 0.01) * 100
  CHURN_RATE: (data: USCRawKPIData): number => {
    return data.churn.last_month_active_members > 0 ? 
      Math.max((data.churn.churn_members / data.churn.last_month_active_members), 0.01) * 100 : 1
  },

  // Retention Rate = (1 - Churn Rate) * 100
  RETENTION_RATE: (churnRate: number): number => {
    return Math.max(1 - (churnRate / 100), 0) * 100
  },

  // Growth Rate = (Active Members - Churn Members) / Active Members
  GROWTH_RATE: (data: USCRawKPIData): number => {
    return data.deposit.active_members > 0 ? (data.deposit.active_members - data.churn.churn_members) / data.deposit.active_members : 0
  },

  // Customer Lifetime Value (CLV) = PF * ATV * ACL
  CUSTOMER_LIFETIME_VALUE: (avgTransactionValue: number, purchaseFrequency: number, avgCustomerLifespan: number): number => {
    const result = avgTransactionValue * purchaseFrequency * avgCustomerLifespan
    
    console.log('🔍 [USCLogic] CLV Formula Debug:', {
      avgTransactionValue,
      purchaseFrequency,
      avgCustomerLifespan,
      result,
      calculation: `${avgTransactionValue} × ${purchaseFrequency} × ${avgCustomerLifespan} = ${result}`
    })
    
    return result
  },

  // Average Customer Lifespan (ACL) = 1 / Churn Rate
  AVG_CUSTOMER_LIFESPAN: (churnRate: number): number => {
    const churnRateDecimal = churnRate / 100
    return churnRateDecimal > 0 ? (1 / churnRateDecimal) : 1000
  },

  // Customer Maturity Index = (Retention Rate * 0.5 + Growth Rate * 0.5 + Churn Rate * 0.2)
  CUSTOMER_MATURITY_INDEX: (retentionRate: number, growthRate: number, churnRate: number): number => {
    return (retentionRate * 0.5) + (growthRate * 0.5) + (churnRate * 0.2)
  },

  // New Customer Conversion Rate = (New Depositor / New Register) * 100
  NEW_CUSTOMER_CONVERSION_RATE: (data: USCRawKPIData): number => {
    return data.newRegister.new_register > 0 ? (data.newDepositor.new_depositor / data.newRegister.new_register) * 100 : 0
  },

  // Hold Percentage = net profit / Valid Amount * 100%
  HOLD_PERCENTAGE: (netProfit: number, validAmount: number): number => {
    return validAmount > 0 ? (netProfit / validAmount) * 100 : 0
  },

  // Deposit Amount User = Deposit Amount / Active Member
  DEPOSIT_AMOUNT_USER: (depositAmount: number, activeMember: number): number => {
    return activeMember > 0 ? depositAmount / activeMember : 0
  },

  // Withdraw Rate = Withdraw Cases / Deposit Cases
  WITHDRAW_RATE: (withdrawCases: number, depositCases: number): number => {
    return depositCases > 0 ? (withdrawCases / depositCases) * 100 : 0
  },

  // Customer Value Classification for USC
  // USC: deposit amount >= 500 → "High Value", < 500 → "Low Value"
  CUSTOMER_VALUE: (depositAmount: number): string => {
    const threshold = 500 // USC threshold
    return depositAmount >= threshold ? 'High Value' : 'Low Value'
  },

  // Gross Profit = Deposit Amount - Withdraw Amount
  GROSS_PROFIT: (depositAmount: number, withdrawAmount: number): number => {
    return depositAmount - withdrawAmount
  },

  // Net Profit = (Deposit Amount + Add Transaction) - (Withdraw Amount + Deduct Transaction)
  NET_PROFIT: (depositAmount: number, withdrawAmount: number, addTransaction: number, deductTransaction: number): number => {
    return (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)
  },

  // Percentage Change (Month over Month)
  PERCENTAGE_CHANGE: (current: number, previous: number): number => {
    if (previous === 0 && current === 0) return 0
    if (previous === 0 && current > 0) return 100
    if (previous === 0 && current < 0) return -100
    
    const percentageChange = ((current - previous) / previous) * 100
    
    if (!isFinite(percentageChange) || isNaN(percentageChange)) return 0
    
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

class USCKPICache {
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

const uscCache = new USCKPICache()

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
// CORE DATA FETCHERS - USC SPECIFIC
// ===========================================

export async function getUSCRawKPIData(filters: USCSlicerFilters): Promise<USCRawKPIData> {
  const cacheKey = `usc_raw_kpi_USC_${filters.year}_${filters.month}_${filters.line || 'all'}`
  const cached = uscCache.get(cacheKey)
  if (cached) {
    console.log('🎯 [USCLogic] Using cached raw KPI data')
    return cached
  }

  try {
    console.log('🔄 [USCLogic] Fetching raw KPI data from USC tables...')
    console.log('🔍 [USCLogic] Filters:', filters)

    // ✅ PARALLEL FETCH - USC TABLES (HYBRID APPROACH)
    const [activeMemberResult, summaryDataResult, churnResult] = await Promise.all([
      
      // 1. ACTIVE MEMBER & PURE USER from blue_whale_usc (Master table - for precision)
      (() => {
        let query = supabase
          .from('blue_whale_usc')
          .select('userkey, unique_code, deposit_cases')
          .eq('year', filters.year)
          .eq('month', filters.month)
          .eq('currency', 'USC') // Currency locked to USC
          .gt('deposit_cases', 0)
         
        if (filters.line && filters.line !== 'All' && filters.line !== 'ALL') {
          query = query.eq('line', filters.line)
        }
         
        return query
      })(),

      // 2. AGGREGATED DATA from blue_whale_usc_summary (MV table - for summaries)
      // This includes: deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, 
      // add_bonus, deduct_bonus, add_transaction, deduct_transaction, valid_amount, new_register, new_depositor
      (() => {
        let query = supabase
          .from('blue_whale_usc_summary')
          .select('deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, add_bonus, deduct_bonus, add_transaction, deduct_transaction, valid_amount, new_register, new_depositor')
          .eq('year', filters.year)
          .eq('month', filters.month)
          .eq('currency', 'USC') // Currency locked to USC
         
        if (filters.line && filters.line !== 'All' && filters.line !== 'ALL') {
          query = query.eq('line', filters.line)
        }
         
        return query
      })(),

      // 3. Churn member calculation from blue_whale_usc (Master table - for precision)
      getUSCChurnMembers(filters)
    ])

    if (activeMemberResult.error) throw activeMemberResult.error
    if (summaryDataResult.error) throw summaryDataResult.error

    // ✅ CLIENT-SIDE AGGREGATION (HYBRID APPROACH)
    const activeMemberData = activeMemberResult.data || []
    const summaryData = summaryDataResult.data || []

    console.log('🔍 [USCLogic] Raw data counts:', {
      activeMemberData: activeMemberData.length,
      summaryData: summaryData.length
    })

    // 1. ACTIVE MEMBER = unique count dari blue_whale_usc[userkey] WHERE deposit_cases > 0 (Master table)
    const uniqueUserKeys = Array.from(new Set(activeMemberData.map((item: any) => item.userkey).filter(Boolean)))
    const activeMembersCount = uniqueUserKeys.length

    // 2. PURE USER = count unique dari blue_whale_usc[unique_code] WHERE deposit_cases > 0 (Master table)
    const uniqueCodes = Array.from(new Set(activeMemberData.map((item: any) => item.unique_code).filter(Boolean)))
    const pureUserCount = uniqueCodes.length

    // 3. AGGREGATE DATA from MV table (blue_whale_usc_summary)
    const summaryAgg = summaryData.reduce((acc: any, item: any) => ({
      deposit_cases: acc.deposit_cases + (Number(item.deposit_cases) || 0),
      deposit_amount: acc.deposit_amount + (Number(item.deposit_amount) || 0),
      withdraw_cases: acc.withdraw_cases + (Number(item.withdraw_cases) || 0),
      withdraw_amount: acc.withdraw_amount + (Number(item.withdraw_amount) || 0),
      bonus: acc.bonus + (Number(item.bonus) || 0),
      add_bonus: acc.add_bonus + (Number(item.add_bonus) || 0),
      deduct_bonus: acc.deduct_bonus + (Number(item.deduct_bonus) || 0),
      add_transaction: acc.add_transaction + (Number(item.add_transaction) || 0),
      deduct_transaction: acc.deduct_transaction + (Number(item.deduct_transaction) || 0),
      valid_amount: acc.valid_amount + (Number(item.valid_amount) || 0),
      new_register: acc.new_register + (Number(item.new_register) || 0),
      new_depositor: acc.new_depositor + (Number(item.new_depositor) || 0)
    }), { 
      deposit_cases: 0,
      deposit_amount: 0,
      withdraw_cases: 0,
      withdraw_amount: 0,
      bonus: 0,
      add_bonus: 0,
      deduct_bonus: 0,
      add_transaction: 0,
      deduct_transaction: 0,
      valid_amount: 0,
      new_register: 0,
      new_depositor: 0
    })

    console.log('📊 [USCLogic] Aggregated data:', {
      activeMembersCount,
      pureUserCount,
      summaryAgg
    })

    // Calculate derived values using centralized formulas
    const depositAmount = Number(summaryAgg.deposit_amount) || 0
    const withdrawAmount = Number(summaryAgg.withdraw_amount) || 0
    const validAmount = Number(summaryAgg.valid_amount) || 0

    const rawData: USCRawKPIData = {
      deposit: {
        deposit_amount: depositAmount, // From MV
        add_transaction: Number(summaryAgg.add_transaction) || 0, // From MV
        active_members: activeMembersCount, // From Master table (precision)
        deposit_cases: Number(summaryAgg.deposit_cases) || 0 // From MV
      },
      withdraw: {
        withdraw_amount: withdrawAmount, // From MV
        deduct_transaction: Number(summaryAgg.deduct_transaction) || 0, // From MV
        withdraw_cases: Number(summaryAgg.withdraw_cases) || 0 // From MV
      },
      member: {
        net_profit: USC_KPI_FORMULAS.NET_PROFIT(depositAmount, withdrawAmount, Number(summaryAgg.add_transaction) || 0, Number(summaryAgg.deduct_transaction) || 0), // Calculated
        ggr: USC_KPI_FORMULAS.GROSS_PROFIT(depositAmount, withdrawAmount), // Calculated
        valid_bet_amount: validAmount, // From MV
        add_bonus: Number(summaryAgg.add_bonus) || 0, // From MV
        deduct_bonus: Number(summaryAgg.deduct_bonus) || 0 // From MV
      },
      newDepositor: {
        new_depositor: Number(summaryAgg.new_depositor) || 0 // From MV
      },
      newRegister: {
        new_register: Number(summaryAgg.new_register) || 0 // From MV
      },
      churn: {
        churn_members: churnResult.churn_members, // From Master table (precision)
        last_month_active_members: churnResult.last_month_active_members // From Master table (precision)
      },
      pureUser: {
        unique_codes: pureUserCount // From Master table (precision)
      },
      customerValue: {
        high_value_customers: 0,
        low_value_customers: 0,
        total_customers: 0
      }
    }

    console.log('✅ [USCLogic] Raw KPI data aggregated:', {
      activeMembers: rawData.deposit.active_members,
      depositAmount: rawData.deposit.deposit_amount,
      withdrawAmount: rawData.withdraw.withdraw_amount,
      grossProfit: rawData.member.ggr,
      netProfit: rawData.member.net_profit,
      newDepositor: rawData.newDepositor.new_depositor,
      newRegister: rawData.newRegister.new_register,
      pureUser: rawData.pureUser.unique_codes,
      depositCases: rawData.deposit.deposit_cases
    })

    uscCache.set(cacheKey, rawData)
    return rawData

  } catch (error) {
    console.error('❌ [USCLogic] Error fetching raw KPI data:', error)
    
    // Return fallback data
    return {
      deposit: { deposit_amount: 0, add_transaction: 0, active_members: 0, deposit_cases: 0 },
      withdraw: { withdraw_amount: 0, deduct_transaction: 0, withdraw_cases: 0 },
      member: { net_profit: 0, ggr: 0, valid_bet_amount: 0, add_bonus: 0, deduct_bonus: 0 },
      newDepositor: { new_depositor: 0 },
      newRegister: { new_register: 0 },
      churn: { churn_members: 0, last_month_active_members: 0 },
      pureUser: { unique_codes: 0 },
      customerValue: { high_value_customers: 0, low_value_customers: 0, total_customers: 0 }
    }
  }
}

// Helper function untuk churn member calculation - USC
async function getUSCChurnMembers(filters: USCSlicerFilters): Promise<{ churn_members: number, last_month_active_members: number }> {
  try {
    // Get previous month data
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthIndex = monthNames.indexOf(filters.month)
    const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
    const prevMonth = monthNames[prevMonthIndex]
    const prevYear = currentMonthIndex === 0 ? (parseInt(filters.year) - 1).toString() : filters.year

    // Get users from previous month
    const prevQuery = (() => {
      let query = supabase
        .from('blue_whale_usc')
        .select('userkey, unique_code')
        .eq('year', prevYear)
        .eq('month', prevMonth)
        .eq('currency', 'USC') // Currency locked to USC
        .gt('deposit_cases', 0)
      
      if (filters.line && filters.line !== 'All' && filters.line !== 'ALL') {
        query = query.eq('line', filters.line)
      }
      
      return query
    })()
    
    const { data: prevUsers, error: prevError } = await prevQuery

    if (prevError) throw prevError

    // Get users from current month
    const currentQuery = (() => {
      let query = supabase
        .from('blue_whale_usc')
        .select('userkey, unique_code')
        .eq('year', filters.year)
        .eq('month', filters.month)
        .eq('currency', 'USC') // Currency locked to USC
        .gt('deposit_cases', 0)
      
      if (filters.line && filters.line !== 'All' && filters.line !== 'ALL') {
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
    
    return {
      churn_members: churnedUsers.length,
      last_month_active_members: prevUserKeys.size
    }

  } catch (error) {
    console.error('❌ [USCLogic] Error calculating churn members:', error)
    return { churn_members: 0, last_month_active_members: 0 }
  }
}

// ===========================================
// HIGH-LEVEL BUSINESS FUNCTIONS - USC
// ===========================================

export async function calculateUSCKPIs(filters: USCSlicerFilters): Promise<USCKPIData> {
  try {
    console.log('🎯 [USCLogic] Calculating USC KPIs...')

    // ✅ Step 1: Get raw aggregated data
    const rawData = await getUSCRawKPIData(filters)
    
    console.log('🔍 [USCLogic] Raw Data from Database:', {
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

    // ✅ Step 2: Apply centralized formulas
    const winrate = USC_KPI_FORMULAS.WINRATE(rawData) // Winrate = GGR / Deposit Amount
    const avgTransactionValue = USC_KPI_FORMULAS.AVG_TRANSACTION_VALUE(rawData) // ATV = Deposit Amount / Deposit Cases
    const purchaseFrequency = USC_KPI_FORMULAS.PURCHASE_FREQUENCY(rawData) // PF = Deposit Cases / Active Member
    const churnRate = USC_KPI_FORMULAS.CHURN_RATE(rawData) // Calculated from Master table
    const retentionRate = USC_KPI_FORMULAS.RETENTION_RATE(churnRate) // Retention Rate = (1 - Churn Rate) * 100
    const growthRate = USC_KPI_FORMULAS.GROWTH_RATE(rawData) // Growth Rate = (Active Members - Churn Members) / Active Members
    const avgCustomerLifespan = USC_KPI_FORMULAS.AVG_CUSTOMER_LIFESPAN(churnRate) // ACL = 1 / Churn Rate
    const customerLifetimeValue = USC_KPI_FORMULAS.CUSTOMER_LIFETIME_VALUE(avgTransactionValue, purchaseFrequency, avgCustomerLifespan) // CLV = PF * ATV * ACL
    const customerMaturityIndex = USC_KPI_FORMULAS.CUSTOMER_MATURITY_INDEX(retentionRate, growthRate, churnRate) // CMI = (Retention Rate * 0.5 + Growth Rate * 0.5 + Churn Rate * 0.2)
    const withdrawRate = USC_KPI_FORMULAS.WITHDRAW_RATE(rawData.withdraw.withdraw_cases, rawData.deposit.deposit_cases) // Withdraw Rate = Withdraw Cases / Deposit Cases
    
    const ggrPerUser = rawData.deposit.active_members > 0 ? 
      (rawData.member.net_profit / rawData.deposit.active_members) : 0 // GGR User = Net Profit / Active Member
    const ggrPerPureUser = rawData.pureUser.unique_codes > 0 ? 
      (rawData.member.net_profit / rawData.pureUser.unique_codes) : 0 // GGR Pure User = Net Profit / Pure User
    const pureMember = USC_KPI_FORMULAS.PURE_MEMBER(rawData) // Pure Member = Active Member - New Depositor

    // ✅ Step 3: Return formatted KPI data
    const result: USCKPIData = {
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
      winrate: USC_KPI_FORMULAS.ROUND(winrate),
      churnRate: USC_KPI_FORMULAS.ROUND(churnRate),
      retentionRate: USC_KPI_FORMULAS.ROUND(retentionRate),
      growthRate: USC_KPI_FORMULAS.ROUND(growthRate),
      avgTransactionValue: USC_KPI_FORMULAS.ROUND(avgTransactionValue),
      purchaseFrequency: USC_KPI_FORMULAS.ROUND(purchaseFrequency),
      customerLifetimeValue: customerLifetimeValue >= 1000 ? Math.round(customerLifetimeValue) : USC_KPI_FORMULAS.ROUND(customerLifetimeValue),
      avgCustomerLifespan: USC_KPI_FORMULAS.ROUND(avgCustomerLifespan),
      customerMaturityIndex: USC_KPI_FORMULAS.ROUND(customerMaturityIndex),
      ggrPerUser: USC_KPI_FORMULAS.ROUND(ggrPerUser),
      ggrPerPureUser: USC_KPI_FORMULAS.ROUND(ggrPerPureUser),
      addBonus: rawData.member.add_bonus,
      deductBonus: rawData.member.deduct_bonus,
      conversionRate: USC_KPI_FORMULAS.ROUND(USC_KPI_FORMULAS.NEW_CUSTOMER_CONVERSION_RATE(rawData)), // Conversion Rate = New Depositor / New Register
      holdPercentage: USC_KPI_FORMULAS.ROUND(USC_KPI_FORMULAS.HOLD_PERCENTAGE(rawData.member.net_profit, rawData.member.valid_bet_amount)), // Hold Percentage = Net Profit / Valid Amount * 100%
      depositAmountUser: USC_KPI_FORMULAS.ROUND(USC_KPI_FORMULAS.DEPOSIT_AMOUNT_USER(rawData.deposit.deposit_amount, rawData.deposit.active_members)), // Deposit Amount User = Deposit Amount / Active Member
      withdrawRate: USC_KPI_FORMULAS.ROUND(withdrawRate), // Withdraw Rate = Withdraw Cases / Deposit Cases
      highValueCustomers: rawData.customerValue.high_value_customers,
      lowValueCustomers: rawData.customerValue.low_value_customers,
      totalCustomers: rawData.customerValue.total_customers
    }

    console.log('✅ [USCLogic] USC KPIs calculated successfully:', {
      activeMember: result.activeMember,
      netProfit: result.netProfit,
      winrate: result.winrate,
      churnRate: result.churnRate
    })

    return result

  } catch (error) {
    console.error('❌ [USCLogic] Error calculating USC KPIs:', error)
    
    // Return fallback data
    return {
      activeMember: 0, newDepositor: 0, depositAmount: 0, grossGamingRevenue: 0, netProfit: 0,
      withdrawAmount: 0, addTransaction: 0, deductTransaction: 0, validBetAmount: 0, pureMember: 0,
      pureUser: 0, newRegister: 0, churnMember: 0, depositCases: 0, withdrawCases: 0, winrate: 0, churnRate: 0,
      retentionRate: 0, growthRate: 0, avgTransactionValue: 0, purchaseFrequency: 0,
      customerLifetimeValue: 0, avgCustomerLifespan: 0, customerMaturityIndex: 0, ggrPerUser: 0, ggrPerPureUser: 0,
      addBonus: 0, deductBonus: 0, conversionRate: 0, holdPercentage: 0, depositAmountUser: 0, withdrawRate: 0,
      highValueCustomers: 0, lowValueCustomers: 0, totalCustomers: 0
    }
  }
}

export function calculateUSCMoM(current: number, previous: number): number {
  return USC_KPI_FORMULAS.PERCENTAGE_CHANGE(current, previous)
}

export async function getAllUSCKPIsWithMoM(filters: USCSlicerFilters): Promise<{ current: USCKPIData, mom: any }> {
  try {
    // Get current month data
    const currentData = await calculateUSCKPIs(filters)

    // Get previous month data
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthIndex = monthNames.indexOf(filters.month)
    const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
    const prevMonth = monthNames[prevMonthIndex]
    const prevYear = currentMonthIndex === 0 ? (parseInt(filters.year) - 1).toString() : filters.year

    const previousData = await calculateUSCKPIs({
      ...filters,
      year: prevYear,
      month: prevMonth
    })

    // Calculate MoM using centralized formula
    const mom = {
      activeMember: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.activeMember, previousData.activeMember),
      newDepositor: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.newDepositor, previousData.newDepositor),
      depositAmount: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.depositAmount, previousData.depositAmount),
      grossGamingRevenue: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.grossGamingRevenue, previousData.grossGamingRevenue),
      netProfit: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.netProfit, previousData.netProfit),
      withdrawAmount: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.withdrawAmount, previousData.withdrawAmount),
      addTransaction: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.addTransaction, previousData.addTransaction),
      deductTransaction: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.deductTransaction, previousData.deductTransaction),
      validBetAmount: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.validBetAmount, previousData.validBetAmount),
      pureMember: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.pureMember, previousData.pureMember),
      pureUser: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.pureUser, previousData.pureUser),
      newRegister: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.newRegister, previousData.newRegister),
      churnMember: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.churnMember, previousData.churnMember),
      depositCases: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.depositCases, previousData.depositCases),
      withdrawCases: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.withdrawCases, previousData.withdrawCases),
      winrate: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.winrate, previousData.winrate),
      churnRate: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.churnRate, previousData.churnRate),
      retentionRate: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.retentionRate, previousData.retentionRate),
      growthRate: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.growthRate, previousData.growthRate),
      avgTransactionValue: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.avgTransactionValue, previousData.avgTransactionValue),
      purchaseFrequency: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.purchaseFrequency, previousData.purchaseFrequency),
      customerLifetimeValue: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.customerLifetimeValue, previousData.customerLifetimeValue),
      avgCustomerLifespan: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.avgCustomerLifespan, previousData.avgCustomerLifespan),
      customerMaturityIndex: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.customerMaturityIndex, previousData.customerMaturityIndex),
      ggrPerUser: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.ggrPerUser, previousData.ggrPerUser),
      ggrPerPureUser: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.ggrPerPureUser, previousData.ggrPerPureUser),
      addBonus: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.addBonus, previousData.addBonus),
      deductBonus: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.deductBonus, previousData.deductBonus),
      conversionRate: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.conversionRate, previousData.conversionRate),
      holdPercentage: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.holdPercentage, previousData.holdPercentage),
      depositAmountUser: USC_KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.depositAmountUser, previousData.depositAmountUser)
    }

    // Handle invalid MoM values
    if (!isFinite(mom.ggrPerUser) || isNaN(mom.ggrPerUser)) {
      mom.ggrPerUser = 0
    }
    if (!isFinite(mom.pureUser) || isNaN(mom.pureUser)) {
      mom.pureUser = 0
    }

    return { current: currentData, mom }

  } catch (error) {
    console.error('❌ [USCLogic] Error calculating MoM USC KPIs:', error)
    
    return {
      current: {
        activeMember: 0, newDepositor: 0, depositAmount: 0, grossGamingRevenue: 0, netProfit: 0,
        withdrawAmount: 0, addTransaction: 0, deductTransaction: 0, validBetAmount: 0, pureMember: 0,
        pureUser: 0, newRegister: 0, churnMember: 0, depositCases: 0, withdrawCases: 0, winrate: 0, churnRate: 0,
        retentionRate: 0, growthRate: 0, avgTransactionValue: 0, purchaseFrequency: 0,
        customerLifetimeValue: 0, avgCustomerLifespan: 0, customerMaturityIndex: 0, ggrPerUser: 0, ggrPerPureUser: 0,
        addBonus: 0, deductBonus: 0, conversionRate: 0, holdPercentage: 0, depositAmountUser: 0, withdrawRate: 0,
        highValueCustomers: 0, lowValueCustomers: 0, totalCustomers: 0
      },
      mom: {
        activeMember: 0, newDepositor: 0, depositAmount: 0, grossGamingRevenue: 0, netProfit: 0,
        withdrawAmount: 0, addTransaction: 0, deductTransaction: 0, validBetAmount: 0, pureMember: 0,
        pureUser: 0, newRegister: 0, churnMember: 0, depositCases: 0, withdrawCases: 0, winrate: 0,
        churnRate: 0, retentionRate: 0, growthRate: 0, avgTransactionValue: 0, purchaseFrequency: 0,
        customerLifetimeValue: 0, avgCustomerLifespan: 0, customerMaturityIndex: 0, ggrPerUser: 0,
        ggrPerPureUser: 0, addBonus: 0, deductBonus: 0, conversionRate: 0, holdPercentage: 0, depositAmountUser: 0, withdrawRate: 0
      }
    }
  }
}

// ===========================================
// SLICER DATA FUNCTIONS - USC
// ===========================================

export async function getUSCSlicerData(): Promise<USCSlicerData> {
  try {
    console.log('🔄 [USCLogic] Fetching USC slicer data...')

    const [yearsResult, monthsResult, linesResult] = await Promise.all([
      supabase.from('blue_whale_usc').select('year').eq('currency', 'USC'),
      supabase.from('blue_whale_usc').select('month').eq('currency', 'USC'),
      supabase.from('blue_whale_usc').select('line').eq('currency', 'USC')
    ])

    const years = Array.from(new Set((yearsResult.data || []).map((item: any) => item.year).filter(Boolean))).sort()
    const months = Array.from(new Set((monthsResult.data || []).map((item: any) => item.month).filter(Boolean)))
    const lines = Array.from(new Set((linesResult.data || []).map((item: any) => item.line).filter(Boolean)))

    // Sort months chronologically
    const monthOrder: { [key: string]: number } = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
      'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    months.sort((a: string, b: string) => (monthOrder[a] || 0) - (monthOrder[b] || 0))

    console.log('✅ [USCLogic] USC Slicer data loaded:', { years: years.length, months: months.length, lines: lines.length })

    return { years, months, lines }

  } catch (error) {
    console.error('❌ [USCLogic] Error fetching USC slicer data:', error)
    return { years: [], months: [], lines: [] }
  }
}

export async function getUSCMonthsForYear(year: string, line?: string): Promise<string[]> {
  try {
    console.log('🔍 [getUSCMonthsForYear] DEBUGGING PARAMS:', { year, line })
    
    let query = supabase
      .from('blue_whale_usc')
      .select('month')
      .eq('year', year)
      .eq('currency', 'USC') // Currency locked to USC
    
    if (line && line !== 'ALL') {
      query = query.eq('line', line)
      console.log('🔍 [getUSCMonthsForYear] Adding line filter:', line)
    }
    
    const { data, error } = await query

    if (error) throw error

    const rawMonths = (data || []).map((item: any) => item.month).filter(Boolean)
    console.log('🔍 [getUSCMonthsForYear] Raw months from DB:', rawMonths)
    
    const months = Array.from(new Set(rawMonths))
    console.log('🔍 [getUSCMonthsForYear] Unique months:', months)
    
    // Sort months chronologically
    const monthOrder: { [key: string]: number } = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
      'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    months.sort((a: string, b: string) => (monthOrder[a] || 0) - (monthOrder[b] || 0))

    console.log('🔍 [getUSCMonthsForYear] FINAL SORTED MONTHS:', months)
    return months

  } catch (error) {
    console.error('❌ [USCLogic] Error fetching USC months for year:', error)
    return []
  }
}

export async function getUSCLinesForYear(year?: string): Promise<string[]> {
  try {
    let query = supabase
      .from('blue_whale_usc')
      .select('line')
      .eq('currency', 'USC') // Currency locked to USC
    
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
    console.error('❌ [USCLogic] Error fetching USC lines for year:', error)
    return []
  }
}

// ===========================================
// CHART DATA FUNCTIONS - USC
// ===========================================

export async function getUSCLineChartData(filters: USCSlicerFilters): Promise<any> {
  try {
    console.log('📈 [USCLogic] Fetching USC line chart data...')
    console.log('🔍 [USCLogic] Filters:', filters)
    
    // Get dynamic months for the selected year and line
    const months = await getUSCMonthsForYear(filters.year, filters.line)
    console.log('📅 [USCLogic] Dynamic months for chart:', months)
    
    if (!months || months.length === 0) {
      console.error('❌ [USCLogic] No months data available')
      throw new Error('No months data available')
    }

    // Get data for each month to create realistic trends
    const monthlyData = await Promise.all(
      months.map(async (month) => {
        const chartFilters = { 
          year: filters.year, 
          month: month,
          line: filters.line
        }
        const kpiData = await calculateUSCKPIs(chartFilters)
        return kpiData
      })
    )

    console.log('📊 [USCLogic] Monthly data for charts:', monthlyData)
    
    // Create chart data from monthly data
    const netProfitData = monthlyData.map(data => data.netProfit)
    const newDepositorData = monthlyData.map(data => data.newDepositor)
    const newRegisterData = monthlyData.map(data => data.newRegister)
    const activeMemberData = monthlyData.map(data => data.activeMember)
    const pureMemberData = monthlyData.map(data => data.pureMember)
    const ggrUserData = monthlyData.map(data => data.ggrPerUser)
    const depositAmountUserData = monthlyData.map(data => data.depositAmountUser)
    const retentionRateData = monthlyData.map(data => data.retentionRate)
    const churnRateData = monthlyData.map(data => data.churnRate)
    const customerLifetimeValueData = monthlyData.map(data => data.customerLifetimeValue)
    const purchaseFrequencyData = monthlyData.map(data => data.purchaseFrequency)

    return {
      success: true,
      netProfitTrend: {
        series: [{ name: 'Net Profit', data: netProfitData }],
        categories: months.map(month => month.substring(0, 3))
      },
      newDepositorTrend: {
        series: [{ name: 'New Depositor', data: newDepositorData }],
        categories: months.map(month => month.substring(0, 3))
      },
      newRegisterTrend: {
        series: [{ name: 'New Register', data: newRegisterData }],
        categories: months.map(month => month.substring(0, 3))
      },
      activeMemberTrend: {
        series: [{ name: 'Active Member', data: activeMemberData }],
        categories: months.map(month => month.substring(0, 3))
      },
      pureMemberTrend: {
        series: [{ name: 'Pure Member', data: pureMemberData }],
        categories: months.map(month => month.substring(0, 3))
      },
      ggrUserTrend: {
        series: [{ name: 'GGR User', data: ggrUserData }],
        categories: months.map(month => month.substring(0, 3))
      },
      depositAmountUserTrend: {
        series: [{ name: 'Deposit Amount User', data: depositAmountUserData }],
        categories: months.map(month => month.substring(0, 3))
      },
      retentionRateTrend: {
        series: [{ name: 'Retention Rate', data: retentionRateData }],
        categories: months.map(month => month.substring(0, 3))
      },
      churnRateTrend: {
        series: [{ name: 'Churn Rate', data: churnRateData }],
        categories: months.map(month => month.substring(0, 3))
      },
      customerLifetimeValueTrend: {
        series: [{ name: 'Customer Lifetime Value', data: customerLifetimeValueData }],
        categories: months.map(month => month.substring(0, 3))
      },
      purchaseFrequencyTrend: {
        series: [{ name: 'Purchase Frequency', data: purchaseFrequencyData }],
        categories: months.map(month => month.substring(0, 3))
      }
    }

  } catch (error) {
    console.error('❌ [USCLogic] Error fetching USC line chart data:', error)
    
    return {
      success: false,
      netProfitTrend: { series: [], categories: [] },
      newDepositorTrend: { series: [], categories: [] },
      newRegisterTrend: { series: [], categories: [] },
      activeMemberTrend: { series: [], categories: [] },
      pureMemberTrend: { series: [], categories: [] },
      ggrUserTrend: { series: [], categories: [] },
      depositAmountUserTrend: { series: [], categories: [] },
      retentionRateTrend: { series: [], categories: [] },
      churnRateTrend: { series: [], categories: [] },
      customerLifetimeValueTrend: { series: [], categories: [] },
      purchaseFrequencyTrend: { series: [], categories: [] }
    }
  }
}

// ===========================================
// UTILITY EXPORTS
// ===========================================

export function clearUSCKPICache(): void {
  uscCache.clear()
}

export function getUSCComparisonColor(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? '#059669' : num < 0 ? '#dc2626' : '#6b7280'
}

export function formatUSCMoMValue(value: number): string {
  const num = Number(value) || 0
  return num > 0 ? `+${num.toFixed(1)}%` : `${num.toFixed(1)}%`
}

console.log('🎯 [USCLogic] USC Logic loaded successfully with currency locked to USC!')

