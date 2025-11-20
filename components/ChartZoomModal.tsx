'use client'

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ChartZoomModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  dataCount?: number // For dynamic width calculation
}

export default function ChartZoomModal({
  isOpen,
  onClose,
  title,
  children,
  dataCount = 4 // Default 4 data points
}: ChartZoomModalProps) {
  // Calculate dynamic width based on data count
  // Formula: 600px base + (dataCount × 80px per point)
  // Min: 70vw, Max: 95vw
  const calculateWidth = () => {
    const baseWidth = 600
    const widthPerPoint = 80
    const calculatedWidth = baseWidth + (dataCount * widthPerPoint)
    
    const vwWidth = (calculatedWidth / window.innerWidth) * 100
    
    // Clamp between 70vw and 95vw
    if (vwWidth < 70) return '70vw'
    if (vwWidth > 95) return '95vw'
    return `${vwWidth}vw`
  }
  
  const modalWidth = typeof window !== 'undefined' ? calculateWidth() : '80vw'

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  // Render modal at document.body level using Portal (avoid parent layout issues)
  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chart-zoom-title"
      style={{
        position: 'fixed',
        top: '150px', // Header (90px) + Subheader (60px)
        left: '280px', // Sidebar width
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          width: modalWidth,
          height: '70vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden'
        }}
      >
        {/* Header - Minimal */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <h3 
            id="chart-zoom-title"
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151',
              margin: 0
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close chart zoom modal"
            style={{
              padding: '8px 16px',
              backgroundColor: '#6B7280',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6B7280'
            }}
          >
            Close
          </button>
        </div>

        {/* Body - Chart Container */}
        <div
          style={{
            flex: 1,
            padding: '8px 16px',
            overflowX: 'auto',
            overflowY: 'hidden',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'flex-start'
          }}
        >
          <div style={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

