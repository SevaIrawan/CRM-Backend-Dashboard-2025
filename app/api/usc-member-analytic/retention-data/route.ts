import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ===========================================
// RETENTION LOGIC INTERFACES & TYPES
// ===========================================

interface RetentionDayData {
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

interface RetentionDetail {
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

interface RetentionMemberDetail {
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
// MAIN EXPORT FUNCTION
// ===========================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const year = searchParams.get('year') || '2025'
    const month = searchParams.get('month') || 'January'
    const line = searchParams.get('line') || 'ALL'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    console.log('📊 [USC Member-Analytic Retention API] Fetching retention data from blue_whale_usc:', {
      currency: 'USC', year, month, line, startDate, endDate, user_allowed_brands: userAllowedBrands
    })

    // ✅ Validate brand access for Squad Lead
    if (line && line !== 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      if (!userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
    }

    // STEP 1: Get active members with their active days from blue_whale_usc
    const activeMembersMap = await getActiveMembersWithDays(year, month, line, startDate, endDate)
    
    // STEP 2: Categorize members by active days
    const categories = categorizeMembersByDays(activeMembersMap)
    
    // STEP 3: Calculate KPIs for each category
    const retentionDetails = await calculateRetentionDetails(
      categories, 
      year, 
      month, 
      line, 
      startDate, 
      endDate
    )

    // STEP 4: Build final response
    const retentionData: RetentionDayData = {
      premiumMembers: categories['7+ Days'].length,
      regularMembers: categories['6 Days'].length,
      activeMembers: categories['5 Days'].length,
      engagedMembers: categories['4 Days'].length,
      occasionalMembers: categories['3 Days'].length,
      lightMembers: categories['2 Days'].length,
      trialMembers: categories['1 Day'].length,
      totalMembers: Object.keys(activeMembersMap).length,
      retentionDetails
    }

    console.log('✅ [USC Member-Analytic Retention API] Retention data loaded:', {
      totalMembers: retentionData.totalMembers,
      premiumMembers: retentionData.premiumMembers,
      retentionCategoriesCount: retentionData.retentionDetails.length
    })

    return NextResponse.json({
      success: true,
      data: retentionData
    })

  } catch (error) {
    console.error('❌ [USC Member-Analytic Retention API] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch retention data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ===========================================
// STEP 1: GET ACTIVE MEMBERS WITH DAYS
// ===========================================

async function getActiveMembersWithDays(
  year: string,
  month: string,
  line?: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<{ [userkey: string]: number }> {
  try {
    console.log('🔍 [Retention Logic] Getting active members from blue_whale_usc with deposit_cases > 0')

    // Query blue_whale_usc for active members
    let activeQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, date, deposit_cases')
      .gt('deposit_cases', 0)
      .eq('currency', 'USC')

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

    // Apply line filter
    if (line && line !== 'ALL' && line !== 'All' && line !== 'all') {
      activeQuery = activeQuery.eq('line', line)
    }

    const { data: activeData, error } = await activeQuery

    if (error) {
      console.error('❌ Error fetching active members from blue_whale_usc:', error)
      return {}
    }

    if (!activeData || activeData.length === 0) {
      console.log('⚠️ No active members found in blue_whale_usc')
      return {}
    }

    // Count unique active days per userkey
    const userActiveDays: { [userkey: string]: Set<string> } = {}
    
    activeData.forEach(row => {
      const userkey = String(row.userkey)
      const date = String(row.date)
      
      if (!userActiveDays[userkey]) {
        userActiveDays[userkey] = new Set()
      }
      
      userActiveDays[userkey].add(date)
    })

    // Convert Sets to counts
    const result: { [userkey: string]: number } = {}
    for (const userkey in userActiveDays) {
      result[userkey] = userActiveDays[userkey].size
    }

    console.log(`✅ Found ${Object.keys(result).length} active members in blue_whale_usc`)
    return result

  } catch (error) {
    console.error('❌ [Retention Logic] Error in getActiveMembersWithDays:', error)
    return {}
  }
}

// ===========================================
// STEP 2: CATEGORIZE MEMBERS BY DAYS
// ===========================================

function categorizeMembersByDays(
  activeMembersMap: { [userkey: string]: number }
): { [category: string]: string[] } {
  const categories = {
    '7+ Days': [] as string[],
    '6 Days': [] as string[],
    '5 Days': [] as string[],
    '4 Days': [] as string[],
    '3 Days': [] as string[],
    '2 Days': [] as string[],
    '1 Day': [] as string[]
  }

  for (const userkey in activeMembersMap) {
    const days = activeMembersMap[userkey]
    
    if (days >= 7) {
      categories['7+ Days'].push(userkey)
    } else if (days === 6) {
      categories['6 Days'].push(userkey)
    } else if (days === 5) {
      categories['5 Days'].push(userkey)
    } else if (days === 4) {
      categories['4 Days'].push(userkey)
    } else if (days === 3) {
      categories['3 Days'].push(userkey)
    } else if (days === 2) {
      categories['2 Days'].push(userkey)
    } else if (days === 1) {
      categories['1 Day'].push(userkey)
    }
  }

  console.log('📊 [Retention Logic] Members categorized by days:', {
    '7+ Days': categories['7+ Days'].length,
    '6 Days': categories['6 Days'].length,
    '5 Days': categories['5 Days'].length,
    '4 Days': categories['4 Days'].length,
    '3 Days': categories['3 Days'].length,
    '2 Days': categories['2 Days'].length,
    '1 Day': categories['1 Day'].length
  })

  return categories
}

// ===========================================
// STEP 3: CALCULATE RETENTION DETAILS
// ===========================================

async function calculateRetentionDetails(
  categories: { [category: string]: string[] },
  year: string,
  month: string,
  line?: string,
  startDate?: string | null,
  endDate?: string | null
): Promise<RetentionDetail[]> {
  const retentionDetails: RetentionDetail[] = []
  
  // Calculate totals first for percentage calculations
  let totalActivePlayers = 0
  let totalATV = 0
  let totalDepositCases = 0
  let totalDepositAmount = 0
  let totalWithdrawCases = 0
  let totalWithdrawAmount = 0
  let totalGGR = 0
  let totalPromotionCost = 0

  // First pass: calculate all KPIs
  const categoryKPIs: Array<{
    category: string
    kpis: Awaited<ReturnType<typeof calculateCategoryKPIs>>
  }> = []

  for (const category in categories) {
    const userkeys = categories[category]
    const kpis = await calculateCategoryKPIs(userkeys, year, month, line, startDate, endDate)
    
    categoryKPIs.push({ category, kpis })
    
    totalActivePlayers += kpis.activePlayers
    totalATV += kpis.atv * kpis.activePlayers
    totalDepositCases += kpis.depositCases
    totalDepositAmount += kpis.depositAmount
    totalWithdrawCases += kpis.withdrawCases
    totalWithdrawAmount += kpis.withdrawAmount
    totalGGR += kpis.ggr
    totalPromotionCost += kpis.promotionCost
  }

  // Second pass: build retention details with percentages
  for (const item of categoryKPIs) {
    const { category, kpis } = item
    
    retentionDetails.push({
      retentionCategory: category,
      activePlayers: kpis.activePlayers,
      percentage: totalActivePlayers > 0 ? (kpis.activePlayers / totalActivePlayers) * 100 : 0,
      atv: kpis.atv,
      atvPercentage: totalActivePlayers > 0 ? (kpis.atv / (totalATV / totalActivePlayers)) * 100 : 0,
      depositCases: kpis.depositCases,
      dcPercentage: totalDepositCases > 0 ? (kpis.depositCases / totalDepositCases) * 100 : 0,
      depositAmount: kpis.depositAmount,
      daPercentage: totalDepositAmount > 0 ? (kpis.depositAmount / totalDepositAmount) * 100 : 0,
      withdrawCases: kpis.withdrawCases,
      wcPercentage: totalWithdrawCases > 0 ? (kpis.withdrawCases / totalWithdrawCases) * 100 : 0,
      withdrawAmount: kpis.withdrawAmount,
      waPercentage: totalWithdrawAmount > 0 ? (kpis.withdrawAmount / totalWithdrawAmount) * 100 : 0,
      ggr: kpis.ggr,
      ggrPercentage: totalGGR > 0 ? (kpis.ggr / totalGGR) * 100 : 0,
      promotionCost: kpis.promotionCost,
      promotionPercentage: totalPromotionCost > 0 ? (kpis.promotionCost / totalPromotionCost) * 100 : 0,
      memberDetails: kpis.memberDetails
    })
  }

  return retentionDetails
}

// ===========================================
// STEP 4: CALCULATE CATEGORY KPIs
// ===========================================

async function calculateCategoryKPIs(
  userkeys: string[],
  year: string,
  month: string,
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

    // Get ALL transactions for these userkeys from blue_whale_usc
    let kpiQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, unique_code, date, year, month, line, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, net_profit, ggr, valid_amount, bonus')
      .in('userkey', userkeys)
      .eq('currency', 'USC')

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
      console.error('❌ Error fetching KPI data from blue_whale_usc:', error)
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
    const totalGGR = kpiData.reduce((sum, row) => sum + (Number(row.ggr) || 0), 0)
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
// STEP 5: CALCULATE MEMBER DETAILS
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

  // Aggregate data for each member
  data.forEach(row => {
    const userkey = String(row.userkey)
    
    if (memberMap[userkey]) {
      const member = memberMap[userkey]
      
      // Update user name and unique code
      if (row.user_name) member.userName = String(row.user_name)
      if (row.unique_code) member.uniqueCode = String(row.unique_code)
      
      // Update last active date
      if (row.date && row.deposit_cases > 0) {
        if (!member.lastActiveDate || row.date > member.lastActiveDate) {
          member.lastActiveDate = String(row.date)
        }
      }
      
      // Aggregate amounts
      member.depositAmount += Number(row.deposit_amount) || 0
      member.depositCases += Number(row.deposit_cases) || 0
      member.withdrawAmount += Number(row.withdraw_amount) || 0
      member.withdrawCases += Number(row.withdraw_cases) || 0
      member.ggr += Number(row.gross_gaming_revenue) || 0
      member.promotionCost += Number(row.bonus) || 0
    }
  })

  // Calculate ATV and active days for each member
  const memberDetails = Object.values(memberMap).map(member => {
    // Count unique active days
    const activeDates = new Set<string>()
    data.forEach(row => {
      if (String(row.userkey) === member.userkey && row.deposit_cases > 0) {
        activeDates.add(String(row.date))
      }
    })
    
    return {
      ...member,
      activeDays: activeDates.size,
      atv: member.depositCases > 0 ? member.depositAmount / member.depositCases : 0
    }
  })

  // Sort by GGR descending
  memberDetails.sort((a, b) => b.ggr - a.ggr)

  return memberDetails
}
