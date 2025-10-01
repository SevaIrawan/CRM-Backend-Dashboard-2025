import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { line, year, month } = await request.json()

    console.log('📊 Exporting USC member report data to CSV with filters:', { 
      line, year, month 
    })

    if (!year || !month || month === 'ALL') {
      return NextResponse.json({
        success: false,
        error: 'Year and Month are required for export'
      }, { status: 400 })
    }

    // Get all members active in selected month
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
    if (memberError) throw memberError

    if (!memberData || memberData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active members found for the selected filters'
      }, { status: 400 })
    }

    // Get PURE last deposit dates
    const allUserKeys = Array.from(new Set(memberData.map(m => m.userkey)))
    
    const pureLastDepositQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, date')
      .eq('currency', 'USC')
      .in('userkey', allUserKeys)
      .order('date', { ascending: false })

    const { data: allDates, error: dateError } = await pureLastDepositQuery
    if (dateError) throw dateError

    const pureLastDepositMap = new Map()
    allDates?.forEach(row => {
      const current = pureLastDepositMap.get(row.userkey)
      if (!current || row.date > current) {
        pureLastDepositMap.set(row.userkey, row.date)
      }
    })

    // Aggregate and calculate
    const memberMap = new Map()
    const currentDate = new Date()

    memberData.forEach(row => {
      const key = row.userkey
      
      if (!memberMap.has(key)) {
        memberMap.set(key, {
          userkey: key,
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
      
      if (row.date && (!member.date || row.date > member.date)) {
        member.date = row.date
      }
      
      if (row.last_deposit_date && (!member.last_deposit_date || row.last_deposit_date > member.last_deposit_date)) {
        member.last_deposit_date = row.last_deposit_date
      }
    })

    const results = Array.from(memberMap.values()).map(member => {
      const pureLastDepositDate = pureLastDepositMap.get(member.userkey)
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

    // Sort by inactive_days ASC
    results.sort((a, b) => a.inactive_days - b.inactive_days)

    // Create CSV
    const headers = ['date', 'currency', 'line', 'user_name', 'unique_code', 'vip_level', 'operator', 'inactive_days', 'traffic', 'register_date', 'first_deposit_date', 'last_deposit_date', 'deposit_cases', 'deposit_amount', 'withdraw_cases', 'withdraw_amount', 'bonus', 'cases_adjustment', 'add_bonus', 'deduct_bonus', 'add_transaction', 'deduct_transaction', 'cases_bets', 'bets_amount', 'valid_amount', 'ggr', 'net_profit']
    const csvContent = [
      headers.join(','),
      ...results.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row]
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`
          }
          return value || ''
        }).join(',')
      )
    ].join('\n')

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '')
    const filterSuffix = [
      line && line !== 'ALL' ? line : '',
      year || '',
      month || ''
    ].filter(Boolean).join('_')
    
    const filename = `USC_Member_Report_${filterSuffix}_${timestamp}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('❌ Error exporting USC member report data:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

