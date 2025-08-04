'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('❌ App Error:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        maxWidth: '400px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem',
          color: '#ef4444'
        }}>
          ⚠️
        </div>
        <h2 style={{
          fontSize: '1.5rem',
          marginBottom: '1rem',
          color: '#ffd700'
        }}>
          Terjadi Kesalahan
        </h2>
        <p style={{
          fontSize: '1rem',
          marginBottom: '2rem',
          opacity: 0.8,
          lineHeight: '1.5'
        }}>
          Maaf, terjadi kesalahan dalam aplikasi. Silakan coba lagi.
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6b7280, #4b5563)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(107, 114, 128, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    </div>
  )
} 