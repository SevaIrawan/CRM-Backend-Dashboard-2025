'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import SubHeader from '@/components/SubHeader'
import StatCard from '@/components/StatCard'
import { useRouter } from 'next/navigation'

interface ActivityLog {
  id: number
  user_id: string
  username: string
  email: string
  role: string
  activity_type: 'login' | 'logout' | 'page_view'
  ip_address: string
  user_agent: string
  device_type: string
  accessed_page: string
  page_title: string
  timestamp: string
  session_duration: number | null
  metadata: any
}

interface ActivityStats {
  period: string
  totalLogins: number
  activeUsersNow: number
  avgSessionDurationMinutes: number
  mostVisitedPages: Array<{ page: string; visits: number }>
  mostActiveUsers: Array<{ username: string; activities: number; role: string }>
  activityByRole: Array<{ role: string; activities: number }>
}

export default function ActivityLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [filters, setFilters] = useState({
    username: '',
    role: '',
    activityType: '',
    startDate: '',
    endDate: '',
    ipAddress: '',
    pageAccessed: ''
  })
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [rowsPerPage, setRowsPerPage] = useState(10)

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

  // Fetch activity logs
  const fetchLogs = async (page = 1) => {
    try {
      console.log('🔍 [ActivityLogs] Fetching logs, page:', page)
      setLoading(true)
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== ''))
      })

      console.log('📝 [ActivityLogs] Query params:', queryParams.toString())

      const response = await fetch(`/api/activity-logs/data?${queryParams}`)
      console.log('📊 [ActivityLogs] Response status:', response.status)
      
      const result = await response.json()
      console.log('📋 [ActivityLogs] Response data:', result)

      if (result.success) {
        console.log('✅ [ActivityLogs] Success - setting logs:', result.data)
        setLogs(result.data || [])
        setCurrentPage(result.pagination.currentPage)
        setTotalPages(result.pagination.totalPages)
        setTotalRecords(result.pagination.totalRecords)
      } else {
        console.error('❌ [ActivityLogs] Failed to fetch logs:', result.error)
      }
    } catch (error) {
      console.error('❌ [ActivityLogs] Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch activity stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      
      const response = await fetch(`/api/activity-logs/stats?period=${selectedPeriod}`)
      const result = await response.json()

      if (result.success) {
        setStats(result.stats)
      } else {
        console.error('Failed to fetch stats:', result.error)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  // Load data on mount and filter changes
  useEffect(() => {
    fetchLogs(1)
  }, [filters, rowsPerPage])

  // Auto-refresh logs every 30 seconds for realtime updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs(currentPage)
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [currentPage, filters, rowsPerPage])

  useEffect(() => {
    fetchStats()
  }, [selectedPeriod])

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  // Handle page changes
  const handlePageChange = (page: number) => {
    fetchLogs(page)
  }

  // Export logs
  const handleExport = async () => {
    try {
      const response = await fetch('/api/activity-logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `activity_logs_export_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // Format timestamp using Supabase timezone (UTC) with realtime updates
  const formatTimestamp = (timestamp: string) => {
    // Parse Supabase timestamp (already in UTC)
    const date = new Date(timestamp)
    
    // Convert to Asia/Jakarta timezone (GMT+7)
    return date.toLocaleString('en-GB', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  // Format session duration
  const formatSessionDuration = (duration: number | null) => {
    if (!duration) return '-'
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }

  // Get activity type color
  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'login': return '#10b981'
      case 'logout': return '#ef4444'
      case 'page_view': return '#3b82f6'
      default: return '#6b7280'
    }
  }

  // Get device type icon
  const getDeviceIcon = (device: string) => {
    switch (device?.toLowerCase()) {
      case 'mobile': return '📱'
      case 'tablet': return '📱'
      case 'desktop': return '💻'
      default: return '🖥️'
    }
  }

  // Create custom SubHeader with filters using standard project classes
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        {/* Title area - left side */}
            </div>
      
      <div className="subheader-controls">
        <div className="slicer-group">
          <label className="slicer-label">ROLES:</label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
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
                <option value="">All Roles</option>
                <option value="manager">Manager</option>
                <option value="manager_usc">Manager USC</option>
                <option value="manager_sgd">Manager SGD</option>
                <option value="sq_usc">SQ USC</option>
                <option value="sq_sgd">SQ SGD</option>
                <option value="usc_dep">USC Dep</option>
              </select>
        </div>

        <div className="slicer-group">
          <label className="slicer-label">ACTIVITY:</label>
              <select
                value={filters.activityType}
                onChange={(e) => handleFilterChange('activityType', e.target.value)}
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
                <option value="">All Activities</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="page_view">Page View</option>
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
    <Layout pageTitle="Activity Logs" customSubHeader={customSubHeader}>
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
            {statsLoading ? (
              <div className="loading-stats">Loading stats...</div>
            ) : stats ? (
              <>
                <StatCard
                  title="TOTAL LOGINS"
                  value={stats.totalLogins}
                  icon="Total Logins"
                />
                <StatCard
                  title="ACTIVE USERS"
                  value={stats.activeUsersNow}
                  icon="Active Users"
                />
                <StatCard
                  title="AVG SESSION"
                  value={`${stats.avgSessionDurationMinutes}m`}
                  icon="Avg Session"
                />
                <StatCard
                  title="MOST VISITED"
                  value={stats.mostVisitedPages[0]?.page || 'N/A'}
                  icon="Most Visited"
                />
              </>
            ) : (
              <div className="error-stats">Failed to load stats</div>
            )}
        </div>

        {/* Activity Logs Table */}
          <div className="simple-table-container">
          {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>Loading activity logs...</span>
              </div>
          ) : logs.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <span>No activity logs found</span>
            </div>
          ) : (
              <div className="simple-table-wrapper" style={{ padding: '0 20px' }}>
                <table className="simple-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Activity</th>
                      <th>Page</th>
                      <th>Device</th>
                      <th>IP Address</th>
                      <th>Session</th>
                    </tr>
                  </thead>
                <tbody>
                  {logs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatTimestamp(log.timestamp)}</td>
                        <td>
                          <div className="user-info">
                            <div className="username">{log.username}</div>
                            <div className="user-role">{log.role}</div>
                        </div>
                      </td>
                        <td>
                          <span className={`activity-badge activity-${log.activity_type}`}>
                          {log.activity_type.toUpperCase()}
                        </span>
                      </td>
                        <td>
                          <div className="page-info">
                            <div className="page-title">{log.page_title || log.accessed_page}</div>
                            <div className="page-path">{log.accessed_page}</div>
                        </div>
                      </td>
                        <td className="device-cell">
                          <span className="device-icon">{getDeviceIcon(log.device_type)}</span>
                          <div className="device-type">{log.device_type}</div>
                      </td>
                        <td className="ip-address">{log.ip_address}</td>
                        <td className="session-cell">{formatSessionDuration(log.session_duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    <option value={25}>25</option>
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
            <p>Showing data for: {filters.role || 'All Roles'} | {filters.activityType || 'All Activities'} | Date: {filters.startDate || 'All Time'} to {filters.endDate || 'Now'}</p>
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

        .loading-stats {
          text-align: center;
          padding: 20px;
          color: #6b7280;
        }

        .error-stats {
          text-align: center;
          color: #ef4444;
          font-weight: 500;
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
          min-height: 0; /* Important for flex child */
          padding-top: 12px; /* Top padding like Page Status */
        }

        /* Table Wrapper - Scroll hanya di dalam table */
        .simple-table-wrapper {
          flex: 1;
          overflow-y: auto;
          min-height: 0; /* Important for flex child */
        }

        /* Table Footer - Fixed di bawah, tidak ikut scroll */
        .table-footer {
          flex-shrink: 0; /* Tidak menyusut */
          margin-top: auto; /* Push ke bawah */
        }

        /* Table Content Styles */
        .user-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .username {
          font-weight: 500;
          color: #1f2937;
        }

        .user-role {
          font-size: 12px;
          color: #6b7280;
        }

        .activity-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .activity-login {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .activity-logout {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .activity-page_view {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        .page-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .page-title {
          font-weight: 500;
          color: #1f2937;
        }

        .page-path {
          font-size: 12px;
          color: #6b7280;
        }

        .device-cell {
          text-align: center;
        }

        .device-icon {
          font-size: 18px;
          display: block;
        }

        .device-type {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }

        .ip-address {
          font-family: monospace;
          font-size: 12px;
        }

        .session-cell {
          text-align: center;
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

        .slicer-info {
          background: #f3f4f6;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          text-align: center;
          margin-top: 20px;
        }

        .slicer-info p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

      `}</style>
    </Layout>
  )
}
