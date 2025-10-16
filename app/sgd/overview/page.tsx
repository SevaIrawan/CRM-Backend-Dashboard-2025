'use client'

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Layout from '@/components/Layout';
import Frame from '@/components/Frame';
import { LineSlicer } from '@/components/slicers';
import StatCard from '@/components/StatCard';
import { getChartIcon } from '@/lib/CentralIcon';
import { formatCurrencyKPI, formatIntegerKPI, formatMoMChange, formatNumericKPI, formatPercentageKPI } from '@/lib/formatHelpers';
import { getAllSGDKPIsWithMoM } from '@/lib/SGDDailyAverageAndMoM';
import { logger } from '@/lib/logger';

// Dynamic imports for charts (SSR fix)
const LineChart = dynamic(() => import('@/components/LineChart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg animate-pulse">
      <div className="text-sm text-gray-500">Loading Chart...</div>
    </div>
  )
});

const BarChart = dynamic(() => import('@/components/BarChart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg animate-pulse">
      <div className="text-sm text-gray-500">Loading Chart...</div>
    </div>
  )
});

// Types for slicer options API
interface SlicerOptions {
  years: string[]
  months: string[]
  currencies: string[]
  lines: string[]
  defaults: {
    year: string
    month: string
    line: string
  }
}

export default function SGDOverviewPage() {
  // Hydration fix
  const [isMounted, setIsMounted] = useState(false);
  
  const [kpiData, setKpiData] = useState<any>(null);
  const [momData, setMomData] = useState<any>(null);
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCurrency] = useState('SGD'); // Locked to SGD
  const [selectedLine, setSelectedLine] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Chart data states
  const [chartData, setChartData] = useState<any>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  // Daily average calculations
  const [dailyAverages, setDailyAverages] = useState({
    depositAmount: 0,
    withdrawAmount: 0,
    netProfit: 0,
    activeMember: 0,
    purchaseFrequency: 0,
    avgTransactionValue: 0
  });

  // Hydration fix
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Load slicer options on component mount
  useEffect(() => {
    const loadSlicerOptions = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch('/api/sgd-overview/slicer-options');
        const result = await response.json();

        if (result.success) {
          console.log('🔍 [SGD Overview CLIENT] Slicer data received from API:', {
            years: result.data.years,
            monthsCount: result.data.months?.length,
            monthsSample: result.data.months?.slice(0, 5)
          });
          
          setSlicerOptions(result.data);
          setSelectedYear(result.data.defaults.year);
          setSelectedMonth(result.data.defaults.month);
          setSelectedLine(result.data.defaults.line);
        } else {
          setLoadError('Failed to load slicer options');
        }
      } catch (error) {
        console.error('Error loading slicer options:', error);
        setLoadError('Failed to load slicer options');
      } finally {
        setIsLoading(false);
      }
    };

    loadSlicerOptions();
  }, []);

  // Load KPI data when month changes (for StatCard display)
  useEffect(() => {
    if (!selectedYear || !selectedMonth || !selectedLine) return;

    const loadKPIData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        logger.log('🔄 [SGD Overview] Loading KPI data using STANDARD LOGIC...');

        // Use STANDARD LOGIC FILE - getAllSGDKPIsWithMoM
        const result = await getAllSGDKPIsWithMoM(selectedYear, selectedMonth, selectedLine);

        setKpiData(result.current);
        setMomData(result.mom);
        setDailyAverages(result.dailyAverage);

        logger.log('✅ [SGD Overview] KPI data loaded using STANDARD LOGIC');

      } catch (error) {
        console.error('Error loading KPI data:', error);
        setLoadError('Failed to load KPI data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(loadKPIData, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedYear, selectedMonth, selectedLine]);

  // Helper functions removed - now using STANDARD LOGIC FILE

  // Load Chart data when year or line changes (MONTHLY data for entire year)
  useEffect(() => {
    if (!selectedYear || !selectedLine) return;

    const loadChartData = async () => {
      try {
        setChartError(null);
        
        console.log('🔄 [SGD Overview] Loading Chart data (MONTHLY for entire year)...');
        
        // Get chart data from MV table (pre-aggregated)
        const chartResponse = await fetch(`/api/sgd-overview/chart-data?line=${selectedLine}&year=${selectedYear}`);
        const chartResult = await chartResponse.json();
        
        console.log('📊 [SGD Overview] Chart API Response:', chartResult);
        
        if (!chartResult.success) {
          throw new Error('Failed to fetch chart data');
        }
        
        const monthlyData = chartResult.monthlyData;
        
        console.log('📊 [SGD Overview] Monthly data from MV:', monthlyData);
        
        // Debug hold_percentage values
        const holdPercentageDebug = Object.keys(monthlyData).map(month => ({
          month,
          hold_percentage: monthlyData[month].hold_percentage,
          conversion_rate: monthlyData[month].conversion_rate,
          net_profit: monthlyData[month].net_profit,
          valid_amount: monthlyData[month].valid_amount
        }));
        console.log('🔍 [SGD Overview] Hold Percentage Debug:', holdPercentageDebug);
        
        if (Object.keys(monthlyData).length > 0) {
          // Sort months chronologically
          const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                             'July', 'August', 'September', 'October', 'November', 'December'];
          const sortedMonths = Object.keys(monthlyData).sort((a, b) => 
            monthOrder.indexOf(a) - monthOrder.indexOf(b)
          );

          // Create chart data from aggregated monthly data
          const preparedChartData = {
            // ROW 2: Single Line Charts
            daUserTrend: {
              series: [{ name: 'DA User', data: sortedMonths.map(month => monthlyData[month].da_user) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            ggrUserTrend: {
              series: [{ name: 'GGR User', data: sortedMonths.map(month => monthlyData[month].ggr_user) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            
            // ROW 3: Double Bar Charts
            activePureMemberTrend: {
              series: [
                { name: 'Active Member', data: sortedMonths.map(month => monthlyData[month].active_member), color: '#3B82F6' },
                { name: 'Pure Member', data: sortedMonths.map(month => monthlyData[month].pure_member), color: '#F97316' }
              ],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            registerDepositorTrend: {
              series: [
                { name: 'New Register', data: sortedMonths.map(month => monthlyData[month].new_register), color: '#3B82F6' },
                { name: 'New Depositor', data: sortedMonths.map(month => monthlyData[month].new_depositor), color: '#F97316' }
              ],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            
            // ROW 4: Double Line Charts
            depositWithdrawTrend: {
              series: [
                { name: 'Deposit Amount', data: sortedMonths.map(month => monthlyData[month].deposit_amount) },
                { name: 'Withdraw Amount', data: sortedMonths.map(month => monthlyData[month].withdraw_amount) }
              ],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            ggrNetProfitTrend: {
              series: [
                { name: 'Gross Gaming Revenue', data: sortedMonths.map(month => monthlyData[month].ggr) },
                { name: 'Net Profit', data: sortedMonths.map(month => monthlyData[month].net_profit) }
              ],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            
            // ROW 5: Single Line Charts
            atvTrend: {
              series: [{ name: 'Average Transaction Value', data: sortedMonths.map(month => monthlyData[month].atv) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            purchaseFrequencyTrend: {
              series: [{ name: 'Purchase Frequency', data: sortedMonths.map(month => monthlyData[month].purchase_frequency) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            
            // ROW 6: Single Bar Charts
            depositCasesTrend: {
              series: [{ name: 'Deposit Cases', data: sortedMonths.map(month => monthlyData[month].deposit_cases) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            withdrawCasesTrend: {
              series: [{ name: 'Withdraw Cases', data: sortedMonths.map(month => monthlyData[month].withdraw_cases) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            
            // ROW 7: Single Line Charts
            winrateTrend: {
              series: [{ name: 'Winrate', data: sortedMonths.map(month => monthlyData[month].winrate) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            withdrawalRateTrend: {
              series: [{ name: 'Withdrawal Rate', data: sortedMonths.map(month => monthlyData[month].withdrawal_rate) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            
            // ROW 8: Single Line Charts
            conversionRateTrend: {
              series: [{ name: 'Conversion Rate', data: sortedMonths.map(month => monthlyData[month].conversion_rate) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            holdPercentageTrend: {
              series: [{ name: 'Hold Percentage', data: sortedMonths.map(month => monthlyData[month].hold_percentage) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            }
          };
          
          setChartData(preparedChartData);
        }
        
        console.log('✅ [SGD Overview] Chart data loaded successfully (MONTHLY)');

      } catch (error) {
        console.error('Error loading chart data:', error);
        setChartError('Failed to load chart data.');
      }
    };

    const timeoutId = setTimeout(loadChartData, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedYear, selectedLine]);


  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        {/* Title area - left side */}
      </div>
      
      <div className="subheader-controls">
        <div className="slicer-group">
          <label className="slicer-label">YEAR:</label>
          <select
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="subheader-select"
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '100px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            {slicerOptions?.years?.map((year: string) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label className="slicer-label">MONTH:</label>
          <select
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="subheader-select"
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '120px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            {slicerOptions?.months
              ?.filter((month: any) => {
                if (month.value === 'ALL') return true;
                if (!selectedYear) return true;
                return month.years && month.years.includes(selectedYear);
              })
              ?.map((month: any) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
          </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <LineSlicer 
            lines={slicerOptions?.lines || []}
            selectedLine={selectedLine}
            onLineChange={setSelectedLine}
          />
        </div>
      </div>
    </div>
  );

  // Hydration fix
  if (!isMounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-800">Initializing Dashboard</p>
              <p className="text-sm text-gray-500">Preparing client-side components...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-800">Loading SGD Overview</p>
              <p className="text-sm text-gray-500">Fetching real-time data from database...</p>
              <div className="flex items-center justify-center space-x-1 mt-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (loadError) {
    return (
      <Layout>
        <div className="error-container">
          <p>Error: {loadError}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="standard">

        {/* Content Container with proper spacing and scroll */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          marginTop: '20px',
          height: 'calc(100vh - 200px)',
          overflowY: 'auto',
          paddingRight: '8px'
        }}>
          {/* ROW 1: KPI CARDS (6 cards) */}
          <div className="kpi-row">
            <StatCard
              title="DEPOSIT AMOUNT"
              value={formatCurrencyKPI(kpiData?.depositAmount || 0, selectedCurrency)}
              icon="Deposit Amount"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrencyKPI(dailyAverages.depositAmount, selectedCurrency)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.depositAmount || 0),
                isPositive: Boolean(momData?.depositAmount && momData.depositAmount > 0)
              }}
            />
            <StatCard
              title="WITHDRAW AMOUNT"
              value={formatCurrencyKPI(kpiData?.withdrawAmount || 0, selectedCurrency)}
              icon="Withdraw Amount"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrencyKPI(dailyAverages.withdrawAmount, selectedCurrency)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.withdrawAmount || 0),
                isPositive: Boolean(momData?.withdrawAmount && momData.withdrawAmount > 0)
              }}
            />
            <StatCard
              title="NET PROFIT"
              value={formatCurrencyKPI(kpiData?.netProfit || 0, selectedCurrency)}
              icon="Net Profit"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrencyKPI(dailyAverages.netProfit, selectedCurrency)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.netProfit || 0),
                isPositive: Boolean(momData?.netProfit && momData.netProfit > 0)
              }}
            />
            <StatCard
              title="ACTIVE MEMBER"
              value={formatIntegerKPI(kpiData?.activeMember || 0)}
              icon="Active Member"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatIntegerKPI(Math.round(dailyAverages.activeMember))
              }}
              comparison={{
                percentage: formatMoMChange(momData?.activeMember || 0),
                isPositive: Boolean(momData?.activeMember && momData.activeMember > 0)
              }}
            />
            <StatCard
              title="PURCHASE FREQUENCY"
              value={formatNumericKPI(kpiData?.purchaseFrequency || 0)}
              icon="Purchase Frequency"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatNumericKPI(dailyAverages.purchaseFrequency)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.purchaseFrequency || 0),
                isPositive: Boolean(momData?.purchaseFrequency && momData.purchaseFrequency > 0)
              }}
            />
            <StatCard
              title="AVERAGE TRANSACTION VALUE"
              value={formatCurrencyKPI(kpiData?.avgTransactionValue || 0, selectedCurrency)}
              icon="Average Transaction Value"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrencyKPI(dailyAverages.avgTransactionValue, selectedCurrency)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.avgTransactionValue || 0),
                isPositive: Boolean(momData?.avgTransactionValue && momData.avgTransactionValue > 0)
              }}
            />
          </div>

          {/* ROW 2: DA USER & GGR USER (Single Line Charts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <LineChart
              series={chartData?.daUserTrend?.series || []}
              categories={chartData?.daUserTrend?.categories || []}
              title="DA USER TREND"
              currency={selectedCurrency}
              hideLegend={true}
              showDataLabels={true}
              useDenominationLabels={true}
              chartIcon={getChartIcon('Deposit Amount')}
            />
            <LineChart
              series={chartData?.ggrUserTrend?.series || []}
              categories={chartData?.ggrUserTrend?.categories || []}
              title="GGR USER TREND"
              currency={selectedCurrency}
              hideLegend={true}
              showDataLabels={true}
              useDenominationLabels={true}
              color="#F97316"
              chartIcon={getChartIcon('Net Profit')}
            />
          </div>

          {/* ROW 3: ACTIVE vs PURE MEMBER, NEW REGISTER vs NEW DEPOSITOR (Double Bar Charts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <BarChart
              series={chartData?.activePureMemberTrend?.series || []}
              categories={chartData?.activePureMemberTrend?.categories || []}
              title="ACTIVE MEMBER VS PURE MEMBER TREND"
              currency="MEMBER"
              chartIcon={getChartIcon('Active Member')}
              customLegend={[
                { label: 'Active Member', color: '#3B82F6' },
                { label: 'Pure Member', color: '#F97316' }
              ]}
            />
            <BarChart
              series={chartData?.registerDepositorTrend?.series || []}
              categories={chartData?.registerDepositorTrend?.categories || []}
              title="NEW REGISTER VS NEW DEPOSITOR TREND"
              currency="MEMBER"
              chartIcon={getChartIcon('New Register')}
              customLegend={[
                { label: 'New Register', color: '#3B82F6' },
                { label: 'New Depositor', color: '#F97316' }
              ]}
            />
          </div>

          {/* ROW 4: DEPOSIT vs WITHDRAW, GGR vs NET PROFIT (Double Line Charts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <LineChart
              series={chartData?.depositWithdrawTrend?.series || []}
              categories={chartData?.depositWithdrawTrend?.categories || []}
              title="DEPOSIT AMOUNT VS WITHDRAW AMOUNT TREND"
              currency={selectedCurrency}
              showDataLabels={true}
              useDenominationLabels={true}
              chartIcon={getChartIcon('Deposit Amount')}
            />
            <LineChart
              series={chartData?.ggrNetProfitTrend?.series || []}
              categories={chartData?.ggrNetProfitTrend?.categories || []}
              title="GROSS GAMING REVENUE VS NET PROFIT TREND"
              currency={selectedCurrency}
              showDataLabels={true}
              useDenominationLabels={true}
              chartIcon={getChartIcon('Gross Gaming Revenue')}
            />
          </div>

          {/* ROW 5: ATV & PURCHASE FREQUENCY (Single Line Charts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <LineChart
              series={chartData?.atvTrend?.series || []}
              categories={chartData?.atvTrend?.categories || []}
              title="AVERAGE TRANSACTION VALUE TREND"
              currency={selectedCurrency}
              hideLegend={true}
              showDataLabels={true}
              useDenominationLabels={true}
              color="#3B82F6"
              chartIcon={getChartIcon('Average Transaction Value')}
            />
            <LineChart
              series={chartData?.purchaseFrequencyTrend?.series || []}
              categories={chartData?.purchaseFrequencyTrend?.categories || []}
              title="PURCHASE FREQUENCY TREND"
              currency={selectedCurrency}
              hideLegend={true}
              showDataLabels={true}
              color="#F97316"
              chartIcon={getChartIcon('Purchase Frequency')}
            />
          </div>

          {/* ROW 6: DEPOSIT CASES & WITHDRAW CASES (Single Bar Charts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <BarChart
              series={chartData?.depositCasesTrend?.series || []}
              categories={chartData?.depositCasesTrend?.categories || []}
              title="DEPOSIT CASES TREND"
              currency="CASES"
              chartIcon={getChartIcon('deposits')}
            />
            <BarChart
              series={chartData?.withdrawCasesTrend?.series || []}
              categories={chartData?.withdrawCasesTrend?.categories || []}
              title="WITHDRAW CASES TREND"
              currency="CASES"
              color="#F97316"
              chartIcon={getChartIcon('Withdraw Amount')}
            />
          </div>

          {/* ROW 7: WINRATE & WITHDRAWAL RATE (Single Line Charts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <LineChart
              series={chartData?.winrateTrend?.series || []}
              categories={chartData?.winrateTrend?.categories || []}
              title="WINRATE TREND"
              currency="PERCENTAGE"
              hideLegend={true}
              showDataLabels={true}
              color="#3B82F6"
              chartIcon={getChartIcon('Winrate')}
            />
            <LineChart
              series={chartData?.withdrawalRateTrend?.series || []}
              categories={chartData?.withdrawalRateTrend?.categories || []}
              title="WITHDRAWAL RATE TREND"
              currency="PERCENTAGE"
              hideLegend={true}
              showDataLabels={true}
              color="#F97316"
              chartIcon={getChartIcon('Withdraw Amount')}
            />
          </div>

          {/* ROW 8: CONVERSION RATE & HOLD PERCENTAGE (Single Line Charts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <LineChart
              series={chartData?.conversionRateTrend?.series || []}
              categories={chartData?.conversionRateTrend?.categories || []}
              title="CONVERSION RATE TREND"
              currency="PERCENTAGE"
              hideLegend={true}
              showDataLabels={true}
              color="#3B82F6"
              chartIcon={getChartIcon('New Register')}
            />
            <LineChart
              series={chartData?.holdPercentageTrend?.series || []}
              categories={chartData?.holdPercentageTrend?.categories || []}
              title="HOLD PERCENTAGE TREND"
              currency="PERCENTAGE"
              hideLegend={true}
              showDataLabels={true}
              color="#F97316"
              chartIcon={getChartIcon('Net Profit')}
            />
          </div>

          {/* Chart Error Display */}
          {chartError && (
            <div className="error-message">
              <p>Chart Error: {chartError}</p>
            </div>
          )}

          {/* Slicer Info */}
          <div className="slicer-info">
            <p>Showing data for: {selectedYear} | {selectedMonth} | {selectedCurrency} | {selectedLine}</p>
          </div>
        </div>
      </Frame>

    </Layout>
  );
}
