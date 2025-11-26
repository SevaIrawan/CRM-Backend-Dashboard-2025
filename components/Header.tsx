'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { getRoleDisplayName } from '@/utils/rolePermissions'
import RealtimeTimestamp from './RealtimeTimestamp'
import { logActivityViaAPI, getStoredSessionId, clearStoredSessionId, calculateSessionDuration } from '@/lib/activityLogger'

interface HeaderProps {
  pageTitle?: string
  subtitle?: string
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  darkMode?: boolean
  onToggleDarkMode?: () => void
  onLogout?: () => void
}

export default function Header({
  pageTitle,
  subtitle,
  sidebarOpen,
  setSidebarOpen,
  darkMode = false,
  onToggleDarkMode = () => {},
  onLogout = () => {}
}: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [userInfo, setUserInfo] = useState<{username: string, role: string} | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)

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

  // Update notification count when on business performance page
  useEffect(() => {
    if (pathname !== '/usc/business-performance') {
      setNotificationCount(0)
      return
    }

    const updateNotification = () => {
      try {
        const notificationData = localStorage.getItem('business_performance_notification')
        if (notificationData) {
          const data = JSON.parse(notificationData)
          // Get count based on current tab
          const currentTab = data.tab || 'marketing'
          const count = currentTab === 'marketing' 
            ? (data.marketing || data.count || 3)
            : (data.tierAnalytics || data.count || 4)
          setNotificationCount(count)
        } else {
          setNotificationCount(3) // Default for marketing tab
        }
      } catch (e) {
        console.error('Error reading notification count:', e)
        setNotificationCount(0)
      }
    }
    
    updateNotification()
    // Listen for storage changes (when tab switches)
    const interval = setInterval(updateNotification, 100)
    return () => clearInterval(interval)
  }, [pathname])

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

          {/* Notification Bell - Only show on Business Performance page */}
          {pathname === '/usc/business-performance' && (
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{ color: '#ffffff' }}
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {notificationCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
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
                  border: '2px solid #1f2937'
                }}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </div>
              )}
            </div>
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
  )
} 