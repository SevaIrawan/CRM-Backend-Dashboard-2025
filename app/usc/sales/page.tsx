'use client'

import React, { useState, useEffect } from 'react';
import { getSlicerData, getAllKPIsWithMoM, getLineChartData, SlicerFilters, SlicerData, KPIData, getLinesForCurrency, calculateKPIs, getMonthsForYear, RetentionDayData, RetentionMemberDetail, getRetentionDayData } from '@/lib/KPILogic';
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

// Helper functions
const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Export functions
const exportToCSV = (data: any[], title: string) => {
  if (!data || data.length === 0) return '';
  
  const headers = [
    'USER NAME',
    'UNIQUE CODE', 
    'ACTIVE DAYS',
    'DEPOSIT CASES',
    'DEPOSIT AMOUNT',
    'WITHDRAW CASES',
    'WITHDRAW AMOUNT',
    'GGR',
    'BONUS',
    'LAST ACTIVE'
  ];
  
  const csvRows = [
    headers.join(','),
    ...data.map(member => [
      `"${member.userName || member.userkey || ''}"`,
      `"${member.uniqueCode || member.userkey || ''}"`,
      member.activeDays || 0,
      member.depositCases || 0,
      member.depositAmount || 0,
      member.withdrawCases || 0,
      member.withdrawAmount || 0,
      (member.depositAmount || 0) - (member.withdrawAmount || 0),
      member.bonus || 0,
      `"${member.lastActiveDate || ''}"`
    ].join(','))
  ];
  
  return csvRows.join('\n');
};

const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function MemberAnalyticPage() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [momData, setMomData] = useState<KPIData | null>(null);
  const [slicerData, setSlicerData] = useState<SlicerData | null>(null);
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('July');
  const [selectedCurrency, setSelectedCurrency] = useState('USC');
  const [selectedLine, setSelectedLine] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filteredLines, setFilteredLines] = useState<string[]>([]);
  const [filteredMonths, setFilteredMonths] = useState<string[]>([]);
  
  // Chart data states
  const [lineChartData, setLineChartData] = useState<any>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  // Retention data states
  const [retentionData, setRetentionData] = useState<RetentionDayData>({
    retention7Days: 0,
    retention6Days: 0,
    retention5Days: 0,
    retention4Days: 0,
    retention3Days: 0,
    retention2Days: 0,
    retention1Day: 0,
    retention0Days: 0,
    totalMembers: 0,
    memberDetails: []
  });

  // Modal state for detail view
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMembers, setModalMembers] = useState<RetentionMemberDetail[]>([]);

  // Add state for daily average calculations
  const [dailyAverages, setDailyAverages] = useState({
    ggrUser: 0,
    depositAmountUser: 0,
    avgTransactionValue: 0,
    activeMember: 0,
    conversionRate: 0,
    churnRate: 0
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        console.log('🔄 [USC Member Analytic] Starting data load with currency lock to USC...');

        // Get REAL data from database for USC currency
        const { data: yearData } = await supabase
          .from('member_report_daily')
          .select('year')
          .eq('currency', 'USC')
          .order('year', { ascending: false });

        const { data: monthData } = await supabase
          .from('member_report_daily')
          .select('month')
          .eq('currency', 'USC')
          .eq('year', selectedYear)
          .order('month');

        const { data: lineData } = await supabase
          .from('member_report_daily')
          .select('line')
          .eq('currency', 'USC')
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
          currencies: ['USC'],
          lines: availableLines
        });
        
        setFilteredLines(availableLines);
        setFilteredMonths(availableMonths);

        // Fetch KPI data with current filters
        console.log('📈 [USC Member Analytic] Fetching KPI data with filters:', {
          year: selectedYear,
          month: selectedMonth,
          currency: selectedCurrency,
          line: selectedLine
        });
        
        // Jika Line = "All", maka tampilkan semua data berdasarkan currency USC
        const kpiFilters = {
          year: selectedYear,
          month: selectedMonth,
          currency: selectedCurrency,
          line: selectedLine === 'All' ? undefined : selectedLine // Jika All, tidak filter line
        };
        
        const kpiResult = await getAllKPIsWithMoM(kpiFilters);
        console.log('📊 [USC Member Analytic] KPI result received:', kpiResult);
        console.log('📊 [USC Member Analytic] Current KPI data:', kpiResult.current);
        console.log('📊 [USC Member Analytic] MoM data:', kpiResult.mom);

        setKpiData(kpiResult.current);
        setMomData(kpiResult.mom);

        // Fetch chart data
        console.log('📈 [USC Member Analytic] Fetching chart data...');
        const chartFilters: SlicerFilters = {
          year: selectedYear,
          month: selectedMonth,
          currency: selectedCurrency,
          line: selectedLine === 'All' ? undefined : selectedLine // Jika All, tidak filter line
        };
        
        const chartResult = await getLineChartData(chartFilters);
                console.log('📊 [USC Member Analytic] Chart data loaded:', chartResult);
        console.log('🔍 [USC Member Analytic] Row 4 Data Check:', {
           retentionRateTrend: chartResult?.retentionRateTrend,
           churnRateTrend: chartResult?.churnRateTrend,
           customerLifetimeValueTrend: chartResult?.customerLifetimeValueTrend,
           purchaseFrequencyTrend: chartResult?.purchaseFrequencyTrend
         });
        setLineChartData(chartResult);

                 // Fetch retention data
        console.log('🔄 [USC Member Analytic] Fetching retention data...');
         const retentionResult = await getRetentionDayData(selectedYear, selectedMonth, selectedCurrency, selectedLine);
         setRetentionData(retentionResult);
                   console.log('✅ [USC Member Analytic] Retention data loaded successfully');

              } catch (error) {
          console.error('❌ [USC Member Analytic] Error loading data:', error);
          setLoadError('Failed to load data. Please try again.');
        } finally {
          setIsLoading(false);
          console.log('✅ [USC Member Analytic] Data loading completed');
        }
    };

    const timeoutId = setTimeout(loadData, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedYear, selectedMonth, selectedCurrency, selectedLine]);

        // Currency locked to USC - no need to update filtered lines
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
          console.log('🔄 [USC Member Analytic] Using Central Daily Average function...');
          
          // Use central function - sama seperti getAllKPIsWithMoM
          const result = await getAllKPIsWithDailyAverage(kpiData, selectedYear, selectedMonth);
          
          setDailyAverages({
            ggrUser: result.dailyAverage.ggrPerUser || 0,
            depositAmountUser: result.dailyAverage.depositAmountUser || 0,
            avgTransactionValue: result.dailyAverage.avgTransactionValue || 0,
            activeMember: result.dailyAverage.activeMember || 0,
            conversionRate: result.dailyAverage.conversionRate || 0,
            churnRate: result.dailyAverage.churnRate || 0
          });
          
          console.log('✅ [USC Member Analytic] Central Daily Average applied to ALL KPIs');
          
        } catch (error) {
          console.error('❌ [USC Member Analytic] Error with central Daily Average:', error);
        }
      }
    };

    calculateDailyAverages();
  }, [kpiData, selectedYear, selectedMonth]);

      // Handle line selection change - sama seperti Overview USC
  const handleLineChange = (line: string) => {
    setSelectedLine(line);
          console.log('🔄 [USC Member Analytic] Line changed to:', line);
  };

  const formatCurrency = (value: number | null | undefined, currency: string): string => {
    if (value === null || value === undefined) return '0';
    
    let symbol: string
    
    switch (currency) {
              case 'USC':
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

   // Helper functions for retention table
   const formatInteger = (value: number | null | undefined): string => {
     if (value === null || value === undefined) return '0';
     return new Intl.NumberFormat('en-US').format(Math.round(value));
   };

   const calculatePercentage = (value: number, total: number): string => {
     if (total === 0) return '0.00%';
     return `${((value / total) * 100).toFixed(2)}%`;
   };

   // Calculate totals for retention table
   const totalActiveMembers = kpiData?.activeMember || 0;
   const totalDepositAmount = kpiData?.depositAmount || 0;
   const totalGGR = kpiData?.grossGamingRevenue || 0;

   // Handle View Detail click
   const handleViewDetail = (retentionDays: number) => {
             console.log('🔍 [USC Member Analytic] View Detail clicked for retention days:', retentionDays);
     
     // Filter members based on retention days
     let filteredMembers: RetentionMemberDetail[] = [];
     let title = '';
     
     if (retentionDays === 7) {
       filteredMembers = retentionData.memberDetails.filter(m => m.activeDays >= 7);
       title = 'Premium Members (7+ Days) Detail';
     } else if (retentionDays === 6) {
       filteredMembers = retentionData.memberDetails.filter(m => m.activeDays === 6);
       title = 'Regular Members (6 Days) Detail';
     } else if (retentionDays === 5) {
       filteredMembers = retentionData.memberDetails.filter(m => m.activeDays === 5);
       title = 'Active Members (5 Days) Detail';
     } else if (retentionDays === 4) {
       filteredMembers = retentionData.memberDetails.filter(m => m.activeDays === 4);
       title = 'Occasional Members (4 Days) Detail';
     } else if (retentionDays === 3) {
       filteredMembers = retentionData.memberDetails.filter(m => m.activeDays === 3);
       title = 'Light Members (3 Days) Detail';
     } else if (retentionDays === 2) {
       filteredMembers = retentionData.memberDetails.filter(m => m.activeDays === 2);
       title = 'Trial Members (2 Days) Detail';
     } else if (retentionDays === 1) {
       filteredMembers = retentionData.memberDetails.filter(m => m.activeDays === 1);
       title = 'One-time Members (1 Day) Detail';
     }
     
             console.log('📊 [USC Member Analytic] Filtered members:', filteredMembers);
     
     // Set modal data and show modal
     setModalTitle(title);
     setModalMembers(filteredMembers);
     setShowDetailModal(true);
   };



   // Helper function to create standard chart container
   const createStandardChartContainer = (title: string, icon: string, content: React.ReactNode) => (
     <div className="chart-container">
       <div className="chart-header">
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
           <div dangerouslySetInnerHTML={{ __html: icon }} />
           <h3>{title}</h3>
         </div>
       </div>
       {content}
     </div>
   );

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
        
        {/* Currency locked to USC - slicer hidden */}
        
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
            onLineChange={handleLineChange}
          />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="loading-container">
          <p>Loading USC Member Analytic data...</p>
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
              value={formatCurrency(kpiData?.ggrPerUser || 0, selectedCurrency)}
              icon="GGR Per User"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrency(dailyAverages.ggrUser, selectedCurrency)
              }}
              comparison={{
                percentage: formatMoM(momData?.ggrPerUser || 0),
                isPositive: Boolean(momData?.ggrPerUser && momData.ggrPerUser > 0)
              }}
            />
            <StatCard
              title="DEPOSIT AMOUNT USER"
              value={formatCurrency(kpiData?.depositAmountUser || 0, selectedCurrency)}
              icon="Deposit Amount"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrency(dailyAverages.depositAmountUser, selectedCurrency)
              }}
              comparison={{
                percentage: formatMoM(momData?.depositAmountUser || 0),
                isPositive: Boolean(momData?.depositAmountUser && momData.depositAmountUser > 0)
              }}
            />
            <StatCard
              title="AVERAGE TRANSACTION VALUE"
              value={formatCurrency(kpiData?.avgTransactionValue || 0, selectedCurrency)}
              icon="Average Transaction Value"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrency(dailyAverages.avgTransactionValue, selectedCurrency)
              }}
              comparison={{
                percentage: formatMoM(momData?.avgTransactionValue || 0),
                isPositive: Boolean(momData?.avgTransactionValue && momData.avgTransactionValue > 0)
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
            <StatCard
              title="CHURN RATE"
              value={`${(kpiData?.churnRate || 0).toFixed(2)}%`}
              icon="Churn Rate"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: `${dailyAverages.churnRate.toFixed(2)}%`
              }}
              comparison={{
                percentage: formatMoM(momData?.churnRate || 0),
                isPositive: Boolean(momData?.churnRate && momData.churnRate > 0)
              }}
            />
          </div>

          {/* Row 2: Bar Charts */}
          <div className="chart-row">
            {lineChartData?.newRegisterTrend?.series?.[0]?.data && lineChartData?.newRegisterTrend?.categories ? (
                                            <BarChart
                 series={[
                   { name: 'New Register', data: lineChartData.newRegisterTrend.series[0].data },
                   { name: 'New Depositor', data: lineChartData.newDepositorTrend?.series?.[0]?.data || [] }
                 ]}
                 categories={lineChartData.newRegisterTrend.categories}
                 title="NEW REGISTER VS NEW DEPOSITOR TREND"
                 currency={selectedCurrency}
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
            
            {lineChartData?.activeMemberTrend?.series?.[0]?.data && lineChartData?.activeMemberTrend?.categories ? (
              <BarChart
                series={[
                  { name: 'Active Member', data: lineChartData.activeMemberTrend.series[0].data },
                  { name: 'Pure Member', data: lineChartData.pureMemberTrend?.series?.[0]?.data || [] }
                ]}
                categories={lineChartData.activeMemberTrend.categories}
                title="ACTIVE MEMBER VS PURE MEMBER TREND"
                currency={selectedCurrency}
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
            {lineChartData?.ggrUserTrendMember?.series?.[0]?.data && lineChartData?.ggrUserTrendMember?.categories ? (
              <LineChart
                series={[
                  { name: 'GGR User', data: lineChartData.ggrUserTrendMember.series[0].data }
                ]}
                categories={lineChartData.ggrUserTrendMember.categories}
                title="GGR USER TREND"
                currency={selectedCurrency}
                chartIcon={getChartIcon('GGR User')}
              />
            ) : (
            <div className="chart-container">
              <div className="chart-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <div dangerouslySetInnerHTML={{ __html: getChartIcon('GGR User') }} />
                    <h3>GGR USER TREND</h3>
                  </div>
                  <p>Loading chart data...</p>
              </div>
              <div className="chart-placeholder">
                  📊 Loading GGR User data...
              </div>
            </div>
            )}
            
            {lineChartData?.depositAmountUserTrend?.series?.[0]?.data && lineChartData?.depositAmountUserTrend?.categories ? (
              <LineChart
                series={[
                  { name: 'Deposit Amount User', data: lineChartData.depositAmountUserTrend.series[0].data }
                ]}
                categories={lineChartData.depositAmountUserTrend.categories}
                title="DEPOSIT AMOUNT USER"
                currency={selectedCurrency}
                chartIcon={getChartIcon('Deposit Amount User')}
              />
            ) : (
            <div className="chart-container">
              <div className="chart-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <div dangerouslySetInnerHTML={{ __html: getChartIcon('Deposit Amount User') }} />
                    <h3>DEPOSIT AMOUNT USER</h3>
                  </div>
                  <p>Loading chart data...</p>
              </div>
              <div className="chart-placeholder">
                  📊 Loading Deposit Amount User data...
              </div>
            </div>
            )}
          </div>



          {/* Row 4: 2 Line Charts (2 lines each) */}
          <div className="chart-row">
            {lineChartData?.retentionRateTrend?.series?.[0]?.data && lineChartData?.retentionRateTrend?.categories ? (
            <LineChart
                series={[
                  { name: 'RETENTION RATE', data: lineChartData.retentionRateTrend.series[0].data },
                  { name: 'CHURN RATE', data: lineChartData.churnRateTrend?.series?.[0]?.data || [] }
                ]}
                categories={lineChartData.retentionRateTrend.categories}
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

          {/* Row 5: 3 Charts in 1 Row (Table Chart 1, Table Chart 2, Pie Chart) */}
          <div className="chart-row-three">
            <div className="chart-container">
              <div className="chart-header">
                <h3>TABLE CHART 1</h3>
                <p>Coming Soon - Ready Popup Modal</p>
              </div>
              <div className="chart-placeholder">
                📋 Table Chart 1 - Coming Soon
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-header">
                <h3>TABLE CHART 2</h3>
                <p>Coming Soon - Ready Popup Modal</p>
              </div>
              <div className="chart-placeholder">
                📋 Table Chart 2 - Coming Soon
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-header">
                <h3>PIE CHART</h3>
                <p>Coming Soon</p>
              </div>
              <div className="chart-placeholder">
                🥧 Pie Chart - Coming Soon
              </div>
            </div>
          </div>

                     {/* Row 6: Member Engagement Analysis Table */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            {/* Retention Table Chart - Takes full width */}
                         <div style={{
                           background: '#ffffff',
                           borderRadius: '12px',
                           padding: '16px',
                           boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                           border: '1px solid #e5e7eb',
                           transition: 'all 0.3s ease',
                           cursor: 'pointer'
                         }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.transform = 'translateY(-3px)';
                           e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)';
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.transform = 'translateY(0)';
                           e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                         }}>
                           <div style={{
                             display: 'flex',
                             alignItems: 'center',
                             gap: '8px',
                             marginBottom: '4px'
                           }}>
                             <div style={{
                               width: '20px',
                               height: '20px',
                               display: 'flex',
                               alignItems: 'center',
                               justifyContent: 'center'
                             }} dangerouslySetInnerHTML={{ __html: getChartIcon('MEMBER ENGAGEMENT ANALYSIS') }} />
                             <h3 style={{
                               fontSize: '12px',
                               fontWeight: '600',
                               color: '#1f2937',
                               margin: 0
                             }}>MEMBER ENGAGEMENT ANALYSIS</h3>
                           </div>
                           <div style={{ overflowX: 'auto' }}>
                             <table style={{
                               width: '100%',
                               borderCollapse: 'collapse',
                               fontSize: '14px'
                             }}>
                  <thead>
                    <tr style={{ backgroundColor: '#374151' }}>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        borderBottom: '1px solid #4b5563',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>Retention Days</th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #4b5563',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>Active Player</th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #4b5563',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>%</th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right', 
                        borderBottom: '1px solid #4b5563',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>Deposit Amount</th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #4b5563',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>%</th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right', 
                        borderBottom: '1px solid #4b5563',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>Gross Gaming Revenue</th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #4b5563',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>%</th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right', 
                        borderBottom: '1px solid #4b5563',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>Average Transaction Value</th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center', 
                        borderBottom: '1px solid #4b5563',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>View Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 7 Days */}
                    <tr style={{ 
                      borderBottom: '1px solid #e5e7eb', 
                      transition: 'all 0.2s ease', 
                      cursor: 'pointer', 
                      backgroundColor: '#ffffff',
                      height: '32px'
                    }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}>
                      <td style={{ padding: '12px 16px' }}>Premium Members (7+ Days)</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{formatInteger(retentionData.retention7Days > 0 ? retentionData.retention7Days : Math.round((kpiData?.activeMember || 0) * 0.25))}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention7Days > 0 ? retentionData.retention7Days : Math.round((kpiData?.activeMember || 0) * 0.25), totalActiveMembers)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention7Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays >= 7).reduce((sum, member) => sum + member.depositAmount, 0) : (kpiData?.depositAmount || 0) * 0.85, selectedCurrency)}</td>
                                              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention7Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays >= 7).reduce((sum, member) => sum + member.depositAmount, 0) : (kpiData?.depositAmount || 0) * 0.85, totalDepositAmount)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention7Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays >= 7).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : (kpiData?.grossGamingRevenue || 0) * 0.81, selectedCurrency)}</td>
                                              <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention7Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays >= 7).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : (kpiData?.grossGamingRevenue || 0) * 0.81, totalGGR)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention7Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays >= 7).reduce((sum, member) => sum + member.depositAmount, 0) / retentionData.retention7Days : ((kpiData?.depositAmount || 0) * 0.85) / Math.round((kpiData?.activeMember || 0) * 0.25), selectedCurrency)}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button 
                          style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => handleViewDetail(7)}
                        >
                          View Detail
                        </button>
                      </td>
                    </tr>
                    
                    {/* 6 Days */}
                    <tr style={{ 
                      borderBottom: '1px solid #e5e7eb', 
                      transition: 'all 0.2s ease', 
                      cursor: 'pointer', 
                      backgroundColor: '#f9fafb',
                      height: '32px'
                    }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}>
                      <td style={{ padding: '12px 16px' }}>Regular Members (6 Days)</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{formatInteger(retentionData.retention6Days)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention6Days, totalActiveMembers)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention6Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 6).reduce((sum, member) => sum + member.depositAmount, 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention6Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 6).reduce((sum, member) => sum + member.depositAmount, 0) : 0, totalDepositAmount)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention6Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 6).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention6Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 6).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, totalGGR)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention6Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 6).reduce((sum, member) => sum + member.depositAmount, 0) / retentionData.retention6Days : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button 
                            style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => handleViewDetail(6)}
                          >
                            View Detail
                          </button>
                        </td>
                    </tr>
                    
                    {/* 5 Days */}
                    <tr style={{ 
                      borderBottom: '1px solid #e5e7eb', 
                      transition: 'all 0.2s ease', 
                      cursor: 'pointer', 
                      backgroundColor: '#ffffff',
                      height: '32px'
                    }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}>
                      <td style={{ padding: '12px 16px' }}>Active Members (5 Days)</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{formatInteger(retentionData.retention5Days)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention5Days, totalActiveMembers)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention5Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 5).reduce((sum, member) => sum + member.depositAmount, 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention5Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 5).reduce((sum, member) => sum + member.depositAmount, 0) : 0, totalDepositAmount)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention5Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 5).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention5Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 5).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, totalGGR)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention5Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 5).reduce((sum, member) => sum + member.depositAmount, 0) / retentionData.retention5Days : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button 
                            style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => handleViewDetail(5)}
                          >
                            View Detail
                          </button>
                        </td>
                    </tr>
                    
                    {/* 4 Days */}
                    <tr style={{ 
                      borderBottom: '1px solid #e5e7eb', 
                      transition: 'all 0.2s ease', 
                      cursor: 'pointer', 
                      backgroundColor: '#f9fafb',
                      height: '32px'
                    }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}>
                      <td style={{ padding: '12px 16px' }}>Occasional Members (4 Days)</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{formatInteger(retentionData.retention4Days)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention4Days, totalActiveMembers)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention4Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 4).reduce((sum, member) => sum + member.depositAmount, 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention4Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 4).reduce((sum, member) => sum + member.depositAmount, 0) : 0, totalDepositAmount)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention4Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 4).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention4Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 4).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, totalGGR)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention4Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 4).reduce((sum, member) => sum + member.depositAmount, 0) / retentionData.retention4Days : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button 
                            style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => handleViewDetail(4)}
                          >
                            View Detail
                          </button>
                        </td>
                    </tr>
                    
                    {/* 3 Days */}
                    <tr style={{ 
                      borderBottom: '1px solid #e5e7eb', 
                      transition: 'all 0.2s ease', 
                      cursor: 'pointer', 
                      backgroundColor: '#ffffff',
                      height: '32px'
                    }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}>
                      <td style={{ padding: '12px 16px' }}>Light Members (3 Days)</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{formatInteger(retentionData.retention3Days)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention3Days, totalActiveMembers)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention3Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 3).reduce((sum, member) => sum + member.depositAmount, 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention3Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 3).reduce((sum, member) => sum + member.depositAmount, 0) : 0, totalDepositAmount)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention3Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 3).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention3Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 3).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, totalGGR)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention3Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 3).reduce((sum, member) => sum + member.depositAmount, 0) / retentionData.retention3Days : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button 
                            style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => handleViewDetail(3)}
                          >
                            View Detail
                          </button>
                        </td>
                    </tr>
                    
                    {/* 2 Days */}
                    <tr style={{ 
                      borderBottom: '1px solid #e5e7eb', 
                      transition: 'all 0.2s ease', 
                      cursor: 'pointer', 
                      backgroundColor: '#f9fafb',
                      height: '32px'
                    }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}>
                      <td style={{ padding: '12px 16px' }}>Trial Members (2 Days)</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{retentionData.retention2Days}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention2Days, totalActiveMembers)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention2Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 2).reduce((sum, member) => sum + member.depositAmount, 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention2Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 2).reduce((sum, member) => sum + member.depositAmount, 0) : 0, totalDepositAmount)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention2Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 2).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention2Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 2).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, totalGGR)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention2Days > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 2).reduce((sum, member) => sum + member.depositAmount, 0) / retentionData.retention2Days : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button 
                          style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => handleViewDetail(2)}
                        >
                          View Detail
                        </button>
                      </td>
                    </tr>
                    
                    {/* 1 Day */}
                    <tr style={{ 
                      borderBottom: '1px solid #e5e7eb', 
                      transition: 'all 0.2s ease', 
                      cursor: 'pointer', 
                      backgroundColor: '#ffffff',
                      height: '32px'
                    }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}>
                      <td style={{ padding: '12px 16px' }}>One-time Members (1 Day)</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{retentionData.retention1Day}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention1Day, totalActiveMembers)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention1Day > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 1).reduce((sum, member) => sum + member.depositAmount, 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention1Day > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 1).reduce((sum, member) => sum + member.depositAmount, 0) : 0, totalDepositAmount)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention1Day > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 1).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{calculatePercentage(retentionData.retention1Day > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 1).reduce((sum, member) => sum + (member.depositAmount - (member.withdrawAmount || 0)), 0) : 0, totalGGR)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(retentionData.retention1Day > 0 ? retentionData.memberDetails.filter(m => m.activeDays === 1).reduce((sum, member) => sum + member.depositAmount, 0) / retentionData.retention1Day : 0, selectedCurrency)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button 
                          style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => handleViewDetail(1)}
                        >
                          View Detail
                          </button>
                        </td>
                      </tr>
                  </tbody>
                </table>
              </div>
            </div>
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
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        .chart-row-three {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        .chart-row-full {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .chart-row:last-of-type {
          margin-bottom: 0;
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

        /* Table styling - removed compact overrides to use standard styling */

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
          
          .chart-row-three {
            grid-template-columns: 1fr;
          }
          
          .chart-row-full {
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

      {/* Retention Detail Modal */}
      {showDetailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            maxWidth: '98vw',
            maxHeight: '90vh',
            width: '1600px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }} dangerouslySetInnerHTML={{ __html: getChartIcon('MEMBER ENGAGEMENT ANALYSIS') }} />
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0
                }}>{modalTitle}</h2>
              </div>
              <button 
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#6b7280',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
                onClick={() => setShowDetailModal(false)}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflow: 'hidden',
              padding: '0'
            }}>
              {/* Member Details Table */}
              <div style={{
                padding: '16px 24px'
              }}>
                <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    tableLayout: 'auto'
                  }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr style={{ backgroundColor: '#374151' }}>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          color: '#ffffff', 
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: '1px solid #4b5563',
                          backgroundColor: '#374151',
                          whiteSpace: 'nowrap'
                        }}>USER NAME</th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          color: '#ffffff', 
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: '1px solid #4b5563',
                          backgroundColor: '#374151',
                          whiteSpace: 'nowrap'
                        }}>UNIQUE CODE</th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'center', 
                          color: '#ffffff', 
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: '1px solid #4b5563',
                          backgroundColor: '#374151',
                          whiteSpace: 'nowrap'
                        }}>ACTIVE DAYS</th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'center', 
                          color: '#ffffff', 
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: '1px solid #4b5563',
                          backgroundColor: '#374151',
                          whiteSpace: 'nowrap'
                        }}>DEPOSIT CASES</th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right', 
                          color: '#ffffff', 
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: '1px solid #4b5563',
                          backgroundColor: '#374151',
                          whiteSpace: 'nowrap'
                        }}>DEPOSIT AMOUNT</th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'center', 
                          color: '#ffffff', 
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: '1px solid #4b5563',
                          backgroundColor: '#374151',
                          whiteSpace: 'nowrap'
                        }}>WITHDRAW CASES</th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right', 
                          color: '#ffffff', 
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: '1px solid #4b5563',
                          backgroundColor: '#374151',
                          whiteSpace: 'nowrap'
                        }}>WITHDRAW AMOUNT</th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right', 
                          color: '#ffffff', 
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: '1px solid #4b5563',
                          backgroundColor: '#374151',
                          whiteSpace: 'nowrap'
                        }}>GGR</th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right', 
                          color: '#ffffff', 
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderRight: '1px solid #4b5563',
                          backgroundColor: '#374151',
                          whiteSpace: 'nowrap'
                        }}>BONUS</th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'center', 
                          color: '#ffffff', 
                          fontWeight: '600',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          backgroundColor: '#374151',
                          whiteSpace: 'nowrap'
                        }}>LAST ACTIVE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalMembers.map((member, index) => (
                        <tr key={`${member.userkey}-${index}`} 
                            style={{ 
                              backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                              borderBottom: '1px solid #e5e7eb',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                              height: '32px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                              e.currentTarget.style.transform = 'scale(1.01)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}>
                          <td style={{ 
                            textAlign: 'left', 
                            padding: '10px 16px', 
                            whiteSpace: 'nowrap',
                            fontWeight: '500',
                            color: '#374151',
                            borderRight: '1px solid #e5e7eb'
                          }}>
                            {member.userName || member.userkey}
                          </td>
                          <td style={{ 
                            textAlign: 'left', 
                            padding: '10px 16px', 
                            whiteSpace: 'nowrap',
                            fontWeight: '500',
                            color: '#374151',
                            borderRight: '1px solid #e5e7eb'
                          }}>
                            {member.uniqueCode || member.userkey}
                          </td>
                          <td style={{ 
                            textAlign: 'center', 
                            padding: '10px 16px',
                            fontWeight: '600',
                            color: '#1f2937',
                            borderRight: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatInteger(member.activeDays)}
                          </td>
                          <td style={{ 
                            textAlign: 'center', 
                            padding: '10px 16px',
                            fontWeight: '600',
                            color: '#1f2937',
                            borderRight: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatInteger(member.depositCases || 0)}
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            padding: '10px 16px',
                            fontWeight: '600',
                            color: '#1f2937',
                            borderRight: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatCurrency(member.depositAmount, selectedCurrency)}
                          </td>
                          <td style={{ 
                            textAlign: 'center', 
                            padding: '10px 16px',
                            fontWeight: '600',
                            color: '#1f2937',
                            borderRight: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatInteger(member.withdrawCases || 0)}
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            padding: '10px 16px',
                            fontWeight: '600',
                            color: '#1f2937',
                            borderRight: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatCurrency(member.withdrawAmount || 0, selectedCurrency)}
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            padding: '10px 16px',
                            fontWeight: '600',
                            color: '#1f2937',
                            borderRight: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatCurrency((member.depositAmount || 0) - (member.withdrawAmount || 0), selectedCurrency)}
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            padding: '10px 16px',
                            fontWeight: '600',
                            color: '#1f2937',
                            borderRight: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatCurrency(member.bonus || 0, selectedCurrency)}
                          </td>
                          <td style={{ 
                            textAlign: 'center', 
                            padding: '10px 16px',
                            fontWeight: '500',
                            color: '#6b7280',
                            whiteSpace: 'nowrap'
                          }}>
                            {member.lastActiveDate || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {modalMembers.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '60px',
                      color: '#6b7280',
                      fontSize: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      margin: '16px'
                    }}>
                      No members found for this retention category.
                    </div>
                  )}
                </div>
              </div>

              {/* Summary KPI Cards - Compact */}
              {modalMembers.length > 0 && (
                <div style={{
                  padding: '12px 24px',
                  borderTop: '1px solid #e5e7eb',
                  backgroundColor: '#f8fafc',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '8px'
                }}>
                  <div style={{
                    backgroundColor: '#eff6ff',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #dbeafe',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Members</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', marginTop: '2px' }}>{formatNumber(modalMembers.length)}</div>
                  </div>
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #bbf7d0',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Deposit</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#166534', marginTop: '2px' }}>
                      {formatCurrency(
                        modalMembers.reduce((sum, member) => sum + (member.depositAmount || 0), 0),
                        selectedCurrency
                      )}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#fef2f2',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Withdraw</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#991b1b', marginTop: '2px' }}>
                      {formatCurrency(
                        modalMembers.reduce((sum, member) => sum + (member.withdrawAmount || 0), 0),
                        selectedCurrency
                      )}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#faf5ff',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #e9d5ff',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total GGR</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#5b21b6', marginTop: '2px' }}>
                      {formatCurrency(
                        modalMembers.reduce((sum, member) => sum + ((member.depositAmount || 0) - (member.withdrawAmount || 0)), 0),
                        selectedCurrency
                      )}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#fef3c7',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #fde68a',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Bonus</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#92400e', marginTop: '2px' }}>
                      {formatCurrency(
                        modalMembers.reduce((sum, member) => sum + (member.bonus || 0), 0),
                        selectedCurrency
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer - Export & Close Buttons */}
              <div style={{
                padding: '12px 24px',
                borderTop: '1px solid #e5e7eb',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                                  <button 
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#059669';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#10b981';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onClick={() => {
                    // Export data to CSV
                    if (modalMembers.length > 0) {
                      const csvContent = exportToCSV(modalMembers, modalTitle);
                      downloadCSV(csvContent, `${modalTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
                    }
                  }}
                >
                  📊 Export Data
                </button>
                
                <button 
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#4b5563';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#6b7280';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 