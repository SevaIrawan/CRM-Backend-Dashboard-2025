import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BRANDS = [
  'OK188','ABSG','M24SG','FWSG','WBSG','OXSG','17SG','M8SG','UWSG','KBSG','AMSG','JMSG'
]

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const periodAStart = sp.get('periodAStart') as string
    const periodAEnd = sp.get('periodAEnd') as string
    const periodBStart = sp.get('periodBStart') as string
    const periodBEnd = sp.get('periodBEnd') as string

    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      return NextResponse.json({ error: 'Missing date ranges' }, { status: 400 })
    }

    const fetchPeriodForBrand = async (brand: string, start: string, end: string) => {
      // MV aggregations
      const { data: mvData, error: mvErr } = await supabase
        .from('blue_whale_sgd_summary')
        .select('*')
        .eq('currency', 'SGD')
        .eq('line', brand)
        .gte('date', start)
        .lte('date', end)
      if (mvErr) throw mvErr

      const depositCases = mvData?.reduce((s: number, r: any) => s + (r.deposit_cases || 0), 0) || 0
      const depositAmount = mvData?.reduce((s: number, r: any) => s + (r.deposit_amount || 0), 0) || 0
      const withdrawCases = mvData?.reduce((s: number, r: any) => s + (r.withdraw_cases || 0), 0) || 0
      const withdrawAmount = mvData?.reduce((s: number, r: any) => s + (r.withdraw_amount || 0), 0) || 0
      const addTransaction = mvData?.reduce((s: number, r: any) => s + (r.add_transaction || 0), 0) || 0
      const deductTransaction = mvData?.reduce((s: number, r: any) => s + (r.deduct_transaction || 0), 0) || 0

      // Active member from master table
      const { data: amData, error: amErr } = await supabase
        .from('blue_whale_sgd')
        .select('userkey')
        .eq('currency', 'SGD')
        .eq('line', brand)
        .gte('date', start)
        .lte('date', end)
        .gt('deposit_cases', 0)
      if (amErr) throw amErr
      const activeMember = new Set((amData || []).map((r: any) => r.userkey)).size

      // Derived metrics
      const ggr = depositAmount - withdrawAmount
      const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction)
      const avgTransactionValue = depositCases > 0 ? depositAmount / depositCases : 0
      const purchaseFrequency = activeMember > 0 ? depositCases / activeMember : 0
      const winrate = depositAmount > 0 ? (ggr / depositAmount) * 100 : 0
      const ggrPerUser = activeMember > 0 ? netProfit / activeMember : 0
      const depositAmountPerUser = activeMember > 0 ? depositAmount / activeMember : 0

      return {
        activeMember,
        avgTransactionValue,
        purchaseFrequency,
        depositCases,
        depositAmount,
        ggr: netProfit, // per instruction, GGR column shows Net Profit
        winrate,
        ggrPerUser,
        depositAmountPerUser
      }
    }

    const rows = [] as any[]
    for (const brand of BRANDS) {
      const A = await fetchPeriodForBrand(brand, periodAStart, periodAEnd)
      const B = await fetchPeriodForBrand(brand, periodBStart, periodBEnd)

      const diff = {
        activeMember: B.activeMember - A.activeMember,
        avgTransactionValue: B.avgTransactionValue - A.avgTransactionValue,
        purchaseFrequency: B.purchaseFrequency - A.purchaseFrequency,
        depositCases: B.depositCases - A.depositCases,
        depositAmount: B.depositAmount - A.depositAmount,
        ggr: B.ggr - A.ggr,
        winrate: B.winrate - A.winrate,
        ggrPerUser: B.ggrPerUser - A.ggrPerUser,
        depositAmountPerUser: B.depositAmountPerUser - A.depositAmountPerUser
      }

      const percent = {
        activeMember: A.activeMember !== 0 ? (diff.activeMember / A.activeMember) * 100 : 0,
        avgTransactionValue: A.avgTransactionValue !== 0 ? (diff.avgTransactionValue / A.avgTransactionValue) * 100 : 0,
        purchaseFrequency: A.purchaseFrequency !== 0 ? (diff.purchaseFrequency / A.purchaseFrequency) * 100 : 0,
        depositCases: A.depositCases !== 0 ? (diff.depositCases / A.depositCases) * 100 : 0,
        depositAmount: A.depositAmount !== 0 ? (diff.depositAmount / A.depositAmount) * 100 : 0,
        ggr: A.ggr !== 0 ? (diff.ggr / A.ggr) * 100 : 0,
        winrate: A.winrate !== 0 ? (diff.winrate / A.winrate) * 100 : 0,
        ggrPerUser: A.ggrPerUser !== 0 ? (diff.ggrPerUser / A.ggrPerUser) * 100 : 0,
        depositAmountPerUser: A.depositAmountPerUser !== 0 ? (diff.depositAmountPerUser / A.depositAmountPerUser) * 100 : 0
      }

      rows.push({ brand, periodA: A, periodB: B, diff, percent })
    }

    return NextResponse.json({ success: true, data: { rows } })
  } catch (error) {
    console.error('SGD Brand Comparison error', error)
    return NextResponse.json({ success: false, error: 'Failed to load SGD brand comparison' }, { status: 500 })
  }
}
