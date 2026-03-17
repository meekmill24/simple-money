import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Determine if this is an admin subdomain request
  const isAdminSubdomain = hostname.startsWith('admin.');

  if (isAdminSubdomain) {
    // Paths that should NOT be rewritten (regular app infrastructure)
    const publicPaths = ['/login', '/signup', '/api', '/_next', '/favicon.ico', '/supabase'];
    const isPublic = publicPaths.some(path => url.pathname.startsWith(path));

    if (!isPublic) {
      // On the admin subdomain, we want everything to point to the dashboard-alpha folder.
      // If the path doesn't already have the prefix, we rewrite it.
      if (!url.pathname.startsWith('/dashboard-alpha')) {
        const path = url.pathname === '/' ? '' : url.pathname;
        url.pathname = `/dashboard-alpha${path}`;
        return NextResponse.rewrite(url);
      }
    }
  } else {
    // If we are on the main domain (e.g., simplemoneys.com) 
    // and someone tries to access /dashboard-alpha directly, 
    // we redirect them to the admin subdomain for a better experience.
    if (url.pathname.startsWith('/dashboard-alpha')) {
      const adminUrl = new URL(request.url);
      
      if (hostname.includes('simplemoneys.com')) {
        adminUrl.hostname = 'admin.simplemoneys.com';
      } else if (hostname.includes('localhost')) {
        adminUrl.hostname = 'admin.localhost';
      }
      
      // Strip /dashboard-alpha from the redirected path for a cleaner URL
      adminUrl.pathname = url.pathname.replace('/dashboard-alpha', '') || '/';
      
      return NextResponse.redirect(adminUrl);
    }
  }

  return NextResponse.next();
}

// Configure which paths should trigger the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, assets, etc (if they are in public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
