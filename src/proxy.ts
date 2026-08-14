import { type NextRequest, NextResponse } from 'next/server';

import { decodeSession, SESSION_COOKIE } from '@/server/session';

const PUBLIC_PATHS = ['/login'];

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (session === null && !isPublic) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (session !== null && isPublic) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
