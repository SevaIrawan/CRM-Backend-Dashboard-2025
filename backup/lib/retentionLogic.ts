import { supabase } from '@/lib/supabase'

// ===========================================
// RETENTION LOGIC INTERFACES & TYPES
// ===========================================

export interface RetentionDayData {
  premiumMembers: number      // 7+ Days
  regularMembers: number      // 6 Days  
  activeMembers: number       // 5 Days
  engagedMembers: number      // 4 Days
  occasionalMembers: number   // 3 Days
  lightMembers: number        // 2 Days
  trialMembers: number        // 1 Day
  totalMembers: number
  retentionDetails: RetentionDetail[]
}

export interface RetentionDetail {
  retentionCategory: string
  activePlayers: number
  percentage: number
  atv: number
  atvPercentage: number
  depositCases: number
  dcPercentage: number
  depositAmount: number
  daPercentage: number
  withdrawCases: number
  wcPercentage: number
  withdrawAmount: number
  waPercentage: number
  ggr: number
  ggrPercentage: number
  promotionCost: number
  promotionPercentage: number
  memberDetails: RetentionMemberDetail[]
}

export interface RetentionMemberDetail {
  userkey: string
  userName: string
  uniqueCode: string
  activeDays: number
  lastActiveDate: string
  depositAmount: number
  depositCases: number
  withdrawAmount: number
  withdrawCases: number
  ggr: number
  promotionCost: number
  atv: number
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function getMonthIndex(month: string): number {
  const months = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  }
  return months[month as keyof typeof months] || 1
}

// ===========================================
// STEP 1: GET ACTIVE MEMBERS (deposit_cases > 0)
// ===========================================

async function getActiveMembersWithDays(
  year: string,
  month: string,
  currency: string,
  line?: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<{ [userkey: string]: number }> {
  try {
    console.log('🔍 [Retention Logic] Getting active members with deposit_cases > 0:', { 
      year, month, currency, line, startDate, endDate 
    })

    // Query untuk cari userkey dengan deposit_cases > 0
    let activeQuery = supabase
      .from('member_report_daily')
      .select('userkey, date')
      .gt('deposit_cases', 0)
      .eq('currency', currency)

    // Apply date filter
    if (startDate && endDate) {
      activeQuery = activeQuery.gte('date', startDate).lte('date', endDate)
    } else {
      const monthIndex = getMonthIndex(month)
      const yearInt = parseInt(year)
      activeQuery = activeQuery
        .gte('date', `${yearInt}-${monthIndex.toString().padStart(2, '0')}-01`)
        .lt('date', `${yearInt}-${(monthIndex + 1).toString().padStart(2, '0')}-01`)
    }

    // Apply line filter - "ALL" means no line filter
    if (line && line !== 'ALL' && line !== 'All' && line !== 'all') {
      activeQuery = activeQuery.eq('line', line)
    }

    const { data: activeData, error } = await activeQuery

    if (error) {
      console.error('❌ Error fetching active members:', error)
      return {}
    }

    if (!activeData || activeData.length === 0) {
      console.log('⚠️ No active members found with current filters')
      return {}
    }

    // Count active days per member
    const memberActiveDays: { [userkey: string]: Set<string> } = {}
    
    activeData.forEach(row => {
      const userkey = String(row.userkey)
      const date = String(row.date).split('T')[0] // Get YYYY-MM-DD format
      
      if (!memberActiveDays[userkey]) {
        memberActiveDays[userkey] = new Set()
      }
      memberActiveDays[userkey].add(date)
    })

    // Convert Set size to number of active days
    const activeMembersWithDays: { [userkey: string]: number } = {}
    Object.keys(memberActiveDays).forEach(userkey => {
      activeMembersWithDays[userkey] = memberActiveDays[userkey].size
    })

    console.log(`✅ [Retention Logic] Found ${Object.keys(activeMembersWithDays).length} active members`)
    return activeMembersWithDays

  } catch (error) {
    console.error('❌ [Retention Logic] Error in getActiveMembersWithDays:', error)
    return {}
  }
}

// ===========================================
// STEP 2: GROUP MEMBERS BY RETENTION CATEGORIES
// ===========================================

function groupMembersByRetention(activeMembersWithDays: { [userkey: string]: number }): {
  [category: string]: string[]
} {
  const retentionGroups = {
    'Premium Members (7+ Days)': [] as string[],
    'Regular Members (6 Days)': [] as string[],
    'Active Members (5 Days)': [] as string[],
    'Engaged Members (4 Days)': [] as string[],
    'Occasional Members (3 Days)': [] as string[],
    'Light Members (2 Days)': [] as string[],
    'Trial Members (1 Day)': [] as string[]
  }

  Object.entries(activeMembersWithDays).forEach(([userkey, activeDays]) => {
    if (activeDays >= 7) {
      retentionGroups['Premium Members (7+ Days)'].push(userkey)
    } else if (activeDays === 6) {
      retentionGroups['Regular Members (6 Days)'].push(userkey)
    } else if (activeDays === 5) {
      retentionGroups['Active Members (5 Days)'].push(userkey)
    } else if (activeDays === 4) {
      retentionGroups['Engaged Members (4 Days)'].push(userkey)
    } else if (activeDays === 3) {
      retentionGroups['Occasional Members (3 Days)'].push(userkey)
    } else if (activeDays === 2) {
      retentionGroups['Light Members (2 Days)'].push(userkey)
    } else if (activeDays === 1) {
      retentionGroups['Trial Members (1 Day)'].push(userkey)
    }
  })

  console.log('✅ [Retention Logic] Members grouped by retention categories:', {
    premiumMembers: retentionGroups['Premium Members (7+ Days)'].length,
    regularMembers: retentionGroups['Regular Members (6 Days)'].length,
    activeMembers: retentionGroups['Active Members (5 Days)'].length,
    engagedMembers: retentionGroups['Engaged Members (4 Days)'].length,
    occasionalMembers: retentionGroups['Occasional Members (3 Days)'].length,
    lightMembers: retentionGroups['Light Members (2 Days)'].length,
    trialMembers: retentionGroups['Trial Members (1 Day)'].length
  })

  return retentionGroups
}

// ===========================================
// STEP 3: CALCULATE KPIs FOR EACH CATEGORY
// ===========================================

async function calculateCategoryKPIs(
  userkeys: string[],
  year: string,
  month: string,
  currency: string,
  line?: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<{
  activePlayers: number
  atv: number
  depositCases: number
  depositAmount: number
  withdrawCases: number
  withdrawAmount: number
  ggr: number
  promotionCost: number
  memberDetails: RetentionMemberDetail[]
}> {
  try {
    if (userkeys.length === 0) {
      return {
        activePlayers: 0,
        atv: 0,
        depositCases: 0,
        depositAmount: 0,
        withdrawCases: 0,
        withdrawAmount: 0,
        ggr: 0,
        promotionCost: 0,
        memberDetails: []
      }
    }

    // Get ALL transactions for these userkeys (dengan atau tanpa deposit)
    let kpiQuery = supabase
      .from('member_report_daily')
      .select('*')
      .in('userkey', userkeys)
      .eq('currency', currency)

    // Apply date filter
    if (startDate && endDate) {
      kpiQuery = kpiQuery.gte('date', startDate).lte('date', endDate)
    } else {
      const monthIndex = getMonthIndex(month)
      const yearInt = parseInt(year)
      kpiQuery = kpiQuery
        .gte('date', `${yearInt}-${monthIndex.toString().padStart(2, '0')}-01`)
        .lt('date', `${yearInt}-${(monthIndex + 1).toString().padStart(2, '0')}-01`)
    }

    // Apply line filter
    if (line && line !== 'ALL' && line !== 'All' && line !== 'all') {
      kpiQuery = kpiQuery.eq('line', line)
    }

    const { data: kpiData, error } = await kpiQuery

    if (error) {
      console.error('❌ Error fetching KPI data for category:', error)
      return {
        activePlayers: 0,
        atv: 0,
        depositCases: 0,
        depositAmount: 0,
        withdrawCases: 0,
        withdrawAmount: 0,
        ggr: 0,
        promotionCost: 0,
        memberDetails: []
      }
    }

    if (!kpiData || kpiData.length === 0) {
      return {
        activePlayers: 0,
        atv: 0,
        depositCases: 0,
        depositAmount: 0,
        withdrawCases: 0,
        withdrawAmount: 0,
        ggr: 0,
        promotionCost: 0,
        memberDetails: []
      }
    }

    // Calculate aggregated KPIs
    const totalDepositAmount = kpiData.reduce((sum, row) => sum + (Number(row.deposit_amount) || 0), 0)
    const totalDepositCases = kpiData.reduce((sum, row) => sum + (Number(row.deposit_cases) || 0), 0)
    const totalWithdrawAmount = kpiData.reduce((sum, row) => sum + (Number(row.withdraw_amount) || 0), 0)
    const totalWithdrawCases = kpiData.reduce((sum, row) => sum + (Number(row.withdraw_cases) || 0), 0)
    const totalGGR = kpiData.reduce((sum, row) => sum + (Number(row.gross_gaming_revenue) || 0), 0)
    const totalPromotionCost = kpiData.reduce((sum, row) => sum + (Number(row.bonus) || 0), 0)
    
    const uniquePlayers = new Set(kpiData.map(row => String(row.userkey))).size
    const atv = totalDepositCases > 0 ? totalDepositAmount / totalDepositCases : 0

    // Calculate member details
    const memberDetails = calculateMemberDetails(kpiData, userkeys)

    return {
      activePlayers: uniquePlayers,
      atv,
      depositCases: totalDepositCases,
      depositAmount: totalDepositAmount,
      withdrawCases: totalWithdrawCases,
      withdrawAmount: totalWithdrawAmount,
      ggr: totalGGR,
      promotionCost: totalPromotionCost,
      memberDetails
    }

  } catch (error) {
    console.error('❌ [Retention Logic] Error in calculateCategoryKPIs:', error)
    return {
      activePlayers: 0,
      atv: 0,
      depositCases: 0,
      depositAmount: 0,
      withdrawCases: 0,
      withdrawAmount: 0,
      ggr: 0,
      promotionCost: 0,
      memberDetails: []
    }
  }
}

// ===========================================
// STEP 4: CALCULATE MEMBER DETAILS
// ===========================================

function calculateMemberDetails(
  data: any[],
  userkeys: string[]
): RetentionMemberDetail[] {
  const memberMap: { [userkey: string]: RetentionMemberDetail } = {}

  // Initialize all userkeys
  userkeys.forEach(userkey => {
    memberMap[userkey] = {
      userkey,
      userName: userkey,
      uniqueCode: userkey,
      activeDays: 0,
      lastActiveDate: '',
      depositAmount: 0,
      depositCases: 0,
      withdrawAmount: 0,
      withdrawCases: 0,
      ggr: 0,
      promotionCost: 0,
      atv: 0
    }
  })

  // Aggregate data per member
  const memberActiveDates: { [userkey: string]: Set<string> } = {}
  
  data.forEach(row => {
    const userkey = String(row.userkey)
    const date = String(row.date).split('T')[0]
    
    if (memberMap[userkey]) {
      // Track active dates
      if (!memberActiveDates[userkey]) {
        memberActiveDates[userkey] = new Set()
      }
      if ((Number(row.deposit_cases) || 0) > 0) {
        memberActiveDates[userkey].add(date)
      }

      // Aggregate KPIs
      memberMap[userkey].depositAmount += Number(row.deposit_amount) || 0
      memberMap[userkey].depositCases += Number(row.deposit_cases) || 0
      memberMap[userkey].withdrawAmount += Number(row.withdraw_amount) || 0
      memberMap[userkey].withdrawCases += Number(row.withdraw_cases) || 0
      memberMap[userkey].ggr += Number(row.gross_gaming_revenue) || 0
      memberMap[userkey].promotionCost += Number(row.bonus) || 0
      
      // Update user info
      if (row.user_name) memberMap[userkey].userName = String(row.user_name)
      if (row.unique_code) memberMap[userkey].uniqueCode = String(row.unique_code)
      
      // Update last active date
      if (date > memberMap[userkey].lastActiveDate) {
        memberMap[userkey].lastActiveDate = date
      }
    }
  })

  // Calculate active days and ATV for each member
  Object.keys(memberMap).forEach(userkey => {
    memberMap[userkey].activeDays = memberActiveDates[userkey]?.size || 0
    memberMap[userkey].atv = memberMap[userkey].depositCases > 0 
      ? memberMap[userkey].depositAmount / memberMap[userkey].depositCases 
      : 0
  })

  return Object.values(memberMap)
}

// ===========================================
// MAIN RETENTION FUNCTION - NEW LOGIC
// ===========================================

export async function getRetentionDayData(
  year: string,
  month: string,
  currency: string,
  line?: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<RetentionDayData> {
  try {
    console.log('🔍 [NEW Retention Logic] Fetching retention data with improved logic:', { 
      year, month, currency, line, startDate, endDate 
    })

    // STEP 1: Get active members with their active days
    const activeMembersWithDays = await getActiveMembersWithDays(
      year, month, currency, line, startDate, endDate
    )

    if (Object.keys(activeMembersWithDays).length === 0) {
      console.log('⚠️ No active members found, returning empty retention data')
      return {
        premiumMembers: 0,
        regularMembers: 0,
        activeMembers: 0,
        engagedMembers: 0,
        occasionalMembers: 0,
        lightMembers: 0,
        trialMembers: 0,
        totalMembers: 0,
        retentionDetails: []
      }
    }

    // STEP 2: Group members by retention categories
    const retentionGroups = groupMembersByRetention(activeMembersWithDays)

    // STEP 3: Calculate KPIs for each category
    const retentionDetails: RetentionDetail[] = []
    let totalKPIs = {
      activePlayers: 0,
      depositAmount: 0,
      depositCases: 0,
      withdrawAmount: 0,
      withdrawCases: 0,
      ggr: 0,
      promotionCost: 0
    }

    for (const [category, userkeys] of Object.entries(retentionGroups)) {
      if (userkeys.length > 0) {
        const categoryKPIs = await calculateCategoryKPIs(
          userkeys, year, month, currency, line, startDate, endDate
        )

        // Update totals for percentage calculation
        totalKPIs.activePlayers += categoryKPIs.activePlayers
        totalKPIs.depositAmount += categoryKPIs.depositAmount
        totalKPIs.depositCases += categoryKPIs.depositCases
        totalKPIs.withdrawAmount += categoryKPIs.withdrawAmount
        totalKPIs.withdrawCases += categoryKPIs.withdrawCases
        totalKPIs.ggr += categoryKPIs.ggr
        totalKPIs.promotionCost += categoryKPIs.promotionCost

        retentionDetails.push({
          retentionCategory: category,
          activePlayers: categoryKPIs.activePlayers,
          percentage: 0, // Will calculate after getting totals
          atv: categoryKPIs.atv,
          atvPercentage: 0, // Will calculate after getting totals
          depositCases: categoryKPIs.depositCases,
          dcPercentage: 0, // Will calculate after getting totals
          depositAmount: categoryKPIs.depositAmount,
          daPercentage: 0, // Will calculate after getting totals
          withdrawCases: categoryKPIs.withdrawCases,
          wcPercentage: 0, // Will calculate after getting totals
          withdrawAmount: categoryKPIs.withdrawAmount,
          waPercentage: 0, // Will calculate after getting totals
          ggr: categoryKPIs.ggr,
          ggrPercentage: 0, // Will calculate after getting totals
          promotionCost: categoryKPIs.promotionCost,
          promotionPercentage: 0, // Will calculate after getting totals
          memberDetails: categoryKPIs.memberDetails
        })
      }
    }

    // STEP 4: Calculate percentages
    retentionDetails.forEach(detail => {
      detail.percentage = totalKPIs.activePlayers > 0 
        ? (detail.activePlayers / totalKPIs.activePlayers) * 100 : 0
      detail.atvPercentage = totalKPIs.depositAmount > 0 && totalKPIs.depositCases > 0
        ? (detail.atv / (totalKPIs.depositAmount / totalKPIs.depositCases)) * 100 : 0
      detail.dcPercentage = totalKPIs.depositCases > 0 
        ? (detail.depositCases / totalKPIs.depositCases) * 100 : 0
      detail.daPercentage = totalKPIs.depositAmount > 0 
        ? (detail.depositAmount / totalKPIs.depositAmount) * 100 : 0
      detail.wcPercentage = totalKPIs.withdrawCases > 0 
        ? (detail.withdrawCases / totalKPIs.withdrawCases) * 100 : 0
      detail.waPercentage = totalKPIs.withdrawAmount > 0 
        ? (detail.withdrawAmount / totalKPIs.withdrawAmount) * 100 : 0
      detail.ggrPercentage = totalKPIs.ggr > 0 
        ? (detail.ggr / totalKPIs.ggr) * 100 : 0
      detail.promotionPercentage = totalKPIs.promotionCost > 0 
        ? (detail.promotionCost / totalKPIs.promotionCost) * 100 : 0
    })

    const retentionData: RetentionDayData = {
      premiumMembers: retentionGroups['Premium Members (7+ Days)'].length,
      regularMembers: retentionGroups['Regular Members (6 Days)'].length,
      activeMembers: retentionGroups['Active Members (5 Days)'].length,
      engagedMembers: retentionGroups['Engaged Members (4 Days)'].length,
      occasionalMembers: retentionGroups['Occasional Members (3 Days)'].length,
      lightMembers: retentionGroups['Light Members (2 Days)'].length,
      trialMembers: retentionGroups['Trial Members (1 Day)'].length,
      totalMembers: Object.keys(activeMembersWithDays).length,
      retentionDetails
    }

    console.log('✅ [NEW Retention Logic] Retention calculation completed successfully:', {
      totalMembers: retentionData.totalMembers,
      categoriesCount: retentionDetails.length,
      totalValidation: retentionData.premiumMembers + retentionData.regularMembers + 
                      retentionData.activeMembers + retentionData.engagedMembers + 
                      retentionData.occasionalMembers + retentionData.lightMembers + 
                      retentionData.trialMembers
    })

    return retentionData

  } catch (error) {
    console.error('❌ [NEW Retention Logic] Error in getRetentionDayData:', error)
    return {
      premiumMembers: 0,
      regularMembers: 0,
      activeMembers: 0,
      engagedMembers: 0,
      occasionalMembers: 0,
      lightMembers: 0,
      trialMembers: 0,
      totalMembers: 0,
      retentionDetails: []
    }
  }
}

