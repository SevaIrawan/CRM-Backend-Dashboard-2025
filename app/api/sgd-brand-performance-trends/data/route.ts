import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterBrandsByUser } from '@/utils/brandAccessHelper'

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

    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    console.log('🔄 [Brand Performance API] Fetching data for periods:', {
      periodA: { start: periodAStart, end: periodAEnd },
      periodB: { start: periodBStart, end: periodBEnd },
      user_allowed_brands: userAllowedBrands,
      is_squad_lead: userAllowedBrands !== null && userAllowedBrands?.length > 0
    })

    // ✅ FETCH ALL BRANDS FROM DATABASE (NOT HARDCODE)
    const { data: allBrandsData } = await supabase
      .from('blue_whale_sgd_summary')
      .select('line')
      .eq('currency', 'SGD')
      .not('line', 'is', null)
    
    const allBrandsFromDB: string[] = Array.from(new Set(allBrandsData?.map((row: any) => row.line).filter(Boolean) || []))
    
    // ✅ Filter brands: Admin = ALL brands, Squad Lead = their brands only
    const allBrands: string[] = filterBrandsByUser(allBrandsFromDB, userAllowedBrands)
    
    console.log('📊 [Brand Comparison SGD] Brands for this user:', {
      total_available: allBrandsFromDB.length,
      user_access: allBrands.length,
      brands: allBrands,
      filtered: userAllowedBrands !== null
    })
    
    // Calculate overall KPIs for both periods
    const calculateOverallKPIs = async (startDate: string, endDate: string) => {
      // Get summary data for all brands
      const { data: summaryData, error: summaryError } = await supabase
        .from('blue_whale_sgd_summary')
        .select('*')
        .eq('currency', 'SGD')
        .in('line', allBrands)
        .gte('date', startDate)
        .lte('date', endDate)

      if (summaryError) throw summaryError

      // Get member data for active member calculation
      const { data: memberData, error: memberError } = await supabase
        .from('blue_whale_sgd')
        .select('userkey, unique_code')
        .eq('currency', 'SGD')
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
    const checkBrandDataAvailability = async (startDate: string, endDate: string): Promise<string[]> => {
      const availableBrands: string[] = []
      
      console.log(`🔍 [checkBrandDataAvailability] Checking ${allBrands.length} brands for period ${startDate} to ${endDate}`)
      console.log(`🔍 [checkBrandDataAvailability] All brands to check:`, allBrands)
      
      for (const brand of allBrands) {
        // Check if brand has data in the period - use summary table for consistency
        const { data, error } = await supabase
          .from('blue_whale_sgd_summary')
          .select('active_member, deposit_cases')
          .eq('currency', 'SGD')
          .eq('line', brand)
          .gte('date', startDate)
          .lte('date', endDate)
          .limit(1)
        
        // Brand available if has ANY data (active_member > 0 OR deposit_cases > 0)
        const hasData = data && data.length > 0 && (
          ((data[0] as any).active_member && (data[0] as any).active_member > 0) ||
          ((data[0] as any).deposit_cases && (data[0] as any).deposit_cases > 0)
        )
        
        if (!error && hasData) {
          availableBrands.push(brand)
          console.log(`✅ [checkBrandDataAvailability] Brand "${brand}" HAS data in this period`)
        } else {
          console.log(`❌ [checkBrandDataAvailability] Brand "${brand}" NO data in this period (error: ${error?.message || 'no data'})`)
        }
      }
      
      console.log(`✅ [checkBrandDataAvailability] Final available brands:`, availableBrands)
      return availableBrands
    }

    const periodAAvailableBrands = await checkBrandDataAvailability(periodAStart, periodAEnd)
    const periodBAvailableBrands = await checkBrandDataAvailability(periodBStart, periodBEnd)
    
    // ✅ UNION of brands (brands that have data in Period A OR Period B)
    const allAvailableBrands = Array.from(new Set([...periodAAvailableBrands, ...periodBAvailableBrands])).sort()

    console.log('📊 Available brands:', {
      periodA: periodAAvailableBrands,
      periodB: periodBAvailableBrands,
      union: allAvailableBrands
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

    // ✅ HELPER FUNCTION: Calculate percentage change with proper handling for negative values
    const calculatePercentageChangeGlobal = (valueA: number, valueB: number): number => {
      // If Period A is 0, handle special cases
      if (valueA === 0) {
        if (valueB === 0) return 0
        // If A=0 and B is not zero, return +/-100% based on B's sign
        return valueB > 0 ? 100 : -100
      }
      
      // For all other cases (including negative Period A):
      // Use absolute value of Period A as denominator to get meaningful percentage
      const difference = valueB - valueA
      return (difference / Math.abs(valueA)) * 100
    }

    const percentageChange = {
      activeMember: calculatePercentageChangeGlobal(periodAKPIs.activeMember, periodBKPIs.activeMember),
      pureUser: calculatePercentageChangeGlobal(periodAKPIs.pureUser, periodBKPIs.pureUser),
      depositAmount: calculatePercentageChangeGlobal(periodAKPIs.depositAmount, periodBKPIs.depositAmount),
      depositCases: calculatePercentageChangeGlobal(periodAKPIs.depositCases, periodBKPIs.depositCases),
      withdrawCases: calculatePercentageChangeGlobal(periodAKPIs.withdrawCases, periodBKPIs.withdrawCases),
      withdrawAmount: calculatePercentageChangeGlobal(periodAKPIs.withdrawAmount, periodBKPIs.withdrawAmount),
      addTransaction: calculatePercentageChangeGlobal(periodAKPIs.addTransaction, periodBKPIs.addTransaction),
      deductTransaction: calculatePercentageChangeGlobal(periodAKPIs.deductTransaction, periodBKPIs.deductTransaction),
      grossGamingRevenue: calculatePercentageChangeGlobal(periodAKPIs.grossGamingRevenue, periodBKPIs.grossGamingRevenue),
      netProfit: calculatePercentageChangeGlobal(periodAKPIs.netProfit, periodBKPIs.netProfit),
      atv: calculatePercentageChangeGlobal(periodAKPIs.atv, periodBKPIs.atv),
      ggrUser: calculatePercentageChangeGlobal(periodAKPIs.ggrUser, periodBKPIs.ggrUser),
      daUser: calculatePercentageChangeGlobal(periodAKPIs.daUser, periodBKPIs.daUser),
      purchaseFrequency: calculatePercentageChangeGlobal(periodAKPIs.purchaseFrequency, periodBKPIs.purchaseFrequency)
    }

    // Get brand-specific data for charts - only for available brands
    const brandData = await Promise.all(
      allBrands.map(async (brand) => {
        // Period A data
        const { data: periodASummary, error: periodASummaryError } = await supabase
          .from('blue_whale_sgd_summary')
          .select('*')
          .eq('currency', 'SGD')
          .eq('line', brand)
          .gte('date', periodAStart)
          .lte('date', periodAEnd)

        const { data: periodAMembers, error: periodAMembersError } = await supabase
          .from('blue_whale_sgd')
          .select('userkey, unique_code')
          .eq('currency', 'SGD')
          .eq('line', brand)
          .gte('date', periodAStart)
          .lte('date', periodAEnd)
          .gt('deposit_cases', 0)

        // Period B data
        const { data: periodBSummary, error: periodBSummaryError } = await supabase
          .from('blue_whale_sgd_summary')
          .select('*')
          .eq('currency', 'SGD')
          .eq('line', brand)
          .gte('date', periodBStart)
          .lte('date', periodBEnd)

        const { data: periodBMembers, error: periodBMembersError } = await supabase
          .from('blue_whale_sgd')
          .select('userkey, unique_code')
          .eq('currency', 'SGD')
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

    // ✅ Prepare chart data - USE UNION BRANDS (brands with data in Period A OR Period B)
    // For ALL brands in union: show their data if exists, or 0 if not
    const activeMemberComparison = {
      series: [
        { 
          name: 'Active Member Period A', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodA?.activeMember || 0
          })
        },
        { 
          name: 'Active Member Period B', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodB?.activeMember || 0
          })
        }
      ],
      categories: {
        periodA: allAvailableBrands,
        periodB: allAvailableBrands
      }
    }

    const depositCasesComparison = {
      series: [
        { 
          name: 'Deposit Cases Period A', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodA?.depositCases || 0
          })
        },
        { 
          name: 'Deposit Cases Period B', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodB?.depositCases || 0
          })
        }
      ],
      categories: {
        periodA: allAvailableBrands,
        periodB: allAvailableBrands
      }
    }

    const depositAmountTrend = {
      series: [
        { 
          name: 'Deposit Amount Period A', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodA?.depositAmount || 0
          })
        },
        { 
          name: 'Deposit Amount Period B', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodB?.depositAmount || 0
          })
        }
      ],
      categories: {
        periodA: allAvailableBrands,
        periodB: allAvailableBrands
      }
    }

    const netProfitTrend = {
      series: [
        { 
          name: 'Net Profit Period A', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodA?.netProfit || 0
          })
        },
        { 
          name: 'Net Profit Period B', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodB?.netProfit || 0
          })
        }
      ],
      categories: {
        periodA: allAvailableBrands,
        periodB: allAvailableBrands
      }
    }

    const ggrUserComparison = {
      series: [
        { 
          name: 'GGR User Period A', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodA?.ggrUser || 0
          })
        },
        { 
          name: 'GGR User Period B', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodB?.ggrUser || 0
          })
        }
      ],
      categories: {
        periodA: allAvailableBrands,
        periodB: allAvailableBrands
      }
    }

    const daUserComparison = {
      series: [
        { 
          name: 'DA User Period A', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodA?.daUser || 0
          })
        },
        { 
          name: 'DA User Period B', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodB?.daUser || 0
          })
        }
      ],
      categories: {
        periodA: allAvailableBrands,
        periodB: allAvailableBrands
      }
    }

    const atvTrend = {
      series: [
        { 
          name: 'ATV Period A', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodA?.atv || 0
          })
        },
        { 
          name: 'ATV Period B', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodB?.atv || 0
          })
        }
      ],
      categories: {
        periodA: allAvailableBrands,
        periodB: allAvailableBrands
      }
    }

    const purchaseFrequencyTrend = {
      series: [
        { 
          name: 'Purchase Frequency Period A', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodA?.purchaseFrequency || 0
          })
        },
        { 
          name: 'Purchase Frequency Period B', 
          data: allAvailableBrands.map(brand => {
            const brandItem = brandData.find(b => b.brand === brand)
            return brandItem?.periodB?.purchaseFrequency || 0
          })
        }
      ],
      categories: {
        periodA: allAvailableBrands,
        periodB: allAvailableBrands
      }
    }

    // ✅ HELPER FUNCTION: Calculate percentage change with proper handling for negative values
    const calculatePercentageChange = (valueA: number, valueB: number): number => {
      // If Period A is 0, handle special cases
      if (valueA === 0) {
        if (valueB === 0) return 0
        // If A=0 and B is not zero, return +/-100% based on B's sign
        return valueB > 0 ? 100 : -100
      }
      
      // For all other cases (including negative Period A):
      // Use absolute value of Period A as denominator to get meaningful percentage
      // Example 1: A=-100, B=50 → diff=150, %=(150/100)*100=150% ✅ (improved from loss to profit)
      // Example 2: A=-100, B=-50 → diff=50, %=(50/100)*100=50% ✅ (loss reduced by 50%)
      // Example 3: A=-100, B=-150 → diff=-50, %=(-50/100)*100=-50% ✅ (loss increased by 50%)
      // Example 4: A=100, B=50 → diff=-50, %=(-50/100)*100=-50% ✅ (decreased by 50%)
      const difference = valueB - valueA
      return (difference / Math.abs(valueA)) * 100
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
      
      // ✅ CALCULATE PERCENTAGE CHANGE (%) FOR EACH LINE USING HELPER FUNCTION
      const percentageChange = {
        activeMember: calculatePercentageChange(periodA?.activeMember || 0, periodB?.activeMember || 0),
        avgTransactionValue: calculatePercentageChange(periodA?.atv || 0, periodB?.atv || 0),
        purchaseFrequency: calculatePercentageChange(periodA?.purchaseFrequency || 0, periodB?.purchaseFrequency || 0),
        depositCases: calculatePercentageChange(periodA?.depositCases || 0, periodB?.depositCases || 0),
        depositAmount: calculatePercentageChange(periodA?.depositAmount || 0, periodB?.depositAmount || 0),
        withdrawAmount: calculatePercentageChange(periodA?.withdrawAmount || 0, periodB?.withdrawAmount || 0),
        ggr: calculatePercentageChange(periodA?.grossGamingRevenue || 0, periodB?.grossGamingRevenue || 0),
        winrate: calculatePercentageChange(periodAWinrate, periodBWinrate),
        ggrPerUser: calculatePercentageChange(periodA?.ggrUser || 0, periodB?.ggrUser || 0),
        depositAmountPerUser: calculatePercentageChange(periodA?.daUser || 0, periodB?.daUser || 0)
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
