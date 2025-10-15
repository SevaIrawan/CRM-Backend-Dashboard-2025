import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/page-visibility/toggle
 * 
 * Purpose: Toggle page visibility for specific roles (admin only)
 * Usage: Admin UI - Toggle page access per role
 * 
 * Body:
 * {
 *   page_path: string,
 *   role: string,
 *   action: 'grant' | 'revoke'
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: {
 *     page_path: string,
 *     visible_for_roles: string[],
 *     status: 'running' | 'building',
 *     updated_at: string
 *   },
 *   message: string
 * }
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [PageVisibility Toggle API] POST request received')
    
    // Parse request body
    const body = await request.json()
    const { page_path, role, action } = body
    
    // Validate required fields
    if (!page_path || !role || !action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: page_path, role, action' 
        },
        { status: 400 }
      )
    }
    
    // Validate action
    if (!['grant', 'revoke'].includes(action)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid action. Must be "grant" or "revoke"' 
        },
        { status: 400 }
      )
    }
    
    console.log('🔄 [PageVisibility Toggle API] Toggle request:', { page_path, role, action })
    
    // Get current page configuration
    const { data: currentPage, error: fetchError } = await supabase
      .from('page_visibility_config')
      .select('visible_for_roles')
      .eq('page_path', page_path)
      .single()
    
    if (fetchError) {
      console.error('❌ [PageVisibility Toggle API] Fetch error:', fetchError)
      
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Page not found',
            details: `Page path '${page_path}' does not exist`
          },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch current page configuration',
          details: fetchError.message 
        },
        { status: 500 }
      )
    }
    
    if (!currentPage) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Page not found' 
        },
        { status: 404 }
      )
    }
    
    // Get current roles array
    const currentRoles = Array.isArray(currentPage.visible_for_roles) 
      ? [...currentPage.visible_for_roles] 
      : []
    
    console.log('📋 [PageVisibility Toggle API] Current roles:', currentRoles)
    
    // Update roles based on action
    let newRoles: string[]
    
    if (action === 'grant') {
      // Add role if not already present
      if (!currentRoles.includes(role)) {
        newRoles = [...currentRoles, role]
        console.log('➕ [PageVisibility Toggle API] Granting access to:', role)
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Role already has access',
            details: `Role '${role}' already has access to '${page_path}'`
          },
          { status: 409 }
        )
      }
    } else {
      // Remove role (but always keep admin)
      if (role === 'admin') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cannot revoke admin access',
            details: 'Admin role must always have access to all pages'
          },
          { status: 400 }
        )
      }
      
      newRoles = currentRoles.filter(r => r !== role)
      
      // Ensure admin is always present
      if (!newRoles.includes('admin')) {
        newRoles = ['admin', ...newRoles]
      }
      
      console.log('➖ [PageVisibility Toggle API] Revoking access from:', role)
    }
    
    console.log('🔄 [PageVisibility Toggle API] New roles:', newRoles)
    
    // Update database
    const { data: updatedPage, error: updateError } = await supabase
      .from('page_visibility_config')
      .update({ 
        visible_for_roles: newRoles,
        updated_at: new Date().toISOString()
      })
      .eq('page_path', page_path)
      .select('page_path, page_name, page_section, visible_for_roles, updated_at')
      .single()
    
    if (updateError) {
      console.error('❌ [PageVisibility Toggle API] Update error:', updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update page visibility',
          details: updateError.message 
        },
        { status: 500 }
      )
    }
    
    if (!updatedPage) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update page visibility' 
        },
        { status: 500 }
      )
    }
    
    // Calculate new status
    const roleCount = Array.isArray(updatedPage.visible_for_roles) 
      ? updatedPage.visible_for_roles.length 
      : 0
    const status = roleCount <= 1 ? 'building' : 'running'
    
    console.log('✅ [PageVisibility Toggle API] Updated successfully:', {
      page_path: updatedPage.page_path,
      status,
      roleCount
    })
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        page_path: updatedPage.page_path,
        page_name: updatedPage.page_name,
        page_section: updatedPage.page_section,
        visible_for_roles: Array.isArray(updatedPage.visible_for_roles) 
          ? updatedPage.visible_for_roles 
          : [],
        status,
        updated_at: updatedPage.updated_at
      },
      message: action === 'grant' 
        ? `Access granted to '${role}' for '${page_path}'`
        : `Access revoked from '${role}' for '${page_path}'`
    })
    
  } catch (error) {
    console.error('❌ [PageVisibility Toggle API] Exception:', error)
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
 * GET /api/page-visibility/toggle
 * 
 * Purpose: Get toggle status for a specific page and role
 * Usage: Admin UI - Check if role has access to page
 * 
 * Query Parameters:
 * - page_path: string (required)
 * - role: string (required)
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: {
 *     page_path: string,
 *     role: string,
 *     has_access: boolean,
 *     visible_for_roles: string[]
 *   }
 * }
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [PageVisibility Toggle API] GET request received')
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page_path = searchParams.get('page_path')
    const role = searchParams.get('role')
    
    // Validate required parameters
    if (!page_path || !role) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: page_path, role' 
        },
        { status: 400 }
      )
    }
    
    console.log('🔍 [PageVisibility Toggle API] Check access:', { page_path, role })
    
    // Get page configuration
    const { data: page, error } = await supabase
      .from('page_visibility_config')
      .select('visible_for_roles')
      .eq('page_path', page_path)
      .single()
    
    if (error) {
      console.error('❌ [PageVisibility Toggle API] Fetch error:', error)
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Page not found' 
          },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch page configuration',
          details: error.message 
        },
        { status: 500 }
      )
    }
    
    if (!page) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Page not found' 
        },
        { status: 404 }
      )
    }
    
    // Check if role has access
    const visibleRoles = Array.isArray(page.visible_for_roles) 
      ? page.visible_for_roles 
      : []
    const hasAccess = visibleRoles.includes(role)
    
    console.log('✅ [PageVisibility Toggle API] Access check result:', { page_path, role, hasAccess })
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        page_path,
        role,
        has_access: hasAccess,
        visible_for_roles: visibleRoles
      }
    })
    
  } catch (error) {
    console.error('❌ [PageVisibility Toggle API] GET exception:', error)
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
