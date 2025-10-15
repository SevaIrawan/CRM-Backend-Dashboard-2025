'use client'

import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StatCard from '@/components/StatCard'
import LineChart from '@/components/LineChart'
import BarChart from '@/components/BarChart'
import LineSlicer from '@/components/slicers/LineSlicer'
import YearSlicer from '@/components/slicers/YearSlicer'
import MonthSlicer from '@/components/slicers/MonthSlicer'
import { getChartIcon } from '@/lib/CentralIcon'
import { formatIntegerKPI, formatPercentageKPI } from '@/lib/formatHelpers'

// Helper to generate last 12 days labels and dummy values
function generateDailyDummy(periodDays = 12) {
  const labels: string[] = []
  const values: number[] = []
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    labels.push(`${mm}-${dd}`)
    // simple predictable dummy pattern
    values.push(Math.max(1, Math.round(50 + Math.sin(i / 2) * 20 + (i % 5) * 3)))
  }
  return { labels, values }
}

export default function AiaCandyTrackingPage() {
  // Slicer state (copy pattern from Deposit Auto-Approval)
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

  // Load slicer options (temporarily reuse Deposit Auto-Approval endpoint)
  useEffect(() => {
    const loadSlicerOptions = async () => {
      try {
        const res = await fetch('/api/aia-candy-tracking/slicer-options')
        const result = await res.json()
        if (result.success) {
          setSlicerOptions(result.data)
          setLine(result.data.defaults.line || result.data.lines[0] || '')
          setYear(result.data.defaults.year || result.data.years[0] || '')
          setMonth(result.data.defaults.month || result.data.months[0] || '')
        }
      } catch (e) {
        // Fallback static options if API not ready
        const fallback: SlicerOptions = {
          lines: ['ALL','SBMY','LVMY','STMY','FWMY','JMMY','UVMY'],
          years: [String(new Date().getFullYear())],
          months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
          defaults: { line: 'SBMY', year: String(new Date().getFullYear()), month: 'January' }
        }
        setSlicerOptions(fallback)
        setLine(fallback.defaults.line)
        setYear(fallback.defaults.year)
        setMonth(fallback.defaults.month)
      }
    }
    loadSlicerOptions()
  }, [])

  // Dummy datasets for 12 days
  const data = useMemo(() => {
    const base = generateDailyDummy(12)
    return {
      labels: base.labels,
      groupInteractionCoverageRate: base.values.map((v, idx) => Math.max(5, Math.round(v * 1.05 - idx))),
      customerTriggerCount: base.values.map(v => Math.round(v * 1.2)),
      uniqueInteractionUsers: base.values.map((v, idx) => Math.round(v * 0.9 + (idx % 3) * 4)),
      customerTriggerRatio: base.values.map((v, idx) => Number(((v % 30) + 20 + idx) / 100)), // ratio 0-1
      groupActivityChange: base.values.map((v, idx) => Math.round((idx % 2 === 0 ? 1 : -1) * (v % 15))),
      repeatInteractionRate: base.values.map((v, idx) => Number(((v % 25) + 10 + (idx % 4)) / 100)) // ratio 0-1
    }
  }, [line, year, month])

  // Aggregates for KPI
  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
  const pctAvg = (arr: number[]) => (arr.reduce((a, b) => a + b, 0) / arr.length)

  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        <div style={{ 
          fontSize: '12px', 
          color: '#000000', 
          fontWeight: '600',
          backgroundColor: '#ffd700',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '2px solid #ff8c00',
          display: 'inline-block',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          ⚠️ DEMO DATA - This page is currently displaying sample data for demonstration purposes
        </div>
      </div>
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

          {/* Row 1: KPI Cards (6) */}
          <div className="kpi-row">
            <StatCard
              title="GROUP INTERACTION COVERAGE RATE"
              value={formatPercentageKPI(pctAvg(data.groupInteractionCoverageRate.map(v => Number(v) / 100)))}
              icon="Coverage Rate"
              additionalKpi={{ label: 'DAILY AVERAGE', value: '-' }}
              comparison={{ percentage: '+0.0%', isPositive: true }}
            />
            <StatCard
              title="CUSTOMER TRIGGER COUNT"
              value={formatIntegerKPI(avg(data.customerTriggerCount))}
              icon="Trigger Count"
              additionalKpi={{ label: 'DAILY AVERAGE', value: formatIntegerKPI(avg(data.customerTriggerCount)) }}
              comparison={{ percentage: '+0.0%', isPositive: true }}
            />
            <StatCard
              title="UNIQUE INTERACTION USERS"
              value={formatIntegerKPI(avg(data.uniqueInteractionUsers))}
              icon="Unique Users"
              additionalKpi={{ label: 'DAILY AVERAGE', value: formatIntegerKPI(avg(data.uniqueInteractionUsers)) }}
              comparison={{ percentage: '+0.0%', isPositive: true }}
            />
            <StatCard
              title="CUSTOMER TRIGGER RATIO"
              value={formatPercentageKPI(pctAvg(data.customerTriggerRatio))}
              icon="Trigger Ratio"
              additionalKpi={{ label: 'DAILY AVERAGE', value: '-' }}
              comparison={{ percentage: '+0.0%', isPositive: true }}
            />
            <StatCard
              title="GROUP ACTIVITY CHANGE"
              value={formatIntegerKPI(avg(data.groupActivityChange))}
              icon="Activity Change"
              additionalKpi={{ label: 'DAILY AVERAGE', value: formatIntegerKPI(avg(data.groupActivityChange)) }}
              comparison={{ percentage: '+0.0%', isPositive: true }}
            />
            <StatCard
              title="REPEAT INTERACTION RATE"
              value={formatPercentageKPI(pctAvg(data.repeatInteractionRate))}
              icon="Repeat Rate"
              additionalKpi={{ label: 'DAILY AVERAGE', value: '-' }}
              comparison={{ percentage: '+0.0%', isPositive: true }}
            />
          </div>

          {/* Row 2: Line Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <LineChart
              series={[{ name: 'Coverage Rate', data: data.groupInteractionCoverageRate.map(v => Number(v)) }]}
              categories={data.labels}
              title="GROUP INTERACTION COVERAGE RATE"
              currency="MYR"
              hideLegend={true}
              showDataLabels={true}
              chartIcon={getChartIcon('Coverage Rate')}
            />
            <LineChart
              series={[{ name: 'Trigger Count', data: data.customerTriggerCount }]}
              categories={data.labels}
              title="CUSTOMER TRIGGER COUNT"
              currency="MYR"
              hideLegend={true}
              showDataLabels={true}
              chartIcon={getChartIcon('Transaction Volume')}
            />
          </div>

          {/* Row 3: Bar Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <BarChart
              series={[{ name: 'Unique Users', data: data.uniqueInteractionUsers }]}
              categories={data.labels}
              title="UNIQUE INTERACTION USERS"
              currency="MEMBER"
              showDataLabels={true}
              chartIcon={getChartIcon('Member')}
            />
            <BarChart
              series={[{ name: 'Trigger Ratio (%)', data: data.customerTriggerRatio.map(v => Number((v * 100).toFixed(2))) }]}
              categories={data.labels}
              title="CUSTOMER TRIGGER RATIO"
              currency="%"
              showDataLabels={true}
              chartIcon={getChartIcon('Conversion Rate')}
            />
          </div>

          {/* Row 4: Bar Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <BarChart
              series={[{ name: 'Activity Change', data: data.groupActivityChange }]}
              categories={data.labels}
              title="GROUP ACTIVITY CHANGE"
              currency="INDEX"
              showDataLabels={true}
              chartIcon={getChartIcon('Activity')}
            />
            <BarChart
              series={[{ name: 'Repeat Rate (%)', data: data.repeatInteractionRate.map(v => Number((v * 100).toFixed(2))) }]}
              categories={data.labels}
              title="REPEAT INTERACTION RATE"
              currency="%"
              showDataLabels={true}
              chartIcon={getChartIcon('Retention')}
            />
          </div>

          {/* Slicer Info - placed at bottom like other pages */}
          <div className="slicer-info">
            <p>Showing data for: {line} | {year} | {month} | {isWeekly ? 'WEEKLY MODE' : 'DAILY MODE'}</p>
          </div>
        </div>

        <style jsx>{`
          .kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; margin-bottom: 20px; }
          .slicer-info { background: #f3f4f6; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center; }
          .slicer-info p { margin: 0; color: #6b7280; font-size: 14px; }
        `}</style>
      </Frame>
    </Layout>
  )
}


