'use client'

import React from 'react'
import { TABLE_STYLES, getTableMaxHeight, getTableOverflow, MAX_TABLE_HEIGHT } from './StandardModal'

interface Column {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  render?: (value: any, row: any) => React.ReactNode
}

interface StandardTableProps {
  columns: Column[]
  data: any[]
  totalItems: number
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: any) => void
  stickyHeader?: boolean
}

export default function StandardTable({
  columns,
  data,
  totalItems,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  stickyHeader = true
}: StandardTableProps) {
  const maxHeight = getTableMaxHeight(totalItems)
  const overflow = getTableOverflow(totalItems)

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '16px', color: '#6B7280' }}>Loading...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      style={{
        ...TABLE_STYLES.container,
        maxHeight: maxHeight === 'none' ? undefined : maxHeight,
        overflowX: 'auto',
        overflowY: overflow,
        position: 'relative'
      }}
    >
      <table style={TABLE_STYLES.container}>
        <thead
          style={{
            ...TABLE_STYLES.thead,
            position: stickyHeader ? 'sticky' : 'static'
          }}
        >
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  ...TABLE_STYLES.th,
                  textAlign: column.align || 'left'
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              style={{
                ...(index % 2 === 0 ? TABLE_STYLES.rowEven : TABLE_STYLES.rowOdd),
                cursor: onRowClick ? 'pointer' : 'default'
              }}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    ...TABLE_STYLES.td,
                    textAlign: column.align || 'left'
                  }}
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Export constants for direct use
export { TABLE_STYLES, MAX_TABLE_HEIGHT, getTableMaxHeight, getTableOverflow }

