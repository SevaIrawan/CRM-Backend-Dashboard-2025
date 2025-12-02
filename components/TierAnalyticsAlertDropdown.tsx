'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface Alert {
  id: string
  title: string
  message: string
  type: 'warning' | 'info' | 'error'
  priority?: 'high' | 'medium' | 'low'
}

interface TierAnalyticsAlertDropdownProps {
  isOpen: boolean
  onClose: () => void
  alerts: Alert[]
  triggerElement: HTMLElement | null
}

export default function TierAnalyticsAlertDropdown({
  isOpen,
  onClose,
  alerts,
  triggerElement
}: TierAnalyticsAlertDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerElement &&
        !triggerElement.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, triggerElement])

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Calculate position
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    if (!isOpen || !triggerElement) return

    const calculatePosition = () => {
      const rect = triggerElement.getBoundingClientRect()
      const dropdownWidth = 450
      const dropdownHeight = Math.min(600, alerts.length * 120 + 100) // Approximate height

      // Position below the trigger, aligned to right
      let top = rect.bottom + 12
      let right = window.innerWidth - rect.right

      // Adjust if dropdown goes off screen
      if (top + dropdownHeight > window.innerHeight - 20) {
        // Position above if not enough space below
        top = rect.top - dropdownHeight - 12
      }

      // Ensure dropdown doesn't go off left edge
      if (right + dropdownWidth > window.innerWidth - 20) {
        right = 20
      }

      setPosition({ top, right })
    }

    calculatePosition()

    // Recalculate on scroll/resize
    const handleResize = () => calculatePosition()
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
    }
  }, [isOpen, triggerElement, alerts.length])

  if (!isOpen || !position || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        right: `${position.right}px`,
        width: '450px',
        maxHeight: '600px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #E5E7EB',
        zIndex: 10001,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#1F2937',
            margin: 0,
            marginBottom: '4px'
          }}>
            Alerts
          </h2>
          <p style={{
            fontSize: '13px',
            color: '#6B7280',
            margin: 0
          }}>
            {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'} require attention
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #E5E7EB',
            backgroundColor: '#FFFFFF',
            color: '#6B7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6'
            e.currentTarget.style.borderColor = '#D1D5DB'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF'
            e.currentTarget.style.borderColor = '#E5E7EB'
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Alerts List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px'
      }}>
        {alerts.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <p style={{ fontSize: '14px', margin: 0 }}>No alerts available</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: '16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Warning Icon */}
                <div style={{
                  flexShrink: 0,
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="2"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>

                {/* Alert Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1F2937',
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    {alert.title}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: '#374151',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    {alert.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

