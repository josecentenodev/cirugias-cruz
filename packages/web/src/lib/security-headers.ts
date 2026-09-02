/**
 * `web`'s own HTTP hardening — the surface the browser actually talks
 * to. `api` already has its own baseline (`@fastify/helmet`, Milestone
 * 7); this is a *different* HTTP surface (Next.js responses to the
 * browser) and needs its own headers, not a copy of `api`'s.
 *
 * This app has no external scripts, fonts, or stylesheets (no
 * `next/font`, no CDN, no analytics — see `app/layout.tsx`/
 * `app/globals.css`) and no inline `style={{...}}` usage anywhere in
 * `packages/web/src` (Tailwind compiles to a static stylesheet, not
 * runtime CSS-in-JS), so the CSP below stays at `'self'` almost
 * everywhere, with a nonce for the one thing that must remain inline:
 * Next.js's own RSC/hydration `<script>` tags, which it emits on every
 * page regardless of application code. Per Next's own strict-CSP guide
 * (https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy),
 * Next automatically threads a nonce it finds in the *request's*
 * `x-nonce` header onto those scripts when the response's own CSP
 * header also carries `'nonce-...'` — that's the only reason this
 * nonce is generated and forwarded per request, not a general escape
 * hatch for arbitrary inline scripts.
 */

/** A fresh, unguessable nonce per request/response pair — never reused across requests. */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function buildContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' lets the nonce'd script load further scripts it
    // injects (Next's own chunking) without listing every hash/origin;
    // browsers that support it then ignore the 'self' script-src
    // fallback, so this is not a broadening of trust beyond "scripts
    // Next itself served".
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Applied to every response `proxy.ts` returns (redirect or pass-through
 * alike) — a redirect to `/login` deserves the same hardening as any
 * other response, not just the pages behind auth.
 */
export function applySecurityHeaders(headers: Headers, nonce: string): void {
  headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  headers.set("X-Content-Type-Options", "nosniff");
  // Belt-and-suspenders with `frame-ancestors` above: older browsers that
  // don't parse CSP frame-ancestors still honor this.
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Deny every browser permission this app has no use for; `interest-cohort=()`
  // opts out of FLoC/Topics on browsers that still check it.
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  if (process.env.NODE_ENV === "production") {
    // Only meaningful over HTTPS (Railway's public domain); harmless to
    // omit in local dev, where secure cookies are off too (see
    // lib/session.ts).
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}
