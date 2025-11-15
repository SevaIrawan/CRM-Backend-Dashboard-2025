import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/lightning-favicon.svg')
  ) {
    return NextResponse.next()
  }
  
  // Allow access to login page and maintenance page
  if (pathname === '/login' || pathname === '/maintenance') {
    return NextResponse.next()
  }
  
  // Check maintenance mode from API
  try {
    // Get maintenance status from API
    // Note: We need to call the API directly, not via fetch to avoid circular dependency
    // For now, we'll check it in the client-side (AccessControl component)
    // This middleware will be used for server-side redirects if needed
    
    // For client-side checking, we'll handle it in AccessControl component
    // This middleware just passes through for now
    
    return NextResponse.next()
  } catch (error) {
    console.error('❌ [Middleware] Error checking maintenance mode:', error)
    // If error, allow access (fail-open)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|lightning-favicon.svg).*)',
  ],
}

