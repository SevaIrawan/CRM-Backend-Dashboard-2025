'use client'

import React from 'react'

interface ComingSoonProps {
  title: string
  subtitle?: string
  message?: string
  darkMode?: boolean
}

export default function ComingSoon({ 
  title, 
  subtitle = "This feature is currently under development", 
  message = "We're working hard to bring you this feature. Please check back soon!",
  darkMode = false 
}: ComingSoonProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '40px 20px',
      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
      borderRadius: '12px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      margin: '20px'
    }}>
      {/* Icon */}
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: darkMode ? '#374151' : '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '30px',
        border: `3px solid ${darkMode ? '#4b5563' : '#d1d5db'}`
      }}>
        <svg 
          width="60" 
          height="60" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={darkMode ? '#9ca3af' : '#6b7280'} 
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: '36px',
        fontWeight: '700',
        color: darkMode ? '#ffffff' : '#1f2937',
        marginBottom: '16px',
        lineHeight: '1.2'
      }}>
        {title}
      </h1>

      {/* Subtitle */}
      <h2 style={{
        fontSize: '20px',
        fontWeight: '500',
        color: darkMode ? '#d1d5db' : '#6b7280',
        marginBottom: '24px',
        lineHeight: '1.4'
      }}>
        {subtitle}
      </h2>

      {/* Message */}
      <p style={{
        fontSize: '16px',
        color: darkMode ? '#9ca3af' : '#6b7280',
        maxWidth: '500px',
        lineHeight: '1.6',
        marginBottom: '32px'
      }}>
        {message}
      </p>

      {/* Status Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: darkMode ? '#059669' : '#10b981',
        color: '#ffffff',
        borderRadius: '25px',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          animation: 'pulse 2s infinite'
        }}></div>
        In Development
      </div>

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
    </div>
  )
}
