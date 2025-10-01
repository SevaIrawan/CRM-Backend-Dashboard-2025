import { supabase } from '@/lib/supabase'

export type USCFilterMode = 'month' | 'daterange' | null

export interface USCSummaryFilters {
  currency?: 'USC'
  line?: string | null
  year?: string | null
  month?: string | null // Can be null to get ALL months
  startDate?: string | null
  endDate?: string | null
  filterMode?: USCFilterMode
}

export interface USCSummaryRow {
  date: string
  year: number
  month: string
  line: string | null
  currency: string
  uniquekey: string
  active_member: number
  pure_user: number
  deposit_cases: number
  deposit_amount: number
  withdraw_cases: number
  withdraw_amount: number
  bonus: number
  add_bonus: number
  add_transaction: number
  deduct_bonus: number
  deduct_transaction: number
  bets_amount: number
  valid_amount: number
  new_register: number
  new_depositor: number
  ggr: number
  net_profit: number
  atv: number
  pf: number
  winrate: number
  hold_percentage: number
  deposit_amount_per_user: number
  ggr_per_user: number
  conversion_rate: number
}

function applySummaryFilters(query: any, filters: USCSummaryFilters) {
  query = query.eq('currency', 'USC')

  if (filters.line && filters.line !== 'ALL' && filters.line !== 'all') {
    query = query.eq('line', filters.line)
  }

  if (filters.filterMode === 'month') {
    if (filters.year && filters.year !== 'ALL') {
      query = query.eq('year', parseInt(filters.year))
    }
    if (filters.month && filters.month !== 'ALL' && filters.month !== null) {
      query = query.eq('month', filters.month)
    }
    // If month is null or 'ALL', don't filter by month - get ALL months for the year
  } else if (filters.filterMode === 'daterange') {
    if (filters.startDate && filters.endDate) {
      query = query.gte('date', filters.startDate).lte('date', filters.endDate)
    }
  } else {
    if (filters.year && filters.year !== 'ALL') {
      query = query.eq('year', parseInt(filters.year))
    }
    if (filters.month && filters.month !== 'ALL' && filters.month !== null) {
      query = query.eq('month', filters.month)
    }
    // If month is null or 'ALL', don't filter by month - get ALL months for the year
  }

  return query
}

export async function getUSCSummaryCount(filters: USCSummaryFilters): Promise<number> {
  let countQuery = supabase
    .from('blue_whale_usc_summary')
    .select('*', { count: 'exact', head: true })

  countQuery = applySummaryFilters(countQuery, filters)

  const { count, error } = await countQuery
  if (error) throw error
  return count || 0
}

export async function getUSCSummaryRows(
  filters: USCSummaryFilters,
  page: number,
  limit: number
): Promise<USCSummaryRow[]> {
  let query = supabase
    .from('blue_whale_usc_summary')
    .select('*')

  query = applySummaryFilters(query, filters)

  const offset = (page - 1) * limit
  query = query
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as unknown as USCSummaryRow[]
}

// Helper function untuk get months dari blue_whale_usc table
export async function getUSCMonthsForYear(year: string, line?: string): Promise<string[]> {
  try {
    let query = supabase
      .from('blue_whale_usc')
      .select('month')
      .eq('year', parseInt(year))
      .eq('currency', 'USC')

    if (line && line !== 'ALL') {
      query = query.eq('line', line)
    }

    const { data, error } = await query
    if (error) throw error

    const rawMonths = (data || []).map((item: any) => item.month).filter(Boolean)
    const months = Array.from(new Set(rawMonths))
    
    // Sort months chronologically
    const monthOrder: { [key: string]: number } = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
      'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    months.sort((a: string, b: string) => (monthOrder[a] || 0) - (monthOrder[b] || 0))

    return months
  } catch (error) {
    console.error('❌ [USCSummaryLogic] Error fetching months for year:', error)
    return []
  }
}


