'use client'

import React, { useState, useEffect } from 'react'
import Frame from '@/components/Frame'
import CustomerTierTrends from './CustomerTierTrends'
import CustomerTierMovement from './CustomerTierMovement'
import ComingSoon from '@/components/ComingSoon'

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

  // Helper function to calculate date ranges (same logic as Customer Tier Trends)
  const calculateDateRanges = (rangeType: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (rangeType === 'Last 7 Days') {
      // Period B: Last 7 days (current)
      const periodBEnd = new Date(today)
      const periodBStart = new Date(today)
      periodBStart.setDate(today.getDate() - 6) // Last 7 days including today
      
      // Period A: Previous month last 7 days (same day range, previous month)
      const periodAEnd = new Date(periodBEnd)
      periodAEnd.setMonth(periodAEnd.getMonth() - 1)
      const periodAStart = new Date(periodBStart)
      periodAStart.setMonth(periodAStart.getMonth() - 1)
      
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
      
      // Period A: Previous month last 30 days (same day range, previous month)
      const periodAEnd = new Date(periodBEnd)
      periodAEnd.setMonth(periodAEnd.getMonth() - 1)
      const periodAStart = new Date(periodBStart)
      periodAStart.setMonth(periodAStart.getMonth() - 1)
      
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
        <div style={{
          width: '100%',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          minHeight: '400px'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            width: '100%',
            height: '100%'
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              width: '100%',
              marginBottom: '8px'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: 700, 
                  color: '#1f2937',
                  margin: 0,
                  marginBottom: '4px'
                }}>
                  Tier Metrics Comparison
                </h3>
                <p style={{ 
                  fontSize: '13px', 
                  color: '#6b7280',
                  margin: 0
                }}>
                  Utilization and contribution analysis across all tiers
                </p>
              </div>
            </div>
            
            {/* Horizontal Separator Line */}
            <div style={{
              width: '100%',
              height: '1px',
              backgroundColor: '#e5e7eb',
              marginBottom: '12px'
            }} />
            
            {/* Coming Soon Content */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px'
            }}>
              <ComingSoon 
                title="Tier Metrics Comparison"
                message="Detailed tier comparison metrics will be available soon"
              />
            </div>
          </div>
        </div>
        
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

