import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password'];

const PROTECTED_PREFIXES = [
  '/dashboard', '/properties', '/booking-calendar', '/guests',
  '/expenses', '/reports', '/settings', '/alerts', '/unit-performance',
  '/help', '/receipts',
];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Root → dashboard
  if (url.pathname === '/') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Build response with refreshed session cookie
  let response = NextResponse.next({ request: { headers: request.headers } });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some(p => url.pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some(p => url.pathname.startsWith(p));

  // Unauthenticated user trying to access a protected route → login
  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.searchParams.set('next', url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user visiting auth pages → dashboard
  if (user && isAuthRoute) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashUrl);
  }

  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
