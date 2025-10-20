import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // If the user is trying to access a page inside the (admin) group directly,
  // rewrite the URL to include the /admin prefix for clarity, though route groups don't affect URL paths.
  // This is more of a conceptual redirect.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Redirect root to the user dashboard
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
 
  return NextResponse.next()
}
 
// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
