import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/activity-logs/data
 * 
 * Purpose: Fetch user activity logs for admin viewing
 * Access: Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const username = searchParams.get('username')
    const role = searchParams.get('role')
    const activityType = searchParams.get('activityType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const ipAddress = searchParams.get('ipAddress')
    const pageAccessed = searchParams.get('pageAccessed')
    
    console.log('📊 [ActivityLogs] Fetching logs with params:', {
      page, limit, username, role, activityType, startDate, endDate, ipAddress, pageAccessed
    })
    
    // Build query
    let query = supabase
      .from('user_activity_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
    
    // Apply filters
    if (username) {
      query = query.ilike('username', `%${username}%`)
    }
    
    if (role) {
      query = query.eq('role', role)
    }
    
    if (activityType) {
      query = query.eq('activity_type', activityType)
    }
    
    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate)
    }
    
    if (ipAddress) {
      query = query.ilike('ip_address', `%${ipAddress}%`)
    }
    
    if (pageAccessed) {
      query = query.ilike('accessed_page', `%${pageAccessed}%`)
    }
    
    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    
    // Execute query
    const { data, error, count } = await query
    
    if (error) {
      console.error('❌ [ActivityLogs] Database error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch activity logs',
        details: error.message
      }, { status: 500 })
    }
    
    // Calculate pagination info
    const totalRecords = count || 0
    const totalPages = Math.ceil(totalRecords / limit)
    
    const pagination = {
      currentPage: page,
      totalPages,
      totalRecords,
      recordsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
    
    console.log(`✅ [ActivityLogs] Fetched ${data?.length || 0} logs (page ${page}/${totalPages})`)
    
    return NextResponse.json({
      success: true,
      data: data || [],
      pagination
    })
    
  } catch (error) {
    console.error('❌ [ActivityLogs] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
