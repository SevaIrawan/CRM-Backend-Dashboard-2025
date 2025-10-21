"use client"

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StatCard from '@/components/StatCard'
import ProgressBarStatCard from '@/components/ProgressBarStatCard'
import DualKPICard from '@/components/DualKPICard'
import LineChart from '@/components/LineChart'
import BarChart from '@/components/BarChart'
import StackedBarChart from '@/components/StackedBarChart'
import SankeyChart from '@/components/SankeyChart'
import MixedChart from '@/components/MixedChart'
import YearSlicer from '@/components/slicers/YearSlicer'
import QuarterSlicer from '@/components/slicers/QuarterSlicer'
import QuickDateFilter from '@/components/QuickDateFilter'
import TargetEditModal from '@/components/TargetEditModal'
import { getChartIcon } from '@/lib/CentralIcon'
import { 
  QuickDateFilterType, 
  calculateQuickDateRange 
} from '@/lib/businessPerformanceHelper'

interface SlicerOptions {
  years: string[]
  quarters: Record<string, string[]>
  quarterDateRanges: Record<string, { min: string | null, max: string | null }>
  defaults: {
    year: string
    quarter: string
    startDate: string | null
    endDate: string | null
  }
}

export default function BusinessPerformancePage() {
  // Slicer Options from API
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null)
  const [loadingSlicers, setLoadingSlicers] = useState(true)
  
  // Slicer States
  const [selectedYear, setSelectedYear] = useState('2025')
  const [selectedQuarter, setSelectedQuarter] = useState('Q4')
  const [startDate, setStartDate] = useState('2025-10-01')
  const [endDate, setEndDate] = useState('2025-10-31')
  
  // Quick Date Filter State (for Daily Mode)
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickDateFilterType>('7_DAYS')
  
  // Toggle State: FALSE = Month Mode (default), TRUE = Daily Mode
  const [isDateRangeMode, setIsDateRangeMode] = useState(false)
  
  // Target Edit Modal State
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false)
  
  // User Info - Get from localStorage session
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('')
  
  // Load user info from localStorage on mount
  useEffect(() => {
    const sessionData = localStorage.getItem('nexmax_session')
    if (sessionData) {
      try {
        const userData = JSON.parse(sessionData)
        setUserEmail(userData.email || `${userData.username}@nexmax.com`)
        setUserRole(userData.role || 'manager_myr')
        console.log('✅ [BP Page] User loaded:', userData.email, userData.role)
      } catch (error) {
        console.error('❌ [BP Page] Error parsing session:', error)
      }
    }
  }, [])
  
  // KPI Data State
  const [kpiData, setKpiData] = useState<any>(null)
  const [chartData, setChartData] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)
  
  // ============================================================================
  // FETCH SLICER OPTIONS ON MOUNT
  // ============================================================================
  useEffect(() => {
    fetchSlicerOptions()
  }, [])
  
  // ============================================================================
  // FETCH KPI DATA WHEN FILTERS CHANGE
  // ============================================================================
  useEffect(() => {
    if (!loadingSlicers) {
      fetchKPIData()
    }
  }, [selectedYear, selectedQuarter, isDateRangeMode, startDate, endDate, loadingSlicers])
  
  // ============================================================================
  // QUICK DATE FILTER HANDLER
  // ============================================================================
  function handleQuickFilterChange(filterType: QuickDateFilterType) {
    console.log('📅 [BP Page] Quick filter changed:', filterType)
    setActiveQuickFilter(filterType)
    
    // Calculate date range based on filter type
    const { startDate: newStart, endDate: newEnd } = calculateQuickDateRange(filterType)
    
    console.log('📅 [BP Page] Calculated date range:', { newStart, newEnd })
    setStartDate(newStart)
    setEndDate(newEnd)
  }
  
  // ============================================================================
  // TOGGLE HANDLER - Set default 7 days when Daily Mode activated
  // ============================================================================
  function handleToggleChange(enabled: boolean) {
    console.log('🔄 [BP Page] Toggle changed:', enabled)
    setIsDateRangeMode(enabled)
    
    if (enabled) {
      // DEFAULT: Set to 7 DAYS
      setActiveQuickFilter('7_DAYS')
      const { startDate: newStart, endDate: newEnd } = calculateQuickDateRange('7_DAYS')
      console.log('📅 [BP Page] Default 7 days:', { newStart, newEnd })
      setStartDate(newStart)
      setEndDate(newEnd)
    }
  }
  
  async function fetchSlicerOptions() {
    try {
      console.log('🔍 [BP Page] Fetching slicer options...')
      const response = await fetch('/api/myr-business-performance/slicer-options')
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ [BP Page] Slicer options loaded:', data)
      
      setSlicerOptions(data)
      
      // Set defaults from API
      if (data.defaults) {
        setSelectedYear(data.defaults.year)
        setSelectedQuarter(data.defaults.quarter)
        if (data.defaults.startDate) setStartDate(data.defaults.startDate)
        if (data.defaults.endDate) setEndDate(data.defaults.endDate)
      }
      
    } catch (error) {
      console.error('❌ [BP Page] Error fetching slicer options:', error)
    } finally {
      setLoadingSlicers(false)
    }
  }
  
  async function fetchKPIData() {
    try {
      setLoadingData(true)
      console.log('🔍 [BP Page] Fetching KPI data...')
      
      // Build API URL with filters
      const params = new URLSearchParams({
        year: selectedYear,
        quarter: selectedQuarter,
        isDateRange: isDateRangeMode.toString(),
        line: 'ALL'
      })
      
      if (isDateRangeMode) {
        params.append('startDate', startDate)
        params.append('endDate', endDate)
      }
      
      const response = await fetch(`/api/myr-business-performance/data?${params}`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ [BP Page] KPI data loaded:', result.data)
        setKpiData(result.data.kpis)
        setChartData(result.data.chartData)
      } else {
        console.error('❌ [BP Page] API returned error:', result.error)
      }
      
    } catch (error) {
      console.error('❌ [BP Page] Error fetching KPI data:', error)
    } finally {
      setLoadingData(false)
    }
  }
  
  // Get available quarters for selected year
  const availableQuarters = slicerOptions?.quarters?.[selectedYear] || ['Q1', 'Q2', 'Q3', 'Q4']
  
  // ============================================================================
  // GET DATE RANGE FOR SELECTED QUARTER (BOUNDED)
  // ============================================================================
  const quarterKey = `${selectedYear}-${selectedQuarter}`
  const quarterDateRange = slicerOptions?.quarterDateRanges?.[quarterKey] || { min: null, max: null }
  
  // ============================================================================
  // UPDATE DATE RANGE WHEN QUARTER CHANGES
  // ============================================================================
  useEffect(() => {
    if (quarterDateRange.min && quarterDateRange.max) {
      setStartDate(quarterDateRange.min)
      setEndDate(quarterDateRange.max)
      console.log(`📅 [BP Page] Quarter changed to ${quarterKey}, date range: ${quarterDateRange.min} to ${quarterDateRange.max}`)
    }
  }, [selectedYear, selectedQuarter, quarterKey, quarterDateRange.min, quarterDateRange.max])
  
  // CUSTOM STYLES FOR BUSINESS PERFORMANCE PAGE - COMPACT & PROFESSIONAL
  const customKPIStyles = `
    /* StatCard - Standard KPI Values */
    .bp-page .stat-card-value {
      font-size: 22px !important;
      line-height: 1.2 !important;
      margin-bottom: 4px !important;
    }
    .bp-page .stat-card-additional-kpi {
      font-size: 10px !important;
      margin-top: 4px !important;
      margin-bottom: 4px !important;
    }
    .bp-page .stat-card-comparison {
      font-size: 11px !important;
      margin-top: 4px !important;
    }
    
    /* DualKPICard - Dual KPI Grid Values */
    .bp-page .stat-card > div > div > div:nth-child(2) {
      font-size: 18px !important;
      line-height: 1.2 !important;
    }
    
    /* Toggle Switch - Date Range Mode */
    .mode-toggle {
      position: relative;
      width: 52px;
      height: 26px;
      background-color: #ef4444; /* Red when OFF */
      border-radius: 13px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }
    .mode-toggle.active {
      background-color: #10b981; /* Green when ON */
    }
    .mode-toggle-knob {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      background-color: #ffffff;
      border-radius: 50%;
      transition: transform 0.3s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .mode-toggle.active .mode-toggle-knob {
      transform: translateX(26px);
    }
  `
  
  // ============================================================================
  // HELPER: FORMAT KPI VALUES
  // ============================================================================
  const formatCurrency = (value: number): string => {
    if (!value) return 'RM 0'
    if (value >= 1000000) return `RM ${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `RM ${(value / 1000).toFixed(1)}K`
    return `RM ${value.toFixed(0)}`
  }
  
  const formatCurrencyFull = (value: number): string => {
    if (!value) return 'RM 0'
    return `RM ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  
  // Format with 2 decimal places (for ATV, PF, GGR User, DA User)
  const formatWith2Decimals = (value: number, prefix: string = 'RM '): string => {
    if (!value) return `${prefix}0.00`
    return `${prefix}${value.toFixed(2)}`
  }
  
  const formatNumber = (value: number): string => {
    if (!value) return '0'
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toFixed(0)
  }
  
  const formatNumberFull = (value: number): string => {
    if (!value) return '0'
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
  
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`
  }
  
  // ============================================================================
  // HELPER: TRANSFORM BRAND GGR DATA FOR STACKED CHART
  // ============================================================================
  const transformBrandGGRData = (data: any[]) => {
    if (!data || data.length === 0) return { series: [], categories: [] }
    
    const categories = data.map(d => d.month)
    
    // ✅ AUTO-DETECT BRANDS from data (dynamic, not hardcoded)
    const brandSet = new Set<string>()
    data.forEach(d => {
      Object.keys(d).forEach(key => {
        if (key !== 'month' && d[key] !== undefined && d[key] > 0) {
          brandSet.add(key)
        }
      })
    })
    
    // Calculate total contribution per brand (sum across all months)
    const brandTotals: Record<string, number> = {}
    Array.from(brandSet).forEach(brand => {
      brandTotals[brand] = data.reduce((sum, d) => sum + (d[brand] || 0), 0)
    })
    
    // Sort brands by total contribution (HIGHEST FIRST)
    const brands = Array.from(brandSet).sort((a, b) => brandTotals[b] - brandTotals[a])
    
    // Default colors for up to 6 brands
    const defaultColors = ['#3B82F6', '#F97316', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b']
    const brandColors: Record<string, string> = {}
    brands.forEach((brand, index) => {
      brandColors[brand] = defaultColors[index % defaultColors.length]
    })
    
    const series = brands.map(brand => ({
      name: brand,
      data: data.map(d => d[brand] || 0),
      color: brandColors[brand]
    }))
    
    return { series, categories }
  }

  return (
    <>
      {/* Custom Styles for Business Performance Page */}
      <style jsx>{customKPIStyles}</style>
      
      <Layout 
        pageTitle="Business Performance"
        customSubHeader={
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 24px',
          width: '100%'
        }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            margin: 0
          }}>
            Wireframe Preview - Design for Management Approval
          </h2>
          
          {/* Slicers */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151', textTransform: 'uppercase' }}>
                Year:
              </span>
              <YearSlicer 
                value={selectedYear} 
                onChange={setSelectedYear}
                years={slicerOptions?.years || []}
              />
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              opacity: isDateRangeMode ? 0.4 : 1,
              pointerEvents: isDateRangeMode ? 'none' : 'auto',
              transition: 'opacity 0.3s ease'
            }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151', textTransform: 'uppercase' }}>
                Quarter:
              </span>
              <QuarterSlicer 
                value={selectedQuarter} 
                onChange={setSelectedQuarter}
                quarters={availableQuarters}
                disabled={isDateRangeMode}
              />
            </div>
            
            {/* TOGGLE: DIANTARA QUARTER DAN QUICK DATE FILTER */}
            <div 
              className={`mode-toggle ${isDateRangeMode ? 'active' : ''}`}
              onClick={() => handleToggleChange(!isDateRangeMode)}
              title={isDateRangeMode ? 'Switch to Month Mode (Click to OFF)' : 'Switch to Date Range Mode (Click to ON)'}
            >
              <div className="mode-toggle-knob" />
            </div>
            
            {/* QUICK DATE FILTER - ALWAYS VISIBLE, DISABLED WHEN TOGGLE OFF */}
            <QuickDateFilter 
              activeFilter={activeQuickFilter}
              onFilterChange={handleQuickFilterChange}
              disabled={!isDateRangeMode}
            />
            
            {/* EDIT TARGET BUTTON - Only for managers */}
            {['manager_myr', 'admin'].includes(userRole) && (
              <button
                onClick={() => setIsTargetModalOpen(true)}
                style={{
                  padding: '0',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#3B82F6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Edit quarterly targets"
              >
                {/* Pencil Icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
      }
    >
      <Frame className="bp-page">
        {/* ROW 1: KPI Cards (6 cards) */}
        <div className="kpi-row" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(6, 1fr)', 
          gap: '18px' 
        }}>
          {/* Target Achieve Rate */}
          <ProgressBarStatCard 
            title="Target Achieve Rate"
            value={kpiData?.currentGGR || 0}
            target={kpiData?.targetGGR || 0}
            unit="%"
            icon="targetCompletion"
          />
          
          {/* Gross Gaming Revenue */}
          <StatCard 
            title="Gross Gaming Revenue"
            value={loadingData ? 'Loading...' : formatCurrencyFull(kpiData?.currentGGR || 0)}
            icon="Net Profit"
            additionalKpi={{
              label: 'Daily Avg',
              value: loadingData ? '-' : formatCurrencyFull((kpiData?.currentGGR || 0) / 31)
            }}
            comparison={{
              percentage: '+0%',
              isPositive: true,
              text: 'MoM'
            }}
          />
          
          {/* Active Member */}
          <StatCard 
            title="Active Member"
            value={loadingData ? 'Loading...' : formatNumberFull(kpiData?.activeMember || 0)}
            icon="Active Member"
            additionalKpi={{
              label: 'Daily Avg',
              value: loadingData ? '-' : formatNumberFull((kpiData?.activeMember || 0) / 31)
            }}
            comparison={{
              percentage: '+0%',
              isPositive: true,
              text: 'MoM'
            }}
          />
          
          {/* Pure Active */}
          <StatCard 
            title="Pure Active"
            value={loadingData ? 'Loading...' : formatNumberFull(kpiData?.pureActive || 0)}
            icon="Pure Active"
            additionalKpi={{
              label: 'Daily Avg',
              value: loadingData ? '-' : formatNumberFull((kpiData?.pureActive || 0) / 31)
            }}
            comparison={{
              percentage: '+0%',
              isPositive: true,
              text: 'MoM'
            }}
          />
          
          {/* ATV & PF */}
          <DualKPICard 
            title="Transaction Metrics"
            icon="Transaction Metrics"
            kpi1={{
              label: 'ATV',
              value: loadingData ? 'Loading...' : formatWith2Decimals(kpiData?.atv || 0, 'RM '),
              comparison: {
                percentage: '+0%',
                isPositive: true
              }
            }}
            kpi2={{
              label: 'PF',
              value: loadingData ? 'Loading...' : formatWith2Decimals(kpiData?.purchaseFrequency || 0, ''),
              comparison: {
                percentage: '+0%',
                isPositive: true
              }
            }}
          />
          
          {/* GGR User & DA User */}
          <DualKPICard 
            title="User Value Metrics"
            icon="User Value Metrics"
            kpi1={{
              label: 'GGR User',
              value: loadingData ? 'Loading...' : formatWith2Decimals(kpiData?.ggrUser || 0, 'RM '),
              comparison: {
                percentage: '+0%',
                isPositive: true
              }
            }}
            kpi2={{
              label: 'DA User',
              value: loadingData ? 'Loading...' : formatWith2Decimals(kpiData?.daUser || 0, 'RM '),
              comparison: {
                percentage: '+0%',
                isPositive: true
              }
            }}
          />
        </div>

        {/* ROW 2: Line Charts (2 charts) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '18px',
          minHeight: '350px'
        }}>
          {/* Forecast Q4 - Actual vs Target vs Forecast */}
          <LineChart 
            series={chartData?.forecastQ4GGR?.series || []}
            categories={chartData?.forecastQ4GGR?.categories || []}
            title="FORECAST Q4 - GROSS GAMING REVENUE"
            currency="MYR"
            chartIcon={getChartIcon('Gross Gaming Revenue')}
            showDataLabels={true}
          />
          
          {/* GGR Trend */}
          <LineChart 
            series={[
              { 
                name: 'Gross Gaming Revenue', 
                data: chartData?.ggrTrend?.map((d: any) => d.ggr) || []
              }
            ]}
            categories={chartData?.ggrTrend?.map((d: any) => d.month) || []}
            title="GROSS GAMING REVENUE TREND"
            currency="MYR"
            chartIcon={getChartIcon('Gross Gaming Revenue')}
            showDataLabels={true}
            color="#3B82F6"
          />
        </div>

        {/* ROW 3: Dual-Axis Charts (2 charts) - Mixed Bar + Line */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '18px',
          minHeight: '350px'
        }}>
          {/* Deposit Amount vs Cases */}
          <MixedChart 
            data={chartData?.depositAmountVsCases?.map((d: any) => ({
              name: d.month,
              barValue: d.amount,
              lineValue: d.cases
            })) || []}
            title="DEPOSIT AMOUNT VS CASES"
            chartIcon={getChartIcon('Deposit Amount')}
            barLabel="Amount"
            lineLabel="Cases"
            barColor="#3B82F6"
            lineColor="#F97316"
            currency="MYR"
          />
          
          {/* Withdraw Amount vs Cases */}
          <MixedChart 
            data={chartData?.withdrawAmountVsCases?.map((d: any) => ({
              name: d.month,
              barValue: d.amount,
              lineValue: d.cases
            })) || []}
            title="WITHDRAW AMOUNT VS CASES"
            chartIcon={getChartIcon('Withdraw Amount')}
            barLabel="Amount"
            lineLabel="Cases"
            barColor="#3B82F6"
            lineColor="#F97316"
            currency="MYR"
          />
        </div>

        {/* ROW 4: Dual Line Chart + Bar Chart */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '18px',
          minHeight: '350px'
        }}>
          {/* Winrate & Withdraw Rate - Dual Line */}
          <LineChart 
            series={[
              { name: 'Winrate', data: chartData?.winrateVsWithdrawRate?.map((d: any) => d.winrate) || [] },
              { name: 'Withdraw Rate', data: chartData?.winrateVsWithdrawRate?.map((d: any) => d.withdrawRate) || [] }
            ]}
            categories={chartData?.winrateVsWithdrawRate?.map((d: any) => d.month) || []}
            title="WINRATE VS WITHDRAW RATE"
            currency="PERCENTAGE"
            chartIcon={getChartIcon('Winrate')}
            showDataLabels={true}
          />
          
          {/* Bonus Usage Rate - PER BRAND */}
          <BarChart 
            series={[
              { name: 'Bonus Usage Rate', data: chartData?.bonusUsageRate?.map((d: any) => d.rate) || [] }
            ]}
            categories={chartData?.bonusUsageRate?.map((d: any) => d.brand) || []}
            title="BONUS USAGE RATE (%)"
            currency="PERCENTAGE"
            chartIcon={getChartIcon('Bonus')}
            color="#F97316"
            showDataLabels={true}
          />
        </div>

        {/* ROW 5: Bar Charts (2 separate bars) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '18px',
          minHeight: '350px'
        }}>
          {/* Retention Rate - PER BRAND */}
          <BarChart 
            series={[
              { name: 'Retention Rate', data: chartData?.retentionVsChurn?.map((d: any) => d.retentionRate) || [], color: '#3B82F6' },
              { name: 'Churn Rate', data: chartData?.retentionVsChurn?.map((d: any) => d.churnRate) || [], color: '#F97316' }
            ]}
            categories={chartData?.retentionVsChurn?.map((d: any) => d.brand) || []}
            title="RETENTION VS CHURN RATE (%)"
            currency="PERCENTAGE"
            chartIcon={getChartIcon('Retention Rate')}
            showDataLabels={true}
          />
          
          {/* Activation Rate - PER BRAND */}
          <BarChart 
            series={[
              { name: 'Activation Rate', data: chartData?.activationRate?.map((d: any) => d.rate) || [] }
            ]}
            categories={chartData?.activationRate?.map((d: any) => d.brand) || []}
            title="ACTIVATION RATE (%)"
            currency="PERCENTAGE"
            chartIcon={getChartIcon('Conversion Rate')}
            color="#3B82F6"
            showDataLabels={true}
          />
        </div>

        {/* ROW 6: Stacked Bar Chart + Sankey Diagram */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '18px',
          minHeight: '350px'
        }}>
          {/* Stacked Bar Chart - Brand GGR Contribution */}
          <StackedBarChart 
            series={transformBrandGGRData(chartData?.brandGGRContribution || []).series}
            categories={transformBrandGGRData(chartData?.brandGGRContribution || []).categories}
            title="BRAND GGR CONTRIBUTION (STACKED)"
            currency="MYR"
            chartIcon={getChartIcon('Gross Gaming Revenue')}
            showDataLabels={true}
          />
          
          {/* Sankey Diagram - Cross-Brand Customer Flow */}
          <SankeyChart 
            data={chartData?.customerFlow || { nodes: [], links: [] }}
            title="CROSS-BRAND CUSTOMER FLOW (SANKEY)"
            chartIcon={getChartIcon('Customer Flow')}
          />
        </div>

        {/* Slicer Info */}
        <div className="slicer-info">
          <p>
            {loadingData 
              ? 'Loading data...'
              : isDateRangeMode 
                ? `Showing data for: ${selectedYear} | Date Range: ${startDate} to ${endDate} | Real Data from Database`
                : `Showing data for: ${selectedYear} | ${selectedQuarter} | Real Data from Database`
            }
          </p>
        </div>
      </Frame>
      
      {/* Target Edit Modal */}
      <TargetEditModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        currency="MYR"
        year={selectedYear}
        userEmail={userEmail}
        userRole={userRole}
        onSaveSuccess={() => {
          console.log('✅ Target saved successfully, refreshing KPI data...')
          fetchKPIData()
        }}
      />
    </Layout>
    </>
  )
}
