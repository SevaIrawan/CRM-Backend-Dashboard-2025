'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import { LineSlicer } from '@/components/slicers'
import StatCard from '@/components/StatCard'
import LineChart from '@/components/LineChart'
import BarChart from '@/components/BarChart'
import OverdueDetailsModal from '@/components/OverdueDetailsModal'
import ChartZoomModal from '@/components/ChartZoomModal'
import QuickDateFilter from '@/components/QuickDateFilter'
import { getChartIcon } from '@/lib/CentralIcon'
import { formatCurrencyKPI, formatIntegerKPI, formatMoMChange, formatNumericKPI, formatPercentageKPI } from '@/lib/formatHelpers'
import { QuickDateFilterType, calculateQuickDateRange } from '@/lib/businessPerformanceHelper'

// Types for slicer options API
interface SlicerOptions {
  lines: string[]
  years: string[]
  months: string[]
  monthDateRanges: Record<string, { min: string | null, max: string | null }>
  defaults: {
    line: string
    year: string
    month: string
    startDate: string | null
    endDate: string | null
  }
}

interface AutoApprovalData {
  // Main KPIs
  depositAmount: number
  depositCases: number
  averageProcessingTime: number
  overdueTransactions: number
  coverageRate: number
  manualTimeSaved: number
  
  // Comprehensive KPI Data
  automation?: {
    automationTransactions: number
    manualTransactions: number
    automationRate: number
    manualProcessingRate: number
    automationAmountRate: number
  }
  
  processingTime?: {
    avgAll: number
    avgAutomation: number
    avgManual: number
    efficiencyRatio: number
  }
  
  performance?: {
    overdueTransactions: number
    fastProcessingRate: number
    overdueRate: number
    automationOverdue: number
    manualOverdue: number
  }
  
  // Debug Information
  debug: {
    totalCases: number
    autoApprovalCases: number
    manualCases: number
    manualAvgProcessingTime: number
    autoAvgProcessingTime: number
    timeSavedPerTransaction: number
    totalTimeSavedSeconds: number
    autoApprovalTransactionVolume: number
  }
  
  // Chart Data
  weeklyProcessingTime: Array<{
    week: string
    avgProcessingTime: number
  }>
  weeklyCoverageRate: Array<{
    week: string
    coverageRate: number
  }>
  weeklyOverdueTransactions: Array<{
    week: string
    overdueCount: number
  }>
  automationOverdueTransactionsTrend: {
    series: Array<{
      name: string
      data: number[]
    }>
    categories: string[]
  }
  totalTransactionsTrend: {
    series: Array<{
      name: string
      data: number[]
    }>
    categories: string[]
  }
  automationTransactionsTrend: {
    series: Array<{
      name: string
      data: number[]
    }>
    categories: string[]
  }
  dailyOverdueCount: Array<{
    date: string
    overdueCount: number
  }>
  dailyProcessingDistribution: Array<{
    date: string
    min: number
    q1: number
    median: number
    q3: number
    max: number
  }>
  dailyAutomationProcessingDistribution: Array<{
    date: string
    min: number
    q1: number
    median: number
    q3: number
    max: number
  }>
  peakHourProcessingTime: Array<{
    period: string
    peakHour: string
    maxTotalTransactions: number
    automationTransactions: number
    avgProcessingTimeAutomation: number
  }>
  momComparison?: {
    totalTransactions: number
    automationTransactions: number
    avgAutomationProcessingTime: number
    automationOverdue: number
    coverageRate: number
    manualTimeSaved: number
  }
  metadata?: {
    totalRecords: number
    dateRange: {
      start: number | null
      end: number | null
    }
    automationStartDate: string
    lastUpdated: string
    maxDateData: number
  }
}

export default function MYRAutoApprovalMonitorPage() {
  // Client-side only state
  const [isMounted, setIsMounted] = useState(false)
  
  const [data, setData] = useState<AutoApprovalData | null>(null)
  
  // Date Range States (for Daily Mode)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Quick Date Filter State (for Daily Mode)
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickDateFilterType>('7_DAYS')
  
  // Toggle State: FALSE = Monthly Mode (default), TRUE = Daily Mode
  const [isDateRangeMode, setIsDateRangeMode] = useState(false)
  
  // Debug logging for data state changes
  useEffect(() => {
    console.log('📊 [DEBUG] Data state changed:', data)
    if (data) {
      console.log('📊 [DEBUG] Data values:', {
        depositAmount: data.depositAmount,
        depositCases: data.depositCases,
        coverageRate: data.coverageRate,
        manualTimeSaved: data.manualTimeSaved
      })
      console.log('🎯 [DEBUG] Rendering StatCard with data:', {
        depositAmount: data.depositAmount,
        depositCases: data.depositCases,
        coverageRate: data.coverageRate,
        manualTimeSaved: data.manualTimeSaved
      })
      console.log('🎯 [DEBUG] Formatted values:', {
        depositAmountFormatted: formatCurrencyKPI(data.depositAmount || 0, 'MYR'),
        depositCasesFormatted: formatIntegerKPI(data.depositCases || 0),
        coverageRateFormatted: formatPercentageKPI(data.coverageRate || 0),
        manualTimeSavedFormatted: `${(data.manualTimeSaved || 0).toFixed(1)} hrs`
      })
      console.log('🎯 [DEBUG] StatCard values:', {
        depositAmount: {
          raw: data.depositAmount,
          formatted: formatCurrencyKPI(data.depositAmount || 0, 'MYR'),
          dailyAverage: formatCurrencyKPI((data.depositAmount || 0) / calculateActiveDays(), 'MYR')
        },
        depositCases: {
          raw: data.depositCases,
          formatted: formatIntegerKPI(data.depositCases || 0),
          dailyAverage: formatIntegerKPI(Math.round((data.depositCases || 0) / calculateActiveDays()))
        }
      })
    }
  }, [data])
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null)
  const [selectedLine, setSelectedLine] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [showOverdueModal, setShowOverdueModal] = useState(false)
  
  // State for chart zoom modal
  const [isZoomOpen, setIsZoomOpen] = useState(false)
  const [zoomChartType, setZoomChartType] = useState<'line' | 'bar' | null>(null)
  const [zoomChartProps, setZoomChartProps] = useState<any>(null)
  const [zoomTitle, setZoomTitle] = useState('')
  
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Helper function to format MoM comparison
  const formatMoMComparison = (value: number) => {
    const absValue = Math.abs(value)
    const sign = value >= 0 ? '+' : ''
    return `${sign}${absValue.toFixed(1)}%`
  }
  
  // Handler for chart zoom (double-click)
  const handleChartZoom = (chartProps: any, chartType: 'line' | 'bar', title: string) => {
    setZoomChartProps(chartProps)
    setZoomChartType(chartType)
    setZoomTitle(title)
    setIsZoomOpen(true)
  }

  // ============================================================================
  // QUICK DATE FILTER HANDLER
  // ============================================================================
  function handleQuickFilterChange(filterType: QuickDateFilterType) {
    setActiveQuickFilter(filterType)
    
    // Use LAST DATA DATE from slicerOptions, NOT today
    const monthKey = `${selectedYear}-${selectedMonth}`
    const lastDataDate = slicerOptions?.monthDateRanges?.[monthKey]?.max
    
    const referenceDate = lastDataDate ? new Date(lastDataDate) : new Date()
    
    // Calculate date range based on filter type
    const { startDate: newStart, endDate: newEnd } = calculateQuickDateRange(filterType, referenceDate)
    
    setStartDate(newStart)
    setEndDate(newEnd)
  }
  
  // ============================================================================
  // TOGGLE HANDLER - Set default 7 days when Daily Mode activated
  // ============================================================================
  function handleToggleChange(enabled: boolean) {
    setIsDateRangeMode(enabled)
    
    if (enabled) {
      // DEFAULT: Set to 7 DAYS
      setActiveQuickFilter('7_DAYS')
      
      // Use LAST DATA DATE from slicerOptions
      const monthKey = `${selectedYear}-${selectedMonth}`
      const lastDataDate = slicerOptions?.monthDateRanges?.[monthKey]?.max
      const referenceDate = lastDataDate ? new Date(lastDataDate) : new Date()
      
      const { startDate: newStart, endDate: newEnd } = calculateQuickDateRange('7_DAYS', referenceDate)
      setStartDate(newStart)
      setEndDate(newEnd)
    }
  }

  // Helper function to calculate active days using STANDARD LOGIC
  const calculateActiveDays = () => {
    if (!selectedYear || !selectedMonth) return 30 // fallback
    
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear().toString()
    const currentMonthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December']
    const currentMonth = currentMonthNames[currentDate.getMonth()]
    
    // STANDARD LOGIC: If current ongoing month, use max date data from database
    if (selectedYear === currentYear && selectedMonth === currentMonth) {
      // Use max date data from API response
      const maxDateData = data?.metadata?.maxDateData || 0
      if (maxDateData > 0) {
        console.log('📅 [STANDARD LOGIC] Current ongoing month detected, using max date data:', maxDateData)
        return maxDateData
      } else {
        // Fallback to current day if no data
        const currentDay = currentDate.getDate()
        console.log('📅 [STANDARD LOGIC] Current ongoing month, no data available, using current day:', currentDay)
        return currentDay
      }
    }
    
    // STANDARD LOGIC: For past months, use total days in month
    try {
      const year = parseInt(selectedYear)
      const monthName = selectedMonth
      
      // Convert month name to number
      const monthNumber = currentMonthNames.indexOf(monthName) + 1
      
      if (monthNumber === 0) return 30 // fallback if month not found
      
      const monthStart = new Date(year, monthNumber - 1, 1)
      const monthEnd = new Date(year, monthNumber, 0) // Last day of month
      const totalDays = monthEnd.getDate()
      
      console.log('📅 [STANDARD LOGIC] Past/completed month detected, using total days:', { 
        year, monthName, monthNumber, totalDays 
      })
      return totalDays
    } catch (error) {
      console.error('Error calculating active days:', error)
      return 30 // fallback
    }
  }

  // Ensure client-side only rendering
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Load slicer options on component mount
  useEffect(() => {
    const loadSlicerOptions = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)

        console.log('🔍 [DEBUG] Loading slicer options...')
        const response = await fetch('/api/myr-auto-approval-monitor/slicer-options')
        console.log('🔍 [DEBUG] Slicer options response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('📊 [DEBUG] Slicer options result:', result)

        if (result.success) {
          setSlicerOptions(result.data)
          // Auto-set defaults from API
          setSelectedLine(result.data.defaults.line || result.data.lines[0] || '')
          setSelectedYear(result.data.defaults.year || result.data.years[0] || '')
          setSelectedMonth(result.data.defaults.month || result.data.months[0] || '')
          if (result.data.defaults.startDate) setStartDate(result.data.defaults.startDate)
          if (result.data.defaults.endDate) setEndDate(result.data.defaults.endDate)
          console.log('✅ [DEBUG] Slicer options loaded and defaults set')
        } else {
          setLoadError('Failed to load slicer options')
        }
      } catch (error) {
        console.error('Error loading slicer options:', error)
        setLoadError('Failed to load slicer options')
      } finally {
        setIsLoading(false)
      }
    }

    loadSlicerOptions()
  }, [])

  // Load KPI data when slicers change
  useEffect(() => {
    console.log('🔄 [DEBUG] useEffect triggered with:', { selectedLine, selectedYear, selectedMonth, isDateRangeMode })
    if (!selectedLine || !selectedYear || !selectedMonth) {
      console.log('❌ [DEBUG] Missing required slicer values, skipping data load')
      return
    }
    
    // Don't fetch if daily mode is ON but dates are empty
    if (isDateRangeMode && (!startDate || !endDate)) {
      console.warn('⚠️ [DEBUG] Daily mode active but dates not set yet, skipping fetch')
      return
    }

    const loadKPIData = async () => {
      const callId = Math.random().toString(36).substr(2, 9)
      console.log(`🚀 [DEBUG] Starting API call ${callId}`)
      
      try {
        setIsLoading(true)
        setLoadError(null)
        
        // Use year and month parameters directly from slicers
        console.log('🔍 [DEBUG] Using slicer parameters:', { selectedLine, selectedYear, selectedMonth, isDateRangeMode })
        
        const params = new URLSearchParams({
          line: selectedLine,
          year: selectedYear,
          month: selectedMonth,
          isDateRange: isDateRangeMode.toString()
        })
        
        // Add date range params if in daily mode
        if (isDateRangeMode && startDate && endDate) {
          params.append('startDate', startDate)
          params.append('endDate', endDate)
        }
        
        console.log('🔍 [DEBUG] Loading KPI data with params:', params.toString())
        console.log('🔍 [DEBUG] Full URL:', `/api/myr-auto-approval-monitor/data?${params}`)
        console.log('🔍 [DEBUG] Timestamp:', new Date().toISOString())
        
        const response = await fetch(`/api/myr-auto-approval-monitor/data?${params}`)
        console.log('🔍 [DEBUG] Response status:', response.status, response.statusText)
        console.log('🔍 [DEBUG] Response timestamp:', new Date().toISOString())
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('📊 [DEBUG] API Response:', result.success ? 'SUCCESS' : 'FAILED', result)
        
        if (result.success) {
          console.log('✅ [DEBUG] Setting data:', result.data)
          console.log('✅ [DEBUG] Data keys:', Object.keys(result.data))
          console.log('✅ [DEBUG] Deposit Amount:', result.data.depositAmount, 'Type:', typeof result.data.depositAmount)
          console.log('✅ [DEBUG] Deposit Cases:', result.data.depositCases, 'Type:', typeof result.data.depositCases)
          console.log('✅ [DEBUG] Volume data:', result.data.volume)
          console.log('🔍 [DEBUG] COMPARISON - API vs Volume:', {
            apiDepositAmount: result.data.depositAmount,
            volumeTotalAmount: result.data.volume?.totalAmount,
            apiDepositCases: result.data.depositCases,
            volumeTotalTransactions: result.data.volume?.totalTransactions
          })
          setData(result.data)
          console.log('✅ [DEBUG] Data set successfully')
        } else {
          console.log('❌ [DEBUG] API returned error:', result)
          setLoadError('Failed to load KPI data')
        }
      } catch (error) {
        console.error('Error loading KPI data:', error)
        setLoadError('Failed to load KPI data')
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(loadKPIData, 100)
    return () => clearTimeout(timeoutId)
  }, [selectedLine, selectedYear, selectedMonth, isDateRangeMode, startDate, endDate])


  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        {/* Title area - left side */}
      </div>
      
      <div className="subheader-controls">
        {/* Line Slicer */}
        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <LineSlicer 
            lines={slicerOptions?.lines || []}
            selectedLine={selectedLine}
            onLineChange={setSelectedLine}
          />
        </div>

        {/* Year Slicer */}
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
            {slicerOptions?.years?.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Month Slicer - Disabled when Daily Mode is active */}
        <div className="slicer-group">
          <label className="slicer-label">MONTH:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={isDateRangeMode}
            className="subheader-select"
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: isDateRangeMode ? '#F3F4F6' : 'white',
              fontSize: '14px',
              color: isDateRangeMode ? '#9CA3AF' : '#374151',
              cursor: isDateRangeMode ? 'not-allowed' : 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '140px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            {slicerOptions?.months?.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        {/* Daily Mode Toggle (Red/Green) */}
        <div className="slicer-group">
          <label className="slicer-label">DAILY MODE:</label>
          <div 
            className={`mode-toggle ${isDateRangeMode ? 'active' : ''}`}
            onClick={() => handleToggleChange(!isDateRangeMode)}
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
            <div 
              className="mode-toggle-knob"
              style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                width: '20px',
                height: '20px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: 'transform 0.3s ease',
                transform: isDateRangeMode ? 'translateX(26px)' : 'translateX(0)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
          </div>
        </div>

        {/* Quick Date Filter - Only visible when Daily Mode is ON */}
        {isDateRangeMode && (
          <div className="slicer-group">
            <label className="slicer-label">DATE RANGE:</label>
            <QuickDateFilter
              activeFilter={activeQuickFilter}
              onFilterChange={handleQuickFilterChange}
            />
          </div>
        )}
      </div>
    </div>
  )

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-800">Initializing Dashboard</p>
              <p className="text-sm text-gray-500">Preparing client-side components...</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-800">Loading Auto Approval Deposit Monitoring MYR</p>
              <p className="text-sm text-gray-500">Fetching real-time data from database...</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (loadError) {
    return (
      <Layout>
        <div className="error-container">
          <p>Error: {loadError}</p>
        </div>
      </Layout>
    )
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
                 {/* BARIS 1: KPI CARDS (6 CARDS ROW) */}
                 <div className="kpi-row">
                  <StatCard
                    title="TOTAL TRANSACTIONS"
                    value={formatIntegerKPI(data?.depositCases || 0)}
                    icon="TOTAL TRANSACTIONS"
                     additionalKpi={{
                       label: "DAILY AVERAGE",
                       value: formatIntegerKPI(Math.round((data?.depositCases || 0) / calculateActiveDays()))
                     }}
                     comparison={{
                       percentage: formatMoMComparison(data?.momComparison?.totalTransactions || 0),
                       isPositive: (data?.momComparison?.totalTransactions || 0) >= 0
                     }}
                   />
                  <StatCard
                    title="TOTAL TRANS AUTOMATION"
                    value={formatIntegerKPI(data?.automation?.automationTransactions || 0)}
                    icon="TOTAL TRANS AUTOMATION"
                     additionalKpi={{
                       label: "DAILY AVERAGE",
                       value: formatIntegerKPI(Math.round((data?.automation?.automationTransactions || 0) / calculateActiveDays()))
                     }}
                     comparison={{
                       percentage: formatMoMComparison(data?.momComparison?.automationTransactions || 0),
                       isPositive: (data?.momComparison?.automationTransactions || 0) >= 0
                     }}
                   />
                  <StatCard
                    title="AVG PROC TIME AUTOMATION"
                    value={`${(data?.processingTime?.avgAutomation || 0).toFixed(1)} sec`}
                    icon="AVG PROC TIME AUTOMATION"
                     additionalKpi={{
                       label: "DAILY AVERAGE",
                       value: "-"
                     }}
                     comparison={{
                       percentage: formatMoMComparison(data?.momComparison?.avgAutomationProcessingTime || 0),
                       isPositive: (data?.momComparison?.avgAutomationProcessingTime || 0) >= 0
                     }}
                   />
                  <StatCard
                    title="OVERDUE TRANS AUTOMATION"
                    value={formatIntegerKPI(data?.performance?.automationOverdue || 0)}
                    icon="OVERDUE TRANS AUTOMATION"
                     additionalKpi={{
                       label: "DAILY AVERAGE",
                       value: formatIntegerKPI(Math.round((data?.performance?.automationOverdue || 0) / calculateActiveDays()))
                     }}
                     comparison={{
                       percentage: formatMoMComparison(data?.momComparison?.automationOverdue || 0),
                       isPositive: (data?.momComparison?.automationOverdue || 0) >= 0
                     }}
                     onClick={() => setShowOverdueModal(true)}
                     clickable={true}
                   />
                  <StatCard
                    title="COVERAGE RATE"
                    value={formatPercentageKPI(data?.coverageRate || 0)}
                    icon="COVERAGE RATE"
                     additionalKpi={{
                       label: "DAILY AVERAGE",
                       value: "-"
                     }}
                     comparison={{
                       percentage: formatMoMComparison(data?.momComparison?.coverageRate || 0),
                       isPositive: (data?.momComparison?.coverageRate || 0) >= 0
                     }}
                   />
                  <StatCard
                    title="MANUAL TIME SAVED"
                    value={`${(data?.manualTimeSaved || 0).toFixed(1)} hrs`}
                    icon="MANUAL TIME SAVED"
                     additionalKpi={{
                       label: "DAILY AVERAGE",
                       value: `${((data?.manualTimeSaved || 0) / calculateActiveDays()).toFixed(1)} hrs`
                     }}
                     comparison={{
                       percentage: formatMoMComparison(data?.momComparison?.manualTimeSaved || 0),
                       isPositive: (data?.momComparison?.manualTimeSaved || 0) >= 0
                     }}
                   />
          </div>

          {/* Row 2: Processing Time & Coverage Rate Charts */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                   <LineChart
                     series={data?.weeklyProcessingTime ? [{
                       name: 'Auto Approval Processing Time',
                       data: data.weeklyProcessingTime.map(item => item.avgProcessingTime)
                     }] : []}
                     categories={data?.weeklyProcessingTime ? data.weeklyProcessingTime.map(item => item.week) : []}
                     title={isDateRangeMode ? "AVERAGE PROCESSING TIME AUTOMATION (DAILY)" : "AVERAGE PROCESSING TIME AUTOMATION (MONTHLY)"}
                     currency="MYR"
                     hideLegend={true}
                     showDataLabels={true}
                     chartIcon={getChartIcon('Processing Time')}
                     clickable={true}
                     onDoubleClick={() => handleChartZoom(
                       {
                         series: data?.weeklyProcessingTime ? [{
                           name: 'Auto Approval Processing Time',
                           data: data.weeklyProcessingTime.map(item => item.avgProcessingTime)
                         }] : [],
                         categories: data?.weeklyProcessingTime ? data.weeklyProcessingTime.map(item => item.week) : [],
                         hideLegend: true,
                         showDataLabels: true,
                         color: '#3B82F6'
                       },
                       'line',
                       isDateRangeMode ? "AVERAGE PROCESSING TIME AUTOMATION (DAILY)" : "AVERAGE PROCESSING TIME AUTOMATION (MONTHLY)"
                     )}
                   />
                   <LineChart
                     series={data?.weeklyCoverageRate ? [{
                       name: 'Coverage Rate',
                       data: data.weeklyCoverageRate.map(item => item.coverageRate)
                     }] : []}
                     categories={data?.weeklyCoverageRate ? data.weeklyCoverageRate.map(item => item.week) : []}
                     title={isDateRangeMode ? "COVERAGE RATE (DAILY TREND)" : "COVERAGE RATE (MONTHLY TREND)"}
                     currency="MYR"
                     hideLegend={true}
                     showDataLabels={true}
                     color="#FF8C00"
                     chartIcon={getChartIcon('Coverage Rate')}
                     clickable={true}
                     onDoubleClick={() => handleChartZoom(
                       {
                         series: data?.weeklyCoverageRate ? [{
                           name: 'Coverage Rate',
                           data: data.weeklyCoverageRate.map(item => item.coverageRate)
                         }] : [],
                         categories: data?.weeklyCoverageRate ? data.weeklyCoverageRate.map(item => item.week) : [],
                         hideLegend: true,
                         showDataLabels: true,
                         color: '#FF8C00'
                       },
                       'line',
                       isDateRangeMode ? "COVERAGE RATE (DAILY TREND)" : "COVERAGE RATE (MONTHLY TREND)"
                     )}
                   />
                 </div>

                 {/* Row 3: Overdue Transactions Charts */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                   <BarChart
                     series={data?.totalTransactionsTrend && data?.automationTransactionsTrend ? [
                       {
                         name: 'Total Transaction Trend',
                         data: data.totalTransactionsTrend.series[0].data,
                         color: '#3B82F6'  // Blue
                       },
                       {
                         name: 'Total Trans Automation',
                         data: data.automationTransactionsTrend.series[0].data,
                         color: '#FF8C00'  // Orange
                       }
                     ] : []}
                     categories={data?.totalTransactionsTrend ? data.totalTransactionsTrend.categories : []}
                     title={isDateRangeMode ? "TRANSACTION VOLUME TREND ANALYSIS (DAILY)" : "TRANSACTION VOLUME TREND ANALYSIS (MONTHLY)"}
                     currency="MYR"
                     showDataLabels={true}
                     chartIcon={getChartIcon('Transaction Volume')}
                     customLegend={[
                       { label: 'Total Transaction', color: '#3B82F6' },
                       { label: 'Total Trans Automation', color: '#FF8C00' }
                     ]}
                     clickable={true}
                     onDoubleClick={() => handleChartZoom(
                       {
                         series: data?.totalTransactionsTrend && data?.automationTransactionsTrend ? [
                           {
                             name: 'Total Transaction Trend',
                             data: data.totalTransactionsTrend.series[0].data,
                             color: '#3B82F6'
                           },
                           {
                             name: 'Total Trans Automation',
                             data: data.automationTransactionsTrend.series[0].data,
                             color: '#FF8C00'
                           }
                         ] : [],
                         categories: data?.totalTransactionsTrend ? data.totalTransactionsTrend.categories : [],
                         showDataLabels: true,
                         customLegend: [
                           { label: 'Total Transaction', color: '#3B82F6' },
                           { label: 'Total Trans Automation', color: '#FF8C00' }
                         ]
                       },
                       'bar',
                       isDateRangeMode ? "TRANSACTION VOLUME TREND ANALYSIS (DAILY)" : "TRANSACTION VOLUME TREND ANALYSIS (MONTHLY)"
                     )}
                   />
                   <LineChart
                     series={data?.dailyOverdueCount ? [{
                       name: 'Automation Overdue Count',
                       data: data.dailyOverdueCount.map(item => item.overdueCount)
                     }] : []}
                     categories={data?.dailyOverdueCount ? data.dailyOverdueCount.map(item => item.date) : []}
                     title={isDateRangeMode ? "OVERDUE TRANS AUTOMATION (DAILY)" : "OVERDUE TRANS AUTOMATION (MONTHLY)"}
                     currency="MYR"
                     hideLegend={true}
                     showDataLabels={true}
                     color="#3B82F6"
                     chartIcon={getChartIcon('Daily Overdue Count')}
                     clickable={true}
                     onDoubleClick={() => handleChartZoom(
                       {
                         series: data?.dailyOverdueCount ? [{
                           name: 'Automation Overdue Count',
                           data: data.dailyOverdueCount.map(item => item.overdueCount)
                         }] : [],
                         categories: data?.dailyOverdueCount ? data.dailyOverdueCount.map(item => item.date) : [],
                         hideLegend: true,
                         showDataLabels: true,
                         color: '#3B82F6'
                       },
                       'line',
                       isDateRangeMode ? "OVERDUE TRANS AUTOMATION (DAILY)" : "OVERDUE TRANS AUTOMATION (MONTHLY)"
                     )}
                   />
                 </div>

                 {/* Row 4: Processing Distribution & Peak Hour Charts */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                   <LineChart
                     series={data?.dailyAutomationProcessingDistribution ? [{
                       name: 'Automation Median Time',
                       data: data.dailyAutomationProcessingDistribution.map(item => item.median)
                     }] : []}
                     categories={data?.dailyAutomationProcessingDistribution ? data.dailyAutomationProcessingDistribution.map(item => item.date) : []}
                     title={isDateRangeMode ? "PROCESSING TIME DISTRIBUTION AUTOMATION (DAILY)" : "PROCESSING TIME DISTRIBUTION AUTOMATION (MONTHLY)"}
                     currency="MYR"
                     hideLegend={true}
                     showDataLabels={true}
                     color="#F97316"
                     chartIcon={getChartIcon('Processing Time Distribution')}
                     clickable={true}
                     onDoubleClick={() => handleChartZoom(
                       {
                         series: data?.dailyAutomationProcessingDistribution ? [{
                           name: 'Automation Median Time',
                           data: data.dailyAutomationProcessingDistribution.map(item => item.median)
                         }] : [],
                         categories: data?.dailyAutomationProcessingDistribution ? data.dailyAutomationProcessingDistribution.map(item => item.date) : [],
                         hideLegend: true,
                         showDataLabels: true,
                         color: '#F97316'
                       },
                       'line',
                       isDateRangeMode ? "PROCESSING TIME DISTRIBUTION AUTOMATION (DAILY)" : "PROCESSING TIME DISTRIBUTION AUTOMATION (MONTHLY)"
                     )}
                   />
                   <LineChart
                     series={data?.peakHourProcessingTime ? [
                       {
                         name: 'Automation Trans',
                         data: data.peakHourProcessingTime.map(item => item.automationTransactions)
                       },
                       {
                         name: 'AVG Proc Time Automation',
                         data: data.peakHourProcessingTime.map(item => item.avgProcessingTimeAutomation)
                       }
                     ] : []}
                     categories={data?.peakHourProcessingTime ? data.peakHourProcessingTime.map(item => item.period) : []}
                     title="PEAK HOUR PROC TIME AUTOMATION"
                     currency="MYR"
                     hideLegend={false}
                     showDataLabels={true}
                     color="#3B82F6"
                     chartIcon={getChartIcon('Peak Hour Processing Time')}
                     peakHourData={data?.peakHourProcessingTime}
                     clickable={true}
                     onDoubleClick={() => handleChartZoom(
                       {
                         series: data?.peakHourProcessingTime ? [
                           {
                             name: 'Automation Trans',
                             data: data.peakHourProcessingTime.map(item => item.automationTransactions)
                           },
                           {
                             name: 'AVG Proc Time Automation',
                             data: data.peakHourProcessingTime.map(item => item.avgProcessingTimeAutomation)
                           }
                         ] : [],
                         categories: data?.peakHourProcessingTime ? data.peakHourProcessingTime.map(item => item.period) : [],
                         hideLegend: false,
                         showDataLabels: true,
                         color: '#3B82F6',
                         peakHourData: data?.peakHourProcessingTime
                       },
                       'line',
                       "PEAK HOUR PROC TIME AUTOMATION"
                     )}
                   />
                 </div>

          {/* Slicer Info */}
          <div className="slicer-info">
            <p>Showing data for: {selectedLine} | {selectedYear} | {
              isDateRangeMode 
                ? `${startDate} to ${endDate} (Daily Mode)` 
                : `${selectedMonth} (Monthly Mode)`
            }</p>
          </div>
        </div>
      </Frame>

      <style jsx>{`
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
          gap: 15px;
          margin-bottom: 20px;
        }


        @media (max-width: 1440px) {
          .kpi-row {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .chart-row {
            grid-template-columns: repeat(2, 1fr);
          }
          
          /* Ensure 2-column layout for all chart rows */
          .grid.grid-cols-1.md\\:grid-cols-2 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 1024px) {
          .kpi-row {
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
        }

        @media (max-width: 768px) {
          .kpi-row {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }

        @media (max-width: 480px) {
          .kpi-row {
            grid-template-columns: 1fr;
            gap: 6px;
          }
        }
      `}</style>
      
      {/* Chart Zoom Modal */}
      <ChartZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        title={zoomTitle}
        dataCount={zoomChartProps?.categories?.length || 4}
      >
        {zoomChartType === 'line' && zoomChartProps && (
          <LineChart 
            {...zoomChartProps}
            clickable={false}
          />
        )}
        {zoomChartType === 'bar' && zoomChartProps && (
          <BarChart 
            {...zoomChartProps}
            clickable={false}
          />
        )}
      </ChartZoomModal>
      
      {/* Overdue Details Modal */}
      <OverdueDetailsModal
        isOpen={showOverdueModal}
        onClose={() => setShowOverdueModal(false)}
        overdueCount={data?.performance?.automationOverdue || 0}
        line={selectedLine}
        year={selectedYear}
        month={selectedMonth}
        isDateRange={isDateRangeMode}
        startDate={startDate}
        endDate={endDate}
      />
    </Layout>
  )
}
