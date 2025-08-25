'use client'

import React, { useState, useEffect } from 'react'
import { getSlicerData, getAllKPIsWithMoM, getDashboardChartData, SlicerFilters, SlicerData, KPIData } from '@/lib/KPILogic'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import YearSlicer from '@/components/slicers/YearSlicer'
import MonthSlicer from '@/components/slicers/MonthSlicer'
import CurrencySlicer from '@/components/slicers/CurrencySlicer'
import LineChart from '@/components/LineChart'
import StatCard from '@/components/StatCard'
import { getChartIcon } from '@/lib/CentralIcon'
import { calculateDailyAverage, getMonthInfo, getAllKPIsWithDailyAverage } from '@/lib/dailyAverageHelper';

export default function Dashboard() {
  
  // State untuk KPI data
  const [kpiData, setKpiData] = useState<KPIData>({
    activeMember: 0,
    newDepositor: 0,
    depositAmount: 0,
    grossGamingRevenue: 0,
    netProfit: 0,
    withdrawAmount: 0,
    addTransaction: 0,
    deductTransaction: 0,
    validBetAmount: 0,
    pureMember: 0,
    pureUser: 0,
    newRegister: 0,
    churnMember: 0,
    depositCases: 0,
    withdrawCases: 0,
    winrate: 0,
    churnRate: 0,
    retentionRate: 0,
    growthRate: 0,
    avgTransactionValue: 0,
    purchaseFrequency: 0,
    customerLifetimeValue: 0,
    avgCustomerLifespan: 0,
    customerMaturityIndex: 0,
    ggrPerUser: 0,
    ggrPerPureUser: 0,
    addBonus: 0,
    deductBonus: 0,
    conversionRate: 0,
    holdPercentage: 0,
    headcount: 0,
    depositAmountUser: 0,
    highValueCustomers: 0,
    lowValueCustomers: 0,
    totalCustomers: 0
  })

  const [momData, setMomData] = useState({
    activeMember: 0,
    newDepositor: 0,
    depositAmount: 0,
    withdrawAmount: 0,
    grossGamingRevenue: 0,
    netProfit: 0,
    holdPercentage: 0,
    conversionRate: 0,
    churnRate: 0
  })

  // State untuk Slicers
  const [slicerData, setSlicerData] = useState<SlicerData>({
    years: [],
    months: [],
    currencies: [],
    lines: []
  })

  const [selectedYear, setSelectedYear] = useState('2025')
  const [selectedMonth, setSelectedMonth] = useState('July')
  const [selectedCurrency, setSelectedCurrency] = useState('MYR')
  
  // Chart data states
  const [lineChartData, setLineChartData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [chartError, setChartError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Restore original state for 6 KPIs only
  const [dailyAverages, setDailyAverages] = useState({
    depositAmount: 0,
    netProfit: 0,
    holdPercentage: 0,
    activeMember: 0,
    conversionRate: 0,
    churnRate: 0
  });

  // Load data in background without blocking UI
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setChartError(null)
        setLoadError(null)
        console.log('🔄 [Dashboard] Starting data load...')
        
        // Set timeout untuk mencegah loading terlalu lama
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Data loading timeout')), 30000) // 30 detik timeout
        })
        
        const dataPromise = async () => {
          // Load slicer data
          const slicerData = await getSlicerData()
          console.log('📊 [Dashboard] Slicer data loaded:', slicerData)
          setSlicerData(slicerData)
          
          // Load KPI data with MoM
          const kpiDataWithMoM = await getAllKPIsWithMoM({
            year: selectedYear,
            month: selectedMonth,
            currency: selectedCurrency
          })
          console.log('📈 [Dashboard] KPI data loaded:', kpiDataWithMoM)
          setKpiData(kpiDataWithMoM.current)
          setMomData(kpiDataWithMoM.mom)
          
          // Load chart data
          const chartData = await getDashboardChartData({
            year: selectedYear,
            month: selectedMonth,
            currency: selectedCurrency
          })
          
          console.log('📊 [Dashboard] Chart data loaded:', chartData)
          setLineChartData(chartData)
          
          setIsLoading(false)
        }
        
        // Race between data loading and timeout
        await Promise.race([dataPromise(), timeoutPromise])
        
      } catch (error) {
        console.error('❌ [Dashboard] Error loading data:', error)
        setLoadError(error instanceof Error ? error.message : 'Unknown error occurred')
        setIsLoading(false)
      }
    }

    loadData()
  }, [selectedYear, selectedMonth, selectedCurrency])

  // Calculate daily averages for 6 KPIs when KPI data changes
  useEffect(() => {
    const calculateDailyAverages = async () => {
      if (kpiData && selectedYear && selectedMonth) {
        try {
          console.log('🔄 [Dashboard] Using Central Daily Average function...');
          
          // Use central function - sama seperti getAllKPIsWithMoM
          const result = await getAllKPIsWithDailyAverage(kpiData, selectedYear, selectedMonth);
          
          setDailyAverages({
            depositAmount: result.dailyAverage.depositAmount || 0,
            netProfit: result.dailyAverage.netProfit || 0,
            holdPercentage: result.dailyAverage.holdPercentage || 0,
            activeMember: result.dailyAverage.activeMember || 0,
            conversionRate: result.dailyAverage.conversionRate || 0,
            churnRate: result.dailyAverage.churnRate || 0
          });
          
          console.log('✅ [Dashboard] Central Daily Average applied to 6 KPIs');
          
        } catch (error) {
          console.error('❌ [Dashboard] Error with central Daily Average:', error);
        }
      }
    };

    calculateDailyAverages();
  }, [kpiData, selectedYear, selectedMonth]);

  // Loading screen component
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1d29 0%, #2d3142 50%, #1a1d29 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            animation: 'pulse 2s infinite'
          }}>
            ⚡
          </div>
          <h1 style={{
            fontSize: '2rem',
            marginBottom: '1rem',
            color: '#ffd700'
          }}>
            NEXMAX Dashboard
          </h1>
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.8
          }}>
            Loading dashboard data...
          </p>
          <div style={{
            marginTop: '2rem',
            width: '200px',
            height: '4px',
            backgroundColor: '#333',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '30%',
              height: '100%',
              backgroundColor: '#ffd700',
              animation: 'loading 2s infinite'
            }} />
          </div>
        </div>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
        `}</style>
      </div>
    )
  }

  // Error screen component
  if (loadError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1d29 0%, #2d3142 50%, #1a1d29 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '500px'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            color: '#ff6b6b'
          }}>
            ⚠️
          </div>
          <h1 style={{
            fontSize: '2rem',
            marginBottom: '1rem',
            color: '#ffd700'
          }}>
            Connection Error
          </h1>
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.8,
            marginBottom: '2rem'
          }}>
            {loadError}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ffd700',
              color: '#1a1d29',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number, currency?: string) => {
    const currentCurrency = currency || selectedCurrency
    let symbol: string
    
    switch (currentCurrency) {
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
    }).format(amount)}`
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatMoM = (value: number) => {
    return value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`
  }

  return (
    <Layout
      customSubHeader={
        <div className="dashboard-subheader">
          <div className="subheader-title">
            
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
          </div>
        </div>
      }
    >
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
              value={formatCurrency(kpiData.depositAmount)}
              icon="Deposit Amount"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrency(dailyAverages.depositAmount)
              }}
              comparison={{
                percentage: formatMoM(momData.depositAmount),
                isPositive: momData.depositAmount > 0
              }}
            />
            <StatCard
              title="NET PROFIT"
              value={formatCurrency(kpiData.netProfit)}
              icon="Net Profit"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatCurrency(dailyAverages.netProfit)
              }}
              comparison={{
                percentage: formatMoM(momData.netProfit),
                isPositive: momData.netProfit > 0
              }}
            />
            <StatCard
              title="HOLD PERCENTAGE"
              value={`${(kpiData.holdPercentage || 0).toFixed(2)}%`}
              icon="Hold Percentage"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: `${dailyAverages.holdPercentage.toFixed(2)}%`
              }}
              comparison={{
                percentage: formatMoM(momData.holdPercentage || 0),
                isPositive: (momData.holdPercentage || 0) > 0
              }}
            />
            <StatCard
              title="ACTIVE MEMBER"
              value={formatNumber(kpiData.activeMember)}
              icon="Active Member"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: formatNumber(Math.round(dailyAverages.activeMember))
              }}
              comparison={{
                percentage: formatMoM(momData.activeMember),
                isPositive: momData.activeMember > 0
              }}
            />
            <StatCard
              title="CONVERSION RATE"
              value={`${(kpiData.conversionRate || 0).toFixed(2)}%`}
              icon="Conversion Rate"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: `${dailyAverages.conversionRate.toFixed(2)}%`
              }}
              comparison={{
                percentage: formatMoM(momData.conversionRate || 0),
                isPositive: (momData.conversionRate || 0) > 0
              }}
            />
            <StatCard
              title="CHURN RATE"
              value={`${(kpiData.churnRate || 0).toFixed(2)}%`}
              icon="Churn Rate"
              additionalKpi={{
                label: "DAILY AVERAGE",
                value: `${dailyAverages.churnRate.toFixed(2)}%`
              }}
              comparison={{
                percentage: formatMoM(momData.churnRate || 0),
                isPositive: (momData.churnRate || 0) > 0
              }}
            />
          </div>

          {/* Row 2: Financial Performance Charts */}
          <div className="chart-row">
            <LineChart
              series={[
                { name: 'Retention Rate', data: lineChartData?.retentionRateTrend?.series?.[0]?.data || [] },
                { name: 'Churn Rate', data: lineChartData?.churnRateTrend?.series?.[0]?.data || [] }
              ]}
              categories={lineChartData?.retentionRateTrend?.categories || []}
              title="RETENTION VS CHURN RATE"
              currency={selectedCurrency}
              chartIcon={getChartIcon('Retention vs Churn Rate')}

            />
            <LineChart
              series={[
                { name: 'Customer Lifetime Value', data: lineChartData?.customerLifetimeValueTrend?.series?.[0]?.data || [] },
                { name: 'Purchase Frequency', data: lineChartData?.purchaseFrequencyTrend?.series?.[0]?.data || [] }
              ]}
              categories={lineChartData?.customerLifetimeValueTrend?.categories || []}
              title="CLV VS PURCHASE FREQUENCY"
              currency={selectedCurrency}
              chartIcon={getChartIcon('CLV vs Purchase Frequency')}
            />
          </div>

          {/* Row 3: Advanced Analytics Charts */}
          <div className="chart-row">
            <LineChart
              series={[
                { name: 'Net Profit', data: lineChartData?.netProfitTrend?.series?.[0]?.data || [] },
                { name: 'New Depositor', data: lineChartData?.newDepositorTrend?.series?.[0]?.data || [] }
              ]}
              categories={lineChartData?.netProfitTrend?.categories || []}
              title="GROWTH VS PROFITABILITY"
              currency={selectedCurrency}
              chartIcon={getChartIcon('Growth vs Profitability')}
            />
            <LineChart
              series={[
                { name: 'Income', data: lineChartData?.incomeTrend?.series?.[0]?.data || [] },
                { name: 'Cost', data: lineChartData?.costTrend?.series?.[0]?.data || [] }
              ]}
              categories={lineChartData?.incomeTrend?.categories || []}
              title="OPERATIONAL EFFICIENCY"
              currency={selectedCurrency}
              chartIcon={getChartIcon('Operational Efficiency')}
            />
          </div>

          {/* Slicer Info */}
          <div className="slicer-info">
            <p>Showing data for: {selectedYear} | {selectedMonth} | {selectedCurrency}</p>
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
  )
} 