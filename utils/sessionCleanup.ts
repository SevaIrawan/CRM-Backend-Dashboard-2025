// Utility function to clean up session data and prevent looping
export const cleanupSession = () => {
  try {
    // Remove old session keys
    localStorage.removeItem('user')
    localStorage.removeItem('nexmax_session')
    
    // Clear cookies
    document.cookie = 'user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'username=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'user_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  } catch (error) {
    console.error('Session cleanup error:', error)
  }
}

export const validateSession = () => {
  try {
    // Check for force logout flag (except admin)
    const forceLogoutFlag = localStorage.getItem('nexmax_force_logout_all') || sessionStorage.getItem('nexmax_force_logout_all')
    
    const session = localStorage.getItem('nexmax_session')
    if (!session) return null
    
    const sessionData = JSON.parse(session)
    
    // If force logout flag exists and user is NOT admin, force logout
    if (forceLogoutFlag && sessionData.role !== 'admin') {
      console.log('🚪 Force logout detected for non-admin user:', sessionData.username)
      cleanupSession()
      // Clear the flag after logout (one-time use)
      localStorage.removeItem('nexmax_force_logout_all')
      sessionStorage.removeItem('nexmax_force_logout_all')
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return null
    }
    
    return sessionData
  } catch (error) {
    console.error('Session validation error:', error)
    cleanupSession()
    return null
  }
} 