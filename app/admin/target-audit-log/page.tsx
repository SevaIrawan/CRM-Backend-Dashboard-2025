'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import SubHeader from '@/components/SubHeader'
import { useRouter } from 'next/navigation'

interface TargetAuditLog {
  id: number
  target_id: number | null
  currency: string
  line: string
  year: number
  quarter: string
  action: string
  old_target_ggr: number | null
  new_target_ggr: number | null
  old_target_deposit_amount: number | null
  new_target_deposit_amount: number | null
  old_target_deposit_cases: number | null
  new_target_deposit_cases: number | null
  old_target_active_member: number | null
  new_target_active_member: number | null
  old_forecast_ggr: number | null
  new_forecast_ggr: number | null
  changed_by: string
  changed_by_role: string
  changed_at: string
  ip_address: string | null
  reason: string | null
}

export default function TargetAuditLogPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<TargetAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [filters, setFilters] = useState({
    currency: '',
    line: '',
    year: '',
    quarter: '',
    action: '',
    changedBy: '',
    startDate: '',
    endDate: ''
  })
  const [rowsPerPage, setRowsPerPage] = useState(20)

  // Check admin access
  useEffect(() => {
    const session = localStorage.getItem('nexmax_session')
    if (!session) {
      router.push('/login')
      return
    }

    const sessionData = JSON.parse(session)
    if (sessionData.role !== 'admin') {
      router.push('/dashboard')
      return
    }
  }, [router])

  // Fetch audit logs
  const fetchLogs = async (page = 1) => {
    try {
      console.log('🔍 [Target Audit Log] Fetching logs, page:', page)
      setLoading(true)
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })

      const response = await fetch(`/api/target-audit-log?${queryParams}`)
      const data = await response.json()

      if (response.ok) {
        console.log('✅ [Target Audit Log] Logs fetched:', data.logs.length, 'records')
        setLogs(data.logs)
        setTotalPages(data.totalPages)
        setTotalRecords(data.totalRecords)
        setCurrentPage(data.currentPage)
      } else {
        console.error('❌ [Target Audit Log] Error:', data.error)
      }
    } catch (error) {
      console.error('❌ [Target Audit Log] Network error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(1)
  }, [filters, rowsPerPage])

  const handlePageChange = (newPage: number) => {
    fetchLogs(newPage)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleExport = () => {
    const queryParams = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      ),
      export: 'csv'
    })
    
    window.open(`/api/target-audit-log?${queryParams}`, '_blank')
  }

  const formatCurrency = (value: number | null, currency: string) => {
    if (value === null) return 'N/A'
    const symbol = currency === 'MYR' ? 'RM' : currency === 'SGD' ? 'SGD' : 'USD'
    return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatNumber = (value: number | null) => {
    if (value === null) return 'N/A'
    return value.toLocaleString('en-US')
  }

  const getActionBadge = (action: string) => {
    const colors = {
      CREATE: '#10B981',
      UPDATE: '#F59E0B',
      DELETE: '#EF4444'
    }
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#FFFFFF',
        backgroundColor: colors[action as keyof typeof colors] || '#6B7280'
      }}>
        {action}
      </span>
    )
  }

  return (
    <Layout>
      <SubHeader
        title="Target Audit Log"
        subtitle="Track all target changes with complete audit trail"
        showTimestamp={false}
      />

      <Frame>
        {/* FILTERS */}
        <div style={{
          padding: '20px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #E5E7EB'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Filters
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            {/* Currency Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6B7280',
                marginBottom: '6px'
              }}>
                Currency
              </label>
              <select
                value={filters.currency}
                onChange={(e) => handleFilterChange('currency', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <option value="">All</option>
                <option value="MYR">MYR</option>
                <option value="SGD">SGD</option>
                <option value="USC">USC</option>
              </select>
            </div>

            {/* Line Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6B7280',
                marginBottom: '6px'
              }}>
                Line/Brand
              </label>
              <input
                type="text"
                value={filters.line}
                onChange={(e) => handleFilterChange('line', e.target.value)}
                placeholder="e.g. SBMY, ALL"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px'
                }}
              />
            </div>

            {/* Year Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6B7280',
                marginBottom: '6px'
              }}>
                Year
              </label>
              <input
                type="number"
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                placeholder="e.g. 2025"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px'
                }}
              />
            </div>

            {/* Quarter Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6B7280',
                marginBottom: '6px'
              }}>
                Quarter
              </label>
              <select
                value={filters.quarter}
                onChange={(e) => handleFilterChange('quarter', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <option value="">All</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6B7280',
                marginBottom: '6px'
              }}>
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <option value="">All</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            {/* Changed By Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6B7280',
                marginBottom: '6px'
              }}>
                Changed By
              </label>
              <input
                type="text"
                value={filters.changedBy}
                onChange={(e) => handleFilterChange('changedBy', e.target.value)}
                placeholder="Username"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px'
                }}
              />
            </div>

            {/* Start Date Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6B7280',
                marginBottom: '6px'
              }}>
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px'
                }}
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6B7280',
                marginBottom: '6px'
              }}>
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px'
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginTop: '16px'
          }}>
            <button
              onClick={() => setFilters({
                currency: '',
                line: '',
                year: '',
                quarter: '',
                action: '',
                changedBy: '',
                startDate: '',
                endDate: ''
              })}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#6B7280',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>

            <button
              onClick={handleExport}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#FFFFFF',
                backgroundColor: '#10B981',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Export to CSV
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#F3F4F6',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Total Records: <span style={{ color: '#3B82F6' }}>{totalRecords.toLocaleString()}</span>
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '13px',
                fontWeight: '500',
                color: '#6B7280'
              }}>
                Rows per page:
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                style={{
                  padding: '6px 10px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* AUDIT LOG TABLE */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6B7280'
          }}>
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6B7280',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            border: '1px solid #E5E7EB'
          }}>
            No audit logs found with current filters.
          </div>
        ) : (
          <>
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                overflowX: 'auto'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px'
                }}>
                  <thead style={{
                    backgroundColor: '#F9FAFB',
                    borderBottom: '2px solid #E5E7EB'
                  }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>ID</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Currency</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Line</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Period</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Action</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>GGR</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Deposit Amount</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Deposit Cases</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Active Member</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Changed By</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Changed At</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr key={log.id} style={{
                        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                        borderBottom: index < logs.length - 1 ? '1px solid #E5E7EB' : 'none'
                      }}>
                        <td style={{ padding: '12px 16px', color: '#6B7280' }}>{log.id}</td>
                        <td style={{ padding: '12px 16px', color: '#111827', fontWeight: '600' }}>{log.currency}</td>
                        <td style={{ padding: '12px 16px', color: '#111827', fontWeight: '500' }}>{log.line}</td>
                        <td style={{ padding: '12px 16px', color: '#6B7280', whiteSpace: 'nowrap' }}>{log.quarter} {log.year}</td>
                        <td style={{ padding: '12px 16px' }}>{getActionBadge(log.action)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {log.action === 'UPDATE' ? (
                            <div>
                              <div style={{ color: '#EF4444', textDecoration: 'line-through', fontSize: '11px' }}>
                                {formatCurrency(log.old_target_ggr, log.currency)}
                              </div>
                              <div style={{ color: '#10B981', fontWeight: '600', fontSize: '12px' }}>
                                {formatCurrency(log.new_target_ggr, log.currency)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#111827', fontWeight: '500' }}>
                              {formatCurrency(log.new_target_ggr, log.currency)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {log.action === 'UPDATE' ? (
                            <div>
                              <div style={{ color: '#EF4444', textDecoration: 'line-through', fontSize: '11px' }}>
                                {formatCurrency(log.old_target_deposit_amount, log.currency)}
                              </div>
                              <div style={{ color: '#10B981', fontWeight: '600', fontSize: '12px' }}>
                                {formatCurrency(log.new_target_deposit_amount, log.currency)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#111827', fontWeight: '500' }}>
                              {formatCurrency(log.new_target_deposit_amount, log.currency)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {log.action === 'UPDATE' ? (
                            <div>
                              <div style={{ color: '#EF4444', textDecoration: 'line-through', fontSize: '11px' }}>
                                {formatNumber(log.old_target_deposit_cases)}
                              </div>
                              <div style={{ color: '#10B981', fontWeight: '600', fontSize: '12px' }}>
                                {formatNumber(log.new_target_deposit_cases)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#111827', fontWeight: '500' }}>
                              {formatNumber(log.new_target_deposit_cases)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {log.action === 'UPDATE' ? (
                            <div>
                              <div style={{ color: '#EF4444', textDecoration: 'line-through', fontSize: '11px' }}>
                                {formatNumber(log.old_target_active_member)}
                              </div>
                              <div style={{ color: '#10B981', fontWeight: '600', fontSize: '12px' }}>
                                {formatNumber(log.new_target_active_member)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#111827', fontWeight: '500' }}>
                              {formatNumber(log.new_target_active_member)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div>
                            <div style={{ color: '#111827', fontWeight: '500', fontSize: '12px' }}>{log.changed_by}</div>
                            <div style={{ color: '#6B7280', fontSize: '11px' }}>{log.changed_by_role}</div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6B7280', whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {new Date(log.changed_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6B7280', maxWidth: '200px', fontSize: '11px' }}>
                          {log.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PAGINATION */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '20px',
              padding: '12px 16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB'
            }}>
              <span style={{
                fontSize: '13px',
                color: '#6B7280'
              }}>
                Page {currentPage} of {totalPages}
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: currentPage === 1 ? '#9CA3AF' : '#374151',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: currentPage === totalPages ? '#9CA3AF' : '#374151',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Frame>
    </Layout>
  )
}

