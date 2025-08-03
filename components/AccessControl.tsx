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
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        console.log('🔍 AccessControl: Checking permissions for', pathname)
        
        // Small delay to ensure session is properly set
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Get user session
        const session = localStorage.getItem('nexmax_session')
        console.log('🗂️ Session data:', session ? 'exists' : 'not found')
        
        if (!session) {
          console.log('❌ No session found, redirecting to login')
          router.push('/login')
          return
        }

        const sessionData = JSON.parse(session)
        const userRole = sessionData.role || 'user'
        console.log('👤 User role:', userRole)
        console.log('📍 Current path:', pathname)
        console.log('📋 Session data:', sessionData)

        // Check if user has permission for current page
        const hasAccess = hasPermission(userRole, pathname)
        console.log('🔐 Has permission:', hasAccess)
        
        if (!hasAccess) {
          console.log(`❌ Access denied for role ${userRole} to ${pathname}`)
          
          // Special handling for usc_dep role - redirect to USC Overview
          if (userRole === 'usc_dep') {
            console.log('🔄 Redirecting usc_dep to USC Overview')
            // Force redirect with window.location to avoid any routing issues
            window.location.href = '/usc/overview'
            return
          }
          
          // Default redirect to dashboard for other roles
          router.push('/dashboard')
          return
        }

        console.log('✅ Access granted')
        setIsAuthorized(true)
        setIsLoading(false)
      } catch (error) {
        console.error('❌ Error checking access:', error)
        console.error('Error details:', error)
        router.push('/login')
      }
    }

    checkAccess()
  }, [pathname, router])

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #3b82f6',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ margin: 0, color: '#6b7280' }}>Checking permissions...</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
} 