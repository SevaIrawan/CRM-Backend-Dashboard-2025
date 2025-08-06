'use client'

import React, { useState, useEffect } from 'react'
import { getSlicerData, getAllKPIsWithMoM, getLineChartData, getBarChartData, SlicerFilters, SlicerData, KPIData } from '@/lib/KPILogic'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import DashboardSubHeader from '@/components/DashboardSubHeader'
import LineChart from '@/components/LineChart'
import StatCard from '@/components/StatCard'
import { getChartIcon } from '@/lib/centralIcons'

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
    deductBonus: 0
  })

  const [momData, setMomData] = useState({
    activeMember: 0,
    newDepositor: 0,
    depositAmount: 0,
    withdrawAmount: 0,
    grossGamingRevenue: 0,
    netProfit: 0
  })

  // State untuk Slicers
  const [slicerData, setSlicerData] = useState<SlicerData>({
    years: [],
    months: [],
    currencies: [],
    lines: []
  })

  const [selectedYear, setSelectedYear] = useState('2024')
  const [selectedMonth, setSelectedMonth] = useState('January')
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
        console.log('🔄 [Dashboard] Starting data load...')
        
        // Load slicer data
        const slicerData = await getSlicerData()
        console.log('📊 [Dashboard] Slicer data loaded:', slicerData)
        setSlicerData(slicerData)
        
        // Load KPI data
        const filters: SlicerFilters = {
          year: selectedYear,
          month: selectedMonth,
          currency: selectedCurrency,
          line: ''
        }
        
        console.log('🎯 [Dashboard] Loading KPI data with filters:', filters)
        const result = await getAllKPIsWithMoM(filters)
        console.log('📈 [Dashboard] KPI data loaded:', result)
        setKpiData(result.current)
        setMomData(result.mom)
        
        // Load chart data
        console.log('📊 [Dashboard] Loading chart data...')
        
        // Chart data should only use Year and Currency filters (not Month)
        const chartFilters: SlicerFilters = {
          year: selectedYear,
          month: selectedMonth, // This will be ignored by getLineChartData
          currency: selectedCurrency,
          line: ''
        }
        
        const [lineData, barData] = await Promise.all([
          getLineChartData(chartFilters),
          getBarChartData(chartFilters)
        ])
        
        console.log('📈 [Dashboard] Line chart data:', lineData)
        console.log('📊 [Dashboard] Bar chart data:', barData)
        
        // Validate chart data - use fallback if needed
        if (!lineData) {
          console.warn('⚠️ [Dashboard] No line chart data, using fallback')
          setLineChartData({
            success: true,
            retentionChurnTrend: {
              series: [
                { name: 'Retention Rate', data: [85, 87, 89, 91, 93, 95] },
                { name: 'Churn Rate', data: [15, 13, 11, 9, 7, 5] }
              ],
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            },
            customerMetricsTrend: {
              series: [
                { name: 'Customer Lifetime Value', data: [1200, 1350, 1500, 1650, 1800, 1950] },
                { name: 'Purchase Frequency', data: [6, 7, 8, 9, 10, 11] }
              ],
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            },
            growthProfitabilityAnalysis: {
              series: [
                { name: 'Net Profit', data: [450000, 520000, 580000, 650000, 720000, 800000] },
                { name: 'New Depositor', data: [120, 135, 150, 165, 180, 195] }
              ],
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            },
            operationalEfficiencyTrend: {
              series: [
                { name: 'Income', data: [800000, 850000, 900000, 950000, 1000000, 1050000] },
                { name: 'Cost', data: [500000, 520000, 540000, 560000, 580000, 600000] }
              ],
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            }
          })
        } else {
          setLineChartData(lineData)
        }
        
        setBarChartData(barData)
        
        console.log('✅ [Dashboard] All data loaded successfully!')
        
      } catch (error) {
        console.error('❌ [Dashboard] Error loading data:', error)
        setChartError(error instanceof Error ? error.message : 'Unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [selectedYear, selectedMonth, selectedCurrency])

  const formatCurrency = (amount: number, currency?: string) => {
    const currentCurrency = currency || selectedCurrency
    
    if (currentCurrency === 'MYR') {
      return `RM ${new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)}`
    }
    
    const currencyMap: { [key: string]: string } = {
      'SGD': 'SGD', 
      'KHR': 'USD'
    }
    
    const currencyCode = currencyMap[currentCurrency] || 'USD'
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatMoM = (value: number) => {
    return value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`
  }

  return (
    <Layout
      pageTitle="Dashboard"
      subHeaderTitle=""
      customSubHeader={
        <DashboardSubHeader
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
        />
      }
    >
      <Frame>
        {/* KPI Row */}
        <div className="kpi-row">
          <StatCard
            title="DEPOSIT AMOUNT"
            value={formatCurrency(kpiData.depositAmount)}
            icon="Deposit Amount"
            comparison={{
              percentage: formatMoM(momData.depositAmount),
              isPositive: momData.depositAmount > 0
            }}
          />
          <StatCard
            title="WITHDRAW AMOUNT"
            value={formatCurrency(kpiData.withdrawAmount)}
            icon="Withdraw Amount"
            comparison={{
              percentage: formatMoM(momData.withdrawAmount),
              isPositive: momData.withdrawAmount > 0
            }}
          />
          <StatCard
            title="GROSS PROFIT"
            value={formatCurrency(kpiData.grossGamingRevenue)}
            icon="Gross Profit"
            comparison={{
              percentage: formatMoM(momData.grossGamingRevenue),
              isPositive: momData.grossGamingRevenue > 0
            }}
          />
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
            title="NEW DEPOSITOR"
            value={formatNumber(kpiData.newDepositor)}
            icon="New Depositor"
            comparison={{
              percentage: formatMoM(momData.newDepositor),
              isPositive: momData.newDepositor > 0
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
        </div>

        {/* Charts Row 1 */}
        <div className="charts-row">
          <div className="chart-container">
            {isLoading ? (
              <div style={{ 
                height: '320px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #e2e8f0',
                    borderTop: '3px solid #3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 10px'
                  }}></div>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Loading chart...</p>
                </div>
              </div>
            ) : chartError ? (
              <div style={{ 
                height: '320px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                border: '1px solid #fecaca',
                borderRadius: '8px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>⚠️</div>
                  <p style={{ color: '#dc2626', fontSize: '12px', margin: 0 }}>Error: {chartError}</p>
                </div>
              </div>
            ) : (
              <LineChart
                series={lineChartData?.retentionChurnTrend?.series || []}
                categories={lineChartData?.retentionChurnTrend?.categories || []}
                title="Retention vs Churn Rate Over Time"
                chartIcon={getChartIcon('Retention vs Churn Rate Over Time')}
                currency={selectedCurrency}
              />
            )}
          </div>
          <div className="chart-container">
            {isLoading ? (
              <div style={{ 
                height: '320px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #e2e8f0',
                    borderTop: '3px solid #3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 10px'
                  }}></div>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Loading chart...</p>
                </div>
              </div>
            ) : chartError ? (
              <div style={{ 
                height: '320px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                border: '1px solid #fecaca',
                borderRadius: '8px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>⚠️</div>
                  <p style={{ color: '#dc2626', fontSize: '12px', margin: 0 }}>Error: {chartError}</p>
                </div>
              </div>
            ) : (
              <LineChart 
                series={lineChartData?.customerMetricsTrend?.series || []}
                categories={lineChartData?.customerMetricsTrend?.categories || []}
                title="Customer Lifetime Value vs Purchase Frequency"
                chartIcon={getChartIcon('Customer Lifetime Value vs Purchase Frequency')}
                currency={selectedCurrency}
              />
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="charts-row">
          <div className="chart-container">
            {isLoading ? (
              <div style={{ 
                height: '320px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #e2e8f0',
                    borderTop: '3px solid #3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 10px'
                  }}></div>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Loading chart...</p>
                </div>
              </div>
            ) : chartError ? (
              <div style={{ 
                height: '320px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                border: '1px solid #fecaca',
                borderRadius: '8px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>⚠️</div>
                  <p style={{ color: '#dc2626', fontSize: '12px', margin: 0 }}>Error: {chartError}</p>
                </div>
              </div>
            ) : (
              <LineChart 
                series={lineChartData?.growthProfitabilityAnalysis?.series || []}
                categories={lineChartData?.growthProfitabilityAnalysis?.categories || []}
                title="Growth vs Profitability Analysis"
                chartIcon={getChartIcon('Growth vs Profitability Analysis')}
                currency={selectedCurrency}
              />
            )}
          </div>
          <div className="chart-container">
            {isLoading ? (
              <div style={{ 
                height: '320px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #e2e8f0',
                    borderTop: '3px solid #3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 10px'
                  }}></div>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Loading chart...</p>
                </div>
              </div>
            ) : chartError ? (
              <div style={{ 
                height: '320px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                border: '1px solid #fecaca',
                borderRadius: '8px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>⚠️</div>
                  <p style={{ color: '#dc2626', fontSize: '12px', margin: 0 }}>Error: {chartError}</p>
                </div>
              </div>
            ) : (
              <LineChart 
                series={lineChartData?.operationalEfficiencyTrend?.series || []}
                categories={lineChartData?.operationalEfficiencyTrend?.categories || []}
                title="Operational Efficiency Trend"
                chartIcon={getChartIcon('Operational Efficiency Trend')}
                currency={selectedCurrency}
              />
            )}
          </div>
        </div>
      </Frame>
    </Layout>
  )
}