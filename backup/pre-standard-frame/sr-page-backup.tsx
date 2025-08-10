'use client'

import React, { useState, useEffect } from 'react';
import { getSlicerData, getAllKPIsWithMoM, SlicerFilters, SlicerData, KPIData, getLinesForCurrency } from '@/lib/KPILogic';
import Layout from '@/components/Layout';
import { YearSlicer, MonthSlicer, CurrencySlicer, LineSlicer } from '@/components/slicers';
import StatCard from '@/components/StatCard';
import { getChartIcon } from '@/lib/CentralIcon';

export default function SalesRevenuePage() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [momData, setMomData] = useState<KPIData | null>(null);
  const [slicerData, setSlicerData] = useState<SlicerData | null>(null);
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('July');
  const [selectedCurrency, setSelectedCurrency] = useState('MYR');
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filteredLines, setFilteredLines] = useState<string[]>([]);
  const [filteredMonths, setFilteredMonths] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        console.log('🔄 [Sales Revenue] Starting data load...');

        // Fetch slicer data
        const slicerDataResult = await getSlicerData();
        console.log('📊 [Sales Revenue] Slicer data loaded:', slicerDataResult);
        setSlicerData(slicerDataResult);

        // Fetch filtered lines based on selected currency
        const linesForCurrency = await getLinesForCurrency(selectedCurrency, selectedYear);
        console.log('🔗 [Sales Revenue] Lines for currency loaded:', linesForCurrency);
        setFilteredLines(linesForCurrency);

        // Filter months based on selected year - use all available months for now
        if (slicerDataResult.months) {
          setFilteredMonths(slicerDataResult.months);
        }

        // Fetch KPI data with current filters
        console.log('📈 [Sales Revenue] Fetching KPI data with filters:', {
          year: selectedYear,
          month: selectedMonth,
          currency: selectedCurrency,
          line: selectedLine
        });
        
        const kpiResult = await getAllKPIsWithMoM({
          year: selectedYear,
          month: selectedMonth,
          currency: selectedCurrency,
          line: selectedLine
        });
        
        console.log('📊 [Sales Revenue] KPI result received:', kpiResult);
        console.log('📊 [Sales Revenue] Current KPI data:', kpiResult.current);
        console.log('📊 [Sales Revenue] MoM data:', kpiResult.mom);

        setKpiData(kpiResult.current);
        setMomData(kpiResult.mom);

      } catch (error) {
        console.error('❌ [Sales Revenue] Error loading data:', error);
        setLoadError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
        console.log('✅ [Sales Revenue] Data loading completed');
      }
    };

    const timeoutId = setTimeout(loadData, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedYear, selectedMonth, selectedCurrency, selectedLine]);

  // Update filtered lines when currency changes
  useEffect(() => {
    const updateFilteredLines = async () => {
      if (selectedCurrency) {
        const linesForCurrency = await getLinesForCurrency(selectedCurrency, selectedYear);
        setFilteredLines(linesForCurrency);
        
        // Reset line selection if current selection is not available in new currency
        if (!linesForCurrency.includes(selectedLine)) {
          setSelectedLine('ALL');
        }
      }
    };

    updateFilteredLines();
  }, [selectedCurrency, selectedYear]);

  // Update filtered months when year changes
  useEffect(() => {
    if (slicerData?.months) {
      // For now, use all available months
      setFilteredMonths(slicerData.months);
    }
  }, [slicerData]);

  const formatCurrency = (value: number | null | undefined, currency: string): string => {
    if (value === null || value === undefined) return '0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
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
        
        <div className="slicer-group">
          <label className="slicer-label">CURRENCY:</label>
          <CurrencySlicer 
            value={selectedCurrency} 
            onChange={setSelectedCurrency}
          />
        </div>
        
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
          <p>Loading Sales Revenue data...</p>
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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginTop: '20px'
      }}>
        {/* KPI Row - Single Row with 6 KPI Cards */}
        <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          <StatCard
            title="DEPOSIT AMOUNT"
            value={formatCurrency(kpiData?.depositAmount || 0, selectedCurrency)}
            icon="Deposit Amount"
            comparison={{
              percentage: formatMoM(momData?.depositAmount || 0),
              isPositive: Boolean(momData?.depositAmount && momData.depositAmount > 0)
            }}
          />
          <StatCard
            title="WITHDRAW AMOUNT"
            value={formatCurrency(kpiData?.withdrawAmount || 0, selectedCurrency)}
            icon="Withdraw Amount"
            comparison={{
              percentage: formatMoM(momData?.withdrawAmount || 0),
              isPositive: Boolean(momData?.withdrawAmount && momData.withdrawAmount > 0)
            }}
          />
          <StatCard
            title="GROSS GAMING REVENUE"
            value={formatCurrency(kpiData?.grossGamingRevenue || 0, selectedCurrency)}
            icon="Gross Gaming Revenue"
            comparison={{
              percentage: formatMoM(momData?.grossGamingRevenue || 0),
              isPositive: Boolean(momData?.grossGamingRevenue && momData.grossGamingRevenue > 0)
            }}
          />
          <StatCard
            title="ACTIVE MEMBER"
            value={formatNumber(kpiData?.activeMember || 0)}
            icon="Active Member"
            comparison={{
              percentage: formatMoM(momData?.activeMember || 0),
              isPositive: Boolean(momData?.activeMember && momData.activeMember > 0)
            }}
          />
          <StatCard
            title="NEW DEPOSITOR"
            value={formatNumber(kpiData?.newDepositor || 0)}
            icon="New Depositor"
            comparison={{
              percentage: formatMoM(momData?.newDepositor || 0),
              isPositive: Boolean(momData?.newDepositor && momData.newDepositor > 0)
            }}
          />
          <StatCard
            title="CONVERSION RATE"
            value={`${(kpiData?.conversionRate || 0).toFixed(2)}%`}
            icon="Conversion Rate"
            comparison={{
              percentage: formatMoM(momData?.conversionRate || 0),
              isPositive: Boolean(momData?.conversionRate && momData.conversionRate > 0)
            }}
          />
        </div>

        {/* Canvas Area for Charts (Placeholder) */}
        <div className="chart-container" style={{
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            Chart Area - Ready for future implementation
          </p>
        </div>

        {/* Slicer Info */}
        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Showing data for: {selectedYear} | {selectedMonth} | {selectedCurrency} | {selectedLine}
          </p>
        </div>
      </div>

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
      `}</style>
    </Layout>
  );
} 