import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userkey = searchParams.get('userkey')
    const uniqueCode = searchParams.get('uniqueCode')
    
    // Date range format (same as Customer Tier Trends)
    const periodAStart = searchParams.get('periodAStart')
    const periodAEnd = searchParams.get('periodAEnd')
    const periodBStart = searchParams.get('periodBStart')
    const periodBEnd = searchParams.get('periodBEnd')
    
    const line = searchParams.get('line')
    const squadLead = searchParams.get('squadLead')
    const channel = searchParams.get('channel')

    // Validation
    if (!userkey && !uniqueCode) {
      return NextResponse.json(
        { error: 'Missing required parameter: userkey or uniqueCode' },
        { status: 400 }
      )
    }

    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      return NextResponse.json(
        { error: 'Missing required parameters: periodAStart, periodAEnd, periodBStart, periodBEnd' },
        { status: 400 }
      )
    }

    // Validate date formats
    const validateDate = (dateStr: string): boolean => {
      if (!dateStr || typeof dateStr !== 'string') return false
      const date = new Date(dateStr)
      return !isNaN(date.getTime())
    }

    if (!validateDate(periodAStart!) || !validateDate(periodAEnd!) || 
        !validateDate(periodBStart!) || !validateDate(periodBEnd!)) {
      return NextResponse.json(
        { error: 'Invalid date format in period date ranges' },
        { status: 400 }
      )
    }

    console.log('📊 [Customer Detail API] Fetching detail for:', {
      userkey,
      uniqueCode,
      periodA: { start: periodAStart, end: periodAEnd },
      periodB: { start: periodBStart, end: periodBEnd },
      line,
      squadLead,
      channel
    })


    // ✅ Fetch Period A data from blue_whale_usc based on date range
    let periodAQuery = supabase
      .from('blue_whale_usc')
      .select('date, userkey, unique_code, user_name, deposit_amount, withdraw_amount, deposit_cases, first_deposit_date, register_date')
      .eq('currency', 'USC')
      .gte('date', periodAStart!)
      .lte('date', periodAEnd!)

    if (userkey) {
      periodAQuery = periodAQuery.eq('userkey', userkey)
    } else if (uniqueCode) {
      periodAQuery = periodAQuery.eq('unique_code', uniqueCode)
    }

    // Apply filters
    if (line && line !== 'All' && line !== 'ALL') {
      periodAQuery = periodAQuery.eq('line', line)
    }
    if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
      periodAQuery = periodAQuery.eq('squad_lead', squadLead)
    }
    if (channel && channel !== 'All' && channel !== 'ALL') {
      periodAQuery = periodAQuery.eq('traffic', channel)
    }

    const { data: periodARawData, error: periodAError } = await periodAQuery

    if (periodAError) {
      console.error('❌ [Customer Detail API] Error fetching Period A data:', periodAError)
      return NextResponse.json(
        { error: 'Failed to fetch Period A data', details: periodAError.message },
        { status: 500 }
      )
    }

    // ✅ Fetch Period B data from blue_whale_usc based on date range
    let periodBQuery = supabase
      .from('blue_whale_usc')
      .select('date, userkey, unique_code, user_name, deposit_amount, withdraw_amount, deposit_cases, first_deposit_date, register_date')
      .eq('currency', 'USC')
      .gte('date', periodBStart!)
      .lte('date', periodBEnd!)

    if (userkey) {
      periodBQuery = periodBQuery.eq('userkey', userkey)
    } else if (uniqueCode) {
      periodBQuery = periodBQuery.eq('unique_code', uniqueCode)
    }

    // Apply filters
    if (line && line !== 'All' && line !== 'ALL') {
      periodBQuery = periodBQuery.eq('line', line)
    }
    if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
      periodBQuery = periodBQuery.eq('squad_lead', squadLead)
    }
    if (channel && channel !== 'All' && channel !== 'ALL') {
      periodBQuery = periodBQuery.eq('traffic', channel)
    }

    const { data: periodBRawData, error: periodBError } = await periodBQuery

    if (periodBError) {
      console.error('❌ [Customer Detail API] Error fetching Period B data:', periodBError)
      return NextResponse.json(
        { error: 'Failed to fetch Period B data', details: periodBError.message },
        { status: 500 }
      )
    }

    // ✅ Aggregate data from blue_whale_usc and calculate metrics AFTER aggregation
    const aggregatePeriodData = (rawData: any[], periodStart: string, periodEnd: string) => {
      if (!rawData || rawData.length === 0) {
        return {
          da: 0,
          ggr: 0,
          atv: 0,
          pf: 0,
          wr: 0,
          depositCases: 0,
          daysActive: 0,
          user_name: null,
          unique_code: null
        }
      }

      // ✅ Aggregate: SUM all deposit_amount, withdraw_amount, deposit_cases
      const totalDA = rawData.reduce((sum, row) => sum + (Number(row.deposit_amount) || 0), 0)
      const totalWithdraw = rawData.reduce((sum, row) => sum + (Number(row.withdraw_amount) || 0), 0)
      const totalDepositCases = rawData.reduce((sum, row) => sum + (Number(row.deposit_cases) || 0), 0)
      const totalGGR = totalDA - totalWithdraw

      // ✅ Calculate Days Active: COUNT(DISTINCT date) per userkey where deposit_cases > 0
      // For customer detail modal, we calculate days active for this specific customer (userkey)
      // Since all records are for the same customer, count distinct dates
      const distinctDates = new Set<string>()
      rawData.forEach(row => {
        if (Number(row.deposit_cases) > 0 && row.date) {
          distinctDates.add(row.date)
        }
      })
      
      // Days Active = COUNT(DISTINCT date) for this customer in this period
      const daysActive = distinctDates.size

      // ✅ Calculate ATV AFTER aggregation: total_deposit_amount / total_deposit_cases
      let atv = 0
      if (totalDepositCases > 0) {
        atv = totalDA / totalDepositCases
      }

      // ✅ Calculate PF AFTER aggregation: deposit_cases / days_active
      // PF = total_deposit_cases / days_active (per customer)
      let pf = 0
      if (daysActive > 0) {
        pf = totalDepositCases / daysActive
      } else {
        // Fallback: if no days active, use deposit cases
        pf = totalDepositCases
      }

      // ✅ Calculate WR AFTER aggregation: (total_GGR / total_deposit_amount) * 100
      let wr = 0
      if (totalDA > 0) {
        wr = (totalGGR / totalDA) * 100
      }

      return {
        da: totalDA,
        ggr: totalGGR,
        atv: atv,
        pf: pf,
        wr: wr,
        depositCases: totalDepositCases,
        daysActive: daysActive,  // ✅ Use daysActive (not totalDaysActive)
        user_name: rawData[0]?.user_name || null,
        unique_code: rawData[0]?.unique_code || null
      }
    }

    const periodADataAggregated = aggregatePeriodData(periodARawData || [], periodAStart!, periodAEnd!)
    const periodBDataAggregated = aggregatePeriodData(periodBRawData || [], periodBStart!, periodBEnd!)

    // Calculate comparison percentage
    const calculateChangePercent = (current: number, previous: number): number | null => {
      if (previous === 0 || previous === null || previous === undefined) {
        return null
      }
      return ((current - previous) / Math.abs(previous)) * 100
    }

    const result = {
      unique_code: periodBDataAggregated.unique_code || periodADataAggregated.unique_code || uniqueCode || null,
      user_name: periodBDataAggregated.user_name || periodADataAggregated.user_name || null,
      periodA: {
        da: periodADataAggregated.da,
        ggr: periodADataAggregated.ggr,
        atv: periodADataAggregated.atv,
        pf: periodADataAggregated.pf,
        wr: periodADataAggregated.wr
      },
      periodB: {
        da: periodBDataAggregated.da,
        ggr: periodBDataAggregated.ggr,
        atv: periodBDataAggregated.atv,
        pf: periodBDataAggregated.pf,
        wr: periodBDataAggregated.wr,
        daChangePercent: calculateChangePercent(periodBDataAggregated.da, periodADataAggregated.da),
        ggrChangePercent: calculateChangePercent(periodBDataAggregated.ggr, periodADataAggregated.ggr),
        atvChangePercent: calculateChangePercent(periodBDataAggregated.atv, periodADataAggregated.atv),
        pfChangePercent: calculateChangePercent(periodBDataAggregated.pf, periodADataAggregated.pf),
        wrChangePercent: calculateChangePercent(periodBDataAggregated.wr, periodADataAggregated.wr)
      }
    }

    console.log('✅ [Customer Detail API] Success:', {
      unique_code: result.unique_code,
      user_name: result.user_name,
      periodA_da: result.periodA.da,
      periodB_da: result.periodB.da
    })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ [Customer Detail API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

