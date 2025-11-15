'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import Frame from '@/components/Frame'
import StatCard from '@/components/StatCard'
import { canAccessUserManagement } from '@/utils/rolePermissions'

// Types
interface MaintenanceConfig {
  id?: string
  is_maintenance_mode: boolean
  maintenance_message: string
  maintenance_message_id: string
  countdown_enabled: boolean
  countdown_datetime: string | null
  background_image_url: string | null
  background_color: string
  text_color: string
  show_logo: boolean
  logo_url: string | null
  custom_html: string | null
  updated_at?: string
  updated_by?: string
}

// Session utility functions
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

export default function MaintenancePage() {
  const [config, setConfig] = useState<MaintenanceConfig>({
    is_maintenance_mode: false,
    maintenance_message: 'We are currently performing maintenance. Please check back soon.',
    maintenance_message_id: 'Kami sedang melakukan pemeliharaan. Silakan kembali lagi nanti.',
    countdown_enabled: false,
    countdown_datetime: null,
    background_image_url: null,
    background_color: '#1a1a1a',
    text_color: '#ffffff',
    show_logo: true,
    logo_url: null,
    custom_html: null
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const router = useRouter()

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

    // Fetch maintenance config
    fetchMaintenanceConfig()
  }, [router])

  const fetchMaintenanceConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching maintenance config...')
      
      const response = await fetch('/api/maintenance/status')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch maintenance config')
      }
      
      console.log('✅ Maintenance config loaded:', result.data)
      setConfig(result.data)
      
    } catch (error) {
      console.error('❌ Error fetching maintenance config:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMaintenanceMode = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const newMode = !config.is_maintenance_mode
      console.log(`🔄 Toggling maintenance mode: ${newMode ? 'ON' : 'OFF'}`)
      
      const response = await fetch('/api/maintenance/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_maintenance_mode: newMode,
          user_id: user?.id || null
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle maintenance mode')
      }
      
      console.log('✅ Maintenance mode toggled:', result.message)
      
      // Update local state
      setConfig(prev => ({
        ...prev,
        is_maintenance_mode: newMode
      }))
      
      alert(`✅ Maintenance mode ${newMode ? 'enabled' : 'disabled'} successfully!`)
      
    } catch (error) {
      console.error('❌ Toggle error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateConfig = async () => {
    try {
      setSaving(true)
      setError(null)
      
      console.log('📝 Updating maintenance config...')
      
      const response = await fetch('/api/maintenance/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...config,
          user_id: user?.id || null
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update maintenance config')
      }
      
      console.log('✅ Maintenance config updated:', result.message)
      
      // Update local state
      setConfig(result.data)
      
      alert('✅ Maintenance config updated successfully!')
      
    } catch (error) {
      console.error('❌ Update error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
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

  if (!user) {
    return null
  }

  // Create custom SubHeader
  const customSubHeader = (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        <h2>Maintenance Mode</h2>
      </div>
      <div className="subheader-controls">
        <button
          onClick={handleToggleMaintenanceMode}
          disabled={saving}
          style={{
            padding: '10px 20px',
            backgroundColor: config.is_maintenance_mode ? '#dc2626' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
        >
          {config.is_maintenance_mode ? '🔴 Turn OFF Maintenance' : '🟢 Turn ON Maintenance'}
        </button>
      </div>
    </div>
  )

  return (
    <Layout 
      pageTitle="Maintenance Mode" 
      customSubHeader={customSubHeader}
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={handleToggleDarkMode}
      onLogout={handleLogout}
    >
      <Frame variant="standard">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          marginTop: '24px'
        }}>
          {/* Status Card */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
          }}>
            <StatCard
              title="MAINTENANCE STATUS"
              value={config.is_maintenance_mode ? 'ON' : 'OFF'}
              icon={config.is_maintenance_mode ? '🔴' : '🟢'}
            />
            <StatCard
              title="COUNTDOWN STATUS"
              value={config.countdown_enabled ? 'ENABLED' : 'DISABLED'}
              icon={config.countdown_enabled ? '⏰' : '🚫'}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
              <button 
                onClick={fetchMaintenanceConfig}
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

          {/* Loading State */}
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '48px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid #3b82f6',
                borderTop: '4px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <style jsx>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {/* Configuration Form */}
          {!loading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: 0,
                marginBottom: '8px'
              }}>
                Maintenance Configuration
              </h3>

              {/* Maintenance Message (English) */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Maintenance Message (English)
                </label>
                <textarea
                  value={config.maintenance_message}
                  onChange={(e) => {
                    setConfig(prev => ({ ...prev, maintenance_message: e.target.value }))
                    // Auto-resize textarea
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  onInput={(e) => {
                    // Auto-resize on input
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = target.scrollHeight + 'px'
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto'
                      el.style.height = el.scrollHeight + 'px'
                    }
                  }}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    maxHeight: '200px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'none',
                    overflow: 'hidden'
                  }}
                  placeholder="Enter maintenance message in English..."
                />
              </div>

              {/* Maintenance Message (Indonesian) */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Maintenance Message (Indonesian)
                </label>
                <textarea
                  value={config.maintenance_message_id}
                  onChange={(e) => {
                    setConfig(prev => ({ ...prev, maintenance_message_id: e.target.value }))
                    // Auto-resize textarea
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  onInput={(e) => {
                    // Auto-resize on input
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = target.scrollHeight + 'px'
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto'
                      el.style.height = el.scrollHeight + 'px'
                    }
                  }}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    maxHeight: '200px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'none',
                    overflow: 'hidden'
                  }}
                  placeholder="Enter maintenance message in Indonesian..."
                />
              </div>

              {/* Countdown Settings */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
              }}>
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    <input
                      type="checkbox"
                      checked={config.countdown_enabled}
                      onChange={(e) => setConfig(prev => ({ ...prev, countdown_enabled: e.target.checked }))}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    Enable Countdown
                  </label>
                </div>
                {config.countdown_enabled && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Countdown Target DateTime
                    </label>
                    <input
                      type="datetime-local"
                      value={config.countdown_datetime ? new Date(config.countdown_datetime).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, countdown_datetime: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Background Settings */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={config.background_color}
                    onChange={(e) => setConfig(prev => ({ ...prev, background_color: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={config.text_color}
                    onChange={(e) => setConfig(prev => ({ ...prev, text_color: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              {/* Background Image URL */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Background Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={config.background_image_url || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, background_image_url: e.target.value || null }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                />
              </div>

              {/* Logo Settings */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px'
              }}>
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    <input
                      type="checkbox"
                      checked={config.show_logo}
                      onChange={(e) => setConfig(prev => ({ ...prev, show_logo: e.target.checked }))}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    Show Logo
                  </label>
                </div>
                {config.show_logo && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Logo URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={config.logo_url || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, logo_url: e.target.value || null }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                      placeholder="Enter logo URL (e.g., https://example.com/logo.png)"
                    />
                  </div>
                )}
              </div>

              {/* Custom HTML */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Custom HTML (Optional)
                </label>
                <textarea
                  value={config.custom_html || ''}
                  onChange={(e) => {
                    setConfig(prev => ({ ...prev, custom_html: e.target.value || null }))
                    // Auto-resize textarea
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  onInput={(e) => {
                    // Auto-resize on input
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = target.scrollHeight + 'px'
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto'
                      el.style.height = el.scrollHeight + 'px'
                    }
                  }}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    maxHeight: '200px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    resize: 'none',
                    overflow: 'hidden'
                  }}
                  placeholder="Enter custom HTML content..."
                />
              </div>

              {/* Save Button */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '2px solid #e5e7eb'
              }}>
                <button
                  onClick={fetchMaintenanceConfig}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '120px'
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#4b5563'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#6b7280'
                    }
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={handleUpdateConfig}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                    minWidth: '140px'
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#2563eb'
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) {
                      e.currentTarget.style.backgroundColor = '#3b82f6'
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)'
                    }
                  }}
                >
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Frame>
    </Layout>
  )
}

