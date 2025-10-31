'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { logActivityViaAPI, getStoredSessionId } from '@/lib/activityLogger'
import { cleanupSession } from '@/utils/sessionCleanup'

interface ActivityTrackerProps {
  children: React.ReactNode
}

/**
 * ActivityTracker Component
 * 
 * Purpose: Automatically track page views for non-admin users
 * Usage: Wrap around Layout component
 */
export default function ActivityTracker({ children }: ActivityTrackerProps) {
  const pathname = usePathname()
  const lastTrackedPath = useRef<string | null>(null)
  const sessionStarted = useRef<boolean>(false)

  useEffect(() => {
    const trackPageView = async () => {
      try {
        // Skip tracking for admin users
        const session = localStorage.getItem('nexmax_session')
        if (!session) return

        const sessionData = JSON.parse(session)
        if (sessionData.role === 'admin') return

        // Skip if already tracked this page
        if (lastTrackedPath.current === pathname) return

        // Skip login page (handled separately)
        if (pathname === '/login') return

        // Get session ID (should exist from login)
        const sessionId = getStoredSessionId()
        if (!sessionId) {
          console.warn('⚠️ No session ID found for page tracking')
          return
        }

        // Generate page title
        const pageTitle = generatePageTitle(pathname)

        // Track page view
        await logActivityViaAPI({
          username: sessionData.username,
          email: sessionData.email,
          role: sessionData.role,
          userId: sessionData.id,
          activityType: 'page_view',
          accessedPage: pathname,
          pageTitle,
          sessionId,
          metadata: {
            previousPage: lastTrackedPath.current,
            timestamp: new Date().toISOString()
          }
        })

        // Update last tracked path
        lastTrackedPath.current = pathname
        console.log(`📊 [ActivityTracker] Tracked page view: ${pathname}`)

      } catch (error) {
        console.error('❌ [ActivityTracker] Page tracking error:', error)
        // Don't throw - tracking should not break the app
      }
    }

    // Track page view with small delay to ensure page is loaded
    const timer = setTimeout(trackPageView, 500)
    
    return () => clearTimeout(timer)
  }, [pathname])

  // Force-logout watcher: detect admin-triggered global logout and logout non-admins immediately
  useEffect(() => {
    const checkForceLogout = async () => {
      try {
        // 1) Check server flag (shared across clients) - from database
        let serverFlag = 0
        try {
          const res = await fetch('/api/admin/force-logout-all', { 
            cache: 'no-store',
            method: 'GET'
          })
          if (res.ok) {
            const json = await res.json()
            serverFlag = Number(json?.forceLogoutAt || 0)
            console.log('🔍 [ActivityTracker] Server flag:', serverFlag, 'from API')
          } else {
            console.warn('⚠️ [ActivityTracker] API response not OK:', res.status)
          }
        } catch (fetchError) {
          console.error('❌ [ActivityTracker] Fetch error:', fetchError)
        }

        // 2) Check local flag (fallback)
        const localFlagStr = localStorage.getItem('nexmax_force_logout_all') || sessionStorage.getItem('nexmax_force_logout_all')
        const localFlag = localFlagStr ? Number(localFlagStr) : 0
        const flag = Math.max(serverFlag, localFlag)
        
        const sessionRaw = localStorage.getItem('nexmax_session')
        if (!flag || !sessionRaw) {
          if (flag > 0 && !sessionRaw) {
            console.log('🔍 [ActivityTracker] Flag exists but no session')
          }
          return
        }
        
        const session = JSON.parse(sessionRaw)
        if (session?.role === 'admin') {
          console.log('🔍 [ActivityTracker] Admin user, skipping logout')
          return
        }
        
        const loginAt = Number(session?.loginAt || 0)
        console.log('🔍 [ActivityTracker] Comparing - Flag:', flag, 'LoginAt:', loginAt, 'Should logout?', flag > 0 && (!loginAt || flag > loginAt))
        if (loginAt && flag <= loginAt) {
          console.log('⏭️ [ActivityTracker] Flag older than login, skipping. Flag:', flag, 'LoginAt:', loginAt)
          return
        }
        
        // Force logout now
        console.log('🚪 [ActivityTracker] Force logout detected! Flag:', flag, 'LoginAt:', loginAt, 'User:', session?.username)
        cleanupSession()
        // Clear the flag locally so we do not re-trigger
        localStorage.removeItem('nexmax_force_logout_all')
        sessionStorage.removeItem('nexmax_force_logout_all')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      } catch (e) {
        console.error('❌ [ActivityTracker] Force logout check error:', e)
      }
    }

    // Immediate check and then poll every 2s for responsiveness
    checkForceLogout()
    const interval = setInterval(checkForceLogout, 2000)
    return () => clearInterval(interval)
  }, [])

  return <>{children}</>
}

/**
 * Generate user-friendly page title from pathname
 */
function generatePageTitle(pathname: string): string {
  // Remove leading slash and split by '/'
  const segments = pathname.replace(/^\//, '').split('/')
  
  // Handle empty pathname
  if (segments.length === 0 || segments[0] === '') {
    return 'Dashboard'
  }

  // Handle currency-specific pages
  const currencies = ['myr', 'sgd', 'usc']
  if (currencies.includes(segments[0])) {
    const currency = segments[0].toUpperCase()
    const page = segments[1] || 'Overview'
    
    // Convert page names to user-friendly format
    const pageNames: { [key: string]: string } = {
      'overview': 'Overview',
      'member-analytic': 'Member Analytic',
      'brand-performance-trends': 'Brand Comparison Trends',
      'churn-member': 'Churn Member',
      'customer-retention': 'Customer Retention',
      'kpi-comparison': 'KPI Comparison',
      'member-report': 'Member Report',
      'auto-approval-monitor': 'Auto Approval Monitor',
      'auto-approval-withdraw': 'Auto Approval Withdraw',
      'aia-candy-tracking': 'AIA Candy Mechanism',
      'overall-label': 'Overall Label'
    }
    
    const friendlyPageName = pageNames[page] || page.charAt(0).toUpperCase() + page.slice(1)
    return `${currency} - ${friendlyPageName}`
  }

  // Handle other pages
  const pageNames: { [key: string]: string } = {
    'dashboard': 'Dashboard',
    'transaction': 'Transactions',
    'users': 'Users',
    'supabase': 'Supabase'
  }

  const page = segments[0]
  return pageNames[page] || page.charAt(0).toUpperCase() + page.slice(1)
}
