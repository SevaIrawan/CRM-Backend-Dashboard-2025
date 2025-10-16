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
interface USCKPIData {
  activeMember: number
  depositCases: number
  depositAmount: number
  withdrawAmount: number
  netProfit: number
  grossGamingRevenue: number
  avgTransactionValue: number
  purchaseFrequency: number
  customerMaturityIndex: number
  churnRate: number
  retentionRate: number
  growthRate: number
  customerLifetimeValue: number
  avgCustomerLifespan: number
  winrate: number
  holdPercentage: number
  conversionRate: number
  ggrPerUser: number
  depositAmountUser: number
}

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

export default function USCMemberAnalyticPage() {
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
  const [lineChartData, setLineChartData] = useState<any>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  // Add state for daily average calculations
  const [dailyAverages, setDailyAverages] = useState({
    ggrUser: 0,
    depositAmountUser: 0,
    avgTransactionValue: 0,
    activeMember: 0,
    conversionRate: 0,
    churnRate: 0
  });

  // Load slicer options on component mount
  useEffect(() => {
    const loadSlicerOptions = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch('/api/usc-member-analytic/slicer-options');
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

  // Load KPI and Chart data when filters change
  useEffect(() => {
    if (!selectedYear || !selectedMonth || !selectedLine) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setChartError(null);
        
        console.log('🔄 [USC Member Analytic] Loading ALL data (KPI + Charts with MoM and Daily Average)...');

        // Get ALL USC KPIs with MoM and Daily Average
        const result = await getAllUSCKPIsWithMoM(selectedYear, selectedMonth, selectedLine === 'ALL' ? undefined : selectedLine);
        
        setKpiData(result.current);
        setMomData(result.mom as any);
        setDailyAverages({
          ggrUser: result.dailyAverage.ggrPerUser,
          depositAmountUser: result.dailyAverage.depositAmountUser,
          avgTransactionValue: result.dailyAverage.avgTransactionValue,
          activeMember: result.dailyAverage.activeMember,
          conversionRate: result.dailyAverage.conversionRate,
          churnRate: result.dailyAverage.churnRate
        });
        
        console.log('✅ [USC Member Analytic] KPI data loaded successfully');
        
        // Get chart data from USC Member Analytic Chart API endpoint
        const chartResponse = await fetch(`/api/usc-member-analytic/chart-data?line=${selectedLine}&year=${selectedYear}`);
        const chartResult = await chartResponse.json();
        
        if (chartResult.success) {
          setLineChartData(chartResult.data);
        }
        
        console.log('✅ [USC Member Analytic] ALL data loaded successfully - Ready to display!');

      } catch (error) {
        console.error('Error loading data:', error);
        setLoadError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(loadData, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedYear, selectedMonth, selectedLine]);

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
                
                // Filter months based on selected year (DYNAMIC)
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
              <p className="text-lg font-semibold text-gray-800">Initializing DASHBOARD</p>
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
              <p className="text-lg font-semibold text-gray-800">Loading USC Member Analytic</p>
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
              title="GGR USER"
              value={formatCurrencyKPI(kpiData?.ggrPerUser || 0, selectedCurrency)}
              icon="GGR Per User"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrencyKPI(dailyAverages.ggrUser, selectedCurrency)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.ggrPerUser || 0),
                isPositive: Boolean(momData?.ggrPerUser && momData.ggrPerUser > 0)
              }}
            />
            <StatCard
              title="DEPOSIT AMOUNT USER"
              value={formatCurrencyKPI(kpiData?.depositAmountUser || 0, selectedCurrency)}
              icon="Deposit Amount"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrencyKPI(dailyAverages.depositAmountUser, selectedCurrency)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.depositAmountUser || 0),
                isPositive: Boolean(momData?.depositAmountUser && momData.depositAmountUser > 0)
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
              title="CONVERSION RATE"
              value={formatPercentageKPI(kpiData?.conversionRate || 0)}
              icon="Conversion Rate"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatPercentageKPI(dailyAverages.conversionRate)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.conversionRate || 0),
                isPositive: Boolean(momData?.conversionRate && momData.conversionRate > 0)
              }}
            />
            <StatCard
              title="CHURN RATE"
              value={formatPercentageKPI(kpiData?.churnRate || 0)}
              icon="Churn Rate"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatPercentageKPI(dailyAverages.churnRate)
              }}
              comparison={{
                percentage: formatMoMChange(momData?.churnRate || 0),
                isPositive: Boolean(momData?.churnRate && momData.churnRate > 0)
              }}
            />
          </div>

          {/* Row 2: Bar Charts */}
          <div className="chart-row">
            {lineChartData?.newRegisterTrend?.series && lineChartData?.newRegisterTrend?.categories ? (
              <BarChart
                series={lineChartData.newRegisterTrend.series}
                categories={lineChartData.newRegisterTrend.categories}
                title="NEW REGISTER VS NEW DEPOSITOR TREND"
                currency={undefined} // Member data, bukan currency
                chartIcon={getChartIcon('New Register vs New Depositor')}
              />
            ) : (
              <div className="chart-container">
                <div className="chart-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <div dangerouslySetInnerHTML={{ __html: getChartIcon('New Register vs New Depositor') }} />
                    <h3>NEW REGISTER VS NEW DEPOSITOR TREND</h3>
                  </div>
                  <p>Loading chart data...</p>
                </div>
                <div className="chart-placeholder">
                  📊 Loading New Register vs New Depositor data...
                </div>
              </div>
            )}
            
            {lineChartData?.activeMemberTrend?.series && lineChartData?.activeMemberTrend?.categories ? (
              <BarChart
                series={lineChartData.activeMemberTrend.series}
                categories={lineChartData.activeMemberTrend.categories}
                title="ACTIVE MEMBER VS PURE MEMBER TREND"
                currency={undefined} // Member data, bukan currency
                chartIcon={getChartIcon('Active Member vs Pure Member')}
              />
            ) : (
              <div className="chart-container">
                <div className="chart-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <div dangerouslySetInnerHTML={{ __html: getChartIcon('Active Member vs Pure Member') }} />
                    <h3>ACTIVE MEMBER VS PURE MEMBER TREND</h3>
                  </div>
                  <p>Loading chart data...</p>
                </div>
                <div className="chart-placeholder">
                  📊 Loading Active Member vs Pure Member data...
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Single Line Charts */}
          <div className="chart-row">
            {lineChartData?.ggrUserTrend?.series?.[0]?.data && lineChartData?.ggrUserTrend?.categories ? (
              <LineChart
                series={lineChartData.ggrUserTrend.series}
                categories={lineChartData.ggrUserTrend.categories}
                title="GGR USER TREND"
                currency={selectedCurrency}
                chartIcon={getChartIcon('GGR User Trend')}
              />
            ) : null}
            
            {lineChartData?.depositAmountUserTrend?.series?.[0]?.data && lineChartData?.depositAmountUserTrend?.categories ? (
              <LineChart
                series={lineChartData.depositAmountUserTrend.series}
                categories={lineChartData.depositAmountUserTrend.categories}
                title="DEPOSIT AMOUNT USER TREND"
                currency={selectedCurrency}
                chartIcon={getChartIcon('Deposit Amount User Trend')}
              />
            ) : null}
          </div>

          {/* Row 4: Multi-line Charts */}
          <div className="chart-row">
            {lineChartData?.retentionChurnTrend?.series && lineChartData?.retentionChurnTrend?.categories ? (
              <LineChart
                series={lineChartData.retentionChurnTrend.series}
                categories={lineChartData.retentionChurnTrend.categories}
                title="RETENTION VS CHURN RATE"
                currency={selectedCurrency}
                chartIcon={getChartIcon('RETENTION VS CHURN RATE')}
              />
            ) : (
              <div className="chart-container">
                <div className="chart-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <div dangerouslySetInnerHTML={{ __html: getChartIcon('RETENTION VS CHURN RATE') }} />
                    <h3>RETENTION VS CHURN RATE</h3>
                  </div>
                  <p>Loading chart data...</p>
                </div>
                <div className="chart-placeholder">
                  📈 Loading Retention vs Churn Rate data...
                </div>
              </div>
            )}
            
            {lineChartData?.customerLifetimeValueTrend?.series?.[0]?.data && lineChartData?.customerLifetimeValueTrend?.categories ? (
              <LineChart
                series={[
                  { name: 'CUSTOMER LIFETIME VALUE', data: lineChartData.customerLifetimeValueTrend.series[0].data },
                  { name: 'PURCHASE FREQUENCY', data: lineChartData.purchaseFrequencyTrend?.series?.[0]?.data || [] }
                ]}
                categories={lineChartData.customerLifetimeValueTrend.categories}
                title="CLV VS PURCHASE FREQUENCY"
                currency={selectedCurrency}
                chartIcon={getChartIcon('CLV VS PURCHASE FREQUENCY')}
              />
            ) : (
              <div className="chart-container">
                <div className="chart-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <div dangerouslySetInnerHTML={{ __html: getChartIcon('CLV VS PURCHASE FREQUENCY') }} />
                    <h3>CLV VS PURCHASE FREQUENCY</h3>
                  </div>
                  <p>Loading chart data...</p>
                </div>
                <div className="chart-placeholder">
                  📈 Loading CLV vs Purchase Frequency data...
                </div>
              </div>
            )}
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

        .chart-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        .chart-container {
          background: #ffffff;
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          min-height: 400px;
          height: 400px;
        }

        /* Standard chart height for all chart components */
        .chart-container > div {
          height: 350px !important;
        }

        /* Ensure chart components have consistent height */
        .chart-container canvas {
          height: 350px !important;
        }

        /* Ensure all chart components have same height */
        .chart-container > div > div {
          height: 350px !important;
        }

        /* Specific height for chart.js containers */
        .chart-container > div > div > div {
          height: 350px !important;
        }

        .chart-header {
          margin-bottom: 32px;
          text-align: left;
          padding: 16px 0;
        }

        .chart-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 18px;
          font-weight: 600;
        }

        .chart-header div {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chart-header div div {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chart-header div div svg {
          width: 16px;
          height: 16px;
          fill: #3b82f6;
        }

        /* Ensure icon is visible in chart header */
        .chart-container .chart-header div div {
          width: 20px !important;
          height: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-width: 20px !important;
          min-height: 20px !important;
        }

        .chart-container .chart-header div div svg {
          width: 16px !important;
          height: 16px !important;
          fill: #3b82f6 !important;
          display: block !important;
          visibility: visible !important;
        }

        .chart-header p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .chart-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 350px;
          color: #6b7280;
          font-size: 16px;
          text-align: center;
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
          
          .chart-row {
            grid-template-columns: 1fr;
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