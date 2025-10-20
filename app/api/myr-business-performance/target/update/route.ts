import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

/**
 * ============================================================================
 * BUSINESS PERFORMANCE TARGET API - UPDATE
 * ============================================================================
 * 
 * Update target with password verification
 * Security: Role-based + Password confirmation
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
    const validRoles = ['manager_myr', 'manager_sgd', 'manager_usc', 'admin']
    if (!validRoles.includes(user_role)) {
      console.warn(`⚠️ [BP Target Update] Unauthorized role: ${user_role}`)
      return NextResponse.json(
        { error: 'Unauthorized: Only managers can update targets' },
        { status: 403 }
      )
    }
    
    // Check role matches currency
    if (user_role !== 'admin') {
      const roleCurrency = user_role.split('_')[1]?.toUpperCase()
      if (roleCurrency !== currency) {
        console.warn(`⚠️ [BP Target Update] Role-currency mismatch: ${user_role} vs ${currency}`)
        return NextResponse.json(
          { error: `Unauthorized: ${user_role} cannot modify ${currency} targets` },
          { status: 403 }
        )
      }
    }
    
    // ============================================================================
    // VALIDATION 3: Verify password with Supabase Auth
    // ============================================================================
    console.log('🔐 [BP Target Update] Verifying password...')
    
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: user_email,
      password: manager_password
    })
    
    if (authError || !authData.user) {
      console.error('❌ [BP Target Update] Password verification failed:', authError?.message)
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }
    
    console.log('✅ [BP Target Update] Password verified')
    
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
      throw saveError
    }
    
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
    return NextResponse.json(
      {
        error: 'Failed to update target',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

