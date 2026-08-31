import type { CookieSerializeOptions } from "@fastify/cookie";

export const SESSION_COOKIE_NAME = "session_id";

/**
 * `secure` only in production — local/dev/test traffic isn't HTTPS.
 * `httpOnly` so client-side JS can never read the session id; `sameSite:
 * "lax"` is the standard baseline CSRF mitigation for a cookie-based
 * session without introducing a separate CSRF-token mechanism, which
 * nothing here has asked for.
 */
export function sessionCookieOptions(expiresAt: Date): CookieSerializeOptions {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  };
}
