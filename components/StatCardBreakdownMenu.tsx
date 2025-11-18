'use client'

import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface BreakdownMenuItem {
  label: string
  icon?: string
  action: () => void
}

interface BreakdownMenuColumn {
  title: string
  items: BreakdownMenuItem[]
}

interface StatCardBreakdownMenuProps {
  isOpen: boolean
  onClose: () => void
  leftColumn: BreakdownMenuColumn
  rightColumn: BreakdownMenuColumn
  triggerElement: HTMLElement | null
}

export default function StatCardBreakdownMenu({
  isOpen,
  onClose,
  leftColumn,
  rightColumn,
  triggerElement
}: StatCardBreakdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  // Calculate position based on trigger element
  useEffect(() => {
    if (!isOpen || !triggerElement) return

    const calculatePosition = () => {
      const rect = triggerElement.getBoundingClientRect()
      const menuWidth = 400
      const menuHeight = 300 // Approximate height
      
      // Position below the trigger, aligned to right
      let left = rect.right - menuWidth
      let top = rect.bottom + 8
      
      // Adjust if menu goes off screen
      if (left < 8) left = 8
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8
      }
      if (top + menuHeight > window.innerHeight - 8) {
        // Position above if not enough space below
        top = rect.top - menuHeight - 8
      }
      
      setPosition({ top, left })
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
  }, [isOpen, triggerElement])

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return

    let cleanup: (() => void) | null = null

    // Use a small delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node
        
        // Don't close if clicking on trigger element or menu
        if (
          menuRef.current?.contains(target) ||
          triggerElement?.contains(target)
        ) {
          return
        }
        
        onClose()
      }

      // Use capture phase to catch events early
      document.addEventListener('mousedown', handleClickOutside, true)
      
      cleanup = () => {
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
    }, 50)

    // ESC key to close
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    
    return () => {
      clearTimeout(timeoutId)
      if (cleanup) cleanup()
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose, triggerElement])

  if (!isOpen || !position || typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          backgroundColor: 'transparent'
        }}
      />
      
      {/* Menu */}
      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
          minWidth: '400px',
          zIndex: 1000,
          overflow: 'hidden'
        }}
      >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#F9FAFB'
        }}
      >
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#1F2937',
            margin: 0
          }}
        >
          GROSS GAMING REVENUE BREAKDOWN
        </h3>
      </div>

      {/* Two Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0
        }}
      >
        {/* Left Column */}
        <div
          style={{
            padding: '12px 0',
            borderRight: '1px solid #E5E7EB'
          }}
        >
          <div
            style={{
              padding: '0 16px 8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {leftColumn.title}
          </div>
          {leftColumn.items.map((item, index) => (
            <div
              key={index}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                item.action()
                onClose()
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '14px',
                color: '#1F2937',
                transition: 'background-color 0.15s ease',
                borderLeft: '3px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6'
                e.currentTarget.style.borderLeftColor = '#3B82F6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderLeftColor = 'transparent'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </span>
              <span style={{ color: '#9CA3AF', fontSize: '12px' }}>→</span>
            </div>
          ))}
        </div>

        {/* Right Column */}
        <div
          style={{
            padding: '12px 0'
          }}
        >
          <div
            style={{
              padding: '0 16px 8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {rightColumn.title}
          </div>
          {rightColumn.items.map((item, index) => (
            <div
              key={index}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                item.action()
                onClose()
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '14px',
                color: '#1F2937',
                transition: 'background-color 0.15s ease',
                borderLeft: '3px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6'
                e.currentTarget.style.borderLeftColor = '#3B82F6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderLeftColor = 'transparent'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </span>
              <span style={{ color: '#9CA3AF', fontSize: '12px' }}>→</span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </>,
    document.body
  )
}

