'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import SubHeader from '@/components/SubHeader'

interface SlicerOptions {
  lines: string[];
  dateRange: {
    min: string;
    max: string;
  };
  defaults: {
    line: string;
    latestDate: string;
  };
}

interface ComparisonRow {
  metric: string;
  metricKey: string;
  type: string;
  periodA: number;
  periodB: number;
  difference: number;
  percentageChange: number;
  percentageDisplay: string;
  color: string;
  inverse: boolean;
}

interface ComparisonData {
  line: string;
  periodA: { start: string; end: string };
  periodB: { start: string; end: string };
  comparisonData: ComparisonRow[];
}

export default function KPIComparisonPage() {
  // Slicer states
  const [slicerOptions, setSlicerOptions] = useState<SlicerOptions | null>(null);
  const [selectedLine, setSelectedLine] = useState<string>('ALL');
  const [periodAStart, setPeriodAStart] = useState<string>('');
  const [periodAEnd, setPeriodAEnd] = useState<string>('');
  const [periodBStart, setPeriodBStart] = useState<string>('');
  const [periodBEnd, setPeriodBEnd] = useState<string>('');

  // UI states for single-popup date range per period
  const [showPickerA, setShowPickerA] = useState<boolean>(false);
  const [showPickerB, setShowPickerB] = useState<boolean>(false);
  const [tempAStart, setTempAStart] = useState<string>('');
  const [tempAEnd, setTempAEnd] = useState<string>('');
  const [tempBStart, setTempBStart] = useState<string>('');
  const [tempBEnd, setTempBEnd] = useState<string>('');

  // Data states
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch slicer options
  useEffect(() => {
    const fetchSlicerOptions = async () => {
      try {
        const response = await fetch('/api/myr-kpi-comparison/slicer-options');
        if (!response.ok) throw new Error('Failed to load slicer options');
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load slicer options');
        }
        
        const data = result.data;
        setSlicerOptions(data);
        setSelectedLine(data.defaults.line);
        
        // Set default date ranges (last 30 days for Period B, 30 days before that for Period A)
        const latestDate = new Date(data.defaults.latestDate);
        const periodBEndDate = new Date(latestDate);
        const periodBStartDate = new Date(latestDate);
        periodBStartDate.setDate(periodBStartDate.getDate() - 29); // 30 days range
        
        const periodAEndDate = new Date(periodBStartDate);
        periodAEndDate.setDate(periodAEndDate.getDate() - 1); // Day before Period B starts
        const periodAStartDate = new Date(periodAEndDate);
        periodAStartDate.setDate(periodAStartDate.getDate() - 29); // 30 days range
        
        setPeriodBEnd(periodBEndDate.toISOString().split('T')[0]);
        setPeriodBStart(periodBStartDate.toISOString().split('T')[0]);
        setPeriodAEnd(periodAEndDate.toISOString().split('T')[0]);
        setPeriodAStart(periodAStartDate.toISOString().split('T')[0]);
        
      } catch (err) {
        console.error('Error fetching slicer options:', err);
        setError('Failed to load slicer options');
      }
    };

    fetchSlicerOptions();
  }, []);

  // Fetch comparison data
  useEffect(() => {
    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      setLoading(false);
      return;
    }

    const fetchComparisonData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          line: selectedLine,
          periodAStart,
          periodAEnd,
          periodBStart,
          periodBEnd
        });

        const response = await fetch(`/api/myr-kpi-comparison/data?${params}`);
        if (!response.ok) throw new Error('Failed to load comparison data');
        
        const data = await response.json();
        setComparisonData(data);
      } catch (err) {
        console.error('Error fetching comparison data:', err);
        setError('Failed to load comparison data');
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, [selectedLine, periodAStart, periodAEnd, periodBStart, periodBEnd]);

  // Format number based on type
  const formatValue = (value: number, type: string): string => {
    if (value === 0) return '0';
    
    switch (type) {
      case 'integer':
        return Math.round(value).toLocaleString('en-US');
      case 'amount':
        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'decimal':
        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      default:
        return value.toLocaleString('en-US');
    }
  };

  // Export CSV function
  const handleExportCSV = () => {
    if (!comparisonData?.comparisonData?.length) return;
    
    const csvHeaders = [
      'Metrics',
      'Period A',
      'Period B', 
      'Compare (Diff)',
      'Compare (%)'
    ];
    
    const csvRows = comparisonData.comparisonData.map(row => [
      row.metric,
      formatValue(row.periodA, row.type),
      formatValue(row.periodB, row.type),
      formatValue(row.difference, row.type),
      row.percentageDisplay
    ]);
    
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kpi-comparison-myr-${selectedLine}-${periodAStart}-to-${periodBEnd}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SubHeader with slicers (SAMA SEPERTI PAGE LAIN)
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        {/* Title area - left side */}
      </div>
      
      <div className="subheader-controls" style={{ gap: '16px' }}>
        {/* PERIOD A DATE RANGE - Single Popup */}
        <div className="slicer-group" style={{ position: 'relative' }}>
          <label className="slicer-label">PERIOD A:</label>
          <input
            type="text"
            value={`${periodAStart} to ${periodAEnd}`}
            readOnly
            onClick={() => {
              setTempAStart(periodAStart);
              setTempAEnd(periodAEnd);
              setShowPickerA(true);
            }}
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
              minWidth: '220px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            placeholder="Select date range..."
          />
          {showPickerA && (
            <div style={{
              position: 'absolute',
              top: '42px',
              left: 0,
              zIndex: 50,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 10px 20px rgba(0,0,0,0.08)'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={tempAStart}
                  min="2021-01-01"
                  max="2025-12-31"
                  onChange={(e) => setTempAStart(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <span style={{ color: '#6b7280' }}>to</span>
                <input
                  type="date"
                  value={tempAEnd}
                  min="2021-01-01"
                  max="2025-12-31"
                  onChange={(e) => setTempAEnd(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => setShowPickerA(false)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>Cancel</button>
                <button
                  onClick={() => {
                    if (tempAStart && tempAEnd) {
                      setPeriodAStart(tempAStart);
                      setPeriodAEnd(tempAEnd);
                    }
                    setShowPickerA(false);
                  }}
                  style={{ padding: '6px 10px', borderRadius: '6px', background: '#1e293b', color: 'white', border: 'none' }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PERIOD B DATE RANGE - Single Popup */}
        <div className="slicer-group" style={{ position: 'relative' }}>
          <label className="slicer-label">PERIOD B:</label>
          <input
            type="text"
            value={`${periodBStart} to ${periodBEnd}`}
            readOnly
            onClick={() => {
              setTempBStart(periodBStart);
              setTempBEnd(periodBEnd);
              setShowPickerB(true);
            }}
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
              minWidth: '220px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            placeholder="Select date range..."
          />
          {showPickerB && (
            <div style={{
              position: 'absolute',
              top: '42px',
              left: 0,
              zIndex: 50,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 10px 20px rgba(0,0,0,0.08)'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={tempBStart}
                  min="2021-01-01"
                  max="2025-12-31"
                  onChange={(e) => setTempBStart(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <span style={{ color: '#6b7280' }}>to</span>
                <input
                  type="date"
                  value={tempBEnd}
                  min="2021-01-01"
                  max="2025-12-31"
                  onChange={(e) => setTempBEnd(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => setShowPickerB(false)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>Cancel</button>
                <button
                  onClick={() => {
                    if (tempBStart && tempBEnd) {
                      setPeriodBStart(tempBStart);
                      setPeriodBEnd(tempBEnd);
                    }
                    setShowPickerB(false);
                  }}
                  style={{ padding: '6px 10px', borderRadius: '6px', background: '#1e293b', color: 'white', border: 'none' }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LINE SLICER */}
        <div className="slicer-group">
          <label className="slicer-label">LINE:</label>
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
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
              minWidth: '120px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            {slicerOptions?.lines?.map((line: string) => (
              <option key={line} value={line}>
                {line}
              </option>
            ))}
          </select>
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
              minWidth: '120px',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame>
        <div className="p-6">
          {loading && (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading comparison data...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && comparisonData && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[#1e293b] text-white" style={{ zIndex: 10 }}>
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold border border-gray-300">Metrics</th>
                    <th className="px-4 py-3 text-left font-semibold border border-gray-300">
                      Period A<br />
                      <span className="text-xs font-normal">({periodAStart} to {periodAEnd})</span>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold border border-gray-300">
                      Period B<br />
                      <span className="text-xs font-normal">({periodBStart} to {periodBEnd})</span>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold border border-gray-300">Compare (Diff)</th>
                    <th className="px-4 py-3 text-left font-semibold border border-gray-300">Compare (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.comparisonData.map((row, index) => (
                    <tr 
                      key={row.metricKey}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}
                    >
                      <td className="px-4 py-3 text-left border border-gray-300 font-medium">
                        {row.metric}
                      </td>
                      <td className="px-4 py-3 text-right border border-gray-300">
                        {formatValue(row.periodA, row.type)}
                      </td>
                      <td className="px-4 py-3 text-right border border-gray-300">
                        {formatValue(row.periodB, row.type)}
                      </td>
                      <td 
                        className="px-4 py-3 text-right border border-gray-300 font-semibold"
                        style={{ color: row.color === 'green' ? '#16a34a' : row.color === 'red' ? '#dc2626' : '#374151' }}
                      >
                        {formatValue(row.difference, row.type)}
                      </td>
                      <td 
                        className="px-4 py-3 text-right border border-gray-300 font-semibold"
                        style={{ color: row.color === 'green' ? '#16a34a' : row.color === 'red' ? '#dc2626' : '#6b7280' }}
                      >
                        {row.percentageDisplay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && !comparisonData && (
            <div className="text-center py-8">
              <p className="text-gray-600">Please select date ranges to view comparison data.</p>
            </div>
          )}
        </div>
      </Frame>
    </Layout>
  );
}

