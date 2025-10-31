// CENTRAL LOGIC PAGE - NEXMAX DASHBOARD
// Semua logic diregistrasikan/dilistkan dalam file ini sesuai rules

// ============================================
// AUTHENTICATION & SESSION LOGIC
// ============================================

export const validateSession = () => {
  try {
    // Check for force logout flag (except admin) and compare with loginAt
    const forceLogoutFlagStr = localStorage.getItem('nexmax_force_logout_all') || sessionStorage.getItem('nexmax_force_logout_all')
    
    const session = localStorage.getItem('nexmax_session')
    if (!session) return null
    
    const sessionData = JSON.parse(session)
    const loginAt = Number(sessionData?.loginAt || 0)
    const forceLogoutFlag = forceLogoutFlagStr ? Number(forceLogoutFlagStr) : 0
    
    // If force logout flag is newer than this session and user is NOT admin, force logout
    if (forceLogoutFlag && (!loginAt || forceLogoutFlag > loginAt) && sessionData.role !== 'admin') {
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

export const cleanupSession = () => {
  try {
    localStorage.removeItem('user')
    localStorage.removeItem('nexmax_session')
    document.cookie = 'user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'username=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'user_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  } catch (error) {
    console.error('Session cleanup error:', error)
  }
}

// ============================================
// THEME & UI LOGIC
// ============================================

export const handleThemeToggle = (darkMode: boolean, setDarkMode: (value: boolean) => void) => {
  const newDarkMode = !darkMode
  setDarkMode(newDarkMode)
  localStorage.setItem('darkMode', newDarkMode.toString())
  if (newDarkMode) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const initializeTheme = () => {
  const isDark = localStorage.getItem('darkMode') === 'true'
  if (isDark) {
    document.documentElement.classList.add('dark')
  }
  return isDark
}

// ============================================
// LAYOUT LOGIC - RESPONSIVE ADJUSTMENTS
// ============================================

export const calculateContainerDimensions = (sidebarOpen: boolean) => {
  const sidebarWidth = sidebarOpen ? '280px' : '80px'
  const headerHeight = '70px'
  const subHeaderHeight = '60px'
  
  return {
    sidebarWidth,
    headerHeight,
    subHeaderHeight,
    mainContentWidth: `calc(100% - ${sidebarWidth})`,
    mainContentHeight: `calc(100vh - ${headerHeight} - ${subHeaderHeight})`,
    containerPadding: '24px'
  }
}

// ============================================
// STANDARD FRAME LOGIC
// ============================================

export const generateStandardFrameStyle = (sidebarOpen: boolean) => {
  const dimensions = calculateContainerDimensions(sidebarOpen)
  
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    padding: dimensions.containerPadding,
    
    // Standard 3-row layout
    gridTemplateRows: 'auto 1fr 1fr',
    minHeight: '100%'
  }
}

// ============================================
// KPI CARD LOGIC
// ============================================

export const standardKPICardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  border: '1px solid #e5e7eb',
  minHeight: '120px',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between'
}

// ============================================
// CHART CONTAINER LOGIC
// ============================================

export const standardChartStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  border: '1px solid #e5e7eb',
  minHeight: '400px',
  display: 'flex',
  flexDirection: 'column' as const
}

// ============================================
// SLICER LOGIC
// ============================================

export const standardSlicerStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  fontSize: '14px',
  minWidth: '120px',
  outline: 'none',
  cursor: 'pointer'
}

// ============================================
// SIDEBAR LOGIC
// ============================================

export const handleSidebarToggle = (
  sidebarOpen: boolean, 
  setSidebarOpen: (value: boolean) => void
) => {
  setSidebarOpen(!sidebarOpen)
  localStorage.setItem('sidebarOpen', (!sidebarOpen).toString())
}

export const initializeSidebar = () => {
  const isOpen = localStorage.getItem('sidebarOpen') !== 'false'
  return isOpen
}

// ============================================
// DATABASE OPERATION LOGIC
// ============================================

export const handleDatabaseError = (error: any, operation: string) => {
  console.error(`❌ ${operation} error:`, error)
  
  if (error.code === '23505') {
    return 'Data already exists. Please use different values.'
  } else if (error.code === 'PGRST204') {
    return 'Database schema mismatch. Please contact administrator.'
  } else if (error.message?.includes('JWT')) {
    return 'Authentication expired. Please login again.'
  } else {
    return `Failed to ${operation.toLowerCase()}: ${error.message || 'Unknown error'}`
  }
}

// ============================================
// ROLE DISPLAY LOGIC
// ============================================

export const getRoleDisplayName = (role: string) => {
  switch (role.toLowerCase()) {
    case 'hod department':
      return 'USC_DEP'
    case 'top manager':
      return 'TOP MANAGER'
    case 'admin':
      return 'ADMIN'
    case 'manager':
      return 'MANAGER'
    case 'user':
      return 'USER'
    case 'executive':
      return 'EXECUTIVE'
    case 'usc_dep':
      return 'USC_DEP'
    default:
      return role.toUpperCase()
  }
}

// ============================================
// FORM VALIDATION LOGIC
// ============================================

export const validateUserForm = (formData: any) => {
  const errors: string[] = []
  
  if (!formData.username?.trim()) {
    errors.push('Username is required')
  }
  
  if (!formData.password?.trim()) {
    errors.push('Password is required')
  } else if (formData.password.length < 6) {
    errors.push('Password must be at least 6 characters')
  }
  
  return errors
}

// ============================================
// SUCCESS FEEDBACK LOGIC
// ============================================

export const showSuccessMessage = (message: string) => {
  // Future: Replace alert with custom toast notification
  alert(`✅ ${message}`)
}

export const showErrorMessage = (message: string) => {
  // Future: Replace alert with custom toast notification
  alert(`❌ ${message}`)
}

// ============================================
// COMING SOON PAGE LOGIC
// ============================================

export const generateComingSoonContent = (pageName: string) => {
  return {
    title: `${pageName} - Coming Soon`,
    description: 'This page is under development and will be available soon.',
    features: [
      'Advanced analytics and reporting',
      'Real-time data visualization',
      'Interactive dashboards',
      'Export capabilities'
    ]
  }
}

// ============================================
// EXPORT ALL LOGIC FUNCTIONS
// ============================================

export const CentralLogic = {
  // Authentication
  validateSession,
  cleanupSession,
  
  // Theme
  handleThemeToggle,
  initializeTheme,
  
  // Layout
  calculateContainerDimensions,
  generateStandardFrameStyle,
  
  // Styles
  standardKPICardStyle,
  standardChartStyle,
  standardSlicerStyle,
  
  // Sidebar
  handleSidebarToggle,
  initializeSidebar,
  
  // Database
  handleDatabaseError,
  
  // Role
  getRoleDisplayName,
  
  // Validation
  validateUserForm,
  
  // Feedback
  showSuccessMessage,
  showErrorMessage,
  
  // Coming Soon
  generateComingSoonContent
}

export default CentralLogic