'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import { logActivityViaAPI, generateSessionId, storeSessionId } from '@/lib/activityLogger'
import { getDefaultPageByRole } from '@/utils/rolePermissions'

// Supabase configuration with correct API key
const supabaseUrl = 'https://bbuxfnchflhtulainndm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc'
const supabase = createClient(supabaseUrl, supabaseKey)

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [rememberMe, setRememberMe] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const user = localStorage.getItem('nexmax_session')
        if (user) {
          try {
            const userData = JSON.parse(user) // Validate JSON
            const defaultPage = getDefaultPageByRole(userData.role)
            console.log('🔍 [LOGIN] User already logged in, redirecting to:', defaultPage)
            router.push(defaultPage)
          } catch (error) {
            console.error('Invalid session data:', error)
            localStorage.removeItem('nexmax_session')
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuth()
  }, []) // Remove router from dependency to prevent re-runs

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Query users table to check credentials
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single()

      if (error || !users) {
        setError('Invalid username or password')
        setLoading(false)
        return
      }

      // Validate role exists in system
      const validRoles = ['admin', 'executive', 'manager_myr', 'manager_sgd', 'manager_usc', 'sq_myr', 'sq_sgd', 'sq_usc', 'analyst', 'ops', 'demo']
      if (!validRoles.includes(users.role)) {
        setError(`Invalid user role: ${users.role}. Please contact administrator.`)
        setLoading(false)
        return
      }

      // Store user data in localStorage
      localStorage.setItem('nexmax_session', JSON.stringify({
        id: users.id,
        username: users.username,
        role: users.role,
        email: users.email || `${users.username}@nexmax.com`
      }))

      // ✅ ACTIVITY TRACKING: Log login activity (except admin)
      console.log('🔍 [LOGIN] User role:', users.role)
      if (users.role !== 'admin') {
        console.log('🔍 [LOGIN] Starting activity tracking for:', users.username)
        
        try {
          const sessionId = generateSessionId()
          storeSessionId(sessionId)
          
          console.log('📝 [LOGIN] Logging activity:', {
            username: users.username,
            role: users.role,
            userId: users.id,
            sessionId
          })
          
          // Log login activity
          const trackingResult = await logActivityViaAPI({
            username: users.username,
            email: users.email || `${users.username}@nexmax.com`,
            role: users.role,
            userId: users.id,
            activityType: 'login',
            accessedPage: '/login',
            sessionId,
            metadata: {
              loginMethod: 'password',
              rememberMe: rememberMe
            }
          })
          
          console.log('✅ [LOGIN] Tracking result:', trackingResult)
        } catch (trackingError) {
          console.error('❌ [LOGIN] Tracking failed:', trackingError)
        }
      } else {
        console.log('ℹ️ [LOGIN] Admin login - no tracking')
      }

      // Redirect based on user role using centralized function
      setTimeout(() => {
        const defaultPage = getDefaultPageByRole(users.role)
        console.log('🔍 [LOGIN] Successful login, redirecting to:', defaultPage)
        router.push(defaultPage)
      }, 100)

    } catch (err) {
      console.error('Login error:', err)
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #87CEEB 0%, #4682B4 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid #fbbf24',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
                <div style={{
         minHeight: '100vh',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
                               background: `linear-gradient(135deg, #1e40af 0%, #3b82f6 25%, #60a5fa 50%, #3b82f6 75%, #1e40af 100%)`,
       backgroundSize: 'cover',
       backgroundPosition: 'center',
       backgroundRepeat: 'no-repeat',
       padding: '20px',
       fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
       position: 'relative'
     }}>
       <div style={{
         position: 'absolute',
         top: 0,
         left: 0,
         right: 0,
         bottom: 0,
         background: 'rgba(0, 0, 0, 0.4)',
         zIndex: 0
       }}></div>
                                                       <div style={{
           background: 'rgba(30, 41, 59, 0.95)',
           backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.15"/><circle cx="20" cy="80" r="0.5" fill="white" opacity="0.15"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>')`,
           padding: '32px',
           borderRadius: '16px',
           boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.3)',
           width: '100%',
           maxWidth: '360px',
           position: 'relative',
           zIndex: 2,
           backdropFilter: 'blur(10px)',
           border: '1px solid rgba(59, 130, 246, 0.3)'
         }}>
                 <form onSubmit={handleSubmit}>
           {/* Logo Section */}
                       <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '3px solid #fbbf24',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Image
                  src="/aset/images (1).jpg"
                  alt="NEXMAX Logo"
                  width={64}
                  height={64}
                  priority
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    width: '100%',
                    height: '100%'
                  }}
                />
              </div>
            </div>
           
                                               <p style={{
              textAlign: 'center',
              color: '#ffffff',
              marginBottom: '24px',
              fontSize: '15px',
              fontWeight: '500'
            }}>Sign in to your account</p>

           {error && (
             <div style={{
               background: '#ef4444',
               color: 'white',
               padding: '12px',
               borderRadius: '8px',
               marginBottom: '20px',
               textAlign: 'center',
               fontSize: '14px'
             }}>
               {error}
             </div>
           )}

                     <div style={{ marginBottom: '16px' }}>
             <div style={{
               position: 'relative',
               display: 'flex',
               alignItems: 'center'
             }}>
                               <div style={{
                  position: 'absolute',
                  left: '12px',
                  color: '#60a5fa',
                  fontSize: '16px'
                }}>
                  👤
                </div>
               <input
                 id="username"
                 type="text"
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 placeholder="Username"
                 required
                 autoComplete="off"
                 disabled={loading}
                 style={{
                   width: '100%',
                   padding: '16px 16px 16px 45px',
                   border: '2px solid #374151',
                   borderRadius: '12px',
                   fontSize: '15px',
                   transition: 'all 0.3s ease',
                   boxSizing: 'border-box',
                   background: 'rgba(51, 65, 85, 0.8)',
                   outline: 'none',
                   fontWeight: '500',
                   color: '#ffffff'
                 }}
               />
             </div>
           </div>

                     <div style={{ marginBottom: '16px' }}>
             <div style={{
               position: 'relative',
               display: 'flex',
               alignItems: 'center'
             }}>
                               <div style={{
                  position: 'absolute',
                  left: '12px',
                  color: '#60a5fa',
                  fontSize: '16px'
                }}>
                  🔒
                </div>
               <input
                 id="password"
                 type="password"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 placeholder="Password"
                 required
                 autoComplete="off"
                 disabled={loading}
                 style={{
                   width: '100%',
                   padding: '16px 16px 16px 45px',
                   border: '2px solid #374151',
                   borderRadius: '12px',
                   fontSize: '15px',
                   transition: 'all 0.3s ease',
                   boxSizing: 'border-box',
                   background: 'rgba(51, 65, 85, 0.8)',
                   outline: 'none',
                   fontWeight: '500',
                   color: '#ffffff'
                 }}
               />
             </div>
           </div>

          

                     <button
             type="submit"
             disabled={loading}
             style={{
               width: '100%',
               padding: '16px',
               background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
               color: 'white',
               border: 'none',
               borderRadius: '12px',
               fontSize: '15px',
               fontWeight: '600',
               cursor: 'pointer',
               transition: 'all 0.3s ease',
               textTransform: 'uppercase',
               letterSpacing: '1px',
               opacity: loading ? 0.6 : 1,
               boxShadow: '0 8px 25px rgba(30, 64, 175, 0.3)',
               position: 'relative',
               overflow: 'hidden'
             }}
           >
             {loading ? 'Signing In...' : 'Login'}
           </button>

          
        </form>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        body {
          margin: 0;
          padding: 0;
        }
      `}</style>
    </div>
  )
} 