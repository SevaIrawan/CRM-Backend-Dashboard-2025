'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getRoleDisplayName } from '@/utils/rolePermissions'
import RealtimeTimestamp from './RealtimeTimestamp'

interface HeaderProps {
  pageTitle?: string
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  darkMode?: boolean
  onToggleDarkMode?: () => void
  onLogout?: () => void
}

export default function Header({
  pageTitle,
  sidebarOpen,
  setSidebarOpen,
  darkMode = false,
  onToggleDarkMode = () => {},
  onLogout = () => {}
}: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [userInfo, setUserInfo] = useState<{username: string, role: string} | null>(null)

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

  const getPageTitle = () => {
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
        'kpi-comparison': 'KPI Comparison',
        'customer-retention': 'Customer Retention',
        'member-report': 'Member Report',
        'churn-member': 'Churn Member',
        'auto-approval-monitor': 'Auto Approval Deposit Monitoring',
        'auto-approval-withdraw': 'Auto Approval Withdrawal Monitoring',
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
  }

  const handleLogout = async () => {
    try {
      console.log('🔄 Starting logout...')
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
    <header className={`header ${!sidebarOpen ? 'collapsed' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              marginRight: '16px',
              color: '#6b7280'
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
              {getPageTitle()}
            </h1>
            <RealtimeTimestamp />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>👋</span>
            <span style={{ fontSize: '14px', color: '#ffffff' }}>
              Welcome, <strong>{userInfo?.username || 'User'}</strong>
            </span>
          </div>

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