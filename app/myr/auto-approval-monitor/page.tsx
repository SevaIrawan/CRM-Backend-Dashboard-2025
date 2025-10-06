'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import { LineSlicer } from '@/components/slicers'
import StatCard from '@/components/StatCard'
import LineChart from '@/components/LineChart'
import BarChart from '@/components/BarChart'
import { getChartIcon } from '@/lib/CentralIcon'
import { formatCurrencyKPI, formatIntegerKPI, formatMoMChange, formatNumericKPI, formatPercentageKPI } from '@/lib/formatHelpers'

// Types for slicer options API
interface SlicerOptions {
  lines: string[]
  years: string[]
  months: string[]
  defaults: {
    line: string
    year: string
    month: string
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
  peakHourProcessingTime: Array<{
    hour: string
    avgProcessingTime: number
  }>
}

export default function MYRAutoApprovalMonitorPage() {
  // Client-side only state
  const [isMounted, setIsMounted] = useState(false)
  
  const [data, setData] = useState<AutoApprovalData | null>(null)
  
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
          dailyAverage: formatCurrencyKPI((data.depositAmount || 0) / calculateDaysInMonth(), 'MYR')
        },
        depositCases: {
          raw: data.depositCases,
          formatted: formatIntegerKPI(data.depositCases || 0),
          dailyAverage: formatIntegerKPI(Math.round((data.depositCases || 0) / calculateDaysInMonth()))
        }
      })
    }
  }, [data])
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null)
  const [selectedLine, setSelectedLine] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [isWeekly, setIsWeekly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Helper function to calculate days in selected month
  const calculateDaysInMonth = () => {
    if (!selectedYear || !selectedMonth) return 30 // fallback
    try {
      // Parse month string (format: "2025-09")
      const [year, month] = selectedMonth.split('-')
      const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1)
      const monthEnd = new Date(parseInt(year), parseInt(month), 0) // Last day of month
      const daysInMonth = monthEnd.getDate()
      console.log('🔍 [DEBUG] Days in month calculation:', { 
        year, month, 
        monthStart: monthStart.toISOString().split('T')[0], 
        monthEnd: monthEnd.toISOString().split('T')[0], 
        daysInMonth 
      })
      return daysInMonth
    } catch (error) {
      console.error('Error calculating days in month:', error)
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
        
        const result = await response.json()
        console.log('📊 [DEBUG] Slicer options result:', result)

        if (result.success) {
          setSlicerOptions(result.data)
          // Auto-set defaults from API
          setSelectedLine(result.data.defaults.line || result.data.lines[0] || '')
          setSelectedYear(result.data.defaults.year || result.data.years[0] || '')
          setSelectedMonth(result.data.defaults.month || result.data.months[0] || '')
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
    console.log('🔄 [DEBUG] useEffect triggered with:', { selectedLine, selectedYear, selectedMonth, isWeekly })
    if (!selectedLine || !selectedYear || !selectedMonth) {
      console.log('❌ [DEBUG] Missing required slicer values, skipping data load')
      return
    }

    const loadKPIData = async () => {
      const callId = Math.random().toString(36).substr(2, 9)
      console.log(`🚀 [DEBUG] Starting API call ${callId}`)
      
      try {
        setIsLoading(true)
        setLoadError(null)
        
        // Use year and month parameters directly from slicers
        console.log('🔍 [DEBUG] Using slicer parameters:', { selectedLine, selectedYear, selectedMonth, isWeekly })
        
        const params = new URLSearchParams({
          line: selectedLine,
          year: selectedYear,
          month: selectedMonth,
          isWeekly: isWeekly.toString()
        })
        
        console.log('🔍 [DEBUG] Loading KPI data with params:', params.toString())
        console.log('🔍 [DEBUG] Full URL:', `/api/myr-auto-approval-monitor/data?${params}`)
        console.log('🔍 [DEBUG] Timestamp:', new Date().toISOString())
        
        const response = await fetch(`/api/myr-auto-approval-monitor/data?${params}`)
        console.log('🔍 [DEBUG] Response status:', response.status, response.statusText)
        console.log('🔍 [DEBUG] Response timestamp:', new Date().toISOString())
        
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
  }, [selectedLine, selectedYear, selectedMonth, isWeekly])


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

        {/* Month Slicer */}
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

        {/* Daily/Weekly Toggle */}
        <div className="slicer-group">
          <label className="slicer-label">MODE:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="dataMode"
                value="daily"
                checked={!isWeekly}
                onChange={() => setIsWeekly(false)}
                style={{ margin: 0 }}
              />
              <span style={{ fontSize: '14px' }}>Daily</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="dataMode"
                value="weekly"
                checked={isWeekly}
                onChange={() => setIsWeekly(true)}
                style={{ margin: 0 }}
              />
              <span style={{ fontSize: '14px' }}>Weekly</span>
            </label>
          </div>
        </div>
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
              <p className="text-lg font-semibold text-gray-800">Loading Auto Approval Monitor</p>
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
                     additionalKpi={{
                       label: "DAILY AVERAGE",
                       value: formatIntegerKPI(Math.round((data?.depositCases || 0) / calculateDaysInMonth()))
                     }}
                     comparison={{
                       percentage: "0%",
                       isPositive: true
                     }}
                   />
                   <StatCard
                     title="TOTAL TRANS AUTOMATION"
                     value={formatIntegerKPI(data?.automation?.automationTransactions || 0)}
                     additionalKpi={{
                       label: "DAILY AVERAGE",
                       value: formatIntegerKPI(Math.round((data?.automation?.automationTransactions || 0) / calculateDaysInMonth()))
                     }}
                     comparison={{
                       percentage: "0%",
                       isPositive: true
                     }}
                   />
                   <StatCard
                     title="AVG PROC TIME AUTOMATION"
                     value={`${(data?.processingTime?.avgAutomation || 0).toFixed(1)} sec`}
                     additionalKpi={{
                       label: "MONTHLY AVERAGE",
                       value: `${(data?.processingTime?.avgAutomation || 0).toFixed(1)} sec`
                     }}
                     comparison={{
                       percentage: "0%",
                       isPositive: true
                     }}
                   />
                   <StatCard
                     title="OVERDUE TRANSACTIONS"
                     value={formatIntegerKPI(data?.performance?.overdueTransactions || 0)}
                     additionalKpi={{
                       label: "MONTHLY TOTAL",
                       value: formatIntegerKPI(data?.performance?.overdueTransactions || 0)
                     }}
                     comparison={{
                       percentage: "0%",
                       isPositive: true
                     }}
                   />
                   <StatCard
                     title="COVERAGE RATE"
                     value={formatPercentageKPI(data?.coverageRate || 0)}
                     additionalKpi={{
                       label: "MONTHLY AVERAGE",
                       value: formatPercentageKPI(data?.coverageRate || 0)
                     }}
                     comparison={{
                       percentage: "0%",
                       isPositive: true
                     }}
                   />
                   <StatCard
                     title="MANUAL TIME SAVED"
                     value={`${(data?.manualTimeSaved || 0).toFixed(1)} hrs`}
                     additionalKpi={{
                       label: "MONTHLY TOTAL",
                       value: `${(data?.manualTimeSaved || 0).toFixed(1)} hrs`
                     }}
                     comparison={{
                       percentage: "0%",
                       isPositive: true
                     }}
                   />
          </div>

          {/* Row 2: Processing Time Charts */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                   <LineChart
                     series={data?.weeklyProcessingTime ? [{
                       name: 'Processing Time',
                       data: data.weeklyProcessingTime.map(item => item.avgProcessingTime)
                     }] : []}
                     categories={data?.weeklyProcessingTime ? data.weeklyProcessingTime.map(item => item.week) : []}
                     title={isWeekly ? "AVERAGE PROCESSING TIME (WEEKLY)" : "AVERAGE PROCESSING TIME (DAILY)"}
                     currency="MYR"
                     hideLegend={true}
                     chartIcon={getChartIcon('Processing Time')}
                   />
                   <LineChart
                     series={data?.weeklyCoverageRate ? [{
                       name: 'Coverage Rate',
                       data: data.weeklyCoverageRate.map(item => item.coverageRate)
                     }] : []}
                     categories={data?.weeklyCoverageRate ? data.weeklyCoverageRate.map(item => item.week) : []}
                     title={isWeekly ? "COVERAGE RATE (WEEKLY TREND)" : "COVERAGE RATE (DAILY TREND)"}
                     currency="MYR"
                     hideLegend={true}
                     color="#FF8C00"
                     chartIcon={getChartIcon('Coverage Rate')}
                   />
                   <BarChart
                     series={data?.weeklyOverdueTransactions ? [{
                       name: 'Overdue Count',
                       data: data.weeklyOverdueTransactions.map(item => item.overdueCount)
                     }] : []}
                     categories={data?.weeklyOverdueTransactions ? data.weeklyOverdueTransactions.map(item => item.week) : []}
                     title={isWeekly ? "OVERDUE TRANSACTIONS (WEEKLY)" : "OVERDUE TRANSACTIONS (DAILY)"}
                     currency="MYR"
                     chartIcon={getChartIcon('Overdue Transactions')}
                   />
                 </div>

                 {/* Row 3: Daily Monitoring Charts */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                   <LineChart
                     series={data?.dailyOverdueCount ? [{
                       name: 'Overdue Count',
                       data: data.dailyOverdueCount.map(item => item.overdueCount)
                     }] : []}
                     categories={data?.dailyOverdueCount ? data.dailyOverdueCount.map(item => item.date) : []}
                     title={isWeekly ? "OVERDUE TRANSACTION COUNT (WEEKLY)" : "DAILY OVERDUE TRANSACTION COUNT"}
                     currency="MYR"
                     hideLegend={true}
                     color="#3B82F6"
                     chartIcon={getChartIcon('Daily Overdue Count')}
                   />
                   <LineChart
                     series={data?.dailyProcessingDistribution ? [{
                       name: 'Median Time',
                       data: data.dailyProcessingDistribution.map(item => item.median)
                     }] : []}
                     categories={data?.dailyProcessingDistribution ? data.dailyProcessingDistribution.map(item => item.date) : []}
                     title={isWeekly ? "PROCESSING TIME DISTRIBUTION (WEEKLY)" : "PROCESSING TIME DISTRIBUTION PER DAY"}
                     currency="MYR"
                     hideLegend={true}
                     color="#8B5CF6"
                     chartIcon={getChartIcon('Processing Time Distribution')}
                   />
                   <LineChart
                     series={data?.peakHourProcessingTime ? [{
                       name: 'Processing Time',
                       data: data.peakHourProcessingTime.map(item => item.avgProcessingTime)
                     }] : []}
                     categories={data?.peakHourProcessingTime ? data.peakHourProcessingTime.map(item => item.hour) : []}
                     title={isWeekly ? "PEAK HOUR PROCESSING TIME (WEEKLY)" : "PEAK HOUR PROCESSING TIME"}
                     currency="MYR"
                     hideLegend={true}
                     color="#EC4899"
                     chartIcon={getChartIcon('Peak Hour Processing Time')}
                   />
                 </div>

          {/* Slicer Info */}
          <div className="slicer-info">
            <p>Showing data for: {selectedLine} | {selectedYear} | {selectedMonth} | {
              isWeekly ? 'WEEKLY MODE' : 'DAILY MODE'
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
          .kpi-row {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .chart-row {
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
    </Layout>
  )
}
