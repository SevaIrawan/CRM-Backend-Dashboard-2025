'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface MaintenanceConfig {
  is_maintenance_mode: boolean
  maintenance_message: string
  maintenance_message_id: string
  countdown_enabled: boolean
  countdown_datetime: string | null
  background_image_url: string | null
  background_color: string
  text_color: string
  show_logo: boolean
  logo_url: string | null
  custom_html: string | null
}

export default function MaintenancePage() {
  const router = useRouter()
  const [config, setConfig] = useState<MaintenanceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)
  
  useEffect(() => {
    // Fetch maintenance config
    fetchMaintenanceConfig()
    
    // Check if user is admin (bypass maintenance)
    checkAdminAccess()
    
    // ✅ Auto-check maintenance status setiap 3 detik untuk auto-redirect jika OFF
    const statusCheckInterval = setInterval(() => {
      console.log('🔄 [Maintenance Page] Auto-checking maintenance status...')
      fetchMaintenanceConfig()
    }, 3000) // Check every 3 seconds for faster response
    
    return () => clearInterval(statusCheckInterval)
  }, [])
  
  useEffect(() => {
    // Update countdown timer if enabled
    if (config?.countdown_enabled && config?.countdown_datetime) {
      const interval = setInterval(() => {
        updateCountdown(config.countdown_datetime!)
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [config])
  
  const fetchMaintenanceConfig = async () => {
    try {
      const response = await fetch('/api/maintenance/status', {
        cache: 'no-store', // ✅ Force no cache
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const result = await response.json()
      
      if (result.success) {
        // ✅ If maintenance mode is OFF, redirect to login page
        if (!result.data.is_maintenance_mode) {
          console.log('🔄 [Maintenance Page] Maintenance mode is OFF, redirecting to login')
          // ✅ Force full page reload ke login untuk clear semua cache
          window.location.href = '/login'
          return
        }
        
        setConfig(result.data)
        
        // Initialize countdown if enabled
        if (result.data.countdown_enabled && result.data.countdown_datetime) {
          updateCountdown(result.data.countdown_datetime)
        }
      }
    } catch (error) {
      console.error('Error fetching maintenance config:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const checkAdminAccess = () => {
    try {
      const session = localStorage.getItem('nexmax_session')
      if (session) {
        const sessionData = JSON.parse(session)
        // If admin, redirect to dashboard (admin can bypass maintenance)
        if (sessionData?.role === 'admin') {
          console.log('✅ [Maintenance Page] Admin detected, redirecting to dashboard')
          router.push('/dashboard')
          return
        }
      }
    } catch (error) {
      console.error('Error checking admin access:', error)
    }
  }
  
  const updateCountdown = (targetDateTime: string) => {
    const now = new Date().getTime()
    const target = new Date(targetDateTime).getTime()
    const difference = target - now
    
    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)
      
      setTimeRemaining({ days, hours, minutes, seconds })
    } else {
      setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 })
    }
  }
  
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #ffffff',
          borderTop: '4px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }
  
  // Default config if not loaded
  const maintenanceConfig = config || {
    is_maintenance_mode: true,
    maintenance_message: 'We are currently performing maintenance. Please check back soon.',
    maintenance_message_id: 'Kami sedang melakukan pemeliharaan. Silakan kembali lagi nanti.',
    countdown_enabled: false,
    countdown_datetime: null,
    background_image_url: null,
    background_color: '#1a1a1a',
    text_color: '#ffffff',
    show_logo: true,
    logo_url: null,
    custom_html: null
  }
  
  // Background style
  const backgroundStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    backgroundColor: maintenanceConfig.background_color || '#1a1a1a',
    backgroundImage: maintenanceConfig.background_image_url
      ? `url(${maintenanceConfig.background_image_url})`
      : 'none',
    backgroundSize: maintenanceConfig.background_image_url ? 'cover' : 'auto',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
    color: maintenanceConfig.text_color || '#ffffff',
    textAlign: 'center',
    position: 'relative',
    width: '100%'
  }
  
  return (
    <div style={backgroundStyle}>
      {/* Overlay for background image - Optional overlay for better text readability */}
      {maintenanceConfig.background_image_url && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 0,
          pointerEvents: 'none'
        }}></div>
      )}
      
      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '800px',
        width: '100%'
      }}>
        {/* Logo */}
        {maintenanceConfig.show_logo && (
          <div style={{ marginBottom: '2rem' }}>
            {maintenanceConfig.logo_url ? (
              <img
                src={maintenanceConfig.logo_url}
                alt="Logo"
                style={{
                  maxWidth: '200px',
                  height: 'auto'
                }}
              />
            ) : (
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                letterSpacing: '0.1em'
              }}>
                NEXMAX
              </div>
            )}
          </div>
        )}
        
        {/* Maintenance Message */}
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          lineHeight: '1.2'
        }}>
          {maintenanceConfig.maintenance_message}
        </h1>
        
        {/* Countdown Timer */}
        {maintenanceConfig.countdown_enabled && timeRemaining && (
          <div style={{
            marginTop: '2rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              {timeRemaining.days > 0 && (
                <div style={{
                  padding: '1rem 1.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  minWidth: '100px'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    {timeRemaining.days.toString().padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    Hari
                  </div>
                </div>
              )}
              <div style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                minWidth: '100px'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                  {timeRemaining.hours.toString().padStart(2, '0')}
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                  Jam
                </div>
              </div>
              <div style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                minWidth: '100px'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                  {timeRemaining.minutes.toString().padStart(2, '0')}
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                  Menit
                </div>
              </div>
              <div style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                minWidth: '100px'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                  {timeRemaining.seconds.toString().padStart(2, '0')}
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                  Detik
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Additional Message */}
        <p style={{
          fontSize: '1.125rem',
          opacity: 0.9,
          marginTop: '2rem',
          lineHeight: '1.6'
        }}>
          Terima kasih atas kesabaran Anda. Kami akan segera kembali.
        </p>
        
        {/* Back to Home Button */}
        <button
          onClick={() => {
            console.log('🔄 [Maintenance Page] User clicked Back to Home, redirecting to login...')
            // ✅ Force reload ke login page (clear session dan cache)
            window.location.href = '/login'
          }}
          style={{
            marginTop: '2rem',
            padding: '12px 32px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: maintenanceConfig.text_color || '#ffffff',
            border: `2px solid ${maintenanceConfig.text_color || '#ffffff'}`,
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  )
}

