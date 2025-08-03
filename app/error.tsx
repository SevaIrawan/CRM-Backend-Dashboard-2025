'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1d29 0%, #2d3142 50%, #1a1d29 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        maxWidth: '500px'
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