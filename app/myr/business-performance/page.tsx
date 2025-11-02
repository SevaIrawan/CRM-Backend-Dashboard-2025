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
import YearSlicer from '@/components/slicers/YearSlicer'
import QuarterSlicer from '@/components/slicers/QuarterSlicer'
import QuickDateFilter from '@/components/QuickDateFilter'
import TargetEditModal from '@/components/TargetEditModal'
import ActiveMemberDetailsModal from '@/components/ActiveMemberDetailsModal'
import TargetAchieveModal from '@/components/TargetAchieveModal'
import ChartZoomModal from '@/components/ChartZoomModal'
import SubheaderNotice from '@/components/SubheaderNotice'
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
  
  // Slicer States - Default values will be updated from API (auto-detect from max date)
  const [selectedYear, setSelectedYear] = useState('2025')
  const [selectedQuarter, setSelectedQuarter] = useState('Q4')  // ✅ Default will be auto-detected (latest quarter from max date)
  const [startDate, setStartDate] = useState('')  // ✅ Will be set from API
  const [endDate, setEndDate] = useState('')  // ✅ Will be set from API
  
  // Quick Date Filter State (for Daily Mode)
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickDateFilterType>('7_DAYS')
  
  // Toggle State: FALSE = Month Mode (default), TRUE = Daily Mode
  const [isDateRangeMode, setIsDateRangeMode] = useState(false)
  
  // Target Edit Modal State
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false)
  
  // Active Member Details Modal State
  const [isActiveMemberModalOpen, setIsActiveMemberModalOpen] = useState(false)
  
  // Target Achieve Modal State
  const [isTargetAchieveModalOpen, setIsTargetAchieveModalOpen] = useState(false)
  
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
      } catch (error) {
        console.error('❌ [BP Page] Error parsing session:', error)
      }
    }
  }, [])
  
  // KPI Data State
  const [kpiData, setKpiData] = useState<any>(null)
  const [chartData, setChartData] = useState<any>(null)
  const [dailyAverage, setDailyAverage] = useState<any>(null)
  const [comparison, setComparison] = useState<any>(null)
  const [previousPeriod, setPreviousPeriod] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)
  
  // Chart Zoom State
  const [isZoomOpen, setIsZoomOpen] = useState(false)
  const [zoomTitle, setZoomTitle] = useState('')
  const [zoomChartType, setZoomChartType] = useState<'line' | 'bar' | 'stacked' | 'sankey'>('line')
  const [zoomChartProps, setZoomChartProps] = useState<any>(null)
  
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
    setActiveQuickFilter(filterType)
    
    // ✅ CRITICAL: Use LAST DATA DATE from slicerOptions, NOT today!
    // 7 Days = 7 hari dari last data date (misal: last date=Oct 20 → Oct 14-20)
    const quarterKey = `${selectedYear}-${selectedQuarter}`
    const lastDataDate = slicerOptions?.quarterDateRanges?.[quarterKey]?.max
    
    const referenceDate = lastDataDate ? new Date(lastDataDate) : new Date()
    
    // Calculate date range based on filter type
    const { startDate: newStart, endDate: newEnd } = calculateQuickDateRange(filterType, referenceDate)
    
    setStartDate(newStart)
    setEndDate(newEnd)
    // useEffect will auto-trigger fetchKPIData when startDate/endDate changes
  }
  
  // ============================================================================
  // TOGGLE HANDLER - Set default 7 days when Daily Mode activated
  // ============================================================================
  function handleToggleChange(enabled: boolean) {
    setIsDateRangeMode(enabled)
    
    if (enabled) {
      // DEFAULT: Set to 7 DAYS
      setActiveQuickFilter('7_DAYS')
      
      // ✅ CRITICAL: Use LAST DATA DATE from slicerOptions
      const quarterKey = `${selectedYear}-${selectedQuarter}`
      const lastDataDate = slicerOptions?.quarterDateRanges?.[quarterKey]?.max
      const referenceDate = lastDataDate ? new Date(lastDataDate) : new Date()
      
      const { startDate: newStart, endDate: newEnd } = calculateQuickDateRange('7_DAYS', referenceDate)
      setStartDate(newStart)
      setEndDate(newEnd)
      // useEffect will auto-trigger fetchKPIData when isDateRangeMode/startDate/endDate changes
    }
    // useEffect will auto-trigger fetchKPIData when isDateRangeMode changes
  }
  
  async function fetchSlicerOptions() {
    try {
      const response = await fetch('/api/myr-business-performance/slicer-options')
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      
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
      
      // ✅ CRITICAL: Don't fetch if daily mode is ON but dates are empty
      if (isDateRangeMode && (!startDate || !endDate)) {
        console.warn('⚠️ [BP Page] Daily mode active but dates not set yet, skipping fetch')
        setLoadingData(false)
        return
      }
      
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
        setKpiData(result.kpis)
        setChartData(result.charts)
        setDailyAverage(result.dailyAverage)
        setComparison(result.comparison)
        setPreviousPeriod(result.previousPeriod)
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
  // ============================================================================
  // HELPER: Transform API Brand GGR Data to StackedBarChart format
  // API returns: { categories: string[], brands: string[], data: Record<string, number[]> }
  // StackedBarChart expects: { series: Array<{ name, data, color }>, categories: string[] }
  // ============================================================================
  const transformBrandGGRDataFromAPI = (apiData: any) => {
    if (!apiData || !apiData.brands || !apiData.data) {
      return { series: [], categories: [] }
    }
    
    const { categories, brands, data } = apiData
    
    // Calculate total contribution per brand (for sorting)
    const brandTotals: Record<string, number> = {}
    brands.forEach((brand: string) => {
      brandTotals[brand] = data[brand]?.reduce((sum: number, val: number) => sum + val, 0) || 0
    })
    
    // Sort brands by total contribution (HIGHEST FIRST)
    const sortedBrands = brands.sort((a: string, b: string) => brandTotals[b] - brandTotals[a])
    
    // Default colors for up to 6 brands
    const defaultColors = ['#3B82F6', '#F97316', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b']
    
    const series = sortedBrands.map((brand: string, index: number) => ({
      name: brand,
      data: data[brand] || [],
      color: defaultColors[index % defaultColors.length]
    }))
    
    return { series, categories }
  }

  return (
    <Layout 
        pageTitle="Business Performance"
        customSubHeader={
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 24px',
          width: '100%',
          height: '100%'
        }}>
          <div>
            <SubheaderNotice
              show={false}
              label="NOTICE"
              message="Verification in progress — Please allow until 14:00 GMT+7 for adjustment validation to ensure 100% accurate data."
            />
          </div>
          
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
            
            {/* TOGGLE SWITCH - NO LABEL */}
            <div 
              onClick={() => handleToggleChange(!isDateRangeMode)}
              title={isDateRangeMode ? 'Daily Mode (Click to switch to Quarterly)' : 'Quarterly Mode (Click to switch to Daily)'}
              style={{
                position: 'relative',
                width: '52px',
                height: '26px',
                backgroundColor: isDateRangeMode ? '#10b981' : '#ef4444',
                borderRadius: '13px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                width: '20px',
                height: '20px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transform: isDateRangeMode ? 'translateX(26px)' : 'translateX(0)',
                transition: 'transform 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </div>
            
            {/* QUICK DATE FILTER - ALWAYS VISIBLE, DISABLED WHEN TOGGLE OFF */}
            <QuickDateFilter 
              activeFilter={activeQuickFilter}
              onFilterChange={handleQuickFilterChange}
              disabled={!isDateRangeMode}
            />
            
            {/* EDIT TARGET BUTTON - Only for managers, admin, and demo */}
            {['manager_myr', 'admin', 'demo'].includes(userRole) && (
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
      <Frame variant="standard">
        {/* Content Container with proper spacing and scroll */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          marginTop: '20px'
        }}>
          {/* ROW 1: KPI Cards (6 cards) */}
          <div className="kpi-row" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(6, 1fr)', 
            gap: '18px'
          }}>
          {/* Target Achieve Rate */}
          <ProgressBarStatCard 
            title="Target Achieve Rate"
            value={kpiData?.grossGamingRevenue || 0}
            target={kpiData?.targetGGR || 0}
            unit="%"
            onDoubleClick={() => setIsTargetAchieveModalOpen(true)}
            clickable={true}
          />
          
          {/* Gross Gaming Revenue */}
          <StatCard 
            title="Gross Gaming Revenue"
            value={loadingData ? 'Loading...' : formatCurrencyFull(kpiData?.grossGamingRevenue || 0)}
            icon="Net Profit"
            additionalKpi={{
              label: 'Daily Avg',
              value: loadingData ? '-' : formatCurrencyFull(dailyAverage?.grossGamingRevenue || 0)
            }}
            comparison={{
              percentage: loadingData ? '-' : `${comparison?.grossGamingRevenue >= 0 ? '+' : ''}${comparison?.grossGamingRevenue?.toFixed(2) || '0.00'}%`,
              isPositive: (comparison?.grossGamingRevenue || 0) >= 0
            }}
          />
          
          {/* Active Member */}
          <StatCard 
            title="Active Member"
            value={loadingData ? 'Loading...' : formatNumberFull(kpiData?.activeMember || 0)}
            icon="Active Member"
            additionalKpi={{
              label: 'Daily Avg',
              value: loadingData ? '-' : formatNumberFull(dailyAverage?.activeMember || 0)
            }}
            comparison={{
              percentage: loadingData ? '-' : `${comparison?.activeMember >= 0 ? '+' : ''}${comparison?.activeMember?.toFixed(2) || '0.00'}%`,
              isPositive: (comparison?.activeMember || 0) >= 0
            }}
            onDoubleClick={() => setIsActiveMemberModalOpen(true)}
            clickable={true}
          />
          
          {/* Pure User */}
          <StatCard 
            title="Pure User"
            value={loadingData ? 'Loading...' : formatNumberFull(kpiData?.pureUser || 0)}
            icon="Pure User"
            additionalKpi={{
              label: 'Daily Avg',
              value: loadingData ? '-' : formatNumberFull(dailyAverage?.pureUser || 0)
            }}
            comparison={{
              percentage: loadingData ? '-' : `${comparison?.pureUser >= 0 ? '+' : ''}${comparison?.pureUser?.toFixed(2) || '0.00'}%`,
              isPositive: (comparison?.pureUser || 0) >= 0
            }}
          />
          
          {/* DC & WC */}
          <DualKPICard 
            title="Transaction Volume"
            icon="Transaction Metrics"
            kpi1={{
              label: 'DC',
              value: loadingData ? 'Loading...' : formatNumberFull(kpiData?.depositCases || 0),
              comparison: {
                percentage: loadingData ? '-' : `${comparison?.depositCases >= 0 ? '+' : ''}${comparison?.depositCases?.toFixed(2) || '0.00'}%`,
                isPositive: (comparison?.depositCases || 0) >= 0
              }
            }}
            kpi2={{
              label: 'WC',
              value: loadingData ? 'Loading...' : formatNumberFull(kpiData?.withdrawCases || 0),
              comparison: {
                percentage: loadingData ? '-' : `${comparison?.withdrawCases >= 0 ? '+' : ''}${comparison?.withdrawCases?.toFixed(2) || '0.00'}%`,
                isPositive: (comparison?.withdrawCases || 0) >= 0
              }
            }}
          />
          
          {/* DA & WA */}
          <DualKPICard 
            title="Transaction Amount"
            icon="User Value Metrics"
            kpi1={{
              label: 'DA',
              value: loadingData ? 'Loading...' : formatCurrency(kpiData?.depositAmount || 0),
              comparison: {
                percentage: loadingData ? '-' : `${comparison?.depositAmount >= 0 ? '+' : ''}${comparison?.depositAmount?.toFixed(2) || '0.00'}%`,
                isPositive: (comparison?.depositAmount || 0) >= 0
              }
            }}
            kpi2={{
              label: 'WA',
              value: loadingData ? 'Loading...' : formatCurrency(kpiData?.withdrawAmount || 0),
              comparison: {
                percentage: loadingData ? '-' : `${comparison?.withdrawAmount >= 0 ? '+' : ''}${comparison?.withdrawAmount?.toFixed(2) || '0.00'}%`,
                isPositive: (comparison?.withdrawAmount || 0) >= 0
              }
            }}
          />
          </div>

          {/* ROW 2: Line Charts (2 charts) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '18px',
            marginBottom: '24px',
            minHeight: '350px'
          }}>
          {/* Forecast Q4 - Actual vs Target vs Forecast */}
          <LineChart 
            series={[
              { name: 'Actual GGR', data: chartData?.forecastQ4GGR?.actualData || [], color: '#3B82F6' },
              { name: 'Target GGR', data: chartData?.forecastQ4GGR?.targetData || [], color: '#10b981' },
              { name: 'Forecast GGR', data: chartData?.forecastQ4GGR?.forecastData || [], color: '#F97316' }
            ]}
            categories={chartData?.forecastQ4GGR?.categories || []}
            title="FORECAST - GROSS GAMING REVENUE"
            currency="MYR"
            chartIcon={getChartIcon('Gross Gaming Revenue')}
            showDataLabels={true}
            forceSingleYAxis={true}
            clickable={true}
            onDoubleClick={() => {
              setZoomTitle('FORECAST - GROSS GAMING REVENUE')
              setZoomChartType('line')
              setZoomChartProps({
                series: [
                  { name: 'Actual GGR', data: chartData?.forecastQ4GGR?.actualData || [], color: '#3B82F6' },
                  { name: 'Target GGR', data: chartData?.forecastQ4GGR?.targetData || [], color: '#10b981' },
                  { name: 'Forecast GGR', data: chartData?.forecastQ4GGR?.forecastData || [], color: '#F97316' }
                ],
                categories: chartData?.forecastQ4GGR?.categories || [],
                title: 'FORECAST - GROSS GAMING REVENUE',
                currency: 'MYR',
                chartIcon: getChartIcon('Gross Gaming Revenue'),
                showDataLabels: true,
                forceSingleYAxis: true
              })
              setIsZoomOpen(true)
            }}
          />
          
          {/* GGR Trend */}
          <LineChart 
            series={[
              { 
                name: 'Gross Gaming Revenue', 
                data: chartData?.ggrTrend?.data || []
              }
            ]}
            categories={chartData?.ggrTrend?.categories || []}
            title="GROSS GAMING REVENUE TREND"
            currency="MYR"
            chartIcon={getChartIcon('Gross Gaming Revenue')}
            showDataLabels={true}
            color="#3B82F6"
            clickable={true}
            onDoubleClick={() => {
              setZoomTitle('GROSS GAMING REVENUE TREND')
              setZoomChartType('line')
              setZoomChartProps({
                series: [{ name: 'Gross Gaming Revenue', data: chartData?.ggrTrend?.data || [] }],
                categories: chartData?.ggrTrend?.categories || [],
                title: 'GROSS GAMING REVENUE TREND',
                currency: 'MYR',
                chartIcon: getChartIcon('Gross Gaming Revenue'),
                showDataLabels: true,
                color: '#3B82F6'
              })
              setIsZoomOpen(true)
            }}
          />
          </div>

          {/* ROW 3: DA User vs GGR User & ATV vs PF Trend (2 Dual Line Charts) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '18px',
            marginBottom: '24px',
            minHeight: '350px'
          }}>
          {/* DA User vs GGR User Trend */}
          <LineChart 
            series={[
              { name: 'DA User', data: chartData?.daUserVsGgrUser?.daUserData || [] },
              { name: 'GGR User', data: chartData?.daUserVsGgrUser?.ggrUserData || [] }
            ]}
            categories={chartData?.daUserVsGgrUser?.categories || []}
            title="DA USER VS GGR USER TREND"
            chartIcon={getChartIcon('Net Profit')}
            currency="MYR"
            showDataLabels={true}
            clickable={true}
            onDoubleClick={() => {
              setZoomTitle('DA USER VS GGR USER TREND')
              setZoomChartType('line')
              setZoomChartProps({
                series: [
                  { name: 'DA User', data: chartData?.daUserVsGgrUser?.daUserData || [] },
                  { name: 'GGR User', data: chartData?.daUserVsGgrUser?.ggrUserData || [] }
                ],
                categories: chartData?.daUserVsGgrUser?.categories || [],
                title: 'DA USER VS GGR USER TREND',
                currency: 'MYR',
                chartIcon: getChartIcon('Net Profit'),
                showDataLabels: true
              })
              setIsZoomOpen(true)
            }}
          />
          
          {/* ATV vs Purchase Frequency Trend */}
          <LineChart 
            series={[
              { name: 'ATV', data: chartData?.atvVsPf?.atvData || [] },
              { name: 'Purchase Frequency', data: chartData?.atvVsPf?.pfData || [] }
            ]}
            categories={chartData?.atvVsPf?.categories || []}
            title="ATV VS PURCHASE FREQUENCY TREND"
            chartIcon={getChartIcon('Average Transaction Value')}
            currency="MYR"
            showDataLabels={true}
            clickable={true}
            onDoubleClick={() => {
              setZoomTitle('ATV VS PURCHASE FREQUENCY TREND')
              setZoomChartType('line')
              setZoomChartProps({
                series: [
                  { name: 'ATV', data: chartData?.atvVsPf?.atvData || [] },
                  { name: 'Purchase Frequency', data: chartData?.atvVsPf?.pfData || [] }
                ],
                categories: chartData?.atvVsPf?.categories || [],
                title: 'ATV VS PURCHASE FREQUENCY TREND',
                currency: 'MYR',
                chartIcon: getChartIcon('Average Transaction Value'),
                showDataLabels: true
              })
              setIsZoomOpen(true)
            }}
          />
          </div>

          {/* ROW 4: Dual Line Chart + Bar Chart */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '18px',
            marginBottom: '24px',
            minHeight: '350px'
          }}>
          {/* Winrate & Withdraw Rate - Dual Line */}
          <LineChart 
            series={[
              { name: 'Winrate', data: chartData?.winrateVsWithdrawRate?.winrateData || [] },
              { name: 'Withdraw Rate', data: chartData?.winrateVsWithdrawRate?.withdrawalRateData || [] }
            ]}
            categories={chartData?.winrateVsWithdrawRate?.categories || []}
            title="WINRATE VS WITHDRAW RATE"
            currency="PERCENTAGE"
            chartIcon={getChartIcon('Winrate')}
            showDataLabels={true}
            clickable={true}
            onDoubleClick={() => {
              setZoomTitle('WINRATE VS WITHDRAW RATE')
              setZoomChartType('line')
              setZoomChartProps({
                series: [
                  { name: 'Winrate', data: chartData?.winrateVsWithdrawRate?.winrateData || [] },
                  { name: 'Withdraw Rate', data: chartData?.winrateVsWithdrawRate?.withdrawalRateData || [] }
                ],
                categories: chartData?.winrateVsWithdrawRate?.categories || [],
                title: 'WINRATE VS WITHDRAW RATE',
                currency: 'PERCENTAGE',
                chartIcon: getChartIcon('Winrate'),
                showDataLabels: true
              })
              setIsZoomOpen(true)
            }}
          />
          
          {/* Active Member vs Pure Member Trend - Double Bar */}
          <BarChart 
            series={[
              { name: 'Active Member', data: chartData?.activeMemberVsPureMemberTrend?.activeMemberData || [], color: '#3B82F6' },
              { name: 'Pure Member', data: chartData?.activeMemberVsPureMemberTrend?.pureMemberData || [], color: '#F97316' }
            ]}
            categories={chartData?.activeMemberVsPureMemberTrend?.categories || []}
            title="ACTIVE MEMBER VS PURE MEMBER TREND"
            currency="NUMBER"
            chartIcon={getChartIcon('Active Member')}
            showDataLabels={true}
            customLegend={[
              { label: 'Active Member', color: '#3B82F6' },
              { label: 'Pure Member', color: '#F97316' }
            ]}
            clickable={true}
            onDoubleClick={() => {
              setZoomTitle('ACTIVE MEMBER VS PURE MEMBER TREND')
              setZoomChartType('bar')
              setZoomChartProps({
                series: [
                  { name: 'Active Member', data: chartData?.activeMemberVsPureMemberTrend?.activeMemberData || [], color: '#3B82F6' },
                  { name: 'Pure Member', data: chartData?.activeMemberVsPureMemberTrend?.pureMemberData || [], color: '#F97316' }
                ],
                categories: chartData?.activeMemberVsPureMemberTrend?.categories || [],
                title: 'ACTIVE MEMBER VS PURE MEMBER TREND',
                currency: 'NUMBER',
                chartIcon: getChartIcon('Active Member'),
                showDataLabels: true,
                customLegend: [
                  { label: 'Active Member', color: '#3B82F6' },
                  { label: 'Pure Member', color: '#F97316' }
                ]
              })
              setIsZoomOpen(true)
            }}
          />
          </div>

          {/* ROW 5: Bar Charts (2 separate bars) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '18px',
            marginBottom: '24px',
            minHeight: '350px'
          }}>
          {/* Retention Rate - PER BRAND */}
          <BarChart 
            series={[
              { name: 'Retention Rate', data: chartData?.retentionVsChurnRate?.retentionData || [], color: '#3B82F6' },
              { name: 'Churn Rate', data: chartData?.retentionVsChurnRate?.churnData || [], color: '#F97316' }
            ]}
            categories={chartData?.retentionVsChurnRate?.categories || []}
            title="RETENTION VS CHURN RATE (%)"
            currency="PERCENTAGE"
            chartIcon={getChartIcon('Retention Rate')}
            showDataLabels={true}
            customLegend={[
              { label: 'Retention Rate', color: '#3B82F6' },
              { label: 'Churn Rate', color: '#F97316' }
            ]}
            clickable={true}
            onDoubleClick={() => {
              setZoomTitle('RETENTION VS CHURN RATE (%)')
              setZoomChartType('bar')
              setZoomChartProps({
                series: [
                  { name: 'Retention Rate', data: chartData?.retentionVsChurnRate?.retentionData || [], color: '#3B82F6' },
                  { name: 'Churn Rate', data: chartData?.retentionVsChurnRate?.churnData || [], color: '#F97316' }
                ],
                categories: chartData?.retentionVsChurnRate?.categories || [],
                title: 'RETENTION VS CHURN RATE (%)',
                currency: 'PERCENTAGE',
                chartIcon: getChartIcon('Retention Rate'),
                showDataLabels: true,
                customLegend: [
                  { label: 'Retention Rate', color: '#3B82F6' },
                  { label: 'Churn Rate', color: '#F97316' }
                ]
              })
              setIsZoomOpen(true)
            }}
          />
          
          {/* Reactivation Rate (Same as Activation Rate) - PER BRAND */}
          <BarChart 
            series={[
              { name: 'Reactivation Rate', data: chartData?.reactivationRate?.reactivationData || [] }
            ]}
            categories={chartData?.reactivationRate?.categories || []}
            title="REACTIVATION RATE (%)"
            currency="PERCENTAGE"
            chartIcon={getChartIcon('Conversion Rate')}
            color="#3B82F6"
            showDataLabels={true}
            clickable={true}
            onDoubleClick={() => {
              setZoomTitle('REACTIVATION RATE (%)')
              setZoomChartType('bar')
              setZoomChartProps({
                series: [{ name: 'Reactivation Rate', data: chartData?.reactivationRate?.reactivationData || [] }],
                categories: chartData?.reactivationRate?.categories || [],
                title: 'REACTIVATION RATE (%)',
                currency: 'PERCENTAGE',
                chartIcon: getChartIcon('Conversion Rate'),
                color: '#3B82F6',
                showDataLabels: true
              })
              setIsZoomOpen(true)
            }}
          />
          </div>

          {/* ROW 6: Stacked Bar Chart + Bar Chart */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '18px',
            marginBottom: '24px',
            minHeight: '350px'
          }}>
          {/* Stacked Bar Chart - Brand GGR Contribution */}
          <StackedBarChart 
            series={transformBrandGGRDataFromAPI(chartData?.brandGGRContribution || {}).series}
            categories={transformBrandGGRDataFromAPI(chartData?.brandGGRContribution || {}).categories}
            title="BRAND GGR CONTRIBUTION (STACKED)"
            currency="MYR"
            chartIcon={getChartIcon('Gross Gaming Revenue')}
            showDataLabels={true}
            clickable={true}
            onDoubleClick={() => {
              setZoomTitle('BRAND GGR CONTRIBUTION (STACKED)')
              setZoomChartType('stacked')
              setZoomChartProps({
                series: transformBrandGGRDataFromAPI(chartData?.brandGGRContribution || {}).series,
                categories: transformBrandGGRDataFromAPI(chartData?.brandGGRContribution || {}).categories,
                title: 'BRAND GGR CONTRIBUTION (STACKED)',
                currency: 'MYR',
                chartIcon: getChartIcon('Gross Gaming Revenue'),
                showDataLabels: true
              })
              setIsZoomOpen(true)
            }}
          />
          
          {/* AVG Bonus Usage - PER BRAND */}
          <BarChart 
            series={[
              { name: 'Avg Bonus Usage', data: chartData?.bonusUsagePerBrand?.data || [] }
            ]}
            categories={chartData?.bonusUsagePerBrand?.categories || []}
            title="AVG BONUS USAGE"
            currency="MYR"
            chartIcon={getChartIcon('Bonus')}
            color="#F97316"
            showDataLabels={true}
            clickable={true}
            onDoubleClick={() => {
              setZoomTitle('AVG BONUS USAGE')
              setZoomChartType('bar')
              setZoomChartProps({
                series: [{ name: 'Avg Bonus Usage', data: chartData?.bonusUsagePerBrand?.data || [] }],
                categories: chartData?.bonusUsagePerBrand?.categories || [],
                title: 'AVG BONUS USAGE',
                currency: 'MYR',
                chartIcon: getChartIcon('Bonus'),
                color: '#F97316',
                showDataLabels: true
              })
              setIsZoomOpen(true)
            }}
          />
          </div>

          {/* ROW 7: Sankey Chart (Full Width) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '18px',
            marginBottom: '24px',
            minHeight: '400px'
          }}>
          {/* Sankey Diagram - Pure User GGR Distribution */}
          <SankeyChart 
            data={chartData?.sankey || { nodes: [], links: [] }}
            title="PURE USER GGR DISTRIBUTION PER BRAND"
            chartIcon={getChartIcon('Customer Flow')}
            clickable={true}
            onDoubleClick={() => {
              setZoomTitle('PURE USER GGR DISTRIBUTION PER BRAND')
              setZoomChartType('sankey')
              setZoomChartProps({
                data: chartData?.sankey || { nodes: [], links: [] },
                title: 'PURE USER GGR DISTRIBUTION PER BRAND',
                chartIcon: getChartIcon('Customer Flow')
              })
              setIsZoomOpen(true)
            }}
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
          fetchKPIData()
        }}
      />
      
      {/* Active Member Details Modal */}
      <ActiveMemberDetailsModal
        isOpen={isActiveMemberModalOpen}
        onClose={() => setIsActiveMemberModalOpen(false)}
        totalCount={kpiData?.activeMember || 0}
        currency="MYR"
        year={selectedYear}
        quarter={selectedQuarter}
        startDate={startDate}
        endDate={endDate}
        isDateRange={isDateRangeMode}
      />
      
      {/* Target Achieve Modal */}
      <TargetAchieveModal
        isOpen={isTargetAchieveModalOpen}
        onClose={() => setIsTargetAchieveModalOpen(false)}
        currency="MYR"
        year={selectedYear}
        quarter={selectedQuarter}
        startDate={startDate}
        endDate={endDate}
        isDateRange={isDateRangeMode}
      />
      
      {/* Chart Zoom Modal */}
      <ChartZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        title={zoomTitle}
        dataCount={zoomChartProps?.categories?.length || 4}
      >
        {zoomChartProps && zoomChartType === 'line' && (
          <LineChart 
            {...zoomChartProps}
            clickable={false}
          />
        )}
        {zoomChartProps && zoomChartType === 'bar' && (
          <BarChart 
            {...zoomChartProps}
            clickable={false}
          />
        )}
        {zoomChartProps && zoomChartType === 'stacked' && (
          <StackedBarChart 
            {...zoomChartProps}
            clickable={false}
          />
        )}
        {zoomChartProps && zoomChartType === 'sankey' && (
          <SankeyChart 
            {...zoomChartProps}
            clickable={false}
          />
        )}
      </ChartZoomModal>
    </Layout>
  )
}
