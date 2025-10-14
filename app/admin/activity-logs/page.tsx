'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
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
        limit: '100',
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
  }, [filters])

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

  // Format timestamp in GMT+7
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const gmt7Time = new Date(date.getTime() + (7 * 60 * 60 * 1000))
    return gmt7Time.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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

  return (
    <Layout pageTitle="Activity Logs">
      <div style={{ padding: '20px' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <Frame>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <select 
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white'
                }}
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
              
              {statsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Loading stats...</div>
              ) : stats ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                  <div><strong>Total Logins:</strong> {stats.totalLogins}</div>
                  <div><strong>Active Users:</strong> {stats.activeUsersNow}</div>
                  <div><strong>Avg Session:</strong> {stats.avgSessionDurationMinutes}m</div>
                  <div><strong>Most Visited:</strong> {stats.mostVisitedPages[0]?.page || 'N/A'}</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#ef4444' }}>Failed to load stats</div>
              )}
            </div>
          </Frame>

          <Frame>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="Username"
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
                }}
              />
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
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
              <select
                value={filters.activityType}
                onChange={(e) => handleFilterChange('activityType', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
                }}
              >
                <option value="">All Activities</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="page_view">Page View</option>
              </select>
            </div>
          </Frame>

          <Frame>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
                }}
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={() => setFilters({ username: '', role: '', activityType: '', startDate: '', endDate: '', ipAddress: '', pageAccessed: '' })}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f3f4f6',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear Filters
              </button>
            </div>
          </Frame>

          <Frame>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleExport}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                📥 Export to CSV
              </button>
              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                Total Records: {totalRecords.toLocaleString()}
              </div>
            </div>
          </Frame>
        </div>

        {/* Activity Logs Table */}
        <Frame>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading activity logs...</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No activity logs found
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Timestamp</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>User</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Activity</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Page</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Device</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>IP Address</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Session</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{formatTimestamp(log.timestamp)}</td>
                      <td style={{ padding: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '500' }}>{log.username}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{log.role}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: getActivityTypeColor(log.activity_type) + '20',
                          color: getActivityTypeColor(log.activity_type),
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {log.activity_type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '500' }}>{log.page_title || log.accessed_page}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{log.accessed_page}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '18px' }}>{getDeviceIcon(log.device_type)}</span>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{log.device_type}</div>
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>
                        {log.ip_address}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {formatSessionDuration(log.session_duration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '20px',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Showing {((currentPage - 1) * 100) + 1} to {Math.min(currentPage * 100, totalRecords)} of {totalRecords.toLocaleString()} records
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        backgroundColor: currentPage === 1 ? '#f9fafb' : 'white',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ 
                      padding: '8px 16px', 
                      fontSize: '14px',
                      color: '#374151'
                    }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        backgroundColor: currentPage === totalPages ? '#f9fafb' : 'white',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Frame>
      </div>
    </Layout>
  )
}
