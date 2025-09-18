import { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  
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
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.svg (logo file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo.svg|public).*)',
  ],
};