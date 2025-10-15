import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/page-visibility
 * 
 * Purpose: Fetch all page visibility configuration
 * Usage: Used by Sidebar and Admin UI
 * 
 * Query Parameters:
 * - section?: Filter by page section (MYR, SGD, USC, Admin, Other)
 * - status?: Filter by status (running, building)
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: Array<{
 *     id: string,
 *     page_path: string,
 *     page_name: string,
 *     page_section: string,
 *     visible_for_roles: string[],
 *     status: 'running' | 'building',
 *     created_at: string,
 *     updated_at: string
 *   }>,
 *   count: number
 * }
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [PageVisibility API] GET request received')
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')
    const status = searchParams.get('status')
    
    console.log('📋 [PageVisibility API] Query params:', { section, status })
    
    // Build Supabase query
    let query = supabase
      .from('page_visibility_config')
      .select('*')
      .order('page_section', { ascending: true })
      .order('page_name', { ascending: true })
    
    // Apply section filter if provided
    if (section && section !== 'all') {
      query = query.eq('page_section', section)
      console.log('🔍 [PageVisibility API] Filtering by section:', section)
    }
    
    // Execute query
    const { data, error } = await query
    
    if (error) {
      console.error('❌ [PageVisibility API] Supabase error:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch page visibility data',
          details: error.message 
        },
        { status: 500 }
      )
    }
    
    if (!data) {
      console.warn('⚠️ [PageVisibility API] No data returned')
      return NextResponse.json(
        { 
          success: false, 
          error: 'No page visibility data found' 
        },
        { status: 404 }
      )
    }
    
    console.log('✅ [PageVisibility API] Fetched', data.length, 'pages')
    
    // Process data to add status field
    const processedData = data.map(page => {
      const roleCount = Array.isArray(page.visible_for_roles) 
        ? page.visible_for_roles.length 
        : 0
      
      return {
        ...page,
        visible_for_roles: Array.isArray(page.visible_for_roles) 
          ? page.visible_for_roles 
          : [],
        status: roleCount <= 1 ? 'building' : 'running'
      }
    })
    
    // Apply status filter if provided
    let filteredData = processedData
    if (status && status !== 'all') {
      filteredData = processedData.filter(page => page.status === status)
      console.log('🔍 [PageVisibility API] Filtering by status:', status, '- Found', filteredData.length, 'pages')
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: filteredData,
      count: filteredData.length,
      total: data.length,
      filters: {
        section: section || 'all',
        status: status || 'all'
      }
    })
    
  } catch (error) {
    console.error('❌ [PageVisibility API] Exception:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/page-visibility
 * 
 * Purpose: Create new page visibility entry (admin only)
 * Usage: Admin UI - Add new pages
 * 
 * Body:
 * {
 *   page_path: string,
 *   page_name: string,
 *   page_section: string,
 *   visible_for_roles: string[]
 * }
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [PageVisibility API] POST request received')
    
    // Parse request body
    const body = await request.json()
    const { page_path, page_name, page_section, visible_for_roles } = body
    
    // Validate required fields
    if (!page_path || !page_name || !page_section) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: page_path, page_name, page_section' 
        },
        { status: 400 }
      )
    }
    
    // Validate visible_for_roles
    const roles = Array.isArray(visible_for_roles) ? visible_for_roles : []
    
    console.log('➕ [PageVisibility API] Creating page:', { page_path, page_name, page_section, roles })
    
    // Insert new page
    const { data, error } = await supabase
      .from('page_visibility_config')
      .insert([{
        page_path,
        page_name,
        page_section,
        visible_for_roles: roles
      }])
      .select()
      .single()
    
    if (error) {
      console.error('❌ [PageVisibility API] Insert error:', error)
      
      // Handle duplicate key error
      if (error.code === '23505') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Page already exists',
            details: `Page path '${page_path}' is already configured`
          },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create page visibility entry',
          details: error.message 
        },
        { status: 500 }
      )
    }
    
    console.log('✅ [PageVisibility API] Created page:', data)
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        ...data,
        visible_for_roles: Array.isArray(data.visible_for_roles) 
          ? data.visible_for_roles 
          : [],
        status: data.visible_for_roles?.length <= 1 ? 'building' : 'running'
      },
      message: 'Page visibility entry created successfully'
    })
    
  } catch (error) {
    console.error('❌ [PageVisibility API] POST exception:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
