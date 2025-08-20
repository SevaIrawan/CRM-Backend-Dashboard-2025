import { supabase } from './supabase'

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
}

// Get USC KPI Data from member_report_usc table
export async function getUSCKPIData(
  year: string,
  month: string,
  currency: string = 'MYR',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null
): Promise<USCKPIData> {
  try {
    console.log('🔍 [USCLogic] Fetching USC KPI data:', { year, month, currency, line, startDate, endDate })

    // Build query based on currency and line
    let query = supabase
      .from('member_report_usc')
      .select('deposit_amount, deposit_cases, withdraw_amount, withdraw_cases, add_transaction, deduct_transaction, userkey, currency, line')

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
    }

    // Apply line filter (if not "All")
    if (line !== 'All') {
      query = query.eq('line', line)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ [USCLogic] Database error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ [USCLogic] No data found for:', { year, month, currency })
      return getDefaultUSCData()
    }

    console.log('📊 [USCLogic] Raw data count:', data.length)

    // Calculate KPIs
    const kpiData = calculateUSCKPIs(data, currency)

    console.log('✅ [USCLogic] KPI calculation completed:', kpiData)
    return kpiData

  } catch (error) {
    console.error('❌ [USCLogic] Error in getUSCKPIData:', error)
    return getDefaultUSCData()
  }
}

// Calculate USC KPIs from raw data
function calculateUSCKPIs(data: any[], currency: string): USCKPIData {
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

  // Derived KPIs
  const ggr = depositAmount - withdrawAmount
  const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)
  const ggrUser = activeMember > 0 ? ggr / activeMember : 0
  const daUser = activeMember > 0 ? depositAmount / activeMember : 0

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
    daUser
  }
}

// Get USC MoM (Month over Month) comparison
export async function getUSCMoMData(
  year: string,
  month: string,
  currency: string = 'MYR',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null
): Promise<USCKPIMoM> {
  try {
    console.log('🔍 [USCLogic] Fetching USC MoM data:', { year, month, currency, line, startDate, endDate })

    const currentData = await getUSCKPIData(year, month, currency, line, startDate, endDate)
    const previousData = await getUSCKPIData(year, getPreviousMonth(month), currency, line)

    // Calculate percentage changes
    const calculateMoM = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    const momData: USCKPIMoM = {
      depositAmount: calculateMoM(currentData.depositAmount, previousData.depositAmount),
      depositCases: calculateMoM(currentData.depositCases, previousData.depositCases),
      withdrawAmount: calculateMoM(currentData.withdrawAmount, previousData.withdrawAmount),
      withdrawCases: calculateMoM(currentData.withdrawCases, previousData.withdrawCases),
      addTransaction: calculateMoM(currentData.addTransaction, previousData.addTransaction),
      deductTransaction: calculateMoM(currentData.deductTransaction, previousData.deductTransaction),
      ggr: calculateMoM(currentData.ggr, previousData.ggr),
      netProfit: calculateMoM(currentData.netProfit, previousData.netProfit),
      activeMember: calculateMoM(currentData.activeMember, previousData.activeMember),
      ggrUser: calculateMoM(currentData.ggrUser, previousData.ggrUser),
      daUser: calculateMoM(currentData.daUser, previousData.daUser)
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
  currency: string = 'MYR',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null
): Promise<USCKPIData> {
  try {
    console.log('🔍 [USCLogic] Fetching USC Daily Average data:', { year, month, currency, line, startDate, endDate })

    const kpiData = await getUSCKPIData(year, month, currency, line, startDate, endDate)
    const daysInMonth = getDaysInMonth(parseInt(year), getMonthIndex(month))

    // Calculate daily averages
    const dailyAverage: USCKPIData = {
      depositAmount: kpiData.depositAmount / daysInMonth,
      depositCases: kpiData.depositCases / daysInMonth,
      withdrawAmount: kpiData.withdrawAmount / daysInMonth,
      withdrawCases: kpiData.withdrawCases / daysInMonth,
      addTransaction: kpiData.addTransaction / daysInMonth,
      deductTransaction: kpiData.deductTransaction / daysInMonth,
      ggr: kpiData.ggr / daysInMonth,
      netProfit: kpiData.netProfit / daysInMonth,
      activeMember: kpiData.activeMember, // No daily average for count
      ggrUser: kpiData.ggrUser / daysInMonth,
      daUser: kpiData.daUser / daysInMonth
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
  currency: string = 'MYR',
  line: string = 'All',
  startDate?: string | null,
  endDate?: string | null
): Promise<any> {
  try {
    console.log('🔍 [USCLogic] Fetching USC Chart data:', { year, month, currency, line, startDate, endDate })

    // Build query based on date mode
    let query = supabase
      .from('member_report_usc')
      .select('date, deposit_amount, withdraw_amount, add_transaction, deduct_transaction, userkey, deposit_cases, currency, line')
      .order('date', { ascending: true })

    if (startDate) {
      // Range mode: use start and end date
      query = query.gte('date', startDate)
      if (endDate) {
        query = query.lte('date', endDate)
      }
    } else {
      // Month mode: use year and month
      const yearInt = parseInt(year)
      query = query
        .gte('date', `${yearInt}-01-01`)
        .lt('date', `${yearInt + 1}-01-01`)
    }

    // Apply currency filter (if not "All")
    if (currency !== 'All') {
      query = query.eq('currency', currency)
    }

    // Apply line filter (if not "All")
    if (line !== 'All') {
      query = query.eq('line', line)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ [USCLogic] Chart data error:', error)
      return getDefaultUSCChartData()
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ [USCLogic] No chart data found')
      return getDefaultUSCChartData()
    }

    // Group by month and calculate monthly totals
    const monthlyData = groupByMonth(data)
    
    // Prepare chart series
    const chartData = {
      ggrTrend: {
        series: [{ name: 'GGR Trend', data: monthlyData.map(m => m.ggr) }],
        categories: monthlyData.map(m => m.month)
      },
      netProfitTrend: {
        series: [{ name: 'Net Profit Trend', data: monthlyData.map(m => m.netProfit) }],
        categories: monthlyData.map(m => m.month)
      },
      activeMemberTrend: {
        series: [{ name: 'Active Member Trend', data: monthlyData.map(m => m.activeMember) }],
        categories: monthlyData.map(m => m.month)
      },
      depositAmountTrend: {
        series: [{ name: 'Deposit Amount Trend', data: monthlyData.map(m => m.depositAmount) }],
        categories: monthlyData.map(m => m.month)
      }
    }

    console.log('✅ [USCLogic] Chart data prepared:', chartData)
    return chartData

  } catch (error) {
    console.error('❌ [USCLogic] Error in getUSCChartData:', error)
    return getDefaultUSCChartData()
  }
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
    const date = new Date(row.date)
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
    
    return {
      month: months[monthIndex],
      depositAmount,
      withdrawAmount,
      ggr,
      netProfit,
      activeMember: activeMembers.size
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
    daUser: 0
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
    daUser: 0
  }
}

function getDefaultUSCChartData() {
  return {
    ggrTrend: {
      series: [{ name: 'GGR Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    netProfitTrend: {
      series: [{ name: 'Net Profit Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    activeMemberTrend: {
      series: [{ name: 'Active Member Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    },
    depositAmountTrend: {
      series: [{ name: 'Deposit Amount Trend', data: [0, 0, 0, 0, 0, 0] }],
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    }
  }
}
