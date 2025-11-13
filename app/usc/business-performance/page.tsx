'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StatCard from '@/components/StatCard'
import DualKPICard from '@/components/DualKPICard'
import { LineSlicer } from '@/components/slicers'
import { getChartIcon } from '@/lib/CentralIcon'
import { formatCurrencyKPI, formatIntegerKPI, formatMoMChange, formatNumericKPI, formatPercentageKPI } from '@/lib/formatHelpers'

// Types for slicer options
interface SlicerOptions {
  years: string[]
  months: { value: string; label: string; years: string[] }[]
  lines: string[]
  defaults: {
    year: string
    month: string
    line: string
  }
}

// Types for KPI data
interface USCBPKPIData {
  grossGamingRevenue: number
  activeMemberRate: number
  retentionRate: number
  activeMember: number
  pureMember: number
  avgTransactionValue: number
  purchaseFrequency: number
  depositAmount: number
  withdrawAmount: number
}

export default function USCBusinessPerformancePage() {
  // Hydration fix
  const [isMounted, setIsMounted] = useState(false)
  
  // Slicer states
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null)
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedLine, setSelectedLine] = useState('')
  const [selectedCurrency] = useState('USC') // Locked to USC
  
  // Data states
  const [kpiData, setKpiData] = useState<USCBPKPIData | null>(null)
  const [momData, setMomData] = useState<any>(null)
  const [loadingSlicers, setLoadingSlicers] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Hydration fix
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Load slicer options on mount
  useEffect(() => {
    const loadSlicerOptions = async () => {
      try {
        setLoadingSlicers(true)
        setLoadError(null)
        
        // Get user's allowed brands from localStorage
        const userStr = localStorage.getItem('nexmax_user')
        const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
        
        const response = await fetch('/api/usc-business-performance/slicer-options', {
          headers: {
            'x-user-allowed-brands': JSON.stringify(allowedBrands)
          },
          cache: 'no-store'
        })
        
        const result = await response.json()
        
        if (result.success) {
          setSlicerOptions(result.data)
          setSelectedYear(result.data.defaults.year)
          setSelectedMonth(result.data.defaults.month)
          setSelectedLine(result.data.defaults.line)
          setLoadingSlicers(false)
          
          // AUTO-LOAD data pertama kali dengan default values (selepas slicer ready)
          loadKPIDataWithDefaults(
            result.data.defaults.year,
            result.data.defaults.month,
            result.data.defaults.line,
            allowedBrands
          )
        } else {
          setLoadError('Failed to load slicer options')
          setLoadingSlicers(false)
        }
      } catch (error) {
        console.error('❌ [USC BP] Error loading slicer options:', error)
        setLoadError('Failed to load slicer options')
        setLoadingSlicers(false)
      }
    }
    
    loadSlicerOptions()
  }, [])
  
  // Helper function to load data with specific values
  const loadKPIDataWithDefaults = async (year: string, month: string, line: string, allowedBrands: any) => {
    try {
      setLoadingData(true)
      setLoadError(null)
      
      console.log('🔄 [USC BP] Auto-loading default data...')
      
      const params = new URLSearchParams({
        year,
        month,
        line
      })
      
      const response = await fetch(`/api/usc-business-performance/data?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setKpiData(result.data.kpis)
        setMomData(result.data.mom)
        console.log('✅ [USC BP] Default data loaded')
      } else {
        setLoadError(result.error || 'Failed to load KPI data')
      }
    } catch (error) {
      console.error('❌ [USC BP] Error loading default data:', error)
      setLoadError('Failed to load KPI data')
    } finally {
      setLoadingData(false)
    }
  }
  
  // Function to load KPI data (triggered by Search button only)
  const loadKPIData = async () => {
    if (!selectedYear || !selectedMonth || !selectedLine) {
      console.warn('⚠️ [USC BP] Missing required filters')
      return
    }
    
    try {
      setLoadingData(true)
      setLoadError(null)
      
      console.log('🔄 [USC BP] Loading KPI data...')
      
      // Get user's allowed brands
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const params = new URLSearchParams({
        year: selectedYear,
        month: selectedMonth,
        line: selectedLine
      })
      
      const response = await fetch(`/api/usc-business-performance/data?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setKpiData(result.data.kpis)
        setMomData(result.data.mom)
        console.log('✅ [USC BP] KPI data loaded successfully')
      } else {
        setLoadError(result.error || 'Failed to load KPI data')
      }
    } catch (error) {
      console.error('❌ [USC BP] Error loading KPI data:', error)
      setLoadError('Failed to load KPI data')
    } finally {
      setLoadingData(false)
    }
  }
  
  // Custom SubHeader
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        <span className="filter-export-text"> </span>
      </div>
      
      <div className="subheader-controls">
        {/* YEAR SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">YEAR:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="slicer-select"
          >
            {slicerOptions?.years?.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        {/* MONTH SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">MONTH:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="slicer-select"
          >
            {slicerOptions?.months
              ?.filter(month => !selectedYear || month.years.includes(selectedYear))
              ?.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
          </select>
        </div>
        
        {/* LINE SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <LineSlicer 
            lines={slicerOptions?.lines || []}
            selectedLine={selectedLine}
            onLineChange={setSelectedLine}
          />
        </div>
        
        {/* SEARCH BUTTON */}
        <button 
          onClick={loadKPIData}
          disabled={loadingData}
          className={`export-button ${loadingData ? 'disabled' : ''}`}
          style={{ backgroundColor: '#10b981' }}
        >
          {loadingData ? 'Loading...' : 'Search'}
        </button>
      </div>
    </div>
  )
  
  // Render nothing until mounted (hydration fix)
  if (!isMounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-800">Loading USC Business Performance</p>
              <p className="text-sm text-gray-500">Fetching real-time data from database...</p>
              <div className="flex items-center justify-center space-x-1 mt-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Loading slicers and initial data - show smooth spinner
  if (loadingSlicers || (loadingData && !kpiData)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-800">Loading USC Business Performance</p>
              <p className="text-sm text-gray-500">Fetching real-time data from database...</p>
              <div className="flex items-center justify-center space-x-1 mt-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Error state
  if (loadError) {
    return (
      <Layout customSubHeader={customSubHeader}>
        <Frame variant="standard">
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
            <p>Error: {loadError}</p>
          </div>
        </Frame>
      </Layout>
    )
  }
  
  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="standard">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          marginTop: '20px'
        }}>
          {/* ROW 1: ALL 6 KPI CARDS (STANDARD PROJECT - 1 ROW!) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(6, 1fr)', 
            gap: '18px'
          }}>
            {/* Gross Gaming Revenue */}
            <StatCard 
              title="GROSS GAMING REVENUE"
              value={formatCurrencyKPI(kpiData?.grossGamingRevenue || 0, selectedCurrency)}
              icon="Gross Gaming Revenue"
              comparison={{
                percentage: formatMoMChange(momData?.grossGamingRevenue || 0),
                isPositive: (momData?.grossGamingRevenue || 0) >= 0
              }}
            />
            
            {/* Active Member Rate */}
            <StatCard 
              title="ACTIVE MEMBER RATE"
              value={formatPercentageKPI(kpiData?.activeMemberRate || 0)}
              icon="Active Member"
              comparison={{
                percentage: formatMoMChange(momData?.activeMemberRate || 0),
                isPositive: (momData?.activeMemberRate || 0) >= 0
              }}
            />
            
            {/* Retention Rate */}
            <StatCard 
              title="RETENTION RATE"
              value={formatPercentageKPI(kpiData?.retentionRate || 0)}
              icon="Retention Rate"
              comparison={{
                percentage: formatMoMChange(momData?.retentionRate || 0),
                isPositive: (momData?.retentionRate || 0) >= 0
              }}
            />
            {/* Active Member & Pure Member */}
            <DualKPICard 
              title="USER ENGAGEMENT"
              icon="Active Member"
              kpi1={{
                label: 'ACTIVE MEMBER',
                value: formatIntegerKPI(kpiData?.activeMember || 0),
                comparison: {
                  percentage: formatMoMChange(momData?.activeMember || 0),
                  isPositive: (momData?.activeMember || 0) >= 0
                }
              }}
              kpi2={{
                label: 'PURE MEMBER',
                value: formatIntegerKPI(kpiData?.pureMember || 0),
                comparison: {
                  percentage: formatMoMChange(momData?.pureMember || 0),
                  isPositive: (momData?.pureMember || 0) >= 0
                }
              }}
            />
            
            {/* ATV & PF */}
            <DualKPICard 
              title="TRANSACTION METRICS"
              icon="Average Transaction Value"
              kpi1={{
                label: 'ATV',
                value: formatCurrencyKPI(kpiData?.avgTransactionValue || 0, selectedCurrency),
                comparison: {
                  percentage: formatMoMChange(momData?.avgTransactionValue || 0),
                  isPositive: (momData?.avgTransactionValue || 0) >= 0
                }
              }}
              kpi2={{
                label: 'PF',
                value: formatNumericKPI(kpiData?.purchaseFrequency || 0),
                comparison: {
                  percentage: formatMoMChange(momData?.purchaseFrequency || 0),
                  isPositive: (momData?.purchaseFrequency || 0) >= 0
                }
              }}
            />
            
            {/* Deposit Amount & Withdraw Amount */}
            <DualKPICard 
              title="TRANSACTION AMOUNT"
              icon="Deposit Amount"
              kpi1={{
                label: 'DEPOSIT',
                value: formatCurrencyKPI(kpiData?.depositAmount || 0, selectedCurrency),
                comparison: {
                  percentage: formatMoMChange(momData?.depositAmount || 0),
                  isPositive: (momData?.depositAmount || 0) >= 0
                }
              }}
              kpi2={{
                label: 'WITHDRAW',
                value: formatCurrencyKPI(kpiData?.withdrawAmount || 0, selectedCurrency),
                comparison: {
                  percentage: formatMoMChange(momData?.withdrawAmount || 0),
                  isPositive: (momData?.withdrawAmount || 0) >= 0
                }
              }}
            />
          </div>
          
          {/* Slicer Info */}
          <div className="slicer-info">
            <p>
              {loadingData 
                ? 'Loading data...'
                : `Showing data for: ${selectedYear} | ${selectedMonth} | ${selectedLine} | Real Data from Database`
              }
            </p>
          </div>
        </div>
      </Frame>
    </Layout>
  )
}

