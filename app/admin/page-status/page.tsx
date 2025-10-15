'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
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
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Toggle operation failed')
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

  // Get statistics
  const stats = {
    total: pages.length,
    running: pages.filter(p => p.status === 'running').length,
    building: pages.filter(p => p.status === 'building').length,
    bySection: {
      MYR: pages.filter(p => p.page_section === 'MYR').length,
      SGD: pages.filter(p => p.page_section === 'SGD').length,
      USC: pages.filter(p => p.page_section === 'USC').length,
      Admin: pages.filter(p => p.page_section === 'Admin').length,
      Other: pages.filter(p => p.page_section === 'Other').length
    }
  }

  if (!user) {
    return null
  }

  return (
    <Layout
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={handleToggleDarkMode}
      onLogout={handleLogout}
    >
      <div className="page-status-container">
        <div className="page-status-frame">
          {/* Header */}
          <div className="frame-header">
            <h2 className="frame-title">Page Status Management</h2>
            <div className="header-actions">
              <button 
                onClick={() => setShowAddForm(true)}
                className="add-page-btn"
                title="Add New Page"
              >
                ➕ Add Page
              </button>
              <button 
                onClick={fetchPageVisibility}
                className="refresh-btn"
                disabled={loading}
              >
                {loading ? '🔄' : '🔄'} Refresh
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Pages</div>
            </div>
            <div className="stat-card running">
              <div className="stat-number">{stats.running}</div>
              <div className="stat-label">Running</div>
            </div>
            <div className="stat-card building">
              <div className="stat-number">{stats.building}</div>
              <div className="stat-label">Building</div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="filter-group">
              <label>Section:</label>
              <select 
                value={filterSection} 
                onChange={(e) => setFilterSection(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Sections</option>
                <option value="MYR">MYR ({stats.bySection.MYR})</option>
                <option value="SGD">SGD ({stats.bySection.SGD})</option>
                <option value="USC">USC ({stats.bySection.USC})</option>
                <option value="Admin">Admin ({stats.bySection.Admin})</option>
                <option value="Other">Other ({stats.bySection.Other})</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="running">Running ({stats.running})</option>
                <option value="building">Building ({stats.building})</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Search:</label>
              <input
                type="text"
                placeholder="Search pages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{error}</span>
              <button 
                onClick={fetchPageVisibility}
                className="retry-btn"
              >
                Retry
              </button>
            </div>
          )}

          {/* Pages Table */}
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>Loading page visibility data...</span>
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📄</span>
                <span>No pages found</span>
                {searchTerm && <span className="empty-hint">Try adjusting your search or filters</span>}
              </div>
            ) : (
              <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)', padding: '0 16px 16px 16px' }}>
                <table className="w-full" style={{
                  borderCollapse: 'collapse',
                  border: '1px solid #e0e0e0'
                }}>
                  <thead className="sticky top-0" style={{ zIndex: 10, position: 'sticky', top: 0, pointerEvents: 'none' }}>
                    <tr>
                      <th style={{ 
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        backgroundColor: '#374151',
                        color: 'white',
                        pointerEvents: 'none'
                      }}>Page</th>
                      <th style={{ 
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        backgroundColor: '#374151',
                        color: 'white',
                        pointerEvents: 'none'
                      }}>Section</th>
                      <th style={{ 
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        backgroundColor: '#374151',
                        color: 'white',
                        pointerEvents: 'none'
                      }}>Status</th>
                      <th style={{ 
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        backgroundColor: '#374151',
                        color: 'white',
                        pointerEvents: 'none'
                      }}>Accessible By</th>
                      <th style={{ 
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontWeight: '600',
                        border: '1px solid #e0e0e0',
                        borderBottom: '2px solid #d0d0d0',
                        backgroundColor: '#374151',
                        color: 'white',
                        pointerEvents: 'none'
                      }}>Actions</th>
                    </tr>
                  </thead>
                <tbody>
                  {filteredPages.map((page) => (
                    <tr key={page.id}>
                      <td style={{ border: '1px solid #e0e0e0', padding: '12px 20px' }}>
                        <div className="page-info">
                          <div className="page-name">{page.page_name}</div>
                          <div className="page-path">{page.page_path}</div>
                        </div>
                      </td>
                      <td style={{ border: '1px solid #e0e0e0', textAlign: 'center', padding: '12px 20px' }}>
                        <span className={`section-badge section-${page.page_section.toLowerCase()}`}>
                          {page.page_section}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #e0e0e0', textAlign: 'center', padding: '12px 20px' }}>
                        <span className={`status-badge status-${page.status}`}>
                          {page.status === 'running' ? '🟢 Running' : '🟡 Building'}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #e0e0e0', padding: '12px 20px' }}>
                        <div className="roles-list">
                          {page.visible_for_roles.map(role => (
                            <span key={role} className="role-tag">
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ border: '1px solid #e0e0e0', padding: '12px 20px' }}>
                        <div className="toggle-actions">
                          {availableRoles.filter(role => role !== 'admin').map(role => {
                            const hasAccess = page.visible_for_roles.includes(role)
                            return (
                              <button
                                key={role}
                                onClick={() => handleToggleAccess(page.page_path, role, page.visible_for_roles)}
                                className={`toggle-btn ${hasAccess ? 'granted' : 'denied'}`}
                                title={`${hasAccess ? 'Revoke' : 'Grant'} access for ${role}`}
                              >
                                {hasAccess ? '✅' : '❌'} {role}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-status-container {
          padding: 24px;
          height: calc(100vh - 90px);
          overflow-y: auto;
          overflow-x: hidden;
        }

        .page-status-frame {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .frame-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .frame-title {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .refresh-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }

        .refresh-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          padding: 24px 32px;
          background: #f8fafc;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .stat-card.running {
          border-left: 4px solid #10b981;
        }

        .stat-card.building {
          border-left: 4px solid #f59e0b;
        }

        .stat-number {
          font-size: 32px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .filters-section {
          display: flex;
          gap: 20px;
          padding: 20px 32px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filter-group label {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-select,
        .search-input {
          padding: 8px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: white;
          min-width: 150px;
        }

        .filter-select:focus,
        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-input {
          min-width: 200px;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 32px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-weight: 500;
        }

        .retry-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }

        .table-wrapper {
          flex: 1;
          background: white;
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

        .empty-hint {
          font-size: 14px;
          margin-top: 8px;
          color: #9ca3af;
        }

        .pages-table td {
          padding: 8px 12px;
          border: 1px solid #e0e0e0 !important;
          border-right: 1px solid #e0e0e0 !important;
          color: #374151;
          vertical-align: top;
        }

        .pages-table tr:hover {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .page-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .page-name {
          font-weight: 600;
          color: #1f2937;
        }

        .page-path {
          font-size: 12px;
          color: #6b7280;
          font-family: monospace;
        }

        .section-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .section-myr {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .section-sgd {
          background: #dcfce7;
          color: #166534;
        }

        .section-usc {
          background: #fef3c7;
          color: #d97706;
        }

        .section-admin {
          background: #fee2e2;
          color: #dc2626;
        }

        .section-other {
          background: #f3f4f6;
          color: #374151;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-running {
          background: #dcfce7;
          color: #166534;
        }

        .status-building {
          background: #fef3c7;
          color: #d97706;
        }

        .roles-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .role-tag {
          padding: 2px 6px;
          background: #e5e7eb;
          color: #374151;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }

        .toggle-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .toggle-btn {
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toggle-btn.granted {
          background: #dcfce7;
          color: #166534;
        }

        .toggle-btn.denied {
          background: #fee2e2;
          color: #dc2626;
        }

        .toggle-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .page-status-container {
            padding: 16px;
          }
          
          .frame-header {
            padding: 16px 20px;
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
            padding: 16px 20px;
          }
          
          .filters-section {
            flex-direction: column;
            align-items: stretch;
            padding: 16px 20px;
          }
          
          .filter-select,
          .search-input {
            min-width: auto;
            width: 100%;
          }
          
          .pages-table {
            font-size: 12px;
          }
          
          .pages-table th,
          .pages-table td {
            padding: 12px 8px;
          }
          
          .toggle-actions {
            flex-direction: column;
            gap: 2px;
          }
        }

        /* Modal Styles */
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
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #6b7280;
          padding: 4px;
        }

        .modal-close:hover {
          color: #374151;
        }

        .modal-body {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #374151;
        }

        .form-input, .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-hint {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: #6b7280;
        }

        .safety-notice {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 16px;
          margin-top: 20px;
        }

        .safety-notice h4 {
          margin: 0 0 8px 0;
          color: #92400e;
          font-size: 14px;
        }

        .safety-notice p {
          margin: 0;
          color: #92400e;
          font-size: 13px;
          line-height: 1.4;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-cancel {
          padding: 10px 20px;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .btn-cancel:hover {
          background: #f9fafb;
        }

        .btn-add {
          padding: 10px 20px;
          border: none;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .btn-add:hover:not(:disabled) {
          opacity: 0.9;
        }

        .btn-add:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .add-page-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
          margin-right: 8px;
        }

        .add-page-btn:hover {
          opacity: 0.9;
        }
      `}</style>

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
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="page_path">Page Path *</label>
                <input
                  id="page_path"
                  type="text"
                  value={newPageData.page_path}
                  onChange={(e) => setNewPageData({...newPageData, page_path: e.target.value})}
                  placeholder="/new-page-path"
                  className="form-input"
                />
                <small className="form-hint">Must start with "/" (e.g., /admin/new-feature)</small>
              </div>

              <div className="form-group">
                <label htmlFor="page_name">Page Name *</label>
                <input
                  id="page_name"
                  type="text"
                  value={newPageData.page_name}
                  onChange={(e) => setNewPageData({...newPageData, page_name: e.target.value})}
                  placeholder="New Feature Name"
                  className="form-input"
                />
                <small className="form-hint">Display name for the page</small>
              </div>

              <div className="form-group">
                <label htmlFor="page_section">Section</label>
                <select
                  id="page_section"
                  value={newPageData.page_section}
                  onChange={(e) => setNewPageData({...newPageData, page_section: e.target.value})}
                  className="form-select"
                >
                  <option value="Admin">Admin</option>
                  <option value="MYR">MYR</option>
                  <option value="SGD">SGD</option>
                  <option value="USC">USC</option>
                  <option value="Other">Other</option>
                </select>
                <small className="form-hint">Section/category for this page</small>
              </div>

              <div className="safety-notice">
                <h4>🛡️ Safety Notice</h4>
                <p>New pages will be created with <strong>"Building"</strong> status, meaning only admin users can access them initially. You can manage access permissions after creation.</p>
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
    </Layout>
  )
}
