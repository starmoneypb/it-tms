import { NextRequest, NextResponse } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile', 
  '/admin',
  '/tickets/new',
  // Note: /tickets and /tickets/[id] allow anonymous viewing per requirements
];

// Routes that should redirect authenticated users away
const authRoutes = ['/sign-in'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  
  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if this is an auth route (sign-in page)
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // If accessing a protected route without a token, redirect to sign-in
  if (isProtectedRoute && !token) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  // If accessing sign-in page with a valid token, redirect to dashboard
  if (isAuthRoute && token) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};