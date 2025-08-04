'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    if (typeof window === 'undefined') {
      return // Skip on server-side
    }
    
    const session = localStorage.getItem('nexmax_session')
    if (session) {
      // User is logged in, redirect to dashboard
      router.push('/dashboard')
    } else {
      // User is not logged in, redirect to login
      router.push('/login')
    }
  }, [router])

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