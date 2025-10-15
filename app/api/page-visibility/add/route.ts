import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { page_path, page_name, page_section } = await request.json()

    // Validation
    if (!page_path || !page_name || !page_section) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: page_path, page_name, page_section' 
      }, { status: 400 })
    }

    // Validate page_path format
    if (!page_path.startsWith('/')) {
      return NextResponse.json({ 
        success: false, 
        error: 'page_path must start with "/"' 
      }, { status: 400 })
    }

    // Validate page_section
    const validSections = ['MYR', 'SGD', 'USC', 'Admin', 'Other']
    if (!validSections.includes(page_section)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid page_section. Must be one of: ${validSections.join(', ')}` 
      }, { status: 400 })
    }

    // Check if page already exists
    const { data: existingPage, error: checkError } = await supabase
      .from('page_visibility_config')
      .select('page_path')
      .eq('page_path', page_path)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing page:', checkError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while checking existing page' 
      }, { status: 500 })
    }

    if (existingPage) {
      return NextResponse.json({ 
        success: false, 
        error: `Page with path "${page_path}" already exists` 
      }, { status: 409 })
    }

    // Create new page with SAFE DEFAULTS
    const newPage = {
      page_path,
      page_name,
      page_section,
      visible_for_roles: ['admin'], // SAFETY: Only admin access by default
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('page_visibility_config')
      .insert([newPage])
      .select()

    if (error) {
      console.error('Error creating new page:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    // Log activity for audit trail
    console.log(`✅ [PageVisibility] New page added: ${page_path} (${page_name}) by admin`)

    return NextResponse.json({
      success: true,
      data: {
        ...data[0],
        status: 'building' // SAFETY: Always starts as building
      },
      message: 'Page added successfully with Building status (admin only)'
    })

  } catch (error: any) {
    console.error('Unexpected error in POST /api/page-visibility/add:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
