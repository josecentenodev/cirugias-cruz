/**
 * Extracts the session id and expiry `api`'s `POST /sessions` sets via
 * `Set-Cookie: session_id=...; Expires=...; ...` (see
 * `packages/http/src/shared/session-cookie.ts`). A pure parsing
 * function so the "no valid session id could be extracted" fail-closed
 * case (docs/architecture/milestone-8-session-security-review.md §3.4)
 * is trivially testable without a real HTTP round-trip.
 */
export interface ParsedSessionCookie {
  sessionId: string;
  expiresAt: Date;
}

export function parseSessionCookie(
  setCookieHeader: string | null,
): ParsedSessionCookie | undefined {
  if (!setCookieHeader) {
    return undefined;
  }

  const parts = setCookieHeader.split(";").map((part) => part.trim());
  const first = parts[0];
  if (!first) {
    return undefined;
  }

  const equalsIndex = first.indexOf("=");
  if (equalsIndex === -1) {
    return undefined;
  }
  const name = first.slice(0, equalsIndex);
  const value = first.slice(equalsIndex + 1);
  if (name !== "session_id" || !value) {
    return undefined;
  }

  const expiresPart = parts.find((part) => part.toLowerCase().startsWith("expires="));
  if (!expiresPart) {
    return undefined;
  }
  const expiresAt = new Date(expiresPart.slice("expires=".length));
  if (Number.isNaN(expiresAt.getTime())) {
    return undefined;
  }

  return { sessionId: value, expiresAt };
}
