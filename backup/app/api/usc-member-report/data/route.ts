import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // USC Member Report page - Currency LOCKED to USC
  const currency = 'USC'
  const line = searchParams.get('line') || 'ALL'
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '1000')

  try {
    console.log('🔍 [USC Member Report API] Fetching member report data:', { 
      year, 
      month, 
      line, 
      page, 
      limit 
    })

    if (!year || !month || month === 'ALL') {
      return NextResponse.json({
        success: false,
        error: 'Year and Month are required',
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          recordsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        }
      })
    }

    // Step 1: Get all members active in selected month
    let memberQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, unique_code, user_name, date, line, currency, vip_level, operator, traffic, register_date, first_deposit_date, last_deposit_date, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, bonus, cases_adjustment, add_bonus, deduct_bonus, add_transaction, deduct_transaction, cases_bets, bets_amount, valid_amount, ggr, net_profit')
      .eq('currency', 'USC')
      .eq('year', year)
      .eq('month', month)
      .gt('deposit_cases', 0)

    if (line !== 'ALL') {
      memberQuery = memberQuery.eq('line', line)
    }

    const { data: memberData, error: memberError } = await memberQuery

    if (memberError) {
      console.error('❌ Error fetching member data:', memberError)
      throw memberError
    }

    console.log('📊 [USC Member Report] Active members in selected month:', memberData?.length)

    if (!memberData || memberData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          recordsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        }
      })
    }

    // Step 2: Get PURE last deposit date (MAX date from ALL data) for inactive days calculation
    const allUserKeys = Array.from(new Set(memberData.map(m => m.userkey)))
    
    const pureLastDepositQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, date')
      .eq('currency', 'USC')
      .in('userkey', allUserKeys)
      .order('date', { ascending: false })

    const { data: allDates, error: dateError } = await pureLastDepositQuery

    if (dateError) {
      console.error('❌ Error fetching pure last deposit dates:', dateError)
      throw dateError
    }

    // Build map of userkey -> pure last deposit date (max date)
    const pureLastDepositMap = new Map()
    allDates?.forEach(row => {
      const current = pureLastDepositMap.get(row.userkey)
      const rowDate = String(row.date)
      if (!current || rowDate > current) {
        pureLastDepositMap.set(row.userkey, rowDate)
      }
    })

    console.log('📊 [USC Member Report] Pure last deposit dates fetched:', pureLastDepositMap.size)

    // Step 3: Aggregate data per member
    const memberMap = new Map()
    const currentDate = new Date()

    memberData.forEach(row => {
      const key = row.userkey
      
      if (!memberMap.has(key)) {
        memberMap.set(key, {
          date: row.date,
          currency: row.currency,
          line: row.line,
          user_name: row.user_name,
          unique_code: row.unique_code,
          vip_level: row.vip_level,
          operator: row.operator,
          traffic: row.traffic,
          register_date: row.register_date,
          first_deposit_date: row.first_deposit_date,
          last_deposit_date: row.last_deposit_date || row.date,
          deposit_cases: 0,
          deposit_amount: 0,
          withdraw_cases: 0,
          withdraw_amount: 0,
          bonus: 0,
          cases_adjustment: 0,
          add_bonus: 0,
          deduct_bonus: 0,
          add_transaction: 0,
          deduct_transaction: 0,
          cases_bets: 0,
          bets_amount: 0,
          valid_amount: 0,
          ggr: 0,
          net_profit: 0
        })
      }

      const member = memberMap.get(key)
      
      // Aggregate metrics
      member.deposit_cases += Number(row.deposit_cases) || 0
      member.deposit_amount += Number(row.deposit_amount) || 0
      member.withdraw_cases += Number(row.withdraw_cases) || 0
      member.withdraw_amount += Number(row.withdraw_amount) || 0
      member.bonus += Number(row.bonus) || 0
      member.cases_adjustment += Number(row.cases_adjustment) || 0
      member.add_bonus += Number(row.add_bonus) || 0
      member.deduct_bonus += Number(row.deduct_bonus) || 0
      member.add_transaction += Number(row.add_transaction) || 0
      member.deduct_transaction += Number(row.deduct_transaction) || 0
      member.cases_bets += Number(row.cases_bets) || 0
      member.bets_amount += Number(row.bets_amount) || 0
      member.valid_amount += Number(row.valid_amount) || 0
      member.ggr += Number(row.ggr) || 0
      member.net_profit += Number(row.net_profit) || 0
      
      // Keep the latest date
      if (row.date && (!member.date || row.date > member.date)) {
        member.date = row.date
      }
      
      if (row.last_deposit_date && (!member.last_deposit_date || row.last_deposit_date > member.last_deposit_date)) {
        member.last_deposit_date = row.last_deposit_date
      }
    })

    // Step 4: Calculate inactive days and prepare results  
    const results = Array.from(memberMap.values()).map(member => {
      // Inactive days (PURE) = TODAY - MAX(date) from ALL data
      // Need to find userkey from member data first
      const userkey = memberData.find(m => m.unique_code === member.unique_code)?.userkey
      const pureLastDepositDate = userkey ? pureLastDepositMap.get(userkey) : null
      const inactiveDays = pureLastDepositDate 
        ? Math.floor((currentDate.getTime() - new Date(pureLastDepositDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      return {
        date: member.date,
        currency: member.currency,
        line: member.line,
        user_name: member.user_name,
        unique_code: member.unique_code,
        vip_level: member.vip_level,
        operator: member.operator,
        inactive_days: inactiveDays,
        traffic: member.traffic,
        register_date: member.register_date,
        first_deposit_date: member.first_deposit_date,
        last_deposit_date: member.last_deposit_date,
        deposit_cases: member.deposit_cases,
        deposit_amount: member.deposit_amount,
        withdraw_cases: member.withdraw_cases,
        withdraw_amount: member.withdraw_amount,
        bonus: member.bonus,
        cases_adjustment: member.cases_adjustment,
        add_bonus: member.add_bonus,
        deduct_bonus: member.deduct_bonus,
        add_transaction: member.add_transaction,
        deduct_transaction: member.deduct_transaction,
        cases_bets: member.cases_bets,
        bets_amount: member.bets_amount,
        valid_amount: member.valid_amount,
        ggr: member.ggr,
        net_profit: member.net_profit
      }
    })

    // Step 5: Sort by inactive_days ASC
    results.sort((a, b) => a.inactive_days - b.inactive_days)

    // Step 6: Pagination
    const totalRecords = results.length
    const totalPages = Math.ceil(totalRecords / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = results.slice(startIndex, endIndex)

    console.log('✅ [USC Member Report API] Data fetched successfully:', {
      totalRecords,
      totalPages,
      currentPage: page,
      returnedRecords: paginatedData.length
    })

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('❌ [USC Member Report API] Error:', error)
    console.error('❌ [USC Member Report API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      filters: { year, month, line }
    })
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalRecords: 0,
        recordsPerPage: limit,
        hasNextPage: false,
        hasPrevPage: false
      }
    }, { status: 500 })
  }
}

