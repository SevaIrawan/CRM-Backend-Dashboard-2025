import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * ============================================================================
 * BUSINESS PERFORMANCE TARGET API - UPDATE
 * ============================================================================
 * 
 * Update target with role-based access control only (no password)
 * 
 * ROLE PERMISSIONS:
 * - manager_myr → ONLY edit MYR targets
 * - manager_sgd → ONLY edit SGD targets
 * - manager_usc → ONLY edit USC targets
 * - admin → CAN edit ALL targets (MYR/SGD/USC)
 * 
 * Security: Role-based validation only
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
    
    if (!user_email || !user_role) {
      return NextResponse.json(
        { error: 'Missing authentication fields: user_email and user_role are required' },
        { status: 401 }
      )
    }
    
    // ============================================================================
    // VALIDATION 2: Check role permission
    // ============================================================================
    console.log('🔐 [BP Target Update] Checking permissions...')
    console.log('🔐 [BP Target Update] User role:', user_role)
    console.log('🔐 [BP Target Update] Target currency:', currency)
    
    const validRoles = ['manager_myr', 'manager_sgd', 'manager_usc', 'admin', 'demo']
    if (!validRoles.includes(user_role)) {
      console.warn(`⚠️ [BP Target Update] Unauthorized role: ${user_role}`)
      return NextResponse.json(
        { error: 'Unauthorized: Only managers, admin, and demo can update targets' },
        { status: 403 }
      )
    }
    
    // ROLE PERMISSION MATRIX:
    // - manager_myr → ONLY edit MYR targets
    // - manager_sgd → ONLY edit SGD targets
    // - manager_usc → ONLY edit USC targets
    // - admin → CAN edit ALL targets (MYR/SGD/USC)
    // - demo → CAN edit ALL targets (MYR/SGD/USC) - For testing purposes
    
    if (user_role !== 'admin' && user_role !== 'demo') {
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
      console.log('✅ [BP Target Update] Admin/Demo access - can edit all targets')
    }
    
    // ============================================================================
    // VALIDATION 3: Check percentage breakdown (for brand targets only)
    // ============================================================================
    // If saving a brand target (not currency total), validate that total percentage ≤ 100%
    if (line !== currency && line !== 'ALL') {
      console.log('🔍 [BP Target Update] Validating brand percentage breakdown...')
      
      // Step 1: Get TOTAL target for this quarter
      const { data: totalTargetData } = await supabase
        .from('bp_target')
        .select('target_ggr')
        .eq('currency', currency)
        .eq('year', year)
        .eq('quarter', quarter)
        .eq('is_active', true)
        .or(`line.eq.${currency},line.eq.ALL`)
        .maybeSingle()
      
      if (!totalTargetData || !totalTargetData.target_ggr) {
        return NextResponse.json(
          { error: `Total target untuk ${currency} ${quarter} ${year} belum di-set. Harap set total target terlebih dahulu sebelum breakdown per brand.` },
          { status: 400 }
        )
      }
      
      const totalTargetGGR: number = totalTargetData.target_ggr as number
      console.log('📊 [BP Target Update] Total target GGR:', totalTargetGGR)
      
      // Step 2: Get all existing brand targets for this quarter (exclude current brand if editing)
      const { data: existingBrandTargets } = await supabase
        .from('bp_target')
        .select('line, target_ggr')
        .eq('currency', currency)
        .eq('year', year)
        .eq('quarter', quarter)
        .eq('is_active', true)
        .neq('line', currency)
        .neq('line', 'ALL')
        .neq('line', line) // Exclude current brand (for edit mode)
      
      // Step 3: Calculate total existing brand targets
      const existingBrandTotal = existingBrandTargets?.reduce((sum: number, row: any) => sum + (row.target_ggr || 0), 0) || 0
      console.log('📊 [BP Target Update] Existing brand targets total:', existingBrandTotal)
      
      // Step 4: Calculate new total (existing + new brand target)
      const newBrandTotal = existingBrandTotal + (target_ggr || 0)
      console.log('📊 [BP Target Update] New brand total (including new target):', newBrandTotal)
      
      // Step 5: Calculate percentage
      const totalPercentage = (newBrandTotal / totalTargetGGR) * 100
      console.log('📊 [BP Target Update] Total percentage:', totalPercentage.toFixed(2) + '%')
      
      // Step 6: Validate ≤ 100%
      if (totalPercentage > 100) {
        const currentBrandPercentage = ((target_ggr || 0) / totalTargetGGR) * 100
        const existingPercentage = (existingBrandTotal / totalTargetGGR) * 100
        const availablePercentage = 100 - existingPercentage
        
        console.warn(`❌ [BP Target Update] Percentage validation failed!`)
        console.warn(`❌ [BP Target Update] Total percentage would be ${totalPercentage.toFixed(2)}% (> 100%)`)
        
        return NextResponse.json(
          { 
            error: `Total percentage breakdown melebihi 100%!\n\nBreakdown saat ini:\n- Brand lain: ${existingPercentage.toFixed(2)}%\n- ${line}: ${currentBrandPercentage.toFixed(2)}%\n- Total: ${totalPercentage.toFixed(2)}%\n\nSisa percentage yang tersedia: ${availablePercentage.toFixed(2)}%\n\nSilakan adjust target GGR untuk ${line} agar total tidak melebihi 100%.`
          },
          { status: 400 }
        )
      }
      
      console.log('✅ [BP Target Update] Percentage validation passed:', totalPercentage.toFixed(2) + '% ≤ 100%')
    }
    
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
    // RESET OTHER BRAND TARGETS (if editing a brand target)
    // ============================================================================
    let resetBrands: string[] = []
    
    if (isUpdate && line !== currency && line !== 'ALL') {
      console.log('🔄 [BP Target Update] Editing brand target - resetting other brands...')
      
      // Check if target_ggr has changed
      const hasGGRChanged = existingTarget.target_ggr !== target_ggr
      
      if (hasGGRChanged) {
        console.log('📊 [BP Target Update] GGR changed from', existingTarget.target_ggr, 'to', target_ggr)
        
        // Get all other brand targets (exclude current brand and MYR total)
        const { data: otherBrandTargets } = await supabase
          .from('bp_target')
          .select('line, target_ggr')
          .eq('currency', currency)
          .eq('year', year)
          .eq('quarter', quarter)
          .eq('is_active', true)
          .neq('line', line)
          .neq('line', currency)
          .neq('line', 'ALL')
        
        if (otherBrandTargets && otherBrandTargets.length > 0) {
          console.log('🔄 [BP Target Update] Found', otherBrandTargets.length, 'other brand targets to reset')
          
          // Reset each brand target to 0
          for (const brandTarget of otherBrandTargets) {
            const brandLine = (brandTarget as any).line as string
            const resetResult = await supabase
              .from('bp_target')
              .update({
                target_ggr: 0,
                target_deposit_amount: 0,
                target_deposit_cases: 0,
                target_active_member: 0,
                forecast_ggr: 0,
                updated_at: now,
                updated_by: user_email,
                updated_by_role: user_role,
                notes: `Reset akibat perubahan target ${line} oleh ${user_email}`
              })
              .eq('currency', currency)
              .eq('line', brandLine)
              .eq('year', year)
              .eq('quarter', quarter)
              .eq('is_active', true)
            
            if (resetResult.error) {
              console.error('⚠️ [BP Target Update] Failed to reset brand:', brandLine, resetResult.error)
            } else {
              console.log('✅ [BP Target Update] Reset brand:', brandLine)
              resetBrands.push(brandLine)
            }
          }
        }
      }
    }
    
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
    let responseMessage = `Target ${isUpdate ? 'updated' : 'created'} successfully`
    
    // Add warning message if other brands were reset
    if (resetBrands.length > 0) {
      responseMessage += `\n\n⚠️ PERHATIAN: Target untuk brand lain (${resetBrands.join(', ')}) telah di-reset ke 0.\n\nSilakan set ulang target untuk brand tersebut agar total breakdown sesuai.`
    }
    
    return NextResponse.json({
      success: true,
      message: responseMessage,
      target: savedTarget,
      action: isUpdate ? 'UPDATE' : 'CREATE',
      resetBrands: resetBrands.length > 0 ? resetBrands : undefined
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

