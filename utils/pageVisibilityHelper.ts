/**
 * Page Visibility Helper Functions
 * 
 * Purpose: Fetch page visibility from database with fallback to hardcoded config
 * Features: Caching, error handling, automatic fallback
 */

// Types
export interface PageVisibilityData {
  id: string
  page_path: string
  page_name: string
  page_section: string
  visible_for_roles: string[]
  status: 'running' | 'building'
  created_at: string
  updated_at: string
}

export interface PageVisibilityCache {
  data: PageVisibilityData[]
  timestamp: number
  ttl: number // Time to live in milliseconds
}

// Cache configuration
const CACHE_TTL = 60 * 1000 // 1 minute cache
const CACHE_KEY = 'nexmax_page_visibility_cache'

// Fallback configuration (current hardcoded system)
const FALLBACK_HIDDEN_PAGES = {
  '/myr/member-analytic': ['admin'],
  '/myr/churn-member': ['admin'],
  '/sgd/member-analytic': ['admin'],
  '/sgd/churn-member': ['admin'],
  '/usc/member-analytic': ['admin'],
  '/usc/churn-member': ['admin']
}

/**
 * Get cached page visibility data
 */
export function getCachedPageVisibility(): PageVisibilityData[] | null {
  try {
    if (typeof window === 'undefined') return null
    
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const cacheData: PageVisibilityCache = JSON.parse(cached)
    const now = Date.now()
    
    // Check if cache is still valid
    if (now - cacheData.timestamp > cacheData.ttl) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return cacheData.data
  } catch (error) {
    console.warn('⚠️ [PageVisibility] Cache read error:', error)
    return null
  }
}

/**
 * Set cached page visibility data
 */
export function setCachedPageVisibility(data: PageVisibilityData[]): void {
  try {
    if (typeof window === 'undefined') return
    
    const cacheData: PageVisibilityCache = {
      data,
      timestamp: Date.now(),
      ttl: CACHE_TTL
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    console.log('✅ [PageVisibility] Data cached successfully')
  } catch (error) {
    console.warn('⚠️ [PageVisibility] Cache write error:', error)
  }
}

/**
 * Fetch page visibility from API
 */
export async function fetchPageVisibilityFromAPI(): Promise<PageVisibilityData[]> {
  try {
    console.log('🔍 [PageVisibility] Fetching from API...')
    
    const response = await fetch('/api/page-visibility', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'API returned error')
    }
    
    console.log('✅ [PageVisibility] API data fetched:', result.count, 'pages')
    return result.data || []
    
  } catch (error) {
    console.error('❌ [PageVisibility] API fetch error:', error)
    throw error
  }
}

/**
 * Generate fallback page visibility data
 */
export function generateFallbackPageVisibility(): PageVisibilityData[] {
  console.log('🔄 [PageVisibility] Using fallback configuration')
  
  // All pages with default access (based on current sidebar config)
  const allPages: Array<{
    path: string
    name: string
    section: string
    defaultRoles: string[]
  }> = [
    // Dashboard
    { path: '/dashboard', name: 'Dashboard', section: 'Other', defaultRoles: ['admin', 'executive', 'manager_myr', 'manager_sgd', 'manager_usc', 'sq_myr', 'sq_sgd', 'sq_usc'] },
    
    // MYR Pages
    { path: '/myr/overview', name: 'Overview', section: 'MYR', defaultRoles: ['admin', 'executive', 'manager_myr', 'sq_myr'] },
    { path: '/myr/member-analytic', name: 'Member Analytic', section: 'MYR', defaultRoles: ['admin'] },
    { path: '/myr/brand-performance-trends', name: 'Brand Comparison Trends', section: 'MYR', defaultRoles: ['admin', 'executive', 'manager_myr', 'sq_myr'] },
    { path: '/myr/kpi-comparison', name: 'KPI Comparison', section: 'MYR', defaultRoles: ['admin', 'executive', 'manager_myr', 'sq_myr'] },
    { path: '/myr/overall-label', name: 'Overall Label', section: 'MYR', defaultRoles: ['admin', 'executive', 'manager_myr', 'sq_myr'] },
    { path: '/myr/aia-candy-tracking', name: 'AIA Candy Mechanism', section: 'MYR', defaultRoles: ['admin', 'executive', 'manager_myr', 'sq_myr'] },
    { path: '/myr/auto-approval-monitor', name: 'Deposit Auto-Approval', section: 'MYR', defaultRoles: ['admin', 'executive', 'manager_myr', 'sq_myr'] },
    { path: '/myr/auto-approval-withdraw', name: 'Withdrawal Auto-Approval', section: 'MYR', defaultRoles: ['admin', 'executive', 'manager_myr', 'sq_myr'] },
    { path: '/myr/customer-retention', name: 'Customer Retention', section: 'MYR', defaultRoles: ['admin', 'executive', 'manager_myr', 'sq_myr'] },
    { path: '/myr/churn-member', name: 'Churned Members', section: 'MYR', defaultRoles: ['admin'] },
    { path: '/myr/member-report', name: 'Member Report', section: 'MYR', defaultRoles: ['admin', 'executive', 'manager_myr', 'sq_myr'] },
    
    // SGD Pages
    { path: '/sgd/overview', name: 'Overview', section: 'SGD', defaultRoles: ['admin', 'executive', 'manager_sgd', 'sq_sgd'] },
    { path: '/sgd/member-analytic', name: 'Member Analytic', section: 'SGD', defaultRoles: ['admin'] },
    { path: '/sgd/brand-performance-trends', name: 'Brand Comparison Trends', section: 'SGD', defaultRoles: ['admin', 'executive', 'manager_sgd', 'sq_sgd'] },
    { path: '/sgd/kpi-comparison', name: 'KPI Comparison', section: 'SGD', defaultRoles: ['admin', 'executive', 'manager_sgd', 'sq_sgd'] },
    { path: '/sgd/auto-approval-monitor', name: 'Auto-Approval Monitor', section: 'SGD', defaultRoles: ['admin', 'executive', 'manager_sgd', 'sq_sgd'] },
    { path: '/sgd/customer-retention', name: 'Customer Retention', section: 'SGD', defaultRoles: ['admin', 'executive', 'manager_sgd', 'sq_sgd'] },
    { path: '/sgd/churn-member', name: 'Churned Members', section: 'SGD', defaultRoles: ['admin'] },
    { path: '/sgd/member-report', name: 'Member Report', section: 'SGD', defaultRoles: ['admin', 'executive', 'manager_sgd', 'sq_sgd'] },
    
    // USC Pages
    { path: '/usc/overview', name: 'Overview', section: 'USC', defaultRoles: ['admin', 'executive', 'manager_usc', 'sq_usc'] },
    { path: '/usc/member-analytic', name: 'Member Analytic', section: 'USC', defaultRoles: ['admin'] },
    { path: '/usc/brand-performance-trends', name: 'Brand Comparison Trends', section: 'USC', defaultRoles: ['admin', 'executive', 'manager_usc', 'sq_usc'] },
    { path: '/usc/kpi-comparison', name: 'KPI Comparison', section: 'USC', defaultRoles: ['admin', 'executive', 'manager_usc', 'sq_usc'] },
    { path: '/usc/auto-approval-monitor', name: 'Auto-Approval Monitor', section: 'USC', defaultRoles: ['admin', 'executive', 'manager_usc', 'sq_usc'] },
    { path: '/usc/customer-retention', name: 'Customer Retention', section: 'USC', defaultRoles: ['admin', 'executive', 'manager_usc', 'sq_usc'] },
    { path: '/usc/churn-member', name: 'Churned Members', section: 'USC', defaultRoles: ['admin'] },
    { path: '/usc/member-report', name: 'Member Report', section: 'USC', defaultRoles: ['admin', 'executive', 'manager_usc', 'sq_usc'] },
    { path: '/usc/customer-assignment', name: 'Customer Assignment', section: 'USC', defaultRoles: ['admin', 'manager_usc', 'squad_lead_usc'] },
    { path: '/usc/snr-customers', name: 'SNR Customers', section: 'USC', defaultRoles: ['admin', 'snr_usc', 'manager_usc', 'squad_lead_usc'] },
    
    // MYR SNR Pages
    { path: '/myr/customer-assignment', name: 'Customer Assignment', section: 'MYR', defaultRoles: ['admin', 'manager_myr', 'squad_lead_myr'] },
    { path: '/myr/snr-customers', name: 'SNR Customers', section: 'MYR', defaultRoles: ['admin', 'snr_myr', 'manager_myr', 'squad_lead_myr'] },
    
    // SGD SNR Pages
    { path: '/sgd/customer-assignment', name: 'Customer Assignment', section: 'SGD', defaultRoles: ['admin', 'manager_sgd', 'squad_lead_sgd'] },
    { path: '/sgd/snr-customers', name: 'SNR Customers', section: 'SGD', defaultRoles: ['admin', 'snr_sgd', 'manager_sgd', 'squad_lead_sgd'] },
    
    // Admin & Other Pages
    { path: '/users', name: 'User Management', section: 'Admin', defaultRoles: ['admin'] },
    { path: '/admin/activity-logs', name: 'Activity Logs', section: 'Admin', defaultRoles: ['admin'] },
    { path: '/admin/feedback', name: 'Feedback & Support', section: 'Admin', defaultRoles: ['admin'] },
    { path: '/admin/page-status', name: 'Page Status Management', section: 'Admin', defaultRoles: ['admin'] },
    { path: '/supabase', name: 'Supabase Connection', section: 'Other', defaultRoles: ['admin'] }
  ]
  
  // Convert to PageVisibilityData format
  const fallbackData: PageVisibilityData[] = allPages.map(page => {
    const roleCount = page.defaultRoles.length
    return {
      id: `fallback_${page.path.replace(/\//g, '_')}`,
      page_path: page.path,
      page_name: page.name,
      page_section: page.section,
      visible_for_roles: page.defaultRoles,
      status: roleCount <= 1 ? 'building' : 'running',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  })
  
  console.log('✅ [PageVisibility] Fallback data generated:', fallbackData.length, 'pages')
  return fallbackData
}

/**
 * Get page visibility data (with caching and fallback)
 * 
 * This is the main function that should be used by components
 */
export async function getPageVisibilityData(): Promise<PageVisibilityData[]> {
  try {
    // 1. Try cache first
    const cachedData = getCachedPageVisibility()
    if (cachedData) {
      console.log('✅ [PageVisibility] Using cached data')
      return cachedData
    }
    
    // 2. Try API
    const apiData = await fetchPageVisibilityFromAPI()
    
    // 3. Cache the API data
    setCachedPageVisibility(apiData)
    
    return apiData
    
  } catch (error) {
    console.warn('⚠️ [PageVisibility] API failed, using fallback:', error)
    
    // 4. Use fallback
    const fallbackData = generateFallbackPageVisibility()
    return fallbackData
  }
}

/**
 * Check if a page is visible for a specific role
 */
export function isPageVisibleForRole(
  pagePath: string, 
  userRole: string, 
  pageVisibilityData: PageVisibilityData[]
): boolean {
  // Admin always sees all pages
  if (userRole === 'admin') {
    return true
  }
  
  // Find page in visibility data
  const page = pageVisibilityData.find(p => p.page_path === pagePath)
  
  if (!page) {
    // If page not found in data, assume visible (fallback)
    console.warn('⚠️ [PageVisibility] Page not found in visibility data:', pagePath)
    return true
  }
  
  // Check if role has access
  return page.visible_for_roles.includes(userRole)
}

/**
 * Filter menu items based on page visibility
 */
export function filterMenuItemsByVisibility(
  menuItems: any[], 
  userRole: string, 
  pageVisibilityData: PageVisibilityData[]
): any[] {
  if (userRole === 'admin') {
    return menuItems
  }
  
  return menuItems.map(item => {
    if (item.submenu) {
      return {
        ...item,
        submenu: item.submenu.filter((subItem: any) => 
          isPageVisibleForRole(subItem.path, userRole, pageVisibilityData)
        )
      }
    } else if (item.path) {
      // Check main menu item visibility
      return isPageVisibleForRole(item.path, userRole, pageVisibilityData) ? item : null
    }
    return item
  }).filter(Boolean)
}

/**
 * Clear page visibility cache (for testing or manual refresh)
 */
export function clearPageVisibilityCache(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY)
      console.log('✅ [PageVisibility] Cache cleared')
    }
  } catch (error) {
    console.warn('⚠️ [PageVisibility] Cache clear error:', error)
  }
}
