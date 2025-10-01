import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { line, year, month } = await request.json()

    console.log('📊 Exporting USC customer retention data to CSV with filters:', { 
      line, year, month 
    })

    if (!year || !month || month === 'ALL') {
      return NextResponse.json({
        success: false,
        error: 'Year and Month are required for export'
      }, { status: 400 })
    }

    // Get previous month
    const getPrevMonth = (year: string, month: string) => {
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      const currentIndex = monthOrder.indexOf(month)
      
      if (currentIndex === 0) {
        return { year: String(parseInt(year) - 1), month: 'December' }
      } else {
        return { year, month: monthOrder[currentIndex - 1] }
      }
    }

    const { year: prevYear, month: prevMonth } = getPrevMonth(year, month)

    // Get members active in previous month
    let prevMonthQuery = supabase
      .from('blue_whale_usc')
      .select('userkey')
      .eq('currency', 'USC')
      .eq('year', prevYear)
      .eq('month', prevMonth)
      .gt('deposit_cases', 0)

    if (line !== 'ALL') {
      prevMonthQuery = prevMonthQuery.eq('line', line)
    }

    const { data: prevMonthMembers, error: prevError } = await prevMonthQuery
    if (prevError) throw prevError

    // Get members active in current month
    let currentMonthQuery = supabase
      .from('blue_whale_usc')
      .select('userkey')
      .eq('currency', 'USC')
      .eq('year', year)
      .eq('month', month)
      .gt('deposit_cases', 0)

    if (line !== 'ALL') {
      currentMonthQuery = currentMonthQuery.eq('line', line)
    }

    const { data: currentMonthMembers, error: currentError } = await currentMonthQuery
    if (currentError) throw currentError

    // Find RETAINED members (in BOTH months)
    const prevUserKeys = new Set(prevMonthMembers?.map(m => m.userkey) || [])
    const currentUserKeys = new Set(currentMonthMembers?.map(m => m.userkey) || [])
    const retainedUserKeys = Array.from(prevUserKeys).filter(key => currentUserKeys.has(key))

    if (retainedUserKeys.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No retained members found for the selected filters'
      }, { status: 400 })
    }

    // Get detailed data for retained members from CURRENT month
    let detailQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, unique_code, user_name, date, deposit_cases, deposit_amount, withdraw_cases, withdraw_amount, net_profit, ggr')
      .eq('currency', 'USC')
      .eq('year', year)
      .eq('month', month)
      .in('userkey', retainedUserKeys)

    if (line !== 'ALL') {
      detailQuery = detailQuery.eq('line', line)
    }

    const { data: retentionDetails, error: detailError } = await detailQuery
    if (detailError) throw detailError

    // Get PURE last deposit date for each member
    const pureLastDepositQuery = supabase
      .from('blue_whale_usc')
      .select('userkey, date')
      .eq('currency', 'USC')
      .in('userkey', retainedUserKeys)
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

    retentionDetails?.forEach(row => {
      const key = row.userkey
      
      if (!memberMap.has(key)) {
        memberMap.set(key, {
          userkey: row.userkey,
          unique_code: row.unique_code,
          user_name: row.user_name,
          last_deposit_date: row.date,
          active_dates: new Set(),
          deposit_cases: 0,
          deposit_amount: 0,
          withdraw_cases: 0,
          withdraw_amount: 0,
          net_profit: 0,
          ggr: 0
        })
      }

      const member = memberMap.get(key)
      
      if (row.date && (Number(row.deposit_cases) || 0) > 0) {
        member.active_dates.add(row.date)
      }
      
      member.deposit_cases += Number(row.deposit_cases) || 0
      member.deposit_amount += Number(row.deposit_amount) || 0
      member.withdraw_cases += Number(row.withdraw_cases) || 0
      member.withdraw_amount += Number(row.withdraw_amount) || 0
      member.net_profit += Number(row.net_profit) || 0
      member.ggr += Number(row.ggr) || 0
      
      if (row.date && (!member.last_deposit_date || row.date > member.last_deposit_date)) {
        member.last_deposit_date = row.date
      }
    })

    const results = Array.from(memberMap.values()).map(member => {
      const winrate = member.deposit_amount > 0 
        ? (member.ggr / member.deposit_amount) * 100 
        : 0

      const activeDays = member.active_dates.size

      const pureLastDepositDate = pureLastDepositMap.get(member.userkey)
      const inactiveDays = pureLastDepositDate 
        ? Math.floor((currentDate.getTime() - new Date(pureLastDepositDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      return {
        unique_code: member.unique_code,
        user_name: member.user_name,
        last_deposit_date: member.last_deposit_date,
        active_days: activeDays,
        inactive_days: inactiveDays,
        deposit_cases: member.deposit_cases,
        deposit_amount: member.deposit_amount,
        withdraw_cases: member.withdraw_cases,
        withdraw_amount: member.withdraw_amount,
        net_profit: member.net_profit,
        winrate: parseFloat(winrate.toFixed(2))
      }
    })

    // Sort by active_days DESC, then net_profit DESC
    results.sort((a, b) => {
      if (b.active_days !== a.active_days) {
        return b.active_days - a.active_days
      }
      return b.net_profit - a.net_profit
    })

    // Create CSV
    const headers = ['unique_code', 'user_name', 'last_deposit_date', 'active_days', 'inactive_days', 'deposit_cases', 'deposit_amount', 'withdraw_cases', 'withdraw_amount', 'net_profit', 'winrate']
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
    
    const filename = `USC_Customer_Retention_${filterSuffix}_${timestamp}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('❌ Error exporting USC customer retention data:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

