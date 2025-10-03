"use client"

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'

const BRANDS = [
  'SBMY','LVMY','JMMY','STMY','FWMY','UVMY'
]

interface SlicerOptions {
  dateRange: { min: string; max: string }
  defaults: { latestDate: string }
}

interface RowData {
  brand: string
  periodA: any
  periodB: any
  diff: any
  percent: any
}

export default function BrandComparisonPage() {
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null)
  const [periodAStart, setPeriodAStart] = useState<string>('')
  const [periodAEnd, setPeriodAEnd] = useState<string>('')
  const [periodBStart, setPeriodBStart] = useState<string>('')
  const [periodBEnd, setPeriodBEnd] = useState<string>('')

  const [showPickerA, setShowPickerA] = useState(false)
  const [showPickerB, setShowPickerB] = useState(false)
  const [tempAStart, setTempAStart] = useState('')
  const [tempAEnd, setTempAEnd] = useState('')
  const [tempBStart, setTempBStart] = useState('')
  const [tempBEnd, setTempBEnd] = useState('')

  const [rows, setRows] = useState<RowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/myr-brand-comparison/slicer-options')
        const json = await res.json()
        if (!json.success) throw new Error('Failed to load slicers')
        const opt: SlicerOptions = json.data
        setSlicerOptions(opt)

        const latest = new Date(opt.defaults.latestDate)
        const bEnd = new Date(latest)
        const bStart = new Date(latest); bStart.setDate(bStart.getDate() - 29)
        const aEnd = new Date(bStart); aEnd.setDate(aEnd.getDate() - 1)
        const aStart = new Date(aEnd); aStart.setDate(aStart.getDate() - 29)

        setPeriodBEnd(bEnd.toISOString().split('T')[0])
        setPeriodBStart(bStart.toISOString().split('T')[0])
        setPeriodAEnd(aEnd.toISOString().split('T')[0])
        setPeriodAStart(aStart.toISOString().split('T')[0])
      } catch (e:any) {
        setError(e.message || 'Failed to init')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) return
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ periodAStart, periodAEnd, periodBStart, periodBEnd })
        const res = await fetch(`/api/myr-brand-comparison/data?${params}`)
        const json = await res.json()
        if (!json.success) throw new Error('Failed to load data')
        setRows(json.data.rows)
      } catch (e:any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [periodAStart, periodAEnd, periodBStart, periodBEnd])

  const formatInt = (v:number) => Math.round(v).toLocaleString('en-US')
  const formatAmt = (v:number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const formatDec = (v:number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const formatPct = (v:number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

  const handleExportCSV = () => {
    if (!rows.length) return
    
    const csvHeaders = [
      'Brand/Line',
      'Period A - Count', 'Period A - ATV', 'Period A - PF', 'Period A - DC', 'Period A - DA', 'Period A - GGR', 'Period A - Winrate', 'Period A - GGR User', 'Period A - DA User',
      'Period B - Count', 'Period B - ATV', 'Period B - PF', 'Period B - DC', 'Period B - DA', 'Period B - GGR', 'Period B - Winrate', 'Period B - GGR User', 'Period B - DA User',
      'Compare (Diff) - Count', 'Compare (Diff) - ATV', 'Compare (Diff) - PF', 'Compare (Diff) - DC', 'Compare (Diff) - DA', 'Compare (Diff) - GGR', 'Compare (Diff) - Winrate', 'Compare (Diff) - GGR User', 'Compare (Diff) - DA User',
      'Compare (%) - Count', 'Compare (%) - ATV', 'Compare (%) - PF', 'Compare (%) - DC', 'Compare (%) - DA', 'Compare (%) - GGR', 'Compare (%) - Winrate', 'Compare (%) - GGR User', 'Compare (%) - DA User'
    ]
    
    const csvRows = rows.map(row => [
      row.brand,
      formatInt(row.periodA.activeMember), formatAmt(row.periodA.avgTransactionValue), formatDec(row.periodA.purchaseFrequency), formatInt(row.periodA.depositCases), formatAmt(row.periodA.depositAmount), formatAmt(row.periodA.ggr), formatDec(row.periodA.winrate), formatAmt(row.periodA.ggrPerUser), formatAmt(row.periodA.depositAmountPerUser),
      formatInt(row.periodB.activeMember), formatAmt(row.periodB.avgTransactionValue), formatDec(row.periodB.purchaseFrequency), formatInt(row.periodB.depositCases), formatAmt(row.periodB.depositAmount), formatAmt(row.periodB.ggr), formatDec(row.periodB.winrate), formatAmt(row.periodB.ggrPerUser), formatAmt(row.periodB.depositAmountPerUser),
      formatInt(row.diff.activeMember), formatAmt(row.diff.avgTransactionValue), formatDec(row.diff.purchaseFrequency), formatInt(row.diff.depositCases), formatAmt(row.diff.depositAmount), formatAmt(row.diff.ggr), formatAmt(row.diff.winrate), formatAmt(row.diff.ggrPerUser), formatAmt(row.diff.depositAmountPerUser),
      formatPct(row.percent.activeMember), formatPct(row.percent.avgTransactionValue), formatPct(row.percent.purchaseFrequency), formatPct(row.percent.depositCases), formatPct(row.percent.depositAmount), formatPct(row.percent.ggr), formatPct(row.percent.winrate), formatPct(row.percent.ggrPerUser), formatPct(row.percent.depositAmountPerUser)
    ])
    
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `brand-comparison-myr-${periodAStart}-to-${periodBEnd}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title" />
      <div className="subheader-controls" style={{ gap: '16px', marginRight: '40px' }}>
        {/* Period A */}
        <div className="slicer-group" style={{ position: 'relative' }}>
          <label className="slicer-label">PERIOD A:</label>
          <input type="text" value={`${periodAStart} to ${periodAEnd}`} readOnly
            onClick={() => { setTempAStart(periodAStart); setTempAEnd(periodAEnd); setShowPickerA(true) }}
            className="subheader-select" style={{ minWidth: '220px', cursor: 'pointer' }} />
          {showPickerA && (
            <div style={{ position:'absolute', top:'42px', left:0, zIndex:9999, background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:12, pointerEvents:'auto' }}>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="date" value={tempAStart} min="2021-01-01" max="2025-12-31" onChange={e=>setTempAStart(e.target.value)} />
                <span style={{ color:'#6b7280' }}>to</span>
                <input type="date" value={tempAEnd} min="2021-01-01" max="2025-12-31" onChange={e=>setTempAEnd(e.target.value)} />
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:10 }}>
                <button onClick={()=>setShowPickerA(false)} style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:6 }}>Cancel</button>
                <button onClick={()=>{ if (tempAStart && tempAEnd){ setPeriodAStart(tempAStart); setPeriodAEnd(tempAEnd);} setShowPickerA(false) }} style={{ padding:'6px 10px', background:'#1e293b', color:'white', borderRadius:6 }}>Apply</button>
              </div>
            </div>
          )}
        </div>
        {/* Period B */}
        <div className="slicer-group" style={{ position: 'relative' }}>
          <label className="slicer-label">PERIOD B:</label>
          <input type="text" value={`${periodBStart} to ${periodBEnd}`} readOnly
            onClick={() => { setTempBStart(periodBStart); setTempBEnd(periodBEnd); setShowPickerB(true) }}
            className="subheader-select" style={{ minWidth: '220px', cursor: 'pointer' }} />
          {showPickerB && (
            <div style={{ position:'absolute', top:'42px', left:0, zIndex:9999, background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:12, pointerEvents:'auto' }}>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="date" value={tempBStart} min="2021-01-01" max="2025-12-31" onChange={e=>setTempBStart(e.target.value)} />
                <span style={{ color:'#6b7280' }}>to</span>
                <input type="date" value={tempBEnd} min="2021-01-01" max="2025-12-31" onChange={e=>setTempBEnd(e.target.value)} />
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:10 }}>
                <button onClick={()=>setShowPickerB(false)} style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:6 }}>Cancel</button>
                <button onClick={()=>{ if (tempBStart && tempBEnd){ setPeriodBStart(tempBStart); setPeriodBEnd(tempBEnd);} setShowPickerB(false) }} style={{ padding:'6px 10px', background:'#1e293b', color:'white', borderRadius:6 }}>Apply</button>
              </div>
            </div>
          )}
        </div>
        {/* Export Button */}
        <div className="slicer-group">
          <button
            onClick={handleExportCSV}
            className="subheader-select"
            style={{ 
              background: '#16a34a', 
              color: 'white', 
              border: '1px solid #16a34a',
              cursor: 'pointer',
              minWidth: '120px'
            }}
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  )

  const headers = [
    { key:'brand', label:'Brand/Line', align:'left' },
    // Period A (9)
    { key:'amA', label:'Active Member' },
    { key:'atvA', label:'Average Transaction Value' },
    { key:'pfA', label:'Purchase Frequency' },
    { key:'dcA', label:'Deposit Cases' },
    { key:'daA', label:'Deposit Amount' },
    { key:'ggrA', label:'GGR (Net Profit)' },
    { key:'wrA', label:'Winrate' },
    { key:'ggruA', label:'GGR User' },
    { key:'dauA', label:'DA User' },
    // Period B (9)
    { key:'amB', label:'Active Member' },
    { key:'atvB', label:'Average Transaction Value' },
    { key:'pfB', label:'Purchase Frequency' },
    { key:'dcB', label:'Deposit Cases' },
    { key:'daB', label:'Deposit Amount' },
    { key:'ggrB', label:'GGR (Net Profit)' },
    { key:'wrB', label:'Winrate' },
    { key:'ggruB', label:'GGR User' },
    { key:'dauB', label:'DA User' },
    // Diff (9)
    { key:'amD', label:'Compare (Diff)' },
    { key:'atvD', label:'Compare (Diff)' },
    { key:'pfD', label:'Compare (Diff)' },
    { key:'dcD', label:'Compare (Diff)' },
    { key:'daD', label:'Compare (Diff)' },
    { key:'ggrD', label:'Compare (Diff)' },
    { key:'wrD', label:'Compare (Diff)' },
    { key:'ggruD', label:'Compare (Diff)' },
    { key:'dauD', label:'Compare (Diff)' },
    // Percent (9)
    { key:'amP', label:'Compare (%)' },
    { key:'atvP', label:'Compare (%)' },
    { key:'pfP', label:'Compare (%)' },
    { key:'dcP', label:'Compare (%)' },
    { key:'daP', label:'Compare (%)' },
    { key:'ggrP', label:'Compare (%)' },
    { key:'wrP', label:'Compare (%)' },
    { key:'ggruP', label:'Compare (%)' },
    { key:'dauP', label:'Compare (%)' }
  ]

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame>
      <div className="p-6">
          {loading && <div className="text-center py-8 text-gray-600">Loading...</div>}
          {error && <div className="text-center py-8 text-red-600">{error}</div>}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full" style={{
                borderCollapse: 'collapse',
                border: '1px solid #e0e0e0'
              }}>
                <thead className="sticky top-0" style={{ zIndex: 10 }}>
                  <tr>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      position: 'sticky',
                      left: 0,
                      zIndex: 20,
                      boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
                    }}>Brand/Line</th>
                    <th colSpan={9} style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white'
                    }}>Period A ({periodAStart} to {periodAEnd})</th>
                    <th colSpan={9} style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white'
                    }}>Period B ({periodBStart} to {periodBEnd})</th>
                    <th colSpan={9} style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white'
                    }}>Compare (Diff)</th>
                    <th colSpan={9} style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white'
                    }}>Compare (%)</th>
                  </tr>
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold border border-gray-300 sticky left-0 z-20" style={{ 
                      backgroundColor: '#374151',
                      color: 'white',
                      boxShadow: '2px 0 5px rgba(0,0,0,0.1)' 
                    }}>&nbsp;</th>
                    {/* 9 A */}
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>Count</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>ATV</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>PF</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DC</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DA</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>GGR</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>Winrate</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>GGR User</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DA User</th>
                    {/* 9 B */}
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>Count</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>ATV</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>PF</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DC</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DA</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>GGR</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>Winrate</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>GGR User</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DA User</th>
                    {/* 9 Diff */}
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>Count</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>ATV</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>PF</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DC</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DA</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>GGR</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>Winrate</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>GGR User</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DA User</th>
                    {/* 9 Percent */}
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>Count</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>ATV</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>PF</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DC</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DA</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>GGR</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>Winrate</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>GGR User</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      whiteSpace: 'nowrap'
                    }}>DA User</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.brand} className={`group ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        fontWeight: '500',
                        position: 'sticky',
                        left: 0,
                        zIndex: 20,
                        backgroundColor: '#374151',
                        color: 'white',
                        boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
                      }}>{r.brand}</td>
                      {/* A */}
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatInt(r.periodA.activeMember)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatAmt(r.periodA.avgTransactionValue)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatDec(r.periodA.purchaseFrequency)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatInt(r.periodA.depositCases)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatAmt(r.periodA.depositAmount)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatAmt(r.periodA.ggr)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatDec(r.periodA.winrate)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatAmt(r.periodA.ggrPerUser)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatAmt(r.periodA.depositAmountPerUser)}</td>
                      {/* B */}
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatInt(r.periodB.activeMember)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatAmt(r.periodB.avgTransactionValue)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatDec(r.periodB.purchaseFrequency)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatInt(r.periodB.depositCases)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatAmt(r.periodB.depositAmount)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatAmt(r.periodB.ggr)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatDec(r.periodB.winrate)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatAmt(r.periodB.ggrPerUser)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0' }}>{formatAmt(r.periodB.depositAmountPerUser)}</td>
                      {/* Diff */}
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600', color: r.diff.activeMember > 0 ? '#16a34a' : r.diff.activeMember < 0 ? '#dc2626' : '#374151' }}>{formatInt(r.diff.activeMember)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.diff.avgTransactionValue > 0 ? '#16a34a' : r.diff.avgTransactionValue < 0 ? '#dc2626' : '#374151' }}>{formatAmt(r.diff.avgTransactionValue)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.diff.purchaseFrequency > 0 ? '#16a34a' : r.diff.purchaseFrequency < 0 ? '#dc2626' : '#374151' }}>{formatDec(r.diff.purchaseFrequency)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.diff.depositCases > 0 ? '#16a34a' : r.diff.depositCases < 0 ? '#dc2626' : '#374151' }}>{formatInt(r.diff.depositCases)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.diff.depositAmount > 0 ? '#16a34a' : r.diff.depositAmount < 0 ? '#dc2626' : '#374151' }}>{formatAmt(r.diff.depositAmount)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.diff.ggr > 0 ? '#16a34a' : r.diff.ggr < 0 ? '#dc2626' : '#374151' }}>{formatAmt(r.diff.ggr)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.diff.winrate > 0 ? '#16a34a' : r.diff.winrate < 0 ? '#dc2626' : '#374151' }}>{formatAmt(r.diff.winrate)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.diff.ggrPerUser > 0 ? '#16a34a' : r.diff.ggrPerUser < 0 ? '#dc2626' : '#374151' }}>{formatAmt(r.diff.ggrPerUser)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.diff.depositAmountPerUser > 0 ? '#16a34a' : r.diff.depositAmountPerUser < 0 ? '#dc2626' : '#374151' }}>{formatAmt(r.diff.depositAmountPerUser)}</td>
                      {/* Percent */}
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.percent.activeMember > 0 ? '#16a34a' : r.percent.activeMember < 0 ? '#dc2626' : '#6b7280' }}>{formatPct(r.percent.activeMember)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.percent.avgTransactionValue > 0 ? '#16a34a' : r.percent.avgTransactionValue < 0 ? '#dc2626' : '#6b7280' }}>{formatPct(r.percent.avgTransactionValue)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.percent.purchaseFrequency > 0 ? '#16a34a' : r.percent.purchaseFrequency < 0 ? '#dc2626' : '#6b7280' }}>{formatPct(r.percent.purchaseFrequency)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.percent.depositCases > 0 ? '#16a34a' : r.percent.depositCases < 0 ? '#dc2626' : '#6b7280' }}>{formatPct(r.percent.depositCases)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.percent.depositAmount > 0 ? '#16a34a' : r.percent.depositAmount < 0 ? '#dc2626' : '#6b7280' }}>{formatPct(r.percent.depositAmount)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.percent.ggr > 0 ? '#16a34a' : r.percent.ggr < 0 ? '#dc2626' : '#6b7280' }}>{formatPct(r.percent.ggr)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.percent.winrate > 0 ? '#16a34a' : r.percent.winrate < 0 ? '#dc2626' : '#6b7280' }}>{formatPct(r.percent.winrate)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.percent.ggrPerUser > 0 ? '#16a34a' : r.percent.ggrPerUser < 0 ? '#dc2626' : '#6b7280' }}>{formatPct(r.percent.ggrPerUser)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #e0e0e0', fontWeight: '600' , color: r.percent.depositAmountPerUser > 0 ? '#16a34a' : r.percent.depositAmountPerUser < 0 ? '#dc2626' : '#6b7280' }}>{formatPct(r.percent.depositAmountPerUser)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Frame>
    </Layout>
  )
}
