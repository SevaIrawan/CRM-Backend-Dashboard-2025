'use client'

import React from 'react'
import { createPortal } from 'react-dom'

// Standard Modal Styles
export const MODAL_STYLES = {
  wrapper: {
    position: 'fixed' as const,
    top: '150px',
    left: '280px',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 10000,
    padding: 0,
    margin: 0
  },
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '95vw',
    maxHeight: '75vh',
    margin: 'auto' as const,
    overflow: 'hidden' as const,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  header: {
    padding: '24px',
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const
  },
  content: {
    padding: 0,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    flex: 1,
    overflow: 'hidden' as const,
    minHeight: 0
  },
  footer: {
    padding: '12px 24px',
    borderTop: '1px solid #e5e7eb',
    flexShrink: 0
  },
  tableContainer: {
    maxHeight: '418px', // 11 rows (1 header + 10 data) × 38px = 418px
    overflowX: 'auto' as const,
    overflowY: 'auto' as const,
    position: 'relative' as const
  }
}

// Standard Button Styles
export const BUTTON_STYLES = {
  close: {
    padding: '8px 16px',
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
    border: 'none' as const,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500 as const,
    cursor: 'pointer' as const,
    transition: 'all 0.2s ease'
  },
  closeHover: '#4B5563',
  export: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: '#FFFFFF',
    border: 'none' as const,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500 as const,
    cursor: 'pointer' as const,
    transition: 'all 0.2s ease'
  },
  exportHover: '#059669',
  exportDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
    cursor: 'not-allowed' as const
  },
  back: {
    padding: '8px 16px',
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
    border: 'none' as const,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500 as const,
    cursor: 'pointer' as const,
    transition: 'all 0.2s ease'
  },
  backHover: '#4B5563',
  pagination: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    background: 'transparent' as const,
    color: '#374151',
    cursor: 'pointer' as const,
    fontWeight: 500 as const,
    transition: 'all 0.2s ease'
  },
  paginationHover: '#9ca3af',
  paginationDisabled: {
    color: '#9ca3af',
    cursor: 'not-allowed' as const
  }
}

// Standard Table Styles
export const TABLE_STYLES = {
  container: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    border: '1px solid #e0e0e0',
    fontSize: '14px'
  },
  thead: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    backgroundColor: '#374151',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left' as const,
    fontWeight: 600 as const,
    backgroundColor: '#374151',
    color: 'white',
    border: '1px solid #4b5563',
    borderBottom: '2px solid #4b5563',
    whiteSpace: 'nowrap' as const
  },
  td: {
    padding: '10px 14px',
    border: '1px solid #e0e0e0',
    color: '#374151'
  },
  rowEven: {
    backgroundColor: '#FFFFFF'
  },
  rowOdd: {
    backgroundColor: '#FAFAFA'
  }
}

// Standard Pagination Options
export const PAGINATION_OPTIONS = [20, 50, 100]

// Standard Row Height Calculation
export const ROW_HEIGHT = 38 // padding 10px top + 10px bottom (20px) + border 1px + content ~17px
export const HEADER_HEIGHT = 38
export const MAX_TABLE_HEIGHT = HEADER_HEIGHT + (10 * ROW_HEIGHT) // 418px for 10 rows + 1 header

interface StandardModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  showBackButton?: boolean
  onBack?: () => void
  zIndex?: number
}

export default function StandardModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  showBackButton = false,
  onBack,
  zIndex = 10000
}: StandardModalProps) {
  if (!isOpen || typeof document === 'undefined') return null

  const handleCloseButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isEnter: boolean) => {
    e.currentTarget.style.backgroundColor = isEnter ? BUTTON_STYLES.closeHover : BUTTON_STYLES.close.backgroundColor
  }

  const handleBackButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isEnter: boolean) => {
    if (onBack) {
      e.currentTarget.style.backgroundColor = isEnter ? BUTTON_STYLES.backHover : BUTTON_STYLES.back.backgroundColor
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        ...MODAL_STYLES.wrapper,
        zIndex
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={MODAL_STYLES.container}
      >
        {/* Header */}
        <div style={MODAL_STYLES.header}>
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#1F2937',
                margin: 0,
                marginBottom: subtitle ? '4px' : 0
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                {subtitle}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                style={BUTTON_STYLES.back}
                onMouseEnter={(e) => handleBackButtonHover(e, true)}
                onMouseLeave={(e) => handleBackButtonHover(e, false)}
              >
                Back
              </button>
            )}
            <button
              onClick={onClose}
              style={BUTTON_STYLES.close}
              onMouseEnter={(e) => handleCloseButtonHover(e, true)}
              onMouseLeave={(e) => handleCloseButtonHover(e, false)}
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={MODAL_STYLES.content}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={MODAL_STYLES.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// Helper function untuk calculate table maxHeight
export function getTableMaxHeight(totalItems: number): string {
  return totalItems >= 100 ? 'none' : `${MAX_TABLE_HEIGHT}px`
}

// Helper function untuk determine overflow
export function getTableOverflow(totalItems: number): 'visible' | 'auto' {
  return totalItems >= 100 ? 'visible' : 'auto'
}

// Helper function untuk pagination info
export function getPaginationInfo(page: number, limit: number, totalRecords: number) {
  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, totalRecords)
  return { startIndex, endIndex }
}

// Standard Pagination Component
interface StandardPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  limit?: number
  onLimitChange?: (limit: number) => void
  totalRecords: number
  showLimitDropdown?: boolean
}

export function StandardPagination({
  page,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  totalRecords,
  showLimitDropdown = false
}: StandardPaginationProps) {
  const { startIndex, endIndex } = getPaginationInfo(page, limit || 100, totalRecords)

  const handlePaginationHover = (e: React.MouseEvent<HTMLButtonElement>, isEnter: boolean, isDisabled: boolean) => {
    if (!isDisabled) {
      e.currentTarget.style.borderColor = isEnter ? BUTTON_STYLES.paginationHover : '#d1d5db'
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: '12px'
    }}>
      {/* Showing Info */}
      <span style={{
        fontSize: '12px',
        color: '#6B7280',
        fontWeight: 500,
        whiteSpace: 'nowrap'
      }}>
        Showing {startIndex} - {endIndex} of {totalRecords} records
      </span>

      {/* Limit Dropdown */}
      {showLimitDropdown && limit && onLimitChange && (
        <select
          value={limit}
          onChange={(e) => {
            onLimitChange(Number(e.target.value))
            onPageChange(1)
          }}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          {PAGINATION_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {/* Page Info */}
      <span style={{
        fontSize: '12px',
        color: '#6B7280',
        fontWeight: 500,
        whiteSpace: 'nowrap'
      }}>
        Page {page} of {totalPages}
      </span>

      {/* Previous Button */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        style={{
          ...BUTTON_STYLES.pagination,
          ...(page === 1 ? BUTTON_STYLES.paginationDisabled : {})
        }}
        onMouseEnter={(e) => handlePaginationHover(e, true, page === 1)}
        onMouseLeave={(e) => handlePaginationHover(e, false, page === 1)}
      >
        Previous
      </button>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        style={{
          ...BUTTON_STYLES.pagination,
          ...(page === totalPages ? BUTTON_STYLES.paginationDisabled : {})
        }}
        onMouseEnter={(e) => handlePaginationHover(e, true, page === totalPages)}
        onMouseLeave={(e) => handlePaginationHover(e, false, page === totalPages)}
      >
        Next
      </button>
    </div>
  )
}

// Standard Export Button Component
interface StandardExportButtonProps {
  onClick: () => void
  exporting?: boolean
  disabled?: boolean
  label?: string
}

export function StandardExportButton({
  onClick,
  exporting = false,
  disabled = false,
  label = 'Export'
}: StandardExportButtonProps) {
  const isDisabled = exporting || disabled

  const handleHover = (e: React.MouseEvent<HTMLButtonElement>, isEnter: boolean) => {
    if (!isDisabled) {
      e.currentTarget.style.backgroundColor = isEnter ? BUTTON_STYLES.exportHover : BUTTON_STYLES.export.backgroundColor
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      style={{
        ...BUTTON_STYLES.export,
        ...(isDisabled ? BUTTON_STYLES.exportDisabled : {})
      }}
      onMouseEnter={(e) => handleHover(e, true)}
      onMouseLeave={(e) => handleHover(e, false)}
    >
      {exporting ? 'Exporting...' : label}
    </button>
  )
}

