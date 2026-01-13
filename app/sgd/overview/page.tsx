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
  const [selectedCurrency] = useState('SGD'); // Locked to SGD
  const [selectedLine, setSelectedLine] = useState('');
  const [isDailyMode, setIsDailyMode] = useState(true); // ✅ Toggle Daily Mode - Default ON
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
        case 'ALL': symbol = 'RM'; break;
        default: symbol = 'RM';
      }
      return `${symbol} 0`;
    }

    let symbol: string;
    switch (currency) {
      case 'MYR': symbol = 'RM'; break;
      case 'SGD': symbol = 'SGD'; break;
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
        let allowedBrands: string[] | null = null;
        try {
          const userStr = localStorage.getItem('nexmax_user');
          if (userStr) {
            allowedBrands = JSON.parse(userStr).allowed_brands || null;
          }
        } catch (parseError) {
          console.warn('⚠️ [SGD Overview] Failed to parse user data from localStorage:', parseError);
          allowedBrands = null;
        }

        const response = await fetch('/api/sgd-overview/slicer-options', {
          headers: {
            'x-user-allowed-brands': JSON.stringify(allowedBrands)
          },
          cache: 'no-store' // ✅ Prevent caching
        });
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
      
      logger.log('🔄 [SGD Overview] Loading KPI data using STANDARD LOGIC...');

      // Use STANDARD LOGIC FILE - getAllSGDKPIsWithMoM
      const result = await getAllSGDKPIsWithMoM(selectedYear, selectedMonth, selectedLine);

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

      logger.log('✅ [SGD Overview] KPI data loaded using STANDARD LOGIC');

    } catch (error) {
      console.error('Error loading KPI data:', error);
      setLoadError('Failed to load KPI data. Please try again.');
      setIsLoading(false);
    }
  };

  // ✅ Initial load ONCE when page first loads (auto-load daily data)
  useEffect(() => {
    // Only load once when page first mounts and slicers are ready
    if (!initialLoadDone && selectedYear && selectedMonth && selectedLine) {
      console.log('✅ [SGD Overview] Initial load (first time):', { selectedYear, selectedMonth, selectedLine });
      // Auto-load daily data on first page load (toggle default ON)
      // Note: isLoading will be set to false by the useEffect that watches kpiLoaded and chartsLoaded
      loadKPIData();
      loadChartData(true); // true = daily mode for initial load (default active)
      setInitialLoadDone(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, selectedLine, initialLoadDone]);
  
  // ✅ NO AUTO-RELOAD after initial load: All subsequent changes require Search button click

  // Helper functions removed - now using STANDARD LOGIC FILE

  // ✅ Function to load Chart data (can be called manually or automatically)
  // ✅ Use current isDailyMode value directly, not from closure
  const loadChartData = async (forceDailyMode?: boolean) => {
    // ✅ Use forceDailyMode if provided, otherwise use current state
    const currentDailyMode = forceDailyMode !== undefined ? forceDailyMode : isDailyMode;
    
    if (!selectedYear || !selectedLine) {
      console.warn('⚠️ [SGD Overview] Cannot load chart: missing year or line', { selectedYear, selectedLine });
      return;
    }
    // ✅ Daily mode requires month selection
    if (currentDailyMode && !selectedMonth) {
      console.warn('⚠️ [SGD Overview] Cannot load daily chart: month not selected', { currentDailyMode, selectedMonth });
      return;
    }

    try {
      setChartError(null);
      
      const period = currentDailyMode ? 'daily' : 'monthly';
      console.log(`🔄 [SGD Overview] ========== LOADING CHART DATA ==========`);
      console.log(`🔄 [SGD Overview] Mode: ${period.toUpperCase()}${currentDailyMode ? ` | Month: ${selectedMonth}` : ' | Entire Year'}`);
      console.log(`📋 [SGD Overview] Slicer values:`, {
        selectedYear,
        selectedMonth,
        selectedLine,
        isDailyMode: currentDailyMode, // ✅ Use currentDailyMode
        period,
        forceDailyMode: forceDailyMode !== undefined ? forceDailyMode : 'not provided'
      });
      
      // Get user's allowed brands from localStorage
      let allowedBrands: string[] | null = null;
      try {
        const userStr = localStorage.getItem('nexmax_user');
        if (userStr) {
          allowedBrands = JSON.parse(userStr).allowed_brands || null;
        }
      } catch (parseError) {
        console.warn('⚠️ [SGD Overview] Failed to parse user data from localStorage:', parseError);
        allowedBrands = null;
      }
      
      // ✅ SIMPLE LOGIC: When toggle daily ON, fetch from blue_whale_sgd table based on active month slicer
      let apiUrl = `/api/sgd-overview/chart-data?line=${selectedLine}&year=${selectedYear}&period=${period}`;
      if (currentDailyMode && selectedMonth) {
        apiUrl += `&month=${selectedMonth}`; // ✅ Send month from slicer - CRITICAL: Use currentDailyMode, not isDailyMode!
      }
      
      console.log('🔗 [SGD Overview] API URL (FINAL):', apiUrl);
      
      console.log(`🔗 [SGD Overview] API URL:`, apiUrl);
      
      // Get chart data from MV table (pre-aggregated) or daily table
      const chartResponse = await fetch(apiUrl, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      });
      
      // ✅ Check HTTP status first
      if (!chartResponse.ok) {
        const errorText = await chartResponse.text();
        console.error('❌ [SGD Overview] HTTP Error:', {
          status: chartResponse.status,
          statusText: chartResponse.statusText,
          errorText,
          apiUrl,
          currentDailyMode
        });
        throw new Error(`HTTP ${chartResponse.status}: ${chartResponse.statusText}`);
      }
      
      const chartResult = await chartResponse.json();
      
      console.log('📊 [SGD Overview] Chart API Response:', {
        success: chartResult.success,
        hasDailyData: !!chartResult.dailyData,
        hasMonthlyData: !!chartResult.monthlyData,
        currentDailyMode, // ✅ Use currentDailyMode, not isDailyMode state
        isDailyMode, // Also log state for comparison
        dailyDataKeys: chartResult.dailyData ? Object.keys(chartResult.dailyData).length : 0,
        monthlyDataKeys: chartResult.monthlyData ? Object.keys(chartResult.monthlyData).length : 0,
        dailyDataSample: chartResult.dailyData ? Object.keys(chartResult.dailyData).slice(0, 3) : null,
        monthlyDataSample: chartResult.monthlyData ? Object.keys(chartResult.monthlyData).slice(0, 3) : null,
        error: chartResult.error || null,
        message: chartResult.message || null
      });
      
      if (!chartResult.success) {
        throw new Error(chartResult.message || chartResult.error || 'Failed to fetch chart data');
      }
      
      // ✅ CRITICAL: Check if data exists for the requested period
      // When currentDailyMode is true, MUST use dailyData, NOT monthlyData - NO FALLBACK!
      let data: any = null;
      
      console.log('🔍 [SGD Overview] Data selection check:', {
        currentDailyMode: currentDailyMode, // ✅ Use currentDailyMode
        isDailyMode: isDailyMode, // Also log state value for comparison
        hasDailyData: !!chartResult.dailyData,
        hasMonthlyData: !!chartResult.monthlyData,
        dailyDataKeys: chartResult.dailyData ? Object.keys(chartResult.dailyData).length : 0,
        monthlyDataKeys: chartResult.monthlyData ? Object.keys(chartResult.monthlyData).length : 0
      });
      
      if (currentDailyMode === true) {
        // ✅ DAILY MODE: MUST use dailyData only
        if (!chartResult.dailyData || Object.keys(chartResult.dailyData).length === 0) {
          console.error('❌ [SGD Overview] isDailyMode is TRUE but dailyData is missing or empty!', {
            hasDailyData: !!chartResult.dailyData,
            dailyDataKeys: chartResult.dailyData ? Object.keys(chartResult.dailyData).length : 0,
            hasMonthlyData: !!chartResult.monthlyData,
            chartResult
          });
          throw new Error('Daily data not available. Please ensure month is selected and data exists.');
        }
        // ✅ FORCE use dailyData - NO FALLBACK to monthlyData!
        data = chartResult.dailyData;
        console.log('✅ [SGD Overview] FORCED to use DAILY data (toggle is ON):', {
          dateCount: Object.keys(data).length,
          sampleDates: Object.keys(data).slice(0, 5),
          firstDate: Object.keys(data).sort()[0],
          lastDate: Object.keys(data).sort().reverse()[0]
        });
      } else {
        // ✅ MONTHLY MODE: Use monthlyData
        if (!chartResult.monthlyData || Object.keys(chartResult.monthlyData).length === 0) {
          console.error('❌ [SGD Overview] isDailyMode is FALSE but monthlyData is missing or empty!');
          throw new Error('Monthly data not available');
        }
        data = chartResult.monthlyData;
        console.log('✅ [SGD Overview] Using MONTHLY data (toggle is OFF):', {
          monthCount: Object.keys(data).length,
          sampleMonths: Object.keys(data).slice(0, 5)
        });
      }
      
      if (!data || Object.keys(data).length === 0) {
        console.error(`❌ [SGD Overview] Data is empty for ${currentDailyMode ? 'daily' : 'monthly'} mode`);
        throw new Error(`No ${currentDailyMode ? 'daily' : 'monthly'} data available`);
      }
      
      console.log(`📊 [SGD Overview] ${currentDailyMode ? 'Daily' : 'Monthly'} data:`, {
        keyCount: Object.keys(data).length,
        sampleKeys: Object.keys(data).slice(0, 5),
        sampleData: data[Object.keys(data)[0]]
      });
      
      if (Object.keys(data).length > 0) {
          // ✅ CRITICAL: Determine if data is daily or monthly based on key format
          // Daily data keys are dates (YYYY-MM-DD), monthly data keys are month names
          const firstKey = Object.keys(data)[0];
          const isDailyData = /^\d{4}-\d{2}-\d{2}$/.test(firstKey); // Check if key is date format
          
          console.log('🔍 [SGD Overview] ========== DATA TYPE DETECTION ==========');
          console.log('🔍 [SGD Overview] Data type detection:', {
            currentDailyMode: currentDailyMode, // ✅ Log currentDailyMode
            isDailyMode: isDailyMode, // Also log state for comparison
            firstKey: firstKey,
            isDailyData: isDailyData,
            dataKeysSample: Object.keys(data).slice(0, 10),
            allKeys: Object.keys(data),
            dataSource: currentDailyMode ? 'Should be dailyData' : 'Should be monthlyData'
          });
          
          // ✅ CRITICAL: If currentDailyMode is true, we MUST use daily format
          // Even if data looks like monthly, if toggle is ON, we should have daily data
          // If we have daily data (date format), use daily format
          // If we have monthly data but toggle is ON, something is wrong - log error
          const useDailyFormat = currentDailyMode === true && isDailyData === true;
          
          if (currentDailyMode === true && !isDailyData) {
            console.error('❌ [SGD Overview] CRITICAL ERROR: Toggle is ON but data is NOT daily format!', {
              currentDailyMode: currentDailyMode,
              isDailyMode: isDailyMode,
              isDailyData: isDailyData,
              firstKey: firstKey,
              dataKeys: Object.keys(data).slice(0, 10)
            });
            // Still try to use daily format if toggle is ON
          }
          
          console.log('🔍 [SGD Overview] Format decision:', {
            currentDailyMode: currentDailyMode,
            isDailyMode: isDailyMode,
            isDailyData: isDailyData,
            useDailyFormat: useDailyFormat,
            willUseDailyFormat: useDailyFormat || (currentDailyMode === true) // Force daily if toggle ON
          });
          
          // ✅ FORCE daily format if toggle is ON, regardless of data format detection
          const finalUseDailyFormat = currentDailyMode === true ? true : (isDailyData === true);
          
          // For monthly: sort months chronologically
          // For daily: sort dates chronologically
          let sortedKeys: string[];
          if (finalUseDailyFormat) {
            sortedKeys = Object.keys(data).sort((a, b) => {
              const dateA = new Date(a);
              const dateB = new Date(b);
              return dateA.getTime() - dateB.getTime();
            });
            console.log('✅ [SGD Overview] Sorted as DAILY dates:', sortedKeys.slice(0, 10));
          } else {
            const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
            sortedKeys = Object.keys(data).sort((a, b) => 
              monthOrder.indexOf(a) - monthOrder.indexOf(b)
            );
            console.log('✅ [SGD Overview] Sorted as MONTHLY months:', sortedKeys.slice(0, 10));
          }

          // Helper function to format categories (months or dates)
          const formatCategory = (key: string): string => {
            if (finalUseDailyFormat) {
              // ✅ CRITICAL: If toggle is ON, we MUST format as date, even if key looks like month name
              // Format date as "DD MMM" (e.g., "01 Jan")
              try {
                const date = new Date(key);
                if (isNaN(date.getTime())) {
                  // If date is invalid but toggle is ON, this is an error
                  console.error('❌ [SGD Overview] CRITICAL: Toggle ON but key is not a valid date:', key);
                  // Don't fallback - try to parse as date string first
                  // If key is "December", try to convert to date
                  if (key.includes('December') || key.includes('Dec')) {
                    console.warn('⚠️ [SGD Overview] Key appears to be month name, not date. This should not happen when toggle is ON.');
                  }
                  // Still try to format as date if possible
                  const dateStr = key.match(/\d{4}-\d{2}-\d{2}/)?.[0];
                  if (dateStr) {
                    const validDate = new Date(dateStr);
                    if (!isNaN(validDate.getTime())) {
                      const day = validDate.getDate().toString().padStart(2, '0');
                      const month = validDate.toLocaleString('en-US', { month: 'short' });
                      return `${day} ${month}`;
                    }
                  }
                  // Last resort: if toggle is ON, we should have date format, so this is an error
                  console.error('❌ [SGD Overview] Cannot format as date. Key:', key, 'Toggle ON but data format is wrong!');
                  return key; // Return as-is to show the problem
                }
                const day = date.getDate().toString().padStart(2, '0');
                const month = date.toLocaleString('en-US', { month: 'short' });
                return `${day} ${month}`;
              } catch (e) {
                console.error('❌ [SGD Overview] Error formatting date:', key, e);
                // Don't fallback - this is an error when toggle is ON
                return key; // Return as-is to show the problem
              }
            } else {
              // Format month as "MMM" (e.g., "Jan")
              return key.substring(0, 3);
            }
          };
          
          console.log('✅ [SGD Overview] Category format:', {
            useDailyFormat: finalUseDailyFormat,
            currentDailyMode: currentDailyMode,
            sampleCategories: sortedKeys.slice(0, 5).map(formatCategory),
            sampleKeys: sortedKeys.slice(0, 5)
          });

          // Create chart data from aggregated data (monthly or daily)
          // ✅ Use safe access with fallback to 0 for all fields
          const safeGet = (key: string, field: string): number => {
            return (data[key] && typeof data[key][field] === 'number') ? data[key][field] : 0;
          };
          
          const preparedChartData = {
            // ROW 2: Single Line Charts
            daUserTrend: {
              series: [{ name: 'DA User', data: sortedKeys.map(key => safeGet(key, 'da_user')) }],
              categories: sortedKeys.map(formatCategory)
            },
            ggrUserTrend: {
              series: [{ name: 'GGR User', data: sortedKeys.map(key => safeGet(key, 'ggr_user')) }],
              categories: sortedKeys.map(formatCategory)
            },
            
            // ROW 3: Double Bar Charts
            activePureMemberTrend: {
              series: [
                { name: 'Active Member', data: sortedKeys.map(key => safeGet(key, 'active_member')), color: '#3B82F6' },
                { name: 'Pure Member', data: sortedKeys.map(key => safeGet(key, 'pure_member')), color: '#F97316' }
              ],
              categories: sortedKeys.map(formatCategory)
            },
            registerDepositorTrend: {
              series: [
                { name: 'New Register', data: sortedKeys.map(key => safeGet(key, 'new_register')), color: '#3B82F6' },
                { name: 'New Depositor', data: sortedKeys.map(key => safeGet(key, 'new_depositor')), color: '#F97316' }
              ],
              categories: sortedKeys.map(formatCategory)
            },
            depositWithdrawCasesTrend: {
              series: [
                { name: 'Deposit Cases', data: sortedKeys.map(key => safeGet(key, 'deposit_cases')), color: '#3B82F6' },
                { name: 'Withdraw Cases', data: sortedKeys.map(key => safeGet(key, 'withdraw_cases')), color: '#F97316' }
              ],
              categories: sortedKeys.map(formatCategory)
            },
            
            // ROW 4: Double Bar Charts
            depositWithdrawTrend: {
              series: [
                { name: 'Deposit Amount', data: sortedKeys.map(key => safeGet(key, 'deposit_amount')), color: '#3B82F6' },
                { name: 'Withdraw Amount', data: sortedKeys.map(key => safeGet(key, 'withdraw_amount')), color: '#F97316' }
              ],
              categories: sortedKeys.map(formatCategory)
            },
            netProfitTrend: {
              series: [{ name: 'Net Profit', data: sortedKeys.map(key => safeGet(key, 'net_profit')) }],
              categories: sortedKeys.map(formatCategory)
            },
            
            // ROW 5: Single Line Charts
            atvTrend: {
              series: [{ name: 'Average Transaction Value', data: sortedKeys.map(key => safeGet(key, 'atv')) }],
              categories: sortedKeys.map(formatCategory)
            },
            purchaseFrequencyTrend: {
              series: [{ name: 'DC User', data: sortedKeys.map(key => safeGet(key, 'purchase_frequency') || safeGet(key, 'dc_user')) }],
              categories: sortedKeys.map(formatCategory)
            },
            
            
            // ROW 7: Single Line Charts
            winrateTrend: {
              series: [{ name: 'Winrate', data: sortedKeys.map(key => safeGet(key, 'winrate')) }],
              categories: sortedKeys.map(formatCategory)
            },
            withdrawalRateTrend: {
              series: [{ name: 'Withdrawal Rate', data: sortedKeys.map(key => safeGet(key, 'withdrawal_rate')) }],
              categories: sortedKeys.map(formatCategory)
            },
            
            // ROW 8: Single Line Charts
            conversionRateTrend: {
              series: [{ name: 'Conversion Rate', data: sortedKeys.map(key => safeGet(key, 'conversion_rate')) }],
              categories: sortedKeys.map(formatCategory)
            }
          };
          
        console.log('✅ [SGD Overview] Setting chart data:', {
          mode: currentDailyMode ? 'DAILY' : 'MONTHLY',
          chartCount: Object.keys(preparedChartData).length,
          sampleChart: Object.keys(preparedChartData)[0],
          sampleCategories: (preparedChartData as any)[Object.keys(preparedChartData)[0]]?.categories?.slice(0, 5),
          allCharts: Object.keys(preparedChartData),
          daUserCategories: preparedChartData.daUserTrend?.categories?.slice(0, 10),
          daUserData: preparedChartData.daUserTrend?.series?.[0]?.data?.slice(0, 10)
        });
        
        // ✅ CRITICAL: Force update chart data
        setChartData(null); // Clear first to force re-render
        setTimeout(() => {
          setChartData(preparedChartData);
          setChartsLoaded(true);
          console.log(`✅ [SGD Overview] Chart data loaded and set successfully (${currentDailyMode ? 'DAILY' : 'MONTHLY'})`);
          console.log('✅ [SGD Overview] Chart data state updated, categories:', preparedChartData.daUserTrend?.categories?.slice(0, 10));
        }, 10);
      } else {
        console.warn('⚠️ [SGD Overview] No data to set for charts');
        setChartsLoaded(true); // Even if no data, mark as loaded
      }

    } catch (error) {
      console.error('❌ [SGD Overview] Error loading chart data:', error);
      console.error('❌ [SGD Overview] Error details:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        currentDailyMode,
        selectedYear,
        selectedMonth,
        selectedLine
      });
      setChartError('Failed to load chart data.');
      setChartsLoaded(true); // Mark as loaded even on error
    }
  };

  // ✅ Manual reload function (triggered by Search button)
  const handleApplyFilters = () => {
    setKpiLoaded(false);
    setChartsLoaded(false);
    loadKPIData();
    loadChartData(isDailyMode); // ✅ Pass current isDailyMode value
  };

  // ✅ NO AUTO-RELOAD: Data only loads when Search button is clicked
  // All data refresh must go through handleApplyFilters (Search button)
  
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

        {/* ✅ TOGGLE DAILY MODE */}
        <div className="slicer-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="slicer-label" style={{ margin: 0 }}>DAILY:</label>
          <label style={{ 
            position: 'relative',
            display: 'inline-block',
            width: '48px',
            height: '24px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={isDailyMode}
              onChange={(e) => {
                const newValue = e.target.checked;
                console.log('🔄 [SGD Overview] ========== TOGGLE DAILY MODE ==========');
                console.log('🔄 [SGD Overview] Toggle change:', { 
                  from: isDailyMode, 
                  to: newValue,
                  selectedYear,
                  selectedMonth,
                  selectedLine
                });
                
                // ✅ Update state only - NO AUTO-RELOAD
                // Data will only refresh when user clicks Search button
                setIsDailyMode(newValue);
                console.log('✅ [SGD Overview] Toggle Daily Mode updated to:', newValue, '- Waiting for Search button click to reload data');
              }}
              style={{ 
                opacity: 0,
                width: 0,
                height: 0
              }}
            />
            <span style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isDailyMode ? '#10b981' : '#d1d5db',
              borderRadius: '24px',
              transition: 'background-color 0.3s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '18px',
                width: '18px',
                left: isDailyMode ? '26px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'left 0.3s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }} />
            </span>
          </label>
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
          {isLoading && <StandardLoadingSpinner message="Loading SGD Overview" />}

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
                      
                      // Use Math.abs for denominator to handle edge cases (same as calculateSGDMoM)
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
              key={`da-user-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
              series={chartData?.daUserTrend?.series || []}
              categories={chartData?.daUserTrend?.categories || []}
              title="DA USER TREND"
              currency={selectedCurrency}
              hideLegend={true}
              showDataLabels={false}
              chartIcon={getChartIcon('Deposit Amount')}
            />
            <LineChart
              key={`ggr-user-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
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
              key={`active-pure-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
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
              key={`deposit-withdraw-cases-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
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
              key={`deposit-withdraw-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
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
              key={`net-profit-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
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
              key={`atv-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
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
              key={`dc-user-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
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
              key={`winrate-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
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
              key={`withdrawal-rate-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
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
              key={`conversion-rate-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
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
              key={`register-depositor-${isDailyMode ? 'daily' : 'monthly'}-${selectedMonth}-${selectedYear}`}
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
