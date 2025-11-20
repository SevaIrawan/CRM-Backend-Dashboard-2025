'use client'

/**
 * CONTOH PENGGUNAAN STANDARD MODAL
 * 
 * File ini adalah contoh bagaimana menggunakan StandardModal dan StandardTable
 * Copy-paste dan modifikasi sesuai kebutuhan
 */

import React, { useState } from 'react'
import StandardModal, { StandardPagination, StandardExportButton, MODAL_STYLES, getTableMaxHeight, getTableOverflow } from './StandardModal'
import StandardTable from './StandardTable'

interface ExampleData {
  id: number
  name: string
  value: number
}

export default function StandardModalExample() {
  const [isOpen, setIsOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(100)
  const [exporting, setExporting] = useState(false)

  // Example data
  const totalRecords = 250
  const totalPages = Math.ceil(totalRecords / limit)
  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, totalRecords)

  const columns = [
    { key: 'id', label: 'ID', align: 'left' as const },
    { key: 'name', label: 'Name', align: 'left' as const },
    { key: 'value', label: 'Value', align: 'right' as const }
  ]

  const data: ExampleData[] = [
    { id: 1, name: 'Item 1', value: 100 },
    { id: 2, name: 'Item 2', value: 200 },
    // ... more data
  ]

  const handleExport = async () => {
    setExporting(true)
    // Your export logic here
    await new Promise(resolve => setTimeout(resolve, 2000))
    setExporting(false)
  }

  // Determine if pagination should be shown
  const showPagination = totalRecords >= 100
  const showScroll = totalRecords < 100

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>

      <StandardModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="EXAMPLE MODAL TITLE"
        subtitle="2025 • November • Example Subtitle"
      >
        {/* Content Area */}
        <div style={MODAL_STYLES.content}>
          {/* Table with scroll (if < 100 records) */}
          {showScroll && (
            <StandardTable
              columns={columns}
              data={data}
              totalItems={totalRecords}
              loading={false}
              emptyMessage="No data available"
            />
          )}

          {/* Table with pagination (if >= 100 records) */}
          {showPagination && (
            <>
              <div
                style={{
                  ...MODAL_STYLES.tableContainer,
                  maxHeight: getTableMaxHeight(totalRecords),
                  overflowY: getTableOverflow(totalRecords)
                }}
              >
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #e0e0e0',
                  fontSize: '14px'
                }}>
                  <thead style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#374151',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <tr>
                      {columns.map(col => (
                        <th key={col.key} style={{
                          padding: '10px 14px',
                          textAlign: col.align || 'left',
                          fontWeight: 600,
                          backgroundColor: '#374151',
                          color: 'white',
                          border: '1px solid #4b5563',
                          borderBottom: '2px solid #4b5563',
                          whiteSpace: 'nowrap'
                        }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, index) => (
                      <tr
                        key={row.id}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                        }}
                      >
                        {columns.map(col => (
                          <td key={col.key} style={{
                            padding: '10px 14px',
                            border: '1px solid #e0e0e0',
                            color: '#374151',
                            textAlign: col.align || 'left'
                          }}>
                            {row[col.key as keyof ExampleData]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer with Pagination and Export */}
        <div style={MODAL_STYLES.footer}>
          {showScroll ? (
            // For scroll mode: Show caption only
            <p style={{
              fontSize: '12px',
              color: '#6B7280',
              margin: 0
            }}>
              Showing {startIndex} - {endIndex} of {totalRecords} records
            </p>
          ) : (
            // For pagination mode: Show pagination controls and export
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <p style={{
                fontSize: '12px',
                color: '#6B7280',
                margin: 0
              }}>
                Showing {startIndex} - {endIndex} of {totalRecords} records
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <StandardPagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  limit={limit}
                  onLimitChange={setLimit}
                  totalRecords={totalRecords}
                  showLimitDropdown={true}
                />
                <StandardExportButton
                  onClick={handleExport}
                  exporting={exporting}
                  disabled={data.length === 0}
                />
              </div>
            </div>
          )}
        </div>
      </StandardModal>
    </>
  )
}

