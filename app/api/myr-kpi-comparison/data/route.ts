import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const line = searchParams.get('line') || 'ALL';
    const periodAStart = searchParams.get('periodAStart');
    const periodAEnd = searchParams.get('periodAEnd');
    const periodBStart = searchParams.get('periodBStart');
    const periodBEnd = searchParams.get('periodBEnd');

    // ✅ Get user's allowed brands from request header
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    const userAllowedBrands = userAllowedBrandsHeader ? JSON.parse(userAllowedBrandsHeader) : null

    console.log('📊 [MYR KPI Comparison] Request params:', {
      line,
      periodAStart,
      periodAEnd,
      periodBStart,
      periodBEnd,
      user_allowed_brands: userAllowedBrands
    });

    // Validate required parameters
    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      return NextResponse.json(
        { error: 'Missing required parameters: periodAStart, periodAEnd, periodBStart, periodBEnd' },
        { status: 400 }
      );
    }

    // ✅ Validate brand access for Squad Lead
    if (line && line !== 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
      if (!userAllowedBrands.includes(line)) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized',
          message: `You do not have access to brand "${line}"`
        }, { status: 403 })
      }
    }

    // Helper function to calculate KPIs for a given period - SIMPLIFIED
    const calculatePeriodKPIs = async (startDate: string, endDate: string, selectedLine?: string) => {
      console.log(`🔄 [MYR KPI Comparison] Calculating KPIs for ${startDate} to ${endDate}, line: ${selectedLine}`);

      // Fetch data from MV table
      let mvQuery = supabase
        .from('blue_whale_myr_summary')
        .select('date, line, deposit_amount, withdraw_amount, deposit_cases, withdraw_cases, net_profit, ggr, valid_amount, add_bonus, deduct_bonus, add_transaction, deduct_transaction, new_register, new_depositor')
        .eq('currency', 'MYR')
        .gte('date', startDate)
        .lte('date', endDate);

      // ✅ Apply brand filter
      if (selectedLine && selectedLine !== 'ALL') {
        mvQuery = mvQuery.eq('line', selectedLine);
      } else if (selectedLine === 'ALL' && userAllowedBrands && userAllowedBrands.length > 0) {
        mvQuery = mvQuery.in('line', userAllowedBrands);
      }

      const { data: mvData, error: mvError } = await mvQuery;

      if (mvError) {
        console.error('❌ [MYR KPI Comparison] Error fetching MV data:', mvError);
        throw mvError;
      }

      if (!mvData || mvData.length === 0) {
        console.log('⚠️ [MYR KPI Comparison] No data found for period');
        return {
          activeMember: 0, newRegister: 0, newDepositor: 0, pureMember: 0,
          depositCases: 0, depositAmount: 0, withdrawCases: 0, withdrawAmount: 0,
          bonus: 0, addBonus: 0, deductBonus: 0, addTransaction: 0, deductTransaction: 0,
          ggr: 0, netProfit: 0, withdrawRate: 0, winrate: 0, avgTransactionValue: 0,
          purchaseFrequency: 0, ggrPerUser: 0, depositAmountPerUser: 0
        };
      }

      // Aggregate MV data (base metrics)
      const depositCases = mvData.reduce((sum: number, row: any) => sum + (row.deposit_cases || 0), 0);
      const depositAmount = mvData.reduce((sum: number, row: any) => sum + (row.deposit_amount || 0), 0);
      const withdrawCases = mvData.reduce((sum: number, row: any) => sum + (row.withdraw_cases || 0), 0);
      const withdrawAmount = mvData.reduce((sum: number, row: any) => sum + (row.withdraw_amount || 0), 0);
      const bonus = mvData.reduce((sum: number, row: any) => sum + (row.bonus || 0), 0);
      const addBonus = mvData.reduce((sum: number, row: any) => sum + (row.add_bonus || 0), 0);
      const deductBonus = mvData.reduce((sum: number, row: any) => sum + (row.deduct_bonus || 0), 0);
      const addTransaction = mvData.reduce((sum: number, row: any) => sum + (row.add_transaction || 0), 0);
      const deductTransaction = mvData.reduce((sum: number, row: any) => sum + (row.deduct_transaction || 0), 0);
      const newRegister = mvData.reduce((sum: number, row: any) => sum + (row.new_register || 0), 0);
      const newDepositor = mvData.reduce((sum: number, row: any) => sum + (row.new_depositor || 0), 0);
      // Active Member: count unique userkey in master table with deposit_cases > 0
      let amQuery = supabase
        .from('blue_whale_myr')
        .select('userkey')
        .eq('currency', 'MYR')
        .gte('date', startDate)
        .lte('date', endDate)
        .gt('deposit_cases', 0);

      if (selectedLine && selectedLine !== 'ALL') {
        amQuery = amQuery.eq('line', selectedLine);
      }

      const { data: amData, error: amError } = await amQuery;
      if (amError) {
        console.error('❌ [MYR KPI Comparison] Error fetching active members:', amError);
        throw amError;
      }
      const activeMember = new Set((amData || []).map((r: any) => r.userkey)).size;

      // Derived metrics (as requested)
      const pureMember = Math.max(0, activeMember - newDepositor);
      const ggr = depositAmount - withdrawAmount; // GGR
      const netProfit = (depositAmount + addTransaction) - (withdrawAmount + deductTransaction);
      const withdrawRate = depositCases > 0 ? (withdrawCases / depositCases) * 100 : 0;
      const winrate = depositAmount > 0 ? (ggr / depositAmount) * 100 : 0;
      const avgTransactionValue = depositCases > 0 ? depositAmount / depositCases : 0; // ATV
      const purchaseFrequency = activeMember > 0 ? depositCases / activeMember : 0; // PF
      const ggrPerUser = activeMember > 0 ? netProfit / activeMember : 0; // GGR USER
      const depositAmountPerUser = activeMember > 0 ? depositAmount / activeMember : 0; // DA User

      console.log(`✅ [MYR KPI Comparison] Calculated KPIs for period`);

      return {
        activeMember, newRegister, newDepositor, pureMember,
        depositCases, depositAmount, withdrawCases, withdrawAmount,
        bonus, addBonus, deductBonus, addTransaction, deductTransaction,
        ggr, netProfit, withdrawRate, winrate, avgTransactionValue,
        purchaseFrequency, ggrPerUser, depositAmountPerUser
      };
    };

    // Calculate KPIs for both periods
    console.log('🔄 [MYR KPI Comparison] Calculating Period A KPIs...');
    const periodAData = await calculatePeriodKPIs(periodAStart, periodAEnd, line === 'ALL' ? undefined : line);

    console.log('🔄 [MYR KPI Comparison] Calculating Period B KPIs...');
    const periodBData = await calculatePeriodKPIs(periodBStart, periodBEnd, line === 'ALL' ? undefined : line);

    // Define metrics structure with their properties (SIMPLIFIED LIST)
    const metricsConfig = [
      { key: 'activeMember', label: 'Active Member', type: 'integer', inverse: false },
      { key: 'newRegister', label: 'New Register', type: 'integer', inverse: false },
      { key: 'newDepositor', label: 'New Depositor', type: 'integer', inverse: false },
      { key: 'pureMember', label: 'Pure Member', type: 'integer', inverse: false },
      { key: 'depositCases', label: 'Deposit Cases', type: 'integer', inverse: false },
      { key: 'depositAmount', label: 'Deposit Amount', type: 'amount', inverse: false },
      { key: 'withdrawCases', label: 'Withdraw Cases', type: 'integer', inverse: true },
      { key: 'withdrawAmount', label: 'Withdraw Amount', type: 'amount', inverse: true },
      { key: 'bonus', label: 'Bonus', type: 'amount', inverse: false },
      { key: 'addBonus', label: 'Add Bonus', type: 'amount', inverse: false },
      { key: 'deductBonus', label: 'Deduct Bonus', type: 'amount', inverse: false },
      { key: 'addTransaction', label: 'Add Transaction', type: 'amount', inverse: false },
      { key: 'deductTransaction', label: 'Deduct Transaction', type: 'amount', inverse: false },
      { key: 'ggr', label: 'Gross Gaming Revenue (GGR)', type: 'amount', inverse: false },
      { key: 'netProfit', label: 'Net Profit', type: 'amount', inverse: false },
      { key: 'withdrawRate', label: 'Withdraw Rate', type: 'percentage', inverse: true },
      { key: 'winrate', label: 'Winrate', type: 'percentage', inverse: true },
      { key: 'avgTransactionValue', label: 'Average Transaction Value (ATV)', type: 'amount', inverse: false },
      { key: 'ggrPerUser', label: 'GGR User', type: 'amount', inverse: false },
      { key: 'depositAmountPerUser', label: 'DA User', type: 'amount', inverse: false },
      { key: 'purchaseFrequency', label: 'DC User', type: 'decimal', inverse: false }
    ];

    // Build comparison data
    const comparisonData = metricsConfig.map(metric => {
      const periodAValue = (periodAData as any)[metric.key] || 0;
      const periodBValue = (periodBData as any)[metric.key] || 0;
      const difference = periodBValue - periodAValue;
      
      // Calculate percentage change
      let percentageChange = 0;
      let percentageDisplay = 'N/A';
      
      if (periodAValue !== 0) {
        percentageChange = ((difference / periodAValue) * 100);
        percentageDisplay = `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(2)}%`;
      } else if (periodBValue !== 0) {
        percentageDisplay = 'N/A';
      }

      // Determine color based on inverse logic
      let color = 'gray'; // neutral/no change
      if (difference !== 0) {
        if (metric.inverse) {
          // For inverse KPIs: decrease = green, increase = red
          color = difference < 0 ? 'green' : 'red';
        } else {
          // For normal KPIs: increase = green, decrease = red
          color = difference > 0 ? 'green' : 'red';
        }
      }

      return {
        metric: metric.label,
        metricKey: metric.key,
        type: metric.type,
        periodA: periodAValue,
        periodB: periodBValue,
        difference: difference,
        percentageChange: percentageChange,
        percentageDisplay: percentageDisplay,
        color: color,
        inverse: metric.inverse
      };
    });

    console.log('✅ [MYR KPI Comparison] Comparison data calculated successfully');

    const response = {
      line,
      periodA: { start: periodAStart, end: periodAEnd },
      periodB: { start: periodBStart, end: periodBEnd },
      comparisonData
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [MYR KPI Comparison] Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate KPI comparison', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

