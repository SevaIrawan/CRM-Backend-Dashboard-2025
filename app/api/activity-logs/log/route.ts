import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/activity-logs/log
 * 
 * Purpose: Log user activity (login, logout, page_view)
 * Access: All authenticated users (except admin - filtered client-side)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      username,
      email,
      role,
      userId,
      activityType,
      userAgent,
      deviceType,
      browser,
      os,
      accessedPage,
      pageTitle,
      referrer,
      sessionId,
      sessionDuration,
      metadata
    } = body
    
    // Validation (email is optional for backward compatibility)
    if (!username || !role || !activityType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: username, role, activityType are required'
      }, { status: 400 })
    }
    
    // Use email if provided, otherwise use default
    const finalEmail = email || `${username}@nexmax.com`
    
    // ✅ SKIP LOGGING FOR ADMIN USERS
    if (role === 'admin') {
      console.log(`⏭️ [ActivityLog] Skipping log for admin user: ${username}`)
      return NextResponse.json({
        success: true,
        message: 'Admin activity not logged'
      })
    }
    
    // Get client IP address
    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'Unknown'
    
    // Parse user agent if provided
    let parsedUserAgent = {
      deviceType: deviceType || 'Unknown',
      browser: browser || 'Unknown',
      os: os || 'Unknown'
    }
    
    if (userAgent && !deviceType) {
      parsedUserAgent = parseUserAgent(userAgent)
    }
    
    // Get page title from accessed page if not provided
    const finalPageTitle = pageTitle || (accessedPage ? getPageTitle(accessedPage) : null)
    
    // Prepare log entry
    const logEntry = {
      user_id: userId || null,
      username,
      email: finalEmail,
      role,
      activity_type: activityType,
      ip_address: ipAddress,
      user_agent: userAgent || null,
      device_type: parsedUserAgent.deviceType,
      browser: parsedUserAgent.browser,
      os: parsedUserAgent.os,
      accessed_page: accessedPage || null,
      page_title: finalPageTitle,
      referrer: referrer || null,
      session_id: sessionId || null,
      session_duration: sessionDuration || null,
      metadata: metadata || null,
      timestamp: new Date().toISOString()
    }
    
    // Insert log to database
    const { error } = await supabase
      .from('user_activity_logs')
      .insert([logEntry])
    
    if (error) {
      console.error('❌ [ActivityLog] Database error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to log activity',
        details: error.message
      }, { status: 500 })
    }
    
    console.log(`✅ [ActivityLog] ${activityType} logged for ${username} (${role}) from ${ipAddress}`)
    
    return NextResponse.json({
      success: true,
      message: 'Activity logged successfully'
    })
    
  } catch (error) {
    console.error('❌ [ActivityLog] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
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
 * Get page title from URL path
 */
function getPageTitle(path: string): string {
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
    '/myr/churn-member': 'MYR Churned Members',
    '/myr/brand-performance-trends': 'MYR Brand Performance Trends',
    '/myr/auto-approval-monitor': 'MYR Auto-Approval Monitor',
    '/myr/auto-approval-withdraw': 'MYR Auto-Approval Withdraw',
    '/myr/aia-candy-tracking': 'MYR AIA Candy Tracking',
    '/myr/overall-label': 'MYR Overall Label',
    
    // SGD Pages
    '/sgd': 'SGD Dashboard',
    '/sgd/kpi-comparison': 'SGD KPI Comparison',
    '/sgd/member-report': 'SGD Member Report',
    '/sgd/customer-retention': 'SGD Customer Retention',
    '/sgd/churn-member': 'SGD Churned Members',
    '/sgd/brand-performance-trends': 'SGD Brand Performance Trends',
    
    // USC Pages
    '/usc': 'USC Dashboard',
    '/usc/overview': 'USC Overview',
    '/usc/member-analytic': 'USC Member Analytic',
    '/usc/kpi-comparison': 'USC KPI Comparison',
    '/usc/member-report': 'USC Member Report',
    '/usc/customer-retention': 'USC Customer Retention',
    '/usc/churn-member': 'USC Churned Members',
    '/usc/brand-performance-trends': 'USC Brand Performance Trends',
    
    // Supabase
    '/supabase': 'Supabase Management'
  }
  
  return pageMapping[path] || path
}

