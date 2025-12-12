import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { applyBrandFilter } from '@/utils/brandAccessHelper'

export async function GET(request: NextRequest) {
  try {
    // ✅ Define monthNames once at function scope to avoid duplication
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const { searchParams } = new URL(request.url)
    const line = searchParams.get('line') || 'ALL'
    const year = searchParams.get('year')
    const period = searchParams.get('period') || 'monthly' // 'monthly' or 'daily'
    const month = searchParams.get('month') // Required for daily period

    if (!year) {
      return NextResponse.json({
        success: false,
        error: 'Year parameter is required'
      }, { status: 400 })
    }

    if (period === 'daily' && !month) {
      return NextResponse.json({
        success: false,
        error: 'Month parameter is required for daily period'
      }, { status: 400 })
    }

    // ✅ NEW: Get user's allowed brands from request header
    let userAllowedBrands: string[] | null = null;
    try {
      const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
      if (userAllowedBrandsHeader) {
        userAllowedBrands = JSON.parse(userAllowedBrandsHeader);
      }
    } catch (parseError) {
      console.warn('⚠️ [MYR Overview Chart API] Failed to parse user allowed brands header:', parseError);
      userAllowedBrands = null;
    }
    
    console.log('🔄 [MYR Overview Chart API] Fetching chart data for:', { 
      year, 
      month,
      line,
      period,
      user_allowed_brands: userAllowedBrands,
      is_squad_lead: userAllowedBrands !== null && userAllowedBrands.length > 0
    })

    // Handle daily vs monthly data
    if (period === 'daily') {
      // Query daily data from blue_whale_myr table
      // Note: Some calculated fields (atv, purchase_frequency, da_user, ggr_user, winrate, etc.) 
      // need to be calculated from raw fields
      
      // ✅ CRITICAL: blue_whale_myr table stores month as STRING (month name), not number!
      // So we use month name directly from slicer (e.g., "December")
      const monthName = month || '';
      
      // Validate month name
      if (!monthNames.includes(monthName)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid month value',
          message: `Month "${month}" is not valid. Expected month name (January-December)`
        }, { status: 400 });
      }
      
      console.log('🔄 [MYR Overview Chart API] Using month name for daily query:', {
        monthName: monthName,
        year: parseInt(year),
        line
      });
      
      // ✅ SIMPLE LOGIC: Query from blue_whale_myr table based on active month slicer
      // ✅ CRITICAL: Use month name (string) directly, NOT month number!
      // ✅ NOTE: new_register and new_depositor are NOT in blue_whale_myr table
      // They come from new_register table, so we'll query that separately
      // ✅ Need add_transaction and deduct_transaction for Net Profit calculation
      let dailyQuery = supabase
        .from('blue_whale_myr')
        .select('date, userkey, deposit_amount, withdraw_amount, add_transaction, deduct_transaction, valid_amount, deposit_cases, withdraw_cases')
        .eq('currency', 'MYR')
        .eq('year', parseInt(year))
        .eq('month', monthName); // ✅ Filter by month name (string) from slicer

      // Apply brand filter
      if (line && line !== 'ALL') {
        dailyQuery = dailyQuery.eq('line', line);
        if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
          return NextResponse.json({
            success: false,
            error: 'Unauthorized',
            message: `You do not have access to brand "${line}"`
          }, { status: 403 });
        }
      } else {
        // ✅ For 'ALL', filter by user's allowed brands if they exist
        // ✅ If no brand restrictions, don't filter by line (get all lines)
        if (userAllowedBrands && userAllowedBrands.length > 0) {
          dailyQuery = dailyQuery.in('line', userAllowedBrands);
        }
        // ✅ If line='ALL' and no brand restrictions, don't add line filter (get all data)
      }

      const { data: dailyData, error: dailyError } = await dailyQuery.order('date', { ascending: true });

      if (dailyError) {
        console.error('❌ [MYR Overview Chart API] Error fetching daily data:', dailyError);
        console.error('❌ [MYR Overview Chart API] Error details:', {
          message: dailyError.message,
          details: dailyError.details,
          hint: dailyError.hint,
          code: dailyError.code
        });
        return NextResponse.json({
          success: false,
          error: 'Database error',
          message: dailyError.message
        }, { status: 500 });
      }

      // ✅ Query new_register table separately for new_register and new_depositor data
      // Format: uniquekey = line || '-' || date || '-' || currency (for daily)
      // We need to filter by date range for the selected month
      // Calculate start and end date for the month
      const monthIndex = monthNames.indexOf(monthName);
      if (monthIndex === -1) {
        return NextResponse.json({
          success: false,
          error: 'Invalid month name'
        }, { status: 400 });
      }
      
      const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), monthIndex + 1, 0).toISOString().split('T')[0]; // Last day of month
      
      let newRegisterQuery = supabase
        .from('new_register')
        .select('date, line, new_register, new_depositor')
        .eq('currency', 'MYR')
        .gte('date', startDate)
        .lte('date', endDate);

      // Apply brand filter to new_register query
      if (line && line !== 'ALL') {
        newRegisterQuery = newRegisterQuery.eq('line', line);
      } else {
        if (userAllowedBrands && userAllowedBrands.length > 0) {
          newRegisterQuery = newRegisterQuery.in('line', userAllowedBrands);
        }
      }

      const { data: newRegisterData, error: newRegisterError } = await newRegisterQuery.order('date', { ascending: true });

      if (newRegisterError) {
        console.warn('⚠️ [MYR Overview Chart API] Error fetching new_register data (non-critical):', newRegisterError);
        // Don't fail the entire request if new_register query fails
      }

      // Create a map of date -> { new_register, new_depositor } for quick lookup
      const newRegisterMap: Record<string, { new_register: number; new_depositor: number }> = {};
      if (newRegisterData) {
        newRegisterData.forEach((row: any) => {
          const dateKey = String(row.date || '').trim();
          if (dateKey) {
            // Aggregate across lines if needed
            if (!newRegisterMap[dateKey]) {
              newRegisterMap[dateKey] = { new_register: 0, new_depositor: 0 };
            }
            newRegisterMap[dateKey].new_register += Number(row.new_register) || 0;
            newRegisterMap[dateKey].new_depositor += Number(row.new_depositor) || 0;
          }
        });
      }

      console.log('📊 [MYR Overview Chart API] Raw daily data from blue_whale_myr:', {
        rowCount: dailyData?.length || 0,
        sampleRow: dailyData?.[0],
        dateRange: dailyData && dailyData.length > 0 ? {
          firstDate: dailyData[0].date,
          lastDate: dailyData[dailyData.length - 1].date
        } : null,
        queryFilters: {
          currency: 'MYR',
          year: parseInt(year),
          month: monthName, // ✅ Use month name, not number
          line: line || 'ALL'
        }
      });
      
      if (!dailyData || dailyData.length === 0) {
        console.warn('⚠️ [MYR Overview Chart API] No daily data found for:', {
          year: parseInt(year),
          month: monthName, // ✅ Use month name, not number
          line: line || 'ALL'
        });
        // Return empty daily data instead of error
        return NextResponse.json({
          success: true,
          dailyData: {},
          monthlyData: null
        });
      }

      // Aggregate daily data by date
      // For active_member and pure_member, we need to count unique userkeys per date
      const dailyDataMap: Record<string, any> = {};
      const dateUserSets: Record<string, Set<string>> = {}; // Track unique users per date
      const datePureUserSets: Record<string, Set<string>> = {}; // Track unique pure users per date
      const dateNewRegisterSet: Record<string, Set<string>> = {}; // Track unique new registers per date
      const dateNewDepositorSet: Record<string, Set<string>> = {}; // Track unique new depositors per date

      try {
        dailyData?.forEach(row => {
          try {
            const dateKey = String(row.date || '').trim();
            if (!dateKey) {
              console.warn('⚠️ [MYR Overview Chart API] Row with missing date, skipping:', row);
              return; // Skip rows without date
            }
            
            if (!dailyDataMap[dateKey]) {
              dailyDataMap[dateKey] = {
                deposit_amount: 0,
                withdraw_amount: 0,
                add_transaction: 0,
                deduct_transaction: 0,
                valid_amount: 0,
                deposit_cases: 0,
                withdraw_cases: 0,
                active_member: 0,
                pure_member: 0,
                new_register: 0,
                new_depositor: 0,
                // These will be calculated later
                ggr: 0,
                net_profit: 0,
                da_user: 0,
                ggr_user: 0,
                dc_user: 0,
                purchase_frequency: 0, // Alias for dc_user
                conversion_rate: 0,
                winrate: 0,
                withdrawal_rate: 0,
                atv: 0,
                hold_percentage: 0
              };
              dateUserSets[dateKey] = new Set();
              datePureUserSets[dateKey] = new Set();
              dateNewRegisterSet[dateKey] = new Set();
              dateNewDepositorSet[dateKey] = new Set();
            }
            
            // Sum values for each date (aggregate across lines if needed)
            // ✅ Use Number() conversion with fallback to 0
            dailyDataMap[dateKey].deposit_amount += Number(row.deposit_amount) || 0;
            dailyDataMap[dateKey].withdraw_amount += Number(row.withdraw_amount) || 0;
            dailyDataMap[dateKey].add_transaction += Number(row.add_transaction) || 0;
            dailyDataMap[dateKey].deduct_transaction += Number(row.deduct_transaction) || 0;
            dailyDataMap[dateKey].valid_amount += Number(row.valid_amount) || 0;
            dailyDataMap[dateKey].deposit_cases += Number(row.deposit_cases) || 0;
            dailyDataMap[dateKey].withdraw_cases += Number(row.withdraw_cases) || 0;
            
            // For active_member: count unique userkeys with deposit_cases > 0 per date
            const userkey = String(row.userkey || '').trim();
            const depositCases = Number(row.deposit_cases) || 0;
            if (userkey && depositCases > 0) {
              dateUserSets[dateKey].add(userkey);
            }
            
            // For pure_member: count unique userkeys that are pure (active but not new depositor)
            // Pure member = active member who is not a new depositor
            // Note: We can't determine new_depositor from blue_whale_myr alone, so we'll use new_register table data
            // For now, we'll calculate pure_member as active_member (will be adjusted later with new_register data)
            if (userkey && depositCases > 0) {
              datePureUserSets[dateKey].add(userkey);
            }
          } catch (rowError) {
            console.error('❌ [MYR Overview Chart API] Error processing row:', rowError, row);
            // Continue processing other rows
          }
        });
      } catch (aggregationError) {
        console.error('❌ [MYR Overview Chart API] Error during daily data aggregation:', aggregationError);
        return NextResponse.json({
          success: false,
          error: 'Data aggregation error',
          message: aggregationError instanceof Error ? aggregationError.message : 'Failed to aggregate daily data'
        }, { status: 500 });
      }

      // Set unique counts and calculate derived metrics after aggregation
      Object.keys(dailyDataMap).forEach(dateKey => {
        const data = dailyDataMap[dateKey];
        
        // ✅ Set unique counts
        // Active Member = count unique userkey
        data.active_member = dateUserSets[dateKey]?.size || 0;
        
        // ✅ Get new_register and new_depositor from new_register table
        const newRegisterInfo = newRegisterMap[dateKey] || { new_register: 0, new_depositor: 0 };
        data.new_register = newRegisterInfo.new_register;
        data.new_depositor = newRegisterInfo.new_depositor;
        
        // ✅ Calculate KPIs using user-provided formulas:
        // Pure Member = [active_member] - [new_depositor]
        data.pure_member = Math.max(0, data.active_member - data.new_depositor);
        
        // GGR = [deposit_amount] - [withdraw_amount]
        data.ggr = data.deposit_amount - data.withdraw_amount;
        
        // Net Profit = [deposit_amount] + [add_transaction] - [deduct_transaction] - [withdraw_amount]
        data.net_profit = data.deposit_amount + data.add_transaction - data.deduct_transaction - data.withdraw_amount;
        
        // DA User = [deposit_amount] / [active_member]
        data.da_user = data.active_member > 0 ? data.deposit_amount / data.active_member : 0;
        
        // GGR User = Net Profit / Active Member
        data.ggr_user = data.active_member > 0 ? data.net_profit / data.active_member : 0;
        
        // DC User = [deposit_cases] / [active_member]
        data.dc_user = data.active_member > 0 ? data.deposit_cases / data.active_member : 0;
        data.purchase_frequency = data.dc_user; // Alias for compatibility
        
        // Conversion Rate = [new_depositor] / [new_register]
        data.conversion_rate = data.new_register > 0 ? (data.new_depositor / data.new_register) * 100 : 0;
        
        // Winrate = [GGR] / [deposit_amount]
        data.winrate = data.deposit_amount > 0 ? (data.ggr / data.deposit_amount) * 100 : 0;
        
        // Withdraw Rate = [withdraw_cases] / [deposit_cases]
        data.withdrawal_rate = data.deposit_cases > 0 ? (data.withdraw_cases / data.deposit_cases) * 100 : 0;
        
        // ATV = deposit_amount / deposit_cases (for compatibility)
        data.atv = data.deposit_cases > 0 ? data.deposit_amount / data.deposit_cases : 0;
        
        // Hold Percentage = (net_profit / valid_amount) * 100
        data.hold_percentage = data.valid_amount > 0 ? (data.net_profit / data.valid_amount) * 100 : 0;
      });

      // Convert date keys to ISO format (YYYY-MM-DD) for consistent sorting
      const formattedDailyData: Record<string, any> = {};
      try {
        Object.keys(dailyDataMap).forEach(dateKey => {
          try {
            // Ensure date is in YYYY-MM-DD format
            // dateKey might already be in YYYY-MM-DD format from database
            let isoDate: string;
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
              // Already in YYYY-MM-DD format
              isoDate = dateKey;
            } else {
              // Try to parse and format
              const date = new Date(dateKey);
              if (isNaN(date.getTime())) {
                console.warn('⚠️ [MYR Overview Chart API] Invalid date key:', dateKey);
                // Skip invalid dates
                return;
              }
              isoDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
            }
            formattedDailyData[isoDate] = dailyDataMap[dateKey];
          } catch (e) {
            console.error('❌ [MYR Overview Chart API] Error formatting date key:', dateKey, e);
            // Skip this date key if there's an error
          }
        });
      } catch (formatError) {
        console.error('❌ [MYR Overview Chart API] Error during date formatting:', formatError);
        return NextResponse.json({
          success: false,
          error: 'Date formatting error',
          message: formatError instanceof Error ? formatError.message : 'Failed to format daily data dates'
        }, { status: 500 });
      }
      
      // ✅ Check if we have any formatted data
      if (Object.keys(formattedDailyData).length === 0) {
        console.warn('⚠️ [MYR Overview Chart API] No valid daily data after formatting');
        return NextResponse.json({
          success: true,
          dailyData: {},
          monthlyData: null
        });
      }

      console.log('✅ [MYR Overview Chart API] Daily data prepared:', {
        dateCount: Object.keys(formattedDailyData).length,
        dates: Object.keys(formattedDailyData).slice(0, 5),
        allDates: Object.keys(formattedDailyData).sort(),
        sampleData: formattedDailyData[Object.keys(formattedDailyData)[0]]
      });

      // ✅ CRITICAL: Return ONLY dailyData when period is daily, NOT monthlyData
      return NextResponse.json({
        success: true,
        dailyData: formattedDailyData,
        monthlyData: null // ✅ Explicitly set to null to avoid confusion
      });
    }

    // Query monthly data for entire year from MV
    let query = supabase
      .from('blue_whale_myr_monthly_summary')
      .select('month, deposit_amount, withdraw_amount, net_profit, ggr, valid_amount, deposit_cases, withdraw_cases, active_member, pure_member, new_register, new_depositor, atv, purchase_frequency, da_user, ggr_user, winrate, withdrawal_rate, conversion_rate, hold_percentage')
      .eq('currency', 'MYR')
      .eq('year', parseInt(year))
      .gt('month', 0)  // Exclude rollup (month=0)

    // ✅ NEW: Apply brand filter with user permission check
    try {
      if (line && line !== 'ALL') {
        query = query.eq('line', line)
        // Validate Squad Lead access
        if (userAllowedBrands && userAllowedBrands.length > 0 && !userAllowedBrands.includes(line)) {
          return NextResponse.json({
            success: false,
            error: 'Unauthorized',
            message: `You do not have access to brand "${line}"`
          }, { status: 403 })
        }
      } else {
        // If Squad Lead selects 'ALL', filter to their brands only
        if (userAllowedBrands && userAllowedBrands.length > 0) {
          query = query.in('line', userAllowedBrands)
        } else {
          query = query.eq('line', 'ALL')
        }
      }
    } catch (filterError) {
      console.error('❌ Brand filter error:', filterError)
      return NextResponse.json({
        success: false,
        error: 'Brand access validation failed',
        message: filterError instanceof Error ? filterError.message : 'Unknown error'
      }, { status: 403 })
    }

    const { data, error } = await query.order('month', { ascending: true })

    if (error) {
      console.error('❌ [MYR Overview Chart API] Error fetching data:', error)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: error.message
      }, { status: 500 })
    }

    console.log('📊 [MYR Overview Chart API] Raw data from MV:', {
      rowCount: data?.length,
      sampleRow: data?.[0],
      holdPercentageSample: data?.[0]?.hold_percentage,
      validAmountSample: data?.[0]?.valid_amount,
      netProfitSample: data?.[0]?.net_profit
    })

    // Convert month numbers to month names (using monthNames defined at function scope)
    // Build monthly data object
    const monthlyData: Record<string, any> = {}
    
    data?.forEach(row => {
      const monthNumber = (row.month as number);
      // ✅ Validate month number is between 1-12
      if (monthNumber < 1 || monthNumber > 12) {
        console.warn('⚠️ [MYR Overview Chart API] Invalid month number:', monthNumber);
        return; // Skip invalid month
      }
      const monthName = monthNames[monthNumber - 1];
      if (monthName) {
        monthlyData[monthName] = {
          // Basic amounts
          deposit_amount: (row.deposit_amount as number) || 0,
          withdraw_amount: (row.withdraw_amount as number) || 0,
          net_profit: (row.net_profit as number) || 0,
          ggr: (row.ggr as number) || 0,
          valid_amount: (row.valid_amount as number) || 0,
          
          // Cases
          deposit_cases: (row.deposit_cases as number) || 0,
          withdraw_cases: (row.withdraw_cases as number) || 0,
          
          // Members
          active_member: (row.active_member as number) || 0,
          pure_member: (row.pure_member as number) || 0,
          new_register: (row.new_register as number) || 0,
          new_depositor: (row.new_depositor as number) || 0,
          
          // Ratios/Metrics
          atv: (row.atv as number) || 0,
          purchase_frequency: (row.purchase_frequency as number) || 0,
          da_user: (row.da_user as number) || 0,
          ggr_user: (row.ggr_user as number) || 0,
          winrate: (row.winrate as number) || 0,
          withdrawal_rate: (row.withdrawal_rate as number) || 0,
          conversion_rate: (row.conversion_rate as number) || 0,
          hold_percentage: (row.hold_percentage as number) || 0
        }
      }
    })

    console.log('✅ [MYR Overview Chart API] Monthly data prepared:', {
      monthCount: Object.keys(monthlyData).length,
      months: Object.keys(monthlyData)
    })

    // ✅ CRITICAL: Return ONLY monthlyData when period is monthly, NOT dailyData
    return NextResponse.json({
      success: true,
      monthlyData,
      dailyData: null // ✅ Explicitly set to null to avoid confusion
    })

  } catch (error) {
    console.error('❌ [MYR Overview Chart API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

