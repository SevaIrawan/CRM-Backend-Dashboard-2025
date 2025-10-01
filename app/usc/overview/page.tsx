'use client'

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Layout from '@/components/Layout';
import Frame from '@/components/Frame';
import { LineSlicer } from '@/components/slicers';
import StatCard from '@/components/StatCard';
import { getChartIcon } from '@/lib/CentralIcon';
import { formatCurrencyKPI, formatIntegerKPI, formatMoMChange, formatNumericKPI, formatPercentageKPI } from '@/lib/formatHelpers';
import { getAllUSCKPIsWithMoM } from '@/lib/USCDailyAverageAndMoM';

// USC-specific types
// Import USCKPIData from the source of truth
import { USCKPIData, USCMoMData } from '@/lib/USCDailyAverageAndMoM'

// ✅ FIX HYDRATION: Dynamic import untuk chart components
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

export default function USCOverviewPage() {
  // ✅ FIX HYDRATION: Client-side only state
  const [isMounted, setIsMounted] = useState(false);
  
  const [kpiData, setKpiData] = useState<USCKPIData | null>(null);
  const [momData, setMomData] = useState<USCKPIData | null>(null);
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCurrency] = useState('USC'); // Locked to USC
  const [selectedLine, setSelectedLine] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ✅ FIX HYDRATION: Ensure client-side only rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Chart data states
  const [srChartData, setSrChartData] = useState<any>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  // Add state for daily average calculations
  const [dailyAverages, setDailyAverages] = useState({
    depositAmount: 0,
    withdrawAmount: 0,
    grossGamingRevenue: 0,
    activeMember: 0,
    purchaseFrequency: 0,
    customerMaturityIndex: 0
  });

  // Load slicer options on component mount
  useEffect(() => {
    const loadSlicerOptions = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch('/api/usc-overview/slicer-options');
        const result = await response.json();

        if (result.success) {
          setSlicerOptions(result.data);
          // Auto-set defaults from API
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
        
        console.log('🔄 [USC Overview] Loading KPI data with MoM and Daily Average...');

        // Get ALL USC KPIs with MoM and Daily Average
        const result = await getAllUSCKPIsWithMoM(selectedYear, selectedMonth, selectedLine === 'ALL' ? undefined : selectedLine);
        
        setKpiData(result.current);
        setMomData(result.mom as any);
        setDailyAverages({
          depositAmount: result.dailyAverage.depositAmount,
          withdrawAmount: result.dailyAverage.withdrawAmount,
          grossGamingRevenue: result.dailyAverage.grossGamingRevenue,
          activeMember: result.dailyAverage.activeMember,
          purchaseFrequency: result.dailyAverage.purchaseFrequency,
          customerMaturityIndex: result.dailyAverage.customerMaturityIndex
        });
        
        console.log('✅ [USC Overview] KPI data loaded successfully');

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

  // Load Chart data when year or line changes (MONTHLY data for entire year)
  useEffect(() => {
    if (!selectedYear || !selectedLine) return;

    const loadChartData = async () => {
      try {
        setChartError(null);
        
        console.log('🔄 [USC Overview] Loading Chart data (MONTHLY for entire year)...');
        
        // Get chart data dari MV table (pre-aggregated)
        const chartResponse = await fetch(`/api/usc-overview/chart-data?line=${selectedLine}&year=${selectedYear}`);
        const chartResult = await chartResponse.json();
        
        console.log('📊 [USC Overview] Chart API Response:', chartResult);
        
        if (!chartResult.success) {
          throw new Error('Failed to fetch chart data');
        }
        
        const monthlyData = chartResult.monthlyData;
        
        console.log('📊 [USC Overview] Monthly data from MV:', monthlyData);
        
        if (Object.keys(monthlyData).length > 0) {
          // Sort months chronologically
          const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                             'July', 'August', 'September', 'October', 'November', 'December'];
          const sortedMonths = Object.keys(monthlyData).sort((a, b) => 
            monthOrder.indexOf(a) - monthOrder.indexOf(b)
          );

          // Create chart data from aggregated monthly data using precision KPIs
          const chartData = {
            depositAmountTrend: {
              series: [{ name: 'Deposit Amount', data: sortedMonths.map(month => monthlyData[month].deposit_amount) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            withdrawAmountTrend: {
              series: [{ name: 'Withdraw Amount', data: sortedMonths.map(month => monthlyData[month].withdraw_amount) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            grossGamingRevenueTrend: {
              series: [{ name: 'Gross Gaming Revenue', data: sortedMonths.map(month => monthlyData[month].ggr) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            depositCasesBarChart: {
              series: [{ name: 'Deposit Cases', data: sortedMonths.map(month => monthlyData[month].deposit_cases) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            withdrawCasesLineChart: {
              series: [{ name: 'Withdraw Cases', data: sortedMonths.map(month => monthlyData[month].withdraw_cases) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            netProfitTrend: {
              series: [{ name: 'Net Profit', data: sortedMonths.map(month => monthlyData[month].net_profit) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            avgTransactionValueTrend: {
              series: [{ name: 'Average Transaction Value', data: sortedMonths.map(month => monthlyData[month].atv) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            purchaseFrequencyTrend: {
              series: [{ name: 'Purchase Frequency', data: sortedMonths.map(month => monthlyData[month].pf) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            avgCustomerLifespanTrend: {
              series: [{ name: 'Average Customer Lifespan', data: sortedMonths.map(month => monthlyData[month]?.acl || 0) }], // Calculated from Master table via USCLogic
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            customerLifetimeValueTrend: {
              series: [{ name: 'Customer Lifetime Value', data: sortedMonths.map(month => monthlyData[month]?.clv || 0) }], // Calculated from Master table via USCLogic
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            customerMaturityIndexTrend: {
              series: [{ name: 'Customer Maturity Index', data: sortedMonths.map(month => monthlyData[month]?.cmi || 0) }], // Calculated from Master table via USCLogic
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            winrateTrend: {
              series: [{ name: 'Winrate', data: sortedMonths.map(month => {
                // Winrate = GGR / Deposit Amount * 100
                const ggr = monthlyData[month]?.ggr || 0;
                const depositAmount = monthlyData[month]?.deposit_amount || 0;
                return depositAmount > 0 ? (ggr / depositAmount) * 100 : 0;
              }) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            }
          };
          setSrChartData(chartData);
        }
        
        console.log('✅ [USC Overview] Chart data loaded successfully (MONTHLY)');

      } catch (error) {
        console.error('Error loading chart data:', error);
        setChartError('Failed to load chart data.');
      }
    };

    const timeoutId = setTimeout(loadChartData, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedYear, selectedLine]); // Only depends on year and line, not month

  // Calculate daily averages for ALL KPIs when KPI data changes
  useEffect(() => {
    const calculateDailyAverages = async () => {
      if (kpiData && selectedYear && selectedMonth) {
        try {
          const result = await getAllKPIsWithDailyAverage(kpiData, selectedYear, selectedMonth);
          
          setDailyAverages({
            depositAmount: result.dailyAverage.depositAmount || 0,
            withdrawAmount: result.dailyAverage.withdrawAmount || 0,
            grossGamingRevenue: result.dailyAverage.grossGamingRevenue || 0,
            activeMember: result.dailyAverage.activeMember || 0,
            purchaseFrequency: result.dailyAverage.purchaseFrequency || 0,
            customerMaturityIndex: result.dailyAverage.customerMaturityIndex || 0
          });
          
        } catch (error) {
          // Silent error handling
        }
      }
    };

    calculateDailyAverages();
  }, [kpiData, selectedYear, selectedMonth]);


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
        
        {/* Currency locked to USC - slicer hidden */}
        
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
                // Show ALL option always
                if (month.value === 'ALL') return true;
                
                // Filter months based on selected year
                if (!selectedYear) return true;
                
                // Check if this month exists in the selected year
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

  // ✅ FIX HYDRATION: Prevent hydration mismatch
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
              <p className="text-lg font-semibold text-gray-800">Loading USC Overview</p>
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
          {/* BARIS 1: KPI CARDS (STANDARD ROW) */}
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
              title="GROSS GAMING REVENUE"
              value={formatCurrencyKPI(kpiData?.grossGamingRevenue || 0, selectedCurrency)}
              icon="Gross Gaming Revenue"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrencyKPI(dailyAverages.grossGamingRevenue, selectedCurrency)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.grossGamingRevenue || 0),
                isPositive: Boolean(momData?.grossGamingRevenue && momData.grossGamingRevenue > 0)
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
              title="CUSTOMER MATURITY INDEX"
              value={formatPercentageKPI(kpiData?.customerMaturityIndex || 0)}
              icon="Customer Maturity Index"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatPercentageKPI(dailyAverages.customerMaturityIndex)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.customerMaturityIndex || 0),
                isPositive: Boolean(momData?.customerMaturityIndex && momData.customerMaturityIndex > 0)
              }}
            />
          </div>

          {/* Row 2: Financial Performance Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <LineChart
              series={srChartData?.depositAmountTrend?.series || []}
              categories={srChartData?.depositAmountTrend?.categories || []}
              title="DEPOSIT AMOUNT TREND"
              currency={selectedCurrency}
              hideLegend={true}
              chartIcon={getChartIcon('Deposit Amount')}
            />
            <LineChart
              series={srChartData?.withdrawAmountTrend?.series || []}
              categories={srChartData?.withdrawAmountTrend?.categories || []}
              title="WITHDRAW AMOUNT TREND"
              currency={selectedCurrency}
              hideLegend={true}
              color="#FF8C00"
              chartIcon={getChartIcon('Withdraw Amount')}
            />
            <LineChart
              series={srChartData?.grossGamingRevenueTrend?.series || []}
              categories={srChartData?.grossGamingRevenueTrend?.categories || []}
              title="GROSS GAMING REVENUE TREND"
              currency={selectedCurrency}
              hideLegend={true}
              color="#FF8C00"
              chartIcon={getChartIcon('Gross Gaming Revenue')}
            />
          </div>

          {/* Row 3: Transaction Cases Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <BarChart
              series={srChartData?.depositCasesBarChart?.series || []}
              categories={srChartData?.depositCasesBarChart?.categories || []}
              title="DEPOSIT CASES TREND"
              currency={selectedCurrency}
              chartIcon={getChartIcon('deposits')}
            />
            <BarChart
              series={srChartData?.withdrawCasesLineChart?.series || []}
              categories={srChartData?.withdrawCasesLineChart?.categories || []}
              title="WITHDRAW CASES TREND"
              currency={selectedCurrency}
              color="#FF8C00"
              chartIcon={getChartIcon('Withdraw Amount')}
            />
            <LineChart
              series={srChartData?.netProfitTrend?.series || []}
              categories={srChartData?.netProfitTrend?.categories || []}
              title="NET PROFIT TREND"
              currency={selectedCurrency}
              hideLegend={true}
              chartIcon={getChartIcon('Net Profit')}
            />
          </div>

          {/* Row 4: User Behavior Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <LineChart
              series={srChartData?.avgTransactionValueTrend?.series || []}
              categories={srChartData?.avgTransactionValueTrend?.categories || []}
              title="AVERAGE TRANSACTION VALUE TREND"
              currency={selectedCurrency}
              hideLegend={true}
              color="#3B82F6"
              chartIcon={getChartIcon('Average Transaction Value')}
            />
            <LineChart
              series={srChartData?.purchaseFrequencyTrend?.series || []}
              categories={srChartData?.purchaseFrequencyTrend?.categories || []}
              title="PURCHASE FREQUENCY TREND"
              currency={selectedCurrency}
              hideLegend={true}
              color="#FF8C00"
              chartIcon={getChartIcon('Purchase Frequency')}
            />
            <LineChart
              series={srChartData?.avgCustomerLifespanTrend?.series || []}
              categories={srChartData?.avgCustomerLifespanTrend?.categories || []}
              title="AVERAGE CUSTOMER LIFESPAN TREND (ACL)"
              currency={selectedCurrency}
              hideLegend={true}
              chartIcon={getChartIcon('Average Customer Lifespan')}
            />
          </div>

          {/* Row 5: Advanced Analytics Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <LineChart
              series={srChartData?.customerLifetimeValueTrend?.series || []}
              categories={srChartData?.customerLifetimeValueTrend?.categories || []}
              title="CUSTOMER LIFETIME VALUE TREND"
              currency={selectedCurrency}
              hideLegend={true}
              chartIcon={getChartIcon('Customer Lifetime Value')}
            />
            <LineChart
              series={srChartData?.customerMaturityIndexTrend?.series || []}
              categories={srChartData?.customerMaturityIndexTrend?.categories || []}
              title="CUSTOMER MATURITY INDEX TREND"
              currency={selectedCurrency}
              hideLegend={true}
              chartIcon={getChartIcon('Customer Maturity Index')}
            />
            <LineChart
              series={srChartData?.winrateTrend?.series || []}
              categories={srChartData?.winrateTrend?.categories || []}
              title="WINRATE TREND"
              currency={selectedCurrency}
              hideLegend={true}
              color="#FF8C00"
              chartIcon={getChartIcon('Winrate')}
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

      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          gap: 16px;
        }

        .error-container {
          text-align: center;
          padding: 48px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          color: #c33;
        }

        .kpi-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        .slicer-info {
          background: #f3f4f6;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          text-align: center;
          margin-top: 20px;
        }

        .slicer-info p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        @media (max-width: 1440px) {
          .chart-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 1024px) {
          .kpi-row {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .kpi-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .kpi-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Layout>
  );
}