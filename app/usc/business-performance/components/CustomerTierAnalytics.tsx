'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Frame from '@/components/Frame'
import CustomerTierTrends from './CustomerTierTrends'
import CustomerTierMovement from './CustomerTierMovement'
import TierMetricsComparison from './TierMetricsComparison'
import ComingSoon from '@/components/ComingSoon'

interface Alert {
  id: string
  title: string
  message: string
  type: 'warning' | 'info' | 'error'
  priority?: 'high' | 'medium' | 'low'
}

interface CustomerTierAnalyticsProps {
  dateRange: string
  brand: string
  squadLead: string
  channel: string
  searchTrigger?: number
  tierNameOptions: Array<{ name: string; group: string | null }>
}

export default function CustomerTierAnalytics({ 
  dateRange, 
  brand, 
  squadLead, 
  channel,
  searchTrigger,
  tierNameOptions
}: CustomerTierAnalyticsProps) {
  // ✅ Shared Period A and B states - digunakan oleh CustomerTierTrends dan CustomerTierMovement
  const [periodAStart, setPeriodAStart] = useState<string>('')
  const [periodAEnd, setPeriodAEnd] = useState<string>('')
  const [periodBStart, setPeriodBStart] = useState<string>('')
  const [periodBEnd, setPeriodBEnd] = useState<string>('')
  
  // Alert system states
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)

  // Helper function to calculate date ranges
  // Period B (current): Based on Date Range slicer
  // Period A (last): Same date range in previous month
  const calculateDateRanges = (rangeType: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (rangeType === 'Last 7 Days') {
      // Period B: Last 7 days (current)
      const periodBEnd = new Date(today)
      const periodBStart = new Date(today)
      periodBStart.setDate(today.getDate() - 6) // Last 7 days including today
      
      // Period A: Same date range in previous month
      const periodAEnd = new Date(periodBEnd)
      periodAEnd.setMonth(periodAEnd.getMonth() - 1) // Same day, previous month
      const periodAStart = new Date(periodBStart)
      periodAStart.setMonth(periodAStart.getMonth() - 1) // Same day, previous month
      
      return {
        periodA: {
          start: periodAStart.toISOString().split('T')[0],
          end: periodAEnd.toISOString().split('T')[0]
        },
        periodB: {
          start: periodBStart.toISOString().split('T')[0],
          end: periodBEnd.toISOString().split('T')[0]
        }
      }
    } else if (rangeType === 'Last 30 Days') {
      // Period B: Last 30 days (current)
      const periodBEnd = new Date(today)
      const periodBStart = new Date(today)
      periodBStart.setDate(today.getDate() - 29) // Last 30 days including today
      
      // Period A: Same date range in previous month
      const periodAEnd = new Date(periodBEnd)
      periodAEnd.setMonth(periodAEnd.getMonth() - 1) // Same day, previous month
      const periodAStart = new Date(periodBStart)
      periodAStart.setMonth(periodAStart.getMonth() - 1) // Same day, previous month
      
      return {
        periodA: {
          start: periodAStart.toISOString().split('T')[0],
          end: periodAEnd.toISOString().split('T')[0]
        },
        periodB: {
          start: periodBStart.toISOString().split('T')[0],
          end: periodBEnd.toISOString().split('T')[0]
        }
      }
    }
    
    return null
  }
  
  // Helper function to calculate Period A from Period B (for Custom Date Range)
  // Period A: Same date range in previous month
  const calculatePeriodAFromPeriodB = (periodBStart: string, periodBEnd: string) => {
    if (!periodBStart || !periodBEnd) return null
    
    const periodBStartDate = new Date(periodBStart)
    const periodBEndDate = new Date(periodBEnd)
    
    // Period A: Same date range in previous month
    const periodAEnd = new Date(periodBEndDate)
    periodAEnd.setMonth(periodAEnd.getMonth() - 1) // Same day, previous month
    const periodAStart = new Date(periodBStartDate)
    periodAStart.setMonth(periodAStart.getMonth() - 1) // Same day, previous month
    
    return {
      start: periodAStart.toISOString().split('T')[0],
      end: periodAEnd.toISOString().split('T')[0]
    }
  }

  // Initialize date ranges based on dateRange - HARUS di-set sebelum fetchData
  useEffect(() => {
    if (dateRange === 'Custom') {
      // Custom mode: Set to empty (Select Date) - user harus pilih manual
      setPeriodAStart('')
      setPeriodAEnd('')
      setPeriodBStart('')
      setPeriodBEnd('')
    } else {
      // Auto mode: Calculate dates for Last 7 Days or Last 30 Days immediately
      const calculatedRanges = calculateDateRanges(dateRange)
      if (calculatedRanges) {
        setPeriodAStart(calculatedRanges.periodA.start)
        setPeriodAEnd(calculatedRanges.periodA.end)
        setPeriodBStart(calculatedRanges.periodB.start)
        setPeriodBEnd(calculatedRanges.periodB.end)
      }
    }
  }, [dateRange])
  
  // Auto-calculate Period A when Period B changes (for Custom Date Range only)
  // Period A = Previous period with same duration as Period B
  useEffect(() => {
    // Only auto-calculate for Custom Date Range mode
    // For Last 7/30 Days, Period A is already calculated in calculateDateRanges
    if (dateRange === 'Custom' && periodBStart && periodBEnd) {
      const calculatedPeriodA = calculatePeriodAFromPeriodB(periodBStart, periodBEnd)
      if (calculatedPeriodA) {
        setPeriodAStart(calculatedPeriodA.start)
        setPeriodAEnd(calculatedPeriodA.end)
      }
    }
  }, [periodBStart, periodBEnd, dateRange])
  
  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      return
    }

    setLoadingAlerts(true)
    try {
      const userAllowedBrands = localStorage.getItem('user_allowed_brands')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }

      if (userAllowedBrands) {
        headers['x-user-allowed-brands'] = userAllowedBrands
      }

      const params = new URLSearchParams({
        periodAStart,
        periodAEnd,
        periodBStart,
        periodBEnd,
        brand: brand || 'All',
        squadLead: squadLead || 'All',
        channel: channel || 'All'
      })

      const response = await fetch(`/api/usc-business-performance/tier-analytics-alerts?${params}`, {
        headers
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        setAlerts(result.data)
        
        // Save alerts to localStorage for Header dropdown (always save, even if empty)
        try {
          localStorage.setItem('tier_analytics_alerts', JSON.stringify(result.data))
        } catch (e) {
          console.error('Error saving alerts to localStorage:', e)
        }
        
        // Update notification count in localStorage (use actual alerts length, not default)
        try {
          const existingNotification = localStorage.getItem('business_performance_notification')
          const notificationData = existingNotification 
            ? JSON.parse(existingNotification)
            : { marketing: 0, tierAnalytics: 0 }
          
          // Always use actual alerts length (can be 0 if no alerts)
          notificationData.tierAnalytics = result.data.length || 0
          notificationData.tab = 'tier-analytics'
          notificationData.count = result.data.length || 0
          
          localStorage.setItem('business_performance_notification', JSON.stringify(notificationData))
          
          // Trigger storage event for Header component to update
          window.dispatchEvent(new Event('storage'))
        } catch (e) {
          console.error('Error updating notification count:', e)
        }
      } else {
        // If no data or error, set alerts to empty array
        setAlerts([])
        try {
          localStorage.setItem('tier_analytics_alerts', JSON.stringify([]))
          
          // Update notification count to 0
          const existingNotification = localStorage.getItem('business_performance_notification')
          const notificationData = existingNotification 
            ? JSON.parse(existingNotification)
            : { marketing: 0, tierAnalytics: 0 }
          
          notificationData.tierAnalytics = 0
          notificationData.tab = 'tier-analytics'
          notificationData.count = 0
          
          localStorage.setItem('business_performance_notification', JSON.stringify(notificationData))
          window.dispatchEvent(new Event('storage'))
        } catch (e) {
          console.error('Error clearing alerts:', e)
        }
      }
    } catch (error) {
      console.error('❌ Error fetching alerts:', error)
      setAlerts([])
      
      // Clear alerts from localStorage on error
      try {
        localStorage.setItem('tier_analytics_alerts', JSON.stringify([]))
        
        // Update notification count to 0
        const existingNotification = localStorage.getItem('business_performance_notification')
        const notificationData = existingNotification 
          ? JSON.parse(existingNotification)
          : { marketing: 0, tierAnalytics: 0 }
        
        notificationData.tierAnalytics = 0
        notificationData.tab = 'tier-analytics'
        notificationData.count = 0
        
        localStorage.setItem('business_performance_notification', JSON.stringify(notificationData))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {
        console.error('Error clearing alerts on error:', e)
      }
    } finally {
      setLoadingAlerts(false)
    }
  }, [periodAStart, periodAEnd, periodBStart, periodBEnd, brand, squadLead, channel])
  
  // Fetch alerts when periods or filters change
  useEffect(() => {
    if (periodAStart && periodAEnd && periodBStart && periodBEnd && searchTrigger !== undefined) {
      fetchAlerts()
    }
  }, [periodAStart, periodAEnd, periodBStart, periodBEnd, brand, squadLead, channel, searchTrigger, fetchAlerts])
  
  // Alert modal trigger no longer needed - dropdown is handled in Header
  // Build footer info message
  const today = new Date()
  const year = today.getFullYear()
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
  const month = monthNames[today.getMonth()]
  
  const getFooterInfo = () => {
    const parts = []
    parts.push(year.toString())
    parts.push(month)
    parts.push('USC')
    parts.push(brand || 'ALL')
    
    return `Showing data for: ${parts.join(' | ')}`
  }

  return (
    <Frame variant="standard">
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '32px', // ✅ BP STANDARD: 32px gap (LUAS seperti Overview!)
        marginTop: '20px', // ✅ BP STANDARD: 20px top spacing
        marginBottom: '32px', // ✅ BP STANDARD: 32px bottom spacing
        width: '100%',
        paddingBottom: '80px', // Extra padding untuk ensure slicer-info visible
        minHeight: 'fit-content'
      }}>
        {/* Row 1: Customer Tier Trends - 1 Metric = 1 Frame Canvas */}
        <CustomerTierTrends 
          dateRange={dateRange}
          brand={brand}
          squadLead={squadLead}
          channel={channel}
          searchTrigger={searchTrigger}
          tierNameOptions={tierNameOptions}
          periodAStart={periodAStart}
          periodAEnd={periodAEnd}
          periodBStart={periodBStart}
          periodBEnd={periodBEnd}
          onPeriodAChange={(start, end) => {
            setPeriodAStart(start)
            setPeriodAEnd(end)
          }}
          onPeriodBChange={(start, end) => {
            setPeriodBStart(start)
            setPeriodBEnd(end)
          }}
        />
        
        {/* Row 2: Tier Metrics Comparison - 1 Metric = 1 Frame Canvas */}
        <TierMetricsComparison 
          periodAStart={periodAStart}
          periodAEnd={periodAEnd}
          periodBStart={periodBStart}
          periodBEnd={periodBEnd}
          brand={brand}
          squadLead={squadLead}
          channel={channel}
          searchTrigger={searchTrigger}
        />
        
        {/* Row 3: Customer Tier Movement Analysis - 1 Metric = 1 Frame Canvas */}
        <CustomerTierMovement 
          dateRange={dateRange}
          brand={brand}
          squadLead={squadLead}
          channel={channel}
          searchTrigger={searchTrigger}
          periodAStart={periodAStart}
          periodAEnd={periodAEnd}
          periodBStart={periodBStart}
          periodBEnd={periodBEnd}
        />
        
        {/* Slicer Info - Footer - MUST BE VISIBLE */}
        <div 
          className="slicer-info" 
          style={{ 
            marginTop: '32px', 
            marginBottom: '60px',
            flexShrink: 0,
            width: '100%',
            zIndex: 10,
            display: 'block',
            visibility: 'visible',
            opacity: 1
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{getFooterInfo()}</p>
        </div>
        
        {/* Debug spacer to ensure scroll works */}
        <div style={{ height: '20px', width: '100%', flexShrink: 0 }} />
      </div>
    </Frame>
  )
}

