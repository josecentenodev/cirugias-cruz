import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders, generateNonce } from "./lib/security-headers";

/**
 * Cookie-*presence* check only — never validity. Whether a session id is
 * still valid is `api`'s call alone (`requireAuth`, unchanged); this
 * middleware only decides "does this request even look like it should
 * try a protected page." A present-but-stale `web_session` is caught
 * downstream by `lib/authed-api-request.ts` redirecting on `ApiAuthError`.
 * See docs/architecture/milestone-8-design.md §3.2 — this is the whole
 * reason `web` has zero authentication logic of its own.
 *
 * This is also the one place per request that can set a response header
 * before Next has rendered anything, so `web`'s own security headers
 * (`lib/security-headers.ts`) are applied here too, on every response —
 * the redirect to `/login` included, not only pages behind auth.
 */
const PUBLIC_PATHS = ["/login", "/signup", "/confirm-email"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const nextOptions = { request: { headers: requestHeaders } };

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    const response = NextResponse.next(nextOptions);
    applySecurityHeaders(response.headers, nonce);
    return response;
  }

  const hasSession = request.cookies.has("web_session");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    applySecurityHeaders(response.headers, nonce);
    return response;
  }

  const response = NextResponse.next(nextOptions);
  applySecurityHeaders(response.headers, nonce);
  return response;
}

export const config = {
  // Every path except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
