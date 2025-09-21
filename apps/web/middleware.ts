import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CRITICAL: Completely bypass middleware for static assets
  // This must happen BEFORE any other processing
  if (
    pathname.includes('.') ||                           // Any file with extension
    pathname.startsWith('/_next/') ||                   // Next.js internals  
    pathname.startsWith('/api/') ||                     // API routes
    pathname === '/favicon.ico' ||                      // Favicon
    pathname.startsWith('/uploads/') ||                 // Upload directory
    pathname === '/logo.svg' ||                         // Explicit logo check
    pathname === '/favicon.svg' ||                      // Explicit favicon check
    /\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2|ttf|eot)$/i.test(pathname)
  ) {
    // Return immediately without any processing
    return NextResponse.next();
  }
  
  // Only process non-static requests with intl middleware
  const response = intlMiddleware(request);
  
  // Extract locale from pathname for cookie management
  const segments = pathname.split('/').filter(Boolean);
  const urlLocale = segments[0] && locales.includes(segments[0] as any) ? segments[0] : null;
  
  // If there's a URL locale and it doesn't match the cookie, clear the cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (urlLocale && localeCookie && localeCookie !== urlLocale) {
    response.cookies.delete('NEXT_LOCALE');
    response.cookies.set('NEXT_LOCALE', urlLocale, { path: '/' });
  }
  
  return response;
}

export const config = {
  matcher: [
    // Only match routes that need locale processing - exclude ALL static assets
    '/((?!api|_next|favicon|logo|.*\\..*).+)',
  ],
};