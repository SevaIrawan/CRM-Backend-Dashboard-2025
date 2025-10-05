import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'MYR Auto Approval Monitor Export API - Coming Soon',
    message: 'This endpoint will be implemented soon'
  }, { status: 501 })
}
