'use client'

import React, { useState, useEffect } from 'react';
import { getSlicerData, getAllKPIsWithMoM, getLineChartData, SlicerFilters, SlicerData, KPIData, getLinesForCurrency, calculateKPIs, getMonthsForYear } from '@/lib/KPILogic';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import Frame from '@/components/Frame';
import { YearSlicer, MonthSlicer, CurrencySlicer, LineSlicer } from '@/components/slicers';
import StatCard from '@/components/StatCard';
import LineChart from '@/components/LineChart';
import BarChart from '@/components/BarChart';
import DonutChart from '@/components/DonutChart';
import { getChartIcon } from '@/lib/CentralIcon';
import { calculateDailyAverage, getMonthInfo, getAllKPIsWithDailyAverage } from '@/lib/dailyAverageHelper';

export default function SalesRevenuePage() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [momData, setMomData] = useState<KPIData | null>(null);
  const [slicerData, setSlicerData] = useState<SlicerData | null>(null);
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('July');
  const [selectedCurrency, setSelectedCurrency] = useState('MYR');
  const [selectedLine, setSelectedLine] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filteredLines, setFilteredLines] = useState<string[]>([]);
  const [filteredMonths, setFilteredMonths] = useState<string[]>([]);
  
  // Chart data states
  const [lineChartData, setLineChartData] = useState<any>(null);
  const [srChartData, setSrChartData] = useState<any>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  // Add state for daily average calculations
  const [dailyAverages, setDailyAverages] = useState({
    depositAmount: 0,
    withdrawAmount: 0,
    grossGamingRevenue: 0,
    activeMember: 0,
    newDepositor: 0,
    conversionRate: 0
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        console.log('🔄 [MYR Sales Revenue] Starting data load with currency lock to MYR...');

        // Get REAL data from database for MYR currency
        const { data: yearData } = await supabase
          .from('member_report_daily')
          .select('year')
          .eq('currency', 'MYR')
          .order('year', { ascending: false });

        const { data: monthData } = await supabase
          .from('member_report_daily')
          .select('month')
          .eq('currency', 'MYR')
          .eq('year', selectedYear)
          .order('month');

        const { data: lineData } = await supabase
          .from('member_report_daily')
          .select('line')
          .eq('currency', 'MYR')
          .eq('year', selectedYear)
          .eq('month', selectedMonth)
          .order('line');

        // Extract unique values from REAL data
        const availableYears = Array.from(new Set(yearData?.map((row: any) => row.year?.toString()).filter(Boolean) || [])) as string[];
        const availableMonths = Array.from(new Set(monthData?.map((row: any) => row.month).filter(Boolean) || [])) as string[];
        const availableLines = Array.from(new Set(lineData?.map((row: any) => row.line).filter(Boolean) || [])) as string[];
        
        setSlicerData({
          years: availableYears,
          months: availableMonths,
          currencies: ['MYR'],
          lines: availableLines
        });
        
        setFilteredLines(availableLines);
        setFilteredMonths(availableMonths);

        // Fetch KPI data with current filters
        console.log('📈 [MYR Sales Revenue] Fetching KPI data with filters:', {
          year: selectedYear,
          month: selectedMonth,
          currency: selectedCurrency,
          line: selectedLine
        });
        
        // Jika Line = "All", maka tampilkan semua data berdasarkan currency MYR
        const kpiFilters = {
          year: selectedYear,
          month: selectedMonth,
          currency: selectedCurrency,
          line: selectedLine === 'All' ? undefined : selectedLine // Jika All, tidak filter line
        };
        
        const kpiResult = await getAllKPIsWithMoM(kpiFilters);
        console.log('📊 [MYR Sales Revenue] KPI result received:', kpiResult);
        console.log('📊 [MYR Sales Revenue] Current KPI data:', kpiResult.current);
        console.log('📊 [MYR Sales Revenue] MoM data:', kpiResult.mom);

        setKpiData(kpiResult.current);
        setMomData(kpiResult.mom);

        // Fetch chart data
        console.log('📈 [MYR Sales Revenue] Fetching chart data...');
        const chartFilters: SlicerFilters = {
          year: selectedYear,
          month: selectedMonth,
          currency: selectedCurrency,
          line: selectedLine === 'All' ? undefined : selectedLine // Jika All, tidak filter line
        };
        
        const chartResult = await getLineChartData(chartFilters);
        console.log('📊 [MYR Sales Revenue] Chart data loaded:', chartResult);
        setLineChartData(chartResult);
        
        // Create Sales Revenue specific chart data using REAL KPI data
        const srData = await createSRChartData(chartFilters);
        console.log('📈 [MYR Sales Revenue] SR Chart data created with REAL data:', srData);
        setSrChartData(srData);

      } catch (error) {
        console.error('❌ [MYR Sales Revenue] Error loading data:', error);
        setLoadError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
        console.log('✅ [MYR Sales Revenue] Data loading completed');
      }
    };

    const timeoutId = setTimeout(loadData, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedYear, selectedMonth, selectedCurrency, selectedLine]);

     // Currency locked to MYR - no need to update filtered lines
   useEffect(() => {
     // Reset line selection if current selection is not available
     if (!filteredLines.includes(selectedLine)) {
       setSelectedLine('All');
     }
   }, [filteredLines, selectedLine]);

  // Calculate daily averages for ALL KPIs when KPI data changes
  useEffect(() => {
    const calculateDailyAverages = async () => {
      if (kpiData && selectedYear && selectedMonth) {
        try {
          console.log('🔄 [MYR Sales Revenue] Using Central Daily Average function...');
          
          // Use central function - sama seperti getAllKPIsWithMoM
          const result = await getAllKPIsWithDailyAverage(kpiData, selectedYear, selectedMonth);
          
          setDailyAverages({
            depositAmount: result.dailyAverage.depositAmount || 0,
            withdrawAmount: result.dailyAverage.withdrawAmount || 0,
            grossGamingRevenue: result.dailyAverage.grossGamingRevenue || 0,
            activeMember: result.dailyAverage.activeMember || 0,
            newDepositor: result.dailyAverage.newDepositor || 0,
            conversionRate: result.dailyAverage.conversionRate || 0
          });
          
          console.log('✅ [MYR Sales Revenue] Central Daily Average applied to ALL KPIs');
          
        } catch (error) {
          console.error('❌ [MYR Sales Revenue] Error with central Daily Average:', error);
        }
      }
    };

    calculateDailyAverages();
  }, [kpiData, selectedYear, selectedMonth]);

  const formatCurrency = (value: number | null | undefined, currency: string): string => {
    if (value === null || value === undefined) return '0';
    
    let symbol: string
    
    switch (currency) {
      case 'MYR':
        symbol = 'RM'
        break
      case 'SGD':
        symbol = 'SGD'
        break
      case 'USC':
        symbol = 'USD'
        break
      case 'ALL':
        symbol = 'RM'
        break
      default:
        symbol = 'RM'
    }
    
    return `${symbol} ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)}`
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatMoM = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '0%';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Function to create Sales Revenue specific chart data using REAL monthly KPI data
  const createSRChartData = async (filters: SlicerFilters) => {
    try {
      console.log('📈 [Sales Revenue] Creating chart data with REAL KPIs...');
      console.log('🔍 [Sales Revenue] Filters:', filters);
      
      // Get dynamic months for the selected year (same as getLineChartData line 1139)
      const months = await getMonthsForYear(filters.year);
      console.log('📅 [Sales Revenue] Dynamic months for chart:', months);
      
      if (!months || months.length === 0) {
        console.error('❌ [Sales Revenue] No months data available');
        return null;
      }
      
      // Get REAL monthly KPI data by calling calculateKPIs for each month
      // This follows the EXACT same pattern as getLineChartData line 1149-1175
      const monthlyKPIData = await Promise.all(
        months.map(async (month) => {
          const monthFilters = {
            year: filters.year,
            currency: filters.currency,
            month: month,
            line: filters.line // Include line filter for active slicer
          };
          
          console.log(`📊 [Sales Revenue] Calculating KPIs for ${month}...`);
          return await calculateKPIs(monthFilters);
        })
      );
      
      console.log('✅ [Sales Revenue] Monthly KPI data calculated:', monthlyKPIData.length, 'months');
    
      return {
        // Row 2 - Financial Performance Single Line Charts (REAL DATA dari KPILogic)
        depositAmountTrend: {
          series: [
            {
              name: 'Deposit Amount',
              data: monthlyKPIData.map(kpi => kpi.depositAmount) // REAL dari calculateKPIs line 826
            }
          ],
          categories: months.map(month => month.substring(0, 3)) // Short month names
        },
        withdrawAmountTrend: {
          series: [
            {
              name: 'Withdraw Amount', 
              data: monthlyKPIData.map(kpi => kpi.withdrawAmount) // REAL dari calculateKPIs line 829
            }
          ],
          categories: months.map(month => month.substring(0, 3)) // Short month names
        },
        grossGamingRevenueTrend: {
          series: [
            {
              name: 'Gross Gaming Revenue',
              data: monthlyKPIData.map(kpi => kpi.grossGamingRevenue) // REAL dari calculateKPIs line 827
            }
          ],
          categories: months.map(month => month.substring(0, 3)) // Short month names
        },
        // Row 3 - User Acquisition Charts (REAL DATA with correct chart types)
        newDepositorBarChart: {
          series: [
            {
              name: 'New Depositor',
              data: monthlyKPIData.map(kpi => kpi.newDepositor) // REAL dari calculateKPIs line 825
            }
          ],
          categories: months.map(month => month.substring(0, 3)) // Short month names
        },
        conversionRateLineChart: {
          series: [
            {
              name: 'Conversion Rate',
              data: monthlyKPIData.map(kpi => kpi.conversionRate) // REAL dari calculateKPIs line 852
            }
          ],
          categories: months.map(month => month.substring(0, 3)) // Short month names
        },
        activeMemberPureMemberLineChart: {
          series: [
            {
              name: 'Active Member',
              data: monthlyKPIData.map(kpi => kpi.activeMember) // REAL dari calculateKPIs
            },
            {
              name: 'Pure Member',
              data: monthlyKPIData.map(kpi => kpi.pureMember) // REAL dari calculateKPIs
            }
          ],
          categories: months.map(month => month.substring(0, 3)) // Short month names
        },
        // Row 4 - User Behavior Single Line Charts (REAL DATA)
        avgTransactionValueTrend: {
          series: [
            {
              name: 'Average Transaction Value',
              data: monthlyKPIData.map(kpi => kpi.avgTransactionValue) // REAL dari calculateKPIs line 843
            }
          ],
          categories: months.map(month => month.substring(0, 3)) // Short month names
        },
        purchaseFrequencyTrend: {
          series: [
            {
              name: 'Purchase Frequency',
              data: monthlyKPIData.map(kpi => kpi.purchaseFrequency) // REAL dari calculateKPIs line 844
            }
          ],
          categories: months.map(month => month.substring(0, 3)) // Short month names
        },
        // Row 5 - Advanced Analytics Single Line Charts (REAL DATA)
        customerLifetimeValueTrend: {
          series: [
            {
              name: 'Customer Lifetime Value',
              data: monthlyKPIData.map(kpi => kpi.customerLifetimeValue) // REAL dari calculateKPIs line 845
            }
          ],
          categories: months.map(month => month.substring(0, 3)) // Short month names
        },
        customerMaturityIndexTrend: {
          series: [
            {
              name: 'Customer Maturity Index',
              data: monthlyKPIData.map(kpi => kpi.customerMaturityIndex) // REAL dari calculateKPIs line 847
            }
          ],
          categories: months.map(month => month.substring(0, 3)) // Short month names
        },
        winrateTrend: {
          series: [
            {
              name: 'Winrate',
              data: monthlyKPIData.map(kpi => kpi.winrate) // REAL dari calculateKPIs line 839 (sudah dalam percentage)
            }
          ],
          categories: months.map(month => month.substring(0, 3)) // Short month names
        },
        // Churn vs Retention data for pie chart (REAL DATA dari KPILogic)
        churnRetentionData: {
          retentionRate: monthlyKPIData[monthlyKPIData.length - 1]?.retentionRate || 0,
          churnRate: monthlyKPIData[monthlyKPIData.length - 1]?.churnRate || 0
        }
      };
      
    } catch (error) {
      console.error('❌ [Sales Revenue] Error creating chart data:', error);
      return null;
    }
  };

  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        {/* Title area - left side */}
      </div>
      
      <div className="subheader-controls">
        <div className="slicer-group">
          <label className="slicer-label">YEAR:</label>
          <YearSlicer 
            value={selectedYear} 
            onChange={setSelectedYear}
          />
        </div>
        
                 {/* Currency locked to MYR - slicer hidden */}
        
        <div className="slicer-group">
          <label className="slicer-label">MONTH:</label>
          <MonthSlicer 
            value={selectedMonth} 
            onChange={setSelectedMonth}
            selectedYear={selectedYear}
            selectedCurrency={selectedCurrency}
          />
        </div>

        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <LineSlicer 
            lines={filteredLines}
            selectedLine={selectedLine}
            onLineChange={setSelectedLine}
          />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="loading-container">
          <p>Loading MYR Sales Revenue data...</p>
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
            value={formatCurrency(kpiData?.depositAmount || 0, selectedCurrency)}
            icon="Deposit Amount"
            additionalKpi={{
              label: "DAILY AVERAGE",
              value: formatCurrency(dailyAverages.depositAmount, selectedCurrency)
            }}
            comparison={{
              percentage: formatMoM(momData?.depositAmount || 0),
              isPositive: Boolean(momData?.depositAmount && momData.depositAmount > 0)
            }}
          />
          <StatCard
            title="WITHDRAW AMOUNT"
            value={formatCurrency(kpiData?.withdrawAmount || 0, selectedCurrency)}
            icon="Withdraw Amount"
            additionalKpi={{
              label: "DAILY AVERAGE",
              value: formatCurrency(dailyAverages.withdrawAmount, selectedCurrency)
            }}
            comparison={{
              percentage: formatMoM(momData?.withdrawAmount || 0),
              isPositive: Boolean(momData?.withdrawAmount && momData.withdrawAmount > 0)
            }}
          />
          <StatCard
            title="GROSS GAMING REVENUE"
            value={formatCurrency(kpiData?.grossGamingRevenue || 0, selectedCurrency)}
            icon="Gross Gaming Revenue"
            additionalKpi={{
              label: "DAILY AVERAGE",
              value: formatCurrency(dailyAverages.grossGamingRevenue, selectedCurrency)
            }}
            comparison={{
              percentage: formatMoM(momData?.grossGamingRevenue || 0),
              isPositive: Boolean(momData?.grossGamingRevenue && momData.grossGamingRevenue > 0)
            }}
          />
          <StatCard
            title="ACTIVE MEMBER"
            value={formatNumber(kpiData?.activeMember || 0)}
            icon="Active Member"
            additionalKpi={{
              label: "DAILY AVERAGE",
              value: formatNumber(Math.round(dailyAverages.activeMember))
            }}
            comparison={{
              percentage: formatMoM(momData?.activeMember || 0),
              isPositive: Boolean(momData?.activeMember && momData.activeMember > 0)
            }}
          />
          <StatCard
            title="NEW DEPOSITOR"
            value={formatNumber(kpiData?.newDepositor || 0)}
            icon="New Depositor"
            additionalKpi={{
              label: "DAILY AVERAGE",
              value: formatNumber(Math.round(dailyAverages.newDepositor))
            }}
            comparison={{
              percentage: formatMoM(momData?.newDepositor || 0),
              isPositive: Boolean(momData?.newDepositor && momData.newDepositor > 0)
            }}
          />
          <StatCard
            title="CONVERSION RATE"
            value={`${(kpiData?.conversionRate || 0).toFixed(2)}%`}
            icon="Conversion Rate"
            additionalKpi={{
              label: "DAILY AVERAGE",
              value: `${dailyAverages.conversionRate.toFixed(2)}%`
            }}
            comparison={{
              percentage: formatMoM(momData?.conversionRate || 0),
              isPositive: Boolean(momData?.conversionRate && momData.conversionRate > 0)
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
            chartIcon={getChartIcon('Withdraw Amount')}
          />
          <LineChart
            series={srChartData?.grossGamingRevenueTrend?.series || []}
            categories={srChartData?.grossGamingRevenueTrend?.categories || []}
            title="GROSS GAMING REVENUE TREND"
            currency={selectedCurrency}
            hideLegend={true}
            chartIcon={getChartIcon('Gross Gaming Revenue')}
          />
        </div>

        {/* Row 3: User Acquisition Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <BarChart
            series={srChartData?.newDepositorBarChart?.series || []}
            categories={srChartData?.newDepositorBarChart?.categories || []}
            title="NEW DEPOSITOR TREND"
            currency={selectedCurrency}
            chartIcon={getChartIcon('New Depositor')}
          />
          <LineChart
            series={srChartData?.conversionRateLineChart?.series || []}
            categories={srChartData?.conversionRateLineChart?.categories || []}
            title="CONVERSION RATE TREND"
            currency={selectedCurrency}
            hideLegend={true}
            chartIcon={getChartIcon('Conversion Rate')}
          />
                     <LineChart
             series={srChartData?.activeMemberPureMemberLineChart?.series || []}
             categories={srChartData?.activeMemberPureMemberLineChart?.categories || []}
             title="ACTIVE MEMBER VS PURE MEMBER TREND"
             currency={selectedCurrency}
             hideLegend={true}
             chartIcon={getChartIcon('Active Member')}
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
            chartIcon={getChartIcon('Average Transaction Value')}
          />
          <LineChart
            series={srChartData?.purchaseFrequencyTrend?.series || []}
            categories={srChartData?.purchaseFrequencyTrend?.categories || []}
            title="PURCHASE FREQUENCY TREND"
            currency={selectedCurrency}
            hideLegend={true}
            chartIcon={getChartIcon('Purchase Frequency')}
          />
          <DonutChart
            series={[
              {
                name: 'Retention Rate',
                data: [kpiData?.retentionRate || 0]  // ✅ Data sesuai slicer bulan yang dipilih
              },
              {
                name: 'Churn Rate', 
                data: [kpiData?.churnRate || 0]      // ✅ Data sesuai slicer bulan yang dipilih
              }
            ]}
            title="RETENTION VS CHURN RATE"
            currency={selectedCurrency}
            colors={['#3B82F6', '#F97316']}
            chartIcon={getChartIcon('Retention vs Churn Rate')}
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
            chartIcon={getChartIcon('Winrate')}
          />
        </div>

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

        .kpi-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        .chart-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        .chart-row:last-of-type {
          margin-bottom: 0;
        }

        .chart-container {
          background: #ffffff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          min-height: 300px;
        }

        .chart-header {
          margin-bottom: 20px;
          text-align: center;
        }

        .chart-header h3 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 18px;
          font-weight: 600;
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
          height: 200px;
          color: #6b7280;
          font-size: 16px;
          text-align: center;
          background: #f9fafb;
          border-radius: 8px;
          border: 2px dashed #d1d5db;
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