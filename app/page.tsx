'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDefaultPageByRole } from '@/utils/rolePermissions'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if we're on client side
    if (typeof window === 'undefined') {
      return
    }
    
    // Check maintenance mode first
    checkMaintenanceMode()
  }, [router])

  const checkMaintenanceMode = async () => {
    try {
      // Check maintenance mode from API
      const response = await fetch('/api/maintenance/status')
      const result = await response.json()

      if (result.success && result.data.is_maintenance_mode) {
        // Maintenance mode is ON
        // Check if user is admin (admin can bypass)
        const session = localStorage.getItem('nexmax_session')
        if (session) {
          try {
            const sessionData = JSON.parse(session)
            if (sessionData?.role === 'admin') {
              // Admin can bypass maintenance mode, redirect to default page
              const userRole = sessionData?.role || 'admin'
              const defaultPage = getDefaultPageByRole(userRole)
              console.log('✅ [HomePage] Admin bypassing maintenance mode, redirecting to:', defaultPage)
              router.push(defaultPage)
              setIsLoading(false)
              return
            }
          } catch (error) {
            console.error('Error parsing session:', error)
          }
        }

        // Non-admin user, redirect to maintenance page
        console.log('🔧 [HomePage] Maintenance mode ON, redirecting to maintenance page')
        router.push('/maintenance')
        setIsLoading(false)
        return
      }

      // Maintenance mode is OFF, proceed with normal flow
      try {
        const session = localStorage.getItem('nexmax_session')
        if (session) {
          // User is logged in, get role and redirect to appropriate default page
          const sessionData = JSON.parse(session)
          const userRole = sessionData?.role || 'executive'
          const defaultPage = getDefaultPageByRole(userRole)
          
          console.log('🔍 [HomePage] User role:', userRole, 'Default page:', defaultPage)
          router.push(defaultPage)
        } else {
          // User is not logged in, redirect to login
          router.push('/login')
        }
      } catch (error) {
        console.error('Error checking session:', error)
        // Fallback to login page
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error)
      // If error, proceed with normal flow (fail-open)
      try {
        const session = localStorage.getItem('nexmax_session')
        if (session) {
          const sessionData = JSON.parse(session)
          const userRole = sessionData?.role || 'executive'
          const defaultPage = getDefaultPageByRole(userRole)
          router.push(defaultPage)
        } else {
          router.push('/login')
        }
      } catch (err) {
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Show loading while checking session
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1d29 0%, #2d3142 50%, #1a1d29 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            animation: 'pulse 2s infinite'
          }}>
            ⚡
          </div>
          <h1 style={{
            fontSize: '2rem',
            marginBottom: '1rem',
            color: '#ffd700'
          }}>
            NEXMAX Dashboard
          </h1>
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.8
          }}>
            Loading...
          </p>
        </div>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </div>
    )
  }

  return null
} 