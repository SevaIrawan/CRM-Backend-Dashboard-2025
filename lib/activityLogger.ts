/**
 * Activity Logger Utility
 * 
 * Purpose: Track user activities for admin monitoring
 * Features: Login, Logout, Page Views with full details
 * 
 * Usage:
 * - logActivity({ type: 'login', username, email, role, ... })
 * - logActivity({ type: 'logout', username, sessionDuration, ... })
 * - logActivity({ type: 'page_view', username, page, ... })
 */

import { supabase } from './supabase'

export interface ActivityLogData {
  // User Info
  username: string
  email: string
  role: string
  userId?: string
  
  // Activity Type
  activityType: 'login' | 'logout' | 'page_view'
  
  // Network Info
  ipAddress?: string
  userAgent?: string
  deviceType?: string
  browser?: string
  os?: string
  
  // Page Info (for page_view)
  accessedPage?: string
  pageTitle?: string
  referrer?: string
  
  // Session Info
  sessionId?: string | null
  sessionDuration?: number | null // in seconds (for logout)
  
  // Additional metadata
  metadata?: any
}

/**
 * Parse User Agent to extract device type, browser, and OS
 */
function parseUserAgent(userAgent: string): {
  deviceType: string
  browser: string
  os: string
} {
  const ua = userAgent.toLowerCase()
  
  // Detect Device Type
  let deviceType = 'Desktop'
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    deviceType = 'Tablet'
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    deviceType = 'Mobile'
  }
  
  // Detect Browser
  let browser = 'Unknown'
  if (ua.indexOf('edg') > -1) browser = 'Edge'
  else if (ua.indexOf('chrome') > -1 && ua.indexOf('edg') === -1) browser = 'Chrome'
  else if (ua.indexOf('safari') > -1 && ua.indexOf('chrome') === -1) browser = 'Safari'
  else if (ua.indexOf('firefox') > -1) browser = 'Firefox'
  else if (ua.indexOf('msie') > -1 || ua.indexOf('trident') > -1) browser = 'IE'
  else if (ua.indexOf('opera') > -1 || ua.indexOf('opr') > -1) browser = 'Opera'
  
  // Detect OS
  let os = 'Unknown'
  if (ua.indexOf('win') > -1) os = 'Windows'
  else if (ua.indexOf('mac') > -1) os = 'macOS'
  else if (ua.indexOf('linux') > -1) os = 'Linux'
  else if (ua.indexOf('android') > -1) os = 'Android'
  else if (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1) os = 'iOS'
  
  return { deviceType, browser, os }
}

/**
 * Get client IP address (best effort)
 * Note: In production, you might need to check X-Forwarded-For headers
 */
export function getClientIP(): string | undefined {
  // This will be implemented in the API route
  // Client-side cannot reliably get IP address
  return undefined
}

/**
 * Get page title from URL path
 */
export function getPageTitle(path: string): string {
  const pageMapping: { [key: string]: string } = {
    '/dashboard': 'Main Dashboard',
    '/login': 'Login Page',
    '/users': 'User Management',
    '/users/activity-logs': 'Activity Logs (Admin)',
    
    // MYR Pages
    '/myr': 'MYR Dashboard',
    '/myr/overview': 'MYR Overview',
    '/myr/member-analytic': 'MYR Member Analytic',
    '/myr/kpi-comparison': 'MYR KPI Comparison',
    '/myr/member-report': 'MYR Member Report',
    '/myr/customer-retention': 'MYR Customer Retention',
    '/myr/churn-member': 'MYR Churn Member',
    '/myr/brand-performance-trends': 'MYR Brand Comparison Trends',
    '/myr/auto-approval-monitor': 'MYR Auto-Approval Monitor',
    '/myr/auto-approval-withdraw': 'MYR Auto-Approval Withdraw',
    '/myr/aia-candy-tracking': 'MYR AIA Candy Mechanism',
    '/myr/overall-label': 'MYR Overall Label',
    
    // SGD Pages
    '/sgd': 'SGD Dashboard',
    '/sgd/kpi-comparison': 'SGD KPI Comparison',
    '/sgd/member-report': 'SGD Member Report',
    '/sgd/customer-retention': 'SGD Customer Retention',
    '/sgd/churn-member': 'SGD Churn Member',
    '/sgd/brand-performance-trends': 'SGD Brand Comparison Trends',
    
    // USC Pages
    '/usc': 'USC Dashboard',
    '/usc/overview': 'USC Overview',
    '/usc/member-analytic': 'USC Member Analytic',
    '/usc/kpi-comparison': 'USC KPI Comparison',
    '/usc/member-report': 'USC Member Report',
    '/usc/customer-retention': 'USC Customer Retention',
    '/usc/churn-member': 'USC Churn Member',
    '/usc/brand-performance-trends': 'USC Brand Comparison Trends',
    
    // Supabase
    '/supabase': 'Supabase Management'
  }
  
  return pageMapping[path] || path
}

/**
 * Log user activity to database
 * 
 * @param data Activity log data
 * @returns Promise<boolean> Success status
 */
export async function logActivity(data: ActivityLogData): Promise<boolean> {
  try {
    // Parse user agent if provided
    let deviceInfo = { deviceType: 'Unknown', browser: 'Unknown', os: 'Unknown' }
    if (data.userAgent) {
      deviceInfo = parseUserAgent(data.userAgent)
    }
    
    // Prepare log entry
    const logEntry = {
      user_id: data.userId || null,
      username: data.username,
      email: data.email,
      role: data.role,
      activity_type: data.activityType,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null,
      device_type: data.deviceType || deviceInfo.deviceType,
      browser: data.browser || deviceInfo.browser,
      os: data.os || deviceInfo.os,
      accessed_page: data.accessedPage || null,
      page_title: data.pageTitle || (data.accessedPage ? getPageTitle(data.accessedPage) : null),
      referrer: data.referrer || null,
      session_id: data.sessionId || null,
      session_duration: data.sessionDuration || null,
      metadata: data.metadata || null,
      timestamp: new Date().toISOString()
    }
    
    // Insert log to database
    const { error } = await supabase
      .from('user_activity_logs')
      .insert([logEntry])
    
    if (error) {
      console.error('❌ [ActivityLogger] Error logging activity:', error)
      return false
    }
    
    console.log(`✅ [ActivityLogger] ${data.activityType} logged for ${data.username}`)
    return true
    
  } catch (error) {
    console.error('❌ [ActivityLogger] Exception:', error)
    return false
  }
}

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * Store session ID in localStorage
 */
export function storeSessionId(sessionId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nexmax_session_id', sessionId)
    localStorage.setItem('nexmax_session_start', Date.now().toString())
  }
}

/**
 * Get stored session ID
 */
export function getStoredSessionId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nexmax_session_id')
  }
  return null
}

/**
 * Clear stored session ID
 */
export function clearStoredSessionId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('nexmax_session_id')
    localStorage.removeItem('nexmax_session_start')
  }
}

/**
 * Calculate session duration
 */
export function calculateSessionDuration(): number | undefined {
  if (typeof window !== 'undefined') {
    const startTime = localStorage.getItem('nexmax_session_start')
    if (startTime) {
      return Math.floor((Date.now() - parseInt(startTime)) / 1000)
    }
  }
  return undefined
}

/**
 * Log activity via API (client-side usage)
 * This is preferred for client-side tracking as it can capture IP address
 */
export async function logActivityViaAPI(data: Omit<ActivityLogData, 'ipAddress' | 'userAgent'>): Promise<boolean> {
  try {
    // Get user agent from browser
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    const referrer = typeof window !== 'undefined' ? document.referrer : undefined
    
    const response = await fetch('/api/activity-logs/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data,
        userAgent,
        referrer
      })
    })
    
    if (!response.ok) {
      console.error('❌ [ActivityLogger] API error:', await response.text())
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ [ActivityLogger] API exception:', error)
    return false
  }
}



/**
 * Clear session data
 */
export function clearSessionData(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('user_session_id')
    sessionStorage.removeItem('session_start_time')
  }
}

