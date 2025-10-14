import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/activity-logs/export
 * 
 * Purpose: Export activity logs to CSV for admin
 * Access: Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      startDate,
      endDate,
      username,
      role,
      activityType,
      ipAddress,
      pageAccessed
    } = body
    
    console.log('📤 [ActivityLogs] Exporting logs with filters:', {
      startDate, endDate, username, role, activityType, ipAddress, pageAccessed
    })
    
    // Build query
    let query = supabase
      .from('user_activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50000) // Limit to prevent memory issues
    
    // Apply filters
    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    
    if (endDate) {
      query = query.lte('timestamp', endDate)
    }
    
    if (username) {
      query = query.ilike('username', `%${username}%`)
    }
    
    if (role) {
      query = query.eq('role', role)
    }
    
    if (activityType) {
      query = query.eq('activity_type', activityType)
    }
    
    if (ipAddress) {
      query = query.ilike('ip_address', `%${ipAddress}%`)
    }
    
    if (pageAccessed) {
      query = query.ilike('accessed_page', `%${pageAccessed}%`)
    }
    
    // Execute query
    const { data, error } = await query
    
    if (error) {
      console.error('❌ [ActivityLogs] Export error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to export activity logs',
        details: error.message
      }, { status: 500 })
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data found for export'
      }, { status: 404 })
    }
    
    // Define CSV columns
    const csvColumns = [
      'timestamp',
      'username',
      'email',
      'role',
      'activity_type',
      'ip_address',
      'device_type',
      'browser',
      'os',
      'accessed_page',
      'page_title',
      'referrer',
      'session_duration',
      'session_id'
    ]
    
    // Create CSV header
    const csvHeader = [
      'Timestamp',
      'Username',
      'Email',
      'Role',
      'Activity Type',
      'IP Address',
      'Device Type',
      'Browser',
      'OS',
      'Page Accessed',
      'Page Title',
      'Referrer',
      'Session Duration (seconds)',
      'Session ID'
    ].join(',')
    
    // Create CSV rows
    const csvRows = data.map(row => {
      return csvColumns.map(col => {
        const value = (row as any)[col]
        
        // Handle null/undefined values
        if (value === null || value === undefined || value === '') {
          return '-'
        }
        
        // Format session duration
        if (col === 'session_duration' && typeof value === 'number') {
          return value.toString()
        }
        
        // Format timestamp in GMT+7
        if (col === 'timestamp') {
          const date = new Date(value)
          const gmt7Time = new Date(date.getTime() + (7 * 60 * 60 * 1000))
          return gmt7Time.toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        }
        
        // Escape commas and quotes in string values
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        
        return stringValue
      }).join(',')
    })
    
    // Combine header and rows
    const csvContent = [csvHeader, ...csvRows].join('\n')
    
    // Add BOM (Byte Order Mark) for proper UTF-8 encoding in Excel
    const csvWithBOM = '\ufeff' + csvContent
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `activity_logs_export_${timestamp}.csv`
    
    console.log(`✅ [ActivityLogs] Export completed: ${data.length} records`)
    
    // Return CSV file
    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('❌ [ActivityLogs] Export error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error during export'
    }, { status: 500 })
  }
}
