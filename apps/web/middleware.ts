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

  // Comprehensive static asset detection - must be first
  const isStaticAsset = 
    pathname.includes('.') ||                           // Any file with extension
    pathname.startsWith('/_next/') ||                   // Next.js internals
    pathname.startsWith('/api/') ||                     // API routes
    pathname === '/favicon.ico' ||                      // Favicon
    pathname.startsWith('/uploads/') ||                 // Upload directory
    /\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2|ttf|eot)$/i.test(pathname);

  if (isStaticAsset) {
    return NextResponse.next();
  }
  
  // Extract locale from pathname
  const segments = pathname.split('/').filter(Boolean);
  const urlLocale = segments[0] && locales.includes(segments[0] as any) ? segments[0] : null;
  
  const response = intlMiddleware(request);
  
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
    // Match all paths except static assets, API routes, and Next.js internals
    '/((?!api|_next|favicon.ico|.*\\.).*)',
  ],
};