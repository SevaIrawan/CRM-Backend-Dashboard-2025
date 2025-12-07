'use client'

import React from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'

export default function USCMemberAnalyticPage() {
  const subHeaderContent = (
    <div className="subheader-content">
      <div className="subheader-title">
        <span className="filter-export-text">Member Analytic USC</span>
      </div>
    </div>
  )

  return (
    <Layout customSubHeader={subHeaderContent}>
      <Frame variant="standard">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          padding: '40px'
        }}>
          {/* Icon */}
          <div style={{
            fontSize: '80px',
            marginBottom: '24px',
            opacity: 0.7
          }}>
            🚧
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#1f2937',
            marginBottom: '16px',
            letterSpacing: '-0.02em'
          }}>
            Coming Soon
          </h1>

          {/* Description */}
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '12px',
            maxWidth: '500px',
            lineHeight: '1.6'
          }}>
            Member Analytic USC sedang dalam proses rebuild untuk memberikan pengalaman yang lebih baik.
          </p>

          <p style={{
            fontSize: '14px',
            color: '#9ca3af',
            fontStyle: 'italic'
          }}>
            Terima kasih atas kesabaran Anda.
          </p>

          {/* Progress Bar Decoration */}
          <div style={{
            marginTop: '40px',
            width: '300px',
            height: '4px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '40%',
              height: '100%',
              backgroundColor: '#3b82f6',
              animation: 'pulse 2s ease-in-out infinite'
            }}></div>
          </div>
            </div>
      </Frame>

          <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
        }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </Layout>
  )
}
