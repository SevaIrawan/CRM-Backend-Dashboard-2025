'use client'

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { formatCurrencyKPI, formatIntegerKPI } from '@/lib/formatHelpers';

interface MixedChartProps {
  data: Array<{
    name: string;
    barValue: number;
    lineValue: number;
  }>;
  title?: string;
  chartIcon?: string;
  barLabel?: string;
  lineLabel?: string;
  barColor?: string;
  lineColor?: string;
  currency?: string;
}

export default function MixedChart({
  data,
  title,
  chartIcon,
  barLabel = 'Amount',
  lineLabel = 'Cases',
  barColor = '#3B82F6',
  lineColor = '#F97316',
  currency = 'MYR'
}: MixedChartProps) {
  
  const getCurrencySymbol = (curr: string): string => {
    switch (curr) {
      case 'MYR': return 'RM';
      case 'SGD': return 'SGD';
      case 'USC': return 'USD';
      default: return 'RM';
    }
  };

  // Format label untuk Bar (Amount) - abbreviated
  const formatBarLabel = (value: number): string => {
    if (value >= 1000000) {
      return `${getCurrencySymbol(currency)} ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${getCurrencySymbol(currency)} ${(value / 1000).toFixed(0)}K`;
    }
    return `${getCurrencySymbol(currency)} ${value.toLocaleString()}`;
  };

  // Format label untuk Line (Cases) - integer
  const formatLineLabel = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid #3B82F6',
          borderRadius: '8px',
          padding: '12px',
          color: '#ffffff',
          zIndex: 9999,
          position: 'relative',
          pointerEvents: 'none'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '13px' }}>
            📅 {label}
          </p>
          {payload.map((entry: any, index: number) => {
            // Format berdasarkan type: bar = currency amount, line = integer cases
            const formattedValue = entry.dataKey === 'barValue' 
              ? formatCurrencyKPI(entry.value, currency)
              : formatIntegerKPI(entry.value);
            
            return (
              <p key={index} style={{ 
                margin: '4px 0', 
                color: entry.color,
                fontSize: '12px'
              }}>
                {entry.name}: {formattedValue}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      height: '100%',
      minHeight: '350px',
      width: '100%', 
      padding: '0',
      position: 'relative',
      backgroundColor: '#ffffff',
      border: '1px solid #ffffff',
      borderRadius: '8px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-3px)';
      e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
    }}>
      {/* Chart Title with Icon and Legend */}
      {title && (
        <div style={{
          padding: '16px 20px 12px 20px',
          borderBottom: '1px solid #f3f4f6',
          backgroundColor: '#ffffff',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Title and Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {chartIcon && (
              <span 
                style={{
                  fontSize: '14px',
                  color: '#3b82f6',
                  width: '20px',
                  height: '20px',
                  display: 'inline-block',
                  flexShrink: 0
                }}
                dangerouslySetInnerHTML={{ __html: chartIcon }}
              />
            )}
            <h3 style={{
              margin: 0,
              fontSize: '12px',
              fontWeight: 700,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              lineHeight: '1.2'
            }}>
              {title}
            </h3>
          </div>
          
          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '14px',
                height: '14px',
                backgroundColor: barColor,
                borderRadius: '2px'
              }} />
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {barLabel} (BAR)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '12px',
                height: '3px',
                backgroundColor: lineColor,
                borderRadius: '2px'
              }} />
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {lineLabel} (LINE)
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Chart Container */}
      <div style={{ 
        flex: 1, 
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                }
                return value.toString();
              }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ strokeDasharray: '3 3' }}
              wrapperStyle={{ zIndex: 9999 }}
            />
            <Bar 
              yAxisId="left"
              dataKey="barValue" 
              fill={barColor} 
              name={barLabel}
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            >
              <LabelList 
                dataKey="barValue" 
                position="top"
                style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fill: '#374151'
                }}
                formatter={formatBarLabel}
              />
            </Bar>
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="lineValue" 
              stroke={lineColor} 
              strokeWidth={3}
              name={lineLabel}
              dot={{ fill: lineColor, r: 5 }}
              activeDot={{ r: 7 }}
            >
              <LabelList 
                dataKey="lineValue" 
                position="bottom"
                offset={10}
                style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fill: '#374151'
                }}
                formatter={formatLineLabel}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

