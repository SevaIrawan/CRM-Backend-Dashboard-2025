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
    const session = localStorage.getItem('nexmax_session')
    if (!session) return null
    
    const sessionData = JSON.parse(session)
    return sessionData
  } catch (error) {
    console.error('Session validation error:', error)
    cleanupSession()
    return null
  }
} 