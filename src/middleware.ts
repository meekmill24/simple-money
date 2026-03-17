import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { createServerClient } from '@supabase/ssr'; // Required if migrating to cookie-based auth

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // ---------------------------------------------------------
  // 1. Admin Route Protection
  // IMPORTANT FIX: Prevent the global `if (!user) redirect("/login")` from breaking /admin.
  // Next.js Edge Middleware cannot read localStorage where the current Supabase client 
  // stores the auth token (sb-auth-token-money). 
  // Real auth validation is deferred to `src/app/admin/layout.tsx` running on the client.
  // If you ever migrate to cookie-based auth (@supabase/ssr), you can uncomment and use the following:
  /*
  const supabase = createServerClient(...);
  const { data: { user } } = await supabase.auth.getUser();
  */
  
  const user = null; // Placeholder until cookies are implemented globally

  // Fix: custom logic for admin routes as requested
  
  // if (!user && pathname.startsWith("/admin") && pathname !== "/admin/login") {
  //   return NextResponse.redirect(new URL("/admin/login", request.url));
  // }
  
  // Notice: The "global" user redirect is currently handled safely in `src/app/(user)/layout.tsx` 
  // so we don't need a heavy-handed middleware redirect that would break public pages.
  // ---------------------------------------------------------

  // ---------------------------------------------------------
  // 2. Subdomain Routing (Admin Panel Isolation)
  // ---------------------------------------------------------
  const isAdminSubdomain = hostname.startsWith('admin.');

  if (isAdminSubdomain) {
    // Only skip assets and APIs from being rewritten. 
    // We intentionally removed '/login' so `admin.simplemoneys.com/login` 
    // forces the rewrite into the `app/admin/login` route.
    const isStatic = ['/api', '/_next', '/favicon.ico', '/supabase'].some(path => pathname.startsWith(path));

    if (!isStatic) {
      if (!pathname.startsWith('/admin')) {
        const path = pathname === '/' ? '' : pathname;
        url.pathname = `/admin${path}`;
        return NextResponse.rewrite(url);
      }
    }
  } else {
    // If we are on the main domain (e.g., simplemoneys.com) 
    // and someone tries to access /admin directly, 
    // we redirect them forcefully to the admin subdomain.
    if (pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
      const adminUrl = new URL(request.url);
      
      if (hostname.includes('simplemoneys.com')) {
        adminUrl.hostname = 'admin.simplemoneys.com';
      } else if (hostname.includes('localhost')) {
        adminUrl.hostname = 'admin.localhost';
      }
      
      // Strip /admin prefix so they cleanly land on root or /login
      adminUrl.pathname = pathname.replace(/^\/admin/, '') || '/';
      return NextResponse.redirect(adminUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};

