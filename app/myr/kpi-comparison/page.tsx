'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import SubheaderNotice from '@/components/SubheaderNotice'
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoLoaded, setAutoLoaded] = useState<boolean>(false);

  // Fetch slicer options
  useEffect(() => {
    const fetchSlicerOptions = async () => {
      try {
        // Get user's allowed brands from localStorage
        const userStr = localStorage.getItem('nexmax_user')
        const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
        
        const response = await fetch('/api/myr-kpi-comparison/slicer-options', {
          headers: {
            'x-user-allowed-brands': JSON.stringify(allowedBrands)
          },
          cache: 'no-store'
        });
        if (!response.ok) throw new Error('Failed to load slicer options');
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load slicer options');
        }
        
        const data = result.data;
        setSlicerOptions(data);
        setSelectedLine(data.defaults.line);
        
        // Default ranges: 7 days for Period B ending at max date,
        // and same 7-day window for previous month for Period A
        const latestDate = new Date(data.defaults.latestDate);
        const periodBEndDate = new Date(latestDate);
        const periodBStartDate = new Date(latestDate);
        periodBStartDate.setDate(periodBStartDate.getDate() - 6); // 7 days inclusive
        
        const periodAEndDate = new Date(periodBEndDate);
        periodAEndDate.setMonth(periodAEndDate.getMonth() - 1);
        const periodAStartDate = new Date(periodBStartDate);
        periodAStartDate.setMonth(periodAStartDate.getMonth() - 1);
        
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

  // Manual Search trigger (no auto-reload on slicer change)
  const handleSearch = async () => {
    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) return;
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
      
      // Get user's allowed brands from localStorage
      const userStr = localStorage.getItem('nexmax_user')
      const allowedBrands = userStr ? JSON.parse(userStr).allowed_brands : null
      
      const response = await fetch(`/api/myr-kpi-comparison/data?${params}`, {
        headers: {
          'x-user-allowed-brands': JSON.stringify(allowedBrands)
        }
      });
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

  // Auto-load once after defaults are set
  useEffect(() => {
    if (!autoLoaded && periodAStart && periodAEnd && periodBStart && periodBEnd) {
      setAutoLoaded(true);
      handleSearch();
    }
  }, [autoLoaded, periodAStart, periodAEnd, periodBStart, periodBEnd, selectedLine]);

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

  const formatDate = (d: string) => {
    if (!d) return ''
    const dt = new Date(d)
    return dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  }

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
        <SubheaderNotice
          show={false}
          label="NOTICE"
          message="Verification in progress — Please allow until 14:00 GMT+7 for adjustment validation to ensure 100% accurate data."
        />
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

        {/* Search Button */}
        <div className="slicer-group">
          <button
            onClick={handleSearch}
            className="subheader-select"
            style={{ 
              background: '#10b981', 
              color: 'white', 
              border: '1px solid #10b981',
              cursor: 'pointer',
              minWidth: '120px',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout customSubHeader={customSubHeader}>
      <Frame>
        <div>
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              padding: '24px'
            }}>
              <div className="kpi-spinner" />
              <div style={{ marginTop: '8px', color: '#111827', fontWeight: 600 }}>
                Loading KPI Comparison
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && comparisonData && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              padding: '16px'
            }}>
              <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <table className="w-full" style={{
                  borderCollapse: 'collapse',
                  border: '1px solid #e0e0e0'
                }}>
                <thead className="sticky top-0" style={{ zIndex: 10, position: 'sticky', top: 0, pointerEvents: 'none' }}>
                  <tr>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      pointerEvents: 'none'
                    }}>Metrics</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      pointerEvents: 'none'
                    }}>
                      Period A<br />
                      <span className="text-xs font-normal">({periodAStart} to {periodAEnd})</span>
                    </th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      pointerEvents: 'none'
                    }}>
                      Period B<br />
                      <span className="text-xs font-normal">({periodBStart} to {periodBEnd})</span>
                    </th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      pointerEvents: 'none'
                    }}>Compare (Diff)</th>
                    <th style={{ 
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      border: '1px solid #e0e0e0',
                      borderBottom: '2px solid #d0d0d0',
                      backgroundColor: '#374151',
                      color: 'white',
                      pointerEvents: 'none'
                    }}>Compare (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.comparisonData.map((row, index) => (
                    <tr 
                      key={row.metricKey}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}
                    >
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        border: '1px solid #e0e0e0',
                        fontWeight: '500'
                      }}>
                        {row.metric}
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        border: '1px solid #e0e0e0'
                      }}>
                        {formatValue(row.periodA, row.type)}
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        border: '1px solid #e0e0e0'
                      }}>
                        {formatValue(row.periodB, row.type)}
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        fontWeight: '600',
                        color: row.color === 'green' ? '#16a34a' : row.color === 'red' ? '#dc2626' : '#374151'
                      }}>
                        {formatValue(row.difference, row.type)}
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        border: '1px solid #e0e0e0',
                        fontWeight: '600',
                        color: row.color === 'green' ? '#16a34a' : row.color === 'red' ? '#dc2626' : '#6b7280'
                      }}>
                        {row.percentageDisplay}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}

          

          {/* Footer: Records info + Export */}
          {!loading && comparisonData && (
            <div className="table-footer" style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px'
            }}>
              <div className="records-info">
                {comparisonData.comparisonData.length.toLocaleString()} metrics
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={handleExportCSV}
                  disabled={!comparisonData?.comparisonData?.length}
                  className={`export-button ${!comparisonData?.comparisonData?.length ? 'disabled' : ''}`}
                >
                  Export CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </Frame>

      <style jsx>{`
        .kpi-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}

