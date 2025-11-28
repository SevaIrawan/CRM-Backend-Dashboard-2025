import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { TIER_NAMES } from '@/lib/uscTierClassification'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fromTier = searchParams.get('fromTier')
    const toTier = searchParams.get('toTier')
    
    console.log('📊 [Tier Movement Customers API] Request received:', {
      fromTier,
      toTier,
      params: Object.fromEntries(searchParams.entries())
    })
    
    // Support both formats: year/month and date range
    const currentYear = searchParams.get('currentYear')
    const currentMonth = searchParams.get('currentMonth')
    const previousYear = searchParams.get('previousYear')
    const previousMonth = searchParams.get('previousMonth')
    
    // Date range format (same as Customer Tier Trends)
    const periodAStart = searchParams.get('periodAStart')
    const periodAEnd = searchParams.get('periodAEnd')
    const periodBStart = searchParams.get('periodBStart')
    const periodBEnd = searchParams.get('periodBEnd')
    
    const line = searchParams.get('line')
    const squadLead = searchParams.get('squadLead')
    const channel = searchParams.get('channel')

    // Helper function to extract year and month from date string
    const extractYearMonth = (dateStr: string): { year: number; month: string } | null => {
      if (!dateStr || typeof dateStr !== 'string') {
        console.warn('⚠️ [Tier Movement Customers API] Invalid date string:', dateStr)
        return null
      }
      
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
          console.warn('⚠️ [Tier Movement Customers API] Invalid date format:', dateStr)
          return null
        }
        
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        
        const year = date.getFullYear()
        const month = monthNames[date.getMonth()]
        
        if (!year || !month) {
          console.warn('⚠️ [Tier Movement Customers API] Could not extract year/month from date:', dateStr)
          return null
        }
        
        return { year, month }
      } catch (err) {
        console.error('❌ [Tier Movement Customers API] Error extracting year/month:', err)
        return null
      }
    }
    
    // Determine which format to use
    let currentPeriod: { year: number; month: string } | null = null
    let previousPeriod: { year: number; month: string } | null = null
    
    if (periodBStart && periodBEnd && periodAStart && periodAEnd) {
      // Use date range format (new format - same as Customer Tier Trends)
      // ✅ Period B = Current Period (from slicer Period B)
      // ✅ Period A = Previous Period (from slicer Period A) 
      const periodB = extractYearMonth(periodBEnd) // Use end date
      const periodA = extractYearMonth(periodAEnd) // Use end date
      
      if (!periodB || !periodA) {
        return NextResponse.json(
          { error: 'Invalid date format in period date ranges' },
          { status: 400 }
        )
      }
      
      // ✅ Mapping: Period B (current/saat ini) -> currentPeriod, Period A (previous/sebelumnya) -> previousPeriod
      currentPeriod = periodB  // Period B = Period saat ini (dari slicer)
      previousPeriod = periodA  // Period A = Period sebelumnya (dari slicer)
    } else if (currentYear && currentMonth && previousYear && previousMonth) {
      // Use year/month format (old format - for backward compatibility)
      currentPeriod = {
        year: parseInt(currentYear),
        month: currentMonth
      }
      previousPeriod = {
        year: parseInt(previousYear),
        month: previousMonth
      }
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters: either (fromTier, toTier, currentYear, currentMonth, previousYear, previousMonth) or (fromTier, toTier, periodAStart, periodAEnd, periodBStart, periodBEnd)' },
        { status: 400 }
      )
    }

    // Validation
    if (!fromTier || !toTier || !currentPeriod || !previousPeriod) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const fromTierNum = parseInt(fromTier)
    const toTierNum = parseInt(toTier)

    if (isNaN(fromTierNum) || isNaN(toTierNum)) {
      return NextResponse.json(
        { error: 'Invalid tier parameters' },
        { status: 400 }
      )
    }

    // ✅ Build query for Period A (previousPeriod) - filter by fromTier
    // ✅ Query berdasarkan: year/month dari Period A, tier = fromTier, dan filters (line, squadLead, channel)
    let previousQuery = supabase
      .from('tier_usc_v1')
      .select('userkey, unique_code, user_name, tier, total_deposit_amount, total_withdraw_amount, total_deposit_cases, avg_transaction_value')
      .eq('year', previousPeriod.year)  // ✅ Period A year
      .eq('month', previousPeriod.month)  // ✅ Period A month
      .eq('tier', fromTierNum)  // ✅ Tier di Period A = fromTier
      .not('tier', 'is', null)

    if (line && line !== 'All' && line !== 'ALL') {
      previousQuery = previousQuery.eq('line', line)
    }

    if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
      previousQuery = previousQuery.eq('squad_lead', squadLead)
    }

    if (channel && channel !== 'All' && channel !== 'ALL') {
      previousQuery = previousQuery.eq('traffic', channel)
    }

    console.log(`📊 [Tier Movement Customers API] Fetching previous period data for tier ${fromTierNum}:`, {
      year: previousPeriod.year,
      month: previousPeriod.month,
      line,
      squadLead,
      channel
    })

    const { data: previousData, error: previousError } = await previousQuery

    if (previousError) {
      console.error('❌ [Tier Movement Customers API] Error fetching previous period data:', previousError)
      return NextResponse.json(
        { error: 'Failed to fetch previous period data', details: previousError.message },
        { status: 500 }
      )
    }

    console.log(`📊 [Tier Movement Customers API] Previous period data found: ${previousData?.length || 0} records`)

    if (!previousData || previousData.length === 0) {
      console.log(`⚠️ [Tier Movement Customers API] No data found in previous period for tier ${fromTierNum}`)
      return NextResponse.json({
        customers: [],
        fromTierName: TIER_NAMES[fromTierNum] || `Tier ${fromTierNum}`,
        toTierName: TIER_NAMES[toTierNum] || `Tier ${toTierNum}`,
        movementType: fromTierNum === toTierNum ? 'STABLE' : (fromTierNum > toTierNum ? 'UPGRADE' : 'DOWNGRADE'),
        count: 0
      })
    }

    // Get userkeys that have the fromTier in previous period
    // ✅ Filter out null/undefined userkeys
    const userkeys = previousData
      .map(row => row.userkey)
      .filter((userkey): userkey is string => Boolean(userkey))

    // ✅ Additional validation: Check if userkeys array is empty after filtering
    if (!userkeys || userkeys.length === 0) {
      console.warn('⚠️ [Tier Movement Customers] No valid userkeys found after filtering')
      return NextResponse.json({
        customers: [],
        fromTierName: TIER_NAMES[fromTierNum] || `Tier ${fromTierNum}`,
        toTierName: TIER_NAMES[toTierNum] || `Tier ${toTierNum}`,
        movementType: fromTierNum === toTierNum ? 'STABLE' : (fromTierNum > toTierNum ? 'UPGRADE' : 'DOWNGRADE'),
        count: 0
      })
    }

    // ✅ Use Set to ensure uniqueness and better performance
    const userkeysSet = new Set(userkeys)
    const uniqueUserkeys = Array.from(userkeysSet)

    console.log(`📊 [Tier Movement Customers] Fetching for ${uniqueUserkeys.length} unique userkeys (fromTier: ${fromTierNum}, toTier: ${toTierNum})`)

    // ✅ Handle large userkeys array with batch processing (Supabase .in() has limits)
    // If array is too large, fetch all current period data and filter in memory
    const MAX_IN_QUERY_SIZE = 1000 // Conservative limit for Supabase .in() queries
    
    let currentData: any[] = []
    
    if (uniqueUserkeys.length > MAX_IN_QUERY_SIZE) {
      // ✅ Fetch all data from current period and filter in memory (more reliable for large datasets)
      console.log(`⚠️ [Tier Movement Customers] Large userkeys array (${uniqueUserkeys.length}), using fetch-all-then-filter approach`)
      
      // ✅ Build query for Period B (currentPeriod) - filter by toTier
      // ✅ Query berdasarkan: year/month dari Period B, tier = toTier, dan filters (line, squadLead, channel)
      let allCurrentQuery = supabase
        .from('tier_usc_v1')
        .select(`
          userkey,
          unique_code,
          user_name,
          line,
          tier,
          total_deposit_amount,
          total_withdraw_amount,
          total_deposit_cases,
          avg_transaction_value
        `)
        .eq('year', currentPeriod.year)  // ✅ Period B year
        .eq('month', currentPeriod.month)  // ✅ Period B month
        .eq('tier', toTierNum)  // ✅ Tier di Period B = toTier
        .not('tier', 'is', null)

      if (line && line !== 'All' && line !== 'ALL') {
        allCurrentQuery = allCurrentQuery.eq('line', line)
      }

      if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
        allCurrentQuery = allCurrentQuery.eq('squad_lead', squadLead)
      }

      if (channel && channel !== 'All' && channel !== 'ALL') {
        allCurrentQuery = allCurrentQuery.eq('traffic', channel)
      }

      console.log(`📊 [Tier Movement Customers] Fetching ALL current period data for filtering (tier ${toTierNum}):`, {
        year: currentPeriod.year,
        month: currentPeriod.month,
        line,
        squadLead,
        channel
      })

      // ✅ BATCH FETCHING untuk menghindari timeout pada dataset besar
      const batchSize = 5000 // Smaller batches untuk menghindari timeout
      let allCurrentData: any[] = []
      let offset = 0
      let hasMore = true
      let batchErrors: any[] = []

      while (hasMore) {
        try {
          const batchQuery = allCurrentQuery.range(offset, offset + batchSize - 1)
          const { data: batchData, error: batchError } = await batchQuery

          if (batchError) {
            console.error(`❌ [Tier Movement Customers] Error in batch ${offset}-${offset + batchSize - 1}:`, batchError)
            batchErrors.push(batchError)
            
            // ✅ Continue dengan batch berikutnya jika error tidak fatal
            if (batchError.code && ['PGRST116', 'TIMEOUT'].includes(batchError.code)) {
              console.warn(`⚠️ [Tier Movement Customers] Batch query failed, skipping...`)
              offset += batchSize
              hasMore = offset < 100000 // Safety limit
              continue
            } else {
              // Fatal error, stop
              throw batchError
            }
          }

          const batchRecords = batchData || []
          allCurrentData = [...allCurrentData, ...batchRecords]

          hasMore = batchRecords.length === batchSize
          offset += batchSize

          // Safety limit - jangan fetch lebih dari 100k records
          if (allCurrentData.length >= 100000) {
            console.warn(`⚠️ [Tier Movement Customers] Safety limit reached: 100,000 records`)
            hasMore = false
          }

          console.log(`📊 [Tier Movement Customers] Fetched batch: ${batchRecords.length} records (total: ${allCurrentData.length})`)
        } catch (batchErr: any) {
          console.error(`❌ [Tier Movement Customers] Fatal error in batch processing:`, batchErr)
          
          // Jika sudah ada data, gunakan data yang sudah di-fetch
          if (allCurrentData.length > 0) {
            console.warn(`⚠️ [Tier Movement Customers] Using partial data (${allCurrentData.length} records)`)
            hasMore = false
          } else {
            // Tidak ada data sama sekali, return error
            return NextResponse.json(
              { 
                error: 'Failed to fetch current period data', 
                details: batchErr?.message || 'Database query failed during batch processing',
                code: batchErr?.code
              },
              { status: 500 }
            )
          }
        }
      }

      if (batchErrors.length > 0 && allCurrentData.length === 0) {
        return NextResponse.json(
          { 
            error: 'Failed to fetch current period data', 
            details: `All batch queries failed. Last error: ${batchErrors[batchErrors.length - 1]?.message || 'Unknown error'}`,
            code: batchErrors[batchErrors.length - 1]?.code
          },
          { status: 500 }
        )
      }

      // ✅ Filter in memory: only users that were in fromTier in Period A
      // ✅ Matching berdasarkan userkey: hanya userkey yang ada di Period A (fromTier) yang diambil dari Period B (toTier)
      currentData = allCurrentData.filter((row: any) => 
        row.userkey && userkeysSet.has(row.userkey)  // ✅ Validasi: userkey valid dan ada di Period A
      )
      
      console.log(`✅ [Tier Movement Customers] Filtered ${currentData.length} matching records from ${allCurrentData.length} total records`)
    } else {
      // ✅ Use .in() query for smaller arrays (more efficient)
      // ✅ Handle .in() queries in batches if userkeys array is still large
      const IN_QUERY_BATCH_SIZE = 500 // Supabase .in() can handle up to 1000, but use 500 for safety
      
      if (uniqueUserkeys.length <= IN_QUERY_BATCH_SIZE) {
        // ✅ Single query for small arrays - Query Period B data
        // ✅ Query berdasarkan: year/month dari Period B, tier = toTier, userkeys dari Period A, dan filters
        let currentQuery = supabase
          .from('tier_usc_v1')
          .select(`
            userkey,
            unique_code,
            user_name,
            line,
            tier,
            total_deposit_amount,
            total_withdraw_amount,
            total_deposit_cases,
            avg_transaction_value
          `)
          .eq('year', currentPeriod.year)  // ✅ Period B year
          .eq('month', currentPeriod.month)  // ✅ Period B month
          .eq('tier', toTierNum)  // ✅ Tier di Period B = toTier
          .in('userkey', uniqueUserkeys)  // ✅ Hanya userkeys yang ada di Period A
          .not('tier', 'is', null)

        if (line && line !== 'All' && line !== 'ALL') {
          currentQuery = currentQuery.eq('line', line)
        }

        if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
          currentQuery = currentQuery.eq('squad_lead', squadLead)
        }

        if (channel && channel !== 'All' && channel !== 'ALL') {
          currentQuery = currentQuery.eq('traffic', channel)
        }

        console.log(`📊 [Tier Movement Customers] Executing single .in() query for ${uniqueUserkeys.length} userkeys`)

        const { data: queriedData, error: currentError } = await currentQuery

        if (currentError) {
          console.error('❌ [Tier Movement Customers] Error fetching current period data:', currentError)
          console.error('Query details:', {
            year: currentPeriod.year,
            month: currentPeriod.month,
            tier: toTierNum,
            userkeysCount: uniqueUserkeys.length,
            errorCode: currentError.code,
            errorMessage: currentError.message,
            errorDetails: currentError.details
          })
          return NextResponse.json(
            { 
              error: 'Failed to fetch current period data', 
              details: currentError.message || 'Database query failed',
              code: currentError.code
            },
            { status: 500 }
          )
        }

        currentData = queriedData || []
        console.log(`✅ [Tier Movement Customers] Found ${currentData.length} matching records`)
      } else {
        // ✅ Batch .in() queries for arrays larger than IN_QUERY_BATCH_SIZE
        console.log(`📊 [Tier Movement Customers] Splitting ${uniqueUserkeys.length} userkeys into batches of ${IN_QUERY_BATCH_SIZE}`)
        
        const batches: string[][] = []
        for (let i = 0; i < uniqueUserkeys.length; i += IN_QUERY_BATCH_SIZE) {
          batches.push(uniqueUserkeys.slice(i, i + IN_QUERY_BATCH_SIZE))
        }

        const allResults: any[] = []
        const batchErrors: any[] = []

        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
          const batch = batches[batchIdx]
          
          try {
            let currentQuery = supabase
              .from('tier_usc_v1')
              .select(`
                userkey,
                unique_code,
                user_name,
                line,
                tier,
                total_deposit_amount,
                total_withdraw_amount,
                total_deposit_cases,
                avg_transaction_value
              `)
              .eq('year', currentPeriod.year)
              .eq('month', currentPeriod.month)
              .eq('tier', toTierNum)
              .in('userkey', batch)
              .not('tier', 'is', null)

            if (line && line !== 'All' && line !== 'ALL') {
              currentQuery = currentQuery.eq('line', line)
            }

            if (squadLead && squadLead !== 'All' && squadLead !== 'ALL') {
              currentQuery = currentQuery.eq('squad_lead', squadLead)
            }

            if (channel && channel !== 'All' && channel !== 'ALL') {
              currentQuery = currentQuery.eq('traffic', channel)
            }

            console.log(`📊 [Tier Movement Customers] Executing batch ${batchIdx + 1}/${batches.length} (${batch.length} userkeys)`)

            const { data: batchData, error: batchError } = await currentQuery

            if (batchError) {
              console.error(`❌ [Tier Movement Customers] Error in batch ${batchIdx + 1}:`, batchError)
              batchErrors.push({ batch: batchIdx + 1, error: batchError })
              // Continue with next batch instead of failing completely
              continue
            }

            if (batchData && batchData.length > 0) {
              allResults.push(...batchData)
              console.log(`✅ [Tier Movement Customers] Batch ${batchIdx + 1} returned ${batchData.length} records`)
            }
          } catch (err: any) {
            console.error(`❌ [Tier Movement Customers] Exception in batch ${batchIdx + 1}:`, err)
            batchErrors.push({ batch: batchIdx + 1, error: err })
          }
        }

        if (allResults.length === 0 && batchErrors.length > 0) {
          // All batches failed
          return NextResponse.json(
            { 
              error: 'Failed to fetch current period data', 
              details: `All ${batches.length} batches failed. First error: ${batchErrors[0].error?.message || 'Unknown error'}`,
              code: batchErrors[0].error?.code
            },
            { status: 500 }
          )
        }

        currentData = allResults
        console.log(`✅ [Tier Movement Customers] Found ${currentData.length} matching records from ${batches.length} batches${batchErrors.length > 0 ? ` (${batchErrors.length} batches failed)` : ''}`)
      }
    }

    // ✅ Handle empty result gracefully (this is normal - customers might have moved or churned)
    if (!currentData || currentData.length === 0) {
      console.log(`⚠️ [Tier Movement Customers] No customers found for movement ${fromTierNum} → ${toTierNum}. This is normal if customers moved to other tiers or churned.`)
      return NextResponse.json({
        customers: [],
        fromTierName: TIER_NAMES[fromTierNum] || `Tier ${fromTierNum}`,
        toTierName: TIER_NAMES[toTierNum] || `Tier ${toTierNum}`,
        movementType: fromTierNum === toTierNum ? 'STABLE' : (fromTierNum > toTierNum ? 'UPGRADE' : 'DOWNGRADE'),
        count: 0
      })
    }

    // ✅ Sort customers by line/brand (alphabetically)
    const sortedCurrentData = [...currentData].sort((a: any, b: any) => {
      const lineA = (a.line || '').toLowerCase()
      const lineB = (b.line || '').toLowerCase()
      return lineA.localeCompare(lineB)
    })

    // ✅ Create map of Period A data by userkey for quick lookup
    // ✅ Data ini digunakan untuk comparison dengan Period B
    const previousDataMap = new Map<string, { da: number; ggr: number; atv: number }>()
    if (previousData && previousData.length > 0) {
      previousData.forEach((prev: any) => {
        // ✅ Validasi: hanya userkey yang valid (tidak null/undefined)
        if (prev.userkey) {
          const prevDA = Number(prev.total_deposit_amount) || 0  // ✅ DA dari Period A
          const prevWithdraw = Number(prev.total_withdraw_amount) || 0
          const prevGGR = prevDA - prevWithdraw  // ✅ GGR dari Period A
          const prevDepositCases = Number(prev.total_deposit_cases) || 0
          const prevAvgTransactionValue = Number(prev.avg_transaction_value) || 0
          
          // ✅ Calculate ATV for Period A
          const prevATV = prevAvgTransactionValue > 0 
            ? prevAvgTransactionValue 
            : (prevDepositCases > 0 ? prevDA / prevDepositCases : 0)
          
          // ✅ Store Period A data indexed by userkey untuk comparison
          previousDataMap.set(prev.userkey, {
            da: prevDA,    // ✅ Period A DA
            ggr: prevGGR,  // ✅ Period A GGR
            atv: prevATV   // ✅ Period A ATV
          })
        }
      })
    }

    // ✅ Format customer data with comparison percentage (Period B vs Period A)
    // ✅ sortedCurrentData = data dari Period B dengan tier = toTier, sudah difilter berdasarkan userkey dari Period A
    const customers = sortedCurrentData.map(customer => {
      // ✅ Period B values (current period)
      const depositAmount = Number(customer.total_deposit_amount) || 0  // ✅ Period B DA
      const withdrawAmount = Number(customer.total_withdraw_amount) || 0
      const depositCases = Number(customer.total_deposit_cases) || 0
      const avgTransactionValue = Number(customer.avg_transaction_value) || 0

      // ✅ Calculate GGR for Period B = deposit_amount - withdraw_amount
      const ggr = depositAmount - withdrawAmount  // ✅ Period B GGR

      // ✅ Calculate ATV for Period B = deposit_amount / deposit_cases (use from database if available, else calculate)
      const atv = avgTransactionValue > 0 
        ? avgTransactionValue 
        : (depositCases > 0 ? depositAmount / depositCases : 0)  // ✅ Period B ATV

      // ✅ Get Period A data for comparison based on userkey matching
      // ✅ Validasi: customer.userkey harus valid untuk matching
      const prevData = customer.userkey ? previousDataMap.get(customer.userkey) : null
      const prevDA = prevData?.da || 0    // ✅ Period A DA
      const prevGGR = prevData?.ggr || 0  // ✅ Period A GGR
      const prevATV = prevData?.atv || 0  // ✅ Period A ATV

      // ✅ Calculate comparison percentage: ((Period B - Period A) / Period A) * 100
      // ✅ Formula: ((Current Value - Previous Value) / Previous Value) * 100
      // ✅ depositAmount, ggr, atv = Period B values (current period)
      // ✅ prevDA, prevGGR, prevATV = Period A values (previous period)
      // ✅ If Period A is 0, return null (no comparison possible)
      const daChangePercent = prevDA !== 0 
        ? ((depositAmount - prevDA) / Math.abs(prevDA)) * 100   // ✅ (Period B DA - Period A DA) / Period A DA * 100
        : null // If Period A is 0, cannot calculate percentage
      
      const ggrChangePercent = prevGGR !== 0 
        ? ((ggr - prevGGR) / Math.abs(prevGGR)) * 100   // ✅ (Period B GGR - Period A GGR) / Period A GGR * 100
        : null // If Period A is 0, cannot calculate percentage
      
      const atvChangePercent = prevATV !== 0 
        ? ((atv - prevATV) / Math.abs(prevATV)) * 100   // ✅ (Period B ATV - Period A ATV) / Period A ATV * 100
        : null // If Period A is 0, cannot calculate percentage

      return {
        unique_code: customer.unique_code || null,
        user_name: customer.user_name || null,
        line: customer.line || null, // ✅ Add line/brand field
        handler: null, // Will be null until handler column is added to tier_usc_v1
        daChangePercent: daChangePercent !== null ? Number(daChangePercent.toFixed(2)) : null,
        ggrChangePercent: ggrChangePercent !== null ? Number(ggrChangePercent.toFixed(2)) : null,
        atvChangePercent: atvChangePercent !== null ? Number(atvChangePercent.toFixed(2)) : null,
        assigne: null // For dropdown/assignment (will be populated when handler column is added)
      }
    })

    // Determine movement type
    let movementType = 'STABLE'
    if (fromTierNum > toTierNum) {
      movementType = 'UPGRADE' // Lower tier number = higher tier (e.g., 7->1)
    } else if (fromTierNum < toTierNum) {
      movementType = 'DOWNGRADE' // Higher tier number = lower tier (e.g., 1->7)
    }

    // ✅ DEBUG: Log sebelum return
    console.log('🔍 [Tier Movement Customers API] Returning response:', {
      customersLength: customers.length,
      customersArraySample: customers.slice(0, 3), // Sample first 3
      count: customers.length,
      movementType
    })
    
    return NextResponse.json({
      customers,
      fromTierName: TIER_NAMES[fromTierNum] || `Tier ${fromTierNum}`,
      toTierName: TIER_NAMES[toTierNum] || `Tier ${toTierNum}`,
      movementType,
      count: customers.length
    })

  } catch (error: any) {
    console.error('❌ [Tier Movement Customers API] Unexpected error:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      cause: error?.cause
    })
    
    // ✅ Return proper error response with detailed info for debugging
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error?.message || 'Unknown error occurred',
        type: error?.name || 'Error'
      },
      { status: 500 }
    )
  }
}

