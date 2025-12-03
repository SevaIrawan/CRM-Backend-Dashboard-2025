'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import { getRoleDisplayName } from '@/utils/rolePermissions'
import RealtimeTimestamp from './RealtimeTimestamp'
import { logActivityViaAPI, getStoredSessionId, clearStoredSessionId, calculateSessionDuration } from '@/lib/activityLogger'
import TierAnalyticsAlertDropdown from './TierAnalyticsAlertDropdown'

interface Alert {
  id: string
  title: string
  message: string
  type: 'warning' | 'info' | 'error'
  priority?: 'high' | 'medium' | 'low'
}

interface HeaderProps {
  pageTitle?: string
  subtitle?: string
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  darkMode?: boolean
  onToggleDarkMode?: () => void
  onLogout?: () => void
  pageInsights?: any // For page-specific insights
}

export default function Header({
  pageTitle,
  subtitle,
  sidebarOpen,
  setSidebarOpen,
  darkMode = false,
  onToggleDarkMode = () => {},
  onLogout = () => {},
  pageInsights
}: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [userInfo, setUserInfo] = useState<{username: string, role: string} | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [isAlertDropdownOpen, setIsAlertDropdownOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const bellIconRef = useRef<HTMLDivElement>(null)

  // Auto-close dropdown when click outside
  useEffect(() => {
    if (!isAlertDropdownOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't close if clicking the bell icon itself or inside dropdown
      if (bellIconRef.current?.contains(target)) return
      
      setIsAlertDropdownOpen(false)
    }

    // Add slight delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isAlertDropdownOpen])

  useEffect(() => {
    // Get user info from session
    try {
      if (typeof window === 'undefined') {
        return // Skip on server-side
      }
      
      const session = localStorage.getItem('nexmax_session')
      if (session) {
        const sessionData = JSON.parse(session)
        setUserInfo({
          username: sessionData.username || 'User',
          role: sessionData.role || 'user'
        })
      }
    } catch (error) {
      console.error('Error getting user info:', error)
    }
  }, [])

  // Update notification count based on current page
  useEffect(() => {
    // Brand Performance Trends page - use pageInsights
    if (pathname === '/usc/brand-performance-trends') {
      if (pageInsights) {
        setNotificationCount(pageInsights.decliningBrands || 0)
      } else {
        setNotificationCount(0)
      }
      return
    }
    
    // Business Performance page - use localStorage
    if (pathname !== '/usc/business-performance') {
      setNotificationCount(0)
      setIsAlertDropdownOpen(false)
      return
    }

    const updateNotification = () => {
      try {
        // First, update alerts from localStorage
        const alertsData = localStorage.getItem('tier_analytics_alerts')
        if (alertsData) {
          try {
            const parsedAlerts = JSON.parse(alertsData)
            setAlerts(parsedAlerts)
            // Notification count = actual alerts length (not from localStorage count)
            setNotificationCount(parsedAlerts.length || 0)
          } catch (e) {
            console.error('Error parsing alerts:', e)
            setAlerts([])
            setNotificationCount(0)
          }
        } else {
          // No alerts data = no notifications
          setAlerts([])
          setNotificationCount(0)
        }
        
        // Also check notification data for marketing tab count
        const notificationData = localStorage.getItem('business_performance_notification')
        if (notificationData) {
          try {
            const data = JSON.parse(notificationData)
            const currentTab = data.tab || 'marketing'
            // For marketing tab, use stored count. For tier-analytics, use alerts.length (already set above)
            if (currentTab === 'marketing') {
              const marketingCount = data.marketing || data.count || 0
              setNotificationCount(marketingCount)
            }
            // For tier-analytics, count is already set from alerts.length above
          } catch (e) {
            console.error('Error parsing notification data:', e)
          }
        }
      } catch (e) {
        console.error('Error reading notification count:', e)
        setNotificationCount(0)
        setAlerts([])
      }
    }
    
    updateNotification()
    // Listen for storage changes (when tab switches)
    const interval = setInterval(updateNotification, 100)
    return () => clearInterval(interval)
  }, [pathname, pageInsights])

  // ✅ Memoize page title for instant update when pathname changes
  const currentPageTitle = useMemo(() => {
    if (pageTitle) return pageTitle
    
    // Auto-detect page title based on pathname
    const pathSegments = pathname.split('/').filter(Boolean)
    
    // Handle main pages
    if (pathname === '/') return 'NEXMAX Dashboard'
    if (pathname === '/users') return 'User Management'
    if (pathname === '/supabase') return 'Supabase Connection'
    if (pathname === '/login') return 'Login - NEXMAX'
    if (pathname === '/not-found') return 'Page Not Found'
    if (pathname === '/error') return 'Error'
    if (pathname === '/global-error') return 'Global Error'
    if (pathname === '/cache-test') return 'Cache Performance Test'
    
    // Handle currency pages (USC, MYR, SGD)
    if (pathSegments.length >= 2) {
      const currency = pathSegments[0].toUpperCase()
      const page = pathSegments[1]
      
      // Map page names to proper titles
      const pageTitleMap: { [key: string]: string } = {
        'overview': 'Overview',
        'member-analytic': 'Member Analytic',
        'brand-comparison': 'Brand Comparison',
        'brand-performance-trends': 'Brand Comparison Trends',
        'kpi-comparison': 'KPI Comparison',
        'overall-label': 'Overall Label',
        'aia-candy-tracking': 'AIA Candy Mechanism',
        'customer-retention': 'Customer Retention',
        'member-report': 'Member Report',
        'churn-member': 'Churned Members',
        'auto-approval-monitor': 'Deposit Auto‑Approval',
        'auto-approval-withdraw': 'Withdrawal Auto‑Approval',
        'retention-day': 'Retention Day'
      }
      
      const pageTitle = pageTitleMap[page] || page
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      // Don't add currency suffix (keep title clean for all currency pages)
      return pageTitle
    }
    
    // Handle transaction pages
    if (pathSegments[0] === 'transaction' && pathSegments.length >= 2) {
      const transactionPage = pathSegments[1]
      const pageTitle = transactionPage
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      return `Transaction - ${pageTitle}`
    }
    
    // Handle single segment paths (currency root pages)
    if (pathSegments.length === 1) {
      const segment = pathSegments[0]
      if (['usc', 'myr', 'sgd'].includes(segment)) {
        return segment.toUpperCase()
      }
      if (segment === 'transaction') {
        return 'Transaction'
      }
    }
    
    // Fallback: convert pathname to title case
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1]
      return lastSegment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
    
    return 'NEXMAX Dashboard'
  }, [pageTitle, pathname])

  const handleLogout = async () => {
    try {
      console.log('🔄 Starting logout...')
      
      // ✅ ACTIVITY TRACKING: Log logout activity (except admin)
      if (userInfo && userInfo.role !== 'admin') {
        try {
          const sessionId = getStoredSessionId()
          const sessionDuration = calculateSessionDuration()
          
          // Get user data from session
          const session = localStorage.getItem('nexmax_session')
          if (session) {
            const sessionData = JSON.parse(session)
            
            // Log logout activity
            await logActivityViaAPI({
              username: sessionData.username,
              email: sessionData.email,
              role: sessionData.role,
              userId: sessionData.id,
              activityType: 'logout',
              accessedPage: window.location.pathname,
              sessionId,
              sessionDuration,
              metadata: {
                logoutMethod: 'manual',
                lastPage: window.location.pathname
              }
            })
          }
          
          // Clear session ID
          clearStoredSessionId()
        } catch (trackingError) {
          console.error('❌ Logout tracking error:', trackingError)
          // Continue with logout even if tracking fails
        }
      }
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nexmax_session')
        document.cookie = 'user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'username=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'user_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        console.log('🍪 Cookies cleared manually')
      }
    } catch (error) {
      console.error('❌ Logout error:', error)
    }
    console.log('🔄 Redirecting to login...')
    router.push('/login')
  }

  return (
    <>
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo */}
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '3px solid #FFD700',
            padding: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1f2937',
            flexShrink: 0
          }}>
            <Image
              src="/aset/images (1).jpg"
              alt="NEXMAX Logo"
              width={44}
              height={44}
              priority
              style={{ 
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          </div>
          
          {/* Hamburger Menu */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6b7280',
              /* ✅ SMOOTH TRANSITION */
              transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none', /* Prevent text selection on click */
              WebkitTapHighlightColor: 'transparent' /* Remove mobile tap highlight */
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#3b82f6'
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280'
              e.currentTarget.style.transform = 'scale(1)'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
          >
            ☰
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#ffffff',
              margin: 0,
              lineHeight: '1.2',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {currentPageTitle}
            </h1>
            {subtitle ? (
              <p style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0,
                marginTop: '2px',
                fontWeight: '500'
              }}>
                {subtitle}
              </p>
            ) : (
              <RealtimeTimestamp />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>👋</span>
            <span style={{ fontSize: '14px', color: '#ffffff' }}>
              Welcome, <strong>{userInfo?.username || 'User'}</strong>
            </span>
          </div>

          {/* Notification Bell - Show on specific pages */}
          {(pathname === '/usc/business-performance' || pathname === '/usc/brand-performance-trends') && (
            <>
              <div 
                ref={bellIconRef}
                style={{ 
                  position: 'relative', 
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s ease',
                  zIndex: 10002,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('🔔 Bell icon clicked in Header, notificationCount:', notificationCount)
                  
                  // Fetch alerts from localStorage
                  try {
                    const alertsData = localStorage.getItem('tier_analytics_alerts')
                    if (alertsData) {
                      const parsedAlerts = JSON.parse(alertsData)
                      setAlerts(parsedAlerts)
                    }
                  } catch (e) {
                    console.error('Error reading alerts from localStorage:', e)
                  }
                  
                  setIsAlertDropdownOpen(!isAlertDropdownOpen)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                title="View Alerts"
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{ color: '#ffffff', pointerEvents: 'none' }}
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {notificationCount > 0 && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      border: '2px solid #1f2937',
                      pointerEvents: 'none'
                    }}
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Malaysian Flag */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Image
              src="/aset/malaysia-flag-png-41827.png"
              alt="Malaysia Flag"
              width={24}
              height={16}
              style={{ borderRadius: '2px' }}
            />
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
    
    {/* Business Performance Alert Dropdown */}
    {pathname === '/usc/business-performance' && (
      <TierAnalyticsAlertDropdown
        isOpen={isAlertDropdownOpen}
        onClose={() => setIsAlertDropdownOpen(false)}
        alerts={alerts}
        triggerElement={bellIconRef.current}
      />
    )}
    
    {/* Brand Performance Trends Insights Dropdown - RENDERED OUTSIDE HEADER */}
    {pathname === '/usc/brand-performance-trends' && isAlertDropdownOpen && pageInsights && (
      <>
        {/* Backdrop overlay */}
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.2)',
            zIndex: 999998,
            backdropFilter: 'blur(2px)'
          }}
        />
        
        {/* Dropdown */}
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: '80px',
            right: '120px',
            width: '380px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 999999,
            overflow: 'visible',
            border: '2px solid #667eea',
            animation: 'slideDown 0.2s ease-out'
          }}
        >
                  {/* Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '16px 20px',
                    color: 'white'
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                      📊 Performance Insights
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>
                      Brand Performance Trends - Period B vs A
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                    {/* Overview */}
                    <div style={{
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        📈 Overall Status
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.6' }}>
                        • <strong>{pageInsights.totalBrands}</strong> brands tracked<br/>
                        • <strong style={{ color: '#059669' }}>{pageInsights.growingBrands}</strong> brands growing<br/>
                        • <strong style={{ color: '#dc2626' }}>{pageInsights.decliningBrands}</strong> brands declining<br/>
                        • Average growth: <strong style={{ color: pageInsights.avgGrowth >= 0 ? '#059669' : '#dc2626' }}>
                          {pageInsights.avgGrowth >= 0 ? '+' : ''}{pageInsights.avgGrowth.toFixed(1)}%
                        </strong>
                      </div>
                    </div>

                    {/* Best Performer */}
                    <div style={{
                      padding: '12px',
                      background: '#d1fae5',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      border: '1px solid #a7f3d0'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#065f46', marginBottom: '8px' }}>
                        🏆 Best Performer
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#047857', marginBottom: '4px' }}>
                        {pageInsights.bestPerformer?.brand || 'N/A'}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                        ↗ +{(pageInsights.bestPerformer?.percent?.activeMember || 0).toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '11px', color: '#065f46', marginTop: '4px' }}>
                        Active Member Growth
                      </div>
                    </div>

                    {/* Attention Needed */}
                    <div style={{
                      padding: '12px',
                      background: '#fee2e2',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      border: '1px solid #fecaca'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>
                        ⚠️ Attention Needed
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#b91c1c', marginBottom: '4px' }}>
                        {pageInsights.worstPerformer?.brand || 'N/A'}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
                        ↘ {(pageInsights.worstPerformer?.percent?.activeMember || 0).toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px' }}>
                        Active Member Change
                      </div>
                    </div>

                    {/* Action Recommendation */}
                    <div style={{
                      padding: '12px',
                      background: '#fef3c7',
                      borderRadius: '8px',
                      border: '1px solid #fde68a'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                        💡 Quick Recommendation
                      </div>
                      <div style={{ fontSize: '12px', color: '#78350f', lineHeight: '1.6' }}>
                        {pageInsights.decliningBrands > pageInsights.growingBrands ? (
                          <>⚠️ <strong>{pageInsights.decliningBrands}</strong> brands declining. Review marketing strategy and customer retention programs.</>
                        ) : pageInsights.avgGrowth > 10 ? (
                          <>✅ Strong performance! Average growth <strong>+{pageInsights.avgGrowth.toFixed(1)}%</strong>. Consider scaling successful strategies.</>
                        ) : (
                          <>📊 Moderate performance. Focus on replicating success from <strong>{pageInsights.bestPerformer?.brand}</strong>.</>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{
                    padding: '12px 20px',
                    background: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '11px',
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    Last updated: {new Date().toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
      </>
      )}
      
      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
} 