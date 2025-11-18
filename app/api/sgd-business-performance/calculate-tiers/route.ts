import { NextRequest, NextResponse } from 'next/server'

/**
 * ============================================================================
 * SGD BUSINESS PERFORMANCE - CALCULATE TIERS API (PLACEHOLDER)
 * ============================================================================
 * 
 * Status: Not yet implemented
 * TODO: Implement SGD tier calculation logic
 * 
 * ============================================================================
 */

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'SGD tier calculation is not yet implemented. Please use USC for now.',
    message: 'Coming soon'
  }, { status: 501 })
}

