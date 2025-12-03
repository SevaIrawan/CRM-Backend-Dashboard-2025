'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { hasPermission } from '@/utils/rolePermissions'

interface AccessControlProps {
  children: React.ReactNode
}

export default function AccessControl({ children }: AccessControlProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(true) // Start as authorized
  const [hasChecked, setHasChecked] = useState(false) // Track if we've checked maintenance mode
  const [isMounted, setIsMounted] = useState(false) // ✅ Hydration fix: Track if component is mounted

  // ✅ Hydration fix: Only run on client side
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    // ✅ Only check maintenance mode after component is mounted (client-side only)
    // ✅ Run in background - completely non-blocking, don't wait for it
    if (isMounted && pathname !== '/login' && pathname !== '/maintenance') {
      // ✅ Fire and forget - use setTimeout to ensure it doesn't block
      setTimeout(() => {
        checkMaintenanceMode().catch(() => {})
      }, 0) // Run in next tick - completely non-blocking
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isMounted])

  const checkMaintenanceMode = async () => {
    try {
      // Skip check for login and maintenance pages
      if (pathname === '/login' || pathname === '/maintenance') {
        setIsAuthorized(true)
        setHasChecked(true)
        return
      }

      // ✅ FAST PATH: Check localStorage session first (no API call needed)
      // Only access localStorage on client side (after mount)
      if (typeof window === 'undefined') return
      const session = localStorage.getItem('nexmax_session')
      if (session) {
        try {
          const sessionData = JSON.parse(session)
          // If admin, skip maintenance check (admin can always bypass)
          if (sessionData?.role === 'admin') {
            console.log('✅ [AccessControl] Admin user detected, skipping maintenance check')
            setIsAuthorized(true)
            setHasChecked(true)
            return
          }
        } catch (error) {
          console.error('Error parsing session:', error)
        }
      }

      // ✅ Check API in background - completely non-blocking
      // Don't show loading screen, just check and redirect if needed
      // Use very short timeout and fire-and-forget
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300) // ✅ Very short timeout
      
      // ✅ Fire and forget - don't await, don't block navigation at all
      // This runs in background and doesn't affect page navigation speed
      Promise.resolve().then(() => {
        return fetch('/api/maintenance/status', {
          signal: controller.signal,
          cache: 'no-store', // ✅ CRITICAL: No cache untuk real-time status
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        })
      })
      .then(response => response.json())
      .then(result => {
        clearTimeout(timeoutId)
        if (result.success && result.data.is_maintenance_mode) {
          // Maintenance mode is ON, redirect to maintenance page
          console.log('🔧 [AccessControl] Maintenance mode ON, logging out user and redirecting to maintenance page')
          
          // ✅ CRITICAL: Logout user (clear session) jika bukan admin
          const session = localStorage.getItem('nexmax_session')
          if (session) {
            try {
              const sessionData = JSON.parse(session)
              if (sessionData?.role !== 'admin') {
                console.log('🚪 [AccessControl] Logging out non-admin user:', sessionData.username)
                // Clear all session data
                localStorage.removeItem('nexmax_session')
                localStorage.removeItem('nexmax_user')
                sessionStorage.clear()
              }
            } catch (err) {
              console.error('Error parsing session for logout:', err)
            }
          }
          
          // Force reload to maintenance page
          window.location.href = '/maintenance'
          setIsAuthorized(false)
          setHasChecked(true)
        } else {
        // Maintenance mode is OFF
        setIsAuthorized(true)
        setHasChecked(true)
        }
      })
      .catch(() => {
        clearTimeout(timeoutId)
        // Fail-open: allow access if check fails - don't block navigation
        setIsAuthorized(true)
        setHasChecked(true)
      })
    } catch (error) {
      console.error('❌ [AccessControl] Error in checkMaintenanceMode:', error)
      // If error, allow access (fail-open)
      setIsAuthorized(true)
      setHasChecked(true)
    }
  }

  // ✅ Always render children immediately (no loading screen)
  // Check maintenance mode in background and redirect if needed
  // Note: isAuthorized starts as true, so server and client render the same initially
  
  // Only return null if maintenance mode is ON (after check completes)
  // This prevents hydration mismatch because initial render is always children
  if (!isAuthorized && hasChecked) {
    // If not authorized (maintenance mode), return null (redirect will happen)
    return null
  }

  // Always render children (same on server and client)
  return <>{children}</>
}
