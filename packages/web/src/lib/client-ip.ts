import { headers } from "next/headers";

/**
 * Reads the real browser client's IP out of the inbound request (Railway's
 * edge sets `x-forwarded-for` on the request `web` receives) and is
 * re-forwarded, unmodified, as `X-Forwarded-For` on the call to `api` —
 * the other half of `api`'s own `forwardedClientIp` rate-limit key
 * (`packages/http/src/shared/rate-limit-key.ts`). Without this, every
 * physician would collapse into `web`'s single Railway-internal address
 * from `api`'s point of view. See
 * docs/architecture/frontend-architecture-discovery.md §3.
 */
export async function getForwardedClientIp(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    const firstHop = forwardedFor.split(",")[0]?.trim();
    if (firstHop) {
      return firstHop;
    }
  }
  return requestHeaders.get("x-real-ip") ?? undefined;
}
