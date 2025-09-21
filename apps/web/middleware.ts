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

  // Hard guard: skip middleware for static assets (any path containing a dot)
  if (pathname.includes('.')) {
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
    // Follow Next.js docs: exclude api, Next internals, favicon, and any path containing a dot (static assets)
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};