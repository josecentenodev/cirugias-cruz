import { NextResponse, type NextRequest } from "next/server";

/**
 * Cookie-*presence* check only — never validity. Whether a session id is
 * still valid is `api`'s call alone (`requireAuth`, unchanged); this
 * middleware only decides "does this request even look like it should
 * try a protected page." A present-but-stale `web_session` is caught
 * downstream by `lib/authed-api-request.ts` redirecting on `ApiAuthError`.
 * See docs/architecture/milestone-8-design.md §3.2 — this is the whole
 * reason `web` has zero authentication logic of its own.
 */
const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has("web_session");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Every path except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
