'use client'

import React, { useState, useEffect } from 'react'
import { getSlicerData, getAllKPIsWithMoM, getLineChartData, getBarChartData, SlicerFilters, SlicerData, KPIData } from '@/lib/KPILogic'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import YearSlicer from '@/components/slicers/YearSlicer'
import MonthSlicer from '@/components/slicers/MonthSlicer'
import CurrencySlicer from '@/components/slicers/CurrencySlicer'
import LineChart from '@/components/LineChart'

import StatCard from '@/components/StatCard'
import { getChartIcon } from '@/lib/CentralIcon'

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
    headcount: 0
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
  const [barChartData, setBarChartData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [chartError, setChartError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

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
          
          // Load KPI data
          const filters: SlicerFilters = {
            year: selectedYear,
            month: selectedMonth,
            currency: selectedCurrency,
            line: ''
          }
          
          const kpiResult = await getAllKPIsWithMoM(filters)
          console.log('📈 [Dashboard] KPI data loaded:', kpiResult)
          setKpiData(kpiResult.current)
          setMomData(kpiResult.mom)
          
          // Load chart data
          const lineData = await getLineChartData(filters)
          console.log('📊 [Dashboard] Line chart data loaded:', lineData)
          setLineChartData(lineData)
          
          const barData = await getBarChartData(filters)
          console.log('📊 [Dashboard] Bar chart data loaded:', barData)
          setBarChartData(barData)
        }
        
        // Race antara timeout dan data loading
        await Promise.race([dataPromise(), timeoutPromise])
        
        setIsLoading(false)
        console.log('✅ [Dashboard] All data loaded successfully')
        
      } catch (error) {
        console.error('❌ [Dashboard] Error loading data:', error)
        
        // Jika timeout atau error, gunakan fallback data
        if (error instanceof Error && error.message.includes('timeout')) {
          console.log('⏰ [Dashboard] Using fallback data due to timeout')
          setSlicerData({
            years: ['2025'],
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            currencies: ['MYR', 'SGD', 'USC'],
            lines: []
          })
          
          // Set fallback KPI data
          setKpiData({
            activeMember: 1250,
            newDepositor: 85,
            depositAmount: 2500000,
            grossGamingRevenue: 1800000,
            netProfit: 720000,
            withdrawAmount: 1200000,
            addTransaction: 1800,
            deductTransaction: 1200,
            validBetAmount: 15000000,
            pureMember: 980,
            pureUser: 750,
            newRegister: 120,
            churnMember: 45,
            depositCases: 320,
            withdrawCases: 280,
            winrate: 0.85,
            churnRate: 0.12,
            retentionRate: 0.88,
            growthRate: 0.15,
            avgTransactionValue: 850,
            purchaseFrequency: 8.5,
            customerLifetimeValue: 1850,
            avgCustomerLifespan: 18,
            customerMaturityIndex: 0.75,
            ggrPerUser: 1440,
            ggrPerPureUser: 2400,
            addBonus: 180000,
            deductBonus: 45000,
            conversionRate: 0.68,
            holdPercentage: 0.28,
            headcount: 45
          })
          
          setMomData({
            activeMember: 5.2,
            newDepositor: 8.7,
            depositAmount: 12.3,
            withdrawAmount: 9.8,
            grossGamingRevenue: 15.6,
            netProfit: 18.9,
            holdPercentage: 2.1,
            conversionRate: 3.4,
            churnRate: -2.3
          })
          
          // Set fallback chart data
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
          
          setBarChartData({
            success: true,
            headcountByDepartment: {
              series: [
                { name: 'CSS', data: [12, 15, 18, 20, 22, 25] },
                { name: 'SR', data: [8, 10, 12, 14, 16, 18] },
                { name: 'Cashier', data: [6, 8, 10, 12, 14, 16] }
              ],
              categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            }
          })
          
          setIsLoading(false)
        } else {
          setLoadError(error instanceof Error ? error.message : 'Failed to load data')
          setIsLoading(false)
        }
      }
    }

    loadData()
  }, [selectedYear, selectedMonth, selectedCurrency])

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
        {/* Content Container - StatCard and Chart Canvas */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          marginTop: '20px'
        }}>
          {/* KPI Row - Updated with 6 New KPIs */}
          <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
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
              title="NET PROFIT"
              value={formatCurrency(kpiData.netProfit)}
              icon="Net Profit"
              comparison={{
                percentage: formatMoM(momData.netProfit),
                isPositive: momData.netProfit > 0
              }}
            />
            <StatCard
              title="HOLD PERCENTAGE"
              value={`${kpiData.holdPercentage.toFixed(2)}%`}
              icon="Hold Percentage"
              comparison={{
                percentage: formatMoM(momData.holdPercentage),
                isPositive: momData.holdPercentage > 0
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
              title="CONVERSION RATE"
              value={`${kpiData.conversionRate.toFixed(2)}%`}
              icon="Conversion Rate"
              comparison={{
                percentage: formatMoM(momData.conversionRate),
                isPositive: momData.conversionRate > 0
              }}
            />
            <StatCard
              title="CHURN RATE"
              value={`${kpiData.churnRate.toFixed(2)}%`}
              icon="Churn Rate"
              comparison={{
                percentage: formatMoM(momData.churnRate),
                isPositive: momData.churnRate < 0 // Churn rate lower is better
              }}
            />
          </div>

          {/* Single Canvas for 4 Charts - 2 Rows */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
          {/* Row 1: Chart 1 & 2 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '16px'
          }}>
            {/* Chart 1: Retention vs Churn Rate */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '16px',
              minHeight: '300px',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <LineChart
                series={lineChartData?.retentionChurnTrend?.series || []}
                categories={lineChartData?.retentionChurnTrend?.categories || []}
                title="Retention vs Churn Rate"
                chartIcon={getChartIcon('Retention vs Churn Rate')}
                currency={selectedCurrency}
              />
            </div>

            {/* Chart 2: CLV vs Purchase Frequency */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '16px',
              minHeight: '300px',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <LineChart
                series={lineChartData?.customerMetricsTrend?.series || []}
                categories={lineChartData?.customerMetricsTrend?.categories || []}
                title="CLV vs Purchase Frequency"
                chartIcon={getChartIcon('CLV vs Purchase Frequency')}
                currency={selectedCurrency}
              />
            </div>
          </div>

          {/* Row 2: Chart 3 & 4 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px'
          }}>
            {/* Chart 3: Growth vs Profitability */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '16px',
              minHeight: '300px',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <LineChart
                series={lineChartData?.growthProfitabilityAnalysis?.series || []}
                categories={lineChartData?.growthProfitabilityAnalysis?.categories || []}
                title="Growth vs Profitability"
                chartIcon={getChartIcon('Growth vs Profitability')}
                currency={selectedCurrency}
              />
            </div>

            {/* Chart 4: Operational Efficiency */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '16px',
              minHeight: '300px',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <LineChart
                series={lineChartData?.operationalEfficiencyTrend?.series || []}
                categories={lineChartData?.operationalEfficiencyTrend?.categories || []}
                title="Operational Efficiency"
                chartIcon={getChartIcon('Operational Efficiency')}
                currency={selectedCurrency}
              />
            </div>
          </div>
        </div>
        </div>

      </Frame>
    </Layout>
  )
}