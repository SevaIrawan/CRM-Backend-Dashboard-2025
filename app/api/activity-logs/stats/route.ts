import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/activity-logs/stats
 * 
 * Purpose: Get activity statistics for admin dashboard
 * Access: Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today' // today, week, month
    
    console.log('📊 [ActivityLogs] Fetching stats for period:', period)
    
    // Calculate date range based on period
    const now = new Date()
    let startDate: string
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        startDate = weekAgo.toISOString()
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        startDate = monthAgo.toISOString()
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    }
    
    // 1. Total logins today
    const { count: totalLogins } = await supabase
      .from('user_activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('activity_type', 'login')
      .gte('timestamp', startDate)
    
    // 2. Active users now (logged in within last 30 minutes)
    const activeThreshold = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
    const { data: activeUsers } = await supabase
      .from('user_activity_logs')
      .select('username, role')
      .gte('timestamp', activeThreshold)
      .order('timestamp', { ascending: false })
    
    // Get unique active users
    const uniqueActiveUsers = new Set(activeUsers?.map(u => u.username) || [])
    
    // 3. Average session duration (from logout events)
    const { data: logoutEvents } = await supabase
      .from('user_activity_logs')
      .select('session_duration')
      .eq('activity_type', 'logout')
      .gte('timestamp', startDate)
      .not('session_duration', 'is', null)
    
    const avgSessionDuration = logoutEvents?.length 
      ? Math.round(logoutEvents.reduce((sum, event) => sum + (Number(event.session_duration) || 0), 0) / logoutEvents.length)
      : 0
    
    // 4. Most visited pages
    const { data: pageViews } = await supabase
      .from('user_activity_logs')
      .select('page_title, accessed_page')
      .eq('activity_type', 'page_view')
      .gte('timestamp', startDate)
      .not('page_title', 'is', null)
    
    // Count page visits
    const pageCounts: { [key: string]: number } = {}
    pageViews?.forEach(view => {
      const key = (view.page_title || view.accessed_page || 'Unknown') as string
      pageCounts[key] = (pageCounts[key] || 0) + 1
    })
    
    const mostVisitedPages = Object.entries(pageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([page, count]) => ({ page, visits: count }))
    
    // 5. Most active users
    const { data: allActivities } = await supabase
      .from('user_activity_logs')
      .select('username, role')
      .gte('timestamp', startDate)
    
    const userCounts: { [key: string]: { count: number, role: string } } = {}
    allActivities?.forEach(activity => {
      const username = activity.username
      if (userCounts[username]) {
        userCounts[username].count++
      } else {
        userCounts[username] = { count: 1, role: activity.role }
      }
    })
    
    const mostActiveUsers = Object.entries(userCounts)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5)
      .map(([username, data]) => ({ username, activities: data.count, role: data.role }))
    
    // 6. Activity by role
    const { data: roleActivities } = await supabase
      .from('user_activity_logs')
      .select('role')
      .gte('timestamp', startDate)
    
    const roleCounts: { [key: string]: number } = {}
    roleActivities?.forEach(activity => {
      const role = activity.role
      roleCounts[role] = (roleCounts[role] || 0) + 1
    })
    
    const activityByRole = Object.entries(roleCounts)
      .map(([role, count]) => ({ role, activities: count }))
      .sort((a, b) => b.activities - a.activities)
    
    const stats = {
      period,
      totalLogins: totalLogins || 0,
      activeUsersNow: uniqueActiveUsers.size,
      avgSessionDurationMinutes: Math.round(avgSessionDuration / 60),
      mostVisitedPages,
      mostActiveUsers,
      activityByRole
    }
    
    console.log('✅ [ActivityLogs] Stats calculated:', stats)
    
    return NextResponse.json({
      success: true,
      stats
    })
    
  } catch (error) {
    console.error('❌ [ActivityLogs] Error fetching stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
