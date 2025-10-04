import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'MYR Churn Member API - Coming Soon',
    message: 'This endpoint will be implemented soon'
  }, { status: 501 })
}
