'use client'

import React from 'react';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';

interface SankeyNode {
  name: string;
  value?: number; // Explicit value to override recharts auto-calculation
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface SankeyChartProps {
  data: SankeyData;
  title?: string;
  chartIcon?: string;
}

export default function SankeyChart({ data, title, chartIcon }: SankeyChartProps) {
  
  // Custom Tooltip with full control over styling
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const value = payload[0].value;
      return (
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid #3B82F6',
          borderRadius: '8px',
          padding: '12px',
          zIndex: 9999
        }}>
          <p style={{ 
            margin: 0, 
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '12px'
          }}>
            <span style={{ color: '#ffffff' }}>Flow:</span> <span style={{ color: '#ffffff' }}>{value.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Custom node rendering
  const CustomNode = ({ x, y, width, height, index, payload, containerWidth }: any) => {
    const isOut = x + width + 6 > containerWidth;
    
    // USE EXPLICIT VALUE FROM NODE DATA, NOT RECHARTS AUTO-CALCULATED VALUE
    // This fixes the issue where recharts calculates node value as sum of all flows
    const nodeValue = data.nodes[index]?.value || payload.value || 0;
    
    // Split name by \n for multi-line rendering
    const nameLines = payload.name ? payload.name.split('\n') : [];
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#3B82F6"
          fillOpacity="0.8"
        />
        {/* Render each line of the name */}
        {nameLines.map((line: string, idx: number) => (
          <text
            key={idx}
            textAnchor={isOut ? 'end' : 'start'}
            x={isOut ? x - 6 : x + width + 6}
            y={y + height / 2 + (idx * 15) - ((nameLines.length - 1) * 7.5)}
            fontSize={idx === 0 ? "12" : "10"}
            fontWeight={idx === 0 ? "600" : "400"}
            fill={idx === 0 ? "#374151" : "#6b7280"}
            dy="0.35em"
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  // Custom link rendering
  const CustomLink = ({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index }: any) => {
    // Generate gradient color based on link index
    const colors = ['#3B82F6', '#F97316', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
    const color = colors[index % colors.length];
    
    return (
      <path
        d={`
          M${sourceX},${sourceY + linkWidth / 2}
          C${sourceControlX},${sourceY + linkWidth / 2}
          ${targetControlX},${targetY + linkWidth / 2}
          ${targetX},${targetY + linkWidth / 2}
        `}
        fill="none"
        stroke={color}
        strokeOpacity="0.3"
        strokeWidth={linkWidth}
      />
    );
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
      {/* Chart Title with Icon */}
      {title && (
        <div style={{
          padding: '16px 20px 12px 20px',
          borderBottom: '1px solid #f3f4f6',
          backgroundColor: '#ffffff',
          borderRadius: '8px 8px 0 0',
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
      )}
      
      {/* Chart Container */}
      <div style={{ 
        flex: 1, 
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px'
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={data}
            node={<CustomNode />}
            link={<CustomLink />}
            nodePadding={50}
            margin={{ top: 20, right: 150, bottom: 20, left: 150 }}
          >
            <Tooltip 
              content={<CustomTooltip />}
              wrapperStyle={{ zIndex: 9999 }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

