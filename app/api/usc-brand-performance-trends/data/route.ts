import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodAStart = searchParams.get('periodAStart')
    const periodAEnd = searchParams.get('periodAEnd')
    const periodBStart = searchParams.get('periodBStart')
    const periodBEnd = searchParams.get('periodBEnd')

    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: periodAStart, periodAEnd, periodBStart, periodBEnd' 
      }, { status: 400 })
    }

    console.log('🔄 [Brand Performance API] Fetching data for periods:', {
      periodA: { start: periodAStart, end: periodAEnd },
      periodB: { start: periodBStart, end: periodBEnd }
    })

    // Get REAL DATA from database - all possible brands (USC)
    const allBrands = ['SBKH', 'CAM68', 'KH778', 'UWKH', '17WINKH', '17WIN168', 'OK888KH', 'OK188KH', 'HENG68KH', 'LOY66', 'CAMBO998', 'Diamond887']
    
    // Calculate overall KPIs for both periods
    const calculateOverallKPIs = async (startDate: string, endDate: string) => {
      // Get summary data for all brands
      const { data: summaryData, error: summaryError } = await supabase
        .from('blue_whale_usc_summary')
        .select('*')
        .eq('currency', 'USC')
        .in('line', allBrands)
        .gte('date', startDate)
        .lte('date', endDate)

      if (summaryError) throw summaryError

      // Get member data for active member calculation
      const { data: memberData, error: memberError } = await supabase
        .from('blue_whale_usc')
        .select('userkey, unique_code')
        .eq('currency', 'USC')
        .in('line', allBrands)
        .gte('date', startDate)
        .lte('date', endDate)
        .gt('deposit_cases', 0)

      if (memberError) throw memberError

      // Calculate KPIs
      const summaryRawData = summaryData || []
      const memberRawData = memberData || []

      const uniqueUserKeys = Array.from(new Set(memberRawData.map(item => item.userkey).filter(Boolean)))
      const uniqueCodes = Array.from(new Set(memberRawData.map(item => item.unique_code).filter(Boolean)))
      const activeMember = uniqueUserKeys.length
      const pureUser = uniqueCodes.length

      const depositAmount = summaryRawData.reduce((sum, item) => sum + (Number(item.deposit_amount) || 0), 0)
      const depositCases = summaryRawData.reduce((sum, item) => sum + (Number(item.deposit_cases) || 0), 0)
      const withdrawCases = summaryRawData.reduce((sum, item) => sum + (Number(item.withdraw_cases) || 0), 0)
      const withdrawAmount = summaryRawData.reduce((sum, item) => sum + (Number(item.withdraw_amount) || 0), 0)
      const addTransaction = summaryRawData.reduce((sum, item) => sum + (Number(item.add_transaction) || 0), 0)
      const deductTransaction = summaryRawData.reduce((sum, item) => sum + (Number(item.deduct_transaction) || 0), 0)

      const grossGamingRevenue = depositAmount - withdrawAmount
      const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)
      const atv = depositCases > 0 ? depositAmount / depositCases : 0
      const ggrUser = activeMember > 0 ? netProfit / activeMember : 0
      const daUser = activeMember > 0 ? depositAmount / activeMember : 0
      const purchaseFrequency = activeMember > 0 ? depositCases / activeMember : 0

      return {
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
    }

    // Calculate KPIs for both periods
    const [periodAKPIs, periodBKPIs] = await Promise.all([
      calculateOverallKPIs(periodAStart, periodAEnd),
      calculateOverallKPIs(periodBStart, periodBEnd)
    ])

    // Check data availability for each brand in each period - only brands with active members > 0
    const checkBrandDataAvailability = async (startDate: string, endDate: string) => {
      const availableBrands = []
      
      for (const brand of allBrands) {
        // Check if brand has active members (deposit_cases > 0) in the period
        const { data, error } = await supabase
          .from('blue_whale_usc')
          .select('userkey')
          .eq('currency', 'USC')
          .eq('line', brand)
          .gte('date', startDate)
          .lte('date', endDate)
          .gt('deposit_cases', 0)
          .limit(1)
        
        if (!error && data && data.length > 0) {
          availableBrands.push(brand)
        }
      }
      
      return availableBrands
    }

    const periodAAvailableBrands = await checkBrandDataAvailability(periodAStart, periodAEnd)
    const periodBAvailableBrands = await checkBrandDataAvailability(periodBStart, periodBEnd)

    console.log('📊 Available brands:', {
      periodA: periodAAvailableBrands,
      periodB: periodBAvailableBrands
    })

    // Calculate differences and percentage changes
    const difference = {
      activeMember: periodBKPIs.activeMember - periodAKPIs.activeMember,
      pureUser: periodBKPIs.pureUser - periodAKPIs.pureUser,
      depositAmount: periodBKPIs.depositAmount - periodAKPIs.depositAmount,
      depositCases: periodBKPIs.depositCases - periodAKPIs.depositCases,
      withdrawCases: periodBKPIs.withdrawCases - periodAKPIs.withdrawCases,
      withdrawAmount: periodBKPIs.withdrawAmount - periodAKPIs.withdrawAmount,
      addTransaction: periodBKPIs.addTransaction - periodAKPIs.addTransaction,
      deductTransaction: periodBKPIs.deductTransaction - periodAKPIs.deductTransaction,
      grossGamingRevenue: periodBKPIs.grossGamingRevenue - periodAKPIs.grossGamingRevenue,
      netProfit: periodBKPIs.netProfit - periodAKPIs.netProfit,
      atv: periodBKPIs.atv - periodAKPIs.atv,
      ggrUser: periodBKPIs.ggrUser - periodAKPIs.ggrUser,
      daUser: periodBKPIs.daUser - periodAKPIs.daUser,
      purchaseFrequency: periodBKPIs.purchaseFrequency - periodAKPIs.purchaseFrequency
    }

    const percentageChange = {
      activeMember: periodAKPIs.activeMember !== 0 ? ((periodBKPIs.activeMember - periodAKPIs.activeMember) / periodAKPIs.activeMember) * 100 : 0,
      pureUser: periodAKPIs.pureUser !== 0 ? ((periodBKPIs.pureUser - periodAKPIs.pureUser) / periodAKPIs.pureUser) * 100 : 0,
      depositAmount: periodAKPIs.depositAmount !== 0 ? ((periodBKPIs.depositAmount - periodAKPIs.depositAmount) / periodAKPIs.depositAmount) * 100 : 0,
      depositCases: periodAKPIs.depositCases !== 0 ? ((periodBKPIs.depositCases - periodAKPIs.depositCases) / periodAKPIs.depositCases) * 100 : 0,
      withdrawCases: periodAKPIs.withdrawCases !== 0 ? ((periodBKPIs.withdrawCases - periodAKPIs.withdrawCases) / periodAKPIs.withdrawCases) * 100 : 0,
      withdrawAmount: periodAKPIs.withdrawAmount !== 0 ? ((periodBKPIs.withdrawAmount - periodAKPIs.withdrawAmount) / periodAKPIs.withdrawAmount) * 100 : 0,
      addTransaction: periodAKPIs.addTransaction !== 0 ? ((periodBKPIs.addTransaction - periodAKPIs.addTransaction) / periodAKPIs.addTransaction) * 100 : 0,
      deductTransaction: periodAKPIs.deductTransaction !== 0 ? ((periodBKPIs.deductTransaction - periodAKPIs.deductTransaction) / periodAKPIs.deductTransaction) * 100 : 0,
      grossGamingRevenue: periodAKPIs.grossGamingRevenue !== 0 ? ((periodBKPIs.grossGamingRevenue - periodAKPIs.grossGamingRevenue) / periodAKPIs.grossGamingRevenue) * 100 : 0,
      netProfit: periodAKPIs.netProfit !== 0 ? ((periodBKPIs.netProfit - periodAKPIs.netProfit) / periodAKPIs.netProfit) * 100 : 0,
      atv: periodAKPIs.atv !== 0 ? ((periodBKPIs.atv - periodAKPIs.atv) / periodAKPIs.atv) * 100 : 0,
      ggrUser: periodAKPIs.ggrUser !== 0 ? ((periodBKPIs.ggrUser - periodAKPIs.ggrUser) / periodAKPIs.ggrUser) * 100 : 0,
      daUser: periodAKPIs.daUser !== 0 ? ((periodBKPIs.daUser - periodAKPIs.daUser) / periodAKPIs.daUser) * 100 : 0,
      purchaseFrequency: periodAKPIs.purchaseFrequency !== 0 ? ((periodBKPIs.purchaseFrequency - periodAKPIs.purchaseFrequency) / periodAKPIs.purchaseFrequency) * 100 : 0
    }

    // Get brand-specific data for charts - only for available brands
    const brandData = await Promise.all(
      allBrands.map(async (brand) => {
        // Period A data
        const { data: periodASummary, error: periodASummaryError } = await supabase
          .from('blue_whale_usc_summary')
          .select('*')
          .eq('currency', 'USC')
          .eq('line', brand)
          .gte('date', periodAStart)
          .lte('date', periodAEnd)

        const { data: periodAMembers, error: periodAMembersError } = await supabase
          .from('blue_whale_usc')
          .select('userkey, unique_code')
          .eq('currency', 'USC')
          .eq('line', brand)
          .gte('date', periodAStart)
          .lte('date', periodAEnd)
          .gt('deposit_cases', 0)

        // Period B data
        const { data: periodBSummary, error: periodBSummaryError } = await supabase
          .from('blue_whale_usc_summary')
          .select('*')
          .eq('currency', 'USC')
          .eq('line', brand)
          .gte('date', periodBStart)
          .lte('date', periodBEnd)

        const { data: periodBMembers, error: periodBMembersError } = await supabase
          .from('blue_whale_usc')
          .select('userkey, unique_code')
          .eq('currency', 'USC')
          .eq('line', brand)
          .gte('date', periodBStart)
          .lte('date', periodBEnd)
          .gt('deposit_cases', 0)

        if (periodASummaryError || periodAMembersError || periodBSummaryError || periodBMembersError) {
          console.error(`Error fetching data for brand ${brand}:`, periodASummaryError || periodAMembersError || periodBSummaryError || periodBMembersError)
          return { brand, periodA: null, periodB: null }
        }

        // Calculate KPIs for each period
        const calculateBrandKPIs = (summaryData: any[], memberData: any[]) => {
          if (!summaryData || summaryData.length === 0) {
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

          const uniqueUserKeys = Array.from(new Set((memberData || []).map(item => item.userkey).filter(Boolean)))
          const uniqueCodes = Array.from(new Set((memberData || []).map(item => item.unique_code).filter(Boolean)))
          const activeMember = uniqueUserKeys.length
          const pureUser = uniqueCodes.length

          const depositAmount = summaryData.reduce((sum, item) => sum + (Number(item.deposit_amount) || 0), 0)
          const depositCases = summaryData.reduce((sum, item) => sum + (Number(item.deposit_cases) || 0), 0)
          const withdrawCases = summaryData.reduce((sum, item) => sum + (Number(item.withdraw_cases) || 0), 0)
          const withdrawAmount = summaryData.reduce((sum, item) => sum + (Number(item.withdraw_amount) || 0), 0)
          const addTransaction = summaryData.reduce((sum, item) => sum + (Number(item.add_transaction) || 0), 0)
          const deductTransaction = summaryData.reduce((sum, item) => sum + (Number(item.deduct_transaction) || 0), 0)

          const grossGamingRevenue = depositAmount - withdrawAmount
          const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)
          const atv = depositCases > 0 ? depositAmount / depositCases : 0
          const ggrUser = activeMember > 0 ? netProfit / activeMember : 0
          const daUser = activeMember > 0 ? depositAmount / activeMember : 0
          const purchaseFrequency = activeMember > 0 ? depositCases / activeMember : 0

          return {
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
        }

        return {
          brand,
          periodA: calculateBrandKPIs(periodASummary, periodAMembers),
          periodB: calculateBrandKPIs(periodBSummary, periodBMembers)
        }
      })
    )

    // Prepare chart data with REAL DATA - dynamic based on available brands
    const activeMemberComparison = {
      series: [
        { name: 'Active Member Period A', data: brandData.filter(b => periodAAvailableBrands.includes(b.brand)).map(b => b.periodA?.activeMember || 0) },
        { name: 'Active Member Period B', data: brandData.filter(b => periodBAvailableBrands.includes(b.brand)).map(b => b.periodB?.activeMember || 0) }
      ],
      categories: {
        periodA: periodAAvailableBrands,
        periodB: periodBAvailableBrands
      }
    }

    const depositCasesComparison = {
      series: [
        { name: 'Deposit Cases Period A', data: brandData.filter(b => periodAAvailableBrands.includes(b.brand)).map(b => b.periodA?.depositCases || 0) },
        { name: 'Deposit Cases Period B', data: brandData.filter(b => periodBAvailableBrands.includes(b.brand)).map(b => b.periodB?.depositCases || 0) }
      ],
      categories: {
        periodA: periodAAvailableBrands,
        periodB: periodBAvailableBrands
      }
    }

    const depositAmountTrend = {
      series: [
        { name: 'Deposit Amount Period A', data: brandData.filter(b => periodAAvailableBrands.includes(b.brand)).map(b => b.periodA?.depositAmount || 0) },
        { name: 'Deposit Amount Period B', data: brandData.filter(b => periodBAvailableBrands.includes(b.brand)).map(b => b.periodB?.depositAmount || 0) }
      ],
      categories: {
        periodA: periodAAvailableBrands,
        periodB: periodBAvailableBrands
      }
    }

    const netProfitTrend = {
      series: [
        { name: 'Net Profit Period A', data: brandData.filter(b => periodAAvailableBrands.includes(b.brand)).map(b => b.periodA?.netProfit || 0) },
        { name: 'Net Profit Period B', data: brandData.filter(b => periodBAvailableBrands.includes(b.brand)).map(b => b.periodB?.netProfit || 0) }
      ],
      categories: {
        periodA: periodAAvailableBrands,
        periodB: periodBAvailableBrands
      }
    }

    const ggrUserComparison = {
      series: [
        { name: 'GGR User Period A', data: brandData.filter(b => periodAAvailableBrands.includes(b.brand)).map(b => b.periodA?.ggrUser || 0) },
        { name: 'GGR User Period B', data: brandData.filter(b => periodBAvailableBrands.includes(b.brand)).map(b => b.periodB?.ggrUser || 0) }
      ],
      categories: {
        periodA: periodAAvailableBrands,
        periodB: periodBAvailableBrands
      }
    }

    const daUserComparison = {
      series: [
        { name: 'DA User Period A', data: brandData.filter(b => periodAAvailableBrands.includes(b.brand)).map(b => b.periodA?.daUser || 0) },
        { name: 'DA User Period B', data: brandData.filter(b => periodBAvailableBrands.includes(b.brand)).map(b => b.periodB?.daUser || 0) }
      ],
      categories: {
        periodA: periodAAvailableBrands,
        periodB: periodBAvailableBrands
      }
    }

    const atvTrend = {
      series: [
        { name: 'ATV Period A', data: brandData.filter(b => periodAAvailableBrands.includes(b.brand)).map(b => b.periodA?.atv || 0) },
        { name: 'ATV Period B', data: brandData.filter(b => periodBAvailableBrands.includes(b.brand)).map(b => b.periodB?.atv || 0) }
      ],
      categories: {
        periodA: periodAAvailableBrands,
        periodB: periodBAvailableBrands
      }
    }

    const purchaseFrequencyTrend = {
      series: [
        { name: 'Purchase Frequency Period A', data: brandData.filter(b => periodAAvailableBrands.includes(b.brand)).map(b => b.periodA?.purchaseFrequency || 0) },
        { name: 'Purchase Frequency Period B', data: brandData.filter(b => periodBAvailableBrands.includes(b.brand)).map(b => b.periodB?.purchaseFrequency || 0) }
      ],
      categories: {
        periodA: periodAAvailableBrands,
        periodB: periodBAvailableBrands
      }
    }

    // Prepare table data (same format as brand comparison) - FILTERED like charts
    // Only show brands that have active members in at least one period
    const availableBrandsForTable = Array.from(new Set([...periodAAvailableBrands, ...periodBAvailableBrands]))
    const tableRows = brandData
      .filter(brand => availableBrandsForTable.includes(brand.brand))
      .map(brand => {
      const periodA = brand.periodA
      const periodB = brand.periodB
      
      // Calculate derived values for Period A
      const periodAWinrate = periodA?.netProfit && periodA?.depositAmount > 0 ? ((periodA.depositAmount - periodA.withdrawAmount) / periodA.depositAmount) * 100 : 0
      
      // Calculate derived values for Period B
      const periodBWinrate = periodB?.netProfit && periodB?.depositAmount > 0 ? ((periodB.depositAmount - periodB.withdrawAmount) / periodB.depositAmount) * 100 : 0
      
      // ✅ CALCULATE DIFFERENCE (B - A) FOR EACH LINE
      const difference = {
        activeMember: (periodB?.activeMember || 0) - (periodA?.activeMember || 0),
        avgTransactionValue: (periodB?.atv || 0) - (periodA?.atv || 0),
        purchaseFrequency: (periodB?.purchaseFrequency || 0) - (periodA?.purchaseFrequency || 0),
        depositCases: (periodB?.depositCases || 0) - (periodA?.depositCases || 0),
        depositAmount: (periodB?.depositAmount || 0) - (periodA?.depositAmount || 0),
        withdrawAmount: (periodB?.withdrawAmount || 0) - (periodA?.withdrawAmount || 0),
        ggr: (periodB?.grossGamingRevenue || 0) - (periodA?.grossGamingRevenue || 0),
        winrate: periodBWinrate - periodAWinrate,
        ggrPerUser: (periodB?.ggrUser || 0) - (periodA?.ggrUser || 0),
        depositAmountPerUser: (periodB?.daUser || 0) - (periodA?.daUser || 0)
      }
      
      // ✅ CALCULATE PERCENTAGE CHANGE (%) FOR EACH LINE
      const percentageChange = {
        activeMember: (periodA?.activeMember || 0) !== 0 ? (difference.activeMember / (periodA?.activeMember || 1)) * 100 : 0,
        avgTransactionValue: (periodA?.atv || 0) !== 0 ? (difference.avgTransactionValue / (periodA?.atv || 1)) * 100 : 0,
        purchaseFrequency: (periodA?.purchaseFrequency || 0) !== 0 ? (difference.purchaseFrequency / (periodA?.purchaseFrequency || 1)) * 100 : 0,
        depositCases: (periodA?.depositCases || 0) !== 0 ? (difference.depositCases / (periodA?.depositCases || 1)) * 100 : 0,
        depositAmount: (periodA?.depositAmount || 0) !== 0 ? (difference.depositAmount / (periodA?.depositAmount || 1)) * 100 : 0,
        withdrawAmount: (periodA?.withdrawAmount || 0) !== 0 ? (difference.withdrawAmount / (periodA?.withdrawAmount || 1)) * 100 : 0,
        ggr: (periodA?.grossGamingRevenue || 0) !== 0 ? (difference.ggr / (periodA?.grossGamingRevenue || 1)) * 100 : 0,
        winrate: periodAWinrate !== 0 ? (difference.winrate / periodAWinrate) * 100 : 0,
        ggrPerUser: (periodA?.ggrUser || 0) !== 0 ? (difference.ggrPerUser / (periodA?.ggrUser || 1)) * 100 : 0,
        depositAmountPerUser: (periodA?.daUser || 0) !== 0 ? (difference.depositAmountPerUser / (periodA?.daUser || 1)) * 100 : 0
      }
      
      return {
        brand: brand.brand,
        periodA: {
          activeMember: periodA?.activeMember || 0,
          avgTransactionValue: periodA?.atv || 0,
          purchaseFrequency: periodA?.purchaseFrequency || 0,
          depositCases: periodA?.depositCases || 0,
          depositAmount: periodA?.depositAmount || 0,
          withdrawAmount: periodA?.withdrawAmount || 0,
          ggr: periodA?.grossGamingRevenue || 0,
          winrate: periodAWinrate,
          ggrPerUser: periodA?.ggrUser || 0,
          depositAmountPerUser: periodA?.daUser || 0
        },
        periodB: {
          activeMember: periodB?.activeMember || 0,
          avgTransactionValue: periodB?.atv || 0,
          purchaseFrequency: periodB?.purchaseFrequency || 0,
          depositCases: periodB?.depositCases || 0,
          depositAmount: periodB?.depositAmount || 0,
          withdrawAmount: periodB?.withdrawAmount || 0,
          ggr: periodB?.grossGamingRevenue || 0,
          winrate: periodBWinrate,
          ggrPerUser: periodB?.ggrUser || 0,
          depositAmountPerUser: periodB?.daUser || 0
        },
        diff: difference,  // ✅ Match frontend property name
        percent: percentageChange  // ✅ Match frontend property name
      }
    })

    const response = {
      success: true,
      data: {
        comparison: {
          periodA: periodAKPIs,
          periodB: periodBKPIs,
          difference,
          percentageChange
        },
        charts: {
          activeMemberComparison,
          depositCasesComparison,
          depositAmountTrend,
          netProfitTrend,
          ggrUserComparison,
          daUserComparison,
          atvTrend,
          purchaseFrequencyTrend
        },
        rows: tableRows
      },
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [Brand Performance API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
