'use client'

import React, { useState, useEffect } from 'react'
import { getSlicerData, getAllKPIsWithMoM, getLineChartData, getBarChartData, SlicerFilters, SlicerData, KPIData } from '@/lib/KPILogic'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import YearSlicer from '@/components/slicers/YearSlicer'
import MonthSlicer from '@/components/slicers/MonthSlicer'
import CurrencySlicer from '@/components/slicers/CurrencySlicer'
import LineChart from '@/components/LineChart'
import BarChart from '@/components/BarChart'
import StatCard from '@/components/StatCard'
import { getChartIcon } from '@/lib/CentralIcon'

export default function StrategicExecutive() {
  
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
    headcount: 0
  })

  const [momData, setMomData] = useState({
    activeMember: 0,
    newDepositor: 0,
    depositAmount: 0,
    withdrawAmount: 0,
    grossGamingRevenue: 0,
    netProfit: 0,
    headcount: 0,
    ggrPerUser: 0,
    pureUser: 0
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
  const [barChartData, setBarChartData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [chartError, setChartError] = useState<string | null>(null)

  // Load data in background without blocking UI
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setChartError(null)
        console.log('🔄 [StrategicExecutive] Starting data load...')
        
        // Load slicer data
        const slicerData = await getSlicerData()
        console.log('📊 [StrategicExecutive] Slicer data loaded:', slicerData)
        setSlicerData(slicerData)
        
        // Load KPI data
        const filters: SlicerFilters = {
          year: selectedYear,
          month: selectedMonth,
          currency: selectedCurrency,
          line: ''
        }
        
        console.log('🎯 [StrategicExecutive] Loading KPI data with filters:', filters)
        const result = await getAllKPIsWithMoM(filters)
        console.log('📈 [StrategicExecutive] KPI data loaded:', result)
        setKpiData(result.current)
        setMomData(result.mom)
        
        // Load chart data
        console.log('📊 [StrategicExecutive] Loading chart data...')
        const chartData = await getLineChartData(filters)
        console.log('📈 [StrategicExecutive] Line chart data loaded:', chartData)
        setLineChartData(chartData)
        
        const barData = await getBarChartData(filters)
        console.log('📊 [StrategicExecutive] Bar chart data loaded:', barData)
        console.log('🔍 [StrategicExecutive] Headcount Department data:', barData?.headcountDepartment)
        setBarChartData(barData)
        
        setIsLoading(false)
        console.log('✅ [StrategicExecutive] All data loaded successfully')
        
      } catch (error) {
        console.error('❌ [StrategicExecutive] Error loading data:', error)
        setChartError(error instanceof Error ? error.message : 'Failed to load data')
        setIsLoading(false)
      }
    }

    loadData()
  }, [selectedYear, selectedMonth, selectedCurrency])

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
    return num.toLocaleString()
  }

  const formatMoM = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
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
      <Frame>
        {/* Content Container with Scroll */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          marginTop: '20px',
          height: 'calc(100vh - 200px)',
          overflowY: 'auto',
          paddingRight: '8px'
        }}>
          
          {/* Row 1: 5 KPI Cards */}
          <div className="kpi-row" style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <StatCard
              title="NET PROFIT"
              value={formatCurrency(kpiData.netProfit)}
              icon="Net Profit"
              comparison={{
                percentage: formatMoM(momData.netProfit),
                isPositive: momData.netProfit > 0
              }}
            />
            <StatCard
              title="GGR USER"
              value={formatCurrency(kpiData.ggrPerUser)}
              icon="GGR USER"
              comparison={{
                percentage: formatMoM(momData.ggrPerUser),
                isPositive: momData.ggrPerUser > 0
              }}
            />
            <StatCard
              title="ACTIVE MEMBER"
              value={formatNumber(kpiData.activeMember)}
              icon="Active Member"
              comparison={{
                percentage: formatMoM(momData.activeMember),
                isPositive: momData.activeMember > 0
              }}
            />
            <StatCard
              title="PURE USER"
              value={formatNumber(kpiData.pureUser)}
              icon="Pure User"
              comparison={{
                percentage: formatMoM(momData.pureUser),
                isPositive: momData.pureUser > 0
              }}
            />
            <StatCard
              title="HEADCOUNT"
              value={formatNumber(kpiData.headcount || 0)}
              icon="Headcount"
              comparison={{
                percentage: formatMoM(momData.headcount || 0),
                isPositive: (momData.headcount || 0) > 0
              }}
            />
          </div>

          {/* Row 2: 2 Line Charts */}
          <div className="charts-row" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Chart 1: GGR User Trend */}
            <LineChart
              series={lineChartData?.ggrUserTrend?.series || []}
              categories={lineChartData?.ggrUserTrend?.categories || []}
              title="GGR USER TREND"
              chartIcon={getChartIcon('GGR USER TREND')}
              currency={selectedCurrency}
            />

            {/* Chart 2: GGR Pure User Trend */}
            <LineChart
              series={lineChartData?.ggrPureUserTrend?.series || []}
              categories={lineChartData?.ggrPureUserTrend?.categories || []}
              title="GGR PURE USER TREND"
              chartIcon={getChartIcon('GGR PURE USER TREND')}
              currency={selectedCurrency}
            />
          </div>

          {/* Row 3: 2 Line Charts */}
          <div className="charts-row" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Chart 3: Customer Value Per Headcount */}
            <LineChart
              series={lineChartData?.customerValuePerHeadcount?.series || []}
              categories={lineChartData?.customerValuePerHeadcount?.categories || []}
              title="CUSTOMER VALUE PER HEADCOUNT"
              chartIcon={getChartIcon('Customer Value')}
              currency={selectedCurrency}
            />

            {/* Chart 4: Customer Count vs Headcount */}
            <LineChart
              series={lineChartData?.customerCountVsHeadcount?.series || []}
              categories={lineChartData?.customerCountVsHeadcount?.categories || []}
              title="CUSTOMER COUNT VS HEADCOUNT"
              chartIcon={getChartIcon('Customer Count')}
              currency={selectedCurrency}
            />
          </div>

          {/* Row 4: 1 Bar Chart */}
          <div className="charts-row" style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            marginBottom: '20px'
          }}>
            {/* Bar Chart: Headcount Department */}
            <BarChart
              series={barChartData?.headcountDepartment?.series || []}
              categories={barChartData?.headcountDepartment?.categories || []}
              title="HEADCOUNT BY DEPARTMENT"
              chartIcon={getChartIcon('HEADCOUNT BY DEPARTMENT')}
              currency={selectedCurrency}
            />
          </div>

          {/* Slicer Info */}
          <div style={{
            background: '#f3f4f6',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center',
            marginTop: '20px'
          }}>
            <p style={{
              margin: 0,
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Showing data for: {selectedYear} | {selectedMonth} | {selectedCurrency}
            </p>
          </div>
        </div>
      </Frame>
    </Layout>
  )
} 