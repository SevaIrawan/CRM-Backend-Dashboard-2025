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
    
    switch (pathname) {
      // Main Pages
      case '/':
        return 'NEXMAX Dashboard'
      case '/users':
        return 'User Management'
      case '/supabase':
        return 'Supabase Connection'
      
      // USC Pages
      case '/usc':
        return 'USC'
      case '/usc/overview':
        return 'USC Overview'
      case '/usc/sales':
        return 'Member Analytic USC'
      case '/usc/churn-member':
        return 'USC Churn Member'
      case '/usc/retention-day':
        return 'USC Retention Day'
      
      // Transaction Pages
      case '/transaction':
        return 'Transaction'
      case '/transaction/deposit':
        return 'Transaction - Deposit'
      case '/transaction/withdraw':
        return 'Transaction - Withdraw'
      case '/transaction/adjustment':
        return 'Transaction - Adjustment'
      case '/transaction/exchange':
        return 'Transaction - Exchange'
      case '/transaction/headcount':
        return 'Transaction - Headcount'
      case '/transaction/member-report':
        return 'Transaction - Member Report'
      case '/transaction/new-depositor':
        return 'Transaction - New Depositor'
      case '/transaction/new-register':
        return 'Transaction - New Register'
      case '/transaction/vip-program':
        return 'Transaction - VIP Program'
      case '/transaction/master-data':
        return 'Transaction - Master Data'
      
      // Login Page
      case '/login':
        return 'Login - NEXMAX'
      
      // Error Pages
      case '/not-found':
        return 'Page Not Found'
      case '/error':
        return 'Error'
      case '/global-error':
        return 'Global Error'
      
      // Test Pages
      case '/cache-test':
        return 'Cache Performance Test'
      
      default:
        // Try to extract page name from pathname for dynamic titles
        const pathSegments = pathname.split('/').filter(Boolean)
        if (pathSegments.length > 0) {
          const lastSegment = pathSegments[pathSegments.length - 1]
          // Convert kebab-case to Title Case
          const titleCase = lastSegment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
          
          // Add currency prefix if it's a currency page
          if (pathSegments[0] === 'usc') {
            const currency = pathSegments[0].toUpperCase()
            return `${titleCase} ${currency}`
          }
          
          return titleCase
        }
        
        return 'NEXMAX Dashboard'
    }
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