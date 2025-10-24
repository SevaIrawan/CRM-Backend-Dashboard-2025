'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StatCard from '@/components/StatCard'
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
  
  // Stats state
  const [stats, setStats] = useState({
    totalRecords: 0,
    createActions: 0,
    updateActions: 0,
    deleteActions: 0
  })

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
        
        // Calculate stats
        const allLogs = data.logs || []
        const createActions = allLogs.filter((log: any) => log.action === 'CREATE').length
        const updateActions = allLogs.filter((log: any) => log.action === 'UPDATE').length
        const deleteActions = allLogs.filter((log: any) => log.action === 'DELETE').length
        
        setStats({
          totalRecords: data.totalRecords || 0,
          createActions,
          updateActions,
          deleteActions
        })
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

  // Create custom SubHeader with filters using standard project classes
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        {/* Title area - left side */}
      </div>
      
      <div className="subheader-controls">
        <div className="slicer-group">
          <label className="slicer-label">CURRENCY:</label>
          <select
            value={filters.currency}
            onChange={(e) => handleFilterChange('currency', e.target.value)}
            className="subheader-select"
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '120px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <option value="">All</option>
            <option value="MYR">MYR</option>
            <option value="SGD">SGD</option>
            <option value="USC">USC</option>
          </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">ACTION:</label>
          <select
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="subheader-select"
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#374151',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '120px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <option value="">All</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">DATE RANGE:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: 'white',
                fontSize: '14px',
                color: '#374151',
                outline: 'none',
                transition: 'all 0.2s ease',
                minWidth: '140px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            />
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: 'white',
                fontSize: '14px',
                color: '#374151',
                outline: 'none',
                transition: 'all 0.2s ease',
                minWidth: '140px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Layout pageTitle="Target Audit Log" customSubHeader={customSubHeader}>
      <Frame variant="standard">
        {/* Content Container with proper spacing - NO SCROLL */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          marginTop: '18px',
          height: 'calc(100vh - 200px)',
          overflow: 'hidden'
        }}>
          {/* ROW 1: KPI CARDS (4 cards in 1 horizontal row) */}
          <div className="kpi-row">
            <StatCard
              title="TOTAL RECORDS"
              value={stats.totalRecords}
              icon="Total Records"
            />
            <StatCard
              title="CREATE ACTIONS"
              value={stats.createActions}
              icon="Create Actions"
            />
            <StatCard
              title="UPDATE ACTIONS"
              value={stats.updateActions}
              icon="Update Actions"
            />
            <StatCard
              title="DELETE ACTIONS"
              value={stats.deleteActions}
              icon="Delete Actions"
            />
          </div>

        {/* Audit Log Table */}
        <div className="simple-table-container">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading audit logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <span>No audit logs found with current filters.</span>
            </div>
          ) : (
            <div className="simple-table-wrapper" style={{ padding: '0 20px', paddingBottom: '12px' }}>
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'white'
              }}>
                <table className="simple-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Currency</th>
                    <th>Line</th>
                    <th>Period</th>
                    <th>Action</th>
                    <th>GGR</th>
                    <th>Deposit Amount</th>
                    <th>Deposit Cases</th>
                    <th>Active Member</th>
                    <th>Changed By</th>
                    <th>Changed At</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td style={{ fontWeight: '600' }}>{log.currency}</td>
                      <td style={{ fontWeight: '500' }}>{log.line}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{log.quarter} {log.year}</td>
                      <td>{getActionBadge(log.action)}</td>
                      <td>
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
                          <span style={{ fontWeight: '500' }}>
                            {formatCurrency(log.new_target_ggr, log.currency)}
                          </span>
                        )}
                      </td>
                      <td>
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
                          <span style={{ fontWeight: '500' }}>
                            {formatCurrency(log.new_target_deposit_amount, log.currency)}
                          </span>
                        )}
                      </td>
                      <td>
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
                          <span style={{ fontWeight: '500' }}>
                            {formatNumber(log.new_target_deposit_cases)}
                          </span>
                        )}
                      </td>
                      <td>
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
                          <span style={{ fontWeight: '500' }}>
                            {formatNumber(log.new_target_active_member)}
                          </span>
                        )}
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '12px' }}>{log.changed_by}</div>
                          <div className="user-role">{log.changed_by_role}</div>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {new Date(log.changed_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td style={{ maxWidth: '200px', fontSize: '11px' }}>
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table Footer - Records Info + Pagination + Export */}
          <div className="table-footer" style={{ padding: '0 20px' }}>
            <div className="records-info">
              Showing {logs.length} of {totalRecords.toLocaleString()} records
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px', color: '#6b7280' }}>Per Page:</label>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    ← Prev
                  </button>
                  <span className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next →
                  </button>
                </div>
              )}

              <button 
                onClick={handleExport}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                title="Export to CSV"
              >
                📥 Export
              </button>
            </div>
          </div>
        </div>

        {/* Slicer Info */}
        <div className="slicer-info">
          <p>Showing data for: {filters.currency || 'All Currency'} | {filters.action || 'All Actions'} | Date: {filters.startDate || 'All Time'} to {filters.endDate || 'Now'}</p>
        </div>
      </div>
      </Frame>

      <style jsx>{`
        /* Ensure 4 StatCards in 1 horizontal row */
        .kpi-row {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 18px !important;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        /* Table Container - Fit dalam 1 frame */
        .simple-table-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        /* Table Wrapper - Scroll hanya di dalam table */
        .simple-table-wrapper {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        /* Table Footer - Fixed di bawah, tidak ikut scroll */
        .table-footer {
          flex-shrink: 0;
          margin-top: auto;
        }

        .user-role {
          font-size: 12px;
          color: #6b7280;
        }

        /* Pagination Button Styles */
        .pagination-btn {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .pagination-btn:disabled {
          background: #f9fafb;
          color: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .pagination-info {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
          padding: 0 8px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Global Table Styles - CRITICAL for full width and proper display */
        :global(.simple-table) {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
        }

        :global(.simple-table thead) {
          position: sticky;
          top: 0;
          background-color: #f9fafb;
          z-index: 10;
        }

        :global(.simple-table th) {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          font-size: 13px;
          border-bottom: 2px solid #e5e7eb;
          white-space: nowrap;
        }

        :global(.simple-table tbody tr) {
          border-bottom: 1px solid #e5e7eb;
        }

        :global(.simple-table tbody tr:hover) {
          background-color: #f9fafb;
        }

        :global(.simple-table td) {
          padding: 12px 16px;
          color: #374151;
          font-size: 13px;
          vertical-align: middle;
        }

        :global(.simple-table tbody tr:last-child) {
          border-bottom: none;
        }
      `}</style>
    </Layout>
  )
}

