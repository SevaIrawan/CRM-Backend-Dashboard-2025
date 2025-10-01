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

  // Data states
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch slicer options
  useEffect(() => {
    const fetchSlicerOptions = async () => {
      try {
        const response = await fetch('/api/usc-kpi-comparison/slicer-options');
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

        const response = await fetch(`/api/usc-kpi-comparison/data?${params}`);
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

  // SubHeader with slicers (SAMA SEPERTI PAGE LAIN)
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        {/* Title area - left side */}
      </div>
      
      <div className="subheader-controls">
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

        {/* PERIOD A DATE RANGE */}
        <div className="slicer-group">
          <label className="slicer-label">PERIOD A:</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="date"
              value={periodAStart}
              onChange={(e) => setPeriodAStart(e.target.value)}
              min={slicerOptions?.dateRange.min}
              max={slicerOptions?.dateRange.max}
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
                minWidth: '130px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            />
            <span style={{ color: '#6b7280' }}>to</span>
            <input
              type="date"
              value={periodAEnd}
              onChange={(e) => setPeriodAEnd(e.target.value)}
              min={slicerOptions?.dateRange.min}
              max={slicerOptions?.dateRange.max}
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
                minWidth: '130px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            />
          </div>
        </div>

        {/* PERIOD B DATE RANGE */}
        <div className="slicer-group">
          <label className="slicer-label">PERIOD B:</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="date"
              value={periodBStart}
              onChange={(e) => setPeriodBStart(e.target.value)}
              min={slicerOptions?.dateRange.min}
              max={slicerOptions?.dateRange.max}
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
                minWidth: '130px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            />
            <span style={{ color: '#6b7280' }}>to</span>
            <input
              type="date"
              value={periodBEnd}
              onChange={(e) => setPeriodBEnd(e.target.value)}
              min={slicerOptions?.dateRange.min}
              max={slicerOptions?.dateRange.max}
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
                minWidth: '130px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            />
          </div>
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
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
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

