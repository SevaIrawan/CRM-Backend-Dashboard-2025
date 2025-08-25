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

export default function MemberAnalyticPage() {
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

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        console.log('🔄 [MYR Member Analytic] Starting data load with currency lock to MYR...');

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
        console.log('📈 [MYR Member Analytic] Fetching KPI data with filters:', {
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
        console.log('📊 [MYR Member Analytic] KPI result received:', kpiResult);
        console.log('📊 [MYR Member Analytic] Current KPI data:', kpiResult.current);
        console.log('📊 [MYR Member Analytic] MoM data:', kpiResult.mom);

        setKpiData(kpiResult.current);
        setMomData(kpiResult.mom);

        // Fetch chart data
        console.log('📈 [MYR Member Analytic] Fetching chart data...');
        const chartFilters: SlicerFilters = {
          year: selectedYear,
          month: selectedMonth,
          currency: selectedCurrency,
          line: selectedLine === 'All' ? undefined : selectedLine // Jika All, tidak filter line
        };
        
        const chartResult = await getLineChartData(chartFilters);
        console.log('📊 [MYR Member Analytic] Chart data loaded:', chartResult);
        setLineChartData(chartResult);

      } catch (error) {
        console.error('❌ [MYR Member Analytic] Error loading data:', error);
        setLoadError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
        console.log('✅ [MYR Member Analytic] Data loading completed');
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
          console.log('🔄 [MYR Member Analytic] Using Central Daily Average function...');
          
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
          
          console.log('✅ [MYR Member Analytic] Central Daily Average applied to ALL KPIs');
          
        } catch (error) {
          console.error('❌ [MYR Member Analytic] Error with central Daily Average:', error);
        }
      }
    };

    calculateDailyAverages();
  }, [kpiData, selectedYear, selectedMonth]);

  // Handle line selection change - sama seperti Overview MYR
  const handleLineChange = (line: string) => {
    setSelectedLine(line);
    console.log('🔄 [MYR Member Analytic] Line changed to:', line);
  };

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
          <p>Loading MYR Member Analytic data...</p>
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

          {/* Row 2: Bar Charts (Coming Soon) */}
          <div className="chart-row">
            <div className="chart-container">
              <div className="chart-header">
                <h3>BAR CHART 1</h3>
                <p>Coming Soon - 2 Bar Chart</p>
              </div>
              <div className="chart-placeholder">
                📊 Bar Chart 1 - Coming Soon
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-header">
                <h3>BAR CHART 2</h3>
                <p>Coming Soon - 2 Bar Chart</p>
              </div>
              <div className="chart-placeholder">
                📊 Bar Chart 2 - Coming Soon
              </div>
            </div>
          </div>

          {/* Row 2.5: Single Line Charts (NEW) */}
          <div className="chart-row">
            <div className="chart-container">
              <div className="chart-header">
                <h3>SINGLE LINE CHART 1</h3>
                <p>Coming Soon - Single Line</p>
              </div>
              <div className="chart-placeholder">
                📈 Single Line Chart 1 - Coming Soon
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-header">
                <h3>SINGLE LINE CHART 2</h3>
                <p>Coming Soon - Single Line</p>
              </div>
              <div className="chart-placeholder">
                📈 Single Line Chart 2 - Coming Soon
              </div>
            </div>
          </div>

          {/* Row 3: Line Charts (Coming Soon) */}
          <div className="chart-row">
            <div className="chart-container">
              <div className="chart-header">
                <h3>LINE CHART 1</h3>
                <p>Coming Soon - 2 Line Chart</p>
              </div>
              <div className="chart-placeholder">
                📈 Line Chart 1 - Coming Soon
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-header">
                <h3>LINE CHART 2</h3>
                <p>Coming Soon - 2 Line Chart</p>
              </div>
              <div className="chart-placeholder">
                📈 Line Chart 2 - Coming Soon
              </div>
            </div>
          </div>

          {/* Row 4: 3 Charts in 1 Row (Table Chart 1, Table Chart 2, Pie Chart) */}
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

          {/* Row 5: Retention Table Full Frame */}
          <div className="chart-row-full">
            <div className="chart-container">
              <div className="chart-header">
                <h3>RETENTION TABLE</h3>
                <p>Coming Soon - Ready Popup Modal</p>
              </div>
              <div className="chart-placeholder">
                📋 Retention Table - Coming Soon (Full Frame)
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
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          min-height: 300px;
        }

        .chart-header {
          margin-bottom: 20px;
          text-align: left;
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
    </Layout>
  );
} 