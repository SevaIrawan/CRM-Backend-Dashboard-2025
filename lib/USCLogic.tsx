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

    // Build query for member_report_usc table
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

    // Debug: Check what lines are available
    const { data: availableLines } = await supabase
      .from('member_report_usc')
      .select('line')
      .limit(10)
    console.log('🔍 [USCLogic] Available lines in database:', Array.from(new Set(availableLines?.map(row => row.line) || [])))
    
    // Debug: Check total records in table
    const { count: totalRecords } = await supabase
      .from('member_report_usc')
      .select('*', { count: 'exact', head: true })
    console.log('🔍 [USCLogic] Total records in member_report_usc:', totalRecords)
    
    // Debug: Check sample data without filters
    const { data: sampleData } = await supabase
      .from('member_report_usc')
      .select('*')
      .limit(3)
    console.log('🔍 [USCLogic] Sample data without filters:', sampleData)

    const { data, error } = await query

    if (error) {
      console.error('❌ [USCLogic] Database error:', error)
      throw error
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

    // Calculate KPIs with new member data
    const kpiData = calculateUSCKPIs(data, newMemberData || [], currency)

    console.log('✅ [USCLogic] KPI calculation completed:', kpiData)
    return kpiData

  } catch (error) {
    console.error('❌ [USCLogic] Error in getUSCKPIData:', error)
    return getDefaultUSCData()
  }
}

// Calculate USC KPIs from raw data
function calculateUSCKPIs(data: any[], newMemberData: any[], currency: string): USCKPIData {
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

  // Derived KPIs
  const ggr = depositAmount - withdrawAmount
  const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)
  const ggrUser = activeMember > 0 ? ggr / activeMember : 0
  const daUser = activeMember > 0 ? depositAmount / activeMember : 0
  
  // New derived KPIs
  const averageTransactionValue = depositCases > 0 ? depositAmount / depositCases : 0
  const purchaseFrequency = activeMember > 0 ? depositCases / activeMember : 0

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
    purchaseFrequency
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
      purchaseFrequency: KPI_FORMULAS.PERCENTAGE_CHANGE(currentData.purchaseFrequency, previousData.purchaseFrequency)
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
      purchaseFrequency: await calculateDailyAverage(kpiData.purchaseFrequency, year, month)
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

    // Prepare chart data based on date mode
    let chartData: any
    
    if (startDate) {
      // Range Date mode: Show daily data for the selected range
      // Group data by day and aggregate
      const dailyGroups: { [key: string]: any[] } = {}
      
      data.forEach(row => {
        const date = new Date(row.date)
        const dayKey = `${date.getMonth() + 1}/${date.getDate()}`
        
        if (!dailyGroups[dayKey]) {
          dailyGroups[dayKey] = []
        }
        dailyGroups[dayKey].push(row)
      })
      
      // Calculate aggregated daily totals
      const dailyData = Object.keys(dailyGroups).map(dayKey => {
        const dayRows = dailyGroups[dayKey]
        
        // Aggregate all rows for this day
        const depositAmount = dayRows.reduce((sum, row) => sum + (row.deposit_amount || 0), 0)
        const withdrawAmount = dayRows.reduce((sum, row) => sum + (row.withdraw_amount || 0), 0)
        const addTransaction = dayRows.reduce((sum, row) => sum + (row.add_transaction || 0), 0)
        const deductTransaction = dayRows.reduce((sum, row) => sum + (row.deduct_transaction || 0), 0)
        const depositCases = dayRows.reduce((sum, row) => sum + (row.deposit_cases || 0), 0)
        
        const ggr = depositAmount - withdrawAmount
        const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)
        
        // Active members for this day (unique userkeys where deposit_cases > 0)
        const activeMembers = new Set(
          dayRows
            .filter(row => row.deposit_cases > 0 && row.userkey)
            .map(row => row.userkey)
        )
        const activeMember = activeMembers.size
        
        return {
          day: dayKey,
          depositAmount,
          withdrawAmount,
          ggr,
          netProfit,
          activeMember,
          depositCases
        }
      })
      
      // Sort by date
      dailyData.sort((a, b) => {
        const [aMonth, aDay] = a.day.split('/').map(Number)
        const [bMonth, bDay] = b.day.split('/').map(Number)
        return (aMonth * 100 + aDay) - (bMonth * 100 + bDay)
      })
      
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
        }
      }
    } else {
      // Month mode: Group by month and calculate monthly totals
      const monthlyData = groupByMonth(data)
      
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
    purchaseFrequency: 0
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
    purchaseFrequency: 0
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
    }
  }
}
