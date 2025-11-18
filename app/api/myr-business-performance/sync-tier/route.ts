import { NextRequest, NextResponse } from 'next/server'

/**
 * ============================================================================
 * MYR BUSINESS PERFORMANCE - SYNC TIER API (PLACEHOLDER)
 * ============================================================================
 * 
 * Status: Not yet implemented
 * TODO: Implement MYR tier sync logic
 * 
 * ============================================================================
 */

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'MYR tier sync is not yet implemented. Please use USC for now.',
    message: 'Coming soon'
  }, { status: 501 })
}

