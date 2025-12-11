'use client'

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Layout from '@/components/Layout';
import Frame from '@/components/Frame';
import SubheaderNotice from '@/components/SubheaderNotice';
import { LineSlicer } from '@/components/slicers';
import StatCard from '@/components/StatCard';
import DualKPICard from '@/components/DualKPICard';
import StandardLoadingSpinner from '@/components/StandardLoadingSpinner';
import { getChartIcon } from '@/lib/CentralIcon';
import { formatCurrencyKPI, formatIntegerKPI, formatMoMChange, formatNumericKPI, formatPercentageKPI } from '@/lib/formatHelpers';
import { getAllUSCKPIsWithMoM } from '@/lib/USCDailyAverageAndMoM';
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

export default function USCOverviewPage() {
  const [kpiData, setKpiData] = useState<any>(null);
  const [momData, setMomData] = useState<any>(null);
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions>({
    years: [],
    months: [],
    currencies: [],
    lines: [],
    defaults: { year: '', month: '', line: '' }
  });
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCurrency] = useState('USC'); // Locked to USC
  const [selectedLine, setSelectedLine] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [kpiLoaded, setKpiLoaded] = useState(false);
  const [chartsLoaded, setChartsLoaded] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false); // ✅ Track initial load

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
  
  // Previous month data for DC User MoM calculation
  const [previousMonthData, setPreviousMonthData] = useState<{
    depositCases: number;
    activeMember: number;
  } | null>(null);

  // Format currency with M/K (Million/Thousand) for DualCard
  const formatCurrencyMK = (value: number | null | undefined, currency: string): string => {
    if (value === null || value === undefined || isNaN(value) || value === 0) {
      let symbol: string;
      switch (currency) {
        case 'MYR': symbol = 'RM'; break;
        case 'SGD': symbol = 'SGD'; break;
        case 'USC': symbol = 'USD'; break;
        case 'ALL': symbol = 'RM'; break;
        default: symbol = 'RM';
      }
      return `${symbol} 0`;
    }

    let symbol: string;
    switch (currency) {
      case 'MYR': symbol = 'RM'; break;
      case 'SGD': symbol = 'SGD'; break;
      case 'USC': symbol = 'USD'; break;
      case 'ALL': symbol = 'RM'; break;
      default: symbol = 'RM';
    }

    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      return `${symbol} ${(absValue / 1000000).toFixed(1)}M`;
    }
    if (absValue >= 1000) {
      return `${symbol} ${(absValue / 1000).toFixed(1)}K`;
    }
    return `${symbol} ${absValue.toFixed(0)}`;
  };

  // Format numeric with currency symbol and denom (thousand separator) for Revenue Metrics
  const formatNumericWithCurrency = (value: number | null | undefined, currency: string): string => {
    if (value === null || value === undefined || isNaN(value)) return '0.00';
    
    let symbol: string;
    switch (currency) {
      case 'MYR': symbol = 'RM'; break;
      case 'SGD': symbol = 'SGD'; break;
      case 'USC': symbol = 'USD'; break;
      case 'ALL': symbol = 'RM'; break;
      default: symbol = 'RM';
    }
    
    // Format dengan thousand separator dan 2 decimal (denom standard)
    const formattedValue = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(value));
    
    const sign = value < 0 ? '-' : '';
    return `${symbol} ${sign}${formattedValue}`;
  };
  
  // Load slicer options on component mount
  useEffect(() => {
    const loadSlicerOptions = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        // Get user's allowed brands from localStorage
        const userStr = localStorage.getItem('nexmax_user');
        const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null;

        const response = await fetch('/api/usc-overview/slicer-options', {
          headers: {
            'x-user-allowed-brands': JSON.stringify(allowedBrands)
          },
          cache: 'no-store' // ✅ Prevent caching
        });
        const result = await response.json();

        if (result.success) {
          console.log('🔍 [USC Overview CLIENT] Slicer data received from API:', {
            years: result.data.years,
            monthsCount: result.data.months?.length,
            monthsSample: result.data.months?.slice(0, 5)
          });
          
          setSlicerOptions(result.data);
          setSelectedYear(result.data.defaults.year);
          setSelectedMonth(result.data.defaults.month);
          setSelectedLine(result.data.defaults.line);
          // ✅ DON'T set isLoading false here - let KPI/Chart load complete first!
        } else {
          setLoadError('Failed to load slicer options');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading slicer options:', error);
        setLoadError('Failed to load slicer options');
        setIsLoading(false);
      }
    };

    loadSlicerOptions();
  }, []);

  // ✅ Function to load KPI data (can be called manually or automatically)
  const loadKPIData = async () => {
    if (!selectedYear || !selectedMonth || !selectedLine) return;

    try {
      setIsLoading(true);
      setKpiLoaded(false);
      setChartsLoaded(false);
      setLoadError(null);
      
      logger.log('🔄 [USC Overview] Loading KPI data using STANDARD LOGIC...');

      // Use STANDARD LOGIC FILE - getAllUSCKPIsWithMoM
      const result = await getAllUSCKPIsWithMoM(selectedYear, selectedMonth, selectedLine);

      setKpiData(result.current);
      setMomData(result.mom);
      setDailyAverages(result.dailyAverage);
      
      // Calculate previous month data for DC User MoM
      // DC User = depositCases / activeMember
      // Previous DC User = previousDepositCases / previousActiveMember
      // We can reverse calculate from MoM percentages
      const depositCasesMoM = result.mom.depositCases || 0
      const activeMemberMoM = result.mom.activeMember || 0
      
      // Reverse calculate previous values from MoM
      // MoM = ((current - previous) / previous) * 100
      // previous = current / (1 + MoM/100)
      // Handle edge case: if MoM = -100, then 1 + MoM/100 = 0 (division by zero)
      // If MoM < -100, previous becomes negative (invalid)
      const calculatePrevious = (current: number, mom: number): number => {
        if (mom === 0) return current
        const denominator = 1 + (mom / 100)
        // If denominator is 0 or negative, we can't reverse calculate accurately
        // Return a fallback value (assume no change)
        if (denominator <= 0) return current
        return current / denominator
      }
      
      const previousDepositCases = calculatePrevious(result.current.depositCases, depositCasesMoM)
      const previousActiveMember = calculatePrevious(result.current.activeMember, activeMemberMoM)
      
      setPreviousMonthData({
        depositCases: previousDepositCases,
        activeMember: previousActiveMember
      });
      
      setKpiLoaded(true);

      logger.log('✅ [USC Overview] KPI data loaded using STANDARD LOGIC');

    } catch (error) {
      console.error('Error loading KPI data:', error);
      setLoadError('Failed to load KPI data. Please try again.');
      setIsLoading(false);
    }
  };

  // ✅ Auto-load KPI data ONCE when defaults are set (initial load only)
  useEffect(() => {
    if (!initialLoadDone && selectedYear && selectedMonth && selectedLine) {
      console.log('✅ [USC Overview] Initial load with defaults:', { selectedYear, selectedMonth, selectedLine });
      setTimeout(() => {
        loadKPIData();
        loadChartData();
        setInitialLoadDone(true);
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, selectedLine, initialLoadDone]);

  // Helper functions removed - now using STANDARD LOGIC FILE

  // ✅ Function to load Chart data (can be called manually or automatically)
  const loadChartData = async () => {
    if (!selectedYear || !selectedLine) return;

    try {
      setChartError(null);
      
      console.log('🔄 [USC Overview] Loading Chart data (MONTHLY for entire year)...');
      
      // Get user's allowed brands from localStorage
      const userStr = localStorage.getItem('nexmax_user');
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null;
      
      // Get chart data from MV table (pre-aggregated)
      const chartResponse = await fetch(`/api/usc-overview/chart-data?line=${selectedLine}&year=${selectedYear}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      });
      const chartResult = await chartResponse.json();
      
      console.log('📊 [USC Overview] Chart API Response:', chartResult);
      
      if (!chartResult.success) {
        throw new Error('Failed to fetch chart data');
      }
      
      const monthlyData = chartResult.monthlyData;
      
      console.log('📊 [USC Overview] Monthly data from MV:', monthlyData);
      
      // Debug hold_percentage values
      const holdPercentageDebug = Object.keys(monthlyData).map(month => ({
        month,
        hold_percentage: monthlyData[month].hold_percentage,
        conversion_rate: monthlyData[month].conversion_rate,
        net_profit: monthlyData[month].net_profit,
        valid_amount: monthlyData[month].valid_amount
      }));
      console.log('🔍 [USC Overview] Hold Percentage Debug:', holdPercentageDebug);
      
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
            depositWithdrawCasesTrend: {
              series: [
                { name: 'Deposit Cases', data: sortedMonths.map(month => monthlyData[month].deposit_cases), color: '#3B82F6' },
                { name: 'Withdraw Cases', data: sortedMonths.map(month => monthlyData[month].withdraw_cases), color: '#F97316' }
              ],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            
            // ROW 4: Double Bar Charts
            depositWithdrawTrend: {
              series: [
                { name: 'Deposit Amount', data: sortedMonths.map(month => monthlyData[month].deposit_amount), color: '#3B82F6' },
                { name: 'Withdraw Amount', data: sortedMonths.map(month => monthlyData[month].withdraw_amount), color: '#F97316' }
              ],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            netProfitTrend: {
              series: [{ name: 'Net Profit', data: sortedMonths.map(month => monthlyData[month].net_profit) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            
            // ROW 5: Single Line Charts
            atvTrend: {
              series: [{ name: 'Average Transaction Value', data: sortedMonths.map(month => monthlyData[month].atv) }],
              categories: sortedMonths.map(month => month.substring(0, 3))
            },
            purchaseFrequencyTrend: {
              series: [{ name: 'DC User', data: sortedMonths.map(month => monthlyData[month].purchase_frequency) }],
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
            }
          };
          
        setChartData(preparedChartData);
        setChartsLoaded(true);
      } else {
        setChartsLoaded(true); // Even if no data, mark as loaded
      }
      
      console.log('✅ [USC Overview] Chart data loaded successfully (MONTHLY)');

    } catch (error) {
      console.error('Error loading chart data:', error);
      setChartError('Failed to load chart data.');
      setChartsLoaded(true); // Mark as loaded even on error
    }
  };

  // ✅ Manual reload function (triggered by Search button)
  const handleApplyFilters = () => {
    setKpiLoaded(false);
    setChartsLoaded(false);
    loadKPIData();
    loadChartData();
  };
  
  // ✅ ONLY set isLoading false when BOTH KPI and Charts are ready!
  useEffect(() => {
    if (kpiLoaded && chartsLoaded) {
      setIsLoading(false);
    }
  }, [kpiLoaded, chartsLoaded]);


  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        <SubheaderNotice
          show={false}
          label="NOTICE"
          message="Verification in progress — Please allow until 14:00 GMT+7 for adjustment validation to ensure 100% accurate data."
        />
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
            {slicerOptions.years.map((year: string) => (
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
            {slicerOptions.months
              .filter((month: any) => {
                if (month.value === 'ALL') return true;
                if (!selectedYear) return true;
                return month.years && month.years.includes(selectedYear);
              })
              .map((month: any) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
          </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <LineSlicer 
            lines={slicerOptions.lines}
            selectedLine={selectedLine}
            onLineChange={setSelectedLine}
          />
        </div>

        {/* ✅ SEARCH BUTTON */}
        <button 
          onClick={handleApplyFilters}
          disabled={isLoading}
          className={`export-button ${isLoading ? 'disabled' : ''}`}
          style={{ 
            backgroundColor: '#10b981',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isLoading ? 'Loading...' : 'Search'}
        </button>
      </div>
    </div>
  );

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
          {/* Loading State - Standard Spinner */}
          {isLoading && <StandardLoadingSpinner message="Loading USC Overview" />}

          {/* Error State */}
          {loadError && !isLoading && (
            <div className="error-container">
              <p>Error: {loadError}</p>
            </div>
          )}

          {/* Content - Only show when NOT loading and NO error */}
          {!isLoading && !loadError && (
          <>
          {/* ROW 1: KPI CARDS (6 Dual Card) - Ordered */}
          <div className="kpi-row">
            {/* 1. Member Metrics - DualCard */}
            <DualKPICard
              title="MEMBER METRICS"
              icon="Active Member"
              kpi1={{
                label: "MAM",
                value: formatIntegerKPI(kpiData?.activeMember || 0),
                comparison: {
                  percentage: formatMoMChange(momData?.activeMember || 0),
                  isPositive: Boolean(momData?.activeMember && momData.activeMember > 0)
                }
              }}
              kpi2={{
                label: "PURE MAM",
                value: formatIntegerKPI(kpiData?.pureMember || 0),
                comparison: {
                  percentage: formatMoMChange(momData?.pureMember || 0),
                  isPositive: Boolean(momData?.pureMember && momData.pureMember > 0)
                }
              }}
            />
            
            {/* 2. Revenue Metrics - DualCard */}
            <DualKPICard
              title="REVENUE METRICS"
              icon="Net Profit"
              kpi1={{
                label: "GGR",
                value: formatCurrencyMK(kpiData?.grossGamingRevenue || 0, selectedCurrency),
                comparison: {
                  percentage: formatMoMChange(momData?.grossGamingRevenue || 0),
                  isPositive: Boolean(momData?.grossGamingRevenue && momData.grossGamingRevenue > 0)
                }
              }}
              kpi2={{
                label: "NET PROFIT",
                value: formatCurrencyMK(kpiData?.netProfit || 0, selectedCurrency),
                comparison: {
                  percentage: formatMoMChange(momData?.netProfit || 0),
                  isPositive: Boolean(momData?.netProfit && momData.netProfit > 0)
                }
              }}
            />
            
            {/* 3. Transaction IN - DualCard */}
            <DualKPICard
              title="TRANSACTION IN"
              icon="Deposit Amount"
              kpi1={{
                label: "DA",
                value: formatCurrencyMK(kpiData?.depositAmount || 0, selectedCurrency),
                comparison: {
                  percentage: formatMoMChange(momData?.depositAmount || 0),
                  isPositive: Boolean(momData?.depositAmount && momData.depositAmount > 0)
                }
              }}
              kpi2={{
                label: "DC",
                value: formatIntegerKPI(kpiData?.depositCases || 0),
                comparison: {
                  percentage: formatMoMChange(momData?.depositCases || 0),
                  isPositive: Boolean(momData?.depositCases && momData.depositCases > 0)
                }
              }}
            />
            
            {/* 4. Transaction OUT - DualCard */}
            <DualKPICard
              title="TRANSACTION OUT"
              icon="Withdraw Amount"
              kpi1={{
                label: "WA",
                value: formatCurrencyMK(kpiData?.withdrawAmount || 0, selectedCurrency),
                comparison: {
                  percentage: formatMoMChange(momData?.withdrawAmount || 0),
                  isPositive: Boolean(momData?.withdrawAmount && momData.withdrawAmount > 0)
                }
              }}
              kpi2={{
                label: "WC",
                value: formatIntegerKPI(kpiData?.withdrawCases || 0),
                comparison: {
                  percentage: formatMoMChange(momData?.withdrawCases || 0),
                  isPositive: Boolean(momData?.withdrawCases && momData.withdrawCases > 0)
                }
              }}
            />
            
            {/* 5. User Metrics - DualCard */}
            <DualKPICard
              title="USER METRICS"
              icon="GGR User"
              kpi1={{
                label: "DA USER",
                value: formatCurrencyKPI(kpiData?.depositAmountUser || 0, selectedCurrency),
                comparison: {
                  percentage: formatMoMChange(momData?.depositAmountUser || 0),
                  isPositive: Boolean(momData?.depositAmountUser && momData.depositAmountUser > 0)
                }
              }}
              kpi2={{
                label: "GGR USER",
                value: formatCurrencyKPI(kpiData?.ggrPerUser || 0, selectedCurrency),
                comparison: {
                  percentage: formatMoMChange(momData?.ggrPerUser || 0),
                  isPositive: Boolean(momData?.ggrPerUser && momData.ggrPerUser > 0)
                }
              }}
            />
            
            {/* 6. Transaction Metrics - DualCard */}
            <DualKPICard
              title="TRANSACTION METRICS"
              icon="Average Transaction Value"
              kpi1={{
                label: "ATV",
                value: formatCurrencyKPI(kpiData?.avgTransactionValue || 0, selectedCurrency),
                comparison: {
                  percentage: formatMoMChange(momData?.avgTransactionValue || 0),
                  isPositive: Boolean(momData?.avgTransactionValue && momData.avgTransactionValue > 0)
                }
              }}
              kpi2={{
                label: "DC USER",
                value: formatNumericKPI(
                  kpiData?.activeMember > 0 
                    ? (kpiData?.depositCases || 0) / (kpiData?.activeMember || 1)
                    : 0
                ),
                comparison: {
                  percentage: formatMoMChange(
                    (() => {
                      // Calculate DC User MoM accurately
                      const currentDCUser = kpiData?.activeMember > 0 
                        ? (kpiData?.depositCases || 0) / (kpiData?.activeMember || 1)
                        : 0
                      
                      // If no previous month data or invalid, return 0
                      if (!previousMonthData || previousMonthData.activeMember <= 0) {
                        return 0
                      }
                      
                      const previousDCUser = previousMonthData.depositCases / previousMonthData.activeMember
                      
                      // Calculate MoM: ((current - previous) / previous) * 100
                      // Handle division by zero
                      if (previousDCUser === 0) {
                        return currentDCUser > 0 ? 100 : 0
                      }
                      
                      // Use Math.abs for denominator to handle edge cases (same as calculateUSCMoM)
                      const momValue = ((currentDCUser - previousDCUser) / Math.abs(previousDCUser)) * 100
                      return isNaN(momValue) || !isFinite(momValue) ? 0 : momValue
                    })()
                  ),
                  isPositive: (() => {
                    const currentDCUser = kpiData?.activeMember > 0 
                      ? (kpiData?.depositCases || 0) / (kpiData?.activeMember || 1)
                      : 0
                    
                    // If no previous month data or invalid, return false
                    if (!previousMonthData || previousMonthData.activeMember <= 0) {
                      return false
                    }
                    
                    const previousDCUser = previousMonthData.depositCases / previousMonthData.activeMember
                    return currentDCUser > previousDCUser
                  })()
                }
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
              showDataLabels={false}
              chartIcon={getChartIcon('Deposit Amount')}
            />
            <LineChart
              series={chartData?.ggrUserTrend?.series || []}
              categories={chartData?.ggrUserTrend?.categories || []}
              title="GGR USER TREND"
              currency={selectedCurrency}
              hideLegend={true}
              showDataLabels={false}
              color="#F97316"
              chartIcon={getChartIcon('Net Profit')}
            />
          </div>

          {/* ROW 3: ACTIVE vs PURE MEMBER, DEPOSIT CASES vs WITHDRAW CASES (Double Bar Charts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <BarChart
              series={chartData?.activePureMemberTrend?.series || []}
              categories={chartData?.activePureMemberTrend?.categories || []}
              title="ACTIVE MEMBER VS PURE MEMBER TREND"
              currency="MEMBER"
              chartIcon={getChartIcon('Active Member')}
              showDataLabels={false}
              customLegend={[
                { label: 'Active Member', color: '#3B82F6' },
                { label: 'Pure Member', color: '#F97316' }
              ]}
            />
            <BarChart
              series={chartData?.depositWithdrawCasesTrend?.series || []}
              categories={chartData?.depositWithdrawCasesTrend?.categories || []}
              title="DEPOSIT CASES VS WITHDRAW CASES TREND"
              currency="CASES"
              chartIcon={getChartIcon('Deposit Amount')}
              showDataLabels={false}
              customLegend={[
                { label: 'Deposit Cases', color: '#3B82F6' },
                { label: 'Withdraw Cases', color: '#F97316' }
              ]}
            />
          </div>

          {/* ROW 4: DEPOSIT vs WITHDRAW (Double Bar Chart), NET PROFIT (Single Line Chart) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <BarChart
              series={chartData?.depositWithdrawTrend?.series || []}
              categories={chartData?.depositWithdrawTrend?.categories || []}
              title="DEPOSIT AMOUNT VS WITHDRAW AMOUNT TREND"
              currency={selectedCurrency}
              chartIcon={getChartIcon('Deposit Amount')}
              showDataLabels={false}
              customLegend={[
                { label: 'Deposit Amount', color: '#3B82F6' },
                { label: 'Withdraw Amount', color: '#F97316' }
              ]}
            />
            <LineChart
              series={chartData?.netProfitTrend?.series || []}
              categories={chartData?.netProfitTrend?.categories || []}
              title="NET PROFIT TREND"
              currency={selectedCurrency}
              hideLegend={true}
              showDataLabels={false}
              color="#3B82F6"
              chartIcon={getChartIcon('Net Profit')}
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
              showDataLabels={false}
              color="#3B82F6"
              chartIcon={getChartIcon('Average Transaction Value')}
            />
            <LineChart
              series={chartData?.purchaseFrequencyTrend?.series || []}
              categories={chartData?.purchaseFrequencyTrend?.categories || []}
              title="DC USER TREND"
              currency={selectedCurrency}
              hideLegend={true}
              showDataLabels={false}
              color="#F97316"
              chartIcon={getChartIcon('Deposit Amount')}
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
              showDataLabels={false}
              color="#3B82F6"
              chartIcon={getChartIcon('Winrate')}
            />
            <LineChart
              series={chartData?.withdrawalRateTrend?.series || []}
              categories={chartData?.withdrawalRateTrend?.categories || []}
              title="WITHDRAWAL RATE TREND"
              currency="PERCENTAGE"
              hideLegend={true}
              showDataLabels={false}
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
              showDataLabels={false}
              color="#3B82F6"
              chartIcon={getChartIcon('New Register')}
            />
            <BarChart
              series={chartData?.registerDepositorTrend?.series || []}
              categories={chartData?.registerDepositorTrend?.categories || []}
              title="NEW REGISTER VS NEW DEPOSITOR TREND"
              currency="MEMBER"
              chartIcon={getChartIcon('New Register')}
              showDataLabels={false}
              customLegend={[
                { label: 'New Register', color: '#3B82F6' },
                { label: 'New Depositor', color: '#F97316' }
              ]}
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
          </>
          )}

        </div>
      </Frame>

    </Layout>
  );
}
