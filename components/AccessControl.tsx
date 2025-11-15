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
    // Only check maintenance mode after component is mounted (client-side only)
    if (isMounted) {
      checkMaintenanceMode()
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

      // ✅ Check API in background (non-blocking)
      // Don't show loading screen, just check and redirect if needed
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout
      
      try {
        const response = await fetch('/api/maintenance/status', {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        const result = await response.json()

        if (result.success && result.data.is_maintenance_mode) {
          // Maintenance mode is ON, redirect to maintenance page
          console.log('🔧 [AccessControl] Maintenance mode ON, redirecting to maintenance page')
          router.push('/maintenance')
          setIsAuthorized(false)
          setHasChecked(true)
          return
        }

        // Maintenance mode is OFF
        console.log('✅ [AccessControl] Access granted')
        setIsAuthorized(true)
        setHasChecked(true)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        // If error or timeout, allow access (fail-open for better UX)
        // Don't block user experience
        if (fetchError.name === 'AbortError') {
          console.warn('⚠️ [AccessControl] Maintenance check timeout, allowing access')
        } else {
          console.error('❌ [AccessControl] Error checking maintenance mode:', fetchError)
        }
        // Fail-open: allow access if check fails
        setIsAuthorized(true)
        setHasChecked(true)
      }
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
