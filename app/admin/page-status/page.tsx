'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StatCard from '@/components/StatCard'
import { 
  hasPermission, 
  canAccessUserManagement, 
  getAvailableRoles 
} from '@/utils/rolePermissions'

// Types
interface PageVisibilityData {
  id: string
  page_path: string
  page_name: string
  page_section: string
  visible_for_roles: string[]
  status: 'running' | 'building'
  created_at: string
  updated_at: string
}

interface ApiResponse {
  success: boolean
  data: PageVisibilityData[]
  count: number
  total: number
  filters: {
    section: string
    status: string
  }
  error?: string
}

// Session utility functions (copied from users page)
const validateSession = () => {
  try {
    const session = localStorage.getItem('nexmax_session')
    if (!session) return null
    
    const sessionData = JSON.parse(session)
    return sessionData
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

export default function PageStatusPage() {
  const [pages, setPages] = useState<PageVisibilityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterSection, setFilterSection] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [user, setUser] = useState<any>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPageData, setNewPageData] = useState({
    page_path: '',
    page_name: '',
    page_section: 'Admin'
  })
  const [isAddingPage, setIsAddingPage] = useState(false)
  const router = useRouter()

  // Stats state
  const [stats, setStats] = useState({
    totalPages: 0,
    runningPages: 0,
    buildingPages: 0,
    adminPages: 0
  })

  // Available roles for toggling
  const availableRoles = getAvailableRoles()

  useEffect(() => {
    // Check authentication
    const sessionData = validateSession()
    if (!sessionData) {
      router.push('/login')
      return
    }

    // Check admin access
    if (!canAccessUserManagement(sessionData.role)) {
      console.log('❌ Access denied: User does not have admin access')
      router.push('/dashboard')
      return
    }

    setUser(sessionData)
    
    // Check dark mode preference
    const isDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }

    // Fetch page visibility data
    fetchPageVisibility()
  }, [router])

  const fetchPageVisibility = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching page visibility data...')
      
      // Build query parameters
      const params = new URLSearchParams()
      if (filterSection !== 'all') params.append('section', filterSection)
      if (filterStatus !== 'all') params.append('status', filterStatus)
      
      const url = `/api/page-visibility?${params.toString()}`
      console.log('📡 API URL:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result: ApiResponse = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch page visibility data')
      }
      
      console.log('✅ Page visibility data loaded:', result.count, 'pages')
      setPages(result.data || [])
      
      // Calculate stats
      const data = result.data || []
      const totalPages = data.length
      const runningPages = data.filter(p => p.status === 'running').length
      const buildingPages = data.filter(p => p.status === 'building').length
      const adminPages = data.filter(p => p.page_section === 'Admin').length
      
      setStats({
        totalPages,
        runningPages,
        buildingPages,
        adminPages
      })
      
    } catch (error) {
      console.error('❌ Error fetching page visibility:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  // Refetch when filters change
  useEffect(() => {
    if (user) {
      fetchPageVisibility()
    }
  }, [filterSection, filterStatus])

  const handleToggleAccess = async (pagePath: string, role: string, currentRoles: string[]) => {
    try {
      const hasAccess = currentRoles.includes(role)
      const action = hasAccess ? 'revoke' : 'grant'
      
      console.log(`🔄 Toggling ${role} access for ${pagePath}: ${action}`)
      
      const response = await fetch('/api/page-visibility/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page_path: pagePath,
          role: role,
          action: action
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle access')
      }
      
      console.log('✅ Toggle successful:', result.message)
      
      // Refresh data
      await fetchPageVisibility()
      
    } catch (error) {
      console.error('❌ Toggle error:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleAddNewPage = async () => {
    // Validation
    if (!newPageData.page_path || !newPageData.page_name) {
      alert('Please fill in all required fields')
      return
    }

    // Confirmation dialog for safety
    const confirmMessage = `Are you sure you want to add this new page?\n\nPath: ${newPageData.page_path}\nName: ${newPageData.page_name}\nSection: ${newPageData.page_section}\n\nThis page will start with "Building" status (admin only).`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setIsAddingPage(true)
      
      const response = await fetch('/api/page-visibility/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPageData)
      })

      const result = await response.json()

      if (result.success) {
        // Reset form
        setNewPageData({
          page_path: '',
          page_name: '',
          page_section: 'Admin'
        })
        setShowAddForm(false)
        
        // Refresh data
        await fetchPageVisibility()
        
        alert('✅ Page added successfully!\n\nStatus: Building (admin only)\nYou can now manage access permissions.')
      } else {
        alert(`❌ Failed to add page: ${result.error}`)
      }
    } catch (error) {
      console.error('Error adding page:', error)
      alert('❌ Error adding page')
    } finally {
      setIsAddingPage(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('nexmax_session')
    document.cookie = 'user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'username=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'user_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.push('/login')
  }

  const handleToggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Filter pages based on search term
  const filteredPages = pages.filter(page => 
    page.page_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.page_path.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user) {
    return null
  }

  // Create custom SubHeader with filters using standard project classes
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        {/* Title area - left side */}
          </div>

      <div className="subheader-controls">
        <div className="slicer-group">
          <label className="slicer-label">SECTION:</label>
              <select 
                value={filterSection} 
                onChange={(e) => setFilterSection(e.target.value)}
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
                <option value="all">All Sections</option>
            <option value="MYR">MYR</option>
            <option value="SGD">SGD</option>
            <option value="USC">USC</option>
            <option value="Admin">Admin</option>
            <option value="Other">Other</option>
              </select>
            </div>

        <div className="slicer-group">
          <label className="slicer-label">STATUS:</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
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
                <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="building">Building</option>
              </select>
            </div>

        <div className="slicer-group">
          <label className="slicer-label">SEARCH:</label>
              <input
                type="text"
                placeholder="Search pages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: 'white',
              fontSize: '14px',
              color: '#374151',
              outline: 'none',
              transition: 'all 0.2s ease',
              minWidth: '150px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
              />
            </div>

          </div>
    </div>
  )

  return (
    <Layout 
      pageTitle="Page Status Management" 
      customSubHeader={customSubHeader}
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={handleToggleDarkMode}
      onLogout={handleLogout}
    >
      <Frame variant="standard">
        {/* Content Container with proper spacing - NO SCROLL */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '12px',
          height: 'calc(100vh - 200px)',
          overflow: 'hidden'
        }}>
          {/* ROW 1: KPI CARDS (4 cards in 1 horizontal row) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <StatCard
              title="TOTAL PAGES"
              value={stats.totalPages}
              icon="Total Pages"
            />
            <StatCard
              title="RUNNING PAGES"
              value={stats.runningPages}
              icon="Running Pages"
            />
            <StatCard
              title="BUILDING PAGES"
              value={stats.buildingPages}
              icon="Building Pages"
            />
            <StatCard
              title="ADMIN PAGES"
              value={stats.adminPages}
              icon="Admin Pages"
            />
          </div>

          {/* Main Content - Table Container */}
          <div style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>

          {/* Error Display */}
          {error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span>{error}</span>
              <button 
                onClick={fetchPageVisibility}
                  style={{
                    marginLeft: 'auto',
                    padding: '4px 8px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Pages Table */}
          <div className="simple-table-container">
            {/* Table Header with Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Page Visibility Management
              </h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowAddForm(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  ➕ Add Page
                </button>
                <button 
                  onClick={fetchPageVisibility}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? '🔄' : '🔄'} Refresh
                </button>
              </div>
            </div>
            <div className="simple-table-wrapper" style={{ padding: '0 20px' }}>
            {loading ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    color: '#6b7280'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      border: '2px solid #e5e7eb',
                      borderTop: '2px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '16px'
                    }}></div>
                <span>Loading page visibility data...</span>
              </div>
            ) : filteredPages.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                    <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No pages found</div>
                    {searchTerm && <div style={{ fontSize: '14px' }}>Try adjusting your search or filters</div>}
              </div>
            ) : (
                  <table className="simple-table">
                    <thead>
                    <tr>
                      <th>Page Name</th>
                      <th>Path</th>
                      <th>Section</th>
                      <th>Status</th>
                      <th>Access Control</th>
                    </tr>
                  </thead>
                <tbody>
                  {filteredPages.map((page) => (
                    <tr key={page.id}>
                          <td style={{ fontFamily: 'monospace' }}>{page.page_name}</td>
                          <td style={{ fontFamily: 'monospace' }}>{page.page_path}</td>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: '#e5e7eb',
                              color: '#374151'
                            }}>
                          {page.page_section}
                        </span>
                      </td>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              backgroundColor: page.status === 'running' ? '#d1fae5' : '#fef3c7',
                              color: page.status === 'running' ? '#065f46' : '#92400e'
                            }}>
                              {page.status}
                        </span>
                      </td>
                          <td>
                            <div style={{ 
                              display: 'flex', 
                              flexWrap: 'wrap', 
                              gap: '8px',
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}>
                              {availableRoles.map((role) => (
                              <button
                                key={role}
                                onClick={() => handleToggleAccess(page.page_path, role, page.visible_for_roles)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    background: page.visible_for_roles.includes(role) ? '#dbeafe' : 'white',
                                    color: page.visible_for_roles.includes(role) ? '#1d4ed8' : '#374151',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (page.visible_for_roles.includes(role)) {
                                      e.currentTarget.style.background = '#bfdbfe'
                                    } else {
                                      e.currentTarget.style.background = '#f3f4f6'
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = page.visible_for_roles.includes(role) ? '#dbeafe' : 'white'
                                  }}
                                >
                                  <span>{page.visible_for_roles.includes(role) ? '✓' : '○'}</span>
                                  {role}
                              </button>
                              ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              )}
            </div>
            
            {/* Table Footer */}
            <div className="table-footer" style={{ padding: '0 20px' }}>
              <div className="records-info">Total: {filteredPages.length} pages</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Per Page:</span>
                  <select
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
          </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" disabled={true}>Previous</button>
                  <span className="pagination-info">1 of 1</span>
                  <button className="pagination-btn" disabled={true}>Next</button>
        </div>
      </div>
            </div>
          </div>
        </div>

      {/* Slicer Info */}
      <div className="slicer-info">
        <p>Showing data for: {filterSection || 'All Sections'} | {filterStatus || 'All Status'} | {searchTerm ? `Search: "${searchTerm}"` : 'All Pages'}</p>
      </div>
      </div>
  </Frame>

      {/* Add New Page Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Page</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowAddForm(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="page_path">Page Path *</label>
                <input
                  id="page_path"
                  type="text"
                  value={newPageData.page_path}
                  onChange={(e) => setNewPageData({ ...newPageData, page_path: e.target.value })}
                  placeholder="e.g., /myr/new-page"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="page_name">Page Name *</label>
                <input
                  id="page_name"
                  type="text"
                  value={newPageData.page_name}
                  onChange={(e) => setNewPageData({ ...newPageData, page_name: e.target.value })}
                  placeholder="e.g., New Page"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="page_section">Section</label>
                <select
                  id="page_section"
                  value={newPageData.page_section}
                  onChange={(e) => setNewPageData({ ...newPageData, page_section: e.target.value })}
                  className="form-select"
                >
                  <option value="MYR">MYR</option>
                  <option value="SGD">SGD</option>
                  <option value="USC">USC</option>
                  <option value="Admin">Admin</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-add" 
                onClick={handleAddNewPage}
                disabled={isAddingPage || !newPageData.page_path || !newPageData.page_name}
              >
                {isAddingPage ? 'Adding...' : 'Add Page'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 24px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          color: #374151;
        }

        .modal-body {
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .form-input, .form-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-cancel {
          padding: 8px 16px;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel:hover {
          background: #4b5563;
        }

        .btn-add {
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-add:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-add:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Table styling like Activity Logs */
        .simple-table tbody tr {
          height: 40px;
        }

        .simple-table td {
          padding: 8px 12px;
          vertical-align: middle;
          font-size: 14px;
        }

        .simple-table th {
          padding: 10px 12px;
          height: 40px;
          font-size: 14px;
        }

        /* Limit table height to show exactly 10 rows + header */
        .simple-table-wrapper {
          max-height: calc(40px * 10 + 40px); /* 10 rows + header */
          overflow-y: auto;
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
