import { supabase } from './supabase'
import { calculateDailyAverage, getCurrentMonthProgress } from './dailyAverageHelper'
import { KPI_FORMULAS } from './KPILogic'

// USC KPI Calculation Logic
export interface USCKPIData {
  depositAmount: number
  depositCases: number
  withdrawAmount: number
  withdrawCases: number
  addTransaction: number
  deductTransaction: number
  ggr: number
  netProfit: number
  activeMember: number
  ggrUser: number
  daUser: number
  newMember: number
  averageTransactionValue: number
  purchaseFrequency: number
  churnMember: number
  // New KPI fields
  validAmount: number
  newRegister: number
  pureMember: number
  pureUser: number
  churnRate: number
  growthRate: number
  retentionRate: number
  averageCustomerLifespan: number
  customerLifetimeValue: number
  customerMaturityIndex: number
  newCustomerConversionRate: number
}

export interface USCKPIMoM {
  depositAmount: number
  depositCases: number
  withdrawAmount: number
  withdrawCases: number
  addTransaction: number
  deductTransaction: number
  ggr: number
  netProfit: number
  activeMember: number
  ggrUser: number
  daUser: number
  newMember: number
  averageTransactionValue: number
  purchaseFrequency: number
  churnMember: number
  // New KPI fields
  validAmount: number
  newRegister: number
  pureMember: number
  pureUser: number
  churnRate: number
  growthRate: number
  retentionRate: number
  averageCustomerLifespan: number
  customerLifetimeValue: number
  customerMaturityIndex: number
  newCustomerConversionRate: number
}

// New interfaces for Churn Member and Retention Day
export interface ChurnMemberData {
  churnCount: number
  previousPeriodActiveMembers: string[] // userkey list
  currentPeriodActiveMembers: string[] // userkey list
  churnedMembers: string[] // userkey list
}

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
}

// Get USC KPI Data from member_report_daily table
export async function getUSCKPIData(
  year: string,
  month: string,
  currency: string = 'USC',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null
): Promise<USCKPIData> {
  try {
    console.log('🔍 [USCLogic] Fetching USC KPI data:', { year, month, currency, line, startDate, endDate })

    // Build query for member_report_daily table
    let query = supabase
      .from('member_report_daily')
      .select('deposit_amount, deposit_cases, withdraw_amount, withdraw_cases, add_transaction, deduct_transaction, bonus, valid_amount, userkey, user_name, unique_code, currency, line, date')

    // Apply date filter based on mode
    if (startDate) {
      // Range mode: use start and end date
      query = query.gte('date', startDate)
      if (endDate) {
        query = query.lte('date', endDate)
      }
    } else {
      // Month mode: use year and month
      const monthIndex = getMonthIndex(month)
      const yearInt = parseInt(year)
      query = query
        .gte('date', `${yearInt}-${monthIndex.toString().padStart(2, '0')}-01`)
        .lt('date', `${yearInt}-${(monthIndex + 1).toString().padStart(2, '0')}-01`)
    }

    // Apply currency filter (if not "All")
    if (currency !== 'All') {
      query = query.eq('currency', currency)
      console.log('🔍 [USCLogic] Applied currency filter:', currency)
    } else {
      console.log('🔍 [USCLogic] No currency filter applied (All currencies)')
    }

    // Apply line filter (if not "All")
    if (line !== 'All') {
      query = query.eq('line', line)
      console.log('🔍 [USCLogic] Applied line filter:', line)
    } else {
      console.log('🔍 [USCLogic] No line filter applied (All lines)')
    }

    // Debug: Check what lines are available
    const { data: availableLines } = await supabase
      .from('member_report_daily')
      .select('line')
      .limit(10)
    console.log('🔍 [USCLogic] Available lines in database:', Array.from(new Set(availableLines?.map(row => row.line) || [])))
    
    // Debug: Check total records in table
    const { count: totalRecords } = await supabase
      .from('member_report_daily')
      .select('*', { count: 'exact', head: true })
    console.log('🔍 [USCLogic] Total records in member_report_daily:', totalRecords)
    
    // Debug: Check sample data without filters
    const { data: sampleData } = await supabase
      .from('member_report_daily')
      .select('*')
      .limit(3)
    console.log('🔍 [USCLogic] Sample data without filters:', sampleData)

    const { data, error } = await query

    if (error) {
      console.error('❌ [USCLogic] Database error:', error)
      throw error
    }

    // Debug: Check filtered data and currency values
    if (data && data.length > 0) {
      const currenciesInData = Array.from(new Set(data.map(row => row.currency)))
      console.log('🔍 [USCLogic] Currencies found in filtered data:', currenciesInData)
      console.log('🔍 [USCLogic] First few rows of filtered data:', data.slice(0, 3).map(row => ({
        currency: row.currency,
        line: row.line,
        date: row.date,
        deposit_amount: row.deposit_amount
      })))
    }

    // Fetch new member data from new_depositor table
    let newMemberData: any[] = []
    try {
      // Build query for new_depositor table
      let newMemberQuery = supabase
        .from('new_depositor')
        .select('*')

      // Apply same filters as main query
      if (startDate) {
        // Range mode: use start and end date
        newMemberQuery = newMemberQuery.gte('date', startDate)
        if (endDate) {
          newMemberQuery = newMemberQuery.lte('date', endDate)
        }
      } else {
        // Month mode: use year and month
        const monthIndex = getMonthIndex(month)
        const yearInt = parseInt(year)
        newMemberQuery = newMemberQuery
          .gte('date', `${yearInt}-${monthIndex.toString().padStart(2, '0')}-01`)
          .lt('date', `${yearInt}-${(monthIndex + 1).toString().padStart(2, '0')}-01`)
      }

      // Apply currency filter (if not "All")
      if (currency !== 'All') {
        newMemberQuery = newMemberQuery.eq('currency', currency)
      }

      // Apply line filter (if not "All")
      if (line !== 'All') {
        newMemberQuery = newMemberQuery.eq('line', line)
      }

      const { data: newMemberResult, error: newMemberError } = await newMemberQuery
      
      if (newMemberError) {
        console.warn('⚠️ [USCLogic] New member query error:', newMemberError)
      } else {
        newMemberData = newMemberResult || []
        console.log('📊 [USCLogic] New member data found:', newMemberData.length, 'records')
      }
    } catch (error) {
      console.warn('⚠️ [USCLogic] New member query failed:', error)
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ [USCLogic] No data found for:', { year, month, currency, line, startDate, endDate })
      console.warn('⚠️ [USCLogic] Query filters applied:', { 
        currency: currency !== 'All' ? currency : 'All currencies',
        line: line !== 'All' ? line : 'All lines',
        dateRange: startDate ? `${startDate} to ${endDate || 'single date'}` : `${year}-${month}`
      })
      return getDefaultUSCData()
    }

    console.log('📊 [USCLogic] Raw data count:', data.length)
    console.log('📊 [USCLogic] New member data count:', newMemberData?.length || 0)
    console.log('📊 [USCLogic] Sample data:', data.slice(0, 2))
    console.log('📊 [USCLogic] Sample new member data:', newMemberData?.slice(0, 2))

    // Get churn member data
    const churnMember = await getChurnMembersUSC(year, month, currency, line, startDate, endDate)
    
    // Calculate KPIs with new member data and churn data
    const kpiData = calculateUSCKPIs(data, newMemberData || [], currency, churnMember)

    console.log('✅ [USCLogic] KPI calculation completed:', kpiData)
    return kpiData

  } catch (error) {
    console.error('❌ [USCLogic] Error in getUSCKPIData:', error)
    return getDefaultUSCData()
  }
}

// Helper function untuk churn member calculation (USC version)
async function getChurnMembersUSC(
  year: string,
  month: string,
  currency: string,
  line: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<number> {
  try {
    // Get previous month data
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonthIndex = monthNames.indexOf(month)
    const prevMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
    const prevMonth = monthNames[prevMonthIndex]
    const prevYear = currentMonthIndex === 0 ? (parseInt(year) - 1).toString() : year

    // Get users from previous month
    const prevQuery = (() => {
      let query = supabase
        .from('member_report_daily')
        .select('userkey')
        .eq('year', prevYear)
        .eq('month', prevMonth)
        .eq('currency', currency)
        .gt('deposit_amount', 0)
      
      if (line && line !== 'All') {
        query = query.eq('line', line)
      }
      
      return query
    })()
    
    const { data: prevUsers, error: prevError } = await prevQuery
    if (prevError) throw prevError

    // Get users from current month
    const currentQuery = (() => {
      let query = supabase
        .from('member_report_daily')
        .select('userkey')
        .eq('year', year)
        .eq('month', month)
        .eq('currency', currency)
        .gt('deposit_amount', 0)
      
      if (line && line !== 'All') {
        query = query.eq('line', line)
      }
      
      return query
    })()
    
    const { data: currentUsers, error: currentError } = await currentQuery
    if (currentError) throw currentError

    const prevUserKeys = new Set((prevUsers || []).map((u: any) => u.userkey).filter(Boolean))
    const currentUserKeys = new Set((currentUsers || []).map((u: any) => u.userkey).filter(Boolean))

    // Churn = users in previous month but not in current month
    const churnedUsers = Array.from(prevUserKeys).filter(userKey => !currentUserKeys.has(userKey))
    
    console.log('🔍 [USCLogic] Churn calculation:', {
      prevMonth: prevMonth,
      prevYear: prevYear,
      prevUsers: prevUserKeys.size,
      currentUsers: currentUserKeys.size,
      churnedUsers: churnedUsers.length
    })
    
    return churnedUsers.length

  } catch (error) {
    console.error('❌ [USCLogic] Error calculating churn members:', error)
    return 0
  }
}

// Calculate USC KPIs from raw data
function calculateUSCKPIs(data: any[], newMemberData: any[], currency: string, churnMember: number): USCKPIData {
  // Basic sum calculations
  const depositAmount = data.reduce((sum, row) => sum + (row.deposit_amount || 0), 0)
  const depositCases = data.reduce((sum, row) => sum + (row.deposit_cases || 0), 0)
  const withdrawAmount = data.reduce((sum, row) => sum + (row.withdraw_amount || 0), 0)
  const withdrawCases = data.reduce((sum, row) => sum + (row.withdraw_cases || 0), 0)
  const addTransaction = data.reduce((sum, row) => sum + (row.add_transaction || 0), 0)
  const deductTransaction = data.reduce((sum, row) => sum + (row.deduct_transaction || 0), 0)

  // Active Member calculation (unique userkey where deposit_cases > 0)
  const activeMembers = new Set(
    data
      .filter(row => row.deposit_cases > 0 && row.userkey)
      .map(row => row.userkey)
  )
  const activeMember = activeMembers.size

  // New Member calculation from new_depositor table
  const newMember = newMemberData.reduce((sum, row) => sum + (row.new_depositor || 0), 0) // SUM from new_depositor column

  // New KPI calculations based on requirements
  const validAmount = data.reduce((sum, row) => sum + (row.valid_amount || 0), 0)
  const newRegister = newMemberData.reduce((sum, row) => sum + (row.new_register || 0), 0)
  const pureMember = activeMember - newMember
  const pureUser = new Set(
    data
      .filter(row => row.deposit_cases > 0 && row.unique_code)
      .map(row => row.unique_code)
  ).size

  // Churn Member is now passed as parameter from getUSCKPIData function

  // Derived KPIs
  const ggr = depositAmount - withdrawAmount
  const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)
  const ggrUser = activeMember > 0 ? ggr / activeMember : 0
  const daUser = activeMember > 0 ? depositAmount / activeMember : 0
  
  // New derived KPIs
  const averageTransactionValue = depositCases > 0 ? depositAmount / depositCases : 0
  const purchaseFrequency = activeMember > 0 ? depositCases / activeMember : 0

  // Advanced KPI calculations
  const churnRate = Math.max(churnMember / activeMember, 0.01) * 100
  
  // Growth Rate calculation: (Current Active Member - Previous Active Member) / Previous Active Member
  // For now, using simplified calculation since we don't have previous month data in this function
  const previousActiveMember = Math.max(activeMember - newMember, 1) // Simplified: current - new members
  const growthRate = ((activeMember - previousActiveMember) / previousActiveMember) * 100
  
  const retentionRate = Math.max(1 - (churnRate / 100), 0) * 100
  const averageCustomerLifespan = 1 / churnRate
  const customerLifetimeValue = purchaseFrequency * averageTransactionValue * averageCustomerLifespan
  
  // CMI calculation according to exact formula provided
  const customerMaturityIndex = (retentionRate * 0.5) + (growthRate * 0.5) + (churnRate * 0.2)
  
  const newCustomerConversionRate = newRegister > 0 ? (newMember / newRegister) * 100 : 0

  return {
    depositAmount,
    depositCases,
    withdrawAmount,
    withdrawCases,
    addTransaction,
    deductTransaction,
    ggr,
    netProfit,
    activeMember,
    ggrUser,
    daUser,
    newMember,
    averageTransactionValue,
    purchaseFrequency,
    churnMember,
    // New KPI fields
    validAmount,
    newRegister,
    pureMember,
    pureUser,
    churnRate,
    growthRate,
    retentionRate,
    averageCustomerLifespan,
    customerLifetimeValue,
    customerMaturityIndex,
    newCustomerConversionRate
  }
}

// Get USC MoM (Month over Month) comparison
export async function getUSCMoMData(
  year: string,
  month: string,
  currency: string = 'USC',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null
): Promise<USCKPIMoM> {
  try {
    console.log('🔍 [USCLogic] Fetching USC MoM data:', { year, month, currency, line, startDate, endDate })

    // Get current month data
    const currentData = await getUSCKPIData(year, month, currency, line, startDate, endDate)
    
    // Get previous month data
    const previousMonth = getPreviousMonth(month)
    const previousYear = previousMonth === 'December' ? (parseInt(year) - 1).toString() : year
    const previousData = await getUSCKPIData(previousYear, previousMonth, currency, line)

    console.log('🔍 [USCLogic] Current vs Previous data:', {
      current: { year, month, depositAmount: currentData.depositAmount },
      previous: { year: previousYear, month: previousMonth, depositAmount: previousData.depositAmount }
    })

    // Use standard KPI_FORMULAS.PERCENTAGE_CHANGE
    const momData: USCKPIMoM = {
      depositAmount: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.depositAmount, previousData.depositAmount),
      depositCases: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.depositCases, previousData.depositCases),
      withdrawAmount: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.withdrawAmount, previousData.withdrawAmount),
      withdrawCases: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.withdrawCases, previousData.withdrawCases),
      addTransaction: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.addTransaction, previousData.addTransaction),
      deductTransaction: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.deductTransaction, previousData.deductTransaction),
      ggr: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.ggr, previousData.ggr),
      netProfit: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.netProfit, previousData.netProfit),
      activeMember: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.activeMember, previousData.activeMember),
      ggrUser: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.ggrUser, previousData.ggrUser),
      daUser: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.daUser, previousData.daUser),
      newMember: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.newMember, previousData.newMember),
      averageTransactionValue: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.averageTransactionValue, previousData.averageTransactionValue),
      purchaseFrequency: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.purchaseFrequency, previousData.purchaseFrequency),
      churnMember: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.churnMember, previousData.churnMember),
      // New KPI fields
      validAmount: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.validAmount, previousData.validAmount),
      newRegister: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.newRegister, previousData.newRegister),
      pureMember: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.pureMember, previousData.pureMember),
      pureUser: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.pureUser, previousData.pureUser),
      churnRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.churnRate, previousData.churnRate),
      growthRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.growthRate, previousData.growthRate),
      retentionRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.retentionRate, previousData.retentionRate),
      averageCustomerLifespan: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.averageCustomerLifespan, previousData.averageCustomerLifespan),
      customerLifetimeValue: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.customerLifetimeValue, previousData.customerLifetimeValue),
      customerMaturityIndex: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.customerMaturityIndex, previousData.customerMaturityIndex),
      newCustomerConversionRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.newCustomerConversionRate, previousData.newCustomerConversionRate)
    }

    console.log('✅ [USCLogic] MoM calculation completed:', momData)
    return momData

  } catch (error) {
    console.error('❌ [USCLogic] Error in getUSCMoMData:', error)
    return getDefaultUSCMoM()
  }
}

// Get USC Daily Average data
export async function getUSCDailyAverageData(
  year: string,
  month: string,
  currency: string = 'USC',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null
): Promise<USCKPIData> {
  try {
    console.log('🔍 [USCLogic] Fetching USC Daily Average data:', { year, month, currency, line, startDate, endDate })

    const kpiData = await getUSCKPIData(year, month, currency, line, startDate, endDate)

    // Use standard calculateDailyAverage function
    const dailyAverage: USCKPIData = {
      depositAmount: await calculateDailyAverage(kpiData.depositAmount, year, month),
      depositCases: await calculateDailyAverage(kpiData.depositCases, year, month),
      withdrawAmount: await calculateDailyAverage(kpiData.withdrawAmount, year, month),
      withdrawCases: await calculateDailyAverage(kpiData.withdrawCases, year, month),
      addTransaction: await calculateDailyAverage(kpiData.addTransaction, year, month),
      deductTransaction: await calculateDailyAverage(kpiData.deductTransaction, year, month),
      ggr: await calculateDailyAverage(kpiData.ggr, year, month),
      netProfit: await calculateDailyAverage(kpiData.netProfit, year, month),
      activeMember: await calculateDailyAverage(kpiData.activeMember, year, month),
      ggrUser: await calculateDailyAverage(kpiData.ggrUser, year, month),
      daUser: await calculateDailyAverage(kpiData.daUser, year, month),
      newMember: await calculateDailyAverage(kpiData.newMember, year, month),
      averageTransactionValue: await calculateDailyAverage(kpiData.averageTransactionValue, year, month),
      purchaseFrequency: await calculateDailyAverage(kpiData.purchaseFrequency, year, month),
      churnMember: await calculateDailyAverage(kpiData.churnMember, year, month),
      // New KPI fields
      validAmount: await calculateDailyAverage(kpiData.validAmount, year, month),
      newRegister: await calculateDailyAverage(kpiData.newRegister, year, month),
      pureMember: await calculateDailyAverage(kpiData.pureMember, year, month),
      pureUser: await calculateDailyAverage(kpiData.pureUser, year, month),
      churnRate: await calculateDailyAverage(kpiData.churnRate, year, month),
      growthRate: await calculateDailyAverage(kpiData.growthRate, year, month),
      retentionRate: await calculateDailyAverage(kpiData.retentionRate, year, month),
      averageCustomerLifespan: await calculateDailyAverage(kpiData.averageCustomerLifespan, year, month),
      customerLifetimeValue: await calculateDailyAverage(kpiData.customerLifetimeValue, year, month),
      customerMaturityIndex: await calculateDailyAverage(kpiData.customerMaturityIndex, year, month),
      newCustomerConversionRate: await calculateDailyAverage(kpiData.newCustomerConversionRate, year, month)
    }

    console.log('✅ [USCLogic] Daily Average calculation completed:', dailyAverage)
    return dailyAverage

  } catch (error) {
    console.error('❌ [USCLogic] Error in getUSCDailyAverageData:', error)
    return getDefaultUSCData()
  }
}

// Get USC Chart Data for Line Charts
export async function getUSCChartData(
  year: string,
  month: string,
  currency: string = 'USC',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null
): Promise<any> {
  try {
    console.log('🔍 [USCLogic] Fetching USC Chart data:', { year, month, currency, line, startDate, endDate })

    // Fetch data for all months to create trend charts
    const allMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August']
    const yearInt = parseInt(year)
    
    let chartData: any = {}
    
    if (startDate) {
      // Range mode: use daily data
      const dailyData = await getDailyChartData(startDate, endDate || null, currency, line)
      
      chartData = {
        ggrUserTrend: {
          series: [{ name: 'GGR User Trend', data: dailyData.map(d => d.activeMember > 0 ? d.ggr / d.activeMember : 0) }],
          categories: dailyData.map(d => d.day)
        },
        daUserTrend: {
          series: [{ name: 'DA User Trend', data: dailyData.map(d => d.activeMember > 0 ? d.depositAmount / d.activeMember : 0) }],
          categories: dailyData.map(d => d.day)
        },
        atvTrend: {
          series: [{ name: 'Average Transaction Value Trend', data: dailyData.map(d => d.depositCases > 0 ? d.depositAmount / d.depositCases : 0) }],
          categories: dailyData.map(d => d.day)
        },
        pfTrend: {
          series: [{ name: 'Purchase Frequency Trend', data: dailyData.map(d => d.activeMember > 0 ? d.depositCases / d.activeMember : 0) }],
          categories: dailyData.map(d => d.day)
        },
        clvTrend: {
          series: [{ name: 'Customer Lifetime Value Trend', data: dailyData.map(d => {
            const atv = d.depositCases > 0 ? d.depositAmount / d.depositCases : 0
            const pf = d.activeMember > 0 ? d.depositCases / d.activeMember : 0
            const churnRate = d.activeMember > 0 ? Math.max(1 / d.activeMember, 0.01) : 0.01
            const acl = 1 / churnRate
            return pf * atv * acl
          }) }],
          categories: dailyData.map(d => d.day)
        },
        cmiTrend: {
          series: [{ name: 'Customer Maturity Index Trend', data: dailyData.map(d => {
            // Calculate real CMI based on actual data
            const churnRate = d.activeMember > 0 ? Math.max(1 / d.activeMember, 0.01) * 100 : 1
            const retentionRate = Math.max(1 - (churnRate / 100), 0) * 100
            const previousActiveMember = Math.max(d.activeMember - (d.newMember || 0), 1)
            const growthRate = ((d.activeMember - previousActiveMember) / previousActiveMember) * 100
            return (retentionRate * 0.5) + (growthRate * 0.5) + (churnRate * 0.2)
          }) }],
          categories: dailyData.map(d => d.day)
        },
        retentionRateTrend: {
          series: [{ name: 'Retention Rate Trend', data: dailyData.map(d => {
            // Calculate real retention rate based on actual data from each day
            const churnRate = d.activeMember > 0 ? Math.max(1 / d.activeMember, 0.01) * 100 : 1
            const retentionRate = Math.max(1 - (churnRate / 100), 0) * 100
            return Math.round(retentionRate * 10) / 10 // Round to 1 decimal
          }) }],
          categories: dailyData.map(d => d.day)
        },
        churnRateTrend: {
          series: [{ name: 'Churn Rate Trend', data: dailyData.map(d => {
            // Calculate real churn rate based on actual data from each day
            const churnRate = d.activeMember > 0 ? Math.max(1 / d.activeMember, 0.01) * 100 : 1
            return Math.round(churnRate * 10) / 10 // Round to 1 decimal
          }) }],
          categories: dailyData.map(d => d.day)
        },
        conversionRateTrend: {
          series: [{ name: 'Conversion Rate Trend', data: dailyData.map(d => {
            // Use real data from new_depositor table for each day
            const dayNewRegister = d.newRegister || 0
            const dayNewMember = d.newMember || 0
            return dayNewRegister > 0 ? (dayNewMember / dayNewRegister) * 100 : 0
          }) }],
          categories: dailyData.map(d => d.day)
        },
        activeVsPureMemberTrend: {
          series: [
            { name: 'Active Member', data: dailyData.map(d => d.activeMember) },
            { name: 'Pure Member', data: dailyData.map(d => Math.max(d.activeMember - (d.newMember || 0), 0)) }
          ],
          categories: dailyData.map(d => d.day)
        }
      }
    } else {
      // Month mode: Get real data for each month
      const monthlyData = await getMonthlyChartData(yearInt, allMonths, currency, line)
      
      chartData = {
        ggrUserTrend: {
          series: [{ name: 'GGR User Trend', data: monthlyData.map(m => m.activeMember > 0 ? m.ggr / m.activeMember : 0) }],
          categories: monthlyData.map(m => m.month)
        },
        daUserTrend: {
          series: [{ name: 'DA User Trend', data: monthlyData.map(m => m.activeMember > 0 ? m.depositAmount / m.activeMember : 0) }],
          categories: monthlyData.map(m => m.month)
        },
        atvTrend: {
          series: [{ name: 'Average Transaction Value Trend', data: monthlyData.map(m => m.depositCases > 0 ? m.depositAmount / m.depositCases : 0) }],
          categories: monthlyData.map(m => m.month)
        },
        pfTrend: {
          series: [{ name: 'Purchase Frequency Trend', data: monthlyData.map(m => m.activeMember > 0 ? m.depositCases / m.activeMember : 0) }],
          categories: monthlyData.map(m => m.month)
        },
        clvTrend: {
          series: [{ name: 'Customer Lifetime Value Trend', data: monthlyData.map(m => {
            const atv = m.depositCases > 0 ? m.depositAmount / m.depositCases : 0
            const pf = m.activeMember > 0 ? m.depositCases / m.activeMember : 0
            const churnRate = m.activeMember > 0 ? Math.max(1 / m.activeMember, 0.01) : 0.01
            const acl = 1 / churnRate
            return pf * atv * acl
          }) }],
          categories: monthlyData.map(m => m.month)
        },
        cmiTrend: {
          series: [{ name: 'Customer Maturity Index Trend', data: monthlyData.map(m => {
            // Calculate real CMI based on actual data
            const churnRate = m.activeMember > 0 ? Math.max(1 / m.activeMember, 0.01) * 100 : 1
            const retentionRate = Math.max(1 - (churnRate / 100), 0) * 100
            const previousActiveMember = Math.max(m.activeMember - (m.newMember || 0), 1)
            const growthRate = ((m.activeMember - previousActiveMember) / previousActiveMember) * 100
            return (retentionRate * 0.5) + (growthRate * 0.5) + (churnRate * 0.2)
          }) }],
          categories: monthlyData.map(m => m.month)
        },
        retentionRateTrend: {
          series: [{ name: 'Retention Rate Trend', data: monthlyData.map(m => {
            // Use real churn data from database for each month
            const churnRate = (m.churnMember || 0) > 0 ? Math.max(((m.churnMember || 0) / m.activeMember), 0.01) * 100 : 1
            const retentionRate = Math.max(1 - (churnRate / 100), 0) * 100
            return Math.round(retentionRate * 10) / 10 // Round to 1 decimal
          }) }],
          categories: monthlyData.map(m => m.month)
        },
        churnRateTrend: {
          series: [{ name: 'Churn Rate Trend', data: monthlyData.map(m => {
            // Use real churn data from database for each month
            const churnRate = (m.churnMember || 0) > 0 ? Math.max(((m.churnMember || 0) / m.activeMember), 0.01) * 100 : 1
            return Math.round(churnRate * 10) / 10 // Round to 1 decimal
          }) }],
          categories: monthlyData.map(m => m.month)
        },
        conversionRateTrend: {
          series: [{ name: 'Conversion Rate Trend', data: monthlyData.map(m => {
            // Use real data from new_depositor table for each month
            const monthNewRegister = m.newRegister || 0
            const monthNewMember = m.newMember || 0
            return monthNewRegister > 0 ? (monthNewMember / monthNewRegister) * 100 : 0
          }) }],
          categories: monthlyData.map(m => m.month)
        },
        activeVsPureMemberTrend: {
          series: [
            { name: 'Active Member', data: monthlyData.map(m => m.activeMember) },
            { name: 'Pure Member', data: monthlyData.map(m => Math.max(m.activeMember - (m.newMember || 0), 0)) }
          ],
          categories: monthlyData.map(m => m.month)
        }
      }
    }

    console.log('✅ [USCLogic] Chart data prepared:', chartData)
    return chartData

  } catch (error) {
    console.error('❌ [USCLogic] Error in getUSCChartData:', error)
    return getDefaultUSCChartData()
  }
}

// Helper function to get daily chart data with real new_depositor data
async function getDailyChartData(startDate: string, endDate: string | null, currency: string, line: string) {
  const dailyData = []
  
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date(startDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include end date
  
  for (let i = 0; i <= diffDays; i++) {
    const currentDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
    const dayKey = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`
    
    try {
      let query = supabase
        .from('member_report_daily')
        .select('deposit_amount, deposit_cases, withdraw_amount, withdraw_cases, add_transaction, deduct_transaction, userkey, unique_code')
        .gte('date', currentDate.toISOString().split('T')[0])
        .lt('date', new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      
      if (currency !== 'All') {
        query = query.eq('currency', currency)
      }
      if (line !== 'All') {
        query = query.eq('line', line)
      }
      
      const { data: memberData } = await query
      
      let newMemberQuery = supabase
        .from('new_depositor')
        .select('new_register, new_depositor')
        .gte('date', currentDate.toISOString().split('T')[0])
        .lt('date', new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      
      if (currency !== 'All') {
        newMemberQuery = newMemberQuery.eq('currency', currency)
      }
      if (line !== 'All') {
        newMemberQuery = newMemberQuery.eq('line', line)
      }
      
      const { data: newMemberData } = await newMemberQuery
      
      const depositAmount = memberData?.reduce((sum: number, row: any) => sum + (row.deposit_amount || 0), 0) || 0
      const depositCases = memberData?.reduce((sum: number, row: any) => sum + (row.deposit_cases || 0), 0) || 0
      const withdrawAmount = memberData?.reduce((sum: number, row: any) => sum + (row.withdraw_amount || 0), 0) || 0
      const withdrawCases = memberData?.reduce((sum: number, row: any) => sum + (row.withdraw_cases || 0), 0) || 0
      const addTransaction = memberData?.reduce((sum: number, row: any) => sum + (row.add_transaction || 0), 0) || 0
      const deductTransaction = memberData?.reduce((sum: number, row: any) => sum + (row.deduct_transaction || 0), 0) || 0
      
      const activeMember = new Set(
        memberData
          ?.filter((row: any) => (row.deposit_cases as number) > 0 && row.userkey)
          .map((row: any) => row.userkey) || []
      ).size
      
      const newRegister = newMemberData?.reduce((sum: number, row: any) => sum + (row.new_register || 0), 0) || 0
      const newMember = newMemberData?.reduce((sum: number, row: any) => sum + (row.new_depositor || 0), 0) || 0
      
      const ggr = depositAmount - withdrawAmount
      
      dailyData.push({
        day: dayKey,
        depositAmount,
        depositCases,
        withdrawAmount,
        withdrawCases,
        addTransaction,
        deductTransaction,
        activeMember,
        newRegister,
        newMember,
        ggr
      })
      
    } catch (error) {
      console.warn(`⚠️ [USCLogic] Error fetching data for ${dayKey}:`, error)
      // Add default data for this day
      dailyData.push({
        day: dayKey,
        depositAmount: 0,
        depositCases: 0,
        withdrawAmount: 0,
        withdrawCases: 0,
        addTransaction: 0,
        deductTransaction: 0,
        activeMember: 0,
        newRegister: 0,
        newMember: 0,
        ggr: 0
      })
    }
  }
  
  return dailyData
}

// Helper function to get monthly chart data with real new_depositor data
async function getMonthlyChartData(year: number, months: string[], currency: string, line: string) {
  const monthlyData = []
  
  for (const month of months) {
    try {
      const monthIndex = getMonthIndex(month)
      const startDate = `${year}-${monthIndex.toString().padStart(2, '0')}-01`
      const endDate = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-01`
      
      // Get member_report_daily data for this month
      let query = supabase
        .from('member_report_daily')
        .select('deposit_amount, deposit_cases, withdraw_amount, withdraw_cases, add_transaction, deduct_transaction, userkey, unique_code')
        .gte('date', startDate)
        .lt('date', endDate)
      
      if (currency !== 'All') {
        query = query.eq('currency', currency)
      }
      if (line !== 'All') {
        query = query.eq('line', line)
      }
      
      const { data: memberData } = await query
      
      // Get new_depositor data for this month
      let newMemberQuery = supabase
        .from('new_depositor')
        .select('new_register, new_depositor')
        .gte('date', startDate)
        .lt('date', endDate)
      
      if (currency !== 'All') {
        newMemberQuery = newMemberQuery.eq('currency', currency)
      }
      if (line !== 'All') {
        newMemberQuery = newMemberQuery.eq('line', line)
      }
      
      const { data: newMemberData } = await newMemberQuery
      
      // Calculate monthly totals
      const depositAmount = memberData?.reduce((sum: number, row: any) => sum + (row.deposit_amount || 0), 0) || 0
      const depositCases = memberData?.reduce((sum: number, row: any) => sum + (row.deposit_cases || 0), 0) || 0
      const withdrawAmount = memberData?.reduce((sum: number, row: any) => sum + (row.withdraw_amount || 0), 0) || 0
      const withdrawCases = memberData?.reduce((sum: number, row: any) => sum + (row.withdraw_cases || 0), 0) || 0
      const addTransaction = memberData?.reduce((sum: number, row: any) => sum + (row.add_transaction || 0), 0) || 0
      const deductTransaction = memberData?.reduce((sum: number, row: any) => sum + (row.deduct_transaction || 0), 0) || 0
      
      const activeMember = new Set(
        memberData
          ?.filter((row: any) => (row.deposit_cases as number) > 0 && row.userkey)
          .map((row: any) => row.userkey) || []
      ).size
      
      const newRegister = newMemberData?.reduce((sum: number, row: any) => sum + (row.new_register || 0), 0) || 0
      const newMember = newMemberData?.reduce((sum: number, row: any) => sum + (row.new_depositor || 0), 0) || 0
      
      const ggr = depositAmount - withdrawAmount
      
      // Calculate churn member for this month
      const churnMember = await getChurnMembersUSC(year.toString(), month, currency, line)
      
      monthlyData.push({
        month: month.substring(0, 3), // Jan, Feb, etc.
        depositAmount,
        depositCases,
        withdrawAmount,
        withdrawCases,
        addTransaction,
        deductTransaction,
        activeMember,
        newRegister,
        newMember,
        ggr,
        churnMember
      })
      
    } catch (error) {
      console.warn(`⚠️ [USCLogic] Error fetching data for ${month}:`, error)
              // Add default data for this month
        monthlyData.push({
          month: month.substring(0, 3),
          depositAmount: 0,
          depositCases: 0,
          withdrawAmount: 0,
          withdrawCases: 0,
          addTransaction: 0,
          deductTransaction: 0,
          activeMember: 0,
          newRegister: 0,
          newMember: 0,
          ggr: 0,
          churnMember: 0
        })
    }
  }
  
  return monthlyData
}

// Helper Functions
function getMonthIndex(month: string): number {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months.indexOf(month) + 1
}

function getPreviousMonth(month: string): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const currentIndex = months.indexOf(month)
  const previousIndex = currentIndex === 0 ? 11 : currentIndex - 1
  return months[previousIndex]
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function groupByMonth(data: any[]): any[] {
  const monthlyGroups: { [key: string]: any[] } = {}
  
  data.forEach(row => {
    const date = new Date(row.date as string)
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    
    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = []
    }
    monthlyGroups[monthKey].push(row)
  })

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  return Object.keys(monthlyGroups).map(monthKey => {
    const monthData = monthlyGroups[monthKey]
    const monthIndex = parseInt(monthKey.split('-')[1]) - 1
    
    // Calculate totals for the month
    const depositAmount = monthData.reduce((sum, row) => sum + (row.deposit_amount || 0), 0)
    const withdrawAmount = monthData.reduce((sum, row) => sum + (row.withdraw_amount || 0), 0)
    const addTransaction = monthData.reduce((sum, row) => sum + (row.add_transaction || 0), 0)
    const deductTransaction = monthData.reduce((sum, row) => sum + (row.deduct_transaction || 0), 0)
    
    const ggr = depositAmount - withdrawAmount
    const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)
    
    // Active members for the month
    const activeMembers = new Set(
      monthData
        .filter(row => row.deposit_cases > 0 && row.userkey)
        .map(row => row.userkey)
    )
    
    // Calculate deposit cases for the month
    const depositCases = monthData.reduce((sum, row) => sum + (row.deposit_cases || 0), 0)
    
    return {
      month: months[monthIndex],
      depositAmount,
      withdrawAmount,
      ggr,
      netProfit,
      activeMember: activeMembers.size,
      depositCases
    }
  })
}

// Default data functions
function getDefaultUSCData(): USCKPIData {
  return {
    depositAmount: 0,
    depositCases: 0,
    withdrawAmount: 0,
    withdrawCases: 0,
    addTransaction: 0,
    deductTransaction: 0,
    ggr: 0,
    netProfit: 0,
    activeMember: 0,
    ggrUser: 0,
    daUser: 0,
    newMember: 0,
    averageTransactionValue: 0,
    purchaseFrequency: 0,
    churnMember: 0,
    // New KPI fields
    validAmount: 0,
    newRegister: 0,
    pureMember: 0,
    pureUser: 0,
    churnRate: 0,
    growthRate: 0,
    retentionRate: 0,
    averageCustomerLifespan: 0,
    customerLifetimeValue: 0,
    customerMaturityIndex: 0,
    newCustomerConversionRate: 0
  }
}

function getDefaultUSCMoM(): USCKPIMoM {
  return {
    depositAmount: 0,
    depositCases: 0,
    withdrawAmount: 0,
    withdrawCases: 0,
    addTransaction: 0,
    deductTransaction: 0,
    ggr: 0,
    netProfit: 0,
    activeMember: 0,
    ggrUser: 0,
    daUser: 0,
    newMember: 0,
    averageTransactionValue: 0,
    purchaseFrequency: 0,
    churnMember: 0,
    // New KPI fields
    validAmount: 0,
    newRegister: 0,
    pureMember: 0,
    pureUser: 0,
    churnRate: 0,
    growthRate: 0,
    retentionRate: 0,
    averageCustomerLifespan: 0,
    customerLifetimeValue: 0,
    customerMaturityIndex: 0,
    newCustomerConversionRate: 0
  }
}

// Get All USC KPIs with MoM (Month over Month) comparison
export async function getAllUSCKPIsWithMoM(
  year: string,
  month: string,
  currency: string = 'USC',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null
): Promise<{ current: USCKPIData; mom: USCKPIMoM }> {
  try {
    console.log('🔍 [USCLogic] Fetching All USC KPIs with MoM:', { year, month, currency, line, startDate, endDate })

    // Get current month data
    const currentData = await getUSCKPIData(year, month, currency, line, startDate, endDate)
    
    // Get previous month data
    const previousMonth = getPreviousMonth(month)
    const previousYear = previousMonth === 'December' ? (parseInt(year) - 1).toString() : year
    const previousData = await getUSCKPIData(previousYear, previousMonth, currency, line)

    console.log('🔍 [USCLogic] Current vs Previous data:', {
      current: { year, month, depositAmount: currentData.depositAmount },
      previous: { year: previousYear, month: previousMonth, depositAmount: previousData.depositAmount }
    })

    // Calculate MoM using standard KPI_FORMULAS.PERCENTAGE_CHANGE
    const momData: USCKPIMoM = {
      depositAmount: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.depositAmount, previousData.depositAmount),
      depositCases: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.depositCases, previousData.depositCases),
      withdrawAmount: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.withdrawAmount, previousData.withdrawAmount),
      withdrawCases: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.withdrawCases, previousData.withdrawCases),
      addTransaction: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.addTransaction, previousData.addTransaction),
      deductTransaction: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.deductTransaction, previousData.deductTransaction),
      ggr: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.ggr, previousData.ggr),
      netProfit: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.netProfit, previousData.netProfit),
      activeMember: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.activeMember, previousData.activeMember),
      ggrUser: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.ggrUser, previousData.ggrUser),
      daUser: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.daUser, previousData.daUser),
      newMember: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.newMember, previousData.newMember),
      averageTransactionValue: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.averageTransactionValue, previousData.averageTransactionValue),
      purchaseFrequency: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.purchaseFrequency, previousData.purchaseFrequency),
      churnMember: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.churnMember, previousData.churnMember),
      // New KPI fields
      validAmount: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.validAmount, previousData.validAmount),
      newRegister: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.newRegister, previousData.newRegister),
      pureMember: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.pureMember, previousData.pureMember),
      pureUser: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.pureUser, previousData.pureUser),
      churnRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.churnRate, previousData.churnRate),
      growthRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.growthRate, previousData.growthRate),
      retentionRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.retentionRate, previousData.retentionRate),
      averageCustomerLifespan: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.averageCustomerLifespan, previousData.averageCustomerLifespan),
      customerLifetimeValue: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.customerLifetimeValue, previousData.customerLifetimeValue),
      customerMaturityIndex: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.customerMaturityIndex, previousData.customerMaturityIndex),
      newCustomerConversionRate: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.newCustomerConversionRate, previousData.newCustomerConversionRate)
    }

    console.log('✅ [USCLogic] All USC KPIs with MoM completed:', { current: currentData, mom: momData })
    return { current: currentData, mom: momData }

  } catch (error) {
    console.error('❌ [USCLogic] Error in getAllUSCKPIsWithMoM:', error)
    return { current: getDefaultUSCData(), mom: getDefaultUSCMoM() }
  }
}

// Get All USC KPIs with Daily Average
export async function getAllUSCKPIsWithDailyAverage(
  kpiData: USCKPIData,
  year: string,
  month: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<{ dailyAverage: USCKPIData }> {
  try {
    console.log('🔍 [USCLogic] Calculating Daily Average for USC KPIs:', { year, month, startDate, endDate })

    // Calculate daily average using standard calculateDailyAverage function
    const dailyAverage: USCKPIData = {
      depositAmount: await calculateDailyAverage(kpiData.depositAmount, year, month),
      depositCases: await calculateDailyAverage(kpiData.depositCases, year, month),
      withdrawAmount: await calculateDailyAverage(kpiData.withdrawAmount, year, month),
      withdrawCases: await calculateDailyAverage(kpiData.withdrawCases, year, month),
      addTransaction: await calculateDailyAverage(kpiData.addTransaction, year, month),
      deductTransaction: await calculateDailyAverage(kpiData.deductTransaction, year, month),
      ggr: await calculateDailyAverage(kpiData.ggr, year, month),
      netProfit: await calculateDailyAverage(kpiData.netProfit, year, month),
      activeMember: await calculateDailyAverage(kpiData.activeMember, year, month),
      ggrUser: await calculateDailyAverage(kpiData.ggrUser, year, month),
      daUser: await calculateDailyAverage(kpiData.daUser, year, month),
      newMember: await calculateDailyAverage(kpiData.newMember, year, month),
      averageTransactionValue: await calculateDailyAverage(kpiData.averageTransactionValue, year, month),
      purchaseFrequency: await calculateDailyAverage(kpiData.purchaseFrequency, year, month),
      churnMember: await calculateDailyAverage(kpiData.churnMember, year, month),
      // New KPI fields
      validAmount: await calculateDailyAverage(kpiData.validAmount, year, month),
      newRegister: await calculateDailyAverage(kpiData.newRegister, year, month),
      pureMember: await calculateDailyAverage(kpiData.pureMember, year, month),
      pureUser: await calculateDailyAverage(kpiData.pureUser, year, month),
      churnRate: await calculateDailyAverage(kpiData.churnRate, year, month),
      growthRate: await calculateDailyAverage(kpiData.growthRate, year, month),
      retentionRate: await calculateDailyAverage(kpiData.retentionRate, year, month),
      averageCustomerLifespan: await calculateDailyAverage(kpiData.averageCustomerLifespan, year, month),
      customerLifetimeValue: await calculateDailyAverage(kpiData.customerLifetimeValue, year, month),
      customerMaturityIndex: await calculateDailyAverage(kpiData.customerMaturityIndex, year, month),
      newCustomerConversionRate: await calculateDailyAverage(kpiData.newCustomerConversionRate, year, month)
    }

    console.log('✅ [USCLogic] Daily Average calculation completed:', dailyAverage)
    return { dailyAverage }

  } catch (error) {
    console.error('❌ [USCLogic] Error in getAllUSCKPIsWithDailyAverage:', error)
    return { dailyAverage: getDefaultUSCData() }
  }
}

function getDefaultUSCChartData() {
  return {
    ggrUserTrend: {
      series: [{ name: 'GGR User Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    daUserTrend: {
      series: [{ name: 'DA User Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    atvTrend: {
      series: [{ name: 'Average Transaction Value Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    pfTrend: {
      series: [{ name: 'Purchase Frequency Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    clvTrend: {
      series: [{ name: 'Customer Lifetime Value Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    cmiTrend: {
      series: [{ name: 'Customer Maturity Index Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    retentionRateTrend: {
      series: [{ name: 'Retention Rate Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    churnRateTrend: {
      series: [{ name: 'Churn Rate Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    conversionRateTrend: {
      series: [{ name: 'Conversion Rate Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    activeVsPureMemberTrend: {
      series: [
        { name: 'Active Member', data: [0, 0, 0, 0, 0, 0] },
        { name: 'Pure Member', data: [0, 0, 0, 0, 0, 0] }
      ],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    }
  }
}

// ===== NEW FUNCTIONS FOR CHURN MEMBER AND RETENTION DAY =====

// Get Churn Member Data
export async function getChurnMemberData(
  year: string,
  month: string,
  currency: string = 'USC',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null,
  periodType: 'yearly' | 'monthly' | 'weekly' | 'daily' = 'monthly'
): Promise<ChurnMemberData> {
  try {
    console.log('🔍 [USCLogic] Fetching Churn Member data:', { year, month, currency, line, startDate, endDate, periodType })

    // Get current period active members (deposit > 0)
    const currentPeriodMembers = await getActiveMembersInPeriod(year, month, currency, line, startDate, endDate, periodType)
    
    // Get previous period active members
    const previousPeriodMembers = await getActiveMembersInPreviousPeriod(year, month, currency, line, startDate, endDate, periodType)

    // Find churned members (active in previous period but not in current period)
    const churnedMembers = previousPeriodMembers.filter(userkey => !currentPeriodMembers.includes(userkey))

    const churnData: ChurnMemberData = {
      churnCount: churnedMembers.length,
      previousPeriodActiveMembers: previousPeriodMembers,
      currentPeriodActiveMembers: currentPeriodMembers,
      churnedMembers: churnedMembers
    }

    console.log('✅ [USCLogic] Churn Member calculation completed:', churnData)
    return churnData

  } catch (error) {
    console.error('❌ [USCLogic] Error in getChurnMemberData:', error)
    return {
      churnCount: 0,
      previousPeriodActiveMembers: [],
      currentPeriodActiveMembers: [],
      churnedMembers: []
    }
  }
}

// Get Retention Day Data (7-day retention analysis)
export async function getRetentionDayData(
  year: string,
  month: string,
  currency: string = 'USC',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null
): Promise<RetentionDayData> {
  try {
    console.log('🔍 [USCLogic] Fetching Retention Day data:', { year, month, currency, line, startDate, endDate })

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

    console.log('✅ [USCLogic] Retention Day calculation completed:', retentionData)
    return retentionData

  } catch (error) {
    console.error('❌ [USCLogic] Error in getRetentionDayData:', error)
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
    console.error('❌ [USCLogic] Error in getActiveMembersInPeriod:', error)
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
    console.error('❌ [USCLogic] Error in getActiveMembersInPreviousPeriod:', error)
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
    console.log('🔍 [USCLogic] getSevenDayMemberData called with:', { year, month, currency, line, startDate, endDate })
    
    let query = supabase
      .from('member_report_daily')
      .select('userkey, user_name, unique_code, deposit_amount, deposit_cases, withdraw_amount, withdraw_cases, bonus, date')
      .gt('deposit_amount', 0)

    // Apply date filter
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
    console.log('🔍 [USCLogic] getSevenDayMemberData raw data:', data?.slice(0, 3)) // Log first 3 records
    console.log('🔍 [USCLogic] getSevenDayMemberData total records:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('❌ [USCLogic] Error in getSevenDayMemberData:', error)
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

  console.log('📊 [USCLogic] Retention categories calculated:', retentionCategories)
  console.log('📊 [USCLogic] Total members in retention:', Object.values(retentionCategories).reduce((sum, count) => sum + count, 0))

  return retentionCategories
}

// Helper function to get detailed member information
async function getRetentionMemberDetails(
  memberData: any[],
  currency: string,
  line: string
): Promise<RetentionMemberDetail[]> {
  try {
    console.log('🔍 [USCLogic] getRetentionMemberDetails called with:', { memberDataLength: memberData.length, currency, line })
    console.log('🔍 [USCLogic] Sample member data:', memberData.slice(0, 2))
    
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
    const details: RetentionMemberDetail[] = Object.keys(memberDays).map(userkey => ({
      userkey,
      userName: memberTotals[userkey].userName,
      uniqueCode: memberTotals[userkey].uniqueCode,
      activeDays: memberDays[userkey].size,
      depositAmount: memberTotals[userkey].deposit,
      withdrawAmount: memberTotals[userkey].withdraw,
      ggr: memberTotals[userkey].ggr,
      bonus: memberTotals[userkey].bonus,
      lastActiveDate: memberTotals[userkey].lastDate,
      depositCases: memberTotals[userkey].depositCases,
      withdrawCases: memberTotals[userkey].withdrawCases
    }))

    console.log('🔍 [USCLogic] Final retention details sample:', details.slice(0, 2))
    console.log('🔍 [USCLogic] Total retention details:', details.length)

    return details
  } catch (error) {
    console.error('❌ [USCLogic] Error in getRetentionMemberDetails:', error)
    return []
  }
}
