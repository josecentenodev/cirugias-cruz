import { cookies } from "next/headers";

/**
 * The only file that touches Next.js's `cookies()` for session purposes.
 * See docs/architecture/milestone-8-design.md §3: `web_session`'s value
 * *is* `api`'s own session id, relayed under `web`'s own origin — not a
 * second, independent session concept.
 */
const SESSION_COOKIE_NAME = "web_session";

export async function getSessionId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}

export async function setSessionCookie(sessionId: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    // Deployment discipline, not a code guarantee: every publicly-reachable
    // Railway environment must set NODE_ENV=production for this to hold —
    // see docs/architecture/milestone-8-session-security-review.md §3.5.
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Clears `web_session` unconditionally. Called even when invalidating
 * the underlying `api` session failed — a physician must never see
 * "logged out" while the relayed token stays silently valid. See
 * docs/architecture/milestone-8-session-security-review.md §3.3.
 */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
