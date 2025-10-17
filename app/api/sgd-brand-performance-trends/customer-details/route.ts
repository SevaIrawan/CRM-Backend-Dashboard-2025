import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get('brand')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!brand || !startDate || !endDate) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: brand, startDate, endDate' 
      }, { status: 400 })
    }

    console.log('🔍 [Customer Details API] Fetching for:', { brand, startDate, endDate, page, limit })

    // ✅ STEP 1: Get all userkeys with deposit_cases > 0 in the date range
    let activeUsersQuery = supabase
      .from('blue_whale_sgd')
      .select('userkey, unique_code, date, deposit_cases, deposit_amount')
      .eq('currency', 'SGD')
      .gte('date', startDate)
      .lte('date', endDate)
      .gt('deposit_cases', 0)
    
    // If brand is not "ALL", filter by specific brand
    if (brand !== 'ALL') {
      activeUsersQuery = activeUsersQuery.eq('line', brand)
    }
    
    const { data: activeUsers, error: activeUsersError } = await activeUsersQuery
    
    console.log('🔍 [DEBUG] Active users query result:', {
      count: activeUsers?.length || 0,
      sampleDates: activeUsers?.slice(0, 3).map(u => ({ date: u.date, depositAmount: u.deposit_amount }))
    })

    if (activeUsersError) throw activeUsersError

    if (!activeUsers || activeUsers.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // ✅ Get UNIQUE userkeys to ensure NO DUPLICATES
    const uniqueUserKeys: string[] = Array.from(new Set(activeUsers.map(u => u.userkey).filter(Boolean))) as string[]
    
    console.log('👥 [Customer Details API] Found unique userkeys:', uniqueUserKeys.length)
    console.log('📊 [DEBUG] Total records vs unique userkeys:', {
      totalRecords: activeUsers.length,
      uniqueUserkeys: uniqueUserKeys.length,
      hasDuplicates: activeUsers.length !== uniqueUserKeys.length
    })

    // ✅ STEP 2: For each userkey, fetch ALL transactions within date range and calculate metrics
    const customerDetails = await Promise.all(
      uniqueUserKeys.map(async (userkey) => {
        // Get user's unique_code (use the first occurrence)
        const userRecord = activeUsers.find(u => u.userkey === userkey)
        const uniqueCode = userRecord?.unique_code || ''

        // Get all transactions for this user in the date range
        let transactionsQuery = supabase
          .from('blue_whale_sgd')
          .select('userkey, unique_code, date, line, deposit_amount, withdraw_amount, deposit_cases, withdraw_cases, net_profit, ggr, valid_amount, bonus, add_transaction, deduct_transaction')
          .eq('currency', 'SGD')
          .eq('userkey', userkey)
          .gte('date', startDate)
          .lte('date', endDate)
        
        // If brand is not "ALL", filter by specific brand
        if (brand !== 'ALL') {
          transactionsQuery = transactionsQuery.eq('line', brand)
        }
        
        const { data: transactions, error: transError } = await transactionsQuery

        if (transError) {
          console.error(`Error fetching transactions for userkey ${userkey}:`, transError)
          return null
        }

        if (!transactions || transactions.length === 0) {
          return null
        }

        // ✅ VERIFY unique_code consistency for this userkey
        const uniqueCodes = Array.from(new Set(transactions.map(t => t.unique_code)))
        if (uniqueCodes.length > 1) {
          console.warn('⚠️ [INCONSISTENT unique_code]', {
            userkey,
            uniqueCodes,
            warning: 'Same userkey has multiple unique_codes!'
          })
        }

        // ✅ CALCULATE METRICS for this customer - SUM ALL transactions in date range
        const depositAmount = transactions.reduce((sum, t) => sum + (Number(t.deposit_amount) || 0), 0)
        const depositCases = transactions.reduce((sum, t) => sum + (Number(t.deposit_cases) || 0), 0)
        const withdrawAmount = transactions.reduce((sum, t) => sum + (Number(t.withdraw_amount) || 0), 0)
        const withdrawCases = transactions.reduce((sum, t) => sum + (Number(t.withdraw_cases) || 0), 0)
        const addTransaction = transactions.reduce((sum, t) => sum + (Number(t.add_transaction) || 0), 0)
        const deductTransaction = transactions.reduce((sum, t) => sum + (Number(t.deduct_transaction) || 0), 0)
        const bonus = transactions.reduce((sum, t) => sum + (Number(t.bonus) || 0), 0)

        // Last Deposit Date - Max date where deposit_cases > 0
        const depositsWithDate = transactions
          .filter(t => (Number(t.deposit_cases) || 0) > 0)
          .map(t => t.date)
          .filter((date): date is string => typeof date === 'string')
        const lastDepositDate = depositsWithDate.length > 0 
          ? depositsWithDate.reduce((max: string, date: string) => date > max ? date : max, depositsWithDate[0])
          : ''

        // Days Active - Count distinct days where deposit_cases > 0
        const activeDates = Array.from(new Set(
          transactions
            .filter(t => (Number(t.deposit_cases) || 0) > 0)
            .map(t => t.date)
        ))
        const daysActive = activeDates.length

        const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)
        
        // ✅ FORMULA SESUAI REQUIREMENT:
        // ATV = deposit_amount / deposit_cases (per customer)
        const atv = depositCases > 0 ? depositAmount / depositCases : 0

        // ✅ User Name dari field 'user_name' BUKAN 'unique_code'
        const userName = transactions[0]?.user_name || ''

        return {
          userName,
          uniqueCode,
          lastDepositDate,
          daysActive,
          atv,
          depositCases,
          depositAmount,
          withdrawCases,
          withdrawAmount,
          bonus,
          netProfit
        }
      })
    )

    // Filter out null values and sort by Net Profit descending (highest to lowest)
    const allValidCustomers = customerDetails
      .filter(c => c !== null)
      .sort((a, b) => (b?.netProfit || 0) - (a?.netProfit || 0))

    // ✅ VERIFY NO DUPLICATE unique_codes in final result
    const finalUniqueCodes = allValidCustomers.map(c => c?.uniqueCode)
    const uniqueCodesSet = new Set(finalUniqueCodes)
    if (finalUniqueCodes.length !== uniqueCodesSet.size) {
      console.error('❌ [DUPLICATE DETECTED] Found duplicate unique_codes in result!', {
        totalRecords: finalUniqueCodes.length,
        uniqueRecords: uniqueCodesSet.size,
        duplicates: finalUniqueCodes.filter((code, index) => finalUniqueCodes.indexOf(code) !== index)
      })
    } else {
      console.log('✅ [NO DUPLICATES] All unique_codes are unique:', uniqueCodesSet.size)
    }

    const totalRecords = allValidCustomers.length
    const totalPages = Math.ceil(totalRecords / limit)

    // ✅ APPLY PAGINATION
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedCustomers = allValidCustomers.slice(startIndex, endIndex)

    console.log('✅ [Customer Details API] Total:', totalRecords, '| Page:', page, '/', totalPages, '| Returning:', paginatedCustomers.length, 'customers')

    return NextResponse.json({
      success: true,
      data: paginatedCustomers,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages
      }
    })

  } catch (error) {
    console.error('❌ [Customer Details API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

