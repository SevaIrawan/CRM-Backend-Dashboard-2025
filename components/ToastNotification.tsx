'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastNotificationProps {
  message: string
  type?: ToastType
  duration?: number // Auto-dismiss duration in ms (0 = no auto-dismiss)
  onClose?: () => void
  show: boolean
}

export default function ToastNotification({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  show
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  const handleClose = useCallback(() => {
    setIsVisible(false)
    // Wait for animation to complete before unmounting
    setTimeout(() => {
      setShouldRender(false)
      if (onClose) onClose()
    }, 300)
  }, [onClose])

  useEffect(() => {
    if (show) {
      setShouldRender(true)
      // Trigger animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
      
      // Auto-dismiss
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose()
        }, duration)
        return () => clearTimeout(timer)
      }
    } else if (!show && shouldRender) {
      handleClose()
    }
  }, [show, duration, handleClose, shouldRender])

  // Handle ESC key
  useEffect(() => {
    if (!shouldRender) return
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [shouldRender, handleClose])

  if (!shouldRender) return null

  const typeConfig = {
    success: {
      iconBg: '#10B981',
      bgColor: '#FFFFFF',
      borderColor: '#10B981',
      textColor: '#065F46',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
            stroke="#FFFFFF" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    error: {
      iconBg: '#FEE2E2',
      bgColor: '#FFFFFF',
      borderColor: '#EF4444',
      textColor: '#991B1B',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M18 6L6 18M6 6L18 18" 
            stroke="#EF4444" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    warning: {
      iconBg: '#FEF3C7',
      bgColor: '#FFFFFF',
      borderColor: '#F59E0B',
      textColor: '#92400E',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
            stroke="#F59E0B" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    info: {
      iconBg: '#DBEAFE',
      bgColor: '#FFFFFF',
      borderColor: '#3B82F6',
      textColor: '#1E40AF',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
            stroke="#3B82F6" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      )
    }
  }

  const config = typeConfig[type]

  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        transform: isVisible ? 'translateX(0)' : 'translateX(calc(100% + 24px))',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'auto',
        maxWidth: '420px',
        width: 'auto',
        minWidth: '320px'
      }}
    >
      <div
        style={{
          backgroundColor: config.bgColor,
          border: `1px solid ${config.borderColor}`,
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
          padding: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Left border accent */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            backgroundColor: config.borderColor,
            borderRadius: '12px 0 0 12px'
          }}
        />

        {/* Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: config.iconBg,
            flexShrink: 0,
            marginLeft: '4px'
          }}
        >
          {config.icon}
        </div>

        {/* Message */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: '1.5',
              color: config.textColor,
              wordBreak: 'break-word'
            }}
          >
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9CA3AF',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7,
            transition: 'all 0.2s',
            flexShrink: 0,
            borderRadius: '4px',
            width: '24px',
            height: '24px',
            marginTop: '-2px',
            marginRight: '-4px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.backgroundColor = '#F3F4F6'
            e.currentTarget.style.color = '#6B7280'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7'
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#9CA3AF'
          }}
          aria-label="Close notification"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M12 4L4 12M4 4L12 12" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  )
}
