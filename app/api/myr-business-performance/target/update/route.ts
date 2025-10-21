import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * BUSINESS PERFORMANCE TARGET API - UPDATE
 * ============================================================================
 * 
 * Update target with password verification
 * 
 * ROLE PERMISSIONS:
 * - manager_myr → ONLY edit MYR targets
 * - manager_sgd → ONLY edit SGD targets
 * - manager_usc → ONLY edit USC targets
 * - admin → CAN edit ALL targets (MYR/SGD/USC)
 * 
 * Security: Role-based + Password confirmation via users table
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      currency,
      line,
      year,
      quarter,
      target_ggr,
      target_deposit_amount,
      target_deposit_cases,
      target_active_member,
      forecast_ggr,
      user_email,
      user_role,
      manager_password,
      reason
    } = body
    
    console.log(`🎯 [BP Target Update] Request: ${currency} ${line} ${year} ${quarter} by ${user_email}`)
    console.log('📦 [BP Target Update] Request body:', JSON.stringify(body, null, 2))
    
    // ============================================================================
    // VALIDATION 1: Check required fields
    // ============================================================================
    if (!currency || !line || !year || !quarter) {
      return NextResponse.json(
        { error: 'Missing required fields: currency, line, year, quarter' },
        { status: 400 }
      )
    }
    
    if (!user_email || !user_role || !manager_password) {
      return NextResponse.json(
        { error: 'Missing authentication fields' },
        { status: 401 }
      )
    }
    
    // ============================================================================
    // VALIDATION 2: Check role permission
    // ============================================================================
    console.log('🔐 [BP Target Update] Checking permissions...')
    console.log('🔐 [BP Target Update] User role:', user_role)
    console.log('🔐 [BP Target Update] Target currency:', currency)
    
    const validRoles = ['manager_myr', 'manager_sgd', 'manager_usc', 'admin']
    if (!validRoles.includes(user_role)) {
      console.warn(`⚠️ [BP Target Update] Unauthorized role: ${user_role}`)
      return NextResponse.json(
        { error: 'Unauthorized: Only managers and admin can update targets' },
        { status: 403 }
      )
    }
    
    // ROLE PERMISSION MATRIX:
    // - manager_myr → ONLY edit MYR targets
    // - manager_sgd → ONLY edit SGD targets
    // - manager_usc → ONLY edit USC targets
    // - admin → CAN edit ALL targets (MYR/SGD/USC)
    
    if (user_role !== 'admin') {
      const roleCurrency = user_role.split('_')[1]?.toUpperCase()
      console.log('🔐 [BP Target Update] Role currency:', roleCurrency)
      
      if (roleCurrency !== currency) {
        console.warn(`❌ [BP Target Update] Permission denied!`)
        console.warn(`❌ [BP Target Update] ${user_role} trying to edit ${currency} target`)
        
        let errorMessage = ''
        if (user_role === 'manager_myr') {
          errorMessage = 'Manager MYR hanya dapat edit target MYR. Anda tidak memiliki akses ke target SGD/USC.'
        } else if (user_role === 'manager_sgd') {
          errorMessage = 'Manager SGD hanya dapat edit target SGD. Anda tidak memiliki akses ke target MYR/USC.'
        } else if (user_role === 'manager_usc') {
          errorMessage = 'Manager USC hanya dapat edit target USC. Anda tidak memiliki akses ke target MYR/SGD.'
        } else {
          errorMessage = `Role ${user_role} tidak memiliki akses untuk edit target ${currency}.`
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: 403 }
        )
      }
      
      console.log('✅ [BP Target Update] Permission granted:', `${user_role} can edit ${currency} targets`)
    } else {
      console.log('✅ [BP Target Update] Admin access - can edit all targets')
    }
    
    // ============================================================================
    // VALIDATION 3: Verify password with users table
    // ============================================================================
    console.log('🔐 [BP Target Update] Verifying password for email:', user_email)
    console.log('🔐 [BP Target Update] User role:', user_role)
    
    // Extract username from email (format: username@nexmax.com)
    const username = user_email.split('@')[0]
    console.log('🔐 [BP Target Update] Extracted username:', username)
    
    // Query users table to verify password
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', manager_password)
      .single()
    
    if (userError || !userData) {
      console.error('❌ [BP Target Update] Password verification failed')
      console.error('❌ [BP Target Update] Username:', username)
      console.error('❌ [BP Target Update] Error:', userError?.message)
      
      return NextResponse.json(
        { 
          error: 'Password salah! Gunakan password yang sama dengan login dashboard.',
          details: 'Invalid password for user'
        },
        { status: 401 }
      )
    }
    
    // Verify role matches
    if (userData.role !== user_role) {
      console.error('❌ [BP Target Update] Role mismatch')
      console.error('❌ [BP Target Update] Expected:', user_role, 'Got:', userData.role)
      
      return NextResponse.json(
        { 
          error: 'Role tidak sesuai. Session mungkin expired, silakan login ulang.',
          details: 'Role mismatch'
        },
        { status: 403 }
      )
    }
    
    console.log('✅ [BP Target Update] Password verified successfully')
    console.log('✅ [BP Target Update] Authenticated user:', userData.username, 'Role:', userData.role)
    
    // ============================================================================
    // CHECK IF TARGET EXISTS
    // ============================================================================
    const { data: existingTarget, error: fetchError } = await supabase
      .from('bp_target')
      .select('*')
      .eq('currency', currency)
      .eq('line', line)
      .eq('year', year)
      .eq('quarter', quarter)
      .eq('is_active', true)
      .maybeSingle()
    
    if (fetchError) {
      console.error('❌ [BP Target Update] Fetch error:', fetchError)
      throw fetchError
    }
    
    const now = new Date().toISOString()
    const isUpdate = !!existingTarget
    
    // ============================================================================
    // PREPARE TARGET DATA
    // ============================================================================
    const targetData: any = {
      currency,
      line,
      year,
      quarter,
      target_ggr,
      target_deposit_amount,
      target_deposit_cases,
      target_active_member,
      forecast_ggr,
      notes: reason || null,
      updated_at: now,
      updated_by: user_email,
      updated_by_role: user_role
    }
    
    if (!isUpdate) {
      // CREATE new target
      targetData.created_at = now
      targetData.created_by = user_email
      targetData.created_by_role = user_role
      targetData.is_active = true
    }
    
    // ============================================================================
    // SAVE TARGET (UPSERT)
    // ============================================================================
    console.log('💾 [BP Target Update] Attempting to save target data:', JSON.stringify(targetData, null, 2))
    
    const { data: savedTarget, error: saveError } = await supabase
      .from('bp_target')
      .upsert(targetData, {
        onConflict: 'currency,line,year,quarter',
        ignoreDuplicates: false
      })
      .select()
      .single()
    
    if (saveError) {
      console.error('❌ [BP Target Update] Save error:', saveError)
      console.error('❌ [BP Target Update] Save error details:', JSON.stringify(saveError, null, 2))
      throw saveError
    }
    
    console.log('✅ [BP Target Update] Target saved successfully:', savedTarget)
    
    console.log(`✅ [BP Target Update] ${isUpdate ? 'Updated' : 'Created'} target ID:`, savedTarget.id)
    
    // ============================================================================
    // CREATE AUDIT LOG
    // ============================================================================
    const auditData = {
      target_id: savedTarget.id,
      currency,
      line,
      year,
      quarter,
      action: isUpdate ? 'UPDATE' : 'CREATE',
      old_target_ggr: existingTarget?.target_ggr || null,
      new_target_ggr: target_ggr,
      old_target_deposit_amount: existingTarget?.target_deposit_amount || null,
      new_target_deposit_amount: target_deposit_amount,
      old_target_deposit_cases: existingTarget?.target_deposit_cases || null,
      new_target_deposit_cases: target_deposit_cases,
      old_target_active_member: existingTarget?.target_active_member || null,
      new_target_active_member: target_active_member,
      old_forecast_ggr: existingTarget?.forecast_ggr || null,
      new_forecast_ggr: forecast_ggr,
      changed_by: user_email,
      changed_by_role: user_role,
      changed_at: now,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      reason: reason || null
    }
    
    const { error: auditError } = await supabase
      .from('bp_target_audit_log')
      .insert(auditData)
    
    if (auditError) {
      console.error('⚠️ [BP Target Update] Audit log error:', auditError)
      // Don't fail the request if audit log fails
    } else {
      console.log('✅ [BP Target Update] Audit log created')
    }
    
    // ============================================================================
    // RESPONSE
    // ============================================================================
    return NextResponse.json({
      success: true,
      message: `Target ${isUpdate ? 'updated' : 'created'} successfully`,
      target: savedTarget,
      action: isUpdate ? 'UPDATE' : 'CREATE'
    })
    
  } catch (error) {
    console.error('❌ [BP Target Update] Error:', error)
    
    // Check if error is table not found
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isTableNotFound = errorMessage.toLowerCase().includes('relation') && 
                            errorMessage.toLowerCase().includes('does not exist')
    
    return NextResponse.json(
      {
        error: isTableNotFound 
          ? 'Database table not found. Please contact administrator to run setup script: scripts/create-bp-target-tables.sql'
          : 'Failed to update target',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

