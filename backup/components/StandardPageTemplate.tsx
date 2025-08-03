'use client'

// STANDARD PAGE TEMPLATE - COMPLIANCE WITH NEXMAX RULES
// 3-Row Layout: KPI Cards (Row 1) + Charts (Row 2-3)
// Auto-responsive dengan sidebar, header, subheader

import React from 'react'

interface StandardPageTemplateProps {
  pageName: string
  kpiData?: Array<{
    icon: string
    title: string
    value: string | number
    subtitle?: string
  }>
  showComingSoon?: boolean
}

export default function StandardPageTemplate({ 
  pageName, 
  kpiData = [],
  showComingSoon = true 
}: StandardPageTemplateProps) {
  
  // Default KPI data for coming soon pages
  const defaultKPIs = [
    {
      icon: '🚀',
      title: pageName,
      value: 'Coming Soon',
      subtitle: 'Under Development'
    },
    {
      icon: '📊',
      title: 'Analytics',
      value: 'Advanced',
      subtitle: 'Real-time Data'
    },
    {
      icon: '🎯',
      title: 'KPI Monitoring',
      value: 'Smart',
      subtitle: 'Auto Tracking'
    },
    {
      icon: '📈',
      title: 'Reports',
      value: 'Dynamic',
      subtitle: 'Exportable'
    }
  ]

  const displayKPIs = kpiData.length > 0 ? kpiData : defaultKPIs

  return (
    <div className="standard-frame">
      {/* BARIS 1: KPI CARDS (STANDARD ROW) */}
      <div className="kpi-row">
        {displayKPIs.map((kpi, index) => (
          <div
            key={index}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>{kpi.icon}</div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '18px' }}>
                {kpi.title}
              </h3>
              <div style={{ 
                margin: '0 0 4px 0', 
                color: '#3b82f6', 
                fontSize: '24px', 
                fontWeight: 'bold' 
              }}>
                {kpi.value}
              </div>
              {kpi.subtitle && (
                <p style={{ margin: '0', color: '#6b7280', fontSize: '12px' }}>
                  {kpi.subtitle}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* BARIS 2: CHART ROW (FEATURES/STATUS) */}
      <div className="chart-row">
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ 
            margin: '0 0 24px 0', 
            color: '#1f2937',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '12px'
          }}>
            Fitur yang akan tersedia
          </h3>
          
          <div style={{ 
            flex: 1, 
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px',
            alignItems: 'start'
          }}>
            {[
              { icon: '📈', text: 'Visualisasi data real-time' },
              { icon: '📋', text: 'Laporan lengkap dan dapat diekspor' },
              { icon: '🔄', text: 'Integrasi data otomatis' },
              { icon: '🎛️', text: 'Dashboard interaktif' },
              { icon: '⚡', text: 'Performa tinggi' },
              { icon: '🔐', text: 'Keamanan berlapis' }
            ].map((feature, index) => (
              <div 
                key={index}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}
              >
                <span style={{ fontSize: '24px' }}>{feature.icon}</span>
                <span style={{ color: '#495057', fontSize: '14px' }}>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART PLACEHOLDER */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Chart Preview</h3>
          <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
            Interactive charts akan tersedia setelah development selesai
          </p>
        </div>
      </div>

      {/* BARIS 3: TIMELINE & STATUS */}
      <div className="chart-row">
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⏰</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Development Timeline</h3>
          <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '18px' }}>
            Estimasi: Q1 2025
          </p>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            🚧 Under Development
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            color: '#1f2937',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '12px'
          }}>
            Progress Status
          </h3>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { task: 'Planning & Design', progress: 100, status: 'completed' },
              { task: 'Database Integration', progress: 100, status: 'completed' },
              { task: 'UI Development', progress: 75, status: 'in-progress' },
              { task: 'Testing & Optimization', progress: 25, status: 'pending' }
            ].map((item, index) => (
              <div key={index} style={{ marginBottom: '12px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '4px' 
                }}>
                  <span style={{ fontSize: '12px', color: '#495057' }}>{item.task}</span>
                  <span style={{ fontSize: '12px', color: '#6c757d' }}>{item.progress}%</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${item.progress}%`,
                    height: '100%',
                    backgroundColor: item.status === 'completed' ? '#28a745' : 
                                  item.status === 'in-progress' ? '#ffc107' : '#6c757d',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Export tambahan untuk multiple use cases
export const StandardKPICard = ({ 
  icon, 
  title, 
  value, 
  subtitle 
}: {
  icon: string
  title: string
  value: string | number
  subtitle?: string
}) => (
  <div style={{
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '48px', marginBottom: '12px' }}>{icon}</div>
    <div>
      <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '18px' }}>
        {title}
      </h3>
      <div style={{ 
        margin: '0 0 4px 0', 
        color: '#3b82f6', 
        fontSize: '24px', 
        fontWeight: 'bold' 
      }}>
        {value}
      </div>
      {subtitle && (
        <p style={{ margin: '0', color: '#6b7280', fontSize: '12px' }}>
          {subtitle}
        </p>
      )}
    </div>
  </div>
)

export const StandardChartContainer = ({ 
  title, 
  children 
}: { 
  title: string
  children: React.ReactNode 
}) => (
  <div style={{
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column'
  }}>
    <h3 style={{ 
      margin: '0 0 24px 0', 
      color: '#1f2937',
      borderBottom: '2px solid #e5e7eb',
      paddingBottom: '12px'
    }}>
      {title}
    </h3>
    <div style={{ flex: 1 }}>
      {children}
    </div>
  </div>
)