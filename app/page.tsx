'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if we're on client side
    if (typeof window === 'undefined') {
      return
    }
    
    try {
      const session = localStorage.getItem('nexmax_session')
      if (session) {
        // User is logged in, redirect to dashboard
        router.push('/dashboard')
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
  }, [router])

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