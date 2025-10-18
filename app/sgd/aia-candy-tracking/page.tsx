'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StatCard from '@/components/StatCard'
import ComingSoon from '@/components/ComingSoon'
import LineSlicer from '@/components/slicers/LineSlicer'
import YearSlicer from '@/components/slicers/YearSlicer'
import MonthSlicer from '@/components/slicers/MonthSlicer'
import { getChartIcon } from '@/lib/CentralIcon'
import { formatIntegerKPI, formatPercentageKPI } from '@/lib/formatHelpers'

interface ChartData {
  labels: string[]
  monthlyKPIs: {
    groupInteractionCoverageRate: number
    customerTriggerCount: number
    uniqueInteractionUsers: number
    customerTriggerRatio: number
    groupActivityChange: number
    repeatInteractionRate: number
  }
  metrics: {
    groupInteractionCoverageRate: number[]
    customerTriggerCount: number[]
    uniqueInteractionUsers: number[]
    customerTriggerRatio: number[]
    groupActivityChange: number[]
    repeatInteractionRate: number[]
  }
}

export default function AiaCandyTrackingPage() {
  // Slicer state
  interface SlicerOptions {
    lines: string[]
    years: string[]
    months: string[]
    defaults: { line: string; year: string; month: string }
  }
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null)
  const [line, setLine] = useState('')
  const [year, setYear] = useState<string>('')
  const [month, setMonth] = useState<string>('')
  const [isWeekly, setIsWeekly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    monthlyKPIs: {
      groupInteractionCoverageRate: 0,
      customerTriggerCount: 0,
      uniqueInteractionUsers: 0,
      customerTriggerRatio: 0,
      groupActivityChange: 0,
      repeatInteractionRate: 0
    },
    metrics: {
      groupInteractionCoverageRate: [],
      customerTriggerCount: [],
      uniqueInteractionUsers: [],
      customerTriggerRatio: [],
      groupActivityChange: [],
      repeatInteractionRate: []
    }
  })

  // Load slicer options for SGD
  useEffect(() => {
    const loadSlicerOptions = async () => {
      try {
        const res = await fetch('/api/sgd-aia-candy-tracking/slicer-options')
        const result = await res.json()
        if (result.success) {
          setSlicerOptions(result.data)
          setLine(result.data.defaults.line || result.data.lines[0] || '')
          setYear(result.data.defaults.year || result.data.years[0] || '')
          setMonth(result.data.defaults.month || result.data.months[0] || '')
        }
      } catch (e) {
        console.error('Error loading slicer options:', e)
      }
    }
    loadSlicerOptions()
  }, [])

  // Load chart data from API when slicers change
  useEffect(() => {
    if (!year || !month || !line) return

    const loadChartData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/sgd-aia-candy-tracking/data?line=${line}&year=${year}&month=${month}`)
        const result = await res.json()
        if (result.success && result.data) {
          setChartData(result.data)
        }
      } catch (e) {
        console.error('Error loading chart data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadChartData()
  }, [line, year, month])

  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title"></div>
      <div className="subheader-controls">
        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <LineSlicer 
            lines={slicerOptions?.lines || []}
            selectedLine={line}
            onLineChange={setLine}
          />
        </div>
        <div className="slicer-group">
          <label className="slicer-label">YEAR:</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="subheader-select"
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', fontSize: '14px', color: '#374151', cursor: 'pointer', outline: 'none', transition: 'all 0.2s ease', minWidth: '100px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            {(slicerOptions?.years || []).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="slicer-group">
          <label className="slicer-label">MONTH:</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="subheader-select"
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', fontSize: '14px', color: '#374151', cursor: 'pointer', outline: 'none', transition: 'all 0.2s ease', minWidth: '140px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            {(slicerOptions?.months || []).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Daily/Weekly Toggle */}
        <div className="slicer-group">
          <label className="slicer-label">MODE:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="radio" name="dataMode" value="daily" checked={!isWeekly} onChange={() => setIsWeekly(false)} style={{ margin: 0 }} />
              <span style={{ fontSize: '14px' }}>Daily</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="radio" name="dataMode" value="weekly" checked={isWeekly} onChange={() => setIsWeekly(true)} style={{ margin: 0 }} />
              <span style={{ fontSize: '14px' }}>Weekly</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame variant="standard">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>

          {/* Row 1: KPI Cards (6) - FROM aia_brand_kpi_mv */}
          <div className="kpi-row">
            <StatCard
              title="GROUP INTERACTION COVERAGE RATE"
              value={loading ? '-' : formatPercentageKPI(chartData.monthlyKPIs.groupInteractionCoverageRate)}
              icon="Coverage Rate"
              comparison={{ percentage: '-', isPositive: true }}
            />
            <StatCard
              title="CUSTOMER TRIGGER COUNT"
              value={loading ? '-' : formatIntegerKPI(chartData.monthlyKPIs.customerTriggerCount)}
              icon="Trigger Count"
              comparison={{ percentage: '-', isPositive: true }}
            />
            <StatCard
              title="UNIQUE INTERACTION USERS"
              value={loading ? '-' : formatIntegerKPI(chartData.monthlyKPIs.uniqueInteractionUsers)}
              icon="Unique Users"
              comparison={{ percentage: '-', isPositive: true }}
            />
            <StatCard
              title="CUSTOMER TRIGGER RATIO"
              value={loading ? '-' : formatPercentageKPI(chartData.monthlyKPIs.customerTriggerRatio)}
              icon="Trigger Ratio"
              comparison={{ percentage: '-', isPositive: true }}
            />
            <StatCard
              title="GROUP ACTIVITY CHANGE"
              value={loading ? '-' : formatPercentageKPI(chartData.monthlyKPIs.groupActivityChange)}
              icon="Activity Change"
              comparison={{ percentage: '-', isPositive: true }}
            />
            <StatCard
              title="REPEAT INTERACTION RATE"
              value={loading ? '-' : formatPercentageKPI(chartData.monthlyKPIs.repeatInteractionRate)}
              icon="Repeat Rate"
              comparison={{ percentage: '-', isPositive: true }}
            />
          </div>

          {/* Row 2: Line Charts - Coming Soon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Chart 1 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Chart Header */}
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span 
                    style={{ fontSize: '14px', color: '#3b82f6', width: '20px', height: '20px', display: 'inline-block', flexShrink: 0 }}
                    dangerouslySetInnerHTML={{ __html: getChartIcon('Coverage Rate') }}
                  />
                  <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    GROUP INTERACTION COVERAGE RATE
                  </h3>
                </div>
              </div>
              {/* Chart Canvas - Coming Soon */}
              <div style={{
                flex: 1,
                minHeight: '300px',
                padding: '40px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#9ca3af', 
                  textAlign: 'center',
                  marginBottom: '12px'
                }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                  <div style={{ fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Chart Coming Soon</div>
                  <div style={{ fontSize: '12px' }}>Data visualization akan segera hadir</div>
                </div>
              </div>
            </div>

            {/* Chart 2 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span 
                    style={{ fontSize: '14px', color: '#3b82f6', width: '20px', height: '20px', display: 'inline-block', flexShrink: 0 }}
                    dangerouslySetInnerHTML={{ __html: getChartIcon('Transaction Volume') }}
                  />
                  <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    CUSTOMER TRIGGER COUNT
                  </h3>
                </div>
              </div>
              <div style={{
                flex: 1,
                minHeight: '300px',
                padding: '40px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                  <div style={{ fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Chart Coming Soon</div>
                  <div style={{ fontSize: '12px' }}>Data visualization akan segera hadir</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Bar Charts - Coming Soon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Chart 3 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span 
                    style={{ fontSize: '14px', color: '#3b82f6', width: '20px', height: '20px', display: 'inline-block', flexShrink: 0 }}
                    dangerouslySetInnerHTML={{ __html: getChartIcon('Member') }}
                  />
                  <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    UNIQUE INTERACTION USERS
                  </h3>
                </div>
              </div>
              <div style={{
                flex: 1,
                minHeight: '300px',
                padding: '40px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                  <div style={{ fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Chart Coming Soon</div>
                  <div style={{ fontSize: '12px' }}>Data visualization akan segera hadir</div>
                </div>
              </div>
            </div>

            {/* Chart 4 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span 
                    style={{ fontSize: '14px', color: '#3b82f6', width: '20px', height: '20px', display: 'inline-block', flexShrink: 0 }}
                    dangerouslySetInnerHTML={{ __html: getChartIcon('Conversion Rate') }}
                  />
                  <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    CUSTOMER TRIGGER RATIO
                  </h3>
                </div>
              </div>
              <div style={{
                flex: 1,
                minHeight: '300px',
                padding: '40px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                  <div style={{ fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Chart Coming Soon</div>
                  <div style={{ fontSize: '12px' }}>Data visualization akan segera hadir</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Bar Charts - Coming Soon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Chart 5 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span 
                    style={{ fontSize: '14px', color: '#3b82f6', width: '20px', height: '20px', display: 'inline-block', flexShrink: 0 }}
                    dangerouslySetInnerHTML={{ __html: getChartIcon('Activity') }}
                  />
                  <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    GROUP ACTIVITY CHANGE
                  </h3>
                </div>
              </div>
              <div style={{
                flex: 1,
                minHeight: '300px',
                padding: '40px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                  <div style={{ fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Chart Coming Soon</div>
                  <div style={{ fontSize: '12px' }}>Data visualization akan segera hadir</div>
                </div>
              </div>
            </div>

            {/* Chart 6 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span 
                    style={{ fontSize: '14px', color: '#3b82f6', width: '20px', height: '20px', display: 'inline-block', flexShrink: 0 }}
                    dangerouslySetInnerHTML={{ __html: getChartIcon('Retention') }}
                  />
                  <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    REPEAT INTERACTION RATE
                  </h3>
                </div>
              </div>
              <div style={{
                flex: 1,
                minHeight: '300px',
                padding: '40px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ margin: '0 auto 12px' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                  <div style={{ fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Chart Coming Soon</div>
                  <div style={{ fontSize: '12px' }}>Data visualization akan segera hadir</div>
                </div>
              </div>
            </div>
          </div>

          {/* Slicer Info - placed at bottom like other pages */}
          <div className="slicer-info">
            <p>Showing data for: {line} | {year} | {month} | {isWeekly ? 'WEEKLY MODE' : 'DAILY MODE'}</p>
          </div>
        </div>

        <style jsx>{`
          .kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; margin-bottom: 20px; }
        `}</style>
      </Frame>
    </Layout>
  )
}

