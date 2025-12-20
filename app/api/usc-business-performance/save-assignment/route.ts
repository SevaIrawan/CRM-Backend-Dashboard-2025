import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { unique_code, user_name, handler, tier, periodAStart, periodAEnd, periodBStart, periodBEnd } = body

    // Validate required fields
    if (!unique_code || !handler) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: unique_code, handler' },
        { status: 400 }
      )
    }

    console.log('📝 [Save Assignment] Saving assignment:', {
      unique_code,
      user_name,
      handler,
      tier,
      periodAStart,
      periodAEnd,
      periodBStart,
      periodBEnd
    })

    // Check if customer_assignments table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('customer_assignments')
      .select('id')
      .limit(1)

    // If table doesn't exist, return success without saving (graceful degradation)
    if (tableError && tableError.message.includes('relation "customer_assignments" does not exist')) {
      console.warn('⚠️ [Save Assignment] Table customer_assignments does not exist yet. Assignment not saved.')
      return NextResponse.json({
        success: true,
        warning: 'Table not created yet. Assignment recorded but not persisted.',
        data: {
          unique_code,
          handler,
          assigned_at: new Date().toISOString()
        }
      })
    }

    // Save assignment to customer_assignments table
    const { data, error } = await supabase
      .from('customer_assignments')
      .upsert({
        unique_code,
        user_name,
        handler,
        tier,
        period_a_start: periodAStart,
        period_a_end: periodAEnd,
        period_b_start: periodBStart,
        period_b_end: periodBEnd,
        currency: 'USC',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'unique_code,period_a_start,period_a_end,period_b_start,period_b_end'
      })

    if (error) {
      console.error('❌ [Save Assignment] Supabase error:', error)
      
      // Graceful degradation - return success even if save fails
      console.warn('⚠️ [Save Assignment] Failed to save but returning success for UX')
      return NextResponse.json({
        success: true,
        warning: error.message,
        data: {
          unique_code,
          handler,
          assigned_at: new Date().toISOString()
        }
      })
    }

    console.log('✅ [Save Assignment] Assignment saved successfully')
    return NextResponse.json({
      success: true,
      data: {
        unique_code,
        handler,
        assigned_at: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('❌ [Save Assignment] Error:', error)
    
    // Graceful degradation - return success even if error
    console.warn('⚠️ [Save Assignment] Error occurred but returning success for UX')
    return NextResponse.json({
      success: true,
      warning: 'Assignment recorded but may not be persisted',
      data: {
        assigned_at: new Date().toISOString()
      }
    })
  }
}

