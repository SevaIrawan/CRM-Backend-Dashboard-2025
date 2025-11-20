import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * USC TARGET MANAGEMENT - SAVE/UPDATE TARGET
 * ============================================================================
 * 
 * Save or update target with role-based access control
 * Currency locked to USC
 * 
 * ROLE PERMISSIONS:
 * - manager_usc → ONLY edit USC targets
 * - executive → CAN edit USC targets
 * - admin → CAN edit ALL targets
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
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
      reason
    } = body
    
    const currency = 'USD' // USC stored as USD in bp_target table
    
    console.log(`🎯 [USC Target Save] Request: ${currency} ${line} ${year} ${quarter} by ${user_email}`)
    
    // ============================================================================
    // VALIDATION 1: Check required fields
    // ============================================================================
    if (!line || !year || !quarter) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: line, year, quarter' },
        { status: 400 }
      )
    }
    
    if (!user_email || !user_role) {
      return NextResponse.json(
        { success: false, error: 'Missing authentication fields: user_email and user_role are required' },
        { status: 401 }
      )
    }
    
    // ============================================================================
    // VALIDATION 2: Check role permission (Manager USC, Executive, Admin only)
    // ============================================================================
    console.log('🔐 [USC Target Save] Checking permissions...')
    console.log('🔐 [USC Target Save] User role:', user_role)
    
    const validRoles = ['manager_usc', 'executive', 'admin']
    if (!validRoles.includes(user_role)) {
      console.warn(`⚠️ [USC Target Save] Unauthorized role: ${user_role}`)
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only Manager USC, Executive, and Admin can update targets' },
        { status: 403 }
      )
    }
    
    console.log('✅ [USC Target Save] Permission granted')
    
    // ============================================================================
    // CHECK IF TARGET EXISTS (Check if any month exists for this quarter)
    // ============================================================================
    const { data: existingTargets, error: fetchError } = await supabase
      .from('bp_target')
      .select('*')
      .eq('currency', currency)
      .eq('line', line)
      .eq('year', year)
      .eq('quarter', quarter)
      .eq('is_active', true)
    
    if (fetchError) {
      console.error('❌ [USC Target Save] Fetch error:', fetchError)
      throw fetchError
    }
    
    const now = new Date().toISOString()
    const isUpdate = (existingTargets && existingTargets.length > 0)
    const existingTarget = existingTargets && existingTargets.length > 0 ? existingTargets[0] : null
    
    // ============================================================================
    // QUARTER TO MONTHS MAPPING
    // ============================================================================
    const quarterToMonths: Record<string, string[]> = {
      'Q1': ['January', 'February', 'March'],
      'Q2': ['April', 'May', 'June'],
      'Q3': ['July', 'August', 'September'],
      'Q4': ['October', 'November', 'December']
    }
    
    const months = quarterToMonths[quarter] || []
    if (months.length === 0) {
      return NextResponse.json(
        { success: false, error: `Invalid quarter: ${quarter}` },
        { status: 400 }
      )
    }
    
    // ============================================================================
    // CALCULATE MONTHLY BREAKDOWN (Divide by number of months)
    // ============================================================================
    const monthlyGGR = target_ggr ? parseFloat((target_ggr / months.length).toFixed(2)) : null
    const monthlyDepositAmount = target_deposit_amount ? parseFloat((target_deposit_amount / months.length).toFixed(2)) : null
    const monthlyDepositCases = target_deposit_cases ? Math.round(target_deposit_cases / months.length) : null
    const monthlyActiveMember = target_active_member ? Math.round(target_active_member / months.length) : null
    const monthlyForecastGGR = forecast_ggr ? parseFloat((forecast_ggr / months.length).toFixed(2)) : null
    
    // ============================================================================
    // PREPARE TARGET DATA FOR EACH MONTH
    // ============================================================================
    const targetsToSave = months.map(month => {
      const targetData: any = {
        currency,
        line,
        year,
        quarter,
        month,
        target_ggr: monthlyGGR,
        target_deposit_amount: monthlyDepositAmount,
        target_deposit_cases: monthlyDepositCases,
        target_active_member: monthlyActiveMember,
        forecast_ggr: monthlyForecastGGR,
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
      
      return targetData
    })
    
    // ============================================================================
    // DELETE EXISTING TARGETS FOR THIS QUARTER (if updating)
    // ============================================================================
    if (isUpdate) {
      const { error: deleteError } = await supabase
        .from('bp_target')
        .delete()
        .eq('currency', currency)
        .eq('line', line)
        .eq('year', year)
        .eq('quarter', quarter)
        .eq('is_active', true)
      
      if (deleteError) {
        console.error('❌ [USC Target Save] Delete old targets error:', deleteError)
        throw deleteError
      }
      console.log('🗑️ [USC Target Save] Deleted old monthly targets')
    }
    
    // ============================================================================
    // SAVE TARGETS (INSERT ALL MONTHS)
    // ============================================================================
    console.log(`💾 [USC Target Save] Attempting to save ${targetsToSave.length} monthly targets`)
    
    const { data: savedTargets, error: saveError } = await supabase
      .from('bp_target')
      .insert(targetsToSave)
      .select()
    
    if (saveError) {
      console.error('❌ [USC Target Save] Save error:', saveError)
      throw saveError
    }
    
    console.log(`✅ [USC Target Save] ${savedTargets?.length || 0} monthly targets saved successfully`)
    
    // ============================================================================
    // CREATE AUDIT LOG (One log entry for the quarter, not per month)
    // ============================================================================
    // Calculate total from existing targets (sum all months)
    const oldTotalGGR = existingTargets?.reduce((sum, t: any) => sum + (parseFloat(String(t.target_ggr || 0)) || 0), 0) || null
    const oldTotalDepositAmount = existingTargets?.reduce((sum, t: any) => sum + (parseFloat(String(t.target_deposit_amount || 0)) || 0), 0) || null
    const oldTotalDepositCases = existingTargets?.reduce((sum, t: any) => sum + (parseInt(String(t.target_deposit_cases || 0)) || 0), 0) || null
    const oldTotalActiveMember = existingTargets?.reduce((sum, t: any) => sum + (parseInt(String(t.target_active_member || 0)) || 0), 0) || null
    const oldTotalForecastGGR = existingTargets?.reduce((sum, t: any) => sum + (parseFloat(String(t.forecast_ggr || 0)) || 0), 0) || null
    
    const auditData = {
      target_id: savedTargets && savedTargets.length > 0 ? savedTargets[0].id : null,
      currency,
      line,
      year,
      quarter,
      month: null, // Quarter-level audit, not month-specific
      action: isUpdate ? 'UPDATE' : 'CREATE',
      old_target_ggr: oldTotalGGR,
      new_target_ggr: target_ggr,
      old_target_deposit_amount: oldTotalDepositAmount,
      new_target_deposit_amount: target_deposit_amount,
      old_target_deposit_cases: oldTotalDepositCases,
      new_target_deposit_cases: target_deposit_cases,
      old_target_active_member: oldTotalActiveMember,
      new_target_active_member: target_active_member,
      old_forecast_ggr: oldTotalForecastGGR,
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
      console.error('⚠️ [USC Target Save] Audit log error:', auditError)
      // Don't fail the request if audit log fails
    } else {
      console.log('✅ [USC Target Save] Audit log created')
    }
    
    // ============================================================================
    // RESPONSE
    // ============================================================================
    return NextResponse.json({
      success: true,
      message: `Target ${isUpdate ? 'updated' : 'created'} successfully for ${months.length} months`,
      targets: savedTargets,
      count: savedTargets?.length || 0,
      action: isUpdate ? 'UPDATE' : 'CREATE'
    })
    
  } catch (error) {
    console.error('❌ [USC Target Save] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isTableNotFound = errorMessage.toLowerCase().includes('relation') && 
                            errorMessage.toLowerCase().includes('does not exist')
    
    return NextResponse.json(
      {
        success: false,
        error: isTableNotFound 
          ? 'Database table not found. Please contact administrator to run setup script: scripts/create-bp-target-tables.sql'
          : 'Failed to save target',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

